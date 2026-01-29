/**
 * Collection Predictor
 *
 * Predictive analytics engine for collection likelihood assessment.
 * Predicts payment probability, time to collection, and optimal strategies.
 */

import { CollectionState } from '../collections/collection-states.js';
import {
  InsuranceStatus,
  PaymentHistoryRating,
} from '../collections/collection-scoring.js';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Factors that influence collection prediction
 */
export interface CollectionFactors {
  /** Current balance */
  balance: number;
  /** Original amount */
  originalAmount: number;
  /** Account age in days */
  ageDays: number;
  /** Days past due */
  daysPastDue: number;
  /** Payment history rating */
  paymentHistory: PaymentHistoryRating;
  /** Number of previous payments made */
  previousPaymentCount: number;
  /** Total amount previously paid */
  previousPaymentTotal: number;
  /** Insurance status */
  insurance: InsuranceStatus;
  /** Patient age (optional) */
  patientAge?: number;
  /** Patient ZIP code (for demographic data) */
  zipCode?: string;
  /** Has valid phone contact */
  hasValidPhone: boolean;
  /** Has valid email contact */
  hasValidEmail: boolean;
  /** Has responded to previous contact */
  hasRespondedToContact: boolean;
  /** Number of contact attempts */
  contactAttemptCount: number;
  /** Number of broken promises to pay */
  brokenPromiseCount: number;
  /** Number of returned payments (NSF) */
  returnedPaymentCount: number;
  /** Has active dispute */
  hasActiveDispute: boolean;
  /** Is on hardship program */
  isOnHardship: boolean;
  /** Current collection state */
  collectionState: CollectionState;
}

/**
 * Account input for prediction
 */
export interface AccountForPrediction {
  /** Account ID */
  accountId: string;
  /** Patient ID */
  patientId?: string;
  /** Collection factors */
  factors: CollectionFactors;
  /** Account type */
  accountType?: 'SELF_PAY' | 'INSURANCE' | 'WORKERS_COMP' | 'CHARITY' | 'PAYMENT_PLAN' | 'HARDSHIP';
}

/**
 * Collection prediction result
 */
export interface CollectionPrediction {
  /** Account ID */
  accountId: string;
  /** Collection likelihood score (0-100) */
  likelihoodScore: number;
  /** Likelihood classification */
  likelihoodClass: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW' | 'VERY_LOW';
  /** Probability of full collection (0-100%) */
  fullCollectionProbability: number;
  /** Probability of partial collection (0-100%) */
  partialCollectionProbability: number;
  /** Expected collection amount */
  expectedCollection: number;
  /** Expected collection percentage of balance */
  expectedCollectionPercent: number;
  /** Estimated days to first payment */
  estimatedDaysToPayment: number | null;
  /** Estimated days to full collection */
  estimatedDaysToFullCollection: number | null;
  /** Confidence interval for expected collection */
  confidenceInterval: {
    low: number;
    high: number;
    confidence: number;
  };
  /** Recommended strategy */
  recommendedStrategy: CollectionStrategy;
  /** Alternative strategies to consider */
  alternativeStrategies: CollectionStrategy[];
  /** Key risk factors */
  riskFactors: string[];
  /** Positive indicators */
  positiveIndicators: string[];
  /** Score breakdown */
  scoreBreakdown: CollectionScoreBreakdown;
}

/**
 * Collection strategy
 */
export type CollectionStrategy =
  | 'STANDARD_DUNNING'
  | 'ACCELERATED_DUNNING'
  | 'PHONE_OUTREACH'
  | 'PAYMENT_PLAN'
  | 'SETTLEMENT_OFFER'
  | 'CHARITY_SCREENING'
  | 'AGENCY_PLACEMENT'
  | 'LEGAL_REVIEW'
  | 'WRITE_OFF'
  | 'HOLD';

/**
 * Score breakdown by factor
 */
