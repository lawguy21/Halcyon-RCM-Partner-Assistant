/**
 * Workflow Rule Templates
 *
 * Pre-built rule templates for common RCM automation scenarios including:
 * - High-value claim routing
 * - Timely filing alerts
 * - Denial auto-routing
 * - Payment variance alerts
 * - Aging escalation
 * - Payer-specific routing
 */

import type { RuleTemplate, WorkflowRule } from './rule-types.js';

// ============================================================================
// RULE TEMPLATES
// ============================================================================

/**
 * High-value claim routing template
 * Routes claims over a threshold to senior staff
 */
export const highValueClaimRoutingTemplate: RuleTemplate = {
  id: 'tpl_high_value_claim_routing',
  name: 'High-Value Claim Routing',
  description: 'Automatically route high-value claims to senior billing specialists for priority handling',
  category: 'claim_routing',
  trigger: {
    type: 'on_create',
    entityType: 'claim',
  },
  conditions: [
    {
      field: 'totalCharges',
      operator: 'greater_than',
      value: 10000,
    },
  ],
  actions: [
    {
      type: 'assign_queue',
      parameters: {
        queueId: 'senior_billing',
        queueName: 'Senior Billing Specialists',
        reason: 'High-value claim over $10,000 threshold',
      },
      order: 1,
    },
    {
      type: 'set_priority',
      parameters: {
        priority: 1,
        reason: 'High-value claim priority escalation',
      },
      order: 2,
    },
    {
      type: 'send_notification',
      parameters: {
        recipientType: 'role',
        recipientId: 'billing_supervisor',
        subject: 'High-Value Claim Requires Attention',
        message: 'A new claim exceeding $10,000 has been received and routed to the senior billing queue.',
        priority: 'high',
        channel: 'in_app',
      },
      order: 3,
    },
  ],
  tags: ['high-value', 'routing', 'priority'],
  parameters: [
    {
      name: 'threshold',
      label: 'Amount Threshold',
      type: 'number',
      required: true,
      defaultValue: 10000,
      description: 'Claims above this amount will be routed to senior staff',
    },
    {
      name: 'queueId',
      label: 'Target Queue',
      type: 'select',
      required: true,
      defaultValue: 'senior_billing',
      options: [
        { label: 'Senior Billing', value: 'senior_billing' },
        { label: 'VIP Accounts', value: 'vip_accounts' },
        { label: 'Complex Cases', value: 'complex_cases' },
      ],
    },
  ],
};

/**
 * Timely filing alert template
 * Alerts when claims approach filing deadline
 */
export const timelyFilingAlertTemplate: RuleTemplate = {
  id: 'tpl_timely_filing_alert',
  name: 'Timely Filing Alert',
  description: 'Send alerts when claims are approaching their timely filing deadline',
  category: 'compliance',
  trigger: {
    type: 'scheduled',
    schedule: '0 8 * * *', // Daily at 8 AM
  },
  conditions: [
    {
      field: 'status',
      operator: 'in_list',
      value: ['pending', 'draft', 'needs_info'],
    },
    {
      field: 'timelyFilingDeadline',
      operator: 'days_since_less_than',
      value: 30,
    },
  ],
  actions: [
    {
      type: 'escalate',
      parameters: {
        escalationType: 'supervisor',
        reason: 'Claim approaching timely filing deadline - less than 30 days remaining',
        urgency: 'high',
        includeHistory: true,
      },
      order: 1,
    },
    {
      type: 'create_task',
      parameters: {
        taskType: 'timely_filing_review',
        title: 'Urgent: Review claim before timely filing deadline',
        description: 'This claim is approaching its timely filing deadline. Please review and submit or escalate immediately.',
        dueInDays: 5,
        priority: 1,
        tags: ['urgent', 'timely-filing'],
      },
      order: 2,
    },
    {
      type: 'add_note',
      parameters: {
        note: 'ALERT: Timely filing deadline approaching. Automated escalation triggered.',
        noteType: 'system_alert',
        visibility: 'internal',
      },
      order: 3,
    },
  ],
  tags: ['compliance', 'timely-filing', 'deadline', 'alert'],
  parameters: [
    {
      name: 'daysBeforeDeadline',
      label: 'Days Before Deadline',
      type: 'number',
      required: true,
      defaultValue: 30,
      description: 'Alert when this many days remain before the filing deadline',
    },
    {
      name: 'urgency',
      label: 'Alert Urgency',
      type: 'select',
      required: true,
      defaultValue: 'high',
      options: [
        { label: 'Low', value: 'low' },
        { label: 'Medium', value: 'medium' },
        { label: 'High', value: 'high' },
        { label: 'Critical', value: 'critical' },
      ],
    },
  ],
};

