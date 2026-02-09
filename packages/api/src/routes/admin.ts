/**
 * Admin Routes
 * Routes for system administration - users, organizations, stats, audit logs
 * Only accessible to users with ADMIN role
 */

import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, optionalAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// Apply optional auth to all admin routes (allows authenticated access)
router.use(optionalAuth);

// Admin authorization check middleware
const requireAdmin = (req: AuthRequest, res: Response, next: () => void) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required',
    });
  }
  next();
};

// ============================================================================
// System Statistics
// ============================================================================

/**
 * GET /api/admin/stats
 * Get system-wide statistics
 */
router.get('/stats', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    // Get total counts in parallel
    const [
      totalUsers,
      totalOrganizations,
      totalAssessments,
      activeUsersCount,
      assessmentsTodayCount,
      assessmentsThisWeekCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.organization.count(),
      prisma.assessment.count(),
      // Active users in the last 7 days (based on updated_at or recent activity)
      prisma.user.count({
        where: {
          updatedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      // Assessments created today
      prisma.assessment.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      // Assessments this week
      prisma.assessment.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        totalOrganizations,
        totalAssessments,
        activeUsers: activeUsersCount,
        assessmentsToday: assessmentsTodayCount,
        assessmentsThisWeek: assessmentsThisWeekCount,
      },
    });
  } catch (error) {
    console.error('[Admin] Failed to fetch stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system statistics',
    });
  }
});

// ============================================================================
// User Management
// ============================================================================

/**
 * GET /api/admin/users
 * List all users with organization info
 */
router.get('/users', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { limit = 50, offset = 0, search } = req.query;

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
      }),
      prisma.user.count({ where }),
    ]);

    const formattedUsers = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      organizationName: user.organization?.name || null,
      createdAt: user.createdAt.toISOString(),
      lastLogin: user.updatedAt.toISOString(), // Use updatedAt as proxy for last activity
    }));

    res.json({
      success: true,
      data: formattedUsers,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
      },
    });
  } catch (error) {
    console.error('[Admin] Failed to fetch users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users',
    });
  }
});

/**
 * POST /api/admin/users
 * Create a new user (admin only)
 */
router.post('/users', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { email, name, password, role, organizationId } = req.body;

    if (!email || !name || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email, name, and password are required',
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists',
      });
    }

    // Hash password using bcrypt
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash: hashedPassword,
        role: role || 'USER',
        organizationId,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
        createdAt: user.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('[Admin] Failed to create user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user',
    });
  }
});

/**
 * PUT /api/admin/users/:id
 * Update a user (admin only)
 */
router.put('/users/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, role, organizationId } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(role && { role }),
        ...(organizationId !== undefined && { organizationId }),
      },
    });

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
      },
    });
  } catch (error) {
    console.error('[Admin] Failed to update user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user',
    });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Delete a user (admin only)
 */
router.delete('/users/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Prevent self-deletion
    if (req.user?.id === id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your own account',
      });
    }

    await prisma.user.delete({ where: { id } });

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('[Admin] Failed to delete user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user',
    });
  }
});

// ============================================================================
// Organization Management
// ============================================================================

/**
 * GET /api/admin/organizations
 * List all organizations with user counts
 */
router.get('/organizations', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const organizations = await prisma.organization.findMany({
      include: {
        _count: {
          select: { users: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
    });

    const total = await prisma.organization.count();

    const formattedOrgs = organizations.map((org) => ({
      id: org.id,
      name: org.name,
      slug: org.id.substring(0, 8), // Use ID prefix as slug placeholder
      status: 'ACTIVE', // Default status since it's not in schema
      userCount: org._count.users,
      createdAt: org.createdAt.toISOString(),
    }));

    res.json({
      success: true,
      data: formattedOrgs,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
      },
    });
  } catch (error) {
    console.error('[Admin] Failed to fetch organizations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch organizations',
    });
  }
});

/**
 * POST /api/admin/organizations
 * Create a new organization
 */
router.post('/organizations', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, type } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Organization name is required',
      });
    }

    // Check if organization with same name already exists
    const existingOrg = await prisma.organization.findFirst({ where: { name } });
    if (existingOrg) {
      return res.status(400).json({
        success: false,
        error: 'Organization with this name already exists',
      });
    }

    const organization = await prisma.organization.create({
      data: {
        name,
        type: type || 'hospital',
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: organization.id,
        name: organization.name,
        slug: organization.id.substring(0, 8),
        createdAt: organization.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('[Admin] Failed to create organization:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create organization',
    });
  }
});

// ============================================================================
// Audit Log Management
// ============================================================================

/**
 * GET /api/admin/audit-logs
 * Get system-wide audit logs
 */
router.get('/audit-logs', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { limit = 50, offset = 0, action, userId, entityType } = req.query;

    const where: Record<string, unknown> = {};
    if (action) where.action = action;
    if (userId) where.userId = userId;
    if (entityType) where.entityType = entityType;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
      }),
      prisma.auditLog.count({ where }),
    ]);

    // Fetch user names for logs that have userId
    const userIds = [...new Set(logs.map(log => log.userId).filter(Boolean))] as string[];
    const users = userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
    const userMap = new Map(users.map(u => [u.id, u]));

    const formattedLogs = logs.map((log) => {
      const user = log.userId ? userMap.get(log.userId) : null;
      return {
        id: log.id,
        userId: log.userId,
        userName: user?.name || user?.email || 'System',
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        details: log.details,
        ipAddress: log.ipAddress,
        createdAt: log.createdAt.toISOString(),
      };
    });

    res.json({
      success: true,
      data: formattedLogs,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
      },
    });
  } catch (error) {
    console.error('[Admin] Failed to fetch audit logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit logs',
    });
  }
});

export { router as adminRouter };
