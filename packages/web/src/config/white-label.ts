/**
 * White-Label Configuration System
 *
 * This module provides configuration interfaces and utilities for white-labeling
 * the Halcyon RCM Partner Assistant application.
 */

/**
 * Feature toggles for different modules in the application
 */
export interface FeatureToggles {
  /** Enable/disable the assessments module */
  assessments: boolean;
  /** Enable/disable the batch import feature */
  batchImport: boolean;
  /** Enable/disable reporting capabilities */
  reports: boolean;
  /** Enable/disable SFTP integrations */
  sftpIntegration: boolean;
  /** Enable/disable PDF export functionality */
  pdfExport: boolean;
  /** Enable/disable work queue management */
  workQueue: boolean;
  /** Enable/disable eligibility verification */
  eligibilityVerification: boolean;
  /** Enable/disable denial management */
  denialManagement: boolean;
  /** Enable/disable compliance tracking */
  complianceTracking: boolean;
}

/**
 * White-label configuration interface
 */
export interface WhiteLabelConfig {
  /** Brand name displayed throughout the application */
  brandName: string;
  /** URL to the logo image (supports data URLs, relative paths, or absolute URLs) */
  logoUrl: string;
  /** Primary brand color (hex format) */
  primaryColor: string;
  /** Secondary brand color (hex format) */
  secondaryColor: string;
  /** Support email address */
  supportEmail: string;
  /** Support phone number */
  supportPhone: string;
  /** Custom CSS to inject (optional) */
  customCss?: string;
  /** Favicon URL (supports data URLs, relative paths, or absolute URLs) */
  favicon?: string;
  /** Feature toggles for different modules */
  features: FeatureToggles;

  // Company Info
  /** Company website URL */
  companyWebsite?: string;
  /** Legal name of the organization */
  organizationLegalName?: string;

  // Legal URLs
  /** URL to terms of service page */
  termsOfServiceUrl?: string;
  /** URL to privacy policy page */
  privacyPolicyUrl?: string;

  // Additional Contact
  /** Email for compliance reports (different from support) */
  reportingEmail?: string;
  /** Email for billing inquiries */
  billingEmail?: string;

  // Technical
  /** Custom domain for the application */
  customDomain?: string;
  /** Partner's analytics tracking ID (Google Analytics or Mixpanel) */
  analyticsTrackingId?: string;

  // Localization
  /** Timezone for date/time display (e.g., "America/New_York") */
  timezone?: string;
  /** Locale for formatting (e.g., "en-US") */
  locale?: string;
  /** Date format pattern (e.g., "MM/DD/YYYY") */
  dateFormat?: string;
  /** Currency code for monetary values (e.g., "USD") */
  currencyCode?: string;

  // Advanced Branding
  /** Accent color for highlights (hex format) */
  accentColor?: string;
  /** Background color for header (hex format) */
  headerBackgroundColor?: string;
  /** Custom footer text */
  footerText?: string;
  /** URL for login page background image */
  loginBackgroundImage?: string;

  // Feature Customization
  /** Hide "Powered by Halcyon" footer branding */
  hideHalcyonBranding?: boolean;
  /** Override help documentation URL */
  customHelpUrl?: string;
  /** Custom support portal URL */
  customSupportUrl?: string;
}

/**
 * Default feature toggles - all features enabled
 */
export const defaultFeatures: FeatureToggles = {
  assessments: true,
  batchImport: true,
  reports: true,
  sftpIntegration: true,
  pdfExport: true,
  workQueue: true,
  eligibilityVerification: true,
  denialManagement: true,
  complianceTracking: true,
};

/**
 * Default white-label configuration
 */
export const defaultWhiteLabelConfig: WhiteLabelConfig = {
  brandName: 'RCM Partner',
  logoUrl: '/logo.svg',
  primaryColor: '#2563eb', // blue-600
  secondaryColor: '#1e40af', // blue-800
  supportEmail: 'support@halcyonrcm.com',
  supportPhone: '1-800-HALCYON',
  favicon: '/favicon.ico',
  features: defaultFeatures,
  // Localization defaults
  timezone: 'America/New_York',
  locale: 'en-US',
  dateFormat: 'MM/DD/YYYY',
  currencyCode: 'USD',
  // Feature customization defaults
  hideHalcyonBranding: false,
};

