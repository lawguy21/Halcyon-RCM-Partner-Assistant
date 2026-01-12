'use client';

/**
 * SFTP Settings Page
 * Manage SFTP connections for automated file synchronization
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSFTP, type SFTPConnection, type SFTPSyncLog, type CreateConnectionInput, type UpdateConnectionInput } from '@/hooks/useSFTP';
import { useImport } from '@/hooks/useImport';
import SFTPConnectionForm from '@/components/SFTPConnectionForm';

type ModalMode = 'create' | 'edit' | 'logs' | 'delete' | null;

export default function SFTPSettingsPage() {
  const {
    loading,
    error,
    listConnections,
    getConnection,
    createConnection,
    updateConnection,
    deleteConnection,
    testConnection,
    triggerSync,
    getSyncLogs,
    clearError,
  } = useSFTP();
  const { presets } = useImport();

  const [connections, setConnections] = useState<SFTPConnection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<SFTPConnection | null>(null);
  const [syncLogs, setSyncLogs] = useState<SFTPSyncLog[]>([]);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const [pageError, setPageError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load connections on mount
  const loadConnections = useCallback(async () => {
    try {
      const data = await listConnections();
      setConnections(data);
    } catch (err) {
      setPageError('Failed to load SFTP connections');
    }
  }, [listConnections]);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  // Clear messages after timeout
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (pageError) {
      const timer = setTimeout(() => setPageError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [pageError]);

  const handleCreate = () => {
    setSelectedConnection(null);
    setModalMode('create');
    clearError();
  };

  const handleEdit = async (id: string) => {
    try {
      const connection = await getConnection(id);
      setSelectedConnection(connection);
      setModalMode('edit');
      clearError();
    } catch {
      setPageError('Failed to load connection details');
    }
  };

  const handleViewLogs = async (id: string) => {
    try {
      const connection = connections.find((c) => c.id === id);
      setSelectedConnection(connection || null);
      const { logs } = await getSyncLogs(id, 50);
      setSyncLogs(logs);
      setModalMode('logs');
    } catch {
      setPageError('Failed to load sync logs');
    }
  };

  const handleDelete = (connection: SFTPConnection) => {
    setSelectedConnection(connection);
    setModalMode('delete');
  };

  const confirmDelete = async () => {
    if (!selectedConnection) return;

    setIsSubmitting(true);
    try {
      await deleteConnection(selectedConnection.id);
      setConnections((prev) => prev.filter((c) => c.id !== selectedConnection.id));
      setSuccessMessage('Connection deleted successfully');
      setModalMode(null);
      setSelectedConnection(null);
    } catch {
      setPageError('Failed to delete connection');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (data: CreateConnectionInput | UpdateConnectionInput) => {
    setIsSubmitting(true);
    try {
      if (modalMode === 'create') {
        const newConnection = await createConnection(data as CreateConnectionInput);
        setConnections((prev) => [...prev, newConnection]);
        setSuccessMessage('Connection created successfully');
      } else if (modalMode === 'edit' && selectedConnection) {
        const updatedConnection = await updateConnection(selectedConnection.id, data);
        setConnections((prev) =>
          prev.map((c) => (c.id === updatedConnection.id ? updatedConnection : c))
        );
        setSuccessMessage('Connection updated successfully');
      }
      setModalMode(null);
      setSelectedConnection(null);
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Failed to save connection');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTestConnection = async (data: CreateConnectionInput) => {
    return testConnection(data);
  };

  const handleTriggerSync = async (id: string) => {
    setSyncingIds((prev) => new Set(prev).add(id));
    try {
      await triggerSync(id);
      setSuccessMessage('Sync triggered successfully');
      // Reload connections to update lastSyncAt
      await loadConnections();
    } catch {
      setPageError('Failed to trigger sync');
    } finally {
      setSyncingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const handleToggleEnabled = async (connection: SFTPConnection) => {
    try {
      const updated = await updateConnection(connection.id, { enabled: !connection.enabled });
      setConnections((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setSuccessMessage(updated.enabled ? 'Connection enabled' : 'Connection disabled');
    } catch {
      setPageError('Failed to update connection');
    }
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedConnection(null);
    setSyncLogs([]);
    clearError();
  };

  const getStatusColor = (connection: SFTPConnection) => {
    if (!connection.enabled) return 'bg-slate-100 text-slate-600';
    if (connection.lastError) return 'bg-red-100 text-red-600';
    if (connection.lastConnectedAt) return 'bg-green-100 text-green-600';
    return 'bg-yellow-100 text-yellow-600';
  };

  const getStatusText = (connection: SFTPConnection) => {
    if (!connection.enabled) return 'Disabled';
    if (connection.lastError) return 'Error';
    if (connection.lastConnectedAt) return 'Connected';
    return 'Pending';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center space-x-2 text-sm text-slate-500">
        <Link href="/settings" className="hover:text-slate-700">
          Settings
        </Link>
        <span>/</span>
        <span className="text-slate-900">SFTP Connections</span>
      </div>

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">SFTP Connections</h2>
          <p className="text-slate-500 mt-1">
            Manage SFTP connections for automated file import and export
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Connection
        </button>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
          <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-green-800">{successMessage}</span>
        </div>
      )}

      {pageError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
          <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span className="text-red-800">{pageError}</span>
        </div>
      )}

      {/* Connections List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        {loading && connections.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-slate-500">Loading connections...</p>
          </div>
        ) : connections.length === 0 ? (
          <div className="p-12 text-center">
            <svg
              className="w-12 h-12 mx-auto text-slate-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
              />
            </svg>
            <p className="mt-4 text-slate-500">No SFTP connections configured</p>
            <button
              onClick={handleCreate}
              className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
            >
              Add Your First Connection
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {connections.map((connection) => (
              <div key={connection.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-semibold text-slate-900">{connection.name}</h3>
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${getStatusColor(
                          connection
                        )}`}
                      >
                        {getStatusText(connection)}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {connection.username}@{connection.host}:{connection.port}
                    </div>
                    <div className="mt-2 flex items-center space-x-6 text-xs text-slate-500">
                      <span>
                        <strong>Inbound:</strong> {connection.inboundPath}
                      </span>
                      <span>
                        <strong>Pattern:</strong> {connection.filePattern}
                      </span>
                      <span>
                        <strong>Poll:</strong> {connection.pollIntervalMinutes}m
                      </span>
                    </div>
                    {connection.lastError && (
                      <div className="mt-2 text-sm text-red-600">
                        <strong>Last Error:</strong> {connection.lastError}
                      </div>
                    )}
                    <div className="mt-2 flex items-center space-x-6 text-xs text-slate-400">
                      <span>Last connected: {formatDate(connection.lastConnectedAt)}</span>
                      <span>Last sync: {formatDate(connection.lastSyncAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {/* Toggle Enable */}
                    <button
                      onClick={() => handleToggleEnabled(connection)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        connection.enabled ? 'bg-blue-600' : 'bg-slate-200'
                      }`}
                      title={connection.enabled ? 'Disable' : 'Enable'}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          connection.enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>

                    {/* Trigger Sync */}
                    <button
                      onClick={() => handleTriggerSync(connection.id)}
                      disabled={syncingIds.has(connection.id)}
                      className="p-2 text-slate-400 hover:text-blue-600 disabled:opacity-50"
                      title="Trigger Sync"
                    >
                      {syncingIds.has(connection.id) ? (
                        <svg
                          className="w-5 h-5 animate-spin"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                      )}
                    </button>

                    {/* View Logs */}
                    <button
                      onClick={() => handleViewLogs(connection.id)}
                      className="p-2 text-slate-400 hover:text-blue-600"
                      title="View Logs"
                    >
                      <svg
                        className="w-5 h-5"
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
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => handleEdit(connection.id)}
                      className="p-2 text-slate-400 hover:text-blue-600"
                      title="Edit"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(connection)}
                      className="p-2 text-slate-400 hover:text-red-600"
                      title="Delete"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(modalMode === 'create' || modalMode === 'edit') && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">
                {modalMode === 'create' ? 'Add SFTP Connection' : 'Edit SFTP Connection'}
              </h3>
            </div>
            <div className="p-6">
              <SFTPConnectionForm
                connection={selectedConnection}
                presets={presets.map((p) => ({ id: p.id, name: p.name, vendor: p.vendor }))}
                onSubmit={handleSubmit}
                onTest={handleTestConnection}
                onCancel={closeModal}
                isSubmitting={isSubmitting}
              />
            </div>
          </div>
        </div>
      )}

      {/* Sync Logs Modal */}
      {modalMode === 'logs' && selectedConnection && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Sync History</h3>
                <p className="text-sm text-slate-500">{selectedConnection.name}</p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 text-slate-400 hover:text-slate-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {syncLogs.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <p>No sync history available</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {syncLogs.map((log) => (
                    <div
                      key={log.id}
                      className={`p-4 rounded-lg border ${
                        log.status === 'completed'
                          ? 'border-green-200 bg-green-50'
                          : log.status === 'failed'
                          ? 'border-red-200 bg-red-50'
                          : log.status === 'running'
                          ? 'border-blue-200 bg-blue-50'
                          : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span
                            className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${
                              log.status === 'completed'
                                ? 'bg-green-100 text-green-700'
                                : log.status === 'failed'
                                ? 'bg-red-100 text-red-700'
                                : log.status === 'running'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {log.status}
                          </span>
                          <span className="text-sm text-slate-500">
                            {formatDate(log.startedAt)}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-slate-500">Files Found</span>
                          <p className="font-medium text-slate-900">{log.filesFound}</p>
                        </div>
                        <div>
                          <span className="text-slate-500">Processed</span>
                          <p className="font-medium text-slate-900">{log.filesProcessed}</p>
                        </div>
                        <div>
                          <span className="text-slate-500">Failed</span>
                          <p className="font-medium text-slate-900">{log.filesFailed}</p>
                        </div>
                        <div>
                          <span className="text-slate-500">Records</span>
                          <p className="font-medium text-slate-900">{log.recordsImported}</p>
                        </div>
                      </div>
                      {log.errorMessage && (
                        <div className="mt-2 text-sm text-red-600">
                          <strong>Error:</strong> {log.errorMessage}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {modalMode === 'delete' && selectedConnection && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Delete Connection</h3>
            </div>
            <p className="text-slate-600 mb-6">
              Are you sure you want to delete <strong>{selectedConnection.name}</strong>? This action
              cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isSubmitting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50"
              >
                {isSubmitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
