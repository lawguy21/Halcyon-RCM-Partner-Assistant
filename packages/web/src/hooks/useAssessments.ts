'use client';

import { useState, useCallback, useEffect } from 'react';
import type {
  Assessment,
  AssessmentFilters,
  PaginationParams,
  PaginatedResponse,
  DashboardStats,
  AssessmentFormInput,
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Mock data for development
const generateMockAssessment = (id: string): Assessment => ({
  id,
  accountNumber: `ACC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
  patientName: ['John Smith', 'Maria Garcia', 'James Johnson', 'Sarah Williams', 'Michael Brown'][
    Math.floor(Math.random() * 5)
  ],
  dateOfService: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0],
  totalCharges: Math.floor(Math.random() * 150000) + 5000,
  facilityState: ['CA', 'TX', 'FL', 'NY', 'PA'][Math.floor(Math.random() * 5)],
  encounterType: ['inpatient', 'observation', 'ed', 'outpatient'][
    Math.floor(Math.random() * 4)
  ] as Assessment['encounterType'],
  insuranceStatus: ['Uninsured', 'Underinsured', 'Medicaid Pending'][
    Math.floor(Math.random() * 3)
  ],
  primaryRecoveryPath: ['Medicaid', 'Medicare', 'DSH', 'State Program'][
    Math.floor(Math.random() * 4)
  ],
  overallConfidence: Math.floor(Math.random() * 50) + 50,
  estimatedTotalRecovery: Math.floor(Math.random() * 80000) + 2000,
  recoveryRate: Math.random() * 40 + 30,
  medicaid: {
    status: ['confirmed', 'likely', 'possible', 'unlikely'][
      Math.floor(Math.random() * 4)
    ] as Assessment['medicaid']['status'],
    confidence: Math.floor(Math.random() * 50) + 50,
    pathway: 'Retroactive Medicaid Application',
    actions: [
      'Submit Medicaid application with hospital records',
      'Request expedited processing due to hospitalization',
      'Provide income verification documents',
    ],
    estimatedRecovery: Math.floor(Math.random() * 50000) + 5000,
    timelineWeeks: '4-8',
    notes: ['Patient appears to qualify based on income', 'Emergency services may qualify for presumptive eligibility'],
  },
  medicare: {
    status: ['active_on_dos', 'future_likely', 'unlikely'][
      Math.floor(Math.random() * 3)
    ] as Assessment['medicare']['status'],
    confidence: Math.floor(Math.random() * 50) + 30,
    pathway: 'SSI/SSDI Path to Medicare',
    actions: ['Verify SSI/SSDI application status', 'Check for disability onset date'],
    estimatedTimeToEligibility: '24 months',
    notes: ['Patient may qualify for Medicare through disability pathway'],
  },
  dsh: {
    relevance: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)] as Assessment['dsh']['relevance'],
    score: Math.floor(Math.random() * 40) + 60,
    factors: [
      { factor: 'Low income patient', impact: 'positive', weight: 0.3 },
      { factor: 'Uninsured on DOS', impact: 'positive', weight: 0.25 },
      { factor: 'DSH-eligible facility', impact: 'positive', weight: 0.2 },
    ],
    auditReadiness: ['strong', 'moderate', 'weak'][
      Math.floor(Math.random() * 3)
    ] as Assessment['dsh']['auditReadiness'],
    notes: ['Case supports DSH reporting for this facility'],
  },
  stateProgram: {
    archetype: '1115_uc_pool',
    programName: 'Uncompensated Care Pool',
    confidence: Math.floor(Math.random() * 40) + 40,
    eligibilityLikely: Math.random() > 0.3,
    requiredDocuments: ['Proof of residency', 'Income verification', 'Hospital bill'],
    actions: ['Submit application to state program', 'Gather required documentation'],
    estimatedRecoveryPercent: Math.floor(Math.random() * 30) + 40,
    notes: ['State program may cover remaining balance after other recovery attempts'],
  },
  priorityActions: [
    'Submit Medicaid application immediately',
    'Request hospital financial assistance',
    'Document DSH eligibility factors',
  ],
  immediateActions: ['Verify patient identity', 'Confirm insurance status on DOS'],
  followUpActions: ['Monitor Medicaid application status', 'Track documentation submission'],
  documentationNeeded: ['Proof of income', 'Hospital records', 'ID verification'],
  createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date().toISOString(),
  status: ['pending', 'in_progress', 'completed', 'exported'][
    Math.floor(Math.random() * 4)
  ] as Assessment['status'],
});

// Generate mock data
const mockAssessments: Assessment[] = Array.from({ length: 50 }, (_, i) =>
  generateMockAssessment(`assess-${i + 1}`)
);

interface UseAssessmentsReturn {
  assessments: Assessment[];
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  fetchAssessments: (filters?: AssessmentFilters, pagination?: PaginationParams) => Promise<void>;
  getAssessment: (id: string) => Promise<Assessment | null>;
  createAssessment: (input: AssessmentFormInput) => Promise<Assessment | null>;
  deleteAssessment: (id: string) => Promise<boolean>;
  exportAssessments: (ids: string[], format: 'csv' | 'pdf') => Promise<Blob | null>;
}

export function useAssessments(): UseAssessmentsReturn {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchAssessments = useCallback(
    async (filters?: AssessmentFilters, pagination?: PaginationParams) => {
      setLoading(true);
      setError(null);

      try {
        // In production, this would call the API
        // const response = await fetch(`${API_BASE_URL}/api/assessments?${params}`);

        // For now, use mock data with filtering
        let filtered = [...mockAssessments];

        if (filters?.search) {
          const search = filters.search.toLowerCase();
          filtered = filtered.filter(
            (a) =>
              a.patientName.toLowerCase().includes(search) ||
              a.accountNumber.toLowerCase().includes(search)
          );
        }

        if (filters?.pathway) {
          filtered = filtered.filter(
            (a) => a.primaryRecoveryPath.toLowerCase() === filters.pathway?.toLowerCase()
          );
        }

        if (filters?.state) {
          filtered = filtered.filter((a) => a.facilityState === filters.state);
        }

        if (filters?.confidenceMin !== undefined) {
          filtered = filtered.filter((a) => a.overallConfidence >= (filters.confidenceMin || 0));
        }

        if (filters?.confidenceMax !== undefined) {
          filtered = filtered.filter((a) => a.overallConfidence <= (filters.confidenceMax || 100));
        }

        // Pagination
        const currentPage = pagination?.page || 1;
        const currentPageSize = pagination?.pageSize || 10;
        const start = (currentPage - 1) * currentPageSize;
        const paginated = filtered.slice(start, start + currentPageSize);

        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 300));

        setAssessments(paginated);
        setTotal(filtered.length);
        setPage(currentPage);
        setPageSize(currentPageSize);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch assessments');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const getAssessment = useCallback(async (id: string): Promise<Assessment | null> => {
    try {
      // In production: const response = await fetch(`${API_BASE_URL}/api/assessments/${id}`);
      const assessment = mockAssessments.find((a) => a.id === id);
      await new Promise((resolve) => setTimeout(resolve, 200));
      return assessment || null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch assessment');
      return null;
    }
  }, []);

  const createAssessment = useCallback(
    async (input: AssessmentFormInput): Promise<Assessment | null> => {
      setLoading(true);
      setError(null);

      try {
        // In production, this would call the API
        // const response = await fetch(`${API_BASE_URL}/api/assessments`, {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(input),
        // });

        // Simulate API call and generate a new assessment
        await new Promise((resolve) => setTimeout(resolve, 500));

        const newAssessment = generateMockAssessment(`assess-${Date.now()}`);
        newAssessment.patientName = input.patientName;
        newAssessment.accountNumber = input.accountNumber;
        newAssessment.dateOfService = input.dateOfService;
        newAssessment.totalCharges = input.totalCharges;
        newAssessment.facilityState = input.facilityState;
        newAssessment.encounterType = input.encounterType;

        mockAssessments.unshift(newAssessment);
        return newAssessment;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create assessment');
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const deleteAssessment = useCallback(async (id: string): Promise<boolean> => {
    try {
      // In production: await fetch(`${API_BASE_URL}/api/assessments/${id}`, { method: 'DELETE' });
      const index = mockAssessments.findIndex((a) => a.id === id);
      if (index > -1) {
        mockAssessments.splice(index, 1);
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete assessment');
      return false;
    }
  }, []);

  const exportAssessments = useCallback(
    async (ids: string[], format: 'csv' | 'pdf'): Promise<Blob | null> => {
      try {
        // In production, this would call the API to generate an export
        const toExport = mockAssessments.filter((a) => ids.includes(a.id));

        if (format === 'csv') {
          const headers = [
            'Account Number',
            'Patient Name',
            'Date of Service',
            'Total Charges',
            'Est. Recovery',
            'Pathway',
            'Confidence',
          ];
          const rows = toExport.map((a) => [
            a.accountNumber,
            a.patientName,
            a.dateOfService,
            a.totalCharges,
            a.estimatedTotalRecovery,
            a.primaryRecoveryPath,
            a.overallConfidence,
          ]);
          const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
          return new Blob([csv], { type: 'text/csv' });
        }

        // PDF would be generated server-side in production
        return null;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to export assessments');
        return null;
      }
    },
    []
  );

  return {
    assessments,
    loading,
    error,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    fetchAssessments,
    getAssessment,
    createAssessment,
    deleteAssessment,
    exportAssessments,
  };
}

interface UseDashboardStatsReturn {
  stats: DashboardStats | null;
  loading: boolean;
  error: string | null;
  fetchStats: () => Promise<void>;
}

export function useDashboardStats(): UseDashboardStatsReturn {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // In production, this would call the API
      await new Promise((resolve) => setTimeout(resolve, 300));

      const totalCharges = mockAssessments.reduce((sum, a) => sum + a.totalCharges, 0);
      const totalRecovery = mockAssessments.reduce((sum, a) => sum + a.estimatedTotalRecovery, 0);

      const byPathway = {
        medicaid: mockAssessments.filter((a) => a.primaryRecoveryPath === 'Medicaid').length,
        medicare: mockAssessments.filter((a) => a.primaryRecoveryPath === 'Medicare').length,
        dsh: mockAssessments.filter((a) => a.primaryRecoveryPath === 'DSH').length,
        stateProgram: mockAssessments.filter((a) => a.primaryRecoveryPath === 'State Program').length,
      };

      const byState: Record<string, number> = {};
      mockAssessments.forEach((a) => {
        byState[a.facilityState] = (byState[a.facilityState] || 0) + a.estimatedTotalRecovery;
      });

      setStats({
        totalAssessments: mockAssessments.length,
        totalCharges,
        estimatedRecovery: totalRecovery,
        recoveryRate: (totalRecovery / totalCharges) * 100,
        byPathway,
        byState,
        recentAssessments: mockAssessments.slice(0, 10),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  }, []);

  return { stats, loading, error, fetchStats };
}
