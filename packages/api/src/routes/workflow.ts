// @ts-nocheck
/**
 * Workflow Rules Routes
 *
 * REST API routes for workflow rule management including:
 * - Rule CRUD operations
 * - Rule testing
 * - Execution history
 * - Templates
 * - Import/Export
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as workflowController from '../controllers/workflowController.js';

export const workflowRouter = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const triggerSchema = z.object({
  type: z.enum([
    'on_create',
    'on_update',
    'on_status_change',
    'on_field_change',
    'scheduled',
    'manual',
    'on_payment_posted',
    'on_denial_received',
    'on_claim_submitted',
    'on_deadline_approaching',
    'on_assignment_change',
    'webhook',
  ]),
  entityType: z.string().optional(),
  watchFields: z.array(z.string()).optional(),
  fromStatus: z.array(z.string()).optional(),
  toStatus: z.array(z.string()).optional(),
  schedule: z.string().optional(),
  timezone: z.string().optional(),
  daysBeforeDeadline: z.number().optional(),
  webhookPath: z.string().optional(),
});

const conditionSchema: z.ZodType<any> = z.lazy(() =>
  z.union([
    z.object({
      id: z.string().optional(),
      field: z.string(),
      operator: z.enum([
        'equals',
        'not_equals',
        'greater_than',
        'less_than',
        'greater_than_or_equals',
        'less_than_or_equals',
        'contains',
        'not_contains',
        'starts_with',
        'ends_with',
        'in_list',
        'not_in_list',
        'between',
        'is_null',
        'is_not_null',
        'regex',
        'days_since_greater_than',
        'days_since_less_than',
        'business_days_since_greater_than',
        'business_days_since_less_than',
      ]),
      value: z.any(),
      logicalOperator: z.enum(['AND', 'OR']).optional(),
      negate: z.boolean().optional(),
      caseInsensitive: z.boolean().optional(),
    }),
    z.object({
      id: z.string().optional(),
      logicalOperator: z.enum(['AND', 'OR']),
      conditions: z.array(conditionSchema),
    }),
  ])
);

const actionSchema = z.object({
  id: z.string().optional(),
  type: z.enum([
    'assign_queue',
    'send_notification',
    'update_field',
    'create_task',
    'escalate',
    'trigger_webhook',
    'delay',
    'conditional_branch',
    'send_email',
    'send_sms',
    'add_note',
    'set_priority',
    'assign_user',
    'create_follow_up',
    'run_script',
    'stop_processing',
  ]),
  parameters: z.record(z.any()),
  order: z.number().optional(),
  continueOnError: z.boolean().optional(),
  delayMs: z.number().optional(),
});

const createRuleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  trigger: triggerSchema,
  conditions: z.array(conditionSchema),
  conditionsOperator: z.enum(['AND', 'OR']).optional(),
  actions: z.array(actionSchema).min(1, 'At least one action is required'),
  priority: z.number().min(0).max(1000),
  isActive: z.boolean().optional(),
  organizationId: z.string().optional(),
  createdBy: z.string().optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
  effectiveFrom: z.string().datetime().optional(),
  effectiveTo: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional(),
});

const updateRuleSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  trigger: triggerSchema.optional(),
  conditions: z.array(conditionSchema).optional(),
  conditionsOperator: z.enum(['AND', 'OR']).optional(),
  actions: z.array(actionSchema).optional(),
  priority: z.number().min(0).max(1000).optional(),
  isActive: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
  effectiveFrom: z.string().datetime().optional(),
  effectiveTo: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional(),
});

const testRuleSchema = z.object({
  testContext: z.object({
    entity: z.record(z.any()),
    entityType: z.string(),
    entityId: z.string().optional(),
    previousEntity: z.record(z.any()).optional(),
    changedFields: z.array(z.string()).optional(),
    userId: z.string().optional(),
    metadata: z.record(z.any()).optional(),
  }),
});

const importRulesSchema = z.object({
  rules: z.array(createRuleSchema),
  validateOnly: z.boolean().optional(),
  skipDuplicates: z.boolean().optional(),
  organizationId: z.string().optional(),
  createdBy: z.string().optional(),
});

const createFromTemplateSchema = z.object({
  name: z.string().optional(),
  priority: z.number().optional(),
  isActive: z.boolean().optional(),
  organizationId: z.string().optional(),
  createdBy: z.string().optional(),
  parameterValues: z.record(z.any()).optional(),
});

const executeRulesSchema = z.object({
  trigger: z.string(),
  context: z.object({
    entity: z.record(z.any()),
    entityType: z.string(),
    entityId: z.string(),
    previousEntity: z.record(z.any()).optional(),
    changedFields: z.array(z.string()).optional(),
    userId: z.string().optional(),
    organizationId: z.string().optional(),
    metadata: z.record(z.any()).optional(),
  }),
});

// ============================================================================
// RULE ROUTES
// ============================================================================

/**
 * GET /workflow/rules
 * List all rules with filtering and pagination
 */
