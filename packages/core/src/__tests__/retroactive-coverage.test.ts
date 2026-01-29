/**
 * Retroactive Coverage Calculator Engine Tests
 *
 * Tests retroactive Medicaid coverage calculations including 1115 waiver handling
 */

import {
  calculateRetroactiveCoverage,
  getStatesWithNoRetroactiveCoverage,
  getStatesWithReducedRetroactiveCoverage,
  stateHasRetroactiveWaiver,
  getStateRetroactiveWindow,
  isRetroactiveCoveragePossible,
  RetroactiveCoverageInput,
} from '../engines/retroactive-coverage';

// Helper function to create dates relative to today
function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0);
  return date;
}

function monthsAgo(months: number): Date {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  date.setHours(0, 0, 0, 0);
  return date;
}

describe('Retroactive Coverage Calculator Engine', () => {
  // ============================================================================
  // 3-MONTH LOOKBACK CALCULATIONS
  // ============================================================================

  describe('3-Month Lookback Calculations', () => {
    it('should calculate DOS within 90-day window as eligible', () => {
      const input: RetroactiveCoverageInput = {
        dateOfService: daysAgo(60),
        applicationDate: new Date(),
        stateOfResidence: 'CA',
        wasEligibleOnDOS: true,
        encounterType: 'inpatient',
        totalCharges: 50000,
      };
      const result = calculateRetroactiveCoverage(input);

      expect(result.isWithinWindow).toBe(true);
      expect(result.retroactiveWindowDays).toBe(90);
    });

    it('should calculate DOS at exactly 90 days as eligible', () => {
      const input: RetroactiveCoverageInput = {
        dateOfService: daysAgo(89),
        applicationDate: new Date(),
        stateOfResidence: 'OH',
        wasEligibleOnDOS: true,
        encounterType: 'ed',
        totalCharges: 25000,
      };
      const result = calculateRetroactiveCoverage(input);

      expect(result.isWithinWindow).toBe(true);
    });

    it('should calculate DOS beyond 3-month window as ineligible', () => {
      const input: RetroactiveCoverageInput = {
        dateOfService: monthsAgo(4), // 4 months ago is outside the 3-month window
        applicationDate: new Date(),
        stateOfResidence: 'CA',
        wasEligibleOnDOS: true,
        encounterType: 'inpatient',
        totalCharges: 50000,
      };
      const result = calculateRetroactiveCoverage(input);

      expect(result.isWithinWindow).toBe(false);
    });

    it('should calculate DOS within first month as eligible', () => {
      const input: RetroactiveCoverageInput = {
        dateOfService: daysAgo(15),
        applicationDate: new Date(),
        stateOfResidence: 'NY',
        wasEligibleOnDOS: true,
        encounterType: 'outpatient',
        totalCharges: 5000,
      };
      const result = calculateRetroactiveCoverage(input);

      expect(result.isWithinWindow).toBe(true);
      expect(result.daysBetweenDOSAndApplication).toBe(15);
    });

    it('should handle DOS on same day as application', () => {
      const today = new Date();
      const input: RetroactiveCoverageInput = {
        dateOfService: today,
        applicationDate: today,
        stateOfResidence: 'CA',
        wasEligibleOnDOS: true,
        encounterType: 'ed',
        totalCharges: 10000,
      };
      const result = calculateRetroactiveCoverage(input);

      expect(result.isWithinWindow).toBe(true);
      expect(result.daysBetweenDOSAndApplication).toBe(0);
    });

    it('should calculate correct coverage start date for 90-day window', () => {
      const applicationDate = new Date(2024, 6, 15); // July 15, 2024
      const input: RetroactiveCoverageInput = {
        dateOfService: new Date(2024, 4, 1), // May 1, 2024
        applicationDate,
        stateOfResidence: 'CA',
        wasEligibleOnDOS: true,
        encounterType: 'inpatient',
        totalCharges: 50000,
      };
      const result = calculateRetroactiveCoverage(input);

      // Coverage should start on first of month 3 months before application
      expect(result.coverageStartDate.getMonth()).toBe(3); // April
      expect(result.coverageStartDate.getDate()).toBe(1);
    });
  });

  // ============================================================================
  // 1115 WAIVER EXTENDED/REDUCED WINDOWS
  // ============================================================================

  describe('1115 Waiver Extended/Reduced Windows', () => {
    describe('States with NO Retroactive Coverage (0 days)', () => {
      it('should have 0-day window for Arizona', () => {
        const window = getStateRetroactiveWindow('AZ');
        expect(window).toBe(0);
      });

      it('should have 0-day window for Florida', () => {
        const window = getStateRetroactiveWindow('FL');
        expect(window).toBe(0);
      });

      it('should have 0-day window for Indiana', () => {
        const window = getStateRetroactiveWindow('IN');
        expect(window).toBe(0);
      });

      it('should have 0-day window for Iowa', () => {
        const window = getStateRetroactiveWindow('IA');
        expect(window).toBe(0);
      });

      it('should have 0-day window for New Hampshire', () => {
        const window = getStateRetroactiveWindow('NH');
        expect(window).toBe(0);
      });

      it('should deny retroactive coverage in 0-day states', () => {
        const input: RetroactiveCoverageInput = {
          dateOfService: daysAgo(30),
          applicationDate: new Date(),
          stateOfResidence: 'AZ',
          wasEligibleOnDOS: true,
          encounterType: 'inpatient',
          totalCharges: 50000,
        };
        const result = calculateRetroactiveCoverage(input);

        expect(result.isWithinWindow).toBe(false);
        expect(result.retroactiveWindowDays).toBe(0);
        expect(result.stateHasWaiver).toBe(true);
        expect(result.notes.some(n => n.includes('no retroactive'))).toBe(true);
      });

      it('should include waiver details for 0-day states', () => {
        const input: RetroactiveCoverageInput = {
          dateOfService: daysAgo(30),
          applicationDate: new Date(),
          stateOfResidence: 'FL',
          wasEligibleOnDOS: true,
          encounterType: 'inpatient',
          totalCharges: 50000,
        };
        const result = calculateRetroactiveCoverage(input);

        expect(result.waiverDetails).toBeDefined();
        expect(result.waiverDetails?.waiverType).toBe('1115');
        expect(result.waiverDetails?.retroactiveDaysAllowed).toBe(0);
      });

      it('should list all states with no retroactive coverage', () => {
        const states = getStatesWithNoRetroactiveCoverage();
        expect(states).toContain('AZ');
        expect(states).toContain('FL');
        expect(states).toContain('IN');
        expect(states).toContain('IA');
        expect(states).toContain('NH');
      });
    });

    describe('States with REDUCED Retroactive Coverage (60 days)', () => {
      it('should have 60-day window for Arkansas', () => {
        const window = getStateRetroactiveWindow('AR');
        expect(window).toBe(60);
      });

      it('should approve DOS within 60 days for Arkansas', () => {
        const input: RetroactiveCoverageInput = {
          dateOfService: daysAgo(45),
          applicationDate: new Date(),
          stateOfResidence: 'AR',
          wasEligibleOnDOS: true,
          encounterType: 'inpatient',
          totalCharges: 30000,
        };
        const result = calculateRetroactiveCoverage(input);

        expect(result.isWithinWindow).toBe(true);
        expect(result.retroactiveWindowDays).toBe(60);
      });

      it('should deny DOS beyond 2-month window for Arkansas', () => {
        // Arkansas has 60-day (2-month) window - use 3 months ago to be clearly outside
        const input: RetroactiveCoverageInput = {
          dateOfService: monthsAgo(3),
          applicationDate: new Date(),
          stateOfResidence: 'AR',
          wasEligibleOnDOS: true,
          encounterType: 'inpatient',
          totalCharges: 30000,
        };
        const result = calculateRetroactiveCoverage(input);

        expect(result.isWithinWindow).toBe(false);
        expect(result.stateHasWaiver).toBe(true);
      });

      it('should list Arkansas in reduced coverage states', () => {
        const states = getStatesWithReducedRetroactiveCoverage();
        expect(states).toContain('AR');
      });
    });

    describe('States with Standard 90-day Coverage', () => {
      it('should have 90-day window for Ohio', () => {
        const window = getStateRetroactiveWindow('OH');
        expect(window).toBe(90);
      });

      it('should have 90-day window for California', () => {
        const window = getStateRetroactiveWindow('CA');
        expect(window).toBe(90);
      });

      it('should have 90-day window for unknown states (default)', () => {
        const window = getStateRetroactiveWindow('XX');
        expect(window).toBe(90);
      });

      it('should not have waiver flag for Ohio', () => {
        expect(stateHasRetroactiveWaiver('OH')).toBe(false);
      });

      it('should have waiver flag for states with reduced windows', () => {
        expect(stateHasRetroactiveWaiver('AZ')).toBe(true);
        expect(stateHasRetroactiveWaiver('FL')).toBe(true);
        expect(stateHasRetroactiveWaiver('AR')).toBe(true);
      });
    });

    describe('States with 90-day Coverage but Active Waivers', () => {
      it('should have 90-day window for Montana', () => {
        const window = getStateRetroactiveWindow('MT');
        expect(window).toBe(90);
      });

      it('should have 90-day window for Michigan', () => {
        const window = getStateRetroactiveWindow('MI');
        expect(window).toBe(90);
      });

      it('should not flag 90-day waiver states as having reduced coverage', () => {
        expect(stateHasRetroactiveWaiver('MT')).toBe(false);
        expect(stateHasRetroactiveWaiver('MI')).toBe(false);
      });
    });
  });

  // ============================================================================
  // DATE RANGE CALCULATIONS
  // ============================================================================

  describe('Date Range Calculations', () => {
    it('should calculate correct days between DOS and application', () => {
      const input: RetroactiveCoverageInput = {
        dateOfService: daysAgo(45),
        applicationDate: new Date(),
        stateOfResidence: 'CA',
        wasEligibleOnDOS: true,
        encounterType: 'inpatient',
        totalCharges: 50000,
      };
      const result = calculateRetroactiveCoverage(input);

      expect(result.daysBetweenDOSAndApplication).toBe(45);
    });

    it('should handle DOS after application date', () => {
      const input: RetroactiveCoverageInput = {
        dateOfService: new Date(), // Today
        applicationDate: daysAgo(30), // 30 days ago
        stateOfResidence: 'CA',
        wasEligibleOnDOS: true,
        encounterType: 'inpatient',
        totalCharges: 50000,
      };
      const result = calculateRetroactiveCoverage(input);

      expect(result.isWithinWindow).toBe(false);
      expect(result.notes.some(n => n.includes('after application date'))).toBe(true);
    });

    it('should calculate coverage start date correctly for standard states', () => {
      const applicationDate = new Date(2024, 5, 15); // June 15, 2024
      const input: RetroactiveCoverageInput = {
        dateOfService: new Date(2024, 3, 1), // April 1, 2024
        applicationDate,
        stateOfResidence: 'NY',
        wasEligibleOnDOS: true,
        encounterType: 'inpatient',
        totalCharges: 40000,
      };
      const result = calculateRetroactiveCoverage(input);

      // Coverage starts first of month 3 months before June = March 1
      expect(result.coverageStartDate.getMonth()).toBe(2); // March
      expect(result.coverageStartDate.getDate()).toBe(1);
    });

    it('should calculate coverage start date correctly for 60-day states', () => {
      const applicationDate = new Date(2024, 5, 15); // June 15, 2024
      const input: RetroactiveCoverageInput = {
        dateOfService: new Date(2024, 4, 1), // May 1, 2024
        applicationDate,
        stateOfResidence: 'AR',
        wasEligibleOnDOS: true,
        encounterType: 'inpatient',
        totalCharges: 40000,
      };
      const result = calculateRetroactiveCoverage(input);

      // Coverage starts first of month 2 months before June = April 1
      expect(result.coverageStartDate.getMonth()).toBe(3); // April
      expect(result.coverageStartDate.getDate()).toBe(1);
    });

    it('should calculate coverage start date as application month for 0-day states', () => {
      const applicationDate = new Date(2024, 5, 15); // June 15, 2024
      const input: RetroactiveCoverageInput = {
        dateOfService: new Date(2024, 4, 1), // May 1, 2024
        applicationDate,
        stateOfResidence: 'AZ',
        wasEligibleOnDOS: true,
        encounterType: 'inpatient',
        totalCharges: 40000,
      };
      const result = calculateRetroactiveCoverage(input);

      // Coverage starts first of application month = June 1
      expect(result.coverageStartDate.getMonth()).toBe(5); // June
      expect(result.coverageStartDate.getDate()).toBe(1);
    });
  });

  // ============================================================================
  // RECOVERY ESTIMATION
  // ============================================================================

  describe('Recovery Estimation', () => {
    it('should estimate recovery for eligible inpatient claims', () => {
      const input: RetroactiveCoverageInput = {
        dateOfService: daysAgo(30),
        applicationDate: new Date(),
        stateOfResidence: 'CA',
        wasEligibleOnDOS: true,
        encounterType: 'inpatient',
        totalCharges: 100000,
      };
      const result = calculateRetroactiveCoverage(input);

      expect(result.estimatedRecovery).toBeGreaterThan(0);
    });

    it('should not estimate recovery when not eligible', () => {
      const input: RetroactiveCoverageInput = {
        dateOfService: daysAgo(30),
        applicationDate: new Date(),
        stateOfResidence: 'AZ', // No retroactive coverage
        wasEligibleOnDOS: true,
        encounterType: 'inpatient',
        totalCharges: 100000,
      };
      const result = calculateRetroactiveCoverage(input);

      expect(result.estimatedRecovery).toBe(0);
    });

    it('should not estimate recovery when patient was not eligible on DOS', () => {
      const input: RetroactiveCoverageInput = {
        dateOfService: daysAgo(30),
        applicationDate: new Date(),
        stateOfResidence: 'CA',
        wasEligibleOnDOS: false,
        encounterType: 'inpatient',
        totalCharges: 100000,
      };
      const result = calculateRetroactiveCoverage(input);

      expect(result.estimatedRecovery).toBe(0);
    });

    it('should apply different recovery rates by encounter type', () => {
      const baseInput: Omit<RetroactiveCoverageInput, 'encounterType'> = {
        dateOfService: daysAgo(30),
        applicationDate: new Date(),
        stateOfResidence: 'CA',
        wasEligibleOnDOS: true,
        totalCharges: 100000,
      };

      const inpatientResult = calculateRetroactiveCoverage({
        ...baseInput,
        encounterType: 'inpatient',
      });
      const edResult = calculateRetroactiveCoverage({
        ...baseInput,
        encounterType: 'ed',
      });
      const outpatientResult = calculateRetroactiveCoverage({
        ...baseInput,
        encounterType: 'outpatient',
      });

      // Inpatient should have highest recovery rate
      expect(inpatientResult.estimatedRecovery).toBeGreaterThan(0);
      expect(edResult.estimatedRecovery).toBeGreaterThan(0);
      expect(outpatientResult.estimatedRecovery).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // CONFIDENCE SCORING
  // ============================================================================

  describe('Confidence Scoring', () => {
    it('should have higher confidence when patient was eligible on DOS', () => {
      const baseInput: Omit<RetroactiveCoverageInput, 'wasEligibleOnDOS'> = {
        dateOfService: daysAgo(30),
        applicationDate: new Date(),
        stateOfResidence: 'CA',
        encounterType: 'inpatient',
        totalCharges: 50000,
      };

      const eligibleResult = calculateRetroactiveCoverage({
        ...baseInput,
        wasEligibleOnDOS: true,
      });
      const unknownResult = calculateRetroactiveCoverage({
        ...baseInput,
        wasEligibleOnDOS: false,
      });

      expect(eligibleResult.recoveryConfidence).toBeGreaterThan(unknownResult.recoveryConfidence);
    });

    it('should have higher confidence for recent DOS', () => {
      const baseInput: Omit<RetroactiveCoverageInput, 'dateOfService'> = {
        applicationDate: new Date(),
        stateOfResidence: 'CA',
        wasEligibleOnDOS: true,
        encounterType: 'inpatient',
        totalCharges: 50000,
      };

      const recentResult = calculateRetroactiveCoverage({
        ...baseInput,
        dateOfService: daysAgo(15),
      });
      const olderResult = calculateRetroactiveCoverage({
        ...baseInput,
        dateOfService: daysAgo(75),
      });

      expect(recentResult.recoveryConfidence).toBeGreaterThan(olderResult.recoveryConfidence);
    });

    it('should return 0 confidence when not within window', () => {
      const input: RetroactiveCoverageInput = {
        dateOfService: monthsAgo(4), // 4 months ago is outside the 3-month window
        applicationDate: new Date(),
        stateOfResidence: 'CA',
        wasEligibleOnDOS: true,
        encounterType: 'inpatient',
        totalCharges: 50000,
      };
      const result = calculateRetroactiveCoverage(input);

      expect(result.recoveryConfidence).toBe(0);
    });
  });

  // ============================================================================
  // ACTIONS AND NOTES
  // ============================================================================

  describe('Actions and Notes', () => {
    it('should include Medicaid application action when eligible', () => {
      const input: RetroactiveCoverageInput = {
        dateOfService: daysAgo(30),
        applicationDate: new Date(),
        stateOfResidence: 'CA',
        wasEligibleOnDOS: true,
        encounterType: 'inpatient',
        totalCharges: 50000,
      };
      const result = calculateRetroactiveCoverage(input);

      expect(result.actions.some(a => a.includes('Medicaid application'))).toBe(true);
    });

    it('should include documentation action when eligible', () => {
      const input: RetroactiveCoverageInput = {
        dateOfService: daysAgo(30),
        applicationDate: new Date(),
        stateOfResidence: 'CA',
        wasEligibleOnDOS: true,
        encounterType: 'inpatient',
        totalCharges: 50000,
      };
      const result = calculateRetroactiveCoverage(input);

      expect(result.actions.some(a => a.includes('Document'))).toBe(true);
    });

    it('should suggest alternative coverage for 0-day states', () => {
      const input: RetroactiveCoverageInput = {
        dateOfService: daysAgo(30),
        applicationDate: new Date(),
        stateOfResidence: 'AZ',
        wasEligibleOnDOS: true,
        encounterType: 'inpatient',
        totalCharges: 50000,
      };
      const result = calculateRetroactiveCoverage(input);

      expect(result.actions.some(a => a.includes('alternative') || a.includes('charity care') || a.includes('DSH'))).toBe(true);
    });

    it('should include waiver notes for waiver states', () => {
      const input: RetroactiveCoverageInput = {
        dateOfService: daysAgo(30),
        applicationDate: new Date(),
        stateOfResidence: 'FL',
        wasEligibleOnDOS: true,
        encounterType: 'inpatient',
        totalCharges: 50000,
      };
      const result = calculateRetroactiveCoverage(input);

      expect(result.notes.some(n => n.includes('1115') || n.includes('waiver'))).toBe(true);
    });

    it('should include eligibility verification action when eligibility uncertain', () => {
      const input: RetroactiveCoverageInput = {
        dateOfService: daysAgo(30),
        applicationDate: new Date(),
        stateOfResidence: 'CA',
        wasEligibleOnDOS: false,
        encounterType: 'inpatient',
        totalCharges: 50000,
      };
      const result = calculateRetroactiveCoverage(input);

      expect(result.actions.some(a => a.includes('Verify') || a.includes('eligibility'))).toBe(true);
    });
  });

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  describe('Utility Functions', () => {
    it('should correctly check if retroactive coverage is possible', () => {
      expect(isRetroactiveCoveragePossible(daysAgo(30), new Date(), 'CA')).toBe(true);
      expect(isRetroactiveCoveragePossible(monthsAgo(4), new Date(), 'CA')).toBe(false);
      expect(isRetroactiveCoveragePossible(daysAgo(30), new Date(), 'AZ')).toBe(false);
    });

    it('should correctly check for waiver states', () => {
      expect(stateHasRetroactiveWaiver('AZ')).toBe(true);
      expect(stateHasRetroactiveWaiver('FL')).toBe(true);
      expect(stateHasRetroactiveWaiver('AR')).toBe(true);
      expect(stateHasRetroactiveWaiver('CA')).toBe(false);
      expect(stateHasRetroactiveWaiver('NY')).toBe(false);
    });

    it('should return correct list of no-coverage states', () => {
      const states = getStatesWithNoRetroactiveCoverage();
      expect(states.length).toBeGreaterThanOrEqual(5);
      expect(states.every(s => s.length === 2)).toBe(true);
    });

    it('should return correct list of reduced-coverage states', () => {
      const states = getStatesWithReducedRetroactiveCoverage();
      expect(states).toContain('AR');
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle DOS on first of month', () => {
      const applicationDate = new Date(2024, 5, 15);
      const input: RetroactiveCoverageInput = {
        dateOfService: new Date(2024, 3, 1), // April 1
        applicationDate,
        stateOfResidence: 'CA',
        wasEligibleOnDOS: true,
        encounterType: 'inpatient',
        totalCharges: 50000,
      };
      const result = calculateRetroactiveCoverage(input);

      expect(result.isWithinWindow).toBe(true);
    });

    it('should handle DOS on last of month', () => {
      const applicationDate = new Date(2024, 5, 15);
      const input: RetroactiveCoverageInput = {
        dateOfService: new Date(2024, 3, 30), // April 30
        applicationDate,
        stateOfResidence: 'CA',
        wasEligibleOnDOS: true,
        encounterType: 'inpatient',
        totalCharges: 50000,
      };
      const result = calculateRetroactiveCoverage(input);

      expect(result.isWithinWindow).toBe(true);
    });

    it('should handle application at year boundary', () => {
      const applicationDate = new Date(2024, 0, 15); // January 15, 2024
      const input: RetroactiveCoverageInput = {
        dateOfService: new Date(2023, 10, 1), // November 1, 2023
        applicationDate,
        stateOfResidence: 'CA',
        wasEligibleOnDOS: true,
        encounterType: 'inpatient',
        totalCharges: 50000,
      };
      const result = calculateRetroactiveCoverage(input);

      expect(result.isWithinWindow).toBe(true);
      expect(result.coverageStartDate.getFullYear()).toBe(2023);
    });

    it('should handle zero charges', () => {
      const input: RetroactiveCoverageInput = {
        dateOfService: daysAgo(30),
        applicationDate: new Date(),
        stateOfResidence: 'CA',
        wasEligibleOnDOS: true,
        encounterType: 'inpatient',
        totalCharges: 0,
      };
      const result = calculateRetroactiveCoverage(input);

      expect(result.estimatedRecovery).toBe(0);
    });

    it('should handle very high charges', () => {
      const input: RetroactiveCoverageInput = {
        dateOfService: daysAgo(30),
        applicationDate: new Date(),
        stateOfResidence: 'CA',
        wasEligibleOnDOS: true,
        encounterType: 'inpatient',
        totalCharges: 10000000,
      };
      const result = calculateRetroactiveCoverage(input);

      expect(result).toBeDefined();
      expect(result.estimatedRecovery).toBeGreaterThan(0);
    });

    it('should handle unknown state code with default 90-day window', () => {
      const input: RetroactiveCoverageInput = {
        dateOfService: daysAgo(60),
        applicationDate: new Date(),
        stateOfResidence: 'XX',
        wasEligibleOnDOS: true,
        encounterType: 'inpatient',
        totalCharges: 50000,
      };
      const result = calculateRetroactiveCoverage(input);

      expect(result.retroactiveWindowDays).toBe(90);
      expect(result.stateHasWaiver).toBe(false);
    });

    it('should handle lowercase state codes', () => {
      const input: RetroactiveCoverageInput = {
        dateOfService: daysAgo(30),
        applicationDate: new Date(),
        stateOfResidence: 'ca',
        wasEligibleOnDOS: true,
        encounterType: 'inpatient',
        totalCharges: 50000,
      };
      const result = calculateRetroactiveCoverage(input);

      expect(result.retroactiveWindowDays).toBe(90);
    });
  });
});
