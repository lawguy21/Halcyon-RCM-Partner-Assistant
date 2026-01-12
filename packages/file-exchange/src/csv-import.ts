/**
 * Halcyon RCM Partner Assistant - CSV Import
 *
 * CSV import functionality using Papa Parse.
 * Handles parsing, preview, delimiter detection, and progress callbacks.
 */

import Papa, { ParseResult, ParseConfig } from 'papaparse';
import {
  ColumnMapping,
  ImportOptions,
  ImportResult,
  ImportError,
  MappingPreset,
  PreviewResult,
} from './types';
import {
  applyMappings,
  validateRow,
  validateTransformedValue,
  detectColumnMappings,
  addSampleValues,
  createMappingsFromDetection,
} from './column-mapper';
import { getPreset } from './preset-loader';

/**
 * Delimiter detection configuration
 */
const DELIMITERS = [',', '\t', '|', ';'] as const;
type Delimiter = (typeof DELIMITERS)[number];

/**
 * Detect the delimiter used in a CSV string
 */
export function detectDelimiter(content: string, sampleLines: number = 5): Delimiter {
  const lines = content.split(/\r?\n/).slice(0, sampleLines).filter((l) => l.trim());

  if (lines.length === 0) return ',';

  const scores: Record<Delimiter, number> = { ',': 0, '\t': 0, '|': 0, ';': 0 };

  for (const delimiter of DELIMITERS) {
    const counts = lines.map((line) => {
      // Count occurrences outside of quoted strings
      let count = 0;
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '"' && (i === 0 || line[i - 1] !== '\\')) {
          inQuotes = !inQuotes;
        } else if (line[i] === delimiter && !inQuotes) {
          count++;
        }
      }
      return count;
    });

    // Check if all lines have the same count (consistency)
    const firstCount = counts[0];
    const isConsistent = counts.every((c) => c === firstCount);

    if (isConsistent && firstCount > 0) {
      // Score based on count and consistency
      scores[delimiter] = firstCount * 10 + (isConsistent ? 5 : 0);
    }
  }

  // Return delimiter with highest score
  let bestDelimiter: Delimiter = ',';
  let bestScore = 0;

  for (const [delimiter, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestDelimiter = delimiter as Delimiter;
    }
  }

  return bestDelimiter;
}

/**
 * Parse CSV content using Papa Parse
 */
export function parseCSV(
  content: string,
  options: {
    delimiter?: Delimiter;
    header?: boolean;
    skipRows?: number;
    preview?: number;
  } = {}
): ParseResult<Record<string, string>> {
  const config: ParseConfig = {
    delimiter: options.delimiter || detectDelimiter(content),
    header: options.header !== false,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim(),
    transform: (value: string) => value.trim(),
  };

  // If skipping rows, we need to remove them from content first
  let processedContent = content;
  if (options.skipRows && options.skipRows > 0) {
    const lines = content.split(/\r?\n/);
    processedContent = lines.slice(options.skipRows).join('\n');
  }

  // Add preview limit if specified
  if (options.preview) {
    config.preview = options.preview;
  }

  return Papa.parse(processedContent, config);
}

/**
 * Preview first N rows of a CSV file
 */
