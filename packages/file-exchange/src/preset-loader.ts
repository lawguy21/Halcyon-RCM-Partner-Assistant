/**
 * Halcyon RCM Partner Assistant - Preset Loader
 *
 * Load and manage mapping presets for different vendor formats.
 */

import { MappingPreset, ColumnMapping } from './types';
import { DEFAULT_PRESETS } from './presets/default-presets';

/**
 * Registry of loaded presets
 */
const presetRegistry = new Map<string, MappingPreset>();

/**
 * Initialize the preset registry with default presets
 */
function initializeRegistry(): void {
  if (presetRegistry.size === 0) {
    for (const preset of DEFAULT_PRESETS) {
      presetRegistry.set(preset.id, preset);
    }
  }
}

/**
 * Get a preset by ID
 */
export function getPreset(id: string): MappingPreset | undefined {
  initializeRegistry();
  return presetRegistry.get(id);
}

/**
 * Get all available presets
 */
export function listPresets(): MappingPreset[] {
  initializeRegistry();
  return Array.from(presetRegistry.values());
}

/**
 * Get presets filtered by vendor
 */
export function getPresetsByVendor(vendor: string): MappingPreset[] {
  initializeRegistry();
  return Array.from(presetRegistry.values()).filter(
    (p) => p.vendor.toLowerCase() === vendor.toLowerCase()
  );
}

/**
 * Search presets by name or description
 */
