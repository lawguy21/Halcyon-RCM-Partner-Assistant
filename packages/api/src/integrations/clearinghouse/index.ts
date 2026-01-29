/**
 * Clearinghouse Integration Module
 * Exports all clearinghouse adapters, types, and utilities
 */

// Import types for local use
import type { ClearinghouseConfig, ClearinghouseType } from './types.js';
import type { IClearinghouseAdapter } from './clearinghouse-adapter.js';
import { ChangeHealthcareAdapter, type ChangeHealthcareConfig } from './change-healthcare.js';
import { AvailityAdapter, type AvailityConfig } from './availity.js';

// ============================================================================
// Types
// ============================================================================

export type {
  ClearinghouseType,
  TransactionType,
  ClearinghouseCredentials,
  ClearinghouseConfig,
  SubmissionError,
  ClaimSubmissionStatus,
  SubmissionResult,
  ClaimStatusCode,
  AdjudicationInfo,
  StatusResponse,
  CoverageDetails,
  DeductibleInfo,
  CopayInfo,
  OutOfPocketInfo,
  EligibilityResponse,
  RemittanceAdvice,
  DateRange,
  PatientInfo,
  PayerInfo,
  ConnectionTestResult,
  ClearinghouseResult,
} from './types.js';

// ============================================================================
// Adapter Interface and Base Class
// ============================================================================

export {
  type IClearinghouseAdapter,
  BaseClearinghouseAdapter,
  ClearinghouseError,
  ClearinghouseErrorCode,
  type ClaimData,
  type SubmissionOptions,
  type StatusOptions,
  type EligibilityOptions,
  type RemittanceOptions,
} from './clearinghouse-adapter.js';

// ============================================================================
// Change Healthcare Adapter
// ============================================================================

export {
  ChangeHealthcareAdapter,
  createChangeHealthcareAdapter,
  type ChangeHealthcareConfig,
} from './change-healthcare.js';

// ============================================================================
// Availity Adapter
// ============================================================================

export {
  AvailityAdapter,
  createAvailityAdapter,
  type AvailityConfig,
} from './availity.js';

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Supported clearinghouse types for the factory
 */
export type SupportedClearinghouse = 'change_healthcare' | 'availity';

/**
 * Clearinghouse information
 */
export interface ClearinghouseInfo {
  type: ClearinghouseType;
  name: string;
  status: 'available' | 'coming-soon' | 'not-planned';
  description: string;
  supportedTransactions: string[];
  documentationUrl?: string;
}

/**
 * Factory function to create the appropriate clearinghouse adapter based on type
 *
 * @param type - Clearinghouse type
 * @param config - Clearinghouse configuration
 * @returns Configured clearinghouse adapter instance
 * @throws Error if clearinghouse type is not supported
 *
 * @example
 * ```typescript
 * const adapter = createClearinghouseAdapter('change_healthcare', {
 *   id: 'ch-prod',
 *   name: 'Change Healthcare Production',
 *   type: 'change_healthcare',
 *   apiUrl: 'https://apigw.changehealthcare.com',
 *   credentials: {
 *     clientId: 'your-client-id',
 *     clientSecret: 'your-client-secret',
 *   },
 *   supportedTransactions: ['837P', '270', '276', '835'],
 *   organizationId: 'org-123',
 *   isActive: true,
 * });
 *
 * await adapter.connect();
 * const result = await adapter.verifyEligibility(patient, payer);
 * ```
 */
export function createClearinghouseAdapter(
  type: ClearinghouseType,
  config: ClearinghouseConfig
): IClearinghouseAdapter {
  switch (type) {
    case 'change_healthcare':
      return new ChangeHealthcareAdapter(config as ChangeHealthcareConfig);

    case 'availity':
      return new AvailityAdapter(config as AvailityConfig);

    case 'trizetto':
    case 'emdeon':
    case 'other':
      throw new Error(
        `Clearinghouse type "${type}" adapter is not yet implemented. ` +
        `Supported types: change_healthcare, availity`
      );

    default:
      throw new Error(`Unknown clearinghouse type: ${type}`);
  }
}

/**
 * Get list of supported clearinghouses with their status
 */
