/**
 * RCM Field Mapper
 * Maps extracted document data to assessment form fields
 */

import type { ExtractedDocumentData, MappedAssessmentFields } from './types.js';

/**
 * Map extracted document data to assessment form fields
 */
export function mapToAssessmentFields(
  extracted: ExtractedDocumentData,
  confidence: number = 0.8
): MappedAssessmentFields {
  const fieldConfidence: Record<string, number> = {};

  // Patient Name
  let patientName = extracted.patientName || '';
  if (!patientName && (extracted.patientFirstName || extracted.patientLastName)) {
    patientName = `${extracted.patientFirstName || ''} ${extracted.patientLastName || ''}`.trim();
  }
  fieldConfidence.patientName = patientName ? confidence : 0;

  // Date of Birth
  fieldConfidence.dateOfBirth = extracted.dateOfBirth ? confidence : 0;

  // State of Residence
  const stateOfResidence = extracted.patientState || extracted.facilityState || '';
  fieldConfidence.stateOfResidence = stateOfResidence ? confidence * 0.8 : 0;

  // Account Number
  const accountNumber = extracted.accountNumber || extracted.mrn || '';
  fieldConfidence.accountNumber = accountNumber ? confidence : 0;

  // Date of Service
  const dateOfService = extracted.dateOfService || extracted.admissionDate || '';
  fieldConfidence.dateOfService = dateOfService ? confidence : 0;

  // Encounter Type
  const encounterType = mapEncounterType(extracted.encounterType);
  fieldConfidence.encounterType = encounterType ? confidence : 0;

  // Length of Stay
  let lengthOfStay = extracted.lengthOfStay;
  if (!lengthOfStay && extracted.admissionDate && extracted.dischargeDate) {
    lengthOfStay = calculateLengthOfStay(extracted.admissionDate, extracted.dischargeDate);
  }
  fieldConfidence.lengthOfStay = lengthOfStay ? confidence : 0;

  // Total Charges
  const totalCharges = extracted.totalCharges || extracted.totalBilled;
  fieldConfidence.totalCharges = totalCharges ? confidence : 0;

  // Facility State
  const facilityState = extracted.facilityState || extracted.patientState || '';
  fieldConfidence.facilityState = facilityState ? confidence : 0;

  // Facility Type (inferred from facility name)
  const facilityType = inferFacilityType(extracted.facilityName);
  fieldConfidence.facilityType = facilityType ? confidence * 0.5 : 0;

  // Insurance Status
  const insuranceStatus = mapInsuranceStatus(extracted);
  fieldConfidence.insuranceStatusOnDOS = insuranceStatus.status ? confidence : 0;
  fieldConfidence.medicaidStatus = insuranceStatus.medicaidStatus ? confidence : 0;
  fieldConfidence.medicareStatus = insuranceStatus.medicareStatus ? confidence : 0;

  // Disability Likelihood (inferred from diagnoses)
  const disabilityLikelihood = inferDisabilityLikelihood(extracted.diagnoses || []);
  fieldConfidence.disabilityLikelihood = disabilityLikelihood ? confidence * 0.6 : 0;

  return {
    patientName: patientName || undefined,
    dateOfBirth: extracted.dateOfBirth || undefined,
    stateOfResidence: stateOfResidence || undefined,
    accountNumber: accountNumber || undefined,
    dateOfService: dateOfService || undefined,
    encounterType: encounterType || undefined,
    lengthOfStay: lengthOfStay || undefined,
    totalCharges: totalCharges || undefined,
    facilityState: facilityState || undefined,
    facilityType: facilityType || undefined,
    insuranceStatusOnDOS: insuranceStatus.status || undefined,
    medicaidStatus: insuranceStatus.medicaidStatus || undefined,
    medicareStatus: insuranceStatus.medicareStatus || undefined,
    disabilityLikelihood: disabilityLikelihood || undefined,
    _confidence: fieldConfidence,
    _documentType: extracted.documentType,
  };
}

/**
 * Map encounter type to valid enum value
 */
function mapEncounterType(
  type?: string
): 'inpatient' | 'observation' | 'ed' | 'outpatient' | undefined {
  if (!type) return undefined;

  const normalized = type.toLowerCase().trim();

  if (normalized === 'inpatient' || normalized === 'ip') return 'inpatient';
  if (normalized === 'observation' || normalized === 'obs') return 'observation';
  if (normalized === 'ed' || normalized === 'er' || normalized === 'emergency') return 'ed';
  if (normalized === 'outpatient' || normalized === 'op') return 'outpatient';

  return undefined;
}

/**
 * Calculate length of stay from dates
 */
