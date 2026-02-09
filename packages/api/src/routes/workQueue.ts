// @ts-nocheck
/**
 * Work Queue Routes
 * Routes for managing work queue items and assignments
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { workQueueController } from '../controllers/workQueueController.js';

export const workQueueRouter = Router();

// Validation schemas
const workQueueFiltersSchema = z.object({
  queueType: z.enum(['NEW_ACCOUNTS', 'PENDING_ELIGIBILITY', 'DENIALS', 'APPEALS', 'CALLBACKS', 'COMPLIANCE']).optional(),
  assignedToId: z.string().optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']).optional(),
  priority: z.coerce.number().optional(),
  dueDateBefore: z.string().optional(),
  dueDateAfter: z.string().optional(),
  limit: z.coerce.number().optional(),
  offset: z.coerce.number().optional()
});

const workQueueItemSchema = z.object({
  accountId: z.string(),
  queueType: z.enum(['NEW_ACCOUNTS', 'PENDING_ELIGIBILITY', 'DENIALS', 'APPEALS', 'CALLBACKS', 'COMPLIANCE']),
  priority: z.number().min(1).max(10).optional(),
  dueDate: z.string().optional(),
  assignedToId: z.string().optional(),
  notes: z.string().optional()
});

const claimItemSchema = z.object({
  userId: z.string()
});

const completeItemSchema = z.object({
  userId: z.string(),
  notes: z.string().optional()
});

const reassignItemSchema = z.object({
  newAssigneeId: z.string(),
  currentUserId: z.string()
});

/**
 * GET /work-queue
 * Get work queue items with filters
 */
workQueueRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = workQueueFiltersSchema.parse(req.query);
    const result = await workQueueController.getItems(parsed);

    res.json({
      success: true,
      data: result.items,
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        hasMore: result.offset + result.limit < result.total
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid query parameters',
          code: 'VALIDATION_ERROR',
          details: error.errors
        }
      });
    }
    next(error);
  }
});

/**
 * GET /work-queue/stats
 * Get work queue statistics
 */
workQueueRouter.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req.query;
    const result = await workQueueController.getStats(organizationId as string | undefined);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /work-queue/next
 * Get next item for a user to work on
 */
workQueueRouter.get('/next', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, queueType } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'userId is required',
          code: 'MISSING_USER_ID'
        }
      });
    }

    const item = await workQueueController.getNextItem(
      userId as string,
      queueType as any
    );

    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /work-queue/:itemId
 * Get a single work queue item
 */
workQueueRouter.get('/:itemId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { itemId } = req.params;
    const item = await workQueueController.getItem(itemId);

    if (!item) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Work queue item not found',
          code: 'NOT_FOUND'
        }
      });
    }

    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /work-queue
 * Create a new work queue item
 */
workQueueRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = workQueueItemSchema.parse(req.body);
    const result = await workQueueController.createItem(parsed);

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
 * POST /work-queue/bulk
 * Bulk create work queue items
 */
workQueueRouter.post('/bulk', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'items must be a non-empty array',
          code: 'INVALID_INPUT'
        }
      });
    }

    const parsedItems = items.map(item => workQueueItemSchema.parse(item));
    const result = await workQueueController.bulkCreate(parsedItems);

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
 * POST /work-queue/:itemId/claim
 * Claim a work queue item
 */
workQueueRouter.post('/:itemId/claim', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { itemId } = req.params;
    const parsed = claimItemSchema.parse(req.body);

    const result = await workQueueController.claimItem(itemId, parsed.userId);

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
    if (error instanceof Error) {
      if (error.message === 'User not found') {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid user ID - user does not exist', code: 'INVALID_USER' }
        });
      }
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: { message: error.message, code: 'NOT_FOUND' }
        });
      }
      if (error.message.includes('already assigned')) {
        return res.status(409).json({
          success: false,
          error: { message: error.message, code: 'CONFLICT' }
        });
      }
    }
    next(error);
  }
});

/**
 * POST /work-queue/:itemId/release
 * Release a work queue item
 */
workQueueRouter.post('/:itemId/release', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { itemId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'userId is required',
          code: 'MISSING_USER_ID'
        }
      });
    }

    const result = await workQueueController.releaseItem(itemId, userId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: { message: error.message, code: 'NOT_FOUND' }
        });
      }
      if (error.message.includes('only release')) {
        return res.status(403).json({
          success: false,
          error: { message: error.message, code: 'FORBIDDEN' }
        });
      }
    }
    next(error);
  }
});

/**
 * POST /work-queue/:itemId/complete
 * Complete a work queue item
 */
workQueueRouter.post('/:itemId/complete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { itemId } = req.params;
    const parsed = completeItemSchema.parse(req.body);

    const result = await workQueueController.completeItem(
      itemId,
      parsed.userId,
      parsed.notes
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
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: { message: error.message, code: 'NOT_FOUND' }
        });
      }
      if (error.message.includes('only complete')) {
        return res.status(403).json({
          success: false,
          error: { message: error.message, code: 'FORBIDDEN' }
        });
      }
    }
    next(error);
  }
});

/**
 * PATCH /work-queue/:itemId/priority
 * Update item priority
 */
workQueueRouter.patch('/:itemId/priority', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { itemId } = req.params;
    const { priority } = req.body;

    if (typeof priority !== 'number' || priority < 1 || priority > 10) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'priority must be a number between 1 and 10',
          code: 'INVALID_PRIORITY'
        }
      });
    }

    const result = await workQueueController.updatePriority(itemId, priority);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /work-queue/:itemId/reassign
 * Reassign item to another user
 */
workQueueRouter.post('/:itemId/reassign', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { itemId } = req.params;
    const parsed = reassignItemSchema.parse(req.body);

    const result = await workQueueController.reassignItem(
      itemId,
      parsed.newAssigneeId,
      parsed.currentUserId
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
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: { message: error.message, code: 'NOT_FOUND' }
      });
    }
    next(error);
  }
});

/**
 * POST /work-queue/auto-generate/:organizationId
 * Auto-generate work queue items based on rules
 */
workQueueRouter.post('/auto-generate/:organizationId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req.params;
    const result = await workQueueController.autoGenerateItems(organizationId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});