/**
 * Environment variable keys for white-label configuration
 */
const ENV_KEYS = {
  BRAND_NAME: 'NEXT_PUBLIC_BRAND_NAME',
  LOGO_URL: 'NEXT_PUBLIC_LOGO_URL',
  PRIMARY_COLOR: 'NEXT_PUBLIC_PRIMARY_COLOR',
  SECONDARY_COLOR: 'NEXT_PUBLIC_SECONDARY_COLOR',
  SUPPORT_EMAIL: 'NEXT_PUBLIC_SUPPORT_EMAIL',
  SUPPORT_PHONE: 'NEXT_PUBLIC_SUPPORT_PHONE',
  FAVICON: 'NEXT_PUBLIC_FAVICON',
  CUSTOM_CSS: 'NEXT_PUBLIC_CUSTOM_CSS',
  // Company Info
  COMPANY_WEBSITE: 'NEXT_PUBLIC_COMPANY_WEBSITE',
  ORGANIZATION_LEGAL_NAME: 'NEXT_PUBLIC_ORGANIZATION_LEGAL_NAME',
  // Legal URLs
  TERMS_OF_SERVICE_URL: 'NEXT_PUBLIC_TERMS_OF_SERVICE_URL',
  PRIVACY_POLICY_URL: 'NEXT_PUBLIC_PRIVACY_POLICY_URL',
  // Additional Contact
  REPORTING_EMAIL: 'NEXT_PUBLIC_REPORTING_EMAIL',
  BILLING_EMAIL: 'NEXT_PUBLIC_BILLING_EMAIL',
  // Technical
  CUSTOM_DOMAIN: 'NEXT_PUBLIC_CUSTOM_DOMAIN',
  ANALYTICS_TRACKING_ID: 'NEXT_PUBLIC_ANALYTICS_TRACKING_ID',
  // Localization
  TIMEZONE: 'NEXT_PUBLIC_TIMEZONE',
  LOCALE: 'NEXT_PUBLIC_LOCALE',
  DATE_FORMAT: 'NEXT_PUBLIC_DATE_FORMAT',
  CURRENCY_CODE: 'NEXT_PUBLIC_CURRENCY_CODE',
  // Advanced Branding
  ACCENT_COLOR: 'NEXT_PUBLIC_ACCENT_COLOR',
  HEADER_BACKGROUND_COLOR: 'NEXT_PUBLIC_HEADER_BACKGROUND_COLOR',
  FOOTER_TEXT: 'NEXT_PUBLIC_FOOTER_TEXT',
  LOGIN_BACKGROUND_IMAGE: 'NEXT_PUBLIC_LOGIN_BACKGROUND_IMAGE',
  // Feature Customization
  HIDE_HALCYON_BRANDING: 'NEXT_PUBLIC_HIDE_HALCYON_BRANDING',
  CUSTOM_HELP_URL: 'NEXT_PUBLIC_CUSTOM_HELP_URL',
  CUSTOM_SUPPORT_URL: 'NEXT_PUBLIC_CUSTOM_SUPPORT_URL',
} as const;

/**
 * Load white-label configuration from environment variables
 */
