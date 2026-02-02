// @ts-nocheck
/**
 * Eligibility Routes
 * Routes for Medicaid/Medicare eligibility screening
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { eligibilityController } from '../controllers/eligibilityController.js';

export const eligibilityRouter = Router();

// Validation schemas
const eligibilityScreeningSchema = z.object({
  patientId: z.string().optional(),
  dateOfBirth: z.string(),
  stateOfResidence: z.string().length(2),
  householdSize: z.number().min(1),
  householdIncome: z.number().min(0),
  incomeFrequency: z.enum(['annual', 'monthly']),
  wages: z.number().optional(),
  selfEmployment: z.number().optional(),
  socialSecurity: z.number().optional(),
  unemployment: z.number().optional(),
  pension: z.number().optional(),
  investment: z.number().optional(),
  alimony: z.number().optional(),
  isPregnant: z.boolean().optional(),
  isDisabled: z.boolean().optional(),
  hasEndStageRenalDisease: z.boolean().optional(),
  hasALS: z.boolean().optional(),
  isReceivingSSDI: z.boolean().optional(),
  ssdiStartDate: z.string().optional(),
  hasMedicare: z.boolean().optional(),
  medicarePartA: z.boolean().optional(),
  medicarePartB: z.boolean().optional(),
  hasMedicaid: z.boolean().optional(),
  medicaidStatus: z.enum(['active', 'pending', 'denied', 'none']).optional(),
  dateOfService: z.string().optional(),
  applicationDate: z.string().optional()
});

const quickMAGISchema = z.object({
  stateCode: z.string().length(2),
  householdSize: z.number().min(1),
  monthlyIncome: z.number().min(0)
});

/**
 * POST /eligibility/screen
 * Perform comprehensive eligibility screening
 */
eligibilityRouter.post('/screen', async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('[Eligibility] Screening request received:', JSON.stringify(req.body, null, 2));
    const parsed = eligibilityScreeningSchema.parse(req.body);
    console.log('[Eligibility] Request validated, processing...');
    const result = await eligibilityController.screenEligibility(parsed);
    console.log('[Eligibility] Screening complete');

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[Eligibility] Screen error:', error);
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
    // Return detailed error for debugging
    return res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Internal server error',
        code: 'INTERNAL_ERROR',
        stack: process.env.NODE_ENV !== 'production' ? (error instanceof Error ? error.stack : undefined) : undefined
      }
    });
  }
});

/**
 * POST /eligibility/quick-magi
 * Quick MAGI check for preliminary screening
 */
eligibilityRouter.post('/quick-magi', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = quickMAGISchema.parse(req.body);
    const result = await eligibilityController.quickMAGIScreen(
      parsed.stateCode,
      parsed.householdSize,
      parsed.monthlyIncome
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
 * GET /eligibility/state/:stateCode
 * Get state-specific eligibility information
 */
eligibilityRouter.get('/state/:stateCode', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { stateCode } = req.params;

    if (!stateCode || stateCode.length !== 2) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid state code',
          code: 'INVALID_STATE_CODE'
        }
      });
    }

    const result = await eligibilityController.getStateEligibilityInfo(stateCode.toUpperCase());

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unknown state')) {
      return res.status(404).json({
        success: false,
        error: {
          message: error.message,
          code: 'STATE_NOT_FOUND'
        }
      });
    }
    next(error);
  }
});

/**
 * POST /eligibility/save
 * Save eligibility screening result
 */
eligibilityRouter.post('/save', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { input, result, userId, organizationId } = req.body;

    const savedResult = await eligibilityController.saveScreeningResult(
      input,
      result,
      userId,
      organizationId
    );

    res.status(201).json({
      success: true,
      data: savedResult
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /eligibility/states
 * Get all states with eligibility info summary
 */
eligibilityRouter.get('/states', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Import state configs
    const { STATE_MEDICAID_CONFIGS } = await import('@halcyon-rcm/core');

    const states = Object.values(STATE_MEDICAID_CONFIGS).map((config: any) => ({
      stateCode: config.stateCode,
      stateName: config.stateName,
      isExpansionState: config.isExpansionState,
      retroactiveWindow: config.retroactiveWindow,
      hasHPE: config.presumptiveEligibility?.hospital || false
    }));

    res.json({
      success: true,
      data: states
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /eligibility/expansion-states
 * Get list of Medicaid expansion states
 */
eligibilityRouter.get('/expansion-states', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { getAllExpansionStates } = await import('@halcyon-rcm/core');
    const expansionStates = getAllExpansionStates();

    res.json({
      success: true,
      data: {
        expansionStates,
        count: expansionStates.length
      }
    });
  } catch (error) {
    next(error);
  }
});
