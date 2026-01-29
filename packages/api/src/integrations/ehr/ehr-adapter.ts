/**
 * EHR Adapter Interface
 * Abstract adapter defining the contract for EHR system integrations
 */

import type {
  EHRPatient,
  EHREncounter,
  EHRInsurance,
  EHRCoverage,
  EHRResult,
  EHRConnectionConfig,
} from './types.js';

/**
 * Error codes for EHR operations
 */
export enum EHRErrorCode {
  // Authentication errors
  AUTH_FAILED = 'AUTH_FAILED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',

  // Resource errors
  PATIENT_NOT_FOUND = 'PATIENT_NOT_FOUND',
  ENCOUNTER_NOT_FOUND = 'ENCOUNTER_NOT_FOUND',
  INSURANCE_NOT_FOUND = 'INSURANCE_NOT_FOUND',

  // Connectivity errors
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMITED = 'RATE_LIMITED',

  // Data errors
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  PARSE_ERROR = 'PARSE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',

  // General errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',
}

/**
 * Custom error class for EHR operations
 */
export class EHRError extends Error {
  public readonly code: EHRErrorCode;
  public readonly details?: unknown;

  constructor(code: EHRErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'EHRError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Options for patient lookup
 */
export interface PatientLookupOptions {
  /** Include inactive patients */
  includeInactive?: boolean;
  /** Include insurance information */
  includeInsurance?: boolean;
  /** Include recent encounters */
  includeRecentEncounters?: boolean;
}

/**
 * Options for encounter lookup
 */
export interface EncounterLookupOptions {
  /** Include diagnosis details */
  includeDiagnoses?: boolean;
  /** Include procedure details */
  includeProcedures?: boolean;
  /** Include charge information */
  includeCharges?: boolean;
}

/**
 * Options for insurance lookup
 */
export interface InsuranceLookupOptions {
  /** Include only active coverage */
  activeOnly?: boolean;
  /** Include coverage verification status */
  includeVerification?: boolean;
}

/**
 * Options for eligibility verification
 */
export interface EligibilityOptions {
  /** Service type code for verification */
  serviceTypeCode?: string;
  /** Date of service for verification */
  dateOfService?: string;
  /** Force fresh verification (bypass cache) */
  forceRefresh?: boolean;
}

/**
 * Abstract EHR Adapter Interface
 * All EHR vendor adapters must implement this interface
 */
export interface EHRAdapter {
  /**
   * Get the adapter vendor type
   */
  readonly vendor: string;

  /**
   * Check if the adapter is connected and authenticated
   */
  isConnected(): boolean;

  /**
   * Connect to the EHR system and authenticate
   * @throws EHRError if connection fails
   */
  connect(): Promise<void>;

  /**
   * Disconnect from the EHR system
   */
  disconnect(): Promise<void>;

  /**
   * Test the connection to the EHR system
   * @returns Connection test result with latency
   */
  testConnection(): Promise<EHRResult<{ latencyMs: number }>>;

  /**
   * Retrieve patient information by MRN
   * @param mrn - Medical Record Number
   * @param options - Optional lookup options
   * @returns Patient data or error
   */
  getPatient(mrn: string, options?: PatientLookupOptions): Promise<EHRResult<EHRPatient>>;

  /**
   * Retrieve encounter information by ID
   * @param encounterId - Encounter identifier
   * @param options - Optional lookup options
   * @returns Encounter data or error
   */
  getEncounter(encounterId: string, options?: EncounterLookupOptions): Promise<EHRResult<EHREncounter>>;

  /**
   * Retrieve insurance information for a patient
   * @param patientId - Patient MRN or FHIR ID
   * @param options - Optional lookup options
   * @returns Array of insurance records or error
   */
  getInsurance(patientId: string, options?: InsuranceLookupOptions): Promise<EHRResult<EHRInsurance[]>>;

  /**
   * Verify patient eligibility with their insurance
   * @param patientId - Patient MRN or FHIR ID
   * @param options - Optional verification options
   * @returns Coverage verification result or error
   */
  verifyEligibility(patientId: string, options?: EligibilityOptions): Promise<EHRResult<EHRCoverage>>;
}

/**
 * Abstract base class for EHR adapters providing common functionality
 */
export abstract class BaseEHRAdapter implements EHRAdapter {
  protected config: EHRConnectionConfig;
  protected connected: boolean = false;
  protected lastRequestTime: number = 0;

  abstract readonly vendor: string;

  constructor(config: EHRConnectionConfig) {
    this.config = config;
  }

  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Ensure the adapter is connected before making requests
   * @throws EHRError if not connected
   */
  protected ensureConnected(): void {
    if (!this.connected) {
      throw new EHRError(
        EHRErrorCode.CONNECTION_FAILED,
        'Not connected to EHR system. Call connect() first.'
      );
    }
  }

  /**
   * Wrap an async operation with error handling and timing
   * @param operation - The async operation to execute
   * @param source - Source identifier for metadata
   * @returns Result with metadata
   */
  protected async executeWithMetadata<T>(
    operation: () => Promise<T>,
    source: string
  ): Promise<EHRResult<T>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      const data = await operation();
      return {
        success: true,
        data,
        metadata: {
          requestId,
          responseTime: Date.now() - startTime,
          source,
        },
      };
    } catch (error) {
      const ehrError = this.normalizeError(error);
      return {
        success: false,
        error: {
          code: ehrError.code,
          message: ehrError.message,
          details: ehrError.details,
        },
        metadata: {
          requestId,
          responseTime: Date.now() - startTime,
          source,
        },
      };
    }
  }

