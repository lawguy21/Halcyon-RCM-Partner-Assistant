/**
 * 501(r) Charity Care Compliance Engine Tests
 *
 * Tests 501(r) compliance, FAP eligibility, and ECA timeline tracking
 */

import {
  evaluateCharityCare501r,
  isECAProhibited,
  getECAAllowedDate,
  checkFAPEligibility,
  ECA_NOTIFICATION_PERIOD_DAYS,
  ECA_WRITTEN_NOTICE_DAYS,
  EXTRAORDINARY_COLLECTION_ACTIONS,
  CharityCare501rInput,
  HospitalFAPPolicy,
  NotificationRecord,
} from '../engines/charity-care-501r';

import { FPL_2024 } from '../engines/magi-calculator';

// Test fixtures
function createDefaultFAPPolicy(): HospitalFAPPolicy {
  return {
    freeCareFPLThreshold: 200,
    discountedCareFPLThreshold: 400,
    discountPercentages: [
      { fplRange: '201-250% FPL', discount: 75 },
      { fplRange: '251-300% FPL', discount: 50 },
      { fplRange: '301-400% FPL', discount: 25 },
    ],
  };
}

function createBaseInput(overrides: Partial<CharityCare501rInput> = {}): CharityCare501rInput {
  return {
    patientIncome: 25000,
    householdSize: 2,
    hospitalFAPPolicy: createDefaultFAPPolicy(),
    accountAge: 30,
    notificationsSent: [],
    isEmergencyService: false,
    originalCharges: 50000,
    ...overrides,
  };
}

