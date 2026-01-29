/**
 * Permission Definitions
 *
 * Defines all permissions by module for the Halcyon RCM application.
 * Permissions follow the pattern: MODULE_ACTION (e.g., CHARGES_VIEW, CLAIMS_SUBMIT)
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Permission module categories
 */
export type PermissionModule =
  | 'CHARGES'
  | 'CLAIMS'
  | 'PAYMENTS'
  | 'COLLECTIONS'
  | 'PATIENTS'
  | 'PAYERS'
  | 'REPORTS'
  | 'COMPLIANCE'
  | 'ADMIN';

/**
 * Permission interface describing a single permission
 */
export interface Permission {
  /** Unique permission key (e.g., 'CHARGES_VIEW') */
  key: string;
  /** Module this permission belongs to */
  module: PermissionModule;
  /** Action being permitted */
  action: string;
  /** Human-readable description */
  description: string;
  /** Whether this permission requires PHI access */
  requiresPHIAccess?: boolean;
  /** Whether this is a sensitive/admin level permission */
  isSensitive?: boolean;
}

/**
 * User context for permission checking
 */
export interface UserPermissionContext {
  id: string;
  permissions: string[];
  roles?: string[];
  departmentIds?: string[];
  organizationId?: string;
}

// ============================================================================
// PERMISSION DEFINITIONS BY MODULE
// ============================================================================

/**
 * Charges module permissions
 */
export const CHARGES_PERMISSIONS = {
  VIEW: 'CHARGES_VIEW',
  CREATE: 'CHARGES_CREATE',
  EDIT: 'CHARGES_EDIT',
  DELETE: 'CHARGES_DELETE',
  AUDIT: 'CHARGES_AUDIT',
} as const;

/**
 * Claims module permissions
 */
export const CLAIMS_PERMISSIONS = {
  VIEW: 'CLAIMS_VIEW',
  CREATE: 'CLAIMS_CREATE',
  SUBMIT: 'CLAIMS_SUBMIT',
  EDIT: 'CLAIMS_EDIT',
  VOID: 'CLAIMS_VOID',
} as const;

/**
 * Payments module permissions
 */
export const PAYMENTS_PERMISSIONS = {
  VIEW: 'PAYMENTS_VIEW',
  POST: 'PAYMENTS_POST',
  ADJUST: 'PAYMENTS_ADJUST',
  WRITE_OFF: 'PAYMENTS_WRITE_OFF',
  RECONCILE: 'PAYMENTS_RECONCILE',
} as const;

/**
 * Collections module permissions
 */
export const COLLECTIONS_PERMISSIONS = {
  VIEW: 'COLLECTIONS_VIEW',
  MANAGE: 'COLLECTIONS_MANAGE',
  AGENCY_ASSIGN: 'COLLECTIONS_AGENCY_ASSIGN',
} as const;

/**
 * Patients module permissions
 */
export const PATIENTS_PERMISSIONS = {
  VIEW: 'PATIENTS_VIEW',
  CREATE: 'PATIENTS_CREATE',
  EDIT: 'PATIENTS_EDIT',
  PHI_ACCESS: 'PATIENTS_PHI_ACCESS',
} as const;

/**
 * Payers module permissions
 */
export const PAYERS_PERMISSIONS = {
  VIEW: 'PAYERS_VIEW',
  MANAGE: 'PAYERS_MANAGE',
  CONTRACTS: 'PAYERS_CONTRACTS',
} as const;

/**
 * Reports module permissions
 */
export const REPORTS_PERMISSIONS = {
  VIEW: 'REPORTS_VIEW',
  EXPORT: 'REPORTS_EXPORT',
  ADMIN: 'REPORTS_ADMIN',
} as const;

/**
 * Compliance module permissions
 */
export const COMPLIANCE_PERMISSIONS = {
  VIEW: 'COMPLIANCE_VIEW',
  MANAGE: 'COMPLIANCE_MANAGE',
} as const;

/**
 * Admin module permissions
 */
export const ADMIN_PERMISSIONS = {
  USERS: 'ADMIN_USERS',
  ROLES: 'ADMIN_ROLES',
  SETTINGS: 'ADMIN_SETTINGS',
  AUDIT_LOGS: 'ADMIN_AUDIT_LOGS',
} as const;

