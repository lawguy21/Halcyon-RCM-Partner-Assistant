/**
 * Department-Level Access Control
 *
 * Manages department assignments and access restrictions for the Halcyon RCM application.
 * Supports multi-department assignments with primary department designation.
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Department identifiers
 */
export enum Department {
  BILLING = 'BILLING',
  COLLECTIONS = 'COLLECTIONS',
  CODING = 'CODING',
  COMPLIANCE = 'COMPLIANCE',
  FINANCIAL_COUNSELING = 'FINANCIAL_COUNSELING',
  IT = 'IT',
  ADMINISTRATION = 'ADMINISTRATION',
}

/**
 * Department metadata
 */
export interface DepartmentInfo {
  /** Department code */
  id: Department;
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** Parent department (if any) */
  parentDepartment?: Department;
  /** Whether this department handles PHI */
  handlesPHI: boolean;
  /** Associated modules */
  relatedModules: string[];
}

/**
 * User department access record
 */
export interface DepartmentAccess {
  /** User ID */
  userId: string;
  /** All departments the user belongs to */
  departments: Department[];
  /** Primary department for the user */
  primaryDepartment: Department;
  /** Organization ID (optional for multi-org) */
  organizationId?: string;
}

/**
 * User context for department checking
 */
export interface UserDepartmentContext {
  id: string;
  departments: Department[];
  primaryDepartment?: Department;
  organizationId?: string;
}

// ============================================================================
// DEPARTMENT DEFINITIONS
// ============================================================================

/**
 * Department metadata definitions
 */
export const DEPARTMENTS: Record<Department, DepartmentInfo> = {
  [Department.BILLING]: {
    id: Department.BILLING,
    name: 'Billing',
    description: 'Claims processing, payment posting, and accounts receivable',
    handlesPHI: true,
    relatedModules: ['CHARGES', 'CLAIMS', 'PAYMENTS', 'PATIENTS'],
  },
  [Department.COLLECTIONS]: {
    id: Department.COLLECTIONS,
    name: 'Collections',
    description: 'Patient collections, payment plans, and agency management',
    handlesPHI: true,
    relatedModules: ['COLLECTIONS', 'PATIENTS', 'PAYMENTS'],
  },
  [Department.CODING]: {
    id: Department.CODING,
    name: 'Coding',
    description: 'Medical coding, charge capture, and coding compliance',
    handlesPHI: true,
    relatedModules: ['CHARGES', 'PATIENTS'],
  },
  [Department.COMPLIANCE]: {
    id: Department.COMPLIANCE,
    name: 'Compliance',
    description: 'Regulatory compliance, auditing, and 501(r) management',
    handlesPHI: true,
    relatedModules: ['COMPLIANCE', 'REPORTS', 'PATIENTS'],
  },
  [Department.FINANCIAL_COUNSELING]: {
    id: Department.FINANCIAL_COUNSELING,
    name: 'Financial Counseling',
    description: 'Patient financial assistance and eligibility screening',
    handlesPHI: true,
    relatedModules: ['PATIENTS', 'COLLECTIONS', 'COMPLIANCE'],
  },
  [Department.IT]: {
    id: Department.IT,
    name: 'Information Technology',
    description: 'System administration and technical support',
    handlesPHI: false,
    relatedModules: ['ADMIN'],
  },
  [Department.ADMINISTRATION]: {
    id: Department.ADMINISTRATION,
    name: 'Administration',
    description: 'Executive and administrative leadership',
    handlesPHI: true,
    relatedModules: ['REPORTS', 'ADMIN', 'COMPLIANCE'],
  },
};

/**
 * Department hierarchy - departments that include access to other departments
 */
