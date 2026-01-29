/**
 * Collection State Machine
 *
 * Manages the lifecycle of collection accounts through various states,
 * defining valid transitions and state-specific actions for the collections process.
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Collection account states
 */
export type CollectionState =
  | 'CURRENT'
  | 'PAST_DUE_30'
  | 'PAST_DUE_60'
  | 'PAST_DUE_90'
  | 'PAST_DUE_120'
  | 'PRE_COLLECTION'
  | 'COLLECTION_AGENCY'
  | 'BAD_DEBT'
  | 'PAID'
  | 'WRITTEN_OFF';

/**
 * Actions that can be performed on accounts in specific states
 */
export type CollectionAction =
  | 'SEND_STATEMENT'
  | 'SEND_REMINDER'
  | 'MAKE_CALL'
  | 'SEND_DEMAND_LETTER'
  | 'FINAL_NOTICE'
  | 'SEND_TO_AGENCY'
  | 'RECALL_FROM_AGENCY'
  | 'WRITE_OFF'
  | 'APPLY_PAYMENT'
  | 'SET_UP_PAYMENT_PLAN'
  | 'RECORD_PROMISE_TO_PAY'
  | 'ESCALATE'
  | 'CLOSE_ACCOUNT';

/**
 * Payment activity types for state transitions
 */
export type PaymentActivity =
  | 'FULL_PAYMENT'
  | 'PARTIAL_PAYMENT'
  | 'PROMISE_TO_PAY'
  | 'PAYMENT_PLAN_STARTED'
  | 'PAYMENT_PLAN_DEFAULT'
  | 'NO_ACTIVITY'
  | 'RETURNED_PAYMENT'
  | 'DISPUTE';

/**
 * State transition rule
 */
export interface StateTransition {
  /** Source state */
  from: CollectionState;
  /** Target state */
  to: CollectionState;
  /** Minimum days in current state before transition */
  minDaysInState?: number;
  /** Payment activity that triggers this transition */
  paymentActivity?: PaymentActivity;
  /** Whether this transition requires manual approval */
  requiresApproval?: boolean;
  /** Description of the transition */
  description: string;
}

/**
 * State configuration with allowed actions
 */
export interface StateConfig {
  /** State name */
  state: CollectionState;
  /** Display name */
  displayName: string;
  /** Description */
  description: string;
  /** Actions allowed in this state */
  allowedActions: CollectionAction[];
  /** Automatic actions to perform when entering this state */
  autoActions: CollectionAction[];
  /** Dunning intensity level (1-10) */
  dunningIntensity: number;
  /** Whether balance can be reported to credit bureaus */
  canReportToCredit: boolean;
  /** Whether account can be sent to external collection */
  canSendToAgency: boolean;
  /** Whether account can be written off */
  canWriteOff: boolean;
}

/**
 * Result of state transition calculation
 */
export interface StateTransitionResult {
  /** Recommended next state */
  nextState: CollectionState;
  /** Whether transition is recommended */
  shouldTransition: boolean;
  /** Reason for recommendation */
  reason: string;
  /** Days until auto-transition (if applicable) */
  daysUntilAutoTransition?: number;
  /** Recommended actions */
  recommendedActions: CollectionAction[];
}

// ============================================================================
// STATE CONFIGURATIONS
// ============================================================================

