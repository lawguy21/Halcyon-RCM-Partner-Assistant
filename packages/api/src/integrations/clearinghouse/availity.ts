// @ts-nocheck
/**
 * Availity Adapter
 * Implementation of clearinghouse adapter for Availity APIs
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
  SubmissionError,
  ClaimSubmissionStatus,
} from './types.js';
import {
  BaseClearinghouseAdapter,
  ClearinghouseError,
  ClearinghouseErrorCode,
  type ClaimData,
  type SubmissionOptions,
  type StatusOptions,
  type EligibilityOptions,
  type RemittanceOptions,
} from './clearinghouse-adapter.js';

/**
 * Availity API endpoints
 */
const AVAILITY_ENDPOINTS = {
  // OAuth
  token: '/oauth2/v1/token',

  // Claims
  claims: '/claim-submission/v1/claims',
  claimStatus: '/claim-status/v1/claims',

  // Eligibility
  eligibility: '/eligibility/v1/coverages',

  // Remittance
  remittance: '/remittance-viewer/v1/remittances',

  // Connectivity
  health: '/health',
};

/**
 * Availity-specific configuration
 */
export interface AvailityConfig extends ClearinghouseConfig {
  /** Availity customer ID */
  customerId?: string;

  /** Organization ID within Availity */
  organizationId?: string;

  /** Use sandbox environment */
  useSandbox?: boolean;
}

/**
 * Availity API response types
 */
interface AvailityTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

interface AvailityClaimResponse {
  id: string;
  status: string;
  createdDate: string;
  submittedDate?: string;
  claimNumber?: string;
  patientControlNumber?: string;
  errors?: Array<{
    code: string;
    message: string;
    field?: string;
  }>;
  warnings?: Array<{
    code: string;
    message: string;
  }>;
}

interface AvailityEligibilityResponse {
  id: string;
  controlNumber: string;
  status: string;
  subscriber?: {
    memberId?: string;
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
  };
  plans?: Array<{
    planType?: string;
    planName?: string;
    status?: string;
    effectiveDate?: string;
    terminationDate?: string;
    benefits?: Array<{
      type?: string;
      description?: string;
      amount?: number;
      percent?: number;
      networkStatus?: string;
      coverageLevel?: string;
    }>;
  }>;
  errors?: Array<{
    code: string;
    message: string;
  }>;
}

interface AvailityStatusResponse {
  id: string;
  claimNumber?: string;
  patientControlNumber?: string;
  status?: string;
  statusCategory?: string;
  statusCode?: string;
  effectiveDate?: string;
  payerClaimNumber?: string;
  totalCharges?: number;
  paymentInfo?: {
    amount?: number;
    date?: string;
    checkNumber?: string;
  };
  errors?: Array<{
    code: string;
    message: string;
  }>;
}

/**
 * Availity Adapter
 *
 * Implements the clearinghouse adapter interface for Availity.
 * Uses OAuth 2.0 client credentials flow for authentication.
 *
 * API Documentation: https://developer.availity.com/
 *
 * Availity serves as a backup/secondary clearinghouse for multi-clearinghouse
 * setups, providing broad payer connectivity across commercial payers.
 */
export class AvailityAdapter extends BaseClearinghouseAdapter {
  readonly type = 'availity' as const;
  readonly name = 'Availity';

  private availityConfig: AvailityConfig;
  private baseUrl: string;

  constructor(config: AvailityConfig) {
    super(config);
    this.availityConfig = config;

    // Set base URL based on environment
    this.baseUrl = config.useSandbox
      ? 'https://api.sandbox.availity.com'
      : config.apiUrl || 'https://api.availity.com';
  }

  /**
   * Connect to Availity using OAuth 2.0 client credentials
   */
  async connect(): Promise<void> {
    try {
      await this.refreshToken();
      this.connected = true;
    } catch (error) {
      this.connected = false;

      if (error instanceof ClearinghouseError) {
        throw error;
      }

      throw new ClearinghouseError(
        ClearinghouseErrorCode.AUTH_FAILED,
        'Failed to authenticate with Availity',
        error
      );
    }
  }

  /**
   * Disconnect from Availity
   */
  async disconnect(): Promise<void> {
    this.connected = false;
    this.accessToken = undefined;
    this.tokenExpiry = undefined;
  }

