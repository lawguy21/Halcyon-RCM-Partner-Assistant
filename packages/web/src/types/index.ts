/**
 * Halcyon RCM Partner Assistant - Web UI Types
 */

// ============================================================================
// ASSESSMENT TYPES
// ============================================================================

export interface Assessment {
  id: string;
  accountNumber: string;
  patientName: string;
  dateOfService: string;
  totalCharges: number;
  facilityState: string;
  encounterType: 'inpatient' | 'observation' | 'ed' | 'outpatient';
  insuranceStatus: string;

  // Recovery Analysis
  primaryRecoveryPath: string;
  overallConfidence: number;
  estimatedTotalRecovery: number;
  recoveryRate: number;

  // Pathway Results
  medicaid: MedicaidResult;
  medicare: MedicareResult;
  dsh: DSHResult;
  stateProgram: StateProgramResult;

  // Actions
  priorityActions: string[];
  immediateActions: string[];
  followUpActions: string[];
  documentationNeeded: string[];

  // Metadata
  createdAt: string;
  updatedAt: string;
  status: 'pending' | 'in_progress' | 'completed' | 'exported';
}

export interface MedicaidResult {
  status: 'confirmed' | 'likely' | 'possible' | 'unlikely';
  confidence: number;
  pathway: string;
  actions: string[];
  estimatedRecovery: number;
  timelineWeeks: string;
  notes: string[];
}

export interface MedicareResult {
  status: 'active_on_dos' | 'future_likely' | 'unlikely';
  confidence: number;
  pathway: string;
  actions: string[];
  estimatedTimeToEligibility?: string;
  notes: string[];
}

export interface DSHResult {
  relevance: 'high' | 'medium' | 'low';
  score: number;
  factors: DSHFactor[];
  auditReadiness: 'strong' | 'moderate' | 'weak';
  notes: string[];
}

export interface DSHFactor {
  factor: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number;
}

export interface StateProgramResult {
  archetype: string;
  programName: string;
  confidence: number;
  eligibilityLikely: boolean;
  requiredDocuments: string[];
  actions: string[];
  estimatedRecoveryPercent: number;
  notes: string[];
}

// ============================================================================
// DASHBOARD TYPES
// ============================================================================

export interface DashboardStats {
  totalAssessments: number;
  totalCharges: number;
  estimatedRecovery: number;
  recoveryRate: number;
  byPathway: {
    medicaid: number;
    medicare: number;
    dsh: number;
    stateProgram: number;
  };
  byState: Record<string, number>;
  recentAssessments: Assessment[];
}

// ============================================================================
// IMPORT TYPES
// ============================================================================

export interface ImportPreset {
  id: string;
  name: string;
  vendor: string;
  description: string;
  dateFormat: string;
  currencyFormat: 'decimal' | 'cents';
  delimiter: ',' | '\t' | '|' | ';';
}

export interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
  transform?: 'date' | 'currency' | 'uppercase' | 'lowercase' | 'state_code' | 'encounter_type' | 'custom';
  required: boolean;
  defaultValue?: string;
}

export interface ImportPreviewResult {
  columns: string[];
  previewRows: Record<string, unknown>[];
  totalRows: number;
  suggestedPreset?: string;
  suggestedMappings: ColumnMapping[];
  issues: string[];
}

export interface ImportResult {
  success: boolean;
  totalRows: number;
  processedRows: number;
  skippedRows: number;
  errors: ImportError[];
  warnings: string[];
  assessments: Assessment[];
}

export interface ImportError {
  row: number;
  column: string;
  value: string;
  message: string;
  severity: 'error' | 'warning';
}

// ============================================================================
// FILTER & PAGINATION TYPES
// ============================================================================

export interface AssessmentFilters {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  pathway?: string;
  state?: string;
  confidenceMin?: number;
  confidenceMax?: number;
  status?: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================================
// FORM INPUT TYPES (for new assessment)
// ============================================================================

export interface AssessmentFormInput {
  // Patient Demographics
  patientName: string;
  dateOfBirth: string;
  stateOfResidence: string;

  // Encounter Details
  accountNumber: string;
  dateOfService: string;
  encounterType: 'inpatient' | 'observation' | 'ed' | 'outpatient';
  lengthOfStay?: number;
  totalCharges: number;
  facilityState: string;
  facilityType?: 'public_hospital' | 'dsh_hospital' | 'safety_net' | 'critical_access' | 'standard';

  // Insurance/Medicaid/Medicare Status
  insuranceStatusOnDOS: 'uninsured' | 'underinsured' | 'medicaid' | 'medicare' | 'commercial';
  highCostSharing?: boolean;
  medicaidStatus: 'active' | 'pending' | 'recently_terminated' | 'never' | 'unknown';
  medicaidTerminationDate?: string;
  medicareStatus: 'active_part_a' | 'active_part_b' | 'pending' | 'none';
  ssiStatus: 'receiving' | 'pending' | 'denied' | 'never_applied' | 'unknown';
  ssdiStatus: 'receiving' | 'pending' | 'denied' | 'never_applied' | 'unknown';

  // Financial Screening
  householdIncome: 'under_fpl' | 'fpl_138' | 'fpl_200' | 'fpl_250' | 'fpl_300' | 'fpl_400' | 'over_400_fpl';
  householdSize: number;
  estimatedAssets: 'under_2000' | '2000_5000' | '5000_10000' | 'over_10000' | 'unknown';

  // Disability Assessment
  disabilityLikelihood: 'high' | 'medium' | 'low';
  ssiEligibilityLikely: boolean;
  ssdiEligibilityLikely: boolean;

  // Service Details
  emergencyService: boolean;
  medicallyNecessary: boolean;
}

// ============================================================================
// REPORT TYPES
// ============================================================================

export interface ReportSummary {
  period: string;
  totalAssessments: number;
  totalCharges: number;
  estimatedRecovery: number;
  actualRecovery: number;
  recoveryRate: number;
  pathwayBreakdown: PathwayBreakdown[];
  stateBreakdown: StateBreakdown[];
  topOpportunities: Assessment[];
}

export interface PathwayBreakdown {
  pathway: string;
  count: number;
  totalCharges: number;
  estimatedRecovery: number;
  percentage: number;
}

export interface StateBreakdown {
  state: string;
  count: number;
  totalCharges: number;
  estimatedRecovery: number;
}

// ============================================================================
// SETTINGS TYPES
// ============================================================================

export interface UserSettings {
  defaultPreset?: string;
  exportFormat: 'detailed' | 'summary' | 'worklist' | 'executive';
  dateFormat: string;
  currencyFormat: 'decimal' | 'cents';
  customPresets: ImportPreset[];
}

// ============================================================================
// BATCH IMPORT TYPES (Re-export from batchImport.ts)
// ============================================================================

export * from './batchImport';
