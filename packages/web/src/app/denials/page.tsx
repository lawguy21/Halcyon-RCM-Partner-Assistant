'use client';

import { useEffect, useState, useCallback } from 'react';
import StatCard from '@/components/StatCard';
import DataTable, { Column } from '@/components/DataTable';
import {
  useDenials,
  DenialInput,
  DenialAnalytics,
  AppealRecommendation,
  CARCCode,
} from '@/hooks/useDenials';

interface DenialRecord {
  id: string;
  claimId: string;
  carcCode: string;
  category: string;
  deniedAmount: number;
  denialDate: string;
  appealable: boolean;
  status?: string;
}

interface Appeal {
  id: string;
  claimId: string;
  denialId: string;
  appealLevel: number;
  status: string;
  deadline?: string;
  createdAt: string;
}

export default function DenialsPage() {
  const {
    loading,
    error,
    analyzeDenial,
    getAnalytics,
    getCARCCodes,
    createAppeal,
    updateAppealStatus,
  } = useDenials();

  // Analytics state
  const [analytics, setAnalytics] = useState<DenialAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  // Denial analysis form state
  const [analysisForm, setAnalysisForm] = useState<DenialInput>({
    carcCode: '',
    rarcCode: '',
    deniedAmount: 0,
    claimType: 'professional',
    payerType: 'medicare',
    priorAppeals: 0,
  });
  const [analysisResult, setAnalysisResult] = useState<{
    analysis: any;
    carcInfo: CARCCode | null;
    rarcInfo: any;
    recommendation: AppealRecommendation;
  } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // CARC code lookup state
  const [carcCodes, setCarcCodes] = useState<CARCCode[]>([]);
  const [carcSearch, setCarcSearch] = useState('');
  const [carcLoading, setCarcLoading] = useState(false);

  // Recent denials state (mock data for display)
  const [recentDenials, setRecentDenials] = useState<DenialRecord[]>([]);
  const [selectedDenialIds, setSelectedDenialIds] = useState<Set<string>>(new Set());

  // Appeal workflow state
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [selectedDenialForAppeal, setSelectedDenialForAppeal] = useState<DenialRecord | null>(null);
  const [appealForm, setAppealForm] = useState({
    appealLevel: 1,
    deadline: '',
  });
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [creatingAppeal, setCreatingAppeal] = useState(false);

  // Active tab state
  const [activeTab, setActiveTab] = useState<'dashboard' | 'analyze' | 'lookup' | 'appeals'>('dashboard');

  // Fetch analytics on mount
  useEffect(() => {
    const fetchData = async () => {
      setAnalyticsLoading(true);
      try {
        // Using a default organization ID - in production this would come from auth context
        const data = await getAnalytics('org-default');
        if (data) {
          setAnalytics(data);
        } else {
          // Set mock data for demo purposes
          setAnalytics({
            totalDenials: 156,
            totalDeniedAmount: 487250,
            denialsByCategory: {
              'CO': { count: 45, amount: 125000 },
              'PR': { count: 38, amount: 98500 },
              'OA': { count: 32, amount: 87000 },
              'PI': { count: 25, amount: 95750 },
              'CR': { count: 16, amount: 81000 },
            },
            topDenialCodes: [
              { code: 'CO-4', count: 28, amount: 67500, description: 'The procedure code is inconsistent with the modifier used' },
              { code: 'PR-1', count: 22, amount: 45000, description: 'Deductible amount' },
              { code: 'CO-97', count: 18, amount: 38000, description: 'Payment adjusted because this procedure/service is not paid separately' },
              { code: 'OA-23', count: 15, amount: 32000, description: 'Payment adjusted due to the impact of prior payer(s) adjudication' },
              { code: 'CO-45', count: 12, amount: 28500, description: 'Charge exceeds fee schedule/maximum allowable' },
            ],
            appealableAmount: 312500,
            appealSuccessRate: 68.5,
            averageAppealTime: 21,
            preventableDenials: 89,
            preventableAmount: 198000,
          });
        }

        // Mock recent denials data
        setRecentDenials([
          { id: '1', claimId: 'CLM-2024-001', carcCode: 'CO-4', category: 'Contractual Obligation', deniedAmount: 2450, denialDate: '2024-01-15', appealable: true },
          { id: '2', claimId: 'CLM-2024-002', carcCode: 'PR-1', category: 'Patient Responsibility', deniedAmount: 1200, denialDate: '2024-01-14', appealable: false },
          { id: '3', claimId: 'CLM-2024-003', carcCode: 'CO-97', category: 'Contractual Obligation', deniedAmount: 3800, denialDate: '2024-01-13', appealable: true },
          { id: '4', claimId: 'CLM-2024-004', carcCode: 'OA-23', category: 'Other Adjustment', deniedAmount: 890, denialDate: '2024-01-12', appealable: true },
          { id: '5', claimId: 'CLM-2024-005', carcCode: 'CO-45', category: 'Contractual Obligation', deniedAmount: 5200, denialDate: '2024-01-11', appealable: true },
          { id: '6', claimId: 'CLM-2024-006', carcCode: 'PI-94', category: 'Payer Initiated', deniedAmount: 1850, denialDate: '2024-01-10', appealable: true },
          { id: '7', claimId: 'CLM-2024-007', carcCode: 'CR-100', category: 'Correction/Reversal', deniedAmount: 675, denialDate: '2024-01-09', appealable: false },
          { id: '8', claimId: 'CLM-2024-008', carcCode: 'CO-16', category: 'Contractual Obligation', deniedAmount: 4100, denialDate: '2024-01-08', appealable: true },
        ]);

        // Mock appeals data
        setAppeals([
          { id: 'APP-001', claimId: 'CLM-2024-001', denialId: '1', appealLevel: 1, status: 'pending', deadline: '2024-02-15', createdAt: '2024-01-16' },
          { id: 'APP-002', claimId: 'CLM-2024-003', denialId: '3', appealLevel: 1, status: 'in_progress', deadline: '2024-02-13', createdAt: '2024-01-14' },
          { id: 'APP-003', claimId: 'CLM-2024-005', denialId: '5', appealLevel: 2, status: 'approved', createdAt: '2024-01-12' },
        ]);
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
      } finally {
        setAnalyticsLoading(false);
      }
    };

    fetchData();
  }, [getAnalytics]);

  // Handle CARC code lookup
  const handleCarcLookup = useCallback(async () => {
    setCarcLoading(true);
    try {
      const codes = await getCARCCodes();
      setCarcCodes(codes);
    } catch (err) {
      console.error('Failed to fetch CARC codes:', err);
      // Set mock CARC codes for demo
      setCarcCodes([
        { code: 'CO-4', description: 'The procedure code is inconsistent with the modifier used', category: 'Contractual Obligation', appealable: true, commonResolutions: ['Verify modifier usage', 'Check documentation'], urgencyLevel: 'medium', timelyFilingDays: 90 },
        { code: 'CO-16', description: 'Claim/service lacks information needed for adjudication', category: 'Contractual Obligation', appealable: true, commonResolutions: ['Submit missing documentation', 'Provide additional info'], urgencyLevel: 'high', timelyFilingDays: 60 },
        { code: 'CO-45', description: 'Charge exceeds fee schedule/maximum allowable', category: 'Contractual Obligation', appealable: true, commonResolutions: ['Review contract rates', 'Negotiate fees'], urgencyLevel: 'low', timelyFilingDays: 120 },
        { code: 'CO-97', description: 'Payment adjusted because this procedure/service is not paid separately', category: 'Contractual Obligation', appealable: true, commonResolutions: ['Review bundling rules', 'Check CCI edits'], urgencyLevel: 'medium', timelyFilingDays: 90 },
        { code: 'PR-1', description: 'Deductible amount', category: 'Patient Responsibility', appealable: false, commonResolutions: ['Bill patient', 'Verify benefits'], urgencyLevel: 'low', timelyFilingDays: 0 },
        { code: 'PR-2', description: 'Coinsurance amount', category: 'Patient Responsibility', appealable: false, commonResolutions: ['Bill patient', 'Set up payment plan'], urgencyLevel: 'low', timelyFilingDays: 0 },
        { code: 'OA-23', description: 'Payment adjusted due to the impact of prior payer(s) adjudication', category: 'Other Adjustment', appealable: true, commonResolutions: ['Review COB', 'Verify primary payer'], urgencyLevel: 'medium', timelyFilingDays: 90 },
        { code: 'PI-94', description: 'Processed in Excess of charges', category: 'Payer Initiated', appealable: true, commonResolutions: ['Review charge capture', 'Verify billing'], urgencyLevel: 'high', timelyFilingDays: 60 },
      ]);
    } finally {
      setCarcLoading(false);
    }
  }, [getCARCCodes]);

  // Handle denial analysis
  const handleAnalyzeDenial = useCallback(async () => {
    if (!analysisForm.carcCode || analysisForm.deniedAmount <= 0) {
      return;
    }

    setAnalyzing(true);
    try {
      const result = await analyzeDenial(analysisForm);
      if (result) {
        setAnalysisResult(result);
      } else {
        // Set mock analysis result for demo
        setAnalysisResult({
          analysis: {
            denialType: 'Technical',
            likelihood: 'High',
            rootCause: 'Documentation issue',
          },
          carcInfo: {
            code: analysisForm.carcCode,
            description: 'The procedure code is inconsistent with the modifier used',
            category: 'Contractual Obligation',
            appealable: true,
            commonResolutions: ['Verify modifier usage', 'Check documentation', 'Review coding guidelines'],
            urgencyLevel: 'medium',
            timelyFilingDays: 90,
          },
          rarcInfo: analysisForm.rarcCode ? {
            code: analysisForm.rarcCode,
            description: 'Additional information required',
          } : null,
          recommendation: {
            shouldAppeal: true,
            confidence: 78,
            reasoning: [
              'This denial code has a historically high overturn rate',
              'Documentation appears to support the billed service',
              'Appeal deadline is within the filing window',
            ],
            suggestedActions: [
              'Gather supporting medical records',
              'Draft appeal letter citing medical necessity',
              'Include relevant clinical guidelines',
              'Submit within 30 days for optimal processing',
            ],
            requiredDocuments: [
              'Original claim form',
              'Medical records',
              'Physician attestation',
              'Prior authorization (if applicable)',
            ],
            deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            expectedRecovery: analysisForm.deniedAmount * 0.78,
          },
        });
      }
    } catch (err) {
      console.error('Failed to analyze denial:', err);
    } finally {
      setAnalyzing(false);
    }
  }, [analysisForm, analyzeDenial]);

  // Handle creating an appeal
  const handleCreateAppeal = useCallback(async () => {
    if (!selectedDenialForAppeal) return;

    setCreatingAppeal(true);
    try {
      const result = await createAppeal({
        claimId: selectedDenialForAppeal.claimId,
        denialId: selectedDenialForAppeal.id,
        appealLevel: appealForm.appealLevel,
        deadline: appealForm.deadline || undefined,
      });

      if (result) {
        // Add to appeals list
        const newAppeal: Appeal = {
          id: result.id,
          claimId: selectedDenialForAppeal.claimId,
          denialId: selectedDenialForAppeal.id,
          appealLevel: appealForm.appealLevel,
          status: 'pending',
          deadline: appealForm.deadline,
          createdAt: new Date().toISOString(),
        };
        setAppeals((prev) => [newAppeal, ...prev]);
      } else {
        // Mock success for demo
        const newAppeal: Appeal = {
          id: `APP-${Date.now()}`,
          claimId: selectedDenialForAppeal.claimId,
          denialId: selectedDenialForAppeal.id,
          appealLevel: appealForm.appealLevel,
          status: 'pending',
          deadline: appealForm.deadline,
          createdAt: new Date().toISOString(),
        };
        setAppeals((prev) => [newAppeal, ...prev]);
      }

      setShowAppealModal(false);
      setSelectedDenialForAppeal(null);
      setAppealForm({ appealLevel: 1, deadline: '' });
    } catch (err) {
      console.error('Failed to create appeal:', err);
    } finally {
      setCreatingAppeal(false);
    }
  }, [selectedDenialForAppeal, appealForm, createAppeal]);

  // Handle updating appeal status
  const handleUpdateAppealStatus = useCallback(async (appealId: string, newStatus: string) => {
    try {
      await updateAppealStatus(appealId, newStatus);
      setAppeals((prev) =>
        prev.map((appeal) =>
          appeal.id === appealId ? { ...appeal, status: newStatus } : appeal
        )
      );
    } catch (err) {
      console.error('Failed to update appeal status:', err);
      // Still update locally for demo
      setAppeals((prev) =>
        prev.map((appeal) =>
          appeal.id === appealId ? { ...appeal, status: newStatus } : appeal
        )
      );
    }
  }, [updateAppealStatus]);

  // Format currency
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  // Format date
  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  // Filter CARC codes based on search
  const filteredCarcCodes = carcCodes.filter(
    (code) =>
      code.code.toLowerCase().includes(carcSearch.toLowerCase()) ||
      code.description.toLowerCase().includes(carcSearch.toLowerCase()) ||
      code.category.toLowerCase().includes(carcSearch.toLowerCase())
  );

  // Denial table columns
  const denialColumns: Column<DenialRecord>[] = [
    {
      key: 'claimId',
      header: 'Claim ID',
      sortable: true,
      width: '140px',
      render: (item) => (
        <span className="font-mono text-sm text-slate-700">{item.claimId}</span>
      ),
    },
    {
      key: 'carcCode',
      header: 'CARC Code',
      sortable: true,
      width: '100px',
      render: (item) => (
        <span className="inline-flex px-2 py-1 text-xs font-medium bg-slate-100 text-slate-800 rounded">
          {item.carcCode}
        </span>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      sortable: true,
      render: (item) => {
        const categoryColors: Record<string, string> = {
          'Contractual Obligation': 'bg-blue-100 text-blue-800',
          'Patient Responsibility': 'bg-purple-100 text-purple-800',
          'Other Adjustment': 'bg-amber-100 text-amber-800',
          'Payer Initiated': 'bg-green-100 text-green-800',
          'Correction/Reversal': 'bg-red-100 text-red-800',
        };
        return (
          <span
            className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
              categoryColors[item.category] || 'bg-slate-100 text-slate-800'
            }`}
          >
            {item.category}
          </span>
        );
      },
    },
    {
      key: 'deniedAmount',
      header: 'Denied Amount',
      sortable: true,
      width: '130px',
      render: (item) => (
        <span className="font-semibold text-red-600">{formatCurrency(item.deniedAmount)}</span>
      ),
    },
    {
      key: 'denialDate',
      header: 'Date',
      sortable: true,
      width: '120px',
      render: (item) => (
        <span className="text-sm text-slate-600">{formatDate(item.denialDate)}</span>
      ),
    },
    {
      key: 'appealable',
      header: 'Appealable',
      sortable: true,
      width: '100px',
      render: (item) => (
        <span
          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
            item.appealable
              ? 'bg-green-100 text-green-800'
              : 'bg-slate-100 text-slate-500'
          }`}
        >
          {item.appealable ? 'Yes' : 'No'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '100px',
      render: (item) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (item.appealable) {
              setSelectedDenialForAppeal(item);
              setShowAppealModal(true);
            }
          }}
          disabled={!item.appealable}
          className={`px-3 py-1.5 text-xs font-medium rounded ${
            item.appealable
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
        >
          Appeal
        </button>
      ),
    },
  ];

  // Loading state
  if (analyticsLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="mt-2 text-slate-500">Loading denial management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Denial Management</h2>
          <p className="text-slate-500 mt-1">
            Analyze denials, track appeals, and optimize recovery
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setActiveTab('analyze')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            Analyze Denial
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8">
          {[
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'analyze', label: 'Analyze Denial' },
            { id: 'lookup', label: 'CARC Lookup' },
            { id: 'appeals', label: 'Appeals' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Analytics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Denials"
              value={analytics?.totalDenials.toLocaleString() || '0'}
              subtitle={formatCurrency(analytics?.totalDeniedAmount || 0)}
              variant="info"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
            />
            <StatCard
              title="Appeal Success Rate"
              value={`${analytics?.appealSuccessRate.toFixed(1) || '0'}%`}
              subtitle={`Avg. ${analytics?.averageAppealTime || 0} days`}
              variant="success"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <StatCard
              title="Preventable Denials"
              value={`${((analytics?.preventableDenials || 0) / (analytics?.totalDenials || 1) * 100).toFixed(0)}%`}
              subtitle={formatCurrency(analytics?.preventableAmount || 0)}
              variant="warning"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              }
            />
            <StatCard
              title="Appealable Amount"
              value={formatCurrency(analytics?.appealableAmount || 0)}
              subtitle="Potential recovery"
              variant="default"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
          </div>

          {/* Top Denial Codes */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Top Denial Codes</h3>
            <div className="space-y-4">
              {analytics?.topDenialCodes.map((code, index) => {
                const maxAmount = Math.max(...(analytics?.topDenialCodes.map((c) => c.amount) || [1]));
                const percentage = (code.amount / maxAmount) * 100;

                return (
                  <div key={code.code}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">
                          {index + 1}
                        </span>
                        <div>
                          <span className="font-mono text-sm font-medium text-slate-900">{code.code}</span>
                          <p className="text-xs text-slate-500 truncate max-w-md">{code.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-slate-900">{code.count} denials</span>
                        <p className="text-xs text-red-600">{formatCurrency(code.amount)}</p>
                      </div>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Denials Table */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Recent Denials</h3>
              <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                View All
              </button>
            </div>
            <DataTable
              data={recentDenials as any}
              columns={denialColumns as any}
              keyField="id"
              selectable
              selectedIds={selectedDenialIds}
              onSelectionChange={setSelectedDenialIds}
              loading={loading}
              emptyMessage="No denials found."
            />
          </div>
        </div>
      )}

      {/* Analyze Denial Tab */}
      {activeTab === 'analyze' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Analysis Form */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-6">Denial Analysis</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    CARC Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={analysisForm.carcCode}
                    onChange={(e) => setAnalysisForm({ ...analysisForm, carcCode: e.target.value.toUpperCase() })}
                    placeholder="e.g., CO-4"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    RARC Code
                  </label>
                  <input
                    type="text"
                    value={analysisForm.rarcCode}
                    onChange={(e) => setAnalysisForm({ ...analysisForm, rarcCode: e.target.value.toUpperCase() })}
                    placeholder="e.g., N1"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Denied Amount <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                  <input
                    type="number"
                    value={analysisForm.deniedAmount || ''}
                    onChange={(e) => setAnalysisForm({ ...analysisForm, deniedAmount: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="w-full border border-slate-300 rounded-lg pl-7 pr-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Claim Type</label>
                  <select
                    value={analysisForm.claimType}
                    onChange={(e) => setAnalysisForm({ ...analysisForm, claimType: e.target.value as 'professional' | 'institutional' })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="professional">Professional</option>
                    <option value="institutional">Institutional</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Payer Type</label>
                  <select
                    value={analysisForm.payerType}
                    onChange={(e) => setAnalysisForm({ ...analysisForm, payerType: e.target.value as 'medicare' | 'medicaid' | 'commercial' })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="medicare">Medicare</option>
                    <option value="medicaid">Medicaid</option>
                    <option value="commercial">Commercial</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Prior Appeals</label>
                <input
                  type="number"
                  value={analysisForm.priorAppeals || ''}
                  onChange={(e) => setAnalysisForm({ ...analysisForm, priorAppeals: parseInt(e.target.value) || 0 })}
                  min="0"
                  max="5"
                  placeholder="0"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <button
                onClick={handleAnalyzeDenial}
                disabled={analyzing || !analysisForm.carcCode || analysisForm.deniedAmount <= 0}
                className="w-full mt-4 inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {analyzing ? (
                  <>
                    <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    Analyze Denial
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Analysis Results */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-6">Appeal Recommendations</h3>

            {analysisResult ? (
              <div className="space-y-6">
                {/* Recommendation Summary */}
                <div className={`p-4 rounded-lg ${analysisResult.recommendation.shouldAppeal ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {analysisResult.recommendation.shouldAppeal ? (
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      )}
                      <span className={`font-semibold ${analysisResult.recommendation.shouldAppeal ? 'text-green-800' : 'text-amber-800'}`}>
                        {analysisResult.recommendation.shouldAppeal ? 'Recommend Appeal' : 'Appeal Not Recommended'}
                      </span>
                    </div>
                    <span className={`text-sm font-medium ${analysisResult.recommendation.shouldAppeal ? 'text-green-600' : 'text-amber-600'}`}>
                      {analysisResult.recommendation.confidence}% confidence
                    </span>
                  </div>
                  {analysisResult.recommendation.expectedRecovery && (
                    <p className="mt-2 text-sm text-slate-600">
                      Expected Recovery: <span className="font-semibold text-green-600">{formatCurrency(analysisResult.recommendation.expectedRecovery)}</span>
                    </p>
                  )}
                </div>

                {/* CARC Code Info */}
                {analysisResult.carcInfo && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 mb-2">CARC Code Details</h4>
                    <div className="bg-slate-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono font-semibold text-slate-900">{analysisResult.carcInfo.code}</span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          analysisResult.carcInfo.urgencyLevel === 'high' ? 'bg-red-100 text-red-800' :
                          analysisResult.carcInfo.urgencyLevel === 'medium' ? 'bg-amber-100 text-amber-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {analysisResult.carcInfo.urgencyLevel} urgency
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">{analysisResult.carcInfo.description}</p>
                      {analysisResult.carcInfo.timelyFilingDays && (
                        <p className="mt-2 text-xs text-slate-500">
                          Timely filing: {analysisResult.carcInfo.timelyFilingDays} days
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Reasoning */}
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-2">Reasoning</h4>
                  <ul className="space-y-2">
                    {analysisResult.recommendation.reasoning.map((reason, index) => (
                      <li key={index} className="flex items-start space-x-2 text-sm text-slate-600">
                        <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                        </svg>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Suggested Actions */}
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-2">Suggested Actions</h4>
                  <ol className="space-y-2">
                    {analysisResult.recommendation.suggestedActions.map((action, index) => (
                      <li key={index} className="flex items-start space-x-2 text-sm text-slate-600">
                        <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0">
                          {index + 1}
                        </span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Required Documents */}
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-2">Required Documents</h4>
                  <div className="flex flex-wrap gap-2">
                    {analysisResult.recommendation.requiredDocuments.map((doc, index) => (
                      <span key={index} className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded">
                        {doc}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Deadline */}
                {analysisResult.recommendation.deadline && (
                  <div className="pt-4 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Appeal Deadline</span>
                      <span className="font-semibold text-slate-900">{formatDate(analysisResult.recommendation.deadline)}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <svg className="w-12 h-12 mx-auto text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="mt-4">Enter denial details and click Analyze to get recommendations</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CARC Lookup Tab */}
      {activeTab === 'lookup' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900">CARC Code Lookup</h3>
            <button
              onClick={handleCarcLookup}
              disabled={carcLoading}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm disabled:opacity-50"
            >
              {carcLoading ? 'Loading...' : 'Load CARC Codes'}
            </button>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <input
                type="text"
                value={carcSearch}
                onChange={(e) => setCarcSearch(e.target.value)}
                placeholder="Search by code, description, or category..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* CARC Codes List */}
          {carcCodes.length > 0 ? (
            <div className="space-y-4">
              {filteredCarcCodes.map((code) => (
                <div key={code.code} className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-semibold text-slate-900">{code.code}</span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          code.appealable ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {code.appealable ? 'Appealable' : 'Non-Appealable'}
                        </span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          code.urgencyLevel === 'high' ? 'bg-red-100 text-red-800' :
                          code.urgencyLevel === 'medium' ? 'bg-amber-100 text-amber-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {code.urgencyLevel}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{code.description}</p>
                      <p className="mt-1 text-xs text-slate-500">Category: {code.category}</p>
                    </div>
                    {code.timelyFilingDays !== undefined && code.timelyFilingDays > 0 && (
                      <span className="text-xs text-slate-500">
                        {code.timelyFilingDays} days
                      </span>
                    )}
                  </div>
                  {code.commonResolutions.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <p className="text-xs font-medium text-slate-700 mb-1">Common Resolutions:</p>
                      <div className="flex flex-wrap gap-1">
                        {code.commonResolutions.map((resolution, index) => (
                          <span key={index} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded">
                            {resolution}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <svg className="w-12 h-12 mx-auto text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p className="mt-4">Click &quot;Load CARC Codes&quot; to view available codes</p>
            </div>
          )}
        </div>
      )}

      {/* Appeals Tab */}
      {activeTab === 'appeals' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-6">Active Appeals</h3>

            {appeals.length > 0 ? (
              <div className="space-y-4">
                {appeals.map((appeal) => {
                  const statusColors: Record<string, string> = {
                    pending: 'bg-amber-100 text-amber-800',
                    in_progress: 'bg-blue-100 text-blue-800',
                    approved: 'bg-green-100 text-green-800',
                    denied: 'bg-red-100 text-red-800',
                    withdrawn: 'bg-slate-100 text-slate-600',
                  };

                  return (
                    <div key={appeal.id} className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div>
                            <p className="font-mono text-sm font-medium text-slate-900">{appeal.claimId}</p>
                            <p className="text-xs text-slate-500">Appeal ID: {appeal.id}</p>
                          </div>
                          <span className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded">
                            Level {appeal.appealLevel}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[appeal.status] || 'bg-slate-100 text-slate-600'}`}>
                            {appeal.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4">
                          {appeal.deadline && (
                            <span className="text-sm text-slate-600">
                              Due: {formatDate(appeal.deadline)}
                            </span>
                          )}
                          <div className="flex items-center space-x-2">
                            {appeal.status === 'pending' && (
                              <button
                                onClick={() => handleUpdateAppealStatus(appeal.id, 'in_progress')}
                                className="px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700"
                              >
                                Start
                              </button>
                            )}
                            {appeal.status === 'in_progress' && (
                              <>
                                <button
                                  onClick={() => handleUpdateAppealStatus(appeal.id, 'approved')}
                                  className="px-3 py-1 text-xs font-medium bg-green-600 text-white rounded hover:bg-green-700"
                                >
                                  Approved
                                </button>
                                <button
                                  onClick={() => handleUpdateAppealStatus(appeal.id, 'denied')}
                                  className="px-3 py-1 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700"
                                >
                                  Denied
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        Created: {formatDate(appeal.createdAt)}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <svg className="w-12 h-12 mx-auto text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="mt-4">No active appeals. Create an appeal from the Dashboard tab.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Appeal Modal */}
      {showAppealModal && selectedDenialForAppeal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900">Create Appeal</h3>
              <button
                onClick={() => {
                  setShowAppealModal(false);
                  setSelectedDenialForAppeal(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-600">
                  Claim: <span className="font-medium text-slate-900">{selectedDenialForAppeal.claimId}</span>
                </p>
                <p className="text-sm text-slate-600">
                  CARC Code: <span className="font-medium text-slate-900">{selectedDenialForAppeal.carcCode}</span>
                </p>
                <p className="text-sm text-slate-600">
                  Amount: <span className="font-medium text-red-600">{formatCurrency(selectedDenialForAppeal.deniedAmount)}</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Appeal Level</label>
                <select
                  value={appealForm.appealLevel}
                  onChange={(e) => setAppealForm({ ...appealForm, appealLevel: parseInt(e.target.value) })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={1}>Level 1 - Initial Appeal</option>
                  <option value={2}>Level 2 - Second Appeal</option>
                  <option value={3}>Level 3 - External Review</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Deadline</label>
                <input
                  type="date"
                  value={appealForm.deadline}
                  onChange={(e) => setAppealForm({ ...appealForm, deadline: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowAppealModal(false);
                    setSelectedDenialForAppeal(null);
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateAppeal}
                  disabled={creatingAppeal}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm disabled:opacity-50"
                >
                  {creatingAppeal ? 'Creating...' : 'Create Appeal'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
