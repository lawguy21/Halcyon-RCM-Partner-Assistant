// @ts-nocheck
/**
 * Assessment Routes
 * Routes for recovery assessment operations
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { assessmentController } from '../controllers/assessmentController.js';
import { exportController } from '../controllers/exportController.js';
import { optionalAuth, AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import type { HospitalRecoveryInput } from '@halcyon-rcm/core';

export const assessmentsRouter = Router();

// Apply optional auth to all routes - allows reading user's showDemoData preference
assessmentsRouter.use(optionalAuth);

/**
 * Helper to get user's showDemoData preference
 * Returns true if user wants to see demo data, false otherwise
 */
async function getUserShowDemoDataPreference(userId?: string): Promise<boolean> {
  if (!userId) return true; // Default to showing demo data for unauthenticated users

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { showDemoData: true },
    });
    return user?.showDemoData ?? true;
  } catch {
    return true; // Default to showing demo data on error
  }
}

// Validation schemas
const hospitalRecoveryInputSchema = z.object({
  stateOfResidence: z.string().length(2),
  stateOfService: z.string().length(2),
  dateOfService: z.string(),
  encounterType: z.enum(['inpatient', 'observation', 'ed', 'outpatient']),
  lengthOfStay: z.number().optional(),
  totalCharges: z.number().min(0),
  insuranceStatusOnDOS: z.enum(['uninsured', 'underinsured', 'medicaid', 'medicare', 'commercial']),
  highCostSharing: z.boolean().optional(),
  medicaidStatus: z.enum(['active', 'pending', 'recently_terminated', 'never', 'unknown']),
  medicaidTerminationDate: z.string().optional(),
  medicareStatus: z.enum(['active_part_a', 'active_part_b', 'pending', 'none']),
  ssiStatus: z.enum(['receiving', 'pending', 'denied', 'never_applied', 'unknown']),
  ssdiStatus: z.enum(['receiving', 'pending', 'denied', 'never_applied', 'unknown']),
  householdIncome: z.enum(['under_fpl', 'fpl_138', 'fpl_200', 'fpl_250', 'fpl_300', 'fpl_400', 'over_400_fpl']),
  householdSize: z.number().min(1),
  estimatedAssets: z.enum(['under_2000', '2000_5000', '5000_10000', 'over_10000', 'unknown']),
  disabilityLikelihood: z.enum(['high', 'medium', 'low']),
  ssiEligibilityLikely: z.boolean(),
  ssdiEligibilityLikely: z.boolean(),
  facilityType: z.enum(['public_hospital', 'dsh_hospital', 'safety_net', 'critical_access', 'standard']).optional(),
  facilityState: z.string().length(2),
  emergencyService: z.boolean(),
  medicallyNecessary: z.boolean(),
});

const createAssessmentSchema = z.object({
  input: hospitalRecoveryInputSchema,
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  patientIdentifier: z.string().optional(),
  accountNumber: z.string().optional(),
});

