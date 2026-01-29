// @ts-nocheck
/**
 * White-Label Service
 *
 * Service layer for managing white-label configurations including
 * branding, support info, legal URLs, and feature flags.
 */

import { prisma } from '../lib/prisma.js';

// ============================================================================
// TYPES
// ============================================================================

export interface WhiteLabelConfigInput {
  // Branding
  brandName?: string;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  primaryColor?: string;
  secondaryColor?: string;

  // Support
  supportEmail?: string | null;
  supportPhone?: string | null;
  companyWebsite?: string | null;

  // Legal
  termsOfServiceUrl?: string | null;
  privacyPolicyUrl?: string | null;
  organizationLegalName?: string | null;

  // Features
  features?: Record<string, unknown>;
  customCss?: string | null;

  // Analytics
  analyticsTrackingId?: string | null;

  // Locale
  timezone?: string;
  locale?: string;
}

export interface WhiteLabelConfig {
  id: string;
  organizationId: string;

  // Branding
  brandName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string;

  // Support
  supportEmail: string | null;
  supportPhone: string | null;
  companyWebsite: string | null;

  // Legal
  termsOfServiceUrl: string | null;
  privacyPolicyUrl: string | null;
  organizationLegalName: string | null;

  // Features
  features: Record<string, unknown>;
  customCss: string | null;

  // Analytics
  analyticsTrackingId: string | null;

