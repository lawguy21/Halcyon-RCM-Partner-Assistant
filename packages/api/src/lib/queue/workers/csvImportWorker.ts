/**
 * Halcyon RCM Partner Assistant - CSV Import Worker
 *
 * Background worker for processing CSV imports in batches.
 * Handles parsing, validation, duplicate detection, and batch inserts.
 */

import PgBoss from 'pg-boss';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import {
  CSVImportJobData,
  CSVImportJobResult,
  JOB_NAMES,
  ImportProgress,
  ImportError,
  createInitialProgress,
} from '../jobs.js';
import { setProgress, updateProgress, getProgress } from '../progressStore.js';

const prisma = new PrismaClient();

/**
 * Register the CSV import worker with pg-boss
 */
export async function registerCSVImportWorker(boss: PgBoss): Promise<void> {
  await boss.work<CSVImportJobData>(
    JOB_NAMES.CSV_IMPORT,
    { batchSize: 1 },
    async (jobs: PgBoss.Job<CSVImportJobData>[]) => {
      // Process one job at a time (batchSize: 1 means we get array with 1 job)
      for (const job of jobs) {
        const { importId, filePath, presetId, userId, organizationId, options } = job.data;
        const startTime = Date.now();

        console.log(`[CSV Import] Starting job ${job.id} for import ${importId}`);

      // Initialize progress
      const progress: ImportProgress = {
        ...createInitialProgress(importId),
        status: 'parsing',
        startedAt: new Date(),
      };
      setProgress(importId, progress);

      try {
        // Update import status in database
        await prisma.importHistory.update({
          where: { id: importId },
          data: { status: 'PROCESSING', startedAt: new Date() },
        });

        // Verify file exists
        if (!fs.existsSync(filePath)) {
          throw new Error(`Import file not found: ${filePath}`);
        }

        // Read and parse CSV file
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const lines = fileContent.split('\n').filter((line) => line.trim());

        if (lines.length < 2) {
          throw new Error('CSV file is empty or contains only headers');
        }

        progress.totalRows = Math.max(0, lines.length - 1); // Subtract header row
        updateProgress(importId, { totalRows: progress.totalRows });

        // Load preset mappings if specified
        let mappings: any[] = [];
        if (presetId) {
          const preset = await prisma.customPreset.findUnique({
            where: { id: presetId },
          });
          if (preset && preset.mappings) {
            mappings = preset.mappings as any[];
          }
        }

        // Parse CSV using file-exchange package
        const { importCSV } = await import('@halcyon-rcm/file-exchange');
        const parseResult = await importCSV(fileContent, {
          customMappings: mappings.length > 0 ? mappings : undefined,
          strictValidation: !options.skipErrors,
          onProgress: (processed: number, total: number) => {
            updateProgress(importId, {
              processedRows: processed,
              progressPercent: Math.round((processed / Math.max(total, 1)) * 50), // Parsing is 50% of progress
            });
          },
        });

        // Update with validated count
        updateProgress(importId, {
          status: 'validating',
          totalRows: parseResult.data.length,
        });

        // Duplicate detection
        const duplicateKeys = new Set<string>();
        const rowsToProcess: ProcessableRow[] = [];

        if (options.detectDuplicates && options.duplicateKey && options.duplicateKey.length > 0) {
          for (let i = 0; i < parseResult.data.length; i++) {
            const row = parseResult.data[i] as Record<string, unknown>;
            const keyValue = options.duplicateKey
              .map((k: string) => String(row[k] || ''))
              .join('|');

            if (duplicateKeys.has(keyValue)) {
              progress.skippedRows++;
              progress.errors.push({
                row: i + 2, // 1-based, +1 for header
                message: `Duplicate key: ${keyValue}`,
                severity: 'warning',
              });
            } else {
              duplicateKeys.add(keyValue);
              rowsToProcess.push({ ...row, _rowIndex: i + 2 });
            }
          }
        } else {
          rowsToProcess.push(
            ...parseResult.data.map((row, i) => ({
              ...row,
              _rowIndex: i + 2,
            }))
          );
        }

        updateProgress(importId, {
          skippedRows: progress.skippedRows,
          errors: progress.errors.slice(), // Copy array
        });

        // Validate only mode
        if (options.validateOnly) {
          await prisma.importHistory.update({
            where: { id: importId },
            data: {
              status: 'COMPLETED',
              completedAt: new Date(),
              totalRows: progress.totalRows,
              processedRows: rowsToProcess.length,
              successfulRows: 0,
              failedRows: progress.errors.filter((e) => e.severity === 'error').length,
              skippedRows: progress.skippedRows,
              errors: JSON.parse(JSON.stringify(progress.errors.slice(0, 1000))),
            },
          });

          updateProgress(importId, {
            status: 'completed',
            completedAt: new Date(),
          });

          return {
            success: true,
            importId,
            processedRows: rowsToProcess.length,
            successfulRows: 0,
            failedRows: 0,
            skippedRows: progress.skippedRows,
            errors: progress.errors,
            duration: Date.now() - startTime,
          };
        }

        // Process in chunks
        updateProgress(importId, { status: 'processing' });

        const chunkSize = options.chunkSize || 100;
        const chunks: ProcessableRow[][] = [];
        for (let i = 0; i < rowsToProcess.length; i += chunkSize) {
          chunks.push(rowsToProcess.slice(i, i + chunkSize));
        }
        progress.totalChunks = chunks.length;
        updateProgress(importId, { totalChunks: chunks.length });

        // Process each chunk
        for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
          const chunk = chunks[chunkIndex];
          progress.currentChunk = chunkIndex + 1;

          const chunkResult = await processChunk(
            chunk,
            importId,
            userId,
            organizationId,
            options.skipErrors
          );

          progress.successfulRows += chunkResult.successful;
          progress.failedRows += chunkResult.failed;
          progress.processedRows += chunk.length;
          progress.progressPercent = Math.round(
            50 + (progress.processedRows / progress.totalRows) * 50
          ); // 50-100% for processing
          progress.errors.push(...chunkResult.errors);

          // Update database with progress
          await prisma.importHistory.update({
            where: { id: importId },
            data: {
              processedRows: progress.processedRows,
              successfulRows: progress.successfulRows,
              failedRows: progress.failedRows,
              skippedRows: progress.skippedRows,
            },
          });

          // Calculate estimated time remaining
          if (progress.startedAt) {
            const elapsedMs = Date.now() - progress.startedAt.getTime();
            const rowsPerMs = progress.processedRows / elapsedMs;
            const remainingRows = progress.totalRows - progress.processedRows;
            progress.estimatedSecondsRemaining =
              rowsPerMs > 0 ? Math.round(remainingRows / rowsPerMs / 1000) : undefined;
          }

          updateProgress(importId, { ...progress });
        }

        // Finalize
        updateProgress(importId, { status: 'finalizing' });

        // Clean up uploaded file
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (cleanupError) {
          console.warn(`[CSV Import] Failed to clean up file: ${filePath}`, cleanupError);
        }

        // Determine final status
        const finalStatus =
          progress.failedRows === 0
            ? 'COMPLETED'
            : progress.successfulRows === 0
              ? 'FAILED'
              : 'COMPLETED'; // Partial success still counts as completed

        // Update final database status
        await prisma.importHistory.update({
          where: { id: importId },
          data: {
            status: finalStatus,
            completedAt: new Date(),
            totalRows: progress.totalRows,
            processedRows: progress.processedRows,
            successfulRows: progress.successfulRows,
            failedRows: progress.failedRows,
            skippedRows: progress.skippedRows,
            errors: JSON.parse(JSON.stringify(progress.errors.slice(0, 1000))), // Limit stored errors
          },
        });

        progress.status = 'completed';
        progress.completedAt = new Date();
        updateProgress(importId, progress);

        console.log(
          `[CSV Import] Job ${job.id} completed: ${progress.successfulRows} successful, ${progress.failedRows} failed`
        );

        return {
          success: progress.successfulRows > 0,
          importId,
          processedRows: progress.processedRows,
          successfulRows: progress.successfulRows,
          failedRows: progress.failedRows,
          skippedRows: progress.skippedRows,
          errors: progress.errors,
          duration: Date.now() - startTime,
        };
      } catch (error) {
        console.error(`[CSV Import] Job ${job.id} failed:`, error);

        progress.status = 'failed';
        progress.completedAt = new Date();
        progress.errors.push({
          row: 0,
          message: error instanceof Error ? error.message : 'Unknown error',
          severity: 'error',
        });

        updateProgress(importId, progress);

        // Update database with failure
        await prisma.importHistory.update({
          where: { id: importId },
          data: {
            status: 'FAILED',
            completedAt: new Date(),
            errors: JSON.parse(JSON.stringify(progress.errors.slice(0, 1000))),
          },
        });

        // Clean up file on failure
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (cleanupError) {
          console.warn(`[CSV Import] Failed to clean up file after error: ${filePath}`);
        }

        throw error;
      }
      } // end for loop
    }
  );

  console.log('[CSV Import] Worker registered');
}

