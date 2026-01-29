/**
 * X12 837 Claim Types
 * TypeScript interfaces for healthcare claims submission (HIPAA 5010)
 */

// ============================================================================
// PROVIDER INFORMATION
// ============================================================================

export interface ProviderInfo {
  /** National Provider Identifier (10 digits) */
  npi: string;
  /** Tax ID / Employer Identification Number */
  taxId: string;
  /** Provider legal name (organization or individual) */
  name: string;
  /** Provider first name (for individual providers) */
  firstName?: string;
  /** Provider last name (for individual providers) */
  lastName?: string;
  /** Provider type (1=Person, 2=Non-Person Entity) */
  entityType: '1' | '2';
  /** Provider taxonomy code */
  taxonomyCode?: string;
  /** Address line 1 */
  address1: string;
  /** Address line 2 (optional) */
  address2?: string;
  /** City */
  city: string;
  /** State code (2 letter) */
  state: string;
  /** ZIP code (5 or 9 digits) */
  zipCode: string;
  /** Phone number */
  phone?: string;
  /** Contact name */
  contactName?: string;
  /** Contact email */
  contactEmail?: string;
}

export interface BillingProviderInfo extends ProviderInfo {
  /** Pay-to address (if different from billing address) */
  payToAddress1?: string;
  payToAddress2?: string;
  payToCity?: string;
  payToState?: string;
  payToZipCode?: string;
}

export interface RenderingProviderInfo extends ProviderInfo {
  /** Rendering provider qualifier */
  qualifier?: string;
}

export interface ReferringProviderInfo {
  npi: string;
  firstName: string;
  lastName: string;
  /** Provider qualifier (DN, DQ, etc.) */
  qualifier?: string;
}

export interface FacilityInfo {
  /** Facility NPI */
  npi: string;
  /** Facility name */
  name: string;
  /** Address line 1 */
  address1: string;
  /** Address line 2 */
  address2?: string;
  /** City */
  city: string;
  /** State code */
  state: string;
  /** ZIP code */
  zipCode: string;
}

// ============================================================================
// PATIENT AND SUBSCRIBER INFORMATION
// ============================================================================

export interface PatientInfo {
  /** Patient account number */
  accountNumber: string;
  /** Medical record number */
  mrn?: string;
  /** Patient first name */
  firstName: string;
  /** Patient middle name */
  middleName?: string;
  /** Patient last name */
  lastName: string;
  /** Patient suffix (Jr, Sr, III, etc.) */
  suffix?: string;
  /** Date of birth (YYYY-MM-DD) */
  dateOfBirth: string;
  /** Gender (M=Male, F=Female, U=Unknown) */
  gender: 'M' | 'F' | 'U';
  /** Address line 1 */
  address1: string;
  /** Address line 2 */
  address2?: string;
  /** City */
  city: string;
  /** State code */
  state: string;
  /** ZIP code */
  zipCode: string;
  /** Phone number */
  phone?: string;
  /** SSN (for coordination of benefits) */
  ssn?: string;
  /** Patient relationship to subscriber */
  relationshipToSubscriber: RelationshipCode;
}

export interface SubscriberInfo {
  /** Subscriber/Member ID */
  memberId: string;
  /** Group number */
  groupNumber?: string;
  /** Subscriber first name */
  firstName: string;
  /** Subscriber middle name */
  middleName?: string;
  /** Subscriber last name */
  lastName: string;
  /** Subscriber suffix */
  suffix?: string;
  /** Date of birth */
  dateOfBirth?: string;
  /** Gender */
  gender?: 'M' | 'F' | 'U';
  /** Address line 1 */
  address1?: string;
  /** Address line 2 */
  address2?: string;
  /** City */
  city?: string;
  /** State code */
  state?: string;
  /** ZIP code */
  zipCode?: string;
}

/** Patient relationship to subscriber codes */
export type RelationshipCode =
  | '18' // Self
  | '01' // Spouse
  | '19' // Child
  | '20' // Employee
  | '21' // Unknown
  | '39' // Organ Donor
  | '40' // Cadaver Donor
  | '53' // Life Partner
  | 'G8'; // Other Relationship

// ============================================================================
// PAYER INFORMATION
// ============================================================================