export interface CollectionScoreBreakdown {
  /** Balance factor (0-20) */
  balanceScore: number;
  /** Age factor (0-20) */
  ageScore: number;
  /** Payment history factor (0-20) */
  paymentHistoryScore: number;
  /** Insurance factor (0-15) */
  insuranceScore: number;
  /** Contactability factor (0-15) */
  contactabilityScore: number;
  /** Demographic factor (0-10) */
  demographicScore: number;
}

/**
 * Account segment/tier
 */
export interface AccountSegment {
  /** Tier name */
  tier: 'PLATINUM' | 'GOLD' | 'SILVER' | 'BRONZE' | 'IRON';
  /** Minimum likelihood score for tier */
  minScore: number;
  /** Maximum likelihood score for tier */
  maxScore: number;
  /** Number of accounts in tier */
  accountCount: number;
  /** Total balance in tier */
  totalBalance: number;
  /** Expected recovery for tier */
  expectedRecovery: number;
  /** Recommended strategy for tier */
  recommendedStrategy: CollectionStrategy;
  /** Account IDs in tier */
  accountIds: string[];
}

/**
 * Segmentation result
 */
export interface SegmentationResult {
  /** Account segments by tier */
  segments: AccountSegment[];
  /** Summary statistics */
  summary: {
    totalAccounts: number;
    totalBalance: number;
    totalExpectedRecovery: number;
    averageLikelihood: number;
    weightedAverageLikelihood: number;
  };
}

// ============================================================================
// SCORING WEIGHTS
// ============================================================================

// Score weight constants for reference
// BALANCE: 20, AGE: 20, PAYMENT_HISTORY: 20, INSURANCE: 15, CONTACTABILITY: 15, DEMOGRAPHIC: 10

// ============================================================================
// STRATEGY PARAMETERS
// ============================================================================

const STRATEGY_CONFIG: Record<CollectionStrategy, {
  minLikelihood: number;
  maxLikelihood: number;
  balanceRange: { min: number; max: number | null };
  description: string;
}> = {
  'STANDARD_DUNNING': {
    minLikelihood: 60,
    maxLikelihood: 100,
    balanceRange: { min: 0, max: null },
    description: 'Continue standard collection sequence',
  },
  'ACCELERATED_DUNNING': {
    minLikelihood: 40,
    maxLikelihood: 70,
    balanceRange: { min: 200, max: null },
    description: 'Accelerate dunning with shorter intervals',
  },
  'PHONE_OUTREACH': {
    minLikelihood: 35,
    maxLikelihood: 75,
    balanceRange: { min: 250, max: null },
    description: 'Prioritize phone contact for engagement',
  },
  'PAYMENT_PLAN': {
    minLikelihood: 25,
    maxLikelihood: 65,
    balanceRange: { min: 100, max: 25000 },
    description: 'Offer structured payment plan',
  },
  'SETTLEMENT_OFFER': {
    minLikelihood: 15,
    maxLikelihood: 45,
    balanceRange: { min: 500, max: null },
    description: 'Consider settlement at reduced amount',
  },
  'CHARITY_SCREENING': {
    minLikelihood: 0,
    maxLikelihood: 35,
    balanceRange: { min: 0, max: null },
    description: 'Screen for charity care eligibility',
  },
  'AGENCY_PLACEMENT': {
    minLikelihood: 10,
    maxLikelihood: 30,
    balanceRange: { min: 250, max: null },
    description: 'Consider external agency placement',
  },
  'LEGAL_REVIEW': {
    minLikelihood: 5,
    maxLikelihood: 25,
    balanceRange: { min: 5000, max: null },
    description: 'Review for potential legal action',
  },
  'WRITE_OFF': {
    minLikelihood: 0,
    maxLikelihood: 15,
    balanceRange: { min: 0, max: 200 },
    description: 'Consider small balance write-off',
  },
  'HOLD': {
    minLikelihood: 0,
    maxLikelihood: 100,
    balanceRange: { min: 0, max: null },
    description: 'Hold collection activity',
  },
};

