/**
 * Clearinghouse Adapter Interface
 * Abstract adapter defining the contract for clearinghouse integrations
 */

import type {
  ClearinghouseConfig,
  ClearinghouseResult,
  SubmissionResult,
  StatusResponse,
  EligibilityResponse,
  RemittanceAdvice,
  DateRange,
  PatientInfo,
  PayerInfo,
  ConnectionTestResult,
  ClearinghouseType,
} from './types.js';

/**
 * Error codes for clearinghouse operations
 */
export enum ClearinghouseErrorCode {
  // Authentication errors
  AUTH_FAILED = 'AUTH_FAILED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',

  // Submission errors
  SUBMISSION_FAILED = 'SUBMISSION_FAILED',
  INVALID_CLAIM_DATA = 'INVALID_CLAIM_DATA',
  DUPLICATE_CLAIM = 'DUPLICATE_CLAIM',
  BATCH_SIZE_EXCEEDED = 'BATCH_SIZE_EXCEEDED',

  // Status errors
  CLAIM_NOT_FOUND = 'CLAIM_NOT_FOUND',
  STATUS_UNAVAILABLE = 'STATUS_UNAVAILABLE',

  // Eligibility errors
  ELIGIBILITY_FAILED = 'ELIGIBILITY_FAILED',
  PATIENT_NOT_FOUND = 'PATIENT_NOT_FOUND',
  PAYER_NOT_FOUND = 'PAYER_NOT_FOUND',
  COVERAGE_NOT_FOUND = 'COVERAGE_NOT_FOUND',

  // Remittance errors
  REMITTANCE_NOT_FOUND = 'REMITTANCE_NOT_FOUND',
  DOWNLOAD_FAILED = 'DOWNLOAD_FAILED',

  // Connectivity errors
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMITED = 'RATE_LIMITED',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',

  // Data errors
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  PARSE_ERROR = 'PARSE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',

  // General errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',
}

/**
 * Custom error class for clearinghouse operations
 */
export class ClearinghouseError extends Error {
  public readonly code: ClearinghouseErrorCode;
  public readonly details?: unknown;
  public readonly isRetryable: boolean;

  constructor(code: ClearinghouseErrorCode, message: string, details?: unknown, isRetryable = false) {
    super(message);
    this.name = 'ClearinghouseError';
    this.code = code;
    this.details = details;
    this.isRetryable = isRetryable;
  }
}

/**
 * Claim data interface for submission
 * Simplified representation - actual implementation would use full X12 837 structure
 */
export interface ClaimData {
  /** Internal claim ID */
  id: string;

  /** Patient control number */
  patientControlNumber: string;

  /** Claim type */
  claimType: 'professional' | 'institutional' | 'dental';

  /** Patient information */
  patient: {
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    gender: 'M' | 'F' | 'U';
    memberId: string;
    address?: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      zipCode: string;
    };
  };

  /** Subscriber information (if different from patient) */
  subscriber?: {
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    memberId: string;
    relationship: string;
  };

  /** Payer information */
  payer: {
    payerId: string;
    name: string;
  };

  /** Provider information */
  provider: {
    npi: string;
    name: string;
    taxId: string;
    address?: {
      line1: string;
      city: string;
      state: string;
      zipCode: string;
    };
  };

  /** Billing provider (if different) */
  billingProvider?: {
    npi: string;
    name: string;
    taxId: string;
  };

  /** Service lines */
  serviceLines: Array<{
    lineNumber: number;
    procedureCode: string;
    modifiers?: string[];
    diagnosisPointers: number[];
    chargeAmount: number;
    units: number;
    serviceDate: Date;
    serviceDateEnd?: Date;
    placeOfService: string;
    revenueCode?: string;
  }>;

  /** Diagnosis codes */
  diagnoses: Array<{
    code: string;
    type: 'principal' | 'admitting' | 'other';
    sequence: number;
  }>;

  /** Total charge amount */
  totalCharges: number;

  /** Date of service */
  dateOfService: Date;

  /** Date of service end (for range) */
  dateOfServiceEnd?: Date;

  /** Facility information (for institutional claims) */
  facility?: {
    npi: string;
    name: string;
    typeOfBill?: string;
    admissionDate?: Date;
    dischargeDate?: Date;
  };

  /** Authorization number if applicable */
  priorAuthNumber?: string;

  /** Referral number if applicable */
  referralNumber?: string;

  /** Additional claim information */
  additionalInfo?: Record<string, unknown>;
}

/**
 * Options for claim submission
 */
export interface SubmissionOptions {
  /** Batch ID for grouping */
  batchId?: string;

  /** Priority level */
  priority?: 'normal' | 'high' | 'urgent';

  /** Whether to perform dry run / validation only */
  validateOnly?: boolean;

