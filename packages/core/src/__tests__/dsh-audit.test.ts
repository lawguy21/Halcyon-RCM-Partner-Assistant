/**
 * DSH Audit Compliance Engine Tests
 *
 * Tests DSH (Disproportionate Share Hospital) calculations and audit readiness
 */

import {
  calculateDSHAudit,
  DSHAuditInput,
  FacilityType,
} from '../engines/dsh-audit';

// Test fixtures
function createBaseInput(overrides: Partial<DSHAuditInput> = {}): DSHAuditInput {
  return {
    fiscalYear: 2024,
    totalPatientDays: 100000,
    medicarePartADays: 30000,
    medicareSSIDays: 6000,
    medicaidDays: 25000,
    dualEligibleDays: 5000,
    totalOperatingCosts: 150000000,
    medicaidPayments: 25000000,
    medicarePayments: 40000000,
    uncompensatedCareCosts: 10000000,
    charityCareAtCost: 6000000,
    badDebtAtCost: 3000000,
    dshPaymentsReceived: 5000000,
    facilityType: 'urban',
    ...overrides,
  };
}

describe('DSH Audit Compliance Engine', () => {
  // ============================================================================
  // DPP CALCULATION (SSI + MEDICAID FRACTIONS)
  // ============================================================================

  describe('DPP Calculation', () => {
    describe('SSI Fraction', () => {
      it('should calculate SSI ratio correctly', () => {
        const input = createBaseInput({
          medicarePartADays: 30000,
          medicareSSIDays: 6000,
        });
        const result = calculateDSHAudit(input);

        // SSI Ratio = 6000 / 30000 = 0.2
        expect(result.ssiRatio).toBeCloseTo(0.2, 5);
      });

      it('should handle zero Medicare Part A days', () => {
        const input = createBaseInput({
          medicarePartADays: 0,
          medicareSSIDays: 0,
        });
        const result = calculateDSHAudit(input);

        expect(result.ssiRatio).toBe(0);
      });

      it('should handle SSI days equal to Medicare days', () => {
        const input = createBaseInput({
          medicarePartADays: 10000,
          medicareSSIDays: 10000,
        });
        const result = calculateDSHAudit(input);

        expect(result.ssiRatio).toBe(1);
      });

      it('should handle high SSI ratio', () => {
        const input = createBaseInput({
          medicarePartADays: 20000,
          medicareSSIDays: 15000,
        });
        const result = calculateDSHAudit(input);

        expect(result.ssiRatio).toBeCloseTo(0.75, 5);
      });
    });

    describe('Medicaid Fraction', () => {
      it('should calculate Medicaid ratio correctly excluding dual eligible', () => {
        const input = createBaseInput({
          totalPatientDays: 100000,
          medicaidDays: 25000,
          dualEligibleDays: 5000,
        });
        const result = calculateDSHAudit(input);

        // Medicaid Ratio = (25000 - 5000) / 100000 = 0.2
        expect(result.medicaidRatio).toBeCloseTo(0.2, 5);
      });

      it('should handle zero total patient days', () => {
        const input = createBaseInput({
          totalPatientDays: 0,
          medicaidDays: 0,
          dualEligibleDays: 0,
        });
        const result = calculateDSHAudit(input);

        expect(result.medicaidRatio).toBe(0);
      });

      it('should handle dual eligible days exceeding Medicaid days', () => {
        const input = createBaseInput({
          totalPatientDays: 100000,
          medicaidDays: 5000,
          dualEligibleDays: 10000, // More than Medicaid days
        });
        const result = calculateDSHAudit(input);

        // Should not go negative
        expect(result.medicaidRatio).toBe(0);
      });

      it('should handle no Medicaid days', () => {
        const input = createBaseInput({
          totalPatientDays: 100000,
          medicaidDays: 0,
          dualEligibleDays: 0,
        });
        const result = calculateDSHAudit(input);

        expect(result.medicaidRatio).toBe(0);
      });
    });

    describe('DPP Total', () => {
      it('should calculate DPP as sum of SSI and Medicaid ratios', () => {
        const input = createBaseInput({
          totalPatientDays: 100000,
          medicarePartADays: 30000,
          medicareSSIDays: 6000,
          medicaidDays: 25000,
          dualEligibleDays: 5000,
        });
        const result = calculateDSHAudit(input);

        // DPP = 0.2 (SSI) + 0.2 (Medicaid) = 0.4
        expect(result.dpp).toBeCloseTo(0.4, 5);
      });

      it('should handle high DPP scenarios', () => {
        const input = createBaseInput({
          totalPatientDays: 100000,
          medicarePartADays: 30000,
          medicareSSIDays: 15000, // 50% SSI ratio
          medicaidDays: 50000,
          dualEligibleDays: 10000, // 40% Medicaid ratio
        });
        const result = calculateDSHAudit(input);

        // DPP = 0.5 + 0.4 = 0.9
        expect(result.dpp).toBeCloseTo(0.9, 5);
      });

      it('should handle low DPP scenarios', () => {
        const input = createBaseInput({
          totalPatientDays: 100000,
          medicarePartADays: 50000,
          medicareSSIDays: 2500, // 5% SSI ratio
          medicaidDays: 10000,
          dualEligibleDays: 5000, // 5% Medicaid ratio
        });
        const result = calculateDSHAudit(input);

        // DPP = 0.05 + 0.05 = 0.1
        expect(result.dpp).toBeCloseTo(0.1, 5);
      });
    });
  });

  // ============================================================================
  // DSH QUALIFICATION THRESHOLDS
  // ============================================================================

  describe('DSH Qualification Thresholds', () => {
    it('should qualify urban hospital with DPP > 15%', () => {
      const input = createBaseInput({
        facilityType: 'urban',
        totalPatientDays: 100000,
        medicarePartADays: 30000,
        medicareSSIDays: 6000,
        medicaidDays: 25000,
        dualEligibleDays: 5000,
      });
      const result = calculateDSHAudit(input);

      expect(result.dpp).toBeGreaterThan(0.15);
      expect(result.qualifiesForDSH).toBe(true);
    });

    it('should not qualify urban hospital with DPP <= 15%', () => {
      const input = createBaseInput({
        facilityType: 'urban',
        totalPatientDays: 100000,
        medicarePartADays: 50000,
        medicareSSIDays: 2500,
        medicaidDays: 10000,
        dualEligibleDays: 5000,
      });
      const result = calculateDSHAudit(input);

      expect(result.dpp).toBeLessThanOrEqual(0.15);
      expect(result.qualifiesForDSH).toBe(false);
    });

    it('should qualify rural hospital with DPP > 15%', () => {
      const input = createBaseInput({
        facilityType: 'rural',
        totalPatientDays: 50000,
        medicarePartADays: 20000,
        medicareSSIDays: 5000,
        medicaidDays: 15000,
        dualEligibleDays: 3000,
      });
      const result = calculateDSHAudit(input);

      expect(result.qualifiesForDSH).toBe(true);
    });

    it('should qualify sole community hospital with DPP > 15%', () => {
      const input = createBaseInput({
        facilityType: 'sole_community',
        totalPatientDays: 30000,
        medicarePartADays: 10000,
        medicareSSIDays: 3000,
        medicaidDays: 8000,
        dualEligibleDays: 2000,
      });
      const result = calculateDSHAudit(input);

      expect(result.qualifiesForDSH).toBe(true);
    });

    it('should apply CAH rules for critical access hospitals', () => {
      const input = createBaseInput({
        facilityType: 'critical_access',
        totalPatientDays: 10000,
        medicarePartADays: 5000,
        medicareSSIDays: 1500,
        medicaidDays: 3000,
        dualEligibleDays: 500,
      });
      const result = calculateDSHAudit(input);

      expect(result).toBeDefined();
    });
  });

  // ============================================================================
  // PAYMENT CAP CALCULATIONS
  // ============================================================================

  describe('Payment Cap Calculations', () => {
    it('should calculate hospital-specific limit as uncompensated care costs', () => {
      const input = createBaseInput({
        uncompensatedCareCosts: 10000000,
      });
      const result = calculateDSHAudit(input);

      expect(result.hospitalSpecificLimit).toBe(10000000);
    });

    it('should calculate excess payment risk when DSH exceeds limit', () => {
      const input = createBaseInput({
        uncompensatedCareCosts: 5000000,
        dshPaymentsReceived: 8000000,
      });
      const result = calculateDSHAudit(input);

      expect(result.excessPaymentRisk).toBe(3000000);
    });

    it('should have zero excess payment risk when DSH is below limit', () => {
      const input = createBaseInput({
        uncompensatedCareCosts: 10000000,
        dshPaymentsReceived: 5000000,
      });
      const result = calculateDSHAudit(input);

      expect(result.excessPaymentRisk).toBe(0);
    });

    it('should have zero excess payment risk when exactly at limit', () => {
      const input = createBaseInput({
        uncompensatedCareCosts: 5000000,
        dshPaymentsReceived: 5000000,
      });
      const result = calculateDSHAudit(input);

      expect(result.excessPaymentRisk).toBe(0);
    });

    it('should track current DSH payments correctly', () => {
      const input = createBaseInput({
        dshPaymentsReceived: 7500000,
      });
      const result = calculateDSHAudit(input);

      expect(result.currentDSHPayments).toBe(7500000);
    });
  });

  // ============================================================================
  // WORKSHEET S-10 DATA PREPARATION
  // ============================================================================

  describe('Worksheet S-10 Data Preparation', () => {
    it('should prepare line 1 as uncompensated care costs', () => {
      const input = createBaseInput({
        uncompensatedCareCosts: 10000000,
      });
      const result = calculateDSHAudit(input);

      expect(result.worksheetS10.line1).toBe(10000000);
    });

    it('should calculate line 3 as net uncompensated care', () => {
      const input = createBaseInput({
        uncompensatedCareCosts: 10000000,
      });
      const result = calculateDSHAudit(input);

      // Line 3 = Line 1 - Line 2 (payments)
      expect(result.worksheetS10.line3).toBe(result.worksheetS10.line1 - result.worksheetS10.line2);
    });

    it('should include charity care breakdown', () => {
      const input = createBaseInput({
        charityCareAtCost: 6000000,
      });
      const result = calculateDSHAudit(input);

      expect(result.worksheetS10.byCategory.charityCare).toBe(6000000);
    });

    it('should include bad debt breakdown', () => {
      const input = createBaseInput({
        badDebtAtCost: 3000000,
      });
      const result = calculateDSHAudit(input);

      expect(result.worksheetS10.byCategory.badDebt).toBe(3000000);
    });

    it('should calculate other uncompensated care', () => {
      const input = createBaseInput({
        uncompensatedCareCosts: 10000000,
        charityCareAtCost: 6000000,
        badDebtAtCost: 3000000,
      });
      const result = calculateDSHAudit(input);

      // Other = 10M - 6M - 3M = 1M (split 60/40)
      const totalOther = result.worksheetS10.byCategory.nonMedicareUninsured +
        result.worksheetS10.byCategory.otherUncompensated;
      expect(totalOther).toBeCloseTo(1000000, 0);
    });
  });

  // ============================================================================
  // AUDIT READINESS SCORE
  // ============================================================================

  describe('Audit Readiness Score', () => {
    it('should have high score with complete data', () => {
      const input = createBaseInput();
      const result = calculateDSHAudit(input);

      expect(result.auditReadinessScore).toBeGreaterThanOrEqual(80);
    });

    it('should reduce score for documentation gaps', () => {
      const input = createBaseInput({
        totalPatientDays: 0,
      });
      const result = calculateDSHAudit(input);

      expect(result.auditReadinessScore).toBeLessThan(80);
    });

    it('should reduce score for data inconsistencies', () => {
      const input = createBaseInput({
        medicaidDays: 5000,
        dualEligibleDays: 10000, // More dual eligible than Medicaid
        // Remove bonus-triggering fields to see the reduction
        totalOperatingCosts: 0,
        medicaidPayments: 0,
        medicarePayments: 0,
      });
      const result = calculateDSHAudit(input);

      // Score starts at 100, -10 per gap (dual > medicaid = 1 gap)
      expect(result.auditReadinessScore).toBeLessThan(100);
      expect(result.documentationGaps).toContain(
        'Dual eligible days exceed Medicaid days - verify eligibility classification'
      );
    });

    it('should have very low score for high-risk scenarios', () => {
      const input = createBaseInput({
        totalPatientDays: 0,
        medicarePartADays: 0,
        uncompensatedCareCosts: 0,
        dshPaymentsReceived: 5000000, // Receiving DSH with no UCC
      });
      const result = calculateDSHAudit(input);

      expect(result.auditReadinessScore).toBeLessThan(50);
    });

    it('should boost score for complete financial data', () => {
      const input = createBaseInput({
        totalOperatingCosts: 150000000,
        medicaidPayments: 25000000,
        medicarePayments: 40000000,
      });
      const result = calculateDSHAudit(input);

      expect(result.auditReadinessScore).toBeGreaterThanOrEqual(80);
    });

    it('should return score between 0 and 100', () => {
      const input = createBaseInput();
      const result = calculateDSHAudit(input);

      expect(result.auditReadinessScore).toBeGreaterThanOrEqual(0);
      expect(result.auditReadinessScore).toBeLessThanOrEqual(100);
    });
  });

  // ============================================================================
  // DOCUMENTATION GAPS
  // ============================================================================

  describe('Documentation Gaps', () => {
    it('should identify zero total patient days', () => {
      const input = createBaseInput({
        totalPatientDays: 0,
      });
      const result = calculateDSHAudit(input);

      expect(result.documentationGaps.some(g => g.includes('Total patient days'))).toBe(true);
    });

    it('should identify zero Medicare Part A days', () => {
      const input = createBaseInput({
        medicarePartADays: 0,
      });
      const result = calculateDSHAudit(input);

      expect(result.documentationGaps.some(g => g.includes('Medicare Part A days'))).toBe(true);
    });

    it('should identify Medicaid/dual eligible inconsistency', () => {
      const input = createBaseInput({
        medicaidDays: 5000,
        dualEligibleDays: 10000,
      });
      const result = calculateDSHAudit(input);

      expect(result.documentationGaps.some(g => g.includes('Dual eligible days exceed Medicaid'))).toBe(true);
    });

    it('should identify dual eligible exceeding Medicare', () => {
      const input = createBaseInput({
        medicarePartADays: 5000,
        dualEligibleDays: 10000,
      });
      const result = calculateDSHAudit(input);

      expect(result.documentationGaps.some(g => g.includes('exceed Medicare Part A'))).toBe(true);
    });

    it('should identify SSI days exceeding Medicare', () => {
      const input = createBaseInput({
        medicarePartADays: 5000,
        medicareSSIDays: 10000,
      });
      const result = calculateDSHAudit(input);

      expect(result.documentationGaps.some(g => g.includes('SSI days exceed'))).toBe(true);
    });

    it('should identify zero uncompensated care', () => {
      const input = createBaseInput({
        uncompensatedCareCosts: 0,
      });
      const result = calculateDSHAudit(input);

      expect(result.documentationGaps.some(g => g.includes('Uncompensated care costs is zero'))).toBe(true);
    });

    it('should identify no charity care or bad debt', () => {
      const input = createBaseInput({
        charityCareAtCost: 0,
        badDebtAtCost: 0,
      });
      const result = calculateDSHAudit(input);

      expect(result.documentationGaps.some(g => g.includes('No charity care or bad debt'))).toBe(true);
    });

    it('should identify UCC reconciliation issues', () => {
      const input = createBaseInput({
        uncompensatedCareCosts: 5000000,
        charityCareAtCost: 4000000,
        badDebtAtCost: 3000000, // Sum > UCC total
      });
      const result = calculateDSHAudit(input);

      expect(result.documentationGaps.some(g => g.includes('reconciliation'))).toBe(true);
    });

    it('should identify zero operating costs', () => {
      const input = createBaseInput({
        totalOperatingCosts: 0,
      });
      const result = calculateDSHAudit(input);

      expect(result.documentationGaps.some(g => g.includes('Total operating costs'))).toBe(true);
    });

    it('should identify high audit risk scenario', () => {
      const input = createBaseInput({
        uncompensatedCareCosts: 0,
        dshPaymentsReceived: 5000000,
      });
      const result = calculateDSHAudit(input);

      expect(result.documentationGaps.some(g => g.includes('high audit risk'))).toBe(true);
    });

    it('should flag unusual fiscal years', () => {
      const input = createBaseInput({
        fiscalYear: 2015, // Old year
      });
      const result = calculateDSHAudit(input);

      expect(result.documentationGaps.some(g => g.includes('audit period'))).toBe(true);
    });

    it('should have no gaps with complete data', () => {
      const input = createBaseInput();
      const result = calculateDSHAudit(input);

      expect(result.documentationGaps.length).toBe(0);
    });
  });

  // ============================================================================
  // RESULT ROUNDING
  // ============================================================================

  describe('Result Rounding', () => {
    it('should round ratios to 6 decimal places', () => {
      const input = createBaseInput({
        medicarePartADays: 30000,
        medicareSSIDays: 7777,
      });
      const result = calculateDSHAudit(input);

      const decimalPlaces = result.ssiRatio.toString().split('.')[1]?.length || 0;
      expect(decimalPlaces).toBeLessThanOrEqual(6);
    });

    it('should round dollar amounts to 2 decimal places', () => {
      const input = createBaseInput({
        uncompensatedCareCosts: 10000000.555,
      });
      const result = calculateDSHAudit(input);

      expect(result.hospitalSpecificLimit.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2);
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle all zero inputs', () => {
      const input: DSHAuditInput = {
        fiscalYear: 2024,
        totalPatientDays: 0,
        medicarePartADays: 0,
        medicareSSIDays: 0,
        medicaidDays: 0,
        dualEligibleDays: 0,
        totalOperatingCosts: 0,
        medicaidPayments: 0,
        medicarePayments: 0,
        uncompensatedCareCosts: 0,
        charityCareAtCost: 0,
        badDebtAtCost: 0,
        dshPaymentsReceived: 0,
        facilityType: 'urban',
      };
      const result = calculateDSHAudit(input);

      expect(result.dpp).toBe(0);
      expect(result.qualifiesForDSH).toBe(false);
    });

    it('should handle very large patient volumes', () => {
      const input = createBaseInput({
        totalPatientDays: 10000000,
        medicarePartADays: 3000000,
        medicaidDays: 2500000,
      });
      const result = calculateDSHAudit(input);

      expect(result).toBeDefined();
      expect(result.dpp).toBeGreaterThan(0);
    });

    it('should handle very large dollar amounts', () => {
      const input = createBaseInput({
        totalOperatingCosts: 5000000000, // $5 billion
        uncompensatedCareCosts: 500000000, // $500 million
        dshPaymentsReceived: 100000000, // $100 million
      });
      const result = calculateDSHAudit(input);

      expect(result).toBeDefined();
      expect(result.hospitalSpecificLimit).toBe(500000000);
    });

    it('should handle facility type variations', () => {
      const facilityTypes: FacilityType[] = ['urban', 'rural', 'sole_community', 'critical_access'];

      facilityTypes.forEach(facilityType => {
        const input = createBaseInput({ facilityType });
        const result = calculateDSHAudit(input);
        expect(result).toBeDefined();
      });
    });

    it('should handle decimal values in inputs', () => {
      const input = createBaseInput({
        charityCareAtCost: 6000000.55,
        badDebtAtCost: 3000000.33,
      });
      const result = calculateDSHAudit(input);

      expect(result.worksheetS10.byCategory.charityCare).toBeCloseTo(6000000.55, 1);
    });

    it('should handle future fiscal year', () => {
      // Use a year clearly outside the typical audit period (currentYear + 2 or more)
      const futureYear = new Date().getFullYear() + 3;
      const input = createBaseInput({
        fiscalYear: futureYear,
      });
      const result = calculateDSHAudit(input);

      expect(result.documentationGaps.some(g => g.includes('audit period'))).toBe(true);
    });
  });

  // ============================================================================
  // COMPLETE RESULT STRUCTURE
  // ============================================================================

  describe('Complete Result Structure', () => {
    it('should return all required fields', () => {
      const input = createBaseInput();
      const result = calculateDSHAudit(input);

      expect(result).toHaveProperty('ssiRatio');
      expect(result).toHaveProperty('medicaidRatio');
      expect(result).toHaveProperty('dpp');
      expect(result).toHaveProperty('qualifiesForDSH');
      expect(result).toHaveProperty('worksheetS10');
      expect(result).toHaveProperty('hospitalSpecificLimit');
      expect(result).toHaveProperty('currentDSHPayments');
      expect(result).toHaveProperty('excessPaymentRisk');
      expect(result).toHaveProperty('auditReadinessScore');
      expect(result).toHaveProperty('documentationGaps');
    });

    it('should return complete Worksheet S-10 structure', () => {
      const input = createBaseInput();
      const result = calculateDSHAudit(input);

      expect(result.worksheetS10).toHaveProperty('line1');
      expect(result.worksheetS10).toHaveProperty('line2');
      expect(result.worksheetS10).toHaveProperty('line3');
      expect(result.worksheetS10).toHaveProperty('byCategory');
      expect(result.worksheetS10.byCategory).toHaveProperty('charityCare');
      expect(result.worksheetS10.byCategory).toHaveProperty('badDebt');
      expect(result.worksheetS10.byCategory).toHaveProperty('nonMedicareUninsured');
      expect(result.worksheetS10.byCategory).toHaveProperty('otherUncompensated');
    });
  });
});