  // Locale
  timezone: string;
  locale: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface ValidationResult {
  valid: boolean;
  errors: Array<{ field: string; message: string }>;
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: Omit<WhiteLabelConfig, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'> = {
  // Branding
  brandName: 'RCM Partner',
  logoUrl: null,
  faviconUrl: null,
  primaryColor: '#2563eb',
  secondaryColor: '#1e40af',

  // Support
  supportEmail: null,
  supportPhone: null,
  companyWebsite: null,

  // Legal
  termsOfServiceUrl: null,
  privacyPolicyUrl: null,
  organizationLegalName: null,

  // Features
  features: {},
  customCss: null,

  // Analytics
  analyticsTrackingId: null,

  // Locale
  timezone: 'America/New_York',
  locale: 'en-US',
};

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate a hex color string
 */
function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

/**
 * Validate a URL string
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate an email address
 */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate a phone number (basic validation)
 */
function isValidPhone(phone: string): boolean {
  // Remove common formatting characters and check for reasonable length
  const digits = phone.replace(/[\s\-\(\)\+\.]/g, '');
  return /^\d{7,15}$/.test(digits);
}

/**
 * Validate a timezone string
 */
function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate a locale string
 */
function isValidLocale(locale: string): boolean {
  try {
    Intl.DateTimeFormat(locale);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// WHITE-LABEL SERVICE CLASS
// ============================================================================

class WhiteLabelService {
  /**
   * Get white-label config for an organization
   * Returns config from database or default values
   */
  async getConfig(organizationId: string): Promise<WhiteLabelConfig> {
    const config = await prisma.whiteLabelConfig.findUnique({
      where: { organizationId },
    });

    if (config) {
      return {
        ...config,
        features: (config.features as Record<string, unknown>) || {},
      };
    }

    // Return default config with the organization ID
    return {
      id: '',
      organizationId,
      ...DEFAULT_CONFIG,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Update white-label config for an organization
   * Creates config if it doesn't exist (upsert)
   */
  async updateConfig(
    organizationId: string,
    updates: WhiteLabelConfigInput,
    updatedBy?: string
  ): Promise<WhiteLabelConfig> {
    // Validate the updates
    const validation = this.validateConfig(updates);
    if (!validation.valid) {
      const errorMessages = validation.errors.map(e => `${e.field}: ${e.message}`).join(', ');
      throw new Error(`Validation failed: ${errorMessages}`);
    }

    // Verify organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new Error('Organization not found');
    }

    // Build update data, filtering out undefined values
    const updateData: Record<string, unknown> = {};

    if (updates.brandName !== undefined) updateData.brandName = updates.brandName;
    if (updates.logoUrl !== undefined) updateData.logoUrl = updates.logoUrl;
    if (updates.faviconUrl !== undefined) updateData.faviconUrl = updates.faviconUrl;
    if (updates.primaryColor !== undefined) updateData.primaryColor = updates.primaryColor;
    if (updates.secondaryColor !== undefined) updateData.secondaryColor = updates.secondaryColor;
    if (updates.supportEmail !== undefined) updateData.supportEmail = updates.supportEmail;
    if (updates.supportPhone !== undefined) updateData.supportPhone = updates.supportPhone;
    if (updates.companyWebsite !== undefined) updateData.companyWebsite = updates.companyWebsite;
    if (updates.termsOfServiceUrl !== undefined) updateData.termsOfServiceUrl = updates.termsOfServiceUrl;
    if (updates.privacyPolicyUrl !== undefined) updateData.privacyPolicyUrl = updates.privacyPolicyUrl;
    if (updates.organizationLegalName !== undefined) updateData.organizationLegalName = updates.organizationLegalName;
    if (updates.features !== undefined) updateData.features = updates.features;
    if (updates.customCss !== undefined) updateData.customCss = updates.customCss;
    if (updates.analyticsTrackingId !== undefined) updateData.analyticsTrackingId = updates.analyticsTrackingId;
    if (updates.timezone !== undefined) updateData.timezone = updates.timezone;
    if (updates.locale !== undefined) updateData.locale = updates.locale;

    // Upsert the config
    const config = await prisma.whiteLabelConfig.upsert({
      where: { organizationId },
      create: {
        organizationId,
        ...DEFAULT_CONFIG,
        ...updateData,
        features: updateData.features || DEFAULT_CONFIG.features,
      },
      update: updateData,
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entityType: 'WhiteLabelConfig',
        entityId: config.id,
        userId: updatedBy,
        details: {
          organizationId,
          updatedFields: Object.keys(updateData),
        },
      },
    });

    return {
      ...config,
      features: (config.features as Record<string, unknown>) || {},
    };
  }

  /**
   * Get default configuration values
   */
  getDefaultConfig(): typeof DEFAULT_CONFIG {
    return { ...DEFAULT_CONFIG };
  }

  /**
   * Validate configuration values
   */
  validateConfig(config: WhiteLabelConfigInput): ValidationResult {
    const errors: Array<{ field: string; message: string }> = [];

    // Validate brand name
    if (config.brandName !== undefined) {
      if (typeof config.brandName !== 'string') {
        errors.push({ field: 'brandName', message: 'Must be a string' });
      } else if (config.brandName.length === 0) {
        errors.push({ field: 'brandName', message: 'Cannot be empty' });
      } else if (config.brandName.length > 100) {
        errors.push({ field: 'brandName', message: 'Cannot exceed 100 characters' });
      }
    }

    // Validate colors
    if (config.primaryColor !== undefined && config.primaryColor !== null) {
      if (!isValidHexColor(config.primaryColor)) {
        errors.push({ field: 'primaryColor', message: 'Must be a valid hex color (e.g., #2563eb)' });
      }
    }

    if (config.secondaryColor !== undefined && config.secondaryColor !== null) {
      if (!isValidHexColor(config.secondaryColor)) {
        errors.push({ field: 'secondaryColor', message: 'Must be a valid hex color (e.g., #1e40af)' });
      }
    }

    // Validate URLs
    const urlFields = [
      { field: 'logoUrl', value: config.logoUrl },
      { field: 'faviconUrl', value: config.faviconUrl },
      { field: 'companyWebsite', value: config.companyWebsite },
      { field: 'termsOfServiceUrl', value: config.termsOfServiceUrl },
      { field: 'privacyPolicyUrl', value: config.privacyPolicyUrl },
    ];

    for (const { field, value } of urlFields) {
      if (value !== undefined && value !== null && value !== '') {
        if (!isValidUrl(value)) {
          errors.push({ field, message: 'Must be a valid URL' });
        }
      }
    }

    // Validate email
    if (config.supportEmail !== undefined && config.supportEmail !== null && config.supportEmail !== '') {
      if (!isValidEmail(config.supportEmail)) {
        errors.push({ field: 'supportEmail', message: 'Must be a valid email address' });
      }
    }

    // Validate phone
    if (config.supportPhone !== undefined && config.supportPhone !== null && config.supportPhone !== '') {
      if (!isValidPhone(config.supportPhone)) {
        errors.push({ field: 'supportPhone', message: 'Must be a valid phone number' });
      }
    }

    // Validate timezone
    if (config.timezone !== undefined && config.timezone !== null) {
      if (!isValidTimezone(config.timezone)) {
        errors.push({ field: 'timezone', message: 'Must be a valid IANA timezone' });
      }
    }

    // Validate locale
    if (config.locale !== undefined && config.locale !== null) {
      if (!isValidLocale(config.locale)) {
        errors.push({ field: 'locale', message: 'Must be a valid locale string' });
      }
    }

    // Validate features (must be an object)
    if (config.features !== undefined && config.features !== null) {
      if (typeof config.features !== 'object' || Array.isArray(config.features)) {
        errors.push({ field: 'features', message: 'Must be an object' });
      }
    }

    // Validate customCss length
    if (config.customCss !== undefined && config.customCss !== null) {
      if (typeof config.customCss !== 'string') {
        errors.push({ field: 'customCss', message: 'Must be a string' });
      } else if (config.customCss.length > 50000) {
        errors.push({ field: 'customCss', message: 'Cannot exceed 50000 characters' });
      }
    }

    // Validate organization legal name
    if (config.organizationLegalName !== undefined && config.organizationLegalName !== null) {
      if (typeof config.organizationLegalName !== 'string') {
        errors.push({ field: 'organizationLegalName', message: 'Must be a string' });
      } else if (config.organizationLegalName.length > 255) {
        errors.push({ field: 'organizationLegalName', message: 'Cannot exceed 255 characters' });
      }
    }

    // Validate analytics tracking ID
    if (config.analyticsTrackingId !== undefined && config.analyticsTrackingId !== null && config.analyticsTrackingId !== '') {
      if (typeof config.analyticsTrackingId !== 'string') {
        errors.push({ field: 'analyticsTrackingId', message: 'Must be a string' });
      } else if (config.analyticsTrackingId.length > 50) {
        errors.push({ field: 'analyticsTrackingId', message: 'Cannot exceed 50 characters' });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Delete white-label config for an organization
   */
  async deleteConfig(organizationId: string, deletedBy?: string): Promise<void> {
    const config = await prisma.whiteLabelConfig.findUnique({
      where: { organizationId },
    });

    if (!config) {
      throw new Error('White-label config not found');
    }

    await prisma.whiteLabelConfig.delete({
      where: { organizationId },
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        action: 'DELETE',
        entityType: 'WhiteLabelConfig',
        entityId: config.id,
        userId: deletedBy,
        details: { organizationId },
      },
    });
  }

  /**
   * Check if an organization has a custom config
   */
  async hasCustomConfig(organizationId: string): Promise<boolean> {
    const config = await prisma.whiteLabelConfig.findUnique({
      where: { organizationId },
      select: { id: true },
    });

    return config !== null;
  }

  /**
   * Get configs for multiple organizations (admin use)
   */
  async getConfigsForOrganizations(
    organizationIds: string[]
  ): Promise<Map<string, WhiteLabelConfig>> {
    const configs = await prisma.whiteLabelConfig.findMany({
      where: { organizationId: { in: organizationIds } },
    });

    const configMap = new Map<string, WhiteLabelConfig>();

    for (const config of configs) {
      configMap.set(config.organizationId, {
        ...config,
        features: (config.features as Record<string, unknown>) || {},
      });
    }

    // Fill in defaults for orgs without config
    for (const orgId of organizationIds) {
      if (!configMap.has(orgId)) {
        configMap.set(orgId, {
          id: '',
          organizationId: orgId,
          ...DEFAULT_CONFIG,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    return configMap;
  }
}

// Export singleton instance
export const whiteLabelService = new WhiteLabelService();
