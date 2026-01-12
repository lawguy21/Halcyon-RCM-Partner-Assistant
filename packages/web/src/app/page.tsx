'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import StatCard from '@/components/StatCard';
import AssessmentCard from '@/components/AssessmentCard';
import { useDashboardStats } from '@/hooks/useAssessments';

export default function Dashboard() {
  const { stats, loading, fetchStats } = useDashboardStats();

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <svg
            className="animate-spin h-8 w-8 text-blue-600 mx-auto"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="mt-2 text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
          <p className="text-slate-500 mt-1">
            Overview of your recovery assessments and opportunities
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href="/import"
            className="inline-flex items-center px-4 py-2 border border-slate-300 bg-white text-slate-700 rounded-lg hover:bg-slate-50 font-medium text-sm"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            Import CSV
          </Link>
          <Link
            href="/assessments/new"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Assessment
          </Link>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Assessments"
          value={stats?.totalAssessments.toLocaleString() || '0'}
          subtitle="All time"
          variant="info"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          }
          trend={{ value: 12, label: 'vs last month', positive: true }}
        />
        <StatCard
          title="Total Charges"
          value={formatCurrency(stats?.totalCharges || 0)}
          subtitle="Under assessment"
          variant="default"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
        <StatCard
          title="Estimated Recovery"
          value={formatCurrency(stats?.estimatedRecovery || 0)}
          subtitle="Projected total"
          variant="success"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          }
          trend={{ value: 8.5, label: 'vs last month', positive: true }}
        />
        <StatCard
          title="Recovery Rate"
          value={`${(stats?.recoveryRate || 0).toFixed(1)}%`}
          subtitle="Average across all"
          variant="warning"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          }
        />
      </div>

      {/* Recovery by Pathway */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900">Recovery by Pathway</h3>
            <Link
              href="/reports"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View Reports
            </Link>
          </div>

          <div className="space-y-4">
            {[
              {
                name: 'Medicaid',
                count: stats?.byPathway.medicaid || 0,
                color: 'bg-purple-500',
                bg: 'bg-purple-100',
              },
              {
                name: 'Medicare',
                count: stats?.byPathway.medicare || 0,
                color: 'bg-blue-500',
                bg: 'bg-blue-100',
              },
              {
                name: 'DSH',
                count: stats?.byPathway.dsh || 0,
                color: 'bg-green-500',
                bg: 'bg-green-100',
              },
              {
                name: 'State Program',
                count: stats?.byPathway.stateProgram || 0,
                color: 'bg-amber-500',
                bg: 'bg-amber-100',
              },
            ].map((pathway) => {
              const total = stats?.totalAssessments || 1;
              const percentage = (pathway.count / total) * 100;

              return (
                <div key={pathway.name} className="flex items-center">
                  <div className="w-32 text-sm font-medium text-slate-700">
                    {pathway.name}
                  </div>
                  <div className="flex-1 mx-4">
                    <div className={`h-3 ${pathway.bg} rounded-full overflow-hidden`}>
                      <div
                        className={`h-full ${pathway.color} rounded-full transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-20 text-right">
                    <span className="text-sm font-semibold text-slate-900">
                      {pathway.count}
                    </span>
                    <span className="text-xs text-slate-500 ml-1">
                      ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Placeholder for chart */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="h-48 bg-slate-50 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <svg
                  className="w-12 h-12 text-slate-300 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"
                  />
                </svg>
                <p className="mt-2 text-sm text-slate-400">
                  Recovery by pathway chart
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Quick Actions</h3>
          <div className="space-y-3">
            <Link
              href="/assessments/new"
              className="flex items-center p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-900">New Assessment</p>
                <p className="text-xs text-slate-500">Create a manual assessment</p>
              </div>
            </Link>

            <Link
              href="/import"
              className="flex items-center p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-900">Import CSV</p>
                <p className="text-xs text-slate-500">Bulk import from file</p>
              </div>
            </Link>

            <Link
              href="/reports"
              className="flex items-center p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-900">View Reports</p>
                <p className="text-xs text-slate-500">Analytics & insights</p>
              </div>
            </Link>

            <Link
              href="/assessments"
              className="flex items-center p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 10h16M4 14h16M4 18h16"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-900">All Assessments</p>
                <p className="text-xs text-slate-500">Browse & search</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Assessments */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-900">Recent Assessments</h3>
          <Link
            href="/assessments"
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View All
          </Link>
        </div>

        {stats?.recentAssessments && stats.recentAssessments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.recentAssessments.slice(0, 6).map((assessment) => (
              <AssessmentCard key={assessment.id} assessment={assessment} compact />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <svg
              className="w-12 h-12 text-slate-300 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="mt-2 text-slate-500">No assessments yet</p>
            <Link
              href="/assessments/new"
              className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-800 font-medium text-sm"
            >
              Create your first assessment
              <svg
                className="w-4 h-4 ml-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
