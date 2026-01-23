'use client';

import { useState, useCallback, useRef } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface ImportProgress {
  importId: string;
  status: 'queued' | 'parsing' | 'validating' | 'processing' | 'finalizing' | 'completed' | 'failed' | 'cancelled';
  totalRows: number;
  processedRows: number;
  successfulRows: number;
  failedRows: number;
  skippedRows: number;
  progressPercent: number;
  currentChunk: number;
  totalChunks: number;
  errors: Array<{ row: number; field?: string; message: string }>;
  estimatedSecondsRemaining?: number;
  startedAt?: Date;
  completedAt?: Date;
}

export interface ValidationResult {
  totalRows: number;
  detectedColumns: Array<{ column: string; field: string; confidence: number }>;
  fieldStats: Record<string, { filled: number; empty: number; invalid: number }>;
  errors: Array<{ row: number; message: string }>;
  warnings: Array<{ row: number; message: string }>;
  sampleRows: any[];
  isValid: boolean;
}

export interface BatchImportState {
  importId: string | null;
  jobId: string | null;
  file: File | null;
  options: ImportOptions | null;
  validation: ValidationResult | null;
  progress: ImportProgress | null;
  error: string | null;
  isValidating: boolean;
  isImporting: boolean;
}

export interface ImportOptions {
  skipErrors: boolean;
  detectDuplicates: boolean;
  duplicateKey: string;
  chunkSize: number;
  presetId?: string;
}

const initialState: BatchImportState = {
  importId: null,
  jobId: null,
  file: null,
  options: null,
  validation: null,
  progress: null,
  error: null,
  isValidating: false,
  isImporting: false,
};

export function useBatchImport() {
  const [state, setState] = useState<BatchImportState>(initialState);
  const eventSourceRef = useRef<EventSource | null>(null);

  const uploadFile = useCallback(async (file: File, options: ImportOptions) => {
    setState(prev => ({ ...prev, isValidating: true, error: null, file, options }));

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/api/batch-import/validate`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Validation failed');
      }

      setState(prev => ({
        ...prev,
        isValidating: false,
        validation: result.data,
      }));

      return { success: true, validation: result.data };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Validation failed';
      setState(prev => ({ ...prev, isValidating: false, error: message }));
      return { success: false, error: message };
    }
  }, []);

  const startImport = useCallback(async () => {
    if (!state.file || !state.options) {
      return { success: false, error: 'No file selected' };
    }

    setState(prev => ({ ...prev, isImporting: true, error: null }));

    try {
      const formData = new FormData();
      formData.append('file', state.file);
      formData.append('skipErrors', String(state.options.skipErrors));
      formData.append('detectDuplicates', String(state.options.detectDuplicates));
      formData.append('duplicateKey', state.options.duplicateKey);
      formData.append('chunkSize', String(state.options.chunkSize));
      if (state.options.presetId) {
        formData.append('presetId', state.options.presetId);
      }

      const response = await fetch(`${API_URL}/api/batch-import/start`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to start import');
      }

      setState(prev => ({
        ...prev,
        importId: result.data.importId,
        jobId: result.data.jobId,
        progress: {
          importId: result.data.importId,
          status: 'queued',
          totalRows: result.data.totalRows,
          processedRows: 0,
          successfulRows: 0,
          failedRows: 0,
          skippedRows: 0,
          progressPercent: 0,
          currentChunk: 0,
          totalChunks: 0,
          errors: [],
        },
      }));

      return { success: true, importId: result.data.importId };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Import failed';
      setState(prev => ({ ...prev, isImporting: false, error: message }));
      return { success: false, error: message };
    }
  }, [state.file, state.options]);

  const pollStatus = useCallback(async () => {
    if (!state.importId) return;

    try {
      const response = await fetch(`${API_URL}/api/batch-import/status/${state.importId}`);
      const result = await response.json();

      if (result.success) {
        setState(prev => ({
          ...prev,
          progress: result.data.liveProgress || {
            importId: result.data.id,
            status: result.data.status.toLowerCase(),
            totalRows: result.data.totalRows,
            processedRows: result.data.processedRows,
            successfulRows: result.data.successfulRows,
            failedRows: result.data.failedRows,
            skippedRows: result.data.skippedRows,
            progressPercent: result.data.progressPercent,
            currentChunk: result.data.currentChunk || 0,
            totalChunks: result.data.totalChunks || 0,
            errors: result.data.errors || [],
          },
          isImporting: result.data.status === 'PROCESSING',
        }));
      }
    } catch (error) {
      console.error('Error polling status:', error);
    }
  }, [state.importId]);

  const subscribeToProgress = useCallback(() => {
    if (!state.importId) return;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(
      `${API_URL}/api/batch-import/progress/${state.importId}/stream`
    );

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.done) {
          eventSource.close();
          setState(prev => ({ ...prev, isImporting: false }));
          return;
        }

        if (data.error) {
          setState(prev => ({ ...prev, error: data.error, isImporting: false }));
          eventSource.close();
          return;
        }

        setState(prev => ({ ...prev, progress: data }));

        if (data.status === 'completed' || data.status === 'failed') {
          setState(prev => ({ ...prev, isImporting: false }));
          eventSource.close();
        }
      } catch (e) {
        console.error('Error parsing progress event:', e);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      // Try to get final status via polling
      pollStatus();
    };

    eventSourceRef.current = eventSource;
  }, [state.importId, pollStatus]);

  const cancelImport = useCallback(async () => {
    if (!state.importId) return { success: false };

    try {
      const response = await fetch(`${API_URL}/api/batch-import/cancel/${state.importId}`, {
        method: 'POST',
      });

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      setState(prev => ({ ...prev, isImporting: false }));
      return { success: response.ok };
    } catch (error) {
      return { success: false };
    }
  }, [state.importId]);

  const reset = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    setState(initialState);
  }, []);

  const downloadErrors = useCallback(async () => {
    if (!state.importId) return;

    window.open(`${API_URL}/api/batch-import/errors/${state.importId}`, '_blank');
  }, [state.importId]);

  return {
    state,
    uploadFile,
    startImport,
    subscribeToProgress,
    cancelImport,
    reset,
    downloadErrors,
    pollStatus,
  };
}
