/**
 * Role Definitions and Hierarchy
 *
 * Defines built-in roles, role hierarchy, and permission sets for the Halcyon RCM application.
 * Supports role inheritance and department-restricted access.
 */

import {
  CHARGES_PERMISSIONS,
  CLAIMS_PERMISSIONS,
  PAYMENTS_PERMISSIONS,
  COLLECTIONS_PERMISSIONS,
  PATIENTS_PERMISSIONS,
  PAYERS_PERMISSIONS,
  REPORTS_PERMISSIONS,
  COMPLIANCE_PERMISSIONS,
  ADMIN_PERMISSIONS,
  ALL_PERMISSIONS,
  hasPermission,
  UserPermissionContext,
} from './permissions.js';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Built-in role identifiers
 */
export type BuiltInRoleId =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'BILLING_MANAGER'
  | 'BILLING_SPECIALIST'
  | 'COLLECTOR'
  | 'FINANCIAL_COUNSELOR'
  | 'CODER'
  | 'AUDITOR'
  | 'VIEWER'
  | 'PATIENT';

/**
 * Role hierarchy levels (lower number = higher authority)
 */
export type RoleHierarchyLevel = 1 | 2 | 3 | 4 | 5;

/**
 * Role interface defining a single role
 */
export interface Role {
  /** Unique role identifier */
  id: string;
  /** Human-readable role name */
  name: string;
  /** Role description */
  description: string;
  /** Array of permission keys granted to this role */
  permissions: string[];
  /** Array of role IDs this role inherits from */
  inheritsFrom: string[];
  /** Whether this role is restricted to specific departments */
  departmentRestricted: boolean;
  /** Allowed department IDs (if department restricted) */
  allowedDepartments?: string[];
  /** Whether this is a system-defined role (cannot be deleted) */
  isSystem: boolean;
  /** Hierarchy level (1=highest, 5=lowest) */
  hierarchyLevel: RoleHierarchyLevel;
}

/**
 * Role assignment for a user
 */
export interface UserRoleAssignment {
  userId: string;
  roleId: string;
  assignedAt: Date;
  assignedBy?: string;
  expiresAt?: Date;
}

// ============================================================================
// ROLE HIERARCHY DEFINITION
// ============================================================================

/**
 * Role hierarchy levels
 * SUPER_ADMIN > ADMIN > MANAGER > SPECIALIST > VIEWER
 */
export const ROLE_HIERARCHY: Record<RoleHierarchyLevel, BuiltInRoleId[]> = {
  1: ['SUPER_ADMIN'],
  2: ['ADMIN'],
  3: ['BILLING_MANAGER', 'AUDITOR'],
  4: ['BILLING_SPECIALIST', 'COLLECTOR', 'FINANCIAL_COUNSELOR', 'CODER'],
  5: ['VIEWER', 'PATIENT'],
};

/**
 * Get hierarchy level for a role
 */
export function getRoleHierarchyLevel(roleId: string): RoleHierarchyLevel | undefined {
  for (const [level, roles] of Object.entries(ROLE_HIERARCHY)) {
    if (roles.includes(roleId as BuiltInRoleId)) {
      return parseInt(level, 10) as RoleHierarchyLevel;
    }
  }
  return undefined;
}

// ============================================================================
// DEFAULT PERMISSION SETS BY ROLE
// ============================================================================

/**
 * Super Admin - Full system access
 */
const SUPER_ADMIN_PERMISSIONS = ALL_PERMISSIONS;

/**
 * Admin - Full operational access, limited system settings
 */
const ADMIN_PERMISSIONS_SET = [
  ...Object.values(CHARGES_PERMISSIONS),
  ...Object.values(CLAIMS_PERMISSIONS),
  ...Object.values(PAYMENTS_PERMISSIONS),
  ...Object.values(COLLECTIONS_PERMISSIONS),
  ...Object.values(PATIENTS_PERMISSIONS),
  ...Object.values(PAYERS_PERMISSIONS),
  ...Object.values(REPORTS_PERMISSIONS),
  ...Object.values(COMPLIANCE_PERMISSIONS),
  ADMIN_PERMISSIONS.USERS,
  ADMIN_PERMISSIONS.AUDIT_LOGS,
];

/**
 * Billing Manager - Full billing operations
 */
const BILLING_MANAGER_PERMISSIONS = [
  ...Object.values(CHARGES_PERMISSIONS),
  ...Object.values(CLAIMS_PERMISSIONS),
  ...Object.values(PAYMENTS_PERMISSIONS),
  COLLECTIONS_PERMISSIONS.VIEW,
  COLLECTIONS_PERMISSIONS.MANAGE,
  PATIENTS_PERMISSIONS.VIEW,
  PATIENTS_PERMISSIONS.PHI_ACCESS,
  PAYERS_PERMISSIONS.VIEW,
  PAYERS_PERMISSIONS.MANAGE,
  REPORTS_PERMISSIONS.VIEW,
  REPORTS_PERMISSIONS.EXPORT,
  COMPLIANCE_PERMISSIONS.VIEW,
];

