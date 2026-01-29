/**
 * Collection Scoring Engine
 *
 * Calculates collection likelihood scores and prioritizes accounts
 * based on various factors to optimize collection efforts.
 */

import { CollectionState, getDunningIntensity } from './collection-states.js';
import { AccountType } from './dunning-engine.js';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Payment history classification
 */
export type PaymentHistoryRating = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'NO_HISTORY';

/**
 * Insurance status classification
 */
export type InsuranceStatus = 'INSURED' | 'UNDERINSURED' | 'UNINSURED' | 'MEDICAID' | 'MEDICARE' | 'DUAL_ELIGIBLE';

/**
 * Recommended collection strategy
 */
export type CollectionStrategy =
  | 'STANDARD_DUNNING'
  | 'ACCELERATED_DUNNING'
  | 'CALL_CAMPAIGN'
  | 'PAYMENT_PLAN_OFFER'
  | 'CHARITY_SCREENING'
  | 'LEGAL_ACTION'
  | 'AGENCY_PLACEMENT'
  | 'WRITE_OFF'
  | 'HOLD_FOR_REVIEW';

/**
 * Account input for scoring
 */
export interface CollectionScoringInput {
  /** Account ID */
  accountId: string;
  /** Current balance */
  balance: number;
  /** Original charge amount */
  originalAmount: number;
  /** Account age in days (days since first charge) */
  accountAgeDays: number;
  /** Days past due */
  daysPastDue: number;
  /** Current collection state */
  collectionState: CollectionState;
  /** Account type */
  accountType: AccountType;
  /** Insurance status */
  insuranceStatus: InsuranceStatus;
  /** Payment history rating */
  paymentHistory: PaymentHistoryRating;
  /** Number of previous payments */
  previousPaymentCount: number;
  /** Total amount previously paid */
  previousPaymentTotal: number;
  /** Number of broken promises to pay */
  brokenPromiseCount: number;
  /** Number of returned payments (NSF) */
  returnedPaymentCount: number;
  /** Patient age (if known) */
  patientAge?: number;
  /** Patient state of residence */
  patientState?: string;
  /** ZIP code for demographic analysis */
  zipCode?: string;
  /** Whether patient has valid phone */
  hasValidPhone: boolean;
  /** Whether patient has valid email */
  hasValidEmail: boolean;
  /** Whether patient has responded to previous contact */
  hasRespondedToContact: boolean;
  /** Number of contact attempts */
  contactAttemptCount: number;
  /** Whether there's an active dispute */
  hasActiveDispute: boolean;
  /** Whether patient is on hardship */
  isOnHardship: boolean;
  /** Credit score range if available */
  creditScoreRange?: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'UNKNOWN';
}

/**
 * Collection score result
 */
export interface CollectionScoreResult {
  /** Account ID */
  accountId: string;
  /** Overall collection score (0-100) */
  score: number;
  /** Score classification */
  classification: 'HIGH' | 'MEDIUM' | 'LOW' | 'VERY_LOW';
  /** Estimated probability of collection (0-100%) */
  collectionProbability: number;
  /** Expected recovery amount */
  expectedRecovery: number;
  /** Recommended strategy */
  recommendedStrategy: CollectionStrategy;
  /** Score breakdown by factor */
  breakdown: ScoreBreakdown;
  /** Risk factors identified */
  riskFactors: string[];
  /** Positive factors identified */
  positiveFactors: string[];
  /** Recommended actions */
  recommendedActions: string[];
}

/**
 * Score breakdown by factor
 */
export interface ScoreBreakdown {
  /** Balance/amount factor (0-20) */
  balanceFactor: number;
  /** Age factor (0-20) */
  ageFactor: number;
  /** Payment history factor (0-20) */
  paymentHistoryFactor: number;
  /** Insurance factor (0-15) */
  insuranceFactor: number;
  /** Contact factor (0-15) */
  contactFactor: number;
  /** Demographic factor (0-10) */
  demographicFactor: number;
}

/**
 * Prioritized account result
 */
export interface PrioritizedAccount {
  /** Account ID */
  accountId: string;
  /** Collection score */
  score: number;
  /** Priority rank (1 = highest priority) */
  rank: number;
  /** Expected recovery amount */
  expectedRecovery: number;
  /** Recommended strategy */
  recommendedStrategy: CollectionStrategy;
  /** Balance */
  balance: number;
  /** Days past due */
  daysPastDue: number;
}

