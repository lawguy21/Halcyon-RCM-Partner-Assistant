/**
 * White-Label Routes
 *
 * REST API routes for white-label configuration management.
 */

import { Router } from 'express';
import { z } from 'zod';
import * as whiteLabelController from '../controllers/whiteLabelController.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { loadRBAC, requirePermission } from '../middleware/rbac.js';
import { ADMIN_PERMISSIONS } from '@halcyon-rcm/core';

const router = Router();

// ============================================================================
// Public Routes (No Authentication Required)
// ============================================================================

/**
 * GET /api/white-label/public-config
 * Get default white-label configuration for unauthenticated users
 * Used by frontend before login
 */
router.get('/public-config', whiteLabelController.getPublicConfig);

// ============================================================================
// Validation Schemas
// ============================================================================

const updateConfigSchema = z.object({
  // Branding
  brandName: z.string().min(1).max(100).optional(),
  logoUrl: z.string().url().nullable().optional(),
  faviconUrl: z.string().url().nullable().optional(),
  primaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Must be a valid hex color').optional(),
  secondaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Must be a valid hex color').optional(),

  // Support
  supportEmail: z.string().email().nullable().optional(),
  supportPhone: z.string().max(20).nullable().optional(),
  companyWebsite: z.string().url().nullable().optional(),

  // Legal
  termsOfServiceUrl: z.string().url().nullable().optional(),
  privacyPolicyUrl: z.string().url().nullable().optional(),
  organizationLegalName: z.string().max(255).nullable().optional(),

  // Features
  features: z.record(z.unknown()).optional(),
  customCss: z.string().max(50000).nullable().optional(),

  // Analytics
  analyticsTrackingId: z.string().max(50).nullable().optional(),

  // Locale
  timezone: z.string().max(50).optional(),
  locale: z.string().max(20).optional(),
});

const validateConfigSchema = z.object({
  brandName: z.string().optional(),
  logoUrl: z.string().nullable().optional(),
  faviconUrl: z.string().nullable().optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  supportEmail: z.string().nullable().optional(),
  supportPhone: z.string().nullable().optional(),
  companyWebsite: z.string().nullable().optional(),
  termsOfServiceUrl: z.string().nullable().optional(),
  privacyPolicyUrl: z.string().nullable().optional(),
  organizationLegalName: z.string().nullable().optional(),
  features: z.record(z.unknown()).optional(),
  customCss: z.string().nullable().optional(),
  analyticsTrackingId: z.string().nullable().optional(),
  timezone: z.string().optional(),
  locale: z.string().optional(),
});

// ============================================================================
// Current Organization Config Routes (Authenticated Users)
// ============================================================================

/**
 * GET /api/white-label/config
 * Get white-label configuration for the current user's organization
 */
router.get(
  '/config',
  authenticateToken,
  whiteLabelController.getConfig
);

/**
 * PUT /api/white-label/config
 * Update white-label configuration for the current user's organization
 * Requires organization admin permission
 */
router.put(
  '/config',
  authenticateToken,
  loadRBAC(),
  requirePermission(ADMIN_PERMISSIONS.SETTINGS),
  validateRequest(updateConfigSchema),
  whiteLabelController.updateConfig
);

/**
 * DELETE /api/white-label/config
 * Delete white-label configuration (reset to defaults)
 * Requires organization admin permission
 */
router.delete(
  '/config',
  authenticateToken,
  loadRBAC(),
  requirePermission(ADMIN_PERMISSIONS.SETTINGS),
  whiteLabelController.deleteConfig
);

/**
 * GET /api/white-label/defaults
 * Get default white-label configuration values
 */
router.get(
  '/defaults',
  authenticateToken,
  whiteLabelController.getDefaults
);

/**
 * POST /api/white-label/validate
 * Validate white-label configuration values without saving
 */
router.post(
  '/validate',
  authenticateToken,
  validateRequest(validateConfigSchema),
  whiteLabelController.validateConfig
);

// ============================================================================
// Super Admin Organization Config Routes
// ============================================================================

/**
 * GET /api/organizations/:id/white-label
 * Get white-label configuration for a specific organization
 * Super admin only
 */
router.get(
  '/organizations/:id',
  authenticateToken,
  requireRole('ADMIN'),
  whiteLabelController.getOrgConfig
);

/**
 * PUT /api/organizations/:id/white-label
 * Update white-label configuration for a specific organization
 * Super admin only
 */
router.put(
  '/organizations/:id',
  authenticateToken,
  requireRole('ADMIN'),
  validateRequest(updateConfigSchema),
  whiteLabelController.updateOrgConfig
);

/**
 * DELETE /api/organizations/:id/white-label
 * Delete white-label configuration for a specific organization (reset to defaults)
 * Super admin only
 */
router.delete(
  '/organizations/:id',
  authenticateToken,
  requireRole('ADMIN'),
  whiteLabelController.deleteOrgConfig
);

export { router as whiteLabelRouter };