export interface PayerInfo {
  /** Payer ID (electronic payer identifier) */
  payerId: string;
  /** Payer name */
  name: string;
  /** Payer address line 1 */
  address1?: string;
  /** Payer address line 2 */
  address2?: string;
  /** City */
  city?: string;
  /** State code */
  state?: string;
  /** ZIP code */
  zipCode?: string;
  /** Claim filing indicator (e.g., MC=Medicaid, MA=Medicare Part A) */
  claimFilingIndicator: ClaimFilingIndicator;
}

export type ClaimFilingIndicator =
  | 'MA' // Medicare Part A
  | 'MB' // Medicare Part B
  | 'MC' // Medicaid
  | 'CH' // CHAMPUS (TRICARE)
  | 'VA' // Veterans Affairs
  | 'BL' // Blue Cross Blue Shield
  | 'CI' // Commercial Insurance
  | 'HM' // Health Maintenance Organization
  | 'OF' // Other Federal Program
  | 'WC' // Workers Compensation
  | 'AM' // Automobile Medical
  | 'LI' // Liability
  | 'LM' // Liability Medical
  | 'ZZ'; // Mutually Defined

// ============================================================================
// DIAGNOSIS INFORMATION
// ============================================================================

export interface DiagnosisInfo {
  /** ICD-10-CM diagnosis code (without decimal) */
  code: string;
  /** Diagnosis qualifier (ABK=ICD-10-CM, ABJ=ICD-10-PCS, ABF=ICD-9-CM) */
  qualifier: DiagnosisQualifier;
  /** Diagnosis pointer (1-12) for linking to service lines */
  pointer: number;
  /** Present on Admission indicator (for institutional claims) */
  presentOnAdmission?: 'Y' | 'N' | 'U' | 'W' | '1';
}

export type DiagnosisQualifier =
  | 'ABK' // ICD-10-CM (diagnosis)
  | 'ABJ' // ICD-10-PCS (procedure)
  | 'ABF' // ICD-9-CM (legacy)
  | 'BK'; // ICD-9-CM Principal

export interface DiagnosisSet {
  /** Principal/primary diagnosis */
  principal: DiagnosisInfo;
  /** Admitting diagnosis (institutional only) */
  admitting?: DiagnosisInfo;
  /** Secondary diagnoses (up to 11 additional) */
  secondary: DiagnosisInfo[];
  /** External cause of injury codes */
  externalCause?: DiagnosisInfo[];
  /** Patient reason for visit codes */
  patientReasonForVisit?: DiagnosisInfo[];
}

// ============================================================================
// PROCEDURE INFORMATION
// ============================================================================

export interface ProcedureInfo {
  /** CPT/HCPCS procedure code */
  code: string;
  /** Procedure code qualifier (HC=CPT/HCPCS, IV=Home Infusion EDI) */
  qualifier: ProcedureQualifier;
  /** Procedure description */
  description?: string;
  /** Modifiers (up to 4) */
  modifiers?: string[];
  /** Charge amount */
  chargeAmount: number;
  /** Units/quantity */
  units: number;
  /** Unit type (UN=Units, MJ=Minutes, etc.) */
  unitType?: UnitType;
  /** Date of service (YYYY-MM-DD) */
  serviceDate: string;
  /** Service end date (for date ranges) */
  serviceEndDate?: string;
  /** Diagnosis pointers (references to diagnosis codes) */
  diagnosisPointers: number[];
  /** Place of service code (2 digits) */
  placeOfService: string;
  /** Emergency indicator */
  emergencyIndicator?: boolean;
  /** EPSDT indicator */
  epsdtIndicator?: boolean;
  /** Family planning indicator */
  familyPlanningIndicator?: boolean;
  /** Rendering provider (if different from billing) */
  renderingProvider?: RenderingProviderInfo;
  /** Line item control number */
  lineItemControlNumber?: string;
  /** National Drug Code (for medications) */
  ndcCode?: string;
  /** NDC quantity */
  ndcQuantity?: number;
  /** NDC unit */
  ndcUnit?: string;
}