workflowRouter.get('/rules', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      isActive,
      triggerType,
      category,
      tags,
      organizationId,
      search,
      page,
      limit,
    } = req.query;

    const result = await workflowController.listRules({
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      triggerType: triggerType as string,
      category: category as string,
      tags: tags ? (tags as string).split(',') : undefined,
      organizationId: organizationId as string,
      search: search as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /workflow/rules
 * Create a new rule
 */
workflowRouter.post('/rules', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createRuleSchema.parse(req.body);
    const result = await workflowController.createRule(parsed);

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
          details: error.errors,
        },
      });
    }
    next(error);
  }
});

/**
 * GET /workflow/rules/statistics
 * Get rule statistics
 */
workflowRouter.get('/rules/statistics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req.query;
    const result = await workflowController.getRuleStatistics(organizationId as string);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /workflow/rules/export
 * Export all rules
 */
workflowRouter.get('/rules/export', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId, activeOnly, category } = req.query;

    const result = await workflowController.exportRules({
      organizationId: organizationId as string,
      activeOnly: activeOnly === 'true',
      category: category as string,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /workflow/rules/import
 * Import rules from JSON
 */
workflowRouter.post('/rules/import', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = importRulesSchema.parse(req.body);
    const result = await workflowController.importRules(parsed.rules, {
      validateOnly: parsed.validateOnly,
      skipDuplicates: parsed.skipDuplicates,
      organizationId: parsed.organizationId,
      createdBy: parsed.createdBy,
    });

    res.json(result);
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
 * POST /workflow/rules/execute
 * Execute rules for a specific trigger
 */
workflowRouter.post('/rules/execute', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = executeRulesSchema.parse(req.body);
    const result = await workflowController.executeRulesForTrigger(
      parsed.trigger,
      parsed.context
    );

    res.json(result);
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
 * GET /workflow/rules/:id
 * Get a single rule by ID
 */
workflowRouter.get('/rules/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const result = await workflowController.getRule(id);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /workflow/rules/:id
 * Update an existing rule
 */
workflowRouter.put('/rules/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const parsed = updateRuleSchema.parse(req.body);
    const result = await workflowController.updateRule(id, parsed);

    if (!result.success) {
      return res.status(result.error?.code === 'RULE_NOT_FOUND' ? 404 : 400).json(result);
    }

    res.json(result);
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
 * DELETE /workflow/rules/:id
 * Delete a rule
 */
workflowRouter.delete('/rules/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const result = await workflowController.deleteRule(id);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /workflow/rules/:id/toggle
 * Toggle rule active status
 */
workflowRouter.post('/rules/:id/toggle', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'isActive must be a boolean',
          code: 'INVALID_INPUT',
        },
      });
    }

    const result = await workflowController.toggleRule(id, isActive);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /workflow/rules/:id/test
 * Test a rule with sample context
 */
workflowRouter.post('/rules/:id/test', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const parsed = testRuleSchema.parse(req.body);

    const result = await workflowController.testRule({
      ruleId: id,
      testContext: parsed.testContext,
    });

    if (!result.success) {
      return res.status(result.error?.code === 'RULE_NOT_FOUND' ? 404 : 400).json(result);
    }

    res.json(result);
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
 * GET /workflow/rules/:id/history
 * Get execution history for a rule
 */
workflowRouter.get('/rules/:id/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { page, limit, startDate, endDate, triggeredOnly } = req.query;

    const result = await workflowController.getExecutionHistory(id, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      startDate: startDate as string,
      endDate: endDate as string,
      triggeredOnly: triggeredOnly === 'true',
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// TEMPLATE ROUTES
// ============================================================================

/**
 * GET /workflow/templates
 * Get all rule templates
 */
workflowRouter.get('/templates', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = workflowController.getTemplates();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /workflow/templates/:id/create
 * Create a rule from a template
 */
workflowRouter.post('/templates/:id/create', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const parsed = createFromTemplateSchema.parse(req.body);

    const result = await workflowController.createRuleFromTemplate(id, parsed);

    if (!result.success) {
      return res.status(result.error?.code === 'TEMPLATE_NOT_FOUND' ? 404 : 400).json(result);
    }

    res.status(201).json(result);
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
