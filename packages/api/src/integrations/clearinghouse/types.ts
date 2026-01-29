/**
 * Clearinghouse Integration Types
 * Type definitions for clearinghouse data structures and operations
 */

/**
 * Supported clearinghouse types
 */
export type ClearinghouseType = 'change_healthcare' | 'availity' | 'trizetto' | 'emdeon' | 'other';

/**
 * Supported transaction types
 */
export type TransactionType =
  | '837P'  // Professional Claims
  | '837I'  // Institutional Claims
  | '837D'  // Dental Claims
  | '270'   // Eligibility Inquiry
  | '271'   // Eligibility Response
  | '276'   // Claim Status Inquiry
  | '277'   // Claim Status Response
  | '835'   // Electronic Remittance Advice (ERA)
  | '999'   // Implementation Acknowledgment
  | 'TA1';  // Interchange Acknowledgment

/**
 * Clearinghouse authentication credentials
 */
export interface ClearinghouseCredentials {
  /** OAuth client ID */
  clientId: string;

  /** OAuth client secret */
  clientSecret?: string;

  /** API key for simple authentication */
  apiKey?: string;

  /** Username for basic auth or portal access */
  username?: string;

  /** Password for basic auth or portal access */
  password?: string;

  /** Private key for JWT signing */
  privateKey?: string;

  /** Certificate for mutual TLS */
  certificate?: string;

  /** Submitter ID assigned by clearinghouse */
  submitterId?: string;

  /** Sender ID for EDI transactions */
  senderId?: string;

  /** Receiver ID for EDI transactions */
  receiverId?: string;
}

/**
 * Clearinghouse connection configuration
 */
export interface ClearinghouseConfig {
  /** Unique identifier */
  id: string;

  /** Display name */
  name: string;

  /** Clearinghouse type */
  type: ClearinghouseType;

  /** Base API URL */
  apiUrl: string;

  /** OAuth token endpoint */
  tokenEndpoint?: string;

  /** Authentication credentials (encrypted in database) */
  credentials: ClearinghouseCredentials;

  /** Supported transaction types */
  supportedTransactions: TransactionType[];

  /** Organization ID this config belongs to */
  organizationId: string;

  /** Whether this connection is active */
  isActive: boolean;

  /** Is this the primary clearinghouse */
  isPrimary?: boolean;

  /** Timeout in milliseconds */
  timeout?: number;

  /** Retry configuration */
  retry?: {
    maxRetries: number;
    retryDelay: number;
    backoffMultiplier?: number;
  };

  /** Environment (sandbox, production) */
  environment?: 'sandbox' | 'production';
}

/**
 * Claim submission error
 */
export interface SubmissionError {
  /** Error code from clearinghouse */
  code: string;

  /** Human-readable error message */
  message: string;

  /** Specific field that caused the error */
  field?: string;

  /** Claim ID if specific to a claim */
  claimId?: string;

  /** Loop/segment location in EDI */
  location?: string;

  /** Severity level */
  severity: 'error' | 'warning' | 'info';
}

/**
 * Individual claim status in a batch submission
 */
export interface ClaimSubmissionStatus {
  /** Internal claim ID */
  claimId: string;

  /** Clearinghouse-assigned claim ID */
  clearinghouseClaimId?: string;

  /** Patient control number (from claim) */
  patientControlNumber?: string;

  /** Submission status */
  status: 'accepted' | 'rejected' | 'pending';

  /** Errors if rejected */
  errors?: SubmissionError[];

  /** Warnings even if accepted */
  warnings?: SubmissionError[];
}

/**
 * Result of a batch claim submission
 */
export interface SubmissionResult {
  /** Unique transaction ID from clearinghouse */
  transactionId: string;

  /** Batch ID if applicable */
  batchId?: string;

  /** Overall submission status */
  status: 'success' | 'partial' | 'failed' | 'pending';

  /** Timestamp of submission */
  submittedAt: Date;

  /** Count of accepted claims */
  acceptedCount: number;

  /** Count of rejected claims */
  rejectedCount: number;

  /** Count of pending claims */
  pendingCount?: number;

  /** Total claims in submission */
  totalCount: number;

  /** General errors (not claim-specific) */
  errors: SubmissionError[];

  /** Per-claim status */
  claimStatuses?: ClaimSubmissionStatus[];

  /** Raw response for debugging */
  rawResponse?: unknown;

