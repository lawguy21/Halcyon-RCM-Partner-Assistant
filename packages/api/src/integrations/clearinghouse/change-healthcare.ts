/**
 * Change Healthcare Adapter
 * Implementation of clearinghouse adapter for Change Healthcare APIs
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
 * Change Healthcare API endpoints
 */
const CHANGE_HEALTHCARE_ENDPOINTS = {
  // OAuth
  token: '/oauth2/token',

  // Medical Network APIs
  professionalClaims: '/medicalnetwork/professionalclaims/v3',
  institutionalClaims: '/medicalnetwork/institutionalclaims/v1',
  claimStatus: '/medicalnetwork/claimstatus/v2',
  eligibility: '/medicalnetwork/eligibility/v3',
  remittanceAdvice: '/medicalnetwork/remittance/v1',

  // Connectivity test
  connectivity: '/medicalnetwork/connectivity/v1',
};

/**
 * Change Healthcare-specific configuration
 */
export interface ChangeHealthcareConfig extends ClearinghouseConfig {
  /** Change Healthcare customer ID */
  customerId?: string;

  /** Billing provider ID */
  billingProviderId?: string;

  /** Enable real-time vs batch mode */
  realTimeMode?: boolean;

  /** Sandbox vs production URLs */
  useSandbox?: boolean;
}

/**
 * Change Healthcare API response types
 */
interface CHAccessTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

interface CHClaimSubmissionResponse {
  meta?: {
    traceId?: string;
    applicationMode?: string;
  };
  claimReference?: {
    correlationId: string;
    patientControlNumber?: string;
    tradingPartnerServiceId?: string;
  };
  status?: string;
  errors?: CHError[];
  editStatus?: 'accepted' | 'rejected' | 'pending';
}

interface CHError {
  code: string;
  description: string;
  field?: string;
  location?: string;
}

interface CHEligibilityResponse {
  meta?: {
    traceId?: string;
  };
  controlNumber?: string;
  tradingPartnerServiceId?: string;
  provider?: {
    providerName?: string;
    npi?: string;
  };
  subscriber?: {
    memberId?: string;
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    gender?: string;
  };
  dependent?: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    relationshipCode?: string;
  };
  planStatus?: Array<{
    statusCode?: string;
    status?: string;
    planDetails?: string;
    serviceTypeCodes?: string[];
  }>;
  benefitsInformation?: Array<{
    code?: string;
    name?: string;
    coverageLevelCode?: string;
    serviceTypeCodes?: string[];
    benefitAmount?: string;
    benefitPercent?: string;
    timeQualifierCode?: string;
    timePeriodQualifier?: string;
    quantityQualifier?: string;
    quantity?: string;
    inPlanNetworkIndicatorCode?: string;
    additionalInformation?: Array<{
      description?: string;
    }>;
  }>;
  errors?: CHError[];
}

interface CHClaimStatusResponse {
  meta?: {
    traceId?: string;
  };
  controlNumber?: string;
  claimStatus?: {
    statusCategoryCode?: string;
    statusCategoryCodeValue?: string;
    statusCode?: string;
    statusCodeValue?: string;
    effectiveDate?: string;
    totalChargeAmount?: string;
    paymentAmount?: string;
    paymentDate?: string;
    checkNumber?: string;
  };
  payerClaimControlNumber?: string;
  institutionClaimControlNumber?: string;
  errors?: CHError[];
}

/**
 * Change Healthcare Adapter
 *
 * Implements the clearinghouse adapter interface for Change Healthcare.
 * Uses OAuth 2.0 client credentials flow for authentication.
 *
 * API Documentation: https://developers.changehealthcare.com/
 *
 * Required scopes:
 * - medicalnetwork/professionalclaims.write
 * - medicalnetwork/claimstatus.read
 * - medicalnetwork/eligibility.read
 * - medicalnetwork/remittance.read
 */
export class ChangeHealthcareAdapter extends BaseClearinghouseAdapter {
  readonly type = 'change_healthcare' as const;
  readonly name = 'Change Healthcare';

  private chConfig: ChangeHealthcareConfig;
  private baseUrl: string;

  constructor(config: ChangeHealthcareConfig) {
    super(config);
    this.chConfig = config;

    // Set base URL based on environment
    this.baseUrl = config.useSandbox
      ? 'https://sandbox.apigw.changehealthcare.com'
      : config.apiUrl || 'https://apigw.changehealthcare.com';
  }

