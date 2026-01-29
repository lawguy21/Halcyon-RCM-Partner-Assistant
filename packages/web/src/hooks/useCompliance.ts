'use client';

import { useState, useCallback } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface ComplianceNotice {
  id: string;
  accountId: string;
  noticeType: 'FAP_PLAIN_LANGUAGE' | 'ECA_30_DAY' | 'ECA_WRITTEN' | 'FAP_APPLICATION' | 'FAP_DETERMINATION';
  sentDate: string;
  deliveryMethod: string;
  confirmed: boolean;
  requiredByDate?: string;
  createdAt: string;
}

export interface ComplianceTimelineItem {
  date: string;
  event: string;
  status: 'completed' | 'pending' | 'overdue' | 'upcoming';
  daysRemaining?: number;
}

export interface ComplianceDashboardData {
  charityCare: {
    totalAccounts: number;
    accountsWithFAPNotice: number;
    accountsNearingECADeadline: number;
    accountsPastECADeadline: number;
    totalCharityCarePending: number;
  };
  dsh: {
    currentDPP: number;
    qualifiesForDSH: boolean;
    auditReadinessScore: number;
    documentationGaps: string[];
    excessPaymentRisk: number;
  };
  upcomingDeadlines: ComplianceTimelineItem[];
  alerts: Array<{
    severity: 'high' | 'medium' | 'low';
    message: string;
    accountIds?: string[];
  }>;
}

export interface CharityCareInput {
  accountId: string;
  totalCharges: number;
  dateOfService: string;
  patientFPL: number;
  hospitalFAPPolicy: {
    freeCareFPLThreshold: number;
    discountTiers: Array<{ maxFPL: number; discountPercent: number }>;
    maxAmountDueAtFreeCareFPL: number;
  };
  notificationsSent?: Array<{
    type: string;
    date: string;
    confirmed?: boolean;
  }>;
  fapApplicationReceived?: boolean;
  fapApplicationDate?: string;
  fapDeterminationMade?: boolean;
}

export interface DSHAuditInput {
  fiscalYear: number;
  totalPatientDays: number;
  medicarePartADays: number;
  medicareSSIDays: number;
  medicaidDays: number;
  dualEligibleDays: number;
  totalOperatingCosts: number;
  medicaidPayments: number;
  medicarePayments: number;
  uncompensatedCareCosts: number;
  charityCareAtCost: number;
  badDebtAtCost: number;
  dshPaymentsReceived: number;
  facilityType: 'urban' | 'rural' | 'sole_community' | 'critical_access';
}

interface UseComplianceReturn {
  loading: boolean;
  error: string | null;
  getDashboard: (organizationId: string) => Promise<ComplianceDashboardData | null>;
  evaluateCharityCare: (input: CharityCareInput) => Promise<any>;
  calculateDSH: (input: DSHAuditInput) => Promise<any>;
  recordNotice: (input: {
    accountId: string;
    noticeType: ComplianceNotice['noticeType'];
    sentDate: string;
    deliveryMethod: string;
    confirmed?: boolean;
  }) => Promise<{ id: string } | null>;
  getAccountNotices: (accountId: string) => Promise<ComplianceNotice[]>;
  checkECAStatus: (accountId: string) => Promise<{
    ecaAllowed: boolean;
    ecaAllowedDate?: string;
    daysUntilECAAllowed?: number;
    missingRequirements: string[];
  } | null>;
}

export function useCompliance(): UseComplianceReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getDashboard = useCallback(async (organizationId: string): Promise<ComplianceDashboardData | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/compliance/dashboard/${organizationId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to get dashboard');
      }

      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get dashboard');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const evaluateCharityCare = useCallback(async (input: CharityCareInput): Promise<any> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/compliance/charity-care/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to evaluate charity care');
      }

      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to evaluate charity care');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const calculateDSH = useCallback(async (input: DSHAuditInput): Promise<any> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/compliance/dsh/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to calculate DSH');
      }

      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate DSH');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const recordNotice = useCallback(async (input: {
    accountId: string;
    noticeType: ComplianceNotice['noticeType'];
    sentDate: string;
    deliveryMethod: string;
    confirmed?: boolean;
  }): Promise<{ id: string } | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/compliance/notices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to record notice');
      }

      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record notice');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getAccountNotices = useCallback(async (accountId: string): Promise<ComplianceNotice[]> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/compliance/notices/${accountId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to get notices');
      }

      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get notices');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const checkECAStatus = useCallback(async (accountId: string): Promise<{
    ecaAllowed: boolean;
    ecaAllowedDate?: string;
    daysUntilECAAllowed?: number;
    missingRequirements: string[];
  } | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/compliance/eca-status/${accountId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to check ECA status');
      }

      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check ECA status');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    getDashboard,
    evaluateCharityCare,
    calculateDSH,
    recordNotice,
    getAccountNotices,
    checkECAStatus,
  };
}
