// @ts-nocheck
/**
 * Organization Controller
 * Handles CRUD operations for organizations
 */

import { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { AuthRequest } from '../middleware/auth.js';

/**
 * List all organizations
 * GET /api/organizations
 * Admin only - returns all organizations
 * Non-admin - returns only their organization
 */
export async function listOrganizations(req: AuthRequest, res: Response) {
  try {
    const { search, limit = 50, offset = 0 } = req.query;

    let where: any = {};

    // Non-admin users can only see their own organization
    if (req.user?.role !== 'ADMIN') {
      if (!req.user?.organizationId) {
        return res.json({
          success: true,
          data: [],
          total: 0,
          limit: Number(limit),
          offset: Number(offset),
          hasMore: false,
        });
      }
      where.id = req.user.organizationId;
    }

    // Add search filter
    if (search && typeof search === 'string') {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [organizations, total] = await Promise.all([
      prisma.organization.findMany({
        where,
        take: Math.min(Number(limit), 100),
        skip: Number(offset),
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { users: true, assessments: true },
          },
        },
      }),
      prisma.organization.count({ where }),
    ]);

    return res.json({
      success: true,
      data: organizations,
      total,
      limit: Number(limit),
      offset: Number(offset),
      hasMore: Number(offset) + organizations.length < total,
    });
  } catch (error) {
    console.error('[Organization] List error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to list organizations',
        code: 'INTERNAL_ERROR',
      },
    });
  }
}

/**
 * Get a single organization by ID
 * GET /api/organizations/:id
 */
export async function getOrganization(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    // Non-admin users can only view their own organization
    if (req.user?.role !== 'ADMIN' && req.user?.organizationId !== id) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'You do not have access to this organization',
          code: 'FORBIDDEN',
        },
      });
    }

    const organization = await prisma.organization.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
          },
        },
        _count: {
          select: { assessments: true },
        },
      },
    });

    if (!organization) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Organization not found',
          code: 'NOT_FOUND',
        },
      });
    }

    return res.json({
      success: true,
      data: organization,
    });
  } catch (error) {
    console.error('[Organization] Get error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get organization',
        code: 'INTERNAL_ERROR',
      },
    });
  }
}

/**
 * Create a new organization
 * POST /api/organizations
 * Admin only
 */
export async function createOrganization(req: AuthRequest, res: Response) {
  try {
    const { name, slug, settings } = req.body;

    // Check if slug already exists
    if (slug) {
      const existing = await prisma.organization.findUnique({
        where: { slug },
      });
      if (existing) {
        return res.status(409).json({
          success: false,
          error: {
            message: 'Organization with this slug already exists',
            code: 'SLUG_EXISTS',
          },
        });
      }
    }

    const organization = await prisma.organization.create({
      data: {
        name,
        slug: slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        settings: settings || {},
      },
    });

    // Log the creation
    await prisma.auditLog.create({
      data: {
        action: 'ORGANIZATION_CREATE',
        entityType: 'Organization',
        entityId: organization.id,
        userId: req.user?.id,
        details: { name },
      },
    });

    return res.status(201).json({
      success: true,
      data: organization,
    });
  } catch (error) {
    console.error('[Organization] Create error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to create organization',
        code: 'INTERNAL_ERROR',
      },
    });
  }
}

/**
 * Update an organization
 * PUT /api/organizations/:id
 */
export async function updateOrganization(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { name, slug, settings } = req.body;

    // Non-admin users can only update their own organization (limited fields)
    if (req.user?.role !== 'ADMIN' && req.user?.organizationId !== id) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'You do not have access to this organization',
          code: 'FORBIDDEN',
        },
      });
    }

    // Check if organization exists
    const existing = await prisma.organization.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Organization not found',
          code: 'NOT_FOUND',
        },
      });
    }

    // Check if new slug conflicts
    if (slug && slug !== existing.slug) {
      const slugConflict = await prisma.organization.findUnique({
        where: { slug },
      });
      if (slugConflict) {
        return res.status(409).json({
          success: false,
          error: {
            message: 'Organization with this slug already exists',
            code: 'SLUG_EXISTS',
          },
        });
      }
    }

    // Non-admin users can only update settings, not name/slug
    const updateData: any = { updatedAt: new Date() };
    if (req.user?.role === 'ADMIN') {
      if (name) updateData.name = name;
      if (slug) updateData.slug = slug;
    }
    if (settings) updateData.settings = settings;

    const organization = await prisma.organization.update({
      where: { id },
      data: updateData,
    });

    // Log the update
    await prisma.auditLog.create({
      data: {
        action: 'ORGANIZATION_UPDATE',
        entityType: 'Organization',
        entityId: organization.id,
        userId: req.user?.id,
        details: { fields: Object.keys(req.body) },
      },
    });

    return res.json({
      success: true,
      data: organization,
    });
  } catch (error) {
    console.error('[Organization] Update error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to update organization',
        code: 'INTERNAL_ERROR',
      },
    });
  }
}