/**
 * Type for row with internal index tracking
 */
interface ProcessableRow {
  [key: string]: unknown;
  _rowIndex: number;
}

/**
 * Result of processing a chunk
 */
interface ChunkResult {
  successful: number;
  failed: number;
  errors: ImportError[];
}

/**
 * Process a chunk of rows
 */
async function processChunk(
  rows: ProcessableRow[],
  importId: string,
  userId?: string,
  organizationId?: string,
  skipErrors = false
): Promise<ChunkResult> {
  const result: ChunkResult = {
    successful: 0,
    failed: 0,
    errors: [],
  };

  // Transform rows to assessment data
  const assessmentsToCreate: AssessmentCreateData[] = [];

  for (const row of rows) {
    try {
      const assessment = transformRowToAssessment(row, importId, userId, organizationId);
      assessmentsToCreate.push(assessment);
    } catch (error) {
      result.failed++;
      result.errors.push({
        row: row._rowIndex,
        message: error instanceof Error ? error.message : 'Transform error',
        severity: 'error',
      });
      if (!skipErrors) {
        throw error;
      }
    }
  }

  // Batch insert using createMany
  if (assessmentsToCreate.length > 0) {
    try {
      const createResult = await prisma.assessment.createMany({
        data: assessmentsToCreate,
        skipDuplicates: true,
      });
      result.successful = createResult.count;

      // If some were skipped due to duplicates
      const skipped = assessmentsToCreate.length - createResult.count;
      if (skipped > 0) {
        result.failed += skipped;
      }
    } catch (error) {
      // If batch fails, try individual inserts
      console.warn('[CSV Import] Batch insert failed, falling back to individual inserts');

      for (const assessment of assessmentsToCreate) {
        try {
          await prisma.assessment.create({ data: assessment });
          result.successful++;
        } catch (insertError) {
          result.failed++;
          result.errors.push({
            row: 0, // Individual inserts lose row tracking
            message: insertError instanceof Error ? insertError.message : 'Insert error',
            severity: 'error',
          });
        }
      }
    }
  }

  return result;
}

