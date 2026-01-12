// @ts-nocheck
/**
 * Import Controller
 * Business logic for file import operations
 * Uses Prisma for database storage
 */

import {
  importCSV as fileExchangeImportCSV,
  previewCSV as fileExchangePreviewCSV,
  validateCSV as fileExchangeValidateCSV,
  detectColumnMappings,
  getPreset,
  listPresets,
} from '@halcyon-rcm/file-exchange';
import type {
  ColumnMapping,
  MappingPreset,
} from '@halcyon-rcm/file-exchange';
import { prisma } from '../lib/prisma.js';
import { assessmentController } from './assessmentController.js';
import type { StoredAssessment } from './assessmentController.js';
import type { HospitalRecoveryInput } from '@halcyon-rcm/core';

// Types for import history
export interface ImportHistoryEntry {
  id: string;
  filename: string;
  fileSize: number;
  rowCount: number;
  successCount: number;
  errorCount: number;
  presetUsed?: string;
  importedAt: Date;
  status: 'completed' | 'partial' | 'failed';
  errors?: Array<{ row: number; message: string }>;
  userId?: string;
  organizationId?: string;
}

export interface ImportOptions {
  presetId?: string;
  customMappings?: ColumnMapping[];
  skipErrors?: boolean;
  validateOnly?: boolean;
  userId?: string;
  organizationId?: string;
}

export interface CSVValidationResult {
  valid: boolean;
  rowCount: number;
  errors: Array<{
    row: number;
    column: string;
    message: string;
  }>;
  warnings: Array<{
    row: number;
    column: string;
    message: string;
  }>;
  columnStats: Record<string, {
    filled: number;
    empty: number;
    uniqueValues: number;
  }>;
}

export class ImportController {
  /**
   * Import CSV file content and create assessments
   */
  async importCSV(
    content: string,
    filename: string,
    fileSize: number,
    options: ImportOptions = {}
  ): Promise<{
    importId: string;
    assessments: StoredAssessment[];
    errors: Array<{ row: number; message: string }>;
    totalRows: number;
    successCount: number;
    errorCount: number;
  }> {
    const errors: Array<{ row: number; message: string }> = [];
    const assessments: StoredAssessment[] = [];

    // Create import history record first
    const importHistory = await prisma.importHistory.create({
      data: {
        filename,
        fileSize,
        rowCount: 0,
        successCount: 0,
        errorCount: 0,
        presetUsed: options.presetId || null,
        status: 'pending',
        userId: options.userId || null,
        organizationId: options.organizationId || null,
      },
    });

    const importId = importHistory.id;

    try {
      // Get preset mappings if specified
      let mappings: ColumnMapping[] = options.customMappings || [];
      if (options.presetId && !options.customMappings) {
        const preset = getPreset(options.presetId);
        if (preset) {
          mappings = preset.mappings;
        }
      }

      // Import and transform CSV data
      const importResult = await fileExchangeImportCSV(content, {
        customMappings: mappings.length > 0 ? mappings : undefined,
        strictValidation: !(options.skipErrors ?? true),
      });

      // Process assessments in a transaction
      await prisma.$transaction(async (tx) => {
        for (let i = 0; i < importResult.data.length; i++) {
          try {
            const row = importResult.data[i];
            const recoveryInput = this.transformToRecoveryInput(row);

            // Create assessment with import reference
            const assessment = await assessmentController.createAssessment(recoveryInput, {
              patientIdentifier: row.patientId || row.patient_id || row.mrn,
              accountNumber: row.accountNumber || row.account_number || row.encounter_id,
              userId: options.userId,
              organizationId: options.organizationId,
            });

            // Link to this import
            await tx.assessment.update({
              where: { id: assessment.id },
              data: { importId },
            });

            assessments.push({ ...assessment, importId });
          } catch (error) {
            errors.push({
              row: i + 2, // Account for header row and 1-based indexing
              message: error instanceof Error ? error.message : 'Unknown error processing row',
            });
          }
        }
      });

      // Add any import-level errors
      if (importResult.errors) {
        errors.push(...importResult.errors.map((e) => ({
          row: e.row || 0,
          message: e.message,
        })));
      }

      // Determine status
      const status = errors.length === 0 ? 'completed' : assessments.length > 0 ? 'partial' : 'failed';

      // Update import history with results
      await prisma.importHistory.update({
        where: { id: importId },
        data: {
          rowCount: importResult.totalRows,
          successCount: assessments.length,
          errorCount: errors.length,
          status,
          errors: errors.length > 0 ? errors : undefined,
        },
      });

      console.log(`[Import] Completed import ${importId} - ${assessments.length} successful, ${errors.length} errors`);

      return {
        importId,
        assessments,
        errors,
        totalRows: importResult.totalRows,
        successCount: assessments.length,
        errorCount: errors.length,
      };
    } catch (error) {
      // Update import history with failure
      await prisma.importHistory.update({
        where: { id: importId },
        data: {
          status: 'failed',
          errorCount: 1,
          errors: [{
            row: 0,
            message: error instanceof Error ? error.message : 'Import failed',
          }],
        },
      });

      console.error(`[Import] Failed import ${importId}:`, error);
      throw error;
    }
  }

