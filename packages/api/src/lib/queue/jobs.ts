/**
 * Halcyon RCM Partner Assistant - Job Type Definitions
 *
 * Defines all job names, data structures, and progress tracking interfaces.
 */

/**
 * Job name constants for type-safe job references
 */
export const JOB_NAMES = {
  CSV_IMPORT: 'csv-import',
  CSV_IMPORT_CHUNK: 'csv-import-chunk',
  CSV_EXPORT: 'csv-export',
  ASSESSMENT_BATCH: 'assessment-batch',
} as const;

export type JobName = (typeof JOB_NAMES)[keyof typeof JOB_NAMES];

/**
 * Data structure for the main CSV import job
 */
export interface CSVImportJobData {
  /** Unique identifier for this import operation */
  importId: string;
  /** Path to the uploaded CSV file */
  filePath: string;
  /** Optional preset ID for column mapping */
  presetId?: string;
  /** User who initiated the import */
  userId?: string;
  /** Organization context for the import */
  organizationId?: string;
  /** Import processing options */
  options: {
    /** Continue processing even if some rows fail */
    skipErrors: boolean;
    /** Only validate, don't actually import */
    validateOnly: boolean;
    /** Number of rows to process per chunk */
    chunkSize: number;
    /** Check for duplicate records */
    detectDuplicates: boolean;
    /** Fields to use as unique key for duplicate detection */
    duplicateKey?: string[];
  };
}

/**
 * Data structure for chunk processing jobs
 */
export interface CSVImportChunkJobData {
  /** Reference to parent import job */
  importId: string;
  /** Index of this chunk (0-based) */
  chunkIndex: number;
  /** Total number of chunks */
  totalChunks: number;
  /** Rows to process in this chunk */
  rows: Record<string, unknown>[];
  /** Processing options */
  options: {
    skipErrors: boolean;
  };
}

/**
 * Import progress status values
 */
export type ImportStatus =
  | 'queued'
  | 'parsing'
  | 'validating'
  | 'processing'
  | 'finalizing'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * Detailed progress tracking for import operations
 */
export interface ImportProgress {
  /** Unique import identifier */
  importId: string;
  /** Current status of the import */
  status: ImportStatus;
  /** Total number of data rows in the file */
  totalRows: number;
  /** Number of rows processed so far */
  processedRows: number;
  /** Number of rows successfully imported */
  successfulRows: number;
  /** Number of rows that failed validation or import */
  failedRows: number;
  /** Number of rows skipped (e.g., duplicates) */
  skippedRows: number;
  /** Progress as percentage (0-100) */
  progressPercent: number;
  /** Current chunk being processed (1-based) */
  currentChunk: number;
  /** Total number of chunks */
  totalChunks: number;
  /** List of errors encountered */
  errors: ImportError[];
  /** When processing started */
  startedAt?: Date;
  /** Estimated seconds until completion */
  estimatedSecondsRemaining?: number;
  /** When processing completed */
  completedAt?: Date;
  /** Original filename */
  filename?: string;
}

/**
 * Error detail for import failures
 */
export interface ImportError {
  /** Row number where error occurred (1-based, 0 for file-level errors) */
  row: number;
  /** Field/column name if applicable */
  field?: string;
  /** The problematic value */
  value?: string;
  /** Error message */
  message: string;
  /** Error severity */
  severity?: 'error' | 'warning';
}

/**
 * Job completion result
 */
export interface CSVImportJobResult {
  success: boolean;
  importId: string;
  processedRows: number;
  successfulRows: number;
  failedRows: number;
  skippedRows: number;
  errors: ImportError[];
  duration: number;
}

/**
 * Options for job scheduling
 */
export interface JobScheduleOptions {
  /** Unique key to prevent duplicate jobs */
  singletonKey?: string;
  /** Priority (higher = more important) */
  priority?: number;
  /** Retry options */
  retryLimit?: number;
  retryDelay?: number;
  retryBackoff?: boolean;
  /** Expiration in seconds */
  expireInSeconds?: number;
  /** Start after delay (ISO 8601 duration or Date) */
  startAfter?: string | Date;
}

/**
 * Create default import progress object
 */
export function createInitialProgress(
  importId: string,
  filename?: string
): ImportProgress {
  return {
    importId,
    status: 'queued',
    totalRows: 0,
    processedRows: 0,
    successfulRows: 0,
    failedRows: 0,
    skippedRows: 0,
    progressPercent: 0,
    currentChunk: 0,
    totalChunks: 0,
    errors: [],
    filename,
  };
}
