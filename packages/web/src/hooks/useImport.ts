'use client';

import { useState, useCallback, useEffect } from 'react';
import type { ColumnMapping, ImportPreset, ImportPreviewResult, ImportResult, ImportError } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Standard target fields for column mapping
export const TARGET_FIELDS = [
  { key: 'accountNumber', label: 'Account Number', required: true, description: 'Unique account identifier' },
  { key: 'mrn', label: 'MRN', required: false, description: 'Medical Record Number' },
  { key: 'patientFirstName', label: 'Patient First Name', required: false },
  { key: 'patientLastName', label: 'Patient Last Name', required: false },
  { key: 'patientFullName', label: 'Patient Full Name', required: false },
  { key: 'dateOfBirth', label: 'Date of Birth', required: false },
  { key: 'dateOfService', label: 'Date of Service', required: true },
  { key: 'admitDate', label: 'Admit Date', required: false },
  { key: 'dischargeDate', label: 'Discharge Date', required: false },
  { key: 'totalCharges', label: 'Total Charges', required: true, description: 'Total charges for the account' },
  { key: 'totalPayments', label: 'Total Payments', required: false },
  { key: 'balance', label: 'Balance', required: false },
  { key: 'selfPayBalance', label: 'Self-Pay Balance', required: false },
  { key: 'insuranceBalance', label: 'Insurance Balance', required: false },
  { key: 'primaryInsurance', label: 'Primary Insurance', required: false },
  { key: 'financialClass', label: 'Financial Class', required: false },
  { key: 'facilityName', label: 'Facility Name', required: false },
  { key: 'encounterType', label: 'Encounter Type', required: false },
  { key: 'patientType', label: 'Patient Type', required: false },
  { key: 'state', label: 'State', required: true, description: 'Patient or facility state' },
  { key: 'city', label: 'City', required: false },
  { key: 'zipCode', label: 'Zip Code', required: false },
  { key: 'phone', label: 'Phone', required: false },
  { key: 'email', label: 'Email', required: false },
  { key: 'status', label: 'Status', required: false },
  { key: 'agingBucket', label: 'Aging Bucket', required: false },
];

interface UseImportReturn {
  // State
  file: File | null;
  preview: ImportPreviewResult | null;
  mappings: ColumnMapping[];
  selectedPreset: ImportPreset | null;
  importing: boolean;
  progress: number;
  result: ImportResult | null;
  error: string | null;

  // Presets state
  presets: ImportPreset[];
  presetsLoading: boolean;
  presetsError: string | null;

  // Actions
  targetFields: typeof TARGET_FIELDS;
  setFile: (file: File | null) => void;
  selectPreset: (presetId: string | null) => void;
  setMappings: (mappings: ColumnMapping[]) => void;
  previewFile: (file: File) => Promise<void>;
  importFile: () => Promise<void>;
  reset: () => void;
}