export function previewCSV(
  content: string,
  rowCount: number = 10,
  options: {
    delimiter?: Delimiter;
    skipRows?: number;
  } = {}
): PreviewResult {
  const delimiter = options.delimiter || detectDelimiter(content);

  // Parse for preview
  const parseResult = parseCSV(content, {
    delimiter,
    header: true,
    skipRows: options.skipRows,
    preview: rowCount,
  });

  // Count total rows (excluding header)
  const allLines = content.split(/\r?\n/).filter((l) => l.trim());
  const totalRows = Math.max(0, allLines.length - 1 - (options.skipRows || 0));

  // Detect column mappings
  const columns = parseResult.meta.fields || [];
  const detectionResults = detectColumnMappings(columns);
  const detectionWithSamples = addSampleValues(detectionResults, parseResult.data);

  // Find suggested preset
  let suggestedPreset: string | undefined;
  const matchedFields = detectionWithSamples.filter((d) => d.confidence > 0.7);
  if (matchedFields.length >= 3) {
    // We have enough matches to suggest auto-mapping
    suggestedPreset = 'auto-detect';
  }

  // Collect any parsing issues
  const issues: string[] = [];
  if (parseResult.errors.length > 0) {
    for (const error of parseResult.errors.slice(0, 5)) {
      issues.push(`Row ${error.row}: ${error.message}`);
    }
  }

  return {
    previewRows: parseResult.data,
    columns,
    detectedDelimiter: delimiter,
    suggestedPreset,
    totalRows,
    issues,
  };
}

/**
 * Import CSV with full mapping and transformation
 */
export async function importCSV(
  content: string,
  options: ImportOptions = {}
): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    totalRows: 0,
    processedRows: 0,
    skippedRows: 0,
    errors: [],
    data: [],
    warnings: [],
  };

  try {
    // Resolve preset if provided
    let preset: MappingPreset | undefined;
    if (typeof options.preset === 'string') {
      preset = getPreset(options.preset);
      if (!preset) {
        result.warnings.push(`Preset "${options.preset}" not found, using auto-detection`);
      } else {
        result.usedPreset = options.preset;
      }
    } else if (options.preset) {
      preset = options.preset;
      result.usedPreset = preset.id;
    }

    // Determine parsing options
    const delimiter = options.delimiter || preset?.delimiter || detectDelimiter(content);
    const skipRows = (options.skipRows || 0) + (preset?.skipHeaderRows || 0);

    // Parse CSV
    const parseResult = parseCSV(content, {
      delimiter,
      header: true,
      skipRows,
    });

    if (parseResult.errors.length > 0) {
      for (const error of parseResult.errors) {
        result.errors.push({
          row: error.row || 0,
          column: '',
          value: '',
          message: error.message,
          severity: 'warning',
        });
      }
    }

    const rows = parseResult.data;
    const columns = parseResult.meta.fields || [];
    result.detectedColumns = columns;
    result.totalRows = rows.length;

    // Determine mappings
    let mappings: ColumnMapping[] = [];
    if (preset) {
      mappings = preset.mappings;
    }
    if (options.customMappings) {
      // Custom mappings override preset mappings
      const customTargets = new Set(options.customMappings.map((m) => m.targetField));
      mappings = [
        ...mappings.filter((m) => !customTargets.has(m.targetField)),
        ...options.customMappings,
      ];
    }
    if (mappings.length === 0) {
      // Auto-detect mappings
      const detected = detectColumnMappings(columns);
      mappings = createMappingsFromDetection(detected);
      result.warnings.push('Using auto-detected column mappings');
    }

    // Validate that required mappings exist
    const requiredMissing = mappings
      .filter((m) => m.required)
      .filter((m) => !columns.includes(m.sourceColumn));

    for (const mapping of requiredMissing) {
      result.warnings.push(
        `Required mapping "${mapping.targetField}" references missing column "${mapping.sourceColumn}"`
      );
    }

    // Apply max rows limit
    const maxRows = options.maxRows || rows.length;
    const rowsToProcess = rows.slice(0, maxRows);

    // Process each row
    const dateFormat = preset?.dateFormat;
    const currencyFormat = preset?.currencyFormat || 'decimal';

    for (let i = 0; i < rowsToProcess.length; i++) {
      const row = rowsToProcess[i];
      const rowNumber = i + 1 + skipRows; // 1-based, accounting for skipped rows

      try {
        // Apply mappings
        const mappedRow = applyMappings(row, mappings, { dateFormat, currencyFormat });

        // Validate required fields
        const validationErrors = validateRow(mappedRow, mappings, rowNumber);

        // Validate transformed values
        for (const mapping of mappings) {
          const value = mappedRow[mapping.targetField];
          const transformError = validateTransformedValue(value, mapping, rowNumber);
          if (transformError) {
            validationErrors.push(transformError);
          }
        }

        if (validationErrors.length > 0) {
          // Check if any are actual errors (not just warnings)
          const hasErrors = validationErrors.some((e) => e.severity === 'error');

          if (hasErrors && options.strictValidation) {
            result.errors.push(...validationErrors);
            result.skippedRows++;
          } else {
            // Add warnings but still include the row
            result.errors.push(...validationErrors.filter((e) => e.severity === 'warning'));
            result.data.push(mappedRow);
            result.processedRows++;
          }
        } else {
          result.data.push(mappedRow);
          result.processedRows++;
        }
      } catch (err) {
        result.errors.push({
          row: rowNumber,
          column: '',
          value: '',
          message: `Error processing row: ${err instanceof Error ? err.message : String(err)}`,
          severity: 'error',
        });
        result.skippedRows++;
      }

      // Report progress
      if (options.onProgress && (i % 100 === 0 || i === rowsToProcess.length - 1)) {
        options.onProgress(i + 1, rowsToProcess.length);
      }
    }

    result.success = result.processedRows > 0;

    // Add summary warning if rows were skipped
    if (result.skippedRows > 0) {
      result.warnings.push(`${result.skippedRows} rows were skipped due to errors`);
    }
  } catch (err) {
    result.errors.push({
      row: 0,
      column: '',
      value: '',
      message: `Import failed: ${err instanceof Error ? err.message : String(err)}`,
      severity: 'error',
    });
  }

  return result;
}