// ============================================================================
// PREDICTION FUNCTIONS
// ============================================================================

/**
 * Predict collection likelihood for an account
 */
export function predictCollectionLikelihood(account: AccountForPrediction): CollectionPrediction {
  const { factors, accountId } = account;

  // Calculate score breakdown
  const scoreBreakdown = calculateScoreBreakdown(factors);

  // Calculate total score
  const rawScore =
    scoreBreakdown.balanceScore +
    scoreBreakdown.ageScore +
    scoreBreakdown.paymentHistoryScore +
    scoreBreakdown.insuranceScore +
    scoreBreakdown.contactabilityScore +
    scoreBreakdown.demographicScore;

  // Apply penalties
  let likelihoodScore = rawScore;
  if (factors.hasActiveDispute) likelihoodScore -= 20;
  if (factors.isOnHardship) likelihoodScore -= 15;
  if (factors.brokenPromiseCount > 2) likelihoodScore -= 10;
  if (factors.returnedPaymentCount > 0) likelihoodScore -= 5 * factors.returnedPaymentCount;

  // Ensure score is in bounds
  likelihoodScore = Math.max(0, Math.min(100, likelihoodScore));

  // Determine likelihood class
  const likelihoodClass = classifyLikelihood(likelihoodScore);

  // Calculate probabilities
  const fullCollectionProbability = calculateFullCollectionProbability(likelihoodScore, factors);
  const partialCollectionProbability = calculatePartialCollectionProbability(likelihoodScore, factors);

  // Calculate expected collection
  const expectedCollectionPercent = calculateExpectedCollectionPercent(likelihoodScore, fullCollectionProbability, partialCollectionProbability);
  const expectedCollection = Math.round(factors.balance * (expectedCollectionPercent / 100));

  // Calculate confidence interval
  const confidenceInterval = calculateConfidenceInterval(expectedCollection, likelihoodScore, factors);

  // Estimate time to collection
  const estimatedDaysToPayment = estimateDaysToPayment(likelihoodScore, factors);
  const estimatedDaysToFullCollection = estimateDaysToFullCollection(likelihoodScore, factors);

  // Determine strategies
  const recommendedStrategy = determineStrategy(likelihoodScore, factors);
  const alternativeStrategies = getAlternativeStrategies(likelihoodScore, factors);

  // Identify risk factors and positive indicators
  const riskFactors = identifyRiskFactors(factors);
  const positiveIndicators = identifyPositiveIndicators(factors);

  return {
    accountId,
    likelihoodScore,
    likelihoodClass,
    fullCollectionProbability,
    partialCollectionProbability,
    expectedCollection,
    expectedCollectionPercent,
    estimatedDaysToPayment,
    estimatedDaysToFullCollection,
    confidenceInterval,
    recommendedStrategy,
    alternativeStrategies,
    riskFactors,
    positiveIndicators,
    scoreBreakdown,
  };
}

/**
 * Calculate score breakdown
 */
function calculateScoreBreakdown(factors: CollectionFactors): CollectionScoreBreakdown {
  return {
    balanceScore: calculateBalanceScore(factors.balance, factors.originalAmount),
    ageScore: calculateAgeScore(factors.daysPastDue, factors.ageDays),
    paymentHistoryScore: calculatePaymentHistoryScore(factors),
    insuranceScore: calculateInsuranceScore(factors.insurance),
    contactabilityScore: calculateContactabilityScore(factors),
    demographicScore: calculateDemographicScore(factors.patientAge),
  };
}

/**
 * Calculate balance score (0-20)
 * Sweet spot is moderate balance - collectible but worth effort
 */