/**
 * Denial auto-routing template
 * Routes denials based on CARC code to specialized queues
 */
export const denialAutoRoutingTemplate: RuleTemplate = {
  id: 'tpl_denial_auto_routing',
  name: 'Denial Auto-Routing by CARC Code',
  description: 'Automatically route denials to specialized queues based on denial reason codes',
  category: 'denial_management',
  trigger: {
    type: 'on_denial_received',
    entityType: 'denial',
  },
  conditions: [
    {
      field: 'carcCode',
      operator: 'in_list',
      value: ['16', '18', '27', '29', '50', '96', '97'],
    },
  ],
  actions: [
    {
      type: 'assign_queue',
      parameters: {
        queueId: 'eligibility_denials',
        queueName: 'Eligibility Denials',
        reason: 'Eligibility-related denial code detected',
      },
      order: 1,
    },
    {
      type: 'create_task',
      parameters: {
        taskType: 'denial_review',
        title: 'Review eligibility denial',
        description: 'Denial received with eligibility-related CARC code. Verify patient eligibility and determine appeal strategy.',
        dueInDays: 3,
        priority: 2,
        tags: ['denial', 'eligibility'],
      },
      order: 2,
    },
  ],
  tags: ['denial', 'routing', 'carc', 'eligibility'],
  parameters: [
    {
      name: 'carcCodes',
      label: 'CARC Codes',
      type: 'string',
      required: true,
      defaultValue: '16,18,27,29,50,96,97',
      description: 'Comma-separated list of CARC codes to match',
    },
    {
      name: 'queueId',
      label: 'Target Queue',
      type: 'select',
      required: true,
      defaultValue: 'eligibility_denials',
      options: [
        { label: 'Eligibility Denials', value: 'eligibility_denials' },
        { label: 'Coding Denials', value: 'coding_denials' },
        { label: 'Medical Necessity', value: 'medical_necessity' },
        { label: 'Authorization Denials', value: 'auth_denials' },
        { label: 'Timely Filing', value: 'timely_filing_denials' },
      ],
    },
  ],
};

/**
 * Payment variance alert template
 * Creates alerts when payment variance exceeds threshold
 */
export const paymentVarianceAlertTemplate: RuleTemplate = {
  id: 'tpl_payment_variance_alert',
  name: 'Payment Variance Alert',
  description: 'Alert when payment received differs significantly from expected reimbursement',
  category: 'payment_posting',
  trigger: {
    type: 'on_payment_posted',
    entityType: 'payment',
  },
  conditions: [
    {
      field: 'variancePercentage',
      operator: 'greater_than',
      value: 10,
    },
  ],
  actions: [
    {
      type: 'create_task',
      parameters: {
        taskType: 'variance_review',
        title: 'Payment variance exceeds 10%',
        description: 'Review payment for significant variance from expected reimbursement. May indicate underpayment or contract issue.',
        dueInDays: 5,
        priority: 2,
        tags: ['variance', 'underpayment', 'review'],
      },
      order: 1,
    },
    {
      type: 'add_note',
      parameters: {
        note: 'Payment variance detected. Automated task created for review.',
        noteType: 'payment_alert',
        visibility: 'internal',
      },
      order: 2,
    },
    {
      type: 'send_notification',
      parameters: {
        recipientType: 'role',
        recipientId: 'payment_supervisor',
        subject: 'Payment Variance Alert',
        message: 'A payment was posted with variance exceeding the configured threshold. Please review for potential underpayment.',
        priority: 'normal',
        channel: 'email',
      },
      order: 3,
    },
  ],
  tags: ['payment', 'variance', 'underpayment', 'alert'],
  parameters: [
    {
      name: 'varianceThreshold',
      label: 'Variance Threshold (%)',
      type: 'number',
      required: true,
      defaultValue: 10,
      description: 'Alert when variance exceeds this percentage',
    },
    {
      name: 'includeOverpayments',
      label: 'Include Overpayments',
      type: 'boolean',
      required: false,
      defaultValue: true,
      description: 'Also alert for overpayments',
    },
  ],
};

/**
 * Aging escalation template
 * Escalates accounts that have aged past threshold
 */