function loadFromEnvironment(): Partial<WhiteLabelConfig> {
  const config: Partial<WhiteLabelConfig> = {};

  if (typeof window !== 'undefined' || typeof process !== 'undefined') {
    const env: Record<string, string | undefined> = typeof process !== 'undefined' ? process.env : {};

    // Basic branding
    if (env[ENV_KEYS.BRAND_NAME]) {
      config.brandName = env[ENV_KEYS.BRAND_NAME];
    }
    if (env[ENV_KEYS.LOGO_URL]) {
      config.logoUrl = env[ENV_KEYS.LOGO_URL];
    }
    if (env[ENV_KEYS.PRIMARY_COLOR]) {
      config.primaryColor = env[ENV_KEYS.PRIMARY_COLOR];
    }
    if (env[ENV_KEYS.SECONDARY_COLOR]) {
      config.secondaryColor = env[ENV_KEYS.SECONDARY_COLOR];
    }
    if (env[ENV_KEYS.SUPPORT_EMAIL]) {
      config.supportEmail = env[ENV_KEYS.SUPPORT_EMAIL];
    }
    if (env[ENV_KEYS.SUPPORT_PHONE]) {
      config.supportPhone = env[ENV_KEYS.SUPPORT_PHONE];
    }
    if (env[ENV_KEYS.FAVICON]) {
      config.favicon = env[ENV_KEYS.FAVICON];
    }
    if (env[ENV_KEYS.CUSTOM_CSS]) {
      config.customCss = env[ENV_KEYS.CUSTOM_CSS];
    }

    // Company Info
    if (env[ENV_KEYS.COMPANY_WEBSITE]) {
      config.companyWebsite = env[ENV_KEYS.COMPANY_WEBSITE];
    }
    if (env[ENV_KEYS.ORGANIZATION_LEGAL_NAME]) {
      config.organizationLegalName = env[ENV_KEYS.ORGANIZATION_LEGAL_NAME];
    }

    // Legal URLs
    if (env[ENV_KEYS.TERMS_OF_SERVICE_URL]) {
      config.termsOfServiceUrl = env[ENV_KEYS.TERMS_OF_SERVICE_URL];
    }
    if (env[ENV_KEYS.PRIVACY_POLICY_URL]) {
      config.privacyPolicyUrl = env[ENV_KEYS.PRIVACY_POLICY_URL];
    }

    // Additional Contact
    if (env[ENV_KEYS.REPORTING_EMAIL]) {
      config.reportingEmail = env[ENV_KEYS.REPORTING_EMAIL];
    }
    if (env[ENV_KEYS.BILLING_EMAIL]) {
      config.billingEmail = env[ENV_KEYS.BILLING_EMAIL];
    }

    // Technical
    if (env[ENV_KEYS.CUSTOM_DOMAIN]) {
      config.customDomain = env[ENV_KEYS.CUSTOM_DOMAIN];
    }
    if (env[ENV_KEYS.ANALYTICS_TRACKING_ID]) {
      config.analyticsTrackingId = env[ENV_KEYS.ANALYTICS_TRACKING_ID];
    }

    // Localization
    if (env[ENV_KEYS.TIMEZONE]) {
      config.timezone = env[ENV_KEYS.TIMEZONE];
    }
    if (env[ENV_KEYS.LOCALE]) {
      config.locale = env[ENV_KEYS.LOCALE];
    }
    if (env[ENV_KEYS.DATE_FORMAT]) {
      config.dateFormat = env[ENV_KEYS.DATE_FORMAT];
    }
    if (env[ENV_KEYS.CURRENCY_CODE]) {
      config.currencyCode = env[ENV_KEYS.CURRENCY_CODE];
    }

    // Advanced Branding
    if (env[ENV_KEYS.ACCENT_COLOR]) {
      config.accentColor = env[ENV_KEYS.ACCENT_COLOR];
    }
    if (env[ENV_KEYS.HEADER_BACKGROUND_COLOR]) {
      config.headerBackgroundColor = env[ENV_KEYS.HEADER_BACKGROUND_COLOR];
    }
    if (env[ENV_KEYS.FOOTER_TEXT]) {
      config.footerText = env[ENV_KEYS.FOOTER_TEXT];
    }
    if (env[ENV_KEYS.LOGIN_BACKGROUND_IMAGE]) {
      config.loginBackgroundImage = env[ENV_KEYS.LOGIN_BACKGROUND_IMAGE];
    }

    // Feature Customization
    if (env[ENV_KEYS.HIDE_HALCYON_BRANDING]) {
      config.hideHalcyonBranding = env[ENV_KEYS.HIDE_HALCYON_BRANDING] === 'true';
    }
    if (env[ENV_KEYS.CUSTOM_HELP_URL]) {
      config.customHelpUrl = env[ENV_KEYS.CUSTOM_HELP_URL];
    }
    if (env[ENV_KEYS.CUSTOM_SUPPORT_URL]) {
      config.customSupportUrl = env[ENV_KEYS.CUSTOM_SUPPORT_URL];
    }
  }

  return config;
}

