// @ts-nocheck
/**
 * Domain Routes
 *
 * Routes for managing custom domains for multi-tenant routing.
 */

import { Router } from 'express';
import { z } from 'zod';
import { domainController } from '../controllers/domainController.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { getTenantInfo } from '../middleware/tenantResolver.js';

const router = Router();

// ============================================================================
// Validation Schemas
// ============================================================================

const addDomainSchema = z.object({
  domain: z
    .string()
    .min(1, 'Domain is required')
    .max(253, 'Domain is too long')
    .regex(
      /^(?!-)[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/,
      'Invalid domain format'
    ),
  isPrimary: z.boolean().optional().default(false),
});

// ============================================================================
// Public Routes (no auth required)
// ============================================================================

/**
 * GET /api/tenant
 * Get tenant information for the current request domain
 */
router.get('/tenant', getTenantInfo);

// ============================================================================
// Protected Routes (auth required)
// ============================================================================

/**
 * POST /api/organizations/:id/domains
 * Add a custom domain to an organization
 */
router.post(
  '/organizations/:id/domains',
  authenticateToken,
  validateRequest(addDomainSchema),
  domainController.addDomain
);

/**
 * GET /api/organizations/:id/domains
 * List all domains for an organization
 */
router.get(
  '/organizations/:id/domains',
  authenticateToken,
  domainController.listDomains
);

/**
 * GET /api/organizations/:id/domains/:domain
 * Get domain details
 */
router.get(
  '/organizations/:id/domains/:domain',
  authenticateToken,
  domainController.getDomain
);

/**
 * DELETE /api/organizations/:id/domains/:domain
 * Remove a domain from an organization
 */
router.delete(
  '/organizations/:id/domains/:domain',
  authenticateToken,
  domainController.removeDomain
);

/**
 * POST /api/organizations/:id/domains/:domain/verify
 * Verify domain ownership via DNS TXT record
 */
router.post(
  '/organizations/:id/domains/:domain/verify',
  authenticateToken,
  domainController.verifyDomain
);

/**
 * PUT /api/organizations/:id/domains/:domain/primary
 * Set a domain as the primary domain
 */
router.put(
  '/organizations/:id/domains/:domain/primary',
  authenticateToken,
  domainController.setPrimaryDomain
);

// ============================================================================
// Admin Routes (admin only)
// ============================================================================

/**
 * GET /api/admin/domains
 * List all domains across all organizations (admin only)
 */
router.get(
  '/admin/domains',
  authenticateToken,
  requireRole('ADMIN'),
  async (_req, res) => {
    try {
      const { default: prisma } = await import('../lib/prisma.js');

      const domains = await prisma.organizationDomain.findMany({
        include: {
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [
          { isVerified: 'desc' },
          { createdAt: 'desc' },
        ],
      });

      return res.json({
        success: true,
        data: domains,
        total: domains.length,
      });
    } catch (error) {
      console.error('[DomainRoutes] Admin list domains error:', error);
      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to list domains',
          code: 'INTERNAL_ERROR',
        },
      });
    }
  }
);

/**
 * DELETE /api/admin/domains/:id
 * Force delete a domain (admin only)
 */
router.delete(
  '/admin/domains/:id',
  authenticateToken,
  requireRole('ADMIN'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { default: prisma } = await import('../lib/prisma.js');
      const { clearDomainCache, clearOrganizationCache } = await import(
        '../middleware/tenantResolver.js'
      );

      const domain = await prisma.organizationDomain.findUnique({
        where: { id },
      });

      if (!domain) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Domain not found',
            code: 'NOT_FOUND',
          },
        });
      }

      await prisma.organizationDomain.delete({
        where: { id },
      });

      // Clear caches
      clearDomainCache(domain.domain);
      clearOrganizationCache(domain.organizationId);

      // Log the action
      await prisma.auditLog.create({
        data: {
          action: 'DOMAIN_ADMIN_DELETE',
          entityType: 'OrganizationDomain',
          entityId: id,
          userId: (req as unknown as { user?: { id: string } }).user?.id,
          details: {
            organizationId: domain.organizationId,
            domain: domain.domain,
          },
        },
      });

      return res.json({
        success: true,
        message: 'Domain deleted successfully',
      });
    } catch (error) {
      console.error('[DomainRoutes] Admin delete domain error:', error);
      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to delete domain',
          code: 'INTERNAL_ERROR',
        },
      });
    }
  }
);

export { router as domainsRouter };
export default router;
