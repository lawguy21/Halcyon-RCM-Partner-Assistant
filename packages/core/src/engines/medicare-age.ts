/**
 * Medicare Age-Based Eligibility Engine
 *
 * Evaluates Medicare eligibility based on age and special circumstances:
 * - Age 65+: Automatic eligibility
 * - ESRD: Eligible after 3 months of dialysis (any age)
 * - ALS: Eligible immediately upon SSDI (any age)
 * - SSDI: Eligible after 24-month waiting period
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Input for Medicare age-based eligibility evaluation
 */
export interface MedicareAgeInput {
  /** Patient date of birth */
  dateOfBirth: Date;
  /** Date of service for eligibility determination */
  dateOfService: Date;
  /** Whether patient has End-Stage Renal Disease */
  hasESRD?: boolean;
  /** Date dialysis began (required if hasESRD is true) */
  dialysisStartDate?: Date;
  /** Whether patient has ALS (Amyotrophic Lateral Sclerosis) */
  hasALS?: boolean;
  /** SSDI status */
  ssdiStatus?: 'none' | 'pending' | 'receiving';
  /** Date SSDI benefits began (required if ssdiStatus is 'receiving') */
  ssdiEffectiveDate?: Date;
}

/**
 * Result of Medicare age-based eligibility evaluation
 */
export interface MedicareAgeResult {
  /** Whether patient is eligible for Medicare on date of service */
  isEligible: boolean;
  /** Reason for eligibility determination */
  eligibilityReason: string;
  /** Effective date of Medicare eligibility */
  effectiveDate: Date;
  /** Confidence level of eligibility determination (0-100) */
  confidence: number;
  /** Recommended actions based on eligibility status */
  actions: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Months of dialysis required for ESRD Medicare eligibility */
const ESRD_WAITING_MONTHS = 3;

/** Months of SSDI required before Medicare eligibility */
const SSDI_WAITING_MONTHS = 24;

/** Standard Medicare eligibility age */
const MEDICARE_ELIGIBILITY_AGE = 65;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate age in years at a specific date
 */
function calculateAgeAtDate(dateOfBirth: Date, targetDate: Date): number {
  const birthDate = new Date(dateOfBirth);
  const checkDate = new Date(targetDate);

  let age = checkDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = checkDate.getMonth() - birthDate.getMonth();
  const dayDiff = checkDate.getDate() - birthDate.getDate();

  // Adjust age if birthday hasn't occurred yet in the target year
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age--;
  }

  return age;
}

/**
 * Calculate the first day of the month when patient turns 65
 */
function calculateAge65EligibilityDate(dateOfBirth: Date): Date {
  const birthDate = new Date(dateOfBirth);
  // Medicare eligibility begins the first day of the month the person turns 65
  const eligibilityDate = new Date(
    birthDate.getFullYear() + MEDICARE_ELIGIBILITY_AGE,
    birthDate.getMonth(),
    1
  );
  return eligibilityDate;
}

/**
 * Calculate ESRD eligibility date (3 months after dialysis start)
 */
function calculateESRDEligibilityDate(dialysisStartDate: Date): Date {
  const startDate = new Date(dialysisStartDate);
  // ESRD eligibility begins 3 months after dialysis starts
  return new Date(
    startDate.getFullYear(),
    startDate.getMonth() + ESRD_WAITING_MONTHS,
    1
  );
}

/**
 * Calculate SSDI-based Medicare eligibility date (24 months after SSDI)
 */
function calculateSSIDEligibilityDate(ssdiEffectiveDate: Date): Date {
  const startDate = new Date(ssdiEffectiveDate);
  // Medicare eligibility begins 24 months after SSDI entitlement
  return new Date(
    startDate.getFullYear(),
    startDate.getMonth() + SSDI_WAITING_MONTHS,
    1
  );
}

/**
 * Calculate months between two dates
 */
function monthsBetweenDates(startDate: Date, endDate: Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const months = (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());

  return months;
}

