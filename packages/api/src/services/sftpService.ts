// @ts-nocheck
/**
 * SFTP Scheduler/Watcher Service
 * Handles automated file processing from SFTP connections
 */

import cron from 'node-cron';
import { prisma } from '../lib/prisma.js';
import { HalcyonSFTPClient, sftpPool } from '../lib/sftp/index.js';
import type { SFTPConnectionConfig } from '../lib/sftp/index.js';
import { importController } from '../controllers/importController.js';
import { getPreset } from '@halcyon-rcm/file-exchange';

interface SyncJob {
  connectionId: string;
  task: cron.ScheduledTask;
}

interface SyncResult {
  filesFound: number;
  filesProcessed: number;
  filesFailed: number;
  filesSkipped: number;
  errors: Array<{ file: string; error: string }>;
  importIds: string[];
}

class SFTPService {
  private jobs: Map<string, SyncJob> = new Map();
  private isRunning: boolean = false;

  /**
   * Start the SFTP service and schedule all enabled connections
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log('[SFTP Service] Starting...');

    // Load all enabled connections
    const connections = await prisma.sFTPConnection.findMany({
      where: { enabled: true },
    });

    for (const conn of connections) {
      await this.scheduleConnection(conn);
    }

    console.log(`[SFTP Service] Started with ${connections.length} connections`);
  }

  /**
   * Stop the SFTP service and release all resources
   */
  async stop(): Promise<void> {
    this.isRunning = false;

    // Stop all scheduled jobs
    for (const [id, job] of this.jobs) {
      job.task.stop();
      console.log(`[SFTP Service] Stopped job for connection ${id}`);
    }
    this.jobs.clear();

    // Release all SFTP connections
    await sftpPool.releaseAll();

    console.log('[SFTP Service] Stopped');
  }

  /**
   * Schedule or reschedule a connection for periodic sync
   */
  async scheduleConnection(connection: any): Promise<void> {
    // Remove existing job if any
    const existingJob = this.jobs.get(connection.id);
    if (existingJob) {
      existingJob.task.stop();
      this.jobs.delete(connection.id);
    }

    if (!connection.enabled) return;

    // Determine schedule - use cron expression if provided, otherwise poll interval
    const cronExpression = connection.schedule ||
      `*/${connection.pollIntervalMinutes} * * * *`;

    // Validate cron expression
    if (!cron.validate(cronExpression)) {
      console.error(`[SFTP Service] Invalid cron expression for ${connection.name}: ${cronExpression}`);
      return;
    }

    // Create scheduled task
    const task = cron.schedule(cronExpression, async () => {
      try {
        await this.syncConnection(connection.id);
      } catch (error) {
        console.error(`[SFTP Service] Sync failed for ${connection.name}:`, error);
      }
    });

    this.jobs.set(connection.id, { connectionId: connection.id, task });
    console.log(`[SFTP Service] Scheduled ${connection.name} with: ${cronExpression}`);
  }

  /**
   * Remove a connection from the scheduler
   */
  async unscheduleConnection(connectionId: string): Promise<void> {
    const existingJob = this.jobs.get(connectionId);
    if (existingJob) {
      existingJob.task.stop();
      this.jobs.delete(connectionId);
      console.log(`[SFTP Service] Unscheduled connection ${connectionId}`);
    }
  }

