// @ts-nocheck
/**
 * RBAC Controller
 *
 * REST API endpoints for Role-Based Access Control management.
 */

import { Response } from 'express';
import { RBACRequest } from '../middleware/rbac.js';
import { rbacService } from '../services/rbacService.js';
import { isBuiltInRole, BUILT_IN_ROLES } from '@halcyon-rcm/core';

// ============================================================================
// ROLE ENDPOINTS
// ============================================================================

/**
 * GET /rbac/roles
 * List all roles (built-in and custom)
 */
export async function listRoles(req: RBACRequest, res: Response) {
  try {
    const roles = await rbacService.getAllRoles();

    return res.json({
      success: true,
      data: {
        roles: roles.map(r => ({
          id: r.id,
          name: r.name,
          description: r.description,
          isSystem: r.isSystem,
          departmentRestricted: r.departmentRestricted,
          hierarchyLevel: r.hierarchyLevel,
          permissionCount: r.permissions.length,
        })),
        total: roles.length,
      },
    });
  } catch (error) {
    console.error('[RBAC] List roles error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to list roles',
        code: 'INTERNAL_ERROR',
      },
    });
  }
}

/**
 * GET /rbac/roles/:id
 * Get a specific role
 */
export async function getRole(req: RBACRequest, res: Response) {
  try {
    const { id } = req.params;
    const role = await rbacService.getRole(id);

    if (!role) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Role not found',
          code: 'NOT_FOUND',
        },
      });
    }

    return res.json({
      success: true,
      data: role,
    });
  } catch (error) {
    console.error('[RBAC] Get role error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get role',
        code: 'INTERNAL_ERROR',
      },
    });
  }
}

/**
 * POST /rbac/roles
 * Create a new custom role
 */
export async function createRole(req: RBACRequest, res: Response) {
  try {
    const { name, description, permissions, inheritsFrom, departmentRestricted, allowedDepartments } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Role name is required',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    if (!permissions || permissions.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'At least one permission is required',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    const role = await rbacService.createRole(
      {
        name,
        description,
        permissions,
        inheritsFrom,
        departmentRestricted,
        allowedDepartments,
      },
      req.user?.id
    );

    return res.status(201).json({
      success: true,
      data: role,
    });
  } catch (error) {
    console.error('[RBAC] Create role error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create role';
    return res.status(400).json({
      success: false,
      error: {
        message,
        code: 'CREATE_ERROR',
      },
    });
  }
}

/**
 * PUT /rbac/roles/:id
 * Update a custom role
 */
export async function updateRole(req: RBACRequest, res: Response) {
  try {
    const { id } = req.params;
    const { name, description, permissions, inheritsFrom, departmentRestricted, allowedDepartments, isActive } = req.body;

    const role = await rbacService.updateRole(
      id,
      {
        name,
        description,
        permissions,
        inheritsFrom,
        departmentRestricted,
        allowedDepartments,
        isActive,
      },
      req.user?.id
    );

    return res.json({
      success: true,
      data: role,
    });
  } catch (error) {
    console.error('[RBAC] Update role error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update role';
    return res.status(400).json({
      success: false,
      error: {
        message,
        code: 'UPDATE_ERROR',
      },
    });
  }
}

/**
 * DELETE /rbac/roles/:id
 * Delete a custom role
 */
export async function deleteRole(req: RBACRequest, res: Response) {
  try {
    const { id } = req.params;

    await rbacService.deleteRole(id, req.user?.id);

    return res.json({
      success: true,
      message: 'Role deleted successfully',
    });
  } catch (error) {
    console.error('[RBAC] Delete role error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete role';
    return res.status(400).json({
      success: false,
      error: {
        message,
        code: 'DELETE_ERROR',
      },
    });
  }
}

/**
 * GET /rbac/roles/:id/permissions
 * Get all permissions for a role (including inherited)
 */
export async function getRolePermissions(req: RBACRequest, res: Response) {
  try {
    const { id } = req.params;
    const role = await rbacService.getRole(id);

    if (!role) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Role not found',
          code: 'NOT_FOUND',
        },
      });
    }

    // Get direct permissions
    const directPermissions = role.permissions;

    // Get inherited permissions (from parent roles)
    const inheritedPermissions: string[] = [];
    const processedRoles = new Set<string>();

    const processInheritance = async (roleIds: string[]) => {
      for (const roleId of roleIds) {
        if (processedRoles.has(roleId)) continue;
        processedRoles.add(roleId);

        const parentRole = await rbacService.getRole(roleId);
        if (parentRole) {
          for (const perm of parentRole.permissions) {
            if (!directPermissions.includes(perm) && !inheritedPermissions.includes(perm)) {
              inheritedPermissions.push(perm);
            }
          }
          await processInheritance(parentRole.inheritsFrom);
        }
      }
    };

    await processInheritance(role.inheritsFrom);

    return res.json({
      success: true,
      data: {
        roleId: id,
        roleName: role.name,
        directPermissions,
        inheritedPermissions,
        allPermissions: [...new Set([...directPermissions, ...inheritedPermissions])],
        inheritsFrom: role.inheritsFrom,
      },
    });
  } catch (error) {
    console.error('[RBAC] Get role permissions error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get role permissions',
        code: 'INTERNAL_ERROR',
      },
    });
  }
}