/**
 * Billing Specialist - Standard billing tasks
 */
const BILLING_SPECIALIST_PERMISSIONS = [
  CHARGES_PERMISSIONS.VIEW,
  CHARGES_PERMISSIONS.CREATE,
  CHARGES_PERMISSIONS.EDIT,
  CLAIMS_PERMISSIONS.VIEW,
  CLAIMS_PERMISSIONS.CREATE,
  CLAIMS_PERMISSIONS.EDIT,
  CLAIMS_PERMISSIONS.SUBMIT,
  PAYMENTS_PERMISSIONS.VIEW,
  PAYMENTS_PERMISSIONS.POST,
  PATIENTS_PERMISSIONS.VIEW,
  PATIENTS_PERMISSIONS.PHI_ACCESS,
  PAYERS_PERMISSIONS.VIEW,
  REPORTS_PERMISSIONS.VIEW,
];

/**
 * Collector - Collections operations
 */
const COLLECTOR_PERMISSIONS = [
  COLLECTIONS_PERMISSIONS.VIEW,
  COLLECTIONS_PERMISSIONS.MANAGE,
  PATIENTS_PERMISSIONS.VIEW,
  PATIENTS_PERMISSIONS.PHI_ACCESS,
  PAYMENTS_PERMISSIONS.VIEW,
  REPORTS_PERMISSIONS.VIEW,
  COMPLIANCE_PERMISSIONS.VIEW,
];

/**
 * Financial Counselor - Patient financial assistance
 */
const FINANCIAL_COUNSELOR_PERMISSIONS = [
  PATIENTS_PERMISSIONS.VIEW,
  PATIENTS_PERMISSIONS.CREATE,
  PATIENTS_PERMISSIONS.EDIT,
  PATIENTS_PERMISSIONS.PHI_ACCESS,
  COLLECTIONS_PERMISSIONS.VIEW,
  PAYMENTS_PERMISSIONS.VIEW,
  COMPLIANCE_PERMISSIONS.VIEW,
  REPORTS_PERMISSIONS.VIEW,
];

/**
 * Coder - Medical coding tasks
 */
const CODER_PERMISSIONS = [
  CHARGES_PERMISSIONS.VIEW,
  CHARGES_PERMISSIONS.CREATE,
  CHARGES_PERMISSIONS.EDIT,
  CLAIMS_PERMISSIONS.VIEW,
  CLAIMS_PERMISSIONS.EDIT,
  PATIENTS_PERMISSIONS.VIEW,
  PATIENTS_PERMISSIONS.PHI_ACCESS,
  REPORTS_PERMISSIONS.VIEW,
];

/**
 * Auditor - Review and audit access
 */
const AUDITOR_PERMISSIONS = [
  CHARGES_PERMISSIONS.VIEW,
  CHARGES_PERMISSIONS.AUDIT,
  CLAIMS_PERMISSIONS.VIEW,
  PAYMENTS_PERMISSIONS.VIEW,
  COLLECTIONS_PERMISSIONS.VIEW,
  PATIENTS_PERMISSIONS.VIEW,
  PATIENTS_PERMISSIONS.PHI_ACCESS,
  PAYERS_PERMISSIONS.VIEW,
  REPORTS_PERMISSIONS.VIEW,
  REPORTS_PERMISSIONS.EXPORT,
  REPORTS_PERMISSIONS.ADMIN,
  COMPLIANCE_PERMISSIONS.VIEW,
  COMPLIANCE_PERMISSIONS.MANAGE,
  ADMIN_PERMISSIONS.AUDIT_LOGS,
];

/**
 * Viewer - Read-only access
 */
const VIEWER_PERMISSIONS = [
  CHARGES_PERMISSIONS.VIEW,
  CLAIMS_PERMISSIONS.VIEW,
  PAYMENTS_PERMISSIONS.VIEW,
  COLLECTIONS_PERMISSIONS.VIEW,
  PATIENTS_PERMISSIONS.VIEW,
  PAYERS_PERMISSIONS.VIEW,
  REPORTS_PERMISSIONS.VIEW,
  COMPLIANCE_PERMISSIONS.VIEW,
];

/**
 * Patient - Patient portal access (minimal)
 */
const PATIENT_PERMISSIONS = [
  PATIENTS_PERMISSIONS.VIEW,  // View own info only
  PAYMENTS_PERMISSIONS.VIEW,  // View own payments only
];