export const STATE_CONFIGS: Record<CollectionState, StateConfig> = {
  CURRENT: {
    state: 'CURRENT',
    displayName: 'Current',
    description: 'Account is current with no overdue balance',
    allowedActions: ['SEND_STATEMENT', 'APPLY_PAYMENT', 'SET_UP_PAYMENT_PLAN'],
    autoActions: [],
    dunningIntensity: 0,
    canReportToCredit: false,
    canSendToAgency: false,
    canWriteOff: false,
  },
  PAST_DUE_30: {
    state: 'PAST_DUE_30',
    displayName: '30 Days Past Due',
    description: 'Account is 1-30 days past due',
    allowedActions: ['SEND_STATEMENT', 'SEND_REMINDER', 'APPLY_PAYMENT', 'SET_UP_PAYMENT_PLAN', 'RECORD_PROMISE_TO_PAY'],
    autoActions: ['SEND_STATEMENT'],
    dunningIntensity: 2,
    canReportToCredit: false,
    canSendToAgency: false,
    canWriteOff: false,
  },
  PAST_DUE_60: {
    state: 'PAST_DUE_60',
    displayName: '60 Days Past Due',
    description: 'Account is 31-60 days past due',
    allowedActions: ['SEND_STATEMENT', 'SEND_REMINDER', 'MAKE_CALL', 'APPLY_PAYMENT', 'SET_UP_PAYMENT_PLAN', 'RECORD_PROMISE_TO_PAY'],
    autoActions: ['SEND_STATEMENT', 'SEND_REMINDER'],
    dunningIntensity: 4,
    canReportToCredit: false,
    canSendToAgency: false,
    canWriteOff: false,
  },
  PAST_DUE_90: {
    state: 'PAST_DUE_90',
    displayName: '90 Days Past Due',
    description: 'Account is 61-90 days past due',
    allowedActions: ['SEND_STATEMENT', 'SEND_REMINDER', 'MAKE_CALL', 'SEND_DEMAND_LETTER', 'APPLY_PAYMENT', 'SET_UP_PAYMENT_PLAN', 'RECORD_PROMISE_TO_PAY', 'ESCALATE'],
    autoActions: ['SEND_DEMAND_LETTER', 'MAKE_CALL'],
    dunningIntensity: 6,
    canReportToCredit: true,
    canSendToAgency: false,
    canWriteOff: false,
  },
  PAST_DUE_120: {
    state: 'PAST_DUE_120',
    displayName: '120 Days Past Due',
    description: 'Account is 91-120 days past due',
    allowedActions: ['SEND_STATEMENT', 'MAKE_CALL', 'SEND_DEMAND_LETTER', 'FINAL_NOTICE', 'APPLY_PAYMENT', 'SET_UP_PAYMENT_PLAN', 'RECORD_PROMISE_TO_PAY', 'ESCALATE'],
    autoActions: ['FINAL_NOTICE', 'MAKE_CALL'],
    dunningIntensity: 8,
    canReportToCredit: true,
    canSendToAgency: true,
    canWriteOff: false,
  },
  PRE_COLLECTION: {
    state: 'PRE_COLLECTION',
    displayName: 'Pre-Collection',
    description: 'Account is being prepared for external collection',
    allowedActions: ['MAKE_CALL', 'FINAL_NOTICE', 'SEND_TO_AGENCY', 'APPLY_PAYMENT', 'SET_UP_PAYMENT_PLAN', 'RECORD_PROMISE_TO_PAY', 'WRITE_OFF'],
    autoActions: ['FINAL_NOTICE'],
    dunningIntensity: 9,
    canReportToCredit: true,
    canSendToAgency: true,
    canWriteOff: true,
  },
  COLLECTION_AGENCY: {
    state: 'COLLECTION_AGENCY',
    displayName: 'At Collection Agency',
    description: 'Account has been assigned to external collection agency',
    allowedActions: ['RECALL_FROM_AGENCY', 'APPLY_PAYMENT', 'WRITE_OFF'],
    autoActions: [],
    dunningIntensity: 10,
    canReportToCredit: true,
    canSendToAgency: false,
    canWriteOff: true,
  },
  BAD_DEBT: {
    state: 'BAD_DEBT',
    displayName: 'Bad Debt',
    description: 'Account classified as bad debt',
    allowedActions: ['APPLY_PAYMENT', 'WRITE_OFF', 'SEND_TO_AGENCY'],
    autoActions: [],
    dunningIntensity: 10,
    canReportToCredit: true,
    canSendToAgency: true,
    canWriteOff: true,
  },
  PAID: {
    state: 'PAID',
    displayName: 'Paid in Full',
    description: 'Account has been paid in full',
    allowedActions: ['CLOSE_ACCOUNT'],
    autoActions: ['CLOSE_ACCOUNT'],
    dunningIntensity: 0,
    canReportToCredit: false,
    canSendToAgency: false,
    canWriteOff: false,
  },
  WRITTEN_OFF: {
    state: 'WRITTEN_OFF',
    displayName: 'Written Off',
    description: 'Account has been written off as uncollectible',
    allowedActions: ['APPLY_PAYMENT'],
    autoActions: [],
    dunningIntensity: 0,
    canReportToCredit: false,
    canSendToAgency: false,
    canWriteOff: false,
  },
};

// ============================================================================
// TRANSITION RULES
// ============================================================================

