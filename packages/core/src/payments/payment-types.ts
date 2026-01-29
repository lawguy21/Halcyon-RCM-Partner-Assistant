/**
 * Payment Types for ERA 835 Processing
 * TypeScript interfaces for payment remittance and posting
 */

// ============================================================================
// CARC/RARC ADJUSTMENT CODES
// ============================================================================

/**
 * Claim Adjustment Reason Code (CARC) categories
 * Used to explain why a claim/service was not paid at the billed amount
 */
export type CARCAdjustmentGroup =
  | 'PR' // Patient Responsibility
  | 'CO' // Contractual Obligation
  | 'OA' // Other Adjustment
  | 'PI' // Payer Initiated Reduction
  | 'CR'; // Correction/Reversal

/**
 * Individual adjustment with CARC/RARC codes
 */
export interface AdjustmentInfo {
  /** Adjustment group code */
  groupCode: CARCAdjustmentGroup;
  /** Claim Adjustment Reason Code */
  reasonCode: string;
  /** CARC description */
  reasonDescription?: string;
  /** Adjustment amount (positive = reduction) */
  amount: number;
  /** Quantity affected */
  quantity?: number;
  /** Remittance Advice Remark Code (supplementary info) */
  rarcCode?: string;
  /** RARC description */
  rarcDescription?: string;
}

// ============================================================================
// SERVICE LEVEL PAYMENT
// ============================================================================

/**
 * Service line payment from SVC segment
 */
export interface ServicePayment {
  /** Service line sequence number */
  lineNumber: number;
  /** Procedure code qualifier (HC, AD, etc.) */
  procedureQualifier: string;
  /** Procedure/service code (CPT, HCPCS) */
  procedureCode: string;
  /** Modifier codes (up to 4) */
  modifiers: string[];
  /** Original submitted charge */
  chargedAmount: number;
  /** Amount paid for this service */
  paidAmount: number;
  /** Revenue code (if applicable) */
  revenueCode?: string;
  /** Units of service */
  unitCount?: number;
  /** Original submitted units */
  originalUnits?: number;
  /** Service adjustments (CAS segments) */
  adjustments: AdjustmentInfo[];
  /** Reference identifiers (REF segments) */
  references: ServiceReference[];
  /** Service dates (DTM segments) */
  dates: ServiceDate[];
  /** Line item control number */
  controlNumber?: string;
  /** Rendering provider info */
  renderingProvider?: ProviderInfo;
}

/**
 * Service reference information
 */
export interface ServiceReference {
  /** Reference qualifier (6R=procedure control, etc.) */
  qualifier: string;
  /** Reference value */
  value: string;
}

/**
 * Service date information
 */
export interface ServiceDate {
  /** Date qualifier (472=service date, 150=service period start, etc.) */
  qualifier: string;
  /** Date value (CCYYMMDD format) */
  date: string;
  /** Formatted date */
  formattedDate?: Date;
}

// ============================================================================
// CLAIM LEVEL PAYMENT
// ============================================================================

/**
 * Claim payment status codes (CLP05)
 */
export type ClaimPaymentStatus =
  | '1'  // Processed as primary
  | '2'  // Processed as secondary
  | '3'  // Processed as tertiary
  | '4'  // Denied
  | '19' // Processed as primary, forwarded to additional payer
  | '20' // Processed as secondary, forwarded to additional payer
  | '21' // Processed as tertiary, forwarded to additional payer
  | '22' // Reversal of previous payment
  | '23' // Not our claim, forwarded to another payer
  | '25' // Predetermination pricing only - no payment
  | 'OTHER';

/**
 * Claim-level payment from CLP segment
 */
export interface ClaimPayment {
  /** Patient control number (claim number) */
  claimNumber: string;
  /** Claim status code */
  status: ClaimPaymentStatus;
  /** Status description */
  statusDescription: string;
  /** Original billed amount */
  billedAmount: number;
  /** Total paid amount */
  paidAmount: number;
  /** Patient responsibility amount */
  patientResponsibility: number;
  /** Claim filing indicator (MA=Medicare A, MB=Medicare B, etc.) */
  filingIndicator?: string;
  /** Payer's claim control number (ICN) */
  payerClaimControlNumber?: string;
  /** Facility type code */
  facilityTypeCode?: string;
  /** Claim frequency code */
  frequencyCode?: string;
  /** DRG code */
  drgCode?: string;
  /** DRG weight */
  drgWeight?: number;
  /** Discharge fraction */
  dischargeFraction?: number;
  /** Patient information */
  patient: PatientInfo;
  /** Insured information (if different from patient) */
  insured?: InsuredInfo;
  /** Corrected patient/insured info */
  correctedInfo?: CorrectedInfo;
  /** Claim-level adjustments */
  adjustments: AdjustmentInfo[];
  /** Service line payments */
  services: ServicePayment[];
  /** Reference identifiers */
  references: ClaimReference[];
  /** Important dates */
  dates: ClaimDate[];
  /** Amount fields (AMT segments) */
  amounts: ClaimAmount[];
  /** Quantity fields (QTY segments) */
  quantities: ClaimQuantity[];
  /** Rendering provider */
  renderingProvider?: ProviderInfo;
  /** Crossover carrier info */
  crossoverCarrier?: CrossoverInfo;
  /** Other subscriber info */
  otherSubscriber?: OtherSubscriberInfo;
  /** Inpatient adjudication info */
  inpatientAdjudication?: InpatientAdjudication;
  /** Outpatient adjudication info */
  outpatientAdjudication?: OutpatientAdjudication;
}

