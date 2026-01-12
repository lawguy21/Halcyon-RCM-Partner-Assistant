'use client';

import { useState } from 'react';
import Link from 'next/link';
import FileUpload from '@/components/FileUpload';
import ColumnMapper from '@/components/ColumnMapper';
import { useImport, TARGET_FIELDS } from '@/hooks/useImport';

export default function ImportPage() {
  const {
    file,
    preview,
    mappings,
    selectedPreset,
    importing,
    progress,
    result,
    error,
    presets,
    targetFields,
    selectPreset,
    setMappings,
    previewFile,
    importFile,
    reset,
  } = useImport();

  const [step, setStep] = useState<'upload' | 'mapping' | 'import' | 'results'>('upload');

  const handleFileSelect = async (selectedFile: File) => {
    await previewFile(selectedFile);
    setStep('mapping');
  };

  const handleImport = async () => {
    setStep('import');
    await importFile();
    setStep('results');
  };

  const handleReset = () => {
    reset();
    setStep('upload');
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Import CSV</h2>
          <p className="text-slate-500 mt-1">
            Upload and process account data files
          </p>
        </div>
        {step !== 'upload' && (
          <button
            onClick={handleReset}
            className="inline-flex items-center px-4 py-2 border border-slate-300 bg-white text-slate-700 rounded-lg hover:bg-slate-50 font-medium text-sm"
          >
            <svg
              className="w-4 h-4 mr-2"
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
            Start Over
          </button>
        )}
      </div>

      {/* Progress Steps */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between">
          {[
            { id: 'upload', label: 'Upload File', step: 1 },
            { id: 'mapping', label: 'Map Columns', step: 2 },
            { id: 'import', label: 'Import', step: 3 },
            { id: 'results', label: 'Results', step: 4 },
          ].map((s, index) => (
            <div key={s.id} className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold ${
                  step === s.id
                    ? 'bg-blue-600 text-white'
                    : ['upload', 'mapping', 'import', 'results'].indexOf(step) >
                      ['upload', 'mapping', 'import', 'results'].indexOf(s.id)
                    ? 'bg-green-500 text-white'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {['upload', 'mapping', 'import', 'results'].indexOf(step) >
                ['upload', 'mapping', 'import', 'results'].indexOf(s.id) ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  s.step
                )}
              </div>
              <span className="ml-3 text-sm font-medium text-slate-700">{s.label}</span>
              {index < 3 && (
                <div className="w-24 h-1 bg-slate-200 mx-4 rounded">
                  <div
                    className={`h-full bg-blue-600 rounded transition-all duration-300 ${
                      ['upload', 'mapping', 'import', 'results'].indexOf(step) > index
                        ? 'w-full'
                        : 'w-0'
                    }`}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start space-x-3">
          <svg className="w-5 h-5 text-red-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-red-800">Error</h4>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Select Preset (Optional)</h3>
            <p className="text-sm text-slate-500 mb-4">
              Choose a preset to automatically map columns based on your data source
            </p>
            <select
              value={selectedPreset?.id || ''}
              onChange={(e) => selectPreset(e.target.value || null)}
              className="w-full max-w-md border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Auto-detect columns</option>
              {presets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name} ({preset.vendor})
                </option>
              ))}
            </select>
          </div>

          <div className="border-t border-slate-200 pt-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Upload CSV File</h3>
            <p className="text-sm text-slate-500 mb-4">
              Drag and drop your CSV file or click to browse
            </p>
            <FileUpload onFileSelect={handleFileSelect} />
          </div>
        </div>
      )}

      {/* Step 2: Mapping */}
      {step === 'mapping' && preview && (
        <div className="space-y-6">
          {/* File Preview */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">File Preview</h3>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4 text-sm text-slate-600">
                <span>
                  <strong>{preview.columns.length}</strong> columns detected
                </span>
                <span>
                  <strong>{preview.totalRows}</strong> rows
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    {preview.columns.map((col) => (
                      <th
                        key={col}
                        className="px-3 py-2 text-left font-medium text-slate-700 border-b border-slate-200"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.previewRows.slice(0, 3).map((row, index) => (
                    <tr key={index} className="border-b border-slate-100">
                      {preview.columns.map((col) => (
                        <td
                          key={col}
                          className="px-3 py-2 text-slate-600 truncate max-w-[200px]"
                        >
                          {String(row[col] || '-')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Column Mapping */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Column Mapping</h3>
            <ColumnMapper
              sourceColumns={preview.columns}
              targetFields={targetFields}
              mappings={mappings}
              onChange={setMappings}
              sampleData={preview.previewRows}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-4">
            <button
              onClick={() => setStep('upload')}
              className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
            >
              Back
            </button>
            <button
              onClick={handleImport}
              disabled={!mappings.some((m) => m.sourceColumn)}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Import Data
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Importing */}
      {step === 'import' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <svg
            className="animate-spin h-12 w-12 text-blue-600 mx-auto"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-slate-900 mt-6">Importing Data...</h3>
          <p className="text-slate-500 mt-2">Processing your file, please wait</p>
          <div className="mt-6 max-w-sm mx-auto">
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-slate-500 mt-2">{progress}% complete</p>
          </div>
        </div>
      )}

      {/* Step 4: Results */}
      {step === 'results' && result && (
        <div className="space-y-6">
          {/* Summary */}
          <div className={`rounded-xl shadow-sm border p-6 ${
            result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center space-x-4">
              {result.success ? (
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : (
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              )}
              <div>
                <h3 className={`text-lg font-semibold ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                  {result.success ? 'Import Successful' : 'Import Completed with Errors'}
                </h3>
                <p className={`text-sm ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                  {result.processedRows} of {result.totalRows} rows processed
                </p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Total Rows</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{result.totalRows}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Processed</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{result.processedRows}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Skipped</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{result.skippedRows}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Errors</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{result.errors.length}</p>
            </div>
          </div>

          {/* Errors */}
          {result.errors.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Import Errors</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-3 py-2 text-left font-medium text-slate-700">Row</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-700">Column</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-700">Value</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-700">Error</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-700">Severity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.errors.slice(0, 20).map((err, index) => (
                      <tr key={index} className="border-b border-slate-100">
                        <td className="px-3 py-2 text-slate-600">{err.row}</td>
                        <td className="px-3 py-2 text-slate-600">{err.column}</td>
                        <td className="px-3 py-2 text-slate-600 truncate max-w-[150px]">
                          {err.value || '-'}
                        </td>
                        <td className="px-3 py-2 text-slate-600">{err.message}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                            err.severity === 'error'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {err.severity}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {result.errors.length > 20 && (
                  <p className="text-sm text-slate-500 mt-2">
                    Showing first 20 of {result.errors.length} errors
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-4">
            <button
              onClick={handleReset}
              className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
            >
              Import Another File
            </button>
            <Link
              href="/assessments"
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium inline-flex items-center"
            >
              View Assessments
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
