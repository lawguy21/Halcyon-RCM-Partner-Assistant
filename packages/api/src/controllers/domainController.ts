// @ts-nocheck
/**
 * Domain Controller
 *
 * Handles HTTP requests for custom domain management.
 */

import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { domainService } from '../services/domainService.js';
import prisma from '../lib/prisma.js';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if user has access to organization
 */
async function checkOrganizationAccess(
  req: AuthRequest,
  organizationId: string
): Promise<{ hasAccess: boolean; error?: { status: number; message: string; code: string } }> {
  // Admin users have access to all organizations
  if (req.user?.role === 'ADMIN') {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });
    if (!org) {
      return {
        hasAccess: false,
        error: {
          status: 404,
          message: 'Organization not found',
          code: 'NOT_FOUND',
        },
      };
    }
    return { hasAccess: true };
  }

  // Regular users can only access their own organization
  if (req.user?.organizationId !== organizationId) {
    return {
      hasAccess: false,
      error: {
        status: 403,
        message: 'You do not have access to this organization',
        code: 'FORBIDDEN',
      },
    };
  }

  return { hasAccess: true };
}

// ============================================================================
// Controllers
// ============================================================================

/**
 * Add a custom domain to an organization
 * POST /api/organizations/:id/domains
 */
export async function addDomain(req: AuthRequest, res: Response) {
  try {
    const { id: organizationId } = req.params;
    const { domain, isPrimary } = req.body;

    // Check access
    const access = await checkOrganizationAccess(req, organizationId);
    if (!access.hasAccess) {
      return res.status(access.error!.status).json({
        success: false,
        error: {
          message: access.error!.message,
          code: access.error!.code,
        },
      });
    }

    // Validate input
    if (!domain || typeof domain !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Domain is required',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    // Add domain
    const result = await domainService.addDomain(organizationId, {
      domain,
      isPrimary,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: {
          message: result.error,
          code: 'DOMAIN_ERROR',
        },
      });
    }

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: 'DOMAIN_ADD',
        entityType: 'OrganizationDomain',
        entityId: result.data!.id,
        userId: req.user?.id,
        details: {
          organizationId,
          domain: result.data!.domain,
        },
      },
    });

    return res.status(201).json({
      success: true,
      data: result.data,
      verification: {
        message: 'Domain added. Please verify ownership by adding a TXT record to your DNS.',
        txtRecordName: `_halcyon-verification.${result.data!.domain}`,
        txtRecordValue: result.data!.verificationToken,
      },
    });
  } catch (error) {
    console.error('[DomainController] Add domain error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to add domain',
        code: 'INTERNAL_ERROR',
      },
    });
  }
}

/**
 * Remove a domain from an organization
 * DELETE /api/organizations/:id/domains/:domain
 */
export async function removeDomain(req: AuthRequest, res: Response) {
  try {
    const { id: organizationId, domain } = req.params;

    // Check access
    const access = await checkOrganizationAccess(req, organizationId);
    if (!access.hasAccess) {
      return res.status(access.error!.status).json({
        success: false,
        error: {
          message: access.error!.message,
          code: access.error!.code,
        },
      });
    }

    // Remove domain
    const result = await domainService.removeDomain(organizationId, domain);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: {
          message: result.error,
          code: 'DOMAIN_ERROR',
        },
      });
    }

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: 'DOMAIN_REMOVE',
        entityType: 'OrganizationDomain',
        entityId: domain,
        userId: req.user?.id,
        details: {
          organizationId,
          domain,
        },
      },
    });

    return res.json({
      success: true,
      message: 'Domain removed successfully',
    });
  } catch (error) {
    console.error('[DomainController] Remove domain error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to remove domain',
        code: 'INTERNAL_ERROR',
      },
    });
  }
}

/**
 * List all domains for an organization
 * GET /api/organizations/:id/domains
 */
export async function listDomains(req: AuthRequest, res: Response) {
  try {
    const { id: organizationId } = req.params;

    // Check access
    const access = await checkOrganizationAccess(req, organizationId);
    if (!access.hasAccess) {
      return res.status(access.error!.status).json({
        success: false,
        error: {
          message: access.error!.message,
          code: access.error!.code,
        },
      });
    }

    // Get domains
    const result = await domainService.listDomains(organizationId);

    return res.json({
      success: true,
      data: result.domains,
      total: result.total,
    });
  } catch (error) {
    console.error('[DomainController] List domains error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to list domains',
        code: 'INTERNAL_ERROR',
      },
    });
  }
}