  /**
   * Connect to Change Healthcare using OAuth 2.0 client credentials
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
        'Failed to authenticate with Change Healthcare',
        error
      );
    }
  }

  /**
   * Disconnect from Change Healthcare
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
    const tokenUrl = this.chConfig.tokenEndpoint || `${this.baseUrl}${CHANGE_HEALTHCARE_ENDPOINTS.token}`;

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', this.config.credentials.clientId);
    if (this.config.credentials.clientSecret) {
      params.append('client_secret', this.config.credentials.clientSecret);
    }

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

    const data: CHAccessTokenResponse = await response.json();

    this.accessToken = data.access_token;
    this.tokenExpiry = new Date(Date.now() + data.expires_in * 1000);
  }

  /**
   * Test connection to Change Healthcare
   */
  async testConnection(): Promise<ClearinghouseResult<ConnectionTestResult>> {
    return this.executeWithRetry(async () => {
      const startTime = Date.now();

      // Try to get a token if not connected
      if (!this.isConnected()) {
        await this.connect();
      }

      // Make a simple API call to verify connectivity
      const response = await this.makeRequest('GET', CHANGE_HEALTHCARE_ENDPOINTS.connectivity);

      const latencyMs = Date.now() - startTime;

      return {
        success: true,
        latencyMs,
        authenticated: true,
        testedAt: new Date(),
        serverInfo: response?.meta?.applicationMode || 'Change Healthcare API',
      };
    }, 'testConnection', false);
  }

