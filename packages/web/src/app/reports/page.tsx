'use client';

import { useEffect } from 'react';
import StatCard from '@/components/StatCard';
import { useDashboardStats } from '@/hooks/useAssessments';

export default function ReportsPage() {
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
          <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="mt-2 text-slate-500">Loading reports...</p>
        </div>
      </div>
    );
  }

  const pathwayData = [
    {
      name: 'Medicaid',
      count: stats?.byPathway.medicaid || 0,
      recovery: ((stats?.byPathway.medicaid || 0) / (stats?.totalAssessments || 1)) * (stats?.estimatedRecovery || 0) * 0.4,
      color: 'bg-purple-500',
      lightColor: 'bg-purple-100',
    },
    {
      name: 'Medicare',
      count: stats?.byPathway.medicare || 0,
      recovery: ((stats?.byPathway.medicare || 0) / (stats?.totalAssessments || 1)) * (stats?.estimatedRecovery || 0) * 0.3,
      color: 'bg-blue-500',
      lightColor: 'bg-blue-100',
    },
    {
      name: 'DSH',
      count: stats?.byPathway.dsh || 0,
      recovery: ((stats?.byPathway.dsh || 0) / (stats?.totalAssessments || 1)) * (stats?.estimatedRecovery || 0) * 0.2,
      color: 'bg-green-500',
      lightColor: 'bg-green-100',
    },
    {
      name: 'State Program',
      count: stats?.byPathway.stateProgram || 0,
      recovery: ((stats?.byPathway.stateProgram || 0) / (stats?.totalAssessments || 1)) * (stats?.estimatedRecovery || 0) * 0.1,
      color: 'bg-amber-500',
      lightColor: 'bg-amber-100',
    },
  ];

  const stateData = Object.entries(stats?.byState || {})
    .map(([state, recovery]) => ({ state, recovery }))
    .sort((a, b) => b.recovery - a.recovery)
    .slice(0, 10);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Reports</h2>
          <p className="text-slate-500 mt-1">Analytics and insights for your recovery assessments</p>
        </div>
        <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export All Reports
        </button>
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />
        <StatCard
          title="Total Charges"
          value={formatCurrency(stats?.totalCharges || 0)}
          subtitle="Under assessment"
          variant="default"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
        <StatCard
          title="Recovery Rate"
          value={`${(stats?.recoveryRate || 0).toFixed(1)}%`}
          subtitle="Average across all"
          variant="warning"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
      </div>

      {/* Recovery by Pathway */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Recovery by Pathway</h3>

          <div className="space-y-4">
            {pathwayData.map((pathway) => {
              const total = stats?.totalAssessments || 1;
              const percentage = (pathway.count / total) * 100;

              return (
                <div key={pathway.name}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">{pathway.name}</span>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-slate-900">{pathway.count}</span>
                      <span className="text-xs text-slate-500 ml-1">({percentage.toFixed(0)}%)</span>
                    </div>
                  </div>
                  <div className={`h-3 ${pathway.lightColor} rounded-full overflow-hidden`}>
                    <div
                      className={`h-full ${pathway.color} rounded-full transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="mt-1 text-right">
                    <span className="text-xs text-green-600 font-medium">
                      Est. Recovery: {formatCurrency(pathway.recovery)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Total Estimated Recovery</span>
              <span className="text-lg font-bold text-green-600">
                {formatCurrency(stats?.estimatedRecovery || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Recovery by State */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Top States by Recovery</h3>

          {stateData.length > 0 ? (
            <div className="space-y-3">
              {stateData.map((item, index) => (
                <div
                  key={item.state}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">
                      {index + 1}
                    </span>
                    <span className="font-medium text-slate-900">{item.state}</span>
                  </div>
                  <span className="font-semibold text-green-600">{formatCurrency(item.recovery)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">No state data available</div>
          )}
        </div>
      </div>

      {/* Additional Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recovery Timeline */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Recovery Timeline</h3>
          <div className="h-48 bg-slate-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <svg className="w-10 h-10 text-slate-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              <p className="mt-2 text-sm text-slate-400">Timeline chart placeholder</p>
            </div>
          </div>
        </div>

        {/* Confidence Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Confidence Distribution</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-green-600 font-medium">High (75%+)</span>
                <span className="text-slate-600">45%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: '45%' }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-amber-600 font-medium">Medium (50-74%)</span>
                <span className="text-slate-600">35%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: '35%' }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-red-600 font-medium">Low (&lt;50%)</span>
                <span className="text-slate-600">20%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 rounded-full" style={{ width: '20%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Stats</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Avg. Charges per Case</span>
              <span className="font-semibold text-slate-900">
                {formatCurrency((stats?.totalCharges || 0) / (stats?.totalAssessments || 1))}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Avg. Recovery per Case</span>
              <span className="font-semibold text-green-600">
                {formatCurrency((stats?.estimatedRecovery || 0) / (stats?.totalAssessments || 1))}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">High Confidence Cases</span>
              <span className="font-semibold text-slate-900">
                {Math.floor((stats?.totalAssessments || 0) * 0.45)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Pending Actions</span>
              <span className="font-semibold text-amber-600">
                {Math.floor((stats?.totalAssessments || 0) * 0.3)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Opportunities Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-900">Top Recovery Opportunities</h3>
          <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">View All</button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">
                  Account
                </th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">
                  Patient
                </th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">
                  Pathway
                </th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">
                  Charges
                </th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">
                  Est. Recovery
                </th>
                <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">
                  Confidence
                </th>
              </tr>
            </thead>
            <tbody>
              {stats?.recentAssessments
                .sort((a, b) => b.estimatedTotalRecovery - a.estimatedTotalRecovery)
                .slice(0, 5)
                .map((assessment) => (
                  <tr key={assessment.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <span className="font-mono text-sm text-slate-700">{assessment.accountNumber}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-900">{assessment.patientName}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        {assessment.primaryRecoveryPath}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-slate-900">{formatCurrency(assessment.totalCharges)}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-semibold text-green-600">
                        {formatCurrency(assessment.estimatedTotalRecovery)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          assessment.overallConfidence >= 75
                            ? 'bg-green-100 text-green-800'
                            : assessment.overallConfidence >= 50
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {assessment.overallConfidence}%
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