/**
 * Patient information from NM1*QC segment
 */
export interface PatientInfo {
  lastName: string;
  firstName?: string;
  middleName?: string;
  suffix?: string;
  /** Identification qualifier (MI=member ID, HN=HIC number) */
  idQualifier?: string;
  /** Patient identifier */
  id?: string;
}

/**
 * Insured information from NM1*IL segment
 */
export interface InsuredInfo {
  lastName: string;
  firstName?: string;
  middleName?: string;
  suffix?: string;
  idQualifier?: string;
  id?: string;
}

/**
 * Corrected patient/insured information from NM1*74 segment
 */
export interface CorrectedInfo {
  lastName: string;
  firstName?: string;
  middleName?: string;
  idQualifier?: string;
  id?: string;
}

/**
 * Provider information
 */
export interface ProviderInfo {
  /** Entity type (1=person, 2=organization) */
  entityType: '1' | '2';
  lastName?: string;
  firstName?: string;
  organizationName?: string;
  /** NPI or other identifier */
  npi?: string;
  idQualifier?: string;
  id?: string;
}

/**
 * Claim reference information
 */
export interface ClaimReference {
  qualifier: string;
  value: string;
  description?: string;
}

/**
 * Claim date information
 */
export interface ClaimDate {
  qualifier: string;
  date: string;
  formattedDate?: Date;
  endDate?: string;
  description?: string;
}

/**
 * Claim amount information
 */
export interface ClaimAmount {
  /** Amount qualifier (AU=coverage amount, D8=discount, etc.) */
  qualifier: string;
  amount: number;
  description?: string;
}

/**
 * Claim quantity information
 */
export interface ClaimQuantity {
  qualifier: string;
  quantity: number;
  description?: string;
}

/**
 * Crossover carrier information
 */
export interface CrossoverInfo {
  carrierName: string;
  carrierId?: string;
}

/**
 * Other subscriber information
 */
export interface OtherSubscriberInfo {
  lastName: string;
  firstName?: string;
  id?: string;
}

/**
 * Inpatient adjudication information from MIA segment
 */
export interface InpatientAdjudication {
  coveredDaysOrVisits?: number;
  lifetimeReserveDays?: number;
  claimDRGAmount?: number;
  claimPaymentRemarkCode?: string;
  claimDisproportionateShareAmount?: number;
  claimMSPPassthroughAmount?: number;
  claimPPSCapitalAmount?: number;
  ppsCapitalFSPDRGAmount?: number;
  ppsCapitalHSPDRGAmount?: number;
  ppsCapitalDSHDRGAmount?: number;
  oldCapitalAmount?: number;
  ppsCapitalIMEAmount?: number;
  ppsOperatingHospitalSpecificDRGAmount?: number;
  costReportDayCount?: number;
  ppsOperatingFederalSpecificDRGAmount?: number;
  claimPPSCapitalOutlierAmount?: number;
  claimIndirectTeachingAmount?: number;
  nonpayableProfessionalComponentAmount?: number;
  remarkCodes: string[];
}

/**
 * Outpatient adjudication information from MOA segment
 */
export interface OutpatientAdjudication {
  reimbursementRate?: number;
  claimHCPCSPayableAmount?: number;
  remarkCode1?: string;
  remarkCode2?: string;
  remarkCode3?: string;
  remarkCode4?: string;
  remarkCode5?: string;
  endStageRenalDiseasePaymentAmount?: number;
  nonpayableProfessionalComponentAmount?: number;
  remarkCodes: string[];
}

// ============================================================================
// PAYMENT REMITTANCE (TRANSACTION LEVEL)
// ============================================================================

/**
 * Payment method code (BPR04)
 */
export type PaymentMethod =
  | 'ACH' // Automated Clearing House
  | 'BOP' // Financial Institution Option
  | 'CHK' // Check
  | 'FWT' // Fed Wire Transfer
  | 'NON'; // Non-payment data