  /**
   * Refresh OAuth access token
   */
  protected async refreshToken(): Promise<void> {
    const tokenUrl = this.availityConfig.tokenEndpoint || `${this.baseUrl}${AVAILITY_ENDPOINTS.token}`;

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', this.config.credentials.clientId);
    if (this.config.credentials.clientSecret) {
      params.append('client_secret', this.config.credentials.clientSecret);
    }
    params.append('scope', 'hipaa');

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new ClearinghouseError(
        ClearinghouseErrorCode.AUTH_FAILED,
        `OAuth token request failed: ${response.status} ${errorText}`
      );
    }

    const data: AvailityTokenResponse = await response.json();

    this.accessToken = data.access_token;
    this.tokenExpiry = new Date(Date.now() + data.expires_in * 1000);
  }

  /**
   * Test connection to Availity
   */
  async testConnection(): Promise<ClearinghouseResult<ConnectionTestResult>> {
    return this.executeWithRetry(async () => {
      const startTime = Date.now();

      // Try to get a token if not connected
      if (!this.isConnected()) {
        await this.connect();
      }

      // Make a simple health check call
      const response = await this.makeRequest('GET', AVAILITY_ENDPOINTS.health);

      const latencyMs = Date.now() - startTime;

      return {
        success: true,
        latencyMs,
        authenticated: true,
        testedAt: new Date(),
        serverInfo: 'Availity API',
      };
    }, 'testConnection', false);
  }

  /**
   * Submit claims to Availity
   */
  async submitClaims(
    claims: ClaimData[],
    options?: SubmissionOptions
  ): Promise<ClearinghouseResult<SubmissionResult>> {
    this.ensureConnected();

    return this.executeWithRetry(async () => {
      await this.ensureValidToken();

      const results: ClaimSubmissionStatus[] = [];
      const errors: SubmissionError[] = [];
      let acceptedCount = 0;
      let rejectedCount = 0;

      // Submit claims individually
      for (const claim of claims) {
        try {
          const payload = this.buildClaimPayload(claim);

          const response: AvailityClaimResponse = await this.makeRequest(
            'POST',
            AVAILITY_ENDPOINTS.claims,
            payload
          );

          const status: ClaimSubmissionStatus = {
            claimId: claim.id,
            clearinghouseClaimId: response.id,
            patientControlNumber: response.patientControlNumber || claim.patientControlNumber,
            status: this.mapAvailityStatus(response.status),
            errors: response.errors?.map((e) => ({
              code: e.code,
              message: e.message,
              field: e.field,
              severity: 'error' as const,
            })),
            warnings: response.warnings?.map((w) => ({
              code: w.code,
              message: w.message,
              severity: 'warning' as const,
            })),
          };

          if (status.status === 'accepted') {
            acceptedCount++;
          } else if (status.status === 'rejected') {
            rejectedCount++;
          }

          results.push(status);
        } catch (error) {
          rejectedCount++;
          const avError = this.normalizeError(error);
          errors.push({
            code: avError.code,
            message: avError.message,
            claimId: claim.id,
            severity: 'error',
          });
          results.push({
            claimId: claim.id,
            patientControlNumber: claim.patientControlNumber,
            status: 'rejected',
            errors: [{
              code: avError.code,
              message: avError.message,
              severity: 'error',
            }],
          });
        }

        // Rate limiting between claims
        await this.rateLimit(100);
      }

      return {
        transactionId: this.generateRequestId(),
        batchId: options?.batchId,
        status: this.determineOverallStatus(acceptedCount, rejectedCount, claims.length),
        submittedAt: new Date(),
        acceptedCount,
        rejectedCount,
        pendingCount: claims.length - acceptedCount - rejectedCount,
        totalCount: claims.length,
        errors,
        claimStatuses: results,
      };
    }, 'submitClaims');
  }

  /**
   * Check claim status with Availity
   */
  async checkStatus(
    claimIds: string[],
    options?: StatusOptions
  ): Promise<ClearinghouseResult<StatusResponse[]>> {
    this.ensureConnected();

    return this.executeWithRetry(async () => {
      await this.ensureValidToken();

      const results: StatusResponse[] = [];

      for (const claimId of claimIds) {
        try {
          const response: AvailityStatusResponse = await this.makeRequest(
            'GET',
            `${AVAILITY_ENDPOINTS.claimStatus}/${claimId}`
          );

          const status: StatusResponse = {
            claimId,
            clearinghouseClaimId: response.id,
            payerClaimId: response.payerClaimNumber,
            status: this.mapClaimStatusCode(response.statusCategory, response.statusCode),
            statusCategoryCode: response.statusCategory,
            statusCode: response.statusCode,
            statusDescription: response.status,
            statusDate: new Date(),
            effectiveDate: response.effectiveDate ? new Date(response.effectiveDate) : undefined,
            totalChargeAmount: response.totalCharges,
          };

          if (options?.includeAdjudication && response.paymentInfo) {
            status.adjudicationInfo = {
              billedAmount: response.totalCharges || 0,
              paidAmount: response.paymentInfo.amount,
              paymentReference: response.paymentInfo.checkNumber,
              paymentDate: response.paymentInfo.date
                ? new Date(response.paymentInfo.date)
                : undefined,
            };
          }

          if (response.errors?.length) {
            status.errors = response.errors.map((e) => ({
              code: e.code,
              message: e.message,
              severity: 'error' as const,
            }));
          }

          results.push(status);
        } catch (error) {
          const avError = this.normalizeError(error);
          results.push({
            claimId,
            status: 'unknown',
            statusDate: new Date(),
            errors: [{
              code: avError.code,
              message: avError.message,
              severity: 'error',
            }],
          });
        }

        await this.rateLimit(100);
      }

      return results;
    }, 'checkStatus');
  }

  /**
   * Download ERAs from Availity
   */
  async getRemittances(
    dateRange: DateRange,
    options?: RemittanceOptions
  ): Promise<ClearinghouseResult<RemittanceAdvice[]>> {
    this.ensureConnected();

    return this.executeWithRetry(async () => {
      await this.ensureValidToken();

      const params = new URLSearchParams({
        startDate: this.formatDate(dateRange.startDate),
        endDate: this.formatDate(dateRange.endDate),
      });

      if (options?.unprocessedOnly) {
        params.append('status', 'UNPROCESSED');
      }
      if (options?.limit) {
        params.append('limit', options.limit.toString());
      }

      const response = await this.makeRequest(
        'GET',
        `${AVAILITY_ENDPOINTS.remittance}?${params.toString()}`
      );

      const remittances: RemittanceAdvice[] = (response.remittances || []).map((r: any) => ({
        id: r.id || r.checkNumber || this.generateRequestId(),
        paymentNumber: r.checkNumber || r.eftNumber || '',
        paymentDate: new Date(r.paymentDate),
        paymentMethod: r.paymentMethod?.toLowerCase() === 'eft' ? 'eft' : 'check',
        totalPaymentAmount: parseFloat(r.totalAmount || '0'),
        payer: {
          name: r.payerName || '',
          payerId: r.payerId || '',
        },
        payee: {
          name: r.payeeName || '',
          npi: r.payeeNpi,
          taxId: r.payeeTaxId,
        },
        claimCount: r.claimCount || 0,
        productionDate: new Date(r.productionDate || r.paymentDate),
        processed: r.status === 'PROCESSED',
        claims: options?.includeClaimDetails ? r.claims?.map((c: any) => ({
          claimId: c.id,
          patientControlNumber: c.patientControlNumber,
          patientName: `${c.patientFirstName || ''} ${c.patientLastName || ''}`.trim(),
          dateOfService: new Date(c.serviceDate),
          billedAmount: parseFloat(c.billedAmount || '0'),
          paidAmount: parseFloat(c.paidAmount || '0'),
          patientResponsibility: parseFloat(c.patientResponsibility || '0'),
          adjustments: c.adjustments || [],
          status: parseFloat(c.paidAmount || '0') > 0 ? 'paid' : 'denied',
        })) : undefined,
      }));

      return remittances;
    }, 'getRemittances');
  }

  /**
   * Verify eligibility with Availity
   */
  async verifyEligibility(
    patient: PatientInfo,
    payer: PayerInfo,
    options?: EligibilityOptions
  ): Promise<ClearinghouseResult<EligibilityResponse>> {
    this.ensureConnected();

    return this.executeWithRetry(async () => {
      await this.ensureValidToken();

      const payload = this.buildEligibilityPayload(patient, payer, options);

      const response: AvailityEligibilityResponse = await this.makeRequest(
        'POST',
        AVAILITY_ENDPOINTS.eligibility,
        payload
      );

      return this.mapEligibilityResponse(response, patient);
    }, 'verifyEligibility');
  }

  /**
   * Make an authenticated API request
   */
  private async makeRequest(
    method: string,
    endpoint: string,
    body?: unknown
  ): Promise<any> {
    await this.rateLimit(50);

    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (this.availityConfig.customerId) {
      headers['X-Availity-Customer-ID'] = this.availityConfig.customerId;
    }

    const requestOptions: RequestInit = {
      method,
      headers,
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      requestOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, requestOptions);

    if (!response.ok) {
      const errorBody = await response.text();
      let errorData: any;
      try {
        errorData = JSON.parse(errorBody);
      } catch {
        errorData = { message: errorBody };
      }

      if (response.status === 401) {
        throw new ClearinghouseError(
          ClearinghouseErrorCode.AUTH_FAILED,
          'Authentication failed',
          errorData,
          true
        );
      }
      if (response.status === 429) {
        throw new ClearinghouseError(
          ClearinghouseErrorCode.RATE_LIMITED,
          'Rate limit exceeded',
          errorData,
          true
        );
      }
      if (response.status >= 500) {
        throw new ClearinghouseError(
          ClearinghouseErrorCode.SERVICE_UNAVAILABLE,
          `Service error: ${response.status}`,
          errorData,
          true
        );
      }

      throw new ClearinghouseError(
        ClearinghouseErrorCode.SUBMISSION_FAILED,
        `Request failed: ${response.status} - ${errorData.message || errorBody}`,
        errorData
      );
    }

    // Handle empty responses
    const text = await response.text();
    if (!text) {
      return {};
    }

    return JSON.parse(text);
  }

  /**
   * Build claim submission payload for Availity
   */
  private buildClaimPayload(claim: ClaimData): any {
    return {
      claimType: claim.claimType === 'institutional' ? 'I' : 'P',
      patientControlNumber: claim.patientControlNumber,
      payer: {
        payerId: claim.payer.payerId,
        name: claim.payer.name,
      },
      subscriber: {
        memberId: claim.subscriber?.memberId || claim.patient.memberId,
        firstName: claim.subscriber?.firstName || claim.patient.firstName,
        lastName: claim.subscriber?.lastName || claim.patient.lastName,
        dateOfBirth: this.formatDate(claim.subscriber?.dateOfBirth || claim.patient.dateOfBirth),
      },
      patient: claim.subscriber ? {
        firstName: claim.patient.firstName,
        lastName: claim.patient.lastName,
        dateOfBirth: this.formatDate(claim.patient.dateOfBirth),
        gender: claim.patient.gender,
        relationship: claim.subscriber.relationship,
      } : undefined,
      billingProvider: {
        npi: claim.billingProvider?.npi || claim.provider.npi,
        taxId: claim.billingProvider?.taxId || claim.provider.taxId,
        name: claim.billingProvider?.name || claim.provider.name,
        address: claim.provider.address,
      },
      renderingProvider: {
        npi: claim.provider.npi,
        name: claim.provider.name,
      },
      diagnoses: claim.diagnoses.map((d) => ({
        code: d.code,
        type: d.type,
        sequence: d.sequence,
      })),
      serviceLines: claim.serviceLines.map((sl) => ({
        lineNumber: sl.lineNumber,
        serviceDate: this.formatDate(sl.serviceDate),
        serviceDateEnd: sl.serviceDateEnd ? this.formatDate(sl.serviceDateEnd) : undefined,
        procedureCode: sl.procedureCode,
        modifiers: sl.modifiers,
        diagnosisPointers: sl.diagnosisPointers,
        chargeAmount: sl.chargeAmount,
        units: sl.units,
        placeOfService: sl.placeOfService,
      })),
      totalCharges: claim.totalCharges,
      priorAuthNumber: claim.priorAuthNumber,
    };
  }

  /**
   * Build eligibility request payload for Availity
   */
  private buildEligibilityPayload(
    patient: PatientInfo,
    payer: PayerInfo,
    options?: EligibilityOptions
  ): any {
    return {
      payerId: payer.payerId,
      providerNpi: options?.providerNpi,
      subscriber: {
        memberId: patient.memberId,
        firstName: patient.firstName,
        lastName: patient.lastName,
        dateOfBirth: this.formatDate(patient.dateOfBirth),
        gender: patient.gender,
      },
      serviceDate: options?.dateOfService
        ? this.formatDate(options.dateOfService)
        : this.formatDate(new Date()),
      serviceType: options?.serviceTypeCode || '30', // Health benefit plan coverage
    };
  }

  /**
   * Map Availity eligibility response to standard format
   */
  private mapEligibilityResponse(
    response: AvailityEligibilityResponse,
    patient: PatientInfo
  ): EligibilityResponse {
    const activePlan = response.plans?.find(
      (p) => p.status?.toLowerCase() === 'active'
    );

    const eligibility: EligibilityResponse = {
      active: !!activePlan,
      verificationDate: new Date(),
      traceNumber: response.controlNumber,
      isRealTime: true,
    };

    // Map patient info
    if (response.subscriber) {
      eligibility.patientInfo = {
        firstName: response.subscriber.firstName,
        lastName: response.subscriber.lastName,
        dateOfBirth: response.subscriber.dateOfBirth
          ? new Date(response.subscriber.dateOfBirth)
          : undefined,
        memberId: response.subscriber.memberId,
      };
    }

    // Map coverage details
    if (activePlan) {
      eligibility.coverageDetails = {
        planName: activePlan.planName,
        planType: activePlan.planType,
        effectiveDate: activePlan.effectiveDate
          ? new Date(activePlan.effectiveDate)
          : undefined,
        terminationDate: activePlan.terminationDate
          ? new Date(activePlan.terminationDate)
          : undefined,
      };

      eligibility.effectiveDate = activePlan.effectiveDate
        ? new Date(activePlan.effectiveDate)
        : undefined;
      eligibility.terminationDate = activePlan.terminationDate
        ? new Date(activePlan.terminationDate)
        : undefined;

      // Map benefits
      if (activePlan.benefits?.length) {
        eligibility.deductible = this.extractDeductibleFromBenefits(activePlan.benefits);
        eligibility.copay = this.extractCopayFromBenefits(activePlan.benefits);
        eligibility.coinsurance = this.extractCoinsuranceFromBenefits(activePlan.benefits);
        eligibility.outOfPocket = this.extractOOPFromBenefits(activePlan.benefits);
      }
    }

    // Map errors
    if (response.errors?.length) {
      eligibility.errors = response.errors.map((e) => ({
        code: e.code,
        message: e.message,
        severity: 'error' as const,
      }));
      eligibility.active = false;
    }

    return eligibility;
  }

  /**
   * Extract deductible info from benefits array
   */
  private extractDeductibleFromBenefits(benefits: any[]): EligibilityResponse['deductible'] {
    const deductibles = benefits.filter((b) =>
      b.type?.toLowerCase().includes('deductible')
    );

    if (!deductibles.length) return undefined;

    const result: EligibilityResponse['deductible'] = {};

    for (const ded of deductibles) {
      const amount = ded.amount || 0;
      const isIndividual = ded.coverageLevel?.toLowerCase().includes('individual');
      const isInNetwork = ded.networkStatus?.toLowerCase() === 'in';

      if (isIndividual) {
        result.individual = result.individual || {};
        if (isInNetwork) {
          result.individual.inNetwork = amount;
        } else {
          result.individual.outOfNetwork = amount;
        }
      } else {
        result.family = result.family || {};
        if (isInNetwork) {
          result.family.inNetwork = amount;
        } else {
          result.family.outOfNetwork = amount;
        }
      }
    }

    return Object.keys(result).length ? result : undefined;
  }

  /**
   * Extract copay info from benefits array
   */
  private extractCopayFromBenefits(benefits: any[]): EligibilityResponse['copay'] {
    const copays = benefits.filter((b) =>
      b.type?.toLowerCase().includes('copay') ||
      b.type?.toLowerCase().includes('co-pay')
    );

    if (!copays.length) return undefined;

    const result: EligibilityResponse['copay'] = {};

    for (const cop of copays) {
      const amount = cop.amount || 0;
      const desc = (cop.description || '').toLowerCase();

      if (desc.includes('primary') || desc.includes('office')) {
        result.primaryCare = amount;
      } else if (desc.includes('specialist')) {
        result.specialist = amount;
      } else if (desc.includes('emergency')) {
        result.emergencyRoom = amount;
      } else if (desc.includes('urgent')) {
        result.urgentCare = amount;
      }
    }

    return Object.keys(result).length ? result : undefined;
  }

  /**
   * Extract coinsurance info from benefits array
   */
  private extractCoinsuranceFromBenefits(
    benefits: any[]
  ): EligibilityResponse['coinsurance'] {
    const coinsurance = benefits.filter((b) =>
      b.type?.toLowerCase().includes('coinsurance')
    );

    if (!coinsurance.length) return undefined;

    const result: EligibilityResponse['coinsurance'] = {};

    for (const coin of coinsurance) {
      const percent = coin.percent || 0;
      const isInNetwork = coin.networkStatus?.toLowerCase() === 'in';

      if (isInNetwork) {
        result.inNetwork = percent * 100;
      } else {
        result.outOfNetwork = percent * 100;
      }
    }

    return Object.keys(result).length ? result : undefined;
  }

  /**
   * Extract out-of-pocket info from benefits array
   */
  private extractOOPFromBenefits(
    benefits: any[]
  ): EligibilityResponse['outOfPocket'] {
    const oop = benefits.filter((b) =>
      b.type?.toLowerCase().includes('out-of-pocket') ||
      b.type?.toLowerCase().includes('out of pocket')
    );

    if (!oop.length) return undefined;

    const result: EligibilityResponse['outOfPocket'] = {};

    for (const o of oop) {
      const amount = o.amount || 0;
      const isIndividual = o.coverageLevel?.toLowerCase().includes('individual');
      const isInNetwork = o.networkStatus?.toLowerCase() === 'in';

      if (isIndividual) {
        result.individual = result.individual || {};
        if (isInNetwork) {
          result.individual.inNetwork = amount;
        } else {
          result.individual.outOfNetwork = amount;
        }
      } else {
        result.family = result.family || {};
        if (isInNetwork) {
          result.family.inNetwork = amount;
        } else {
          result.family.outOfNetwork = amount;
        }
      }
    }

    return Object.keys(result).length ? result : undefined;
  }

  /**
   * Map Availity status to standard status
   */
  private mapAvailityStatus(status?: string): 'accepted' | 'rejected' | 'pending' {
    switch (status?.toUpperCase()) {
      case 'ACCEPTED':
      case 'SUBMITTED':
        return 'accepted';
      case 'REJECTED':
      case 'FAILED':
        return 'rejected';
      default:
        return 'pending';
    }
  }

  /**
   * Map claim status codes to standard status
   */
  private mapClaimStatusCode(
    categoryCode?: string,
    statusCode?: string
  ): StatusResponse['status'] {
    // Use similar mapping to Change Healthcare
    switch (categoryCode?.toUpperCase()) {
      case 'A0':
      case 'A1':
        return 'acknowledged';
      case 'A2':
        return 'in_review';
      case 'A3':
      case 'A4':
      case 'A7':
        return 'rejected';
      case 'F0':
        return 'paid';
      case 'F1':
        return 'denied';
      case 'F2':
        return 'adjudicated';
      case 'P0':
      case 'P1':
      case 'P2':
      case 'P3':
        return 'pending';
      case 'R0':
      case 'R1':
        return 'additional_info';
      default:
        return 'unknown';
    }
  }

  /**
   * Determine overall batch submission status
   */
  private determineOverallStatus(
    accepted: number,
    rejected: number,
    total: number
  ): SubmissionResult['status'] {
    if (accepted === total) return 'success';
    if (rejected === total) return 'failed';
    if (accepted > 0) return 'partial';
    return 'pending';
  }
}

/**
 * Factory function to create an Availity adapter
 */
export function createAvailityAdapter(config: AvailityConfig): AvailityAdapter {
  return new AvailityAdapter(config);
}