  /** Interchange control number (for EDI) */
  interchangeControlNumber?: string;
}

/**
 * Claim status from clearinghouse
 */
export type ClaimStatusCode =
  | 'accepted'           // Accepted by clearinghouse
  | 'rejected'           // Rejected by clearinghouse
  | 'pending'            // Pending at clearinghouse
  | 'forwarded'          // Forwarded to payer
  | 'acknowledged'       // Acknowledged by payer
  | 'adjudicated'        // Adjudicated by payer
  | 'paid'               // Paid
  | 'denied'             // Denied
  | 'in_review'          // Under review
  | 'additional_info'    // Additional information requested
  | 'unknown';           // Status unknown

/**
 * Adjudication information from payer
 */
export interface AdjudicationInfo {
  /** Total billed amount */
  billedAmount: number;

  /** Allowed amount */
  allowedAmount?: number;

  /** Paid amount */
  paidAmount?: number;

  /** Patient responsibility */
  patientResponsibility?: number;

  /** Adjustment codes and amounts */
  adjustments?: Array<{
    groupCode: string;  // CO, OA, PI, PR, CR
    reasonCode: string; // CARC code
    amount: number;
  }>;

  /** Remark codes */
  remarkCodes?: string[];

  /** Adjudication date */
  adjudicationDate?: Date;

  /** Check/EFT number */
  paymentReference?: string;

  /** Payment date */
  paymentDate?: Date;
}

/**
 * Status response for a claim
 */
export interface StatusResponse {
  /** Internal claim ID */
  claimId: string;

  /** Clearinghouse claim ID */
  clearinghouseClaimId?: string;

  /** Payer claim ID */
  payerClaimId?: string;

  /** Current status */
  status: ClaimStatusCode;

  /** Status category code (277 codes) */
  statusCategoryCode?: string;

  /** Status code (277 codes) */
  statusCode?: string;

  /** Status description */
  statusDescription?: string;

  /** Date of this status */
  statusDate: Date;

  /** Effective date of the status */
  effectiveDate?: Date;

  /** Adjudication details if available */
  adjudicationInfo?: AdjudicationInfo;

  /** Payer name */
  payerName?: string;

  /** Payer ID */
  payerId?: string;

  /** Total charge amount */
  totalChargeAmount?: number;

  /** History of status changes */
  statusHistory?: Array<{
    status: ClaimStatusCode;
    date: Date;
    description?: string;
  }>;

  /** Errors if unable to retrieve status */
  errors?: SubmissionError[];
}

/**
 * Coverage/benefit details
 */
export interface CoverageDetails {
  /** Plan name */
  planName?: string;

  /** Plan type (HMO, PPO, etc.) */
  planType?: string;

  /** Group number */
  groupNumber?: string;

  /** Coverage effective date */
  effectiveDate?: Date;

  /** Coverage termination date */
  terminationDate?: Date;

  /** Service type codes (270/271) */
  serviceTypeCodes?: string[];

  /** In-network indicator */
  inNetwork?: boolean;

  /** Plan limitations */
  limitations?: string[];
}

/**
 * Deductible information
 */
export interface DeductibleInfo {
  /** Individual deductible */
  individual?: {
    inNetwork?: number;
    outOfNetwork?: number;
    remaining?: number;
  };

  /** Family deductible */
  family?: {
    inNetwork?: number;
    outOfNetwork?: number;
    remaining?: number;
  };

  /** Year-to-date amount met */
  ytdMet?: number;
}

/**
 * Copay information
 */
export interface CopayInfo {
  /** Primary care copay */
  primaryCare?: number;

  /** Specialist copay */
  specialist?: number;

  /** Emergency room copay */
  emergencyRoom?: number;

  /** Urgent care copay */
  urgentCare?: number;

  /** Generic drug copay */
  genericDrug?: number;

  /** Brand drug copay */
  brandDrug?: number;

  /** Inpatient copay/per day */
  inpatient?: number;

  /** Outpatient copay */
  outpatient?: number;
}

/**
 * Out-of-pocket maximum information
 */
export interface OutOfPocketInfo {
  /** Individual out-of-pocket max */
  individual?: {
    inNetwork?: number;
    outOfNetwork?: number;
    remaining?: number;
  };

  /** Family out-of-pocket max */
  family?: {
    inNetwork?: number;
    outOfNetwork?: number;
    remaining?: number;
  };
}

/**
 * Eligibility verification response
 */