  /**
   * Submit claims to Change Healthcare
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

      // Change Healthcare typically processes claims individually
      for (const claim of claims) {
        try {
          const payload = this.buildClaimPayload(claim);
          const endpoint = claim.claimType === 'institutional'
            ? CHANGE_HEALTHCARE_ENDPOINTS.institutionalClaims
            : CHANGE_HEALTHCARE_ENDPOINTS.professionalClaims;

          const response: CHClaimSubmissionResponse = await this.makeRequest('POST', endpoint, payload);

          const status: ClaimSubmissionStatus = {
            claimId: claim.id,
            clearinghouseClaimId: response.claimReference?.correlationId,
            patientControlNumber: claim.patientControlNumber,
            status: this.mapEditStatus(response.editStatus),
            errors: response.errors?.map((e) => this.mapCHError(e)),
            warnings: [],
          };

          if (status.status === 'accepted') {
            acceptedCount++;
          } else if (status.status === 'rejected') {
            rejectedCount++;
          }

          results.push(status);
        } catch (error) {
          rejectedCount++;
          const chError = this.normalizeError(error);
          errors.push({
            code: chError.code,
            message: chError.message,
            claimId: claim.id,
            severity: 'error',
          });
          results.push({
            claimId: claim.id,
            patientControlNumber: claim.patientControlNumber,
            status: 'rejected',
            errors: [{
              code: chError.code,
              message: chError.message,
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
   * Check claim status with Change Healthcare
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
          const payload = this.buildStatusPayload(claimId);
          const response: CHClaimStatusResponse = await this.makeRequest(
            'POST',
            CHANGE_HEALTHCARE_ENDPOINTS.claimStatus,
            payload
          );

          const status: StatusResponse = {
            claimId,
            clearinghouseClaimId: response.controlNumber,
            payerClaimId: response.payerClaimControlNumber,
            status: this.mapClaimStatus(response.claimStatus?.statusCategoryCode),
            statusCategoryCode: response.claimStatus?.statusCategoryCode,
            statusCode: response.claimStatus?.statusCode,
            statusDescription: response.claimStatus?.statusCategoryCodeValue,
            statusDate: new Date(),
            effectiveDate: response.claimStatus?.effectiveDate
              ? new Date(response.claimStatus.effectiveDate)
              : undefined,
            totalChargeAmount: response.claimStatus?.totalChargeAmount
              ? parseFloat(response.claimStatus.totalChargeAmount)
              : undefined,
          };

          if (options?.includeAdjudication && response.claimStatus?.paymentAmount) {
            status.adjudicationInfo = {
              billedAmount: parseFloat(response.claimStatus.totalChargeAmount || '0'),
              paidAmount: parseFloat(response.claimStatus.paymentAmount),
              paymentReference: response.claimStatus.checkNumber,
              paymentDate: response.claimStatus.paymentDate
                ? new Date(response.claimStatus.paymentDate)
                : undefined,
            };
          }

          if (response.errors?.length) {
            status.errors = response.errors.map((e) => this.mapCHError(e));
          }

          results.push(status);
        } catch (error) {
          const chError = this.normalizeError(error);
          results.push({
            claimId,
            status: 'unknown',
            statusDate: new Date(),
            errors: [{
              code: chError.code,
              message: chError.message,
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
   * Download ERAs from Change Healthcare
   */
  async getRemittances(
    dateRange: DateRange,
    options?: RemittanceOptions
  ): Promise<ClearinghouseResult<RemittanceAdvice[]>> {
    this.ensureConnected();

    return this.executeWithRetry(async () => {
      await this.ensureValidToken();

      const payload = {
        startDate: this.formatDate(dateRange.startDate),
        endDate: this.formatDate(dateRange.endDate),
        unprocessedOnly: options?.unprocessedOnly ?? true,
        includeDetails: options?.includeClaimDetails ?? true,
        limit: options?.limit ?? 100,
      };

      const response = await this.makeRequest(
        'POST',
        CHANGE_HEALTHCARE_ENDPOINTS.remittanceAdvice,
        payload
      );

      // Map response to RemittanceAdvice array
      const remittances: RemittanceAdvice[] = (response.remittances || []).map((r: any) => ({
        id: r.checkNumber || r.eftTraceNumber || this.generateRequestId(),
        paymentNumber: r.checkNumber || r.eftTraceNumber || '',
        paymentDate: new Date(r.paymentDate || r.checkDate),
        paymentMethod: r.paymentMethod === 'ACH' ? 'eft' : 'check',
        totalPaymentAmount: parseFloat(r.paymentAmount || '0'),
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
        processed: false,
        claims: options?.includeClaimDetails ? r.claims?.map((c: any) => ({
          claimId: c.claimId,
          patientControlNumber: c.patientControlNumber,
          patientName: c.patientName,
          dateOfService: new Date(c.dateOfService),
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
   * Verify eligibility with Change Healthcare
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

      const response: CHEligibilityResponse = await this.makeRequest(
        'POST',
        CHANGE_HEALTHCARE_ENDPOINTS.eligibility,
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

    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Add custom headers if needed
    if (this.chConfig.customerId) {
      headers['X-Customer-ID'] = this.chConfig.customerId;
    }

    const options: RequestInit = {
      method,
      headers,
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

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

    return response.json();
  }

  /**
   * Build claim submission payload
   */
  private buildClaimPayload(claim: ClaimData): any {
    return {
      controlNumber: claim.patientControlNumber,
      tradingPartnerServiceId: claim.payer.payerId,
      submitter: {
        organizationName: this.chConfig.billingProviderId || claim.billingProvider?.name || claim.provider.name,
        contactInformation: {},
      },
      receiver: {
        organizationName: claim.payer.name,
      },
      subscriber: {
        memberId: claim.subscriber?.memberId || claim.patient.memberId,
        firstName: claim.subscriber?.firstName || claim.patient.firstName,
        lastName: claim.subscriber?.lastName || claim.patient.lastName,
        dateOfBirth: this.formatDate(claim.subscriber?.dateOfBirth || claim.patient.dateOfBirth),
        address: claim.patient.address,
      },
      dependent: claim.subscriber ? {
        firstName: claim.patient.firstName,
        lastName: claim.patient.lastName,
        dateOfBirth: this.formatDate(claim.patient.dateOfBirth),
        relationshipCode: claim.subscriber.relationship,
      } : undefined,
      providers: [
        {
          providerType: 'BillingProvider',
          npi: claim.billingProvider?.npi || claim.provider.npi,
          employerId: claim.billingProvider?.taxId || claim.provider.taxId,
          organizationName: claim.billingProvider?.name || claim.provider.name,
          address: claim.provider.address,
        },
        {
          providerType: 'RenderingProvider',
          npi: claim.provider.npi,
          organizationName: claim.provider.name,
        },
      ],
      claimInformation: {
        patientControlNumber: claim.patientControlNumber,
        claimFilingCode: this.getClaimFilingCode(claim.payer.payerId),
        placeOfServiceCode: claim.serviceLines[0]?.placeOfService || '11',
        claimFrequencyCode: '1', // Original claim
        claimChargeAmount: claim.totalCharges.toFixed(2),
        signatureIndicator: 'Y',
        planParticipationCode: 'A',
        releaseInformationCode: 'Y',
        healthCareCodeInformation: claim.diagnoses.map((d, idx) => ({
          diagnosisTypeCode: idx === 0 ? 'ABK' : 'ABF', // Principal vs Other
          diagnosisCode: d.code.replace('.', ''),
        })),
        serviceLines: claim.serviceLines.map((sl) => ({
          serviceDate: this.formatDate(sl.serviceDate),
          serviceDateEnd: sl.serviceDateEnd ? this.formatDate(sl.serviceDateEnd) : undefined,
          professionalService: {
            procedureIdentifier: 'HC',
            procedureCode: sl.procedureCode,
            procedureModifiers: sl.modifiers || [],
            lineItemChargeAmount: sl.chargeAmount.toFixed(2),
            measurementUnit: 'UN',
            serviceUnitCount: sl.units.toString(),
            compositeDiagnosisCodePointers: {
              diagnosisCodePointers: sl.diagnosisPointers.map((p) => p.toString()),
            },
          },
        })),
      },
      payerAddress: {
        address1: '',
        city: '',
        state: '',
        postalCode: '',
      },
    };
  }

  /**
   * Build claim status payload
   */
  private buildStatusPayload(claimId: string): any {
    return {
      controlNumber: claimId,
      tradingPartnerServiceId: this.config.credentials.receiverId,
      providers: [{
        providerType: 'BillingProvider',
        npi: this.chConfig.billingProviderId,
      }],
      subscriber: {
        memberId: '',
      },
    };
  }

  /**
   * Build eligibility request payload
   */
  private buildEligibilityPayload(
    patient: PatientInfo,
    payer: PayerInfo,
    options?: EligibilityOptions
  ): any {
    return {
      controlNumber: this.generateRequestId().substring(0, 9),
      tradingPartnerServiceId: payer.payerId,
      provider: {
        organizationName: '',
        npi: options?.providerNpi || this.chConfig.billingProviderId,
      },
      subscriber: {
        memberId: patient.memberId || '',
        firstName: patient.firstName,
        lastName: patient.lastName,
        dateOfBirth: this.formatDate(patient.dateOfBirth),
        gender: patient.gender || 'U',
      },
      encounter: options?.dateOfService ? {
        dateOfService: this.formatDate(options.dateOfService),
        serviceTypeCodes: options.serviceTypeCode ? [options.serviceTypeCode] : ['30'], // Health benefit plan coverage
      } : undefined,
    };
  }

  /**
   * Map eligibility response to standard format
   */
  private mapEligibilityResponse(
    response: CHEligibilityResponse,
    patient: PatientInfo
  ): EligibilityResponse {
    const isActive = response.planStatus?.some(
      (p) => p.statusCode === '1' || p.status?.toLowerCase().includes('active')
    ) ?? false;

    const eligibility: EligibilityResponse = {
      active: isActive,
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
    if (response.planStatus?.length) {
      eligibility.coverageDetails = {
        planName: response.planStatus[0].planDetails,
        serviceTypeCodes: response.planStatus[0].serviceTypeCodes,
      };

      // Check for effective/termination dates in benefits info
      const dateInfo = response.benefitsInformation?.find(
        (b) => b.code === 'W' || b.timeQualifierCode
      );
      if (dateInfo) {
        // Would parse dates from benefits info
      }
    }

    // Map benefits information
    if (response.benefitsInformation?.length) {
      eligibility.deductible = this.extractDeductibleInfo(response.benefitsInformation);
      eligibility.copay = this.extractCopayInfo(response.benefitsInformation);
      eligibility.coinsurance = this.extractCoinsuranceInfo(response.benefitsInformation);
      eligibility.outOfPocket = this.extractOutOfPocketInfo(response.benefitsInformation);
    }

    // Map errors
    if (response.errors?.length) {
      eligibility.errors = response.errors.map((e) => this.mapCHError(e));
      eligibility.active = false;
    }

    return eligibility;
  }

  /**
   * Extract deductible information from benefits
   */
  private extractDeductibleInfo(benefits: CHEligibilityResponse['benefitsInformation']): EligibilityResponse['deductible'] {
    if (!benefits) return undefined;

    const deductibles = benefits.filter((b) => b.code === 'C'); // Deductible

    if (!deductibles.length) return undefined;

    const result: EligibilityResponse['deductible'] = {};

    for (const ded of deductibles) {
      const amount = parseFloat(ded.benefitAmount || '0');
      const isIndividual = ded.coverageLevelCode === 'IND';
      const isInNetwork = ded.inPlanNetworkIndicatorCode === 'Y';

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
   * Extract copay information from benefits
   */
  private extractCopayInfo(benefits: CHEligibilityResponse['benefitsInformation']): EligibilityResponse['copay'] {
    if (!benefits) return undefined;

    const copays = benefits.filter((b) => b.code === 'B'); // Co-Payment

    if (!copays.length) return undefined;

    const result: EligibilityResponse['copay'] = {};

    for (const cop of copays) {
      const amount = parseFloat(cop.benefitAmount || '0');
      const serviceType = cop.serviceTypeCodes?.[0];

      // Map service type codes to copay types
      switch (serviceType) {
        case '98': // Professional (Physician) Visit - Office
          result.primaryCare = amount;
          break;
        case '3': // Consultation
          result.specialist = amount;
          break;
        case '86': // Emergency Room
          result.emergencyRoom = amount;
          break;
        case '88': // Pharmacy
          result.genericDrug = amount;
          break;
        case '47': // Hospital
          result.inpatient = amount;
          break;
        default:
          // Store in generic outpatient if not matched
          if (!result.outpatient) result.outpatient = amount;
      }
    }

    return Object.keys(result).length ? result : undefined;
  }

  /**
   * Extract coinsurance information from benefits
   */
  private extractCoinsuranceInfo(
    benefits: CHEligibilityResponse['benefitsInformation']
  ): EligibilityResponse['coinsurance'] {
    if (!benefits) return undefined;

    const coinsurance = benefits.filter((b) => b.code === 'A'); // Co-Insurance

    if (!coinsurance.length) return undefined;

    const result: EligibilityResponse['coinsurance'] = {};

    for (const coin of coinsurance) {
      const percent = parseFloat(coin.benefitPercent || '0') * 100;
      const isInNetwork = coin.inPlanNetworkIndicatorCode === 'Y';

      if (isInNetwork) {
        result.inNetwork = percent;
      } else {
        result.outOfNetwork = percent;
      }
    }

    return Object.keys(result).length ? result : undefined;
  }

  /**
   * Extract out-of-pocket information from benefits
   */
  private extractOutOfPocketInfo(
    benefits: CHEligibilityResponse['benefitsInformation']
  ): EligibilityResponse['outOfPocket'] {
    if (!benefits) return undefined;

    const oop = benefits.filter((b) => b.code === 'G'); // Out of Pocket (Stop Loss)

    if (!oop.length) return undefined;

    const result: EligibilityResponse['outOfPocket'] = {};

    for (const o of oop) {
      const amount = parseFloat(o.benefitAmount || '0');
      const isIndividual = o.coverageLevelCode === 'IND';
      const isInNetwork = o.inPlanNetworkIndicatorCode === 'Y';

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
   * Map Change Healthcare error to standard error format
   */
  private mapCHError(error: CHError): SubmissionError {
    return {
      code: error.code,
      message: error.description,
      field: error.field,
      location: error.location,
      severity: 'error',
    };
  }

  /**
   * Map edit status to standard status
   */
  private mapEditStatus(status?: string): 'accepted' | 'rejected' | 'pending' {
    switch (status?.toLowerCase()) {
      case 'accepted':
      case 'a':
        return 'accepted';
      case 'rejected':
      case 'r':
        return 'rejected';
      default:
        return 'pending';
    }
  }

  /**
   * Map claim status category code to standard status
   */
  private mapClaimStatus(categoryCode?: string): StatusResponse['status'] {
    switch (categoryCode) {
      case 'A0': // Acknowledgement/Receipt
      case 'A1': // Acknowledgement/Acceptance
        return 'acknowledged';
      case 'A2': // Acknowledgement/Acceptance into processing
        return 'in_review';
      case 'A3': // Acknowledgement/Returned as unprocessable claim
      case 'A4': // Acknowledgement/Not Found
      case 'A7': // Acknowledgement/Rejected
        return 'rejected';
      case 'F0': // Finalized/Payment
        return 'paid';
      case 'F1': // Finalized/Denial
        return 'denied';
      case 'F2': // Finalized/Adjustment
        return 'adjudicated';
      case 'P0': // Pending/In Process
      case 'P1': // Pending/Payer Review
      case 'P2': // Pending/Provider Requested Information
      case 'P3': // Pending/Payer Administrative
        return 'pending';
      case 'R0': // Request for additional information
      case 'R1': // Request for additional information - claims not found
        return 'additional_info';
      case 'E0': // Response not possible - error on request
      case 'E1': // Response not possible - data not accessible
        return 'unknown';
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

  /**
   * Get claim filing indicator code based on payer
   */
  private getClaimFilingCode(payerId: string): string {
    // Would typically look up from payer database
    // Common codes: MC=Medicare, MA=Medicaid, BL=Blue Cross, etc.
    if (payerId.includes('MEDICARE')) return 'MC';
    if (payerId.includes('MEDICAID')) return 'MA';
    return 'CI'; // Commercial Insurance - Other
  }
}

/**
 * Factory function to create a Change Healthcare adapter
 */
export function createChangeHealthcareAdapter(config: ChangeHealthcareConfig): ChangeHealthcareAdapter {
  return new ChangeHealthcareAdapter(config);
}
