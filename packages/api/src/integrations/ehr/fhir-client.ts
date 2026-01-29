/**
 * FHIR R4 Client
 * Generic FHIR client for interacting with FHIR R4 compliant servers
 */

import type {
  EHRPatient,
  EHREncounter,
  EHRInsurance,
  EHRCoverage,
  EHRAuthConfig,
} from './types.js';
import { EHRError, EHRErrorCode } from './ehr-adapter.js';

/**
 * FHIR Resource Types
 */
export type FHIRResourceType = 'Patient' | 'Encounter' | 'Coverage' | 'ExplanationOfBenefit' | 'Organization';

/**
 * FHIR Bundle response structure
 */
export interface FHIRBundle<T = unknown> {
  resourceType: 'Bundle';
  type: 'searchset' | 'batch' | 'transaction';
  total?: number;
  link?: Array<{
    relation: string;
    url: string;
  }>;
  entry?: Array<{
    fullUrl?: string;
    resource: T;
    search?: {
      mode: 'match' | 'include';
    };
  }>;
}

/**
 * FHIR Patient resource (R4)
 */
export interface FHIRPatient {
  resourceType: 'Patient';
  id: string;
  identifier?: Array<{
    use?: string;
    type?: {
      coding?: Array<{ system?: string; code?: string }>;
    };
    system?: string;
    value?: string;
  }>;
  active?: boolean;
  name?: Array<{
    use?: string;
    family?: string;
    given?: string[];
    prefix?: string[];
    suffix?: string[];
  }>;
  gender?: 'male' | 'female' | 'other' | 'unknown';
  birthDate?: string;
  deceasedBoolean?: boolean;
  deceasedDateTime?: string;
  address?: Array<{
    use?: string;
    line?: string[];
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  }>;
  telecom?: Array<{
    system?: 'phone' | 'email' | 'fax' | 'pager' | 'sms';
    value?: string;
    use?: 'home' | 'work' | 'temp' | 'old' | 'mobile';
  }>;
}

/**
 * FHIR Encounter resource (R4)
 */
export interface FHIREncounter {
  resourceType: 'Encounter';
  id: string;
  identifier?: Array<{
    system?: string;
    value?: string;
  }>;
  status: 'planned' | 'arrived' | 'triaged' | 'in-progress' | 'onleave' | 'finished' | 'cancelled' | 'entered-in-error' | 'unknown';
  class: {
    system?: string;
    code?: string;
    display?: string;
  };
  type?: Array<{
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
  }>;
  subject: {
    reference?: string;
    display?: string;
  };
  participant?: Array<{
    type?: Array<{
      coding?: Array<{
        system?: string;
        code?: string;
      }>;
    }>;
    individual?: {
      reference?: string;
      display?: string;
    };
  }>;
  period?: {
    start?: string;
    end?: string;
  };
  hospitalization?: {
    admitSource?: {
      coding?: Array<{
        system?: string;
        code?: string;
      }>;
    };
    dischargeDisposition?: {
      coding?: Array<{
        system?: string;
        code?: string;
        display?: string;
      }>;
    };
  };
  location?: Array<{
    location: {
      reference?: string;
      display?: string;
    };
  }>;
  diagnosis?: Array<{
    condition: {
      reference?: string;
    };
    use?: {
      coding?: Array<{
        system?: string;
        code?: string;
      }>;
    };
    rank?: number;
  }>;
}

/**
 * FHIR Coverage resource (R4)
 */
export interface FHIRCoverage {
  resourceType: 'Coverage';
  id: string;
  identifier?: Array<{
    system?: string;
    value?: string;
  }>;
  status: 'active' | 'cancelled' | 'draft' | 'entered-in-error';
  type?: {
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
  };
  subscriber?: {
    reference?: string;
  };
  subscriberId?: string;
  beneficiary: {
    reference?: string;
  };
  relationship?: {
    coding?: Array<{
      system?: string;
      code?: string;
    }>;
  };
  period?: {
    start?: string;
    end?: string;
  };
  payor: Array<{
    reference?: string;
    display?: string;
  }>;
  class?: Array<{
    type: {
      coding?: Array<{
        system?: string;
        code?: string;
      }>;
    };
    value?: string;
    name?: string;
  }>;
  order?: number;
}

/**
 * OAuth token response
 */
interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
  refresh_token?: string;
}

