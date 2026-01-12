// @ts-nocheck
'use client';

/**
 * SFTP Connection Management Hook
 * Provides API methods for managing SFTP connections
 */

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ============================================================================
// TYPES
// ============================================================================

export interface SFTPConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  inboundPath: string;
  outboundPath: string;
  archivePath?: string;
  errorPath?: string;
  filePattern: string;
  presetId?: string;
  autoProcess: boolean;
  deleteAfterProcess: boolean;
  enabled: boolean;
  pollIntervalMinutes: number;
  schedule?: string;
  lastConnectedAt?: string;
  lastSyncAt?: string;
  lastError?: string;
  consecutiveFailures: number;
  organizationId?: string;
  createdAt: string;
  updatedAt?: string;
  hasPassword?: boolean;
  hasPrivateKey?: boolean;
  organization?: {
    id: string;
    name: string;
  };
  syncLogs?: SFTPSyncLog[];
}

export interface SFTPSyncLog {
  id: string;
  connectionId: string;
  startedAt: string;
  completedAt?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  filesFound: number;
  filesProcessed: number;
  filesFailed: number;
  recordsImported: number;
  errorMessage?: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

export interface CreateConnectionInput {
  name: string;
  host: string;
  port?: number;
  username: string;
  password?: string;
  privateKey?: string;
  inboundPath?: string;
  outboundPath?: string;
  archivePath?: string;
  errorPath?: string;
  filePattern?: string;
  presetId?: string;
  autoProcess?: boolean;
  deleteAfterProcess?: boolean;
  enabled?: boolean;
  pollIntervalMinutes?: number;
  schedule?: string;
  organizationId?: string;
}

export interface UpdateConnectionInput extends Partial<CreateConnectionInput> {
  // Explicitly allow clearing password/privateKey
  password?: string | null;
  privateKey?: string | null;
}

export interface TestConnectionInput {
  host: string;
  port?: number;
  username: string;
  password?: string;
  privateKey?: string;
  inboundPath?: string;
  outboundPath?: string;
  filePattern?: string;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  details?: {
    connected: boolean;
    inboundPathExists?: boolean;
    outboundPathExists?: boolean;
    filesFound?: number;
    error?: string;
  };
}

export interface SyncLogsResponse {
  logs: SFTPSyncLog[];
  total: number;
  limit: number;
  offset: number;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useSFTP() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Get authorization headers
   */
  const getHeaders = useCallback(() => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (session?.accessToken) {
      headers['Authorization'] = `Bearer ${session.accessToken}`;
    }
    return headers;
  }, [session]);

  /**
   * Make an API request
   */
  const apiRequest = useCallback(
    async <T>(
      method: 'GET' | 'POST' | 'PUT' | 'DELETE',
      endpoint: string,
      body?: unknown
    ): Promise<T> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
          method,
          headers: getHeaders(),
          body: body ? JSON.stringify(body) : undefined,
        });

        const data = await response.json();

        if (!response.ok) {
          const errorMessage = data?.error?.message || `Request failed with status ${response.status}`;
          throw new Error(errorMessage);
        }

        return data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [getHeaders]
  );

  /**
   * List all SFTP connections
   */
  const listConnections = useCallback(
    async (organizationId?: string): Promise<SFTPConnection[]> => {
      const query = organizationId ? `?organizationId=${organizationId}` : '';
      const response = await apiRequest<{ connections: SFTPConnection[] }>(
        'GET',
        `/sftp/connections${query}`
      );
      return response.connections;
    },
    [apiRequest]
  );

  /**
   * Get a single SFTP connection by ID
   */
  const getConnection = useCallback(
    async (id: string): Promise<SFTPConnection> => {
      const response = await apiRequest<{ connection: SFTPConnection }>(
        'GET',
        `/sftp/connections/${id}`
      );
      return response.connection;
    },
    [apiRequest]
  );

  /**
   * Create a new SFTP connection
   */
  const createConnection = useCallback(
    async (input: CreateConnectionInput): Promise<SFTPConnection> => {
      const response = await apiRequest<{ connection: SFTPConnection }>(
        'POST',
        '/sftp/connections',
        input
      );
      return response.connection;
    },
    [apiRequest]
  );

  /**
   * Update an existing SFTP connection
   */
  const updateConnection = useCallback(
    async (id: string, input: UpdateConnectionInput): Promise<SFTPConnection> => {
      const response = await apiRequest<{ connection: SFTPConnection }>(
        'PUT',
        `/sftp/connections/${id}`,
        input
      );
      return response.connection;
    },
    [apiRequest]
  );

  /**
   * Delete an SFTP connection
   */
  const deleteConnection = useCallback(
    async (id: string): Promise<boolean> => {
      const response = await apiRequest<{ success: boolean }>(
        'DELETE',
        `/sftp/connections/${id}`
      );
      return response.success;
    },
    [apiRequest]
  );

  /**
   * Test SFTP connection settings
   */
  const testConnection = useCallback(
    async (input: TestConnectionInput): Promise<TestConnectionResult> => {
      const response = await apiRequest<TestConnectionResult>(
        'POST',
        '/sftp/test',
        input
      );
      return response;
    },
    [apiRequest]
  );

  /**
   * Trigger a manual sync for an SFTP connection
   */
  const triggerSync = useCallback(
    async (id: string): Promise<SFTPSyncLog> => {
      const response = await apiRequest<{ syncLog: SFTPSyncLog }>(
        'POST',
        `/sftp/connections/${id}/sync`
      );
      return response.syncLog;
    },
    [apiRequest]
  );

  /**
   * Get sync logs for an SFTP connection
   */
  const getSyncLogs = useCallback(
    async (id: string, limit = 20, offset = 0): Promise<SyncLogsResponse> => {
      const response = await apiRequest<SyncLogsResponse>(
        'GET',
        `/sftp/connections/${id}/logs?limit=${limit}&offset=${offset}`
      );
      return response;
    },
    [apiRequest]
  );

  /**
   * Upload results to an SFTP server
   */
  const uploadResults = useCallback(
    async (id: string, content: string, filename: string): Promise<{ success: boolean; path: string }> => {
      const response = await apiRequest<{ success: boolean; path: string }>(
        'POST',
        `/sftp/connections/${id}/upload`,
        { content, filename }
      );
      return response;
    },
    [apiRequest]
  );

  /**
   * Clear the current error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    loading,
    error,

    // Actions
    listConnections,
    getConnection,
    createConnection,
    updateConnection,
    deleteConnection,
    testConnection,
    triggerSync,
    getSyncLogs,
    uploadResults,
    clearError,
  };
}