export interface EligibilityResponse {
  /** Whether the patient has active coverage */
  active: boolean;

  /** Eligibility effective date */
  effectiveDate?: Date;

  /** Eligibility termination date */
  terminationDate?: Date;

  /** Coverage details */
  coverageDetails?: CoverageDetails;

  /** Copay information */
  copay?: CopayInfo;

  /** Deductible information */
  deductible?: DeductibleInfo;

  /** Out-of-pocket information */
  outOfPocket?: OutOfPocketInfo;

  /** Coinsurance percentage */
  coinsurance?: {
    inNetwork?: number;
    outOfNetwork?: number;
  };

  /** Prior authorization required */
  priorAuthRequired?: boolean;

  /** Referral required */
  referralRequired?: boolean;

  /** Patient information as returned */
  patientInfo?: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: Date;
    memberId?: string;
    subscriberId?: string;
    relationship?: string;
  };

  /** Subscriber information if different */
  subscriberInfo?: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: Date;
    memberId?: string;
  };

  /** Payer information */
  payerInfo?: {
    name: string;
    payerId: string;
    contactPhone?: string;
  };

  /** Date/time of eligibility check */
  verificationDate: Date;

  /** Trace number for the transaction */
  traceNumber?: string;

  /** Raw 271 response if available */
  rawResponse?: unknown;

  /** Errors if verification failed */
  errors?: SubmissionError[];

  /** Indicates if this is real-time or cached */
  isRealTime?: boolean;
}

/**
 * Remittance advice (ERA/835) summary
 */
export interface RemittanceAdvice {
  /** ERA ID/trace number */
  id: string;

  /** Check/EFT number */
  paymentNumber: string;

  /** Payment date */
  paymentDate: Date;

  /** Payment method */
  paymentMethod: 'check' | 'eft' | 'virtual_card' | 'other';

  /** Total payment amount */
  totalPaymentAmount: number;

  /** Payer information */
  payer: {
    name: string;
    payerId: string;
    contactInfo?: string;
  };

  /** Payee information */
  payee: {
    name: string;
    npi?: string;
    taxId?: string;
  };

  /** Number of claims in ERA */
  claimCount: number;

  /** Production date of ERA */
  productionDate: Date;

  /** File name if downloaded */
  fileName?: string;

  /** Whether ERA has been processed */
  processed: boolean;

  /** ERA content (835 data) */
  content?: string;

  /** Claim-level details */
  claims?: Array<{
    claimId: string;
    patientControlNumber: string;
    patientName: string;
    dateOfService: Date;
    billedAmount: number;
    paidAmount: number;
    patientResponsibility: number;
    adjustments: Array<{
      groupCode: string;
      reasonCode: string;
      amount: number;
    }>;
    status: 'paid' | 'denied' | 'partial';
  }>;
}

/**
 * Date range for queries
 */
export interface DateRange {
  /** Start date (inclusive) */
  startDate: Date;

  /** End date (inclusive) */
  endDate: Date;
}

/**
 * Patient information for eligibility verification
 */
export interface PatientInfo {
  /** First name */
  firstName: string;

  /** Last name */
  lastName: string;

  /** Date of birth */
  dateOfBirth: Date;

  /** Gender */
  gender?: 'M' | 'F' | 'U';

  /** Member ID (if known) */
  memberId?: string;

  /** SSN (last 4 or full, depending on payer requirements) */
  ssn?: string;

  /** Address */
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

/**
 * Payer information for eligibility verification
 */
export interface PayerInfo {
  /** Payer ID (clearinghouse-specific) */
  payerId: string;

  /** Payer name */
  name?: string;

  /** Service type for verification */
  serviceType?: string;
}

/**
 * Connection test result
 */
export interface ConnectionTestResult {
  /** Whether connection succeeded */
  success: boolean;

  /** Latency in milliseconds */
  latencyMs: number;

  /** Error message if failed */
  error?: string;

  /** Clearinghouse version/info */
  serverInfo?: string;

  /** Authentication status */
  authenticated: boolean;

  /** Timestamp of test */
  testedAt: Date;
}

/**
 * Generic result wrapper
 */
export interface ClearinghouseResult<T> {
  /** Whether operation succeeded */
  success: boolean;

  /** Result data */
  data?: T;

  /** Error information */
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };

  /** Request metadata */
  metadata?: {
    requestId?: string;
    responseTime: number;
    clearinghouse: string;
  };
}
