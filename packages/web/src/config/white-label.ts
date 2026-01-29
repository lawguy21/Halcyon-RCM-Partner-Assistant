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
  brandName: 'Halcyon RCM',
  logoUrl: '/logo.svg',
  primaryColor: '#2563eb', // blue-600
  secondaryColor: '#1e40af', // blue-800
  supportEmail: 'support@halcyonrcm.com',
  supportPhone: '1-800-HALCYON',
  favicon: '/favicon.ico',
  features: defaultFeatures,
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
} as const;

/**
 * Load white-label configuration from environment variables
 */
function loadFromEnvironment(): Partial<WhiteLabelConfig> {
  const config: Partial<WhiteLabelConfig> = {};

  if (typeof window !== 'undefined' || typeof process !== 'undefined') {
    const env: Record<string, string | undefined> = typeof process !== 'undefined' ? process.env : {};

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
 * API endpoint for loading white-label configuration (if available)
 */
const API_ENDPOINT = '/api/white-label/config';

/**
 * Load white-label configuration from API
 */
async function loadFromApi(): Promise<Partial<WhiteLabelConfig> | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const response = await fetch(API_ENDPOINT);
    if (response.ok) {
      return await response.json();
    }
  } catch {
    // API not available, fall back to other sources
  }

  return null;
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

  if (config.primaryColor && !isValidHexColor(config.primaryColor)) {
    errors.push('Primary color must be a valid hex color (e.g., #2563eb)');
  }

  if (config.secondaryColor && !isValidHexColor(config.secondaryColor)) {
    errors.push('Secondary color must be a valid hex color (e.g., #1e40af)');
  }

  if (config.supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.supportEmail)) {
    errors.push('Support email must be a valid email address');
  }

  if (config.brandName && config.brandName.length > 100) {
    errors.push('Brand name must be 100 characters or less');
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

  let css = `:root {\n`;
  css += `  --wl-primary-color: ${config.primaryColor};\n`;
  css += `  --wl-secondary-color: ${config.secondaryColor};\n`;

  if (primaryRgb) {
    css += `  --wl-primary-rgb: ${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b};\n`;
  }

  if (secondaryRgb) {
    css += `  --wl-secondary-rgb: ${secondaryRgb.r}, ${secondaryRgb.g}, ${secondaryRgb.b};\n`;
  }

  css += `}\n`;

  if (config.customCss) {
    css += `\n/* Custom CSS */\n${config.customCss}\n`;
  }

  return css;
}
