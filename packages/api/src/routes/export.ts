// @ts-nocheck
/**
 * Export Routes
 * Routes for data export operations
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { exportController } from '../controllers/exportController.js';

export const exportRouter = Router();

// Validation schemas
const assessmentFiltersSchema = z.object({
  primaryRecoveryPath: z.string().optional(),
  minConfidence: z.coerce.number().optional(),
  maxConfidence: z.coerce.number().optional(),
  state: z.string().optional(),
  encounterType: z.string().optional(),
  minRecovery: z.coerce.number().optional(),
  maxRecovery: z.coerce.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  tags: z.array(z.string()).optional(),
  limit: z.coerce.number().optional(),
  offset: z.coerce.number().optional(),
});

const csvExportSchema = z.object({
  filters: assessmentFiltersSchema.optional(),
  columns: z.array(z.string()).optional(),
  includeInput: z.boolean().optional(),
  includeFullResult: z.boolean().optional(),
  filename: z.string().optional(),
});

const worklistExportSchema = z.object({
  filters: assessmentFiltersSchema.optional(),
  minRecovery: z.number().optional(),
  minConfidence: z.number().optional(),
  sortBy: z.enum(['recovery', 'confidence', 'urgency']).optional(),
  limit: z.number().optional(),
});

const executiveSummarySchema = z.object({
  filters: assessmentFiltersSchema.optional(),
  title: z.string().optional(),
  dateRange: z.object({
    start: z.string(),
    end: z.string(),
  }).optional(),
  groupBy: z.enum(['state', 'pathway', 'encounterType']).optional(),
});

const pdfExportSchema = z.object({
  assessmentId: z.string().optional(),
  filters: assessmentFiltersSchema.optional(),
  template: z.enum(['detailed', 'summary', 'worklist']).optional(),
  title: z.string().optional(),
  includeCharts: z.boolean().optional(),
});

const executiveSummaryPDFSchema = z.object({
  filters: assessmentFiltersSchema.optional(),
  title: z.string().optional(),
  dateRange: z.object({
    start: z.string(),
    end: z.string(),
  }).optional(),
  includeCharts: z.boolean().optional(),
});

const detailedAssessmentPDFSchema = z.object({
  assessmentId: z.string(),
  includeInput: z.boolean().optional(),
  includePathwayDetails: z.boolean().optional(),
  includeActions: z.boolean().optional(),
});

const worklistPDFSchema = z.object({
  assessmentIds: z.array(z.string()).optional(),
  filters: assessmentFiltersSchema.optional(),
  minRecovery: z.number().optional(),
  minConfidence: z.number().optional(),
  sortBy: z.enum(['recovery', 'confidence', 'urgency']).optional(),
  limit: z.number().optional(),
});

const batchSummaryPDFSchema = z.object({
  importId: z.string(),
  includeAssessmentDetails: z.boolean().optional(),
  includeStatistics: z.boolean().optional(),
});

/**
 * POST /export/csv
 * Export assessments to CSV format
 */
exportRouter.post('/csv', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = csvExportSchema.parse(req.body);

    const result = await exportController.exportToCSV(parsed);

    // Check if download or JSON response is requested
    const download = req.query.download === 'true' || req.body.download === true;

    if (download) {
      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.send(result.content);
    } else {
      res.json({
        success: true,
        data: {
          content: result.content,
          filename: result.filename,
          rowCount: result.rowCount,
          contentType: result.contentType,
        },
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.errors,
        },
      });
    }
    next(error);
  }
});

/**
 * POST /export/worklist
 * Export prioritized recovery worklist
 */
exportRouter.post('/worklist', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = worklistExportSchema.parse(req.body);

    const result = await exportController.exportWorklist(parsed);

    // Check if download or JSON response is requested
    const download = req.query.download === 'true' || req.body.download === true;

    if (download) {
      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.send(result.content);
    } else {
      res.json({
        success: true,
        data: {
          content: result.content,
          filename: result.filename,
          rowCount: result.rowCount,
          contentType: result.contentType,
          summary: result.summary,
        },
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.errors,
        },
      });
    }
    next(error);
  }
});

/**
 * POST /export/executive-summary
 * Export executive summary report
 */
