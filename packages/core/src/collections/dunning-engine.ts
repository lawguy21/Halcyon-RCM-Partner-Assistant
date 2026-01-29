/**
 * Dunning Automation Engine
 *
 * Manages automated dunning sequences for collection accounts,
 * including schedule generation, action execution, and skip logic.
 */

import {
  CollectionState,
  CollectionAction,
  getStateConfig,
  getDunningIntensity,
} from './collection-states.js';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Communication channel for dunning
 */
export type DunningChannel = 'EMAIL' | 'SMS' | 'LETTER' | 'CALL' | 'PORTAL';

/**
 * Account type affecting dunning strategy
 */
export type AccountType = 'SELF_PAY' | 'INSURANCE' | 'WORKERS_COMP' | 'CHARITY' | 'PAYMENT_PLAN' | 'HARDSHIP';

/**
 * Dunning action in a sequence
 */
export interface DunningAction {
  /** Day relative to due date (positive = days past due) */
  day: number;
  /** Action to perform */
  action: CollectionAction;
  /** Template to use for communication */
  template: string;
  /** Channel to use */
  channel: DunningChannel;
  /** Whether this action is mandatory */
  mandatory: boolean;
  /** Description of the action */
  description: string;
}

/**
 * Dunning schedule for an account
 */
export interface DunningSchedule {
  /** Account ID */
  accountId: string;
  /** Account type */
  accountType: AccountType;
  /** Current collection state */
  currentState: CollectionState;
  /** Current balance */
  balance: number;
  /** Days past due */
  daysPastDue: number;
  /** Scheduled actions */
  actions: ScheduledDunningAction[];
  /** Next action date */
  nextActionDate: Date;
  /** Whether dunning is paused */
  isPaused: boolean;
  /** Pause reason if applicable */
  pauseReason?: string;
  /** Pause end date if applicable */
  pauseEndDate?: Date;
}

/**
 * Scheduled dunning action with date
 */
export interface ScheduledDunningAction extends DunningAction {
  /** Scheduled date for this action */
  scheduledDate: Date;
  /** Status of the action */
  status: 'PENDING' | 'COMPLETED' | 'SKIPPED' | 'FAILED';
  /** Completion date if completed */
  completedDate?: Date;
  /** Skip reason if skipped */
  skipReason?: string;
}

/**
 * Skip condition for dunning
 */
export interface DunningSkipCondition {
  /** Condition type */
  type: 'RECENT_PAYMENT' | 'PROMISE_TO_PAY' | 'HARDSHIP' | 'DISPUTE' | 'BANKRUPTCY' | 'DECEASED' | 'PAYMENT_PLAN' | 'MINIMUM_BALANCE';
  /** Whether this condition is currently active */
  active: boolean;
  /** Date condition was set */
  effectiveDate?: Date;
  /** Date condition expires */
  expirationDate?: Date;
  /** Additional details */
  details?: string;
}

/**
 * Account input for dunning plan generation
 */
export interface DunningAccountInput {
  /** Account ID */
  accountId: string;
  /** Account type */
  accountType: AccountType;
  /** Current collection state */
  currentState: CollectionState;
  /** Current balance */
  balance: number;
  /** Due date of the account */
  dueDate: Date;
  /** Last payment date if any */
  lastPaymentDate?: Date;
  /** Last payment amount if any */
  lastPaymentAmount?: number;
  /** Promise to pay date if any */
  promiseToPayDate?: Date;
  /** Promise to pay amount if any */
  promiseToPayAmount?: number;
  /** Whether patient has filed hardship */
  hasHardship?: boolean;
  /** Whether account is on payment plan */
  onPaymentPlan?: boolean;
  /** Preferred contact channels */
  preferredChannels?: DunningChannel[];
  /** Skip conditions */
  skipConditions?: DunningSkipCondition[];
}

/**
 * Result of dunning action execution
 */