function calculateBalanceScore(balance: number, originalAmount: number): number {
  // Very low balance - minimal effort worthwhile
  if (balance < 25) return 5;
  if (balance < 50) return 8;
  if (balance < 100) return 12;

  // Calculate percentage of original collected
  const paidPercent = ((originalAmount - balance) / originalAmount) * 100;

  // Account has made progress
  if (paidPercent >= 50) return 18;
  if (paidPercent >= 25) return 16;

  // Moderate balance - optimal for collection
  if (balance >= 100 && balance <= 2500) return 20;
  if (balance > 2500 && balance <= 5000) return 18;
  if (balance > 5000 && balance <= 10000) return 15;

  // High balance - harder to collect fully
  if (balance > 10000) return 12;

  return 14;
}

/**
 * Calculate age score (0-20)
 * Newer accounts are more likely to pay
 */
function calculateAgeScore(daysPastDue: number, _ageDays: number): number {
  if (daysPastDue <= 0) return 20;
  if (daysPastDue <= 30) return 18;
  if (daysPastDue <= 60) return 15;
  if (daysPastDue <= 90) return 12;
  if (daysPastDue <= 120) return 9;
  if (daysPastDue <= 180) return 6;
  if (daysPastDue <= 365) return 3;
  return 1;
}

/**
 * Calculate payment history score (0-20)
 */
function calculatePaymentHistoryScore(factors: CollectionFactors): number {
  let score = 0;

  // Base score from rating
  switch (factors.paymentHistory) {
    case 'EXCELLENT': score = 18; break;
    case 'GOOD': score = 14; break;
    case 'FAIR': score = 10; break;
    case 'POOR': score = 4; break;
    case 'NO_HISTORY': score = 10; break;
  }

  // Bonus for payment activity
  if (factors.previousPaymentCount > 0) {
    score += Math.min(2, factors.previousPaymentCount * 0.5);
  }

  // Bonus for amount paid
  if (factors.previousPaymentTotal > 0 && factors.originalAmount > 0) {
    const paidPercent = (factors.previousPaymentTotal / factors.originalAmount) * 100;
    if (paidPercent >= 50) score += 2;
    else if (paidPercent >= 25) score += 1;
  }

  // Penalties
  score -= factors.brokenPromiseCount * 3;
  score -= factors.returnedPaymentCount * 4;

  return Math.max(0, Math.min(20, score));
}

/**
 * Calculate insurance score (0-15)
 */