export const STATE_TRANSITIONS: StateTransition[] = [
  // Current to Past Due transitions
  {
    from: 'CURRENT',
    to: 'PAST_DUE_30',
    minDaysInState: 30,
    paymentActivity: 'NO_ACTIVITY',
    description: 'Account becomes 30 days past due with no payment activity',
  },

  // Past Due progression
  {
    from: 'PAST_DUE_30',
    to: 'PAST_DUE_60',
    minDaysInState: 30,
    paymentActivity: 'NO_ACTIVITY',
    description: 'Account ages to 60 days past due',
  },
  {
    from: 'PAST_DUE_60',
    to: 'PAST_DUE_90',
    minDaysInState: 30,
    paymentActivity: 'NO_ACTIVITY',
    description: 'Account ages to 90 days past due',
  },
  {
    from: 'PAST_DUE_90',
    to: 'PAST_DUE_120',
    minDaysInState: 30,
    paymentActivity: 'NO_ACTIVITY',
    description: 'Account ages to 120 days past due',
  },
  {
    from: 'PAST_DUE_120',
    to: 'PRE_COLLECTION',
    minDaysInState: 30,
    paymentActivity: 'NO_ACTIVITY',
    description: 'Account moves to pre-collection after 120+ days',
  },

  // Pre-collection to agency
  {
    from: 'PRE_COLLECTION',
    to: 'COLLECTION_AGENCY',
    minDaysInState: 14,
    paymentActivity: 'NO_ACTIVITY',
    requiresApproval: true,
    description: 'Account sent to collection agency after final notice period',
  },

  // Agency to bad debt
  {
    from: 'COLLECTION_AGENCY',
    to: 'BAD_DEBT',
    minDaysInState: 180,
    paymentActivity: 'NO_ACTIVITY',
    requiresApproval: true,
    description: 'Uncollected agency account moves to bad debt',
  },

  // Payment transitions (from any past due state to paid)
  {
    from: 'PAST_DUE_30',
    to: 'PAID',
    paymentActivity: 'FULL_PAYMENT',
    description: 'Full payment received',
  },
  {
    from: 'PAST_DUE_60',
    to: 'PAID',
    paymentActivity: 'FULL_PAYMENT',
    description: 'Full payment received',
  },
  {
    from: 'PAST_DUE_90',
    to: 'PAID',
    paymentActivity: 'FULL_PAYMENT',
    description: 'Full payment received',
  },
  {
    from: 'PAST_DUE_120',
    to: 'PAID',
    paymentActivity: 'FULL_PAYMENT',
    description: 'Full payment received',
  },
  {
    from: 'PRE_COLLECTION',
    to: 'PAID',
    paymentActivity: 'FULL_PAYMENT',
    description: 'Full payment received',
  },
  {
    from: 'COLLECTION_AGENCY',
    to: 'PAID',
    paymentActivity: 'FULL_PAYMENT',
    description: 'Full payment received from agency',
  },
  {
    from: 'BAD_DEBT',
    to: 'PAID',
    paymentActivity: 'FULL_PAYMENT',
    description: 'Unexpected full payment on bad debt account',
  },

  // Partial payment transitions (reset to earlier state)
  {
    from: 'PAST_DUE_60',
    to: 'PAST_DUE_30',
    paymentActivity: 'PARTIAL_PAYMENT',
    description: 'Partial payment resets aging clock',
  },
  {
    from: 'PAST_DUE_90',
    to: 'PAST_DUE_60',
    paymentActivity: 'PARTIAL_PAYMENT',
    description: 'Partial payment resets aging clock',
  },
  {
    from: 'PAST_DUE_120',
    to: 'PAST_DUE_90',
    paymentActivity: 'PARTIAL_PAYMENT',
    description: 'Partial payment resets aging clock',
  },
  {
    from: 'PRE_COLLECTION',
    to: 'PAST_DUE_120',
    paymentActivity: 'PARTIAL_PAYMENT',
    description: 'Partial payment moves back from pre-collection',
  },

  // Payment plan transitions
  {
    from: 'PAST_DUE_30',
    to: 'CURRENT',
    paymentActivity: 'PAYMENT_PLAN_STARTED',
    description: 'Payment plan established',
  },
  {
    from: 'PAST_DUE_60',
    to: 'CURRENT',
    paymentActivity: 'PAYMENT_PLAN_STARTED',
    description: 'Payment plan established',
  },
  {
    from: 'PAST_DUE_90',
    to: 'CURRENT',
    paymentActivity: 'PAYMENT_PLAN_STARTED',
    description: 'Payment plan established',
  },
  {
    from: 'PAST_DUE_120',
    to: 'PAST_DUE_30',
    paymentActivity: 'PAYMENT_PLAN_STARTED',
    description: 'Payment plan established - reduced aging',
  },
  {
    from: 'PRE_COLLECTION',
    to: 'PAST_DUE_60',
    paymentActivity: 'PAYMENT_PLAN_STARTED',
    description: 'Payment plan established - moves back from pre-collection',
  },

  // Write-off transitions
  {
    from: 'PRE_COLLECTION',
    to: 'WRITTEN_OFF',
    requiresApproval: true,
    description: 'Account written off as uncollectible',
  },
  {
    from: 'COLLECTION_AGENCY',
    to: 'WRITTEN_OFF',
    requiresApproval: true,
    description: 'Agency account written off',
  },
  {
    from: 'BAD_DEBT',
    to: 'WRITTEN_OFF',
    requiresApproval: true,
    description: 'Bad debt written off',
  },

  // Recall from agency
  {
    from: 'COLLECTION_AGENCY',
    to: 'PRE_COLLECTION',
    requiresApproval: true,
    description: 'Account recalled from collection agency',
  },
];