/**
 * All permissions organized by module
 */
export const PERMISSIONS_BY_MODULE = {
  CHARGES: CHARGES_PERMISSIONS,
  CLAIMS: CLAIMS_PERMISSIONS,
  PAYMENTS: PAYMENTS_PERMISSIONS,
  COLLECTIONS: COLLECTIONS_PERMISSIONS,
  PATIENTS: PATIENTS_PERMISSIONS,
  PAYERS: PAYERS_PERMISSIONS,
  REPORTS: REPORTS_PERMISSIONS,
  COMPLIANCE: COMPLIANCE_PERMISSIONS,
  ADMIN: ADMIN_PERMISSIONS,
} as const;

// ============================================================================
// PERMISSION METADATA
// ============================================================================

/**
 * Complete permission definitions with metadata
 */
export const PERMISSION_DEFINITIONS: Record<string, Permission> = {
  // Charges
  [CHARGES_PERMISSIONS.VIEW]: {
    key: CHARGES_PERMISSIONS.VIEW,
    module: 'CHARGES',
    action: 'view',
    description: 'View charge entries and charge master',
  },
  [CHARGES_PERMISSIONS.CREATE]: {
    key: CHARGES_PERMISSIONS.CREATE,
    module: 'CHARGES',
    action: 'create',
    description: 'Create new charge entries',
  },
  [CHARGES_PERMISSIONS.EDIT]: {
    key: CHARGES_PERMISSIONS.EDIT,
    module: 'CHARGES',
    action: 'edit',
    description: 'Edit existing charge entries',
  },
  [CHARGES_PERMISSIONS.DELETE]: {
    key: CHARGES_PERMISSIONS.DELETE,
    module: 'CHARGES',
    action: 'delete',
    description: 'Delete charge entries',
    isSensitive: true,
  },
  [CHARGES_PERMISSIONS.AUDIT]: {
    key: CHARGES_PERMISSIONS.AUDIT,
    module: 'CHARGES',
    action: 'audit',
    description: 'View charge audit history',
  },

  // Claims
  [CLAIMS_PERMISSIONS.VIEW]: {
    key: CLAIMS_PERMISSIONS.VIEW,
    module: 'CLAIMS',
    action: 'view',
    description: 'View claim submissions and status',
  },
  [CLAIMS_PERMISSIONS.CREATE]: {
    key: CLAIMS_PERMISSIONS.CREATE,
    module: 'CLAIMS',
    action: 'create',
    description: 'Create new claims',
  },
  [CLAIMS_PERMISSIONS.SUBMIT]: {
    key: CLAIMS_PERMISSIONS.SUBMIT,
    module: 'CLAIMS',
    action: 'submit',
    description: 'Submit claims to clearinghouse/payers',
  },
  [CLAIMS_PERMISSIONS.EDIT]: {
    key: CLAIMS_PERMISSIONS.EDIT,
    module: 'CLAIMS',
    action: 'edit',
    description: 'Edit claim details before submission',
  },
  [CLAIMS_PERMISSIONS.VOID]: {
    key: CLAIMS_PERMISSIONS.VOID,
    module: 'CLAIMS',
    action: 'void',
    description: 'Void submitted claims',
    isSensitive: true,
  },

  // Payments
  [PAYMENTS_PERMISSIONS.VIEW]: {
    key: PAYMENTS_PERMISSIONS.VIEW,
    module: 'PAYMENTS',
    action: 'view',
    description: 'View payment remittances and postings',
  },
  [PAYMENTS_PERMISSIONS.POST]: {
    key: PAYMENTS_PERMISSIONS.POST,
    module: 'PAYMENTS',
    action: 'post',
    description: 'Post payments to accounts',
  },
  [PAYMENTS_PERMISSIONS.ADJUST]: {
    key: PAYMENTS_PERMISSIONS.ADJUST,
    module: 'PAYMENTS',
    action: 'adjust',
    description: 'Make payment adjustments',
  },
  [PAYMENTS_PERMISSIONS.WRITE_OFF]: {
    key: PAYMENTS_PERMISSIONS.WRITE_OFF,
    module: 'PAYMENTS',
    action: 'write_off',
    description: 'Write off balances',
    isSensitive: true,
  },
  [PAYMENTS_PERMISSIONS.RECONCILE]: {
    key: PAYMENTS_PERMISSIONS.RECONCILE,
    module: 'PAYMENTS',
    action: 'reconcile',
    description: 'Reconcile deposits and payments',
  },

  // Collections
  [COLLECTIONS_PERMISSIONS.VIEW]: {
    key: COLLECTIONS_PERMISSIONS.VIEW,
    module: 'COLLECTIONS',
    action: 'view',
    description: 'View collection accounts and status',
  },
  [COLLECTIONS_PERMISSIONS.MANAGE]: {
    key: COLLECTIONS_PERMISSIONS.MANAGE,
    module: 'COLLECTIONS',
    action: 'manage',
    description: 'Manage collection workflow and actions',
  },
  [COLLECTIONS_PERMISSIONS.AGENCY_ASSIGN]: {
    key: COLLECTIONS_PERMISSIONS.AGENCY_ASSIGN,
    module: 'COLLECTIONS',
    action: 'agency_assign',
    description: 'Assign accounts to collection agencies',
    isSensitive: true,
  },

  // Patients
  [PATIENTS_PERMISSIONS.VIEW]: {
    key: PATIENTS_PERMISSIONS.VIEW,
    module: 'PATIENTS',
    action: 'view',
    description: 'View basic patient information',
  },
  [PATIENTS_PERMISSIONS.CREATE]: {
    key: PATIENTS_PERMISSIONS.CREATE,
    module: 'PATIENTS',
    action: 'create',
    description: 'Create new patient records',
  },
  [PATIENTS_PERMISSIONS.EDIT]: {
    key: PATIENTS_PERMISSIONS.EDIT,
    module: 'PATIENTS',
    action: 'edit',
    description: 'Edit patient information',
  },
  [PATIENTS_PERMISSIONS.PHI_ACCESS]: {
    key: PATIENTS_PERMISSIONS.PHI_ACCESS,
    module: 'PATIENTS',
    action: 'phi_access',
    description: 'Access protected health information (PHI)',
    requiresPHIAccess: true,
    isSensitive: true,
  },

  // Payers
  [PAYERS_PERMISSIONS.VIEW]: {
    key: PAYERS_PERMISSIONS.VIEW,
    module: 'PAYERS',
    action: 'view',
    description: 'View payer information and contracts',
  },
  [PAYERS_PERMISSIONS.MANAGE]: {
    key: PAYERS_PERMISSIONS.MANAGE,
    module: 'PAYERS',
    action: 'manage',
    description: 'Manage payer configurations',
  },
  [PAYERS_PERMISSIONS.CONTRACTS]: {
    key: PAYERS_PERMISSIONS.CONTRACTS,
    module: 'PAYERS',
    action: 'contracts',
    description: 'Manage payer contracts and fee schedules',
    isSensitive: true,
  },

  // Reports
  [REPORTS_PERMISSIONS.VIEW]: {
    key: REPORTS_PERMISSIONS.VIEW,
    module: 'REPORTS',
    action: 'view',
    description: 'View standard reports',
  },
  [REPORTS_PERMISSIONS.EXPORT]: {
    key: REPORTS_PERMISSIONS.EXPORT,
    module: 'REPORTS',
    action: 'export',
    description: 'Export report data',
  },
  [REPORTS_PERMISSIONS.ADMIN]: {
    key: REPORTS_PERMISSIONS.ADMIN,
    module: 'REPORTS',
    action: 'admin',
    description: 'Access administrative reports',
    isSensitive: true,
  },

  // Compliance
  [COMPLIANCE_PERMISSIONS.VIEW]: {
    key: COMPLIANCE_PERMISSIONS.VIEW,
    module: 'COMPLIANCE',
    action: 'view',
    description: 'View compliance status and notices',
  },
  [COMPLIANCE_PERMISSIONS.MANAGE]: {
    key: COMPLIANCE_PERMISSIONS.MANAGE,
    module: 'COMPLIANCE',
    action: 'manage',
    description: 'Manage compliance workflows and 501(r)',
  },

  // Admin
  [ADMIN_PERMISSIONS.USERS]: {
    key: ADMIN_PERMISSIONS.USERS,
    module: 'ADMIN',
    action: 'users',
    description: 'Manage user accounts',
    isSensitive: true,
  },
  [ADMIN_PERMISSIONS.ROLES]: {
    key: ADMIN_PERMISSIONS.ROLES,
    module: 'ADMIN',
    action: 'roles',
    description: 'Manage roles and permissions',
    isSensitive: true,
  },
  [ADMIN_PERMISSIONS.SETTINGS]: {
    key: ADMIN_PERMISSIONS.SETTINGS,
    module: 'ADMIN',
    action: 'settings',
    description: 'Manage system settings',
    isSensitive: true,
  },
  [ADMIN_PERMISSIONS.AUDIT_LOGS]: {
    key: ADMIN_PERMISSIONS.AUDIT_LOGS,
    module: 'ADMIN',
    action: 'audit_logs',
    description: 'View system audit logs',
    isSensitive: true,
  },
};