export interface DunningExecutionResult {
  /** Account ID */
  accountId: string;
  /** Action executed */
  action: CollectionAction;
  /** Whether execution was successful */
  success: boolean;
  /** Result message */
  message: string;
  /** Channel used */
  channel: DunningChannel;
  /** Timestamp */
  timestamp: Date;
  /** Error if failed */
  error?: string;
  /** Next scheduled action */
  nextAction?: ScheduledDunningAction;
}

// ============================================================================
// DUNNING SEQUENCES BY ACCOUNT TYPE
// ============================================================================

const SELF_PAY_SEQUENCE: DunningAction[] = [
  { day: 1, action: 'SEND_STATEMENT', template: 'initial_statement', channel: 'LETTER', mandatory: true, description: 'Initial statement sent' },
  { day: 14, action: 'SEND_REMINDER', template: 'first_reminder', channel: 'EMAIL', mandatory: false, description: 'First reminder email' },
  { day: 30, action: 'SEND_STATEMENT', template: 'second_statement', channel: 'LETTER', mandatory: true, description: 'Second statement - past due notice' },
  { day: 35, action: 'SEND_REMINDER', template: 'sms_reminder', channel: 'SMS', mandatory: false, description: 'SMS payment reminder' },
  { day: 45, action: 'MAKE_CALL', template: 'first_call', channel: 'CALL', mandatory: false, description: 'First collection call' },
  { day: 60, action: 'SEND_STATEMENT', template: 'third_statement', channel: 'LETTER', mandatory: true, description: 'Third statement - urgent' },
  { day: 65, action: 'MAKE_CALL', template: 'second_call', channel: 'CALL', mandatory: false, description: 'Second collection call' },
  { day: 75, action: 'SEND_REMINDER', template: 'final_email', channel: 'EMAIL', mandatory: false, description: 'Final email reminder' },
  { day: 90, action: 'SEND_DEMAND_LETTER', template: 'demand_letter', channel: 'LETTER', mandatory: true, description: 'Demand letter sent' },
  { day: 100, action: 'MAKE_CALL', template: 'final_call', channel: 'CALL', mandatory: true, description: 'Final collection call' },
  { day: 120, action: 'FINAL_NOTICE', template: 'final_notice', channel: 'LETTER', mandatory: true, description: 'Final notice before collection agency' },
];

const INSURANCE_SEQUENCE: DunningAction[] = [
  { day: 1, action: 'SEND_STATEMENT', template: 'insurance_statement', channel: 'LETTER', mandatory: true, description: 'Patient responsibility statement' },
  { day: 21, action: 'SEND_REMINDER', template: 'insurance_reminder', channel: 'EMAIL', mandatory: false, description: 'Insurance balance reminder' },
  { day: 45, action: 'SEND_STATEMENT', template: 'insurance_second', channel: 'LETTER', mandatory: true, description: 'Second insurance balance statement' },
  { day: 60, action: 'MAKE_CALL', template: 'insurance_call', channel: 'CALL', mandatory: false, description: 'Patient responsibility call' },
  { day: 75, action: 'SEND_DEMAND_LETTER', template: 'insurance_demand', channel: 'LETTER', mandatory: true, description: 'Insurance balance demand' },
  { day: 90, action: 'FINAL_NOTICE', template: 'insurance_final', channel: 'LETTER', mandatory: true, description: 'Final notice - insurance balance' },
];

const WORKERS_COMP_SEQUENCE: DunningAction[] = [
  { day: 30, action: 'SEND_STATEMENT', template: 'wc_statement', channel: 'LETTER', mandatory: true, description: 'Workers comp statement' },
  { day: 60, action: 'SEND_REMINDER', template: 'wc_reminder', channel: 'EMAIL', mandatory: false, description: 'Workers comp reminder' },
  { day: 90, action: 'MAKE_CALL', template: 'wc_call', channel: 'CALL', mandatory: true, description: 'Workers comp follow-up call' },
  { day: 120, action: 'SEND_DEMAND_LETTER', template: 'wc_demand', channel: 'LETTER', mandatory: true, description: 'Workers comp demand letter' },
];

