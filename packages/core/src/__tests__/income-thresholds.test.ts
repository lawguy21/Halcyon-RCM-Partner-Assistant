/**
 * Income Thresholds Configuration Tests
 *
 * Tests the FPL thresholds, expansion state lists, and income comparison utilities
 */

import {
  MEDICAID_EXPANSION_STATES,
  NON_EXPANSION_STATES,
  INCOME_LEVEL_ORDER,
  FPL_2024_ANNUAL,
  FPL_2024_ADDITIONAL_PERSON,
  SSI_FBR_2024_MONTHLY,
  SSI_RESOURCE_LIMIT_INDIVIDUAL,
  SSI_RESOURCE_LIMIT_COUPLE,
  SGA_LIMIT_2024_MONTHLY,
  SGA_LIMIT_BLIND_2024_MONTHLY,
  getFPLThreshold,
  getFPLPercentageThreshold,
  isMedicaidExpansionState,
  getMedicaidIncomeLimit,
  isIncomeBelowThreshold,
  parseFPLString,
  IncomeLevel,
} from '../config/income-thresholds';

describe('Medicaid Expansion States', () => {
  it('should include expansion states (40 states + DC)', () => {
    // As of 2024, 40 states + DC have expanded (DC is in the list)
    expect(MEDICAID_EXPANSION_STATES.length).toBeGreaterThanOrEqual(40);
  });

  it('should include major expansion states', () => {
    const majorExpansionStates = ['CA', 'NY', 'IL', 'PA', 'OH', 'MI', 'WA', 'OR', 'CO'];
    for (const state of majorExpansionStates) {
      expect(MEDICAID_EXPANSION_STATES).toContain(state);
    }
  });

  it('should include DC', () => {
    expect(MEDICAID_EXPANSION_STATES).toContain('DC');
  });

  it('should include recent expansion states (2023)', () => {
    expect(MEDICAID_EXPANSION_STATES).toContain('NC');
    expect(MEDICAID_EXPANSION_STATES).toContain('SD');
  });

  it('should NOT include non-expansion states', () => {
    for (const state of NON_EXPANSION_STATES) {
      expect(MEDICAID_EXPANSION_STATES).not.toContain(state);
    }
  });
});

describe('Non-Expansion States', () => {
  it('should include 10 non-expansion states', () => {
    expect(NON_EXPANSION_STATES.length).toBe(10);
  });

  it('should include known non-expansion states', () => {
    const knownNonExpansion = ['TX', 'FL', 'GA', 'AL', 'MS', 'SC', 'TN', 'WI', 'WY', 'KS'];
    for (const state of knownNonExpansion) {
      expect(NON_EXPANSION_STATES).toContain(state);
    }
  });

  it('should cover all US states plus DC between expansion and non-expansion', () => {
    const totalStates = MEDICAID_EXPANSION_STATES.length + NON_EXPANSION_STATES.length;
    // 50 states + DC = 51 total (DC is in expansion list)
    expect(totalStates).toBe(51);
  });
});

describe('Income Level Order', () => {
  it('should have 7 income levels', () => {
    expect(INCOME_LEVEL_ORDER.length).toBe(7);
  });

  it('should be ordered from lowest to highest', () => {
    expect(INCOME_LEVEL_ORDER[0]).toBe('under_fpl');
    expect(INCOME_LEVEL_ORDER[INCOME_LEVEL_ORDER.length - 1]).toBe('over_400_fpl');
  });

  it('should include all standard FPL thresholds', () => {
    expect(INCOME_LEVEL_ORDER).toContain('under_fpl');
    expect(INCOME_LEVEL_ORDER).toContain('fpl_138');
    expect(INCOME_LEVEL_ORDER).toContain('fpl_200');
    expect(INCOME_LEVEL_ORDER).toContain('fpl_250');
    expect(INCOME_LEVEL_ORDER).toContain('fpl_300');
    expect(INCOME_LEVEL_ORDER).toContain('fpl_400');
    expect(INCOME_LEVEL_ORDER).toContain('over_400_fpl');
  });
});

describe('FPL 2024 Annual Thresholds', () => {
  it('should have thresholds for household sizes 1-8', () => {
    for (let i = 1; i <= 8; i++) {
      expect(FPL_2024_ANNUAL[i]).toBeDefined();
      expect(typeof FPL_2024_ANNUAL[i]).toBe('number');
    }
  });

  it('should have correct 2024 FPL for individual ($15,060)', () => {
    expect(FPL_2024_ANNUAL[1]).toBe(15060);
  });

  it('should increase with household size', () => {
    for (let i = 1; i < 8; i++) {
      expect(FPL_2024_ANNUAL[i + 1]).toBeGreaterThan(FPL_2024_ANNUAL[i]!);
    }
  });

  it('should have reasonable values', () => {
    // Family of 4 should be around $31,200
    expect(FPL_2024_ANNUAL[4]).toBe(31200);
  });
});

