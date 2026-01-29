/**
 * RBAC Middleware
 *
 * Express middleware for Role-Based Access Control.
 * Provides composable middleware functions for permission, role, and department checks.
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';
import { rbacService } from '../services/rbacService.js';
import prisma from '../lib/prisma.js';
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  UserPermissionContext,
  canAccessDepartment,
  canAccessAnyDepartment,
  Department,
  UserDepartmentContext,
} from '@halcyon-rcm/core';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Extended request interface with RBAC context
 */
export interface RBACRequest extends AuthRequest {
  rbac?: {
    permissions: string[];
    roles: Array<{ id: string; name: string }>;
    departments: Array<{ id: string; name: string; isPrimary: boolean }>;
    organizationId?: string;
  };
}

/**
 * Resource ownership check function type
 */
export type OwnershipChecker = (
  req: RBACRequest,
  resourceId: string
) => Promise<{ isOwner: boolean; ownerId?: string }>;

/**
 * Ownership checkers registry
 */
const ownershipCheckers: Record<string, OwnershipChecker> = {};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Load RBAC context for the current user
 */
async function loadRBACContext(req: RBACRequest): Promise<void> {
  if (!req.user) return;

  // Skip if already loaded
  if (req.rbac) return;

  try {
    const effectivePerms = await rbacService.getEffectivePermissions(req.user.id);
    req.rbac = {
      permissions: effectivePerms.permissions,
      roles: effectivePerms.roles,
      departments: effectivePerms.departments,
      organizationId: req.user.organizationId,
    };
  } catch (error) {
    console.error('[RBAC] Failed to load context:', error);
    req.rbac = {
      permissions: [],
      roles: [],
      departments: [],
      organizationId: req.user.organizationId,
    };
  }
}

/**
 * Build user permission context from request
 */
function buildPermissionContext(req: RBACRequest): UserPermissionContext | null {
  if (!req.user || !req.rbac) return null;

  return {
    id: req.user.id,
    permissions: req.rbac.permissions,
    roles: req.rbac.roles.map(r => r.id),
    departmentIds: req.rbac.departments.map(d => d.id),
    organizationId: req.rbac.organizationId,
  };
}

/**
 * Build user department context from request
 */
function buildDepartmentContext(req: RBACRequest): UserDepartmentContext | null {
  if (!req.user || !req.rbac) return null;

  const primaryDept = req.rbac.departments.find(d => d.isPrimary);

  return {
    id: req.user.id,
    departments: req.rbac.departments.map(d => d.id as Department),
    primaryDepartment: primaryDept?.id as Department | undefined,
    organizationId: req.rbac.organizationId,
  };
}

/**
 * Log access attempt for auditing
 */
async function logAccessAttempt(
  req: RBACRequest,
  permission: string,
  allowed: boolean,
  reason?: string
): Promise<void> {
  try {
    await rbacService.logAudit({
      userId: req.user?.id || 'anonymous',
      resource: permission,
      resourceId: req.params?.id,
      action: 'ACCESS_CHECK',
      result: allowed ? 'ALLOWED' : 'DENIED',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: {
        path: req.path,
        method: req.method,
        reason,
      },
    });
  } catch (error) {
    console.error('[RBAC] Failed to log access attempt:', error);
  }
}

// ============================================================================
// MIDDLEWARE FUNCTIONS
// ============================================================================

/**
 * Middleware to load RBAC context for the authenticated user
 * Should be used after authenticateToken middleware
 */
export function loadRBAC() {
  return async (req: RBACRequest, res: Response, next: NextFunction) => {
    await loadRBACContext(req);
    next();
  };
}

/**
 * Middleware factory that requires a specific permission
 * @param permission - Permission key required
 * @param options - Additional options
 */
export function requirePermission(
  permission: string,
  options: { audit?: boolean } = { audit: true }
) {
  return async (req: RBACRequest, res: Response, next: NextFunction) => {
    // Ensure RBAC context is loaded
    await loadRBACContext(req);

    const context = buildPermissionContext(req);
    if (!context) {
      if (options.audit) {
        await logAccessAttempt(req, permission, false, 'Not authenticated');
      }
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
        },
      });
    }

    const allowed = hasPermission(context, permission);

    if (options.audit) {
      await logAccessAttempt(req, permission, allowed);
    }

    if (!allowed) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Insufficient permissions',
          code: 'FORBIDDEN',
          requiredPermission: permission,
        },
      });
    }

    next();
  };
}

/**
 * Middleware factory that requires any of the specified permissions
 * @param permissions - Array of permission keys (at least one required)
 */
export function requireAnyPermission(
  permissions: string[],
  options: { audit?: boolean } = { audit: true }
) {
  return async (req: RBACRequest, res: Response, next: NextFunction) => {
    await loadRBACContext(req);

    const context = buildPermissionContext(req);
    if (!context) {
      if (options.audit) {
        await logAccessAttempt(req, permissions.join('|'), false, 'Not authenticated');
      }
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
        },
      });
    }

    const allowed = hasAnyPermission(context, permissions);

    if (options.audit) {
      await logAccessAttempt(req, permissions.join('|'), allowed);
    }

    if (!allowed) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Insufficient permissions',
          code: 'FORBIDDEN',
          requiredPermissions: permissions,
          requirementType: 'any',
        },
      });
    }

    next();
  };
}

