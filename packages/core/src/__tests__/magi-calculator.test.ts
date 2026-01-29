/**
 * MAGI Calculator Engine Tests
 *
 * Tests Modified Adjusted Gross Income calculations for Medicaid eligibility
 */

import {
  calculateMAGI,
  quickMAGICheck,
  getMonthlyIncomeLimit,
  getFPL2024Thresholds,
  calculateFPLThreshold,
  isExpansionState,
  getStateThreshold,
  calculateIncomeDisregard,
  FPL_2024,
  FPL_2024_PER_ADDITIONAL,
  EXPANSION_THRESHOLD_PERCENT,
  BASE_THRESHOLD_PERCENT,
  INCOME_DISREGARD_PERCENT,
  MEDICAID_EXPANSION_STATES,
  MAGICalculatorInput,
} from '../engines/magi-calculator';

describe('MAGI Calculator Engine', () => {
  // ============================================================================
  // INCOME CALCULATIONS WITH 5% DISREGARD
  // ============================================================================

  describe('Income Calculations with 5% Disregard', () => {
    it('should calculate MAGI from gross income only', () => {
      const input: MAGICalculatorInput = {
        income: { grossIncome: 20000 },
        household: { householdSize: 1, stateCode: 'CA' },
      };
      const result = calculateMAGI(input);

      expect(result.magi).toBe(20000);
      expect(result.breakdown.totalExcludedIncome).toBe(0);
    });

    it('should exclude child support from MAGI', () => {
      const input: MAGICalculatorInput = {
        income: {
          grossIncome: 25000,
          childSupportReceived: 5000,
        },
        household: { householdSize: 2, stateCode: 'CA' },
      };
      const result = calculateMAGI(input);

      expect(result.magi).toBe(20000);
      expect(result.breakdown.totalExcludedIncome).toBe(5000);
      expect(result.breakdown.excludedItems).toHaveLength(1);
      expect(result.breakdown.excludedItems[0].type).toBe('child_support_received');
    });

    it('should exclude SSI benefits from MAGI', () => {
      const input: MAGICalculatorInput = {
        income: {
          grossIncome: 18000,
          ssiBenefits: 8000,
        },
        household: { householdSize: 1, stateCode: 'NY' },
      };
      const result = calculateMAGI(input);

      expect(result.magi).toBe(10000);
      expect(result.breakdown.excludedItems.find(e => e.type === 'ssi_benefits')).toBeDefined();
    });

    it('should exclude workers compensation from MAGI', () => {
      const input: MAGICalculatorInput = {
        income: {
          grossIncome: 30000,
          workersCompensation: 12000,
        },
        household: { householdSize: 1, stateCode: 'CA' },
      };
      const result = calculateMAGI(input);

      expect(result.magi).toBe(18000);
      expect(result.breakdown.excludedItems.find(e => e.type === 'workers_compensation')).toBeDefined();
    });

    it('should exclude veterans benefits from MAGI', () => {
      const input: MAGICalculatorInput = {
        income: {
          grossIncome: 35000,
          veteransBenefits: 15000,
        },
        household: { householdSize: 2, stateCode: 'TX' },
      };
      const result = calculateMAGI(input);

      expect(result.magi).toBe(20000);
      expect(result.breakdown.excludedItems.find(e => e.type === 'veterans_benefits')).toBeDefined();
    });

    it('should exclude multiple income types cumulatively', () => {
      const input: MAGICalculatorInput = {
        income: {
          grossIncome: 50000,
          childSupportReceived: 6000,
          ssiBenefits: 9000,
          workersCompensation: 5000,
          veteransBenefits: 10000,
          otherExcludedIncome: 2000,
        },
        household: { householdSize: 4, stateCode: 'CA' },
      };
      const result = calculateMAGI(input);

      expect(result.magi).toBe(18000); // 50000 - 6000 - 9000 - 5000 - 10000 - 2000
      expect(result.breakdown.totalExcludedIncome).toBe(32000);
      expect(result.breakdown.excludedItems).toHaveLength(5);
    });

    it('should calculate FPL percentage correctly', () => {
      const input: MAGICalculatorInput = {
        income: { grossIncome: FPL_2024[1] }, // Exactly 100% FPL for household of 1
        household: { householdSize: 1, stateCode: 'CA' },
      };
      const result = calculateMAGI(input);

      expect(result.fplPercentage).toBe(100);
    });

    it('should calculate income disregard amount', () => {
      const fplThreshold = calculateFPLThreshold(1);
      const disregard = calculateIncomeDisregard(fplThreshold);

      expect(disregard).toBe(Math.round(fplThreshold * 0.05));
    });

    it('should recognize income between 133-138% FPL as eligible with disregard', () => {
      // Calculate income at exactly 135% FPL for household of 1
      const fpl = FPL_2024[1];
      const incomeAt135 = Math.round(fpl * 1.35);

      const input: MAGICalculatorInput = {
        income: { grossIncome: incomeAt135 },
        household: { householdSize: 1, stateCode: 'CA' },
      };
      const result = calculateMAGI(input);

      expect(result.isIncomeEligible).toBe(true);
      expect(result.fplPercentage).toBeGreaterThan(133);
      expect(result.fplPercentage).toBeLessThanOrEqual(138);
      expect(result.notes.some(n => n.includes('5% income disregard'))).toBe(true);
    });
  });

  // ============================================================================
  // DIFFERENT HOUSEHOLD SIZES
  // ============================================================================

  describe('Different Household Sizes', () => {
    it('should use correct FPL for household size 1', () => {
      const result = calculateFPLThreshold(1);
      expect(result).toBe(FPL_2024[1]);
    });

    it('should use correct FPL for household size 4', () => {
      const result = calculateFPLThreshold(4);
      expect(result).toBe(FPL_2024[4]);
    });

    it('should use correct FPL for household size 8', () => {
      const result = calculateFPLThreshold(8);
      expect(result).toBe(FPL_2024[8]);
    });

    it('should calculate FPL for household size > 8 using per-additional amount', () => {
      const result = calculateFPLThreshold(10);
      const expected = FPL_2024[8] + (2 * FPL_2024_PER_ADDITIONAL);
      expect(result).toBe(expected);
    });

    it('should calculate FPL for very large household', () => {
      const result = calculateFPLThreshold(15);
      const expected = FPL_2024[8] + (7 * FPL_2024_PER_ADDITIONAL);
      expect(result).toBe(expected);
    });

    it('should return all FPL thresholds for sizes 1-8', () => {
      const thresholds = getFPL2024Thresholds();

      expect(Object.keys(thresholds)).toHaveLength(8);
      expect(thresholds[1]).toBe(FPL_2024[1]);
      expect(thresholds[8]).toBe(FPL_2024[8]);
    });

    it('should calculate different income limits for different household sizes', () => {
      const limit1 = getMonthlyIncomeLimit(1, 'CA');
      const limit4 = getMonthlyIncomeLimit(4, 'CA');

      expect(limit4).toBeGreaterThan(limit1);
    });

    it('should increase eligibility with larger household size at same income', () => {
      const income = 30000;

      const result1 = calculateMAGI({
        income: { grossIncome: income },
        household: { householdSize: 1, stateCode: 'CA' },
      });

      const result4 = calculateMAGI({
        income: { grossIncome: income },
        household: { householdSize: 4, stateCode: 'CA' },
      });

      expect(result4.fplPercentage).toBeLessThan(result1.fplPercentage);
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('Edge Cases', () => {
    describe('Zero Income', () => {
      it('should handle zero gross income', () => {
        const input: MAGICalculatorInput = {
          income: { grossIncome: 0 },
          household: { householdSize: 1, stateCode: 'CA' },
        };
        const result = calculateMAGI(input);

        expect(result.magi).toBe(0);
        expect(result.fplPercentage).toBe(0);
        expect(result.isIncomeEligible).toBe(true);
      });

      it('should handle zero gross income with excluded income', () => {
        const input: MAGICalculatorInput = {
          income: {
            grossIncome: 0,
            ssiBenefits: 10000,
          },
          household: { householdSize: 1, stateCode: 'NY' },
        };
        const result = calculateMAGI(input);

        expect(result.magi).toBe(0); // MAGI can't go negative
        expect(result.isIncomeEligible).toBe(true);
      });
    });

    describe('High Income', () => {
      it('should handle high income above all thresholds', () => {
        const input: MAGICalculatorInput = {
          income: { grossIncome: 500000 },
          household: { householdSize: 1, stateCode: 'CA' },
        };
        const result = calculateMAGI(input);

        expect(result.isIncomeEligible).toBe(false);
        expect(result.fplPercentage).toBeGreaterThan(1000);
        expect(result.marginToThreshold).toBeGreaterThan(0);
      });

      it('should handle very high income (millionaires)', () => {
        const input: MAGICalculatorInput = {
          income: { grossIncome: 1000000 },
          household: { householdSize: 8, stateCode: 'NY' },
        };
        const result = calculateMAGI(input);

        expect(result).toBeDefined();
        expect(result.isIncomeEligible).toBe(false);
        expect(result.magi).toBe(1000000);
      });
    });

    describe('Negative Values', () => {
      it('should handle negative gross income by flooring MAGI at 0', () => {
        const input: MAGICalculatorInput = {
          income: { grossIncome: -5000 },
          household: { householdSize: 1, stateCode: 'CA' },
        };
        const result = calculateMAGI(input);

        expect(result.magi).toBe(0);
        expect(result.isIncomeEligible).toBe(true);
      });

      it('should handle excluded income greater than gross income', () => {
        const input: MAGICalculatorInput = {
          income: {
            grossIncome: 10000,
            ssiBenefits: 15000,
          },
          household: { householdSize: 1, stateCode: 'CA' },
        };
        const result = calculateMAGI(input);

        expect(result.magi).toBe(0); // Floored at 0
        expect(result.isIncomeEligible).toBe(true);
      });
    });

    describe('Invalid Household Size', () => {
      it('should treat zero household size as 1', () => {
        const input: MAGICalculatorInput = {
          income: { grossIncome: 20000 },
          household: { householdSize: 0, stateCode: 'CA' },
        };
        const result = calculateMAGI(input);

        expect(result.breakdown.fplThreshold).toBe(FPL_2024[1]);
        expect(result.notes.some(n => n.includes('adjusted to minimum of 1'))).toBe(true);
      });

      it('should treat negative household size as 1', () => {
        const input: MAGICalculatorInput = {
          income: { grossIncome: 20000 },
          household: { householdSize: -3, stateCode: 'CA' },
        };
        const result = calculateMAGI(input);

        expect(result.breakdown.fplThreshold).toBe(FPL_2024[1]);
      });
    });

    describe('Unknown State Codes', () => {
      it('should handle unknown state codes', () => {
        const input: MAGICalculatorInput = {
          income: { grossIncome: 20000 },
          household: { householdSize: 1, stateCode: 'XX' },
        };
        const result = calculateMAGI(input);

        expect(result).toBeDefined();
        expect(result.stateThreshold).toBe(0); // No coverage for unknown state
      });
    });
  });

  // ============================================================================
  // STATE EXPANSION STATUS
  // ============================================================================

  describe('State Expansion Status', () => {
    it('should identify California as expansion state', () => {
      expect(isExpansionState('CA')).toBe(true);
    });

    it('should identify New York as expansion state', () => {
      expect(isExpansionState('NY')).toBe(true);
    });

    it('should identify Texas as non-expansion state', () => {
      expect(isExpansionState('TX')).toBe(false);
    });

    it('should identify Florida as non-expansion state', () => {
      expect(isExpansionState('FL')).toBe(false);
    });

    it('should identify Georgia as non-expansion state', () => {
      expect(isExpansionState('GA')).toBe(false);
    });

    it('should handle lowercase state codes', () => {
      expect(isExpansionState('ca')).toBe(true);
      expect(isExpansionState('tx')).toBe(false);
    });

    it('should return 138% threshold for expansion states', () => {
      const threshold = getStateThreshold('CA', 'adult');
      expect(threshold).toBe(EXPANSION_THRESHOLD_PERCENT);
    });

    it('should return category-specific threshold for non-expansion states', () => {
      const adultThreshold = getStateThreshold('TX', 'adult');
      const pregnantThreshold = getStateThreshold('TX', 'pregnant_woman');
      const childThreshold = getStateThreshold('TX', 'child');

      expect(adultThreshold).toBe(0); // No adult coverage in TX
      expect(pregnantThreshold).toBeGreaterThan(0);
      expect(childThreshold).toBeGreaterThan(0);
    });

    it('should have correct number of expansion states', () => {
      expect(MEDICAID_EXPANSION_STATES.length).toBeGreaterThanOrEqual(40);
    });
  });

  // ============================================================================
  // APPLICANT CATEGORIES IN NON-EXPANSION STATES
  // ============================================================================

  describe('Applicant Categories in Non-Expansion States', () => {
    it('should return 0 threshold for adults in non-expansion states without adult coverage', () => {
      const result = calculateMAGI({
        income: { grossIncome: 10000 },
        household: {
          householdSize: 1,
          stateCode: 'TX',
          applicantCategory: 'adult',
        },
      });

      expect(result.stateThreshold).toBe(0);
      expect(result.isIncomeEligible).toBe(false);
    });

    it('should have higher thresholds for pregnant women in non-expansion states', () => {
      const result = calculateMAGI({
        income: { grossIncome: 20000 },
        household: {
          householdSize: 1,
          stateCode: 'TX',
          applicantCategory: 'pregnant_woman',
        },
      });

      expect(result.stateThreshold).toBeGreaterThan(100);
    });

    it('should have higher thresholds for children in non-expansion states', () => {
      const result = calculateMAGI({
        income: { grossIncome: 20000 },
        household: {
          householdSize: 1,
          stateCode: 'FL',
          applicantCategory: 'child',
        },
      });

      expect(result.stateThreshold).toBeGreaterThan(200);
    });

    it('should have 138% threshold for former foster youth everywhere', () => {
      const result = calculateMAGI({
        income: { grossIncome: 15000 },
        household: {
          householdSize: 1,
          stateCode: 'TX',
          applicantCategory: 'former_foster_youth',
        },
      });

      expect(result.stateThreshold).toBe(138);
    });
  });

  // ============================================================================
  // QUICK CHECK AND CONVENIENCE FUNCTIONS
  // ============================================================================

  describe('Quick Check and Convenience Functions', () => {
    it('should perform quick eligibility check', () => {
      const result = quickMAGICheck(15000, 1, 'CA');

      expect(result).toHaveProperty('eligible');
      expect(result).toHaveProperty('fplPercentage');
      expect(result).toHaveProperty('threshold');
      expect(result.eligible).toBe(true);
    });

    it('should calculate monthly income limit correctly', () => {
      const annualFPL = FPL_2024[1];
      const expectedMonthly = Math.round((annualFPL * 1.38) / 12);
      const limit = getMonthlyIncomeLimit(1, 'CA');

      expect(limit).toBe(expectedMonthly);
    });

    it('should return 0 for monthly limit in non-expansion state for adults', () => {
      const limit = getMonthlyIncomeLimit(1, 'TX', 'adult');
      expect(limit).toBe(0);
    });

    it('should return positive monthly limit for pregnant women in non-expansion states', () => {
      const limit = getMonthlyIncomeLimit(1, 'TX', 'pregnant_woman');
      expect(limit).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // CONFIDENCE SCORING
  // ============================================================================

  describe('Confidence Scoring', () => {
    it('should have high confidence when clearly below threshold', () => {
      const result = calculateMAGI({
        income: { grossIncome: 5000 },
        household: { householdSize: 1, stateCode: 'CA' },
      });

      expect(result.confidence).toBeGreaterThanOrEqual(85);
    });

    it('should have moderate confidence when close to threshold', () => {
      // Income right at the threshold
      const fpl = FPL_2024[1];
      const incomeAtThreshold = Math.round(fpl * 1.36);

      const result = calculateMAGI({
        income: { grossIncome: incomeAtThreshold },
        household: { householdSize: 1, stateCode: 'CA' },
      });

      expect(result.confidence).toBeLessThan(90);
      expect(result.notes.some(n => n.includes('close to threshold'))).toBe(true);
    });

    it('should have high confidence for ineligible adults in non-expansion states', () => {
      const result = calculateMAGI({
        income: { grossIncome: 15000 },
        household: {
          householdSize: 1,
          stateCode: 'TX',
          applicantCategory: 'adult',
        },
      });

      expect(result.confidence).toBeGreaterThanOrEqual(90);
      expect(result.notes.some(n => n.includes('not expanded Medicaid'))).toBe(true);
    });
  });

  // ============================================================================
  // RESULT BREAKDOWN STRUCTURE
  // ============================================================================

  describe('Result Breakdown Structure', () => {
    it('should include complete breakdown in result', () => {
      const result = calculateMAGI({
        income: {
          grossIncome: 30000,
          childSupportReceived: 5000,
        },
        household: { householdSize: 2, stateCode: 'CA' },
      });

      expect(result.breakdown).toHaveProperty('grossIncome');
      expect(result.breakdown).toHaveProperty('totalExcludedIncome');
      expect(result.breakdown).toHaveProperty('excludedItems');
      expect(result.breakdown).toHaveProperty('fplThreshold');
      expect(result.breakdown).toHaveProperty('incomeDisregard');
      expect(result.breakdown).toHaveProperty('effectiveThreshold');
      expect(result.breakdown).toHaveProperty('isExpansionState');
    });

    it('should correctly identify expansion state in breakdown', () => {
      const caResult = calculateMAGI({
        income: { grossIncome: 20000 },
        household: { householdSize: 1, stateCode: 'CA' },
      });
      const txResult = calculateMAGI({
        income: { grossIncome: 20000 },
        household: { householdSize: 1, stateCode: 'TX' },
      });

      expect(caResult.breakdown.isExpansionState).toBe(true);
      expect(txResult.breakdown.isExpansionState).toBe(false);
    });

    it('should calculate correct margin to threshold', () => {
      const result = calculateMAGI({
        income: { grossIncome: 20000 },
        household: { householdSize: 1, stateCode: 'CA' },
      });

      const expectedMargin = result.fplPercentage - result.stateThreshold;
      expect(result.marginToThreshold).toBeCloseTo(expectedMargin, 1);
    });
  });

  // ============================================================================
  // NOTES GENERATION
  // ============================================================================

  describe('Notes Generation', () => {
    it('should include expansion state note', () => {
      const result = calculateMAGI({
        income: { grossIncome: 20000 },
        household: { householdSize: 1, stateCode: 'CA' },
      });

      expect(result.notes.some(n => n.includes('expansion state'))).toBe(true);
    });

    it('should include excluded income note when applicable', () => {
      const result = calculateMAGI({
        income: {
          grossIncome: 25000,
          ssiBenefits: 5000,
        },
        household: { householdSize: 1, stateCode: 'CA' },
      });

      expect(result.notes.some(n => n.includes('excluded from MAGI'))).toBe(true);
    });

    it('should include 5% disregard note when income is in that range', () => {
      const fpl = FPL_2024[1];
      const incomeAt135 = Math.round(fpl * 1.35);

      const result = calculateMAGI({
        income: { grossIncome: incomeAt135 },
        household: { householdSize: 1, stateCode: 'CA' },
      });

      expect(result.notes.some(n => n.includes('5% income disregard'))).toBe(true);
    });
  });
});