describe('FPL Additional Person Amount', () => {
  it('should be $5,380 per additional person', () => {
    expect(FPL_2024_ADDITIONAL_PERSON).toBe(5380);
  });
});

describe('SSI/SSDI Constants', () => {
  it('should have SSI Federal Benefit Rate for 2024', () => {
    expect(SSI_FBR_2024_MONTHLY).toBe(943);
  });

  it('should have SSI resource limits', () => {
    expect(SSI_RESOURCE_LIMIT_INDIVIDUAL).toBe(2000);
    expect(SSI_RESOURCE_LIMIT_COUPLE).toBe(3000);
  });

  it('should have SGA limits for 2024', () => {
    expect(SGA_LIMIT_2024_MONTHLY).toBe(1550);
    expect(SGA_LIMIT_BLIND_2024_MONTHLY).toBe(2590);
  });

  it('should have higher SGA limit for blind individuals', () => {
    expect(SGA_LIMIT_BLIND_2024_MONTHLY).toBeGreaterThan(SGA_LIMIT_2024_MONTHLY);
  });
});

describe('getFPLThreshold', () => {
  it('should return correct threshold for household size 1', () => {
    expect(getFPLThreshold(1)).toBe(15060);
  });

  it('should return correct threshold for household size 4', () => {
    expect(getFPLThreshold(4)).toBe(31200);
  });

  it('should return correct threshold for household size 8', () => {
    expect(getFPLThreshold(8)).toBe(52720);
  });

  it('should calculate threshold for household size > 8', () => {
    const size9 = getFPLThreshold(9);
    expect(size9).toBe(52720 + 5380); // Base + 1 additional
  });

  it('should calculate threshold for household size 10', () => {
    const size10 = getFPLThreshold(10);
    expect(size10).toBe(52720 + (2 * 5380));
  });

  it('should handle household size 0 or negative', () => {
    expect(getFPLThreshold(0)).toBe(15060); // Default to 1
    expect(getFPLThreshold(-1)).toBe(15060);
  });
});

describe('getFPLPercentageThreshold', () => {
  it('should calculate 138% FPL for individual', () => {
    const threshold = getFPLPercentageThreshold(1, 138);
    expect(threshold).toBe(Math.round(15060 * 1.38));
  });

  it('should calculate 200% FPL for family of 4', () => {
    const threshold = getFPLPercentageThreshold(4, 200);
    expect(threshold).toBe(Math.round(31200 * 2));
  });

  it('should calculate 100% FPL', () => {
    const threshold = getFPLPercentageThreshold(1, 100);
    expect(threshold).toBe(15060);
  });

  it('should calculate 400% FPL', () => {
    const threshold = getFPLPercentageThreshold(1, 400);
    expect(threshold).toBe(Math.round(15060 * 4));
  });
});

describe('isMedicaidExpansionState', () => {
  it('should return true for expansion states', () => {
    expect(isMedicaidExpansionState('CA')).toBe(true);
    expect(isMedicaidExpansionState('NY')).toBe(true);
    expect(isMedicaidExpansionState('OH')).toBe(true);
  });

  it('should return false for non-expansion states', () => {
    expect(isMedicaidExpansionState('TX')).toBe(false);
    expect(isMedicaidExpansionState('FL')).toBe(false);
    expect(isMedicaidExpansionState('GA')).toBe(false);
  });

  it('should handle lowercase state codes', () => {
    expect(isMedicaidExpansionState('ca')).toBe(true);
    expect(isMedicaidExpansionState('tx')).toBe(false);
  });

  it('should handle mixed case', () => {
    expect(isMedicaidExpansionState('Ca')).toBe(true);
    expect(isMedicaidExpansionState('Tx')).toBe(false);
  });

  it('should return false for invalid state codes', () => {
    expect(isMedicaidExpansionState('XX')).toBe(false);
    expect(isMedicaidExpansionState('')).toBe(false);
  });
});

describe('getMedicaidIncomeLimit', () => {
  it('should return fpl_138 for expansion states', () => {
    expect(getMedicaidIncomeLimit('CA')).toBe('fpl_138');
    expect(getMedicaidIncomeLimit('NY')).toBe('fpl_138');
  });

  it('should return fpl_100 for non-expansion states', () => {
    expect(getMedicaidIncomeLimit('TX')).toBe('fpl_100');
    expect(getMedicaidIncomeLimit('FL')).toBe('fpl_100');
  });

  it('should handle lowercase state codes', () => {
    expect(getMedicaidIncomeLimit('ca')).toBe('fpl_138');
    expect(getMedicaidIncomeLimit('tx')).toBe('fpl_100');
  });
});

