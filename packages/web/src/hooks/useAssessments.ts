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
import { useUserPreferences } from './useUserPreferences';

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

// Generate mock data (kept for fallback/development without API)
const mockAssessments: Assessment[] = Array.from({ length: 50 }, (_, i) =>
  generateMockAssessment(`assess-${i + 1}`)
);

// Transform API response to frontend Assessment type
function transformApiResponseToAssessment(apiResult: any, inputOverride?: AssessmentFormInput): Assessment {
  // Handle both direct assessment and wrapped in {success, data} format
  const assessment = apiResult.data || apiResult;
  const result = assessment.result || assessment;
  const apiInput = assessment.input || {};
  const id = assessment.id || `assess-${Date.now()}`;

  // Use input override if provided, otherwise build from API input
  const patientName = inputOverride?.patientName || assessment.patientIdentifier || 'Unknown Patient';
  const accountNumber = inputOverride?.accountNumber || assessment.accountNumber || apiInput.accountNumber || '';
  const dateOfService = inputOverride?.dateOfService || apiInput.dateOfService || '';
  const totalCharges = inputOverride?.totalCharges || apiInput.totalCharges || 0;
  const facilityState = inputOverride?.facilityState || apiInput.facilityState || apiInput.stateOfService || '';
  const encounterType = inputOverride?.encounterType || apiInput.encounterType || 'outpatient';

  // Map dshRelevance to dsh (API uses dshRelevance, frontend expects dsh)
  const dshData = result.dshRelevance || result.dsh || {};

  return {
    id,
    accountNumber,
    patientName,
    dateOfService,
    totalCharges,
    facilityState,
    encounterType,
    insuranceStatus: apiInput.insuranceStatusOnDOS || 'uninsured',
    primaryRecoveryPath: result.primaryRecoveryPath || 'Medicaid',
    overallConfidence: result.overallConfidence || 75,
    estimatedTotalRecovery: result.estimatedTotalRecovery || 0,
    recoveryRate: totalCharges > 0 ? ((result.estimatedTotalRecovery || 0) / totalCharges) * 100 : 0,
    medicaid: {
      status: result.medicaid?.eligibilityStatus || result.medicaid?.status || 'possible',
      confidence: result.medicaid?.confidence || 70,
      pathway: result.medicaid?.recommendedPath || result.medicaid?.pathway || 'Standard Application',
      actions: result.medicaid?.actions || result.medicaid?.nextSteps || [],
      estimatedRecovery: result.medicaid?.estimatedRecovery || 0,
      timelineWeeks: result.medicaid?.timelineWeeks || result.medicaid?.timeline || '4-8',
      notes: result.medicaid?.notes || [],
    },
    medicare: {
      status: result.medicare?.eligibilityStatus || result.medicare?.status || 'unlikely',
      confidence: result.medicare?.confidence || 30,
      pathway: result.medicare?.recommendedPath || result.medicare?.pathway || '',
      actions: result.medicare?.actions || result.medicare?.nextSteps || [],
      estimatedTimeToEligibility: result.medicare?.estimatedTimeToEligibility || result.medicare?.timeline || '',
      notes: result.medicare?.notes || [],
    },
    dsh: {
      relevance: dshData.relevance || 'medium',
      score: dshData.score || dshData.dshScore || 60,
      factors: dshData.factors || dshData.keyFactors?.map((f: any) => ({
        factor: f.factor || f,
        impact: f.impact || 'positive',
        weight: f.weight || 0.2,
      })) || [],
      auditReadiness: dshData.auditReadiness || 'moderate',
      notes: dshData.notes || dshData.recommendations || [],
    },
    stateProgram: {
      archetype: result.stateProgram?.archetype || result.stateProgram?.programArchetype || 'standard',
      programName: result.stateProgram?.programName || result.stateProgram?.recommendedProgram || '',
      confidence: result.stateProgram?.confidence || 50,
      eligibilityLikely: result.stateProgram?.eligibilityLikely ?? true,
      requiredDocuments: result.stateProgram?.requiredDocuments || [],
      actions: result.stateProgram?.actions || result.stateProgram?.nextSteps || [],
      estimatedRecoveryPercent: result.stateProgram?.estimatedRecoveryPercent || result.stateProgram?.recoveryPotentialPercent || 0,
      notes: result.stateProgram?.notes || [],
    },
    priorityActions: result.priorityActions || [],
    immediateActions: result.immediateActions || [],
    followUpActions: result.followUpActions || [],
    documentationNeeded: result.documentationNeeded || [],
    createdAt: assessment.createdAt || new Date().toISOString(),
    updatedAt: assessment.updatedAt || new Date().toISOString(),
    status: 'pending',
  };
}

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
  const { showDemoData } = useUserPreferences();

  const fetchAssessments = useCallback(
    async (filters?: AssessmentFilters, pagination?: PaginationParams) => {
      setLoading(true);
      setError(null);

      try {
        const currentPage = pagination?.page || 1;
        const currentPageSize = pagination?.pageSize || 10;

        // Build query params matching backend schema
        const params = new URLSearchParams();
        const offset = (currentPage - 1) * currentPageSize;
        params.set('limit', currentPageSize.toString());
        params.set('offset', offset.toString());
        params.set('includeDemoData', showDemoData.toString());
        if (filters?.search) params.set('search', filters.search);
        if (filters?.pathway) params.set('primaryRecoveryPath', filters.pathway);
        if (filters?.state) params.set('state', filters.state);
        if (filters?.confidenceMin !== undefined) params.set('minConfidence', filters.confidenceMin.toString());
        if (filters?.confidenceMax !== undefined) params.set('maxConfidence', filters.confidenceMax.toString());

        const response = await fetch(`${API_BASE_URL}/api/assessments?${params.toString()}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          // Fall back to mock data if API is not available
          console.warn('API not available, using mock data');
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

          const start = (currentPage - 1) * currentPageSize;
          const paginated = filtered.slice(start, start + currentPageSize);

          setAssessments(paginated);
          setTotal(filtered.length);
          setPage(currentPage);
          setPageSize(currentPageSize);
          return;
        }

        const data = await response.json();

        // Transform API assessments to frontend format
        const transformedAssessments = (data.assessments || data.data || []).map((item: any) =>
          transformApiResponseToAssessment(item, item.input || item)
        );

        setAssessments(transformedAssessments);
        setTotal(data.total || data.pagination?.total || transformedAssessments.length);
        setPage(currentPage);
        setPageSize(currentPageSize);
      } catch (err) {
        // Fall back to mock data on error
        console.warn('Error fetching assessments, using mock data:', err);
        const currentPage = pagination?.page || 1;
        const currentPageSize = pagination?.pageSize || 10;
        const start = (currentPage - 1) * currentPageSize;
        const paginated = mockAssessments.slice(start, start + currentPageSize);

        setAssessments(paginated);
        setTotal(mockAssessments.length);
        setPage(currentPage);
        setPageSize(currentPageSize);
      } finally {
        setLoading(false);
      }
    },
    [showDemoData]
  );

  const getAssessment = useCallback(async (id: string): Promise<Assessment | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/assessments/${id}`, {
          credentials: 'include',
        });

      if (!response.ok) {
        // Fall back to mock data if API is not available
        console.warn('API not available, using mock data');
        const assessment = mockAssessments.find((a) => a.id === id);
        return assessment || null;
      }

      const data = await response.json();
      return transformApiResponseToAssessment(data, data.input || data);
    } catch (err) {
      // Fall back to mock data on error
      console.warn('Error fetching assessment, using mock data:', err);
      const assessment = mockAssessments.find((a) => a.id === id);
      return assessment || null;
    }
  }, []);

  const createAssessment = useCallback(
    async (input: AssessmentFormInput): Promise<Assessment | null> => {
      setLoading(true);
      setError(null);

      try {
        // Build the HospitalRecoveryInput object for the API
        const hospitalRecoveryInput = {
          stateOfResidence: input.stateOfResidence,
          stateOfService: input.facilityState,
          dateOfService: input.dateOfService,
          encounterType: input.encounterType,
          lengthOfStay: input.lengthOfStay,
          totalCharges: input.totalCharges,
          insuranceStatusOnDOS: input.insuranceStatusOnDOS,
          highCostSharing: input.highCostSharing,
          medicaidStatus: input.medicaidStatus,
          medicaidTerminationDate: input.medicaidTerminationDate,
          medicareStatus: input.medicareStatus,
          ssiStatus: input.ssiStatus,
          ssdiStatus: input.ssdiStatus,
          householdIncome: input.householdIncome,
          householdSize: input.householdSize,
          estimatedAssets: input.estimatedAssets,
          disabilityLikelihood: input.disabilityLikelihood,
          ssiEligibilityLikely: input.ssiEligibilityLikely,
          ssdiEligibilityLikely: input.ssdiEligibilityLikely,
          facilityType: input.facilityType,
          facilityState: input.facilityState,
          emergencyService: input.emergencyService,
          medicallyNecessary: input.medicallyNecessary,
        };

        const response = await fetch(`${API_BASE_URL}/api/assessments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            input: hospitalRecoveryInput,
            accountNumber: input.accountNumber,
            patientIdentifier: input.patientName,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('[createAssessment] API error:', response.status, errorData);
          throw new Error(errorData.error?.message || errorData.error || `API error: ${response.status}`);
        }

        const apiResult = await response.json();
        console.log('[createAssessment] API response:', JSON.stringify(apiResult, null, 2));

        // Verify we got a valid ID from the API
        const assessmentData = apiResult.data || apiResult;
        if (!assessmentData.id) {
          console.error('[createAssessment] No ID in API response:', assessmentData);
          throw new Error('API did not return an assessment ID');
        }

        // Transform API response to frontend Assessment type
        const newAssessment = transformApiResponseToAssessment(apiResult, input);
        console.log('[createAssessment] Transformed assessment ID:', newAssessment.id);
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
      const response = await fetch(`${API_BASE_URL}/api/assessments/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        // Fall back to mock data if API is not available
        console.warn('API not available, using mock data');
        const index = mockAssessments.findIndex((a) => a.id === id);
        if (index > -1) {
          mockAssessments.splice(index, 1);
        }
        return true;
      }

      return true;
    } catch (err) {
      // Fall back to mock data on error
      console.warn('Error deleting assessment, using mock data:', err);
      const index = mockAssessments.findIndex((a) => a.id === id);
      if (index > -1) {
        mockAssessments.splice(index, 1);
      }
      return true;
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