  /** Request real-time acknowledgment */
  requestAcknowledgment?: boolean;

  /** Callback URL for async notification */
  callbackUrl?: string;
}

/**
 * Options for status check
 */
export interface StatusOptions {
  /** Include full status history */
  includeHistory?: boolean;

  /** Include adjudication details */
  includeAdjudication?: boolean;
}

/**
 * Options for eligibility verification
 */
export interface EligibilityOptions {
  /** Service type code */
  serviceTypeCode?: string;

  /** Date of service for eligibility check */
  dateOfService?: Date;

  /** Provider NPI for network status */
  providerNpi?: string;

  /** Include benefit details */
  includeBenefits?: boolean;
}

/**
 * Options for remittance download
 */
export interface RemittanceOptions {
  /** Only get unprocessed ERAs */
  unprocessedOnly?: boolean;

  /** Include claim-level details */
  includeClaimDetails?: boolean;

  /** Maximum number to retrieve */
  limit?: number;
}

/**
 * Abstract Clearinghouse Adapter Interface
 * All clearinghouse adapters must implement this interface
 */
export interface IClearinghouseAdapter {
  /**
   * Get the adapter type
   */
  readonly type: ClearinghouseType;

  /**
   * Get the adapter name
   */
  readonly name: string;

  /**
   * Check if the adapter is connected and authenticated
   */
  isConnected(): boolean;

  /**
   * Connect to the clearinghouse and authenticate
   * @throws ClearinghouseError if connection fails
   */
  connect(): Promise<void>;

  /**
   * Disconnect from the clearinghouse
   */
  disconnect(): Promise<void>;

  /**
   * Test the connection to the clearinghouse
   * @returns Connection test result with latency
   */
  testConnection(): Promise<ClearinghouseResult<ConnectionTestResult>>;

  /**
   * Submit a batch of claims to the clearinghouse
   * @param claims - Array of claims to submit
   * @param options - Submission options
   * @returns Submission result with transaction ID and status
   */
  submitClaims(claims: ClaimData[], options?: SubmissionOptions): Promise<ClearinghouseResult<SubmissionResult>>;

  /**
   * Check the status of submitted claims
   * @param claimIds - Array of claim IDs to check
   * @param options - Status check options
   * @returns Array of status responses
   */
  checkStatus(claimIds: string[], options?: StatusOptions): Promise<ClearinghouseResult<StatusResponse[]>>;

  /**
   * Download Electronic Remittance Advice (ERA) files
   * @param dateRange - Date range for ERA download
   * @param options - Download options
   * @returns Array of remittance advice records
   */
  getRemittances(dateRange: DateRange, options?: RemittanceOptions): Promise<ClearinghouseResult<RemittanceAdvice[]>>;

  /**
   * Verify patient eligibility with payer
   * @param patient - Patient information
   * @param payer - Payer information
   * @param options - Verification options
   * @returns Eligibility response with coverage details
   */
  verifyEligibility(
    patient: PatientInfo,
    payer: PayerInfo,
    options?: EligibilityOptions
  ): Promise<ClearinghouseResult<EligibilityResponse>>;
}

/**
 * Abstract base class for clearinghouse adapters providing common functionality
 */
export abstract class BaseClearinghouseAdapter implements IClearinghouseAdapter {
  protected config: ClearinghouseConfig;
  protected connected: boolean = false;
  protected accessToken?: string;
  protected tokenExpiry?: Date;
  protected lastRequestTime: number = 0;

  abstract readonly type: ClearinghouseType;
  abstract readonly name: string;

  constructor(config: ClearinghouseConfig) {
    this.config = config;
  }

  isConnected(): boolean {
    return this.connected && !this.isTokenExpired();
  }

  /**
   * Check if the access token has expired
   */
  protected isTokenExpired(): boolean {
    if (!this.tokenExpiry) return true;
    // Add 60 second buffer
    return new Date() >= new Date(this.tokenExpiry.getTime() - 60000);
  }

  /**
   * Ensure the adapter is connected before making requests
   * @throws ClearinghouseError if not connected
   */
  protected ensureConnected(): void {
    if (!this.connected) {
      throw new ClearinghouseError(
        ClearinghouseErrorCode.CONNECTION_FAILED,
        'Not connected to clearinghouse. Call connect() first.'
      );
    }
  }

  /**
   * Refresh the access token if expired
   */
  protected async ensureValidToken(): Promise<void> {
    if (this.isTokenExpired()) {
      await this.refreshToken();
    }
  }

  /**
   * Refresh the access token - to be implemented by subclasses
   */
  protected abstract refreshToken(): Promise<void>;