const CHARITY_SEQUENCE: DunningAction[] = [
  { day: 1, action: 'SEND_STATEMENT', template: 'charity_statement', channel: 'LETTER', mandatory: true, description: 'Charity care application reminder' },
  { day: 30, action: 'SEND_REMINDER', template: 'charity_reminder', channel: 'EMAIL', mandatory: false, description: 'Charity care follow-up' },
  { day: 60, action: 'MAKE_CALL', template: 'charity_call', channel: 'CALL', mandatory: false, description: 'Charity care assistance call' },
];

const PAYMENT_PLAN_SEQUENCE: DunningAction[] = [
  { day: 5, action: 'SEND_REMINDER', template: 'pp_reminder', channel: 'EMAIL', mandatory: false, description: 'Payment plan reminder' },
  { day: 7, action: 'SEND_REMINDER', template: 'pp_sms', channel: 'SMS', mandatory: false, description: 'Payment plan SMS reminder' },
  { day: 14, action: 'MAKE_CALL', template: 'pp_call', channel: 'CALL', mandatory: true, description: 'Payment plan missed payment call' },
  { day: 21, action: 'SEND_STATEMENT', template: 'pp_statement', channel: 'LETTER', mandatory: true, description: 'Payment plan status statement' },
  { day: 30, action: 'SEND_DEMAND_LETTER', template: 'pp_default', channel: 'LETTER', mandatory: true, description: 'Payment plan default notice' },
];

const HARDSHIP_SEQUENCE: DunningAction[] = [
  { day: 30, action: 'SEND_STATEMENT', template: 'hardship_statement', channel: 'LETTER', mandatory: true, description: 'Hardship status statement' },
  { day: 90, action: 'SEND_REMINDER', template: 'hardship_review', channel: 'LETTER', mandatory: true, description: 'Hardship review reminder' },
];

const DUNNING_SEQUENCES: Record<AccountType, DunningAction[]> = {
  SELF_PAY: SELF_PAY_SEQUENCE,
  INSURANCE: INSURANCE_SEQUENCE,
  WORKERS_COMP: WORKERS_COMP_SEQUENCE,
  CHARITY: CHARITY_SEQUENCE,
  PAYMENT_PLAN: PAYMENT_PLAN_SEQUENCE,
  HARDSHIP: HARDSHIP_SEQUENCE,
};

// ============================================================================
// MINIMUM BALANCE THRESHOLDS
// ============================================================================

const MINIMUM_BALANCE_THRESHOLDS: Record<AccountType, number> = {
  SELF_PAY: 25,
  INSURANCE: 10,
  WORKERS_COMP: 50,
  CHARITY: 0,
  PAYMENT_PLAN: 10,
  HARDSHIP: 0,
};

// ============================================================================
// DUNNING ENGINE FUNCTIONS
// ============================================================================

/**
 * Check if dunning should be skipped for an account
 */
