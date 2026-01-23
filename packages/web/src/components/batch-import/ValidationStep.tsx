'use client';

import React, { useState } from 'react';
import { ValidationResult } from '../../hooks/useBatchImport';

interface ValidationStepProps {
  validation: ValidationResult | null;
  onStartImport: () => void;
  onBack: () => void;
  isLoading: boolean;
}

export function ValidationStep({ validation, onStartImport, onBack, isLoading }: ValidationStepProps) {
  const [showErrors, setShowErrors] = useState(false);
  const [showWarnings, setShowWarnings] = useState(false);

  if (!validation) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">No validation data available</p>
      </div>
    );
  }

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds} seconds`;
    if (seconds < 3600) return `${Math.ceil(seconds / 60)} minutes`;
    return `${(seconds / 3600).toFixed(1)} hours`;
  };

  // Calculate derived values from validation result
  const errorCount = validation.errors?.length || 0;
  const warningCount = validation.warnings?.length || 0;
  const validRows = validation.totalRows - errorCount;
  const estimatedTime = Math.ceil(validation.totalRows / 100); // ~100 rows/sec estimate

  // Derive column names from detectedColumns
  const columns = validation.detectedColumns.map(dc => dc.column);

  const canProceed = validation.isValid || validRows > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Validation Results</h2>
        <p className="text-slate-600">
          Review the validation results before starting the import.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-slate-900">{validation.totalRows.toLocaleString()}</div>
          <div className="text-sm text-slate-600">Total Rows</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-700">{validRows.toLocaleString()}</div>
          <div className="text-sm text-green-600">Valid Rows</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-700">{errorCount.toLocaleString()}</div>
          <div className="text-sm text-red-600">Errors</div>
        </div>
        <div className="bg-amber-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-amber-700">{warningCount.toLocaleString()}</div>
          <div className="text-sm text-amber-600">Warnings</div>
        </div>
      </div>

      {/* Estimated Time */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center text-slate-600">
          <svg className="w-4 h-4 mr-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Estimated time: <span className="font-medium ml-1">{formatTime(estimatedTime)}</span>
        </div>
      </div>

      {/* Detected Columns */}
      <div className="border border-slate-200 rounded-lg p-4">
        <h3 className="font-medium text-slate-900 mb-3">Detected Columns ({validation.detectedColumns.length})</h3>
        <div className="flex flex-wrap gap-2">
          {validation.detectedColumns.map((col, idx) => (
            <span
              key={idx}
              className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-sm"
            >
              {col.column} → {col.field}
            </span>
          ))}
        </div>
      </div>

      {/* Preview Data */}
      {validation.sampleRows.length > 0 && (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
            <h3 className="font-medium text-slate-900">Preview (first {validation.sampleRows.length} rows)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  {columns.slice(0, 6).map((column) => (
                    <th
                      key={column}
                      className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                    >
                      {column}
                    </th>
                  ))}
                  {columns.length > 6 && (
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      ...
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {validation.sampleRows.slice(0, 3).map((row, index) => (
                  <tr key={index}>
                    {columns.slice(0, 6).map((column) => (
                      <td key={column} className="px-4 py-2 text-sm text-slate-600 truncate max-w-[200px]">
                        {String(row[column] || '')}
                      </td>
                    ))}
                    {columns.length > 6 && (
                      <td className="px-4 py-2 text-sm text-slate-400">...</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Errors Section */}
      {validation.errors.length > 0 && (
        <div className="border border-red-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setShowErrors(!showErrors)}
            className="w-full px-4 py-3 bg-red-50 border-b border-red-200 flex items-center justify-between hover:bg-red-100 transition-colors"
          >
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium text-red-800">
                {validation.errors.length} Errors
              </span>
            </div>
            <svg
              className={`w-5 h-5 text-red-500 transition-transform ${showErrors ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showErrors && (
            <div className="max-h-60 overflow-y-auto">
              <table className="min-w-full divide-y divide-red-200">
                <thead className="bg-red-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-red-600 uppercase">Row</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-red-600 uppercase">Error</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-red-100">
                  {validation.errors.slice(0, 50).map((error, index) => (
                    <tr key={index} className="bg-red-50">
                      <td className="px-4 py-2 text-sm font-medium text-red-700">{error.row}</td>
                      <td className="px-4 py-2 text-sm text-red-700">{error.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {validation.errors.length > 50 && (
                <div className="px-4 py-2 bg-red-50 text-sm text-red-600">
                  Showing first 50 of {validation.errors.length} errors
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Warnings Section */}
      {validation.warnings.length > 0 && (
        <div className="border border-amber-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setShowWarnings(!showWarnings)}
            className="w-full px-4 py-3 bg-amber-50 border-b border-amber-200 flex items-center justify-between hover:bg-amber-100 transition-colors"
          >
            <div className="flex items-center">
              <svg className="w-5 h-5 text-amber-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="font-medium text-amber-800">
                {validation.warnings.length} Warnings
              </span>
            </div>
            <svg
              className={`w-5 h-5 text-amber-500 transition-transform ${showWarnings ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showWarnings && (
            <div className="max-h-60 overflow-y-auto">
              <table className="min-w-full divide-y divide-amber-200">
                <thead className="bg-amber-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-amber-600 uppercase">Row</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-amber-600 uppercase">Warning</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-amber-100">
                  {validation.warnings.slice(0, 50).map((warning, index) => (
                    <tr key={index} className="bg-amber-50">
                      <td className="px-4 py-2 text-sm font-medium text-amber-700">{warning.row}</td>
                      <td className="px-4 py-2 text-sm text-amber-700">{warning.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {validation.warnings.length > 50 && (
                <div className="px-4 py-2 bg-amber-50 text-sm text-amber-600">
                  Showing first 50 of {validation.warnings.length} warnings
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <button
          onClick={onBack}
          disabled={isLoading}
          className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Back
        </button>

        <div className="flex items-center space-x-4">
          {!validation.isValid && validRows > 0 && (
            <p className="text-sm text-amber-600">
              Will import {validRows.toLocaleString()} valid rows, skipping errors
            </p>
          )}
          <button
            onClick={onStartImport}
            disabled={!canProceed || isLoading}
            className={`px-6 py-2.5 rounded-lg font-medium transition-colors ${
              !canProceed || isLoading
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Starting...
              </span>
            ) : (
              `Start Import (${validRows.toLocaleString()} rows)`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ValidationStep;