// ============================================================================
// SCORING WEIGHTS
// ============================================================================

const SCORE_WEIGHTS = {
  BALANCE: 20,
  AGE: 20,
  PAYMENT_HISTORY: 20,
  INSURANCE: 15,
  CONTACT: 15,
  DEMOGRAPHIC: 10,
};

// ============================================================================
// SCORING FUNCTIONS
// ============================================================================

/**
 * Calculate balance factor (0-20)
 * Higher balances = higher scores (more incentive to collect)
 * But extremely low balances get penalized
 */
function calculateBalanceFactor(balance: number, originalAmount: number): number {
  // Very low balance - not worth collecting
  if (balance < 25) return 2;
  if (balance < 50) return 5;
  if (balance < 100) return 8;

  // Calculate collection rate (what % of original remains)
  const collectionRate = (balance / originalAmount) * 100;

  // Higher remaining balance = more to collect
  if (collectionRate >= 90) return 18;
  if (collectionRate >= 75) return 16;
  if (collectionRate >= 50) return 14;
  if (collectionRate >= 25) return 12;

  // Sweet spot - moderate balance with payment history
  if (balance >= 500 && balance <= 5000) return 20;
  if (balance >= 100 && balance < 500) return 15;
  if (balance > 5000 && balance <= 10000) return 17;

  // Very high balance - harder to collect
  if (balance > 10000) return 14;

  return 10;
}

/**
 * Calculate age factor (0-20)
 * Newer accounts = higher likelihood of collection
 */
function calculateAgeFactor(daysPastDue: number, accountAgeDays: number): number {
  // Current or barely past due
  if (daysPastDue <= 0) return 20;
  if (daysPastDue <= 30) return 18;
  if (daysPastDue <= 60) return 16;
  if (daysPastDue <= 90) return 14;
  if (daysPastDue <= 120) return 12;
  if (daysPastDue <= 180) return 8;
  if (daysPastDue <= 365) return 5;

  // Very old accounts
  return 2;
}

/**
 * Calculate payment history factor (0-20)
 */
function calculatePaymentHistoryFactor(
  paymentHistory: PaymentHistoryRating,
  previousPaymentCount: number,
  previousPaymentTotal: number,
  brokenPromiseCount: number,
  returnedPaymentCount: number,
  originalAmount: number
): number {
  let score = 0;

  // Base score from rating
  switch (paymentHistory) {
    case 'EXCELLENT': score = 16; break;
    case 'GOOD': score = 12; break;
    case 'FAIR': score = 8; break;
    case 'POOR': score = 4; break;
    case 'NO_HISTORY': score = 10; break; // Neutral - unknown
  }

  // Bonus for payment activity
  if (previousPaymentCount > 0) {
    score += Math.min(2, previousPaymentCount * 0.5);
  }

  // Bonus if paid significant portion
  const paidPercentage = (previousPaymentTotal / originalAmount) * 100;
  if (paidPercentage >= 50) score += 2;
  else if (paidPercentage >= 25) score += 1;

  // Penalties for negative indicators
  score -= brokenPromiseCount * 2;
  score -= returnedPaymentCount * 3;

  return Math.max(0, Math.min(20, score));
}

/**
 * Calculate insurance factor (0-15)
 */
function calculateInsuranceFactor(insuranceStatus: InsuranceStatus): number {
  switch (insuranceStatus) {
    case 'INSURED': return 15;
    case 'MEDICARE': return 14;
    case 'MEDICAID': return 12;
    case 'DUAL_ELIGIBLE': return 13;
    case 'UNDERINSURED': return 8;
    case 'UNINSURED': return 4;
    default: return 5;
  }
}

/**
 * Calculate contact factor (0-15)
 */
function calculateContactFactor(
  hasValidPhone: boolean,
  hasValidEmail: boolean,
  hasRespondedToContact: boolean,
  contactAttemptCount: number
): number {
  let score = 0;

  // Contact methods available
  if (hasValidPhone) score += 4;
  if (hasValidEmail) score += 3;

  // Response to previous contact
  if (hasRespondedToContact) {
    score += 5;
  } else if (contactAttemptCount > 5) {
    score -= 2; // Many attempts with no response
  }

  // Moderate contact attempts indicate working
  if (contactAttemptCount >= 1 && contactAttemptCount <= 3) {
    score += 2;
  }

  return Math.max(0, Math.min(15, score));
}