// ============================================================================
// MAIN ENGINE FUNCTION
// ============================================================================

/**
 * Evaluate Medicare eligibility based on age and special circumstances
 */
export function evaluateMedicareAgeEligibility(input: MedicareAgeInput): MedicareAgeResult {
  const actions: string[] = [];
  const dateOfService = new Date(input.dateOfService);
  const dateOfBirth = new Date(input.dateOfBirth);

  const ageAtService = calculateAgeAtDate(dateOfBirth, dateOfService);

  // Check ALS eligibility first (immediate eligibility upon SSDI)
  if (input.hasALS && input.ssdiStatus === 'receiving' && input.ssdiEffectiveDate) {
    const ssdiDate = new Date(input.ssdiEffectiveDate);
    // ALS patients are eligible immediately upon SSDI - no waiting period
    if (dateOfService >= ssdiDate) {
      actions.push('Bill Medicare Part A/B for covered services');
      actions.push('Verify Medicare enrollment is active');
      actions.push('Document ALS diagnosis for coverage justification');

      return {
        isEligible: true,
        eligibilityReason: 'ALS diagnosis with SSDI - no waiting period required',
        effectiveDate: ssdiDate,
        confidence: 95,
        actions
      };
    } else {
      actions.push('SSDI effective date is after date of service');
      actions.push('Verify SSDI effective date and resubmit if applicable');

      return {
        isEligible: false,
        eligibilityReason: 'ALS with SSDI but date of service precedes SSDI effective date',
        effectiveDate: ssdiDate,
        confidence: 90,
        actions
      };
    }
  }

  // Check ALS pending SSDI
  if (input.hasALS && input.ssdiStatus === 'pending') {
    actions.push('Monitor SSDI application status - ALS qualifies for expedited processing');
    actions.push('Medicare eligibility will begin immediately upon SSDI approval');
    actions.push('Consider Compassionate Allowances program for faster SSDI approval');
    actions.push('Hold claim pending SSDI determination');

    return {
      isEligible: false,
      eligibilityReason: 'ALS diagnosis with SSDI pending - will be eligible immediately upon SSDI approval',
      effectiveDate: dateOfService,
      confidence: 75,
      actions
    };
  }

  // Check age-based eligibility (65+) BEFORE ESRD
  // A person 65+ is always eligible for Medicare regardless of ESRD waiting period
  if (ageAtService >= MEDICARE_ELIGIBILITY_AGE) {
    const eligibilityDate = calculateAge65EligibilityDate(dateOfBirth);

    actions.push('Bill Medicare Part A for inpatient hospital services');
    actions.push('Bill Medicare Part B for outpatient/professional services');
    actions.push('Verify Medicare enrollment and coverage parts');
    actions.push('Check for Medicare Advantage plan assignment');

    return {
      isEligible: true,
      eligibilityReason: `Age ${ageAtService} - meets standard Medicare eligibility requirement (65+)`,
      effectiveDate: eligibilityDate,
      confidence: 98,
      actions
    };
  }

  // Check ESRD eligibility (3-month waiting period) for patients under 65
  if (input.hasESRD && input.dialysisStartDate) {
    const dialysisStart = new Date(input.dialysisStartDate);
    const esrdEligibilityDate = calculateESRDEligibilityDate(dialysisStart);
    const monthsOnDialysis = monthsBetweenDates(dialysisStart, dateOfService);

    if (dateOfService >= esrdEligibilityDate) {
      actions.push('Bill Medicare Part A/B for ESRD-related and other covered services');
      actions.push('Verify ESRD Medicare enrollment is active');
      actions.push('Document dialysis start date for coverage verification');
      actions.push('Ensure ESRD beneficiary notification was filed (CMS-2728)');

      return {
        isEligible: true,
        eligibilityReason: `ESRD patient - ${monthsOnDialysis} months since dialysis initiation (3+ months required)`,
        effectiveDate: esrdEligibilityDate,
        confidence: 92,
        actions
      };
    } else {
      const monthsRemaining = ESRD_WAITING_MONTHS - monthsOnDialysis;
      actions.push(`Patient ${monthsRemaining} month(s) away from ESRD Medicare eligibility`);
      actions.push('File CMS-2728 ESRD beneficiary notification if not already done');
      actions.push('Consider alternative coverage for current encounter');
      actions.push('Set reminder for Medicare billing once eligible');

      return {
        isEligible: false,
        eligibilityReason: `ESRD patient - only ${monthsOnDialysis} month(s) since dialysis start (3 months required)`,
        effectiveDate: esrdEligibilityDate,
        confidence: 88,
        actions
      };
    }
  }

  // Check SSDI-based eligibility (24-month waiting period)
  if (input.ssdiStatus === 'receiving' && input.ssdiEffectiveDate) {
    const ssdiDate = new Date(input.ssdiEffectiveDate);
    const ssdiEligibilityDate = calculateSSIDEligibilityDate(ssdiDate);
    const monthsOnSSID = monthsBetweenDates(ssdiDate, dateOfService);

    if (dateOfService >= ssdiEligibilityDate) {
      actions.push('Bill Medicare Part A/B for covered services');
      actions.push('Verify Medicare enrollment is active');
      actions.push('Document SSDI effective date for coverage verification');

      return {
        isEligible: true,
        eligibilityReason: `SSDI recipient for ${monthsOnSSID} months - 24-month waiting period complete`,
        effectiveDate: ssdiEligibilityDate,
        confidence: 93,
        actions
      };
    } else {
      const monthsRemaining = SSDI_WAITING_MONTHS - monthsOnSSID;
      actions.push(`Patient ${monthsRemaining} month(s) away from Medicare eligibility`);
      actions.push('Consider Medicaid or other coverage for current encounter');
      actions.push('Set reminder for Medicare enrollment period');
      actions.push('Verify patient is enrolled in Medicare Part A when eligible');

      return {
        isEligible: false,
        eligibilityReason: `SSDI recipient for ${monthsOnSSID} month(s) - ${monthsRemaining} months remaining in 24-month waiting period`,
        effectiveDate: ssdiEligibilityDate,
        confidence: 90,
        actions
      };
    }
  }

  // Check SSDI pending
  if (input.ssdiStatus === 'pending') {
    const estimatedApprovalDate = new Date(dateOfService);
    estimatedApprovalDate.setMonth(estimatedApprovalDate.getMonth() + 6);
    const estimatedEligibilityDate = calculateSSIDEligibilityDate(estimatedApprovalDate);

    actions.push('Monitor SSDI application status');
    actions.push('Medicare eligibility begins 24 months after SSDI approval');
    actions.push('Consider Medicaid coverage while SSDI pending');
    actions.push('Document disability for SSDI case support');

    return {
      isEligible: false,
      eligibilityReason: 'SSDI pending - if approved, Medicare eligibility begins after 24-month waiting period',
      effectiveDate: estimatedEligibilityDate,
      confidence: 50,
      actions
    };
  }

  // Not eligible - under 65 with no qualifying condition
  const age65Date = calculateAge65EligibilityDate(dateOfBirth);
  const yearsUntil65 = MEDICARE_ELIGIBILITY_AGE - ageAtService;

  actions.push('Patient does not currently qualify for Medicare');
  actions.push('Evaluate for Medicaid eligibility');
  actions.push('Screen for disability conditions that may qualify for SSDI');
  actions.push('Check for ESRD or ALS diagnoses that may provide earlier eligibility');
  if (yearsUntil65 <= 5) {
    actions.push(`Patient will qualify for age-based Medicare in approximately ${yearsUntil65} year(s)`);
  }

  return {
    isEligible: false,
    eligibilityReason: `Age ${ageAtService} - does not meet Medicare eligibility requirements (no SSDI, ESRD, or ALS)`,
    effectiveDate: age65Date,
    confidence: 95,
    actions
  };
}