export function useImport(): UseImportReturn {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<ImportPreset | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Presets state
  const [presets, setPresets] = useState<ImportPreset[]>([]);
  const [presetsLoading, setPresetsLoading] = useState(false);
  const [presetsError, setPresetsError] = useState<string | null>(null);

  // Fetch presets from API on mount
  useEffect(() => {
    const fetchPresets = async () => {
      setPresetsLoading(true);
      setPresetsError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/api/presets`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch presets');
        }

        const data = await response.json();
        setPresets(data.presets || data || []);
      } catch (err) {
        console.error('[useImport] Failed to fetch presets:', err);
        setPresetsError('Unable to load presets. Please try again later.');
        // Set empty array on error so UI doesn't break
        setPresets([]);
      } finally {
        setPresetsLoading(false);
      }
    };

    fetchPresets();
  }, []);

  const selectPreset = useCallback((presetId: string | null) => {
    if (!presetId) {
      setSelectedPreset(null);
      return;
    }
    const preset = presets.find((p) => p.id === presetId);
    setSelectedPreset(preset || null);
  }, [presets]);

  const parseCSV = (content: string): { headers: string[]; rows: Record<string, string>[] } => {
    const lines = content.split('\n').filter((line) => line.trim());
    if (lines.length === 0) return { headers: [], rows: [] };

    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    const rows = lines.slice(1).map((line) => {
      const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      return row;
    });

    return { headers, rows };
  };

  const autoDetectMappings = (headers: string[]): ColumnMapping[] => {
    const mappings: ColumnMapping[] = [];

    const patterns: { pattern: RegExp; target: string; transform?: ColumnMapping['transform'] }[] = [
      { pattern: /^account|^acct|^acc_?no/i, target: 'accountNumber' },
      { pattern: /^mrn|medical.?record/i, target: 'mrn' },
      { pattern: /first.?name|fname/i, target: 'patientFirstName' },
      { pattern: /last.?name|lname/i, target: 'patientLastName' },
      { pattern: /patient.?name|full.?name/i, target: 'patientFullName' },
      { pattern: /d\.?o\.?b|birth.?date|date.?of.?birth/i, target: 'dateOfBirth', transform: 'date' },
      { pattern: /d\.?o\.?s|service.?date|date.?of.?service/i, target: 'dateOfService', transform: 'date' },
      { pattern: /admit|admission/i, target: 'admitDate', transform: 'date' },
      { pattern: /discharge|disch/i, target: 'dischargeDate', transform: 'date' },
      { pattern: /total.?charge|charges/i, target: 'totalCharges', transform: 'currency' },
      { pattern: /total.?payment|payments/i, target: 'totalPayments', transform: 'currency' },
      { pattern: /^balance|account.?balance|current.?balance/i, target: 'balance', transform: 'currency' },
      { pattern: /self.?pay|patient.?balance|pt.?balance/i, target: 'selfPayBalance', transform: 'currency' },
      { pattern: /insurance.?balance|ins.?balance/i, target: 'insuranceBalance', transform: 'currency' },
      { pattern: /primary.?(insurance|payer|payor)|prim.?ins/i, target: 'primaryInsurance' },
      { pattern: /financial.?class|fin.?class/i, target: 'financialClass' },
      { pattern: /facility|hospital/i, target: 'facilityName' },
      { pattern: /encounter.?type|enc.?type/i, target: 'encounterType', transform: 'encounter_type' },
      { pattern: /patient.?type|pt.?type/i, target: 'patientType' },
      { pattern: /^state$/i, target: 'state', transform: 'state_code' },
      { pattern: /^city$/i, target: 'city' },
      { pattern: /zip|postal/i, target: 'zipCode' },
      { pattern: /phone|tel/i, target: 'phone' },
      { pattern: /email/i, target: 'email' },
      { pattern: /status/i, target: 'status' },
      { pattern: /aging|bucket/i, target: 'agingBucket' },
    ];

    headers.forEach((header) => {
      for (const { pattern, target, transform } of patterns) {
        if (pattern.test(header)) {
          const targetField = TARGET_FIELDS.find((f) => f.key === target);
          mappings.push({
            sourceColumn: header,
            targetField: target,
            transform,
            required: targetField?.required || false,
          });
          break;
        }
      }
    });

    return mappings;
  };

  const previewFile = useCallback(async (file: File) => {
    setError(null);

    try {
      const content = await file.text();
      const { headers, rows } = parseCSV(content);

      if (headers.length === 0) {
        throw new Error('File appears to be empty or invalid');
      }

      const suggestedMappings = autoDetectMappings(headers);

      const issues: string[] = [];
      const requiredFields = TARGET_FIELDS.filter((f) => f.required);
      const mappedRequired = requiredFields.filter((f) =>
        suggestedMappings.some((m) => m.targetField === f.key)
      );

      if (mappedRequired.length < requiredFields.length) {
        const missing = requiredFields.filter(
          (f) => !suggestedMappings.some((m) => m.targetField === f.key)
        );
        issues.push(`Could not auto-detect required fields: ${missing.map((f) => f.label).join(', ')}`);
      }

      setPreview({
        columns: headers,
        previewRows: rows.slice(0, 5) as Record<string, unknown>[],
        totalRows: rows.length,
        suggestedMappings,
        issues,
      });

      setMappings(suggestedMappings);
      setFile(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to preview file');
    }
  }, []);

  const importFile = useCallback(async () => {
    if (!file || !preview) {
      setError('No file to import');
      return;
    }

    setImporting(true);
    setProgress(0);
    setError(null);

    try {
      // In production, this would upload to the API
      // const formData = new FormData();
      // formData.append('file', file);
      // formData.append('mappings', JSON.stringify(mappings));
      // const response = await fetch(`${API_BASE_URL}/api/files/import`, {
      //   method: 'POST',
      //   body: formData,
      // });

      // Simulate import progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        setProgress(i);
      }

      const content = await file.text();
      const { rows } = parseCSV(content);

      const errors: ImportError[] = [];
      const processedRows: Record<string, unknown>[] = [];

      rows.forEach((row, index) => {
        const processedRow: Record<string, unknown> = {};

        mappings.forEach((mapping) => {
          const value = row[mapping.sourceColumn];

          if (mapping.required && !value) {
            errors.push({
              row: index + 2,
              column: mapping.sourceColumn,
              value: value || '',
              message: `Required field "${mapping.targetField}" is empty`,
              severity: 'error',
            });
          }

          processedRow[mapping.targetField] = value;
        });

        processedRows.push(processedRow);
      });

      setResult({
        success: errors.filter((e) => e.severity === 'error').length === 0,
        totalRows: rows.length,
        processedRows: processedRows.length,
        skippedRows: errors.filter((e) => e.severity === 'error').length,
        errors,
        warnings: [],
        assessments: [], // Would be populated by the API
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import file');
    } finally {
      setImporting(false);
    }
  }, [file, preview, mappings]);

  const reset = useCallback(() => {
    setFile(null);
    setPreview(null);
    setMappings([]);
    setSelectedPreset(null);
    setProgress(0);
    setResult(null);
    setError(null);
  }, []);

  return {
    file,
    preview,
    mappings,
    selectedPreset,
    importing,
    progress,
    result,
    error,
    presets,
    presetsLoading,
    presetsError,
    targetFields: TARGET_FIELDS,
    setFile,
    selectPreset,
    setMappings,
    previewFile,
    importFile,
    reset,
  };
}
