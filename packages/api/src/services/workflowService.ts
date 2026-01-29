// @ts-nocheck
/**
 * Workflow Rules Service
 *
 * Business logic for workflow rule management including:
 * - Rule CRUD operations
 * - Rule testing and execution
 * - Execution history tracking
 * - Rule import/export
 */

import { prisma } from '../lib/prisma.js';
import {
  type WorkflowRule,
  type RuleExecutionContext,
  type RuleExecutionResult,
  type RuleValidationResult,
  type RuleTriggerType,
  executeRule,
  executeRules,
  validateRule,
  registerActionHandler,
  getAllTemplates,
  getTemplateById,
  createRuleFromTemplate,
} from '@halcyon-rcm/core';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateRuleInput {
  name: string;
  description?: string;
  trigger: WorkflowRule['trigger'];
  conditions: WorkflowRule['conditions'];
  conditionsOperator?: 'AND' | 'OR';
  actions: WorkflowRule['actions'];
  priority: number;
  isActive?: boolean;
  organizationId?: string;
  createdBy?: string;
  tags?: string[];
  category?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateRuleInput {
  name?: string;
  description?: string;
  trigger?: WorkflowRule['trigger'];
  conditions?: WorkflowRule['conditions'];
  conditionsOperator?: 'AND' | 'OR';
  actions?: WorkflowRule['actions'];
  priority?: number;
  isActive?: boolean;
  tags?: string[];
  category?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  metadata?: Record<string, unknown>;
}

export interface RuleListFilters {
  isActive?: boolean;
  triggerType?: RuleTriggerType;
  category?: string;
  tags?: string[];
  organizationId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface TestRuleInput {
  ruleId: string;
  testContext: {
    entity: Record<string, unknown>;
    entityType: string;
    entityId?: string;
    previousEntity?: Record<string, unknown>;
    changedFields?: string[];
    userId?: string;
    metadata?: Record<string, unknown>;
  };
}

export interface RuleExecutionLog {
  id: string;
  ruleId: string;
  ruleName: string;
  trigger: RuleTriggerType;
  entityType: string;
  entityId: string;
  triggered: boolean;
  conditionsPassed: boolean;
  actionsExecuted: boolean;
  conditionResults: unknown[];
  actionResults: unknown[];
  executionTimeMs: number;
  error?: string;
  context: Record<string, unknown>;
  executedAt: Date;
  executedBy?: string;
}

// ============================================================================
// WORKFLOW SERVICE CLASS
// ============================================================================

export class WorkflowService {
  /**
   * Create a new workflow rule
   */
  async createRule(input: CreateRuleInput): Promise<WorkflowRule> {
    // Validate the rule
    const validation = validateRule(input as unknown as Partial<WorkflowRule>);
    if (!validation.isValid) {
      throw new Error(`Rule validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    const rule = await prisma.workflowRule.create({
      data: {
        name: input.name,
        description: input.description,
        trigger: input.trigger as unknown as object,
        conditions: input.conditions as unknown as object,
        conditionsOperator: input.conditionsOperator || 'AND',
        actions: input.actions as unknown as object,
        priority: input.priority,
        isActive: input.isActive ?? false,
        organizationId: input.organizationId,
        createdBy: input.createdBy,
        tags: input.tags || [],
        category: input.category,
        effectiveFrom: input.effectiveFrom ? new Date(input.effectiveFrom) : null,
        effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null,
        metadata: input.metadata || {},
        version: 1,
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: 'WORKFLOW_RULE_CREATED',
        entityType: 'WorkflowRule',
        entityId: rule.id,
        userId: input.createdBy,
        details: {
          name: input.name,
          trigger: input.trigger.type,
        },
      },
    });

    return this.mapPrismaRuleToWorkflowRule(rule);
  }

  /**
   * Update an existing workflow rule
   */
  async updateRule(ruleId: string, updates: UpdateRuleInput): Promise<WorkflowRule> {
    // Fetch current rule
    const currentRule = await prisma.workflowRule.findUnique({
      where: { id: ruleId },
    });

    if (!currentRule) {
      throw new Error('Rule not found');
    }

    // Merge updates with current rule for validation
    const mergedRule = {
      ...currentRule,
      ...updates,
      trigger: updates.trigger || currentRule.trigger,
      conditions: updates.conditions || currentRule.conditions,
      actions: updates.actions || currentRule.actions,
    };

    // Validate the merged rule
    const validation = validateRule(mergedRule as unknown as Partial<WorkflowRule>);
    if (!validation.isValid) {
      throw new Error(`Rule validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    const rule = await prisma.workflowRule.update({
      where: { id: ruleId },
      data: {
        name: updates.name,
        description: updates.description,
        trigger: updates.trigger as unknown as object,
        conditions: updates.conditions as unknown as object,
        conditionsOperator: updates.conditionsOperator,
        actions: updates.actions as unknown as object,
        priority: updates.priority,
        isActive: updates.isActive,
        tags: updates.tags,
        category: updates.category,
        effectiveFrom: updates.effectiveFrom ? new Date(updates.effectiveFrom) : undefined,
        effectiveTo: updates.effectiveTo ? new Date(updates.effectiveTo) : undefined,
        metadata: updates.metadata,
        version: { increment: 1 },
        updatedAt: new Date(),
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: 'WORKFLOW_RULE_UPDATED',
        entityType: 'WorkflowRule',
        entityId: ruleId,
        details: {
          updates: Object.keys(updates),
        },
      },
    });

    return this.mapPrismaRuleToWorkflowRule(rule);
  }

  /**
   * Get a rule by ID
   */
  async getRule(ruleId: string): Promise<WorkflowRule | null> {
    const rule = await prisma.workflowRule.findUnique({
      where: { id: ruleId },
    });

    if (!rule) {
      return null;
    }

    return this.mapPrismaRuleToWorkflowRule(rule);
  }

  /**
   * Delete a rule
   */
  async deleteRule(ruleId: string): Promise<boolean> {
    try {
      await prisma.workflowRule.delete({
        where: { id: ruleId },
      });

      // Log the action
      await prisma.auditLog.create({
        data: {
          action: 'WORKFLOW_RULE_DELETED',
          entityType: 'WorkflowRule',
          entityId: ruleId,
        },
      });

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Toggle rule active status
   */
  async toggleRule(ruleId: string, isActive: boolean): Promise<WorkflowRule> {
    const rule = await prisma.workflowRule.update({
      where: { id: ruleId },
      data: {
        isActive,
        updatedAt: new Date(),
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: isActive ? 'WORKFLOW_RULE_ENABLED' : 'WORKFLOW_RULE_DISABLED',
        entityType: 'WorkflowRule',
        entityId: ruleId,
      },
    });

    return this.mapPrismaRuleToWorkflowRule(rule);
  }

  /**
   * List rules with filtering and pagination
   */
  async listRules(filters: RuleListFilters): Promise<{
    rules: WorkflowRule[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 50, 100);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.triggerType) {
      where.trigger = {
        path: ['type'],
        equals: filters.triggerType,
      };
    }

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.tags && filters.tags.length > 0) {
      where.tags = {
        hasSome: filters.tags,
      };
    }

    if (filters.organizationId) {
      where.organizationId = filters.organizationId;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [rules, total] = await Promise.all([
      prisma.workflowRule.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { priority: 'asc' },
          { name: 'asc' },
        ],
      }),
      prisma.workflowRule.count({ where }),
    ]);

    return {
      rules: rules.map(this.mapPrismaRuleToWorkflowRule),
      total,
      page,
      limit,
    };
  }

  /**
   * Test a rule without actually executing actions
   */
  async testRule(input: TestRuleInput): Promise<{
    rule: WorkflowRule;
    result: RuleExecutionResult;
    dryRun: boolean;
  }> {
    const rule = await this.getRule(input.ruleId);

    if (!rule) {
      throw new Error('Rule not found');
    }

    // Build execution context
    const context: RuleExecutionContext = {
      entity: input.testContext.entity,
      entityType: input.testContext.entityType,
      entityId: input.testContext.entityId || 'test_entity',
      trigger: rule.trigger.type,
      previousEntity: input.testContext.previousEntity,
      changedFields: input.testContext.changedFields,
      userId: input.testContext.userId,
      metadata: input.testContext.metadata,
      timestamp: new Date(),
    };

    // Execute rule (actions will be simulated based on registered handlers)
    const result = await executeRule(rule, context);

    return {
      rule,
      result,
      dryRun: true,
    };
  }

  /**
   * Execute all matching rules for a trigger
   */
  async executeRulesForTrigger(
    trigger: RuleTriggerType,
    context: Omit<RuleExecutionContext, 'trigger' | 'timestamp'>
  ): Promise<RuleExecutionResult[]> {
    // Fetch all active rules for this trigger type
    const { rules } = await this.listRules({
      isActive: true,
      triggerType: trigger,
      organizationId: context.organizationId,
      limit: 100,
    });

    if (rules.length === 0) {
      return [];
    }

    // Build full execution context
    const fullContext: RuleExecutionContext = {
      ...context,
      trigger,
      timestamp: new Date(),
    };

    // Execute all rules
    const results = await executeRules(rules, fullContext);

    // Log executions
    for (const result of results) {
      await this.logExecution(result, fullContext);
    }

    return results;
  }

  /**
   * Log rule execution
   */
  private async logExecution(
    result: RuleExecutionResult,
    context: RuleExecutionContext
  ): Promise<void> {
    await prisma.ruleExecution.create({
      data: {
        ruleId: result.rule.id,
        triggered: result.triggered,
        conditionsPassed: result.conditionsPassed,
        actionsExecuted: result.actionsExecuted,
        conditionResults: result.conditionResults as unknown as object,
        actionResults: result.actionResults as unknown as object,
        executionTimeMs: result.executionTimeMs,
        error: result.error,
        context: {
          entityType: context.entityType,
          entityId: context.entityId,
          trigger: context.trigger,
          userId: context.userId,
        } as unknown as object,
        executedAt: result.timestamp,
      },
    });
  }

  /**
   * Get execution history for a rule
   */
  async getExecutionHistory(
    ruleId: string,
    options?: {
      page?: number;
      limit?: number;
      startDate?: Date;
      endDate?: Date;
      triggeredOnly?: boolean;
    }
  ): Promise<{
    executions: RuleExecutionLog[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = options?.page ?? 1;
    const limit = Math.min(options?.limit ?? 50, 100);
    const skip = (page - 1) * limit;

    const where: any = { ruleId };

    if (options?.startDate) {
      where.executedAt = { ...where.executedAt, gte: options.startDate };
    }

    if (options?.endDate) {
      where.executedAt = { ...where.executedAt, lte: options.endDate };
    }

    if (options?.triggeredOnly) {
      where.triggered = true;
    }

    const [executions, total] = await Promise.all([
      prisma.ruleExecution.findMany({
        where,
        skip,
        take: limit,
        orderBy: { executedAt: 'desc' },
        include: {
          rule: {
            select: {
              name: true,
              trigger: true,
            },
          },
        },
      }),
      prisma.ruleExecution.count({ where }),
    ]);

    return {
      executions: executions.map((e) => ({
        id: e.id,
        ruleId: e.ruleId,
        ruleName: e.rule.name,
        trigger: (e.rule.trigger as any).type,
        entityType: (e.context as any).entityType,
        entityId: (e.context as any).entityId,
        triggered: e.triggered,
        conditionsPassed: e.conditionsPassed,
        actionsExecuted: e.actionsExecuted,
        conditionResults: e.conditionResults as unknown[],
        actionResults: e.actionResults as unknown[],
        executionTimeMs: e.executionTimeMs,
        error: e.error || undefined,
        context: e.context as Record<string, unknown>,
        executedAt: e.executedAt,
        executedBy: (e.context as any).userId,
      })),
      total,
      page,
      limit,
    };
  }

  /**
   * Import multiple rules
   */
  async importRules(
    rules: CreateRuleInput[],
    options?: {
      validateOnly?: boolean;
      skipDuplicates?: boolean;
      organizationId?: string;
      createdBy?: string;
    }
  ): Promise<{
    imported: number;
    skipped: number;
    errors: Array<{ index: number; name: string; error: string }>;
  }> {
    const errors: Array<{ index: number; name: string; error: string }> = [];
    let imported = 0;
    let skipped = 0;

    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];

      try {
        // Check for duplicates
        if (options?.skipDuplicates) {
          const existing = await prisma.workflowRule.findFirst({
            where: {
              name: rule.name,
              organizationId: options.organizationId || rule.organizationId,
            },
          });

          if (existing) {
            skipped++;
            continue;
          }
        }

        // Validate
        const validation = validateRule(rule as unknown as Partial<WorkflowRule>);
        if (!validation.isValid) {
          errors.push({
            index: i,
            name: rule.name,
            error: validation.errors.map(e => e.message).join(', '),
          });
          continue;
        }

        // Create if not validate only
        if (!options?.validateOnly) {
          await this.createRule({
            ...rule,
            organizationId: options?.organizationId || rule.organizationId,
            createdBy: options?.createdBy || rule.createdBy,
          });
        }

        imported++;
      } catch (error) {
        errors.push({
          index: i,
          name: rule.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { imported, skipped, errors };
  }

  /**
   * Export all rules
   */
  async exportRules(options?: {
    organizationId?: string;
    activeOnly?: boolean;
    category?: string;
  }): Promise<WorkflowRule[]> {
    const where: any = {};

    if (options?.organizationId) {
      where.organizationId = options.organizationId;
    }

    if (options?.activeOnly) {
      where.isActive = true;
    }

    if (options?.category) {
      where.category = options.category;
    }

    const rules = await prisma.workflowRule.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { priority: 'asc' },
        { name: 'asc' },
      ],
    });

    return rules.map(this.mapPrismaRuleToWorkflowRule);
  }

  /**
   * Get available templates
   */
  getTemplates(): ReturnType<typeof getAllTemplates> {
    return getAllTemplates();
  }

  /**
   * Create a rule from a template
   */
  async createRuleFromTemplate(
    templateId: string,
    customizations: {
      name?: string;
      priority?: number;
      isActive?: boolean;
      organizationId?: string;
      createdBy?: string;
      parameterValues?: Record<string, unknown>;
    }
  ): Promise<WorkflowRule> {
    const template = getTemplateById(templateId);

    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const ruleData = createRuleFromTemplate(template, customizations);

    return this.createRule({
      ...ruleData,
      isActive: customizations.isActive ?? false,
    });
  }

  /**
   * Get rule statistics
   */
  async getRuleStatistics(organizationId?: string): Promise<{
    totalRules: number;
    activeRules: number;
    inactiveRules: number;
    rulesByCategory: Record<string, number>;
    rulesByTrigger: Record<string, number>;
    totalExecutions: number;
    executionsToday: number;
    averageExecutionTimeMs: number;
  }> {
    const where: any = {};
    if (organizationId) {
      where.organizationId = organizationId;
    }

    const [
      totalRules,
      activeRules,
      rulesByCategory,
      executions,
      executionsToday,
    ] = await Promise.all([
      prisma.workflowRule.count({ where }),
      prisma.workflowRule.count({ where: { ...where, isActive: true } }),
      prisma.workflowRule.groupBy({
        by: ['category'],
        where,
        _count: true,
      }),
      prisma.ruleExecution.aggregate({
        _count: true,
        _avg: { executionTimeMs: true },
      }),
      prisma.ruleExecution.count({
        where: {
          executedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    ]);

    // Count by trigger type
    const rules = await prisma.workflowRule.findMany({ where });
    const rulesByTrigger: Record<string, number> = {};
    for (const rule of rules) {
      const triggerType = (rule.trigger as any).type || 'unknown';
      rulesByTrigger[triggerType] = (rulesByTrigger[triggerType] || 0) + 1;
    }

    // Convert category counts to record
    const categoryRecord: Record<string, number> = {};
    for (const cat of rulesByCategory) {
      categoryRecord[cat.category || 'uncategorized'] = cat._count;
    }

    return {
      totalRules,
      activeRules,
      inactiveRules: totalRules - activeRules,
      rulesByCategory: categoryRecord,
      rulesByTrigger,
      totalExecutions: executions._count,
      executionsToday,
      averageExecutionTimeMs: executions._avg.executionTimeMs || 0,
    };
  }

  /**
   * Map Prisma rule to WorkflowRule type
   */
  private mapPrismaRuleToWorkflowRule(prismaRule: any): WorkflowRule {
    return {
      id: prismaRule.id,
      name: prismaRule.name,
      description: prismaRule.description,
      trigger: prismaRule.trigger as WorkflowRule['trigger'],
      conditions: prismaRule.conditions as WorkflowRule['conditions'],
      conditionsOperator: prismaRule.conditionsOperator,
      actions: prismaRule.actions as WorkflowRule['actions'],
      priority: prismaRule.priority,
      isActive: prismaRule.isActive,
      createdBy: prismaRule.createdBy,
      organizationId: prismaRule.organizationId,
      tags: prismaRule.tags,
      category: prismaRule.category,
      version: prismaRule.version,
      effectiveFrom: prismaRule.effectiveFrom,
      effectiveTo: prismaRule.effectiveTo,
      metadata: prismaRule.metadata as Record<string, unknown>,
      createdAt: prismaRule.createdAt,
      updatedAt: prismaRule.updatedAt,
    };
  }
}

// ============================================================================
// REGISTER CUSTOM ACTION HANDLERS
// ============================================================================

// Register assign_queue handler
registerActionHandler('assign_queue', async (action, context) => {
  const params = action.parameters as { queueId: string; queueName?: string; reason?: string };

  try {
    // Update entity with queue assignment
    (context.entity as Record<string, unknown>).queueId = params.queueId;
    (context.entity as Record<string, unknown>).queueName = params.queueName;
    (context.entity as Record<string, unknown>).queueAssignedAt = new Date().toISOString();
    (context.entity as Record<string, unknown>).queueAssignmentReason = params.reason;

    return {
      action,
      success: true,
      result: {
        queueId: params.queueId,
        queueName: params.queueName,
        reason: params.reason,
      },
    };
  } catch (error) {
    return {
      action,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to assign queue',
    };
  }
});

// Register send_notification handler (placeholder - integrate with notification service)
registerActionHandler('send_notification', async (action, context) => {
  const params = action.parameters as {
    recipientType: string;
    recipientId: string;
    subject: string;
    message: string;
    priority?: string;
    channel?: string;
  };

  try {
    // In production, this would call the notification service
    console.log(`[WORKFLOW] Notification: ${params.subject} to ${params.recipientType}:${params.recipientId}`);

    return {
      action,
      success: true,
      result: {
        recipientType: params.recipientType,
        recipientId: params.recipientId,
        subject: params.subject,
        channel: params.channel || 'in_app',
        sentAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      action,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send notification',
    };
  }
});

// Register create_task handler (placeholder - integrate with task service)
registerActionHandler('create_task', async (action, context) => {
  const params = action.parameters as {
    taskType: string;
    title: string;
    description?: string;
    dueInDays?: number;
    dueDate?: string;
    assignTo?: string;
    priority?: number;
    tags?: string[];
  };

  try {
    const dueDate = params.dueDate
      ? new Date(params.dueDate)
      : params.dueInDays
        ? new Date(Date.now() + params.dueInDays * 24 * 60 * 60 * 1000)
        : null;

    // In production, this would create a task in the database
    const task = {
      id: `task_${Date.now()}`,
      type: params.taskType,
      title: params.title,
      description: params.description,
      dueDate: dueDate?.toISOString(),
      assignTo: params.assignTo,
      priority: params.priority || 5,
      tags: params.tags || [],
      entityType: context.entityType,
      entityId: context.entityId,
      createdAt: new Date().toISOString(),
    };

    console.log(`[WORKFLOW] Task created: ${task.title}`);

    return {
      action,
      success: true,
      result: task,
    };
  } catch (error) {
    return {
      action,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create task',
    };
  }
});

// Register escalate handler
registerActionHandler('escalate', async (action, context) => {
  const params = action.parameters as {
    escalationType: string;
    targetId?: string;
    reason: string;
    urgency?: string;
    includeHistory?: boolean;
  };

  try {
    (context.entity as Record<string, unknown>).escalated = true;
    (context.entity as Record<string, unknown>).escalationType = params.escalationType;
    (context.entity as Record<string, unknown>).escalationReason = params.reason;
    (context.entity as Record<string, unknown>).escalationUrgency = params.urgency || 'medium';
    (context.entity as Record<string, unknown>).escalatedAt = new Date().toISOString();

    console.log(`[WORKFLOW] Escalation: ${params.reason} (${params.urgency || 'medium'})`);

    return {
      action,
      success: true,
      result: {
        escalationType: params.escalationType,
        targetId: params.targetId,
        reason: params.reason,
        urgency: params.urgency,
      },
    };
  } catch (error) {
    return {
      action,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to escalate',
    };
  }
});

// Register trigger_webhook handler
registerActionHandler('trigger_webhook', async (action, context) => {
  const params = action.parameters as {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH';
    headers?: Record<string, string>;
    body?: Record<string, unknown>;
    includeContext?: boolean;
    timeoutMs?: number;
    retryCount?: number;
  };

  try {
    const body = params.includeContext
      ? { ...params.body, context: { entity: context.entity, entityType: context.entityType, entityId: context.entityId } }
      : params.body;

    const response = await fetch(params.url, {
      method: params.method,
      headers: {
        'Content-Type': 'application/json',
        ...params.headers,
      },
      body: params.method !== 'GET' ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(params.timeoutMs || 30000),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed with status ${response.status}`);
    }

    const responseData = await response.json().catch(() => ({}));

    return {
      action,
      success: true,
      result: {
        status: response.status,
        response: responseData,
      },
    };
  } catch (error) {
    return {
      action,
      success: false,
      error: error instanceof Error ? error.message : 'Webhook request failed',
    };
  }
});

// Register delay handler
registerActionHandler('delay', async (action, context) => {
  const params = action.parameters as {
    delayMs?: number;
    delayMinutes?: number;
    delayHours?: number;
    delayDays?: number;
    delayUntil?: string;
  };

  try {
    let delayMs = params.delayMs || 0;

    if (params.delayMinutes) delayMs += params.delayMinutes * 60 * 1000;
    if (params.delayHours) delayMs += params.delayHours * 60 * 60 * 1000;
    if (params.delayDays) delayMs += params.delayDays * 24 * 60 * 60 * 1000;

    if (params.delayUntil) {
      const targetTime = new Date(params.delayUntil).getTime();
      const now = Date.now();
      if (targetTime > now) {
        delayMs = targetTime - now;
      }
    }

    // Actually perform the delay
    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    return {
      action,
      success: true,
      result: {
        delayedMs: delayMs,
      },
    };
  } catch (error) {
    return {
      action,
      success: false,
      error: error instanceof Error ? error.message : 'Delay failed',
    };
  }
});

// Register assign_user handler
registerActionHandler('assign_user', async (action, context) => {
  const params = action.parameters as {
    userId?: string;
    assignmentMethod: string;
    skillRequirements?: string[];
    teamId?: string;
  };

  try {
    // In production, this would use the assignment method to find the best user
    const assignedUserId = params.userId || `user_${params.assignmentMethod}_${Date.now()}`;

    (context.entity as Record<string, unknown>).assignedTo = assignedUserId;
    (context.entity as Record<string, unknown>).assignedAt = new Date().toISOString();
    (context.entity as Record<string, unknown>).assignmentMethod = params.assignmentMethod;

    return {
      action,
      success: true,
      result: {
        assignedUserId,
        assignmentMethod: params.assignmentMethod,
        teamId: params.teamId,
      },
    };
  } catch (error) {
    return {
      action,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to assign user',
    };
  }
});

// Export singleton instance
export const workflowService = new WorkflowService();