/**
 * Middleware factory that requires all of the specified permissions
 * @param permissions - Array of permission keys (all required)
 */
export function requireAllPermissions(
  permissions: string[],
  options: { audit?: boolean } = { audit: true }
) {
  return async (req: RBACRequest, res: Response, next: NextFunction) => {
    await loadRBACContext(req);

    const context = buildPermissionContext(req);
    if (!context) {
      if (options.audit) {
        await logAccessAttempt(req, permissions.join('&'), false, 'Not authenticated');
      }
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
        },
      });
    }

    const allowed = hasAllPermissions(context, permissions);

    if (options.audit) {
      await logAccessAttempt(req, permissions.join('&'), allowed);
    }

    if (!allowed) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Insufficient permissions',
          code: 'FORBIDDEN',
          requiredPermissions: permissions,
          requirementType: 'all',
        },
      });
    }

    next();
  };
}

/**
 * Middleware factory that requires specific role(s)
 * @param roles - Array of role IDs (at least one required)
 */
export function requireRole(roles: string[]) {
  return async (req: RBACRequest, res: Response, next: NextFunction) => {
    await loadRBACContext(req);

    if (!req.user || !req.rbac) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
        },
      });
    }

    const userRoleIds = req.rbac.roles.map(r => r.id);
    const hasRequiredRole = roles.some(role => userRoleIds.includes(role));

    if (!hasRequiredRole) {
      await logAccessAttempt(req, `ROLE:${roles.join('|')}`, false, 'Role not found');
      return res.status(403).json({
        success: false,
        error: {
          message: 'Insufficient role privileges',
          code: 'FORBIDDEN',
          requiredRoles: roles,
        },
      });
    }

    next();
  };
}

/**
 * Middleware factory that requires specific department(s)
 * @param departments - Array of department IDs (at least one required)
 */
export function requireDepartment(departments: Department[]) {
  return async (req: RBACRequest, res: Response, next: NextFunction) => {
    await loadRBACContext(req);

    const context = buildDepartmentContext(req);
    if (!context) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
        },
      });
    }

    const hasAccess = canAccessAnyDepartment(context, departments);

    if (!hasAccess) {
      await logAccessAttempt(req, `DEPT:${departments.join('|')}`, false, 'Department not found');
      return res.status(403).json({
        success: false,
        error: {
          message: 'Department access required',
          code: 'FORBIDDEN',
          requiredDepartments: departments,
        },
      });
    }

    next();
  };
}

/**
 * Middleware factory that checks resource ownership
 * @param resourceType - Type of resource to check
 * @param options - Ownership check options
 */
export function requireOwnership(
  resourceType: string,
  options: {
    idParam?: string;
    allowAdmins?: boolean;
    allowRoles?: string[];
  } = {}
) {
  const { idParam = 'id', allowAdmins = true, allowRoles = ['SUPER_ADMIN', 'ADMIN'] } = options;

  return async (req: RBACRequest, res: Response, next: NextFunction) => {
    await loadRBACContext(req);

    if (!req.user || !req.rbac) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
        },
      });
    }

    // Allow admin roles to bypass ownership check
    if (allowAdmins) {
      const userRoleIds = req.rbac.roles.map(r => r.id);
      if (allowRoles.some(role => userRoleIds.includes(role))) {
        return next();
      }
    }

    // Get resource ID from params
    const resourceId = req.params[idParam];
    if (!resourceId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Resource ID required',
          code: 'BAD_REQUEST',
        },
      });
    }

    // Check ownership using registered checker
    const checker = ownershipCheckers[resourceType];
    if (!checker) {
      console.error(`[RBAC] No ownership checker registered for: ${resourceType}`);
      return res.status(500).json({
        success: false,
        error: {
          message: 'Ownership check not configured',
          code: 'INTERNAL_ERROR',
        },
      });
    }

    try {
      const { isOwner, ownerId } = await checker(req, resourceId);

      if (!isOwner) {
        await logAccessAttempt(
          req,
          `OWNERSHIP:${resourceType}:${resourceId}`,
          false,
          `Owner: ${ownerId}, User: ${req.user.id}`
        );
        return res.status(403).json({
          success: false,
          error: {
            message: 'You do not have access to this resource',
            code: 'FORBIDDEN',
          },
        });
      }

      next();
    } catch (error) {
      console.error('[RBAC] Ownership check failed:', error);
      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to verify resource ownership',
          code: 'INTERNAL_ERROR',
        },
      });
    }
  };
}

/**
 * Register a custom ownership checker
 * @param resourceType - Type of resource
 * @param checker - Function to check ownership
 */
