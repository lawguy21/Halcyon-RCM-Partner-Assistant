/**
 * Workflow Rule Types
 *
 * Type definitions for the workflow rules engine including:
 * - Rule conditions with various operators
 * - Rule actions for automation
 * - Rule triggers and execution configuration
 */

// ============================================================================
// OPERATORS
// ============================================================================

/**
 * Available comparison operators for rule conditions
 */
export type RuleOperator =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equals'
  | 'less_than_or_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'in_list'
  | 'not_in_list'
  | 'between'
  | 'is_null'
  | 'is_not_null'
  | 'regex'
  | 'days_since_greater_than'
  | 'days_since_less_than'
  | 'business_days_since_greater_than'
  | 'business_days_since_less_than';

/**
 * Logical operators for combining multiple conditions
 */
export type LogicalOperator = 'AND' | 'OR';

// ============================================================================
// CONDITIONS
// ============================================================================

/**
 * A single rule condition that evaluates a field against a value
 */
export interface RuleCondition {
  /** Unique identifier for the condition */
  id?: string;
  /** The field path to evaluate (supports dot notation, e.g., "claim.amount") */
  field: string;
  /** The comparison operator to use */
  operator: RuleOperator;
  /** The value to compare against (type depends on operator) */
  value: RuleConditionValue;
  /** Logical operator to combine with previous condition (default: AND) */
  logicalOperator?: LogicalOperator;
  /** Whether this condition is negated */
  negate?: boolean;
  /** Whether the field value should be case-insensitive for string comparisons */
  caseInsensitive?: boolean;
}

/**
 * Possible values for rule conditions
 */
export type RuleConditionValue =
  | string
  | number
  | boolean
  | null
  | string[]
  | number[]
  | { min: number; max: number } // For 'between' operator
  | Date;

/**
 * A group of conditions that can be nested
 */
export interface RuleConditionGroup {
  /** Unique identifier for the group */
  id?: string;
  /** The logical operator to combine conditions within this group */
  logicalOperator: LogicalOperator;
  /** The conditions or nested groups within this group */
  conditions: (RuleCondition | RuleConditionGroup)[];
}

/**
 * Check if a condition is a group
 */
export function isConditionGroup(
  condition: RuleCondition | RuleConditionGroup
): condition is RuleConditionGroup {
  return 'conditions' in condition && Array.isArray(condition.conditions);
}

// ============================================================================
// ACTIONS
// ============================================================================

/**
 * Available action types for rule execution
 */
export type RuleActionType =
  | 'assign_queue'
  | 'send_notification'
  | 'update_field'
  | 'create_task'
  | 'escalate'
  | 'trigger_webhook'
  | 'delay'
  | 'conditional_branch'
  | 'send_email'
  | 'send_sms'
  | 'add_note'
  | 'set_priority'
  | 'assign_user'
  | 'create_follow_up'
  | 'run_script'
  | 'stop_processing';

/**
 * A single rule action to execute when conditions are met
 */
export interface RuleAction {
  /** Unique identifier for the action */
  id?: string;
  /** The type of action to perform */
  type: RuleActionType;
  /** Parameters specific to the action type */
  parameters: RuleActionParameters;
  /** Order in which to execute this action (lower = first) */
  order?: number;
  /** Whether to continue executing subsequent actions if this fails */
  continueOnError?: boolean;
  /** Delay in milliseconds before executing this action */
  delayMs?: number;
}

/**
 * Parameters for different action types
 */
export type RuleActionParameters =
  | AssignQueueParameters
  | SendNotificationParameters
  | UpdateFieldParameters
  | CreateTaskParameters
  | EscalateParameters
  | TriggerWebhookParameters
  | DelayParameters
  | ConditionalBranchParameters
  | SendEmailParameters
  | SendSmsParameters
  | AddNoteParameters
  | SetPriorityParameters
  | AssignUserParameters
  | CreateFollowUpParameters
  | RunScriptParameters
  | StopProcessingParameters;

export interface AssignQueueParameters {
  queueId: string;
  queueName?: string;
  reason?: string;
}

export interface SendNotificationParameters {
  recipientType: 'user' | 'role' | 'email' | 'channel';
  recipientId: string;
  subject: string;
  message: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  channel?: 'email' | 'sms' | 'in_app' | 'slack' | 'teams';
}

export interface UpdateFieldParameters {
  fieldPath: string;
  value: RuleConditionValue;
  operation?: 'set' | 'increment' | 'decrement' | 'append' | 'remove';
}

export interface CreateTaskParameters {
  taskType: string;
  title: string;
  description?: string;
  dueInDays?: number;
  dueDate?: string;
  assignTo?: string;
  priority?: number;
  tags?: string[];
}

export interface EscalateParameters {
  escalationType: 'manager' | 'supervisor' | 'specific_user' | 'role';
  targetId?: string;
  reason: string;
  urgency?: 'low' | 'medium' | 'high' | 'critical';
  includeHistory?: boolean;
}

export interface TriggerWebhookParameters {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH';
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
  includeContext?: boolean;
  timeoutMs?: number;
  retryCount?: number;
}

export interface DelayParameters {
  delayMs?: number;
  delayMinutes?: number;
  delayHours?: number;
  delayDays?: number;
  delayUntil?: string; // ISO date string
  delayUntilBusinessHours?: boolean;
}

export interface ConditionalBranchParameters {
  condition: RuleCondition | RuleConditionGroup;
  trueActions: RuleAction[];
  falseActions?: RuleAction[];
}

export interface SendEmailParameters {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  body: string;
  isHtml?: boolean;
  templateId?: string;
  templateData?: Record<string, unknown>;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
  }>;
}

export interface SendSmsParameters {
  to: string;
  message: string;
  templateId?: string;
}

