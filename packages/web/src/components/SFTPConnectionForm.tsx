// @ts-nocheck
'use client';

/**
 * SFTP Connection Form Component
 * Form for creating and editing SFTP connections
 */

import { useState, useEffect } from 'react';
import type { SFTPConnection, CreateConnectionInput, UpdateConnectionInput, TestConnectionResult } from '@/hooks/useSFTP';

interface SFTPConnectionFormProps {
  connection?: SFTPConnection | null;
  presets?: Array<{ id: string; name: string; vendor: string }>;
  onSubmit: (data: CreateConnectionInput | UpdateConnectionInput) => Promise<void>;
  onTest?: (data: CreateConnectionInput) => Promise<TestConnectionResult>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

interface FormData {
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  privateKey: string;
  authMethod: 'password' | 'privateKey';
  inboundPath: string;
  outboundPath: string;
  archivePath: string;
  errorPath: string;
  filePattern: string;
  presetId: string;
  autoProcess: boolean;
  deleteAfterProcess: boolean;
  enabled: boolean;
  pollIntervalMinutes: number;
}

const defaultFormData: FormData = {
  name: '',
  host: '',
  port: 22,
  username: '',
  password: '',
  privateKey: '',
  authMethod: 'password',
  inboundPath: '/inbound',
  outboundPath: '/outbound',
  archivePath: '/archive',
  errorPath: '',
  filePattern: '*.csv',
  presetId: '',
  autoProcess: true,
  deleteAfterProcess: false,
  enabled: true,
  pollIntervalMinutes: 15,
};

export default function SFTPConnectionForm({
  connection,
  presets = [],
  onSubmit,
  onTest,
  onCancel,
  isSubmitting = false,
}: SFTPConnectionFormProps) {
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data when editing
  useEffect(() => {
    if (connection) {
      setFormData({
        name: connection.name,
        host: connection.host,
        port: connection.port,
        username: connection.username,
        password: '',
        privateKey: '',
        authMethod: connection.hasPrivateKey ? 'privateKey' : 'password',
        inboundPath: connection.inboundPath,
        outboundPath: connection.outboundPath,
        archivePath: connection.archivePath || '/archive',
        errorPath: connection.errorPath || '',
        filePattern: connection.filePattern,
        presetId: connection.presetId || '',
        autoProcess: connection.autoProcess,
        deleteAfterProcess: connection.deleteAfterProcess,
        enabled: connection.enabled,
        pollIntervalMinutes: connection.pollIntervalMinutes,
      });
    }
  }, [connection]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!formData.host.trim()) {
      newErrors.host = 'Host is required';
    }
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }
    if (!connection) {
      // Require credentials for new connections
      if (formData.authMethod === 'password' && !formData.password.trim()) {
        newErrors.password = 'Password is required';
      }
      if (formData.authMethod === 'privateKey' && !formData.privateKey.trim()) {
        newErrors.privateKey = 'Private key is required';
      }
    }
    if (formData.port < 1 || formData.port > 65535) {
      newErrors.port = 'Port must be between 1 and 65535';
    }
    if (formData.pollIntervalMinutes < 1) {
      newErrors.pollIntervalMinutes = 'Poll interval must be at least 1 minute';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const submitData: CreateConnectionInput | UpdateConnectionInput = {
      name: formData.name,
      host: formData.host,
      port: formData.port,
      username: formData.username,
      inboundPath: formData.inboundPath,
      outboundPath: formData.outboundPath,
      archivePath: formData.archivePath,
      errorPath: formData.errorPath || undefined,
      filePattern: formData.filePattern,
      presetId: formData.presetId || undefined,
      autoProcess: formData.autoProcess,
      deleteAfterProcess: formData.deleteAfterProcess,
      enabled: formData.enabled,
      pollIntervalMinutes: formData.pollIntervalMinutes,
    };

    // Include credentials
    if (formData.authMethod === 'password') {
      if (formData.password) {
        submitData.password = formData.password;
      }
      // Clear privateKey if switching to password
      if (connection?.hasPrivateKey) {
        submitData.privateKey = null;
      }
    } else {
      if (formData.privateKey) {
        submitData.privateKey = formData.privateKey;
      }
      // Clear password if switching to privateKey
      if (connection?.hasPassword) {
        submitData.password = null;
      }
    }

    await onSubmit(submitData);
  };