/**
 * PUT /rbac/roles/:id/permissions
 * Update permissions for a custom role
 */
export async function updateRolePermissions(req: RBACRequest, res: Response) {
  try {
    const { id } = req.params;
    const { permissions } = req.body;

    if (!permissions || !Array.isArray(permissions)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Permissions array is required',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    const role = await rbacService.updateRole(id, { permissions }, req.user?.id);

    return res.json({
      success: true,
      data: {
        roleId: role.id,
        permissions: role.permissions,
      },
    });
  } catch (error) {
    console.error('[RBAC] Update role permissions error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update role permissions';
    return res.status(400).json({
      success: false,
      error: {
        message,
        code: 'UPDATE_ERROR',
      },
    });
  }
}

// ============================================================================
// USER ROLE ENDPOINTS
// ============================================================================

/**
 * GET /rbac/users/:id/permissions
 * Get effective permissions for a user
 */
export async function getUserPermissions(req: RBACRequest, res: Response) {
  try {
    const { id } = req.params;

    const effectivePerms = await rbacService.getEffectivePermissions(id);

    return res.json({
      success: true,
      data: effectivePerms,
    });
  } catch (error) {
    console.error('[RBAC] Get user permissions error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get user permissions',
        code: 'INTERNAL_ERROR',
      },
    });
  }
}

/**
 * GET /rbac/users/:id/roles
 * Get roles assigned to a user
 */
export async function getUserRoles(req: RBACRequest, res: Response) {
  try {
    const { id } = req.params;

    const roles = await rbacService.getUserRoles(id);

    return res.json({
      success: true,
      data: {
        userId: id,
        roles: roles.map(r => ({
          id: r.id,
          name: r.name,
          description: r.description,
          isSystem: r.isSystem,
          assignedAt: r.assignedAt,
          expiresAt: r.expiresAt,
        })),
      },
    });
  } catch (error) {
    console.error('[RBAC] Get user roles error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get user roles',
        code: 'INTERNAL_ERROR',
      },
    });
  }
}

/**
 * POST /rbac/users/:id/roles
 * Assign a role to a user
 */
export async function assignUserRole(req: RBACRequest, res: Response) {
  try {
    const { id } = req.params;
    const { roleId, expiresAt } = req.body;

    if (!roleId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Role ID is required',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    await rbacService.assignRole({
      userId: id,
      roleId,
      assignedBy: req.user?.id,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });

    return res.status(201).json({
      success: true,
      message: 'Role assigned successfully',
    });
  } catch (error) {
    console.error('[RBAC] Assign role error:', error);
    const message = error instanceof Error ? error.message : 'Failed to assign role';
    return res.status(400).json({
      success: false,
      error: {
        message,
        code: 'ASSIGN_ERROR',
      },
    });
  }
}

/**
 * DELETE /rbac/users/:id/roles/:roleId
 * Revoke a role from a user
 */
export async function revokeUserRole(req: RBACRequest, res: Response) {
  try {
    const { id, roleId } = req.params;

    await rbacService.revokeRole(id, roleId, req.user?.id);

    return res.json({
      success: true,
      message: 'Role revoked successfully',
    });
  } catch (error) {
    console.error('[RBAC] Revoke role error:', error);
    const message = error instanceof Error ? error.message : 'Failed to revoke role';
    return res.status(400).json({
      success: false,
      error: {
        message,
        code: 'REVOKE_ERROR',
      },
    });
  }
}

// ============================================================================
// USER DEPARTMENT ENDPOINTS
// ============================================================================

/**
 * GET /rbac/users/:id/departments
 * Get departments assigned to a user
 */
export async function getUserDepartments(req: RBACRequest, res: Response) {
  try {
    const { id } = req.params;

    const departments = await rbacService.getUserDepartments(id);

    return res.json({
      success: true,
      data: {
        userId: id,
        departments,
      },
    });
  } catch (error) {
    console.error('[RBAC] Get user departments error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get user departments',
        code: 'INTERNAL_ERROR',
      },
    });
  }
}

/**
 * POST /rbac/users/:id/departments
 * Assign a department to a user
 */
export async function assignUserDepartment(req: RBACRequest, res: Response) {
  try {
    const { id } = req.params;
    const { departmentId, isPrimary } = req.body;

    if (!departmentId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Department ID is required',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    await rbacService.assignDepartment({
      userId: id,
      departmentId,
      isPrimary,
      assignedBy: req.user?.id,
    });

    return res.status(201).json({
      success: true,
      message: 'Department assigned successfully',
    });
  } catch (error) {
    console.error('[RBAC] Assign department error:', error);
    const message = error instanceof Error ? error.message : 'Failed to assign department';
    return res.status(400).json({
      success: false,
      error: {
        message,
        code: 'ASSIGN_ERROR',
      },
    });
  }
}

