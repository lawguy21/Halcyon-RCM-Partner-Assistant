/**
 * Dual-Eligible Coordination Engine Tests
 *
 * Tests dual-eligible beneficiary classification and coordination of benefits
 */

import {
  evaluateDualEligible,
  isQMBBeneficiary,
  canBalanceBill,
  getCrossoverRequirements,
  DualEligibleInput,
  DualEligibleCategory,
  MedicarePartStatus,
  MedicaidStatus,
} from '../engines/dual-eligible';

// Test fixtures
function createBaseInput(overrides: Partial<DualEligibleInput> = {}): DualEligibleInput {
  return {
    dateOfBirth: new Date(1950, 5, 15),
    dateOfService: new Date(),
    medicarePartA: 'enrolled',
    medicarePartB: 'enrolled',
    medicarePartD: 'enrolled',
    hasMedicareAdvantage: false,
    medicaidStatus: 'active',
    medicaidState: 'CA',
    medicaidScopeOfBenefits: 'full',
    hasDSNP: false,
    hasPACE: false,
    hasLIS: false,
    ...overrides,
  };
}

describe('Dual-Eligible Coordination Engine', () => {
  // ============================================================================
  // QMB, SLMB, QI CLASSIFICATIONS
  // ============================================================================

  describe('QMB Classification', () => {
    it('should classify as QMB with qmb scope of benefits', () => {
      const input = createBaseInput({
        medicaidScopeOfBenefits: 'qmb',
      });
      const result = evaluateDualEligible(input);

      expect(result.dualCategory).toBe('qmb_only');
      expect(result.isDualEligible).toBe(true);
    });

    it('should have QMB benefits include cost-sharing coverage', () => {
      const input = createBaseInput({
        medicaidScopeOfBenefits: 'qmb',
      });
      const result = evaluateDualEligible(input);

      expect(result.medicaidCoversCostSharing).toBe(true);
      expect(result.medicaidCoversPremiums).toBe(true);
    });

    it('should include premium and deductible coverage in QMB benefits', () => {
      const input = createBaseInput({
        medicaidScopeOfBenefits: 'qmb',
      });
      const result = evaluateDualEligible(input);

      expect(result.medicaidCoveredBenefits.some(b => b.includes('premium'))).toBe(true);
      expect(result.medicaidCoveredBenefits.some(b => b.includes('deductible'))).toBe(true);
    });

    it('should prohibit balance billing for QMB beneficiaries', () => {
      const input = createBaseInput({
        medicaidScopeOfBenefits: 'qmb',
      });

      expect(isQMBBeneficiary(input)).toBe(true);
      expect(canBalanceBill(input)).toBe(false);
    });
  });

  describe('SLMB Classification', () => {
    it('should classify as SLMB with slmb scope of benefits', () => {
      const input = createBaseInput({
        medicaidScopeOfBenefits: 'slmb',
      });
      const result = evaluateDualEligible(input);

      expect(result.dualCategory).toBe('slmb_only');
      expect(result.isDualEligible).toBe(true);
    });

    it('should NOT have cost-sharing coverage for SLMB', () => {
      const input = createBaseInput({
        medicaidScopeOfBenefits: 'slmb',
      });
      const result = evaluateDualEligible(input);

      expect(result.medicaidCoversCostSharing).toBe(false);
      expect(result.medicaidCoversPremiums).toBe(true);
    });

    it('should only include Part B premium in SLMB benefits', () => {
      const input = createBaseInput({
        medicaidScopeOfBenefits: 'slmb',
      });
      const result = evaluateDualEligible(input);

      expect(result.medicaidCoveredBenefits).toContain('Medicare Part B premium');
      expect(result.medicaidCoveredBenefits.length).toBe(1);
    });

    it('should allow balance billing for SLMB beneficiaries', () => {
      const input = createBaseInput({
        medicaidScopeOfBenefits: 'slmb',
      });

      expect(isQMBBeneficiary(input)).toBe(false);
      expect(canBalanceBill(input)).toBe(true);
    });
  });

  describe('QI Classification', () => {
    it('should classify as QI with qi scope of benefits', () => {
      const input = createBaseInput({
        medicaidScopeOfBenefits: 'qi',
      });
      const result = evaluateDualEligible(input);

      expect(result.dualCategory).toBe('qi');
      expect(result.isDualEligible).toBe(true);
    });

    it('should NOT have cost-sharing coverage for QI', () => {
      const input = createBaseInput({
        medicaidScopeOfBenefits: 'qi',
      });
      const result = evaluateDualEligible(input);

      expect(result.medicaidCoversCostSharing).toBe(false);
      expect(result.medicaidCoversPremiums).toBe(true);
    });

    it('should only include Part B premium in QI benefits', () => {
      const input = createBaseInput({
        medicaidScopeOfBenefits: 'qi',
      });
      const result = evaluateDualEligible(input);

      expect(result.medicaidCoveredBenefits).toContain('Medicare Part B premium');
    });
  });

  describe('Full Dual-Eligible Classification', () => {
    it('should classify as full dual with full scope of benefits', () => {
      const input = createBaseInput({
        medicaidScopeOfBenefits: 'full',
      });
      const result = evaluateDualEligible(input);

      expect(result.dualCategory).toBe('full_dual');
      expect(result.isDualEligible).toBe(true);
    });

    it('should have all benefits for full dual', () => {
      const input = createBaseInput({
        medicaidScopeOfBenefits: 'full',
      });
      const result = evaluateDualEligible(input);

      expect(result.medicaidCoversCostSharing).toBe(true);
      expect(result.medicaidCoversPremiums).toBe(true);
      expect(result.medicaidCoveredBenefits.length).toBeGreaterThan(5);
    });

    it('should include nursing facility care in full dual benefits', () => {
      const input = createBaseInput({
        medicaidScopeOfBenefits: 'full',
      });
      const result = evaluateDualEligible(input);

      expect(result.medicaidCoveredBenefits.some(b => b.includes('Nursing facility'))).toBe(true);
    });

    it('should prohibit balance billing for full dual beneficiaries', () => {
      const input = createBaseInput({
        medicaidScopeOfBenefits: 'full',
      });

      expect(isQMBBeneficiary(input)).toBe(true);
      expect(canBalanceBill(input)).toBe(false);
    });
  });

  describe('Partial Dual Classification', () => {
    it('should classify as partial dual with limited scope', () => {
      const input = createBaseInput({
        medicaidScopeOfBenefits: 'limited',
      });
      const result = evaluateDualEligible(input);

      expect(result.dualCategory).toBe('partial_dual');
      expect(result.isDualEligible).toBe(true);
    });
  });

  describe('Income-Based Classification', () => {
    it('should classify as full dual for income under QMB threshold', () => {
      const input = createBaseInput({
        medicaidScopeOfBenefits: undefined,
        monthlyIncome: 1200, // Under QMB threshold
      });
      const result = evaluateDualEligible(input);

      expect(result.dualCategory).toBe('full_dual');
    });

    it('should classify as SLMB for income between QMB and SLMB thresholds', () => {
      const input = createBaseInput({
        medicaidScopeOfBenefits: undefined,
        monthlyIncome: 1400, // Between QMB and SLMB
      });
      const result = evaluateDualEligible(input);

      expect(result.dualCategory).toBe('slmb_only');
    });

    it('should classify as QI for income between SLMB and QI thresholds', () => {
      const input = createBaseInput({
        medicaidScopeOfBenefits: undefined,
        monthlyIncome: 1600, // Between SLMB and QI
      });
      const result = evaluateDualEligible(input);

      expect(result.dualCategory).toBe('qi');
    });
  });

  // ============================================================================
  // MEDICARE/MEDICAID COORDINATION
  // ============================================================================

  describe('Medicare/Medicaid Coordination', () => {
    describe('Primary Payer Determination', () => {
      it('should identify Medicare as primary for traditional Medicare', () => {
        const input = createBaseInput({
          hasMedicareAdvantage: false,
          hasPACE: false,
        });
        const result = evaluateDualEligible(input);

        expect(result.primaryPayer).toBe('medicare');
      });

      it('should identify Medicare Advantage as primary when enrolled', () => {
        const input = createBaseInput({
          hasMedicareAdvantage: true,
        });
        const result = evaluateDualEligible(input);

        expect(result.primaryPayer).toBe('medicare_advantage');
      });

      it('should identify PACE as primary when enrolled', () => {
        const input = createBaseInput({
          hasPACE: true,
        });
        const result = evaluateDualEligible(input);

        expect(result.primaryPayer).toBe('pace');
      });

      it('should identify D-SNP as Medicare Advantage', () => {
        const input = createBaseInput({
          hasDSNP: true,
        });
        const result = evaluateDualEligible(input);

        expect(result.primaryPayer).toBe('medicare_advantage');
      });
    });

    describe('Secondary Payer Determination', () => {
      it('should identify Medicaid as secondary for dual eligible', () => {
        const input = createBaseInput();
        const result = evaluateDualEligible(input);

        expect(result.secondaryPayer).toBe('medicaid');
      });

      it('should have no secondary payer for non-dual', () => {
        const input = createBaseInput({
          medicaidStatus: 'inactive',
        });
        const result = evaluateDualEligible(input);

        expect(result.secondaryPayer).toBeUndefined();
      });
    });

    describe('Medicare Benefits', () => {
      it('should include Part A benefits when enrolled', () => {
        const input = createBaseInput({
          medicarePartA: 'enrolled',
        });
        const result = evaluateDualEligible(input);

        expect(result.medicareCoveredBenefits.some(b => b.includes('Inpatient hospital'))).toBe(true);
        expect(result.medicareCoveredBenefits.some(b => b.includes('Skilled nursing'))).toBe(true);
      });

      it('should include Part B benefits when enrolled', () => {
        const input = createBaseInput({
          medicarePartB: 'enrolled',
        });
        const result = evaluateDualEligible(input);

        expect(result.medicareCoveredBenefits.some(b => b.includes('Physician'))).toBe(true);
        expect(result.medicareCoveredBenefits.some(b => b.includes('Outpatient'))).toBe(true);
      });

      it('should include Part D benefits when enrolled', () => {
        const input = createBaseInput({
          medicarePartD: 'enrolled',
        });
        const result = evaluateDualEligible(input);

        expect(result.medicareCoveredBenefits.some(b => b.includes('Prescription'))).toBe(true);
      });

      it('should not include Part A benefits when not enrolled', () => {
        const input = createBaseInput({
          medicarePartA: 'not_enrolled',
        });
        const result = evaluateDualEligible(input);

        expect(result.medicareCoveredBenefits.some(b => b.includes('Inpatient hospital'))).toBe(false);
      });
    });
  });

  // ============================================================================
  // BILLING INSTRUCTIONS
  // ============================================================================

  describe('Billing Instructions', () => {
    it('should provide step-by-step billing instructions', () => {
      const input = createBaseInput();
      const result = evaluateDualEligible(input);

      expect(result.billingInstructions.length).toBeGreaterThan(0);
      expect(result.billingInstructions[0].step).toBe(1);
    });

    it('should instruct Medicare as primary for traditional Medicare', () => {
      const input = createBaseInput({
        hasMedicareAdvantage: false,
      });
      const result = evaluateDualEligible(input);

      const primaryInstruction = result.billingInstructions[0];
      expect(primaryInstruction.payer).toBe('Medicare');
    });

    it('should instruct Medicare Advantage as primary when enrolled', () => {
      const input = createBaseInput({
        hasMedicareAdvantage: true,
      });
      const result = evaluateDualEligible(input);

      const primaryInstruction = result.billingInstructions[0];
      expect(primaryInstruction.payer).toBe('Medicare Advantage');
    });

    it('should instruct PACE billing for PACE enrollees', () => {
      const input = createBaseInput({
        hasPACE: true,
      });
      const result = evaluateDualEligible(input);

      expect(result.billingInstructions[0].payer).toBe('PACE');
      expect(result.billingInstructions.length).toBe(1); // Only PACE billing needed
    });

    it('should include crossover claim instruction for QMB/full dual', () => {
      const input = createBaseInput({
        medicaidScopeOfBenefits: 'qmb',
      });
      const result = evaluateDualEligible(input);

      expect(result.billingInstructions.some(b => b.instruction.includes('crossover'))).toBe(true);
    });

    it('should include balance billing prohibition for QMB', () => {
      const input = createBaseInput({
        medicaidScopeOfBenefits: 'qmb',
      });
      const result = evaluateDualEligible(input);

      expect(result.billingInstructions.some(b => b.instruction.includes('NOT bill patient'))).toBe(true);
    });
  });

  // ============================================================================
  // SPECIAL PROGRAMS
  // ============================================================================

  describe('Special Programs', () => {
    it('should include D-SNP program information', () => {
      const input = createBaseInput({
        hasDSNP: true,
      });
      const result = evaluateDualEligible(input);

      const dsnpProgram = result.specialPrograms.find(p => p.program.includes('D-SNP'));
      expect(dsnpProgram).toBeDefined();
      expect(dsnpProgram?.enrolled).toBe(true);
    });

    it('should include PACE program information', () => {
      const input = createBaseInput({
        hasPACE: true,
      });
      const result = evaluateDualEligible(input);

      const paceProgram = result.specialPrograms.find(p => p.program.includes('PACE'));
      expect(paceProgram).toBeDefined();
      expect(paceProgram?.enrolled).toBe(true);
    });

    it('should include LIS/Extra Help program information', () => {
      const input = createBaseInput({
        hasLIS: true,
      });
      const result = evaluateDualEligible(input);

      const lisProgram = result.specialPrograms.find(p => p.program.includes('LIS'));
      expect(lisProgram).toBeDefined();
      expect(lisProgram?.enrolled).toBe(true);
    });

    it('should suggest enrollment for non-enrolled programs', () => {
      const input = createBaseInput({
        hasDSNP: false,
        hasPACE: false,
        hasLIS: false,
      });
      const result = evaluateDualEligible(input);

      result.specialPrograms.forEach(program => {
        expect(program.enrolled).toBe(false);
        expect(program.description.includes('Not enrolled')).toBe(true);
      });
    });
  });

  // ============================================================================
  // ACTIONS AND NOTES
  // ============================================================================

  describe('Actions and Notes', () => {
    it('should include balance billing warning for QMB', () => {
      const input = createBaseInput({
        medicaidScopeOfBenefits: 'qmb',
      });
      const result = evaluateDualEligible(input);

      expect(result.actions.some(a => a.includes('balance bill'))).toBe(true);
      expect(result.notes.some(n => n.includes('balance billing'))).toBe(true);
    });

    it('should suggest D-SNP counseling for non-enrolled', () => {
      const input = createBaseInput({
        hasDSNP: false,
        hasPACE: false,
      });
      const result = evaluateDualEligible(input);

      expect(result.actions.some(a => a.includes('D-SNP'))).toBe(true);
    });

    it('should suggest LIS screening when not enrolled', () => {
      const input = createBaseInput({
        hasLIS: false,
        medicarePartD: 'enrolled',
      });
      const result = evaluateDualEligible(input);

      expect(result.actions.some(a => a.includes('Low-Income Subsidy'))).toBe(true);
    });

    it('should include PACE coordination actions when enrolled', () => {
      const input = createBaseInput({
        hasPACE: true,
      });
      const result = evaluateDualEligible(input);

      expect(result.actions.some(a => a.includes('PACE'))).toBe(true);
    });

    it('should include spend-down tracking for spend-down status', () => {
      const input = createBaseInput({
        medicaidStatus: 'spend_down',
      });
      const result = evaluateDualEligible(input);

      expect(result.actions.some(a => a.includes('spend-down'))).toBe(true);
    });

    it('should include state in notes', () => {
      const input = createBaseInput({
        medicaidState: 'TX',
      });
      const result = evaluateDualEligible(input);

      expect(result.notes.some(n => n.includes('TX'))).toBe(true);
    });
  });

  // ============================================================================
  // NON-DUAL SCENARIOS
  // ============================================================================

  describe('Non-Dual Scenarios', () => {
    it('should classify as not_dual when Medicaid inactive', () => {
      const input = createBaseInput({
        medicaidStatus: 'inactive',
      });
      const result = evaluateDualEligible(input);

      expect(result.dualCategory).toBe('not_dual');
      expect(result.isDualEligible).toBe(false);
    });

    it('should classify as not_dual when no Medicare', () => {
      const input = createBaseInput({
        medicarePartA: 'not_enrolled',
        medicarePartB: 'not_enrolled',
      });
      const result = evaluateDualEligible(input);

      expect(result.dualCategory).toBe('not_dual');
      expect(result.isDualEligible).toBe(false);
    });

    it('should not have secondary payer when not dual', () => {
      const input = createBaseInput({
        medicaidStatus: 'inactive',
      });
      const result = evaluateDualEligible(input);

      expect(result.secondaryPayer).toBeUndefined();
    });

    it('should include single payer billing action for non-dual', () => {
      const input = createBaseInput({
        medicaidStatus: 'inactive',
      });
      const result = evaluateDualEligible(input);

      expect(result.actions.some(a => a.includes('single payer'))).toBe(true);
    });

    it('should monitor pending Medicaid status', () => {
      const input = createBaseInput({
        medicaidStatus: 'pending',
      });
      const result = evaluateDualEligible(input);

      expect(result.actions.some(a => a.includes('Monitor Medicaid'))).toBe(true);
    });
  });

  // ============================================================================
  // CROSSOVER REQUIREMENTS
  // ============================================================================

  describe('Crossover Requirements', () => {
    it('should require crossover for full dual', () => {
      const input = createBaseInput({
        medicaidScopeOfBenefits: 'full',
      });
      const requirements = getCrossoverRequirements(input);

      expect(requirements.required).toBe(true);
    });

    it('should require crossover for QMB', () => {
      const input = createBaseInput({
        medicaidScopeOfBenefits: 'qmb',
      });
      const requirements = getCrossoverRequirements(input);

      expect(requirements.required).toBe(true);
    });

    it('should require crossover for partial dual', () => {
      const input = createBaseInput({
        medicaidScopeOfBenefits: 'limited',
      });
      const requirements = getCrossoverRequirements(input);

      expect(requirements.required).toBe(true);
    });

    it('should indicate automatic crossover for D-SNP', () => {
      const input = createBaseInput({
        hasDSNP: true,
      });
      const requirements = getCrossoverRequirements(input);

      expect(requirements.automatic).toBe(true);
    });

    it('should indicate automatic crossover for Medicare Advantage', () => {
      const input = createBaseInput({
        hasMedicareAdvantage: true,
      });
      const requirements = getCrossoverRequirements(input);

      expect(requirements.automatic).toBe(true);
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle only Part A enrolled', () => {
      const input = createBaseInput({
        medicarePartA: 'enrolled',
        medicarePartB: 'not_enrolled',
        medicarePartD: 'not_enrolled',
      });
      const result = evaluateDualEligible(input);

      expect(result.isDualEligible).toBe(true);
      expect(result.medicareCoveredBenefits.some(b => b.includes('Inpatient'))).toBe(true);
    });

    it('should handle only Part B enrolled', () => {
      const input = createBaseInput({
        medicarePartA: 'not_enrolled',
        medicarePartB: 'enrolled',
        medicarePartD: 'not_enrolled',
      });
      const result = evaluateDualEligible(input);

      expect(result.isDualEligible).toBe(true);
      expect(result.medicareCoveredBenefits.some(b => b.includes('Physician'))).toBe(true);
    });

    it('should handle pending Medicare status', () => {
      const input = createBaseInput({
        medicarePartA: 'pending',
        medicarePartB: 'pending',
      });
      const result = evaluateDualEligible(input);

      expect(result.dualCategory).toBe('not_dual');
    });

    it('should handle terminated Medicare status', () => {
      const input = createBaseInput({
        medicarePartA: 'terminated',
        medicarePartB: 'terminated',
      });
      const result = evaluateDualEligible(input);

      expect(result.dualCategory).toBe('not_dual');
    });

    it('should handle both PACE and D-SNP (PACE takes precedence)', () => {
      const input = createBaseInput({
        hasPACE: true,
        hasDSNP: true,
      });
      const result = evaluateDualEligible(input);

      expect(result.primaryPayer).toBe('pace');
    });

    it('should handle undefined scope with undefined income', () => {
      const input = createBaseInput({
        medicaidScopeOfBenefits: undefined,
        monthlyIncome: undefined,
      });
      const result = evaluateDualEligible(input);

      expect(result.dualCategory).toBe('partial_dual');
    });

    it('should handle very high income', () => {
      const input = createBaseInput({
        medicaidScopeOfBenefits: undefined,
        monthlyIncome: 10000,
      });
      const result = evaluateDualEligible(input);

      expect(result.dualCategory).toBe('partial_dual');
    });

    it('should handle all enrollment statuses', () => {
      const statuses: MedicarePartStatus[] = ['enrolled', 'not_enrolled', 'pending', 'terminated'];

      statuses.forEach(status => {
        const input = createBaseInput({
          medicarePartA: status,
        });
        const result = evaluateDualEligible(input);
        expect(result).toBeDefined();
      });
    });

    it('should handle all Medicaid statuses', () => {
      const statuses: MedicaidStatus[] = ['active', 'inactive', 'pending', 'spend_down'];

      statuses.forEach(status => {
        const input = createBaseInput({
          medicaidStatus: status,
        });
        const result = evaluateDualEligible(input);
        expect(result).toBeDefined();
      });
    });
  });

  // ============================================================================
  // COMPLETE RESULT STRUCTURE
  // ============================================================================

  describe('Complete Result Structure', () => {
    it('should return all required fields', () => {
      const input = createBaseInput();
      const result = evaluateDualEligible(input);

      expect(result).toHaveProperty('dualCategory');
      expect(result).toHaveProperty('isDualEligible');
      expect(result).toHaveProperty('primaryPayer');
      expect(result).toHaveProperty('secondaryPayer');
      expect(result).toHaveProperty('medicaidCoversCostSharing');
      expect(result).toHaveProperty('medicaidCoversPremiums');
      expect(result).toHaveProperty('medicareCoveredBenefits');
      expect(result).toHaveProperty('medicaidCoveredBenefits');
      expect(result).toHaveProperty('billingInstructions');
      expect(result).toHaveProperty('actions');
      expect(result).toHaveProperty('notes');
      expect(result).toHaveProperty('specialPrograms');
    });

    it('should have proper billing instruction structure', () => {
      const input = createBaseInput();
      const result = evaluateDualEligible(input);

      result.billingInstructions.forEach(instruction => {
        expect(instruction).toHaveProperty('step');
        expect(instruction).toHaveProperty('instruction');
        expect(instruction).toHaveProperty('payer');
        expect(instruction).toHaveProperty('expectedOutcome');
      });
    });

    it('should have proper special program structure', () => {
      const input = createBaseInput();
      const result = evaluateDualEligible(input);

      result.specialPrograms.forEach(program => {
        expect(program).toHaveProperty('program');
        expect(program).toHaveProperty('enrolled');
        expect(program).toHaveProperty('description');
      });
    });
  });
});