/**
 * FHIR R4 Client for making API requests
 */
export class FHIRClient {
  private baseUrl: string;
  private authConfig: EHRAuthConfig;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private timeout: number;

  constructor(authConfig: EHRAuthConfig, timeout: number = 30000) {
    this.baseUrl = authConfig.fhirBaseUrl.replace(/\/$/, '');
    this.authConfig = authConfig;
    this.timeout = timeout;
  }

  /**
   * Authenticate with the FHIR server using OAuth 2.0
   * Supports both client credentials and JWT bearer token flows
   */
  async authenticate(): Promise<void> {
    const body = new URLSearchParams();
    body.append('grant_type', 'client_credentials');
    body.append('scope', this.authConfig.scopes.join(' '));

    // For JWT-based authentication (SMART Backend Services)
    if (this.authConfig.privateKey) {
      const assertion = await this.createJWTAssertion();
      body.append('client_assertion_type', 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer');
      body.append('client_assertion', assertion);
    } else if (this.authConfig.clientSecret) {
      // Standard client credentials
      body.append('client_id', this.authConfig.clientId);
      body.append('client_secret', this.authConfig.clientSecret);
    }

    const response = await fetch(this.authConfig.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new EHRError(
        EHRErrorCode.AUTH_FAILED,
        `Authentication failed: ${response.status} ${response.statusText}`,
        errorBody
      );
    }

    const tokenData = await response.json() as TokenResponse;
    this.accessToken = tokenData.access_token;
    this.tokenExpiry = Date.now() + (tokenData.expires_in - 60) * 1000; // Refresh 60s before expiry
  }

  /**
   * Create JWT assertion for SMART Backend Services authentication
   */
  private async createJWTAssertion(): Promise<string> {
    // In production, use a proper JWT library like jose
    // This is a simplified implementation for demonstration
    const header = {
      alg: 'RS384',
      typ: 'JWT',
      kid: this.authConfig.keyId,
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: this.authConfig.clientId,
      sub: this.authConfig.clientId,
      aud: this.authConfig.tokenEndpoint,
      exp: now + 300, // 5 minutes
      jti: `${Date.now()}-${Math.random().toString(36).substring(2)}`,
    };

    // In a real implementation, sign with the private key
    // For now, throw an error indicating this needs proper implementation
    throw new EHRError(
      EHRErrorCode.NOT_IMPLEMENTED,
      'JWT signing requires a proper cryptographic library. Install jose or similar.'
    );
  }

  /**
   * Ensure we have a valid access token
   */
  private async ensureAuthenticated(): Promise<void> {
    if (!this.accessToken || Date.now() >= this.tokenExpiry) {
      await this.authenticate();
    }
  }

  /**
   * Make an authenticated request to the FHIR server
   */
  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    await this.ensureAuthenticated();

    const url = `${this.baseUrl}${path}`;
    const headers = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Accept': 'application/fhir+json',
      'Content-Type': 'application/fhir+json',
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const errorBody = await response.text();

      if (response.status === 401) {
        // Token might have been invalidated, clear it and retry once
        this.accessToken = null;
        throw new EHRError(EHRErrorCode.TOKEN_EXPIRED, 'Token expired', errorBody);
      }

      if (response.status === 404) {
        throw new EHRError(EHRErrorCode.PATIENT_NOT_FOUND, 'Resource not found', errorBody);
      }

      if (response.status === 429) {
        throw new EHRError(EHRErrorCode.RATE_LIMITED, 'Rate limit exceeded', errorBody);
      }

      throw new EHRError(
        EHRErrorCode.INVALID_RESPONSE,
        `FHIR request failed: ${response.status} ${response.statusText}`,
        errorBody
      );
    }