export function registerOwnershipChecker(
  resourceType: string,
  checker: OwnershipChecker
): void {
  ownershipCheckers[resourceType] = checker;
}

// ============================================================================
// PRE-REGISTERED OWNERSHIP CHECKERS
// ============================================================================

// Assessment ownership
registerOwnershipChecker('assessment', async (req, resourceId) => {
  const assessment = await prisma.assessment.findUnique({
    where: { id: resourceId },
    select: { userId: true, organizationId: true },
  });

  if (!assessment) {
    return { isOwner: false };
  }

  // Check user ownership
  if (assessment.userId === req.user?.id) {
    return { isOwner: true, ownerId: assessment.userId };
  }

  // Check organization ownership
  if (assessment.organizationId && assessment.organizationId === req.user?.organizationId) {
    return { isOwner: true, ownerId: assessment.organizationId };
  }

  return { isOwner: false, ownerId: assessment.userId || undefined };
});

// Recovery account ownership
registerOwnershipChecker('recoveryAccount', async (req, resourceId) => {
  const account = await prisma.recoveryAccount.findUnique({
    where: { id: resourceId },
    select: { assignedToId: true, assessment: { select: { organizationId: true } } },
  });

  if (!account) {
    return { isOwner: false };
  }

  // Check assigned user
  if (account.assignedToId === req.user?.id) {
    return { isOwner: true, ownerId: account.assignedToId };
  }

  // Check organization
  if (account.assessment?.organizationId === req.user?.organizationId) {
    return { isOwner: true, ownerId: account.assessment.organizationId };
  }

  return { isOwner: false, ownerId: account.assignedToId || undefined };
});

// Collection account ownership
registerOwnershipChecker('collectionAccount', async (req, resourceId) => {
  const account = await prisma.collectionAccount.findUnique({
    where: { id: resourceId },
    select: {
      patient: {
        select: {
          assessment: { select: { organizationId: true } },
        },
      },
    },
  });

  if (!account) {
    return { isOwner: false };
  }

  // Check organization
  if (account.patient?.assessment?.organizationId === req.user?.organizationId) {
    return { isOwner: true, ownerId: account.patient.assessment.organizationId };
  }

  return { isOwner: false };
});

// Claim ownership
registerOwnershipChecker('claim', async (req, resourceId) => {
  const claim = await prisma.claim.findUnique({
    where: { id: resourceId },
    select: {
      account: {
        select: {
          assessment: { select: { organizationId: true, userId: true } },
        },
      },
    },
  });

  if (!claim) {
    return { isOwner: false };
  }

  // Check organization
  if (claim.account?.assessment?.organizationId === req.user?.organizationId) {
    return { isOwner: true, ownerId: claim.account.assessment.organizationId };
  }

  // Check user
  if (claim.account?.assessment?.userId === req.user?.id) {
    return { isOwner: true, ownerId: claim.account.assessment.userId };
  }

  return { isOwner: false };
});

// ============================================================================
// COMPOSABLE MIDDLEWARE HELPERS
// ============================================================================

/**
 * Combine multiple middleware into one
 * All middleware must pass for the request to proceed
 */
export function combineMiddleware(
  ...middlewares: Array<(req: RBACRequest, res: Response, next: NextFunction) => void | Promise<void>>
) {
  return async (req: RBACRequest, res: Response, next: NextFunction) => {
    let index = 0;

    const runNext = async (): Promise<void> => {
      if (index >= middlewares.length) {
        return next();
      }

      const middleware = middlewares[index++];
      await new Promise<void>((resolve, reject) => {
        middleware(req, res, (err?: unknown) => {
          if (err) reject(err);
          else if (res.headersSent) resolve();
          else resolve();
        });
      });

      if (!res.headersSent) {
        await runNext();
      }
    };

    try {
      await runNext();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Create middleware that checks permission OR ownership
 * User passes if they have the permission OR own the resource
 */
export function requirePermissionOrOwnership(
  permission: string,
  resourceType: string,
  options: { idParam?: string } = {}
) {
  return async (req: RBACRequest, res: Response, next: NextFunction) => {
    await loadRBACContext(req);

    const context = buildPermissionContext(req);
    if (!context) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
        },
      });
    }

    // Check permission first
    if (hasPermission(context, permission)) {
      return next();
    }

    // Fall back to ownership check
    const idParam = options.idParam || 'id';
    const resourceId = req.params[idParam];

    if (!resourceId) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Insufficient permissions',
          code: 'FORBIDDEN',
        },
      });
    }

    const checker = ownershipCheckers[resourceType];
    if (!checker) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Insufficient permissions',
          code: 'FORBIDDEN',
        },
      });
    }

    try {
      const { isOwner } = await checker(req, resourceId);
      if (isOwner) {
        return next();
      }

      return res.status(403).json({
        success: false,
        error: {
          message: 'Insufficient permissions',
          code: 'FORBIDDEN',
        },
      });
    } catch {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Insufficient permissions',
          code: 'FORBIDDEN',
        },
      });
    }
  };
}