  /**
   * Sync a specific connection - download and process files
   */
  async syncConnection(connectionId: string): Promise<any> {
    const startedAt = new Date();
    let connection: any;
    let client: HalcyonSFTPClient | null = null;

    // Create sync log record
    const syncLog = await prisma.sFTPSyncLog.create({
      data: {
        connectionId,
        status: 'processing',
        startedAt,
      },
    });

    try {
      // Get connection config
      connection = await prisma.sFTPConnection.findUnique({
        where: { id: connectionId },
        include: { organization: true },
      });

      if (!connection) {
        throw new Error('Connection not found');
      }

      console.log(`[SFTP Service] Starting sync for ${connection.name}`);

      // Build client config
      const clientConfig: SFTPConnectionConfig = {
        id: connection.id,
        name: connection.name,
        host: connection.host,
        port: connection.port,
        username: connection.username,
        password: this.decryptValue(connection.encryptedPassword),
        privateKey: this.decryptValue(connection.encryptedPrivateKey),
        inboundPath: connection.inboundPath,
        outboundPath: connection.outboundPath,
        archivePath: connection.archivePath,
        errorPath: connection.errorPath,
        filePattern: connection.filePattern,
        presetId: connection.presetId,
        autoProcess: connection.autoProcess,
        deleteAfterProcess: connection.deleteAfterProcess,
        enabled: connection.enabled,
        pollIntervalMinutes: connection.pollIntervalMinutes,
        organizationId: connection.organizationId,
        createdAt: connection.createdAt,
        updatedAt: connection.updatedAt,
      };

      // Create client and connect
      client = new HalcyonSFTPClient(clientConfig);
      await client.connect();

      // Update last connected timestamp
      await prisma.sFTPConnection.update({
        where: { id: connectionId },
        data: { lastConnectedAt: new Date(), consecutiveFailures: 0 },
      });

      // List files to process
      const files = await client.listFiles();
      const result: SyncResult = {
        filesFound: files.length,
        filesProcessed: 0,
        filesFailed: 0,
        filesSkipped: 0,
        errors: [],
        importIds: [],
      };

      console.log(`[SFTP Service] Found ${files.length} files in ${connection.inboundPath}`);

      // Process each file
      for (const file of files) {
        if (file.isDirectory) {
          result.filesSkipped++;
          continue;
        }

        try {
          // Download file content
          const content = await client.downloadFile(file.path);
          const csvContent = content.toString('utf-8');

          // Get preset if configured
          const preset = connection.presetId ? getPreset(connection.presetId) : undefined;

          // Import the file if autoProcess is enabled
          if (connection.autoProcess) {
            const importResult = await importController.importCSV(
              csvContent,
              file.name,
              file.size,
              {
                presetId: connection.presetId,
                organizationId: connection.organizationId,
              }
            );

            if (importResult.importId) {
              result.importIds.push(importResult.importId);
            }

            console.log(`[SFTP Service] Imported ${file.name}: ${importResult.successCount} success, ${importResult.errorCount} errors`);
          }

          // Move or delete file after processing
          if (connection.deleteAfterProcess) {
            await client.deleteFile(file.path);
            console.log(`[SFTP Service] Deleted ${file.name}`);
          } else {
            const archiveName = `${Date.now()}_${file.name}`;
            await client.ensureDirectory(connection.archivePath);
            await client.moveFile(file.path, `${connection.archivePath}/${archiveName}`);
            console.log(`[SFTP Service] Archived ${file.name} to ${archiveName}`);
          }

          result.filesProcessed++;
        } catch (error: any) {
          result.filesFailed++;
          result.errors.push({ file: file.name, error: error.message });
          console.error(`[SFTP Service] Failed to process ${file.name}:`, error.message);

          // Move to error path if configured
          if (connection.errorPath) {
            try {
              await client.ensureDirectory(connection.errorPath);
              await client.moveFile(file.path, `${connection.errorPath}/${file.name}`);
            } catch (moveError) {
              console.error(`[SFTP Service] Failed to move ${file.name} to error path:`, moveError);
            }
          }
        }
      }

      // Determine final status
      const status = result.filesFailed === 0 ? 'success' :
                     result.filesProcessed > 0 ? 'partial' : 'failed';

      // Update sync log
      await prisma.sFTPSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status,
          completedAt: new Date(),
          filesFound: result.filesFound,
          filesProcessed: result.filesProcessed,
          filesFailed: result.filesFailed,
          filesSkipped: result.filesSkipped,
          errors: result.errors.length > 0 ? result.errors : undefined,
          importIds: result.importIds,
        },
      });

      // Update connection
      await prisma.sFTPConnection.update({
        where: { id: connectionId },
        data: {
          lastSyncAt: new Date(),
          lastError: result.errors.length > 0 ? JSON.stringify(result.errors) : null,
        },
      });

      console.log(`[SFTP Service] Sync completed for ${connection.name}: ${result.filesProcessed} processed, ${result.filesFailed} failed`);

      return await prisma.sFTPSyncLog.findUnique({ where: { id: syncLog.id } });

    } catch (error: any) {
      console.error(`[SFTP Service] Sync error for connection ${connectionId}:`, error);

      // Update sync log with failure
      await prisma.sFTPSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'failed',
          completedAt: new Date(),
          errors: [{ file: 'connection', error: error.message }],
        },
      });

      // Update connection failure count
      if (connection) {
        await prisma.sFTPConnection.update({
          where: { id: connectionId },
          data: {
            lastError: error.message,
            consecutiveFailures: { increment: 1 },
          },
        });
      }

      throw error;
    } finally {
      if (client) {
        await client.disconnect();
      }
    }
  }

  /**
   * Manually trigger a sync for a connection
   */
  async triggerSync(connectionId: string): Promise<any> {
    return this.syncConnection(connectionId);
  }

  /**
   * Upload results back to SFTP
   */
  async uploadResults(connectionId: string, content: string, filename: string): Promise<any> {
    const connection = await prisma.sFTPConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new Error('Connection not found');
    }

    const clientConfig: SFTPConnectionConfig = {
      id: connection.id,
      name: connection.name,
      host: connection.host,
      port: connection.port,
      username: connection.username,
      password: this.decryptValue(connection.encryptedPassword),
      privateKey: this.decryptValue(connection.encryptedPrivateKey),
      inboundPath: connection.inboundPath,
      outboundPath: connection.outboundPath,
      archivePath: connection.archivePath,
      errorPath: connection.errorPath || undefined,
      filePattern: connection.filePattern,
      presetId: connection.presetId || '',
      autoProcess: connection.autoProcess,
      deleteAfterProcess: connection.deleteAfterProcess,
      enabled: connection.enabled,
      pollIntervalMinutes: connection.pollIntervalMinutes,
      organizationId: connection.organizationId,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
    };

    const client = new HalcyonSFTPClient(clientConfig);

    try {
      await client.connect();
      await client.ensureDirectory(connection.outboundPath);
      const remotePath = `${connection.outboundPath}/${filename}`;
      const result = await client.uploadFile(Buffer.from(content), remotePath);
      console.log(`[SFTP Service] Uploaded ${filename} to ${remotePath}`);
      return result;
    } finally {
      await client.disconnect();
    }
  }

  /**
   * Simple decryption - in production, use proper encryption with a key from env
   * This is a placeholder that expects base64 encoded values
   */
  private decryptValue(encrypted: string | null): string | undefined {
    if (!encrypted) return undefined;
    // In production, use proper encryption (e.g., AES-256-GCM) with a key from env
    // For now, assume base64 encoding for simplicity
    try {
      return Buffer.from(encrypted, 'base64').toString('utf-8');
    } catch {
      return encrypted; // Return as-is if not base64 encoded
    }
  }

  /**
   * Simple encryption - in production, use proper encryption with a key from env
   */
  encryptValue(value: string): string {
    // In production, use proper encryption (e.g., AES-256-GCM) with a key from env
    // For now, use base64 encoding for simplicity
    return Buffer.from(value).toString('base64');
  }

  /**
   * Get the status of a scheduled job
   */
  getJobStatus(connectionId: string): { scheduled: boolean; nextRun?: Date } {
    const job = this.jobs.get(connectionId);
    return {
      scheduled: !!job,
    };
  }

  /**
   * Refresh schedules from database - useful after connection updates
   */
  async refreshSchedules(): Promise<void> {
    console.log('[SFTP Service] Refreshing schedules...');

    // Get all enabled connections
    const connections = await prisma.sFTPConnection.findMany({
      where: { enabled: true },
    });

    // Get current scheduled IDs
    const currentIds = new Set(this.jobs.keys());
    const enabledIds = new Set(connections.map(c => c.id));

    // Remove jobs for disabled/deleted connections
    for (const id of currentIds) {
      if (!enabledIds.has(id)) {
        await this.unscheduleConnection(id);
      }
    }

    // Add/update jobs for enabled connections
    for (const conn of connections) {
      await this.scheduleConnection(conn);
    }

    console.log(`[SFTP Service] Refreshed: ${connections.length} active connections`);
  }

  /**
   * Get sync history for a connection
   */
  async getSyncHistory(connectionId: string, limit: number = 50): Promise<any[]> {
    return prisma.sFTPSyncLog.findMany({
      where: { connectionId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Check if the service is running
   */
  isServiceRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get list of all scheduled connections
   */
  getScheduledConnections(): string[] {
    return Array.from(this.jobs.keys());
  }
}

export const sftpService = new SFTPService();