  const handleTest = async () => {
    if (!onTest) return;

    setTesting(true);
    setTestResult(null);

    try {
      const result = await onTest({
        host: formData.host,
        port: formData.port,
        username: formData.username,
        password: formData.authMethod === 'password' ? formData.password : undefined,
        privateKey: formData.authMethod === 'privateKey' ? formData.privateKey : undefined,
        inboundPath: formData.inboundPath,
        outboundPath: formData.outboundPath,
        filePattern: formData.filePattern,
      });
      setTestResult(result);
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Connection test failed',
      });
    } finally {
      setTesting(false);
    }
  };

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when field is updated
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    // Clear test result when connection settings change
    if (['host', 'port', 'username', 'password', 'privateKey', 'authMethod'].includes(field)) {
      setTestResult(null);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Connection Name */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Connection Name *</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => updateField('name', e.target.value)}
          className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.name ? 'border-red-500' : 'border-slate-300'
          }`}
          placeholder="Production SFTP Server"
        />
        {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
      </div>

      {/* Host and Port */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">Host *</label>
          <input
            type="text"
            value={formData.host}
            onChange={(e) => updateField('host', e.target.value)}
            className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.host ? 'border-red-500' : 'border-slate-300'
            }`}
            placeholder="sftp.example.com"
          />
          {errors.host && <p className="mt-1 text-sm text-red-500">{errors.host}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Port</label>
          <input
            type="number"
            value={formData.port}
            onChange={(e) => updateField('port', parseInt(e.target.value) || 22)}
            className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.port ? 'border-red-500' : 'border-slate-300'
            }`}
            min={1}
            max={65535}
          />
          {errors.port && <p className="mt-1 text-sm text-red-500">{errors.port}</p>}
        </div>
      </div>

      {/* Username */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Username *</label>
        <input
          type="text"
          value={formData.username}
          onChange={(e) => updateField('username', e.target.value)}
          className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.username ? 'border-red-500' : 'border-slate-300'
          }`}
          placeholder="sftp_user"
        />
        {errors.username && <p className="mt-1 text-sm text-red-500">{errors.username}</p>}
      </div>

      {/* Authentication Method */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Authentication Method</label>
        <div className="flex space-x-4">
          <label className="flex items-center">
            <input
              type="radio"
              name="authMethod"
              checked={formData.authMethod === 'password'}
              onChange={() => updateField('authMethod', 'password')}
              className="mr-2"
            />
            <span className="text-sm text-slate-700">Password</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="authMethod"
              checked={formData.authMethod === 'privateKey'}
              onChange={() => updateField('authMethod', 'privateKey')}
              className="mr-2"
            />
            <span className="text-sm text-slate-700">Private Key</span>
          </label>
        </div>
      </div>

      {/* Password or Private Key */}
      {formData.authMethod === 'password' ? (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Password {!connection && '*'}
          </label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => updateField('password', e.target.value)}
            className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.password ? 'border-red-500' : 'border-slate-300'
            }`}
            placeholder={connection?.hasPassword ? '(unchanged)' : 'Enter password'}
          />
          {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password}</p>}
          {connection?.hasPassword && (
            <p className="mt-1 text-xs text-slate-500">Leave blank to keep existing password</p>
          )}
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Private Key {!connection && '*'}
          </label>
          <textarea
            value={formData.privateKey}
            onChange={(e) => updateField('privateKey', e.target.value)}
            className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm ${
              errors.privateKey ? 'border-red-500' : 'border-slate-300'
            }`}
            rows={6}
            placeholder={connection?.hasPrivateKey ? '(unchanged)' : '-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----'}
          />
          {errors.privateKey && <p className="mt-1 text-sm text-red-500">{errors.privateKey}</p>}
          {connection?.hasPrivateKey && (
            <p className="mt-1 text-xs text-slate-500">Leave blank to keep existing private key</p>
          )}
        </div>
      )}

      {/* Path Settings */}
      <div className="border-t border-slate-200 pt-6">
        <h4 className="text-sm font-semibold text-slate-900 mb-4">Path Settings</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Inbound Path</label>
            <input
              type="text"
              value={formData.inboundPath}
              onChange={(e) => updateField('inboundPath', e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="/inbound"
            />
            <p className="mt-1 text-xs text-slate-500">Directory to poll for incoming files</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Outbound Path</label>
            <input
              type="text"
              value={formData.outboundPath}
              onChange={(e) => updateField('outboundPath', e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="/outbound"
            />
            <p className="mt-1 text-xs text-slate-500">Directory to upload result files</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Archive Path</label>
            <input
              type="text"
              value={formData.archivePath}
              onChange={(e) => updateField('archivePath', e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="/archive"
            />
            <p className="mt-1 text-xs text-slate-500">Directory for processed files</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Error Path (optional)</label>
            <input
              type="text"
              value={formData.errorPath}
              onChange={(e) => updateField('errorPath', e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="/error"
            />
            <p className="mt-1 text-xs text-slate-500">Directory for files that fail processing</p>
          </div>
        </div>
      </div>

      {/* File Pattern and Preset */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">File Pattern</label>
          <input
            type="text"
            value={formData.filePattern}
            onChange={(e) => updateField('filePattern', e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="*.csv"
          />
          <p className="mt-1 text-xs text-slate-500">Glob pattern for matching files</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Mapping Preset (optional)</label>
          <select
            value={formData.presetId}
            onChange={(e) => updateField('presetId', e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Auto-detect</option>
            {presets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name} ({preset.vendor})
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">Column mapping preset for imports</p>
        </div>
      </div>

      {/* Processing Options */}
      <div className="border-t border-slate-200 pt-6">
        <h4 className="text-sm font-semibold text-slate-900 mb-4">Processing Options</h4>
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.autoProcess}
              onChange={(e) => updateField('autoProcess', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-slate-700">
              Auto-process files after download
            </span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.deleteAfterProcess}
              onChange={(e) => updateField('deleteAfterProcess', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-slate-700">
              Delete files from server after processing
            </span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.enabled}
              onChange={(e) => updateField('enabled', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-slate-700">
              Enable automatic polling
            </span>
          </label>
        </div>
      </div>

      {/* Poll Interval */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Poll Interval (minutes)</label>
        <input
          type="number"
          value={formData.pollIntervalMinutes}
          onChange={(e) => updateField('pollIntervalMinutes', parseInt(e.target.value) || 15)}
          className={`w-32 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.pollIntervalMinutes ? 'border-red-500' : 'border-slate-300'
          }`}
          min={1}
        />
        {errors.pollIntervalMinutes && (
          <p className="mt-1 text-sm text-red-500">{errors.pollIntervalMinutes}</p>
        )}
        <p className="mt-1 text-xs text-slate-500">How often to check for new files</p>
      </div>

      {/* Test Result */}
      {testResult && (
        <div
          className={`p-4 rounded-lg ${
            testResult.success
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          <div className="flex items-center">
            {testResult.success ? (
              <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className={`font-medium ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
              {testResult.message}
            </span>
          </div>
          {testResult.details && (
            <div className="mt-2 text-sm text-slate-600">
              {testResult.details.inboundPathExists !== undefined && (
                <p>Inbound path: {testResult.details.inboundPathExists ? 'Exists' : 'Not found'}</p>
              )}
              {testResult.details.outboundPathExists !== undefined && (
                <p>Outbound path: {testResult.details.outboundPathExists ? 'Exists' : 'Not found'}</p>
              )}
              {testResult.details.filesFound !== undefined && (
                <p>Files found: {testResult.details.filesFound}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t border-slate-200">
        <div>
          {onTest && (
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || !formData.host || !formData.username}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
          )}
        </div>
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : connection ? 'Update Connection' : 'Create Connection'}
          </button>
        </div>
      </div>
    </form>
  );
}
