/**
 * Retroactive Coverage Calculator Engine
 *
 * Calculates whether a date of service falls within the Medicaid retroactive
 * coverage window based on state-specific rules and 1115 waiver provisions.
 *
 * Standard Medicaid retroactive coverage: Up to 3 months (90 days) before
 * the month of application, covering the first day of that month.
 *
 * Some states have 1115 waivers that reduce or eliminate retroactive coverage:
 * - Arizona, Florida, Indiana, Iowa, New Hampshire: 0 days (no retroactive)
 * - Arkansas: 60 days (reduced window)
 */

// ============================================================================
// INPUT INTERFACE
// ============================================================================

export interface RetroactiveCoverageInput {
  /** Date the medical service was provided */
  dateOfService: Date;
  /** Date the Medicaid application was submitted */
  applicationDate: Date;
  /** Two-letter state code (e.g., 'CA', 'TX') */
  stateOfResidence: string;
  /** Whether the patient was income/categorically eligible on DOS */
  wasEligibleOnDOS: boolean;
  /** Type of encounter (inpatient, ed, outpatient, observation) */
  encounterType: string;
  /** Total billed charges for the encounter */
  totalCharges: number;
}

// ============================================================================
// OUTPUT INTERFACE
// ============================================================================

export interface RetroactiveCoverageResult {
  /** Whether the DOS falls within the state's retroactive coverage window */
  isWithinWindow: boolean;
  /** Number of days in the state's retroactive window (0, 60, or 90) */
  retroactiveWindowDays: number;
  /** First day of retroactive coverage eligibility */
  coverageStartDate: Date;
  /** Number of days between DOS and application date */
  daysBetweenDOSAndApplication: number;
  /** Estimated dollar recovery based on eligibility and encounter type */
  estimatedRecovery: number;
  /** Confidence level (0-100) that retroactive coverage will be approved */
  recoveryConfidence: number;
  /** Whether the state has a 1115 waiver affecting retroactive coverage */
  stateHasWaiver: boolean;
  /** Recommended actions for pursuing retroactive coverage */
  actions: string[];
  /** Additional notes about the retroactive coverage determination */
  notes: string[];
  /** Waiver details if applicable */
  waiverDetails?: WaiverDetails;
}

export interface WaiverDetails {
  waiverType: string;
  waiverName: string;
  effectiveDate: string;
  retroactiveDaysAllowed: number;
}

// ============================================================================
// STATE RETROACTIVE WAIVER CONFIGURATION
// ============================================================================

interface StateRetroactiveConfig {
  retroactiveDays: number;
  hasWaiver: boolean;
  waiverName?: string;
  waiverType?: string;
  effectiveDate?: string;
  notes: string;
}

