/**
 * Mugetsu SSI Eligibility Engine Integration Types
 *
 * Type definitions for integrating with the Halcyon-Mugetsu SSI/SSDI
 * eligibility determination engine.
 */

/**
 * Work history item for SSI assessment
 */
export interface WorkHistoryItem {
  /** Job title */
  jobTitle: string;
  /** Employer name */
  employer?: string;
  /** Start date (ISO format) */
  startDate?: string;
  /** End date (ISO format) */
  endDate?: string;
  /** Physical demands level */
  physicalDemands?: 'sedentary' | 'light' | 'medium' | 'heavy' | 'very_heavy';
  /** Job description */
  description?: string;
  /** Weekly hours worked */
  hoursPerWeek?: number;
  /** Monthly earnings */
  monthlyEarnings?: number;
}

/**
 * Input interface for Mugetsu assessment
 * Matches the AssessmentInput from Mugetsu's assessment engine
 */
export interface MugetsuAssessmentInput {
  /** List of medical conditions */
  medicalConditions: string[];
  /** Patient age */
  age: number;
  /** Education level */
  education: string;
  /** Work history items */
  workHistory: WorkHistoryItem[];
  /** Functional limitations */
  functionalLimitations: string[];
  /** Severity of disability */
  severity: 'mild' | 'moderate' | 'severe' | 'disabling';
  /** Number of hospitalizations */
  hospitalizations: number;
  /** Current medications */
  medications: string[];
  /** State of residence (optional) */
  stateOfResidence?: string;
  /** Is this a child disability case (optional) */
  isChildDisabilityCase?: boolean;
  /** Date of birth (ISO format) */
  dateOfBirth?: string;
  /** Alleged onset date (ISO format) */
  allegedOnsetDate?: string;
  /** Whether patient uses assistive devices */
  assistiveDevices?: boolean;
  /** Treatment consistency */
  consistentTreatment?: 'yes' | 'no';
  /** Treatment history type */
  treatmentHistory?: 'intermittent' | 'emergent_only' | 'partial' | 'none' | 'consistent';
}

/**
 * SSA Waterfall approval rates at each level
 */
export interface SSAWaterfallRates {
  /** Initial application approval rates */
  initial: {
    baseRate: number;
    adjustedRate: number;
    factors: string[];
  };
  /** Reconsideration approval rates */
  reconsideration: {
    baseRate: number;
    adjustedRate: number;
    factors: string[];
  };
  /** ALJ Hearing approval rates */
  aljHearing: {
    baseRate: number;
    adjustedRate: number;
    factors: string[];
  };
  /** Appeals Council rates */
  appealsCouncil?: {
    baseRate: number;
    adjustedRate: number;
    factors: string[];
  };
  /** Cumulative chance of eventual approval */
  cumulative: number;
  /** Explanation of waterfall analysis */
  explanation?: string;
}

/**
 * Sequential Evaluation Process step analysis
 */
export interface SEPStepAnalysis {
  /** Whether the step is satisfied */
  satisfied: boolean;
  /** Analysis text */
  analysis: string;
  /** Matched SSA listings (for step 3) */
  matchedListings?: Array<{
    listingNumber: string;
    title: string;
    bodySystem: string;
  }>;
  /** Equivalence opportunities */
  equivalenceOpportunities?: string[];
}

/**
 * Sequential Evaluation Process analysis
 */
export interface SequentialEvaluationAnalysis {
  /** Step 1: Substantial Gainful Activity */
  step1: SEPStepAnalysis;
  /** Step 2: Severe Impairment */
  step2: SEPStepAnalysis;
  /** Step 3: Meets or Equals Listing */
  step3: SEPStepAnalysis;
  /** Step 4: Past Relevant Work */
  step4: SEPStepAnalysis;
  /** Step 5: Other Work */
  step5: SEPStepAnalysis;
  /** Overall conclusion */
  overallConclusion: string;
  /** Critical factors affecting the decision */
  criticalFactors: {
    age: number;
    hasGridAdvantage: boolean;
    expectedRFC: string;
    transferableSkills: boolean;
    likelyCannotReturnToPRW: boolean;
  };
}

