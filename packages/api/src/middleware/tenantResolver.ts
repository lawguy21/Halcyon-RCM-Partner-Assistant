// @ts-nocheck
/**
 * Tenant Resolver Middleware
 *
 * Extracts hostname from request and resolves the organization context
 * for multi-tenant custom domain routing.
 */

import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';

// ============================================================================
// Types
// ============================================================================

export interface TenantInfo {
  organizationId: string;
  organizationName: string;
  domain: string;
  isPrimary: boolean;
  isVerified: boolean;
  settings?: Record<string, unknown>;
  whiteLabelConfig?: {
    brandName: string;
    logoUrl?: string;
    faviconUrl?: string;
    primaryColor: string;
    secondaryColor: string;
    supportEmail?: string;
    supportPhone?: string;
    features?: Record<string, boolean>;
    customCss?: string;
  };
}

export interface TenantRequest extends Request {
  tenant?: TenantInfo;
  organizationId?: string;
  organization?: {
    id: string;
    name: string;
    type?: string;
    settings?: Record<string, unknown>;
  };
}

// ============================================================================
// Cache Implementation
// ============================================================================

interface CacheEntry {
  data: TenantInfo | null;
  timestamp: number;
}

// In-memory cache for domain lookups
const domainCache = new Map<string, CacheEntry>();

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

// Default/fallback domain configuration
const DEFAULT_DOMAINS = (process.env.DEFAULT_DOMAINS || 'localhost,127.0.0.1').split(',').map(d => d.trim().toLowerCase());

/**
 * Clear expired cache entries
 */
function cleanupCache(): void {
  const now = Date.now();
  for (const [key, entry] of domainCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      domainCache.delete(key);
    }
  }
}

/**
 * Get tenant info from cache
 */
function getCachedTenant(domain: string): TenantInfo | null | undefined {
  const entry = domainCache.get(domain);
  if (!entry) return undefined;

  if (Date.now() - entry.timestamp > CACHE_TTL) {
    domainCache.delete(domain);
    return undefined;
  }

  return entry.data;
}

/**
 * Set tenant info in cache
 */
function setCachedTenant(domain: string, tenant: TenantInfo | null): void {
  domainCache.set(domain, {
    data: tenant,
    timestamp: Date.now(),
  });
}

/**
 * Clear cache for a specific domain
 */
export function clearDomainCache(domain: string): void {
  domainCache.delete(domain.toLowerCase());
}

/**
 * Clear cache for all domains of an organization
 */
export function clearOrganizationCache(organizationId: string): void {
  for (const [key, entry] of domainCache.entries()) {
    if (entry.data?.organizationId === organizationId) {
      domainCache.delete(key);
    }
  }
}

/**
 * Clear entire cache
 */
export function clearAllCache(): void {
  domainCache.clear();
}

// Run cache cleanup every 5 minutes
setInterval(cleanupCache, CACHE_TTL);

// ============================================================================
// Domain Resolution
// ============================================================================

/**
 * Extract hostname from request
 */
function extractHostname(req: Request): string {
  // Check X-Forwarded-Host header (for reverse proxy setups)
  const forwardedHost = req.headers['x-forwarded-host'];
  if (forwardedHost) {
    const host = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost;
    return host.split(':')[0].toLowerCase();
  }

  // Check Host header
  const host = req.headers.host;
  if (host) {
    return host.split(':')[0].toLowerCase();
  }

  // Fallback to localhost
  return 'localhost';
}

/**
 * Check if domain is a default/system domain
 */
function isDefaultDomain(domain: string): boolean {
  return DEFAULT_DOMAINS.includes(domain);
}

/**
 * Resolve organization from domain
 */
