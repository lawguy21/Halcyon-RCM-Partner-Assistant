/**
 * Halcyon RCM Partner Assistant - File Exchange Package
 *
 * A comprehensive CSV import/export library with column mapping,
 * transformation, and preset management capabilities.
 *
 * @packageDocumentation
 */

// =============================================================================
// Types
// =============================================================================

export type {
  ColumnMapping,
  MappingPreset,
  ImportOptions,
  ImportError,
  ImportResult,
  ExportOptions,
  ExportResult,
  PreviewResult,
  ColumnDetectionResult,
  StandardField,
  ColumnPattern,
} from './types';

// =============================================================================
// Column Mapper
// =============================================================================

export {
  // Transform functions
  transforms,
  applyTransform,
  applyMappings,

  // Validation
  validateRow,
  validateTransformedValue,

  // Column detection
  detectColumnMappings,
  addSampleValues,
  createMappingsFromDetection,

  // Mapping utilities
  mergeMappings,
  getUnmappedColumns,
  validateMappings,

  // Patterns
  COLUMN_PATTERNS,
} from './column-mapper';

// =============================================================================
// CSV Import
// =============================================================================

export {
  // Core import functions
  parseCSV,
  importCSV,
  importCSVFile,
  importCSVStream,

  // Preview and validation
  previewCSV,
  validateCSV,

  // Utilities
  detectDelimiter,
} from './csv-import';

// =============================================================================
// CSV Export
// =============================================================================

export {
  // Core export functions
  exportToCSV,
  exportWorklist,
  exportExecutiveSummary,
  exportCustom,

  // Browser helpers
  createCSVBlob,
  downloadCSV,
  exportAndDownload,

  // Formatting
  formatDate,
  formatCurrency,
  formatPhone,
  formatValue,

  // Utilities
  sortData,

  // Constants
  FORMAT_COLUMNS,
  COLUMN_HEADERS,
} from './csv-export';

// =============================================================================
// Preset Management
// =============================================================================

export {
  // Core preset functions
  getPreset,
  listPresets,
  getPresetsByVendor,
  searchPresets,

  // Preset registration
  registerPreset,
  unregisterPreset,
  resetPresetRegistry,

  // Preset loading
  loadPresetFromJSON,
  loadPresetFromString,
  loadAndRegisterPreset,
  exportPresetToJSON,

  // localStorage functions (browser)
  savePresetToLocalStorage,
  loadPresetFromLocalStorage,
  listLocalStoragePresets,
  deletePresetFromLocalStorage,
  loadAllLocalStoragePresets,

  // Preset creation
  createPreset,
  clonePreset,
  suggestPreset,
} from './preset-loader';

// =============================================================================
// Default Presets
// =============================================================================

export {
  DEFAULT_PRESETS,
  GENERIC_SELF_PAY_PRESET,
  R1_RCM_SELF_PAY_PRESET,
  EPIC_RESOLUTE_PRESET,
  ENSEMBLE_STANDARD_PRESET,
  CERNER_REVENUE_CYCLE_PRESET,
  MEDITECH_EXPANSE_PRESET,
  ATHENA_HEALTH_PRESET,
  TAB_DELIMITED_PRESET,
  getDefaultPreset,
  getDefaultPresetsByVendor,
} from './presets/default-presets';

// =============================================================================
// Version
// =============================================================================

export const VERSION = '1.0.0';
