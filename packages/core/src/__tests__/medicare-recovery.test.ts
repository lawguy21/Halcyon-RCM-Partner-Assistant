/**
 * Medicare Recovery Engine Tests (MC1-MC2 Tree)
 *
 * Tests the Medicare recovery pathway evaluation logic
 */

import { evaluateMedicareRecovery } from '../engines/medicare-recovery';
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

describe('evaluateMedicareRecovery', () => {
  describe('MC1 - Medicare Active on DOS', () => {
    describe('Part A - Inpatient', () => {
      it('should return active_on_dos for Part A inpatient stay', () => {
        const input = createBaseInput();
        input.medicareStatus = 'active_part_a';
        input.encounterType = 'inpatient';
        const result = evaluateMedicareRecovery(input);

        expect(result.status).toBe('active_on_dos');
        expect(result.confidence).toBe(95);
        expect(result.pathway).toBe('MC1: Medicare Part A active on DOS');
      });

      it('should include Part A billing action', () => {
        const input = createBaseInput();
        input.medicareStatus = 'active_part_a';
        input.encounterType = 'inpatient';
        const result = evaluateMedicareRecovery(input);

        const hasBillingAction = result.actions.some(
          a => a.includes('Bill Medicare Part A')
        );
        expect(hasBillingAction).toBe(true);
      });

      it('should include MSP verification note', () => {
        const input = createBaseInput();
        input.medicareStatus = 'active_part_a';
        input.encounterType = 'inpatient';
        const result = evaluateMedicareRecovery(input);

        const hasMSPNote = result.notes.some(
          n => n.includes('MSP')
        );
        expect(hasMSPNote).toBe(true);
      });

      it('should return early for active Part A inpatient', () => {
        const input = createBaseInput();
        input.medicareStatus = 'active_part_a';
        input.encounterType = 'inpatient';
        input.ssdiStatus = 'receiving'; // Would normally trigger MC2
        const result = evaluateMedicareRecovery(input);

        // Should have MC1 pathway only
        expect(result.pathway).toContain('MC1');
        expect(result.pathway).not.toContain('MC2');
      });
    });

    describe('Part B - Outpatient', () => {
      it('should return active_on_dos for Part B outpatient', () => {
        const input = createBaseInput();
        input.medicareStatus = 'active_part_b';
        input.encounterType = 'outpatient';
        const result = evaluateMedicareRecovery(input);

        expect(result.status).toBe('active_on_dos');
        expect(result.confidence).toBe(90);
        expect(result.pathway).toBe('MC1: Medicare Part B active on DOS');
      });

      it('should return active_on_dos for Part B ED visit', () => {
        const input = createBaseInput();
        input.medicareStatus = 'active_part_b';
        input.encounterType = 'ed';
        const result = evaluateMedicareRecovery(input);

        expect(result.status).toBe('active_on_dos');
      });

      it('should return active_on_dos for Part B observation', () => {
        const input = createBaseInput();
        input.medicareStatus = 'active_part_b';
        input.encounterType = 'observation';
        const result = evaluateMedicareRecovery(input);

        expect(result.status).toBe('active_on_dos');
      });

      it('should include Part B billing action', () => {
        const input = createBaseInput();
        input.medicareStatus = 'active_part_b';
        input.encounterType = 'outpatient';
        const result = evaluateMedicareRecovery(input);

        const hasBillingAction = result.actions.some(
          a => a.includes('Bill Medicare Part B')
        );
        expect(hasBillingAction).toBe(true);
      });

      it('should note Part B covers outpatient', () => {
        const input = createBaseInput();
        input.medicareStatus = 'active_part_b';
        input.encounterType = 'outpatient';
        const result = evaluateMedicareRecovery(input);

        const hasOutpatientNote = result.notes.some(
          n => n.includes('Part B') && n.includes('outpatient')
        );
        expect(hasOutpatientNote).toBe(true);
      });
    });

    describe('Part B with Inpatient (mismatch)', () => {
      it('should NOT return active_on_dos for Part B only with inpatient', () => {
        const input = createBaseInput();
        input.medicareStatus = 'active_part_b';
        input.encounterType = 'inpatient';
        const result = evaluateMedicareRecovery(input);

        // Part B doesn't cover inpatient - should not be active_on_dos
        expect(result.status).not.toBe('active_on_dos');
      });

      it('should note Part A needed for inpatient', () => {
        const input = createBaseInput();
        input.medicareStatus = 'active_part_b';
        input.encounterType = 'inpatient';
        const result = evaluateMedicareRecovery(input);

        const hasPartANote = result.notes.some(
          n => n.includes('Part A') && n.includes('inpatient')
        );
        expect(hasPartANote).toBe(true);
      });

      it('should include verify Part A action', () => {
        const input = createBaseInput();
        input.medicareStatus = 'active_part_b';
        input.encounterType = 'inpatient';
        const result = evaluateMedicareRecovery(input);

        const hasVerifyAction = result.actions.some(
          a => a.includes('Part A') && a.toLowerCase().includes('verify')
        );
        expect(hasVerifyAction).toBe(true);
      });
    });
  });

  describe('MC2 - SSDI to Future Medicare', () => {
    describe('SSDI Receiving', () => {
      it('should return future_likely for SSDI receiving', () => {
        const input = createBaseInput();
        input.ssdiStatus = 'receiving';
        const result = evaluateMedicareRecovery(input);

        expect(result.status).toBe('future_likely');
        expect(result.confidence).toBe(85);
        expect(result.pathway).toContain('SSDI recipient');
      });

      it('should include 24-month waiting period note', () => {
        const input = createBaseInput();
        input.ssdiStatus = 'receiving';
        const result = evaluateMedicareRecovery(input);

        const hasWaitingNote = result.notes.some(
          n => n.includes('24 month')
        );
        expect(hasWaitingNote).toBe(true);
      });

      it('should include estimated time to eligibility', () => {
        const input = createBaseInput();
        input.ssdiStatus = 'receiving';
        const result = evaluateMedicareRecovery(input);

        expect(result.estimatedTimeToEligibility).toBeDefined();
        expect(result.estimatedTimeToEligibility).toContain('24');
      });

      it('should include verify SSDI date action', () => {
        const input = createBaseInput();
        input.ssdiStatus = 'receiving';
        const result = evaluateMedicareRecovery(input);

        const hasVerifyAction = result.actions.some(
          a => a.includes('SSDI') && a.toLowerCase().includes('date')
        );
        expect(hasVerifyAction).toBe(true);
      });
    });

    describe('SSDI Pending', () => {
      it('should return future_likely for SSDI pending', () => {
        const input = createBaseInput();
        input.ssdiStatus = 'pending';
        const result = evaluateMedicareRecovery(input);

        expect(result.status).toBe('future_likely');
        expect(result.confidence).toBe(60);
      });

      it('should include longer timeline estimate for pending', () => {
        const input = createBaseInput();
        input.ssdiStatus = 'pending';
        const result = evaluateMedicareRecovery(input);

        expect(result.estimatedTimeToEligibility).toBeDefined();
        // Pending adds approval time to 24-month wait
        expect(result.estimatedTimeToEligibility).toContain('36');
      });

      it('should include monitor SSDI action', () => {
        const input = createBaseInput();
        input.ssdiStatus = 'pending';
        const result = evaluateMedicareRecovery(input);

        const hasMonitorAction = result.actions.some(
          a => a.toLowerCase().includes('monitor') && a.includes('SSDI')
        );
        expect(hasMonitorAction).toBe(true);
      });

      it('should note conditional on SSDI approval', () => {
        const input = createBaseInput();
        input.ssdiStatus = 'pending';
        const result = evaluateMedicareRecovery(input);

        const hasConditionalNote = result.notes.some(
          n => n.includes('SSDI approved')
        );
        expect(hasConditionalNote).toBe(true);
      });
    });

    describe('SSDI Eligibility Likely', () => {
      it('should return future_likely when SSDI eligibility likely with high disability', () => {
        const input = createBaseInput();
        input.ssdiEligibilityLikely = true;
        input.disabilityLikelihood = 'high';
        const result = evaluateMedicareRecovery(input);

        expect(result.status).toBe('future_likely');
        expect(result.confidence).toBe(50);
      });

      it('should include longest timeline estimate', () => {
        const input = createBaseInput();
        input.ssdiEligibilityLikely = true;
        input.disabilityLikelihood = 'high';
        const result = evaluateMedicareRecovery(input);

        expect(result.estimatedTimeToEligibility).toBeDefined();
        expect(result.estimatedTimeToEligibility).toContain('48');
      });

      it('should recommend SSDI filing action', () => {
        const input = createBaseInput();
        input.ssdiEligibilityLikely = true;
        input.disabilityLikelihood = 'high';
        const result = evaluateMedicareRecovery(input);

        const hasFileAction = result.actions.some(
          a => a.toLowerCase().includes('initiate') && a.includes('SSDI')
        );
        expect(hasFileAction).toBe(true);
      });

      it('should NOT trigger for low disability likelihood', () => {
        const input = createBaseInput();
        input.ssdiEligibilityLikely = true;
        input.disabilityLikelihood = 'low';
        const result = evaluateMedicareRecovery(input);

        // Should not set future_likely just because ssdiEligibilityLikely is true
        // if disability likelihood is low
        expect(result.status).not.toBe('future_likely');
      });
    });
  });

  describe('Unlikely Medicare', () => {
    it('should return unlikely when no Medicare pathways', () => {
      const input = createBaseInput();
      input.medicareStatus = 'none';
      input.ssdiStatus = 'never_applied';
      input.ssdiEligibilityLikely = false;
      const result = evaluateMedicareRecovery(input);

      expect(result.status).toBe('unlikely');
      expect(result.pathway).toBe('No Medicare pathway identified');
    });

    it('should note patient not eligible', () => {
      const input = createBaseInput();
      input.medicareStatus = 'none';
      input.ssdiStatus = 'never_applied';
      const result = evaluateMedicareRecovery(input);

      const hasIneligibleNote = result.notes.some(
        n => n.toLowerCase().includes('not') && n.toLowerCase().includes('eligible')
      );
      expect(hasIneligibleNote).toBe(true);
    });

    it('should suggest SSDI consideration', () => {
      const input = createBaseInput();
      input.medicareStatus = 'none';
      input.ssdiStatus = 'never_applied';
      const result = evaluateMedicareRecovery(input);

      const hasSSDINote = result.notes.some(
        n => n.includes('SSDI')
      );
      expect(hasSSDINote).toBe(true);
    });

    it('should return unlikely for denied SSDI without other paths', () => {
      const input = createBaseInput();
      input.medicareStatus = 'none';
      input.ssdiStatus = 'denied';
      input.ssdiEligibilityLikely = false;
      const result = evaluateMedicareRecovery(input);

      expect(result.status).toBe('unlikely');
    });
  });

  describe('Result Structure', () => {
    it('should always return required fields', () => {
      const input = createBaseInput();
      const result = evaluateMedicareRecovery(input);

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('pathway');
      expect(result).toHaveProperty('actions');
      expect(result).toHaveProperty('notes');
    });

    it('should return valid status values', () => {
      const validStatuses = ['active_on_dos', 'future_likely', 'unlikely'];
      const input = createBaseInput();
      const result = evaluateMedicareRecovery(input);

      expect(validStatuses).toContain(result.status);
    });

    it('should return confidence between 0-100', () => {
      const input = createBaseInput();
      input.ssdiStatus = 'receiving';
      const result = evaluateMedicareRecovery(input);

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
    });

    it('should return actions as array', () => {
      const input = createBaseInput();
      const result = evaluateMedicareRecovery(input);

      expect(Array.isArray(result.actions)).toBe(true);
    });

    it('should return notes as array', () => {
      const input = createBaseInput();
      const result = evaluateMedicareRecovery(input);

      expect(Array.isArray(result.notes)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle pending Medicare status', () => {
      const input = createBaseInput();
      input.medicareStatus = 'pending';
      const result = evaluateMedicareRecovery(input);

      expect(result).toBeDefined();
      // Pending Medicare should be handled
    });

    it('should prioritize active Medicare over future SSDI pathway', () => {
      const input = createBaseInput();
      input.medicareStatus = 'active_part_a';
      input.encounterType = 'inpatient';
      input.ssdiStatus = 'receiving';
      const result = evaluateMedicareRecovery(input);

      expect(result.status).toBe('active_on_dos');
      expect(result.pathway).toContain('MC1');
    });

    it('should handle observation encounter type', () => {
      const input = createBaseInput();
      input.medicareStatus = 'active_part_b';
      input.encounterType = 'observation';
      const result = evaluateMedicareRecovery(input);

      expect(result.status).toBe('active_on_dos');
    });
  });
});