/**
 * Calculate demographic factor (0-10)
 * Uses available demographic data to estimate collection likelihood
 */
function calculateDemographicFactor(
  patientAge?: number,
  creditScoreRange?: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'UNKNOWN',
  zipCode?: string
): number {
  let score = 5; // Base neutral score

  // Age factor (if available)
  if (patientAge !== undefined) {
    if (patientAge >= 25 && patientAge <= 65) {
      score += 2; // Working age
    } else if (patientAge > 65) {
      score += 1; // Medicare eligible, may have fixed income
    }
  }

  // Credit score factor
  switch (creditScoreRange) {
    case 'EXCELLENT': score += 3; break;
    case 'GOOD': score += 2; break;
    case 'FAIR': score += 1; break;
    case 'POOR': score -= 2; break;
    // UNKNOWN - no change
  }

  return Math.max(0, Math.min(10, score));
}

/**
 * Calculate overall collection score
 */
export function calculateCollectionScore(input: CollectionScoringInput): CollectionScoreResult {
  // Calculate individual factors
  const balanceFactor = calculateBalanceFactor(input.balance, input.originalAmount);
  const ageFactor = calculateAgeFactor(input.daysPastDue, input.accountAgeDays);
  const paymentHistoryFactor = calculatePaymentHistoryFactor(
    input.paymentHistory,
    input.previousPaymentCount,
    input.previousPaymentTotal,
    input.brokenPromiseCount,
    input.returnedPaymentCount,
    input.originalAmount
  );
  const insuranceFactor = calculateInsuranceFactor(input.insuranceStatus);
  const contactFactor = calculateContactFactor(
    input.hasValidPhone,
    input.hasValidEmail,
    input.hasRespondedToContact,
    input.contactAttemptCount
  );
  const demographicFactor = calculateDemographicFactor(
    input.patientAge,
    input.creditScoreRange,
    input.zipCode
  );

  // Calculate total score
  const score = balanceFactor + ageFactor + paymentHistoryFactor +
    insuranceFactor + contactFactor + demographicFactor;

  // Apply penalties
  let adjustedScore = score;
  if (input.hasActiveDispute) adjustedScore -= 15;
  if (input.isOnHardship) adjustedScore -= 20;

  // Ensure score is within bounds
  adjustedScore = Math.max(0, Math.min(100, adjustedScore));

  // Determine classification
  let classification: 'HIGH' | 'MEDIUM' | 'LOW' | 'VERY_LOW';
  if (adjustedScore >= 70) classification = 'HIGH';
  else if (adjustedScore >= 50) classification = 'MEDIUM';
  else if (adjustedScore >= 30) classification = 'LOW';
  else classification = 'VERY_LOW';

  // Calculate collection probability
  const collectionProbability = Math.round(adjustedScore * 0.9); // Score roughly correlates to probability

  // Calculate expected recovery
  const expectedRecovery = Math.round(input.balance * (collectionProbability / 100));

  // Identify risk factors
  const riskFactors: string[] = [];
  if (input.daysPastDue > 120) riskFactors.push('Account significantly past due');
  if (input.brokenPromiseCount > 0) riskFactors.push(`${input.brokenPromiseCount} broken promise(s) to pay`);
  if (input.returnedPaymentCount > 0) riskFactors.push(`${input.returnedPaymentCount} returned payment(s)`);
  if (!input.hasValidPhone && !input.hasValidEmail) riskFactors.push('No valid contact information');
  if (input.hasActiveDispute) riskFactors.push('Active dispute on account');
  if (input.isOnHardship) riskFactors.push('Patient on hardship status');
  if (input.paymentHistory === 'POOR') riskFactors.push('Poor payment history');
  if (input.insuranceStatus === 'UNINSURED') riskFactors.push('Patient is uninsured');

  // Identify positive factors
  const positiveFactors: string[] = [];
  if (input.previousPaymentCount > 0) positiveFactors.push('Previous payment activity');
  if (input.hasRespondedToContact) positiveFactors.push('Patient responsive to contact');
  if (input.paymentHistory === 'EXCELLENT' || input.paymentHistory === 'GOOD') positiveFactors.push('Good payment history');
  if (input.insuranceStatus === 'INSURED') positiveFactors.push('Patient has insurance coverage');
  if (input.daysPastDue <= 30) positiveFactors.push('Recently past due - high collection window');
  if (input.balance >= 500 && input.balance <= 5000) positiveFactors.push('Balance in optimal collection range');

  // Determine recommended strategy
  const recommendedStrategy = recommendStrategy(input, adjustedScore, classification);

  // Generate recommended actions
  const recommendedActions = generateRecommendedActions(input, adjustedScore, recommendedStrategy);

  return {
    accountId: input.accountId,
    score: adjustedScore,
    classification,
    collectionProbability,
    expectedRecovery,
    recommendedStrategy,
    breakdown: {
      balanceFactor,
      ageFactor,
      paymentHistoryFactor,
      insuranceFactor,
      contactFactor,
      demographicFactor,
    },
    riskFactors,
    positiveFactors,
    recommendedActions,
  };
}

