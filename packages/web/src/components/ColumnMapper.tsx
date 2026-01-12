'use client';

import { useState } from 'react';
import type { ColumnMapping } from '@/types';

interface ColumnMapperProps {
  sourceColumns: string[];
  targetFields: TargetField[];
  mappings: ColumnMapping[];
  onChange: (mappings: ColumnMapping[]) => void;
  sampleData?: Record<string, unknown>[];
}

interface TargetField {
  key: string;
  label: string;
  required: boolean;
  description?: string;
}

const TRANSFORM_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'date', label: 'Date' },
  { value: 'currency', label: 'Currency' },
  { value: 'uppercase', label: 'Uppercase' },
  { value: 'lowercase', label: 'Lowercase' },
  { value: 'state_code', label: 'State Code' },
  { value: 'encounter_type', label: 'Encounter Type' },
];

export default function ColumnMapper({
  sourceColumns,
  targetFields,
  mappings,
  onChange,
  sampleData = [],
}: ColumnMapperProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const getMappingForTarget = (targetField: string) =>
    mappings.find((m) => m.targetField === targetField);

  const getSampleValue = (sourceColumn: string): string => {
    if (sampleData.length === 0 || !sourceColumn) return '-';
    const value = sampleData[0]?.[sourceColumn];
    if (value === null || value === undefined) return '-';
    const strValue = String(value);
    return strValue.length > 50 ? strValue.substring(0, 50) + '...' : strValue;
  };

  const updateMapping = (
    targetField: string,
    updates: Partial<ColumnMapping>
  ) => {
    const existingIndex = mappings.findIndex((m) => m.targetField === targetField);
    const targetFieldDef = targetFields.find((f) => f.key === targetField);

    if (existingIndex >= 0) {
      const newMappings = [...mappings];
      newMappings[existingIndex] = { ...newMappings[existingIndex], ...updates };
      onChange(newMappings);
    } else {
      onChange([
        ...mappings,
        {
          sourceColumn: '',
          targetField,
          required: targetFieldDef?.required ?? false,
          ...updates,
        },
      ]);
    }
  };

  const removeMapping = (targetField: string) => {
    onChange(mappings.filter((m) => m.targetField !== targetField));
  };

  const unmappedSourceColumns = sourceColumns.filter(
    (col) => !mappings.some((m) => m.sourceColumn === col)
  );

  const mappedTargetFields = mappings
    .filter((m) => m.sourceColumn)
    .map((m) => m.targetField);

  return (
    <div className="space-y-6">
      {/* Mapping Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-700">Column Mappings</h3>
          <p className="text-xs text-slate-500 mt-1">
            Map source columns to target fields. Required fields are marked with *.
          </p>
        </div>

        <div className="divide-y divide-slate-200">
          {targetFields.map((field) => {
            const mapping = getMappingForTarget(field.key);
            const isMapped = mapping?.sourceColumn;
            const isExpanded = expandedRow === field.key;

            return (
              <div key={field.key} className="group">
                <div
                  className={`flex items-center px-4 py-3 ${
                    field.required && !isMapped ? 'bg-red-50' : ''
                  }`}
                >
                  {/* Target Field */}
                  <div className="w-1/3 pr-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-slate-700">
                        {field.label}
                        {field.required && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </span>
                      {field.description && (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedRow(isExpanded ? null : field.key)
                          }
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">{field.key}</p>
                  </div>

                  {/* Arrow */}
                  <div className="px-4">
                    <svg
                      className={`w-5 h-5 ${
                        isMapped ? 'text-green-500' : 'text-slate-300'
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                      />
                    </svg>
                  </div>

                  {/* Source Column Select */}
                  <div className="flex-1 flex items-center space-x-3">
                    <select
                      value={mapping?.sourceColumn || ''}
                      onChange={(e) =>
                        updateMapping(field.key, { sourceColumn: e.target.value })
                      }
                      className="flex-1 text-sm border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">-- Not mapped --</option>
                      {sourceColumns.map((col) => (
                        <option
                          key={col}
                          value={col}
                          disabled={
                            mapping?.sourceColumn !== col &&
                            mappings.some((m) => m.sourceColumn === col)
                          }
                        >
                          {col}
                        </option>
                      ))}
                    </select>

                    {/* Transform Select */}
                    {isMapped && (
                      <select
                        value={mapping?.transform || ''}
                        onChange={(e) =>
                          updateMapping(field.key, {
                            transform: e.target.value as ColumnMapping['transform'],
                          })
                        }
                        className="w-32 text-sm border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      >
                        {TRANSFORM_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    )}

                    {/* Sample Value */}
                    {isMapped && (
                      <div className="w-40 truncate">
                        <span className="text-xs text-slate-500">
                          Sample: {getSampleValue(mapping.sourceColumn)}
                        </span>
                      </div>
                    )}

                    {/* Clear Button */}
                    {isMapped && (
                      <button
                        type="button"
                        onClick={() => removeMapping(field.key)}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Description */}
                {isExpanded && field.description && (
                  <div className="px-4 py-2 bg-slate-50 text-sm text-slate-600 border-t border-slate-100">
                    {field.description}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Unmapped Source Columns */}
      {unmappedSourceColumns.length > 0 && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
          <div className="flex items-start space-x-3">
            <svg
              className="w-5 h-5 text-amber-500 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-amber-800">
                Unmapped Source Columns
              </h4>
              <p className="text-xs text-amber-700 mt-1">
                The following columns from your file are not mapped:
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {unmappedSourceColumns.map((col) => (
                  <span
                    key={col}
                    className="inline-flex items-center px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded"
                  >
                    {col}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Validation Summary */}
      {(() => {
        const requiredUnmapped = targetFields.filter(
          (f) => f.required && !mappings.some((m) => m.targetField === f.key && m.sourceColumn)
        );

        if (requiredUnmapped.length > 0) {
          return (
            <div className="bg-red-50 rounded-xl border border-red-200 p-4">
              <div className="flex items-start space-x-3">
                <svg
                  className="w-5 h-5 text-red-500 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-red-800">
                    Missing Required Mappings
                  </h4>
                  <p className="text-xs text-red-700 mt-1">
                    The following required fields must be mapped:
                  </p>
                  <ul className="mt-2 list-disc list-inside text-xs text-red-700">
                    {requiredUnmapped.map((f) => (
                      <li key={f.key}>{f.label}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div className="bg-green-50 rounded-xl border border-green-200 p-4">
            <div className="flex items-center space-x-3">
              <svg
                className="w-5 h-5 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-green-800">
                  All Required Fields Mapped
                </h4>
                <p className="text-xs text-green-700 mt-1">
                  {mappedTargetFields.length} of {targetFields.length} fields mapped
                </p>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
