/**
 * RBAC Routes
 *
 * REST API routes for Role-Based Access Control management.
 */

import { Router } from 'express';
import { z } from 'zod';
import * as rbacController from '../controllers/rbacController.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { authenticateToken } from '../middleware/auth.js';
import { requirePermission, requireRole, loadRBAC } from '../middleware/rbac.js';
import { ADMIN_PERMISSIONS } from '@halcyon-rcm/core';

const router = Router();

// ============================================================================
// Validation Schemas
// ============================================================================

const createRoleSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  permissions: z.array(z.string()).min(1, 'At least one permission is required'),
  inheritsFrom: z.array(z.string()).optional(),
  departmentRestricted: z.boolean().optional(),
  allowedDepartments: z.array(z.string()).optional(),
});

const updateRoleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  permissions: z.array(z.string()).optional(),
  inheritsFrom: z.array(z.string()).optional(),
  departmentRestricted: z.boolean().optional(),
  allowedDepartments: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

const updateRolePermissionsSchema = z.object({
  permissions: z.array(z.string()).min(1, 'At least one permission is required'),
});

const assignRoleSchema = z.object({
  roleId: z.string().min(1, 'Role ID is required'),
  expiresAt: z.string().datetime().optional(),
});

const assignDepartmentSchema = z.object({
  departmentId: z.string().min(1, 'Department ID is required'),
  isPrimary: z.boolean().optional(),
});

const checkPermissionSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  permission: z.string().min(1, 'Permission is required'),
  resourceId: z.string().optional(),
});

// ============================================================================
// Current User Routes (authenticated users)
// ============================================================================

/**
 * GET /api/rbac/me/permissions
 * Get current user's effective permissions
 */
router.get('/me/permissions', authenticateToken, loadRBAC(), rbacController.getMyPermissions);

/**
 * GET /api/rbac/me/roles
 * Get current user's roles
 */
router.get('/me/roles', authenticateToken, loadRBAC(), rbacController.getMyRoles);

/**
 * GET /api/rbac/me/departments
 * Get current user's departments
 */
router.get('/me/departments', authenticateToken, loadRBAC(), rbacController.getMyDepartments);

// ============================================================================
// Role Management Routes (requires ADMIN_ROLES permission)
// ============================================================================

/**
 * GET /api/rbac/roles
 * List all roles
 */
router.get(
  '/roles',
  authenticateToken,
  loadRBAC(),
  requirePermission(ADMIN_PERMISSIONS.ROLES),
  rbacController.listRoles
);

/**
 * GET /api/rbac/roles/:id
 * Get a specific role
 */
router.get(
  '/roles/:id',
  authenticateToken,
  loadRBAC(),
  requirePermission(ADMIN_PERMISSIONS.ROLES),
  rbacController.getRole
);

/**
 * POST /api/rbac/roles
 * Create a new custom role
 */
router.post(
  '/roles',
  authenticateToken,
  loadRBAC(),
  requirePermission(ADMIN_PERMISSIONS.ROLES),
  validateRequest(createRoleSchema),
  rbacController.createRole
);

/**
 * PUT /api/rbac/roles/:id
 * Update a custom role
 */
router.put(
  '/roles/:id',
  authenticateToken,
  loadRBAC(),
  requirePermission(ADMIN_PERMISSIONS.ROLES),
  validateRequest(updateRoleSchema),
  rbacController.updateRole
);

/**
 * DELETE /api/rbac/roles/:id
 * Delete a custom role
 */
router.delete(
  '/roles/:id',
  authenticateToken,
  loadRBAC(),
  requirePermission(ADMIN_PERMISSIONS.ROLES),
  rbacController.deleteRole
);

/**
 * GET /api/rbac/roles/:id/permissions
 * Get all permissions for a role
 */
router.get(
  '/roles/:id/permissions',
  authenticateToken,
  loadRBAC(),
  requirePermission(ADMIN_PERMISSIONS.ROLES),
  rbacController.getRolePermissions
);