function calculateInsuranceScore(insurance: InsuranceStatus): number {
  switch (insurance) {
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
 * Calculate contactability score (0-15)
 */
function calculateContactabilityScore(factors: CollectionFactors): number {
  let score = 0;

  if (factors.hasValidPhone) score += 5;
  if (factors.hasValidEmail) score += 4;

  if (factors.hasRespondedToContact) {
    score += 6;
  } else if (factors.contactAttemptCount > 5) {
    score -= 2;
  }

  return Math.max(0, Math.min(15, score));
}

/**
 * Calculate demographic score (0-10)
 */
function calculateDemographicScore(patientAge?: number): number {
  let score = 5; // Base neutral

  if (patientAge !== undefined) {
    if (patientAge >= 25 && patientAge <= 65) score += 3;
    else if (patientAge > 65) score += 1;
    else if (patientAge < 25) score += 1;
  }

  return Math.min(10, score);
}

/**
 * Classify likelihood score
 */
function classifyLikelihood(score: number): 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW' | 'VERY_LOW' {
  if (score >= 80) return 'VERY_HIGH';
  if (score >= 60) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  if (score >= 20) return 'LOW';
  return 'VERY_LOW';
}

/**
 * Calculate full collection probability
 */
function calculateFullCollectionProbability(score: number, factors: CollectionFactors): number {
  // Base probability from score
  let probability = score * 0.7;

  // Adjust for specific factors
  if (factors.previousPaymentCount > 0) probability += 10;
  if (factors.paymentHistory === 'EXCELLENT') probability += 10;
  if (factors.insurance === 'INSURED') probability += 5;

  // Reduce for risk factors
  if (factors.daysPastDue > 180) probability -= 15;
  if (factors.brokenPromiseCount > 1) probability -= 10;
  if (factors.balance > 10000) probability -= 10;

  return Math.max(5, Math.min(85, Math.round(probability)));
}

/**
 * Calculate partial collection probability
 */
function calculatePartialCollectionProbability(score: number, factors: CollectionFactors): number {
  // Partial collection is more likely than full
  let probability = score * 0.85 + 10;

  // High balance more likely for partial
  if (factors.balance > 5000) probability += 5;

  // Payment history helps
  if (factors.previousPaymentCount > 0) probability += 5;

  return Math.max(20, Math.min(95, Math.round(probability)));
}

/**
 * Calculate expected collection percentage
 */
function calculateExpectedCollectionPercent(
  _score: number,
  fullProb: number,
  partialProb: number
): number {
  // Weighted expectation
  const fullExpectation = fullProb * 1.0;
  const partialExpectation = (partialProb - fullProb) * 0.5; // Assume 50% of balance for partial

  return Math.round(fullExpectation + partialExpectation);
}

/**
 * Calculate confidence interval for expected collection
 */
function calculateConfidenceInterval(
  expected: number,
  score: number,
  _factors: CollectionFactors
): { low: number; high: number; confidence: number } {
  // Variance decreases with higher scores and more data
  const varianceFactor = (100 - score) / 100;
  const margin = expected * varianceFactor * 0.4;

  return {
    low: Math.max(0, Math.round(expected - margin)),
    high: Math.round(expected + margin * 0.6), // Slightly asymmetric - more upside
    confidence: 80,
  };
}

/**
 * Predict time to collection
 */
export function predictTimeToCollection(account: AccountForPrediction): {
  daysToFirstPayment: number | null;
  daysToFullCollection: number | null;
  confidence: number;
} {
  const prediction = predictCollectionLikelihood(account);

  return {
    daysToFirstPayment: prediction.estimatedDaysToPayment,
    daysToFullCollection: prediction.estimatedDaysToFullCollection,
    confidence: Math.min(80, prediction.likelihoodScore),
  };
}

/**
 * Estimate days to first payment
 */
function estimateDaysToPayment(score: number, factors: CollectionFactors): number | null {
  if (score < 15) return null; // Unlikely to pay

  // Base estimate inversely related to score
  let days = Math.round(90 - (score * 0.7));

  // Adjust for factors
  if (factors.hasRespondedToContact) days -= 15;
  if (factors.previousPaymentCount > 0) days -= 10;
  if (factors.paymentHistory === 'EXCELLENT' || factors.paymentHistory === 'GOOD') days -= 10;

  // Increase for risk factors
  if (factors.daysPastDue > 120) days += 20;
  if (factors.brokenPromiseCount > 0) days += factors.brokenPromiseCount * 7;

  return Math.max(7, Math.min(180, days));
}

/**
 * Estimate days to full collection
 */
function estimateDaysToFullCollection(score: number, factors: CollectionFactors): number | null {
  if (score < 25) return null; // Full collection unlikely

  const daysToFirst = estimateDaysToPayment(score, factors);
  if (!daysToFirst) return null;

  // Full collection takes longer for larger balances
  const balanceFactor = Math.log10(factors.balance + 1) * 30;

  // Base on payment plan typical duration
  let days = daysToFirst + balanceFactor;

  // Adjust for score
  days = days * (1 + (100 - score) / 200);

  return Math.round(Math.max(daysToFirst + 30, Math.min(365, days)));
}

/**
 * Determine optimal collection strategy
 */
export function getOptimalStrategy(account: AccountForPrediction): {
  strategy: CollectionStrategy;
  rationale: string;
  alternatives: CollectionStrategy[];
  expectedOutcome: string;
} {
  const prediction = predictCollectionLikelihood(account);

  return {
    strategy: prediction.recommendedStrategy,
    rationale: STRATEGY_CONFIG[prediction.recommendedStrategy].description,
    alternatives: prediction.alternativeStrategies,
    expectedOutcome: `Expected collection: $${prediction.expectedCollection} (${prediction.expectedCollectionPercent}% of balance)`,
  };
}

/**
 * Determine recommended strategy
 */
function determineStrategy(score: number, factors: CollectionFactors): CollectionStrategy {
  // Special cases
  if (factors.hasActiveDispute) return 'HOLD';
  if (factors.isOnHardship) return 'CHARITY_SCREENING';
  if (factors.balance < 25) return 'WRITE_OFF';
  if (factors.insurance === 'UNINSURED' && factors.balance > 1000 && score < 30) return 'CHARITY_SCREENING';

  // Score-based strategy
  if (score >= 70) {
    return factors.daysPastDue <= 30 ? 'STANDARD_DUNNING' : 'ACCELERATED_DUNNING';
  }
  if (score >= 50) {
    if (factors.hasRespondedToContact) return 'PHONE_OUTREACH';
    if (factors.balance > 500) return 'ACCELERATED_DUNNING';
    return 'PAYMENT_PLAN';
  }
  if (score >= 30) {
    if (factors.balance > 500) return 'SETTLEMENT_OFFER';
    return 'PAYMENT_PLAN';
  }
  if (score >= 15) {
    if (factors.balance > 1000) return 'AGENCY_PLACEMENT';
    return 'SETTLEMENT_OFFER';
  }

  // Very low score
  if (factors.balance < 200) return 'WRITE_OFF';
  if (factors.balance > 5000) return 'LEGAL_REVIEW';
  return 'AGENCY_PLACEMENT';
}

/**
 * Get alternative strategies
 */
function getAlternativeStrategies(score: number, factors: CollectionFactors): CollectionStrategy[] {
  const primary = determineStrategy(score, factors);
  const alternatives: CollectionStrategy[] = [];

  // Find strategies that fit the account profile
  for (const [strategy, config] of Object.entries(STRATEGY_CONFIG)) {
    if (strategy === primary) continue;
    if (strategy === 'HOLD') continue;

    if (score >= config.minLikelihood && score <= config.maxLikelihood) {
      if (factors.balance >= config.balanceRange.min) {
        if (config.balanceRange.max === null || factors.balance <= config.balanceRange.max) {
          alternatives.push(strategy as CollectionStrategy);
        }
      }
    }
  }

  // Limit to top 3 alternatives
  return alternatives.slice(0, 3);
}

/**
 * Identify risk factors
 */
function identifyRiskFactors(factors: CollectionFactors): string[] {
  const risks: string[] = [];

  if (factors.daysPastDue > 120) risks.push('Account significantly past due (120+ days)');
  if (factors.daysPastDue > 180) risks.push('Very old account (180+ days)');
  if (factors.brokenPromiseCount > 0) risks.push(`${factors.brokenPromiseCount} broken promise(s) to pay`);
  if (factors.returnedPaymentCount > 0) risks.push(`${factors.returnedPaymentCount} returned payment(s)`);
  if (!factors.hasValidPhone && !factors.hasValidEmail) risks.push('No valid contact information');
  if (factors.hasActiveDispute) risks.push('Active dispute on account');
  if (factors.isOnHardship) risks.push('Patient on hardship status');
  if (factors.paymentHistory === 'POOR') risks.push('Poor payment history');
  if (factors.insurance === 'UNINSURED') risks.push('Patient is uninsured');
  if (factors.balance > 10000) risks.push('High balance may be difficult to collect in full');
  if (factors.contactAttemptCount > 5 && !factors.hasRespondedToContact) risks.push('Multiple contact attempts with no response');

  return risks;
}

/**
 * Identify positive indicators
 */
function identifyPositiveIndicators(factors: CollectionFactors): string[] {
  const positives: string[] = [];

  if (factors.previousPaymentCount > 0) positives.push('Has made previous payments');
  if (factors.hasRespondedToContact) positives.push('Responsive to contact attempts');
  if (factors.paymentHistory === 'EXCELLENT') positives.push('Excellent payment history');
  if (factors.paymentHistory === 'GOOD') positives.push('Good payment history');
  if (factors.insurance === 'INSURED') positives.push('Has insurance coverage');
  if (factors.daysPastDue <= 30) positives.push('Recently past due - in collection window');
  if (factors.balance >= 100 && factors.balance <= 2500) positives.push('Balance in optimal collection range');
  if (factors.hasValidPhone && factors.hasValidEmail) positives.push('Multiple valid contact methods');

  return positives;
}

/**
 * Segment accounts by collection likelihood tier
 */
export function segmentAccounts(accounts: AccountForPrediction[]): SegmentationResult {
  // Predict for all accounts
  const predictions = accounts.map(account => ({
    account,
    prediction: predictCollectionLikelihood(account),
  }));

  // Define tier thresholds
  const tiers: Array<{
    tier: 'PLATINUM' | 'GOLD' | 'SILVER' | 'BRONZE' | 'IRON';
    minScore: number;
    maxScore: number;
    strategy: CollectionStrategy;
  }> = [
    { tier: 'PLATINUM', minScore: 80, maxScore: 100, strategy: 'STANDARD_DUNNING' },
    { tier: 'GOLD', minScore: 60, maxScore: 79, strategy: 'ACCELERATED_DUNNING' },
    { tier: 'SILVER', minScore: 40, maxScore: 59, strategy: 'PAYMENT_PLAN' },
    { tier: 'BRONZE', minScore: 20, maxScore: 39, strategy: 'SETTLEMENT_OFFER' },
    { tier: 'IRON', minScore: 0, maxScore: 19, strategy: 'AGENCY_PLACEMENT' },
  ];

  // Group accounts into tiers
  const segments: AccountSegment[] = tiers.map(tierConfig => {
    const tierAccounts = predictions.filter(
      p => p.prediction.likelihoodScore >= tierConfig.minScore &&
        p.prediction.likelihoodScore <= tierConfig.maxScore
    );

    return {
      tier: tierConfig.tier,
      minScore: tierConfig.minScore,
      maxScore: tierConfig.maxScore,
      accountCount: tierAccounts.length,
      totalBalance: tierAccounts.reduce((sum, p) => sum + p.account.factors.balance, 0),
      expectedRecovery: tierAccounts.reduce((sum, p) => sum + p.prediction.expectedCollection, 0),
      recommendedStrategy: tierConfig.strategy,
      accountIds: tierAccounts.map(p => p.account.accountId),
    };
  });

  // Calculate summary
  const totalAccounts = accounts.length;
  const totalBalance = predictions.reduce((sum, p) => sum + p.account.factors.balance, 0);
  const totalExpectedRecovery = predictions.reduce((sum, p) => sum + p.prediction.expectedCollection, 0);
  const averageLikelihood = totalAccounts > 0
    ? predictions.reduce((sum, p) => sum + p.prediction.likelihoodScore, 0) / totalAccounts
    : 0;
  const weightedAverageLikelihood = totalBalance > 0
    ? predictions.reduce((sum, p) =>
      sum + (p.prediction.likelihoodScore * p.account.factors.balance), 0) / totalBalance
    : 0;

  return {
    segments,
    summary: {
      totalAccounts,
      totalBalance: Math.round(totalBalance),
      totalExpectedRecovery: Math.round(totalExpectedRecovery),
      averageLikelihood: Math.round(averageLikelihood),
      weightedAverageLikelihood: Math.round(weightedAverageLikelihood),
    },
  };
}

/**
 * Batch predict for multiple accounts
 */
export function batchPredictCollection(accounts: AccountForPrediction[]): CollectionPrediction[] {
  return accounts.map(account => predictCollectionLikelihood(account));
}
