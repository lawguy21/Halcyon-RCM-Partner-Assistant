// @ts-nocheck
/**
 * Workflow Rules Controller
 *
 * Business logic layer for workflow rule management REST endpoints.
 * Handles validation, error handling, and response formatting.
 */

import {
  workflowService,
  type CreateRuleInput,
  type UpdateRuleInput,
  type RuleListFilters,
  type TestRuleInput,
} from '../services/workflowService.js';
import type { RuleTriggerType } from '@halcyon-rcm/core';

// ============================================================================
// RULE CRUD OPERATIONS
// ============================================================================

/**
 * List all rules with filtering and pagination
 */
export async function listRules(options: {
  isActive?: boolean;
  triggerType?: string;
  category?: string;
  tags?: string[];
  organizationId?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{
  success: boolean;
  data: {
    rules: unknown[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}> {
  const filters: RuleListFilters = {
    isActive: options.isActive,
    triggerType: options.triggerType as RuleTriggerType,
    category: options.category,
    tags: options.tags,
    organizationId: options.organizationId,
    search: options.search,
    page: options.page || 1,
    limit: Math.min(options.limit || 50, 100),
  };

  const result = await workflowService.listRules(filters);

  return {
    success: true,
    data: {
      rules: result.rules,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit),
      },
    },
  };
}

/**
 * Get a single rule by ID
 */
export async function getRule(id: string): Promise<{
  success: boolean;
  data?: unknown;
  error?: { message: string; code: string };
}> {
  const rule = await workflowService.getRule(id);

  if (!rule) {
    return {
      success: false,
      error: {
        message: 'Rule not found',
        code: 'RULE_NOT_FOUND',
      },
    };
  }

  return {
    success: true,
    data: rule,
  };
}

/**
 * Create a new rule
 */
export async function createRule(input: CreateRuleInput): Promise<{
  success: boolean;
  data?: unknown;
  error?: { message: string; code: string };
}> {
  try {
    const rule = await workflowService.createRule(input);

    return {
      success: true,
      data: rule,
    };
  } catch (error: any) {
    if (error.message.includes('validation')) {
      return {
        success: false,
        error: {
          message: error.message,
          code: 'VALIDATION_ERROR',
        },
      };
    }

    if (error.code === 'P2002') {
      return {
        success: false,
        error: {
          message: 'A rule with this name already exists',
          code: 'RULE_EXISTS',
        },
      };
    }

    throw error;
  }
}

/**
 * Update an existing rule
 */
export async function updateRule(
  id: string,
  updates: UpdateRuleInput
): Promise<{
  success: boolean;
  data?: unknown;
  error?: { message: string; code: string };
}> {
  try {
    const rule = await workflowService.updateRule(id, updates);

    return {
      success: true,
      data: rule,
    };
  } catch (error: any) {
    if (error.message === 'Rule not found') {
      return {
        success: false,
        error: {
          message: 'Rule not found',
          code: 'RULE_NOT_FOUND',
        },
      };
    }

    if (error.message.includes('validation')) {
      return {
        success: false,
        error: {
          message: error.message,
          code: 'VALIDATION_ERROR',
        },
      };
    }

    throw error;
  }
}

/**
 * Delete a rule
 */
export async function deleteRule(id: string): Promise<{
  success: boolean;
  data?: { deleted: boolean };
  error?: { message: string; code: string };
}> {
  const deleted = await workflowService.deleteRule(id);

  if (!deleted) {
    return {
      success: false,
      error: {
        message: 'Rule not found',
        code: 'RULE_NOT_FOUND',
      },
    };
  }

  return {
    success: true,
    data: { deleted: true },
  };
}

/**
 * Toggle rule active status
 */
export async function toggleRule(
  id: string,
  isActive: boolean
): Promise<{
  success: boolean;
  data?: unknown;
  error?: { message: string; code: string };
}> {
  try {
    const rule = await workflowService.toggleRule(id, isActive);

    return {
      success: true,
      data: rule,
    };
  } catch (error: any) {
    if (error.code === 'P2025') {
      return {
        success: false,
        error: {
          message: 'Rule not found',
          code: 'RULE_NOT_FOUND',
        },
      };
    }

    throw error;
  }
}

// ============================================================================
// RULE TESTING
// ============================================================================

/**
 * Test a rule with sample context
 */
export async function testRule(input: TestRuleInput): Promise<{
  success: boolean;
  data?: unknown;
  error?: { message: string; code: string };
}> {
  try {
    const result = await workflowService.testRule(input);

    return {
      success: true,
      data: {
        rule: result.rule,
        dryRun: result.dryRun,
        triggered: result.result.triggered,
        conditionsPassed: result.result.conditionsPassed,
        conditionResults: result.result.conditionResults,
        actionsExecuted: result.result.actionsExecuted,
        actionResults: result.result.actionResults,
        executionTimeMs: result.result.executionTimeMs,
        error: result.result.error,
      },
    };
  } catch (error: any) {
    if (error.message === 'Rule not found') {
      return {
        success: false,
        error: {
          message: 'Rule not found',
          code: 'RULE_NOT_FOUND',
        },
      };
    }

    throw error;
  }
}

// ============================================================================
// EXECUTION HISTORY
// ============================================================================

/**
 * Get execution history for a rule
 */
export async function getExecutionHistory(
  ruleId: string,
  options?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    triggeredOnly?: boolean;
  }
): Promise<{
  success: boolean;
  data: {
    executions: unknown[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}> {
  const result = await workflowService.getExecutionHistory(ruleId, {
    page: options?.page,
    limit: options?.limit,
    startDate: options?.startDate ? new Date(options.startDate) : undefined,
    endDate: options?.endDate ? new Date(options.endDate) : undefined,
    triggeredOnly: options?.triggeredOnly,
  });

  return {
    success: true,
    data: {
      executions: result.executions,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit),
      },
    },
  };
}

// ============================================================================
// TEMPLATES
// ============================================================================

/**
 * Get all rule templates
 */
export function getTemplates(): {
  success: boolean;
  data: unknown[];
} {
  const templates = workflowService.getTemplates();

  return {
    success: true,
    data: templates,
  };
}

/**
 * Create a rule from a template
 */
export async function createRuleFromTemplate(
  templateId: string,
  customizations: {
    name?: string;
    priority?: number;
    isActive?: boolean;
    organizationId?: string;
    createdBy?: string;
    parameterValues?: Record<string, unknown>;
  }
): Promise<{
  success: boolean;
  data?: unknown;
  error?: { message: string; code: string };
}> {
  try {
    const rule = await workflowService.createRuleFromTemplate(templateId, customizations);

    return {
      success: true,
      data: rule,
    };
  } catch (error: any) {
    if (error.message.includes('Template not found')) {
      return {
        success: false,
        error: {
          message: error.message,
          code: 'TEMPLATE_NOT_FOUND',
        },
      };
    }

    throw error;
  }
}

// ============================================================================
// IMPORT/EXPORT
// ============================================================================

/**
 * Import rules from JSON
 */
export async function importRules(
  rules: CreateRuleInput[],
  options?: {
    validateOnly?: boolean;
    skipDuplicates?: boolean;
    organizationId?: string;
    createdBy?: string;
  }
): Promise<{
  success: boolean;
  data: {
    imported: number;
    skipped: number;
    errors: Array<{ index: number; name: string; error: string }>;
  };
}> {
  const result = await workflowService.importRules(rules, options);

  return {
    success: true,
    data: result,
  };
}

/**
 * Export rules to JSON
 */
export async function exportRules(options?: {
  organizationId?: string;
  activeOnly?: boolean;
  category?: string;
}): Promise<{
  success: boolean;
  data: unknown[];
}> {
  const rules = await workflowService.exportRules(options);

  return {
    success: true,
    data: rules,
  };
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get rule statistics
 */
export async function getRuleStatistics(organizationId?: string): Promise<{
  success: boolean;
  data: {
    totalRules: number;
    activeRules: number;
    inactiveRules: number;
    rulesByCategory: Record<string, number>;
    rulesByTrigger: Record<string, number>;
    totalExecutions: number;
    executionsToday: number;
    averageExecutionTimeMs: number;
  };
}> {
  const stats = await workflowService.getRuleStatistics(organizationId);

  return {
    success: true,
    data: stats,
  };
}

// ============================================================================
// TRIGGER EXECUTION
// ============================================================================

/**
 * Execute rules for a specific trigger
 */
export async function executeRulesForTrigger(
  trigger: string,
  context: {
    entity: Record<string, unknown>;
    entityType: string;
    entityId: string;
    previousEntity?: Record<string, unknown>;
    changedFields?: string[];
    userId?: string;
    organizationId?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<{
  success: boolean;
  data: {
    rulesExecuted: number;
    rulesTriggered: number;
    results: Array<{
      ruleId: string;
      ruleName: string;
      triggered: boolean;
      conditionsPassed: boolean;
      actionsExecuted: boolean;
      executionTimeMs: number;
      error?: string;
    }>;
  };
}> {
  const results = await workflowService.executeRulesForTrigger(
    trigger as RuleTriggerType,
    context
  );

  return {
    success: true,
    data: {
      rulesExecuted: results.length,
      rulesTriggered: results.filter((r) => r.triggered && r.conditionsPassed).length,
      results: results.map((r) => ({
        ruleId: r.rule.id,
        ruleName: r.rule.name,
        triggered: r.triggered,
        conditionsPassed: r.conditionsPassed,
        actionsExecuted: r.actionsExecuted,
        executionTimeMs: r.executionTimeMs,
        error: r.error,
      })),
    },
  };
}
