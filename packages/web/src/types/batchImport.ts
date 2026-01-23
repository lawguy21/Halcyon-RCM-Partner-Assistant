export interface BatchImportJob {
  id: string;
  importId: string;
  jobId: string;
  filename: string;
  originalName: string;
  status: ImportStatus;
  totalRows: number;
  processedRows: number;
  successfulRows: number;
  failedRows: number;
  skippedRows: number;
  progress: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  errors?: ImportError[];
}

export type ImportStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface ImportError {
  row: number;
  field?: string;
  message: string;
}

export interface ImportValidation {
  totalRows: number;
  detectedColumns: DetectedColumn[];
  fieldStats: Record<string, FieldStats>;
  errors: ImportError[];
  warnings: ImportError[];
  sampleRows: Record<string, any>[];
  isValid: boolean;
}

export interface DetectedColumn {
  column: string;
  field: string;
  confidence: number;
}

export interface FieldStats {
  filled: number;
  empty: number;
  invalid: number;
}

export interface ImportOptions {
  skipErrors: boolean;
  detectDuplicates: boolean;
  duplicateKey: string;
  chunkSize: number;
  presetId?: string;
}