/**
 * Local storage key for white-label configuration
 */
const STORAGE_KEY = 'halcyon_white_label_config';

/**
 * Load white-label configuration from localStorage
 */
function loadFromLocalStorage(): Partial<WhiteLabelConfig> | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as Partial<WhiteLabelConfig>;
    }
  } catch (error) {
    console.warn('Failed to load white-label config from localStorage:', error);
  }

  return null;
}

/**
 * Save white-label configuration to localStorage
 */
export function saveToLocalStorage(config: WhiteLabelConfig): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.warn('Failed to save white-label config to localStorage:', error);
  }
}

/**
 * Clear white-label configuration from localStorage
 */
export function clearLocalStorage(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear white-label config from localStorage:', error);
  }
}

/**
 * API endpoint for loading white-label configuration
 * Uses public endpoint that doesn't require authentication
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
const API_PUBLIC_ENDPOINT = `${API_BASE_URL}/api/white-label/public-config`;
const API_CONFIG_ENDPOINT = `${API_BASE_URL}/api/white-label/config`;

/**
 * API request timeout in milliseconds
 */
const API_TIMEOUT = 5000;

/**
 * Load white-label configuration from API
 * @returns Configuration from API or null if unavailable
 */
async function loadFromApi(): Promise<Partial<WhiteLabelConfig> | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    const response = await fetch(API_PUBLIC_ENDPOINT, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      // Cache API response to localStorage
      if (data) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch {
          // Ignore localStorage errors
        }
      }
      return data;
    }

    // Handle specific error statuses
    if (response.status === 401 || response.status === 403) {
      console.warn('White-label API: Unauthorized. Using cached/local config.');
    } else if (response.status >= 500) {
      console.warn('White-label API: Server error. Using cached/local config.');
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('White-label API: Request timeout. Using cached/local config.');
    } else {
      // API not available, fall back to other sources
      console.warn('White-label API: Network error. Using cached/local config.');
    }
  }

  return null;
}

/**
 * Save white-label configuration to API
 * @param config Configuration to save
 * @returns True if saved successfully, false otherwise
 */
export async function saveToApi(config: WhiteLabelConfig): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    const response = await fetch(API_CONFIG_ENDPOINT, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(config),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      // Also update localStorage as cache
      saveToLocalStorage(config);
      return true;
    }

    console.error('Failed to save white-label config to API:', response.statusText);
    return false;
  } catch (error) {
    console.error('Error saving white-label config to API:', error);
    return false;
  }
}

/**
 * Load white-label configuration with priority:
 * 1. API (if available)
 * 2. LocalStorage (for persisted admin changes)
 * 3. Environment variables
 * 4. Default configuration
 */
export async function loadWhiteLabelConfig(): Promise<WhiteLabelConfig> {
  // Start with defaults
  let config: WhiteLabelConfig = { ...defaultWhiteLabelConfig };

  // Layer 1: Environment variables (lowest priority, but available immediately)
  const envConfig = loadFromEnvironment();
  config = { ...config, ...envConfig, features: { ...config.features, ...envConfig.features } };

  // Layer 2: LocalStorage (higher priority, persisted admin changes)
  const storedConfig = loadFromLocalStorage();
  if (storedConfig) {
    config = {
      ...config,
      ...storedConfig,
      features: { ...config.features, ...storedConfig.features }
    };
  }

  // Layer 3: API (highest priority, server-side configuration)
  const apiConfig = await loadFromApi();
  if (apiConfig) {
    config = {
      ...config,
      ...apiConfig,
      features: { ...config.features, ...apiConfig.features }
    };
  }

  return config;
}

/**
 * Synchronously load white-label configuration (without API)
 * Useful for initial render before async loading completes
 */
export function loadWhiteLabelConfigSync(): WhiteLabelConfig {
  let config: WhiteLabelConfig = { ...defaultWhiteLabelConfig };

  const envConfig = loadFromEnvironment();
  config = { ...config, ...envConfig, features: { ...config.features, ...envConfig.features } };

  const storedConfig = loadFromLocalStorage();
  if (storedConfig) {
    config = {
      ...config,
      ...storedConfig,
      features: { ...config.features, ...storedConfig.features }
    };
  }

  return config;
}

