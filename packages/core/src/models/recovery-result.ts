/**
 * Recovery Result interfaces for Hospital Recovery Engine
 */

// ============================================================================
// STATE PROGRAM ARCHETYPE
// ============================================================================

export type StateProgramArchetype =
  | '1115_uc_pool'
  | '1115_lip_pool'
  | 'charity_care_reimb'
  | 'indigent_care_pool'
  | 'all_payer_uc_pooling'
  | 'health_safety_net'
  | 'unknown';

// ============================================================================
// MEDICAID RECOVERY RESULT
// ============================================================================

export interface MedicaidRecoveryResult {
  status: 'confirmed' | 'likely' | 'possible' | 'unlikely';
  confidence: number; // 0-100
  pathway: string;
  actions: string[];
  estimatedRecovery: number;
  timelineWeeks: string;
  notes: string[];
}

// ============================================================================
// MEDICARE RECOVERY RESULT
// ============================================================================

export interface MedicareRecoveryResult {
  status: 'active_on_dos' | 'future_likely' | 'unlikely';
  confidence: number;
  pathway: string;
  actions: string[];
  estimatedTimeToEligibility?: string;
  notes: string[];
}

// ============================================================================
// DSH RELEVANCE RESULT
// ============================================================================

export interface DSHRelevanceFactor {
  factor: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number;
}

export interface DSHRelevanceResult {
  relevance: 'high' | 'medium' | 'low';
  score: number; // 0-100
  factors: DSHRelevanceFactor[];
  auditReadiness: 'strong' | 'moderate' | 'weak';
  notes: string[];
}

// ============================================================================
// STATE PROGRAM RESULT
// ============================================================================

export interface StateProgramResult {
  archetype: StateProgramArchetype;
  programName: string;
  confidence: number;
  eligibilityLikely: boolean;
  requiredDocuments: string[];
  actions: string[];
  estimatedRecoveryPercent: number;
  notes: string[];
}

// ============================================================================
// PROJECTED RECOVERY
// ============================================================================

export interface ProjectedRecovery {
  medicaid: number;
  stateProgram: number;
  charityWriteoff: number;
  total: number;
}

// ============================================================================
// HOSPITAL RECOVERY RESULT (Main output type)
// ============================================================================

export interface HospitalRecoveryResult {
  // Summary
  primaryRecoveryPath: string;
  overallConfidence: number;
  estimatedTotalRecovery: number;
  priorityActions: string[];

  // Individual Pathways
  medicaid: MedicaidRecoveryResult;
  medicare: MedicareRecoveryResult;
  dshRelevance: DSHRelevanceResult;
  stateProgram: StateProgramResult;

  // Revenue Impact
  currentExposure: number;
  projectedRecovery: ProjectedRecovery;

  // Workflow
  immediateActions: string[];
  followUpActions: string[];
  documentationNeeded: string[];
}

// ============================================================================
// DSH SCORING TYPES (from dsh-scoring.ts)
// ============================================================================

export interface DSHScoringInput {
  // Patient info
  age: number;

  // Financial (SSI eligibility)
  monthlyIncome: string; // 'none', 'under_500', '500_1000', '1000_1500', 'over_1500'
  totalAssets: string; // 'under_2000', '2000_5000', '5000_10000', 'over_10000'
  currentlyWorking: string; // 'yes', 'no', 'limited'
  monthlyEarnings?: number;

  // Medical
  chronicConditions: string[];
  mentalHealthConditions: string[];
  hospitalizationsLast12Months: string; // 'none', '1', '2_3', '4_plus'
  icuStays: boolean;
  icuDays?: number;

  // Functional
  mobilityStatus: string; // 'independent', 'uses_device', 'needs_assistance', 'wheelchair', 'bedridden'
  adlDifficulties: string[]; // Activities of Daily Living
  cognitiveStatus: string; // 'normal', 'mild_impairment', 'moderate_impairment', 'severe_impairment'

  // Work
  lastWorkedDate: string; // 'currently_working', 'within_6_months', '6_12_months', '1_2_years', 'over_2_years', 'never'
  yearsWorkHistory: string; // 'none', 'under_5', '5_10', '10_20', 'over_20'

  // Special circumstances
  specialCircumstances: string[]; // 'homeless', 'no_insurance', 'veteran', 'pregnancy', 'terminal_diagnosis'

  // Additional hospital data
  currentCharges?: number;
  serviceLine?: string;
}

export interface MatchedCondition {
  condition: string;
  points: number;
}

export interface AgeModifier {
  applied: boolean;
  points: number;
  reason: string;
}

export interface KeyFinding {
  type: 'positive' | 'negative' | 'neutral';
  finding: string;
}

export interface RevenueImpact {
  estimatedMedicaidReimbursement: number;
  selfPayCollectionEstimate: number;
  netImprovement: number;
}

export type DSHScoringTier = 'Excellent' | 'Good' | 'Fair' | 'Poor';
export type DSHScoringUrgency = 'IMMEDIATE' | 'HIGH' | 'MODERATE' | 'ROUTINE';

export interface DSHScoringResult {
  viabilityScore: number; // 0-100
  tier: DSHScoringTier;
  ssiEligible: boolean;
  ssiEligibilityReason: string;
  listingLevelMatch: boolean;
  matchedConditions: MatchedCondition[];
  ageModifier: AgeModifier;
  boostsApplied: string[];
  penaltiesApplied: string[];
  hasPhysicalCondition: boolean;
  hasMentalCondition: boolean;
  estimatedApprovalTimeline: string;
  keyFindings: KeyFinding[];
  recommendedActions: string[];
  revenueImpact: RevenueImpact;
  urgency: DSHScoringUrgency;
}
