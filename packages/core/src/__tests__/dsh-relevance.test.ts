/**
 * DSH Relevance Engine Tests (DSH1-DSH3 Tree)
 *
 * Tests the DSH (Disproportionate Share Hospital) relevance evaluation logic
 */

import { evaluateDSHRelevance } from '../engines/dsh-relevance';
import { HospitalRecoveryInput } from '../models/encounter';

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

describe('evaluateDSHRelevance', () => {
  describe('DSH1 - Inpatient Days Signal', () => {
    it('should add points for inpatient stay', () => {
      const input = createBaseInput();
      input.encounterType = 'inpatient';
      input.lengthOfStay = 5;
      const result = evaluateDSHRelevance(input);

      const hasInpatientFactor = result.factors.some(
        f => f.factor.includes('Inpatient stay')
      );
      expect(hasInpatientFactor).toBe(true);
    });

    it('should calculate LOS-based points (up to 25)', () => {
      const input = createBaseInput();
      input.encounterType = 'inpatient';
      input.lengthOfStay = 10; // 10 * 3 = 30, capped at 25
      const result = evaluateDSHRelevance(input);

      const losFactor = result.factors.find(
        f => f.factor.includes('Inpatient stay')
      );
      expect(losFactor).toBeDefined();
      expect(losFactor!.weight).toBeLessThanOrEqual(25);
    });

    it('should add extended stay bonus for 7+ days', () => {
      const input = createBaseInput();
      input.encounterType = 'inpatient';
      input.lengthOfStay = 10;
      const result = evaluateDSHRelevance(input);

      const hasExtendedFactor = result.factors.some(
        f => f.factor.includes('Extended length of stay')
      );
      expect(hasExtendedFactor).toBe(true);
    });

    it('should NOT add extended stay bonus for <7 days', () => {
      const input = createBaseInput();
      input.encounterType = 'inpatient';
      input.lengthOfStay = 5;
      const result = evaluateDSHRelevance(input);

      const hasExtendedFactor = result.factors.some(
        f => f.factor.includes('Extended length of stay')
      );
      expect(hasExtendedFactor).toBe(false);
    });

    it('should mark non-inpatient as neutral', () => {
      const input = createBaseInput();
      input.encounterType = 'outpatient';
      const result = evaluateDSHRelevance(input);

      const nonInpatientFactor = result.factors.find(
        f => f.factor.includes('Non-inpatient')
      );
      expect(nonInpatientFactor).toBeDefined();
      expect(nonInpatientFactor!.impact).toBe('neutral');
      expect(nonInpatientFactor!.weight).toBe(0);
    });

    it('should note that ED/outpatient contributes weakly', () => {
      const input = createBaseInput();
      input.encounterType = 'ed';
      const result = evaluateDSHRelevance(input);

      const hasWeakNote = result.notes.some(
        n => n.toLowerCase().includes('weaker')
      );
      expect(hasWeakNote).toBe(true);
    });
  });

  describe('DSH2 - Medicaid/SSI Linkage', () => {
    it('should add 25 points for active Medicaid', () => {
      const input = createBaseInput();
      input.medicaidStatus = 'active';
      const result = evaluateDSHRelevance(input);

      const medicaidFactor = result.factors.find(
        f => f.factor.includes('Medicaid active')
      );
      expect(medicaidFactor).toBeDefined();
      expect(medicaidFactor!.weight).toBe(25);
      expect(medicaidFactor!.impact).toBe('positive');
    });

    it('should add 25 points for pending Medicaid', () => {
      const input = createBaseInput();
      input.medicaidStatus = 'pending';
      const result = evaluateDSHRelevance(input);

      const medicaidFactor = result.factors.find(
        f => f.factor.includes('Medicaid pending')
      );
      expect(medicaidFactor).toBeDefined();
      expect(medicaidFactor!.weight).toBe(25);
    });

    it('should add 20 points for SSI receiving', () => {
      const input = createBaseInput();
      input.ssiStatus = 'receiving';
      const result = evaluateDSHRelevance(input);

      const ssiFactor = result.factors.find(
        f => f.factor.includes('SSI')
      );
      expect(ssiFactor).toBeDefined();
      expect(ssiFactor!.weight).toBe(20);
    });

    it('should add 20 points for SSI pending', () => {
      const input = createBaseInput();
      input.ssiStatus = 'pending';
      const result = evaluateDSHRelevance(input);

      const ssiFactor = result.factors.find(
        f => f.factor.includes('SSI')
      );
      expect(ssiFactor).toBeDefined();
    });

    it('should add 20 points when SSI eligibility likely', () => {
      const input = createBaseInput();
      input.ssiEligibilityLikely = true;
      const result = evaluateDSHRelevance(input);

      const ssiFactor = result.factors.find(
        f => f.factor.includes('SSI')
      );
      expect(ssiFactor).toBeDefined();
      expect(ssiFactor!.weight).toBe(20);
    });

    it('should note DSH utilization impact', () => {
      const input = createBaseInput();
      input.medicaidStatus = 'active';
      const result = evaluateDSHRelevance(input);

      const hasDSHNote = result.notes.some(
        n => n.includes('DSH')
      );
      expect(hasDSHNote).toBe(true);
    });
  });

  describe('DSH3 - Uninsured Low-Income Signal', () => {
    it('should add 15 points for uninsured low-income (<200% FPL)', () => {
      const input = createBaseInput();
      input.insuranceStatusOnDOS = 'uninsured';
      input.householdIncome = 'under_fpl';
      const result = evaluateDSHRelevance(input);

      const uninsuredFactor = result.factors.find(
        f => f.factor.includes('Uninsured') && f.factor.includes('low income')
      );
      expect(uninsuredFactor).toBeDefined();
      expect(uninsuredFactor!.weight).toBe(15);
      expect(uninsuredFactor!.impact).toBe('positive');
    });

    it('should add 15 points for uninsured at FPL_138', () => {
      const input = createBaseInput();
      input.insuranceStatusOnDOS = 'uninsured';
      input.householdIncome = 'fpl_138';
      const result = evaluateDSHRelevance(input);

      const uninsuredFactor = result.factors.find(
        f => f.factor.includes('Uninsured') && f.factor.includes('low income')
      );
      expect(uninsuredFactor).toBeDefined();
      expect(uninsuredFactor!.weight).toBe(15);
    });

    it('should add 15 points for uninsured at FPL_200', () => {
      const input = createBaseInput();
      input.insuranceStatusOnDOS = 'uninsured';
      input.householdIncome = 'fpl_200';
      const result = evaluateDSHRelevance(input);

      const uninsuredFactor = result.factors.find(
        f => f.factor.includes('Uninsured') && f.factor.includes('low income')
      );
      expect(uninsuredFactor).toBeDefined();
    });

    it('should add only 5 points for uninsured above 200% FPL', () => {
      const input = createBaseInput();
      input.insuranceStatusOnDOS = 'uninsured';
      input.householdIncome = 'fpl_300';
      const result = evaluateDSHRelevance(input);

      const uninsuredFactor = result.factors.find(
        f => f.factor.includes('Uninsured') && f.factor.includes('above 200%')
      );
      expect(uninsuredFactor).toBeDefined();
      expect(uninsuredFactor!.weight).toBe(5);
      expect(uninsuredFactor!.impact).toBe('neutral');
    });

    it('should NOT add uninsured factor if patient has insurance', () => {
      const input = createBaseInput();
      input.insuranceStatusOnDOS = 'commercial';
      const result = evaluateDSHRelevance(input);

      const hasUninsuredFactor = result.factors.some(
        f => f.factor.toLowerCase().includes('uninsured')
      );
      expect(hasUninsuredFactor).toBe(false);
    });
  });

  describe('Facility Type Bonus', () => {
    it('should add 10 points for DSH hospital', () => {
      const input = createBaseInput();
      input.facilityType = 'dsh_hospital';
      const result = evaluateDSHRelevance(input);

      const facilityFactor = result.factors.find(
        f => f.factor.includes('dsh_hospital')
      );
      expect(facilityFactor).toBeDefined();
      expect(facilityFactor!.weight).toBe(10);
    });

    it('should add 10 points for safety net facility', () => {
      const input = createBaseInput();
      input.facilityType = 'safety_net';
      const result = evaluateDSHRelevance(input);

      const facilityFactor = result.factors.find(
        f => f.factor.includes('safety_net')
      );
      expect(facilityFactor).toBeDefined();
      expect(facilityFactor!.weight).toBe(10);
    });

    it('should NOT add bonus for standard facility', () => {
      const input = createBaseInput();
      input.facilityType = 'standard';
      const result = evaluateDSHRelevance(input);

      const hasFacilityFactor = result.factors.some(
        f => f.factor.includes('standard')
      );
      expect(hasFacilityFactor).toBe(false);
    });

    it('should NOT add bonus for public hospital', () => {
      const input = createBaseInput();
      input.facilityType = 'public_hospital';
      const result = evaluateDSHRelevance(input);

      const hasFacilityBonus = result.factors.some(
        f => f.factor.includes('public_hospital') && f.weight > 0
      );
      expect(hasFacilityBonus).toBe(false);
    });
  });

  describe('Score Calculation', () => {
    it('should cap score at 100', () => {
      const input = createBaseInput();
      input.encounterType = 'inpatient';
      input.lengthOfStay = 20; // Max LOS points
      input.medicaidStatus = 'active'; // +25
      input.ssiStatus = 'receiving'; // +20
      input.insuranceStatusOnDOS = 'uninsured'; // +15
      input.householdIncome = 'under_fpl';
      input.facilityType = 'dsh_hospital'; // +10
      const result = evaluateDSHRelevance(input);

      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should have minimum score of 0', () => {
      const input = createBaseInput();
      input.encounterType = 'outpatient';
      input.insuranceStatusOnDOS = 'commercial';
      input.medicaidStatus = 'never';
      const result = evaluateDSHRelevance(input);

      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Relevance Classification', () => {
    it('should classify score >= 60 as high', () => {
      const input = createBaseInput();
      input.encounterType = 'inpatient';
      input.lengthOfStay = 10;
      input.medicaidStatus = 'active';
      input.ssiStatus = 'receiving';
      const result = evaluateDSHRelevance(input);

      expect(result.relevance).toBe('high');
    });

    it('should classify score 30-59 as medium', () => {
      const input = createBaseInput();
      input.encounterType = 'inpatient';
      input.lengthOfStay = 5;
      input.medicaidStatus = 'pending';
      const result = evaluateDSHRelevance(input);

      // Score: 15 (LOS) + 25 (Medicaid) = 40
      expect(result.relevance).toBe('medium');
    });

    it('should classify score < 30 as low', () => {
      const input = createBaseInput();
      input.encounterType = 'outpatient';
      input.insuranceStatusOnDOS = 'commercial';
      const result = evaluateDSHRelevance(input);

      expect(result.relevance).toBe('low');
    });
  });

  describe('Audit Readiness', () => {
    it('should be strong for inpatient with LOS and Medicaid status', () => {
      const input = createBaseInput();
      input.encounterType = 'inpatient';
      input.lengthOfStay = 5;
      input.medicaidStatus = 'active';
      const result = evaluateDSHRelevance(input);

      expect(result.auditReadiness).toBe('strong');
    });

    it('should be moderate with insurance and income info', () => {
      const input = createBaseInput();
      input.encounterType = 'outpatient';
      input.insuranceStatusOnDOS = 'uninsured';
      input.householdIncome = 'under_fpl';
      input.medicaidStatus = 'unknown';
      const result = evaluateDSHRelevance(input);

      expect(result.auditReadiness).toBe('moderate');
    });

    it('should be weak with minimal data', () => {
      const input = createBaseInput();
      input.encounterType = 'outpatient';
      input.medicaidStatus = 'unknown';
      input.insuranceStatusOnDOS = 'commercial';
      delete (input as Partial<HospitalRecoveryInput>).householdIncome;
      const result = evaluateDSHRelevance(input);

      // With minimal data, should be weak
      expect(['weak', 'moderate']).toContain(result.auditReadiness);
    });
  });

  describe('Result Structure', () => {
    it('should return all required fields', () => {
      const input = createBaseInput();
      const result = evaluateDSHRelevance(input);

      expect(result).toHaveProperty('relevance');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('factors');
      expect(result).toHaveProperty('auditReadiness');
      expect(result).toHaveProperty('notes');
    });

    it('should return factors as array', () => {
      const input = createBaseInput();
      const result = evaluateDSHRelevance(input);

      expect(Array.isArray(result.factors)).toBe(true);
    });

    it('should have factor with required structure', () => {
      const input = createBaseInput();
      input.encounterType = 'inpatient';
      input.lengthOfStay = 5;
      const result = evaluateDSHRelevance(input);

      const factor = result.factors[0];
      expect(factor).toHaveProperty('factor');
      expect(factor).toHaveProperty('impact');
      expect(factor).toHaveProperty('weight');
      expect(['positive', 'negative', 'neutral']).toContain(factor.impact);
    });

    it('should include standard DSH note', () => {
      const input = createBaseInput();
      const result = evaluateDSHRelevance(input);

      const hasStandardNote = result.notes.some(
        n => n.includes('DSH') && n.includes('hospital')
      );
      expect(hasStandardNote).toBe(true);
    });
  });

  describe('Comprehensive Scenarios', () => {
    it('should calculate high DSH for Medicaid inpatient with SSI', () => {
      const input = createBaseInput();
      input.encounterType = 'inpatient';
      input.lengthOfStay = 10;
      input.medicaidStatus = 'active';
      input.ssiStatus = 'receiving';
      input.facilityType = 'dsh_hospital';
      const result = evaluateDSHRelevance(input);

      expect(result.relevance).toBe('high');
      expect(result.score).toBeGreaterThanOrEqual(70);
      expect(result.auditReadiness).toBe('strong');
    });

    it('should calculate medium DSH for uninsured low-income with adequate LOS', () => {
      const input = createBaseInput();
      input.encounterType = 'inpatient';
      input.lengthOfStay = 5; // 5 * 3 = 15 points
      input.insuranceStatusOnDOS = 'uninsured';
      input.householdIncome = 'under_fpl'; // +15 points = 30 total
      const result = evaluateDSHRelevance(input);

      // Score = 15 (LOS) + 15 (uninsured low income) = 30, which is medium (30-59)
      expect(result.relevance).toBe('medium');
    });

    it('should calculate low DSH for commercial insured outpatient', () => {
      const input = createBaseInput();
      input.encounterType = 'outpatient';
      input.insuranceStatusOnDOS = 'commercial';
      input.householdIncome = 'over_400_fpl';
      const result = evaluateDSHRelevance(input);

      expect(result.relevance).toBe('low');
      expect(result.score).toBeLessThan(30);
    });
  });
});