  /**
   * Preview CSV file with detected columns (first 10 rows)
   */
  async previewCSV(
    content: string,
    presetId?: string
  ): Promise<{
    headers: string[];
    rows: Record<string, unknown>[];
    rowCount: number;
    detectedMappings: ReturnType<typeof detectColumnMappings>;
    suggestedPreset?: MappingPreset;
  }> {
    const preview = fileExchangePreviewCSV(content, 10);

    // Detect column mappings
    const detectedMappings = detectColumnMappings(preview.columns);

    // Find best matching preset if not specified
    let suggestedPreset: MappingPreset | undefined;
    if (!presetId) {
      const presets = listPresets();
      // Simple matching: find preset with most matching column names
      let bestMatch = { preset: undefined as MappingPreset | undefined, score: 0 };

      for (const preset of presets) {
        const mappedColumns = preset.mappings.map((m) => m.sourceColumn.toLowerCase());
        const headerSet = new Set(preview.columns.map((h: string) => h.toLowerCase()));
        const matches = mappedColumns.filter((col) => headerSet.has(col)).length;

        if (matches > bestMatch.score) {
          bestMatch = { preset, score: matches };
        }
      }

      if (bestMatch.score >= 3) {
        suggestedPreset = bestMatch.preset;
      }
    } else {
      suggestedPreset = getPreset(presetId) || undefined;
    }

    return {
      headers: preview.columns,
      rows: preview.previewRows as Record<string, unknown>[],
      rowCount: preview.totalRows,
      detectedMappings,
      suggestedPreset,
    };
  }

  /**
   * Validate CSV without importing
   */
  async validateCSV(
    content: string,
    presetId?: string,
    customMappings?: ColumnMapping[]
  ): Promise<CSVValidationResult> {
    let mappings: ColumnMapping[] = customMappings || [];
    if (presetId && !customMappings) {
      const preset = getPreset(presetId);
      if (preset) {
        mappings = preset.mappings;
      }
    }

    const validation = fileExchangeValidateCSV(content, {
      preset: presetId,
      customMappings: mappings.length > 0 ? mappings : undefined,
    });

    // Build column statistics by parsing the content
    const columnStats: Record<string, { filled: number; empty: number; uniqueValues: number }> = {};

    // Parse to get row data for stats
    const preview = fileExchangePreviewCSV(content, 1000); // Get up to 1000 rows for stats

    if (preview.previewRows && preview.previewRows.length > 0) {
      const headers = preview.columns;
      for (const header of headers) {
        const values = preview.previewRows.map((row) => (row as Record<string, unknown>)[header]);
        const filled = values.filter((v) => v !== null && v !== undefined && v !== '').length;
        const uniqueSet = new Set(values.filter((v) => v !== null && v !== undefined && v !== ''));

        columnStats[header] = {
          filled,
          empty: values.length - filled,
          uniqueValues: uniqueSet.size,
        };
      }
    }

    return {
      valid: validation.valid,
      rowCount: validation.rowCount,
      errors: validation.errors.map((e) => ({
        row: e.row,
        column: e.column,
        message: e.message,
      })),
      warnings: validation.warnings.map((w) => ({
        row: 0,
        column: '',
        message: w,
      })),
      columnStats,
    };
  }