  /**
   * Normalize various error types to EHRError
   */
  protected normalizeError(error: unknown): EHRError {
    if (error instanceof EHRError) {
      return error;
    }

    if (error instanceof Error) {
      // Check for common error patterns
      const message = error.message.toLowerCase();

      if (message.includes('timeout')) {
        return new EHRError(EHRErrorCode.TIMEOUT, error.message);
      }
      if (message.includes('401') || message.includes('unauthorized')) {
        return new EHRError(EHRErrorCode.AUTH_FAILED, error.message);
      }
      if (message.includes('404') || message.includes('not found')) {
        return new EHRError(EHRErrorCode.PATIENT_NOT_FOUND, error.message);
      }
      if (message.includes('429') || message.includes('rate limit')) {
        return new EHRError(EHRErrorCode.RATE_LIMITED, error.message);
      }

      return new EHRError(EHRErrorCode.UNKNOWN_ERROR, error.message);
    }

    return new EHRError(EHRErrorCode.UNKNOWN_ERROR, 'An unknown error occurred');
  }

  /**
   * Generate a unique request ID for tracking
   */
  protected generateRequestId(): string {
    return `${this.vendor}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Implement rate limiting
   * @param minInterval - Minimum interval between requests in ms
   */
  protected async rateLimit(minInterval: number = 100): Promise<void> {
    const elapsed = Date.now() - this.lastRequestTime;
    if (elapsed < minInterval) {
      await new Promise((resolve) => setTimeout(resolve, minInterval - elapsed));
    }
    this.lastRequestTime = Date.now();
  }

  // Abstract methods to be implemented by vendor-specific adapters
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract testConnection(): Promise<EHRResult<{ latencyMs: number }>>;
  abstract getPatient(mrn: string, options?: PatientLookupOptions): Promise<EHRResult<EHRPatient>>;
  abstract getEncounter(encounterId: string, options?: EncounterLookupOptions): Promise<EHRResult<EHREncounter>>;
  abstract getInsurance(patientId: string, options?: InsuranceLookupOptions): Promise<EHRResult<EHRInsurance[]>>;
  abstract verifyEligibility(patientId: string, options?: EligibilityOptions): Promise<EHRResult<EHRCoverage>>;
}
