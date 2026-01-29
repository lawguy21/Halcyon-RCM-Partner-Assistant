// @ts-nocheck
/**
 * Payer Management Routes
 *
 * REST API routes for payer and contract management including:
 * - Payer CRUD operations
 * - Contract management
 * - Fee schedule import and lookup
 * - Authorization requirements
 * - Deadline calculations
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as payerController from '../controllers/payerController.js';

export const payersRouter = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createPayerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['government', 'commercial', 'workers_comp', 'auto', 'other']),
  payerId: z.string().min(1, 'Payer ID is required'),
  electronicPayerId: z.string().optional(),
  clearinghouseId: z.string().optional(),
  timelyFilingDays: z.number().min(1).max(730).optional(),
  appealDays: z.number().min(1).max(365).optional(),
  requiresPriorAuth: z.boolean().optional(),
  providerPhone: z.string().optional(),
  providerPortal: z.string().url().optional(),
  states: z.array(z.string().length(2)).optional(),
  notes: z.string().optional(),
  organizationId: z.string().optional()
});

const updatePayerSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(['government', 'commercial', 'workers_comp', 'auto', 'other']).optional(),
  electronicPayerId: z.string().optional(),
  clearinghouseId: z.string().optional(),
  timelyFilingDays: z.number().min(1).max(730).optional(),
  appealDays: z.number().min(1).max(365).optional(),
  requiresPriorAuth: z.boolean().optional(),
  providerPhone: z.string().optional(),
  providerPortal: z.string().url().optional(),
  states: z.array(z.string().length(2)).optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional()
});

const createContractSchema = z.object({
  payerId: z.string().min(1, 'Payer ID is required'),
  contractName: z.string().optional(),
  effectiveDate: z.string().min(1, 'Effective date is required'),
  termDate: z.string().optional(),
  reimbursementType: z.enum([
    'percent_of_medicare',
    'percent_of_charges',
    'fee_schedule',
    'case_rate',
    'per_diem',
    'drg',
    'capitation',
    'hybrid'
  ]),
  percentOfMedicare: z.number().min(0).max(500).optional(),
  percentOfCharges: z.number().min(0).max(100).optional(),
  caseRateAmount: z.number().min(0).optional(),
  perDiemRate: z.number().min(0).optional(),
  drgBaseRate: z.number().min(0).optional(),
  stopLossThreshold: z.number().min(0).optional(),
  stopLossPercentage: z.number().min(0).max(100).optional(),
  escalationPercentage: z.number().min(0).max(50).optional(),
  notes: z.string().optional()
});

const chargeSchema = z.object({
  cptCode: z.string().min(1),
  modifiers: z.array(z.string()).optional(),
  billedAmount: z.number().min(0),
  units: z.number().min(1),
  dateOfService: z.string().transform(val => new Date(val)),
  placeOfService: z.string().optional()
});

const feeScheduleImportSchema = z.object({
  csvData: z.array(z.object({
    cptCode: z.string(),
    description: z.string().optional(),
    modifier: z.string().optional(),
    allowedAmount: z.string(),
    nonFacilityRate: z.string().optional(),
    facilityRate: z.string().optional(),
    effectiveDate: z.string().optional(),
    terminationDate: z.string().optional(),
    rvu: z.string().optional(),
    placeOfService: z.string().optional()
  })),
  contractId: z.string().optional(),
  effectiveDate: z.string().optional(),
  updateExisting: z.boolean().optional()
});

const authRequirementSchema = z.object({
  payerId: z.string().min(1),
  cptCode: z.string().min(1),
  requiresAuth: z.boolean(),
  authValidDays: z.number().min(1).optional(),
  notificationOnly: z.boolean().optional(),
  turnaroundDays: z.number().min(1).optional(),
  emergencyException: z.boolean().optional(),
  retroAuthAllowed: z.boolean().optional(),
  retroAuthDays: z.number().min(1).optional(),
  notes: z.string().optional()
});

// ============================================================================
// PAYER ROUTES
// ============================================================================

/**
 * GET /payers
 * List all payers with filtering and pagination
 */
payersRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, state, search, includeBuiltIn, includeInactive, page, limit } = req.query;

    const result = await payerController.listPayers({
      type: type as string,
      state: state as string,
      search: search as string,
      includeBuiltIn: includeBuiltIn !== 'false',
      includeInactive: includeInactive === 'true',
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /payers/search
 * Search payers by name or ID
 */
payersRouter.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Search query (q) is required',
          code: 'MISSING_QUERY'
        }
      });
    }

    const result = payerController.searchPayers(q);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /payers/medicare
 * Get all Medicare payers
 */
