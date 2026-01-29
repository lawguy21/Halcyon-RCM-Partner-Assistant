/**
 * Workflow Rule Engine
 *
 * Core evaluation and execution engine for workflow rules including:
 * - Condition evaluation with various operators
 * - Action execution with error handling
 * - Built-in functions for date calculations
 * - Priority-based rule execution
 */

import {
  type RuleCondition,
  type RuleConditionGroup,
  type RuleConditionValue,
  type RuleOperator,
  type LogicalOperator,
  type RuleAction,
  type RuleActionType,
  type WorkflowRule,
  type RuleExecutionContext,
  type ConditionEvaluationResult,
  type ActionExecutionResult,
  type RuleExecutionResult,
  type RuleValidationResult,
  type RuleValidationError,
  isConditionGroup,
} from './rule-types.js';

// ============================================================================
// BUILT-IN FUNCTIONS
// ============================================================================

/**
 * Get current date/time
 */
export function now(): Date {
  return new Date();
}

/**
 * Calculate days since a given date
 */
export function daysSince(date: Date | string): number {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  const diffTime = today.getTime() - targetDate.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calculate days until a given date
 */
export function daysUntil(date: Date | string): number {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  const diffTime = targetDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calculate business days since a given date (excludes weekends)
 */
export function businessDaysSince(date: Date | string): number {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  let count = 0;
  const current = new Date(targetDate);

  while (current < today) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Calculate business days until a given date
 */
export function businessDaysUntil(date: Date | string): number {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  let count = 0;
  const current = new Date(today);

  while (current < targetDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Sum an array of numbers
 */
export function sum(values: number[]): number {
  return values.reduce((acc, val) => acc + (typeof val === 'number' ? val : 0), 0);
}

/**
 * Count items in an array or object keys
 */
export function count(value: unknown[] | Record<string, unknown>): number {
  if (Array.isArray(value)) {
    return value.length;
  }
  if (typeof value === 'object' && value !== null) {
    return Object.keys(value).length;
  }
  return 0;
}

/**
 * Calculate average of an array of numbers
 */
export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return sum(values) / values.length;
}

/**
 * Get minimum value from array
 */
export function min(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.min(...values);
}

/**
 * Get maximum value from array
 */
export function max(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.max(...values);
}

/**
 * Check if a date is within a range
 */
export function isDateInRange(
  date: Date | string,
  startDate: Date | string,
  endDate: Date | string
): boolean {
  const target = typeof date === 'string' ? new Date(date) : date;
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  return target >= start && target <= end;
}

/**
 * Format a date to string
 */
export function formatDate(date: Date | string, format: string = 'YYYY-MM-DD'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day);
}

// ============================================================================
// VALUE EXTRACTION
// ============================================================================

/**
 * Get a nested value from an object using dot notation
 */
export function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }

    // Handle array index notation (e.g., "items[0]")
    const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, key, index] = arrayMatch;
      current = (current as Record<string, unknown>)[key];
      if (Array.isArray(current)) {
        current = current[parseInt(index, 10)];
      } else {
        return undefined;
      }
    } else {
      current = (current as Record<string, unknown>)[part];
    }
  }

  return current;
}

/**
 * Set a nested value in an object using dot notation
 */
export function setNestedValue(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): void {
  const parts = path.split('.');
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  current[parts[parts.length - 1]] = value;
}

// ============================================================================
// CONDITION EVALUATION
// ============================================================================

/**
 * Convert value to number for comparison
 */
function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(/[$,]/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  }
  if (value instanceof Date) return value.getTime();
  return 0;
}

/**
 * Convert value to string for comparison
 */
function toString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

/**
 * Convert value to date for comparison
 */
function toDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }
  return null;
}

/**
 * Evaluate a single condition against a context
 */
