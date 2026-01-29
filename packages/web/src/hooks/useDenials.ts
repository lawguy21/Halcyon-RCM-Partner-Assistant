'use client';

import { useState, useCallback } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface DenialInput {
  carcCode: string;
  rarcCode?: string;
  deniedAmount: number;
  claimType?: 'professional' | 'institutional';
  payerType?: 'medicare' | 'medicaid' | 'commercial';
  priorAppeals?: number;
}

export interface DenialRecordInput {
  claimId: string;
  carcCode: string;
  rarcCode?: string;
  deniedAmount: number;
  denialDate: string;
  preventable?: boolean;
  rootCause?: string;
}

export interface DenialAnalytics {
  totalDenials: number;
  totalDeniedAmount: number;
  denialsByCategory: Record<string, { count: number; amount: number }>;
  topDenialCodes: Array<{ code: string; count: number; amount: number; description: string }>;
  appealableAmount: number;
  appealSuccessRate: number;
  averageAppealTime: number;
  preventableDenials: number;
  preventableAmount: number;
}

export interface AppealRecommendation {
  shouldAppeal: boolean;
  confidence: number;
  reasoning: string[];
  suggestedActions: string[];
  requiredDocuments: string[];
  deadline?: string;
  expectedRecovery?: number;
}

export interface CARCCode {
  code: string;
  description: string;
  category: string;
  appealable: boolean;
  commonResolutions: string[];
  urgencyLevel: 'high' | 'medium' | 'low';
  timelyFilingDays?: number;
}

interface UseDenialsReturn {
  loading: boolean;
  error: string | null;
  analyzeDenial: (input: DenialInput) => Promise<{
    analysis: any;
    carcInfo: CARCCode | null;
    rarcInfo: any;
    recommendation: AppealRecommendation;
  } | null>;
  recordDenial: (input: DenialRecordInput) => Promise<{ id: string } | null>;
  getAnalytics: (organizationId: string, startDate?: string, endDate?: string) => Promise<DenialAnalytics | null>;
  getClaimDenials: (claimId: string) => Promise<any[]>;
  createAppeal: (input: {
    claimId: string;
    denialId: string;
    appealLevel: number;
    deadline?: string;
  }) => Promise<{ id: string } | null>;
  updateAppealStatus: (appealId: string, status: string, outcome?: {
    recoveredAmount?: number;
    decisionDate?: string;
    notes?: string;
  }) => Promise<{ success: boolean } | null>;
  getCARCCodes: () => Promise<CARCCode[]>;
  getCARCCodesByCategory: (category: string) => Promise<CARCCode[]>;
  calculateBatchRecovery: (denialIds: string[]) => Promise<{
    totalDenied: number;
    appealableAmount: number;
    expectedRecovery: number;
    recommendedAppeals: string[];
  } | null>;
}

export function useDenials(): UseDenialsReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeDenial = useCallback(async (input: DenialInput) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/denials/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to analyze denial');
      }

      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze denial');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const recordDenial = useCallback(async (input: DenialRecordInput): Promise<{ id: string } | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/denials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to record denial');
      }

      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record denial');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getAnalytics = useCallback(async (
    organizationId: string,
    startDate?: string,
    endDate?: string
  ): Promise<DenialAnalytics | null> => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const url = `${API_BASE_URL}/api/denials/analytics/${organizationId}${params.toString() ? `?${params}` : ''}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to get analytics');
      }

      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get analytics');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getClaimDenials = useCallback(async (claimId: string): Promise<any[]> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/denials/claim/${claimId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to get claim denials');
      }

      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get claim denials');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createAppeal = useCallback(async (input: {
    claimId: string;
    denialId: string;
    appealLevel: number;
    deadline?: string;
  }): Promise<{ id: string } | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/denials/appeals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to create appeal');
      }

      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create appeal');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateAppealStatus = useCallback(async (
    appealId: string,
    status: string,
    outcome?: {
      recoveredAmount?: number;
      decisionDate?: string;
      notes?: string;
    }
  ): Promise<{ success: boolean } | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/denials/appeals/${appealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, ...outcome }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to update appeal');
      }

      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update appeal');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getCARCCodes = useCallback(async (): Promise<CARCCode[]> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/denials/carc-codes`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to get CARC codes');
      }

      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get CARC codes');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getCARCCodesByCategory = useCallback(async (category: string): Promise<CARCCode[]> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/denials/carc-codes/${category}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to get CARC codes');
      }

      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get CARC codes');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const calculateBatchRecovery = useCallback(async (denialIds: string[]): Promise<{
    totalDenied: number;
    appealableAmount: number;
    expectedRecovery: number;
    recommendedAppeals: string[];
  } | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/denials/batch-recovery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ denialIds }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to calculate batch recovery');
      }

      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate batch recovery');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    analyzeDenial,
    recordDenial,
    getAnalytics,
    getClaimDenials,
    createAppeal,
    updateAppealStatus,
    getCARCCodes,
    getCARCCodesByCategory,
    calculateBatchRecovery,
  };
}