/**
 * DELETE /rbac/users/:id/departments/:departmentId
 * Remove a department from a user
 */
export async function removeUserDepartment(req: RBACRequest, res: Response) {
  try {
    const { id, departmentId } = req.params;

    await rbacService.removeDepartment(id, departmentId, req.user?.id);

    return res.json({
      success: true,
      message: 'Department removed successfully',
    });
  } catch (error) {
    console.error('[RBAC] Remove department error:', error);
    const message = error instanceof Error ? error.message : 'Failed to remove department';
    return res.status(400).json({
      success: false,
      error: {
        message,
        code: 'REMOVE_ERROR',
      },
    });
  }
}

// ============================================================================
// PERMISSION ENDPOINTS
// ============================================================================

/**
 * GET /rbac/permissions
 * List all available permissions
 */
export async function listPermissions(req: RBACRequest, res: Response) {
  try {
    const { groupByModule } = req.query;

    if (groupByModule === 'true') {
      const byModule = rbacService.getPermissionsByModule();
      return res.json({
        success: true,
        data: byModule,
      });
    }

    const permissions = rbacService.getAllPermissions();

    return res.json({
      success: true,
      data: {
        permissions,
        total: permissions.length,
      },
    });
  } catch (error) {
    console.error('[RBAC] List permissions error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to list permissions',
        code: 'INTERNAL_ERROR',
      },
    });
  }
}

/**
 * POST /rbac/check-permission
 * Check if a user has a specific permission
 */
export async function checkPermission(req: RBACRequest, res: Response) {
  try {
    const { userId, permission, resourceId } = req.body;

    if (!userId || !permission) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'User ID and permission are required',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    const result = await rbacService.checkPermission(userId, permission, resourceId);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[RBAC] Check permission error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to check permission',
        code: 'INTERNAL_ERROR',
      },
    });
  }
}

// ============================================================================
// DEPARTMENT ENDPOINTS
// ============================================================================

/**
 * GET /rbac/departments
 * List all departments
 */
export async function listDepartments(req: RBACRequest, res: Response) {
  try {
    const departments = await rbacService.getAllDepartmentsFromDb();

    return res.json({
      success: true,
      data: {
        departments,
        total: departments.length,
      },
    });
  } catch (error) {
    console.error('[RBAC] List departments error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to list departments',
        code: 'INTERNAL_ERROR',
      },
    });
  }
}

// ============================================================================
// AUDIT ENDPOINTS
// ============================================================================

/**
 * GET /rbac/audit
 * Get access audit logs
 */
export async function getAuditLogs(req: RBACRequest, res: Response) {
  try {
    const {
      userId,
      resource,
      action,
      result,
      startDate,
      endDate,
      limit = '100',
      offset = '0',
    } = req.query;

    const logs = await rbacService.queryAuditLogs({
      userId: userId as string,
      resource: resource as string,
      action: action as string,
      result: result as 'ALLOWED' | 'DENIED',
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
    });

    return res.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    console.error('[RBAC] Get audit logs error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get audit logs',
        code: 'INTERNAL_ERROR',
      },
    });
  }
}

// ============================================================================
// CURRENT USER ENDPOINTS
// ============================================================================

/**
 * GET /rbac/me/permissions
 * Get current user's effective permissions
 */
export async function getMyPermissions(req: RBACRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
        },
      });
    }

    const effectivePerms = await rbacService.getEffectivePermissions(req.user.id);

    return res.json({
      success: true,
      data: effectivePerms,
    });
  } catch (error) {
    console.error('[RBAC] Get my permissions error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get permissions',
        code: 'INTERNAL_ERROR',
      },
    });
  }
}

/**
 * GET /rbac/me/roles
 * Get current user's roles
 */
export async function getMyRoles(req: RBACRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
        },
      });
    }

    const roles = await rbacService.getUserRoles(req.user.id);

    return res.json({
      success: true,
      data: {
        roles: roles.map(r => ({
          id: r.id,
          name: r.name,
          description: r.description,
          assignedAt: r.assignedAt,
          expiresAt: r.expiresAt,
        })),
      },
    });
  } catch (error) {
    console.error('[RBAC] Get my roles error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get roles',
        code: 'INTERNAL_ERROR',
      },
    });
  }
}

/**
 * GET /rbac/me/departments
 * Get current user's departments
 */
export async function getMyDepartments(req: RBACRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
        },
      });
    }

    const departments = await rbacService.getUserDepartments(req.user.id);

    return res.json({
      success: true,
      data: {
        departments,
      },
    });
  } catch (error) {
    console.error('[RBAC] Get my departments error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get departments',
        code: 'INTERNAL_ERROR',
      },
    });
  }
}