/**
 * Import CSV from a File object (browser environment)
 */
export function importCSVFile(
  file: File,
  options: ImportOptions = {}
): Promise<ImportResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const result = await importCSV(content, options);
      resolve(result);
    };

    reader.onerror = () => {
      resolve({
        success: false,
        totalRows: 0,
        processedRows: 0,
        skippedRows: 0,
        errors: [
          {
            row: 0,
            column: '',
            value: '',
            message: `Failed to read file: ${reader.error?.message || 'Unknown error'}`,
            severity: 'error',
          },
        ],
        data: [],
        warnings: [],
      });
    };

    reader.readAsText(file);
  });
}

/**
 * Stream import for large files (Node.js environment)
 * Uses Papa Parse's streaming capabilities
 */
export function importCSVStream(
  readableStream: NodeJS.ReadableStream,
  options: ImportOptions = {}
): Promise<ImportResult> {
  return new Promise((resolve) => {
    const result: ImportResult = {
      success: false,
      totalRows: 0,
      processedRows: 0,
      skippedRows: 0,
      errors: [],
      data: [],
      warnings: [],
    };

    let mappings: ColumnMapping[] = options.customMappings || [];
    let columns: string[] = [];
    let rowIndex = 0;
    let preset: MappingPreset | undefined;

    // Resolve preset
    if (typeof options.preset === 'string') {
      preset = getPreset(options.preset);
      if (preset) {
        mappings = preset.mappings;
        result.usedPreset = options.preset;
      }
    } else if (options.preset) {
      preset = options.preset;
      mappings = preset.mappings;
      result.usedPreset = preset.id;
    }

    const skipRows = (options.skipRows || 0) + (preset?.skipHeaderRows || 0);
    const maxRows = options.maxRows || Infinity;

    Papa.parse(readableStream, {
      header: true,
      skipEmptyLines: true,
      step: (results: Papa.ParseStepResult<Record<string, string>>) => {
        rowIndex++;

        // Skip initial rows if needed
        if (rowIndex <= skipRows) return;

        // Check max rows
        if (result.processedRows >= maxRows) return;

        result.totalRows++;

        // On first data row, detect columns and maybe auto-map
        if (columns.length === 0 && results.meta.fields) {
          columns = results.meta.fields;
          result.detectedColumns = columns;

          if (mappings.length === 0) {
            const detected = detectColumnMappings(columns);
            mappings = createMappingsFromDetection(detected);
            result.warnings.push('Using auto-detected column mappings');
          }
        }

        try {
          const mappedRow = applyMappings(results.data, mappings, {
            dateFormat: preset?.dateFormat,
            currencyFormat: preset?.currencyFormat,
          });

          const validationErrors = validateRow(mappedRow, mappings, rowIndex);

          if (validationErrors.length > 0 && options.strictValidation) {
            result.errors.push(...validationErrors);
            result.skippedRows++;
          } else {
            result.data.push(mappedRow);
            result.processedRows++;
          }
        } catch (err) {
          result.errors.push({
            row: rowIndex,
            column: '',
            value: '',
            message: `Error processing row: ${err instanceof Error ? err.message : String(err)}`,
            severity: 'error',
          });
          result.skippedRows++;
        }

        // Report progress periodically
        if (options.onProgress && result.totalRows % 100 === 0) {
          options.onProgress(result.totalRows, -1); // -1 indicates unknown total
        }
      },
      complete: () => {
        result.success = result.processedRows > 0;
        if (options.onProgress) {
          options.onProgress(result.totalRows, result.totalRows);
        }
        resolve(result);
      },
      error: (error: Error) => {
        result.errors.push({
          row: 0,
          column: '',
          value: '',
          message: `Stream parsing failed: ${error.message}`,
          severity: 'error',
        });
        resolve(result);
      },
    });
  });
}