/**
 * Validate a color string (hex format)
 */
export function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

/**
 * Validate white-label configuration
 */
export function validateConfig(config: Partial<WhiteLabelConfig>): string[] {
  const errors: string[] = [];
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const urlRegex = /^https?:\/\/.+/;

  if (config.primaryColor && !isValidHexColor(config.primaryColor)) {
    errors.push('Primary color must be a valid hex color (e.g., #2563eb)');
  }

  if (config.secondaryColor && !isValidHexColor(config.secondaryColor)) {
    errors.push('Secondary color must be a valid hex color (e.g., #1e40af)');
  }

  if (config.accentColor && !isValidHexColor(config.accentColor)) {
    errors.push('Accent color must be a valid hex color (e.g., #10b981)');
  }

  if (config.headerBackgroundColor && !isValidHexColor(config.headerBackgroundColor)) {
    errors.push('Header background color must be a valid hex color');
  }

  if (config.supportEmail && !emailRegex.test(config.supportEmail)) {
    errors.push('Support email must be a valid email address');
  }

  if (config.reportingEmail && !emailRegex.test(config.reportingEmail)) {
    errors.push('Reporting email must be a valid email address');
  }

  if (config.billingEmail && !emailRegex.test(config.billingEmail)) {
    errors.push('Billing email must be a valid email address');
  }

  if (config.brandName && config.brandName.length > 100) {
    errors.push('Brand name must be 100 characters or less');
  }

  if (config.companyWebsite && !urlRegex.test(config.companyWebsite)) {
    errors.push('Company website must be a valid URL starting with http:// or https://');
  }

  if (config.termsOfServiceUrl && !urlRegex.test(config.termsOfServiceUrl)) {
    errors.push('Terms of service URL must be a valid URL');
  }

  if (config.privacyPolicyUrl && !urlRegex.test(config.privacyPolicyUrl)) {
    errors.push('Privacy policy URL must be a valid URL');
  }

  if (config.customHelpUrl && !urlRegex.test(config.customHelpUrl)) {
    errors.push('Custom help URL must be a valid URL');
  }

  if (config.customSupportUrl && !urlRegex.test(config.customSupportUrl)) {
    errors.push('Custom support URL must be a valid URL');
  }

  return errors;
}

/**
 * Convert hex color to RGB values
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Generate CSS variables from white-label configuration
 */
export function generateCssVariables(config: WhiteLabelConfig): string {
  const primaryRgb = hexToRgb(config.primaryColor);
  const secondaryRgb = hexToRgb(config.secondaryColor);
  const accentRgb = config.accentColor ? hexToRgb(config.accentColor) : null;
  const headerBgRgb = config.headerBackgroundColor ? hexToRgb(config.headerBackgroundColor) : null;

  let css = `:root {\n`;
  css += `  --wl-primary-color: ${config.primaryColor};\n`;
  css += `  --wl-secondary-color: ${config.secondaryColor};\n`;

  if (primaryRgb) {
    css += `  --wl-primary-rgb: ${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b};\n`;
  }

  if (secondaryRgb) {
    css += `  --wl-secondary-rgb: ${secondaryRgb.r}, ${secondaryRgb.g}, ${secondaryRgb.b};\n`;
  }

  // Advanced branding colors
  if (config.accentColor) {
    css += `  --wl-accent-color: ${config.accentColor};\n`;
    if (accentRgb) {
      css += `  --wl-accent-rgb: ${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b};\n`;
    }
  }

  if (config.headerBackgroundColor) {
    css += `  --wl-header-bg-color: ${config.headerBackgroundColor};\n`;
    if (headerBgRgb) {
      css += `  --wl-header-bg-rgb: ${headerBgRgb.r}, ${headerBgRgb.g}, ${headerBgRgb.b};\n`;
    }
  }

  if (config.loginBackgroundImage) {
    css += `  --wl-login-bg-image: url('${config.loginBackgroundImage}');\n`;
  }

  css += `}\n`;

  if (config.customCss) {
    css += `\n/* Custom CSS */\n${config.customCss}\n`;
  }

  return css;
}