/**
 * Age progression analysis for strategic timing
 */
export interface AgeProgressionAnalysis {
  /** Current age category */
  currentAgeCategory: string;
  /** Next favorable age category */
  nextCategoryAge?: number;
  /** Days until next category */
  daysUntilNextCategory?: number;
  /** Strategic timing recommendation */
  strategicTiming: {
    recommendation: string;
    reasoning: string;
    optimalFilingDate?: string;
    scoreImpact?: number;
  };
  /** Age-related factors */
  ageFactors: string[];
}

/**
 * Score breakdown components
 */
export interface ScoreBreakdown {
  /** Medical evidence score */
  medicalEvidence?: number;
  /** Functional limitations score */
  functionalLimitations?: number;
  /** Age/vocational factors score */
  ageVocational?: number;
  /** Work history score */
  workHistory?: number;
  /** Treatment compliance score */
  treatmentCompliance?: number;
  /** Additional breakdown fields */
  [key: string]: number | undefined;
}

/**
 * Full assessment result from Mugetsu
 */
export interface MugetsuAssessmentResult {
  /** Assessment ID */
  assessmentId: string;
  /** Overall score (0-100) */
  score: number;
  /** Recommendation text */
  recommendation: string;
  /** Viability rating */
  viabilityRating: 'Very High' | 'High' | 'Moderate' | 'Low' | 'Very Low';
  /** Key factors affecting the score */
  keyFactors: string[];
  /** Suggested actions */
  suggestedActions: string[];
  /** Detailed analysis */
  analysis?: string;
  /** SSA Waterfall approval rates */
  ssaWaterfallRates: SSAWaterfallRates;
  /** Sequential Evaluation Process analysis */
  sequentialEvaluation: SequentialEvaluationAnalysis;
  /** Age progression analysis */
  ageProgressionAnalysis: AgeProgressionAnalysis;
  /** Score breakdown */
  scoreBreakdown?: ScoreBreakdown;
  /** Condition analysis */
  conditionAnalysis?: {
    averageApprovalRate?: number;
    conditions?: Array<{
      condition: string;
      approvalRate?: number;
      category?: string;
    }>;
  };
  /** Timestamp of assessment */
  timestamp: string;
  /** Confidence level */
  confidenceLevel?: string;
  /** Model consensus data (if multiple AI models used) */
  modelConsensus?: {
    modelsContributed: number;
    modelsAttempted: number;
    modelAgreement: string;
  };
}

/**
 * Error response from Mugetsu API
 */
export interface MugetsuErrorResponse {
  error: {
    message: string;
    code: string;
    details?: unknown;
  };
}

/**
 * Health check response
 */
export interface MugetsuHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version?: string;
  timestamp: string;
  services?: {
    database?: boolean;
    scoring?: boolean;
    ai?: boolean;
  };
}

/**
 * Condition score lookup response
 */
export interface ConditionScoreResponse {
  condition: string;
  score: number;
  approvalRate: number;
  category?: string;
  ssaListingMatch?: string;
  notes?: string;
}

/**
 * Mugetsu client configuration
 */
export interface MugetsuClientConfig {
  /** Base URL for Mugetsu API */
  baseUrl: string;
  /** API key for authentication */
  apiKey: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Number of retry attempts */
  maxRetries?: number;
  /** Retry delay in milliseconds */
  retryDelay?: number;
  /** Whether to use direct function calls (if same server) */
  useDirectCalls?: boolean;
}

/**
 * Batch assessment request
 */
export interface BatchAssessmentRequest {
  assessments: MugetsuAssessmentInput[];
  options?: {
    /** Skip AI analysis for faster processing */
    skipAI?: boolean;
    /** Return only scores without full analysis */
    scoresOnly?: boolean;
  };
}

/**
 * Batch assessment response
 */
export interface BatchAssessmentResponse {
  results: Array<{
    index: number;
    success: boolean;
    result?: MugetsuAssessmentResult;
    error?: string;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
    averageScore: number;
  };
}