export const DEPARTMENT_HIERARCHY: Partial<Record<Department, Department[]>> = {
  [Department.ADMINISTRATION]: [
    Department.BILLING,
    Department.COLLECTIONS,
    Department.CODING,
    Department.COMPLIANCE,
    Department.FINANCIAL_COUNSELING,
  ],
  [Department.BILLING]: [Department.CODING],
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get department info by ID
 * @param departmentId - Department identifier
 * @returns Department info or undefined
 */
export function getDepartmentInfo(departmentId: Department): DepartmentInfo | undefined {
  return DEPARTMENTS[departmentId];
}

/**
 * Get all departments as an array
 * @returns Array of department info objects
 */
export function getAllDepartments(): DepartmentInfo[] {
  return Object.values(DEPARTMENTS);
}

/**
 * Check if a user can access a specific department
 * @param user - User context with department assignments
 * @param department - Department to check access for
 * @returns Whether the user can access the department
 */
export function canAccessDepartment(
  user: UserDepartmentContext,
  department: Department
): boolean {
  if (!user || !user.departments) {
    return false;
  }

  // Direct department membership
  if (user.departments.includes(department)) {
    return true;
  }

  // Check hierarchy - if user is in a parent department
  for (const userDept of user.departments) {
    const childDepts = DEPARTMENT_HIERARCHY[userDept];
    if (childDepts && childDepts.includes(department)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a user can access any of the specified departments
 * @param user - User context with department assignments
 * @param departments - Departments to check
 * @returns Whether the user can access any of the departments
 */
export function canAccessAnyDepartment(
  user: UserDepartmentContext,
  departments: Department[]
): boolean {
  return departments.some(dept => canAccessDepartment(user, dept));
}

/**
 * Check if a user can access all of the specified departments
 * @param user - User context with department assignments
 * @param departments - Departments to check
 * @returns Whether the user can access all of the departments
 */
export function canAccessAllDepartments(
  user: UserDepartmentContext,
  departments: Department[]
): boolean {
  return departments.every(dept => canAccessDepartment(user, dept));
}

/**
 * Get all departments a user has access to (including through hierarchy)
 * @param userDepartments - User's directly assigned departments
 * @returns Array of all accessible departments
 */
export function getUserAccessibleDepartments(userDepartments: Department[]): Department[] {
  const accessible = new Set<Department>(userDepartments);

  // Add departments accessible through hierarchy
  for (const dept of userDepartments) {
    const childDepts = DEPARTMENT_HIERARCHY[dept];
    if (childDepts) {
      for (const childDept of childDepts) {
        accessible.add(childDept);
      }
    }
  }

  return Array.from(accessible);
}

/**
 * Get user's departments
 * @param departmentAccess - User's department access record
 * @returns Array of department IDs
 */
export function getUserDepartments(departmentAccess: DepartmentAccess): Department[] {
  return departmentAccess.departments;
}

/**
 * Check if a department handles PHI
 * @param department - Department to check
 * @returns Whether the department handles PHI
 */
export function departmentHandlesPHI(department: Department): boolean {
  const info = DEPARTMENTS[department];
  return info?.handlesPHI ?? false;
}

/**
 * Get departments that handle PHI
 * @returns Array of department IDs that handle PHI
 */
export function getPHIDepartments(): Department[] {
  return Object.values(DEPARTMENTS)
    .filter(d => d.handlesPHI)
    .map(d => d.id);
}

/**
 * Get modules related to a department
 * @param department - Department to get modules for
 * @returns Array of module names
 */
export function getDepartmentModules(department: Department): string[] {
  const info = DEPARTMENTS[department];
  return info?.relatedModules ?? [];
}

/**
 * Validate department access configuration
 * @param access - Department access to validate
 * @returns Validation result
 */
export function validateDepartmentAccess(access: Partial<DepartmentAccess>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!access.userId) {
    errors.push('User ID is required');
  }

  if (!access.departments || access.departments.length === 0) {
    errors.push('At least one department is required');
  }

  if (!access.primaryDepartment) {
    errors.push('Primary department is required');
  } else if (access.departments && !access.departments.includes(access.primaryDepartment)) {
    errors.push('Primary department must be in the departments list');
  }

  // Validate department IDs
  if (access.departments) {
    for (const dept of access.departments) {
      if (!DEPARTMENTS[dept]) {
        errors.push(`Invalid department: ${dept}`);
      }
    }
  }

  if (access.primaryDepartment && !DEPARTMENTS[access.primaryDepartment]) {
    errors.push(`Invalid primary department: ${access.primaryDepartment}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create a department access record
 * @param userId - User ID
 * @param departments - Department assignments
 * @param primaryDepartment - Primary department
 * @param organizationId - Optional organization ID
 * @returns Department access record
 */
export function createDepartmentAccess(
  userId: string,
  departments: Department[],
  primaryDepartment: Department,
  organizationId?: string
): DepartmentAccess {
  // Validate that primary is in departments
  if (!departments.includes(primaryDepartment)) {
    departments = [primaryDepartment, ...departments];
  }

  return {
    userId,
    departments: [...new Set(departments)], // Remove duplicates
    primaryDepartment,
    organizationId,
  };
}

/**
 * Add a department to a user's access
 * @param access - Current department access
 * @param department - Department to add
 * @returns Updated department access
 */
export function addDepartment(
  access: DepartmentAccess,
  department: Department
): DepartmentAccess {
  if (access.departments.includes(department)) {
    return access;
  }

  return {
    ...access,
    departments: [...access.departments, department],
  };
}

/**
 * Remove a department from a user's access
 * @param access - Current department access
 * @param department - Department to remove
 * @returns Updated department access or null if removal would leave no departments
 */
export function removeDepartment(
  access: DepartmentAccess,
  department: Department
): DepartmentAccess | null {
  const newDepartments = access.departments.filter(d => d !== department);

  if (newDepartments.length === 0) {
    return null;
  }

  // If removing primary, assign new primary
  let newPrimary = access.primaryDepartment;
  if (access.primaryDepartment === department) {
    newPrimary = newDepartments[0];
  }

  return {
    ...access,
    departments: newDepartments,
    primaryDepartment: newPrimary,
  };
}

/**
 * Set a user's primary department
 * @param access - Current department access
 * @param department - New primary department
 * @returns Updated department access
 */
export function setPrimaryDepartment(
  access: DepartmentAccess,
  department: Department
): DepartmentAccess {
  // Add department if not already assigned
  const departments = access.departments.includes(department)
    ? access.departments
    : [...access.departments, department];

  return {
    ...access,
    departments,
    primaryDepartment: department,
  };
}

/**
 * Check if a module is accessible to a department
 * @param department - Department to check
 * @param module - Module name
 * @returns Whether the department can access the module
 */
export function canDepartmentAccessModule(
  department: Department,
  module: string
): boolean {
  const info = DEPARTMENTS[department];
  if (!info) return false;
  return info.relatedModules.includes(module);
}

/**
 * Get departments that have access to a specific module
 * @param module - Module name
 * @returns Array of departments with access to the module
 */
export function getDepartmentsForModule(module: string): Department[] {
  return Object.values(DEPARTMENTS)
    .filter(d => d.relatedModules.includes(module))
    .map(d => d.id);
}