export const agingEscalationTemplate: RuleTemplate = {
  id: 'tpl_aging_escalation',
  name: 'Aging Account Escalation',
  description: 'Automatically escalate accounts that have aged beyond the configured threshold',
  category: 'collections',
  trigger: {
    type: 'scheduled',
    schedule: '0 6 * * 1', // Weekly on Monday at 6 AM
  },
  conditions: [
    {
      field: 'status',
      operator: 'not_equals',
      value: 'closed',
    },
    {
      field: 'createdAt',
      operator: 'days_since_greater_than',
      value: 90,
    },
    {
      field: 'balance',
      operator: 'greater_than',
      value: 0,
    },
  ],
  actions: [
    {
      type: 'escalate',
      parameters: {
        escalationType: 'manager',
        reason: 'Account has aged past 90 days with outstanding balance',
        urgency: 'medium',
        includeHistory: true,
      },
      order: 1,
    },
    {
      type: 'send_notification',
      parameters: {
        recipientType: 'role',
        recipientId: 'collections_manager',
        subject: 'Aged Account Requires Attention',
        message: 'An account has aged past 90 days with an outstanding balance. Please review for potential write-off or collections action.',
        priority: 'high',
        channel: 'in_app',
      },
      order: 2,
    },
    {
      type: 'update_field',
      parameters: {
        fieldPath: 'requiresManagerReview',
        value: true,
        operation: 'set',
      },
      order: 3,
    },
  ],
  tags: ['aging', 'escalation', 'collections', 'ar'],
  parameters: [
    {
      name: 'agingThresholdDays',
      label: 'Aging Threshold (Days)',
      type: 'number',
      required: true,
      defaultValue: 90,
      description: 'Escalate accounts older than this many days',
    },
    {
      name: 'minimumBalance',
      label: 'Minimum Balance',
      type: 'number',
      required: false,
      defaultValue: 0,
      description: 'Only escalate if balance exceeds this amount',
    },
  ],
};

/**
 * Payer-specific routing template
 * Routes claims to specialized queues based on payer
 */
export const payerSpecificRoutingTemplate: RuleTemplate = {
  id: 'tpl_payer_specific_routing',
  name: 'Payer-Specific Routing',
  description: 'Route claims to specialized queues based on the payer',
  category: 'claim_routing',
  trigger: {
    type: 'on_create',
    entityType: 'claim',
  },
  conditions: [
    {
      field: 'payerId',
      operator: 'in_list',
      value: ['MEDICARE_A', 'MEDICARE_B'],
    },
  ],
  actions: [
    {
      type: 'assign_queue',
      parameters: {
        queueId: 'medicare_specialist',
        queueName: 'Medicare Specialists',
        reason: 'Medicare claim routed to specialized team',
      },
      order: 1,
    },
    {
      type: 'assign_user',
      parameters: {
        assignmentMethod: 'skill_based',
        skillRequirements: ['medicare_certification', 'government_payer'],
        teamId: 'medicare_team',
      },
      order: 2,
    },
  ],
  tags: ['payer', 'routing', 'medicare', 'specialized'],
  parameters: [
    {
      name: 'payerIds',
      label: 'Payer IDs',
      type: 'string',
      required: true,
      defaultValue: 'MEDICARE_A,MEDICARE_B',
      description: 'Comma-separated list of payer IDs to match',
    },
    {
      name: 'queueId',
      label: 'Target Queue',
      type: 'select',
      required: true,
      defaultValue: 'medicare_specialist',
      options: [
        { label: 'Medicare Specialists', value: 'medicare_specialist' },
        { label: 'Medicaid Specialists', value: 'medicaid_specialist' },
        { label: 'Commercial Team', value: 'commercial_team' },
        { label: 'Workers Comp', value: 'workers_comp' },
      ],
    },
  ],
};

/**
 * Coding denial routing template
 */
