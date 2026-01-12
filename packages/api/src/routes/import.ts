// @ts-nocheck
/**
 * Import Routes
 * Routes for CSV file import operations
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { importController } from '../controllers/importController.js';
import { handleUpload, requireFile, getFileContent, getFileMetadata } from '../middleware/upload.js';

export const importRouter = Router();

// Validation schemas
const importOptionsSchema = z.object({
  presetId: z.string().optional(),
  skipErrors: z.boolean().optional(),
  validateOnly: z.boolean().optional(),
});

const historyFiltersSchema = z.object({
  limit: z.coerce.number().optional(),
  offset: z.coerce.number().optional(),
  status: z.enum(['completed', 'partial', 'failed']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

/**
 * POST /import/csv
 * Upload and import CSV file
 */
importRouter.post(
  '/csv',
  handleUpload('file'),
  requireFile,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const content = getFileContent(req);
      const metadata = getFileMetadata(req);

      // Parse options from body (may be JSON string if sent with form data)
      let options = {};
      if (req.body.options) {
        try {
          options = typeof req.body.options === 'string'
            ? JSON.parse(req.body.options)
            : req.body.options;
        } catch {
          // Ignore parse errors, use defaults
        }
      }

      // Also check for individual fields
      const presetId = req.body.presetId || (options as Record<string, unknown>).presetId;
      const skipErrors = req.body.skipErrors === 'true' ||
        req.body.skipErrors === true ||
        (options as Record<string, unknown>).skipErrors;

      const result = await importController.importCSV(
        content,
        metadata.filename,
        metadata.size,
        {
          presetId,
          skipErrors,
        }
      );

      res.status(201).json({
        success: true,
        data: {
          importId: result.importId,
          totalRows: result.totalRows,
          successCount: result.successCount,
          errorCount: result.errorCount,
          assessments: result.assessments.map((a) => ({
            id: a.id,
            patientIdentifier: a.patientIdentifier,
            accountNumber: a.accountNumber,
            primaryRecoveryPath: a.result.primaryRecoveryPath,
            estimatedRecovery: a.result.estimatedTotalRecovery,
            confidence: a.result.overallConfidence,
          })),
          errors: result.errors,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /import/preview
 * Preview CSV with detected columns (first 10 rows)
 */
importRouter.post(
  '/preview',
  handleUpload('file'),
  requireFile,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const content = getFileContent(req);
      const metadata = getFileMetadata(req);
      const presetId = req.body.presetId;

      const result = await importController.previewCSV(content, presetId);

      res.json({
        success: true,
        data: {
          filename: metadata.filename,
          fileSize: metadata.size,
          headers: result.headers,
          rowCount: result.rowCount,
          preview: result.rows,
          detectedMappings: result.detectedMappings,
          suggestedPreset: result.suggestedPreset ? {
            id: result.suggestedPreset.id,
            name: result.suggestedPreset.name,
            vendor: result.suggestedPreset.vendor,
            description: result.suggestedPreset.description,
          } : null,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /import/validate
 * Validate CSV without importing
 */
importRouter.post(
  '/validate',
  handleUpload('file'),
  requireFile,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const content = getFileContent(req);
      const metadata = getFileMetadata(req);
      const presetId = req.body.presetId;

      const result = await importController.validateCSV(content, presetId);

      res.json({
        success: true,
        data: {
          filename: metadata.filename,
          valid: result.valid,
          rowCount: result.rowCount,
          errors: result.errors,
          warnings: result.warnings,
          columnStats: result.columnStats,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /import/history
 * Get import history
 */
importRouter.get('/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = historyFiltersSchema.parse(req.query);

    const result = await importController.getImportHistory(parsed);

    res.json({
      success: true,
      data: result.data,
      pagination: {
        total: result.total,
        limit: parsed.limit || 50,
        offset: parsed.offset || 0,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid query parameters',
          code: 'VALIDATION_ERROR',
          details: error.errors,
        },
      });
    }
    next(error);
  }
});

/**
 * GET /import/history/:id
 * Get single import history entry
 */
importRouter.get('/history/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const entry = await importController.getImportById(id);

    if (!entry) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Import not found',
          code: 'NOT_FOUND',
        },
      });
    }

    res.json({
      success: true,
      data: entry,
    });
  } catch (error) {
    next(error);
  }
});