describe('501(r) Charity Care Compliance Engine', () => {
  // ============================================================================
  // 240-DAY ECA TIMELINE
  // ============================================================================

  describe('240-Day ECA Timeline', () => {
    it('should have correct ECA notification period constant', () => {
      expect(ECA_NOTIFICATION_PERIOD_DAYS).toBe(120);
    });

    it('should have correct written notice period constant', () => {
      expect(ECA_WRITTEN_NOTICE_DAYS).toBe(30);
    });

    it('should block ECAs before 120 days without notifications', () => {
      const input = createBaseInput({
        accountAge: 90,
        notificationsSent: [],
      });
      const result = evaluateCharityCare501r(input);

      expect(result.ecaStatus.allowed).toBe(false);
      expect(result.ecaStatus.daysUntilAllowed).toBeGreaterThan(0);
    });

    it('should block ECAs even at 120 days without proper notifications', () => {
      const input = createBaseInput({
        accountAge: 120,
        notificationsSent: [],
      });
      const result = evaluateCharityCare501r(input);

      expect(result.ecaStatus.allowed).toBe(false);
    });

    it('should block ECAs when only plain language summary sent', () => {
      const input = createBaseInput({
        accountAge: 150,
        notificationsSent: [
          { type: 'plain_language_summary', date: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000) },
        ],
      });
      const result = evaluateCharityCare501r(input);

      expect(result.ecaStatus.allowed).toBe(false);
    });

    it('should block ECAs when 120-day notice sent but no 30-day written notice', () => {
      const input = createBaseInput({
        accountAge: 180,
        notificationsSent: [
          { type: 'fap_application', date: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000) },
          { type: 'eca_120_day_notice', date: new Date(Date.now() - 130 * 24 * 60 * 60 * 1000) },
        ],
      });
      const result = evaluateCharityCare501r(input);

      expect(result.ecaStatus.allowed).toBe(false);
      expect(result.ecaStatus.reason).toContain('30-day written notice');
    });

    it('should allow ECAs when all notifications have been sent and timeline complete', () => {
      const now = Date.now();
      const input = createBaseInput({
        accountAge: 180,
        notificationsSent: [
          { type: 'plain_language_summary', date: new Date(now - 180 * 24 * 60 * 60 * 1000) },
          { type: 'fap_application', date: new Date(now - 170 * 24 * 60 * 60 * 1000) },
          { type: 'eca_120_day_notice', date: new Date(now - 150 * 24 * 60 * 60 * 1000) },
          { type: 'eca_30_day_written_notice', date: new Date(now - 35 * 24 * 60 * 60 * 1000) },
        ],
      });
      const result = evaluateCharityCare501r(input);

      expect(result.ecaStatus.allowed).toBe(true);
      expect(result.ecaStatus.daysUntilAllowed).toBe(0);
    });

    it('should list all blocked collection actions when ECAs prohibited', () => {
      const input = createBaseInput({
        accountAge: 60,
        notificationsSent: [],
      });
      const result = evaluateCharityCare501r(input);

      expect(result.ecaStatus.blockedActions.length).toBe(EXTRAORDINARY_COLLECTION_ACTIONS.length);
      expect(result.ecaStatus.blockedActions).toContain('Selling debt to third party');
      expect(result.ecaStatus.blockedActions).toContain('Reporting to credit bureaus');
      expect(result.ecaStatus.blockedActions).toContain('Garnishment of wages');
    });
  });

  // ============================================================================
  // 120-DAY NOTIFICATION REQUIREMENTS
  // ============================================================================

  describe('120-Day Notification Requirements', () => {
    it('should generate required notification list', () => {
      const input = createBaseInput();
      const result = evaluateCharityCare501r(input);

      expect(result.requiredNotifications.length).toBeGreaterThan(0);
      expect(result.requiredNotifications.some(n => n.type === 'plain_language_summary')).toBe(true);
      expect(result.requiredNotifications.some(n => n.type === 'fap_application')).toBe(true);
      expect(result.requiredNotifications.some(n => n.type === 'eca_120_day_notice')).toBe(true);
    });

    it('should mark notifications as sent when provided', () => {
      const input = createBaseInput({
        notificationsSent: [
          { type: 'plain_language_summary', date: new Date() },
          { type: 'fap_application', date: new Date() },
        ],
      });
      const result = evaluateCharityCare501r(input);

      const plsSent = result.requiredNotifications.find(n => n.type === 'plain_language_summary');
      const fapSent = result.requiredNotifications.find(n => n.type === 'fap_application');
      const ecaSent = result.requiredNotifications.find(n => n.type === 'eca_120_day_notice');

      expect(plsSent?.sent).toBe(true);
      expect(fapSent?.sent).toBe(true);
      expect(ecaSent?.sent).toBe(false);
    });

    it('should include presumptive eligibility screening requirement', () => {
      const input = createBaseInput();
      const result = evaluateCharityCare501r(input);

      expect(result.requiredNotifications.some(n => n.type === 'presumptive_eligibility_screening')).toBe(true);
    });

    it('should calculate deadlines based on account age', () => {
      const input = createBaseInput({ accountAge: 60 });
      const result = evaluateCharityCare501r(input);

      result.requiredNotifications.forEach(notification => {
        expect(notification.deadline).toBeInstanceOf(Date);
      });
    });
  });

  // ============================================================================
  // FAP DISCOUNT CALCULATIONS
  // ============================================================================

  describe('FAP Discount Calculations', () => {
    describe('Free Care Eligibility', () => {
      it('should grant 100% discount at 100% FPL', () => {
        const income = FPL_2024[1]; // 100% FPL for household of 1
        const input = createBaseInput({
          patientIncome: income,
          householdSize: 1,
        });
        const result = evaluateCharityCare501r(input);

        expect(result.fapEligibility).toBe('free');
        expect(result.discountPercentage).toBe(100);
      });

      it('should grant 100% discount at 200% FPL (threshold)', () => {
        const income = FPL_2024[2] * 2; // 200% FPL for household of 2
        const input = createBaseInput({
          patientIncome: income,
          householdSize: 2,
        });
        const result = evaluateCharityCare501r(input);

        expect(result.fapEligibility).toBe('free');
        expect(result.discountPercentage).toBe(100);
      });

      it('should grant 100% discount at 0 income', () => {
        const input = createBaseInput({
          patientIncome: 0,
          householdSize: 1,
        });
        const result = evaluateCharityCare501r(input);

        expect(result.fapEligibility).toBe('free');
        expect(result.discountPercentage).toBe(100);
      });
    });

    describe('Discounted Care Eligibility', () => {
      it('should grant partial discount between 201-400% FPL', () => {
        const income = FPL_2024[1] * 2.5; // 250% FPL
        const input = createBaseInput({
          patientIncome: income,
          householdSize: 1,
        });
        const result = evaluateCharityCare501r(input);

        expect(result.fapEligibility).toBe('discounted');
        expect(result.discountPercentage).toBeGreaterThan(0);
        expect(result.discountPercentage).toBeLessThan(100);
      });

      it('should apply tiered discounts based on FAP policy', () => {
        // Test at 225% FPL - should get 75% discount (201-250% tier)
        const income = FPL_2024[1] * 2.25;
        const input = createBaseInput({
          patientIncome: income,
          householdSize: 1,
        });
        const result = evaluateCharityCare501r(input);

        expect(result.fapEligibility).toBe('discounted');
        expect(result.discountPercentage).toBe(75);
      });

      it('should apply 50% discount at 275% FPL', () => {
        const income = FPL_2024[1] * 2.75;
        const input = createBaseInput({
          patientIncome: income,
          householdSize: 1,
        });
        const result = evaluateCharityCare501r(input);

        expect(result.discountPercentage).toBe(50);
      });

      it('should apply 25% discount at 350% FPL', () => {
        const income = FPL_2024[1] * 3.5;
        const input = createBaseInput({
          patientIncome: income,
          householdSize: 1,
        });
        const result = evaluateCharityCare501r(input);

        expect(result.discountPercentage).toBe(25);
      });
    });

    describe('Not Eligible', () => {
      it('should be not eligible above 400% FPL', () => {
        const income = FPL_2024[1] * 5; // 500% FPL
        const input = createBaseInput({
          patientIncome: income,
          householdSize: 1,
        });
        const result = evaluateCharityCare501r(input);

        expect(result.fapEligibility).toBe('not_eligible');
        expect(result.discountPercentage).toBe(0);
      });
    });

    describe('Amount After Discount', () => {
      it('should calculate correct amount after 100% discount', () => {
        const input = createBaseInput({
          patientIncome: FPL_2024[1], // 100% FPL
          householdSize: 1,
          originalCharges: 10000,
        });
        const result = evaluateCharityCare501r(input);

        expect(result.amountAfterDiscount).toBe(0);
      });

      it('should calculate correct amount after 50% discount', () => {
        const input = createBaseInput({
          patientIncome: FPL_2024[1] * 2.75, // 275% FPL
          householdSize: 1,
          originalCharges: 10000,
        });
        const result = evaluateCharityCare501r(input);

        expect(result.amountAfterDiscount).toBe(5000);
      });

      it('should handle undefined originalCharges', () => {
        const input = createBaseInput({
          patientIncome: FPL_2024[1],
          householdSize: 1,
        });
        delete (input as Record<string, unknown>).originalCharges;
        const result = evaluateCharityCare501r(input);

        expect(result.amountAfterDiscount).toBe(0);
      });
    });
  });

  // ============================================================================
  // COMPLIANCE STATUS
  // ============================================================================

  describe('Compliance Status', () => {
    it('should be compliant when all notifications sent early', () => {
      const now = Date.now();
      const input = createBaseInput({
        accountAge: 30,
        notificationsSent: [
          { type: 'plain_language_summary', date: new Date(now - 25 * 24 * 60 * 60 * 1000) },
          { type: 'fap_application', date: new Date(now - 25 * 24 * 60 * 60 * 1000) },
          { type: 'presumptive_eligibility_screening', date: new Date(now - 25 * 24 * 60 * 60 * 1000) },
          { type: 'fap_determination_notice', date: new Date(now - 20 * 24 * 60 * 60 * 1000) },
        ],
      });
      const result = evaluateCharityCare501r(input);

      expect(result.complianceStatus).toBe('compliant');
    });

    it('should be non_compliant when missing all notifications after 30 days', () => {
      // With ZERO notifications at 75 days, critical notifications are missing
      // which triggers non_compliant status (not just at_risk)
      const input = createBaseInput({
        accountAge: 75,
        notificationsSent: [],
      });
      const result = evaluateCharityCare501r(input);

      expect(result.complianceStatus).toBe('non_compliant');
    });

    it('should be non_compliant when missing critical notifications after 30 days', () => {
      const input = createBaseInput({
        accountAge: 45,
        notificationsSent: [],
      });
      const result = evaluateCharityCare501r(input);

      expect(result.complianceStatus).toBe('non_compliant');
    });

    it('should be non_compliant when past ECA timeline without proper notifications', () => {
      const input = createBaseInput({
        accountAge: 150,
        notificationsSent: [],
      });
      const result = evaluateCharityCare501r(input);

      expect(result.complianceStatus).toBe('non_compliant');
    });
  });

  // ============================================================================
  // COMPLIANCE CHECKLIST
  // ============================================================================

  describe('Compliance Checklist', () => {
    it('should include all required checklist items', () => {
      const input = createBaseInput();
      const result = evaluateCharityCare501r(input);

      expect(result.complianceChecklist.length).toBeGreaterThan(10);

      // Check for key items
      const items = result.complianceChecklist.map(c => c.item);
      expect(items.some(i => i.includes('FAP'))).toBe(true);
      expect(items.some(i => i.includes('120-day'))).toBe(true);
      expect(items.some(i => i.includes('30-day'))).toBe(true);
      expect(items.some(i => i.includes('credit'))).toBe(true);
      expect(items.some(i => i.includes('debt'))).toBe(true);
    });

    it('should mark notification items as completed when sent', () => {
      const input = createBaseInput({
        notificationsSent: [
          { type: 'plain_language_summary', date: new Date() },
        ],
      });
      const result = evaluateCharityCare501r(input);

      const plsItem = result.complianceChecklist.find(c => c.item.includes('Plain language summary'));
      expect(plsItem?.completed).toBe(true);
    });

    it('should include EMTALA items for emergency services', () => {
      const input = createBaseInput({
        isEmergencyService: true,
      });
      const result = evaluateCharityCare501r(input);

      expect(result.complianceChecklist.some(c => c.item.includes('EMTALA'))).toBe(true);
      expect(result.complianceChecklist.some(c => c.item.includes('Emergency care'))).toBe(true);
    });

    it('should categorize checklist items', () => {
      const input = createBaseInput();
      const result = evaluateCharityCare501r(input);

      const categories = new Set(result.complianceChecklist.map(c => c.category));
      expect(categories.has('policy')).toBe(true);
      expect(categories.has('notification')).toBe(true);
      expect(categories.has('documentation')).toBe(true);
      expect(categories.has('eca_restriction')).toBe(true);
    });
  });

  // ============================================================================
  // ACTIONS GENERATION
  // ============================================================================

  describe('Actions Generation', () => {
    it('should recommend applying FAP discount for free care eligible', () => {
      const input = createBaseInput({
        patientIncome: FPL_2024[1], // 100% FPL
        householdSize: 1,
      });
      const result = evaluateCharityCare501r(input);

      expect(result.actions.some(a => a.includes('100% FAP discount'))).toBe(true);
    });

    it('should recommend sending missing notifications', () => {
      const input = createBaseInput({
        notificationsSent: [],
      });
      const result = evaluateCharityCare501r(input);

      expect(result.actions.some(a => a.includes('plain language summary'))).toBe(true);
      expect(result.actions.some(a => a.includes('FAP application'))).toBe(true);
    });

    it('should include critical warning for non-compliant status', () => {
      const input = createBaseInput({
        accountAge: 45,
        notificationsSent: [],
      });
      const result = evaluateCharityCare501r(input);

      expect(result.actions.some(a => a.includes('CRITICAL'))).toBe(true);
    });

    it('should warn about ECA restrictions when not allowed', () => {
      const input = createBaseInput({
        accountAge: 60,
        notificationsSent: [],
      });
      const result = evaluateCharityCare501r(input);

      expect(result.actions.some(a => a.includes('Do not initiate ECAs'))).toBe(true);
    });
  });

  // ============================================================================
  // NOTES GENERATION
  // ============================================================================

  describe('Notes Generation', () => {
    it('should include FPL percentage in notes', () => {
      const input = createBaseInput();
      const result = evaluateCharityCare501r(input);

      expect(result.notes.some(n => n.includes('% of Federal Poverty Level'))).toBe(true);
    });

    it('should include eligibility status in notes', () => {
      const input = createBaseInput({
        patientIncome: FPL_2024[1],
        householdSize: 1,
      });
      const result = evaluateCharityCare501r(input);

      expect(result.notes.some(n => n.includes('free care'))).toBe(true);
    });

    it('should include emergency service notes when applicable', () => {
      const input = createBaseInput({
        isEmergencyService: true,
      });
      const result = evaluateCharityCare501r(input);

      expect(result.notes.some(n => n.includes('emergency') || n.includes('EMTALA'))).toBe(true);
    });

    it('should include compliance warning notes', () => {
      const input = createBaseInput({
        accountAge: 45,
        notificationsSent: [],
      });
      const result = evaluateCharityCare501r(input);

      expect(result.notes.some(n => n.includes('WARNING') || n.includes('non-compliant'))).toBe(true);
    });

    it('should include ECA blocked reason when applicable', () => {
      const input = createBaseInput({
        accountAge: 60,
        notificationsSent: [],
      });
      const result = evaluateCharityCare501r(input);

      expect(result.notes.some(n => n.includes('ECAs blocked') || n.includes('days until ECAs'))).toBe(true);
    });
  });

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  describe('Utility Functions', () => {
    it('should correctly check if ECA is prohibited', () => {
      const prohibitedInput = createBaseInput({
        accountAge: 60,
        notificationsSent: [],
      });
      expect(isECAProhibited(prohibitedInput)).toBe(true);

      const now = Date.now();
      const allowedInput = createBaseInput({
        accountAge: 180,
        notificationsSent: [
          { type: 'plain_language_summary', date: new Date(now - 180 * 24 * 60 * 60 * 1000) },
          { type: 'fap_application', date: new Date(now - 170 * 24 * 60 * 60 * 1000) },
          { type: 'eca_120_day_notice', date: new Date(now - 150 * 24 * 60 * 60 * 1000) },
          { type: 'eca_30_day_written_notice', date: new Date(now - 35 * 24 * 60 * 60 * 1000) },
        ],
      });
      expect(isECAProhibited(allowedInput)).toBe(false);
    });

    it('should return correct ECA allowed date', () => {
      const input = createBaseInput({
        accountAge: 60,
        notificationsSent: [],
      });
      const allowedDate = getECAAllowedDate(input);

      expect(allowedDate).toBeInstanceOf(Date);
      expect(allowedDate.getTime()).toBeGreaterThan(Date.now());
    });

    it('should perform quick FAP eligibility check', () => {
      const policy = createDefaultFAPPolicy();

      expect(checkFAPEligibility(FPL_2024[1], 1, policy)).toBe('free');
      expect(checkFAPEligibility(FPL_2024[1] * 2.5, 1, policy)).toBe('discounted');
      expect(checkFAPEligibility(FPL_2024[1] * 5, 1, policy)).toBe('not_eligible');
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle zero account age', () => {
      const input = createBaseInput({
        accountAge: 0,
      });
      const result = evaluateCharityCare501r(input);

      expect(result).toBeDefined();
      expect(result.ecaStatus.allowed).toBe(false);
    });

    it('should handle very old accounts', () => {
      const input = createBaseInput({
        accountAge: 365,
      });
      const result = evaluateCharityCare501r(input);

      expect(result).toBeDefined();
    });

    it('should handle zero income', () => {
      const input = createBaseInput({
        patientIncome: 0,
      });
      const result = evaluateCharityCare501r(input);

      expect(result.fapEligibility).toBe('free');
      expect(result.incomeAsFPLPercentage).toBe(0);
    });

    it('should handle very high income', () => {
      const input = createBaseInput({
        patientIncome: 1000000,
        householdSize: 1,
      });
      const result = evaluateCharityCare501r(input);

      expect(result.fapEligibility).toBe('not_eligible');
      expect(result.incomeAsFPLPercentage).toBeGreaterThan(1000);
    });

    it('should handle large household size', () => {
      const input = createBaseInput({
        patientIncome: 100000,
        householdSize: 10,
      });
      const result = evaluateCharityCare501r(input);

      expect(result).toBeDefined();
    });

    it('should handle empty notifications array', () => {
      const input = createBaseInput({
        notificationsSent: [],
      });
      const result = evaluateCharityCare501r(input);

      expect(result).toBeDefined();
      expect(result.requiredNotifications.every(n => !n.sent)).toBe(true);
    });

    it('should handle zero originalCharges', () => {
      const input = createBaseInput({
        originalCharges: 0,
      });
      const result = evaluateCharityCare501r(input);

      expect(result.amountAfterDiscount).toBe(0);
    });

    it('should handle custom FAP policy with different thresholds', () => {
      const customPolicy: HospitalFAPPolicy = {
        freeCareFPLThreshold: 300,
        discountedCareFPLThreshold: 600,
        discountPercentages: [
          { fplRange: '301-400% FPL', discount: 80 },
          { fplRange: '401-600% FPL', discount: 40 },
        ],
      };
      const input = createBaseInput({
        hospitalFAPPolicy: customPolicy,
        patientIncome: FPL_2024[1] * 2.5, // 250% FPL
        householdSize: 1,
      });
      const result = evaluateCharityCare501r(input);

      expect(result.fapEligibility).toBe('free');
    });
  });
});
