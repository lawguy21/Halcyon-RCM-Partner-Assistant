/**
 * Collections Management Module
 *
 * Provides state machine, dunning automation, and collection scoring
 * for managing accounts receivable collections.
 */

// ============================================================================
// COLLECTION STATE MACHINE
// ============================================================================

export {
  // Types
  type CollectionState,
  type CollectionAction,
  type PaymentActivity,
  type StateTransition,
  type StateConfig,
  type StateTransitionResult,

  // State configurations
  STATE_CONFIGS,
  STATE_TRANSITIONS,

  // State machine functions
  getStateConfig,
  getAllowedTransitions,
  isTransitionAllowed,
  getNextState,
  getAllowedActions,
  isActionAllowed,
  getAutoActions,
  getDunningIntensity,
  canReportToCredit,
  canSendToAgency,
  canWriteOff,
  validateTransition,
} from './collection-states.js';

// ============================================================================
// DUNNING ENGINE
// ============================================================================

export {
  // Types
  type DunningChannel,
  type AccountType,
  type DunningAction,
  type DunningSchedule,
  type ScheduledDunningAction,
  type DunningSkipCondition,
  type DunningAccountInput,
  type DunningExecutionResult,

  // Dunning functions
  shouldSkipDunning,
  generateDunningPlan,
  getNextDunningAction,
  getPendingDunningActions,
  executeDunningAction,
  getDunningSequence,
  getAllDunningSequences,
  calculateDunningMetrics,
  adjustDunningIntensity,
  pauseDunning,
  resumeDunning,
} from './dunning-engine.js';

// ============================================================================
// COLLECTION SCORING
// ============================================================================

export {
  // Types
  type PaymentHistoryRating,
  type InsuranceStatus,
  type CollectionStrategy,
  type CollectionScoringInput,
  type CollectionScoreResult,
  type ScoreBreakdown,
  type PrioritizedAccount,

  // Scoring functions
  calculateCollectionScore,
  recommendStrategy,
  prioritizeAccounts,
  getAccountsByStrategy,
  calculatePortfolioMetrics,
} from './collection-scoring.js';
