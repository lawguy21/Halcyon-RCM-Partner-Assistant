'use client';

import { useState, useCallback } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export type WorkQueueType =
  | 'NEW_ACCOUNTS'
  | 'PENDING_ELIGIBILITY'
  | 'DENIALS'
  | 'APPEALS'
  | 'CALLBACKS'
  | 'COMPLIANCE';

export type WorkQueueStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

export interface WorkQueueItem {
  id: string;
  accountId: string;
  queueType: WorkQueueType;
  priority: number;
  dueDate?: string;
  assignedToId?: string;
  assignedTo?: {
    id: string;
    name: string;
    email: string;
  };
  status: WorkQueueStatus;
  notes?: string;
  account?: {
    id: string;
    assessment?: any;
  };
  createdAt: string;
  updatedAt: string;
}

export interface WorkQueueFilters {
  queueType?: WorkQueueType;
  assignedToId?: string;
  status?: WorkQueueStatus;
  priority?: number;
  dueDateBefore?: string;
  dueDateAfter?: string;
  limit?: number;
  offset?: number;
}

export interface WorkQueueStats {
  totalItems: number;
  pendingItems: number;
  inProgressItems: number;
  completedToday: number;
  overdue: number;
  byQueue: Record<WorkQueueType, { total: number; pending: number; overdue: number }>;
  byAssignee: Array<{
    userId: string;
    userName: string;
    pending: number;
    inProgress: number;
    completedToday: number;
  }>;
}

interface UseWorkQueueReturn {
  items: WorkQueueItem[];
  loading: boolean;
  error: string | null;
  total: number;
  fetchItems: (filters?: WorkQueueFilters) => Promise<void>;
  getItem: (itemId: string) => Promise<WorkQueueItem | null>;
  createItem: (input: {
    accountId: string;
    queueType: WorkQueueType;
    priority?: number;
    dueDate?: string;
    assignedToId?: string;
    notes?: string;
  }) => Promise<{ id: string } | null>;
  claimItem: (itemId: string, userId: string) => Promise<boolean>;
  releaseItem: (itemId: string, userId: string) => Promise<boolean>;
  completeItem: (itemId: string, userId: string, notes?: string) => Promise<boolean>;
  updatePriority: (itemId: string, priority: number) => Promise<boolean>;
  reassignItem: (itemId: string, newAssigneeId: string, currentUserId: string) => Promise<boolean>;
  getStats: (organizationId?: string) => Promise<WorkQueueStats | null>;
  getNextItem: (userId: string, queueType?: WorkQueueType) => Promise<WorkQueueItem | null>;
}

export function useWorkQueue(): UseWorkQueueReturn {
  const [items, setItems] = useState<WorkQueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchItems = useCallback(async (filters?: WorkQueueFilters): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) {
            params.append(key, String(value));
          }
        });
      }

      const response = await fetch(`${API_BASE_URL}/api/work-queue?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch work queue');
      }

      setItems(data.data);
      setTotal(data.pagination?.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch work queue');
    } finally {
      setLoading(false);
    }
  }, []);

  const getItem = useCallback(async (itemId: string): Promise<WorkQueueItem | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/work-queue/${itemId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to get item');
      }

      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get item');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createItem = useCallback(async (input: {
    accountId: string;
    queueType: WorkQueueType;
    priority?: number;
    dueDate?: string;
    assignedToId?: string;
    notes?: string;
  }): Promise<{ id: string } | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/work-queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to create item');
      }

      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create item');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const claimItem = useCallback(async (itemId: string, userId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/work-queue/${itemId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to claim item');
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to claim item');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const releaseItem = useCallback(async (itemId: string, userId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/work-queue/${itemId}/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to release item');
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to release item');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const completeItem = useCallback(async (itemId: string, userId: string, notes?: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/work-queue/${itemId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, notes }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to complete item');
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete item');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePriority = useCallback(async (itemId: string, priority: number): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/work-queue/${itemId}/priority`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to update priority');
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update priority');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const reassignItem = useCallback(async (
    itemId: string,
    newAssigneeId: string,
    currentUserId: string
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/work-queue/${itemId}/reassign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newAssigneeId, currentUserId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to reassign item');
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reassign item');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const getStats = useCallback(async (organizationId?: string): Promise<WorkQueueStats | null> => {
    setLoading(true);
    setError(null);

    try {
      const url = organizationId
        ? `${API_BASE_URL}/api/work-queue/stats?organizationId=${organizationId}`
        : `${API_BASE_URL}/api/work-queue/stats`;

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to get stats');
      }

      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get stats');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getNextItem = useCallback(async (
    userId: string,
    queueType?: WorkQueueType
  ): Promise<WorkQueueItem | null> => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ userId });
      if (queueType) params.append('queueType', queueType);

      const response = await fetch(`${API_BASE_URL}/api/work-queue/next?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to get next item');
      }

      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get next item');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    items,
    loading,
    error,
    total,
    fetchItems,
    getItem,
    createItem,
    claimItem,
    releaseItem,
    completeItem,
    updatePriority,
    reassignItem,
    getStats,
    getNextItem,
  };
}