/**
 * PUT /api/rbac/roles/:id/permissions
 * Update permissions for a custom role
 */
router.put(
  '/roles/:id/permissions',
  authenticateToken,
  loadRBAC(),
  requirePermission(ADMIN_PERMISSIONS.ROLES),
  validateRequest(updateRolePermissionsSchema),
  rbacController.updateRolePermissions
);

// ============================================================================
// User Role Management Routes (requires ADMIN_USERS permission)
// ============================================================================

/**
 * GET /api/rbac/users/:id/permissions
 * Get effective permissions for a user
 */
router.get(
  '/users/:id/permissions',
  authenticateToken,
  loadRBAC(),
  requirePermission(ADMIN_PERMISSIONS.USERS),
  rbacController.getUserPermissions
);

/**
 * GET /api/rbac/users/:id/roles
 * Get roles assigned to a user
 */
router.get(
  '/users/:id/roles',
  authenticateToken,
  loadRBAC(),
  requirePermission(ADMIN_PERMISSIONS.USERS),
  rbacController.getUserRoles
);

/**
 * POST /api/rbac/users/:id/roles
 * Assign a role to a user
 */
router.post(
  '/users/:id/roles',
  authenticateToken,
  loadRBAC(),
  requirePermission(ADMIN_PERMISSIONS.USERS),
  validateRequest(assignRoleSchema),
  rbacController.assignUserRole
);

/**
 * DELETE /api/rbac/users/:id/roles/:roleId
 * Revoke a role from a user
 */
router.delete(
  '/users/:id/roles/:roleId',
  authenticateToken,
  loadRBAC(),
  requirePermission(ADMIN_PERMISSIONS.USERS),
  rbacController.revokeUserRole
);

// ============================================================================
// User Department Management Routes (requires ADMIN_USERS permission)
// ============================================================================

/**
 * GET /api/rbac/users/:id/departments
 * Get departments assigned to a user
 */
router.get(
  '/users/:id/departments',
  authenticateToken,
  loadRBAC(),
  requirePermission(ADMIN_PERMISSIONS.USERS),
  rbacController.getUserDepartments
);

/**
 * POST /api/rbac/users/:id/departments
 * Assign a department to a user
 */
router.post(
  '/users/:id/departments',
  authenticateToken,
  loadRBAC(),
  requirePermission(ADMIN_PERMISSIONS.USERS),
  validateRequest(assignDepartmentSchema),
  rbacController.assignUserDepartment
);

/**
 * DELETE /api/rbac/users/:id/departments/:departmentId
 * Remove a department from a user
 */
router.delete(
  '/users/:id/departments/:departmentId',
  authenticateToken,
  loadRBAC(),
  requirePermission(ADMIN_PERMISSIONS.USERS),
  rbacController.removeUserDepartment
);

// ============================================================================
// Permission Routes
// ============================================================================

/**
 * GET /api/rbac/permissions
 * List all available permissions
 */
router.get(
  '/permissions',
  authenticateToken,
  loadRBAC(),
  rbacController.listPermissions
);

/**
 * POST /api/rbac/check-permission
 * Check if a user has a specific permission
 */
router.post(
  '/check-permission',
  authenticateToken,
  loadRBAC(),
  requirePermission(ADMIN_PERMISSIONS.USERS),
  validateRequest(checkPermissionSchema),
  rbacController.checkPermission
);

// ============================================================================
// Department Routes
// ============================================================================

/**
 * GET /api/rbac/departments
 * List all departments
 */
router.get(
  '/departments',
  authenticateToken,
  loadRBAC(),
  rbacController.listDepartments
);

// ============================================================================
// Audit Routes (requires ADMIN_AUDIT_LOGS permission)
// ============================================================================

/**
 * GET /api/rbac/audit
 * Get access audit logs
 */
router.get(
  '/audit',
  authenticateToken,
  loadRBAC(),
  requirePermission(ADMIN_PERMISSIONS.AUDIT_LOGS),
  rbacController.getAuditLogs
);

export { router as rbacRouter };
