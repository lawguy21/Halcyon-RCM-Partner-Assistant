import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { getQueue } from '../lib/queue/index.js';
import { JOB_NAMES, CSVImportJobData } from '../lib/queue/jobs.js';
import { getProgress, subscribe } from '../lib/queue/progressStore.js';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

// Upload directory for CSV files
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export const batchImportController = {
  /**
   * Start a new batch import job
   * POST /api/batch-import/start
   */
  async startBatchImport(req: Request, res: Response) {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }

      const {
        presetId,
        skipErrors = 'false',
        detectDuplicates = 'true',
        duplicateKey = 'mrn,admitDate',
        chunkSize = '100',
      } = req.body;

      const userId = (req as any).user?.id;
      const organizationId = (req as any).user?.organizationId;

      // Save file to disk for async processing
      const filename = `import_${Date.now()}_${file.originalname}`;
      const filePath = path.join(UPLOAD_DIR, filename);
      fs.writeFileSync(filePath, file.buffer);

      // Get file stats
      const stats = fs.statSync(filePath);

      // Count rows (approximate)
      const content = fs.readFileSync(filePath, 'utf-8');
      const lineCount = content.split('\n').filter(l => l.trim()).length;
      const totalRows = Math.max(0, lineCount - 1); // Subtract header

      // Create import history record
      const importRecord = await prisma.importHistory.create({
        data: {
          filename,
          originalName: file.originalname,
          fileSize: stats.size,
          mimeType: file.mimetype || 'text/csv',
          totalRows,
          processedRows: 0,
          successfulRows: 0,
          failedRows: 0,
          skippedRows: 0,
          status: 'PENDING',
          presetUsed: presetId || null,
          chunkSize: parseInt(chunkSize, 10),
          userId: userId || null,
          organizationId: organizationId || null,
        },
      });

      // Queue the import job
      const queue = getQueue();
      const jobData: CSVImportJobData = {
        importId: importRecord.id,
        filePath,
        presetId,
        userId,
        organizationId,
        options: {
          skipErrors: skipErrors === 'true',
          validateOnly: false,
          chunkSize: parseInt(chunkSize, 10),
          detectDuplicates: detectDuplicates === 'true',
          duplicateKey: duplicateKey ? duplicateKey.split(',').map((k: string) => k.trim()) : undefined,
        },
      };

      const jobId = await queue.send(JOB_NAMES.CSV_IMPORT, jobData, {
        retryLimit: 3,
        retryDelay: 5000,
      });

      // Update import record with job ID
      await prisma.importHistory.update({
        where: { id: importRecord.id },
        data: { jobId },
      });

      return res.status(202).json({
        success: true,
        data: {
          importId: importRecord.id,
          jobId,
          status: 'queued',
          totalRows,
          message: `Import job queued. Processing ${totalRows} rows.`,
        },
      });
    } catch (error) {
      console.error('Error starting batch import:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start import',
      });
    }
  },

  /**
   * Get import job status and progress
   * GET /api/batch-import/status/:importId
   */
  async getImportStatus(req: Request, res: Response) {
    try {
      const { importId } = req.params;
      const organizationId = (req as any).user?.organizationId;

      // Get from database
      const importRecord = await prisma.importHistory.findUnique({
        where: { id: importId },
        select: {
          id: true,
          filename: true,
          originalName: true,
          status: true,
          totalRows: true,
          processedRows: true,
          successfulRows: true,
          failedRows: true,
          skippedRows: true,
          progress: true,
          currentChunk: true,
          totalChunks: true,
          errors: true,
          warnings: true,
          startedAt: true,
          completedAt: true,
          createdAt: true,
          organizationId: true,
        },
      });

      if (!importRecord) {
        return res.status(404).json({ success: false, error: 'Import not found' });
      }

      // TENANT ISOLATION: Verify the import belongs to this organization
      if (organizationId && importRecord.organizationId !== organizationId) {
        return res.status(404).json({ success: false, error: 'Import not found' });
      }

      // Get live progress if still processing
      const liveProgress = getProgress(importId);

      return res.json({
        success: true,
        data: {
          ...importRecord,
          liveProgress: liveProgress || null,
          progressPercent: importRecord.totalRows > 0
            ? Math.round((importRecord.processedRows / importRecord.totalRows) * 100)
            : 0,
        },
      });
    } catch (error) {
      console.error('Error getting import status:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get status',
      });
    }
  },

  /**
   * Stream progress updates via Server-Sent Events
   * GET /api/batch-import/progress/:importId/stream
   */
  async streamProgress(req: Request, res: Response) {
    const { importId } = req.params;
    const organizationId = (req as any).user?.organizationId;

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // Send initial status
    const importRecord = await prisma.importHistory.findUnique({
      where: { id: importId },
    });

    if (!importRecord) {
      res.write(`data: ${JSON.stringify({ error: 'Import not found' })}\n\n`);
      res.end();
      return;
    }

    // TENANT ISOLATION: Verify the import belongs to this organization
    if (organizationId && importRecord.organizationId !== organizationId) {
      res.write(`data: ${JSON.stringify({ error: 'Import not found' })}\n\n`);
      res.end();
      return;
    }

    // Send current state
    const currentProgress = getProgress(importId);
    res.write(`data: ${JSON.stringify(currentProgress || { status: importRecord.status })}\n\n`);

    // Subscribe to updates
    const unsubscribe = subscribe(importId, (progress) => {
      res.write(`data: ${JSON.stringify(progress)}\n\n`);

      // Close connection when complete
      if (progress.status === 'completed' || progress.status === 'failed') {
        setTimeout(() => {
          res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
          res.end();
        }, 1000);
      }
    });

    // Handle client disconnect
    req.on('close', () => {
      unsubscribe();
    });
  },

  /**
   * Cancel a running import job
   * POST /api/batch-import/cancel/:importId
   */
  async cancelImport(req: Request, res: Response) {
    try {
      const { importId } = req.params;
      const organizationId = (req as any).user?.organizationId;

      const importRecord = await prisma.importHistory.findUnique({
        where: { id: importId },
      });

      if (!importRecord) {
        return res.status(404).json({ success: false, error: 'Import not found' });
      }

      // TENANT ISOLATION: Verify the import belongs to this organization
      if (organizationId && importRecord.organizationId !== organizationId) {
        return res.status(404).json({ success: false, error: 'Import not found' });
      }

      if (importRecord.status !== 'PENDING' && importRecord.status !== 'PROCESSING') {
        return res.status(400).json({
          success: false,
          error: `Cannot cancel import with status: ${importRecord.status}`
        });
      }

      // Cancel the job if it has a jobId
      if (importRecord.jobId) {
        const queue = getQueue();
        await queue.cancel('csv-import', importRecord.jobId);
      }

      // Update status
      await prisma.importHistory.update({
        where: { id: importId },
        data: {
          status: 'CANCELLED',
          completedAt: new Date(),
        },
      });

      return res.json({
        success: true,
        message: 'Import cancelled successfully',
      });
    } catch (error) {
      console.error('Error cancelling import:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel import',
      });
    }
  },

  /**
   * Resume a failed or cancelled import
   * POST /api/batch-import/resume/:importId
   */
  async resumeImport(req: Request, res: Response) {
    try {
      const { importId } = req.params;
      const organizationId = (req as any).user?.organizationId;

      const importRecord = await prisma.importHistory.findUnique({
        where: { id: importId },
      });

      if (!importRecord) {
        return res.status(404).json({ success: false, error: 'Import not found' });
      }

      // TENANT ISOLATION: Verify the import belongs to this organization
      if (organizationId && importRecord.organizationId !== organizationId) {
        return res.status(404).json({ success: false, error: 'Import not found' });
      }

      if (importRecord.status !== 'FAILED' && importRecord.status !== 'CANCELLED') {
        return res.status(400).json({
          success: false,
          error: `Cannot resume import with status: ${importRecord.status}`
        });
      }

      // Check if file still exists
      const filePath = path.join(UPLOAD_DIR, importRecord.filename);
      if (!fs.existsSync(filePath)) {
        return res.status(400).json({
          success: false,
          error: 'Original file no longer available. Please re-upload.',
        });
      }

      // Reset status and queue new job
      await prisma.importHistory.update({
        where: { id: importId },
        data: {
          status: 'PENDING',
          completedAt: null,
        },
      });

      const queue = getQueue();
      const jobData: CSVImportJobData = {
        importId,
        filePath,
        presetId: importRecord.presetUsed || undefined,
        options: {
          skipErrors: true,
          validateOnly: false,
          chunkSize: importRecord.chunkSize || 100,
          detectDuplicates: false, // Skip duplicate detection on resume
        },
      };

      const jobId = await queue.send(JOB_NAMES.CSV_IMPORT, jobData, {
        retryLimit: 3,
        retryDelay: 5000,
      });

      await prisma.importHistory.update({
        where: { id: importId },
        data: { jobId },
      });

      return res.status(202).json({
        success: true,
        data: {
          importId,
          jobId,
          status: 'queued',
          message: 'Import resumed from last checkpoint',
        },
      });
    } catch (error) {
      console.error('Error resuming import:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to resume import',
      });
    }
  },

  /**
   * Export errors from a failed/completed import as CSV
   * GET /api/batch-import/errors/:importId
   */
  async exportErrors(req: Request, res: Response) {
    try {
      const { importId } = req.params;
      const organizationId = (req as any).user?.organizationId;

      const importRecord = await prisma.importHistory.findUnique({
        where: { id: importId },
        select: {
          id: true,
          originalName: true,
          errors: true,
          organizationId: true,
        },
      });

      if (!importRecord) {
        return res.status(404).json({ success: false, error: 'Import not found' });
      }

      // TENANT ISOLATION: Verify the import belongs to this organization
      if (organizationId && importRecord.organizationId !== organizationId) {
        return res.status(404).json({ success: false, error: 'Import not found' });
      }

      const errors = (importRecord.errors as any[]) || [];

      if (errors.length === 0) {
        return res.status(404).json({ success: false, error: 'No errors to export' });
      }

      // Generate CSV
      const headers = ['Row', 'Field', 'Error Message'];
      const rows = errors.map(e => [
        e.row || '',
        e.field || '',
        `"${(e.message || '').replace(/"/g, '""')}"`,
      ]);

      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

      const filename = `errors_${importRecord.originalName || importId}.csv`;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      return res.send(csv);
    } catch (error) {
      console.error('Error exporting errors:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export errors',
      });
    }
  },

  /**
   * List all batch imports with pagination
   * GET /api/batch-import/list
   */
  async listImports(req: Request, res: Response) {
    try {
      const {
        page = '1',
        limit = '20',
        status,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      const userId = (req as any).user?.id;
      const organizationId = (req as any).user?.organizationId;

      const skip = (parseInt(page as string, 10) - 1) * parseInt(limit as string, 10);
      const take = parseInt(limit as string, 10);

      const where: Prisma.ImportHistoryWhereInput = {
        ...(organizationId && { organizationId }),
        ...(status && { status: status as any }),
      };

      const [imports, total] = await Promise.all([
        prisma.importHistory.findMany({
          where,
          skip,
          take,
          orderBy: { [sortBy as string]: sortOrder },
          select: {
            id: true,
            originalName: true,
            status: true,
            totalRows: true,
            successfulRows: true,
            failedRows: true,
            progress: true,
            createdAt: true,
            completedAt: true,
          },
        }),
        prisma.importHistory.count({ where }),
      ]);

      return res.json({
        success: true,
        data: {
          imports,
          pagination: {
            page: parseInt(page as string, 10),
            limit: take,
            total,
            totalPages: Math.ceil(total / take),
          },
        },
      });
    } catch (error) {
      console.error('Error listing imports:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list imports',
      });
    }
  },

  /**
   * Validate CSV without importing
   * POST /api/batch-import/validate
   */
  async validateCSV(req: Request, res: Response) {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }

      const content = file.buffer.toString('utf-8');
      const lines = content.split('\n').filter(l => l.trim());
      const totalRows = Math.max(0, lines.length - 1);

      // Parse and validate
      const { importCSV, previewCSV } = await import('@halcyon-rcm/file-exchange');

      const preview = previewCSV(content, 5);
      const parseResult = await importCSV(content, {
        strictValidation: false,
      });

      // Analyze data quality
      const fieldStats: Record<string, { filled: number; empty: number; invalid: number }> = {};
      const requiredFields = ['accountNumber', 'mrn', 'totalCharges', 'encounterType'];

      for (const row of parseResult.data) {
        for (const field of requiredFields) {
          if (!fieldStats[field]) {
            fieldStats[field] = { filled: 0, empty: 0, invalid: 0 };
          }
          const value = row[field];
          if (value === undefined || value === null || value === '') {
            fieldStats[field].empty++;
          } else {
            fieldStats[field].filled++;
          }
        }
      }

      return res.json({
        success: true,
        data: {
          totalRows,
          detectedColumns: preview.columns,
          fieldStats,
          errors: parseResult.errors || [],
          warnings: parseResult.warnings || [],
          sampleRows: parseResult.data.slice(0, 5),
          isValid: (parseResult.errors?.length || 0) === 0,
        },
      });
    } catch (error) {
      console.error('Error validating CSV:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to validate CSV',
      });
    }
  },
};
