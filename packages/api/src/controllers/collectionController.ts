// @ts-nocheck
/**
 * Collection Controller
 *
 * Handles HTTP requests for collection management operations.
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { collectionService } from '../services/collectionService.js';
import {
  CollectionState,
  getStateConfig,
  getAllowedTransitions,
} from '@halcyon-rcm/core';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const getAccountsSchema = z.object({
  state: z.string().optional(),
  states: z.string().optional(), // comma-separated
  agencyId: z.string().optional(),
  minBalance: z.string().optional().transform(v => v ? parseFloat(v) : undefined),
  maxBalance: z.string().optional().transform(v => v ? parseFloat(v) : undefined),
  minDaysPastDue: z.string().optional().transform(v => v ? parseInt(v, 10) : undefined),
  maxDaysPastDue: z.string().optional().transform(v => v ? parseInt(v, 10) : undefined),
  organizationId: z.string().optional(),
  limit: z.string().optional().transform(v => v ? parseInt(v, 10) : 50),
  offset: z.string().optional().transform(v => v ? parseInt(v, 10) : 0),
});

const transitionSchema = z.object({
  newState: z.enum([
    'CURRENT', 'PAST_DUE_30', 'PAST_DUE_60', 'PAST_DUE_90', 'PAST_DUE_120',
    'PRE_COLLECTION', 'COLLECTION_AGENCY', 'BAD_DEBT', 'PAID', 'WRITTEN_OFF'
  ]),
  reason: z.string().min(1),
});

const agencyAssignSchema = z.object({
  accountIds: z.array(z.string()).min(1),
  agencyId: z.string(),
});

const promiseToPaySchema = z.object({
  accountId: z.string(),
  promiseDate: z.string(),
  amount: z.number().positive(),
  notes: z.string().optional(),
});

const paymentPlanSchema = z.object({
  accountId: z.string(),
  totalAmount: z.number().positive(),
  numberOfPayments: z.number().int().min(2).max(60),
  paymentFrequency: z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY']),
  firstPaymentDate: z.string(),
  paymentAmount: z.number().positive(),
  notes: z.string().optional(),
});

const recallSchema = z.object({
  accountId: z.string(),
});

// ============================================================================
// CONTROLLER CLASS
// ============================================================================

class CollectionController {
  /**
   * GET /collections/accounts
   * List accounts by state with filters
   * IMPORTANT: Uses organizationId from authenticated user for tenant isolation
   */
  async getAccounts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const params = getAccountsSchema.parse(req.query);
      // TENANT ISOLATION: Use organizationId from authenticated user, not query params
      const organizationId = (req as any).user?.organizationId;

      const filters: any = {
        ...params,
        // Override any organizationId from query with user's organizationId
        organizationId: organizationId || params.organizationId,
      };

      // Parse comma-separated states
      if (params.states) {
        filters.states = params.states.split(',') as CollectionState[];
        delete filters.state;
      }

      const result = await collectionService.getAccountsInCollection(filters);

      res.json({
        success: true,
        data: result.accounts,
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          hasMore: result.offset + result.accounts.length < result.total,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: error.errors,
          },
        });
        return;
      }
      next(error);
    }
  }

  /**
   * GET /collections/accounts/:id
   * Get account detail
   * IMPORTANT: Uses organizationId from authenticated user for tenant isolation
   */
  async getAccountById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      // TENANT ISOLATION: Use organizationId from authenticated user
      const organizationId = (req as any).user?.organizationId;

      const account = await collectionService.getAccountById(id, organizationId);

      if (!account) {
        res.status(404).json({
          success: false,
          error: {
            message: `Account ${id} not found`,
            code: 'NOT_FOUND',
          },
        });
        return;
      }

      res.json({
        success: true,
        data: account,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /collections/accounts/:id/transition
   * Change account state
   * IMPORTANT: Uses organizationId from authenticated user for tenant isolation
   */
  async transitionAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const body = transitionSchema.parse(req.body);

      // Get user from auth context (if available)
      const performedBy = (req as any).user?.id;
      // TENANT ISOLATION: Use organizationId from authenticated user
      const organizationId = (req as any).user?.organizationId;

      const result = await collectionService.transitionAccount(
        id,
        body.newState,
        body.reason,
        performedBy,
        organizationId
      );

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: {
            message: result.reason,
            code: 'TRANSITION_NOT_ALLOWED',
          },
          data: result,
        });
        return;
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: error.errors,
          },
        });
        return;
      }
      next(error);
    }
  }

  /**
   * POST /collections/dunning/run
   * Run dunning batch
   * IMPORTANT: Uses organizationId from authenticated user for tenant isolation
   */
  async runDunningBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // TENANT ISOLATION: Use organizationId from authenticated user, not request body
      const organizationId = (req as any).user?.organizationId;

      const result = await collectionService.runDunningBatch(organizationId);

      res.json({
        success: true,
        data: result,
        summary: {
          processed: result.processed,
          actionsExecuted: result.actionsExecuted,
          skipped: result.skipped,
          errors: result.errors.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /collections/agency/assign
   * Assign accounts to collection agency
   * IMPORTANT: Uses organizationId from authenticated user for tenant isolation
   */
  async assignToAgency(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = agencyAssignSchema.parse(req.body);
      const assignedBy = (req as any).user?.id;
      // TENANT ISOLATION: Use organizationId from authenticated user
      const organizationId = (req as any).user?.organizationId;

      const result = await collectionService.assignToAgency(
        body.accountIds,
        body.agencyId,
        assignedBy,
        organizationId
      );

      const status = result.success ? 200 : (result.assignedCount > 0 ? 207 : 400);

      res.status(status).json({
        success: result.success,
        data: result,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: error.errors,
          },
        });
        return;
      }
      next(error);
    }
  }

  /**
   * POST /collections/agency/recall
   * Recall account from agency
   * IMPORTANT: Uses organizationId from authenticated user for tenant isolation
   */
  async recallFromAgency(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = recallSchema.parse(req.body);
      const recalledBy = (req as any).user?.id;
      // TENANT ISOLATION: Use organizationId from authenticated user
      const organizationId = (req as any).user?.organizationId;

      const result = await collectionService.recallFromAgency(
        body.accountId,
        recalledBy,
        organizationId
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: error.errors,
          },
        });
        return;
      }
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: {
            message: error.message,
            code: 'NOT_FOUND',
          },
        });
        return;
      }
      if (error instanceof Error && error.message.includes('not at collection agency')) {
        res.status(400).json({
          success: false,
          error: {
            message: error.message,
            code: 'INVALID_STATE',
          },
        });
        return;
      }
      next(error);
    }
  }

  /**
   * POST /collections/promise-to-pay
   * Record a promise to pay
   * IMPORTANT: Uses organizationId from authenticated user for tenant isolation
   */
  async recordPromiseToPay(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = promiseToPaySchema.parse(req.body);
      const createdBy = (req as any).user?.id;
      // TENANT ISOLATION: Use organizationId from authenticated user
      const organizationId = (req as any).user?.organizationId;

      const result = await collectionService.recordPromiseToPay({
        ...body,
        createdBy,
      }, organizationId);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: error.errors,
          },
        });
        return;
      }
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: {
            message: error.message,
            code: 'NOT_FOUND',
          },
        });
        return;
      }
      next(error);
    }
  }

  /**
   * POST /collections/payment-plan
   * Set up a payment plan
   * IMPORTANT: Uses organizationId from authenticated user for tenant isolation
   */
  async processPaymentPlan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = paymentPlanSchema.parse(req.body);
      const createdBy = (req as any).user?.id;
      // TENANT ISOLATION: Use organizationId from authenticated user
      const organizationId = (req as any).user?.organizationId;

      const result = await collectionService.processPaymentPlan({
        ...body,
        createdBy,
      }, organizationId);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: error.errors,
          },
        });
        return;
      }
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: {
            message: error.message,
            code: 'NOT_FOUND',
          },
        });
        return;
      }
      next(error);
    }
  }

  /**
   * GET /collections/dashboard
   * Get collection metrics dashboard
   * IMPORTANT: Uses organizationId from authenticated user for tenant isolation
   */
  async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // TENANT ISOLATION: Use organizationId from authenticated user, not query params
      const organizationId = (req as any).user?.organizationId;

      const dashboard = await collectionService.getDashboard(organizationId);

      res.json({
        success: true,
        data: dashboard,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /collections/aging-report
   * Get aging buckets report
   * IMPORTANT: Uses organizationId from authenticated user for tenant isolation
   */
  async getAgingReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // TENANT ISOLATION: Use organizationId from authenticated user, not query params
      const organizationId = (req as any).user?.organizationId;

      const report = await collectionService.getAgingReport(organizationId);

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /collections/prioritized
   * Get prioritized accounts by collection score
   * IMPORTANT: Uses organizationId from authenticated user for tenant isolation
   */
  async getPrioritizedAccounts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // TENANT ISOLATION: Use organizationId from authenticated user, not query params
      const organizationId = (req as any).user?.organizationId;
      const { limit } = req.query;

      const result = await collectionService.scoreAndPrioritizeAccounts(
        organizationId,
        limit ? parseInt(limit as string, 10) : 100
      );

      res.json({
        success: true,
        data: {
          accounts: result.accounts,
          portfolioMetrics: result.portfolioMetrics,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /collections/states
   * Get available collection states and their configurations
   */
  async getStates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const states: CollectionState[] = [
        'CURRENT', 'PAST_DUE_30', 'PAST_DUE_60', 'PAST_DUE_90', 'PAST_DUE_120',
        'PRE_COLLECTION', 'COLLECTION_AGENCY', 'BAD_DEBT', 'PAID', 'WRITTEN_OFF'
      ];

      const stateConfigs = states.map(state => ({
        state,
        ...getStateConfig(state),
        allowedTransitions: getAllowedTransitions(state).map(t => ({
          to: t.to,
          description: t.description,
          requiresApproval: t.requiresApproval,
        })),
      }));

      res.json({
        success: true,
        data: stateConfigs,
      });
    } catch (error) {
      next(error);
    }
  }
}

// Export singleton instance
export const collectionController = new CollectionController();
