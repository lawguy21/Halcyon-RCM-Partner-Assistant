// @ts-nocheck
/**
 * SFTP Controller
 * Handles SFTP connection management and file synchronization operations
 */

import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { sftpService } from '../services/sftpService.js';
import { HalcyonSFTPClient } from '../lib/sftp/client.js';

/**
 * List all SFTP connections for an organization
 */
export async function listConnections(req: Request, res: Response) {
  try {
    const { organizationId } = req.query;

    const connections = await prisma.sFTPConnection.findMany({
      where: organizationId ? { organizationId: String(organizationId) } : undefined,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        host: true,
        port: true,
        username: true,
        inboundPath: true,
        outboundPath: true,
        filePattern: true,
        enabled: true,
        pollIntervalMinutes: true,
        lastConnectedAt: true,
        lastSyncAt: true,
        lastError: true,
        consecutiveFailures: true,
        organizationId: true,
        createdAt: true,
      },
    });

    res.json({ connections });
  } catch (error) {
    console.error('[SFTP] Error listing connections:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to list SFTP connections',
        code: 'SFTP_LIST_ERROR',
      },
    });
  }
}

/**
 * Get a single SFTP connection by ID
 */
export async function getConnection(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const connection = await prisma.sFTPConnection.findUnique({
      where: { id },
      include: {
        organization: { select: { id: true, name: true } },
        syncLogs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Connection not found',
          code: 'SFTP_NOT_FOUND',
        },
      });
    }

    // Don't return encrypted credentials
    const { encryptedPassword, encryptedPrivateKey, ...safe } = connection;
    res.json({
      connection: {
        ...safe,
        hasPassword: !!encryptedPassword,
        hasPrivateKey: !!encryptedPrivateKey,
      },
    });
  } catch (error) {
    console.error('[SFTP] Error getting connection:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get SFTP connection',
        code: 'SFTP_GET_ERROR',
      },
    });
  }
}

/**
 * Create a new SFTP connection
 */
export async function createConnection(req: Request, res: Response) {
  try {
    const data = req.body;

    // Validate required fields
    if (!data.name || !data.host || !data.username) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Name, host, and username are required',
          code: 'SFTP_VALIDATION_ERROR',
        },
      });
    }

    // Encrypt sensitive data
    const encryptedPassword = data.password ? sftpService.encryptValue(data.password) : null;
    const encryptedPrivateKey = data.privateKey ? sftpService.encryptValue(data.privateKey) : null;

    const connection = await prisma.sFTPConnection.create({
      data: {
        name: data.name,
        host: data.host,
        port: data.port || 22,
        username: data.username,
        encryptedPassword,
        encryptedPrivateKey,
        inboundPath: data.inboundPath || '/inbound',
        outboundPath: data.outboundPath || '/outbound',
        archivePath: data.archivePath || '/archive',
        errorPath: data.errorPath,
        filePattern: data.filePattern || '*.csv',
        presetId: data.presetId,
        autoProcess: data.autoProcess ?? true,
        deleteAfterProcess: data.deleteAfterProcess ?? false,
        enabled: data.enabled ?? true,
        pollIntervalMinutes: data.pollIntervalMinutes || 15,
        schedule: data.schedule,
        organizationId: data.organizationId,
      },
    });

    // Schedule if enabled
    if (connection.enabled) {
      await sftpService.scheduleConnection(connection);
    }

    console.log(`[SFTP] Created connection ${connection.id}: ${connection.name}`);
    res.status(201).json({ connection });
  } catch (error) {
    console.error('[SFTP] Error creating connection:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to create SFTP connection',
        code: 'SFTP_CREATE_ERROR',
      },
    });
  }
}

/**
 * Update an existing SFTP connection
 */