export const codingDenialRoutingTemplate: RuleTemplate = {
  id: 'tpl_coding_denial_routing',
  name: 'Coding Denial Routing',
  description: 'Route coding-related denials to the coding team for review',
  category: 'denial_management',
  trigger: {
    type: 'on_denial_received',
    entityType: 'denial',
  },
  conditions: [
    {
      field: 'category',
      operator: 'equals',
      value: 'CODING',
    },
  ],
  actions: [
    {
      type: 'assign_queue',
      parameters: {
        queueId: 'coding_review',
        queueName: 'Coding Review',
        reason: 'Coding-related denial requires coder review',
      },
      order: 1,
    },
    {
      type: 'create_task',
      parameters: {
        taskType: 'coding_review',
        title: 'Review coding denial',
        description: 'A claim has been denied for coding reasons. Please review documentation and determine if rebilling with corrected codes is appropriate.',
        dueInDays: 5,
        priority: 2,
        tags: ['coding', 'denial', 'review'],
      },
      order: 2,
    },
  ],
  tags: ['coding', 'denial', 'routing'],
  parameters: [],
};

/**
 * Authorization denial routing template
 */
export const authDenialRoutingTemplate: RuleTemplate = {
  id: 'tpl_auth_denial_routing',
  name: 'Authorization Denial Routing',
  description: 'Route authorization-related denials for appeal consideration',
  category: 'denial_management',
  trigger: {
    type: 'on_denial_received',
    entityType: 'denial',
  },
  conditions: [
    {
      field: 'carcCode',
      operator: 'in_list',
      value: ['4', '197', '15', '55'],
    },
  ],
  actions: [
    {
      type: 'assign_queue',
      parameters: {
        queueId: 'auth_appeals',
        queueName: 'Authorization Appeals',
        reason: 'Authorization denial detected - appeal review required',
      },
      order: 1,
    },
    {
      type: 'create_task',
      parameters: {
        taskType: 'auth_appeal',
        title: 'Review authorization denial for appeal',
        description: 'A claim was denied due to authorization issues. Review for potential retro-auth or appeal.',
        dueInDays: 7,
        priority: 2,
        tags: ['authorization', 'appeal', 'denial'],
      },
      order: 2,
    },
  ],
  tags: ['authorization', 'denial', 'appeal', 'routing'],
  parameters: [],
};

/**
 * New patient account setup template
 */
export const newPatientAccountSetupTemplate: RuleTemplate = {
  id: 'tpl_new_patient_account_setup',
  name: 'New Patient Account Setup',
  description: 'Automatically set up new patient accounts with standard tasks and verification',
  category: 'account_management',
  trigger: {
    type: 'on_create',
    entityType: 'patient_account',
  },
  conditions: [],
  actions: [
    {
      type: 'create_task',
      parameters: {
        taskType: 'verify_demographics',
        title: 'Verify patient demographics',
        description: 'Verify patient name, DOB, address, and contact information.',
        dueInDays: 1,
        priority: 3,
        tags: ['demographics', 'verification'],
      },
      order: 1,
    },
    {
      type: 'create_task',
      parameters: {
        taskType: 'verify_insurance',
        title: 'Verify insurance eligibility',
        description: 'Run eligibility check and verify coverage details.',
        dueInDays: 1,
        priority: 2,
        tags: ['insurance', 'eligibility'],
      },
      order: 2,
    },
    {
      type: 'add_note',
      parameters: {
        note: 'New patient account created. Standard verification tasks have been generated.',
        noteType: 'system',
        visibility: 'internal',
      },
      order: 3,
    },
  ],
  tags: ['new-account', 'setup', 'verification'],
  parameters: [],
};

/**
 * Payment plan compliance template
 */
export const paymentPlanComplianceTemplate: RuleTemplate = {
  id: 'tpl_payment_plan_compliance',
  name: 'Payment Plan Compliance Check',
  description: 'Monitor payment plan compliance and take action on missed payments',
  category: 'collections',
  trigger: {
    type: 'scheduled',
    schedule: '0 9 * * *', // Daily at 9 AM
  },
  conditions: [
    {
      field: 'paymentPlan.status',
      operator: 'equals',
      value: 'active',
    },
    {
      field: 'paymentPlan.missedPayments',
      operator: 'greater_than',
      value: 0,
    },
  ],
  actions: [
    {
      type: 'send_notification',
      parameters: {
        recipientType: 'user',
        recipientId: '${assignedTo}',
        subject: 'Payment Plan - Missed Payment Alert',
        message: 'A patient has missed a scheduled payment. Please follow up to prevent plan default.',
        priority: 'high',
        channel: 'in_app',
      },
      order: 1,
    },
    {
      type: 'create_task',
      parameters: {
        taskType: 'payment_plan_followup',
        title: 'Follow up on missed payment',
        description: 'Contact patient regarding missed payment plan payment. Discuss options to get plan back on track.',
        dueInDays: 2,
        priority: 2,
        tags: ['payment-plan', 'missed-payment', 'follow-up'],
      },
      order: 2,
    },
  ],
  tags: ['payment-plan', 'compliance', 'collections'],
  parameters: [
    {
      name: 'missedPaymentThreshold',
      label: 'Missed Payment Threshold',
      type: 'number',
      required: true,
      defaultValue: 1,
      description: 'Number of missed payments to trigger action',
    },
  ],
};