export function evaluateCondition(
  condition: RuleCondition,
  context: RuleExecutionContext
): ConditionEvaluationResult {
  try {
    const actualValue = getNestedValue(context.entity, condition.field);
    const expectedValue = condition.value;
    let passed = false;

    switch (condition.operator) {
      case 'equals':
        passed = compareEquals(actualValue, expectedValue, condition.caseInsensitive);
        break;

      case 'not_equals':
        passed = !compareEquals(actualValue, expectedValue, condition.caseInsensitive);
        break;

      case 'greater_than':
        passed = toNumber(actualValue) > toNumber(expectedValue);
        break;

      case 'less_than':
        passed = toNumber(actualValue) < toNumber(expectedValue);
        break;

      case 'greater_than_or_equals':
        passed = toNumber(actualValue) >= toNumber(expectedValue);
        break;

      case 'less_than_or_equals':
        passed = toNumber(actualValue) <= toNumber(expectedValue);
        break;

      case 'contains':
        passed = containsValue(actualValue, expectedValue, condition.caseInsensitive);
        break;

      case 'not_contains':
        passed = !containsValue(actualValue, expectedValue, condition.caseInsensitive);
        break;

      case 'starts_with':
        passed = startsWithValue(actualValue, expectedValue, condition.caseInsensitive);
        break;

      case 'ends_with':
        passed = endsWithValue(actualValue, expectedValue, condition.caseInsensitive);
        break;

      case 'in_list':
        passed = isInList(actualValue, expectedValue, condition.caseInsensitive);
        break;

      case 'not_in_list':
        passed = !isInList(actualValue, expectedValue, condition.caseInsensitive);
        break;

      case 'between':
        passed = isBetween(actualValue, expectedValue);
        break;

      case 'is_null':
        passed = actualValue === null || actualValue === undefined;
        break;

      case 'is_not_null':
        passed = actualValue !== null && actualValue !== undefined;
        break;

      case 'regex':
        passed = matchesRegex(actualValue, expectedValue);
        break;

      case 'days_since_greater_than':
        const dateSinceGt = toDate(actualValue);
        passed = dateSinceGt !== null && daysSince(dateSinceGt) > toNumber(expectedValue);
        break;

      case 'days_since_less_than':
        const dateSinceLt = toDate(actualValue);
        passed = dateSinceLt !== null && daysSince(dateSinceLt) < toNumber(expectedValue);
        break;

      case 'business_days_since_greater_than':
        const bizDateGt = toDate(actualValue);
        passed = bizDateGt !== null && businessDaysSince(bizDateGt) > toNumber(expectedValue);
        break;

      case 'business_days_since_less_than':
        const bizDateLt = toDate(actualValue);
        passed = bizDateLt !== null && businessDaysSince(bizDateLt) < toNumber(expectedValue);
        break;

      default:
        return {
          condition,
          passed: false,
          actualValue,
          expectedValue,
          error: `Unknown operator: ${condition.operator}`,
        };
    }

    // Apply negation if specified
    if (condition.negate) {
      passed = !passed;
    }

    return {
      condition,
      passed,
      actualValue,
      expectedValue,
    };
  } catch (error) {
    return {
      condition,
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Compare two values for equality
 */
function compareEquals(
  actual: unknown,
  expected: RuleConditionValue,
  caseInsensitive?: boolean
): boolean {
  if (actual === expected) return true;

  if (caseInsensitive && typeof actual === 'string' && typeof expected === 'string') {
    return actual.toLowerCase() === expected.toLowerCase();
  }

  // Handle date comparison
  const actualDate = toDate(actual);
  const expectedDate = toDate(expected);
  if (actualDate && expectedDate) {
    return actualDate.getTime() === expectedDate.getTime();
  }

  // Handle number comparison
  if (typeof actual === 'number' || typeof expected === 'number') {
    return toNumber(actual) === toNumber(expected);
  }

  return false;
}

/**
 * Check if value contains a substring
 */
function containsValue(
  actual: unknown,
  expected: RuleConditionValue,
  caseInsensitive?: boolean
): boolean {
  const actualStr = toString(actual);
  const expectedStr = toString(expected);

  if (caseInsensitive) {
    return actualStr.toLowerCase().includes(expectedStr.toLowerCase());
  }

  return actualStr.includes(expectedStr);
}

/**
 * Check if value starts with a prefix
 */
function startsWithValue(
  actual: unknown,
  expected: RuleConditionValue,
  caseInsensitive?: boolean
): boolean {
  const actualStr = toString(actual);
  const expectedStr = toString(expected);

  if (caseInsensitive) {
    return actualStr.toLowerCase().startsWith(expectedStr.toLowerCase());
  }

  return actualStr.startsWith(expectedStr);
}

/**
 * Check if value ends with a suffix
 */
function endsWithValue(
  actual: unknown,
  expected: RuleConditionValue,
  caseInsensitive?: boolean
): boolean {
  const actualStr = toString(actual);
  const expectedStr = toString(expected);

  if (caseInsensitive) {
    return actualStr.toLowerCase().endsWith(expectedStr.toLowerCase());
  }

  return actualStr.endsWith(expectedStr);
}

/**
 * Check if value is in a list
 */
function isInList(
  actual: unknown,
  expected: RuleConditionValue,
  caseInsensitive?: boolean
): boolean {
  if (!Array.isArray(expected)) return false;

  const actualVal = caseInsensitive && typeof actual === 'string'
    ? actual.toLowerCase()
    : actual;

  return expected.some((item) => {
    const itemVal = caseInsensitive && typeof item === 'string'
      ? item.toLowerCase()
      : item;
    return actualVal === itemVal;
  });
}

/**
 * Check if value is between min and max
 */
function isBetween(actual: unknown, expected: RuleConditionValue): boolean {
  if (
    typeof expected !== 'object' ||
    expected === null ||
    !('min' in expected) ||
    !('max' in expected)
  ) {
    return false;
  }

  const { min, max } = expected as { min: number; max: number };
  const actualNum = toNumber(actual);

  return actualNum >= min && actualNum <= max;
}

/**
 * Check if value matches a regex pattern
 */
function matchesRegex(actual: unknown, expected: RuleConditionValue): boolean {
  if (typeof expected !== 'string') return false;

  try {
    const regex = new RegExp(expected);
    return regex.test(toString(actual));
  } catch {
    return false;
  }
}

/**
 * Evaluate a condition group
 */
export function evaluateConditionGroup(
  group: RuleConditionGroup,
  context: RuleExecutionContext
): ConditionEvaluationResult {
  const results: boolean[] = [];

  for (const condition of group.conditions) {
    let result: ConditionEvaluationResult;

    if (isConditionGroup(condition)) {
      result = evaluateConditionGroup(condition, context);
    } else {
      result = evaluateCondition(condition, context);
    }

    results.push(result.passed);
  }

  const passed = group.logicalOperator === 'OR'
    ? results.some(Boolean)
    : results.every(Boolean);

  return {
    condition: group,
    passed,
  };
}

/**
 * Evaluate multiple conditions with a logical operator
 */
export function evaluateConditions(
  conditions: (RuleCondition | RuleConditionGroup)[],
  context: RuleExecutionContext,
  logicalOperator: LogicalOperator = 'AND'
): {
  passed: boolean;
  results: ConditionEvaluationResult[];
} {
  const results: ConditionEvaluationResult[] = [];

  for (const condition of conditions) {
    let result: ConditionEvaluationResult;

    if (isConditionGroup(condition)) {
      result = evaluateConditionGroup(condition, context);
    } else {
      result = evaluateCondition(condition, context);
    }

    results.push(result);
  }

  const passed = logicalOperator === 'OR'
    ? results.some((r) => r.passed)
    : results.every((r) => r.passed);

  return { passed, results };
}

// ============================================================================
// ACTION EXECUTION
// ============================================================================

/**
 * Action handler function type
 */
export type ActionHandler = (
  action: RuleAction,
  context: RuleExecutionContext
) => Promise<ActionExecutionResult>;

/**
 * Registry of action handlers
 */
const actionHandlers: Map<RuleActionType, ActionHandler> = new Map();

/**
 * Register an action handler
 */
export function registerActionHandler(
  actionType: RuleActionType,
  handler: ActionHandler
): void {
  actionHandlers.set(actionType, handler);
}

/**
 * Get registered action handler
 */
export function getActionHandler(actionType: RuleActionType): ActionHandler | undefined {
  return actionHandlers.get(actionType);
}

/**
 * Execute a single action
 */
export async function executeAction(
  action: RuleAction,
  context: RuleExecutionContext
): Promise<ActionExecutionResult> {
  const startTime = Date.now();

  try {
    // Apply delay if specified
    if (action.delayMs && action.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, action.delayMs));
    }

    const handler = actionHandlers.get(action.type);

    if (!handler) {
      // Return a default result for unregistered handlers
      return {
        action,
        success: false,
        error: `No handler registered for action type: ${action.type}`,
        executionTimeMs: Date.now() - startTime,
      };
    }

    const result = await handler(action, context);
    return {
      ...result,
      executionTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      action,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      executionTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Execute multiple actions in order
 */
export async function executeActions(
  actions: RuleAction[],
  context: RuleExecutionContext
): Promise<ActionExecutionResult[]> {
  // Sort actions by order
  const sortedActions = [...actions].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const results: ActionExecutionResult[] = [];

  for (const action of sortedActions) {
    const result = await executeAction(action, context);
    results.push(result);

    // Stop if action failed and continueOnError is false
    if (!result.success && !action.continueOnError) {
      break;
    }

    // Handle stop_processing action
    if (action.type === 'stop_processing' && result.success) {
      break;
    }
  }

  return results;
}

// ============================================================================
// RULE EXECUTION
// ============================================================================

/**
 * Check if a rule should be triggered based on context
 */
export function shouldTriggerRule(
  rule: WorkflowRule,
  context: RuleExecutionContext
): boolean {
  // Check if rule is active
  if (!rule.isActive) {
    return false;
  }

  // Check effective date range
  if (rule.effectiveFrom && context.timestamp < rule.effectiveFrom) {
    return false;
  }
  if (rule.effectiveTo && context.timestamp > rule.effectiveTo) {
    return false;
  }

  // Check trigger type matches
  if (rule.trigger.type !== context.trigger) {
    return false;
  }

  // Check entity type if specified
  if (rule.trigger.entityType && rule.trigger.entityType !== context.entityType) {
    return false;
  }

  // For status change triggers, check from/to status
  if (rule.trigger.type === 'on_status_change') {
    const previousStatus = context.previousEntity?.status;
    const currentStatus = context.entity.status;

    if (rule.trigger.fromStatus?.length && !rule.trigger.fromStatus.includes(previousStatus as string)) {
      return false;
    }
    if (rule.trigger.toStatus?.length && !rule.trigger.toStatus.includes(currentStatus as string)) {
      return false;
    }
  }

  // For field change triggers, check if watched fields changed
  if (rule.trigger.type === 'on_field_change') {
    if (
      rule.trigger.watchFields?.length &&
      !rule.trigger.watchFields.some((f) => context.changedFields?.includes(f))
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Execute a single rule
 */
export async function executeRule(
  rule: WorkflowRule,
  context: RuleExecutionContext
): Promise<RuleExecutionResult> {
  const startTime = Date.now();

  // Check if rule should trigger
  const triggered = shouldTriggerRule(rule, context);

  if (!triggered) {
    return {
      rule,
      triggered: false,
      conditionsPassed: false,
      conditionResults: [],
      actionsExecuted: false,
      actionResults: [],
      executionTimeMs: Date.now() - startTime,
      timestamp: new Date(),
    };
  }

  // Evaluate conditions
  const { passed: conditionsPassed, results: conditionResults } = evaluateConditions(
    rule.conditions,
    context,
    rule.conditionsOperator
  );

  if (!conditionsPassed) {
    return {
      rule,
      triggered: true,
      conditionsPassed: false,
      conditionResults,
      actionsExecuted: false,
      actionResults: [],
      executionTimeMs: Date.now() - startTime,
      timestamp: new Date(),
    };
  }

  // Execute actions
  const actionResults = await executeActions(rule.actions, context);
  const actionsExecuted = actionResults.length > 0;

  return {
    rule,
    triggered: true,
    conditionsPassed: true,
    conditionResults,
    actionsExecuted,
    actionResults,
    executionTimeMs: Date.now() - startTime,
    timestamp: new Date(),
  };
}

/**
 * Execute multiple rules in priority order
 */
export async function executeRules(
  rules: WorkflowRule[],
  context: RuleExecutionContext
): Promise<RuleExecutionResult[]> {
  // Sort rules by priority (lower number = higher priority)
  const sortedRules = [...rules].sort((a, b) => a.priority - b.priority);

  const results: RuleExecutionResult[] = [];
  let stopProcessing = false;

  for (const rule of sortedRules) {
    if (stopProcessing) {
      break;
    }

    const result = await executeRule(rule, context);
    results.push(result);

    // Check if any action stopped processing
    if (result.actionResults.some((ar) => ar.action.type === 'stop_processing' && ar.success)) {
      stopProcessing = true;
    }
  }

  return results;
}

// ============================================================================
// RULE VALIDATION
// ============================================================================

/**
 * Validate a workflow rule
 */
export function validateRule(rule: Partial<WorkflowRule>): RuleValidationResult {
  const errors: RuleValidationError[] = [];
  const warnings: RuleValidationError[] = [];

  // Required fields
  if (!rule.name || rule.name.trim() === '') {
    errors.push({
      path: 'name',
      message: 'Rule name is required',
      code: 'REQUIRED_FIELD',
    });
  }

  if (!rule.trigger) {
    errors.push({
      path: 'trigger',
      message: 'Rule trigger is required',
      code: 'REQUIRED_FIELD',
    });
  } else {
    if (!rule.trigger.type) {
      errors.push({
        path: 'trigger.type',
        message: 'Trigger type is required',
        code: 'REQUIRED_FIELD',
      });
    }

    // Validate scheduled trigger has cron expression
    if (rule.trigger.type === 'scheduled' && !rule.trigger.schedule) {
      errors.push({
        path: 'trigger.schedule',
        message: 'Schedule is required for scheduled triggers',
        code: 'REQUIRED_FIELD',
      });
    }
  }

  if (!rule.conditions || rule.conditions.length === 0) {
    warnings.push({
      path: 'conditions',
      message: 'Rule has no conditions and will always execute',
      code: 'NO_CONDITIONS',
    });
  } else {
    // Validate each condition
    rule.conditions.forEach((condition, index) => {
      if (!isConditionGroup(condition)) {
        if (!condition.field) {
          errors.push({
            path: `conditions[${index}].field`,
            message: 'Condition field is required',
            code: 'REQUIRED_FIELD',
          });
        }
        if (!condition.operator) {
          errors.push({
            path: `conditions[${index}].operator`,
            message: 'Condition operator is required',
            code: 'REQUIRED_FIELD',
          });
        }
        // Value validation depends on operator
        if (
          condition.operator !== 'is_null' &&
          condition.operator !== 'is_not_null' &&
          condition.value === undefined
        ) {
          errors.push({
            path: `conditions[${index}].value`,
            message: 'Condition value is required for this operator',
            code: 'REQUIRED_FIELD',
          });
        }
      }
    });
  }

  if (!rule.actions || rule.actions.length === 0) {
    errors.push({
      path: 'actions',
      message: 'At least one action is required',
      code: 'REQUIRED_FIELD',
    });
  } else {
    // Validate each action
    rule.actions.forEach((action, index) => {
      if (!action.type) {
        errors.push({
          path: `actions[${index}].type`,
          message: 'Action type is required',
          code: 'REQUIRED_FIELD',
        });
      }
      if (!action.parameters) {
        errors.push({
          path: `actions[${index}].parameters`,
          message: 'Action parameters are required',
          code: 'REQUIRED_FIELD',
        });
      }
    });
  }

  if (typeof rule.priority !== 'number') {
    errors.push({
      path: 'priority',
      message: 'Rule priority is required and must be a number',
      code: 'REQUIRED_FIELD',
    });
  }

  if (typeof rule.isActive !== 'boolean') {
    warnings.push({
      path: 'isActive',
      message: 'Rule isActive defaults to false',
      code: 'DEFAULT_VALUE',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate action parameters based on action type
 */
export function validateActionParameters(action: RuleAction): RuleValidationError[] {
  const errors: RuleValidationError[] = [];
  const params = action.parameters;

  switch (action.type) {
    case 'assign_queue':
      if (!('queueId' in params) || !params.queueId) {
        errors.push({
          path: 'parameters.queueId',
          message: 'Queue ID is required for assign_queue action',
          code: 'REQUIRED_FIELD',
        });
      }
      break;

    case 'send_notification':
      if (!('recipientType' in params) || !params.recipientType) {
        errors.push({
          path: 'parameters.recipientType',
          message: 'Recipient type is required for send_notification action',
          code: 'REQUIRED_FIELD',
        });
      }
      if (!('message' in params) || !params.message) {
        errors.push({
          path: 'parameters.message',
          message: 'Message is required for send_notification action',
          code: 'REQUIRED_FIELD',
        });
      }
      break;

    case 'update_field':
      if (!('fieldPath' in params) || !params.fieldPath) {
        errors.push({
          path: 'parameters.fieldPath',
          message: 'Field path is required for update_field action',
          code: 'REQUIRED_FIELD',
        });
      }
      break;

    case 'create_task':
      if (!('taskType' in params) || !params.taskType) {
        errors.push({
          path: 'parameters.taskType',
          message: 'Task type is required for create_task action',
          code: 'REQUIRED_FIELD',
        });
      }
      if (!('title' in params) || !params.title) {
        errors.push({
          path: 'parameters.title',
          message: 'Title is required for create_task action',
          code: 'REQUIRED_FIELD',
        });
      }
      break;

    case 'escalate':
      if (!('escalationType' in params) || !params.escalationType) {
        errors.push({
          path: 'parameters.escalationType',
          message: 'Escalation type is required for escalate action',
          code: 'REQUIRED_FIELD',
        });
      }
      if (!('reason' in params) || !params.reason) {
        errors.push({
          path: 'parameters.reason',
          message: 'Reason is required for escalate action',
          code: 'REQUIRED_FIELD',
        });
      }
      break;

    case 'trigger_webhook':
      if (!('url' in params) || !params.url) {
        errors.push({
          path: 'parameters.url',
          message: 'URL is required for trigger_webhook action',
          code: 'REQUIRED_FIELD',
        });
      }
      break;

    case 'send_email':
      if (!('to' in params) || !params.to) {
        errors.push({
          path: 'parameters.to',
          message: 'Recipient is required for send_email action',
          code: 'REQUIRED_FIELD',
        });
      }
      if (!('subject' in params) || !params.subject) {
        errors.push({
          path: 'parameters.subject',
          message: 'Subject is required for send_email action',
          code: 'REQUIRED_FIELD',
        });
      }
      break;
  }

  return errors;
}

// ============================================================================
// DEFAULT ACTION HANDLERS
// ============================================================================

// Register default update_field handler
registerActionHandler('update_field', async (action, context) => {
  const params = action.parameters as { fieldPath: string; value: unknown; operation?: string };

  try {
    const currentValue = getNestedValue(context.entity, params.fieldPath);
    let newValue = params.value;

    switch (params.operation) {
      case 'increment':
        newValue = toNumber(currentValue) + toNumber(params.value);
        break;
      case 'decrement':
        newValue = toNumber(currentValue) - toNumber(params.value);
        break;
      case 'append':
        if (Array.isArray(currentValue)) {
          newValue = [...currentValue, params.value];
        } else {
          newValue = toString(currentValue) + toString(params.value);
        }
        break;
      case 'remove':
        if (Array.isArray(currentValue)) {
          newValue = currentValue.filter((v) => v !== params.value);
        }
        break;
      case 'set':
      default:
        // Use the value as-is
        break;
    }

    setNestedValue(context.entity as Record<string, unknown>, params.fieldPath, newValue);

    return {
      action,
      success: true,
      result: { fieldPath: params.fieldPath, oldValue: currentValue, newValue },
    };
  } catch (error) {
    return {
      action,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update field',
    };
  }
});

// Register default add_note handler
registerActionHandler('add_note', async (action, context) => {
  const params = action.parameters as { note: string; noteType?: string; visibility?: string };

  try {
    // Get or create notes array
    const notes = (context.entity.notes as unknown[]) || [];
    const newNote = {
      id: `note_${Date.now()}`,
      content: params.note,
      type: params.noteType || 'general',
      visibility: params.visibility || 'internal',
      createdAt: new Date().toISOString(),
      createdBy: context.userId,
    };

    (context.entity as Record<string, unknown>).notes = [...notes, newNote];

    return {
      action,
      success: true,
      result: newNote,
    };
  } catch (error) {
    return {
      action,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add note',
    };
  }
});

// Register default set_priority handler
registerActionHandler('set_priority', async (action, context) => {
  const params = action.parameters as { priority: number; reason?: string };

  try {
    const oldPriority = context.entity.priority;
    (context.entity as Record<string, unknown>).priority = params.priority;

    return {
      action,
      success: true,
      result: { oldPriority, newPriority: params.priority, reason: params.reason },
    };
  } catch (error) {
    return {
      action,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to set priority',
    };
  }
});

// Register default stop_processing handler
registerActionHandler('stop_processing', async (action, context) => {
  const params = action.parameters as { reason?: string; markComplete?: boolean };

  if (params.markComplete) {
    (context.entity as Record<string, unknown>).status = 'completed';
  }

  return {
    action,
    success: true,
    result: { reason: params.reason, markedComplete: params.markComplete },
  };
});