// ============================================================================
// STATE MACHINE FUNCTIONS
// ============================================================================

/**
 * Get the state configuration for a given state
 */
export function getStateConfig(state: CollectionState): StateConfig {
  return STATE_CONFIGS[state];
}

/**
 * Get all allowed transitions from a given state
 */
export function getAllowedTransitions(currentState: CollectionState): StateTransition[] {
  return STATE_TRANSITIONS.filter(t => t.from === currentState);
}

/**
 * Check if a specific transition is allowed
 */
export function isTransitionAllowed(
  from: CollectionState,
  to: CollectionState,
  paymentActivity?: PaymentActivity
): boolean {
  return STATE_TRANSITIONS.some(t =>
    t.from === from &&
    t.to === to &&
    (paymentActivity === undefined || t.paymentActivity === undefined || t.paymentActivity === paymentActivity)
  );
}

/**
 * Get the next recommended state based on current state, account age, and payment activity
 */
export function getNextState(
  currentState: CollectionState,
  accountAgeDays: number,
  paymentActivity: PaymentActivity,
  currentBalance: number
): StateTransitionResult {
  // If balance is zero or payment in full, go to PAID
  if (currentBalance <= 0 || paymentActivity === 'FULL_PAYMENT') {
    return {
      nextState: 'PAID',
      shouldTransition: currentState !== 'PAID',
      reason: 'Account paid in full',
      recommendedActions: ['CLOSE_ACCOUNT'],
    };
  }

  // Handle payment plan
  if (paymentActivity === 'PAYMENT_PLAN_STARTED') {
    const planTransition = STATE_TRANSITIONS.find(
      t => t.from === currentState && t.paymentActivity === 'PAYMENT_PLAN_STARTED'
    );
    if (planTransition) {
      return {
        nextState: planTransition.to,
        shouldTransition: true,
        reason: planTransition.description,
        recommendedActions: ['SEND_STATEMENT'],
      };
    }
  }

  // Handle partial payment
  if (paymentActivity === 'PARTIAL_PAYMENT') {
    const partialTransition = STATE_TRANSITIONS.find(
      t => t.from === currentState && t.paymentActivity === 'PARTIAL_PAYMENT'
    );
    if (partialTransition) {
      return {
        nextState: partialTransition.to,
        shouldTransition: true,
        reason: partialTransition.description,
        recommendedActions: ['SEND_STATEMENT'],
      };
    }
  }

  // Calculate state based on aging
  let recommendedState: CollectionState;
  let reason: string;

  if (accountAgeDays <= 0) {
    recommendedState = 'CURRENT';
    reason = 'Account is current';
  } else if (accountAgeDays <= 30) {
    recommendedState = 'PAST_DUE_30';
    reason = 'Account is 1-30 days past due';
  } else if (accountAgeDays <= 60) {
    recommendedState = 'PAST_DUE_60';
    reason = 'Account is 31-60 days past due';
  } else if (accountAgeDays <= 90) {
    recommendedState = 'PAST_DUE_90';
    reason = 'Account is 61-90 days past due';
  } else if (accountAgeDays <= 120) {
    recommendedState = 'PAST_DUE_120';
    reason = 'Account is 91-120 days past due';
  } else if (accountAgeDays <= 150) {
    recommendedState = 'PRE_COLLECTION';
    reason = 'Account is over 120 days past due - pre-collection';
  } else if (currentState === 'COLLECTION_AGENCY') {
    if (accountAgeDays > 330) {
      recommendedState = 'BAD_DEBT';
      reason = 'Account at agency over 180 days - classify as bad debt';
    } else {
      recommendedState = 'COLLECTION_AGENCY';
      reason = 'Account remains at collection agency';
    }
  } else if (currentState === 'PRE_COLLECTION' && accountAgeDays > 164) {
    recommendedState = 'COLLECTION_AGENCY';
    reason = 'Pre-collection period expired - send to agency';
  } else {
    recommendedState = currentState;
    reason = 'No state change required';
  }

  // Check if transition is allowed
  const isAllowed = currentState === recommendedState || isTransitionAllowed(currentState, recommendedState, paymentActivity);

  // Get recommended actions for the target state
  const stateConfig = STATE_CONFIGS[recommendedState];
  const recommendedActions = stateConfig.autoActions.length > 0 ? stateConfig.autoActions : stateConfig.allowedActions.slice(0, 2);

  // Calculate days until auto-transition
  let daysUntilAutoTransition: number | undefined;
  if (recommendedState !== currentState && isAllowed) {
    const transition = STATE_TRANSITIONS.find(t => t.from === currentState && t.to === recommendedState);
    if (transition?.minDaysInState) {
      daysUntilAutoTransition = Math.max(0, transition.minDaysInState - (accountAgeDays % 30));
    }
  }

  return {
    nextState: isAllowed ? recommendedState : currentState,
    shouldTransition: isAllowed && recommendedState !== currentState,
    reason,
    daysUntilAutoTransition,
    recommendedActions,
  };
}