/**
 * Delete an organization
 * DELETE /api/organizations/:id
 * Admin only
 */
export async function deleteOrganization(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    // Check if organization exists
    const organization = await prisma.organization.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true, assessments: true },
        },
      },
    });

    if (!organization) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Organization not found',
          code: 'NOT_FOUND',
        },
      });
    }

    // Warn if organization has data
    if (organization._count.users > 0 || organization._count.assessments > 0) {
      const { force } = req.query;
      if (force !== 'true') {
        return res.status(400).json({
          success: false,
          error: {
            message: `Organization has ${organization._count.users} users and ${organization._count.assessments} assessments. Use ?force=true to delete anyway.`,
            code: 'HAS_DEPENDENCIES',
          },
        });
      }
    }

    // Delete the organization (cascade will handle related records based on schema)
    await prisma.organization.delete({
      where: { id },
    });

    // Log the deletion
    await prisma.auditLog.create({
      data: {
        action: 'ORGANIZATION_DELETE',
        entityType: 'Organization',
        entityId: id,
        userId: req.user?.id,
        details: { name: organization.name },
      },
    });

    return res.json({
      success: true,
      message: 'Organization deleted successfully',
    });
  } catch (error) {
    console.error('[Organization] Delete error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to delete organization',
        code: 'INTERNAL_ERROR',
      },
    });
  }
}

/**
 * Get organization statistics
 * GET /api/organizations/:id/stats
 */
export async function getOrganizationStats(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    // Non-admin users can only view their own organization stats
    if (req.user?.role !== 'ADMIN' && req.user?.organizationId !== id) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'You do not have access to this organization',
          code: 'FORBIDDEN',
        },
      });
    }

    const [userCount, assessmentStats] = await Promise.all([
      prisma.user.count({
        where: { organizationId: id },
      }),
      prisma.assessment.aggregate({
        where: { organizationId: id },
        _count: true,
        _sum: {
          estimatedTotalRecovery: true,
          currentExposure: true,
        },
        _avg: {
          overallConfidence: true,
        },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        userCount,
        assessmentCount: assessmentStats._count,
        totalRecovery: assessmentStats._sum.estimatedTotalRecovery?.toNumber() || 0,
        totalExposure: assessmentStats._sum.currentExposure?.toNumber() || 0,
        averageConfidence: Math.round(assessmentStats._avg.overallConfidence || 0),
      },
    });
  } catch (error) {
    console.error('[Organization] Stats error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get organization statistics',
        code: 'INTERNAL_ERROR',
      },
    });
  }
}

/**
 * Add user to organization
 * POST /api/organizations/:id/users
 * Admin only
 */
export async function addUserToOrganization(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    // Verify organization exists
    const organization = await prisma.organization.findUnique({
      where: { id },
    });

    if (!organization) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Organization not found',
          code: 'NOT_FOUND',
        },
      });
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'User not found',
          code: 'NOT_FOUND',
        },
      });
    }

    // Update user's organization
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { organizationId: id },
      include: { organization: true },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: 'USER_ADD_TO_ORG',
        entityType: 'User',
        entityId: userId,
        userId: req.user?.id,
        details: { organizationId: id, organizationName: organization.name },
      },
    });

    const { passwordHash, ...userWithoutPassword } = updatedUser;

    return res.json({
      success: true,
      data: userWithoutPassword,
    });
  } catch (error) {
    console.error('[Organization] Add user error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to add user to organization',
        code: 'INTERNAL_ERROR',
      },
    });
  }
}

/**
 * Remove user from organization
 * DELETE /api/organizations/:id/users/:userId
 * Admin only
 */
export async function removeUserFromOrganization(req: AuthRequest, res: Response) {
  try {
    const { id, userId } = req.params;

    // Verify user belongs to this organization
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        organizationId: id,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'User not found in this organization',
          code: 'NOT_FOUND',
        },
      });
    }

    // Remove user from organization
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { organizationId: null },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: 'USER_REMOVE_FROM_ORG',
        entityType: 'User',
        entityId: userId,
        userId: req.user?.id,
        details: { organizationId: id },
      },
    });

    const { passwordHash, ...userWithoutPassword } = updatedUser;

    return res.json({
      success: true,
      data: userWithoutPassword,
    });
  } catch (error) {
    console.error('[Organization] Remove user error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to remove user from organization',
        code: 'INTERNAL_ERROR',
      },
    });
  }
}
