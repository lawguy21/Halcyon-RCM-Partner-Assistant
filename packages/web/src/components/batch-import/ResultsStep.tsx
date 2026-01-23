'use client';

import React, { useState, useCallback } from 'react';
import { ImportProgress } from '../../hooks/useBatchImport';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ResultsStepProps {
  importId: string | null;
  progress: ImportProgress | null;
  onReset: () => void;
}

export function ResultsStep({ importId, progress, onReset }: ResultsStepProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExportErrors = useCallback(async () => {
    if (!importId) return;

    setIsExporting(true);
    setExportError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/batch-import/export-errors/${importId}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to export errors');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `import-errors-${importId}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  }, [importId]);

  const handleExportReport = useCallback(async () => {
    if (!importId) return;

    setIsExporting(true);
    setExportError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/batch-import/export-report/${importId}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to export report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `import-report-${importId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  }, [importId]);

  if (!progress) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">No import results available</p>
        <button
          onClick={onReset}
          className="mt-4 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          Start New Import
        </button>
      </div>
    );
  }

  const isSuccess = progress.status === 'completed' && progress.failedRows === 0;
  const isPartialSuccess = progress.status === 'completed' && progress.failedRows > 0;
  const isFailed = progress.status === 'failed';
  const isCancelled = progress.status === 'cancelled';

  const successRate = progress.processedRows > 0
    ? Math.round((progress.successfulRows / progress.processedRows) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        {isSuccess && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Import Completed Successfully!</h2>
            <p className="text-slate-600">All {progress.successfulRows.toLocaleString()} records were imported without errors.</p>
          </>
        )}
        {isPartialSuccess && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 bg-amber-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Import Completed with Errors</h2>
            <p className="text-slate-600">
              {progress.successfulRows.toLocaleString()} of {progress.totalRows.toLocaleString()} records were imported successfully.
              {progress.failedRows.toLocaleString()} records had errors.
            </p>
          </>
        )}
        {isFailed && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Import Failed</h2>
            <p className="text-slate-600">
              The import process encountered a critical error.
              {progress.successfulRows > 0 && ` ${progress.successfulRows.toLocaleString()} records were imported before the failure.`}
            </p>
          </>
        )}
        {isCancelled && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Import Cancelled</h2>
            <p className="text-slate-600">
              The import was cancelled.
              {progress.successfulRows > 0 && ` ${progress.successfulRows.toLocaleString()} records were imported before cancellation.`}
            </p>
          </>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-slate-900">{progress.totalRows.toLocaleString()}</div>
          <div className="text-sm text-slate-600">Total Rows</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-700">{progress.successfulRows.toLocaleString()}</div>
          <div className="text-sm text-green-600">Imported</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-700">{progress.failedRows.toLocaleString()}</div>
          <div className="text-sm text-red-600">Errors</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-700">{successRate}%</div>
          <div className="text-sm text-blue-600">Success Rate</div>
        </div>
      </div>

      {/* Success Rate Bar */}
      <div className="bg-slate-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">Import Success Rate</span>
          <span className="text-sm font-medium text-slate-700">{successRate}%</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-3 rounded-full transition-all ${
              successRate >= 90 ? 'bg-green-500' : successRate >= 70 ? 'bg-amber-500' : 'bg-red-500'
            }`}
            style={{ width: `${successRate}%` }}
          />
        </div>
      </div>

      {/* Error Summary */}
      {progress.errors.length > 0 && (
        <div className="border border-red-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-red-50 border-b border-red-200 flex items-center justify-between">
            <h3 className="font-medium text-red-800">
              Errors ({progress.errors.length})
            </h3>
            <button
              onClick={handleExportErrors}
              disabled={isExporting}
              className="text-sm text-red-600 hover:text-red-800 font-medium flex items-center disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <svg className="animate-spin w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Exporting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export Errors CSV
                </>
              )}
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto">
            <table className="min-w-full divide-y divide-red-200">
              <thead className="bg-red-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-red-600 uppercase">Row</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-red-600 uppercase">Field</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-red-600 uppercase">Error</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-red-100">
                {progress.errors.slice(0, 20).map((error, index) => (
                  <tr key={index} className="bg-red-50">
                    <td className="px-4 py-2 text-sm font-medium text-red-700">{error.row}</td>
                    <td className="px-4 py-2 text-sm text-red-700">{error.field || '-'}</td>
                    <td className="px-4 py-2 text-sm text-red-700">{error.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {progress.errors.length > 20 && (
              <div className="px-4 py-2 bg-red-50 text-sm text-red-600 text-center">
                Showing first 20 of {progress.errors.length} errors.
                <button onClick={handleExportErrors} className="ml-1 underline hover:no-underline">
                  Export all errors
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Export Error */}
      {exportError && (
        <div className="flex items-center space-x-2 text-red-600 text-sm">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{exportError}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExportReport}
            disabled={isExporting}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium text-sm flex items-center disabled:opacity-50"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Report
          </button>
          {progress.errors.length > 0 && (
            <button
              onClick={handleExportErrors}
              disabled={isExporting}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium text-sm flex items-center disabled:opacity-50"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export Errors
            </button>
          )}
        </div>

        <div className="flex gap-3">
          {progress.successfulRows > 0 && (
            <a
              href="/assessments"
              className="px-6 py-2.5 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 font-medium transition-colors"
            >
              View Assessments
            </a>
          )}
          <button
            onClick={onReset}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            Import Another File
          </button>
        </div>
      </div>
    </div>
  );
}

export default ResultsStep;