/**
 * Get all actions allowed for a specific state
 */
export function getAllowedActions(state: CollectionState): CollectionAction[] {
  return STATE_CONFIGS[state].allowedActions;
}

/**
 * Check if an action is allowed in the given state
 */
export function isActionAllowed(state: CollectionState, action: CollectionAction): boolean {
  return STATE_CONFIGS[state].allowedActions.includes(action);
}

/**
 * Get automatic actions to perform when entering a state
 */
export function getAutoActions(state: CollectionState): CollectionAction[] {
  return STATE_CONFIGS[state].autoActions;
}

/**
 * Get the dunning intensity level for a state (1-10)
 */
export function getDunningIntensity(state: CollectionState): number {
  return STATE_CONFIGS[state].dunningIntensity;
}

/**
 * Check if account in this state can be reported to credit bureaus
 */
export function canReportToCredit(state: CollectionState): boolean {
  return STATE_CONFIGS[state].canReportToCredit;
}

/**
 * Check if account in this state can be sent to collection agency
 */
export function canSendToAgency(state: CollectionState): boolean {
  return STATE_CONFIGS[state].canSendToAgency;
}

/**
 * Check if account in this state can be written off
 */
export function canWriteOff(state: CollectionState): boolean {
  return STATE_CONFIGS[state].canWriteOff;
}

/**
 * Validate a state transition
 */
export function validateTransition(
  from: CollectionState,
  to: CollectionState,
  accountAgeDays?: number,
  paymentActivity?: PaymentActivity
): { valid: boolean; reason: string; requiresApproval: boolean } {
  const transition = STATE_TRANSITIONS.find(
    t => t.from === from && t.to === to &&
    (paymentActivity === undefined || t.paymentActivity === undefined || t.paymentActivity === paymentActivity)
  );

  if (!transition) {
    return {
      valid: false,
      reason: `Transition from ${from} to ${to} is not allowed`,
      requiresApproval: false,
    };
  }

  if (transition.minDaysInState && accountAgeDays !== undefined && accountAgeDays < transition.minDaysInState) {
    return {
      valid: false,
      reason: `Account must be in ${from} state for at least ${transition.minDaysInState} days`,
      requiresApproval: false,
    };
  }

  return {
    valid: true,
    reason: transition.description,
    requiresApproval: transition.requiresApproval ?? false,
  };
}