/**
 * Type for assessment creation data
 */
interface AssessmentCreateData {
  accountNumber: string | null;
  mrn: string | null;
  patientFirstName: string | null;
  patientLastName: string | null;
  patientDob: Date | null;
  patientState: string | null;
  encounterType: string;
  admissionDate: Date | null;
  dischargeDate: Date | null;
  totalCharges: number;
  facilityState: string;
  insuranceStatusOnDos: string;
  primaryRecoveryPath: string;
  overallConfidence: number;
  estimatedTotalRecovery: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'EXPORTED' | 'ARCHIVED';
  importId: string | null;
  userId: string | null;
  organizationId: string | null;
}

/**
 * Transform a CSV row to Assessment model data
 */
function transformRowToAssessment(
  row: ProcessableRow,
  importId: string,
  userId?: string,
  organizationId?: string
): AssessmentCreateData {
  // Helper to get value from row with multiple possible keys
  const getValue = (keys: string[]): string | undefined => {
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
        return String(row[key]);
      }
    }
    return undefined;
  };

  // Helper to parse date safely
  const parseDate = (value: unknown): Date | null => {
    if (!value) return null;
    const dateStr = String(value);
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  };

  // Helper to parse number safely
  const parseNumber = (value: unknown, defaultValue = 0): number => {
    if (!value) return defaultValue;
    const str = String(value).replace(/[$,]/g, '');
    const num = parseFloat(str);
    return isNaN(num) ? defaultValue : num;
  };

  return {
    accountNumber:
      getValue(['accountNumber', 'account_number', 'acct', 'account']) || null,
    mrn:
      getValue(['mrn', 'medical_record_number', 'medicalRecordNumber', 'MRN']) ||
      null,
    patientFirstName:
      getValue([
        'patientFirstName',
        'patient_first_name',
        'firstName',
        'first_name',
        'patFirstName',
      ]) || null,
    patientLastName:
      getValue([
        'patientLastName',
        'patient_last_name',
        'lastName',
        'last_name',
        'patLastName',
      ]) || null,
    patientDob: parseDate(
      getValue(['dateOfBirth', 'dob', 'date_of_birth', 'patientDob', 'birthDate'])
    ),
    patientState:
      getValue(['state', 'patientState', 'patient_state', 'patState']) || null,
    encounterType:
      getValue(['encounterType', 'encounter_type', 'type', 'visitType']) ||
      'outpatient',
    admissionDate: parseDate(
      getValue(['admitDate', 'admission_date', 'admissionDate', 'admit'])
    ),
    dischargeDate: parseDate(
      getValue(['dischargeDate', 'discharge_date', 'discharge'])
    ),
    totalCharges: parseNumber(
      getValue(['totalCharges', 'total_charges', 'charges', 'amount'])
    ),
    facilityState:
      getValue(['facilityState', 'facility_state', 'facState', 'state']) || 'TX',
    insuranceStatusOnDos:
      getValue([
        'insuranceStatus',
        'insurance_status',
        'payorStatus',
        'insuranceStatusOnDos',
      ]) || 'uninsured',
    primaryRecoveryPath: 'pending_assessment',
    overallConfidence: 0,
    estimatedTotalRecovery: 0,
    status: 'PENDING',
    importId: importId || null,
    userId: userId || null,
    organizationId: organizationId || null,
  };
}

/**
 * Get progress for an import (for external access)
 */
export function getImportProgress(importId: string): ImportProgress | undefined {
  return getProgress(importId);
}
