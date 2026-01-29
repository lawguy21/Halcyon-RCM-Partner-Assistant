/**
 * Tenant Isolation Utilities
 *
 * Helper functions to ensure all database queries are properly filtered by organizationId
 * to prevent data leaks between tenants.
 *
 * IMPORTANT: Every Prisma query that accesses tenant-specific data MUST include
 * an organizationId filter. Use these utilities to ensure consistent filtering.
 */

/**
 * Add organizationId to a where clause
 *
 * @example
 * const assessments = await prisma.assessment.findMany({
 *   where: withTenantFilter({ status: 'pending' }, req.user.organizationId)
 * });
 */
export function withTenantFilter<T extends object>(
  where: T,
  organizationId: string
): T & { organizationId: string } {
  if (!organizationId) {
    throw new Error('organizationId is required for tenant-filtered queries');
  }
  return { ...where, organizationId };
}

/**
 * Add organizationId filter for related entities via nested where clause
 * Useful when the organizationId is on a related model (e.g., assessment.organizationId)
 *
 * @example
 * const accounts = await prisma.recoveryAccount.findMany({
 *   where: withNestedTenantFilter(
 *     { status: 'ACTIVE' },
 *     'assessment',
 *     req.user.organizationId
 *   )
 * });
 */
export function withNestedTenantFilter<T extends object>(
  where: T,
  relationPath: string,
  organizationId: string
): T & Record<string, { organizationId: string }> {
  if (!organizationId) {
    throw new Error('organizationId is required for tenant-filtered queries');
  }

  const parts = relationPath.split('.');
  let nested: any = { organizationId };

  // Build nested structure from innermost to outermost
  for (let i = parts.length - 1; i >= 0; i--) {
    nested = { [parts[i]]: nested };
  }

  return { ...where, ...nested };
}

/**
 * Verify that a record belongs to the specified organization
 * Returns true if the record belongs to the org, false otherwise
 *
 * @example
 * const assessment = await prisma.assessment.findUnique({ where: { id } });
 * if (!verifyTenantOwnership(assessment, req.user.organizationId)) {
 *   return res.status(404).json({ error: 'Not found' });
 * }
 */
export function verifyTenantOwnership(
  record: { organizationId?: string | null } | null,
  organizationId: string
): boolean {
  if (!record) return false;
  if (!organizationId) return false;
  return record.organizationId === organizationId;
}

/**
 * Verify that a record belongs to the specified organization via a nested relation
 *
 * @example
 * const account = await prisma.recoveryAccount.findUnique({
 *   where: { id },
 *   include: { assessment: true }
 * });
 * if (!verifyNestedTenantOwnership(account, 'assessment.organizationId', req.user.organizationId)) {
 *   return res.status(404).json({ error: 'Not found' });
 * }
 */
export function verifyNestedTenantOwnership(
  record: any,
  path: string,
  organizationId: string
): boolean {
  if (!record) return false;
  if (!organizationId) return false;

  const parts = path.split('.');
  let value = record;

  for (const part of parts) {
    if (value === null || value === undefined) return false;
    value = value[part];
  }

  return value === organizationId;
}

/**
 * Create data object with organizationId included
 * Use this for create operations to ensure the org is always set
 *
 * @example
 * const assessment = await prisma.assessment.create({
 *   data: withTenantCreate(assessmentData, req.user.organizationId)
 * });
 */
export function withTenantCreate<T extends object>(
  data: T,
  organizationId: string
): T & { organizationId: string } {
  if (!organizationId) {
    throw new Error('organizationId is required when creating tenant-specific records');
  }
  return { ...data, organizationId };
}

/**
 * Require organizationId from request context or throw error
 * Use this to ensure the organizationId is available before proceeding
 *
 * @example
 * const organizationId = requireOrganizationId(req);
 */
export function requireOrganizationId(req: { user?: { organizationId?: string } }): string {
  const organizationId = req.user?.organizationId;
  if (!organizationId) {
    throw new Error('Organization context required. User must be associated with an organization.');
  }
  return organizationId;
}

/**
 * Get organizationId from request context, returning undefined if not available
 * Use this for optional tenant filtering (e.g., super admin routes)
 */
export function getOrganizationId(req: { user?: { organizationId?: string } }): string | undefined {
  return req.user?.organizationId;
}

/**
 * Type guard to check if user has organization context
 */
export function hasOrganizationContext(req: { user?: { organizationId?: string } }): boolean {
  return !!req.user?.organizationId;
}
