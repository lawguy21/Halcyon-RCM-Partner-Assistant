/**
 * Halcyon RCM Partner Assistant - CSV Export
 *
 * CSV export functionality with support for different output formats
 * and value formatting.
 */

import Papa from 'papaparse';
import { ExportOptions, ExportResult } from './types';

/**
 * Column configurations for different export formats
 */
export const FORMAT_COLUMNS: Record<ExportOptions['format'], string[]> = {
  detailed: [
    'accountNumber',
    'mrn',
    'patientFirstName',
    'patientLastName',
    'dateOfBirth',
    'dateOfService',
    'encounterType',
    'facilityName',
    'totalCharges',
    'totalPayments',
    'balance',
    'insuranceBalance',
    'selfPayBalance',
    'primaryInsurance',
    'financialClass',
    'agingBucket',
    'status',
    'addressLine1',
    'city',
    'state',
    'zipCode',
    'phone',
    'notes',
  ],
  summary: [
    'accountNumber',
    'patientFullName',
    'dateOfService',
    'totalCharges',
    'balance',
    'primaryInsurance',
    'financialClass',
    'agingBucket',
    'status',
  ],
  worklist: [
    'accountNumber',
    'mrn',
    'patientLastName',
    'patientFirstName',
    'phone',
    'balance',
    'selfPayBalance',
    'agingBucket',
    'lastActivityDate',
    'status',
    'notes',
  ],
  executive: [
    'facilityName',
    'encounterType',
    'financialClass',
    'totalCharges',
    'totalPayments',
    'balance',
    'accountCount',
    'averageBalance',
  ],
};

/**
 * Human-readable column headers
 */
export const COLUMN_HEADERS: Record<string, string> = {
  accountNumber: 'Account Number',
  mrn: 'MRN',
  patientFirstName: 'First Name',
  patientLastName: 'Last Name',
  patientFullName: 'Patient Name',
  dateOfBirth: 'Date of Birth',
  dateOfService: 'Date of Service',
  admitDate: 'Admit Date',
  dischargeDate: 'Discharge Date',
  lastActivityDate: 'Last Activity',
  totalCharges: 'Total Charges',
  totalPayments: 'Total Payments',
  balance: 'Balance',
  insuranceBalance: 'Insurance Balance',
  selfPayBalance: 'Self-Pay Balance',
  primaryInsurance: 'Primary Insurance',
  secondaryInsurance: 'Secondary Insurance',
  financialClass: 'Financial Class',
  facilityCode: 'Facility Code',
  facilityName: 'Facility',
  departmentCode: 'Department Code',
  departmentName: 'Department',
  encounterType: 'Encounter Type',
  patientType: 'Patient Type',
  addressLine1: 'Address',
  addressLine2: 'Address 2',
  city: 'City',
  state: 'State',
  zipCode: 'ZIP Code',
  phone: 'Phone',
  email: 'Email',
  guarantorName: 'Guarantor',
  guarantorPhone: 'Guarantor Phone',
  attendingPhysician: 'Attending Physician',
  referringPhysician: 'Referring Physician',
  notes: 'Notes',
  status: 'Status',
  agingBucket: 'Aging Bucket',
  accountCount: 'Account Count',
  averageBalance: 'Average Balance',
};

/**
 * Format a date value for export
 */