export type ProcedureQualifier =
  | 'HC' // CPT/HCPCS
  | 'IV' // Home Infusion EDI Code
  | 'ER' // Jurisdiction Specific Procedure Code
  | 'N4' // National Drug Code (NDC)
  | 'AD'; // American Dental Association Code

export type UnitType =
  | 'UN' // Units
  | 'MJ' // Minutes
  | 'DA' // Days
  | 'F2' // International Unit
  | 'GR' // Gram
  | 'ML'; // Milliliter

// ============================================================================
// INSTITUTIONAL CLAIM SPECIFIC
// ============================================================================

export interface InstitutionalProcedure {
  /** ICD-10-PCS procedure code */
  code: string;
  /** Procedure date (YYYY-MM-DD) */
  date: string;
  /** Procedure code qualifier (BBR=ICD-10-PCS, BBQ=ICD-9-CM Volume 3) */
  qualifier: 'BBR' | 'BBQ';
}

export interface RevenueCodeLine {
  /** Revenue code (4 digits) */
  revenueCode: string;
  /** Description */
  description?: string;
  /** HCPCS/CPT code (optional for some revenue codes) */
  procedureCode?: string;
  /** Modifiers */
  modifiers?: string[];
  /** Service date */
  serviceDate: string;
  /** Service units */
  units: number;
  /** Total charges */
  chargeAmount: number;
  /** Non-covered charges */
  nonCoveredCharges?: number;
  /** Unit rate */
  unitRate?: number;
}

export interface OccurrenceCode {
  /** Occurrence code (2 characters) */
  code: string;
  /** Date of occurrence */
  date: string;
}

export interface ValueCode {
  /** Value code (2 characters) */
  code: string;
  /** Value amount */
  amount: number;
}

export interface ConditionCode {
  /** Condition code (2 characters) */
  code: string;
}

// ============================================================================
// CLAIM HEADER
// ============================================================================

export interface ClaimHeader {
  /** Claim ID (internal tracking) */
  claimId: string;
  /** Patient control number (unique per claim) */
  patientControlNumber: string;
  /** Claim type */
  claimType: ClaimType;
  /** Medical record number */
  medicalRecordNumber?: string;
  /** Total claim charge amount */
  totalChargeAmount: number;
  /** Facility type code */
  facilityTypeCode?: string;
  /** Claim frequency code (1=Original, 7=Replacement, 8=Void) */
  claimFrequencyCode: ClaimFrequencyCode;
  /** Original claim number (for replacement/void claims) */
  originalClaimNumber?: string;
  /** Provider signature indicator */
  providerSignatureOnFile: boolean;
  /** Provider accept assignment code */
  providerAcceptAssignment: boolean;
  /** Benefits assignment certification indicator */
  benefitsAssignmentCertification: boolean;
  /** Release of information code */
  releaseOfInformation: ReleaseOfInfoCode;
  /** Patient signature source code */
  patientSignatureSourceCode?: string;
  /** Related causes (accident, employment, etc.) */
  relatedCauses?: RelatedCause[];
  /** Onset date of current illness */
  onsetDate?: string;
  /** Initial treatment date */
  initialTreatmentDate?: string;
  /** Last seen date */
  lastSeenDate?: string;
  /** Acute manifestation date */
  acuteManifestationDate?: string;
  /** Accident date */
  accidentDate?: string;
  /** Last menstrual period date */
  lastMenstrualPeriodDate?: string;
  /** Assumed care date */
  assumedCareDate?: string;
  /** Relinquished care date */
  relinquishedCareDate?: string;
  /** Admission date (institutional) */
  admissionDate?: string;
  /** Admission hour */
  admissionHour?: string;
  /** Admission type code */
  admissionTypeCode?: string;
  /** Admission source code */
  admissionSourceCode?: string;
  /** Discharge date (institutional) */
  dischargeDate?: string;
  /** Discharge hour */
  dischargeHour?: string;
  /** Patient status code (discharge status) */
  patientStatusCode?: string;
  /** Delay reason code */
  delayReasonCode?: string;
  /** Prior authorization number */
  priorAuthorizationNumber?: string;
  /** Referral number */
  referralNumber?: string;
  /** CLIA number */
  cliaNumber?: string;
  /** Mammography certification number */
  mammographyCertNumber?: string;
  /** Service authorization exception code */
  serviceAuthExceptionCode?: string;
  /** Attachment control number */
  attachmentControlNumber?: string;
  /** Attachment transmission code */
  attachmentTransmissionCode?: string;
}

