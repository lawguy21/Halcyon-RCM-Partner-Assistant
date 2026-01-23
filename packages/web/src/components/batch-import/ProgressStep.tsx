'use client';

import React, { useEffect, useRef } from 'react';
import { ImportProgress } from '../../hooks/useBatchImport';

interface ProgressStepProps {
  progress: ImportProgress | null;
  onCancel: () => void;
  onComplete: () => void;
}

export function ProgressStep({ progress, onCancel, onComplete }: ProgressStepProps) {
  const completedRef = useRef(false);

  // Auto-navigate to results when complete
  useEffect(() => {
    if (progress?.status === 'completed' && !completedRef.current) {
      completedRef.current = true;
      // Small delay to show 100% completion
      setTimeout(() => {
        onComplete();
      }, 1000);
    }
  }, [progress?.status, onComplete]);

  if (!progress) {
    return (
      <div className="text-center py-12">
        <svg className="animate-spin h-12 w-12 mx-auto text-blue-600 mb-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="text-slate-600">Initializing import...</p>
      </div>
    );
  }

  const percentComplete = progress.totalRows > 0
    ? Math.round((progress.processedRows / progress.totalRows) * 100)
    : 0;

  const formatTime = (seconds: number): string => {
    if (seconds <= 0) return 'Calculating...';
    if (seconds < 60) return `${Math.ceil(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.ceil(seconds % 60)}s`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  const getElapsedTime = (): string => {
    if (!progress.startedAt) return '0s';
    const startTime = progress.startedAt instanceof Date
      ? progress.startedAt.getTime()
      : new Date(progress.startedAt).getTime();
    const elapsed = (Date.now() - startTime) / 1000;
    return formatTime(elapsed);
  };

  const getStatusColor = () => {
    switch (progress.status) {
      case 'completed':
        return 'text-green-600';
      case 'failed':
      case 'cancelled':
        return 'text-red-600';
      default:
        return 'text-blue-600';
    }
  };

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'completed':
        return (
          <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'failed':
        return (
          <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'cancelled':
        return (
          <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      default:
        return (
          <svg className="animate-spin w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        );
    }
  };

  const isActive = progress.status === 'validating' || progress.status === 'processing' || progress.status === 'parsing';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Import Progress</h2>
        <p className="text-slate-600">
          {progress.status === 'completed'
            ? 'Import completed successfully!'
            : progress.status === 'failed'
            ? 'Import failed. Please check the errors below.'
            : progress.status === 'cancelled'
            ? 'Import was cancelled.'
            : 'Processing your data. This may take a few minutes for large files.'}
        </p>
      </div>

      {/* Main Progress */}
      <div className="bg-slate-50 rounded-xl p-6">
        {/* Status Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {getStatusIcon()}
            <div>
              <p className={`font-semibold ${getStatusColor()}`}>
                {progress.status === 'processing' ? 'Processing...' : progress.status.charAt(0).toUpperCase() + progress.status.slice(1)}
              </p>
              <p className="text-sm text-slate-500">
                {progress.currentChunk > 0 ? `Chunk ${progress.currentChunk} of ${progress.totalChunks}` : 'Preparing...'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-slate-900">{percentComplete}%</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative mb-4">
          <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
            <div
              className={`h-4 rounded-full transition-all duration-500 ${
                progress.status === 'completed'
                  ? 'bg-green-500'
                  : progress.status === 'failed'
                  ? 'bg-red-500'
                  : progress.status === 'cancelled'
                  ? 'bg-amber-500'
                  : 'bg-blue-600'
              }`}
              style={{ width: `${percentComplete}%` }}
            />
          </div>
          {/* Animated pulse on active progress bar */}
          {isActive && percentComplete < 100 && (
            <div
              className="absolute top-0 left-0 h-4 bg-white opacity-30 rounded-full animate-pulse"
              style={{ width: `${percentComplete}%` }}
            />
          )}
        </div>

        {/* Progress Details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-3">
            <p className="text-sm text-slate-500">Processed</p>
            <p className="text-lg font-semibold text-slate-900">
              {progress.processedRows.toLocaleString()} / {progress.totalRows.toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <p className="text-sm text-slate-500">Successful</p>
            <p className="text-lg font-semibold text-green-600">
              {progress.successfulRows.toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <p className="text-sm text-slate-500">Errors</p>
            <p className="text-lg font-semibold text-red-600">
              {progress.failedRows.toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <p className="text-sm text-slate-500">Chunks</p>
            <p className="text-lg font-semibold text-slate-900">
              {progress.currentChunk} / {progress.totalChunks}
            </p>
          </div>
        </div>
      </div>

      {/* Time Estimates */}
      <div className="flex items-center justify-between text-sm text-slate-600 px-2">
        <div className="flex items-center">
          <svg className="w-4 h-4 mr-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Elapsed: <span className="font-medium ml-1">{getElapsedTime()}</span>
        </div>
        {isActive && (
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Remaining: <span className="font-medium ml-1">{formatTime(progress.estimatedSecondsRemaining ?? 0)}</span>
          </div>
        )}
      </div>

      {/* Recent Errors (if any) */}
      {progress.errors.length > 0 && (
        <div className="border border-red-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-red-50 border-b border-red-200">
            <h3 className="font-medium text-red-800">
              Recent Errors ({progress.errors.length})
            </h3>
          </div>
          <div className="max-h-48 overflow-y-auto">
            <table className="min-w-full divide-y divide-red-200">
              <thead className="bg-red-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-red-600 uppercase">Row</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-red-600 uppercase">Column</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-red-600 uppercase">Error</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-red-100">
                {progress.errors.slice(-10).map((error, index) => (
                  <tr key={index} className="bg-red-50">
                    <td className="px-4 py-2 text-sm font-medium text-red-700">{error.row}</td>
                    <td className="px-4 py-2 text-sm text-red-700">{error.field || '-'}</td>
                    <td className="px-4 py-2 text-sm text-red-700">{error.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cancel Button */}
      {isActive && (
        <div className="flex justify-center pt-4">
          <button
            onClick={onCancel}
            className="px-6 py-2.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 font-medium transition-colors"
          >
            Cancel Import
          </button>
        </div>
      )}

      {/* Manual Continue (if needed) */}
      {(progress.status === 'completed' || progress.status === 'failed' || progress.status === 'cancelled') && (
        <div className="flex justify-end pt-4">
          <button
            onClick={onComplete}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            View Results
          </button>
        </div>
      )}
    </div>
  );
}

export default ProgressStep;