function calculateLengthOfStay(admitDate: string, dischargeDate: string): number | undefined {
  try {
    const admit = new Date(admitDate);
    const discharge = new Date(dischargeDate);

    if (isNaN(admit.getTime()) || isNaN(discharge.getTime())) {
      return undefined;
    }

    const diffTime = Math.abs(discharge.getTime() - admit.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays > 0 ? diffDays : 1; // Minimum 1 day
  } catch {
    return undefined;
  }
}

/**
 * Infer facility type from name
 */
function inferFacilityType(
  facilityName?: string
): 'public_hospital' | 'dsh_hospital' | 'safety_net' | 'critical_access' | 'standard' | undefined {
  if (!facilityName) return undefined;

  const name = facilityName.toLowerCase();

  if (name.includes('county') || name.includes('public') || name.includes('municipal')) {
    return 'public_hospital';
  }
  if (name.includes('safety net') || name.includes('community health')) {
    return 'safety_net';
  }
  if (name.includes('critical access') || name.includes('rural')) {
    return 'critical_access';
  }

  return 'standard';
}

/**
 * Map insurance information to status fields
 */
function mapInsuranceStatus(extracted: ExtractedDocumentData): {
  status?: 'uninsured' | 'underinsured' | 'medicaid' | 'medicare' | 'commercial';
  medicaidStatus?: 'active' | 'pending' | 'recently_terminated' | 'never' | 'unknown';
  medicareStatus?: 'active_part_a' | 'active_part_b' | 'pending' | 'none';
} {
  const result: ReturnType<typeof mapInsuranceStatus> = {};

  // Check for Medicaid
  if (extracted.medicaidId || extracted.insuranceType?.toLowerCase().includes('medicaid')) {
    result.status = 'medicaid';
    result.medicaidStatus = 'active';
  }
  // Check for Medicare
  else if (extracted.medicareId || extracted.insuranceType?.toLowerCase().includes('medicare')) {
    result.status = 'medicare';
    result.medicareStatus = 'active_part_a';
  }
  // Check for commercial insurance
  else if (extracted.insuranceType?.toLowerCase().includes('commercial') ||
           extracted.insuranceType?.toLowerCase().includes('private') ||
           extracted.insuranceName) {
    result.status = 'commercial';
    result.medicaidStatus = 'never';
    result.medicareStatus = 'none';
  }
  // Self-pay / Uninsured
  else if (extracted.insuranceType?.toLowerCase().includes('self') ||
           extracted.insuranceType?.toLowerCase().includes('uninsured') ||
           extracted.insuranceType?.toLowerCase().includes('cash')) {
    result.status = 'uninsured';
    result.medicaidStatus = 'unknown';
    result.medicareStatus = 'none';
  }

  return result;
}

/**
 * Infer disability likelihood from diagnoses
 */
function inferDisabilityLikelihood(
  diagnoses: string[]
): 'high' | 'medium' | 'low' | undefined {
  if (!diagnoses || diagnoses.length === 0) return undefined;

  const diagnosesLower = diagnoses.map(d => d.toLowerCase());

  // High likelihood conditions
  const highLikelihood = [
    'cancer', 'dialysis', 'transplant', 'stroke', 'paralysis',
    'heart failure', 'chf', 'copd', 'end stage', 'terminal',
    'chronic kidney', 'renal failure', 'dementia', 'alzheimer',
  ];

  // Medium likelihood conditions
  const mediumLikelihood = [
    'diabetes', 'hypertension', 'depression', 'anxiety',
    'back pain', 'arthritis', 'asthma', 'chronic pain',
  ];

  for (const diagnosis of diagnosesLower) {
    for (const condition of highLikelihood) {
      if (diagnosis.includes(condition)) return 'high';
    }
  }

  for (const diagnosis of diagnosesLower) {
    for (const condition of mediumLikelihood) {
      if (diagnosis.includes(condition)) return 'medium';
    }
  }

  return 'low';
}

/**
 * Get fields with low confidence that need user review
 */
export function getLowConfidenceFields(
  mapped: MappedAssessmentFields,
  threshold: number = 0.7
): string[] {
  const lowConfidence: string[] = [];

  for (const [field, confidence] of Object.entries(mapped._confidence)) {
    if (confidence > 0 && confidence < threshold) {
      lowConfidence.push(field);
    }
  }

  return lowConfidence;
}

/**
 * Get fields with high confidence that were auto-filled
 */
export function getHighConfidenceFields(
  mapped: MappedAssessmentFields,
  threshold: number = 0.9
): string[] {
  const highConfidence: string[] = [];

  for (const [field, confidence] of Object.entries(mapped._confidence)) {
    if (confidence >= threshold) {
      highConfidence.push(field);
    }
  }

  return highConfidence;
}
