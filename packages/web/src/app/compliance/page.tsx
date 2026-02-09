'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import StatCard from '@/components/StatCard';
import { useCompliance, ComplianceDashboardData, ComplianceTimelineItem } from '@/hooks/useCompliance';

export default function CompliancePage() {
  const { data: session } = useSession();
  const { loading, error, getDashboard } = useCompliance();
  const [dashboardData, setDashboardData] = useState<ComplianceDashboardData | null>(null);
  const [selectedTimelineAccountId, setSelectedTimelineAccountId] = useState<string | null>(null);

  // Get organization ID from authenticated session
  const organizationId = session?.user?.organizationId || '';

  useEffect(() => {
    const loadDashboard = async () => {
      if (!organizationId) return; // Don't fetch without org ID
      const data = await getDashboard(organizationId);
      if (data) {
        setDashboardData(data);
      }
    };
    loadDashboard();
  }, [getDashboard, organizationId]);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  const getStatusColor = (status: ComplianceTimelineItem['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'upcoming':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getSeverityStyles = (severity: 'high' | 'medium' | 'low') => {
    switch (severity) {
      case 'high':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          icon: 'text-red-600',
          badge: 'bg-red-100 text-red-800',
        };
      case 'medium':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          icon: 'text-amber-600',
          badge: 'bg-amber-100 text-amber-800',
        };
      case 'low':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          icon: 'text-blue-600',
          badge: 'bg-blue-100 text-blue-800',
        };
    }
  };

  if (loading && !dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="mt-2 text-slate-500">Loading compliance dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">Error Loading Dashboard</h3>
          <p className="mt-2 text-slate-500">{error}</p>
          <button
            onClick={() => getDashboard(organizationId).then(setDashboardData)}
            className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Use default values if no data
  const charityCare = dashboardData?.charityCare || {
    totalAccounts: 0,
    accountsWithFAPNotice: 0,
    accountsNearingECADeadline: 0,
    accountsPastECADeadline: 0,
    totalCharityCarePending: 0,
  };

  const dsh = dashboardData?.dsh || {
    currentDPP: 0,
    qualifiesForDSH: false,
    auditReadinessScore: 0,
    documentationGaps: [],
    excessPaymentRisk: 0,
  };

  const alerts = dashboardData?.alerts || [];
  const upcomingDeadlines = dashboardData?.upcomingDeadlines || [];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Compliance Dashboard</h2>
          <p className="text-slate-500 mt-1">
            Monitor 501(r) charity care and DSH audit compliance
          </p>
        </div>
        <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export Compliance Report
        </button>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-slate-900">Active Alerts</h3>
          <div className="space-y-2">
            {alerts.map((alert, index) => {
              const styles = getSeverityStyles(alert.severity);
              return (
                <div
                  key={index}
                  className={`${styles.bg} ${styles.border} border rounded-lg p-4 flex items-start space-x-3`}
                >
                  <div className={`${styles.icon} mt-0.5`}>
                    {alert.severity === 'high' ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    ) : alert.severity === 'medium' ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className={`${styles.badge} text-xs font-medium px-2 py-0.5 rounded-full uppercase`}>
                        {alert.severity}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-700">{alert.message}</p>
                    {alert.accountIds && alert.accountIds.length > 0 && (
                      <p className="mt-1 text-xs text-slate-500">
                        Affected accounts: {alert.accountIds.length}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 501(r) Charity Care Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">501(r) Charity Care Compliance</h3>
            <p className="text-sm text-slate-500 mt-1">Financial Assistance Program (FAP) and ECA tracking</p>
          </div>
          <button
            onClick={() => setSelectedTimelineAccountId(selectedTimelineAccountId ? null : 'view-all')}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {selectedTimelineAccountId ? 'Hide Timeline' : 'View Notice Timeline'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Accounts Needing FAP Notice"
            value={charityCare.accountsWithFAPNotice}
            subtitle="Require plain language summary"
            variant="info"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          />
          <StatCard
            title="Nearing ECA Deadline"
            value={charityCare.accountsNearingECADeadline}
            subtitle="Within 30 days"
            variant="warning"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            title="Past ECA Deadline"
            value={charityCare.accountsPastECADeadline}
            subtitle="Violation risk"
            variant="warning"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            }
          />
          <StatCard
            title="Total Charity Care Pending"
            value={charityCare.totalCharityCarePending}
            subtitle="Applications in progress"
            variant="default"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
          />
        </div>

        {/* Notice Timeline */}
        {selectedTimelineAccountId && (
          <div className="mt-6 pt-6 border-t border-slate-200">
            <h4 className="text-sm font-semibold text-slate-900 mb-4">Required Notice Timeline</h4>
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-24 text-xs text-slate-500">Day 1</div>
                  <div className="flex-1 flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-slate-700">First billing statement with plain language FAP summary</span>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-24 text-xs text-slate-500">Day 30</div>
                  <div className="flex-1 flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-slate-700">Second billing statement</span>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-24 text-xs text-slate-500">Day 60</div>
                  <div className="flex-1 flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-slate-700">Third billing statement</span>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-24 text-xs text-slate-500">Day 90+</div>
                  <div className="flex-1 flex items-center space-x-2">
                    <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                    <span className="text-sm text-slate-700">Written notice at least 30 days before ECA</span>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-24 text-xs text-slate-500">Day 120+</div>
                  <div className="flex-1 flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-slate-700">ECA actions may begin (120-day minimum)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* DSH Audit Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">DSH Audit Readiness</h3>
            <p className="text-sm text-slate-500 mt-1">Disproportionate Share Hospital compliance metrics</p>
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            dsh.qualifiesForDSH
              ? 'bg-green-100 text-green-800'
              : 'bg-slate-100 text-slate-800'
          }`}>
            {dsh.qualifiesForDSH ? 'DSH Qualified' : 'Not DSH Qualified'}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* DPP and Qualification Status */}
          <div className="space-y-6">
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Current DPP (Disproportionate Patient Percentage)</span>
                <span className="text-2xl font-bold text-slate-900">{(dsh.currentDPP * 100).toFixed(2)}%</span>
              </div>
              <p className="text-xs text-slate-500">
                Minimum 15% required for DSH qualification (or 25% with Medicaid utilization rate above 1%)
              </p>
              <div className="mt-3 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    dsh.currentDPP >= 0.15 ? 'bg-green-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${Math.min(dsh.currentDPP * 100 / 0.25 * 100, 100)}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-xs text-slate-400">
                <span>0%</span>
                <span className="text-slate-600">15% threshold</span>
                <span>25%</span>
              </div>
            </div>

            {/* Audit Readiness Score */}
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Audit Readiness Score</span>
                <span className={`text-2xl font-bold ${
                  dsh.auditReadinessScore >= 80 ? 'text-green-600' :
                  dsh.auditReadinessScore >= 60 ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {dsh.auditReadinessScore}%
                </span>
              </div>
              <div className="mt-3 h-4 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    dsh.auditReadinessScore >= 80 ? 'bg-green-500' :
                    dsh.auditReadinessScore >= 60 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${dsh.auditReadinessScore}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-xs text-slate-500">
                <span>Needs Improvement</span>
                <span>Audit Ready</span>
              </div>
            </div>
          </div>

          {/* Documentation Gaps */}
          <div>
            <h4 className="text-sm font-semibold text-slate-900 mb-3">Documentation Gaps</h4>
            {dsh.documentationGaps.length > 0 ? (
              <div className="space-y-2">
                {dsh.documentationGaps.map((gap, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-3 p-3 bg-amber-50 border border-amber-200 rounded-lg"
                  >
                    <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="text-sm text-slate-700">{gap}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-green-800 font-medium">All documentation requirements met</span>
              </div>
            )}

            {dsh.excessPaymentRisk > 0 && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium text-red-800">Excess Payment Risk</span>
                </div>
                <p className="mt-1 text-sm text-red-700">
                  ${dsh.excessPaymentRisk.toLocaleString()} at risk of recoupment
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upcoming Deadlines Calendar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-6">Upcoming Deadlines</h3>

        {upcomingDeadlines.length > 0 ? (
          <div className="space-y-3">
            {upcomingDeadlines.map((deadline, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-900">
                      {new Date(deadline.date).getDate()}
                    </div>
                    <div className="text-xs text-slate-500 uppercase">
                      {new Date(deadline.date).toLocaleDateString('en-US', { month: 'short' })}
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{deadline.event}</p>
                    <p className="text-sm text-slate-500">
                      {deadline.daysRemaining !== undefined && deadline.daysRemaining >= 0
                        ? `${deadline.daysRemaining} days remaining`
                        : deadline.daysRemaining !== undefined
                        ? `${Math.abs(deadline.daysRemaining)} days overdue`
                        : formatDate(deadline.date)}
                    </p>
                  </div>
                </div>
                <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(deadline.status)}`}>
                  {deadline.status.charAt(0).toUpperCase() + deadline.status.slice(1)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <svg className="w-12 h-12 text-slate-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="mt-2 text-slate-500">No upcoming deadlines</p>
          </div>
        )}
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h4 className="text-sm font-semibold text-slate-900 mb-4">501(r) Compliance Summary</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Total Accounts</span>
              <span className="font-semibold text-slate-900">{charityCare.totalAccounts}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Compliant</span>
              <span className="font-semibold text-green-600">
                {charityCare.totalAccounts - charityCare.accountsPastECADeadline - charityCare.accountsNearingECADeadline}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">At Risk</span>
              <span className="font-semibold text-amber-600">
                {charityCare.accountsNearingECADeadline}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Non-Compliant</span>
              <span className="font-semibold text-red-600">
                {charityCare.accountsPastECADeadline}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h4 className="text-sm font-semibold text-slate-900 mb-4">DSH Metrics</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Current DPP</span>
              <span className="font-semibold text-slate-900">{(dsh.currentDPP * 100).toFixed(2)}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Qualification Status</span>
              <span className={`font-semibold ${dsh.qualifiesForDSH ? 'text-green-600' : 'text-slate-600'}`}>
                {dsh.qualifiesForDSH ? 'Qualified' : 'Not Qualified'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Readiness Score</span>
              <span className={`font-semibold ${
                dsh.auditReadinessScore >= 80 ? 'text-green-600' :
                dsh.auditReadinessScore >= 60 ? 'text-amber-600' : 'text-red-600'
              }`}>
                {dsh.auditReadinessScore}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Documentation Gaps</span>
              <span className={`font-semibold ${dsh.documentationGaps.length === 0 ? 'text-green-600' : 'text-amber-600'}`}>
                {dsh.documentationGaps.length}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h4 className="text-sm font-semibold text-slate-900 mb-4">Active Alerts by Severity</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm text-slate-600">High Priority</span>
              </div>
              <span className="font-semibold text-red-600">
                {alerts.filter(a => a.severity === 'high').length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                <span className="text-sm text-slate-600">Medium Priority</span>
              </div>
              <span className="font-semibold text-amber-600">
                {alerts.filter(a => a.severity === 'medium').length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-slate-600">Low Priority</span>
              </div>
              <span className="font-semibold text-blue-600">
                {alerts.filter(a => a.severity === 'low').length}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Total Alerts</span>
                <span className="font-bold text-slate-900">{alerts.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