export async function updateConnection(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const data = req.body;

    // Check if connection exists
    const existing = await prisma.sFTPConnection.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Connection not found',
          code: 'SFTP_NOT_FOUND',
        },
      });
    }

    const updateData: any = { ...data };

    // Handle password update
    if (data.password !== undefined) {
      updateData.encryptedPassword = data.password ? sftpService.encryptValue(data.password) : null;
      delete updateData.password;
    }

    // Handle private key update
    if (data.privateKey !== undefined) {
      updateData.encryptedPrivateKey = data.privateKey ? sftpService.encryptValue(data.privateKey) : null;
      delete updateData.privateKey;
    }

    const connection = await prisma.sFTPConnection.update({
      where: { id },
      data: updateData,
    });

    // Reschedule
    await sftpService.scheduleConnection(connection);

    console.log(`[SFTP] Updated connection ${connection.id}: ${connection.name}`);
    res.json({ connection });
  } catch (error) {
    console.error('[SFTP] Error updating connection:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to update SFTP connection',
        code: 'SFTP_UPDATE_ERROR',
      },
    });
  }
}

/**
 * Delete an SFTP connection
 */
export async function deleteConnection(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Check if connection exists
    const existing = await prisma.sFTPConnection.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Connection not found',
          code: 'SFTP_NOT_FOUND',
        },
      });
    }

    await prisma.sFTPConnection.delete({ where: { id } });

    console.log(`[SFTP] Deleted connection ${id}`);
    res.json({ success: true });
  } catch (error) {
    console.error('[SFTP] Error deleting connection:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to delete SFTP connection',
        code: 'SFTP_DELETE_ERROR',
      },
    });
  }
}

/**
 * Test an SFTP connection
 */
export async function testConnection(req: Request, res: Response) {
  try {
    const config = req.body;

    // Validate required fields
    if (!config.host || !config.username) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Host and username are required',
          code: 'SFTP_VALIDATION_ERROR',
        },
      });
    }

    const client = new HalcyonSFTPClient({
      id: 'test',
      name: 'test',
      host: config.host,
      port: config.port || 22,
      username: config.username,
      password: config.password,
      privateKey: config.privateKey,
      inboundPath: config.inboundPath || '/',
      outboundPath: config.outboundPath || '/',
      archivePath: config.archivePath || '/',
      filePattern: config.filePattern || '*',
      presetId: '',
      autoProcess: false,
      deleteAfterProcess: false,
      enabled: false,
      pollIntervalMinutes: 15,
      organizationId: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await client.testConnection();
    res.json(result);
  } catch (error) {
    console.error('[SFTP] Error testing connection:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to test SFTP connection',
        code: 'SFTP_TEST_ERROR',
      },
    });
  }
}

/**
 * Trigger a manual sync for an SFTP connection
 */
export async function triggerSync(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Check if connection exists
    const existing = await prisma.sFTPConnection.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Connection not found',
          code: 'SFTP_NOT_FOUND',
        },
      });
    }

    const result = await sftpService.triggerSync(id);
    console.log(`[SFTP] Triggered sync for connection ${id}`);
    res.json({ syncLog: result });
  } catch (error) {
    console.error('[SFTP] Error triggering sync:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to trigger sync',
        code: 'SFTP_SYNC_ERROR',
      },
    });
  }
}

/**
 * Get sync logs for an SFTP connection
 */
export async function getSyncLogs(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    // Check if connection exists
    const existing = await prisma.sFTPConnection.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Connection not found',
          code: 'SFTP_NOT_FOUND',
        },
      });
    }

    const [logs, total] = await Promise.all([
      prisma.sFTPSyncLog.findMany({
        where: { connectionId: id },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
      }),
      prisma.sFTPSyncLog.count({ where: { connectionId: id } }),
    ]);

    res.json({ logs, total, limit: Number(limit), offset: Number(offset) });
  } catch (error) {
    console.error('[SFTP] Error getting sync logs:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get sync logs',
        code: 'SFTP_LOGS_ERROR',
      },
    });
  }
}

/**
 * Upload results to an SFTP server
 */
export async function uploadResults(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { content, filename } = req.body;

    // Validate required fields
    if (!content || !filename) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Content and filename are required',
          code: 'SFTP_VALIDATION_ERROR',
        },
      });
    }

    // Check if connection exists
    const existing = await prisma.sFTPConnection.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Connection not found',
          code: 'SFTP_NOT_FOUND',
        },
      });
    }

    const result = await sftpService.uploadResults(id, content, filename);
    console.log(`[SFTP] Uploaded results to connection ${id}: ${filename}`);
    res.json(result);
  } catch (error) {
    console.error('[SFTP] Error uploading results:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to upload results',
        code: 'SFTP_UPLOAD_ERROR',
      },
    });
  }
}