export type ClaimType = 'professional' | 'institutional';

export type ClaimFrequencyCode =
  | '1' // Original
  | '6' // Corrected (Prior Payer Only)
  | '7' // Replacement
  | '8'; // Void

export type ReleaseOfInfoCode =
  | 'Y' // Yes, provider has signed statement on file
  | 'I' // Informed consent (used for abortion claims only)
  | 'N'; // No

export interface RelatedCause {
  /** Cause code (AA=Auto Accident, EM=Employment, OA=Other Accident) */
  code: 'AA' | 'EM' | 'OA';
  /** State code (for auto accident) */
  state?: string;
  /** Country code */
  country?: string;
}

// ============================================================================
// CLAIM SUBMISSION AND RESPONSE
// ============================================================================

export interface ClaimSubmission {
  /** Submission ID */
  id: string;
  /** Claim ID reference */
  claimId: string;
  /** X12 837 content */
  x12Content: string;
  /** Claim type (837P or 837I) */
  claimType: ClaimType;
  /** Submission status */
  status: ClaimSubmissionStatus;
  /** Clearinghouse ID */
  clearinghouseId?: string;
  /** Clearinghouse batch ID */
  clearinghouseBatchId?: string;
  /** Interchange control number */
  interchangeControlNumber?: string;
  /** Submitted timestamp */
  submittedAt?: Date;
  /** Last status update timestamp */
  statusUpdatedAt?: Date;
  /** Clearinghouse response */
  clearinghouseResponse?: ClearinghouseResponse;
  /** Error details (if any) */
  errors?: ClaimError[];
  /** Warning details (if any) */
  warnings?: ClaimWarning[];
  /** Created timestamp */
  createdAt: Date;
  /** Updated timestamp */
  updatedAt: Date;
}

export type ClaimSubmissionStatus =
  | 'draft' // Claim created but not validated
  | 'validated' // Claim passed validation
  | 'queued' // Queued for submission
  | 'submitted' // Sent to clearinghouse
  | 'acknowledged' // Clearinghouse acknowledged receipt
  | 'accepted' // Accepted by payer
  | 'rejected' // Rejected by clearinghouse or payer
  | 'pending' // Pending payer adjudication
  | 'paid' // Claim paid
  | 'denied' // Claim denied
  | 'cancelled'; // Claim cancelled

export interface ClearinghouseResponse {
  /** Response timestamp */
  timestamp: Date;
  /** Response type (TA1, 999, 277, etc.) */
  responseType: string;
  /** Acknowledgment status */
  acknowledgmentStatus?: 'A' | 'E' | 'R'; // Accepted, Error, Rejected
  /** Response code */
  responseCode?: string;
  /** Response message */
  responseMessage?: string;
  /** Raw response content */
  rawContent?: string;
  /** Tracking number from clearinghouse */
  trackingNumber?: string;
}

export interface ClaimResponse {
  /** Response ID */
  id: string;
  /** Claim submission ID */
  submissionId: string;
  /** Response type */
  responseType: ClaimResponseType;
  /** Status */
  status: string;
  /** Status code */
  statusCode: string;
  /** Status category code */
  statusCategoryCode?: string;
  /** Payer claim control number */
  payerClaimControlNumber?: string;
  /** Adjudication date */
  adjudicationDate?: Date;
  /** Total paid amount */
  paidAmount?: number;
  /** Patient responsibility amount */
  patientResponsibilityAmount?: number;
  /** Allowed amount */
  allowedAmount?: number;
  /** Deductible amount */
  deductibleAmount?: number;
  /** Coinsurance amount */
  coinsuranceAmount?: number;
  /** Copay amount */
  copayAmount?: number;
  /** Denial reason codes */
  denialReasonCodes?: string[];
  /** Adjustment reason codes */
  adjustmentReasonCodes?: AdjustmentReason[];
  /** Remark codes */
  remarkCodes?: string[];
  /** Line level responses */
  lineResponses?: ClaimLineResponse[];
  /** Received timestamp */
  receivedAt: Date;
}

