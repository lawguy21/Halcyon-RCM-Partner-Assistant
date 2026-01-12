// @ts-nocheck
'use client';

import { useState, useCallback } from 'react';
import { usePDFExport } from '@/hooks/usePDFExport';
import type { AssessmentFilters } from '@/types';

export type PDFExportType = 'executive-summary' | 'assessment' | 'worklist' | 'batch-summary';

export interface PDFExportButtonProps {
  /** Type of PDF export */
  type: PDFExportType;
  /** Data needed for the export (assessmentId, importId, or assessment IDs array) */
  data?: {
    assessmentId?: string;
    assessmentIds?: string[];
    importId?: string;
    filters?: AssessmentFilters;
  };
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'ghost';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Custom label (optional) */
  label?: string;
  /** Show icon */
  showIcon?: boolean;
  /** Callback when export completes */
  onExportComplete?: () => void;
  /** Callback when export fails */
  onExportError?: (error: string) => void;
}

/**
 * PDF icon SVG component
 */
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

/**
 * Loading spinner component
 */
function LoadingSpinner({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      className={`${className} animate-spin`}
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
  );
}

/**
 * Get default label for export type
 */
function getDefaultLabel(type: PDFExportType): string {
  switch (type) {
    case 'executive-summary':
      return 'Export Executive Summary PDF';
    case 'assessment':
      return 'Export Assessment PDF';
    case 'worklist':
      return 'Export Worklist PDF';
    case 'batch-summary':
      return 'Export Batch Summary PDF';
    default:
      return 'Export PDF';
  }
}

/**
 * Get button styles based on variant and size
 */
function getButtonStyles(
  variant: 'primary' | 'secondary' | 'ghost',
  size: 'sm' | 'md' | 'lg',
  disabled: boolean
): string {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';

  const variantStyles = {
    primary: disabled
      ? 'bg-blue-400 text-white cursor-not-allowed'
      : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: disabled
      ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed'
      : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-slate-500',
    ghost: disabled
      ? 'text-slate-400 cursor-not-allowed'
      : 'text-slate-600 hover:bg-slate-100 focus:ring-slate-500',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };

  return `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]}`;
}

/**
 * Reusable button component for PDF exports
 */
export default function PDFExportButton({
  type,
  data,
  disabled = false,
  className = '',
  variant = 'secondary',
  size = 'md',
  label,
  showIcon = true,
  onExportComplete,
  onExportError,
}: PDFExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { exportExecutiveSummary, exportAssessment, exportWorklist, exportBatchSummary, downloadPDF } =
    usePDFExport();

  const handleExport = useCallback(async () => {
    if (disabled || isExporting) return;

    setIsExporting(true);

    try {
      let result = null;

      switch (type) {
        case 'executive-summary':
          result = await exportExecutiveSummary({
            filters: data?.filters,
          });
          break;

        case 'assessment':
          if (!data?.assessmentId) {
            throw new Error('Assessment ID is required');
          }
          result = await exportAssessment(data.assessmentId);
          break;

        case 'worklist':
          result = await exportWorklist({
            assessmentIds: data?.assessmentIds,
            filters: data?.filters,
          });
          break;

        case 'batch-summary':
          if (!data?.importId) {
            throw new Error('Import ID is required');
          }
          result = await exportBatchSummary(data.importId);
          break;
      }

      if (result) {
        downloadPDF(result.data, result.filename);
        onExportComplete?.();
      } else {
        throw new Error('Export failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export PDF';
      onExportError?.(errorMessage);
    } finally {
      setIsExporting(false);
    }
  }, [
    type,
    data,
    disabled,
    isExporting,
    exportExecutiveSummary,
    exportAssessment,
    exportWorklist,
    exportBatchSummary,
    downloadPDF,
    onExportComplete,
    onExportError,
  ]);

  const buttonLabel = label || getDefaultLabel(type);
  const buttonStyles = getButtonStyles(variant, size, disabled || isExporting);

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={disabled || isExporting}
      className={`${buttonStyles} ${className}`}
      title={buttonLabel}
    >
      {showIcon && (
        <span className="mr-2">
          {isExporting ? <LoadingSpinner /> : <PDFIcon />}
        </span>
      )}
      {isExporting ? 'Generating...' : buttonLabel}
    </button>
  );
}

/**
 * Export PDFExportButton as named export as well
 */
export { PDFExportButton };