const STATE_RETROACTIVE_CONFIG: Record<string, StateRetroactiveConfig> = {
  // States with NO retroactive coverage (0 days)
  'AZ': {
    retroactiveDays: 0,
    hasWaiver: true,
    waiverName: 'AHCCCS 1115 Demonstration',
    waiverType: '1115',
    effectiveDate: '1982-10-01',
    notes: 'Arizona has never had retroactive coverage under AHCCCS 1115 waiver'
  },
  'FL': {
    retroactiveDays: 0,
    hasWaiver: true,
    waiverName: 'Florida 1115 MMA Waiver',
    waiverType: '1115',
    effectiveDate: '2006-07-01',
    notes: 'Florida eliminated retroactive coverage under 1115 waiver'
  },
  'IA': {
    retroactiveDays: 0,
    hasWaiver: true,
    waiverName: 'Iowa Wellness Plan 1115 Waiver',
    waiverType: '1115',
    effectiveDate: '2014-01-01',
    notes: 'Iowa eliminated retroactive coverage for expansion population'
  },
  'IN': {
    retroactiveDays: 0,
    hasWaiver: true,
    waiverName: 'Healthy Indiana Plan (HIP) 2.0',
    waiverType: '1115',
    effectiveDate: '2015-02-01',
    notes: 'Indiana HIP 2.0 waiver eliminates retroactive coverage'
  },
  'NH': {
    retroactiveDays: 0,
    hasWaiver: true,
    waiverName: 'Granite Advantage 1115 Waiver',
    waiverType: '1115',
    effectiveDate: '2019-01-01',
    notes: 'New Hampshire Granite Advantage waiver has no retroactive coverage'
  },

  // States with REDUCED retroactive coverage
  'AR': {
    retroactiveDays: 60,
    hasWaiver: true,
    waiverName: 'Arkansas Works 1115 Waiver',
    waiverType: '1115',
    effectiveDate: '2018-06-01',
    notes: 'Arkansas reduced retroactive coverage to 60 days under 1115 waiver'
  },

  // States with potential retroactive limitations (monitoring)
  'MT': {
    retroactiveDays: 90,
    hasWaiver: true,
    waiverName: 'Montana HELP Act',
    waiverType: '1115',
    effectiveDate: '2016-01-01',
    notes: 'Montana maintains standard retroactive coverage but has waiver provisions'
  },
  'KY': {
    retroactiveDays: 90,
    hasWaiver: true,
    waiverName: 'Kentucky HEALTH',
    waiverType: '1115',
    effectiveDate: '2020-01-01',
    notes: 'Kentucky maintains standard retroactive coverage under current waiver'
  },
  'MI': {
    retroactiveDays: 90,
    hasWaiver: true,
    waiverName: 'Healthy Michigan Plan',
    waiverType: '1115',
    effectiveDate: '2014-04-01',
    notes: 'Michigan maintains standard retroactive coverage'
  },
  'OH': {
    retroactiveDays: 90,
    hasWaiver: false,
    notes: 'Ohio provides full 90-day retroactive coverage under standard rules'
  }
};

// Default configuration for states not explicitly listed
const DEFAULT_STATE_CONFIG: StateRetroactiveConfig = {
  retroactiveDays: 90,
  hasWaiver: false,
  notes: 'Standard 90-day retroactive coverage applies'
};

// ============================================================================
// ENCOUNTER TYPE RECOVERY RATES
// ============================================================================