export type ClaimResponseType =
  | '277' // Claim Status Response
  | '835' // Electronic Remittance Advice
  | '999' // Functional Acknowledgment
  | 'TA1'; // Interchange Acknowledgment

export interface ClaimLineResponse {
  /** Line item control number */
  lineItemControlNumber: string;
  /** Service line number */
  serviceLineNumber: number;
  /** Procedure code */
  procedureCode: string;
  /** Billed amount */
  billedAmount: number;
  /** Paid amount */
  paidAmount: number;
  /** Allowed amount */
  allowedAmount?: number;
  /** Adjustment reasons */
  adjustmentReasons?: AdjustmentReason[];
  /** Remark codes */
  remarkCodes?: string[];
}

export interface AdjustmentReason {
  /** Claim Adjustment Group Code (CO, CR, OA, PI, PR) */
  groupCode: AdjustmentGroupCode;
  /** Claim Adjustment Reason Code (CARC) */
  reasonCode: string;
  /** Adjustment amount */
  amount: number;
  /** Quantity */
  quantity?: number;
}

export type AdjustmentGroupCode =
  | 'CO' // Contractual Obligations
  | 'CR' // Corrections and Reversals
  | 'OA' // Other Adjustments
  | 'PI' // Payor Initiated Reductions
  | 'PR'; // Patient Responsibility

// ============================================================================
// CLAIM STATUS
// ============================================================================

export interface ClaimStatus {
  /** Claim ID */
  claimId: string;
  /** Current status */
  status: ClaimSubmissionStatus;
  /** Status category code (as per X12 277) */
  statusCategoryCode?: string;
  /** Status code */
  statusCode?: string;
  /** Status description */
  statusDescription?: string;
  /** Payer claim control number */
  payerClaimControlNumber?: string;
  /** Clearinghouse tracking number */
  clearinghouseTrackingNumber?: string;
  /** Effective date of status */
  effectiveDate: Date;
  /** Additional info */
  additionalInfo?: string;
  /** Action required flag */
  actionRequired?: boolean;
  /** Action description */
  actionDescription?: string;
}

export interface ClaimStatusHistory {
  /** History ID */
  id: string;
  /** Claim submission ID */
  claimSubmissionId: string;
  /** Status */
  status: ClaimSubmissionStatus;
  /** Previous status */
  previousStatus?: ClaimSubmissionStatus;
  /** Status code (from payer/clearinghouse) */
  statusCode?: string;
  /** Status category code */
  statusCategoryCode?: string;
  /** Details/notes */
  details?: string;
  /** Source of status update */
  source: 'system' | 'clearinghouse' | 'payer' | 'user';
  /** Timestamp */
  timestamp: Date;
  /** User ID (if user-initiated) */
  userId?: string;
}

// ============================================================================
// VALIDATION AND ERRORS
// ============================================================================

export interface ClaimError {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Field path (e.g., "patient.firstName") */
  field?: string;
  /** Segment ID (for X12 errors) */
  segment?: string;
  /** Element position (for X12 errors) */
  elementPosition?: number;
  /** Severity */
  severity: 'error' | 'fatal';
}

export interface ClaimWarning {
  /** Warning code */
  code: string;
  /** Warning message */
  message: string;
  /** Field path */
  field?: string;
  /** Segment ID */
  segment?: string;
}

export interface ClaimValidationResult {
  /** Is claim valid */
  isValid: boolean;
  /** Validation errors */
  errors: ClaimError[];
  /** Validation warnings */
  warnings: ClaimWarning[];
}

// ============================================================================
// COMPLETE CLAIM DATA STRUCTURES
// ============================================================================

export interface ProfessionalClaim {
  /** Claim header information */
  header: ClaimHeader;
  /** Billing provider */
  billingProvider: BillingProviderInfo;
  /** Rendering provider (if different from billing) */
  renderingProvider?: RenderingProviderInfo;
  /** Referring provider */
  referringProvider?: ReferringProviderInfo;
  /** Service facility */
  serviceFacility?: FacilityInfo;
  /** Subscriber information */
  subscriber: SubscriberInfo;
  /** Patient information */
  patient: PatientInfo;
  /** Payer information */
  payer: PayerInfo;
  /** Secondary payer (if applicable) */
  secondaryPayer?: PayerInfo;
  /** Diagnosis codes */
  diagnoses: DiagnosisSet;
  /** Service lines */
  serviceLines: ProcedureInfo[];
  /** Other subscriber info (for COB) */
  otherSubscriber?: SubscriberInfo;
}