/**
 * Validate CSV content without importing
 */
export function validateCSV(
  content: string,
  options: {
    preset?: string | MappingPreset;
    customMappings?: ColumnMapping[];
    skipRows?: number;
  } = {}
): {
  valid: boolean;
  errors: ImportError[];
  warnings: string[];
  columns: string[];
  rowCount: number;
} {
  const result = {
    valid: true,
    errors: [] as ImportError[],
    warnings: [] as string[],
    columns: [] as string[],
    rowCount: 0,
  };

  try {
    // Parse without full import
    const parseResult = parseCSV(content, {
      header: true,
      skipRows: options.skipRows,
    });

    result.columns = parseResult.meta.fields || [];
    result.rowCount = parseResult.data.length;

    // Check for parse errors
    if (parseResult.errors.length > 0) {
      result.valid = false;
      for (const error of parseResult.errors) {
        result.errors.push({
          row: error.row || 0,
          column: '',
          value: '',
          message: error.message,
          severity: 'error',
        });
      }
    }

    // Resolve mappings
    let mappings: ColumnMapping[] = [];
    if (typeof options.preset === 'string') {
      const preset = getPreset(options.preset);
      if (preset) {
        mappings = preset.mappings;
      } else {
        result.warnings.push(`Preset "${options.preset}" not found`);
      }
    } else if (options.preset) {
      mappings = options.preset.mappings;
    }
    if (options.customMappings) {
      mappings = [...mappings, ...options.customMappings];
    }

    // Validate required columns exist
    for (const mapping of mappings) {
      if (mapping.required && !result.columns.includes(mapping.sourceColumn)) {
        result.valid = false;
        result.errors.push({
          row: 0,
          column: mapping.sourceColumn,
          value: '',
          message: `Required column "${mapping.sourceColumn}" not found`,
          severity: 'error',
        });
      }
    }

    // Check for empty file
    if (result.rowCount === 0) {
      result.valid = false;
      result.errors.push({
        row: 0,
        column: '',
        value: '',
        message: 'CSV file contains no data rows',
        severity: 'error',
      });
    }
  } catch (err) {
    result.valid = false;
    result.errors.push({
      row: 0,
      column: '',
      value: '',
      message: `Validation failed: ${err instanceof Error ? err.message : String(err)}`,
      severity: 'error',
    });
  }

  return result;
}