/**
 * Payer/Payee information from N1 segment
 */
export interface PayerPayeeInfo {
  /** Entity identifier code (PR=payer, PE=payee) */
  entityType: 'PR' | 'PE';
  name: string;
  /** Identification qualifier */
  idQualifier?: string;
  /** Payer/Payee ID (Tax ID, NPI, etc.) */
  id?: string;
  /** Additional identification */
  additionalIds: Array<{
    qualifier: string;
    id: string;
  }>;
  /** Contact information */
  contact?: ContactInfo;
  /** Address */
  address?: AddressInfo;
}

/**
 * Contact information from PER segment
 */
export interface ContactInfo {
  name?: string;
  phoneNumber?: string;
  faxNumber?: string;
  email?: string;
  url?: string;
}

/**
 * Address information from N3/N4 segments
 */
export interface AddressInfo {
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

/**
 * Financial information from BPR segment
 */
export interface FinancialInfo {
  /** Transaction handling code */
  transactionHandlingCode: string;
  /** Total payment amount */
  totalAmount: number;
  /** Credit/Debit indicator */
  creditDebitFlag: 'C' | 'D';
  /** Payment method */
  paymentMethod: PaymentMethod;
  /** Payment format (CCP, CTX, etc.) */
  paymentFormat?: string;
  /** DFI ID qualifier (originating bank) */
  senderBankIdQualifier?: string;
  /** Sender bank ID */
  senderBankId?: string;
  /** Account number qualifier */
  senderAccountQualifier?: string;
  /** Sender account number */
  senderAccountNumber?: string;
  /** Originating company ID */
  originatingCompanyId?: string;
  /** Receiver bank ID qualifier */
  receiverBankIdQualifier?: string;
  /** Receiver bank ID */
  receiverBankId?: string;
  /** Receiver account qualifier */
  receiverAccountQualifier?: string;
  /** Receiver account number */
  receiverAccountNumber?: string;
  /** Check/EFT effective date */
  effectiveDate?: string;
}

/**
 * Reassociation trace number from TRN segment
 */
export interface TraceNumber {
  /** Trace type code */
  traceType: string;
  /** Check/EFT trace number */
  traceNumber: string;
  /** Originating company ID */
  originatingCompanyId?: string;
  /** Originating company supplemental code */
  originatingCompanySupplementalCode?: string;
}

/**
 * Provider summary information from PLB segment
 */
export interface ProviderLevelAdjustment {
  /** Provider identifier */
  providerId: string;
  /** Fiscal period date */
  fiscalPeriodDate: string;
  /** Adjustment reason code */
  adjustmentCode: string;
  /** Reference ID */
  referenceId?: string;
  /** Adjustment amount */
  amount: number;
}

/**
 * Complete ERA 835 payment remittance
 */
export interface PaymentRemittance {
  /** Unique identifier for the remittance */
  id?: string;

  // ISA/GS header info
  /** Interchange sender ID */
  interchangeSenderId: string;
  /** Interchange receiver ID */
  interchangeReceiverId: string;
  /** Interchange date (YYMMDD) */
  interchangeDate: string;
  /** Interchange time (HHMM) */
  interchangeTime: string;
  /** Interchange control number */
  interchangeControlNumber: string;
  /** Functional group control number */
  groupControlNumber: string;
  /** Transaction set control number */
  transactionSetControlNumber: string;

  // Financial info (BPR segment)
  /** Financial/payment information */
  financialInfo: FinancialInfo;

  // Trace number (TRN segment)
  /** Trace number for reassociation */
  traceNumber: TraceNumber;

  // Receiver info
  /** Receiver identification */
  receiverId?: string;
  /** Receiver info from CUR segment */
  currencyCode?: string;

  // Payer/Payee info (N1 loops)
  /** Payer information */
  payer: PayerPayeeInfo;
  /** Payee information */
  payee: PayerPayeeInfo;

  // Production date
  /** Production date from DTM*405 */
  productionDate?: string;

  // Claims
  /** All claim payments in this remittance */
  claims: ClaimPayment[];

  // Provider level adjustments (PLB segment)
  /** Provider-level adjustments (refunds, prior period adjustments) */
  providerAdjustments: ProviderLevelAdjustment[];

  // Summary totals (calculated)
  /** Summary statistics */
  summary: PaymentSummary;

