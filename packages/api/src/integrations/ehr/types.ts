/**
 * EHR Integration Types
 * Type definitions for Electronic Health Record data structures
 */

/**
 * Patient demographic information from EHR
 */
export interface EHRPatient {
  /** Medical Record Number - unique identifier within the health system */
  mrn: string;

  /** Patient name components */
  name: {
    given: string[];
    family: string;
    prefix?: string;
    suffix?: string;
  };

  /** Date of birth in ISO 8601 format (YYYY-MM-DD) */
  dob: string;

  /** Social Security Number (last 4 digits or full, depending on access level) */
  ssn?: string;

  /** Patient address */
  address: {
    line: string[];
    city: string;
    state: string;
    postalCode: string;
    country?: string;
  };

  /** Contact information */
  contact: {
    phone?: string;
    mobile?: string;
    email?: string;
    preferredMethod?: 'phone' | 'mobile' | 'email';
  };

  /** Administrative gender */
  gender?: 'male' | 'female' | 'other' | 'unknown';

  /** Patient identifiers from various systems */
  identifiers?: Array<{
    system: string;
    value: string;
  }>;

  /** Active status in the EHR */
  active?: boolean;

  /** Deceased status */
  deceased?: boolean;
  deceasedDate?: string;
}

/**
 * Healthcare encounter/visit information
 */
export interface EHREncounter {
  /** Unique encounter identifier */
  id: string;

  /** Type of encounter */
  type: 'inpatient' | 'outpatient' | 'emergency' | 'observation' | 'ambulatory' | 'home' | 'virtual';

  /** Encounter status */
  status: 'planned' | 'arrived' | 'triaged' | 'in-progress' | 'onleave' | 'finished' | 'cancelled' | 'unknown';

  /** Encounter dates */
  dates: {
    start: string;
    end?: string;
    admissionDate?: string;
    dischargeDate?: string;
  };

  /** Financial charges associated with encounter */
  charges: {
    totalCharges: number;
    totalPayments?: number;
    totalAdjustments?: number;
    patientResponsibility?: number;
    currency?: string;
  };

  /** Diagnosis codes */
  diagnoses: Array<{
    code: string;
    system: 'ICD-10' | 'ICD-9' | 'SNOMED';
    description: string;
    type: 'principal' | 'secondary' | 'admitting' | 'discharge';
    sequence?: number;
    presentOnAdmission?: boolean;
  }>;

  /** Procedure codes */
  procedures: Array<{
    code: string;
    system: 'CPT' | 'HCPCS' | 'ICD-10-PCS';
    description: string;
    date?: string;
    sequence?: number;
    modifier?: string[];
  }>;

  /** Service location */
  location?: {
    facility: string;
    department?: string;
    room?: string;
    bed?: string;
  };

  /** Attending/responsible provider */
  provider?: {
    id: string;
    name: string;
    npi?: string;
    specialty?: string;
  };

  /** Reference to patient MRN */
  patientMrn: string;

  /** Length of stay in days (for inpatient) */
  lengthOfStay?: number;

  /** Discharge disposition */
  dischargeDisposition?: string;

  /** Account number for billing */
  accountNumber?: string;
}

/**
 * Insurance/payer information
 */
export interface EHRInsurance {
  /** Insurance payer details */
  payer: {
    id: string;
    name: string;
    type: 'commercial' | 'medicare' | 'medicaid' | 'tricare' | 'workers_comp' | 'self_pay' | 'other';
    payerId?: string;
  };

  /** Member/subscriber ID */
  memberId: string;

  /** Group ID/number */
  groupId?: string;

  /** Policy number */
  policyNumber?: string;

  /** Coverage effective dates */
  coverageDates: {
    start: string;
    end?: string;
  };

  /** Subscriber/policyholder information */
  subscriber?: {
    id: string;
    name: string;
    relationship: 'self' | 'spouse' | 'child' | 'other';
    dob?: string;
  };

  /** Plan details */
  plan?: {
    name: string;
    type?: 'HMO' | 'PPO' | 'POS' | 'EPO' | 'HDHP' | 'Medicare Advantage' | 'Medicaid Managed Care';
  };

  /** Coverage priority/coordination of benefits */
  priority: 'primary' | 'secondary' | 'tertiary';

  /** Reference to patient MRN */
  patientMrn: string;

  /** Active status */
  active: boolean;
}

/**
 * Coverage verification result
 */
export interface EHRCoverage {
  /** Whether coverage is currently active */
  active: boolean;

  /** Whether coverage has been verified with payer */
  verified: boolean;

  /** When verification was performed */
  verificationDate?: string;

  /** Type of coverage */
  type: 'medical' | 'dental' | 'vision' | 'pharmacy' | 'mental_health' | 'other';

  /** Eligibility status */
  eligibilityStatus: 'eligible' | 'ineligible' | 'pending' | 'unknown';

  /** Coverage details when verified */
  details?: {
    /** Remaining deductible */
    deductibleRemaining?: number;
    /** Out-of-pocket maximum remaining */
    outOfPocketRemaining?: number;
    /** Copay amount */
    copay?: number;
    /** Coinsurance percentage (0-100) */
    coinsurance?: number;
    /** In-network status */
    inNetwork?: boolean;
    /** Prior authorization required */
    priorAuthRequired?: boolean;
  };

  /** Reference to insurance record */
  insuranceId?: string;

  /** Reference to patient MRN */
  patientMrn: string;

  /** Any limitations or restrictions */
  limitations?: string[];

  /** Error information if verification failed */
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Authentication credentials for EHR connections
 */
export interface EHRAuthConfig {
  /** Client ID for OAuth */
  clientId: string;

  /** Client secret for OAuth */
  clientSecret?: string;

  /** OAuth token endpoint */
  tokenEndpoint: string;

  /** OAuth authorization endpoint */
  authorizationEndpoint?: string;

  /** FHIR base URL */
  fhirBaseUrl: string;

  /** Scopes to request */
  scopes: string[];

  /** Private key for JWT authentication (SMART Backend Services) */
  privateKey?: string;

  /** Key ID for JWT */
  keyId?: string;
}

/**
 * EHR connection configuration
 */
export interface EHRConnectionConfig {
  /** Unique identifier for this connection */
  id: string;

  /** Display name */
  name: string;

  /** EHR vendor type */
  vendor: 'epic' | 'cerner' | 'meditech' | 'allscripts' | 'athenahealth' | 'other';

  /** Authentication configuration */
  auth: EHRAuthConfig;

  /** Organization this connection belongs to */
  organizationId: string;

  /** Whether this connection is enabled */
  enabled: boolean;

  /** Timeout in milliseconds */
  timeout?: number;

  /** Retry configuration */
  retry?: {
    maxRetries: number;
    retryDelay: number;
  };
}

/**
 * Result wrapper for EHR operations
 */
export interface EHRResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata?: {
    requestId?: string;
    responseTime: number;
    source: string;
  };
}
