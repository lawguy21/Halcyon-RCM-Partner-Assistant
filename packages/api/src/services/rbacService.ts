// @ts-nocheck
/**
 * RBAC Service
 *
 * Service layer for Role-Based Access Control operations including
 * role management, permission checking, department assignments, and access auditing.
 */

import { prisma } from '../lib/prisma.js';
import {
  // Permissions
  Permission,
  PERMISSION_DEFINITIONS,
  ALL_PERMISSIONS,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getModulePermissions,
  validatePermissions,
  UserPermissionContext,

  // Roles
  Role,
  BUILT_IN_ROLES,
  getRolePermissions,
  canRoleAccess,
  getEffectivePermissionsForRoles,
  isBuiltInRole,
  validateRole,
  canManageRole,
  getRoleHierarchyLevel,

  // Departments
  Department,
  DepartmentAccess,
  DEPARTMENTS,
  canAccessDepartment,
  getUserAccessibleDepartments,
  validateDepartmentAccess,
} from '@halcyon-rcm/core';

// ============================================================================
// TYPES
// ============================================================================

export interface RoleCreateInput {
  id?: string;
  name: string;
  description?: string;
  permissions: string[];
  inheritsFrom?: string[];
  departmentRestricted?: boolean;
  allowedDepartments?: string[];
}

export interface RoleUpdateInput {
  name?: string;
  description?: string;
  permissions?: string[];
  inheritsFrom?: string[];
  departmentRestricted?: boolean;
  allowedDepartments?: string[];
  isActive?: boolean;
}

export interface UserRoleInput {
  userId: string;
  roleId: string;
  assignedBy?: string;
  expiresAt?: Date;
}

export interface UserDepartmentInput {
  userId: string;
  departmentId: string;
  isPrimary?: boolean;
  assignedBy?: string;
}

export interface PermissionCheckResult {
  allowed: boolean;
  permission: string;
  userId: string;
  resourceId?: string;
  reason?: string;
  checkedAt: Date;
}

export interface AccessAuditInput {
  userId: string;
  resource: string;
  resourceId?: string;
  action: string;
  result: 'ALLOWED' | 'DENIED';
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface EffectivePermissions {
  userId: string;
  permissions: string[];
  roles: Array<{ id: string; name: string }>;
  departments: Array<{ id: string; name: string; isPrimary: boolean }>;
  computedAt: Date;
}

// ============================================================================
// RBAC SERVICE CLASS
// ============================================================================

class RBACService {
  // ==========================================================================
  // ROLE MANAGEMENT
  // ==========================================================================