// ============================================================================
// TEMPLATE REGISTRY
// ============================================================================

/**
 * All available rule templates
 */
export const ruleTemplates: RuleTemplate[] = [
  highValueClaimRoutingTemplate,
  timelyFilingAlertTemplate,
  denialAutoRoutingTemplate,
  paymentVarianceAlertTemplate,
  agingEscalationTemplate,
  payerSpecificRoutingTemplate,
  codingDenialRoutingTemplate,
  authDenialRoutingTemplate,
  newPatientAccountSetupTemplate,
  paymentPlanComplianceTemplate,
];

/**
 * Get all templates
 */
export function getAllTemplates(): RuleTemplate[] {
  return ruleTemplates;
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): RuleTemplate | undefined {
  return ruleTemplates.find((t) => t.id === id);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): RuleTemplate[] {
  return ruleTemplates.filter((t) => t.category === category);
}

/**
 * Get templates by tag
 */
export function getTemplatesByTag(tag: string): RuleTemplate[] {
  return ruleTemplates.filter((t) => t.tags.includes(tag));
}

/**
 * Search templates
 */
export function searchTemplates(query: string): RuleTemplate[] {
  const lowerQuery = query.toLowerCase();
  return ruleTemplates.filter(
    (t) =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Get all unique template categories
 */
export function getTemplateCategories(): string[] {
  return [...new Set(ruleTemplates.map((t) => t.category))];
}

/**
 * Create a rule from a template with customized parameters
 */
export function createRuleFromTemplate(
  template: RuleTemplate,
  customizations: {
    name?: string;
    priority?: number;
    isActive?: boolean;
    organizationId?: string;
    createdBy?: string;
    parameterValues?: Record<string, unknown>;
  }
): Omit<WorkflowRule, 'id'> {
  // Deep clone template parts
  const conditions = JSON.parse(JSON.stringify(template.conditions));
  const actions = JSON.parse(JSON.stringify(template.actions));
  const trigger = JSON.parse(JSON.stringify(template.trigger));

  // Apply parameter values if provided
  if (customizations.parameterValues && template.parameters) {
    for (const param of template.parameters) {
      const value = customizations.parameterValues[param.name];
      if (value !== undefined) {
        // Apply parameter to conditions and actions
        // This is a simplified implementation - in production, you'd want more sophisticated templating
        applyParameterToConditions(conditions, param.name, value);
        applyParameterToActions(actions, param.name, value);
      }
    }
  }

  return {
    name: customizations.name || template.name,
    description: template.description,
    trigger,
    conditions,
    actions,
    priority: customizations.priority ?? 100,
    isActive: customizations.isActive ?? false,
    organizationId: customizations.organizationId,
    createdBy: customizations.createdBy,
    tags: [...template.tags],
    category: template.category,
    version: 1,
    metadata: {
      templateId: template.id,
      templateVersion: 1,
    },
  };
}

/**
 * Apply parameter value to conditions
 */
function applyParameterToConditions(
  conditions: unknown[],
  paramName: string,
  value: unknown
): void {
  for (const condition of conditions) {
    if (typeof condition === 'object' && condition !== null) {
      const cond = condition as Record<string, unknown>;
      if (cond.value === `\${${paramName}}`) {
        cond.value = value;
      }
      // Handle nested condition groups
      if (Array.isArray(cond.conditions)) {
        applyParameterToConditions(cond.conditions, paramName, value);
      }
    }
  }
}

/**
 * Apply parameter value to actions
 */
function applyParameterToActions(
  actions: unknown[],
  paramName: string,
  value: unknown
): void {
  for (const action of actions) {
    if (typeof action === 'object' && action !== null) {
      const act = action as Record<string, unknown>;
      if (typeof act.parameters === 'object' && act.parameters !== null) {
        const params = act.parameters as Record<string, unknown>;
        for (const key of Object.keys(params)) {
          if (params[key] === `\${${paramName}}`) {
            params[key] = value;
          }
        }
      }
    }
  }
}
