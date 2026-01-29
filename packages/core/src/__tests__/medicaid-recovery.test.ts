/**
 * Medicaid Recovery Engine Tests (M1-M4 Tree)
 *
 * Tests the Medicaid recovery pathway evaluation logic
 */

import { evaluateMedicaidRecovery } from '../engines/medicaid-recovery';
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

describe('evaluateMedicaidRecovery', () => {
  describe('M1 - Active Medicaid on DOS', () => {
    it('should return confirmed status when Medicaid is active', () => {
      const input = createBaseInput();
      input.medicaidStatus = 'active';
      const result = evaluateMedicaidRecovery(input);

      expect(result.status).toBe('confirmed');
      expect(result.confidence).toBe(95);
      expect(result.pathway).toBe('M1: Active Medicaid on DOS');
    });

    it('should calculate 45% recovery rate for confirmed Medicaid', () => {
      const input = createBaseInput();
      input.medicaidStatus = 'active';
      input.totalCharges = 100000;
      const result = evaluateMedicaidRecovery(input);

      expect(result.estimatedRecovery).toBe(45000);
    });

    it('should estimate 4-8 weeks timeline for active Medicaid', () => {
      const input = createBaseInput();
      input.medicaidStatus = 'active';
      const result = evaluateMedicaidRecovery(input);

      expect(result.timelineWeeks).toBe('4-8 weeks');
    });

    it('should include direct billing action for active Medicaid', () => {
      const input = createBaseInput();
      input.medicaidStatus = 'active';
      const result = evaluateMedicaidRecovery(input);

      expect(result.actions).toContain('Bill Medicaid directly for date of service');
    });

    it('should return early for confirmed Medicaid (skip other pathways)', () => {
      const input = createBaseInput();
      input.medicaidStatus = 'active';
      input.ssiEligibilityLikely = true; // This would normally add SSI pathway notes
      const result = evaluateMedicaidRecovery(input);

      // Should only have M1 pathway, not SSI pathway mixed in
      expect(result.pathway).toBe('M1: Active Medicaid on DOS');
      expect(result.notes.length).toBeLessThan(4);
    });
  });

  describe('M2 - Retroactive Medicaid', () => {
    describe('Expansion States', () => {
      it('should return likely status for uninsured under 138% FPL in expansion state', () => {
        const input = createBaseInput();
        input.stateOfService = 'CA'; // Expansion state
        input.insuranceStatusOnDOS = 'uninsured';
        input.householdIncome = 'fpl_138';
        const result = evaluateMedicaidRecovery(input);

        expect(result.status).toBe('likely');
        expect(result.confidence).toBe(70);
        expect(result.pathway).toBe('M2: Retroactive Medicaid');
      });

      it('should return likely for income under FPL in expansion state', () => {
        const input = createBaseInput();
        input.stateOfService = 'NY'; // Expansion state
        input.insuranceStatusOnDOS = 'uninsured';
        input.householdIncome = 'under_fpl';
        const result = evaluateMedicaidRecovery(input);

        expect(result.status).toBe('likely');
      });

      it('should include expansion state note', () => {
        const input = createBaseInput();
        input.stateOfService = 'CA';
        input.insuranceStatusOnDOS = 'uninsured';
        input.householdIncome = 'under_fpl';
        const result = evaluateMedicaidRecovery(input);

        const hasExpansionNote = result.notes.some(
          n => n.includes('expansion') && n.includes('138%')
        );
        expect(hasExpansionNote).toBe(true);
      });

      it('should calculate 40% recovery rate for retroactive Medicaid', () => {
        const input = createBaseInput();
        input.stateOfService = 'CA';
        input.insuranceStatusOnDOS = 'uninsured';
        input.householdIncome = 'under_fpl';
        input.totalCharges = 100000;
        const result = evaluateMedicaidRecovery(input);

        expect(result.estimatedRecovery).toBe(40000);
      });
    });

    describe('Non-Expansion States', () => {
      it('should require under 100% FPL in non-expansion state', () => {
        const input = createBaseInput();
        input.stateOfService = 'TX'; // Non-expansion state
        input.insuranceStatusOnDOS = 'uninsured';
        input.householdIncome = 'under_fpl';
        const result = evaluateMedicaidRecovery(input);

        expect(result.status).toBe('likely');
      });

      it('should NOT qualify at 138% FPL in non-expansion state', () => {
        const input = createBaseInput();
        input.stateOfService = 'TX'; // Non-expansion state
        input.insuranceStatusOnDOS = 'uninsured';
        input.householdIncome = 'fpl_138';
        const result = evaluateMedicaidRecovery(input);

        // Should not qualify for M2 retroactive at 138% in non-expansion
        expect(result.status).not.toBe('likely');
      });

      it('should include non-expansion state note', () => {
        const input = createBaseInput();
        input.stateOfService = 'FL';
        input.insuranceStatusOnDOS = 'uninsured';
        input.householdIncome = 'under_fpl';
        const result = evaluateMedicaidRecovery(input);

        const hasNonExpansionNote = result.notes.some(
          n => n.includes('non-expansion') && n.includes('100%')
        );
        expect(hasNonExpansionNote).toBe(true);
      });
    });

    it('should include retroactive coverage request action', () => {
      const input = createBaseInput();
      input.stateOfService = 'CA';
      input.insuranceStatusOnDOS = 'uninsured';
      input.householdIncome = 'under_fpl';
      const result = evaluateMedicaidRecovery(input);

      const hasRetroAction = result.actions.some(
        a => a.toLowerCase().includes('retroactive')
      );
      expect(hasRetroAction).toBe(true);
    });

    it('should NOT trigger M2 if patient was insured on DOS', () => {
      const input = createBaseInput();
      input.insuranceStatusOnDOS = 'commercial';
      input.householdIncome = 'under_fpl';
      const result = evaluateMedicaidRecovery(input);

      expect(result.pathway).not.toBe('M2: Retroactive Medicaid');
    });
  });

  describe('M3 - SSI-Linked Medicaid', () => {
    it('should identify SSI pathway when SSI eligibility is likely', () => {
      const input = createBaseInput();
      input.ssiEligibilityLikely = true;
      input.insuranceStatusOnDOS = 'uninsured';
      input.householdIncome = 'over_400_fpl'; // Not income eligible
      const result = evaluateMedicaidRecovery(input);

      expect(result.pathway).toContain('SSI');
      expect(result.status).toBe('possible');
    });

    it('should identify SSI pathway when SSI is pending', () => {
      const input = createBaseInput();
      input.ssiStatus = 'pending';
      input.insuranceStatusOnDOS = 'uninsured';
      input.householdIncome = 'over_400_fpl';
      const result = evaluateMedicaidRecovery(input);

      expect(result.pathway).toContain('SSI');
    });

    it('should have at least 60% confidence for SSI pathway', () => {
      const input = createBaseInput();
      input.ssiEligibilityLikely = true;
      input.insuranceStatusOnDOS = 'uninsured';
      input.householdIncome = 'over_400_fpl';
      const result = evaluateMedicaidRecovery(input);

      expect(result.confidence).toBeGreaterThanOrEqual(60);
    });

    it('should include SSI coordination action', () => {
      const input = createBaseInput();
      input.ssiEligibilityLikely = true;
      const result = evaluateMedicaidRecovery(input);

      const hasSSIAction = result.actions.some(
        a => a.toLowerCase().includes('ssi')
      );
      expect(hasSSIAction).toBe(true);
    });

    it('should note automatic Medicaid with SSI approval', () => {
      const input = createBaseInput();
      input.ssiEligibilityLikely = true;
      const result = evaluateMedicaidRecovery(input);

      const hasAutoNote = result.notes.some(
        n => n.includes('SSI') && n.includes('Medicaid')
      );
      expect(hasAutoNote).toBe(true);
    });

    it('should keep likely status if both M2 and M3 qualify', () => {
      const input = createBaseInput();
      input.ssiEligibilityLikely = true;
      input.insuranceStatusOnDOS = 'uninsured';
      input.householdIncome = 'under_fpl'; // Also qualifies for M2
      const result = evaluateMedicaidRecovery(input);

      expect(result.status).toBe('likely'); // M2 sets likely, M3 should preserve it
    });
  });

  describe('M4 - Medicaid Pending', () => {
    it('should return likely status when Medicaid is pending', () => {
      const input = createBaseInput();
      input.medicaidStatus = 'pending';
      const result = evaluateMedicaidRecovery(input);

      expect(result.status).toBe('likely');
      expect(result.confidence).toBe(75);
      expect(result.pathway).toBe('M4: Medicaid Application Pending');
    });

    it('should calculate 42% recovery rate for pending Medicaid', () => {
      const input = createBaseInput();
      input.medicaidStatus = 'pending';
      input.totalCharges = 100000;
      const result = evaluateMedicaidRecovery(input);

      expect(result.estimatedRecovery).toBe(42000);
    });

    it('should estimate 6-12 weeks timeline for pending', () => {
      const input = createBaseInput();
      input.medicaidStatus = 'pending';
      const result = evaluateMedicaidRecovery(input);

      expect(result.timelineWeeks).toBe('6-12 weeks');
    });

    it('should include tracking and follow-up actions', () => {
      const input = createBaseInput();
      input.medicaidStatus = 'pending';
      const result = evaluateMedicaidRecovery(input);

      const hasTrackAction = result.actions.some(
        a => a.toLowerCase().includes('track') || a.toLowerCase().includes('follow up')
      );
      expect(hasTrackAction).toBe(true);
    });
  });

  describe('Recently Terminated Medicaid', () => {
    it('should return possible or likely status for recently terminated', () => {
      const input = createBaseInput();
      input.medicaidStatus = 'recently_terminated';
      // Also set conditions that would trigger M2 path
      input.insuranceStatusOnDOS = 'uninsured';
      input.householdIncome = 'under_fpl';
      const result = evaluateMedicaidRecovery(input);

      // With M2 triggered first, status will be likely; otherwise possible
      expect(['possible', 'likely']).toContain(result.status);
    });

    it('should include reinstatement review action', () => {
      const input = createBaseInput();
      input.medicaidStatus = 'recently_terminated';
      const result = evaluateMedicaidRecovery(input);

      const hasReinstatementAction = result.actions.some(
        a => a.toLowerCase().includes('reinstatement') || a.toLowerCase().includes('termination')
      );
      expect(hasReinstatementAction).toBe(true);
    });

    it('should note procedural termination possibility', () => {
      const input = createBaseInput();
      input.medicaidStatus = 'recently_terminated';
      const result = evaluateMedicaidRecovery(input);

      const hasTermNote = result.notes.some(
        n => n.toLowerCase().includes('termination')
      );
      expect(hasTermNote).toBe(true);
    });
  });

  describe('Unlikely Medicaid', () => {
    it('should return unlikely when no pathways identified', () => {
      const input = createBaseInput();
      input.medicaidStatus = 'never';
      input.insuranceStatusOnDOS = 'commercial';
      input.householdIncome = 'over_400_fpl';
      input.ssiEligibilityLikely = false;
      const result = evaluateMedicaidRecovery(input);

      expect(result.status).toBe('unlikely');
      expect(result.pathway).toBe('No clear Medicaid pathway identified');
    });

    it('should suggest screening for other options', () => {
      const input = createBaseInput();
      input.medicaidStatus = 'never';
      input.insuranceStatusOnDOS = 'commercial';
      input.householdIncome = 'over_400_fpl';
      const result = evaluateMedicaidRecovery(input);

      const hasScreenAction = result.actions.some(
        a => a.toLowerCase().includes('screen') || a.toLowerCase().includes('other')
      );
      expect(hasScreenAction).toBe(true);
    });
  });

  describe('Result Structure', () => {
    it('should always return required fields', () => {
      const input = createBaseInput();
      const result = evaluateMedicaidRecovery(input);

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('pathway');
      expect(result).toHaveProperty('actions');
      expect(result).toHaveProperty('estimatedRecovery');
      expect(result).toHaveProperty('timelineWeeks');
      expect(result).toHaveProperty('notes');
    });

    it('should return actions as an array', () => {
      const input = createBaseInput();
      const result = evaluateMedicaidRecovery(input);

      expect(Array.isArray(result.actions)).toBe(true);
    });

    it('should return notes as an array', () => {
      const input = createBaseInput();
      const result = evaluateMedicaidRecovery(input);

      expect(Array.isArray(result.notes)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero charges', () => {
      const input = createBaseInput();
      input.medicaidStatus = 'active';
      input.totalCharges = 0;
      const result = evaluateMedicaidRecovery(input);

      expect(result.estimatedRecovery).toBe(0);
    });

    it('should handle very large charges', () => {
      const input = createBaseInput();
      input.medicaidStatus = 'active';
      input.totalCharges = 5000000;
      const result = evaluateMedicaidRecovery(input);

      expect(result.estimatedRecovery).toBe(2250000);
    });

    it('should handle all non-expansion states', () => {
      const nonExpansionStates = ['AL', 'FL', 'GA', 'KS', 'MS', 'SC', 'TN', 'TX', 'WI', 'WY'];

      for (const state of nonExpansionStates) {
        const input = createBaseInput();
        input.stateOfService = state;
        input.insuranceStatusOnDOS = 'uninsured';
        input.householdIncome = 'under_fpl';
        const result = evaluateMedicaidRecovery(input);

        expect(result).toBeDefined();
        expect(result.notes.some(n => n.includes('non-expansion'))).toBe(true);
      }
    });
  });
});