/**
 * Recommend a collection strategy based on account characteristics
 */
export function recommendStrategy(
  input: CollectionScoringInput,
  score: number,
  classification: 'HIGH' | 'MEDIUM' | 'LOW' | 'VERY_LOW'
): CollectionStrategy {
  // Special cases first
  if (input.hasActiveDispute) return 'HOLD_FOR_REVIEW';
  if (input.isOnHardship) return 'CHARITY_SCREENING';
  if (input.balance < 25) return 'WRITE_OFF';
  if (input.insuranceStatus === 'UNINSURED' && input.balance > 1000) return 'CHARITY_SCREENING';

  // Based on score and classification
  switch (classification) {
    case 'HIGH':
      if (input.daysPastDue <= 30) return 'STANDARD_DUNNING';
      if (input.hasRespondedToContact) return 'CALL_CAMPAIGN';
      return 'ACCELERATED_DUNNING';

    case 'MEDIUM':
      if (input.previousPaymentCount > 0) return 'PAYMENT_PLAN_OFFER';
      if (input.daysPastDue > 90) return 'CALL_CAMPAIGN';
      return 'STANDARD_DUNNING';

    case 'LOW':
      if (input.daysPastDue > 120 && input.balance > 500) return 'AGENCY_PLACEMENT';
      if (input.balance < 200) return 'PAYMENT_PLAN_OFFER';
      return 'ACCELERATED_DUNNING';

    case 'VERY_LOW':
      if (input.daysPastDue > 180) return 'WRITE_OFF';
      if (input.balance > 1000) return 'AGENCY_PLACEMENT';
      return 'PAYMENT_PLAN_OFFER';
  }
}

/**
 * Generate recommended actions based on strategy
 */
function generateRecommendedActions(
  input: CollectionScoringInput,
  score: number,
  strategy: CollectionStrategy
): string[] {
  const actions: string[] = [];

  switch (strategy) {
    case 'STANDARD_DUNNING':
      actions.push('Continue standard dunning sequence');
      if (!input.hasValidEmail) actions.push('Verify and update email address');
      break;

    case 'ACCELERATED_DUNNING':
      actions.push('Accelerate dunning sequence - reduce intervals');
      actions.push('Increase contact frequency');
      if (input.balance > 500) actions.push('Consider phone outreach');
      break;

    case 'CALL_CAMPAIGN':
      actions.push('Prioritize outbound calling');
      actions.push('Prepare negotiation parameters');
      actions.push('Have payment plan options ready');
      break;

    case 'PAYMENT_PLAN_OFFER':
      actions.push('Offer structured payment plan');
      const suggestedPayment = Math.max(25, Math.round(input.balance / 12));
      actions.push(`Suggest ${suggestedPayment}/month for 12 months`);
      break;

    case 'CHARITY_SCREENING':
      actions.push('Screen for charity care eligibility');
      actions.push('Request financial assistance application');
      actions.push('Hold aggressive collection activity');
      break;

    case 'AGENCY_PLACEMENT':
      actions.push('Prepare for external agency placement');
      actions.push('Ensure all internal collection efforts documented');
      actions.push('Send final demand letter');
      break;

    case 'WRITE_OFF':
      actions.push('Review for write-off approval');
      actions.push('Document collection efforts');
      actions.push('Consider small balance write-off policy');
      break;

    case 'HOLD_FOR_REVIEW':
      actions.push('Hold collection activity');
      actions.push('Review dispute details');
      actions.push('Escalate to supervisor if needed');
      break;

    case 'LEGAL_ACTION':
      actions.push('Review for legal action criteria');
      actions.push('Ensure proper documentation');
      actions.push('Consult with legal team');
      break;
  }

  // General recommendations based on account state
  if (!input.hasValidPhone && !input.hasValidEmail) {
    actions.push('Attempt to verify contact information');
  }

  if (input.brokenPromiseCount > 2) {
    actions.push('Require payment before extending new promise dates');
  }

  return actions;
}