const ENCOUNTER_RECOVERY_RATES: Record<string, number> = {
  'inpatient': 0.45,
  'ed': 0.40,
  'outpatient': 0.35,
  'observation': 0.38,
  'recurring': 0.30,
  'default': 0.35
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the first day of a given month
 */
function getFirstDayOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Calculate the number of days between two dates
 */
function daysBetween(startDate: Date, endDate: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  return Math.round((end.getTime() - start.getTime()) / msPerDay);
}

/**
 * Subtract months from a date and return the first day of that month
 */
function subtractMonthsFirstDay(date: Date, months: number): Date {
  const result = new Date(date.getFullYear(), date.getMonth() - months, 1);
  return result;
}

/**
 * Get state configuration for retroactive coverage
 */
function getStateConfig(stateCode: string): StateRetroactiveConfig {
  const upperState = stateCode.toUpperCase();
  return STATE_RETROACTIVE_CONFIG[upperState] || DEFAULT_STATE_CONFIG;
}

/**
 * Calculate recovery rate based on encounter type
 */
function getRecoveryRate(encounterType: string): number {
  const normalizedType = encounterType.toLowerCase().replace(/[^a-z]/g, '');
  return ENCOUNTER_RECOVERY_RATES[normalizedType] ?? ENCOUNTER_RECOVERY_RATES['default'] ?? 0.40;
}

/**
 * Calculate confidence based on various factors
 */
function calculateConfidence(
  isWithinWindow: boolean,
  wasEligibleOnDOS: boolean,
  daysBetweenVal: number,
  retroactiveWindowDays: number,
  encounterType: string
): number {
  if (!isWithinWindow) {
    return 0;
  }

  let confidence = 50;

  if (wasEligibleOnDOS) {
    confidence += 30;
  } else {
    confidence -= 20;
  }

  if (retroactiveWindowDays > 0) {
    const percentageUsed = daysBetweenVal / retroactiveWindowDays;
    if (percentageUsed <= 0.33) {
      confidence += 15;
    } else if (percentageUsed <= 0.66) {
      confidence += 5;
    }
  }

  const normalizedType = encounterType.toLowerCase();
  if (normalizedType === 'ed' || normalizedType === 'inpatient') {
    confidence += 5;
  }

  return Math.min(Math.max(confidence, 0), 95);
}

/**
 * Format a date for display
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0] ?? date.toISOString();
}

// ============================================================================
// MAIN CALCULATOR FUNCTION
// ============================================================================

/**
 * Calculate retroactive Medicaid coverage eligibility
 */
export function calculateRetroactiveCoverage(
  input: RetroactiveCoverageInput
): RetroactiveCoverageResult {
  const {
    dateOfService,
    applicationDate,
    stateOfResidence,
    wasEligibleOnDOS,
    encounterType,
    totalCharges
  } = input;

  // Validate dates
  if (dateOfService > applicationDate) {
    return createErrorResult(
      'Date of service is after application date - retroactive coverage not applicable',
      dateOfService,
      stateOfResidence
    );
  }

  // Get state-specific configuration
  const stateConfig = getStateConfig(stateOfResidence);
  const retroactiveWindowDays = stateConfig.retroactiveDays;
  const stateHasWaiver = stateConfig.hasWaiver;

  // Calculate the coverage start date
  let coverageStartDate: Date;

  if (retroactiveWindowDays === 0) {
    coverageStartDate = getFirstDayOfMonth(applicationDate);
  } else if (retroactiveWindowDays === 60) {
    coverageStartDate = subtractMonthsFirstDay(applicationDate, 2);
  } else {
    coverageStartDate = subtractMonthsFirstDay(applicationDate, 3);
  }

  // Calculate days between DOS and application
  const daysBetweenDOSAndApplication = daysBetween(dateOfService, applicationDate);

  // Determine if DOS is within the retroactive window
  const dosFirstOfMonth = getFirstDayOfMonth(dateOfService);
  const isWithinWindow = dosFirstOfMonth >= coverageStartDate;

  // Calculate recovery confidence
  const recoveryConfidence = calculateConfidence(
    isWithinWindow,
    wasEligibleOnDOS,
    daysBetweenDOSAndApplication,
    retroactiveWindowDays,
    encounterType
  );

  // Calculate estimated recovery
  let estimatedRecovery = 0;
  if (isWithinWindow && wasEligibleOnDOS) {
    const recoveryRate = getRecoveryRate(encounterType);
    const confidenceMultiplier = recoveryConfidence / 100;
    estimatedRecovery = Math.round(totalCharges * recoveryRate * confidenceMultiplier);
  }

  // Generate actions and notes
  const actions: string[] = [];
  const notes: string[] = [];

  if (isWithinWindow) {
    if (wasEligibleOnDOS) {
      actions.push('Submit Medicaid application with retroactive coverage request');
      actions.push('Document patient eligibility (income, household size) as of date of service');
      actions.push('Request coverage effective ' + formatDate(coverageStartDate));

      if (stateHasWaiver && retroactiveWindowDays < 90) {
        actions.push('Note: ' + stateOfResidence + ' has reduced retroactive window - verify current waiver terms');
      }

      notes.push('DOS of ' + formatDate(dateOfService) + ' falls within ' + retroactiveWindowDays + '-day retroactive window');
      notes.push('Application date: ' + formatDate(applicationDate));
      notes.push('Coverage start date: ' + formatDate(coverageStartDate));
    } else {
      actions.push('Verify patient eligibility status on date of service');
      actions.push('Gather income and household documentation for DOS period');
      actions.push('Consider if eligibility may have existed but was not verified');

      notes.push('DOS is within window but eligibility on DOS is uncertain');
      notes.push('Recommend thorough eligibility screening before application');
    }
  } else {
    if (retroactiveWindowDays === 0) {
      notes.push(stateOfResidence + ' has no retroactive Medicaid coverage under 1115 waiver');
      notes.push('Coverage can only begin from date of application or later');
      actions.push('Evaluate alternative coverage options (state programs, charity care)');
      actions.push('Document for DSH reporting if uncompensated');
    } else {
      notes.push('DOS of ' + formatDate(dateOfService) + ' is outside the ' + retroactiveWindowDays + '-day retroactive window');
      notes.push('Retroactive coverage only available back to ' + formatDate(coverageStartDate));
      actions.push('Evaluate other recovery pathways (state programs, charity care)');
      actions.push('Document encounter for potential DSH qualifying criteria');
    }
  }

  // Add state-specific waiver notes
  if (stateHasWaiver && stateConfig.waiverName) {
    notes.push('State operates under ' + stateConfig.waiverName);
    notes.push(stateConfig.notes);
  }

  // Build waiver details if applicable
  let waiverDetails: WaiverDetails | undefined;
  if (stateHasWaiver && stateConfig.waiverName) {
    waiverDetails = {
      waiverType: stateConfig.waiverType || '1115',
      waiverName: stateConfig.waiverName,
      effectiveDate: stateConfig.effectiveDate || 'Unknown',
      retroactiveDaysAllowed: retroactiveWindowDays
    };
  }

  return {
    isWithinWindow,
    retroactiveWindowDays,
    coverageStartDate,
    daysBetweenDOSAndApplication,
    estimatedRecovery,
    recoveryConfidence,
    stateHasWaiver,
    actions,
    notes,
    waiverDetails
  };
}

/**
 * Create an error result when inputs are invalid
 */
function createErrorResult(
  message: string,
  dateOfService: Date,
  stateOfResidence: string
): RetroactiveCoverageResult {
  const stateConfig = getStateConfig(stateOfResidence);

  return {
    isWithinWindow: false,
    retroactiveWindowDays: stateConfig.retroactiveDays,
    coverageStartDate: dateOfService,
    daysBetweenDOSAndApplication: 0,
    estimatedRecovery: 0,
    recoveryConfidence: 0,
    stateHasWaiver: stateConfig.hasWaiver,
    actions: ['Review input dates - date of service should be before application date'],
    notes: [message]
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get all states with no retroactive coverage (0 days)
 */
export function getStatesWithNoRetroactiveCoverage(): string[] {
  return Object.entries(STATE_RETROACTIVE_CONFIG)
    .filter(([, config]) => config.retroactiveDays === 0)
    .map(([stateCode]) => stateCode);
}

/**
 * Get all states with reduced retroactive coverage (less than 90 days but more than 0)
 */
export function getStatesWithReducedRetroactiveCoverage(): string[] {
  return Object.entries(STATE_RETROACTIVE_CONFIG)
    .filter(([, config]) => config.retroactiveDays > 0 && config.retroactiveDays < 90)
    .map(([stateCode]) => stateCode);
}

/**
 * Check if a state has a retroactive coverage waiver
 */
export function stateHasRetroactiveWaiver(stateCode: string): boolean {
  const config = getStateConfig(stateCode);
  return config.hasWaiver && config.retroactiveDays < 90;
}

/**
 * Get the retroactive window for a specific state
 */
export function getStateRetroactiveWindow(stateCode: string): number {
  const config = getStateConfig(stateCode);
  return config.retroactiveDays;
}

/**
 * Quick check if a DOS might be eligible for retroactive coverage
 */
export function isRetroactiveCoveragePossible(
  dateOfService: Date,
  applicationDate: Date,
  stateOfResidence: string
): boolean {
  if (dateOfService > applicationDate) {
    return false;
  }

  const stateConfig = getStateConfig(stateOfResidence);
  if (stateConfig.retroactiveDays === 0) {
    return false;
  }

  const coverageStartDate = subtractMonthsFirstDay(
    applicationDate,
    stateConfig.retroactiveDays === 60 ? 2 : 3
  );

  const dosFirstOfMonth = getFirstDayOfMonth(dateOfService);
  return dosFirstOfMonth >= coverageStartDate;
}