    return response.json() as Promise<T>;
  }

  /**
   * Read a single resource by ID
   */
  async read<T>(resourceType: FHIRResourceType, id: string): Promise<T> {
    return this.request<T>(`/${resourceType}/${id}`);
  }

  /**
   * Search for resources
   */
  async search<T>(
    resourceType: FHIRResourceType,
    params: Record<string, string>
  ): Promise<FHIRBundle<T>> {
    const searchParams = new URLSearchParams(params);
    return this.request<FHIRBundle<T>>(`/${resourceType}?${searchParams.toString()}`);
  }

  /**
   * Fetch a Patient resource and transform to internal type
   */
  async fetchPatient(mrn: string): Promise<EHRPatient> {
    // Search by MRN identifier
    const bundle = await this.search<FHIRPatient>('Patient', {
      identifier: mrn,
    });

    if (!bundle.entry || bundle.entry.length === 0) {
      throw new EHRError(EHRErrorCode.PATIENT_NOT_FOUND, `Patient with MRN ${mrn} not found`);
    }

    return this.transformPatient(bundle.entry[0].resource);
  }

  /**
   * Fetch an Encounter resource and transform to internal type
   */
  async fetchEncounter(encounterId: string): Promise<EHREncounter> {
    const fhirEncounter = await this.read<FHIREncounter>('Encounter', encounterId);
    return this.transformEncounter(fhirEncounter);
  }

  /**
   * Fetch Coverage resources for a patient
   */
  async fetchCoverage(patientId: string): Promise<EHRInsurance[]> {
    const bundle = await this.search<FHIRCoverage>('Coverage', {
      beneficiary: `Patient/${patientId}`,
      status: 'active',
    });

    if (!bundle.entry || bundle.entry.length === 0) {
      return [];
    }

    return bundle.entry.map((entry) => this.transformCoverage(entry.resource, patientId));
  }

  /**
   * Transform FHIR Patient to internal EHRPatient type
   */
  transformPatient(fhirPatient: FHIRPatient): EHRPatient {
    const officialName = fhirPatient.name?.find((n) => n.use === 'official') || fhirPatient.name?.[0];
    const homeAddress = fhirPatient.address?.find((a) => a.use === 'home') || fhirPatient.address?.[0];

    // Find MRN identifier
    const mrnIdentifier = fhirPatient.identifier?.find(
      (id) => id.type?.coding?.some((c) => c.code === 'MR')
    );
    const mrn = mrnIdentifier?.value || fhirPatient.id;

    // Find SSN identifier
    const ssnIdentifier = fhirPatient.identifier?.find(
      (id) => id.type?.coding?.some((c) => c.code === 'SS')
    );

    // Extract contact info
    const phones = fhirPatient.telecom?.filter((t) => t.system === 'phone');
    const homePhone = phones?.find((p) => p.use === 'home')?.value;
    const mobilePhone = phones?.find((p) => p.use === 'mobile')?.value;
    const email = fhirPatient.telecom?.find((t) => t.system === 'email')?.value;

    return {
      mrn,
      name: {
        given: officialName?.given || [],
        family: officialName?.family || '',
        prefix: officialName?.prefix?.[0],
        suffix: officialName?.suffix?.[0],
      },
      dob: fhirPatient.birthDate || '',
      ssn: ssnIdentifier?.value,
      address: {
        line: homeAddress?.line || [],
        city: homeAddress?.city || '',
        state: homeAddress?.state || '',
        postalCode: homeAddress?.postalCode || '',
        country: homeAddress?.country,
      },
      contact: {
        phone: homePhone,
        mobile: mobilePhone,
        email,
      },
      gender: fhirPatient.gender,
      active: fhirPatient.active,
      deceased: fhirPatient.deceasedBoolean,
      deceasedDate: fhirPatient.deceasedDateTime,
      identifiers: fhirPatient.identifier?.map((id) => ({
        system: id.system || '',
        value: id.value || '',
      })),
    };
  }

  /**
   * Transform FHIR Encounter to internal EHREncounter type
   */
  transformEncounter(fhirEncounter: FHIREncounter): EHREncounter {
    // Map FHIR class to encounter type
    const classCode = fhirEncounter.class?.code?.toLowerCase() || '';
    let encounterType: EHREncounter['type'] = 'outpatient';

    if (classCode.includes('inp') || classCode === 'imp') {
      encounterType = 'inpatient';
    } else if (classCode.includes('emer') || classCode === 'emer') {
      encounterType = 'emergency';
    } else if (classCode.includes('obs')) {
      encounterType = 'observation';
    } else if (classCode.includes('amb')) {
      encounterType = 'ambulatory';
    } else if (classCode.includes('hh') || classCode.includes('home')) {
      encounterType = 'home';
    } else if (classCode.includes('vr') || classCode.includes('virtual')) {
      encounterType = 'virtual';
    }

    // Extract patient MRN from subject reference
    const patientRef = fhirEncounter.subject?.reference || '';
    const patientMrn = patientRef.replace('Patient/', '');

    // Calculate length of stay
    let lengthOfStay: number | undefined;
    if (fhirEncounter.period?.start && fhirEncounter.period?.end) {
      const start = new Date(fhirEncounter.period.start);
      const end = new Date(fhirEncounter.period.end);
      lengthOfStay = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Map status
    let status: EHREncounter['status'] = 'unknown';
    const validStatuses: EHREncounter['status'][] = [
      'planned', 'arrived', 'triaged', 'in-progress', 'onleave', 'finished', 'cancelled', 'unknown'
    ];
    if (validStatuses.includes(fhirEncounter.status as EHREncounter['status'])) {
      status = fhirEncounter.status as EHREncounter['status'];
    }

    return {
      id: fhirEncounter.id,
      type: encounterType,
      status,
      dates: {
        start: fhirEncounter.period?.start || '',
        end: fhirEncounter.period?.end,
        admissionDate: fhirEncounter.period?.start,
        dischargeDate: fhirEncounter.period?.end,
      },
      charges: {
        totalCharges: 0, // Would come from separate billing resources
        currency: 'USD',
      },
      diagnoses: [], // Would need to fetch Condition resources
      procedures: [], // Would need to fetch Procedure resources
      location: fhirEncounter.location?.[0]?.location?.display
        ? { facility: fhirEncounter.location[0].location.display }
        : undefined,
      provider: fhirEncounter.participant?.[0]?.individual
        ? {
            id: fhirEncounter.participant[0].individual.reference?.replace('Practitioner/', '') || '',
            name: fhirEncounter.participant[0].individual.display || '',
          }
        : undefined,
      patientMrn,
      lengthOfStay,
      dischargeDisposition: fhirEncounter.hospitalization?.dischargeDisposition?.coding?.[0]?.display,
      accountNumber: fhirEncounter.identifier?.[0]?.value,
    };
  }

  /**
   * Transform FHIR Coverage to internal EHRInsurance type
   */
  transformCoverage(fhirCoverage: FHIRCoverage, patientMrn: string): EHRInsurance {
    // Determine payer type from coverage type coding
    const typeCode = fhirCoverage.type?.coding?.[0]?.code?.toLowerCase() || '';
    let payerType: EHRInsurance['payer']['type'] = 'other';

    if (typeCode.includes('medicare')) {
      payerType = 'medicare';
    } else if (typeCode.includes('medicaid')) {
      payerType = 'medicaid';
    } else if (typeCode.includes('tricare')) {
      payerType = 'tricare';
    } else if (typeCode.includes('self') || typeCode.includes('pay')) {
      payerType = 'self_pay';
    } else if (typeCode.includes('work')) {
      payerType = 'workers_comp';
    } else if (typeCode) {
      payerType = 'commercial';
    }

    // Extract class information (group, plan)
    const groupClass = fhirCoverage.class?.find(
      (c) => c.type?.coding?.[0]?.code === 'group'
    );
    const planClass = fhirCoverage.class?.find(
      (c) => c.type?.coding?.[0]?.code === 'plan'
    );

    // Map order to priority
    let priority: EHRInsurance['priority'] = 'primary';
    if (fhirCoverage.order === 2) {
      priority = 'secondary';
    } else if (fhirCoverage.order && fhirCoverage.order >= 3) {
      priority = 'tertiary';
    }

    return {
      payer: {
        id: fhirCoverage.payor?.[0]?.reference?.replace('Organization/', '') || fhirCoverage.id,
        name: fhirCoverage.payor?.[0]?.display || 'Unknown Payer',
        type: payerType,
      },
      memberId: fhirCoverage.subscriberId || fhirCoverage.identifier?.[0]?.value || '',
      groupId: groupClass?.value,
      coverageDates: {
        start: fhirCoverage.period?.start || '',
        end: fhirCoverage.period?.end,
      },
      plan: planClass
        ? {
            name: planClass.name || planClass.value || '',
          }
        : undefined,
      priority,
      patientMrn,
      active: fhirCoverage.status === 'active',
    };
  }

  /**
   * Test connectivity to the FHIR server
   */
  async testConnectivity(): Promise<{ success: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      await this.authenticate();
      // Try to fetch the metadata/capability statement
      await this.request('/metadata');
      return {
        success: true,
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      return {
        success: false,
        latencyMs: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
