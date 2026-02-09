// @ts-nocheck
/**
 * Denial Management Routes
 * Routes for claims denial analysis and appeals
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { denialController } from '../controllers/denialController.js';
import { optionalAuth, AuthRequest } from '../middleware/auth.js';

export const denialsRouter = Router();

// Apply optional auth to all routes - allows user context if authenticated
denialsRouter.use(optionalAuth);

// Validation schemas
const denialAnalysisSchema = z.object({
  carcCode: z.string(),
  rarcCode: z.string().optional(),
  deniedAmount: z.number().min(0),
  claimType: z.enum(['professional', 'institutional']).optional(),
  payerType: z.enum(['medicare', 'medicaid', 'commercial']).optional(),
  priorAppeals: z.number().optional()
});

const denialRecordSchema = z.object({
  claimId: z.string(),
  carcCode: z.string(),
  rarcCode: z.string().optional(),
  deniedAmount: z.number().min(0),
  denialDate: z.string(),
  preventable: z.boolean().optional(),
  rootCause: z.string().optional()
});

const appealCreateSchema = z.object({
  claimId: z.string(),
  denialId: z.string(),
  appealLevel: z.number().min(1).max(3),
  deadline: z.string().optional()
});

const appealStatusUpdateSchema = z.object({
  status: z.enum(['DRAFT', 'FILED', 'UNDER_REVIEW', 'WON', 'LOST']),
  recoveredAmount: z.number().optional(),
  decisionDate: z.string().optional(),
  notes: z.string().optional()
});

/**
 * POST /denials/analyze
 * Analyze a denial and get resolution recommendations
 */
denialsRouter.post('/analyze', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = denialAnalysisSchema.parse(req.body);
    const result = await denialController.analyzeDenial(parsed);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.errors
        }
      });
    }
    next(error);
  }
});

/**
 * POST /denials
 * Record a new denial
 */
denialsRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = denialRecordSchema.parse(req.body);
    const result = await denialController.recordDenial(parsed);

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.errors
        }
      });
    }
    next(error);
  }
});

/**
 * GET /denials/analytics/:organizationId
 * Get denial analytics for an organization
 */
denialsRouter.get('/analytics/:organizationId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req.params;
    const { startDate, endDate } = req.query;

    const result = await denialController.getDenialAnalytics(
      organizationId,
      startDate as string | undefined,
      endDate as string | undefined
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /denials/claim/:claimId
 * Get denials for a specific claim
 */
denialsRouter.get('/claim/:claimId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { claimId } = req.params;
    const denials = await denialController.getClaimDenials(claimId);

    res.json({
      success: true,
      data: denials
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /denials/appeals
 * Create an appeal for a denial
 */
denialsRouter.post('/appeals', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = appealCreateSchema.parse(req.body);
    const result = await denialController.createAppeal(parsed);

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.errors
        }
      });
    }
    next(error);
  }
});

/**
 * PATCH /denials/appeals/:appealId
 * Update appeal status
 */
denialsRouter.patch('/appeals/:appealId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { appealId } = req.params;
    const parsed = appealStatusUpdateSchema.parse(req.body);

    const result = await denialController.updateAppealStatus(
      appealId,
      parsed.status,
      {
        recoveredAmount: parsed.recoveredAmount,
        decisionDate: parsed.decisionDate,
        notes: parsed.notes
      }
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.errors
        }
      });
    }
    next(error);
  }
});

/**
 * GET /denials/carc-codes
 * Get all CARC codes
 */
denialsRouter.get('/carc-codes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const codes = denialController.getCARCCodes();

    res.json({
      success: true,
      data: codes
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /denials/carc-codes/:category
 * Get CARC codes by category
 */
denialsRouter.get('/carc-codes/:category', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category } = req.params;
    const validCategories = [
      'eligibility', 'authorization', 'coding', 'timely_filing',
      'duplicate', 'medical_necessity', 'bundling', 'cob',
      'technical', 'patient_responsibility', 'other'
    ];

    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid category',
          code: 'INVALID_CATEGORY',
          validCategories
        }
      });
    }

    const codes = denialController.getCARCCodesByCategory(category as any);

    res.json({
      success: true,
      data: codes
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /denials/batch-recovery
 * Calculate batch recovery potential
 */
denialsRouter.post('/batch-recovery', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { denialIds } = req.body;

    if (!Array.isArray(denialIds) || denialIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'denialIds must be a non-empty array',
          code: 'INVALID_INPUT'
        }
      });
    }

    const result = await denialController.calculateBatchRecovery(denialIds);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});