/**
 * Prioritize a list of accounts by collection likelihood
 */
export function prioritizeAccounts(accounts: CollectionScoringInput[]): PrioritizedAccount[] {
  // Score all accounts
  const scoredAccounts = accounts.map(account => ({
    ...calculateCollectionScore(account),
    balance: account.balance,
    daysPastDue: account.daysPastDue,
  }));

  // Sort by expected recovery (descending), then by score (descending)
  scoredAccounts.sort((a, b) => {
    // Primary: expected recovery
    if (b.expectedRecovery !== a.expectedRecovery) {
      return b.expectedRecovery - a.expectedRecovery;
    }
    // Secondary: score
    return b.score - a.score;
  });

  // Map to prioritized accounts with rank
  return scoredAccounts.map((account, index) => ({
    accountId: account.accountId,
    score: account.score,
    rank: index + 1,
    expectedRecovery: account.expectedRecovery,
    recommendedStrategy: account.recommendedStrategy,
    balance: account.balance,
    daysPastDue: account.daysPastDue,
  }));
}

/**
 * Get accounts by strategy recommendation
 */
export function getAccountsByStrategy(
  accounts: CollectionScoringInput[],
  strategy: CollectionStrategy
): CollectionScoreResult[] {
  return accounts
    .map(account => calculateCollectionScore(account))
    .filter(result => result.recommendedStrategy === strategy);
}

/**
 * Calculate aggregate collection metrics for a portfolio
 */
export function calculatePortfolioMetrics(accounts: CollectionScoringInput[]): {
  totalBalance: number;
  totalExpectedRecovery: number;
  averageScore: number;
  highPriorityCount: number;
  mediumPriorityCount: number;
  lowPriorityCount: number;
  strategyDistribution: Record<CollectionStrategy, number>;
} {
  if (accounts.length === 0) {
    return {
      totalBalance: 0,
      totalExpectedRecovery: 0,
      averageScore: 0,
      highPriorityCount: 0,
      mediumPriorityCount: 0,
      lowPriorityCount: 0,
      strategyDistribution: {} as Record<CollectionStrategy, number>,
    };
  }

  const scores = accounts.map(account => calculateCollectionScore(account));

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
  const totalExpectedRecovery = scores.reduce((sum, s) => sum + s.expectedRecovery, 0);
  const averageScore = Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length);

  const highPriorityCount = scores.filter(s => s.classification === 'HIGH').length;
  const mediumPriorityCount = scores.filter(s => s.classification === 'MEDIUM').length;
  const lowPriorityCount = scores.filter(s => s.classification === 'LOW' || s.classification === 'VERY_LOW').length;

  const strategyDistribution: Record<CollectionStrategy, number> = {
    STANDARD_DUNNING: 0,
    ACCELERATED_DUNNING: 0,
    CALL_CAMPAIGN: 0,
    PAYMENT_PLAN_OFFER: 0,
    CHARITY_SCREENING: 0,
    LEGAL_ACTION: 0,
    AGENCY_PLACEMENT: 0,
    WRITE_OFF: 0,
    HOLD_FOR_REVIEW: 0,
  };

  scores.forEach(s => {
    strategyDistribution[s.recommendedStrategy]++;
  });

  return {
    totalBalance,
    totalExpectedRecovery,
    averageScore,
    highPriorityCount,
    mediumPriorityCount,
    lowPriorityCount,
    strategyDistribution,
  };
}
