// @ts-nocheck
/**
 * Domain Service
 *
 * Service for managing custom domains for multi-tenant routing.
 * Handles domain registration, verification, and SSL status tracking.
 */

import prisma from '../lib/prisma.js';
import { randomBytes } from 'crypto';
import { clearDomainCache, clearOrganizationCache } from '../middleware/tenantResolver.js';

// ============================================================================
// Types
// ============================================================================

export interface DomainInput {
  domain: string;
  isPrimary?: boolean;
}

export interface DomainInfo {
  id: string;
  domain: string;
  organizationId: string;
  isPrimary: boolean;
  isVerified: boolean;
  verificationToken: string | null;
  sslStatus: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DomainVerificationResult {
  success: boolean;
  domain: string;
  verified: boolean;
  message: string;
  verificationToken?: string;
  txtRecordName?: string;
  txtRecordValue?: string;
}

export interface DomainListResult {
  domains: DomainInfo[];
  total: number;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate domain format
 */
function isValidDomain(domain: string): boolean {
  // Basic domain validation regex
  // Allows subdomains, requires at least one dot
  const domainRegex = /^(?!-)[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
  return domainRegex.test(domain) && domain.length <= 253;
}

/**
 * Normalize domain (lowercase, trim, remove protocol/path)
 */
function normalizeDomain(domain: string): string {
  let normalized = domain.toLowerCase().trim();

  // Remove protocol if present
  normalized = normalized.replace(/^https?:\/\//, '');

  // Remove trailing slash and path
  normalized = normalized.split('/')[0];

  // Remove port if present
  normalized = normalized.split(':')[0];

  return normalized;
}

/**
 * Check if domain is reserved/system domain
 */
function isReservedDomain(domain: string): boolean {
  const reserved = [
    'localhost',
    '127.0.0.1',
    'api.localhost',
    'app.localhost',
  ];

  // Check exact match
  if (reserved.includes(domain)) {
    return true;
  }

  // Check system subdomains
  const systemPrefixes = ['api.', 'admin.', 'www.', 'mail.', 'smtp.', 'ftp.'];
  const defaultDomain = process.env.DEFAULT_APP_DOMAIN || 'halcyonrcm.com';

  for (const prefix of systemPrefixes) {
    if (domain === `${prefix}${defaultDomain}`) {
      return true;
    }
  }

  return false;
}

// ============================================================================
// DNS Verification
// ============================================================================

/**
 * Generate a verification token for domain ownership verification
 */
export function generateVerificationToken(): string {
  return `halcyon-verify-${randomBytes(16).toString('hex')}`;
}

/**
 * Get DNS TXT record name for verification
 */
function getVerificationTxtRecordName(domain: string): string {
  return `_halcyon-verification.${domain}`;
}

/**
 * Verify domain ownership via DNS TXT record
 * In production, this would actually query DNS
 */
async function verifyDnsTxtRecord(domain: string, expectedToken: string): Promise<boolean> {
  try {
    // In development/testing, auto-verify localhost domains
    if (domain.includes('localhost') || domain.includes('127.0.0.1')) {
      return true;
    }

    // In production, use DNS lookup
    if (process.env.NODE_ENV === 'production') {
      const dns = await import('dns');
      const { promisify } = await import('util');
      const resolveTxt = promisify(dns.resolveTxt);

      const txtRecordName = getVerificationTxtRecordName(domain);

      try {
        const records = await resolveTxt(txtRecordName);
        // Records is an array of arrays of strings
        for (const record of records) {
          const value = record.join('');
          if (value === expectedToken) {
            return true;
          }
        }
      } catch (dnsError: unknown) {
        const error = dnsError as NodeJS.ErrnoException;
        // DNS lookup failed - domain might not have the TXT record yet
        if (error.code === 'ENODATA' || error.code === 'ENOTFOUND') {
          console.log(`[DomainService] TXT record not found for ${txtRecordName}`);
        } else {
          console.error('[DomainService] DNS lookup error:', error);
        }
        return false;
      }
    }

    // In development without explicit verification, return false
    return false;
  } catch (error) {
    console.error('[DomainService] DNS verification error:', error);
    return false;
  }
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Add a custom domain to an organization
 */
export async function addDomain(
  organizationId: string,
  input: DomainInput
): Promise<{ success: boolean; data?: DomainInfo; error?: string }> {
  try {
    const domain = normalizeDomain(input.domain);

    // Validate domain format
    if (!isValidDomain(domain)) {
      return {
        success: false,
        error: 'Invalid domain format. Please enter a valid domain name.',
      };
    }

    // Check if reserved domain
    if (isReservedDomain(domain)) {
      return {
        success: false,
        error: 'This domain is reserved and cannot be used.',
      };
    }

    // Check if organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      return {
        success: false,
        error: 'Organization not found.',
      };
    }

    // Check if domain already exists
    const existing = await prisma.organizationDomain.findUnique({
      where: { domain },
    });

    if (existing) {
      if (existing.organizationId === organizationId) {
        return {
          success: false,
          error: 'This domain is already registered to your organization.',
        };
      }
      return {
        success: false,
        error: 'This domain is already registered to another organization.',
      };
    }

    // Generate verification token
    const verificationToken = generateVerificationToken();

    // If this is set as primary, unset other primary domains
    if (input.isPrimary) {
      await prisma.organizationDomain.updateMany({
        where: {
          organizationId,
          isPrimary: true,
        },
        data: {
          isPrimary: false,
        },
      });
    }

    // Create the domain record
    const newDomain = await prisma.organizationDomain.create({
      data: {
        domain,
        organizationId,
        isPrimary: input.isPrimary || false,
        isVerified: false,
        verificationToken,
        sslStatus: 'pending',
      },
    });

    // Clear organization cache
    clearOrganizationCache(organizationId);

    return {
      success: true,
      data: newDomain,
    };
  } catch (error) {
    console.error('[DomainService] Add domain error:', error);
    return {
      success: false,
      error: 'Failed to add domain. Please try again.',
    };
  }
}

/**
 * Remove a domain from an organization
 */
export async function removeDomain(
  organizationId: string,
  domain: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const normalizedDomain = normalizeDomain(domain);

    // Find the domain
    const existingDomain = await prisma.organizationDomain.findUnique({
      where: { domain: normalizedDomain },
    });

    if (!existingDomain) {
      return {
        success: false,
        error: 'Domain not found.',
      };
    }

    if (existingDomain.organizationId !== organizationId) {
      return {
        success: false,
        error: 'Domain does not belong to this organization.',
      };
    }

    // Delete the domain
    await prisma.organizationDomain.delete({
      where: { domain: normalizedDomain },
    });

    // Clear caches
    clearDomainCache(normalizedDomain);
    clearOrganizationCache(organizationId);

    return { success: true };
  } catch (error) {
    console.error('[DomainService] Remove domain error:', error);
    return {
      success: false,
      error: 'Failed to remove domain. Please try again.',
    };
  }
}

/**
 * List all domains for an organization
 */
export async function listDomains(
  organizationId: string
): Promise<DomainListResult> {
  try {
    const domains = await prisma.organizationDomain.findMany({
      where: { organizationId },
      orderBy: [
        { isPrimary: 'desc' },
        { createdAt: 'asc' },
      ],
    });

    return {
      domains,
      total: domains.length,
    };
  } catch (error) {
    console.error('[DomainService] List domains error:', error);
    return {
      domains: [],
      total: 0,
    };
  }
}

/**
 * Get domain by ID
 */
export async function getDomain(domainId: string): Promise<DomainInfo | null> {
  try {
    return await prisma.organizationDomain.findUnique({
      where: { id: domainId },
    });
  } catch (error) {
    console.error('[DomainService] Get domain error:', error);
    return null;
  }
}

/**
 * Get domain by domain name
 */
export async function getDomainByName(domain: string): Promise<DomainInfo | null> {
  try {
    const normalizedDomain = normalizeDomain(domain);
    return await prisma.organizationDomain.findUnique({
      where: { domain: normalizedDomain },
    });
  } catch (error) {
    console.error('[DomainService] Get domain by name error:', error);
    return null;
  }
}

/**
 * Verify domain ownership
 */
export async function verifyDomain(
  domainId: string
): Promise<DomainVerificationResult> {
  try {
    const domainRecord = await prisma.organizationDomain.findUnique({
      where: { id: domainId },
    });

    if (!domainRecord) {
      return {
        success: false,
        domain: '',
        verified: false,
        message: 'Domain not found.',
      };
    }

    if (domainRecord.isVerified) {
      return {
        success: true,
        domain: domainRecord.domain,
        verified: true,
        message: 'Domain is already verified.',
      };
    }

    if (!domainRecord.verificationToken) {
      // Generate new token if missing
      const newToken = generateVerificationToken();
      await prisma.organizationDomain.update({
        where: { id: domainId },
        data: { verificationToken: newToken },
      });

      return {
        success: true,
        domain: domainRecord.domain,
        verified: false,
        message: 'Verification token generated. Please add the TXT record to your DNS.',
        verificationToken: newToken,
        txtRecordName: getVerificationTxtRecordName(domainRecord.domain),
        txtRecordValue: newToken,
      };
    }

    // Attempt DNS verification
    const verified = await verifyDnsTxtRecord(
      domainRecord.domain,
      domainRecord.verificationToken
    );

    if (verified) {
      // Update domain as verified
      await prisma.organizationDomain.update({
        where: { id: domainId },
        data: {
          isVerified: true,
          sslStatus: 'active', // In production, SSL would be provisioned separately
        },
      });

      // Clear caches
      clearDomainCache(domainRecord.domain);
      clearOrganizationCache(domainRecord.organizationId);

      return {
        success: true,
        domain: domainRecord.domain,
        verified: true,
        message: 'Domain verified successfully!',
      };
    }

    return {
      success: true,
      domain: domainRecord.domain,
      verified: false,
      message: 'Verification failed. Please ensure the TXT record is properly configured.',
      verificationToken: domainRecord.verificationToken,
      txtRecordName: getVerificationTxtRecordName(domainRecord.domain),
      txtRecordValue: domainRecord.verificationToken,
    };
  } catch (error) {
    console.error('[DomainService] Verify domain error:', error);
    return {
      success: false,
      domain: '',
      verified: false,
      message: 'Failed to verify domain. Please try again.',
    };
  }
}

/**
 * Set a domain as the primary domain for an organization
 */
export async function setPrimaryDomain(
  organizationId: string,
  domain: string
): Promise<{ success: boolean; data?: DomainInfo; error?: string }> {
  try {
    const normalizedDomain = normalizeDomain(domain);

    // Find the domain
    const existingDomain = await prisma.organizationDomain.findUnique({
      where: { domain: normalizedDomain },
    });

    if (!existingDomain) {
      return {
        success: false,
        error: 'Domain not found.',
      };
    }

    if (existingDomain.organizationId !== organizationId) {
      return {
        success: false,
        error: 'Domain does not belong to this organization.',
      };
    }

    if (!existingDomain.isVerified) {
      return {
        success: false,
        error: 'Domain must be verified before setting as primary.',
      };
    }

    // Unset other primary domains
    await prisma.organizationDomain.updateMany({
      where: {
        organizationId,
        isPrimary: true,
      },
      data: {
        isPrimary: false,
      },
    });

    // Set this domain as primary
    const updatedDomain = await prisma.organizationDomain.update({
      where: { domain: normalizedDomain },
      data: { isPrimary: true },
    });

    // Clear caches
    clearOrganizationCache(organizationId);

    return {
      success: true,
      data: updatedDomain,
    };
  } catch (error) {
    console.error('[DomainService] Set primary domain error:', error);
    return {
      success: false,
      error: 'Failed to set primary domain. Please try again.',
    };
  }
}

/**
 * Update SSL status for a domain
 */
export async function updateSslStatus(
  domainId: string,
  sslStatus: 'pending' | 'active' | 'failed'
): Promise<{ success: boolean; error?: string }> {
  try {
    const domain = await prisma.organizationDomain.update({
      where: { id: domainId },
      data: { sslStatus },
    });

    // Clear cache
    clearDomainCache(domain.domain);

    return { success: true };
  } catch (error) {
    console.error('[DomainService] Update SSL status error:', error);
    return {
      success: false,
      error: 'Failed to update SSL status.',
    };
  }
}

/**
 * Get organization by domain
 */
export async function getOrganizationByDomain(domain: string): Promise<{
  organizationId: string;
  organizationName: string;
  domain: string;
  isPrimary: boolean;
  isVerified: boolean;
  whiteLabelConfig?: Record<string, unknown>;
} | null> {
  try {
    const normalizedDomain = normalizeDomain(domain);

    const domainRecord = await prisma.organizationDomain.findUnique({
      where: { domain: normalizedDomain },
      include: {
        organization: {
          include: {
            whiteLabelConfig: true,
          },
        },
      },
    });

    if (!domainRecord || !domainRecord.isVerified) {
      return null;
    }

    return {
      organizationId: domainRecord.organizationId,
      organizationName: domainRecord.organization.name,
      domain: domainRecord.domain,
      isPrimary: domainRecord.isPrimary,
      isVerified: domainRecord.isVerified,
      whiteLabelConfig: domainRecord.organization.whiteLabelConfig as Record<string, unknown> | undefined,
    };
  } catch (error) {
    console.error('[DomainService] Get organization by domain error:', error);
    return null;
  }
}

// ============================================================================
// Export Service
// ============================================================================

export const domainService = {
  addDomain,
  removeDomain,
  listDomains,
  getDomain,
  getDomainByName,
  verifyDomain,
  setPrimaryDomain,
  updateSslStatus,
  getOrganizationByDomain,
  generateVerificationToken,
};

export default domainService;