/**
 * Get all permission keys as an array
 */
export const ALL_PERMISSIONS = Object.keys(PERMISSION_DEFINITIONS);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a user has a specific permission
 * @param user - User context with permissions array
 * @param permission - Permission key to check
 * @returns Whether the user has the permission
 */
export function hasPermission(user: UserPermissionContext, permission: string): boolean {
  if (!user || !user.permissions) {
    return false;
  }
  return user.permissions.includes(permission);
}

/**
 * Check if a user has any of the specified permissions
 * @param user - User context with permissions array
 * @param permissions - Array of permission keys to check
 * @returns Whether the user has any of the permissions
 */
export function hasAnyPermission(user: UserPermissionContext, permissions: string[]): boolean {
  if (!user || !user.permissions) {
    return false;
  }
  return permissions.some(p => user.permissions.includes(p));
}

/**
 * Check if a user has all of the specified permissions
 * @param user - User context with permissions array
 * @param permissions - Array of permission keys to check
 * @returns Whether the user has all of the permissions
 */
export function hasAllPermissions(user: UserPermissionContext, permissions: string[]): boolean {
  if (!user || !user.permissions) {
    return false;
  }
  return permissions.every(p => user.permissions.includes(p));
}

/**
 * Get all permissions for a specific module
 * @param module - Module name
 * @returns Array of permission keys for the module
 */