  // Original file info
  /** Original 835 file content */
  rawContent?: string;
  /** File name */
  fileName?: string;
  /** File processing date */
  processedAt?: Date;
  /** Processing status */
  status?: RemittanceStatus;
}

/**
 * Remittance processing status
 */
export type RemittanceStatus =
  | 'PENDING'       // Parsed but not reviewed
  | 'REVIEWED'      // Reviewed but not posted
  | 'PARTIAL'       // Partially posted
  | 'POSTED'        // Fully posted
  | 'RECONCILED'    // Reconciled with bank deposit
  | 'ERROR';        // Error during processing

/**
 * Payment summary statistics
 */
export interface PaymentSummary {
  /** Total number of claims */
  totalClaims: number;
  /** Number of fully paid claims */
  paidClaims: number;
  /** Number of denied claims */
  deniedClaims: number;
  /** Number of partially paid claims */
  partialClaims: number;
  /** Total billed amount across all claims */
  totalBilled: number;
  /** Total paid amount */
  totalPaid: number;
  /** Total adjustments (contractual + other) */
  totalAdjustments: number;
  /** Total patient responsibility */
  totalPatientResponsibility: number;
  /** Total contractual adjustments (CO group) */
  contractualAdjustments: number;
  /** Total other adjustments */
  otherAdjustments: number;
  /** Provider-level adjustments total */
  providerAdjustmentsTotal: number;
  /** Net payment (totalPaid - providerAdjustments) */
  netPayment: number;
}

// ============================================================================
// REMITTANCE ADVICE (USER-FRIENDLY VIEW)
// ============================================================================

/**
 * Remittance advice - user-friendly summary of ERA
 */
export interface RemittanceAdvice {
  /** Remittance identifier */
  id: string;
  /** Check/EFT number */
  checkNumber: string;
  /** Check/EFT date */
  checkDate: Date;
  /** Total payment amount */
  totalAmount: number;
  /** Payer name */
  payerName: string;
  /** Payer ID */
  payerId?: string;
  /** Payee (provider) name */
  payeeName: string;
  /** Payee Tax ID or NPI */
  payeeId?: string;
  /** Payment method */
  paymentMethod: PaymentMethod;
  /** Production date */
  productionDate?: Date;
  /** Claim count */
  claimCount: number;
  /** Summary */
  summary: PaymentSummary;
  /** Status */
  status: RemittanceStatus;
  /** Date received/imported */
  receivedDate: Date;
  /** Reconciliation status */
  reconciled: boolean;
  /** Deposit ID (if reconciled) */
  depositId?: string;
}

// ============================================================================
// MATCHING & POSTING TYPES
// ============================================================================

/**
 * Match confidence level
 */
export type MatchConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'MANUAL';

/**
 * Payment match result
 */
export interface PaymentMatchResult {
  /** Matched claim payment from ERA */
  eraPayment: ClaimPayment;
  /** Matched claim in system (if found) */
  matchedClaimId?: string;
  /** Confidence level */
  confidence: MatchConfidence;
  /** Match method used */
  matchMethod: 'CLAIM_NUMBER' | 'PATIENT' | 'AMOUNT' | 'MANUAL';
  /** Variance between expected and actual (if any) */
  variance?: PaymentVariance;
  /** Suggested actions */
  suggestedActions: string[];
}

/**
 * Payment variance details
 */
export interface PaymentVariance {
  /** Expected payment based on contract/fee schedule */
  expectedAmount: number;
  /** Actual payment received */
  actualAmount: number;
  /** Variance amount (actual - expected) */
  varianceAmount: number;
  /** Variance percentage */
  variancePercentage: number;
  /** Variance reason */
  reason?: string;
  /** Is this an underpayment? */
  isUnderpayment: boolean;
}

/**
 * Write-off recommendation
 */
export interface WriteOffRecommendation {
  /** Adjustment that should be written off */
  adjustment: AdjustmentInfo;
  /** Recommended write-off code in your system */
  writeOffCode: string;
  /** Write-off reason description */
  reason: string;
  /** Amount to write off */
  amount: number;
  /** Requires approval? */
  requiresApproval: boolean;
  /** Auto-post eligible? */
  autoPostEligible: boolean;
}

/**
 * Posting result
 */
export interface PostingResult {
  /** Was posting successful? */
  success: boolean;
  /** Posted payment ID */
  paymentId?: string;
  /** Error message if failed */
  error?: string;
  /** Warnings */
  warnings: string[];
  /** Amount posted */
  amountPosted: number;
  /** Adjustments posted */
  adjustmentsPosted: AdjustmentInfo[];
  /** Write-offs created */
  writeOffsCreated: WriteOffRecommendation[];
}

/**
 * Reconciliation result
 */
export interface ReconciliationResult {
  /** Deposit ID */
  depositId: string;
  /** Deposit amount from bank */
  depositAmount: number;
  /** Total of matched remittances */
  matchedAmount: number;
  /** Variance */
  variance: number;
  /** Is reconciled? */
  isReconciled: boolean;
  /** Matched remittance IDs */
  matchedRemittances: string[];
  /** Unmatched remittances */
  unmatchedRemittances: string[];
  /** Notes */
  notes: string[];
}
