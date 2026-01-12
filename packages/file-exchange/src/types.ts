/**
 * Halcyon RCM Partner Assistant - File Exchange Types
 *
 * TypeScript interfaces for the file exchange package,
 * including column mapping, import/export options, and presets.
 */

/**
 * Defines how a source column maps to a target field with optional transformation
 */
export interface ColumnMapping {
  /** The column name or index in the source file */
  sourceColumn: string;
  /** The target field name in the output data */
  targetField: string;
  /** Built-in transformation to apply */
  transform?: 'date' | 'currency' | 'uppercase' | 'lowercase' | 'state_code' | 'encounter_type' | 'custom';
  /** Custom transformation function when transform is 'custom' */
  customTransform?: (value: string) => any;
  /** Whether this field is required (import will warn/fail if missing) */
  required: boolean;
  /** Default value if source is empty or missing */
  defaultValue?: any;
}

/**
 * A saved mapping configuration for a specific vendor or file format
 */
export interface MappingPreset {
  /** Unique identifier for the preset */
  id: string;
  /** Human-readable name */
  name: string;
  /** Vendor or system name (e.g., "R1 RCM", "Epic") */
  vendor: string;
  /** Description of when to use this preset */
  description: string;
  /** Column mappings for this preset */
  mappings: ColumnMapping[];
  /** Expected date format in the source file (e.g., "MM/DD/YYYY") */
  dateFormat: string;
  /** Currency format: 'decimal' for $100.00, 'cents' for 10000 */
  currencyFormat: 'decimal' | 'cents';
  /** Number of header rows to skip before data starts */
  skipHeaderRows: number;
  /** Field delimiter character */
  delimiter: ',' | '\t' | '|' | ';';
}

/**
 * Options for importing CSV data
 */
export interface ImportOptions {
  /** Preset ID or full preset object to use */
  preset?: string | MappingPreset;
  /** Custom mappings to override or extend preset mappings */
  customMappings?: ColumnMapping[];
  /** Number of initial rows to skip (in addition to preset skipHeaderRows) */
  skipRows?: number;
  /** Maximum number of data rows to process */
  maxRows?: number;
  /** Progress callback for long imports */
  onProgress?: (processed: number, total: number) => void;
  /** Whether to validate required fields strictly */
  strictValidation?: boolean;
  /** Custom delimiter override */
  delimiter?: ',' | '\t' | '|' | ';';
}

/**
 * Details about a single import error
 */
export interface ImportError {
  /** 1-based row number where the error occurred */
  row: number;
  /** Column name or field where the error occurred */
  column: string;
  /** The problematic value */
  value: string;
  /** Human-readable error message */
  message: string;
  /** Error severity: 'error' stops processing, 'warning' continues */
  severity?: 'error' | 'warning';
}

/**
 * Result of a CSV import operation
 */
export interface ImportResult {
  /** Whether the import completed successfully */
  success: boolean;
  /** Total number of rows in the source file */
  totalRows: number;
  /** Number of rows successfully processed */
  processedRows: number;
  /** Number of rows skipped due to errors or filters */
  skippedRows: number;
  /** List of all errors encountered */
  errors: ImportError[];
  /** The imported and transformed data */
  data: Record<string, any>[];
  /** Non-critical warnings (e.g., empty optional fields) */
  warnings: string[];
  /** Columns detected in the source file */
  detectedColumns?: string[];
  /** The preset used for import, if any */
  usedPreset?: string;
}

/**
 * Options for exporting data to CSV
 */
export interface ExportOptions {
  /** Export format determines which columns and formatting to use */
  format: 'detailed' | 'summary' | 'worklist' | 'executive';
  /** Specific columns to include (overrides format defaults) */
  columns?: string[];
  /** Field to sort by */
  sortBy?: string;
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
  /** Date format for output (default: "YYYY-MM-DD") */
  dateFormat?: string;
  /** Whether to include header row (default: true) */
  includeHeaders?: boolean;
  /** Delimiter for output CSV (default: ',') */
  delimiter?: ',' | '\t' | '|' | ';';
  /** Whether to quote all fields (default: false, only quote when needed) */
  quoteAll?: boolean;
  /** Line ending style */
  lineEnding?: '\n' | '\r\n';
  /** Custom filename prefix */
  filenamePrefix?: string;
}

/**
 * Result of a CSV export operation
 */
export interface ExportResult {
  /** Whether the export completed successfully */
  success: boolean;
  /** The CSV content as a string */
  content: string;
  /** Number of rows exported */
  rowCount: number;
  /** Suggested filename */
  suggestedFilename: string;
  /** Any warnings during export */
  warnings: string[];
}

/**
 * Preview result for import operations
 */
export interface PreviewResult {
  /** First N rows of data (with current mappings applied) */
  previewRows: Record<string, any>[];
  /** Detected or provided column headers */
  columns: string[];
  /** Auto-detected delimiter */
  detectedDelimiter: ',' | '\t' | '|' | ';';
  /** Suggested preset based on column names */
  suggestedPreset?: string;
  /** Total rows detected in file */
  totalRows: number;
  /** Any issues detected during preview */
  issues: string[];
}

/**
 * Column detection result for auto-mapping
 */
export interface ColumnDetectionResult {
  /** Source column name */
  sourceColumn: string;
  /** Suggested target field */
  suggestedTarget: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Suggested transform */
  suggestedTransform?: ColumnMapping['transform'];
  /** Sample values from this column */
  sampleValues: string[];
}

/**
 * Standard field names used in the Halcyon system
 */
export type StandardField =
  | 'accountNumber'
  | 'mrn'
  | 'patientFirstName'
  | 'patientLastName'
  | 'patientFullName'
  | 'dateOfBirth'
  | 'dateOfService'
  | 'admitDate'
  | 'dischargeDate'
  | 'totalCharges'
  | 'totalPayments'
  | 'balance'
  | 'insuranceBalance'
  | 'selfPayBalance'
  | 'primaryInsurance'
  | 'secondaryInsurance'
  | 'financialClass'
  | 'facilityCode'
  | 'facilityName'
  | 'departmentCode'
  | 'departmentName'
  | 'encounterType'
  | 'patientType'
  | 'addressLine1'
  | 'addressLine2'
  | 'city'
  | 'state'
  | 'zipCode'
  | 'phone'
  | 'email'
  | 'guarantorName'
  | 'guarantorPhone'
  | 'attendingPhysician'
  | 'referringPhysician'
  | 'notes'
  | 'status'
  | 'lastActivityDate'
  | 'agingBucket'
  | 'custom1'
  | 'custom2'
  | 'custom3';

/**
 * Mapping from common column name patterns to standard fields
 */
export interface ColumnPattern {
  /** Regular expression pattern to match column names */
  pattern: RegExp;
  /** Target standard field */
  targetField: StandardField;
  /** Confidence level for this pattern */
  confidence: number;
  /** Suggested transform for this field type */
  defaultTransform?: ColumnMapping['transform'];
}