export function getModulePermissions(module: PermissionModule): string[] {
  const modulePermissions = PERMISSIONS_BY_MODULE[module];
  if (!modulePermissions) {
    return [];
  }
  return Object.values(modulePermissions);
}

/**
 * Get permission definition by key
 * @param key - Permission key
 * @returns Permission definition or undefined
 */
export function getPermissionDefinition(key: string): Permission | undefined {
  return PERMISSION_DEFINITIONS[key];
}

/**
 * Get all permissions that require PHI access
 * @returns Array of permission keys requiring PHI access
 */
export function getPHIPermissions(): string[] {
  return Object.values(PERMISSION_DEFINITIONS)
    .filter(p => p.requiresPHIAccess)
    .map(p => p.key);
}

/**
 * Get all sensitive permissions
 * @returns Array of sensitive permission keys
 */
export function getSensitivePermissions(): string[] {
  return Object.values(PERMISSION_DEFINITIONS)
    .filter(p => p.isSensitive)
    .map(p => p.key);
}

/**
 * Filter permissions by module
 * @param permissions - Array of permission keys
 * @param module - Module to filter by
 * @returns Filtered array of permissions
 */
export function filterPermissionsByModule(permissions: string[], module: PermissionModule): string[] {
  const modulePerms = getModulePermissions(module);
  return permissions.filter(p => modulePerms.includes(p));
}

/**
 * Validate permission keys
 * @param permissions - Array of permission keys to validate
 * @returns Object with valid and invalid permissions
 */
export function validatePermissions(permissions: string[]): {
  valid: string[];
  invalid: string[];
} {
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const perm of permissions) {
    if (PERMISSION_DEFINITIONS[perm]) {
      valid.push(perm);
    } else {
      invalid.push(perm);
    }
  }

  return { valid, invalid };
}