/**
 * Verify domain ownership
 * POST /api/organizations/:id/domains/:domain/verify
 */
export async function verifyDomain(req: AuthRequest, res: Response) {
  try {
    const { id: organizationId, domain } = req.params;

    // Check access
    const access = await checkOrganizationAccess(req, organizationId);
    if (!access.hasAccess) {
      return res.status(access.error!.status).json({
        success: false,
        error: {
          message: access.error!.message,
          code: access.error!.code,
        },
      });
    }

    // Find the domain
    const domainRecord = await domainService.getDomainByName(domain);

    if (!domainRecord) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Domain not found',
          code: 'NOT_FOUND',
        },
      });
    }

    if (domainRecord.organizationId !== organizationId) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Domain does not belong to this organization',
          code: 'FORBIDDEN',
        },
      });
    }

    // Verify domain
    const result = await domainService.verifyDomain(domainRecord.id);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: {
          message: result.message,
          code: 'VERIFICATION_ERROR',
        },
      });
    }

    // Log the action if verified
    if (result.verified) {
      await prisma.auditLog.create({
        data: {
          action: 'DOMAIN_VERIFY',
          entityType: 'OrganizationDomain',
          entityId: domainRecord.id,
          userId: req.user?.id,
          details: {
            organizationId,
            domain: result.domain,
          },
        },
      });
    }

    return res.json({
      success: true,
      data: {
        domain: result.domain,
        verified: result.verified,
        message: result.message,
        verification: !result.verified ? {
          txtRecordName: result.txtRecordName,
          txtRecordValue: result.txtRecordValue,
          instructions: [
            'Add a TXT record to your DNS settings with the following values:',
            `  Name/Host: ${result.txtRecordName}`,
            `  Value: ${result.txtRecordValue}`,
            'DNS changes may take up to 48 hours to propagate.',
            'After adding the record, click "Verify" again.',
          ],
        } : undefined,
      },
    });
  } catch (error) {
    console.error('[DomainController] Verify domain error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to verify domain',
        code: 'INTERNAL_ERROR',
      },
    });
  }
}

/**
 * Set a domain as the primary domain
 * PUT /api/organizations/:id/domains/:domain/primary
 */
export async function setPrimaryDomain(req: AuthRequest, res: Response) {
  try {
    const { id: organizationId, domain } = req.params;

    // Check access
    const access = await checkOrganizationAccess(req, organizationId);
    if (!access.hasAccess) {
      return res.status(access.error!.status).json({
        success: false,
        error: {
          message: access.error!.message,
          code: access.error!.code,
        },
      });
    }

    // Set primary domain
    const result = await domainService.setPrimaryDomain(organizationId, domain);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: {
          message: result.error,
          code: 'DOMAIN_ERROR',
        },
      });
    }

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: 'DOMAIN_SET_PRIMARY',
        entityType: 'OrganizationDomain',
        entityId: result.data!.id,
        userId: req.user?.id,
        details: {
          organizationId,
          domain: result.data!.domain,
        },
      },
    });

    return res.json({
      success: true,
      data: result.data,
      message: 'Primary domain updated successfully',
    });
  } catch (error) {
    console.error('[DomainController] Set primary domain error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to set primary domain',
        code: 'INTERNAL_ERROR',
      },
    });
  }
}

/**
 * Get domain details
 * GET /api/organizations/:id/domains/:domain
 */
export async function getDomain(req: AuthRequest, res: Response) {
  try {
    const { id: organizationId, domain } = req.params;

    // Check access
    const access = await checkOrganizationAccess(req, organizationId);
    if (!access.hasAccess) {
      return res.status(access.error!.status).json({
        success: false,
        error: {
          message: access.error!.message,
          code: access.error!.code,
        },
      });
    }

    // Get domain
    const domainRecord = await domainService.getDomainByName(domain);

    if (!domainRecord) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Domain not found',
          code: 'NOT_FOUND',
        },
      });
    }

    if (domainRecord.organizationId !== organizationId) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Domain does not belong to this organization',
          code: 'FORBIDDEN',
        },
      });
    }

    return res.json({
      success: true,
      data: domainRecord,
    });
  } catch (error) {
    console.error('[DomainController] Get domain error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get domain',
        code: 'INTERNAL_ERROR',
      },
    });
  }
}

// ============================================================================
// Export Controller
// ============================================================================

export const domainController = {
  addDomain,
  removeDomain,
  listDomains,
  verifyDomain,
  setPrimaryDomain,
  getDomain,
};

export default domainController;