async function resolveTenantFromDomain(domain: string): Promise<TenantInfo | null> {
  try {
    const organizationDomain = await prisma.organizationDomain.findUnique({
      where: { domain },
      include: {
        organization: {
          include: {
            whiteLabelConfig: true,
          },
        },
      },
    });

    if (!organizationDomain) {
      return null;
    }

    const { organization } = organizationDomain;

    return {
      organizationId: organization.id,
      organizationName: organization.name,
      domain: organizationDomain.domain,
      isPrimary: organizationDomain.isPrimary,
      isVerified: organizationDomain.isVerified,
      settings: organization.settings as Record<string, unknown> | undefined,
      whiteLabelConfig: organization.whiteLabelConfig ? {
        brandName: organization.whiteLabelConfig.brandName,
        logoUrl: organization.whiteLabelConfig.logoUrl || undefined,
        faviconUrl: organization.whiteLabelConfig.faviconUrl || undefined,
        primaryColor: organization.whiteLabelConfig.primaryColor,
        secondaryColor: organization.whiteLabelConfig.secondaryColor,
        supportEmail: organization.whiteLabelConfig.supportEmail || undefined,
        supportPhone: organization.whiteLabelConfig.supportPhone || undefined,
        features: organization.whiteLabelConfig.features as Record<string, boolean> | undefined,
        customCss: organization.whiteLabelConfig.customCss || undefined,
      } : undefined,
    };
  } catch (error) {
    console.error('[TenantResolver] Failed to resolve tenant from domain:', error);
    return null;
  }
}

// ============================================================================
// Middleware
// ============================================================================

/**
 * Tenant Resolver Middleware Options
 */
export interface TenantResolverOptions {
  /**
   * Whether to require tenant resolution (reject if not found)
   * Default: false (allows requests without tenant context)
   */
  required?: boolean;

  /**
   * Whether to skip resolution for default/system domains
   * Default: true
   */
  skipDefaultDomains?: boolean;

  /**
   * Custom error handler for when tenant is required but not found
   */
  onNotFound?: (req: Request, res: Response) => void;
}

/**
 * Create tenant resolver middleware
 */
export function createTenantResolver(options: TenantResolverOptions = {}) {
  const {
    required = false,
    skipDefaultDomains = true,
    onNotFound,
  } = options;

  return async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const hostname = extractHostname(req);

      // Skip resolution for default domains if configured
      if (skipDefaultDomains && isDefaultDomain(hostname)) {
        return next();
      }

      // Check cache first
      const cached = getCachedTenant(hostname);
      if (cached !== undefined) {
        if (cached) {
          req.tenant = cached;
          req.organizationId = cached.organizationId;
          req.organization = {
            id: cached.organizationId,
            name: cached.organizationName,
            settings: cached.settings,
          };
        } else if (required) {
          if (onNotFound) {
            return onNotFound(req, res);
          }
          return res.status(404).json({
            success: false,
            error: {
              message: 'Organization not found for this domain',
              code: 'TENANT_NOT_FOUND',
            },
          });
        }
        return next();
      }

      // Resolve from database
      const tenant = await resolveTenantFromDomain(hostname);
      setCachedTenant(hostname, tenant);

      if (tenant) {
        req.tenant = tenant;
        req.organizationId = tenant.organizationId;
        req.organization = {
          id: tenant.organizationId,
          name: tenant.organizationName,
          settings: tenant.settings,
        };
      } else if (required) {
        if (onNotFound) {
          return onNotFound(req, res);
        }
        return res.status(404).json({
          success: false,
          error: {
            message: 'Organization not found for this domain',
            code: 'TENANT_NOT_FOUND',
          },
        });
      }

      next();
    } catch (error) {
      console.error('[TenantResolver] Middleware error:', error);
      // Don't block the request on tenant resolution errors
      next();
    }
  };
}

/**
 * Default tenant resolver middleware instance
 * Resolves tenant but doesn't require it
 */
export const tenantResolver = createTenantResolver();

/**
 * Required tenant resolver middleware
 * Rejects requests without valid tenant
 */
export const requireTenant = createTenantResolver({ required: true });

// ============================================================================
// API Endpoint for Tenant Info
// ============================================================================

/**
 * Get tenant info for current request
 * GET /api/tenant
 */
export async function getTenantInfo(req: TenantRequest, res: Response) {
  try {
    const hostname = extractHostname(req);

    // Check if default domain
    if (isDefaultDomain(hostname)) {
      return res.json({
        success: true,
        data: {
          isDefaultDomain: true,
          hostname,
          tenant: null,
        },
      });
    }

    // Try to resolve tenant
    const cached = getCachedTenant(hostname);
    const tenant = cached !== undefined ? cached : await resolveTenantFromDomain(hostname);

    if (cached === undefined && tenant !== null) {
      setCachedTenant(hostname, tenant);
    }

    return res.json({
      success: true,
      data: {
        isDefaultDomain: false,
        hostname,
        tenant,
      },
    });
  } catch (error) {
    console.error('[TenantResolver] Get tenant info error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get tenant information',
        code: 'INTERNAL_ERROR',
      },
    });
  }
}

export default tenantResolver;
