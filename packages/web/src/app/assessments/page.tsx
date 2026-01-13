'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DataTable, { Column } from '@/components/DataTable';
import ConfidenceBadge from '@/components/ConfidenceBadge';
import ExportMenu from '@/components/ExportMenu';
import { useAssessments } from '@/hooks/useAssessments';
import type { Assessment, AssessmentFilters } from '@/types';

export default function AssessmentsPage() {
  const router = useRouter();
  const {
    assessments,
    loading,
    total,
    page,
    pageSize,
    totalPages,
    fetchAssessments,
    exportAssessments,
  } = useAssessments();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<AssessmentFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchAssessments(filters, { page, pageSize });
  }, [fetchAssessments, page, pageSize]);

  const handleSearch = useCallback(
    (search: string) => {
      const newFilters = { ...filters, search };
      setFilters(newFilters);
      fetchAssessments(newFilters, { page: 1, pageSize });
    },
    [filters, fetchAssessments, pageSize]
  );

  const handleFilterChange = useCallback(
    (key: keyof AssessmentFilters, value: string) => {
      const newFilters = { ...filters, [key]: value || undefined };
      setFilters(newFilters);
      fetchAssessments(newFilters, { page: 1, pageSize });
    },
    [filters, fetchAssessments, pageSize]
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      fetchAssessments(filters, { page: newPage, pageSize });
    },
    [filters, fetchAssessments, pageSize]
  );

  const handleExportCSV = useCallback(async () => {
    const ids = selectedIds.size > 0 ? Array.from(selectedIds) : assessments.map((a) => a.id);
    const blob = await exportAssessments(ids, 'csv');
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `assessments-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [selectedIds, assessments, exportAssessments]);

  const handleExportWorklistCSV = useCallback(async () => {
    // For worklist CSV, we use the same export function but could add special handling
    const ids = selectedIds.size > 0 ? Array.from(selectedIds) : assessments.map((a) => a.id);
    const blob = await exportAssessments(ids, 'csv');
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `worklist-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [selectedIds, assessments, exportAssessments]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  const columns: Column<Assessment>[] = [
    {
      key: 'accountNumber',
      header: 'Account #',
      sortable: true,
      width: '120px',
      render: (item) => (
        <span className="font-mono text-sm text-slate-700">{item.accountNumber}</span>
      ),
    },
    {
      key: 'patientName',
      header: 'Patient',
      sortable: true,
      render: (item) => (
        <div>
          <p className="font-medium text-slate-900">{item.patientName}</p>
          <p className="text-xs text-slate-500">{formatDate(item.dateOfService)}</p>
        </div>
      ),
    },
    {
      key: 'totalCharges',
      header: 'Charges',
      sortable: true,
      width: '120px',
      render: (item) => (
        <span className="font-medium text-slate-900">{formatCurrency(item.totalCharges)}</span>
      ),
    },
    {
      key: 'primaryRecoveryPath',
      header: 'Recovery Path',
      sortable: true,
      render: (item) => {
        const pathwayColors: Record<string, string> = {
          Medicaid: 'bg-purple-100 text-purple-800',
          Medicare: 'bg-blue-100 text-blue-800',
          DSH: 'bg-green-100 text-green-800',
          'State Program': 'bg-amber-100 text-amber-800',
        };
        return (
          <span
            className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
              pathwayColors[item.primaryRecoveryPath] || 'bg-slate-100 text-slate-800'
            }`}
          >
            {item.primaryRecoveryPath}
          </span>
        );
      },
    },
    {
      key: 'overallConfidence',
      header: 'Confidence',
      sortable: true,
      width: '120px',
      render: (item) => <ConfidenceBadge confidence={item.overallConfidence} size="sm" />,
    },
    {
      key: 'estimatedTotalRecovery',
      header: 'Est. Recovery',
      sortable: true,
      width: '130px',
      render: (item) => (
        <span className="font-semibold text-green-600">
          {formatCurrency(item.estimatedTotalRecovery)}
        </span>
      ),
    },
    {
      key: 'facilityState',
      header: 'State',
      sortable: true,
      width: '80px',
      render: (item) => (
        <span className="text-sm text-slate-700">{item.facilityState}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '50px',
      render: (item) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/assessments/detail?id=${item.id}`);
          }}
          className="p-1.5 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Assessments</h2>
          <p className="text-slate-500 mt-1">
            {total} total assessments
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <ExportMenu
            selectedIds={Array.from(selectedIds)}
            totalAssessments={total}
            filters={filters}
            onExportCSV={handleExportCSV}
            onExportWorklistCSV={handleExportWorklistCSV}
          />
          <Link
            href="/assessments/new"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Assessment
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search by patient name or account number..."
              value={filters.search || ''}
              onChange={(e) => handleSearch(e.target.value)}
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

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center px-4 py-2 border rounded-lg font-medium text-sm ${
              showFilters
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters
            {Object.values(filters).filter(Boolean).length > 1 && (
              <span className="ml-2 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                {Object.values(filters).filter(Boolean).length - (filters.search ? 1 : 0)}
              </span>
            )}
          </button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Pathway</label>
              <select
                value={filters.pathway || ''}
                onChange={(e) => handleFilterChange('pathway', e.target.value)}
                className="w-full border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Pathways</option>
                <option value="medicaid">Medicaid</option>
                <option value="medicare">Medicare</option>
                <option value="dsh">DSH</option>
                <option value="state program">State Program</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
              <select
                value={filters.state || ''}
                onChange={(e) => handleFilterChange('state', e.target.value)}
                className="w-full border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All States</option>
                <option value="CA">California</option>
                <option value="TX">Texas</option>
                <option value="FL">Florida</option>
                <option value="NY">New York</option>
                <option value="PA">Pennsylvania</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Min Confidence</label>
              <select
                value={filters.confidenceMin?.toString() || ''}
                onChange={(e) => handleFilterChange('confidenceMin', e.target.value)}
                className="w-full border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Any</option>
                <option value="75">High (75%+)</option>
                <option value="50">Medium (50%+)</option>
                <option value="25">Low (25%+)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="exported">Exported</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Data Table */}
      <DataTable
        data={assessments as any}
        columns={columns as any}
        keyField="id"
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onRowClick={(item) => router.push(`/assessments/detail?id=${item.id}`)}
        loading={loading}
        emptyMessage="No assessments found. Create a new assessment or import data."
        pagination={{
          page,
          pageSize,
          total,
          onPageChange: handlePageChange,
          onPageSizeChange: (size) => fetchAssessments(filters, { page: 1, pageSize: size }),
        }}
      />
    </div>
  );
}
