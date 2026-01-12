/**
 * Organization Routes
 * CRUD routes for organization management
 */

import { Router } from 'express';
import { z } from 'zod';
import * as organizationController from '../controllers/organizationController.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// ============================================================================
// Validation Schemas
// ============================================================================

const createOrganizationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens').optional(),
  settings: z.record(z.unknown()).optional(),
});

const updateOrganizationSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens').optional(),
  settings: z.record(z.unknown()).optional(),
});

const addUserSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
});

// ============================================================================
// All routes require authentication
// ============================================================================

router.use(authenticateToken);

// ============================================================================
// Organization Routes
// ============================================================================

/**
 * GET /api/organizations
 * List organizations
 * Admin: All organizations
 * User: Only their organization
 */
router.get('/', organizationController.listOrganizations);

/**
 * GET /api/organizations/:id
 * Get a single organization
 * Admin: Any organization
 * User: Only their organization
 */
router.get('/:id', organizationController.getOrganization);

/**
 * POST /api/organizations
 * Create a new organization
 * Admin only
 */
router.post(
  '/',
  requireRole('ADMIN'),
  validateRequest(createOrganizationSchema),
  organizationController.createOrganization
);

/**
 * PUT /api/organizations/:id
 * Update an organization
 * Admin: Any organization, all fields
 * User: Own organization, limited fields (settings only)
 */
router.put(
  '/:id',
  validateRequest(updateOrganizationSchema),
  organizationController.updateOrganization
);

/**
 * DELETE /api/organizations/:id
 * Delete an organization
 * Admin only
 */
router.delete(
  '/:id',
  requireRole('ADMIN'),
  organizationController.deleteOrganization
);

/**
 * GET /api/organizations/:id/stats
 * Get organization statistics
 * Admin: Any organization
 * User: Only their organization
 */
router.get('/:id/stats', organizationController.getOrganizationStats);

// ============================================================================
// Organization User Management Routes (Admin Only)
// ============================================================================

/**
 * POST /api/organizations/:id/users
 * Add a user to an organization
 * Admin only
 */
router.post(
  '/:id/users',
  requireRole('ADMIN'),
  validateRequest(addUserSchema),
  organizationController.addUserToOrganization
);

/**
 * DELETE /api/organizations/:id/users/:userId
 * Remove a user from an organization
 * Admin only
 */
router.delete(
  '/:id/users/:userId',
  requireRole('ADMIN'),
  organizationController.removeUserFromOrganization
);

export { router as organizationsRouter };
