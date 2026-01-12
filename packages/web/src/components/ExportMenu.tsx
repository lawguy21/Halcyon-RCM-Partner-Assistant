// @ts-nocheck
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { usePDFExport } from '@/hooks/usePDFExport';
import type { AssessmentFilters } from '@/types';

export interface ExportMenuProps {
  /** Selected assessment IDs for export */
  selectedIds?: string[];
  /** Total number of assessments available */
  totalAssessments?: number;
  /** Current filters applied */
  filters?: AssessmentFilters;
  /** Import ID for batch summary exports */
  importId?: string;
  /** Callback for CSV export */
  onExportCSV?: () => void;
  /** Callback for worklist CSV export */
  onExportWorklistCSV?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

/**
 * Icon components for export options
 */
function DownloadIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
      />
    </svg>
  );
}

function CSVIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function PDFIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 13h6m-6 4h4"
      />
    </svg>
  );
}

function ListIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
      />
    </svg>
  );
}

function ChartIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  );
}

function BoxIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
      />
    </svg>
  );
}

function ChevronDownIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function LoadingSpinner({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24">
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
  );
}

interface ExportOption {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  disabled?: boolean;
  divider?: boolean;
  type: 'csv' | 'pdf';
}

/**
 * Dropdown menu with all export options (CSV, Worklist CSV, Executive Summary, PDF variants)
 */
export default function ExportMenu({
  selectedIds = [],
  totalAssessments = 0,
  filters,
  importId,
  onExportCSV,
  onExportWorklistCSV,
  className = '',
  disabled = false,
}: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { exportExecutiveSummary, exportWorklist, exportBatchSummary, downloadPDF, error } = usePDFExport();

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menu on escape key
  useEffect(() => {
    function handleEscapeKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, []);

  const hasSelection = selectedIds.length > 0;
  const exportCount = hasSelection ? selectedIds.length : totalAssessments;

  const exportOptions: ExportOption[] = [
    {
      id: 'csv',
      label: 'Export as CSV',
      description: `Export ${exportCount} assessment${exportCount !== 1 ? 's' : ''} to CSV`,
      icon: <CSVIcon />,
      type: 'csv',
    },
    {
      id: 'worklist-csv',
      label: 'Export Worklist CSV',
      description: 'Prioritized recovery worklist',
      icon: <ListIcon />,
      type: 'csv',
    },
    {
      id: 'executive-summary-pdf',
      label: 'Executive Summary PDF',
      description: 'High-level overview report',
      icon: <ChartIcon />,
      divider: true,
      type: 'pdf',
    },
    {
      id: 'worklist-pdf',
      label: 'Worklist PDF',
      description: 'Prioritized action list',
      icon: <PDFIcon />,
      type: 'pdf',
    },
    {
      id: 'batch-summary-pdf',
      label: 'Batch Summary PDF',
      description: 'Import batch analysis',
      icon: <BoxIcon />,
      disabled: !importId,
      type: 'pdf',
    },
  ];

  const handleExport = useCallback(
    async (optionId: string) => {
      if (disabled || isExporting) return;

      setIsExporting(optionId);

      try {
        switch (optionId) {
          case 'csv':
            onExportCSV?.();
            break;

          case 'worklist-csv':
            onExportWorklistCSV?.();
            break;

          case 'executive-summary-pdf': {
            const execResult = await exportExecutiveSummary({ filters });
            if (execResult) {
              downloadPDF(execResult.data, execResult.filename);
            }
            break;
          }

          case 'worklist-pdf': {
            const worklistResult = await exportWorklist({
              assessmentIds: hasSelection ? selectedIds : undefined,
              filters: hasSelection ? undefined : filters,
            });
            if (worklistResult) {
              downloadPDF(worklistResult.data, worklistResult.filename);
            }
            break;
          }

          case 'batch-summary-pdf': {
            if (importId) {
              const batchResult = await exportBatchSummary(importId);
              if (batchResult) {
                downloadPDF(batchResult.data, batchResult.filename);
              }
            }
            break;
          }
        }
      } catch (err) {
        console.error('Export failed:', err);
      } finally {
        setIsExporting(null);
        setIsOpen(false);
      }
    },
    [
      disabled,
      isExporting,
      hasSelection,
      selectedIds,
      filters,
      importId,
      onExportCSV,
      onExportWorklistCSV,
      exportExecutiveSummary,
      exportWorklist,
      exportBatchSummary,
      downloadPDF,
    ]
  );

  return (
    <div className={`relative inline-block text-left ${className}`} ref={menuRef}>
      {/* Export Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          inline-flex items-center px-4 py-2 border rounded-lg font-medium text-sm
          ${
            disabled
              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
          }
        `}
      >
        <DownloadIcon className="w-4 h-4 mr-2" />
        Export{hasSelection ? ` (${selectedIds.length})` : ''}
        <ChevronDownIcon
          className={`w-4 h-4 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 z-10 mt-2 w-72 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">
            {exportOptions.map((option, index) => (
              <div key={option.id}>
                {option.divider && index > 0 && (
                  <div className="border-t border-slate-200 my-1" />
                )}
                <button
                  type="button"
                  onClick={() => handleExport(option.id)}
                  disabled={option.disabled || !!isExporting}
                  className={`
                    w-full flex items-start px-4 py-3 text-left
                    ${
                      option.disabled || !!isExporting
                        ? 'text-slate-400 cursor-not-allowed'
                        : 'text-slate-700 hover:bg-slate-50'
                    }
                  `}
                >
                  <span className={`flex-shrink-0 mt-0.5 ${option.disabled ? 'text-slate-300' : 'text-slate-500'}`}>
                    {isExporting === option.id ? <LoadingSpinner /> : option.icon}
                  </span>
                  <div className="ml-3">
                    <p className={`text-sm font-medium ${option.disabled ? 'text-slate-400' : 'text-slate-900'}`}>
                      {option.label}
                    </p>
                    <p className={`text-xs mt-0.5 ${option.disabled ? 'text-slate-300' : 'text-slate-500'}`}>
                      {option.description}
                    </p>
                  </div>
                  {option.type === 'pdf' && (
                    <span className="ml-auto flex-shrink-0">
                      <span className={`
                        inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium
                        ${option.disabled ? 'bg-slate-100 text-slate-400' : 'bg-red-100 text-red-700'}
                      `}>
                        PDF
                      </span>
                    </span>
                  )}
                </button>
              </div>
            ))}
          </div>

          {/* Selection Info */}
          {hasSelection && (
            <div className="border-t border-slate-200 px-4 py-2 bg-slate-50 rounded-b-lg">
              <p className="text-xs text-slate-500">
                {selectedIds.length} assessment{selectedIds.length !== 1 ? 's' : ''} selected
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="border-t border-red-200 px-4 py-2 bg-red-50 rounded-b-lg">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Export ExportMenu as named export as well
 */
export { ExportMenu };