payersRouter.get('/medicare', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = payerController.getMedicarePayers();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /payers/medicaid
 * Get all Medicaid payers
 */
payersRouter.get('/medicaid', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = payerController.getMedicaidPayers();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /payers/bcbs
 * Get all BCBS payers
 */
payersRouter.get('/bcbs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = payerController.getBCBSPayers();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /payers/:id
 * Get a single payer by ID
 */
payersRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const result = await payerController.getPayer(id);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /payers
 * Create a new payer
 */
payersRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createPayerSchema.parse(req.body);
    const result = await payerController.createPayer(parsed);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(201).json(result);
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
 * PUT /payers/:id
 * Update an existing payer
 */
payersRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const parsed = updatePayerSchema.parse(req.body);
    const result = await payerController.updatePayer(id, parsed);

    if (!result.success) {
      return res.status(result.error?.code === 'PAYER_NOT_FOUND' ? 404 : 400).json(result);
    }

    res.json(result);
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

// ============================================================================
// CONTRACT ROUTES
// ============================================================================

/**
 * GET /payers/:id/contracts
 * Get contracts for a payer
 */
payersRouter.get('/:id/contracts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const result = await payerController.getContracts(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /payers/:id/contracts
 * Create a contract for a payer
 */
payersRouter.post('/:id/contracts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const body = { ...req.body, payerId: id };
    const parsed = createContractSchema.parse(body);
    const result = await payerController.createContract(parsed);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(201).json(result);
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

// ============================================================================
// FEE SCHEDULE ROUTES
// ============================================================================

/**
 * POST /payers/:id/fee-schedule
 * Import fee schedule for a payer
 */
payersRouter.post('/:id/fee-schedule', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const parsed = feeScheduleImportSchema.parse(req.body);
    const result = await payerController.importFeeSchedule({
      payerId: id,
      ...parsed
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(201).json(result);
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
 * GET /payers/:id/fee-lookup
 * Lookup fee for a CPT code
 */
payersRouter.get('/:id/fee-lookup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { cptCode, dateOfService, modifier, placeOfService } = req.query;

    if (!cptCode || !dateOfService) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'cptCode and dateOfService are required',
          code: 'MISSING_REQUIRED_PARAMS'
        }
      });
    }

    const result = await payerController.lookupFee(
      id,
      cptCode as string,
      dateOfService as string,
      {
        modifier: modifier as string,
        placeOfService: placeOfService as string
      }
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /payers/:id/expected-reimbursement
 * Calculate expected reimbursement for charges
 */
payersRouter.post('/:id/expected-reimbursement', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { charges } = req.body;

    if (!charges || !Array.isArray(charges)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'charges array is required',
          code: 'MISSING_CHARGES'
        }
      });
    }

    // Parse and validate charges
    const parsedCharges = charges.map((c: any) => chargeSchema.parse(c));

    const result = await payerController.getExpectedReimbursement(id, parsedCharges);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
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
 * GET /payers/:id/fee-schedule/stats
 * Get fee schedule statistics
 */
payersRouter.get('/:id/fee-schedule/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const result = payerController.getFeeScheduleStats(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /payers/:id/compare-medicare
 * Compare fee schedule to Medicare rates
 */
payersRouter.post('/:id/compare-medicare', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { cptCodes } = req.body;

    if (!cptCodes || !Array.isArray(cptCodes) || cptCodes.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'cptCodes array is required',
          code: 'MISSING_CPT_CODES'
        }
      });
    }

    const result = payerController.compareFeeScheduleToMedicare(id, cptCodes);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// AUTHORIZATION REQUIREMENT ROUTES
// ============================================================================

/**
 * GET /payers/:id/auth-requirements
 * Get authorization requirements for CPT codes
 */
payersRouter.get('/:id/auth-requirements', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { cptCodes, placeOfService, isEmergency } = req.query;

    if (!cptCodes) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'cptCodes query parameter is required (comma-separated)',
          code: 'MISSING_CPT_CODES'
        }
      });
    }

    const codes = (cptCodes as string).split(',').map(c => c.trim());

    const result = await payerController.getAuthRequirements(id, codes, {
      placeOfService: placeOfService as string,
      isEmergency: isEmergency === 'true'
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /payers/:id/auth-requirements
 * Set authorization requirement
 */
payersRouter.post('/:id/auth-requirements', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const body = { ...req.body, payerId: id };
    const parsed = authRequirementSchema.parse(body);
    const result = await payerController.setAuthRequirement(parsed);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(201).json(result);
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

// ============================================================================
// DEADLINE ROUTES
// ============================================================================

/**
 * GET /payers/:id/timely-filing-deadline
 * Get timely filing deadline
 */
payersRouter.get('/:id/timely-filing-deadline', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { dateOfService } = req.query;

    if (!dateOfService) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'dateOfService query parameter is required',
          code: 'MISSING_DATE'
        }
      });
    }

    const result = payerController.getTimelyFilingDeadline(id, dateOfService as string);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /payers/:id/appeal-deadline
 * Get appeal deadline
 */
payersRouter.get('/:id/appeal-deadline', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { denialDate, appealLevel } = req.query;

    if (!denialDate) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'denialDate query parameter is required',
          code: 'MISSING_DATE'
        }
      });
    }

    const result = payerController.getAppealDeadline(
      id,
      denialDate as string,
      appealLevel ? parseInt(appealLevel as string) : undefined
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});