exportRouter.post('/executive-summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = executiveSummarySchema.parse(req.body);

    const result = await exportController.exportExecutiveSummary(parsed);

    // Check if download or JSON response is requested
    const download = req.query.download === 'true' || req.body.download === true;

    if (download) {
      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.send(result.content);
    } else {
      res.json({
        success: true,
        data: {
          content: result.content,
          filename: result.filename,
          contentType: result.contentType,
          summaryData: result.data,
        },
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.errors,
        },
      });
    }
    next(error);
  }
});

/**
 * POST /export/pdf
 * Export detailed PDF report data
 * Note: Returns JSON data for client-side PDF generation
 */
exportRouter.post('/pdf', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = pdfExportSchema.parse(req.body);

    const result = await exportController.exportPDF(parsed);

    res.json({
      success: true,
      data: result.data,
      filename: result.filename,
      contentType: result.contentType,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.errors,
        },
      });
    }
    next(error);
  }
});

/**
 * GET /export/templates
 * Get available export templates and column options
 */
exportRouter.get('/templates', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      csvTemplates: [
        {
          id: 'default',
          name: 'Default Export',
          description: 'Standard assessment export with key fields',
          columns: [
            'id', 'patientIdentifier', 'accountNumber', 'createdAt',
            'primaryRecoveryPath', 'overallConfidence', 'estimatedTotalRecovery',
            'currentExposure', 'stateOfService', 'encounterType', 'totalCharges',
          ],
        },
        {
          id: 'detailed',
          name: 'Detailed Export',
          description: 'Full assessment with all input and result fields',
          includeInput: true,
          includeFullResult: true,
        },
        {
          id: 'financial',
          name: 'Financial Summary',
          description: 'Focus on recovery amounts and projections',
          columns: [
            'id', 'patientIdentifier', 'accountNumber', 'totalCharges',
            'estimatedTotalRecovery', 'medicaidRecovery', 'stateProgramRecovery',
            'overallConfidence', 'primaryRecoveryPath',
          ],
        },
      ],
      worklistSortOptions: ['recovery', 'confidence', 'urgency'],
      pdfTemplates: ['detailed', 'summary', 'worklist', 'executive-summary', 'batch-summary'],
      executiveSummaryGroupOptions: ['state', 'pathway', 'encounterType'],
    },
  });
});

/**
 * POST /export/pdf/executive-summary
 * Export executive summary PDF data
 */
exportRouter.post('/pdf/executive-summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = executiveSummaryPDFSchema.parse(req.body);

    const result = await exportController.exportExecutiveSummaryPDF(parsed);

    res.json({
      success: true,
      data: result.data,
      filename: result.filename,
      contentType: result.contentType,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.errors,
        },
      });
    }
    next(error);
  }
});

/**
 * POST /export/pdf/assessment/:id
 * Export detailed assessment PDF data
 */
exportRouter.post('/pdf/assessment/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const options = {
      assessmentId: req.params.id,
      includeInput: req.body.includeInput,
      includePathwayDetails: req.body.includePathwayDetails,
      includeActions: req.body.includeActions,
    };

    const parsed = detailedAssessmentPDFSchema.parse(options);

    const result = await exportController.exportDetailedAssessmentPDF(parsed);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Assessment not found',
          code: 'NOT_FOUND',
        },
      });
    }

    res.json({
      success: true,
      data: result.data,
      filename: result.filename,
      contentType: result.contentType,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.errors,
        },
      });
    }
    next(error);
  }
});

/**
 * POST /export/pdf/worklist
 * Export worklist PDF data
 */
exportRouter.post('/pdf/worklist', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = worklistPDFSchema.parse(req.body);

    const result = await exportController.exportWorklistPDF(parsed);

    res.json({
      success: true,
      data: result.data,
      filename: result.filename,
      contentType: result.contentType,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.errors,
        },
      });
    }
    next(error);
  }
});

/**
 * POST /export/pdf/batch-summary
 * Export batch import summary PDF data
 */
exportRouter.post('/pdf/batch-summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = batchSummaryPDFSchema.parse(req.body);

    const result = await exportController.exportBatchSummaryPDF(parsed);

    res.json({
      success: true,
      data: result.data,
      filename: result.filename,
      contentType: result.contentType,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.errors,
        },
      });
    }
    next(error);
  }
});