describe('isIncomeBelowThreshold', () => {
  describe('Basic comparisons', () => {
    it('should return true when income is below threshold', () => {
      expect(isIncomeBelowThreshold('under_fpl', 'fpl_138')).toBe(true);
      expect(isIncomeBelowThreshold('fpl_138', 'fpl_200')).toBe(true);
      expect(isIncomeBelowThreshold('fpl_200', 'fpl_400')).toBe(true);
    });

    it('should return true when income equals threshold', () => {
      expect(isIncomeBelowThreshold('fpl_138', 'fpl_138')).toBe(true);
      expect(isIncomeBelowThreshold('under_fpl', 'under_fpl')).toBe(true);
    });

    it('should return false when income is above threshold', () => {
      expect(isIncomeBelowThreshold('fpl_200', 'fpl_138')).toBe(false);
      expect(isIncomeBelowThreshold('over_400_fpl', 'fpl_400')).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should return true for under_fpl with any threshold', () => {
      expect(isIncomeBelowThreshold('under_fpl', 'under_fpl')).toBe(true);
      expect(isIncomeBelowThreshold('under_fpl', 'over_400_fpl')).toBe(true);
    });

    it('should return false for over_400_fpl with most thresholds', () => {
      expect(isIncomeBelowThreshold('over_400_fpl', 'fpl_400')).toBe(false);
      expect(isIncomeBelowThreshold('over_400_fpl', 'fpl_138')).toBe(false);
    });

    it('should return true for over_400_fpl against itself', () => {
      expect(isIncomeBelowThreshold('over_400_fpl', 'over_400_fpl')).toBe(true);
    });
  });

  describe('Medicaid eligibility scenarios', () => {
    it('should qualify under_fpl for expansion state threshold (138%)', () => {
      expect(isIncomeBelowThreshold('under_fpl', 'fpl_138')).toBe(true);
    });

    it('should qualify fpl_138 for expansion state threshold', () => {
      expect(isIncomeBelowThreshold('fpl_138', 'fpl_138')).toBe(true);
    });

    it('should NOT qualify fpl_200 for expansion state threshold', () => {
      expect(isIncomeBelowThreshold('fpl_200', 'fpl_138')).toBe(false);
    });
  });

  describe('Invalid inputs', () => {
    it('should return false for invalid income level', () => {
      expect(isIncomeBelowThreshold('invalid' as IncomeLevel, 'fpl_138')).toBe(false);
    });

    it('should return false for invalid threshold', () => {
      expect(isIncomeBelowThreshold('under_fpl', 'invalid')).toBe(false);
    });
  });
});

describe('parseFPLString', () => {
  it('should parse "100% FPL" to under_fpl', () => {
    expect(parseFPLString('100% FPL')).toBe('under_fpl');
  });

  it('should parse "138% FPL" to fpl_138', () => {
    expect(parseFPLString('138% FPL')).toBe('fpl_138');
  });

  it('should parse "200% FPL" to fpl_200', () => {
    expect(parseFPLString('200% FPL')).toBe('fpl_200');
  });

  it('should parse "250% FPL" to fpl_250', () => {
    expect(parseFPLString('250% FPL')).toBe('fpl_250');
  });

  it('should parse "300% FPL" to fpl_300', () => {
    expect(parseFPLString('300% FPL')).toBe('fpl_300');
  });

  it('should parse "400% FPL" to fpl_400', () => {
    expect(parseFPLString('400% FPL')).toBe('fpl_400');
  });

  it('should parse "500% FPL" to over_400_fpl', () => {
    expect(parseFPLString('500% FPL')).toBe('over_400_fpl');
  });

  it('should handle percentage without FPL suffix', () => {
    expect(parseFPLString('138%')).toBe('fpl_138');
    expect(parseFPLString('200%')).toBe('fpl_200');
  });

  it('should handle numbers only', () => {
    expect(parseFPLString('138')).toBe('fpl_138');
    expect(parseFPLString('200')).toBe('fpl_200');
  });

  it('should return fpl_138 for unparseable strings', () => {
    expect(parseFPLString('invalid')).toBe('fpl_138');
    expect(parseFPLString('')).toBe('fpl_138');
  });

  it('should handle borderline percentages', () => {
    expect(parseFPLString('99%')).toBe('under_fpl');
    expect(parseFPLString('101%')).toBe('fpl_138');
    expect(parseFPLString('139%')).toBe('fpl_200');
    expect(parseFPLString('201%')).toBe('fpl_250');
  });
});

describe('State Coverage Completeness', () => {
  const allStates = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
    'DC'
  ];

  it('should classify every US state as expansion or non-expansion', () => {
    for (const state of allStates) {
      const isExpansion = MEDICAID_EXPANSION_STATES.includes(state);
      const isNonExpansion = NON_EXPANSION_STATES.includes(state);

      // Each state should be in exactly one list (except DC which is expansion only)
      if (state === 'DC') {
        expect(isExpansion).toBe(true);
        expect(isNonExpansion).toBe(false);
      } else {
        expect(isExpansion !== isNonExpansion).toBe(true);
      }
    }
  });

  it('should return valid income limit for all states', () => {
    for (const state of allStates) {
      const limit = getMedicaidIncomeLimit(state);
      expect(['fpl_138', 'fpl_100']).toContain(limit);
    }
  });
});
