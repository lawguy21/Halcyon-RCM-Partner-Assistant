'use client';

import { useState, useCallback } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface EligibilityScreeningInput {
  patientId?: string;
  dateOfBirth: string;
  stateOfResidence: string;
  householdSize: number;
  householdIncome: number;
  incomeFrequency: 'annual' | 'monthly';
  wages?: number;
  selfEmployment?: number;
  socialSecurity?: number;
  unemployment?: number;
  pension?: number;
  investment?: number;
  alimony?: number;
  isPregnant?: boolean;
  isDisabled?: boolean;
  hasEndStageRenalDisease?: boolean;
  hasALS?: boolean;
  isReceivingSSDI?: boolean;
  ssdiStartDate?: string;
  hasMedicare?: boolean;
  medicarePartA?: boolean;
  medicarePartB?: boolean;
  hasMedicaid?: boolean;
  medicaidStatus?: 'active' | 'pending' | 'denied' | 'none';
  commercialInsuranceType?: string;
  hasAssets?: boolean;
  assets?: Array<{
    type: string;
    estimatedValue: number;
    description?: string;
  }>;
  dateOfService?: string;
  applicationDate?: string;
  ssn?: string;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zipCode: string;
  };
  phoneNumber?: string;
  email?: string;
  maritalStatus?: string;
  minorDependents?: Array<{
    age: number;
    relationshipStatus: string;
    sameHousehold: boolean;
    medicaidEligible: string;
    snapEligible: string;
  }>;
}

export interface EligibilityResult {
  magi: {
    totalMAGI: number;
    fplPercentage: number;
    isEligible: boolean;
    confidence: number;
    incomeBreakdown: {
      countedIncome: number;
      disregards: number;
      netCountableIncome: number;
    };
  };
  presumptive: {
    isEligible: boolean;
    programsAvailable: string[];
    coverageEndDate?: string;
    applicationDeadline?: string;
    confidence: number;
  };
  retroactive: {
    isEligible: boolean;
    coverageStartDate?: string;
    monthsCovered: number;
    hasWaiverRestriction: boolean;
    confidence: number;
  };
  medicare: {
    isEligible: boolean;
    eligibilityBasis?: string;
    eligibilityDate?: string;
    confidence: number;
  };
  dualEligible?: {
    isDualEligible: boolean;
    category?: string;
    billingInstructions?: string[];
    confidence: number;
  };
  recommendation: {
    primaryPath: string;
    confidence: number;
    immediateActions: string[];
    documentsNeeded: string[];
  };
}

export interface StateEligibilityInfo {
  stateCode: string;
  stateName: string;
  isExpansionState: boolean;
  incomeThresholds: Record<string, number>;
  hasPresumptiveEligibility: boolean;
  retroactiveWindow: number;
}

interface UseEligibilityReturn {
  loading: boolean;
  error: string | null;
  screenEligibility: (input: EligibilityScreeningInput) => Promise<EligibilityResult | null>;
  quickMAGICheck: (stateCode: string, householdSize: number, monthlyIncome: number) => Promise<{
    isLikelyEligible: boolean;
    fplPercentage: number;
    threshold: number;
  } | null>;
  getStateInfo: (stateCode: string) => Promise<StateEligibilityInfo | null>;
  getAllStates: () => Promise<StateEligibilityInfo[]>;
  getExpansionStates: () => Promise<string[]>;
}

export function useEligibility(): UseEligibilityReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const screenEligibility = useCallback(async (input: EligibilityScreeningInput): Promise<EligibilityResult | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/eligibility/screen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to screen eligibility');
      }

      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to screen eligibility');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const quickMAGICheck = useCallback(async (
    stateCode: string,
    householdSize: number,
    monthlyIncome: number
  ): Promise<{ isLikelyEligible: boolean; fplPercentage: number; threshold: number } | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/eligibility/quick-magi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stateCode, householdSize, monthlyIncome }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to perform MAGI check');
      }

      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to perform MAGI check');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getStateInfo = useCallback(async (stateCode: string): Promise<StateEligibilityInfo | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/eligibility/state/${stateCode}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to get state info');
      }

      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get state info');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getAllStates = useCallback(async (): Promise<StateEligibilityInfo[]> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/eligibility/states`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to get states');
      }

      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get states');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getExpansionStates = useCallback(async (): Promise<string[]> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/eligibility/expansion-states`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to get expansion states');
      }

      return data.data.expansionStates;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get expansion states');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    screenEligibility,
    quickMAGICheck,
    getStateInfo,
    getAllStates,
    getExpansionStates,
  };
}