  /**
   * Get all roles (built-in and custom)
   */
  async getAllRoles(): Promise<Role[]> {
    // Get custom roles from database
    const customRoles = await prisma.role.findMany({
      where: { isActive: true },
    });

    // Convert to Role interface
    const dbRoles: Role[] = customRoles.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description || '',
      permissions: r.permissions as string[],
      inheritsFrom: r.inheritsFrom as string[] || [],
      departmentRestricted: r.departmentRestricted,
      allowedDepartments: r.allowedDepartments as string[] || [],
      isSystem: r.isSystem,
      hierarchyLevel: 4 as const, // Custom roles default to specialist level
    }));

    // Combine with built-in roles
    return [...Object.values(BUILT_IN_ROLES), ...dbRoles];
  }

  /**
   * Get a role by ID
   */
  async getRole(roleId: string): Promise<Role | null> {
    // Check built-in roles first
    if (BUILT_IN_ROLES[roleId]) {
      return BUILT_IN_ROLES[roleId];
    }

    // Check database for custom role
    const dbRole = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!dbRole) return null;

    return {
      id: dbRole.id,
      name: dbRole.name,
      description: dbRole.description || '',
      permissions: dbRole.permissions as string[],
      inheritsFrom: dbRole.inheritsFrom as string[] || [],
      departmentRestricted: dbRole.departmentRestricted,
      allowedDepartments: dbRole.allowedDepartments as string[] || [],
      isSystem: dbRole.isSystem,
      hierarchyLevel: 4 as const,
    };
  }

  /**
   * Create a custom role
   */
  async createRole(input: RoleCreateInput, createdBy?: string): Promise<Role> {
    // Validate permissions
    const { valid, invalid } = validatePermissions(input.permissions);
    if (invalid.length > 0) {
      throw new Error(`Invalid permissions: ${invalid.join(', ')}`);
    }

    // Generate ID if not provided
    const roleId = input.id || `custom_${Date.now()}`;

    // Check if ID already exists
    if (BUILT_IN_ROLES[roleId] || await prisma.role.findUnique({ where: { id: roleId } })) {
      throw new Error('Role ID already exists');
    }

    // Create in database
    const dbRole = await prisma.role.create({
      data: {
        id: roleId,
        name: input.name,
        description: input.description,
        permissions: input.permissions,
        inheritsFrom: input.inheritsFrom || [],
        departmentRestricted: input.departmentRestricted || false,
        allowedDepartments: input.allowedDepartments || [],
        isSystem: false,
        isActive: true,
      },
    });

    // Audit log
    await this.logAudit({
      userId: createdBy || 'SYSTEM',
      resource: 'Role',
      resourceId: dbRole.id,
      action: 'CREATE',
      result: 'ALLOWED',
      metadata: { roleName: input.name },
    });

    return {
      id: dbRole.id,
      name: dbRole.name,
      description: dbRole.description || '',
      permissions: dbRole.permissions as string[],
      inheritsFrom: dbRole.inheritsFrom as string[] || [],
      departmentRestricted: dbRole.departmentRestricted,
      allowedDepartments: dbRole.allowedDepartments as string[] || [],
      isSystem: false,
      hierarchyLevel: 4 as const,
    };
  }

  /**
   * Update a custom role
   */
  async updateRole(roleId: string, input: RoleUpdateInput, updatedBy?: string): Promise<Role> {
    // Cannot update built-in roles
    if (isBuiltInRole(roleId)) {
      throw new Error('Cannot update built-in roles');
    }

    const existingRole = await prisma.role.findUnique({ where: { id: roleId } });
    if (!existingRole) {
      throw new Error('Role not found');
    }

    if (existingRole.isSystem) {
      throw new Error('Cannot update system roles');
    }

    // Validate permissions if provided
    if (input.permissions) {
      const { invalid } = validatePermissions(input.permissions);
      if (invalid.length > 0) {
        throw new Error(`Invalid permissions: ${invalid.join(', ')}`);
      }
    }

    const updatedRole = await prisma.role.update({
      where: { id: roleId },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.permissions && { permissions: input.permissions }),
        ...(input.inheritsFrom && { inheritsFrom: input.inheritsFrom }),
        ...(input.departmentRestricted !== undefined && { departmentRestricted: input.departmentRestricted }),
        ...(input.allowedDepartments && { allowedDepartments: input.allowedDepartments }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
    });

    // Audit log
    await this.logAudit({
      userId: updatedBy || 'SYSTEM',
      resource: 'Role',
      resourceId: roleId,
      action: 'UPDATE',
      result: 'ALLOWED',
      metadata: { changes: Object.keys(input) },
    });

    return {
      id: updatedRole.id,
      name: updatedRole.name,
      description: updatedRole.description || '',
      permissions: updatedRole.permissions as string[],
      inheritsFrom: updatedRole.inheritsFrom as string[] || [],
      departmentRestricted: updatedRole.departmentRestricted,
      allowedDepartments: updatedRole.allowedDepartments as string[] || [],
      isSystem: updatedRole.isSystem,
      hierarchyLevel: 4 as const,
    };
  }

  /**
   * Delete a custom role
   */
  async deleteRole(roleId: string, deletedBy?: string): Promise<void> {
    if (isBuiltInRole(roleId)) {
      throw new Error('Cannot delete built-in roles');
    }

    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw new Error('Role not found');
    }

    if (role.isSystem) {
      throw new Error('Cannot delete system roles');
    }

    // Check if any users have this role
    const usersWithRole = await prisma.userRole.count({
      where: { roleId },
    });

    if (usersWithRole > 0) {
      throw new Error(`Cannot delete role: ${usersWithRole} users still have this role`);
    }

    await prisma.role.delete({ where: { id: roleId } });

    // Audit log
    await this.logAudit({
      userId: deletedBy || 'SYSTEM',
      resource: 'Role',
      resourceId: roleId,
      action: 'DELETE',
      result: 'ALLOWED',
      metadata: { roleName: role.name },
    });
  }

  // ==========================================================================
  // USER ROLE ASSIGNMENT
  // ==========================================================================

  /**
   * Assign a role to a user
   */
  async assignRole(input: UserRoleInput): Promise<void> {
    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id: input.userId } });
    if (!user) {
      throw new Error('User not found');
    }

    // Verify role exists
    const role = await this.getRole(input.roleId);
    if (!role) {
      throw new Error('Role not found');
    }

    // Check if already assigned
    const existingAssignment = await prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId: input.userId,
          roleId: input.roleId,
        },
      },
    });

    if (existingAssignment) {
      throw new Error('Role already assigned to user');
    }

    // Create assignment
    await prisma.userRole.create({
      data: {
        userId: input.userId,
        roleId: input.roleId,
        assignedBy: input.assignedBy,
        expiresAt: input.expiresAt,
      },
    });

    // Audit log
    await this.logAudit({
      userId: input.assignedBy || 'SYSTEM',
      resource: 'UserRole',
      resourceId: `${input.userId}:${input.roleId}`,
      action: 'ASSIGN',
      result: 'ALLOWED',
      metadata: { targetUserId: input.userId, roleId: input.roleId },
    });
  }

  /**
   * Revoke a role from a user
   */
  async revokeRole(userId: string, roleId: string, revokedBy?: string): Promise<void> {
    const assignment = await prisma.userRole.findUnique({
      where: {
        userId_roleId: { userId, roleId },
      },
    });

    if (!assignment) {
      throw new Error('Role assignment not found');
    }

    await prisma.userRole.delete({
      where: {
        userId_roleId: { userId, roleId },
      },
    });

    // Audit log
    await this.logAudit({
      userId: revokedBy || 'SYSTEM',
      resource: 'UserRole',
      resourceId: `${userId}:${roleId}`,
      action: 'REVOKE',
      result: 'ALLOWED',
      metadata: { targetUserId: userId, roleId },
    });
  }

  /**
   * Get all roles assigned to a user
   */
  async getUserRoles(userId: string): Promise<Array<Role & { assignedAt: Date; expiresAt?: Date }>> {
    const assignments = await prisma.userRole.findMany({
      where: { userId },
    });

    const roles: Array<Role & { assignedAt: Date; expiresAt?: Date }> = [];

    for (const assignment of assignments) {
      const role = await this.getRole(assignment.roleId);
      if (role) {
        roles.push({
          ...role,
          assignedAt: assignment.assignedAt,
          expiresAt: assignment.expiresAt || undefined,
        });
      }
    }

    return roles;
  }

  // ==========================================================================
  // DEPARTMENT ASSIGNMENT
  // ==========================================================================

  /**
   * Assign a department to a user
   */
  async assignDepartment(input: UserDepartmentInput): Promise<void> {
    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id: input.userId } });
    if (!user) {
      throw new Error('User not found');
    }

    // Verify department exists
    const department = await prisma.department.findUnique({ where: { id: input.departmentId } });
    if (!department) {
      throw new Error('Department not found');
    }

    // Check existing assignment
    const existingAssignment = await prisma.userDepartment.findUnique({
      where: {
        userId_departmentId: {
          userId: input.userId,
          departmentId: input.departmentId,
        },
      },
    });

    if (existingAssignment) {
      // Update isPrimary if needed
      if (input.isPrimary && !existingAssignment.isPrimary) {
        // Clear other primary flags first
        await prisma.userDepartment.updateMany({
          where: { userId: input.userId, isPrimary: true },
          data: { isPrimary: false },
        });

        await prisma.userDepartment.update({
          where: {
            userId_departmentId: {
              userId: input.userId,
              departmentId: input.departmentId,
            },
          },
          data: { isPrimary: true },
        });
      }
      return;
    }

    // If setting as primary, clear other primary flags
    if (input.isPrimary) {
      await prisma.userDepartment.updateMany({
        where: { userId: input.userId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    // Check if this is the first department (make it primary)
    const existingDepts = await prisma.userDepartment.count({
      where: { userId: input.userId },
    });

    await prisma.userDepartment.create({
      data: {
        userId: input.userId,
        departmentId: input.departmentId,
        isPrimary: input.isPrimary || existingDepts === 0,
      },
    });

    // Audit log
    await this.logAudit({
      userId: input.assignedBy || 'SYSTEM',
      resource: 'UserDepartment',
      resourceId: `${input.userId}:${input.departmentId}`,
      action: 'ASSIGN',
      result: 'ALLOWED',
      metadata: { targetUserId: input.userId, departmentId: input.departmentId, isPrimary: input.isPrimary },
    });
  }

  /**
   * Remove a department from a user
   */
  async removeDepartment(userId: string, departmentId: string, removedBy?: string): Promise<void> {
    const assignment = await prisma.userDepartment.findUnique({
      where: {
        userId_departmentId: { userId, departmentId },
      },
    });

    if (!assignment) {
      throw new Error('Department assignment not found');
    }

    // Check if it's the only department
    const deptCount = await prisma.userDepartment.count({
      where: { userId },
    });

    if (deptCount === 1) {
      throw new Error('Cannot remove the only department assignment');
    }

    await prisma.userDepartment.delete({
      where: {
        userId_departmentId: { userId, departmentId },
      },
    });

    // If this was primary, assign another as primary
    if (assignment.isPrimary) {
      const newPrimary = await prisma.userDepartment.findFirst({
        where: { userId },
      });

      if (newPrimary) {
        await prisma.userDepartment.update({
          where: {
            userId_departmentId: {
              userId,
              departmentId: newPrimary.departmentId,
            },
          },
          data: { isPrimary: true },
        });
      }
    }

    // Audit log
    await this.logAudit({
      userId: removedBy || 'SYSTEM',
      resource: 'UserDepartment',
      resourceId: `${userId}:${departmentId}`,
      action: 'REMOVE',
      result: 'ALLOWED',
      metadata: { targetUserId: userId, departmentId },
    });
  }

  /**
   * Get all departments assigned to a user
   */
  async getUserDepartments(userId: string): Promise<Array<{ id: string; name: string; code: string; isPrimary: boolean }>> {
    const assignments = await prisma.userDepartment.findMany({
      where: { userId },
      include: { department: true },
    });

    return assignments.map(a => ({
      id: a.department.id,
      name: a.department.name,
      code: a.department.code,
      isPrimary: a.isPrimary,
    }));
  }

  // ==========================================================================
  // PERMISSION CHECKING
  // ==========================================================================

  /**
   * Check if a user has a specific permission
   */
  async checkPermission(
    userId: string,
    permission: string,
    resourceId?: string
  ): Promise<PermissionCheckResult> {
    const effectivePerms = await this.getEffectivePermissions(userId);

    const allowed = effectivePerms.permissions.includes(permission);

    const result: PermissionCheckResult = {
      allowed,
      permission,
      userId,
      resourceId,
      reason: allowed ? 'Permission granted via role' : 'Permission not found in user roles',
      checkedAt: new Date(),
    };

    // Log the check
    await this.logAudit({
      userId,
      resource: permission,
      resourceId,
      action: 'PERMISSION_CHECK',
      result: allowed ? 'ALLOWED' : 'DENIED',
    });

    return result;
  }

  /**
   * Check multiple permissions for a user
   */
  async checkPermissions(
    userId: string,
    permissions: string[],
    requireAll: boolean = false
  ): Promise<{ allowed: boolean; results: PermissionCheckResult[] }> {
    const effectivePerms = await this.getEffectivePermissions(userId);
    const results: PermissionCheckResult[] = [];

    for (const permission of permissions) {
      const allowed = effectivePerms.permissions.includes(permission);
      results.push({
        allowed,
        permission,
        userId,
        checkedAt: new Date(),
      });
    }

    const allowed = requireAll
      ? results.every(r => r.allowed)
      : results.some(r => r.allowed);

    return { allowed, results };
  }

  /**
   * Get all effective permissions for a user
   */
  async getEffectivePermissions(userId: string): Promise<EffectivePermissions> {
    // Get user's roles
    const userRoles = await this.getUserRoles(userId);

    // Filter out expired roles
    const activeRoles = userRoles.filter(r => !r.expiresAt || r.expiresAt > new Date());

    // Get role IDs
    const roleIds = activeRoles.map(r => r.id);

    // Build custom roles map for permission calculation
    const customRolesMap: Record<string, Role> = {};
    for (const role of activeRoles) {
      if (!isBuiltInRole(role.id)) {
        customRolesMap[role.id] = role;
      }
    }

    // Calculate effective permissions
    const permissions = getEffectivePermissionsForRoles(roleIds, customRolesMap);

    // Get departments
    const departments = await this.getUserDepartments(userId);

    return {
      userId,
      permissions,
      roles: activeRoles.map(r => ({ id: r.id, name: r.name })),
      departments: departments.map(d => ({ id: d.id, name: d.name, isPrimary: d.isPrimary })),
      computedAt: new Date(),
    };
  }

  // ==========================================================================
  // ACCESS AUDITING
  // ==========================================================================

  /**
   * Log an access audit entry
   */
  async logAudit(input: AccessAuditInput): Promise<void> {
    await prisma.accessAudit.create({
      data: {
        userId: input.userId,
        resource: input.resource,
        resourceId: input.resourceId,
        action: input.action,
        result: input.result,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        metadata: input.metadata,
        timestamp: new Date(),
      },
    });
  }

  /**
   * Query access audit logs
   */
  async queryAuditLogs(filters: {
    userId?: string;
    resource?: string;
    action?: string;
    result?: 'ALLOWED' | 'DENIED';
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{
    logs: Array<{
      id: string;
      userId: string;
      resource: string;
      resourceId?: string;
      action: string;
      result: string;
      timestamp: Date;
      ipAddress?: string;
      metadata?: unknown;
    }>;
    total: number;
  }> {
    const where: Record<string, unknown> = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.resource) where.resource = filters.resource;
    if (filters.action) where.action = filters.action;
    if (filters.result) where.result = filters.result;

    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) (where.timestamp as Record<string, Date>).gte = filters.startDate;
      if (filters.endDate) (where.timestamp as Record<string, Date>).lte = filters.endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.accessAudit.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: filters.limit || 100,
        skip: filters.offset || 0,
      }),
      prisma.accessAudit.count({ where }),
    ]);

    return {
      logs: logs.map(l => ({
        id: l.id,
        userId: l.userId,
        resource: l.resource,
        resourceId: l.resourceId || undefined,
        action: l.action,
        result: l.result,
        timestamp: l.timestamp,
        ipAddress: l.ipAddress || undefined,
        metadata: l.metadata,
      })),
      total,
    };
  }

  // ==========================================================================
  // PERMISSION METADATA
  // ==========================================================================

  /**
   * Get all available permissions
   */
  getAllPermissions(): Permission[] {
    return Object.values(PERMISSION_DEFINITIONS);
  }

  /**
   * Get permissions grouped by module
   */
  getPermissionsByModule(): Record<string, Permission[]> {
    const byModule: Record<string, Permission[]> = {};

    for (const perm of Object.values(PERMISSION_DEFINITIONS)) {
      if (!byModule[perm.module]) {
        byModule[perm.module] = [];
      }
      byModule[perm.module].push(perm);
    }

    return byModule;
  }

  // ==========================================================================
  // DEPARTMENT METADATA
  // ==========================================================================

  /**
   * Get all available departments
   */
  async getAllDepartmentsFromDb(): Promise<Array<{ id: string; name: string; code: string }>> {
    const departments = await prisma.department.findMany({
      orderBy: { name: 'asc' },
    });

    return departments.map(d => ({
      id: d.id,
      name: d.name,
      code: d.code,
    }));
  }
}

// Export singleton instance
export const rbacService = new RBACService();