export function shouldSkipDunning(account: DunningAccountInput): { skip: boolean; reason?: string } {
  // Check minimum balance
  const minBalance = MINIMUM_BALANCE_THRESHOLDS[account.accountType];
  if (account.balance < minBalance) {
    return { skip: true, reason: `Balance below minimum threshold ($${minBalance})` };
  }

  // Check for recent payment (within 14 days)
  if (account.lastPaymentDate) {
    const daysSincePayment = Math.floor((Date.now() - account.lastPaymentDate.getTime()) / (24 * 60 * 60 * 1000));
    if (daysSincePayment <= 14) {
      return { skip: true, reason: `Recent payment received ${daysSincePayment} days ago` };
    }
  }

  // Check for active promise to pay
  if (account.promiseToPayDate) {
    const promiseDate = new Date(account.promiseToPayDate);
    if (promiseDate >= new Date()) {
      return { skip: true, reason: `Promise to pay scheduled for ${promiseDate.toLocaleDateString()}` };
    }
  }

  // Check for hardship
  if (account.hasHardship) {
    return { skip: true, reason: 'Account has hardship status' };
  }

  // Check explicit skip conditions
  if (account.skipConditions) {
    for (const condition of account.skipConditions) {
      if (condition.active) {
        // Check if condition has expired
        if (condition.expirationDate && new Date(condition.expirationDate) < new Date()) {
          continue;
        }

        switch (condition.type) {
          case 'BANKRUPTCY':
            return { skip: true, reason: 'Account in bankruptcy - all collection activity prohibited' };
          case 'DECEASED':
            return { skip: true, reason: 'Patient deceased - dunning suspended' };
          case 'DISPUTE':
            return { skip: true, reason: 'Active dispute on account' };
          case 'HARDSHIP':
            return { skip: true, reason: 'Hardship condition active' };
          case 'PAYMENT_PLAN':
            // Payment plans have their own sequence, don't skip but switch type
            break;
          case 'PROMISE_TO_PAY':
            return { skip: true, reason: `Promise to pay active: ${condition.details || 'pending payment'}` };
          case 'RECENT_PAYMENT':
            return { skip: true, reason: 'Recent payment activity detected' };
          case 'MINIMUM_BALANCE':
            return { skip: true, reason: 'Balance below collection threshold' };
        }
      }
    }
  }

  return { skip: false };
}

/**
 * Generate a dunning plan for an account
 */
export function generateDunningPlan(account: DunningAccountInput): DunningSchedule {
  const dueDate = new Date(account.dueDate);
  const today = new Date();
  const daysPastDue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000)));

  // Check if dunning should be paused
  const skipCheck = shouldSkipDunning(account);
  if (skipCheck.skip) {
    return {
      accountId: account.accountId,
      accountType: account.accountType,
      currentState: account.currentState,
      balance: account.balance,
      daysPastDue,
      actions: [],
      nextActionDate: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000), // Review in 30 days
      isPaused: true,
      pauseReason: skipCheck.reason,
    };
  }

  // Get the appropriate dunning sequence
  let sequence = DUNNING_SEQUENCES[account.accountType];

  // If on payment plan, use payment plan sequence
  if (account.onPaymentPlan) {
    sequence = DUNNING_SEQUENCES.PAYMENT_PLAN;
  }

  // Generate scheduled actions
  const scheduledActions: ScheduledDunningAction[] = [];
  let nextActionDate: Date | null = null;

  for (const action of sequence) {
    const scheduledDate = new Date(dueDate.getTime() + action.day * 24 * 60 * 60 * 1000);

    // Determine status based on current date
    let status: 'PENDING' | 'COMPLETED' | 'SKIPPED' | 'FAILED' = 'PENDING';
    if (scheduledDate < today) {
      // Past actions - assume completed (in real system, this would be tracked)
      status = 'COMPLETED';
    }

    const scheduledAction: ScheduledDunningAction = {
      ...action,
      scheduledDate,
      status,
    };

    // Respect channel preferences
    if (status === 'PENDING' && account.preferredChannels && account.preferredChannels.length > 0) {
      if (!account.preferredChannels.includes(action.channel)) {
        // Skip non-preferred channels unless mandatory
        if (!action.mandatory) {
          scheduledAction.status = 'SKIPPED';
          scheduledAction.skipReason = 'Channel not in patient preferences';
        }
      }
    }

    scheduledActions.push(scheduledAction);

    // Find next pending action
    if (status === 'PENDING' && !nextActionDate) {
      nextActionDate = scheduledDate;
    }
  }

  return {
    accountId: account.accountId,
    accountType: account.accountType,
    currentState: account.currentState,
    balance: account.balance,
    daysPastDue,
    actions: scheduledActions,
    nextActionDate: nextActionDate || new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000),
    isPaused: false,
  };
}

/**
 * Get the next dunning action for an account
 */
export function getNextDunningAction(schedule: DunningSchedule): ScheduledDunningAction | null {
  if (schedule.isPaused) {
    return null;
  }

  const now = new Date();
  return schedule.actions.find(
    action => action.status === 'PENDING' && new Date(action.scheduledDate) <= now
  ) || null;
}

