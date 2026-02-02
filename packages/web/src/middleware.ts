import { withAuth } from 'next-auth/middleware';
import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// Types
// ============================================================================

interface TenantConfig {
  organizationId: string;
  organizationName: string;
  domain: string;
  isPrimary: boolean;
  isVerified: boolean;
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

interface TenantResponse {
  success: boolean;
  data?: {
    isDefaultDomain: boolean;
    hostname: string;
    tenant: TenantConfig | null;
  };
}

// ============================================================================
// Configuration
// ============================================================================

// Default domains that don't require tenant resolution
const DEFAULT_DOMAINS = (process.env.DEFAULT_DOMAINS || 'localhost,127.0.0.1').split(',').map(d => d.trim().toLowerCase());

// Domain patterns that should be treated as default (development/deployment platforms)
const DEFAULT_DOMAIN_PATTERNS = [
  /\.vercel\.app$/,      // Vercel deployments
  /\.netlify\.app$/,     // Netlify deployments
  /\.railway\.app$/,     // Railway deployments
  /\.herokuapp\.com$/,   // Heroku deployments
  /\.amplifyapp\.com$/,  // AWS Amplify deployments
  /\.pages\.dev$/,       // Cloudflare Pages
  /\.azurewebsites\.net$/, // Azure App Service
  /\.apprunner\.com$/,   // AWS App Runner
];

// API URL for tenant resolution
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Cache for tenant lookups (edge runtime compatible)
const tenantCache = new Map<string, { data: TenantConfig | null; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract hostname from request
 */
function getHostname(request: NextRequest): string {
  // Check X-Forwarded-Host header (for reverse proxy setups)
  const forwardedHost = request.headers.get('x-forwarded-host');
  if (forwardedHost) {
    return forwardedHost.split(':')[0].toLowerCase();
  }

  // Check Host header
  const host = request.headers.get('host');
  if (host) {
    return host.split(':')[0].toLowerCase();
  }

  return 'localhost';
}

/**
 * Check if hostname is a default domain
 */
function isDefaultDomain(hostname: string): boolean {
  // Check exact matches first
  if (DEFAULT_DOMAINS.includes(hostname)) {
    return true;
  }

  // Check against common deployment platform patterns
  return DEFAULT_DOMAIN_PATTERNS.some(pattern => pattern.test(hostname));
}

/**
 * Fetch tenant config from API
 */
async function fetchTenantConfig(hostname: string): Promise<TenantConfig | null> {
  // Check cache first
  const cached = tenantCache.get(hostname);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const response = await fetch(`${API_URL}/api/tenant`, {
      headers: {
        'Host': hostname,
        'X-Forwarded-Host': hostname,
      },
      // Short timeout for middleware
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      console.warn(`[Middleware] Failed to fetch tenant config: ${response.status}`);
      tenantCache.set(hostname, { data: null, timestamp: Date.now() });
      return null;
    }

    const data: TenantResponse = await response.json();

    if (data.success && data.data?.tenant) {
      tenantCache.set(hostname, { data: data.data.tenant, timestamp: Date.now() });
      return data.data.tenant;
    }

    tenantCache.set(hostname, { data: null, timestamp: Date.now() });
    return null;
  } catch (error) {
    console.error('[Middleware] Error fetching tenant config:', error);
    tenantCache.set(hostname, { data: null, timestamp: Date.now() });
    return null;
  }
}

/**
 * Set tenant context headers and cookies
 */
function setTenantContext(response: NextResponse, tenant: TenantConfig): NextResponse {
  // Set headers for downstream use
  response.headers.set('X-Organization-Id', tenant.organizationId);
  response.headers.set('X-Organization-Name', tenant.organizationName);
  response.headers.set('X-Tenant-Domain', tenant.domain);

  // Set cookies for client-side access
  response.cookies.set('organizationId', tenant.organizationId, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
  });

  // Set white-label config cookie if available
  if (tenant.whiteLabelConfig) {
    response.cookies.set('whiteLabelConfig', JSON.stringify({
      brandName: tenant.whiteLabelConfig.brandName,
      primaryColor: tenant.whiteLabelConfig.primaryColor,
      secondaryColor: tenant.whiteLabelConfig.secondaryColor,
    }), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
    });
  }

  return response;
}

// ============================================================================
// Middleware
// ============================================================================

export default withAuth(
  async function middleware(request) {
    const hostname = getHostname(request);
    let response = NextResponse.next();

    // Skip tenant resolution for default domains
    if (!isDefaultDomain(hostname)) {
      try {
        const tenant = await fetchTenantConfig(hostname);

        if (tenant) {
          // Set tenant context
          response = setTenantContext(response, tenant);
        } else {
          // Domain not found - could redirect to error page or default domain
          // For now, just log and continue
          console.log(`[Middleware] No tenant found for domain: ${hostname}`);
        }
      } catch (error) {
        console.error('[Middleware] Tenant resolution error:', error);
        // Continue without tenant context on error
      }
    }

    return response;
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to auth pages without token
        if (req.nextUrl.pathname.startsWith('/auth')) {
          return true;
        }
        // Require token for all other protected pages
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|auth).*)'],
};
