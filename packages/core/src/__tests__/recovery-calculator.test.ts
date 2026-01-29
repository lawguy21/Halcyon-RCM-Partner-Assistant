/**
 * Recovery Calculator Engine Tests
 *
 * Tests the main orchestrator that combines all recovery pathway engines
 */

import { calculateHospitalRecovery } from '../engines/recovery-calculator';
import { HospitalRecoveryInput } from '../models/encounter';

// Test fixtures
const createBaseInput = (): HospitalRecoveryInput => ({
  stateOfResidence: 'CA',
  stateOfService: 'CA',
  dateOfService: '2024-01-15',
  encounterType: 'inpatient',
  lengthOfStay: 5,
  totalCharges: 50000,
  insuranceStatusOnDOS: 'uninsured',
  medicaidStatus: 'unknown',
  medicareStatus: 'none',
  ssiStatus: 'unknown',
  ssdiStatus: 'unknown',
  householdIncome: 'under_fpl',
  householdSize: 1,
  estimatedAssets: 'under_2000',
  disabilityLikelihood: 'medium',
  ssiEligibilityLikely: false,
  ssdiEligibilityLikely: false,
  facilityType: 'standard',
  facilityState: 'CA',
  emergencyService: true,
  medicallyNecessary: true,
});

describe('calculateHospitalRecovery', () => {
  describe('Result Structure', () => {
    it('should return all required fields in the result', () => {
      const input = createBaseInput();
      const result = calculateHospitalRecovery(input);

      expect(result).toHaveProperty('primaryRecoveryPath');
      expect(result).toHaveProperty('overallConfidence');
      expect(result).toHaveProperty('estimatedTotalRecovery');
      expect(result).toHaveProperty('priorityActions');
      expect(result).toHaveProperty('medicaid');
      expect(result).toHaveProperty('medicare');
      expect(result).toHaveProperty('dshRelevance');
      expect(result).toHaveProperty('stateProgram');
      expect(result).toHaveProperty('currentExposure');
      expect(result).toHaveProperty('projectedRecovery');
      expect(result).toHaveProperty('immediateActions');
      expect(result).toHaveProperty('followUpActions');
      expect(result).toHaveProperty('documentationNeeded');
    });

    it('should return valid confidence score between 0-100', () => {
      const input = createBaseInput();
      const result = calculateHospitalRecovery(input);

      expect(result.overallConfidence).toBeGreaterThanOrEqual(0);
      expect(result.overallConfidence).toBeLessThanOrEqual(100);
    });

    it('should set currentExposure equal to totalCharges', () => {
      const input = createBaseInput();
      input.totalCharges = 75000;
      const result = calculateHospitalRecovery(input);

      expect(result.currentExposure).toBe(75000);
    });
  });

  describe('Confirmed Medicaid Pathway', () => {
    it('should identify Medicaid Direct Billing as primary path when Medicaid is active', () => {
      const input = createBaseInput();
      input.medicaidStatus = 'active';
      const result = calculateHospitalRecovery(input);

      expect(result.primaryRecoveryPath).toBe('Medicaid Direct Billing');
      expect(result.medicaid.status).toBe('confirmed');
      expect(result.medicaid.confidence).toBe(95);
    });

    it('should have high overall confidence when Medicaid is confirmed', () => {
      const input = createBaseInput();
      input.medicaidStatus = 'active';
      const result = calculateHospitalRecovery(input);

      // Confirmed Medicaid uses boosted formula: 70% Medicaid + 20% DSH + 10% Medicare
      expect(result.overallConfidence).toBeGreaterThanOrEqual(60);
    });

    it('should calculate Medicaid recovery at ~45% of charges', () => {
      const input = createBaseInput();
      input.medicaidStatus = 'active';
      input.totalCharges = 100000;
      const result = calculateHospitalRecovery(input);

      expect(result.medicaid.estimatedRecovery).toBe(45000);
    });
  });

  describe('Medicare Pathway', () => {
    it('should identify Medicare Direct Billing for active Part A inpatient', () => {
      const input = createBaseInput();
      input.medicareStatus = 'active_part_a';
      input.encounterType = 'inpatient';
      const result = calculateHospitalRecovery(input);

      expect(result.primaryRecoveryPath).toBe('Medicare Direct Billing');
      expect(result.medicare.status).toBe('active_on_dos');
    });

    it('should identify Medicare Direct Billing for active Part B outpatient', () => {
      const input = createBaseInput();
      input.medicareStatus = 'active_part_b';
      input.encounterType = 'outpatient';
      const result = calculateHospitalRecovery(input);

      expect(result.primaryRecoveryPath).toBe('Medicare Direct Billing');
      expect(result.medicare.status).toBe('active_on_dos');
    });
  });

  describe('Retroactive Medicaid Pathway', () => {
    it('should identify retroactive Medicaid for low-income uninsured in expansion state', () => {
      const input = createBaseInput();
      input.stateOfService = 'CA'; // Expansion state
      input.insuranceStatusOnDOS = 'uninsured';
      input.householdIncome = 'under_fpl';
      const result = calculateHospitalRecovery(input);

      expect(result.medicaid.status).toBe('likely');
      expect(result.primaryRecoveryPath).toBe('Medicaid Application/Retroactive');
    });

    it('should identify retroactive Medicaid at 138% FPL in expansion states', () => {
      const input = createBaseInput();
      input.stateOfService = 'NY'; // Expansion state
      input.insuranceStatusOnDOS = 'uninsured';
      input.householdIncome = 'fpl_138';
      const result = calculateHospitalRecovery(input);

      expect(result.medicaid.status).toBe('likely');
    });
  });

  describe('SSI/SSDI Pathways', () => {
    it('should identify SSI-Medicaid pathway when SSI eligibility is likely', () => {
      const input = createBaseInput();
      input.ssiEligibilityLikely = true;
      input.insuranceStatusOnDOS = 'uninsured';
      input.householdIncome = 'over_400_fpl'; // Not income-eligible for regular Medicaid
      const result = calculateHospitalRecovery(input);

      expect(result.medicaid.pathway).toContain('SSI');
    });

    it('should identify future Medicare for SSDI recipients', () => {
      const input = createBaseInput();
      input.ssdiStatus = 'receiving';
      const result = calculateHospitalRecovery(input);

      expect(result.medicare.status).toBe('future_likely');
      expect(result.medicare.pathway).toContain('SSDI');
    });
  });

  describe('State Program Pathway', () => {
    it('should identify state program when Medicaid unlikely but income qualifies', () => {
      const input = createBaseInput();
      input.stateOfService = 'TX'; // Non-expansion state
      input.insuranceStatusOnDOS = 'uninsured';
      input.householdIncome = 'fpl_200'; // Above TX Medicaid but below state program
      input.medicaidStatus = 'never';
      const result = calculateHospitalRecovery(input);

      expect(result.stateProgram.programName).toBeDefined();
      expect(result.stateProgram.eligibilityLikely).toBeDefined();
    });
  });

  describe('DSH Relevance', () => {
    it('should calculate high DSH relevance for Medicaid inpatient stays', () => {
      const input = createBaseInput();
      input.medicaidStatus = 'active';
      input.encounterType = 'inpatient';
      input.lengthOfStay = 10;
      const result = calculateHospitalRecovery(input);

      expect(result.dshRelevance.relevance).toBe('high');
    });

    it('should include inpatient LOS in DSH scoring', () => {
      const input = createBaseInput();
      input.encounterType = 'inpatient';
      input.lengthOfStay = 7;
      const result = calculateHospitalRecovery(input);

      const hasLOSFactor = result.dshRelevance.factors.some(
        f => f.factor.includes('Inpatient stay')
      );
      expect(hasLOSFactor).toBe(true);
    });

    it('should boost DSH score for DSH-designated hospitals', () => {
      const input = createBaseInput();
      input.facilityType = 'dsh_hospital';
      const result = calculateHospitalRecovery(input);

      const hasFacilityFactor = result.dshRelevance.factors.some(
        f => f.factor.includes('dsh_hospital')
      );
      expect(hasFacilityFactor).toBe(true);
    });
  });

  describe('Projected Recovery Calculations', () => {
    it('should calculate total projected recovery', () => {
      const input = createBaseInput();
      input.medicaidStatus = 'active';
      input.totalCharges = 100000;
      const result = calculateHospitalRecovery(input);

      expect(result.projectedRecovery.total).toBeGreaterThan(0);
      expect(result.estimatedTotalRecovery).toBe(result.projectedRecovery.total);
    });

    it('should discount recovery for likely (not confirmed) Medicaid', () => {
      const input = createBaseInput();
      input.insuranceStatusOnDOS = 'uninsured';
      input.householdIncome = 'under_fpl';
      input.totalCharges = 100000;
      const result = calculateHospitalRecovery(input);

      // Likely Medicaid should be discounted by 30%
      expect(result.projectedRecovery.medicaid).toBeLessThan(
        result.medicaid.estimatedRecovery
      );
    });

    it('should include charity writeoff in projection', () => {
      const input = createBaseInput();
      input.totalCharges = 100000;
      const result = calculateHospitalRecovery(input);

      expect(result.projectedRecovery.charityWriteoff).toBeDefined();
    });
  });

  describe('Priority Actions', () => {
    it('should generate priority actions list', () => {
      const input = createBaseInput();
      const result = calculateHospitalRecovery(input);

      expect(result.priorityActions.length).toBeGreaterThan(0);
    });

    it('should split actions into immediate and follow-up', () => {
      const input = createBaseInput();
      const result = calculateHospitalRecovery(input);

      expect(result.immediateActions).toBeDefined();
      expect(result.followUpActions).toBeDefined();
      expect(result.immediateActions.length).toBeLessThanOrEqual(3);
    });

    it('should include DSH documentation for high DSH relevance', () => {
      const input = createBaseInput();
      input.medicaidStatus = 'active';
      input.encounterType = 'inpatient';
      input.lengthOfStay = 10;
      const result = calculateHospitalRecovery(input);

      if (result.dshRelevance.relevance === 'high') {
        const hasDSHAction = result.priorityActions.some(
          a => a.toLowerCase().includes('dsh')
        );
        expect(hasDSHAction).toBe(true);
      }
    });
  });

  describe('Documentation Needed', () => {
    it('should always include basic documentation requirements', () => {
      const input = createBaseInput();
      const result = calculateHospitalRecovery(input);

      expect(result.documentationNeeded).toContain('Patient identification');
      expect(result.documentationNeeded).toContain('Date of service documentation');
    });

    it('should include income verification for potential Medicaid', () => {
      const input = createBaseInput();
      input.insuranceStatusOnDOS = 'uninsured';
      input.householdIncome = 'under_fpl';
      const result = calculateHospitalRecovery(input);

      const hasIncomeDoc = result.documentationNeeded.some(
        d => d.toLowerCase().includes('income')
      );
      expect(hasIncomeDoc).toBe(true);
    });

    it('should include disability documentation when SSI/SSDI likely', () => {
      const input = createBaseInput();
      input.ssiEligibilityLikely = true;
      const result = calculateHospitalRecovery(input);

      const hasDisabilityDoc = result.documentationNeeded.some(
        d => d.toLowerCase().includes('disability') || d.toLowerCase().includes('medical records')
      );
      expect(hasDisabilityDoc).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero charges', () => {
      const input = createBaseInput();
      input.totalCharges = 0;
      const result = calculateHospitalRecovery(input);

      expect(result.estimatedTotalRecovery).toBe(0);
      expect(result.currentExposure).toBe(0);
    });

    it('should handle very high charges', () => {
      const input = createBaseInput();
      input.totalCharges = 10000000; // $10M
      const result = calculateHospitalRecovery(input);

      expect(result).toBeDefined();
      expect(result.estimatedTotalRecovery).toBeGreaterThanOrEqual(0);
    });

    it('should handle missing optional fields', () => {
      const input = createBaseInput();
      delete (input as Partial<HospitalRecoveryInput>).lengthOfStay;
      delete (input as Partial<HospitalRecoveryInput>).facilityType;

      const result = calculateHospitalRecovery(input);
      expect(result).toBeDefined();
    });

    it('should handle outpatient encounters', () => {
      const input = createBaseInput();
      input.encounterType = 'outpatient';
      input.lengthOfStay = undefined;
      const result = calculateHospitalRecovery(input);

      expect(result).toBeDefined();
      // DSH should be lower for outpatient
      expect(result.dshRelevance.score).toBeLessThan(60);
    });

    it('should handle ED encounters', () => {
      const input = createBaseInput();
      input.encounterType = 'ed';
      const result = calculateHospitalRecovery(input);

      expect(result).toBeDefined();
    });
  });

  describe('Multi-State Scenarios', () => {
    it('should handle different state of residence vs service', () => {
      const input = createBaseInput();
      input.stateOfResidence = 'TX';
      input.stateOfService = 'CA';
      const result = calculateHospitalRecovery(input);

      expect(result).toBeDefined();
      // Should use state of service for program evaluation
    });

    it('should handle non-expansion state scenarios', () => {
      const input = createBaseInput();
      input.stateOfService = 'TX';
      input.insuranceStatusOnDOS = 'uninsured';
      input.householdIncome = 'fpl_138'; // Would qualify in expansion state
      const result = calculateHospitalRecovery(input);

      // In non-expansion state, 138% FPL may not qualify for Medicaid
      expect(result).toBeDefined();
    });
  });
});