/**
 * Get all pending dunning actions for an account
 */
export function getPendingDunningActions(schedule: DunningSchedule): ScheduledDunningAction[] {
  if (schedule.isPaused) {
    return [];
  }

  const now = new Date();
  return schedule.actions.filter(
    action => action.status === 'PENDING' && new Date(action.scheduledDate) <= now
  );
}

/**
 * Execute a dunning action (returns result, actual execution handled by calling service)
 */
export function executeDunningAction(
  accountId: string,
  action: ScheduledDunningAction
): DunningExecutionResult {
  return {
    accountId,
    action: action.action,
    success: true,
    message: `${action.description} - ${action.template} sent via ${action.channel}`,
    channel: action.channel,
    timestamp: new Date(),
  };
}

/**
 * Get dunning sequence for an account type
 */
export function getDunningSequence(accountType: AccountType): DunningAction[] {
  return DUNNING_SEQUENCES[accountType];
}

/**
 * Get all dunning sequences
 */
export function getAllDunningSequences(): Record<AccountType, DunningAction[]> {
  return DUNNING_SEQUENCES;
}

/**
 * Calculate dunning metrics for a schedule
 */
export function calculateDunningMetrics(schedule: DunningSchedule): {
  totalActions: number;
  completedActions: number;
  pendingActions: number;
  skippedActions: number;
  failedActions: number;
  completionPercentage: number;
  nextActionInDays: number | null;
} {
  const completed = schedule.actions.filter(a => a.status === 'COMPLETED').length;
  const pending = schedule.actions.filter(a => a.status === 'PENDING').length;
  const skipped = schedule.actions.filter(a => a.status === 'SKIPPED').length;
  const failed = schedule.actions.filter(a => a.status === 'FAILED').length;
  const total = schedule.actions.length;

  let nextActionInDays: number | null = null;
  if (schedule.nextActionDate && !schedule.isPaused) {
    const diff = schedule.nextActionDate.getTime() - Date.now();
    nextActionInDays = Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
  }

  return {
    totalActions: total,
    completedActions: completed,
    pendingActions: pending,
    skippedActions: skipped,
    failedActions: failed,
    completionPercentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    nextActionInDays,
  };
}

/**
 * Adjust dunning intensity based on collection state
 */
export function adjustDunningIntensity(
  schedule: DunningSchedule,
  targetIntensity: number
): DunningSchedule {
  const currentIntensity = getDunningIntensity(schedule.currentState);
  const intensityRatio = targetIntensity / Math.max(1, currentIntensity);

  // Adjust action timing based on intensity
  const adjustedActions = schedule.actions.map(action => {
    if (action.status !== 'PENDING') {
      return action;
    }

    // Higher intensity = faster sequence (shorter intervals)
    const dueDate = new Date(schedule.nextActionDate.getTime() - schedule.daysPastDue * 24 * 60 * 60 * 1000);
    const originalDay = action.day;
    const adjustedDay = Math.round(originalDay / intensityRatio);
    const newScheduledDate = new Date(dueDate.getTime() + adjustedDay * 24 * 60 * 60 * 1000);

    return {
      ...action,
      scheduledDate: newScheduledDate,
    };
  });

  return {
    ...schedule,
    actions: adjustedActions,
  };
}

/**
 * Pause dunning for an account
 */
export function pauseDunning(
  schedule: DunningSchedule,
  reason: string,
  pauseDays: number
): DunningSchedule {
  const pauseEndDate = new Date();
  pauseEndDate.setDate(pauseEndDate.getDate() + pauseDays);

  return {
    ...schedule,
    isPaused: true,
    pauseReason: reason,
    pauseEndDate,
  };
}

/**
 * Resume dunning for an account
 */
export function resumeDunning(schedule: DunningSchedule): DunningSchedule {
  return {
    ...schedule,
    isPaused: false,
    pauseReason: undefined,
    pauseEndDate: undefined,
  };
}