const batchAssessmentSchema = z.object({
  assessments: z.array(z.object({
    input: hospitalRecoveryInputSchema,
    patientIdentifier: z.string().optional(),
    accountNumber: z.string().optional(),
  })),
});

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
  tags: z.string().optional(), // Comma-separated
  limit: z.coerce.number().optional(),
  offset: z.coerce.number().optional(),
  sortBy: z.enum(['createdAt', 'estimatedRecovery', 'confidence']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

/**
 * POST /assessments
 * Create a single assessment from manual input
 */
assessmentsRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createAssessmentSchema.parse(req.body);

    const assessment = await assessmentController.createAssessment(
      parsed.input as HospitalRecoveryInput,
      {
        tags: parsed.tags,
        notes: parsed.notes,
        patientIdentifier: parsed.patientIdentifier,
        accountNumber: parsed.accountNumber,
      }
    );

    res.status(201).json({
      success: true,
      data: assessment,
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
 * POST /assessments/batch
 * Create assessments from array of patient data
 */
assessmentsRouter.post('/batch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = batchAssessmentSchema.parse(req.body);

    const result = await assessmentController.batchAssessment(
      parsed.assessments.map((a) => ({
        input: a.input as HospitalRecoveryInput,
        patientIdentifier: a.patientIdentifier,
        accountNumber: a.accountNumber,
      }))
    );

    res.status(201).json({
      success: true,
      data: {
        successful: result.successful,
        failed: result.failed,
        summary: {
          totalProcessed: result.totalProcessed,
          successCount: result.successCount,
          failureCount: result.failureCount,
        },
      },
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
 * GET /assessments
 * List assessments with filters and pagination
 */
assessmentsRouter.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = assessmentFiltersSchema.parse(req.query);

    // Get user's showDemoData preference
    const showDemoData = await getUserShowDemoDataPreference(req.user?.id);

    // Parse tags if provided
    const filters = {
      ...parsed,
      tags: parsed.tags ? parsed.tags.split(',').map((t) => t.trim()) : undefined,
      // Include demo data based on user preference
      includeDemoData: showDemoData,
    };

    const result = await assessmentController.getAssessments(filters);

    res.json({
      success: true,
      data: result.data,
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        hasMore: result.hasMore,
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
 * GET /assessments/:id
 * Get a single assessment by ID
 */
assessmentsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const assessment = await assessmentController.getAssessmentById(id);

    if (!assessment) {
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
      data: assessment,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /assessments/:id
 * Update assessment metadata (tags, notes)
 */
assessmentsRouter.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { tags, notes } = req.body;

    const assessment = await assessmentController.updateAssessmentMetadata(id, {
      tags,
      notes,
    });

    if (!assessment) {
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
      data: assessment,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /assessments/:id/recalculate
 * Recalculate assessment with updated input
 */
assessmentsRouter.put('/:id/recalculate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const parsed = hospitalRecoveryInputSchema.parse(req.body);

    const assessment = await assessmentController.recalculateAssessment(
      id,
      parsed as HospitalRecoveryInput
    );

    if (!assessment) {
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
      data: assessment,
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
 * DELETE /assessments/:id
 * Delete an assessment
 */
assessmentsRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const success = await assessmentController.deleteAssessment(id);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Assessment not found',
          code: 'NOT_FOUND',
        },
      });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * GET /assessments/:id/export
 * Export a single assessment as PDF data or CSV
 */
assessmentsRouter.get('/:id/export', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const format = (req.query.format as string) || 'json';

    // Verify assessment exists
    const assessment = await assessmentController.getAssessmentById(id);
    if (!assessment) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Assessment not found',
          code: 'NOT_FOUND',
        },
      });
    }

    if (format === 'csv') {
      const result = await exportController.exportToCSV({
        filters: { limit: 1, offset: 0 },
        includeInput: true,
      });

      // Filter to just this assessment
      const lines = result.content.split('\n');
      const header = lines[0];
      const dataLine = lines.find((line, idx) => idx > 0 && line.includes(id));

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="assessment-${id.substring(0, 8)}.csv"`);
      res.send(dataLine ? `${header}\n${dataLine}` : header);
    } else {
      // Return JSON for PDF generation
      const result = await exportController.exportPDF({ assessmentId: id });

      res.json({
        success: true,
        data: result.data,
        filename: result.filename,
      });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * POST /assessments/:id/create-work-item
 * Create a work queue item from an assessment
 * This will create a RecoveryAccount if one doesn't exist, then create a WorkQueueItem
 */
assessmentsRouter.post('/:id/create-work-item', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { queueType = 'NEW_ACCOUNTS', priority = 5, notes } = req.body;

    // Validate queue type
    const validQueueTypes = ['NEW_ACCOUNTS', 'PENDING_ELIGIBILITY', 'DENIALS', 'APPEALS', 'CALLBACKS', 'COMPLIANCE'];
    if (!validQueueTypes.includes(queueType)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid queue type',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    // Get the assessment
    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: { recoveryAccounts: true },
    });

    if (!assessment) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Assessment not found',
          code: 'NOT_FOUND',
        },
      });
    }

    // Check if a RecoveryAccount already exists for this assessment
    let recoveryAccount = assessment.recoveryAccounts[0];

    if (!recoveryAccount) {
      // Create a RecoveryAccount from the assessment
      recoveryAccount = await prisma.recoveryAccount.create({
        data: {
          assessmentId: id,
          originalCharges: assessment.totalCharges,
          currentBalance: assessment.totalCharges,
          status: 'INTAKE',
          organizationId: assessment.organizationId,
        },
      });
    }

    // Check if a work queue item already exists for this account
    const existingWorkItem = await prisma.workQueueItem.findFirst({
      where: {
        accountId: recoveryAccount.id,
        status: { not: 'COMPLETED' },
      },
    });

    if (existingWorkItem) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'A work queue item already exists for this assessment',
          code: 'ALREADY_EXISTS',
          data: { workItemId: existingWorkItem.id },
        },
      });
    }

    // Create the work queue item
    const workQueueItem = await prisma.workQueueItem.create({
      data: {
        accountId: recoveryAccount.id,
        queueType,
        priority,
        notes: notes || `Created from assessment ${id}`,
        status: 'PENDING',
        assignedToId: req.user?.id || null,
      },
    });

    // Log the action
    if (req.user?.id) {
      await prisma.auditLog.create({
        data: {
          action: 'WORK_QUEUE_ITEM_CREATED',
          entityType: 'WorkQueueItem',
          entityId: workQueueItem.id,
          userId: req.user.id,
          details: {
            assessmentId: id,
            accountId: recoveryAccount.id,
            queueType,
          },
        },
      });
    }

    res.status(201).json({
      success: true,
      data: {
        workQueueItem,
        recoveryAccount: {
          id: recoveryAccount.id,
          status: recoveryAccount.status,
        },
      },
      message: 'Work queue item created successfully',
    });
  } catch (error) {
    next(error);
  }
});
