// @ts-nocheck
/**
 * Compliance Routes
 * Routes for 501(r) charity care and DSH audit compliance
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { complianceController } from '../controllers/complianceController.js';

export const complianceRouter = Router();

// Validation schemas
const charityCareInputSchema = z.object({
  accountId: z.string(),
  totalCharges: z.number().min(0),
  dateOfService: z.string(),
  patientFPL: z.number().min(0),
  hospitalFAPPolicy: z.object({
    freeCareFPLThreshold: z.number(),
    discountTiers: z.array(z.object({
      maxFPL: z.number(),
      discountPercent: z.number()
    })),
    maxAmountDueAtFreeCareFPL: z.number()
  }),
  notificationsSent: z.array(z.object({
    type: z.enum(['FAP_PLAIN_LANGUAGE', 'ECA_30_DAY', 'ECA_WRITTEN', 'FAP_APPLICATION', 'FAP_DETERMINATION']),
    date: z.string(),
    confirmed: z.boolean().optional()
  })).optional(),
  fapApplicationReceived: z.boolean().optional(),
  fapApplicationDate: z.string().optional(),
  fapDeterminationMade: z.boolean().optional()
});

const dshAuditInputSchema = z.object({
  fiscalYear: z.number(),
  totalPatientDays: z.number().min(0),
  medicarePartADays: z.number().min(0),
  medicareSSIDays: z.number().min(0),
  medicaidDays: z.number().min(0),
  dualEligibleDays: z.number().min(0),
  totalOperatingCosts: z.number().min(0),
  medicaidPayments: z.number().min(0),
  medicarePayments: z.number().min(0),
  uncompensatedCareCosts: z.number().min(0),
  charityCareAtCost: z.number().min(0),
  badDebtAtCost: z.number().min(0),
  dshPaymentsReceived: z.number().min(0),
  facilityType: z.enum(['urban', 'rural', 'sole_community', 'critical_access'])
});

const complianceNoticeSchema = z.object({
  accountId: z.string(),
  noticeType: z.enum(['FAP_PLAIN_LANGUAGE', 'ECA_30_DAY', 'ECA_WRITTEN', 'FAP_APPLICATION', 'FAP_DETERMINATION']),
  sentDate: z.string(),
  deliveryMethod: z.string(),
  confirmed: z.boolean().optional()
});

/**
 * POST /compliance/charity-care/evaluate
 * Evaluate 501(r) charity care compliance
 */
complianceRouter.post('/charity-care/evaluate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = charityCareInputSchema.parse(req.body);
    const result = await complianceController.evaluateCharityCarecompliance(parsed);

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
 * POST /compliance/dsh/calculate
 * Calculate DSH audit metrics
 */
complianceRouter.post('/dsh/calculate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = dshAuditInputSchema.parse(req.body);
    const result = await complianceController.calculateDSHMetrics(parsed);

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
 * GET /compliance/dashboard/:organizationId
 * Get compliance dashboard data
 */
complianceRouter.get('/dashboard/:organizationId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req.params;
    const result = await complianceController.getDashboardData(organizationId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /compliance/notices
 * Record a compliance notice
 */
complianceRouter.post('/notices', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = complianceNoticeSchema.parse(req.body);
    const result = await complianceController.recordNotice(parsed);

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
 * GET /compliance/notices/:accountId
 * Get compliance notices for an account
 */
complianceRouter.get('/notices/:accountId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accountId } = req.params;
    const notices = await complianceController.getAccountNotices(accountId);

    res.json({
      success: true,
      data: notices
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /compliance/eca-status/:accountId
 * Check ECA status for an account
 */
complianceRouter.get('/eca-status/:accountId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accountId } = req.params;
    const result = await complianceController.checkECAStatus(accountId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /compliance/actions/:organizationId/:actionType
 * Get accounts requiring compliance action
 */
complianceRouter.get('/actions/:organizationId/:actionType', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId, actionType } = req.params;

    if (!['fap_notice', 'eca_deadline', 'application_followup'].includes(actionType)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid action type',
          code: 'INVALID_ACTION_TYPE'
        }
      });
    }

    const accounts = await complianceController.getAccountsRequiringAction(
      organizationId,
      actionType as any
    );

    res.json({
      success: true,
      data: accounts
    });
  } catch (error) {
    next(error);
  }
});
