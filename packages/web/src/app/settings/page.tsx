'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useImport } from '@/hooks/useImport';
import { useWhiteLabel } from '@/providers/WhiteLabelProvider';
import { useUserPreferences } from '@/hooks/useUserPreferences';

interface CustomPreset {
  id: string;
  name: string;
  vendor: string;
  description: string;
  dateFormat: string;
  currencyFormat: 'decimal' | 'cents';
  delimiter: ',' | '\t' | '|' | ';';
}

export default function SettingsPage() {
  const { presets } = useImport();
  const { config: whiteLabel } = useWhiteLabel();
  const { showDemoData, saving: savingPreferences, updatePreference } = useUserPreferences();
  const [activeTab, setActiveTab] = useState<'presets' | 'api' | 'export' | 'integrations' | 'display'>('integrations');
  const [demoDataToggle, setDemoDataToggle] = useState(showDemoData);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync local toggle state when preference loads
  useEffect(() => {
    setDemoDataToggle(showDemoData);
  }, [showDemoData]);

  const handleDemoDataToggle = async (newValue: boolean) => {
    setDemoDataToggle(newValue);
    setSaveSuccess(false);
    const success = await updatePreference('showDemoData', newValue);
    if (success) {
      setSaveSuccess(true);
      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>([]);
  const [isCreatingPreset, setIsCreatingPreset] = useState(false);
  const [newPreset, setNewPreset] = useState<Partial<CustomPreset>>({
    name: '',
    vendor: '',
    description: '',
    dateFormat: 'MM/DD/YYYY',
    currencyFormat: 'decimal',
    delimiter: ',',
  });

  // Export settings
  const [exportSettings, setExportSettings] = useState({
    defaultFormat: 'detailed',
    dateFormat: 'YYYY-MM-DD',
    includeHeaders: true,
    delimiter: ',',
  });

  // API settings
  const [apiSettings, setApiSettings] = useState({
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    timeout: 30000,
  });

  const handleCreatePreset = () => {
    if (!newPreset.name || !newPreset.vendor) return;

    const preset: CustomPreset = {
      id: `custom-${Date.now()}`,
      name: newPreset.name || '',
      vendor: newPreset.vendor || '',
      description: newPreset.description || '',
      dateFormat: newPreset.dateFormat || 'MM/DD/YYYY',
      currencyFormat: newPreset.currencyFormat || 'decimal',
      delimiter: newPreset.delimiter || ',',
    };

    setCustomPresets([...customPresets, preset]);
    setIsCreatingPreset(false);
    setNewPreset({
      name: '',
      vendor: '',
      description: '',
      dateFormat: 'MM/DD/YYYY',
      currencyFormat: 'decimal',
      delimiter: ',',
    });
  };

  const handleDeletePreset = (id: string) => {
    setCustomPresets(customPresets.filter((p) => p.id !== id));
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
        <p className="text-slate-500 mt-1">Configure presets, API, and export preferences</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8">
          {[
            { id: 'integrations', label: 'Integrations' },
            { id: 'display', label: 'Data Display' },
            { id: 'presets', label: 'Mapping Presets' },
            { id: 'api', label: 'API Configuration' },
            { id: 'export', label: 'Export Preferences' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Integrations Tab */}
      {activeTab === 'integrations' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Data Integrations</h3>
            <p className="text-sm text-slate-500 mb-6">
              Connect to external systems for automated data import and export.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Branding/White-Label Card */}
              <Link
                href="/settings/branding"
                className="border border-slate-200 rounded-lg p-6 hover:border-blue-300 hover:shadow-md transition-all group"
              >
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900 group-hover:text-purple-600 transition-colors">
                      Branding & White-Label
                    </h4>
                    <p className="mt-1 text-sm text-slate-500">
                      Customize logo, colors, and branding for your organization
                    </p>
                    <div className="mt-3 flex items-center text-sm text-purple-600">
                      <span>Configure branding</span>
                      <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>

              {/* SFTP Integration Card */}
              <Link
                href="/settings/sftp"
                className="border border-slate-200 rounded-lg p-6 hover:border-blue-300 hover:shadow-md transition-all group"
              >
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                      SFTP Connections
                    </h4>
                    <p className="mt-1 text-sm text-slate-500">
                      Connect to SFTP servers for automated file import and export
                    </p>
                    <div className="mt-3 flex items-center text-sm text-blue-600">
                      <span>Manage connections</span>
                      <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Future Integration - HL7/FHIR */}
              <div className="border border-slate-200 rounded-lg p-6 opacity-60">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-slate-100 rounded-lg">
                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-semibold text-slate-900">HL7/FHIR Integration</h4>
                      <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-500 rounded">
                        Coming Soon
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      Direct integration with healthcare systems via HL7 and FHIR standards
                    </p>
                  </div>
                </div>
              </div>

              {/* Future Integration - API Webhooks */}
              <div className="border border-slate-200 rounded-lg p-6 opacity-60">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-slate-100 rounded-lg">
                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-semibold text-slate-900">Webhooks</h4>
                      <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-500 rounded">
                        Coming Soon
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      Receive real-time notifications when assessments are completed
                    </p>
                  </div>
                </div>
              </div>

              {/* Future Integration - Cloud Storage */}
              <div className="border border-slate-200 rounded-lg p-6 opacity-60">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-slate-100 rounded-lg">
                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-semibold text-slate-900">Cloud Storage</h4>
                      <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-500 rounded">
                        Coming Soon
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      Connect to AWS S3, Azure Blob, or Google Cloud Storage
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Data Display Tab */}
      {activeTab === 'display' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Data Display Settings</h3>
            <p className="text-sm text-slate-500 mb-6">
              Configure how data is displayed throughout the application.
            </p>

            <div className="space-y-6 max-w-xl">
              {/* Demo Data Toggle */}
              <div className="flex items-start justify-between p-4 border border-slate-200 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h4 className="font-medium text-slate-900">Show Demo Data</h4>
                    {savingPreferences && (
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-600 rounded">
                        <svg className="animate-spin -ml-0.5 mr-1 h-3 w-3 text-blue-600" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Saving...
                      </span>
                    )}
                    {saveSuccess && !savingPreferences && (
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-green-100 text-green-600 rounded">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Saved
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    Demo data includes sample patient records and assessments for testing and demonstration purposes.
                    Disable this option to view only real production data.
                  </p>
                </div>
                <div className="ml-4">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={demoDataToggle}
                    onClick={() => handleDemoDataToggle(!demoDataToggle)}
                    disabled={savingPreferences}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      demoDataToggle ? 'bg-blue-600' : 'bg-slate-200'
                    } ${savingPreferences ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        demoDataToggle ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Info Box */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-blue-800">About Demo Data</h4>
                    <p className="mt-1 text-sm text-blue-700">
                      Demo data is clearly marked throughout the application with a &quot;Demo&quot; badge.
                      It helps you explore features without affecting your real patient data.
                      When disabled, only actual production records will be shown in dashboards, reports, and exports.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Presets Tab */}
      {activeTab === 'presets' && (
        <div className="space-y-6">
          {/* Default Presets */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Built-in Presets</h3>
            <p className="text-sm text-slate-500 mb-6">
              These presets are included by default and cannot be modified.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {presets.map((preset) => (
                <div
                  key={preset.id}
                  className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-slate-900">{preset.name}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{preset.vendor}</p>
                    </div>
                    <span className="inline-flex px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 rounded">
                      Built-in
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mt-2">{preset.description}</p>
                  <div className="mt-3 flex items-center space-x-4 text-xs text-slate-500">
                    <span>Date: {preset.dateFormat}</span>
                    <span>Delimiter: {preset.delimiter === ',' ? 'Comma' : preset.delimiter === '\t' ? 'Tab' : preset.delimiter}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Presets */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Custom Presets</h3>
                <p className="text-sm text-slate-500">Create your own mapping presets for specific file formats.</p>
              </div>
              <button
                onClick={() => setIsCreatingPreset(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Preset
              </button>
            </div>

            {customPresets.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customPresets.map((preset) => (
                  <div
                    key={preset.id}
                    className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-slate-900">{preset.name}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">{preset.vendor}</p>
                      </div>
                      <span className="inline-flex px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-600 rounded">
                        Custom
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mt-2">{preset.description}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-xs text-slate-500">
                        <span>Date: {preset.dateFormat}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button className="text-slate-400 hover:text-blue-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeletePreset(preset.id)}
                          className="text-slate-400 hover:text-red-600"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <svg className="w-12 h-12 mx-auto text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="mt-2">No custom presets created yet</p>
              </div>
            )}
          </div>

          {/* Create Preset Modal */}
          {isCreatingPreset && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Create Custom Preset</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={newPreset.name}
                      onChange={(e) => setNewPreset({ ...newPreset, name: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="My Custom Preset"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Vendor</label>
                    <input
                      type="text"
                      value={newPreset.vendor}
                      onChange={(e) => setNewPreset({ ...newPreset, vendor: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Vendor Name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                    <textarea
                      value={newPreset.description}
                      onChange={(e) => setNewPreset({ ...newPreset, description: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={2}
                      placeholder="Describe when to use this preset..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Date Format</label>
                      <select
                        value={newPreset.dateFormat}
                        onChange={(e) => setNewPreset({ ...newPreset, dateFormat: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Delimiter</label>
                      <select
                        value={newPreset.delimiter}
                        onChange={(e) =>
                          setNewPreset({ ...newPreset, delimiter: e.target.value as CustomPreset['delimiter'] })
                        }
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value=",">Comma (,)</option>
                        <option value="\t">Tab</option>
                        <option value="|">Pipe (|)</option>
                        <option value=";">Semicolon (;)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => setIsCreatingPreset(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreatePreset}
                    disabled={!newPreset.name || !newPreset.vendor}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create Preset
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* API Tab */}
      {activeTab === 'api' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">API Configuration</h3>
          <p className="text-sm text-slate-500 mb-6">
            Configure the connection to the {whiteLabel?.brandName || 'RCM Partner'} Assistant API.
          </p>

          <div className="space-y-6 max-w-xl">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">API Base URL</label>
              <input
                type="text"
                value={apiSettings.apiUrl}
                onChange={(e) => setApiSettings({ ...apiSettings, apiUrl: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                placeholder="http://localhost:3001"
              />
              <p className="mt-1 text-xs text-slate-500">
                The base URL for the API server. Change this if using a different environment.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Request Timeout (ms)</label>
              <input
                type="number"
                value={apiSettings.timeout}
                onChange={(e) => setApiSettings({ ...apiSettings, timeout: parseInt(e.target.value) || 30000 })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="5000"
                max="120000"
                step="1000"
              />
              <p className="mt-1 text-xs text-slate-500">
                Maximum time to wait for API responses (5000 - 120000 ms).
              </p>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <h4 className="text-sm font-medium text-slate-700 mb-3">Connection Status</h4>
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-slate-600">Connected to API</span>
              </div>
            </div>

            <div className="pt-4">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">
                Test Connection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Tab */}
      {activeTab === 'export' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Export Preferences</h3>
          <p className="text-sm text-slate-500 mb-6">Configure default settings for data exports.</p>

          <div className="space-y-6 max-w-xl">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Default Export Format</label>
              <select
                value={exportSettings.defaultFormat}
                onChange={(e) => setExportSettings({ ...exportSettings, defaultFormat: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="detailed">Detailed (All fields)</option>
                <option value="summary">Summary (Key metrics only)</option>
                <option value="worklist">Worklist (Action items)</option>
                <option value="executive">Executive (High-level overview)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date Format</label>
              <select
                value={exportSettings.dateFormat}
                onChange={(e) => setExportSettings({ ...exportSettings, dateFormat: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY (International)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">CSV Delimiter</label>
              <select
                value={exportSettings.delimiter}
                onChange={(e) => setExportSettings({ ...exportSettings, delimiter: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value=",">Comma (,)</option>
                <option value="\t">Tab</option>
                <option value="|">Pipe (|)</option>
                <option value=";">Semicolon (;)</option>
              </select>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="includeHeaders"
                checked={exportSettings.includeHeaders}
                onChange={(e) => setExportSettings({ ...exportSettings, includeHeaders: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="includeHeaders" className="text-sm text-slate-700">
                Include column headers in exports
              </label>
            </div>

            <div className="pt-4">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