export function searchPresets(query: string): MappingPreset[] {
  initializeRegistry();
  const lowerQuery = query.toLowerCase();
  return Array.from(presetRegistry.values()).filter(
    (p) =>
      p.name.toLowerCase().includes(lowerQuery) ||
      p.description.toLowerCase().includes(lowerQuery) ||
      p.vendor.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Register a custom preset
 */
export function registerPreset(preset: MappingPreset): void {
  initializeRegistry();

  // Validate preset
  if (!preset.id) {
    throw new Error('Preset must have an id');
  }
  if (!preset.name) {
    throw new Error('Preset must have a name');
  }
  if (!preset.mappings || preset.mappings.length === 0) {
    throw new Error('Preset must have at least one mapping');
  }

  presetRegistry.set(preset.id, preset);
}

/**
 * Remove a preset from the registry
 */
export function unregisterPreset(id: string): boolean {
  initializeRegistry();
  return presetRegistry.delete(id);
}

/**
 * Load a preset from a JSON object
 */
export function loadPresetFromJSON(json: unknown): MappingPreset {
  if (!json || typeof json !== 'object') {
    throw new Error('Invalid preset JSON: must be an object');
  }

  const obj = json as Record<string, unknown>;

  // Validate required fields
  if (typeof obj.id !== 'string' || !obj.id) {
    throw new Error('Invalid preset JSON: missing or invalid "id"');
  }
  if (typeof obj.name !== 'string' || !obj.name) {
    throw new Error('Invalid preset JSON: missing or invalid "name"');
  }
  if (!Array.isArray(obj.mappings)) {
    throw new Error('Invalid preset JSON: missing or invalid "mappings"');
  }

  // Validate mappings
  const mappings: ColumnMapping[] = [];
  for (let i = 0; i < obj.mappings.length; i++) {
    const m = obj.mappings[i] as Record<string, unknown>;
    if (typeof m.sourceColumn !== 'string' || !m.sourceColumn) {
      throw new Error(`Invalid mapping at index ${i}: missing "sourceColumn"`);
    }
    if (typeof m.targetField !== 'string' || !m.targetField) {
      throw new Error(`Invalid mapping at index ${i}: missing "targetField"`);
    }

    mappings.push({
      sourceColumn: m.sourceColumn,
      targetField: m.targetField,
      transform: m.transform as ColumnMapping['transform'],
      required: Boolean(m.required),
      defaultValue: m.defaultValue,
    });
  }

  // Build preset
  const preset: MappingPreset = {
    id: obj.id,
    name: obj.name,
    vendor: typeof obj.vendor === 'string' ? obj.vendor : 'Custom',
    description: typeof obj.description === 'string' ? obj.description : '',
    mappings,
    dateFormat: typeof obj.dateFormat === 'string' ? obj.dateFormat : 'MM/DD/YYYY',
    currencyFormat: obj.currencyFormat === 'cents' ? 'cents' : 'decimal',
    skipHeaderRows: typeof obj.skipHeaderRows === 'number' ? obj.skipHeaderRows : 0,
    delimiter: isValidDelimiter(obj.delimiter) ? obj.delimiter : ',',
  };

  return preset;
}

/**
 * Type guard for valid delimiter
 */
function isValidDelimiter(value: unknown): value is MappingPreset['delimiter'] {
  return value === ',' || value === '\t' || value === '|' || value === ';';
}

/**
 * Load a preset from a JSON string
 */
export function loadPresetFromString(jsonString: string): MappingPreset {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err) {
    throw new Error(
      `Failed to parse preset JSON: ${err instanceof Error ? err.message : String(err)}`
    );
  }
  return loadPresetFromJSON(parsed);
}

/**
 * Load and register a preset from a JSON string
 */
export function loadAndRegisterPreset(jsonString: string): MappingPreset {
  const preset = loadPresetFromString(jsonString);
  registerPreset(preset);
  return preset;
}

/**
 * Export a preset to JSON
 */
export function exportPresetToJSON(preset: MappingPreset): string {
  // Create a clean copy without functions
  const cleanPreset: MappingPreset = {
    id: preset.id,
    name: preset.name,
    vendor: preset.vendor,
    description: preset.description,
    mappings: preset.mappings.map((m) => ({
      sourceColumn: m.sourceColumn,
      targetField: m.targetField,
      transform: m.transform,
      required: m.required,
      defaultValue: m.defaultValue,
      // Note: customTransform functions cannot be serialized
    })),
    dateFormat: preset.dateFormat,
    currencyFormat: preset.currencyFormat,
    skipHeaderRows: preset.skipHeaderRows,
    delimiter: preset.delimiter,
  };

  return JSON.stringify(cleanPreset, null, 2);
}

/**
 * Save a preset to localStorage (browser environment)
 */
export function savePresetToLocalStorage(preset: MappingPreset): void {
  if (typeof localStorage === 'undefined') {
    throw new Error('localStorage is not available');
  }

  const key = `halcyon_preset_${preset.id}`;
  localStorage.setItem(key, exportPresetToJSON(preset));

  // Update preset list
  const listKey = 'halcyon_preset_list';
  const existingList = localStorage.getItem(listKey);
  const presetList: string[] = existingList ? JSON.parse(existingList) : [];

  if (!presetList.includes(preset.id)) {
    presetList.push(preset.id);
    localStorage.setItem(listKey, JSON.stringify(presetList));
  }
}

/**
 * Load a preset from localStorage (browser environment)
 */
export function loadPresetFromLocalStorage(id: string): MappingPreset | undefined {
  if (typeof localStorage === 'undefined') {
    return undefined;
  }

  const key = `halcyon_preset_${id}`;
  const json = localStorage.getItem(key);

  if (!json) {
    return undefined;
  }

  try {
    return loadPresetFromString(json);
  } catch {
    return undefined;
  }
}

/**
 * List all presets saved in localStorage (browser environment)
 */
export function listLocalStoragePresets(): string[] {
  if (typeof localStorage === 'undefined') {
    return [];
  }

  const listKey = 'halcyon_preset_list';
  const existingList = localStorage.getItem(listKey);

  return existingList ? JSON.parse(existingList) : [];
}

/**
 * Delete a preset from localStorage (browser environment)
 */
export function deletePresetFromLocalStorage(id: string): boolean {
  if (typeof localStorage === 'undefined') {
    return false;
  }

  const key = `halcyon_preset_${id}`;
  localStorage.removeItem(key);

  // Update preset list
  const listKey = 'halcyon_preset_list';
  const existingList = localStorage.getItem(listKey);
  if (existingList) {
    const presetList: string[] = JSON.parse(existingList);
    const index = presetList.indexOf(id);
    if (index > -1) {
      presetList.splice(index, 1);
      localStorage.setItem(listKey, JSON.stringify(presetList));
      return true;
    }
  }

  return false;
}

/**
 * Load all presets from localStorage and register them
 */
export function loadAllLocalStoragePresets(): MappingPreset[] {
  const ids = listLocalStoragePresets();
  const loaded: MappingPreset[] = [];

  for (const id of ids) {
    const preset = loadPresetFromLocalStorage(id);
    if (preset) {
      registerPreset(preset);
      loaded.push(preset);
    }
  }

  return loaded;
}

/**
 * Create a new preset from column mappings
 */
export function createPreset(
  id: string,
  name: string,
  options: {
    vendor?: string;
    description?: string;
    mappings: ColumnMapping[];
    dateFormat?: string;
    currencyFormat?: 'decimal' | 'cents';
    skipHeaderRows?: number;
    delimiter?: MappingPreset['delimiter'];
  }
): MappingPreset {
  return {
    id,
    name,
    vendor: options.vendor || 'Custom',
    description: options.description || '',
    mappings: options.mappings,
    dateFormat: options.dateFormat || 'MM/DD/YYYY',
    currencyFormat: options.currencyFormat || 'decimal',
    skipHeaderRows: options.skipHeaderRows || 0,
    delimiter: options.delimiter || ',',
  };
}

/**
 * Clone an existing preset with modifications
 */
export function clonePreset(
  sourceId: string,
  newId: string,
  newName: string,
  modifications?: Partial<Omit<MappingPreset, 'id' | 'name'>>
): MappingPreset {
  const source = getPreset(sourceId);
  if (!source) {
    throw new Error(`Source preset "${sourceId}" not found`);
  }

  return {
    ...source,
    ...modifications,
    id: newId,
    name: newName,
    mappings: modifications?.mappings || [...source.mappings.map((m) => ({ ...m }))],
  };
}

/**
 * Get the best matching preset for a set of columns
 */
export function suggestPreset(columns: string[]): MappingPreset | undefined {
  initializeRegistry();

  const columnSet = new Set(columns.map((c) => c.toLowerCase().trim()));
  let bestPreset: MappingPreset | undefined;
  let bestScore = 0;

  for (const preset of presetRegistry.values()) {
    let matches = 0;
    for (const mapping of preset.mappings) {
      if (columnSet.has(mapping.sourceColumn.toLowerCase().trim())) {
        matches++;
      }
    }

    // Calculate score as percentage of preset columns found
    const score = preset.mappings.length > 0 ? matches / preset.mappings.length : 0;

    if (score > bestScore && score >= 0.5) {
      // At least 50% match
      bestScore = score;
      bestPreset = preset;
    }
  }

  return bestPreset;
}

/**
 * Reset the preset registry to defaults only
 */
export function resetPresetRegistry(): void {
  presetRegistry.clear();
  initializeRegistry();
}