  /**
   * Get import history with pagination and filters
   */
  async getImportHistory(options: {
    limit?: number;
    offset?: number;
    status?: 'completed' | 'partial' | 'failed';
    startDate?: string;
    endDate?: string;
    userId?: string;
    organizationId?: string;
  } = {}): Promise<{
    data: ImportHistoryEntry[];
    total: number;
  }> {
    const where: any = {};

    if (options.status) {
      where.status = options.status;
    }

    if (options.startDate) {
      where.importedAt = { ...where.importedAt, gte: new Date(options.startDate) };
    }

    if (options.endDate) {
      where.importedAt = { ...where.importedAt, lte: new Date(options.endDate) };
    }

    if (options.userId) {
      where.userId = options.userId;
    }

    if (options.organizationId) {
      where.organizationId = options.organizationId;
    }

    const limit = options.limit || 50;
    const offset = options.offset || 0;

    const [total, imports] = await Promise.all([
      prisma.importHistory.count({ where }),
      prisma.importHistory.findMany({
        where,
        orderBy: { importedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
    ]);

    return {
      data: imports.map((i) => this.toImportHistoryEntry(i)),
      total,
    };
  }

  /**
   * Get single import history entry
   */
  async getImportById(id: string): Promise<ImportHistoryEntry | null> {
    const importRecord = await prisma.importHistory.findUnique({
      where: { id },
    });

    if (!importRecord) {
      return null;
    }

    return this.toImportHistoryEntry(importRecord);
  }

  /**
   * Delete an import and optionally its associated assessments
   */
  async deleteImport(id: string, deleteAssessments: boolean = false): Promise<boolean> {
    try {
      if (deleteAssessments) {
        // Delete all assessments associated with this import
        await assessmentController.deleteAssessmentsByImportId(id);
      }

      // Delete the import history record
      await prisma.importHistory.delete({
        where: { id },
      });

      console.log(`[Import] Deleted import ${id} (assessments: ${deleteAssessments ? 'deleted' : 'kept'})`);
      return true;
    } catch (error) {
      if (error?.code === 'P2025') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Transform imported row to HospitalRecoveryInput
   */
  private transformToRecoveryInput(row: Record<string, unknown>): HospitalRecoveryInput {
    // Map common field names to expected fields
    const getField = (names: string[]): unknown => {
      for (const name of names) {
        if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
          return row[name];
        }
      }
      return undefined;
    };

    const getStringField = (names: string[], defaultValue: string): string => {
      const value = getField(names);
      return typeof value === 'string' ? value : defaultValue;
    };

    const getNumberField = (names: string[], defaultValue: number): number => {
      const value = getField(names);
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        const parsed = parseFloat(value.replace(/[,$]/g, ''));
        return isNaN(parsed) ? defaultValue : parsed;
      }
      return defaultValue;
    };

    // Parse insurance status
    const parseInsuranceStatus = (value: unknown): HospitalRecoveryInput['insuranceStatusOnDOS'] => {
      const str = String(value || '').toLowerCase();
      if (str.includes('medicaid')) return 'medicaid';
      if (str.includes('medicare')) return 'medicare';
      if (str.includes('commercial') || str.includes('private')) return 'commercial';
      if (str.includes('under')) return 'underinsured';
      return 'uninsured';
    };

    // Parse income bracket
    const parseIncomeBracket = (value: unknown): HospitalRecoveryInput['householdIncome'] => {
      const str = String(value || '').toLowerCase();
      if (str.includes('under') || str.includes('below') || str.includes('<')) return 'under_fpl';
      if (str.includes('138') || str.includes('1.38')) return 'fpl_138';
      if (str.includes('200') || str.includes('2.0')) return 'fpl_200';
      if (str.includes('250') || str.includes('2.5')) return 'fpl_250';
      if (str.includes('300') || str.includes('3.0')) return 'fpl_300';
      if (str.includes('400') || str.includes('4.0')) return 'fpl_400';
      if (str.includes('over') || str.includes('above') || str.includes('>')) return 'over_400_fpl';
      return 'fpl_200'; // Default
    };

    // Parse encounter type
    const parseEncounterType = (value: unknown): HospitalRecoveryInput['encounterType'] => {
      const str = String(value || '').toLowerCase();
      if (str.includes('inpatient') || str.includes('ip')) return 'inpatient';
      if (str.includes('observation') || str.includes('obs')) return 'observation';
      if (str.includes('ed') || str.includes('emergency') || str.includes('er')) return 'ed';
      return 'outpatient';
    };

    // Build the input object
    return {
      stateOfResidence: getStringField(['stateOfResidence', 'state_of_residence', 'state', 'patientState', 'patient_state'], 'CA'),
      stateOfService: getStringField(['stateOfService', 'state_of_service', 'serviceState', 'service_state', 'facilityState', 'facility_state'], 'CA'),
      dateOfService: getStringField(['dateOfService', 'date_of_service', 'dos', 'serviceDate', 'service_date', 'admitDate', 'admit_date'], new Date().toISOString().split('T')[0]),
      encounterType: parseEncounterType(getField(['encounterType', 'encounter_type', 'visitType', 'visit_type', 'patientType', 'patient_type'])),
      lengthOfStay: getNumberField(['lengthOfStay', 'length_of_stay', 'los', 'days'], 1),
      totalCharges: getNumberField(['totalCharges', 'total_charges', 'charges', 'balance', 'amount', 'totalAmount', 'total_amount'], 0),
      insuranceStatusOnDOS: parseInsuranceStatus(getField(['insuranceStatus', 'insurance_status', 'insuranceStatusOnDOS', 'insurance', 'payer', 'payerType', 'payer_type'])),
      highCostSharing: Boolean(getField(['highCostSharing', 'high_cost_sharing', 'highDeductible', 'high_deductible'])),
      medicaidStatus: getStringField(['medicaidStatus', 'medicaid_status', 'medicaid'], 'unknown') as HospitalRecoveryInput['medicaidStatus'],
      medicareStatus: getStringField(['medicareStatus', 'medicare_status', 'medicare'], 'none') as HospitalRecoveryInput['medicareStatus'],
      ssiStatus: getStringField(['ssiStatus', 'ssi_status', 'ssi'], 'unknown') as HospitalRecoveryInput['ssiStatus'],
      ssdiStatus: getStringField(['ssdiStatus', 'ssdi_status', 'ssdi'], 'unknown') as HospitalRecoveryInput['ssdiStatus'],
      householdIncome: parseIncomeBracket(getField(['householdIncome', 'household_income', 'income', 'incomeBracket', 'income_bracket', 'fpl', 'fplPercent', 'fpl_percent'])),
      householdSize: getNumberField(['householdSize', 'household_size', 'familySize', 'family_size'], 1),
      estimatedAssets: getStringField(['estimatedAssets', 'estimated_assets', 'assets'], 'unknown') as HospitalRecoveryInput['estimatedAssets'],
      disabilityLikelihood: getStringField(['disabilityLikelihood', 'disability_likelihood', 'disability'], 'low') as HospitalRecoveryInput['disabilityLikelihood'],
      ssiEligibilityLikely: Boolean(getField(['ssiEligibilityLikely', 'ssi_eligibility_likely', 'ssiEligible', 'ssi_eligible'])),
      ssdiEligibilityLikely: Boolean(getField(['ssdiEligibilityLikely', 'ssdi_eligibility_likely', 'ssdiEligible', 'ssdi_eligible'])),
      facilityType: getStringField(['facilityType', 'facility_type', 'hospitalType', 'hospital_type'], 'standard') as HospitalRecoveryInput['facilityType'],
      facilityState: getStringField(['facilityState', 'facility_state', 'stateOfService', 'state_of_service'], 'CA'),
      emergencyService: Boolean(getField(['emergencyService', 'emergency_service', 'emergency', 'isEmergency', 'is_emergency']) ?? true),
      medicallyNecessary: Boolean(getField(['medicallyNecessary', 'medically_necessary', 'medNecessary', 'med_necessary']) ?? true),
    };
  }

  /**
   * Convert Prisma ImportHistory to ImportHistoryEntry
   */
  private toImportHistoryEntry(record: any): ImportHistoryEntry {
    return {
      id: record.id,
      filename: record.filename,
      fileSize: record.fileSize,
      rowCount: record.rowCount,
      successCount: record.successCount,
      errorCount: record.errorCount,
      presetUsed: record.presetUsed || undefined,
      importedAt: record.importedAt,
      status: record.status,
      errors: record.errors || undefined,
      userId: record.userId || undefined,
      organizationId: record.organizationId || undefined,
    };
  }

  /**
   * Clear import history (for testing)
   */
  async clearHistory(): Promise<void> {
    await prisma.importHistory.deleteMany({});
    console.log('[Import] Cleared all import history');
  }
}

// Export singleton instance
export const importController = new ImportController();
