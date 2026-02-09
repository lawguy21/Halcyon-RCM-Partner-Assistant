'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import DataTable, { Column } from '@/components/DataTable';
import {
  useWorkQueue,
  WorkQueueItem,
  WorkQueueType,
  WorkQueueStatus,
  WorkQueueFilters,
  WorkQueueStats,
} from '@/hooks/useWorkQueue';

const QUEUE_TYPES: { key: WorkQueueType; label: string }[] = [
  { key: 'NEW_ACCOUNTS', label: 'New Accounts' },
  { key: 'PENDING_ELIGIBILITY', label: 'Pending Eligibility' },
  { key: 'DENIALS', label: 'Denials' },
  { key: 'APPEALS', label: 'Appeals' },
  { key: 'CALLBACKS', label: 'Callbacks' },
  { key: 'COMPLIANCE', label: 'Compliance' },
];

const STATUS_OPTIONS: { key: WorkQueueStatus | ''; label: string }[] = [
  { key: '', label: 'All Statuses' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'COMPLETED', label: 'Completed' },
];

export default function WorkQueuePage() {
  const { data: session } = useSession();
  // Use actual user ID from session, fallback to empty string if not authenticated
  const currentUserId = session?.user?.id || '';
  const {
    items,
    loading,
    error,
    total,
    fetchItems,
    claimItem,
    releaseItem,
    completeItem,
    getStats,
  } = useWorkQueue();

  const [stats, setStats] = useState<WorkQueueStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<WorkQueueType | 'ALL'>('ALL');
  const [filters, setFilters] = useState<WorkQueueFilters>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Fetch stats on mount
  useEffect(() => {
    const loadStats = async () => {
      setStatsLoading(true);
      const statsData = await getStats();
      setStats(statsData);
      setStatsLoading(false);
    };
    loadStats();
  }, [getStats]);

  // Fetch items when filters or pagination change
  useEffect(() => {
    const effectiveFilters: WorkQueueFilters = {
      ...filters,
      queueType: activeTab === 'ALL' ? undefined : activeTab,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    };
    fetchItems(effectiveFilters);
  }, [fetchItems, filters, activeTab, page, pageSize]);

  const handleTabChange = useCallback((tab: WorkQueueType | 'ALL') => {
    setActiveTab(tab);
    setPage(1);
    setSelectedIds(new Set());
  }, []);

  const handleStatusFilterChange = useCallback((status: WorkQueueStatus | '') => {
    setFilters((prev) => ({
      ...prev,
      status: status || undefined,
    }));
    setPage(1);
  }, []);

  const handleClaim = useCallback(
    async (itemId: string) => {
      if (!currentUserId) {
        alert('Please log in to claim items');
        return;
      }
      setActionLoading(itemId);
      const success = await claimItem(itemId, currentUserId);
      if (success) {
        // Refresh items and stats
        const effectiveFilters: WorkQueueFilters = {
          ...filters,
          queueType: activeTab === 'ALL' ? undefined : activeTab,
          limit: pageSize,
          offset: (page - 1) * pageSize,
        };
        await Promise.all([fetchItems(effectiveFilters), getStats().then(setStats)]);
      }
      setActionLoading(null);
    },
    [claimItem, fetchItems, getStats, filters, activeTab, page, pageSize, currentUserId]
  );

  const handleRelease = useCallback(
    async (itemId: string) => {
      if (!currentUserId) {
        alert('Please log in to release items');
        return;
      }
      setActionLoading(itemId);
      const success = await releaseItem(itemId, currentUserId);
      if (success) {
        const effectiveFilters: WorkQueueFilters = {
          ...filters,
          queueType: activeTab === 'ALL' ? undefined : activeTab,
          limit: pageSize,
          offset: (page - 1) * pageSize,
        };
        await Promise.all([fetchItems(effectiveFilters), getStats().then(setStats)]);
      }
      setActionLoading(null);
    },
    [releaseItem, fetchItems, getStats, filters, activeTab, page, pageSize, currentUserId]
  );

  const handleComplete = useCallback(
    async (itemId: string) => {
      if (!currentUserId) {
        alert('Please log in to complete items');
        return;
      }
      setActionLoading(itemId);
      const success = await completeItem(itemId, currentUserId);
      if (success) {
        const effectiveFilters: WorkQueueFilters = {
          ...filters,
          queueType: activeTab === 'ALL' ? undefined : activeTab,
          limit: pageSize,
          offset: (page - 1) * pageSize,
        };
        await Promise.all([fetchItems(effectiveFilters), getStats().then(setStats)]);
      }
      setActionLoading(null);
    },
    [completeItem, fetchItems, getStats, filters, activeTab, page, pageSize, currentUserId]
  );

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setPage(1);
  }, []);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const getPriorityBadge = (priority: number) => {
    const colors: Record<number, string> = {
      1: 'bg-red-100 text-red-800',
      2: 'bg-orange-100 text-orange-800',
      3: 'bg-yellow-100 text-yellow-800',
      4: 'bg-blue-100 text-blue-800',
      5: 'bg-slate-100 text-slate-800',
    };
    const labels: Record<number, string> = {
      1: 'Critical',
      2: 'High',
      3: 'Medium',
      4: 'Low',
      5: 'Lowest',
    };
    return (
      <span
        className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
          colors[priority] || 'bg-slate-100 text-slate-800'
        }`}
      >
        {labels[priority] || `P${priority}`}
      </span>
    );
  };

  const getStatusBadge = (status: WorkQueueStatus) => {
    const colors: Record<WorkQueueStatus, string> = {
      PENDING: 'bg-amber-100 text-amber-800',
      IN_PROGRESS: 'bg-blue-100 text-blue-800',
      COMPLETED: 'bg-green-100 text-green-800',
    };
    const labels: Record<WorkQueueStatus, string> = {
      PENDING: 'Pending',
      IN_PROGRESS: 'In Progress',
      COMPLETED: 'Completed',
    };
    return (
      <span
        className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${colors[status]}`}
      >
        {labels[status]}
      </span>
    );
  };

  const getQueueTypeBadge = (queueType: WorkQueueType) => {
    const colors: Record<WorkQueueType, string> = {
      NEW_ACCOUNTS: 'bg-purple-100 text-purple-800',
      PENDING_ELIGIBILITY: 'bg-cyan-100 text-cyan-800',
      DENIALS: 'bg-red-100 text-red-800',
      APPEALS: 'bg-orange-100 text-orange-800',
      CALLBACKS: 'bg-teal-100 text-teal-800',
      COMPLIANCE: 'bg-indigo-100 text-indigo-800',
    };
    const label = QUEUE_TYPES.find((q) => q.key === queueType)?.label || queueType;
    return (
      <span
        className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${colors[queueType]}`}
      >
        {label}
      </span>
    );
  };

  const columns: Column<WorkQueueItem>[] = [
    {
      key: 'accountId',
      header: 'Account ID',
      sortable: true,
      width: '130px',
      render: (item) => (
        <span className="font-mono text-sm text-slate-700">{item.accountId}</span>
      ),
    },
    {
      key: 'queueType',
      header: 'Queue Type',
      sortable: true,
      render: (item) => getQueueTypeBadge(item.queueType),
    },
    {
      key: 'priority',
      header: 'Priority',
      sortable: true,
      width: '100px',
      render: (item) => getPriorityBadge(item.priority),
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      sortable: true,
      width: '120px',
      render: (item) => (
        <span
          className={`text-sm ${
            isOverdue(item.dueDate) && item.status !== 'COMPLETED'
              ? 'text-red-600 font-medium'
              : 'text-slate-700'
          }`}
        >
          {formatDate(item.dueDate)}
          {isOverdue(item.dueDate) && item.status !== 'COMPLETED' && (
            <span className="ml-1 text-xs text-red-500">(Overdue)</span>
          )}
        </span>
      ),
    },
    {
      key: 'assignedTo',
      header: 'Assigned To',
      sortable: true,
      render: (item) => (
        <span className="text-sm text-slate-700">
          {item.assignedTo?.name || '-'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      width: '120px',
      render: (item) => getStatusBadge(item.status),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '200px',
      render: (item) => (
        <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
          {item.status === 'PENDING' && (
            <button
              onClick={() => handleClaim(item.id)}
              disabled={actionLoading === item.id}
              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading === item.id ? 'Loading...' : 'Claim'}
            </button>
          )}
          {item.status === 'IN_PROGRESS' && (
            <>
              <button
                onClick={() => handleComplete(item.id)}
                disabled={actionLoading === item.id}
                className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading === item.id ? 'Loading...' : 'Complete'}
              </button>
              <button
                onClick={() => handleRelease(item.id)}
                disabled={actionLoading === item.id}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Release
              </button>
            </>
          )}
          {item.status === 'COMPLETED' && (
            <span className="text-xs text-slate-500">Completed</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Work Queue</h2>
          <p className="text-slate-500 mt-1">
            Manage and process work items across all queues
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Pending"
          value={stats?.pendingItems ?? 0}
          loading={statsLoading}
          icon={
            <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          bgColor="bg-amber-50"
        />
        <StatCard
          title="In Progress"
          value={stats?.inProgressItems ?? 0}
          loading={statsLoading}
          icon={
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
          bgColor="bg-blue-50"
        />
        <StatCard
          title="Overdue"
          value={stats?.overdue ?? 0}
          loading={statsLoading}
          icon={
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
          bgColor="bg-red-50"
        />
        <StatCard
          title="Completed Today"
          value={stats?.completedToday ?? 0}
          loading={statsLoading}
          icon={
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          bgColor="bg-green-50"
        />
      </div>

      {/* Queue Type Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="border-b border-slate-200">
          <nav className="flex -mb-px overflow-x-auto">
            <button
              onClick={() => handleTabChange('ALL')}
              className={`px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap ${
                activeTab === 'ALL'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              All Queues
              {stats && (
                <span className="ml-2 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs">
                  {stats.totalItems}
                </span>
              )}
            </button>
            {QUEUE_TYPES.map((queueType) => (
              <button
                key={queueType.key}
                onClick={() => handleTabChange(queueType.key)}
                className={`px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === queueType.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                {queueType.label}
                {stats?.byQueue[queueType.key] && (
                  <span className="ml-2 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs">
                    {stats.byQueue[queueType.key].pending}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
              <select
                value={filters.status || ''}
                onChange={(e) => handleStatusFilterChange(e.target.value as WorkQueueStatus | '')}
                className="text-sm border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 bg-red-50 border-b border-red-200">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-red-700">{error}</span>
            </div>
          </div>
        )}

        {/* Data Table */}
        <DataTable
          data={items as any}
          columns={columns as any}
          keyField="id"
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          loading={loading}
          emptyMessage="No work items found. Items will appear here when added to the queue."
          pagination={{
            page,
            pageSize,
            total,
            onPageChange: handlePageChange,
            onPageSizeChange: handlePageSizeChange,
          }}
        />
      </div>
    </div>
  );
}

// Stat Card Component
interface StatCardProps {
  title: string;
  value: number;
  loading: boolean;
  icon: React.ReactNode;
  bgColor: string;
}

function StatCard({ title, value, loading, icon, bgColor }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center space-x-4">
        <div className={`p-3 rounded-lg ${bgColor}`}>{icon}</div>
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          {loading ? (
            <div className="h-8 w-16 bg-slate-200 rounded animate-pulse mt-1" />
          ) : (
            <p className="text-2xl font-bold text-slate-900">{value.toLocaleString()}</p>
          )}
        </div>
      </div>
    </div>
  );
}