export function formatDate(
  value: Date | string | null | undefined,
  format: string = 'YYYY-MM-DD'
): string {
  if (!value) return '';

  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return String(value);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  // Support common date formats
  switch (format) {
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`;
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'MM-DD-YYYY':
      return `${month}-${day}-${year}`;
    case 'YYYYMMDD':
      return `${year}${month}${day}`;
    default:
      return `${year}-${month}-${day}`;
  }
}

/**
 * Format a currency value for export
 */
export function formatCurrency(
  value: number | null | undefined,
  options: {
    includeDollarSign?: boolean;
    includeCommas?: boolean;
    negativeFormat?: 'minus' | 'parens';
  } = {}
): string {
  if (value === null || value === undefined) return '';

  const {
    includeDollarSign = false,
    includeCommas = true,
    negativeFormat = 'minus',
  } = options;

  const isNegative = value < 0;
  const absValue = Math.abs(value);

  let formatted = absValue.toFixed(2);

  if (includeCommas) {
    formatted = formatted.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  if (includeDollarSign) {
    formatted = '$' + formatted;
  }

  if (isNegative) {
    if (negativeFormat === 'parens') {
      formatted = `(${formatted})`;
    } else {
      formatted = `-${formatted}`;
    }
  }

  return formatted;
}

/**
 * Format a phone number for export
 */
export function formatPhone(value: string | null | undefined): string {
  if (!value) return '';

  // Remove all non-digits
  const digits = value.replace(/\D/g, '');

  // Format as (XXX) XXX-XXXX for US numbers
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  // Format as +1 (XXX) XXX-XXXX for 11-digit numbers starting with 1
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  // Return original if can't format
  return value;
}

/**
 * Format a value based on its field name
 */
export function formatValue(
  value: any,
  fieldName: string,
  options: {
    dateFormat?: string;
    currencyOptions?: Parameters<typeof formatCurrency>[1];
  } = {}
): string {
  if (value === null || value === undefined) return '';

  // Date fields
  const dateFields = [
    'dateOfBirth',
    'dateOfService',
    'admitDate',
    'dischargeDate',
    'lastActivityDate',
  ];
  if (dateFields.includes(fieldName)) {
    return formatDate(value, options.dateFormat);
  }

  // Currency fields
  const currencyFields = [
    'totalCharges',
    'totalPayments',
    'balance',
    'insuranceBalance',
    'selfPayBalance',
    'averageBalance',
  ];
  if (currencyFields.includes(fieldName)) {
    return formatCurrency(value, options.currencyOptions);
  }

  // Phone fields
  if (fieldName === 'phone' || fieldName === 'guarantorPhone') {
    return formatPhone(value);
  }

  // Default: convert to string
  return String(value);
}

/**
 * Sort data by a field
 */
export function sortData<T extends Record<string, any>>(
  data: T[],
  sortBy: string,
  sortOrder: 'asc' | 'desc' = 'asc'
): T[] {
  return [...data].sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];

    // Handle null/undefined
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return sortOrder === 'asc' ? -1 : 1;
    if (bVal == null) return sortOrder === 'asc' ? 1 : -1;

    // Compare dates
    if (aVal instanceof Date && bVal instanceof Date) {
      const diff = aVal.getTime() - bVal.getTime();
      return sortOrder === 'asc' ? diff : -diff;
    }

    // Compare numbers
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    }

    // Compare strings
    const aStr = String(aVal).toLowerCase();
    const bStr = String(bVal).toLowerCase();
    const comparison = aStr.localeCompare(bStr);
    return sortOrder === 'asc' ? comparison : -comparison;
  });
}

/**
 * Export data to CSV format
 */
export function exportToCSV(
  data: Record<string, any>[],
  options: ExportOptions = { format: 'detailed' }
): ExportResult {
  const result: ExportResult = {
    success: false,
    content: '',
    rowCount: 0,
    suggestedFilename: '',
    warnings: [],
  };

  try {
    if (!data || data.length === 0) {
      result.warnings.push('No data to export');
      result.success = true;
      result.content = '';
      return result;
    }

    // Determine columns to export
    let columns = options.columns || FORMAT_COLUMNS[options.format] || [];

    // If no predefined columns, use all keys from data
    if (columns.length === 0) {
      const allKeys = new Set<string>();
      for (const row of data) {
        for (const key of Object.keys(row)) {
          allKeys.add(key);
        }
      }
      columns = Array.from(allKeys);
    }

    // Sort data if requested
    let processedData = data;
    if (options.sortBy) {
      processedData = sortData(data, options.sortBy, options.sortOrder);
    }

    // Format values and build rows
    const rows: string[][] = [];

    // Add header row
    if (options.includeHeaders !== false) {
      const headerRow = columns.map((col) => COLUMN_HEADERS[col] || col);
      rows.push(headerRow);
    }

    // Add data rows
    for (const record of processedData) {
      const row = columns.map((col) =>
        formatValue(record[col], col, {
          dateFormat: options.dateFormat,
        })
      );
      rows.push(row);
    }

    // Configure Papa Parse for CSV generation
    const delimiter = options.delimiter || ',';
    const lineEnding = options.lineEnding || '\r\n';

    // Build CSV content
    result.content = Papa.unparse(rows, {
      delimiter,
      newline: lineEnding,
      quotes: options.quoteAll || false,
    });

    result.rowCount = processedData.length;
    result.success = true;

    // Generate suggested filename
    const timestamp = new Date().toISOString().slice(0, 10);
    const prefix = options.filenamePrefix || 'export';
    result.suggestedFilename = `${prefix}_${options.format}_${timestamp}.csv`;
  } catch (err) {
    result.warnings.push(
      `Export failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  return result;
}

/**
 * Export data for a specific worklist format
 */
export function exportWorklist(
  data: Record<string, any>[],
  options: Omit<ExportOptions, 'format'> = {}
): ExportResult {
  return exportToCSV(data, { ...options, format: 'worklist' });
}

/**
 * Export executive summary
 * Aggregates data by facility and encounter type
 */
export function exportExecutiveSummary(
  data: Record<string, any>[],
  options: Omit<ExportOptions, 'format'> = {}
): ExportResult {
  // Aggregate data
  const aggregated = new Map<string, {
    facilityName: string;
    encounterType: string;
    financialClass: string;
    totalCharges: number;
    totalPayments: number;
    balance: number;
    accountCount: number;
  }>();

  for (const record of data) {
    const key = `${record.facilityName || 'Unknown'}|${record.encounterType || 'Unknown'}|${record.financialClass || 'Unknown'}`;

    if (!aggregated.has(key)) {
      aggregated.set(key, {
        facilityName: record.facilityName || 'Unknown',
        encounterType: record.encounterType || 'Unknown',
        financialClass: record.financialClass || 'Unknown',
        totalCharges: 0,
        totalPayments: 0,
        balance: 0,
        accountCount: 0,
      });
    }

    const agg = aggregated.get(key)!;
    agg.totalCharges += record.totalCharges || 0;
    agg.totalPayments += record.totalPayments || 0;
    agg.balance += record.balance || 0;
    agg.accountCount += 1;
  }

  // Convert to array and calculate averages
  const summaryData = Array.from(aggregated.values()).map((agg) => ({
    ...agg,
    averageBalance: agg.accountCount > 0 ? agg.balance / agg.accountCount : 0,
  }));

  return exportToCSV(summaryData, {
    ...options,
    format: 'executive',
    filenamePrefix: options.filenamePrefix || 'executive_summary',
  });
}

/**
 * Export data with custom column selection
 */
export function exportCustom(
  data: Record<string, any>[],
  columns: string[],
  options: Omit<ExportOptions, 'format' | 'columns'> = {}
): ExportResult {
  return exportToCSV(data, {
    ...options,
    format: 'detailed', // Used as fallback if columns is empty
    columns,
  });
}

/**
 * Create a downloadable Blob from CSV content (browser environment)
 */
export function createCSVBlob(content: string): Blob {
  return new Blob([content], { type: 'text/csv;charset=utf-8;' });
}

/**
 * Trigger download of CSV file (browser environment)
 */
export function downloadCSV(
  content: string,
  filename: string = 'export.csv'
): void {
  const blob = createCSVBlob(content);
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export and download in one step (browser environment)
 */
export function exportAndDownload(
  data: Record<string, any>[],
  options: ExportOptions = { format: 'detailed' }
): ExportResult {
  const result = exportToCSV(data, options);

  if (result.success && result.content) {
    downloadCSV(result.content, result.suggestedFilename);
  }

  return result;
}