// ============================================================================
// BUILT-IN ROLE DEFINITIONS
// ============================================================================

/**
 * Built-in role definitions
 */
export const BUILT_IN_ROLES: Record<BuiltInRoleId, Role> = {
  SUPER_ADMIN: {
    id: 'SUPER_ADMIN',
    name: 'Super Administrator',
    description: 'Full system access with all permissions including system configuration',
    permissions: SUPER_ADMIN_PERMISSIONS,
    inheritsFrom: [],
    departmentRestricted: false,
    isSystem: true,
    hierarchyLevel: 1,
  },
  ADMIN: {
    id: 'ADMIN',
    name: 'Administrator',
    description: 'Full operational access with user management capabilities',
    permissions: ADMIN_PERMISSIONS_SET,
    inheritsFrom: [],
    departmentRestricted: false,
    isSystem: true,
    hierarchyLevel: 2,
  },
  BILLING_MANAGER: {
    id: 'BILLING_MANAGER',
    name: 'Billing Manager',
    description: 'Manages billing operations, staff, and workflows',
    permissions: BILLING_MANAGER_PERMISSIONS,
    inheritsFrom: ['BILLING_SPECIALIST'],
    departmentRestricted: true,
    allowedDepartments: ['BILLING', 'CODING'],
    isSystem: true,
    hierarchyLevel: 3,
  },
  BILLING_SPECIALIST: {
    id: 'BILLING_SPECIALIST',
    name: 'Billing Specialist',
    description: 'Handles charge entry, claim submission, and payment posting',
    permissions: BILLING_SPECIALIST_PERMISSIONS,
    inheritsFrom: ['VIEWER'],
    departmentRestricted: true,
    allowedDepartments: ['BILLING'],
    isSystem: true,
    hierarchyLevel: 4,
  },
  COLLECTOR: {
    id: 'COLLECTOR',
    name: 'Collector',
    description: 'Manages patient collections and payment arrangements',
    permissions: COLLECTOR_PERMISSIONS,
    inheritsFrom: ['VIEWER'],
    departmentRestricted: true,
    allowedDepartments: ['COLLECTIONS'],
    isSystem: true,
    hierarchyLevel: 4,
  },
  FINANCIAL_COUNSELOR: {
    id: 'FINANCIAL_COUNSELOR',
    name: 'Financial Counselor',
    description: 'Assists patients with financial assistance programs',
    permissions: FINANCIAL_COUNSELOR_PERMISSIONS,
    inheritsFrom: ['VIEWER'],
    departmentRestricted: true,
    allowedDepartments: ['FINANCIAL_COUNSELING'],
    isSystem: true,
    hierarchyLevel: 4,
  },
  CODER: {
    id: 'CODER',
    name: 'Medical Coder',
    description: 'Handles medical coding and charge capture',
    permissions: CODER_PERMISSIONS,
    inheritsFrom: ['VIEWER'],
    departmentRestricted: true,
    allowedDepartments: ['CODING'],
    isSystem: true,
    hierarchyLevel: 4,
  },
  AUDITOR: {
    id: 'AUDITOR',
    name: 'Auditor',
    description: 'Reviews operations and ensures compliance',
    permissions: AUDITOR_PERMISSIONS,
    inheritsFrom: ['VIEWER'],
    departmentRestricted: false,
    isSystem: true,
    hierarchyLevel: 3,
  },
  VIEWER: {
    id: 'VIEWER',
    name: 'Viewer',
    description: 'Read-only access to system data',
    permissions: VIEWER_PERMISSIONS,
    inheritsFrom: [],
    departmentRestricted: false,
    isSystem: true,
    hierarchyLevel: 5,
  },
  PATIENT: {
    id: 'PATIENT',
    name: 'Patient',
    description: 'Patient portal access for viewing own information',
    permissions: PATIENT_PERMISSIONS,
    inheritsFrom: [],
    departmentRestricted: false,
    isSystem: true,
    hierarchyLevel: 5,
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get a role definition by ID
 * @param roleId - Role identifier
 * @returns Role definition or undefined
 */
export function getRole(roleId: string): Role | undefined {
  return BUILT_IN_ROLES[roleId as BuiltInRoleId];
}

/**
 * Get all permissions for a role, including inherited permissions
 * @param roleId - Role identifier
 * @param customRoles - Optional map of custom roles to consider
 * @returns Array of all permission keys (direct + inherited)
 */
export function getRolePermissions(
  roleId: string,
  customRoles?: Record<string, Role>
): string[] {
  const allRoles = { ...BUILT_IN_ROLES, ...customRoles };
  const role = allRoles[roleId];

  if (!role) {
    return [];
  }

  // Start with direct permissions
  const permissions = new Set<string>(role.permissions);

  // Add inherited permissions recursively
  const processInheritance = (roleIds: string[], visited: Set<string>) => {
    for (const inheritedRoleId of roleIds) {
      if (visited.has(inheritedRoleId)) continue;
      visited.add(inheritedRoleId);

      const inheritedRole = allRoles[inheritedRoleId];
      if (inheritedRole) {
        for (const perm of inheritedRole.permissions) {
          permissions.add(perm);
        }
        processInheritance(inheritedRole.inheritsFrom, visited);
      }
    }
  };

  processInheritance(role.inheritsFrom, new Set([roleId]));

  return Array.from(permissions);
}

/**
 * Check if a role can access a specific permission
 * @param roleId - Role identifier
 * @param permission - Permission key to check
 * @param customRoles - Optional map of custom roles
 * @returns Whether the role has the permission
 */
export function canRoleAccess(
  roleId: string,
  permission: string,
  customRoles?: Record<string, Role>
): boolean {
  const permissions = getRolePermissions(roleId, customRoles);
  return permissions.includes(permission);
}

/**
 * Get all roles that have a specific permission
 * @param permission - Permission key
 * @param customRoles - Optional map of custom roles
 * @returns Array of role IDs that have the permission
 */
export function getRolesWithPermission(
  permission: string,
  customRoles?: Record<string, Role>
): string[] {
  const allRoles = { ...BUILT_IN_ROLES, ...customRoles };
  const rolesWithPerm: string[] = [];

  for (const [roleId, role] of Object.entries(allRoles)) {
    if (canRoleAccess(roleId, permission, customRoles)) {
      rolesWithPerm.push(roleId);
    }
  }

  return rolesWithPerm;
}

/**
 * Check if one role is higher in the hierarchy than another
 * @param roleId - Role to check
 * @param otherRoleId - Role to compare against
 * @returns Whether roleId has higher authority than otherRoleId
 */
export function isRoleHigherThan(roleId: string, otherRoleId: string): boolean {
  const level = getRoleHierarchyLevel(roleId);
  const otherLevel = getRoleHierarchyLevel(otherRoleId);

  if (level === undefined || otherLevel === undefined) {
    return false;
  }

  return level < otherLevel;
}

/**
 * Check if a role can manage another role (assign/revoke)
 * @param managerRoleId - Role attempting to manage
 * @param targetRoleId - Role being managed
 * @returns Whether the manager role can manage the target role
 */
export function canManageRole(managerRoleId: string, targetRoleId: string): boolean {
  // A role can only manage roles at a lower hierarchy level
  return isRoleHigherThan(managerRoleId, targetRoleId);
}

/**
 * Get all roles at or below a specific hierarchy level
 * @param maxLevel - Maximum hierarchy level (inclusive)
 * @returns Array of role IDs
 */
export function getRolesAtOrBelowLevel(maxLevel: RoleHierarchyLevel): string[] {
  const roles: string[] = [];

  for (const [level, roleIds] of Object.entries(ROLE_HIERARCHY)) {
    if (parseInt(level, 10) >= maxLevel) {
      roles.push(...roleIds);
    }
  }

  return roles;
}

/**
 * Validate a custom role definition
 * @param role - Role to validate
 * @returns Validation result
 */
export function validateRole(role: Partial<Role>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!role.id) {
    errors.push('Role ID is required');
  } else if (BUILT_IN_ROLES[role.id as BuiltInRoleId]) {
    errors.push('Cannot use built-in role ID');
  }

  if (!role.name) {
    errors.push('Role name is required');
  }

  if (!role.permissions || role.permissions.length === 0) {
    errors.push('At least one permission is required');
  }

  if (role.inheritsFrom) {
    for (const inheritedId of role.inheritsFrom) {
      if (inheritedId === role.id) {
        errors.push('Role cannot inherit from itself');
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get the effective permissions for a user based on their roles
 * @param roleIds - Array of role IDs assigned to the user
 * @param customRoles - Optional map of custom roles
 * @returns Array of unique permission keys
 */
export function getEffectivePermissionsForRoles(
  roleIds: string[],
  customRoles?: Record<string, Role>
): string[] {
  const permissions = new Set<string>();

  for (const roleId of roleIds) {
    const rolePerms = getRolePermissions(roleId, customRoles);
    for (const perm of rolePerms) {
      permissions.add(perm);
    }
  }

  return Array.from(permissions);
}

/**
 * Get all built-in roles as an array
 */
export function getAllBuiltInRoles(): Role[] {
  return Object.values(BUILT_IN_ROLES);
}

/**
 * Check if a role ID is a built-in role
 */
export function isBuiltInRole(roleId: string): boolean {
  return roleId in BUILT_IN_ROLES;
}
