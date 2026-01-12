/**
 * AI Document Parser Types
 * Type definitions for AI-powered document extraction
 */

/**
 * Raw extracted data from documents
 */
export interface ExtractedDocumentData {
  // Patient Information
  patientName?: string;
  patientFirstName?: string;
  patientLastName?: string;
  dateOfBirth?: string;
  patientAddress?: string;
  patientState?: string;

  // Account/Encounter Information
  accountNumber?: string;
  mrn?: string;
  dateOfService?: string;
  admissionDate?: string;
  dischargeDate?: string;
  encounterType?: string;
  lengthOfStay?: number;

  // Financial Information
  totalCharges?: number;
  totalBilled?: number;
  amountDue?: number;

  // Facility Information
  facilityName?: string;
  facilityState?: string;
  facilityType?: string;

  // Insurance Information
  insuranceType?: string;
  insuranceName?: string;
  insuranceId?: string;
  medicaidId?: string;
  medicareId?: string;
  policyNumber?: string;
  groupNumber?: string;

  // Medical Information
  diagnoses?: string[];
  procedures?: string[];
  primaryDiagnosis?: string;

  // Document Classification
  documentType?: string;
}

/**
 * AI parsing result from a single model
 */
export interface AIParseResult {
  model: string;
  data: ExtractedDocumentData | null;
  confidence: number;
  error?: string;
  responseTime: number;
}

/**
 * Consensus result from ensemble parsing
 */
export interface ConsensusResult {
  consensus: ExtractedDocumentData;
  confidence: number;
  agreementScore: number;
  modelResults: AIParseResult[];
}

/**
 * Mapped assessment fields ready for form
 */
export interface MappedAssessmentFields {
  // Patient Demographics
  patientName?: string;
  dateOfBirth?: string;
  stateOfResidence?: string;

  // Encounter Details
  accountNumber?: string;
  dateOfService?: string;
  encounterType?: 'inpatient' | 'observation' | 'ed' | 'outpatient';
  lengthOfStay?: number;
  totalCharges?: number;

  // Facility
  facilityState?: string;
  facilityType?: 'public_hospital' | 'dsh_hospital' | 'safety_net' | 'critical_access' | 'standard';

  // Insurance Status
  insuranceStatusOnDOS?: 'uninsured' | 'underinsured' | 'medicaid' | 'medicare' | 'commercial';
  medicaidStatus?: 'active' | 'pending' | 'recently_terminated' | 'never' | 'unknown';
  medicareStatus?: 'active_part_a' | 'active_part_b' | 'pending' | 'none';

  // Inferred Fields
  disabilityLikelihood?: 'high' | 'medium' | 'low';

  // Confidence scores for each field
  _confidence: Record<string, number>;
  _documentType?: string;
}

/**
 * Document types for classification
 */
export type DocumentType =
  | 'HOSPITAL_BILL'
  | 'UB04_CLAIM'
  | 'MEDICAL_RECORD'
  | 'DISCHARGE_SUMMARY'
  | 'INSURANCE_EOB'
  | 'INSURANCE_CARD'
  | 'PATIENT_INFO_FORM'
  | 'MIXED'
  | 'UNKNOWN';