export interface InstitutionalClaim {
  /** Claim header information */
  header: ClaimHeader;
  /** Billing provider */
  billingProvider: BillingProviderInfo;
  /** Attending provider */
  attendingProvider?: ProviderInfo;
  /** Operating provider */
  operatingProvider?: ProviderInfo;
  /** Other operating provider */
  otherOperatingProvider?: ProviderInfo;
  /** Rendering provider */
  renderingProvider?: RenderingProviderInfo;
  /** Referring provider */
  referringProvider?: ReferringProviderInfo;
  /** Service facility */
  serviceFacility?: FacilityInfo;
  /** Subscriber information */
  subscriber: SubscriberInfo;
  /** Patient information */
  patient: PatientInfo;
  /** Payer information */
  payer: PayerInfo;
  /** Secondary payer */
  secondaryPayer?: PayerInfo;
  /** Diagnosis codes */
  diagnoses: DiagnosisSet;
  /** Principal procedure */
  principalProcedure?: InstitutionalProcedure;
  /** Other procedures */
  otherProcedures?: InstitutionalProcedure[];
  /** Revenue code lines */
  revenueLines: RevenueCodeLine[];
  /** Occurrence codes */
  occurrenceCodes?: OccurrenceCode[];
  /** Occurrence span codes */
  occurrenceSpanCodes?: Array<{ code: string; startDate: string; endDate: string }>;
  /** Value codes */
  valueCodes?: ValueCode[];
  /** Condition codes */
  conditionCodes?: ConditionCode[];
  /** Statement from/through dates */
  statementFromDate: string;
  statementThroughDate: string;
  /** DRG code */
  drgCode?: string;
  /** Other subscriber info (for COB) */
  otherSubscriber?: SubscriberInfo;
}

// ============================================================================
// INTERCHANGE AND TRANSACTION SET INFO
// ============================================================================

export interface InterchangeInfo {
  /** Sender ID */
  senderId: string;
  /** Sender ID qualifier (ZZ=Mutually Defined, 01=Duns, etc.) */
  senderIdQualifier: string;
  /** Receiver ID */
  receiverId: string;
  /** Receiver ID qualifier */
  receiverIdQualifier: string;
  /** Interchange control number (9 digits, zero-padded) */
  interchangeControlNumber: string;
  /** Interchange date (YYMMDD) */
  interchangeDate: string;
  /** Interchange time (HHMM) */
  interchangeTime: string;
  /** Repetition separator */
  repetitionSeparator?: string;
  /** Version (00501 for 5010) */
  version: string;
  /** Acknowledgment requested (0=No, 1=Yes) */
  acknowledgmentRequested: '0' | '1';
  /** Usage indicator (P=Production, T=Test, I=Information) */
  usageIndicator: 'P' | 'T' | 'I';
}

export interface FunctionalGroupInfo {
  /** Functional identifier code (HC=Health Care Claim) */
  functionalIdentifierCode: string;
  /** Application sender code */
  applicationSenderCode: string;
  /** Application receiver code */
  applicationReceiverCode: string;
  /** Group control number */
  groupControlNumber: string;
  /** Group date (CCYYMMDD) */
  groupDate: string;
  /** Group time (HHMM or HHMMSS) */
  groupTime: string;
  /** Responsible agency code (X=Accredited Standards Committee X12) */
  responsibleAgencyCode: string;
  /** Version/Release/Industry identifier (005010X222A1 for 837P, 005010X223A2 for 837I) */
  versionIdentifier: string;
}

export interface TransactionSetInfo {
  /** Transaction set identifier (837) */
  transactionSetIdentifierCode: string;
  /** Transaction set control number (4-9 digits) */
  transactionSetControlNumber: string;
  /** Implementation convention reference */
  implementationConventionReference: string;
}
