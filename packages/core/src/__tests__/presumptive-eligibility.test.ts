/**
 * Presumptive Eligibility (HPE) Engine Tests
 *
 * Tests Hospital Presumptive Eligibility determination
 */

import {
  evaluatePresumptiveEligibility,
  stateHasHPEProgram,
  calculateCoverageEndDate,
  calculateApplicationDeadline,
  getPEIncomeThreshold,
  getHPEStatesByCategory,
  getHPEStateCounts,
  validatePEInput,
  HPE_STATES_CHILDREN,
  HPE_STATES_PREGNANT,
  HPE_STATES_ADULTS,
  HPE_STATES_FORMER_FOSTER_CARE,
  HPE_STATES_PARENT_CARETAKER,
  PE_FPL_THRESHOLDS,
  STATE_APPLICATION_DEADLINES,
  PresumptiveEligibilityInput,
  PEPatientCategory,
} from '../engines/presumptive-eligibility';

import { FPL_2024, calculateFPLThreshold } from '../engines/magi-calculator';

describe('Presumptive Eligibility Engine', () => {
  // ============================================================================
  // STATE-BY-STATE HPE AVAILABILITY
  // ============================================================================

  describe('State-by-State HPE Availability', () => {
    describe('Children Category', () => {
      it('should have HPE for children in California', () => {
        expect(stateHasHPEProgram('CA', 'child')).toBe(true);
      });

      it('should have HPE for children in New York', () => {
        expect(stateHasHPEProgram('NY', 'child')).toBe(true);
      });

      it('should have HPE for children in Texas', () => {
        expect(stateHasHPEProgram('TX', 'child')).toBe(true);
      });

      it('should NOT have HPE for children in all states', () => {
        // Check a state not in the children list
        const statesWithHPE = HPE_STATES_CHILDREN;
        const statesWithoutHPE = ['AL', 'AK', 'DE', 'HI', 'ID', 'KY', 'ME', 'MD', 'MS', 'MT', 'NE', 'NV', 'ND', 'OK', 'RI', 'SC', 'SD', 'TN', 'UT', 'VT', 'VA', 'WV', 'WY'];

        statesWithoutHPE.forEach(state => {
          if (!statesWithHPE.includes(state)) {
            expect(stateHasHPEProgram(state, 'child')).toBe(false);
          }
        });
      });
    });

    describe('Pregnant Women Category', () => {
      it('should have HPE for pregnant women in California', () => {
        expect(stateHasHPEProgram('CA', 'pregnant')).toBe(true);
      });

      it('should have HPE for pregnant women in Texas', () => {
        expect(stateHasHPEProgram('TX', 'pregnant')).toBe(true);
      });

      it('should have HPE for pregnant women in Alabama', () => {
        expect(stateHasHPEProgram('AL', 'pregnant')).toBe(true);
      });

      it('should have more states with pregnant HPE than children HPE', () => {
        expect(HPE_STATES_PREGNANT.length).toBeGreaterThan(HPE_STATES_CHILDREN.length);
      });
    });

    describe('Adult Category', () => {
      it('should have HPE for adults only in Medicaid expansion states', () => {
        expect(stateHasHPEProgram('CA', 'adult')).toBe(true);
        expect(stateHasHPEProgram('NY', 'adult')).toBe(true);
      });

      it('should NOT have HPE for adults in non-expansion states', () => {
        expect(stateHasHPEProgram('TX', 'adult')).toBe(false);
        expect(stateHasHPEProgram('FL', 'adult')).toBe(false);
        expect(stateHasHPEProgram('GA', 'adult')).toBe(false);
      });

      it('should match expansion states list', () => {
        expect(HPE_STATES_ADULTS.length).toBeGreaterThanOrEqual(40);
      });
    });

    describe('Former Foster Care Category', () => {
      it('should have HPE for former foster care in select states', () => {
        expect(stateHasHPEProgram('CA', 'formerFosterCare')).toBe(true);
        expect(stateHasHPEProgram('NY', 'formerFosterCare')).toBe(true);
      });

      it('should NOT have HPE for former foster care in all states', () => {
        expect(stateHasHPEProgram('TX', 'formerFosterCare')).toBe(false);
        expect(stateHasHPEProgram('FL', 'formerFosterCare')).toBe(false);
      });
    });

    describe('Parent/Caretaker Category', () => {
      it('should have HPE for parent/caretaker in select states', () => {
        expect(stateHasHPEProgram('CA', 'parentCaretaker')).toBe(true);
        expect(stateHasHPEProgram('WI', 'parentCaretaker')).toBe(true);
      });
    });

    describe('Case Sensitivity', () => {
      it('should handle lowercase state codes', () => {
        expect(stateHasHPEProgram('ca', 'adult')).toBe(true);
        expect(stateHasHPEProgram('tx', 'adult')).toBe(false);
      });

      it('should handle mixed case state codes', () => {
        expect(stateHasHPEProgram('Ca', 'adult')).toBe(true);
      });
    });
  });

  // ============================================================================
  // INCOME THRESHOLD CHECKS
  // ============================================================================

  describe('Income Threshold Checks', () => {
    it('should use 200% FPL threshold for children', () => {
      expect(PE_FPL_THRESHOLDS.child).toBe(200);
    });

    it('should use 200% FPL threshold for pregnant women', () => {
      expect(PE_FPL_THRESHOLDS.pregnant).toBe(200);
    });

    it('should use 138% FPL threshold for adults', () => {
      expect(PE_FPL_THRESHOLDS.adult).toBe(138);
    });

    it('should use 138% FPL threshold for former foster care', () => {
      expect(PE_FPL_THRESHOLDS.formerFosterCare).toBe(138);
    });

    it('should use 138% FPL threshold for parent/caretaker', () => {
      expect(PE_FPL_THRESHOLDS.parentCaretaker).toBe(138);
    });

    it('should calculate correct income threshold for household size 1', () => {
      const threshold = getPEIncomeThreshold(1, 'adult');
      const expected = Math.round(FPL_2024[1] * 1.38);
      expect(threshold).toBe(expected);
    });

    it('should calculate correct income threshold for household size 4', () => {
      const threshold = getPEIncomeThreshold(4, 'child');
      const expected = Math.round(FPL_2024[4] * 2.00);
      expect(threshold).toBe(expected);
    });

    it('should grant PE when income is below threshold', () => {
      const input: PresumptiveEligibilityInput = {
        isQualifiedHPEEntity: true,
        patientCategory: 'adult',
        grossMonthlyIncome: 1000, // Low income
        householdSize: 1,
        stateOfResidence: 'CA',
        applicationDate: new Date(),
      };
      const result = evaluatePresumptiveEligibility(input);

      expect(result.canGrantPE).toBe(true);
    });

    it('should deny PE when income exceeds threshold', () => {
      const fpl = calculateFPLThreshold(1);
      const monthlyIncomeOver138 = (fpl * 1.5) / 12; // 150% FPL monthly

      const input: PresumptiveEligibilityInput = {
        isQualifiedHPEEntity: true,
        patientCategory: 'adult',
        grossMonthlyIncome: monthlyIncomeOver138,
        householdSize: 1,
        stateOfResidence: 'CA',
        applicationDate: new Date(),
      };
      const result = evaluatePresumptiveEligibility(input);

      expect(result.canGrantPE).toBe(false);
      expect(result.denialReason).toContain('exceeds');
    });

    it('should grant PE at exactly 138% FPL for adults', () => {
      const fpl = calculateFPLThreshold(1);
      const monthlyAt138 = Math.floor((fpl * 1.38) / 12);

      const input: PresumptiveEligibilityInput = {
        isQualifiedHPEEntity: true,
        patientCategory: 'adult',
        grossMonthlyIncome: monthlyAt138,
        householdSize: 1,
        stateOfResidence: 'CA',
        applicationDate: new Date(),
      };
      const result = evaluatePresumptiveEligibility(input);

      expect(result.canGrantPE).toBe(true);
    });

    it('should grant PE at 199% FPL for children', () => {
      const fpl = calculateFPLThreshold(2);
      const monthlyAt199 = Math.floor((fpl * 1.99) / 12);

      const input: PresumptiveEligibilityInput = {
        isQualifiedHPEEntity: true,
        patientCategory: 'child',
        grossMonthlyIncome: monthlyAt199,
        householdSize: 2,
        stateOfResidence: 'CA',
        applicationDate: new Date(),
      };
      const result = evaluatePresumptiveEligibility(input);

      expect(result.canGrantPE).toBe(true);
    });
  });

  // ============================================================================
  // HOSPITAL CERTIFICATION REQUIREMENTS
  // ============================================================================

  describe('Hospital Certification Requirements', () => {
    it('should deny PE when hospital is not a qualified HPE entity', () => {
      const input: PresumptiveEligibilityInput = {
        isQualifiedHPEEntity: false,
        patientCategory: 'adult',
        grossMonthlyIncome: 1000,
        householdSize: 1,
        stateOfResidence: 'CA',
        applicationDate: new Date(),
      };
      const result = evaluatePresumptiveEligibility(input);

      expect(result.canGrantPE).toBe(false);
      expect(result.denialReason).toContain('not a qualified HPE entity');
      expect(result.confidence).toBe(95);
    });

    it('should include HPE qualification action when hospital is not certified', () => {
      const input: PresumptiveEligibilityInput = {
        isQualifiedHPEEntity: false,
        patientCategory: 'adult',
        grossMonthlyIncome: 1000,
        householdSize: 1,
        stateOfResidence: 'CA',
        applicationDate: new Date(),
      };
      const result = evaluatePresumptiveEligibility(input);

      expect(result.requiredActions.some(a => a.includes('HPE qualification'))).toBe(true);
    });

    it('should recommend standard Medicaid application when not HPE qualified', () => {
      const input: PresumptiveEligibilityInput = {
        isQualifiedHPEEntity: false,
        patientCategory: 'child',
        grossMonthlyIncome: 500,
        householdSize: 3,
        stateOfResidence: 'TX',
        applicationDate: new Date(),
      };
      const result = evaluatePresumptiveEligibility(input);

      expect(result.requiredActions.some(a => a.includes('standard Medicaid application'))).toBe(true);
    });
  });

  // ============================================================================
  // COVERAGE PERIOD CALCULATIONS
  // ============================================================================

  describe('Coverage Period Calculations', () => {
    it('should calculate coverage end date as end of month following application', () => {
      const applicationDate = new Date(2024, 5, 15); // June 15, 2024
      const endDate = calculateCoverageEndDate(applicationDate);

      expect(endDate.getMonth()).toBe(6); // July (0-indexed)
      expect(endDate.getDate()).toBe(31); // Last day of July
    });

    it('should handle application at end of month', () => {
      const applicationDate = new Date(2024, 0, 31); // January 31, 2024
      const endDate = calculateCoverageEndDate(applicationDate);

      // Coverage ends at end of month following application month
      // January → end of February (month 1)
      expect(endDate.getMonth()).toBe(1); // February (month following January)
    });

    it('should handle application in December', () => {
      const applicationDate = new Date(2024, 11, 15); // December 15, 2024
      const endDate = calculateCoverageEndDate(applicationDate);

      // Coverage ends at end of month following application month
      // December → end of January (next year)
      expect(endDate.getFullYear()).toBe(2025);
      expect(endDate.getMonth()).toBe(0); // January (month following December)
    });

    it('should set coverage start date as application date', () => {
      const applicationDate = new Date(2024, 6, 10);
      const input: PresumptiveEligibilityInput = {
        isQualifiedHPEEntity: true,
        patientCategory: 'adult',
        grossMonthlyIncome: 1000,
        householdSize: 1,
        stateOfResidence: 'CA',
        applicationDate,
      };
      const result = evaluatePresumptiveEligibility(input);

      expect(result.temporaryCoverageStart.getTime()).toBe(applicationDate.getTime());
    });
  });

  // ============================================================================
  // APPLICATION DEADLINE CALCULATIONS
  // ============================================================================

  describe('Application Deadline Calculations', () => {
    it('should use 60 days for California', () => {
      const applicationDate = new Date(2024, 5, 1);
      const deadline = calculateApplicationDeadline(applicationDate, 'CA');

      const daysDiff = Math.round((deadline.getTime() - applicationDate.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBe(60);
    });

    it('should use 45 days for New York', () => {
      const applicationDate = new Date(2024, 5, 1);
      const deadline = calculateApplicationDeadline(applicationDate, 'NY');

      const daysDiff = Math.round((deadline.getTime() - applicationDate.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBe(45);
    });

    it('should use 30 days for Texas', () => {
      const applicationDate = new Date(2024, 5, 1);
      const deadline = calculateApplicationDeadline(applicationDate, 'TX');

      const daysDiff = Math.round((deadline.getTime() - applicationDate.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBe(30);
    });

    it('should use 30 days for Florida', () => {
      const applicationDate = new Date(2024, 5, 1);
      const deadline = calculateApplicationDeadline(applicationDate, 'FL');

      const daysDiff = Math.round((deadline.getTime() - applicationDate.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBe(30);
    });

    it('should use default 45 days for states without specific deadline', () => {
      const applicationDate = new Date(2024, 5, 1);
      const deadline = calculateApplicationDeadline(applicationDate, 'OH');

      const daysDiff = Math.round((deadline.getTime() - applicationDate.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBe(45);
    });
  });

  // ============================================================================
  // FULL PE EVALUATION
  // ============================================================================

  describe('Full PE Evaluation', () => {
    it('should grant PE for eligible low-income adult in expansion state', () => {
      const input: PresumptiveEligibilityInput = {
        isQualifiedHPEEntity: true,
        patientCategory: 'adult',
        grossMonthlyIncome: 1200,
        householdSize: 1,
        stateOfResidence: 'CA',
        applicationDate: new Date(),
      };
      const result = evaluatePresumptiveEligibility(input);

      expect(result.canGrantPE).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(80);
    });

    it('should deny PE for adult in non-expansion state', () => {
      const input: PresumptiveEligibilityInput = {
        isQualifiedHPEEntity: true,
        patientCategory: 'adult',
        grossMonthlyIncome: 1000,
        householdSize: 1,
        stateOfResidence: 'TX',
        applicationDate: new Date(),
      };
      const result = evaluatePresumptiveEligibility(input);

      expect(result.canGrantPE).toBe(false);
      expect(result.denialReason).toContain('TX');
      expect(result.denialReason).toContain('adult');
    });

    it('should grant PE for pregnant woman in Texas', () => {
      const input: PresumptiveEligibilityInput = {
        isQualifiedHPEEntity: true,
        patientCategory: 'pregnant',
        grossMonthlyIncome: 2000,
        householdSize: 2,
        stateOfResidence: 'TX',
        applicationDate: new Date(),
      };
      const result = evaluatePresumptiveEligibility(input);

      expect(result.canGrantPE).toBe(true);
    });

    it('should include pregnancy verification in required actions for pregnant women', () => {
      const input: PresumptiveEligibilityInput = {
        isQualifiedHPEEntity: true,
        patientCategory: 'pregnant',
        grossMonthlyIncome: 1500,
        householdSize: 1,
        stateOfResidence: 'CA',
        applicationDate: new Date(),
      };
      const result = evaluatePresumptiveEligibility(input);

      expect(result.requiredActions.some(a => a.toLowerCase().includes('pregnancy verification'))).toBe(true);
      expect(result.notes.some(n => n.includes('postpartum'))).toBe(true);
    });

    it('should include foster care documentation for former foster care category', () => {
      const input: PresumptiveEligibilityInput = {
        isQualifiedHPEEntity: true,
        patientCategory: 'formerFosterCare',
        grossMonthlyIncome: 1200,
        householdSize: 1,
        stateOfResidence: 'CA',
        applicationDate: new Date(),
      };
      const result = evaluatePresumptiveEligibility(input);

      expect(result.requiredActions.some(a => a.toLowerCase().includes('foster care'))).toBe(true);
    });

    it('should have higher confidence for pregnant women and children', () => {
      const inputPregnant: PresumptiveEligibilityInput = {
        isQualifiedHPEEntity: true,
        patientCategory: 'pregnant',
        grossMonthlyIncome: 1000,
        householdSize: 1,
        stateOfResidence: 'CA',
        applicationDate: new Date(),
      };
      const inputAdult: PresumptiveEligibilityInput = {
        ...inputPregnant,
        patientCategory: 'adult',
      };

      const pregnantResult = evaluatePresumptiveEligibility(inputPregnant);
      const adultResult = evaluatePresumptiveEligibility(inputAdult);

      expect(pregnantResult.confidence).toBeGreaterThanOrEqual(adultResult.confidence);
    });
  });

  // ============================================================================
  // REQUIRED ACTIONS GENERATION
  // ============================================================================

  describe('Required Actions Generation', () => {
    it('should include application deadline action when PE is granted', () => {
      const input: PresumptiveEligibilityInput = {
        isQualifiedHPEEntity: true,
        patientCategory: 'adult',
        grossMonthlyIncome: 1000,
        householdSize: 1,
        stateOfResidence: 'CA',
        applicationDate: new Date(),
      };
      const result = evaluatePresumptiveEligibility(input);

      expect(result.requiredActions.some(a => a.includes('Submit full Medicaid application'))).toBe(true);
    });

    it('should include documentation requirements when PE is granted', () => {
      const input: PresumptiveEligibilityInput = {
        isQualifiedHPEEntity: true,
        patientCategory: 'adult',
        grossMonthlyIncome: 1000,
        householdSize: 1,
        stateOfResidence: 'CA',
        applicationDate: new Date(),
      };
      const result = evaluatePresumptiveEligibility(input);

      expect(result.requiredActions.some(a => a.includes('Proof of identity'))).toBe(true);
      expect(result.requiredActions.some(a => a.includes('Proof of income'))).toBe(true);
      expect(result.requiredActions.some(a => a.includes('Proof of residency'))).toBe(true);
    });

    it('should include billing instruction when PE is granted', () => {
      const input: PresumptiveEligibilityInput = {
        isQualifiedHPEEntity: true,
        patientCategory: 'adult',
        grossMonthlyIncome: 1000,
        householdSize: 1,
        stateOfResidence: 'CA',
        applicationDate: new Date(),
      };
      const result = evaluatePresumptiveEligibility(input);

      expect(result.requiredActions.some(a => a.includes('Bill Medicaid under PE coverage'))).toBe(true);
    });

    it('should suggest standard Medicaid application when income exceeds threshold', () => {
      const input: PresumptiveEligibilityInput = {
        isQualifiedHPEEntity: true,
        patientCategory: 'adult',
        grossMonthlyIncome: 5000,
        householdSize: 1,
        stateOfResidence: 'CA',
        applicationDate: new Date(),
      };
      const result = evaluatePresumptiveEligibility(input);

      expect(result.requiredActions.some(a => a.includes('standard Medicaid application'))).toBe(true);
    });
  });

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  describe('Utility Functions', () => {
    it('should return all HPE states by category', () => {
      const statesByCategory = getHPEStatesByCategory();

      expect(statesByCategory).toHaveProperty('adult');
      expect(statesByCategory).toHaveProperty('child');
      expect(statesByCategory).toHaveProperty('pregnant');
      expect(statesByCategory).toHaveProperty('formerFosterCare');
      expect(statesByCategory).toHaveProperty('parentCaretaker');
    });

    it('should return correct HPE state counts', () => {
      const counts = getHPEStateCounts();

      expect(counts.adult).toBe(HPE_STATES_ADULTS.length);
      expect(counts.child).toBe(HPE_STATES_CHILDREN.length);
      expect(counts.pregnant).toBe(HPE_STATES_PREGNANT.length);
    });
  });

  // ============================================================================
  // INPUT VALIDATION
  // ============================================================================

  describe('Input Validation', () => {
    it('should validate all required fields', () => {
      const validInput: Partial<PresumptiveEligibilityInput> = {
        isQualifiedHPEEntity: true,
        patientCategory: 'adult',
        grossMonthlyIncome: 1000,
        householdSize: 1,
        stateOfResidence: 'CA',
        applicationDate: new Date(),
      };
      const result = validatePEInput(validInput);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing patientCategory', () => {
      const input: Partial<PresumptiveEligibilityInput> = {
        isQualifiedHPEEntity: true,
        grossMonthlyIncome: 1000,
        householdSize: 1,
        stateOfResidence: 'CA',
        applicationDate: new Date(),
      };
      const result = validatePEInput(input);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('patientCategory'))).toBe(true);
    });

    it('should reject negative income', () => {
      const input: Partial<PresumptiveEligibilityInput> = {
        isQualifiedHPEEntity: true,
        patientCategory: 'adult',
        grossMonthlyIncome: -1000,
        householdSize: 1,
        stateOfResidence: 'CA',
        applicationDate: new Date(),
      };
      const result = validatePEInput(input);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('grossMonthlyIncome'))).toBe(true);
    });

    it('should reject zero household size', () => {
      const input: Partial<PresumptiveEligibilityInput> = {
        isQualifiedHPEEntity: true,
        patientCategory: 'adult',
        grossMonthlyIncome: 1000,
        householdSize: 0,
        stateOfResidence: 'CA',
        applicationDate: new Date(),
      };
      const result = validatePEInput(input);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('householdSize'))).toBe(true);
    });

    it('should reject invalid state code length', () => {
      const input: Partial<PresumptiveEligibilityInput> = {
        isQualifiedHPEEntity: true,
        patientCategory: 'adult',
        grossMonthlyIncome: 1000,
        householdSize: 1,
        stateOfResidence: 'CAL', // 3 letters instead of 2
        applicationDate: new Date(),
      };
      const result = validatePEInput(input);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('stateOfResidence'))).toBe(true);
    });

    it('should reject invalid patient category', () => {
      const input: Partial<PresumptiveEligibilityInput> = {
        isQualifiedHPEEntity: true,
        patientCategory: 'invalid' as PEPatientCategory,
        grossMonthlyIncome: 1000,
        householdSize: 1,
        stateOfResidence: 'CA',
        applicationDate: new Date(),
      };
      const result = validatePEInput(input);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('patientCategory'))).toBe(true);
    });

    it('should reject invalid date', () => {
      const input: Partial<PresumptiveEligibilityInput> = {
        isQualifiedHPEEntity: true,
        patientCategory: 'adult',
        grossMonthlyIncome: 1000,
        householdSize: 1,
        stateOfResidence: 'CA',
        applicationDate: new Date('invalid'),
      };
      const result = validatePEInput(input);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('applicationDate'))).toBe(true);
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle zero income', () => {
      const input: PresumptiveEligibilityInput = {
        isQualifiedHPEEntity: true,
        patientCategory: 'adult',
        grossMonthlyIncome: 0,
        householdSize: 1,
        stateOfResidence: 'CA',
        applicationDate: new Date(),
      };
      const result = evaluatePresumptiveEligibility(input);

      expect(result.canGrantPE).toBe(true);
    });

    it('should handle very high household size', () => {
      const input: PresumptiveEligibilityInput = {
        isQualifiedHPEEntity: true,
        patientCategory: 'adult',
        grossMonthlyIncome: 5000,
        householdSize: 12,
        stateOfResidence: 'CA',
        applicationDate: new Date(),
      };
      const result = evaluatePresumptiveEligibility(input);

      // Higher household size means higher income threshold
      expect(result.incomeThresholdUsed).toBeGreaterThan(getPEIncomeThreshold(1, 'adult'));
    });

    it('should correctly report FPL percentage threshold used', () => {
      const input: PresumptiveEligibilityInput = {
        isQualifiedHPEEntity: true,
        patientCategory: 'child',
        grossMonthlyIncome: 2000,
        householdSize: 3,
        stateOfResidence: 'CA',
        applicationDate: new Date(),
      };
      const result = evaluatePresumptiveEligibility(input);

      expect(result.fplPercentageThreshold).toBe(200);
    });

    it('should suggest expedited processing for pregnant women in non-HPE state', () => {
      const input: PresumptiveEligibilityInput = {
        isQualifiedHPEEntity: true,
        patientCategory: 'pregnant',
        grossMonthlyIncome: 1000,
        householdSize: 1,
        stateOfResidence: 'DE', // Not in pregnant HPE states
        applicationDate: new Date(),
      };
      const result = evaluatePresumptiveEligibility(input);

      if (!result.canGrantPE) {
        expect(result.requiredActions.some(a => a.toLowerCase().includes('expedited') || a.toLowerCase().includes('pregnancy medicaid'))).toBe(true);
      }
    });
  });
});