  /**
   * Wrap an async operation with error handling, timing, and retry logic
   * @param operation - The async operation to execute
   * @param source - Source identifier for metadata
   * @param retryable - Whether to retry on failure
   * @returns Result with metadata
   */
  protected async executeWithRetry<T>(
    operation: () => Promise<T>,
    source: string,
    retryable = true
  ): Promise<ClearinghouseResult<T>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    const maxRetries = retryable ? (this.config.retry?.maxRetries || 3) : 0;
    const retryDelay = this.config.retry?.retryDelay || 1000;
    const backoffMultiplier = this.config.retry?.backoffMultiplier || 2;

    let lastError: ClearinghouseError | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          // Wait before retry with exponential backoff
          const delay = retryDelay * Math.pow(backoffMultiplier, attempt - 1);
          await this.sleep(delay);
          console.log(`[${this.name}] Retry attempt ${attempt} for ${source}`);
        }

        const data = await operation();
        return {
          success: true,
          data,
          metadata: {
            requestId,
            responseTime: Date.now() - startTime,
            clearinghouse: this.name,
          },
        };
      } catch (error) {
        lastError = this.normalizeError(error);

        // Don't retry if error is not retryable
        if (!lastError.isRetryable) {
          break;
        }
      }
    }

    return {
      success: false,
      error: {
        code: lastError?.code || ClearinghouseErrorCode.UNKNOWN_ERROR,
        message: lastError?.message || 'An unknown error occurred',
        details: lastError?.details,
      },
      metadata: {
        requestId,
        responseTime: Date.now() - startTime,
        clearinghouse: this.name,
      },
    };
  }

  /**
   * Normalize various error types to ClearinghouseError
   */
  protected normalizeError(error: unknown): ClearinghouseError {
    if (error instanceof ClearinghouseError) {
      return error;
    }

    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      if (message.includes('timeout') || message.includes('etimedout')) {
        return new ClearinghouseError(
          ClearinghouseErrorCode.TIMEOUT,
          error.message,
          undefined,
          true
        );
      }
      if (message.includes('401') || message.includes('unauthorized')) {
        return new ClearinghouseError(
          ClearinghouseErrorCode.AUTH_FAILED,
          error.message,
          undefined,
          true
        );
      }
      if (message.includes('404') || message.includes('not found')) {
        return new ClearinghouseError(
          ClearinghouseErrorCode.CLAIM_NOT_FOUND,
          error.message
        );
      }
      if (message.includes('429') || message.includes('rate limit') || message.includes('too many')) {
        return new ClearinghouseError(
          ClearinghouseErrorCode.RATE_LIMITED,
          error.message,
          undefined,
          true
        );
      }
      if (message.includes('503') || message.includes('service unavailable')) {
        return new ClearinghouseError(
          ClearinghouseErrorCode.SERVICE_UNAVAILABLE,
          error.message,
          undefined,
          true
        );
      }
      if (message.includes('econnrefused') || message.includes('network')) {
        return new ClearinghouseError(
          ClearinghouseErrorCode.CONNECTION_FAILED,
          error.message,
          undefined,
          true
        );
      }

      return new ClearinghouseError(
        ClearinghouseErrorCode.UNKNOWN_ERROR,
        error.message
      );
    }

    return new ClearinghouseError(
      ClearinghouseErrorCode.UNKNOWN_ERROR,
      'An unknown error occurred'
    );
  }

  /**
   * Generate a unique request ID for tracking
   */
  protected generateRequestId(): string {
    return `${this.type}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Implement rate limiting
   * @param minInterval - Minimum interval between requests in ms
   */
  protected async rateLimit(minInterval: number = 100): Promise<void> {
    const elapsed = Date.now() - this.lastRequestTime;
    if (elapsed < minInterval) {
      await this.sleep(minInterval - elapsed);
    }
    this.lastRequestTime = Date.now();
  }

  /**
   * Sleep helper
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Format date for API requests
   */
  protected formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Parse date from API response
   */
  protected parseDate(dateStr: string): Date {
    return new Date(dateStr);
  }

  // Abstract methods to be implemented by vendor-specific adapters
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract testConnection(): Promise<ClearinghouseResult<ConnectionTestResult>>;
  abstract submitClaims(claims: ClaimData[], options?: SubmissionOptions): Promise<ClearinghouseResult<SubmissionResult>>;
  abstract checkStatus(claimIds: string[], options?: StatusOptions): Promise<ClearinghouseResult<StatusResponse[]>>;
  abstract getRemittances(dateRange: DateRange, options?: RemittanceOptions): Promise<ClearinghouseResult<RemittanceAdvice[]>>;
  abstract verifyEligibility(patient: PatientInfo, payer: PayerInfo, options?: EligibilityOptions): Promise<ClearinghouseResult<EligibilityResponse>>;
}