export interface AddNoteParameters {
  note: string;
  noteType?: string;
  visibility?: 'internal' | 'external';
}

export interface SetPriorityParameters {
  priority: number;
  reason?: string;
}

export interface AssignUserParameters {
  userId?: string;
  assignmentMethod: 'specific' | 'round_robin' | 'least_loaded' | 'skill_based';
  skillRequirements?: string[];
  teamId?: string;
}

export interface CreateFollowUpParameters {
  followUpType: string;
  dueInDays: number;
  title: string;
  description?: string;
  assignTo?: string;
}

export interface RunScriptParameters {
  scriptId: string;
  scriptParameters?: Record<string, unknown>;
  timeout?: number;
}

export interface StopProcessingParameters {
  reason?: string;
  markComplete?: boolean;
}

// ============================================================================
// TRIGGERS
// ============================================================================

/**
 * Available trigger types for rules
 */
export type RuleTriggerType =
  | 'on_create'
  | 'on_update'
  | 'on_status_change'
  | 'on_field_change'
  | 'scheduled'
  | 'manual'
  | 'on_payment_posted'
  | 'on_denial_received'
  | 'on_claim_submitted'
  | 'on_deadline_approaching'
  | 'on_assignment_change'
  | 'webhook';

/**
 * Configuration for rule triggers
 */
export interface RuleTrigger {
  /** The type of trigger */
  type: RuleTriggerType;
  /** Entity type this trigger applies to (e.g., 'claim', 'account', 'denial') */
  entityType?: string;
  /** For on_field_change: which fields trigger the rule */
  watchFields?: string[];
  /** For on_status_change: which status changes trigger the rule */
  fromStatus?: string[];
  toStatus?: string[];
  /** For scheduled: cron expression */
  schedule?: string;
  /** For scheduled: timezone */
  timezone?: string;
  /** For on_deadline_approaching: days before deadline */
  daysBeforeDeadline?: number;
  /** For webhook: endpoint path */
  webhookPath?: string;
}

// ============================================================================
// RULES
// ============================================================================

/**
 * Complete workflow rule definition
 */
export interface WorkflowRule {
  /** Unique identifier for the rule */
  id: string;
  /** Display name for the rule */
  name: string;
  /** Description of what the rule does */
  description?: string;
  /** The trigger that activates this rule */
  trigger: RuleTrigger;
  /** Conditions that must be met for actions to execute */
  conditions: (RuleCondition | RuleConditionGroup)[];
  /** Logical operator for combining top-level conditions (default: AND) */
  conditionsOperator?: LogicalOperator;
  /** Actions to execute when conditions are met */
  actions: RuleAction[];
  /** Priority for rule execution order (lower = higher priority) */
  priority: number;
  /** Whether the rule is currently active */
  isActive: boolean;
  /** User who created the rule */
  createdBy?: string;
  /** Organization this rule belongs to */
  organizationId?: string;
  /** Tags for categorization */
  tags?: string[];
  /** Category for grouping */
  category?: string;
  /** Version number for tracking changes */
  version?: number;
  /** Effective date range */
  effectiveFrom?: Date;
  effectiveTo?: Date;
  /** Metadata */
  metadata?: Record<string, unknown>;
  /** Timestamps */
  createdAt?: Date;
  updatedAt?: Date;
}

// ============================================================================
// EXECUTION CONTEXT
// ============================================================================

/**
 * Context provided to rule evaluation
 */
export interface RuleExecutionContext {
  /** The entity being evaluated */
  entity: Record<string, unknown>;
  /** Type of the entity */
  entityType: string;
  /** ID of the entity */
  entityId: string;
  /** The trigger that initiated evaluation */
  trigger: RuleTriggerType;
  /** Previous state of the entity (for updates) */
  previousEntity?: Record<string, unknown>;
  /** Changed fields (for field change triggers) */
  changedFields?: string[];
  /** Current user performing the action */
  userId?: string;
  /** Organization context */
  organizationId?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Current timestamp */
  timestamp: Date;
}

/**
 * Result of evaluating a single condition
 */
export interface ConditionEvaluationResult {
  condition: RuleCondition | RuleConditionGroup;
  passed: boolean;
  actualValue?: unknown;
  expectedValue?: unknown;
  error?: string;
}

/**
 * Result of executing a single action
 */
export interface ActionExecutionResult {
  action: RuleAction;
  success: boolean;
  result?: unknown;
  error?: string;
  executionTimeMs?: number;
}

/**
 * Result of executing a complete rule
 */
export interface RuleExecutionResult {
  rule: WorkflowRule;
  triggered: boolean;
  conditionsPassed: boolean;
  conditionResults: ConditionEvaluationResult[];
  actionsExecuted: boolean;
  actionResults: ActionExecutionResult[];
  executionTimeMs: number;
  error?: string;
  timestamp: Date;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validation error for rules
 */
export interface RuleValidationError {
  path: string;
  message: string;
  code: string;
}

/**
 * Validation result for rules
 */
export interface RuleValidationResult {
  isValid: boolean;
  errors: RuleValidationError[];
  warnings?: RuleValidationError[];
}

// ============================================================================
// TEMPLATES
// ============================================================================

/**
 * Rule template for common use cases
 */
export interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  trigger: RuleTrigger;
  conditions: (RuleCondition | RuleConditionGroup)[];
  actions: RuleAction[];
  tags: string[];
  parameters?: RuleTemplateParameter[];
}

/**
 * Parameter that can be customized when using a template
 */
export interface RuleTemplateParameter {
  name: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'date';
  required: boolean;
  defaultValue?: unknown;
  options?: Array<{ label: string; value: unknown }>;
  placeholder?: string;
  description?: string;
}
