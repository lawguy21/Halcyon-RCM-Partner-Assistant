/**
 * Medicare Age-Based Eligibility Engine Tests
 *
 * Tests Medicare eligibility based on age, ESRD, ALS, and SSDI
 */

import {
  evaluateMedicareAgeEligibility,
  MedicareAgeInput,
} from '../engines/medicare-age';

// Helper function to create dates relative to today
function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function monthsAgo(months: number): Date {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date;
}

function yearsAgo(years: number): Date {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  return date;
}

function createDOB(age: number): Date {
  const dob = new Date();
  dob.setFullYear(dob.getFullYear() - age);
  return dob;
}

describe('Medicare Age-Based Eligibility Engine', () => {
  // ============================================================================
  // AGE 65+ ELIGIBILITY
  // ============================================================================

  describe('Age 65+ Eligibility', () => {
    it('should be eligible when patient is exactly 65 years old', () => {
      const input: MedicareAgeInput = {
        dateOfBirth: createDOB(65),
        dateOfService: new Date(),
      };
      const result = evaluateMedicareAgeEligibility(input);

      expect(result.isEligible).toBe(true);
      expect(result.eligibilityReason).toContain('65');
      expect(result.confidence).toBeGreaterThanOrEqual(95);
    });

    it('should be eligible when patient is 70 years old', () => {
      const input: MedicareAgeInput = {
        dateOfBirth: createDOB(70),
        dateOfService: new Date(),
      };
      const result = evaluateMedicareAgeEligibility(input);

      expect(result.isEligible).toBe(true);
      expect(result.eligibilityReason).toContain('Age 70');
    });

    it('should be eligible when patient is 85 years old', () => {
      const input: MedicareAgeInput = {
        dateOfBirth: createDOB(85),
        dateOfService: new Date(),
      };
      const result = evaluateMedicareAgeEligibility(input);

      expect(result.isEligible).toBe(true);
      expect(result.confidence).toBe(98);
    });

    it('should NOT be eligible when patient is 64 years old without other qualifications', () => {
      const input: MedicareAgeInput = {
        dateOfBirth: createDOB(64),
        dateOfService: new Date(),
      };
      const result = evaluateMedicareAgeEligibility(input);

      expect(result.isEligible).toBe(false);
      expect(result.eligibilityReason).toContain('does not meet');
    });

    it('should NOT be eligible when patient is 50 years old without other qualifications', () => {
      const input: MedicareAgeInput = {
        dateOfBirth: createDOB(50),
        dateOfService: new Date(),
      };
      const result = evaluateMedicareAgeEligibility(input);

      expect(result.isEligible).toBe(false);
      expect(result.actions).toContain('Patient does not currently qualify for Medicare');
    });

    it('should calculate correct effective date for age-based eligibility', () => {
      // Patient born on specific date
      const dob = new Date(1959, 5, 15); // June 15, 1959 - turns 65 in June 2024
      const dos = new Date(2024, 8, 1); // September 1, 2024

      const input: MedicareAgeInput = {
        dateOfBirth: dob,
        dateOfService: dos,
      };
      const result = evaluateMedicareAgeEligibility(input);

      expect(result.isEligible).toBe(true);
      // Effective date should be first day of birth month when turning 65
      expect(result.effectiveDate.getMonth()).toBe(5); // June
      expect(result.effectiveDate.getDate()).toBe(1);
    });

    it('should include Medicare Part A/B billing actions for eligible patients', () => {
      const input: MedicareAgeInput = {
        dateOfBirth: createDOB(67),
        dateOfService: new Date(),
      };
      const result = evaluateMedicareAgeEligibility(input);

      expect(result.actions.some(a => a.includes('Part A'))).toBe(true);
      expect(result.actions.some(a => a.includes('Part B'))).toBe(true);
    });
  });

  // ============================================================================
  // ESRD ELIGIBILITY
  // ============================================================================

  describe('ESRD Eligibility', () => {
    it('should be eligible after 3 months of dialysis', () => {
      const input: MedicareAgeInput = {
        dateOfBirth: createDOB(45),
        dateOfService: new Date(),
        hasESRD: true,
        dialysisStartDate: monthsAgo(4),
      };
      const result = evaluateMedicareAgeEligibility(input);

      expect(result.isEligible).toBe(true);
      expect(result.eligibilityReason).toContain('ESRD');
      expect(result.eligibilityReason).toContain('months');
    });

    it('should be eligible exactly at 3 months of dialysis', () => {
      const input: MedicareAgeInput = {
        dateOfBirth: createDOB(55),
        dateOfService: new Date(),
        hasESRD: true,
        dialysisStartDate: monthsAgo(3),
      };
      const result = evaluateMedicareAgeEligibility(input);

      expect(result.isEligible).toBe(true);
      expect(result.eligibilityReason).toContain('ESRD');
    });

    it('should NOT be eligible before 3 months of dialysis', () => {
      const input: MedicareAgeInput = {
        dateOfBirth: createDOB(45),
        dateOfService: new Date(),
        hasESRD: true,
        dialysisStartDate: monthsAgo(2),
      };
      const result = evaluateMedicareAgeEligibility(input);

      expect(result.isEligible).toBe(false);
      expect(result.eligibilityReason).toContain('ESRD');
      expect(result.eligibilityReason).toContain('month(s) since dialysis');
    });

    it('should NOT be eligible with only 1 month of dialysis', () => {
      const input: MedicareAgeInput = {
        dateOfBirth: createDOB(40),
        dateOfService: new Date(),
        hasESRD: true,
        dialysisStartDate: monthsAgo(1),
      };
      const result = evaluateMedicareAgeEligibility(input);

      expect(result.isEligible).toBe(false);
      expect(result.actions.some(a => a.includes('away from ESRD Medicare eligibility'))).toBe(true);
    });

    it('should calculate correct ESRD eligibility effective date', () => {
      const dialysisStart = new Date(2024, 0, 15); // January 15, 2024
      const dos = new Date(2024, 6, 1); // July 1, 2024

      const input: MedicareAgeInput = {
        dateOfBirth: createDOB(50),
        dateOfService: dos,
        hasESRD: true,
        dialysisStartDate: dialysisStart,
      };
      const result = evaluateMedicareAgeEligibility(input);

      expect(result.isEligible).toBe(true);
      // Effective date should be first of month 3 months after dialysis start
      expect(result.effectiveDate.getMonth()).toBe(3); // April
      expect(result.effectiveDate.getDate()).toBe(1);
    });

    it('should have high confidence for ESRD eligibility', () => {
      const input: MedicareAgeInput = {
        dateOfBirth: createDOB(48),
        dateOfService: new Date(),
        hasESRD: true,
        dialysisStartDate: monthsAgo(6),
      };
      const result = evaluateMedicareAgeEligibility(input);

      expect(result.confidence).toBeGreaterThanOrEqual(90);
    });

    it('should recommend CMS-2728 filing for ESRD patients', () => {
      const input: MedicareAgeInput = {
        dateOfBirth: createDOB(55),
        dateOfService: new Date(),
        hasESRD: true,
        dialysisStartDate: monthsAgo(4),
      };
      const result = evaluateMedicareAgeEligibility(input);

      expect(result.actions.some(a => a.includes('CMS-2728'))).toBe(true);
    });
  });

  // ============================================================================
  // ALS ELIGIBILITY
  // ============================================================================

  describe('ALS Eligibility', () => {
    it('should be eligible immediately with ALS and SSDI', () => {
      const input: MedicareAgeInput = {
        dateOfBirth: createDOB(52),
        dateOfService: new Date(),
        hasALS: true,
        ssdiStatus: 'receiving',
        ssdiEffectiveDate: monthsAgo(1),
      };
      const result = evaluateMedicareAgeEligibility(input);

      expect(result.isEligible).toBe(true);
      expect(result.eligibilityReason).toContain('ALS');
      expect(result.eligibilityReason).toContain('no waiting period');
    });

    it('should be eligible same day as SSDI starts for ALS', () => {
      const today = new Date();
      const input: MedicareAgeInput = {
        dateOfBirth: createDOB(48),
        dateOfService: today,
        hasALS: true,
        ssdiStatus: 'receiving',
        ssdiEffectiveDate: today,
      };
      const result = evaluateMedicareAgeEligibility(input);

      expect(result.isEligible).toBe(true);
      expect(result.confidence).toBe(95);
    });

    it('should NOT be eligible if DOS is before SSDI effective date', () => {
      const input: MedicareAgeInput = {
        dateOfBirth: createDOB(50),
        dateOfService: monthsAgo(2),
        hasALS: true,
        ssdiStatus: 'receiving',
        ssdiEffectiveDate: monthsAgo(1),
      };
      const result = evaluateMedicareAgeEligibility(input);

      expect(result.isEligible).toBe(false);
      expect(result.eligibilityReason).toContain('precedes SSDI effective date');
    });

    it('should NOT be eligible with ALS but pending SSDI', () => {
      const input: MedicareAgeInput = {
        dateOfBirth: createDOB(55),
        dateOfService: new Date(),
        hasALS: true,
        ssdiStatus: 'pending',
      };
      const result = evaluateMedicareAgeEligibility(input);

      expect(result.isEligible).toBe(false);
      expect(result.eligibilityReason).toContain('SSDI pending');
      expect(result.actions.some(a => a.includes('Monitor SSDI application'))).toBe(true);
    });

    it('should recommend Compassionate Allowances for ALS with pending SSDI', () => {
      const input: MedicareAgeInput = {
        dateOfBirth: createDOB(45),
        dateOfService: new Date(),
        hasALS: true,
        ssdiStatus: 'pending',
      };
      const result = evaluateMedicareAgeEligibility(input);

      expect(result.actions.some(a => a.includes('Compassionate Allowances'))).toBe(true);
    });

    it('should have high confidence for confirmed ALS with SSDI', () => {
      const input: MedicareAgeInput = {
        dateOfBirth: createDOB(50),
        dateOfService: new Date(),
        hasALS: true,
        ssdiStatus: 'receiving',
        ssdiEffectiveDate: monthsAgo(6),
      };
      const result = evaluateMedicareAgeEligibility(input);

      expect(result.confidence).toBe(95);
    });

    it('should include ALS documentation action', () => {
      const input: MedicareAgeInput = {
        dateOfBirth: createDOB(52),
        dateOfService: new Date(),
        hasALS: true,
        ssdiStatus: 'receiving',
        ssdiEffectiveDate: monthsAgo(3),
      };
      const result = evaluateMedicareAgeEligibility(input);

      expect(result.actions.some(a => a.includes('Document ALS diagnosis'))).toBe(true);
    });
  });

  // ============================================================================
  // SSDI ELIGIBILITY (24-MONTH WAITING PERIOD)
  // ============================================================================

  describe('SSDI Eligibility (24-month waiting period)', () => {
    it('should be eligible after 24 months of SSDI', () => {
      const input: MedicareAgeInput = {
        dateOfBirth: createDOB(55),
        dateOfService: new Date(),
        ssdiStatus: 'receiving',
        ssdiEffectiveDate: monthsAgo(25),
      };
      const result = evaluateMedicareAgeEligibility(input);

      expect(result.isEligible).toBe(true);
      expect(result.eligibilityReason).toContain('SSDI');
      expect(result.eligibilityReason).toContain('24-month waiting period complete');
    });

    it('should be eligible exactly at 24 months of SSDI', () => {
      const input: MedicareAgeInput = {
        dateOfBirth: createDOB(50),
        dateOfService: new Date(),
        ssdiStatus: 'receiving',
        ssdiEffectiveDate: monthsAgo(24),
      };
      const result = evaluateMedicareAgeEligibility(input);

      expect(result.isEligible).toBe(true);
    });

    it('should NOT be eligible before 24 months of SSDI', () => {
      const input: MedicareAgeInput = {
        dateOfBirth: createDOB(45),
        dateOfService: new Date(),
        ssdiStatus: 'receiving',
        ssdiEffectiveDate: monthsAgo(12),
      };
      const result = evaluateMedicareAgeEligibility(input);

      expect(result.isEligible).toBe(false);
      expect(result.eligibilityReason).toContain('months remaining in 24-month waiting period');
    });

    it('should NOT be eligible at 23 months of SSDI', () => {
      const input: MedicareAgeInput = {
        dateOfBirth: createDOB(52),
        dateOfService: new Date(),
        ssdiStatus: 'receiving',
        ssdiEffectiveDate: monthsAgo(23),
      };
      const result = evaluateMedicareAgeEligibility(input);

      expect(result.isEligible).toBe(false);
      expect(result.eligibilityReason).toContain('1 months remaining');
    });

    it('should calculate correct SSDI Medicare effective date', () => {
      const ssdiStart = new Date(2022, 0, 1); // January 1, 2022
      const dos = new Date(2024, 6, 1); // July 1, 2024 (30 months later)

      const input: MedicareAgeInput = {
        dateOfBirth: createDOB(50),
        dateOfService: dos,
        ssdiStatus: 'receiving',
        ssdiEffectiveDate: ssdiStart,
      };
      const result = evaluateMedicareAgeEligibility(input);

      expect(result.isEligible).toBe(true);
      // Effective date should be first of month 24 months after SSDI start
      expect(result.effectiveDate.getMonth()).toBe(0); // January
      expect(result.effectiveDate.getFullYear()).toBe(2024);
    });

    it('should NOT be eligible with pending SSDI', () => {
      const input: MedicareAgeInput = {
        dateOfBirth: createDOB(48),
        dateOfService: new Date(),
        ssdiStatus: 'pending',
      };
      const result = evaluateMedicareAgeEligibility(input);

      expect(result.isEligible).toBe(false);
      expect(result.eligibilityReason).toContain('SSDI pending');
      expect(result.confidence).toBe(50);
    });

    it('should recommend Medicaid for SSDI recipients still in waiting period', () => {
      const input: MedicareAgeInput = {
        dateOfBirth: createDOB(50),
        dateOfService: new Date(),
        ssdiStatus: 'receiving',
        ssdiEffectiveDate: monthsAgo(12),
      };
      const result = evaluateMedicareAgeEligibility(input);

      expect(result.actions.some(a => a.toLowerCase().includes('medicaid'))).toBe(true);
    });

    it('should show months remaining for pending SSDI patients', () => {
      const input: MedicareAgeInput = {
        dateOfBirth: createDOB(55),
        dateOfService: new Date(),
        ssdiStatus: 'receiving',
        ssdiEffectiveDate: monthsAgo(6),
      };
      const result = evaluateMedicareAgeEligibility(input);

      expect(result.isEligible).toBe(false);
      expect(result.actions.some(a => a.includes('away from Medicare eligibility'))).toBe(true);
    });
  });

  // ============================================================================
  // COMBINED ELIGIBILITY SCENARIOS
  // ============================================================================

  describe('Combined Eligibility Scenarios', () => {
    it('should prioritize ALS over age eligibility for younger patients', () => {
      const input: MedicareAgeInput = {
        dateOfBirth: createDOB(45),
        dateOfService: new Date(),
        hasALS: true,
        ssdiStatus: 'receiving',
        ssdiEffectiveDate: monthsAgo(1),
      };
      const result = evaluateMedicareAgeEligibility(input);

      expect(result.isEligible).toBe(true);
      expect(result.eligibilityReason).toContain('ALS');
    });

    it('should be eligible via age even with ESRD not yet qualifying', () => {
      const input: MedicareAgeInput = {
        dateOfBirth: createDOB(68),
        dateOfService: new Date(),
        hasESRD: true,
        dialysisStartDate: monthsAgo(1),
      };
      const result = evaluateMedicareAgeEligibility(input);

      expect(result.isEligible).toBe(true);
      expect(result.eligibilityReason).toContain('Age 68');
    });

    it('should prioritize ESRD for patient under 65 with qualifying dialysis', () => {
      const input: MedicareAgeInput = {
        dateOfBirth: createDOB(55),
        dateOfService: new Date(),
        hasESRD: true,
        dialysisStartDate: monthsAgo(6),
        ssdiStatus: 'receiving',
        ssdiEffectiveDate: monthsAgo(30),
      };
      const result = evaluateMedicareAgeEligibility(input);

      expect(result.isEligible).toBe(true);
      expect(result.eligibilityReason).toContain('ESRD');
    });

    it('should handle patient with no qualifying conditions nearing 65', () => {
      const input: MedicareAgeInput = {
        dateOfBirth: createDOB(63),
        dateOfService: new Date(),
      };
      const result = evaluateMedicareAgeEligibility(input);

      expect(result.isEligible).toBe(false);
      expect(result.actions.some(a => a.includes('will qualify for age-based Medicare in approximately 2 year'))).toBe(true);
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle very old patients', () => {
      const input: MedicareAgeInput = {
        dateOfBirth: createDOB(100),
        dateOfService: new Date(),
      };
      const result = evaluateMedicareAgeEligibility(input);

      expect(result.isEligible).toBe(true);
      expect(result.eligibilityReason).toContain('Age 100');
    });

    it('should handle very young patients', () => {
      const input: MedicareAgeInput = {
        dateOfBirth: createDOB(18),
        dateOfService: new Date(),
      };
      const result = evaluateMedicareAgeEligibility(input);

      expect(result.isEligible).toBe(false);
      expect(result.confidence).toBeGreaterThanOrEqual(90);
    });

    it('should handle ESRD without dialysis start date', () => {
      const input: MedicareAgeInput = {
        dateOfBirth: createDOB(50),
        dateOfService: new Date(),
        hasESRD: true,
        // No dialysis start date
      };
      const result = evaluateMedicareAgeEligibility(input);

      // Should fall through to other eligibility checks
      expect(result.isEligible).toBe(false);
    });

    it('should handle SSDI receiving without effective date', () => {
      const input: MedicareAgeInput = {
        dateOfBirth: createDOB(50),
        dateOfService: new Date(),
        ssdiStatus: 'receiving',
        // No effective date
      };
      const result = evaluateMedicareAgeEligibility(input);

      expect(result.isEligible).toBe(false);
    });

    it('should handle date of service in the past', () => {
      const input: MedicareAgeInput = {
        dateOfBirth: createDOB(67),
        dateOfService: monthsAgo(6),
      };
      const result = evaluateMedicareAgeEligibility(input);

      expect(result.isEligible).toBe(true);
    });

    it('should handle patient who just turned 65 before DOS', () => {
      // Patient born exactly 65 years and 1 day ago
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - 65);
      dob.setDate(dob.getDate() - 1);

      const input: MedicareAgeInput = {
        dateOfBirth: dob,
        dateOfService: new Date(),
      };
      const result = evaluateMedicareAgeEligibility(input);

      expect(result.isEligible).toBe(true);
    });

    it('should handle patient who turns 65 after DOS', () => {
      // Patient born 64 years and 364 days ago (turns 65 tomorrow)
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - 65);
      dob.setDate(dob.getDate() + 1);

      const input: MedicareAgeInput = {
        dateOfBirth: dob,
        dateOfService: new Date(),
      };
      const result = evaluateMedicareAgeEligibility(input);

      expect(result.isEligible).toBe(false);
    });
  });

  // ============================================================================
  // ACTIONS AND RECOMMENDATIONS
  // ============================================================================

  describe('Actions and Recommendations', () => {
    it('should recommend screening for disability when not eligible', () => {
      const input: MedicareAgeInput = {
        dateOfBirth: createDOB(50),
        dateOfService: new Date(),
      };
      const result = evaluateMedicareAgeEligibility(input);

      expect(result.actions.some(a => a.toLowerCase().includes('disability'))).toBe(true);
    });

    it('should recommend Medicaid evaluation for ineligible patients', () => {
      const input: MedicareAgeInput = {
        dateOfBirth: createDOB(45),
        dateOfService: new Date(),
      };
      const result = evaluateMedicareAgeEligibility(input);

      expect(result.actions.some(a => a.toLowerCase().includes('medicaid'))).toBe(true);
    });

    it('should recommend checking for ESRD/ALS when not eligible', () => {
      const input: MedicareAgeInput = {
        dateOfBirth: createDOB(50),
        dateOfService: new Date(),
      };
      const result = evaluateMedicareAgeEligibility(input);

      expect(result.actions.some(a => a.includes('ESRD') || a.includes('ALS'))).toBe(true);
    });

    it('should recommend Medicare enrollment verification for eligible patients', () => {
      const input: MedicareAgeInput = {
        dateOfBirth: createDOB(70),
        dateOfService: new Date(),
      };
      const result = evaluateMedicareAgeEligibility(input);

      expect(result.actions.some(a => a.toLowerCase().includes('verify'))).toBe(true);
    });

    it('should recommend checking for Medicare Advantage for age-eligible patients', () => {
      const input: MedicareAgeInput = {
        dateOfBirth: createDOB(68),
        dateOfService: new Date(),
      };
      const result = evaluateMedicareAgeEligibility(input);

      expect(result.actions.some(a => a.includes('Medicare Advantage'))).toBe(true);
    });
  });
});
