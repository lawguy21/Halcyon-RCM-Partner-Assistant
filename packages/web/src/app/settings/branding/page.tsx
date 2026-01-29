'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useWhiteLabel, useBrandInfo } from '@/providers/WhiteLabelProvider';
import { FeatureToggles, isValidHexColor, defaultWhiteLabelConfig } from '@/config/white-label';

/**
 * Admin page for configuring white-label/branding settings
 */
export default function BrandingSettingsPage() {
  const { config, updateConfig, updateFeatures, resetConfig, saveConfig, validationErrors } = useWhiteLabel();
  const brandInfo = useBrandInfo();

  // Local state for form inputs (to allow editing without immediate updates)
  const [formState, setFormState] = useState({
    brandName: config.brandName,
    logoUrl: config.logoUrl,
    primaryColor: config.primaryColor,
    secondaryColor: config.secondaryColor,
    supportEmail: config.supportEmail,
    supportPhone: config.supportPhone,
    favicon: config.favicon || '',
    customCss: config.customCss || '',
  });

  const [features, setFeatures] = useState<FeatureToggles>({ ...config.features });
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  // Sync form state when config changes externally
  useEffect(() => {
    setFormState({
      brandName: config.brandName,
      logoUrl: config.logoUrl,
      primaryColor: config.primaryColor,
      secondaryColor: config.secondaryColor,
      supportEmail: config.supportEmail,
      supportPhone: config.supportPhone,
      favicon: config.favicon || '',
      customCss: config.customCss || '',
    });
    setFeatures({ ...config.features });
  }, [config]);

  // Track changes
  useEffect(() => {
    const hasFormChanges =
      formState.brandName !== config.brandName ||
      formState.logoUrl !== config.logoUrl ||
      formState.primaryColor !== config.primaryColor ||
      formState.secondaryColor !== config.secondaryColor ||
      formState.supportEmail !== config.supportEmail ||
      formState.supportPhone !== config.supportPhone ||
      formState.favicon !== (config.favicon || '') ||
      formState.customCss !== (config.customCss || '');

    const hasFeatureChanges = Object.keys(features).some(
      (key) => features[key as keyof FeatureToggles] !== config.features[key as keyof FeatureToggles]
    );

    setHasChanges(hasFormChanges || hasFeatureChanges);
  }, [formState, features, config]);

  // Handle form field changes
  const handleInputChange = useCallback((field: keyof typeof formState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
    setSaveSuccess(false);
  }, []);

  // Handle feature toggle
  const handleFeatureToggle = useCallback((feature: keyof FeatureToggles) => {
    setFeatures((prev) => ({ ...prev, [feature]: !prev[feature] }));
    setSaveSuccess(false);
  }, []);

  // Handle logo file upload
  const handleLogoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Logo file must be smaller than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      handleInputChange('logoUrl', dataUrl);
    };
    reader.readAsDataURL(file);
  }, [handleInputChange]);

  // Handle favicon file upload
  const handleFaviconUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/') && !file.name.endsWith('.ico')) {
      alert('Please select an image or .ico file');
      return;
    }

    // Validate file size (max 500KB)
    if (file.size > 500 * 1024) {
      alert('Favicon file must be smaller than 500KB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      handleInputChange('favicon', dataUrl);
    };
    reader.readAsDataURL(file);
  }, [handleInputChange]);

  // Apply preview
  const handlePreview = useCallback(() => {
    updateConfig({
      ...formState,
    });
    updateFeatures(features);
    setPreviewMode(true);
  }, [formState, features, updateConfig, updateFeatures]);

  // Save changes
  const handleSave = useCallback(() => {
    updateConfig({
      ...formState,
    });
    updateFeatures(features);
    saveConfig();
    setHasChanges(false);
    setSaveSuccess(true);
    setPreviewMode(false);

    // Clear success message after 3 seconds
    setTimeout(() => setSaveSuccess(false), 3000);
  }, [formState, features, updateConfig, updateFeatures, saveConfig]);

  // Cancel preview and revert
  const handleCancelPreview = useCallback(() => {
    // Reload config from storage
    window.location.reload();
  }, []);

  // Reset to defaults
  const handleReset = useCallback(() => {
    if (confirm('Are you sure you want to reset all branding to default values?')) {
      resetConfig();
      setFormState({
        brandName: defaultWhiteLabelConfig.brandName,
        logoUrl: defaultWhiteLabelConfig.logoUrl,
        primaryColor: defaultWhiteLabelConfig.primaryColor,
        secondaryColor: defaultWhiteLabelConfig.secondaryColor,
        supportEmail: defaultWhiteLabelConfig.supportEmail,
        supportPhone: defaultWhiteLabelConfig.supportPhone,
        favicon: defaultWhiteLabelConfig.favicon || '',
        customCss: defaultWhiteLabelConfig.customCss || '',
      });
      setFeatures({ ...defaultWhiteLabelConfig.features });
      saveConfig();
    }
  }, [resetConfig, saveConfig]);

  // Feature toggle labels
  const featureLabels: Record<keyof FeatureToggles, { label: string; description: string }> = {
    assessments: {
      label: 'Assessments',
      description: 'Enable the assessments module for recovery analysis',
    },
    batchImport: {
      label: 'Batch Import',
      description: 'Allow bulk importing of data via CSV files',
    },
    reports: {
      label: 'Reports',
      description: 'Enable reporting and analytics features',
    },
    sftpIntegration: {
      label: 'SFTP Integration',
      description: 'Allow SFTP connections for file transfers',
    },
    pdfExport: {
      label: 'PDF Export',
      description: 'Enable exporting data to PDF format',
    },
    workQueue: {
      label: 'Work Queue',
      description: 'Enable work queue management features',
    },
    eligibilityVerification: {
      label: 'Eligibility Verification',
      description: 'Enable patient eligibility verification',
    },
    denialManagement: {
      label: 'Denial Management',
      description: 'Enable denial tracking and management',
    },
    complianceTracking: {
      label: 'Compliance Tracking',
      description: 'Enable compliance monitoring features',
    },
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 text-sm text-slate-500 mb-2">
            <Link href="/settings" className="hover:text-blue-600">
              Settings
            </Link>
            <span>/</span>
            <span>Branding</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Branding & White-Label</h2>
          <p className="text-slate-500 mt-1">
            Customize the appearance and features of your application
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {previewMode && (
            <button
              onClick={handleCancelPreview}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium text-sm"
            >
              Cancel Preview
            </button>
          )}
          <button
            onClick={handleReset}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium text-sm"
          >
            Reset to Defaults
          </button>
          {hasChanges && !previewMode && (
            <button
              onClick={handlePreview}
              className="px-4 py-2 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 font-medium text-sm"
            >
              Preview Changes
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!hasChanges && !previewMode}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Changes
          </button>
        </div>
      </div>

      {/* Success Message */}
      {saveSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center space-x-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Branding settings saved successfully!</span>
        </div>
      )}

      {/* Preview Mode Banner */}
      {previewMode && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span>Preview mode active - changes are not saved yet</span>
          </div>
        </div>
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">Please fix the following errors:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 ml-7">
            {validationErrors.map((error, index) => (
              <li key={index} className="text-sm">{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Brand Identity */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Brand Identity</h3>

            <div className="space-y-6">
              {/* Brand Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Brand Name
                </label>
                <input
                  type="text"
                  value={formState.brandName}
                  onChange={(e) => handleInputChange('brandName', e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Your Brand Name"
                />
                <p className="mt-1 text-xs text-slate-500">
                  This name will appear throughout the application
                </p>
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Logo
                </label>
                <div className="flex items-center space-x-4">
                  <div className="w-24 h-24 border border-slate-200 rounded-lg flex items-center justify-center bg-slate-50 overflow-hidden">
                    {formState.logoUrl ? (
                      <img
                        src={formState.logoUrl}
                        alt="Logo preview"
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => logoInputRef.current?.click()}
                      className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium text-sm"
                    >
                      Upload Logo
                    </button>
                    <p className="mt-2 text-xs text-slate-500">
                      PNG, JPG, or SVG. Max 2MB. Recommended: 200x200px
                    </p>
                    <div className="mt-2">
                      <input
                        type="text"
                        value={formState.logoUrl}
                        onChange={(e) => handleInputChange('logoUrl', e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Or enter logo URL"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Favicon Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Favicon
                </label>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 border border-slate-200 rounded-lg flex items-center justify-center bg-slate-50 overflow-hidden">
                    {formState.favicon ? (
                      <img
                        src={formState.favicon}
                        alt="Favicon preview"
                        className="w-8 h-8 object-contain"
                      />
                    ) : (
                      <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      ref={faviconInputRef}
                      type="file"
                      accept="image/*,.ico"
                      onChange={handleFaviconUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => faviconInputRef.current?.click()}
                      className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium text-sm"
                    >
                      Upload Favicon
                    </button>
                    <p className="mt-2 text-xs text-slate-500">
                      ICO, PNG, or SVG. Max 500KB. Recommended: 32x32px
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Colors */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Brand Colors</h3>

            <div className="grid grid-cols-2 gap-6">
              {/* Primary Color */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Primary Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={formState.primaryColor}
                    onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                    className="w-12 h-12 rounded-lg border border-slate-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formState.primaryColor}
                    onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                    className={`flex-1 border rounded-lg px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      !isValidHexColor(formState.primaryColor) ? 'border-red-300' : 'border-slate-300'
                    }`}
                    placeholder="#2563eb"
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Used for buttons, links, and primary actions
                </p>
              </div>

              {/* Secondary Color */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Secondary Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={formState.secondaryColor}
                    onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                    className="w-12 h-12 rounded-lg border border-slate-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formState.secondaryColor}
                    onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                    className={`flex-1 border rounded-lg px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      !isValidHexColor(formState.secondaryColor) ? 'border-red-300' : 'border-slate-300'
                    }`}
                    placeholder="#1e40af"
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Used for accents and hover states
                </p>
              </div>
            </div>
          </div>

          {/* Support Information */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Support Information</h3>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Support Email
                </label>
                <input
                  type="email"
                  value={formState.supportEmail}
                  onChange={(e) => handleInputChange('supportEmail', e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="support@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Support Phone
                </label>
                <input
                  type="tel"
                  value={formState.supportPhone}
                  onChange={(e) => handleInputChange('supportPhone', e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="1-800-EXAMPLE"
                />
              </div>
            </div>
          </div>

          {/* Custom CSS */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Custom CSS</h3>
            <p className="text-sm text-slate-500 mb-4">
              Add custom CSS to further customize the appearance. Use with caution.
            </p>
            <textarea
              value={formState.customCss}
              onChange={(e) => handleInputChange('customCss', e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={6}
              placeholder={`.custom-class {\n  /* Your CSS here */\n}`}
            />
          </div>

          {/* Feature Toggles */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Feature Toggles</h3>
            <p className="text-sm text-slate-500 mb-6">
              Enable or disable specific modules and features in the application.
            </p>

            <div className="space-y-4">
              {(Object.keys(featureLabels) as Array<keyof FeatureToggles>).map((feature) => (
                <div
                  key={feature}
                  className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0"
                >
                  <div>
                    <h4 className="text-sm font-medium text-slate-900">
                      {featureLabels[feature].label}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {featureLabels[feature].description}
                    </p>
                  </div>
                  <button
                    onClick={() => handleFeatureToggle(feature)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      features[feature] ? 'bg-blue-600' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                        features[feature] ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sticky top-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Preview</h3>

            {/* Brand Preview */}
            <div className="space-y-6">
              {/* Header Preview */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div
                  className="p-4 text-white"
                  style={{ backgroundColor: formState.primaryColor }}
                >
                  <div className="flex items-center space-x-3">
                    {formState.logoUrl && (
                      <img
                        src={formState.logoUrl}
                        alt="Logo"
                        className="w-8 h-8 object-contain"
                      />
                    )}
                    <span className="font-semibold">{formState.brandName}</span>
                  </div>
                </div>
                <div className="p-4 bg-slate-50">
                  <p className="text-sm text-slate-600">
                    Sample content area with your branding applied.
                  </p>
                </div>
              </div>

              {/* Button Preview */}
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-2">Buttons</h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="px-4 py-2 text-white rounded-lg font-medium text-sm"
                    style={{ backgroundColor: formState.primaryColor }}
                  >
                    Primary
                  </button>
                  <button
                    className="px-4 py-2 text-white rounded-lg font-medium text-sm"
                    style={{ backgroundColor: formState.secondaryColor }}
                  >
                    Secondary
                  </button>
                </div>
              </div>

              {/* Color Swatches */}
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-2">Color Palette</h4>
                <div className="flex space-x-2">
                  <div
                    className="w-12 h-12 rounded-lg border border-slate-200"
                    style={{ backgroundColor: formState.primaryColor }}
                    title="Primary"
                  />
                  <div
                    className="w-12 h-12 rounded-lg border border-slate-200"
                    style={{ backgroundColor: formState.secondaryColor }}
                    title="Secondary"
                  />
                </div>
              </div>

              {/* Support Info Preview */}
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-2">Support Info</h4>
                <div className="text-sm text-slate-600 space-y-1">
                  <p>
                    <span className="text-slate-400">Email:</span> {formState.supportEmail}
                  </p>
                  <p>
                    <span className="text-slate-400">Phone:</span> {formState.supportPhone}
                  </p>
                </div>
              </div>

              {/* Active Features */}
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-2">Active Features</h4>
                <div className="flex flex-wrap gap-1">
                  {(Object.keys(features) as Array<keyof FeatureToggles>)
                    .filter((f) => features[f])
                    .map((feature) => (
                      <span
                        key={feature}
                        className="inline-flex px-2 py-0.5 text-xs font-medium rounded"
                        style={{
                          backgroundColor: `${formState.primaryColor}20`,
                          color: formState.primaryColor,
                        }}
                      >
                        {featureLabels[feature].label}
                      </span>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