export function getSupportedClearinghouses(): ClearinghouseInfo[] {
  return [
    {
      type: 'change_healthcare',
      name: 'Change Healthcare',
      status: 'available',
      description: 'One of the largest healthcare clearinghouses, processing billions of transactions annually.',
      supportedTransactions: ['837P', '837I', '837D', '270', '271', '276', '277', '835'],
      documentationUrl: 'https://developers.changehealthcare.com/',
    },
    {
      type: 'availity',
      name: 'Availity',
      status: 'available',
      description: 'Multi-payer health information network providing real-time connectivity.',
      supportedTransactions: ['837P', '837I', '270', '271', '276', '277', '835'],
      documentationUrl: 'https://developer.availity.com/',
    },
    {
      type: 'trizetto',
      name: 'TriZetto (Cognizant)',
      status: 'coming-soon',
      description: 'Healthcare IT company providing revenue cycle management and clearinghouse services.',
      supportedTransactions: ['837P', '837I', '270', '271', '276', '277', '835'],
    },
    {
      type: 'emdeon',
      name: 'Emdeon (now Change Healthcare)',
      status: 'not-planned',
      description: 'Merged with Change Healthcare. Use change_healthcare instead.',
      supportedTransactions: [],
    },
    {
      type: 'other',
      name: 'Generic EDI Gateway',
      status: 'coming-soon',
      description: 'Generic adapter for clearinghouses using standard EDI protocols.',
      supportedTransactions: ['837P', '837I', '270', '271', '276', '277', '835'],
    },
  ];
}

/**
 * Check if a clearinghouse type is supported and available
 */
export function isClearinghouseSupported(type: ClearinghouseType): boolean {
  const info = getSupportedClearinghouses().find((c) => c.type === type);
  return info?.status === 'available';
}

/**
 * Get clearinghouse info by type
 */
export function getClearinghouseInfo(type: ClearinghouseType): ClearinghouseInfo | undefined {
  return getSupportedClearinghouses().find((c) => c.type === type);
}

/**
 * Validate clearinghouse configuration
 */
export function validateClearinghouseConfig(config: ClearinghouseConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.id) {
    errors.push('Configuration ID is required');
  }

  if (!config.name) {
    errors.push('Configuration name is required');
  }

  if (!config.type) {
    errors.push('Clearinghouse type is required');
  } else if (!isClearinghouseSupported(config.type)) {
    errors.push(`Clearinghouse type "${config.type}" is not supported`);
  }

  if (!config.apiUrl) {
    errors.push('API URL is required');
  }

  if (!config.credentials) {
    errors.push('Credentials are required');
  } else {
    if (!config.credentials.clientId) {
      errors.push('Client ID is required in credentials');
    }
    // Client secret may be optional for some auth methods
  }

  if (!config.organizationId) {
    errors.push('Organization ID is required');
  }

  if (!config.supportedTransactions || config.supportedTransactions.length === 0) {
    errors.push('At least one supported transaction type is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create a default configuration template for a clearinghouse type
 */
export function getConfigTemplate(type: ClearinghouseType): Partial<ClearinghouseConfig> {
  const baseTemplate: Partial<ClearinghouseConfig> = {
    type,
    isActive: false,
    retry: {
      maxRetries: 3,
      retryDelay: 1000,
      backoffMultiplier: 2,
    },
    timeout: 30000,
    environment: 'sandbox',
  };

  switch (type) {
    case 'change_healthcare':
      return {
        ...baseTemplate,
        name: 'Change Healthcare',
        apiUrl: 'https://sandbox.apigw.changehealthcare.com',
        tokenEndpoint: 'https://sandbox.apigw.changehealthcare.com/oauth2/token',
        supportedTransactions: ['837P', '837I', '270', '271', '276', '277', '835'],
        credentials: {
          clientId: '',
          clientSecret: '',
          submitterId: '',
        },
      };

    case 'availity':
      return {
        ...baseTemplate,
        name: 'Availity',
        apiUrl: 'https://api.sandbox.availity.com',
        tokenEndpoint: 'https://api.sandbox.availity.com/oauth2/v1/token',
        supportedTransactions: ['837P', '837I', '270', '271', '276', '277', '835'],
        credentials: {
          clientId: '',
          clientSecret: '',
        },
      };

    default:
      return baseTemplate;
  }
}
