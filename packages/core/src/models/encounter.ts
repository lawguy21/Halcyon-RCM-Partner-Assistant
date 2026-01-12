/**
 * Encounter/Visit interfaces for Hospital Recovery Engine
 */

// ============================================================================
// ENCOUNTER TYPES
// ============================================================================

export type EncounterType =
  | 'ED visit'
  | 'Inpatient'
  | 'Observation'
  | 'Outpatient procedure'
  | 'Outpatient clinic'
  | 'Recurring care'
  | 'Discharge planning';

export type EncounterTypeSimple = 'inpatient' | 'observation' | 'ed' | 'outpatient';

export type PatientLocation =
  | 'Still in hospital'
  | 'Discharged'
  | 'Transferred'
  | 'Outpatient';

export type ServiceLine =
  | 'Medicine'
  | 'Surgery'
  | 'Cardiology'
  | 'Orthopedics'
  | 'Oncology'
  | 'Neurology'
  | 'Psychiatry'
  | 'Pulmonology'
  | 'Nephrology'
  | 'GI'
  | 'OB/GYN'
  | 'Pediatrics'
  | 'Rehab'
  | 'Other';

export type ScreeningTrigger =
  | 'Self-pay'
  | 'Multiple ED visits'
  | 'Extended LOS'
  | 'Discharge issues'
  | 'Patient request'
  | 'Social work referral'
  | 'Case management'
  | 'Financial counselor'
  | 'Clinical concern'
  | 'SNF discharge';

// ============================================================================
// HOSPITAL ENCOUNTER
// ============================================================================

export interface HospitalEncounter {
  encounterType: EncounterType;
  admissionDate: string;
  dischargeDate?: string;
  currentLocation: PatientLocation;
  roomUnit?: string;
  primaryServiceLine: ServiceLine;
  estimatedCharges?: number;
  referringDepartment: string;
  screeningTriggers: ScreeningTrigger[];
}

// ============================================================================
// MEDICAL CONDITIONS
// ============================================================================

// Cardiovascular conditions
export type CardiovascularCondition =
  | 'CHF'
  | 'CAD'
  | 'Cardiomyopathy'
  | 'MI history'
  | 'Heart transplant'
  | 'Arrhythmia w/device'
  | 'PVD'
  | 'Aortic aneurysm';

// Respiratory conditions
export type RespiratoryCondition =
  | 'COPD'
  | 'Chronic bronchitis'
  | 'Pulmonary fibrosis'
  | 'Pulmonary HTN'
  | 'Severe sleep apnea'
  | 'Lung transplant'
  | 'Oxygen dependent';

// Musculoskeletal conditions
export type MusculoskeletalCondition =
  | 'DDD'
  | 'Spinal stenosis'
  | 'Failed back surgery'
  | 'RA'
  | 'Severe OA'
  | 'Fibromyalgia'
  | 'Lupus'
  | 'Multiple joint replacements'
  | 'Amputation';

// Neurological conditions
export type NeurologicalCondition =
  | 'Stroke/CVA'
  | 'MS'
  | "Parkinson's"
  | 'Epilepsy'
  | 'Neuropathy'
  | 'ALS'
  | 'TBI'
  | 'Dementia';

// Metabolic conditions
export type MetabolicCondition =
  | 'Insulin-dependent diabetes'
  | 'Diabetes w/complications'
  | 'CKD'
  | 'ESRD/Dialysis'
  | 'Cirrhosis'
  | 'Chronic Hep C';

// Cancer conditions
export type CancerCondition =
  | 'Active cancer'
  | 'Metastatic'
  | 'In remission'
  | 'Blood cancer';

// Other chronic conditions
export type OtherChronicCondition =
  | 'HIV/AIDS'
  | 'Transplant recipient'
  | 'Chronic pain'
  | 'Obesity BMI>40'
  | 'Sickle cell'
  | 'IBD';

export type ChronicCondition =
  | CardiovascularCondition
  | RespiratoryCondition
  | MusculoskeletalCondition
  | NeurologicalCondition
  | MetabolicCondition
  | CancerCondition
  | OtherChronicCondition;

export type MentalHealthCondition =
  | 'Major depression'
  | 'Bipolar'
  | 'Schizophrenia'
  | 'PTSD'
  | 'Severe anxiety'
  | 'Personality disorder'
  | 'Intellectual disability'
  | 'Autism'
  | 'Substance use disorder in recovery'
  | 'None';

export type HospitalizationFrequency =
  | 'First hospitalization'
  | '2-3'
  | '4-5'
  | '6+'
  | 'Unknown';

export type SurgicalHistoryOption =
  | 'Cardiac surgery'
  | 'Spinal surgery'
  | 'Joint replacement'
  | 'Organ transplant'
  | 'Cancer surgery'
  | 'Amputation'
  | 'Brain surgery'
  | 'Abdominal surgery'
  | 'Other'
  | 'None';

export interface ICUStayInfo {
  hasICUStay: boolean;
  numberOfStays?: number;
  totalDays?: number;
}

export interface MedicalConditions {
  primaryDiagnosis: string;
  secondaryDiagnoses: string;
  chronicConditions: ChronicCondition[];
  mentalHealthConditions: MentalHealthCondition[];
  hospitalizationsLast12Months: HospitalizationFrequency;
  icuStays: ICUStayInfo;
  surgicalHistory: SurgicalHistoryOption[];
}

// ============================================================================
// TREATMENT & DOCUMENTATION
// ============================================================================

export interface TreatingPhysician {
  name: string;
  specialty: string;
  phone: string;
  lastSeen: string;
}

export type RegularMedicalCare =
  | 'Yes consistent'
  | 'Sporadic'
  | 'No regular care'
  | 'Hospital is primary';

export type RecentTest =
  | 'MRI'
  | 'CT'
  | 'X-ray'
  | 'Echo'
  | 'Stress test'
  | 'PFT'
  | 'Sleep study'
  | 'EMG'
  | 'EEG'
  | 'Labs'
  | 'Biopsy'
  | 'Mental health eval'
  | 'Neuropsych testing'
  | 'FCE'
  | 'Other';

export interface UpcomingAppointmentInfo {
  hasAppointment: boolean;
  appointmentDate?: string;
}

export interface TreatmentDocumentation {
  treatingPhysicians: TreatingPhysician[];
  regularMedicalCare: RegularMedicalCare;
  treatmentGaps?: string;
  currentMedications: string;
  recentTests: RecentTest[];
  upcomingAppointments: UpcomingAppointmentInfo;
}

// ============================================================================
// FACILITY TYPES
// ============================================================================

export type FacilityType =
  | 'public_hospital'
  | 'dsh_hospital'
  | 'safety_net'
  | 'critical_access'
  | 'standard';

// ============================================================================
// HOSPITAL RECOVERY INPUT (Main input type for recovery engine)
// ============================================================================

export interface HospitalRecoveryInput {
  // Patient Demographics
  stateOfResidence: string;
  stateOfService: string;
  dateOfService: string;

  // Encounter Details
  encounterType: EncounterTypeSimple;
  lengthOfStay?: number; // Inpatient days
  totalCharges: number;

  // Insurance Status on Date of Service
  insuranceStatusOnDOS: 'uninsured' | 'underinsured' | 'medicaid' | 'medicare' | 'commercial';
  highCostSharing?: boolean; // For underinsured

  // Medicaid/Medicare/SSI Indicators
  medicaidStatus: 'active' | 'pending' | 'recently_terminated' | 'never' | 'unknown';
  medicaidTerminationDate?: string;
  medicareStatus: 'active_part_a' | 'active_part_b' | 'pending' | 'none';
  ssiStatus: 'receiving' | 'pending' | 'denied' | 'never_applied' | 'unknown';
  ssdiStatus: 'receiving' | 'pending' | 'denied' | 'never_applied' | 'unknown';

  // Financial Screening
  householdIncome: 'under_fpl' | 'fpl_138' | 'fpl_200' | 'fpl_250' | 'fpl_300' | 'fpl_400' | 'over_400_fpl';
  householdSize: number;
  estimatedAssets: 'under_2000' | '2000_5000' | '5000_10000' | 'over_10000' | 'unknown';

  // Disability Assessment (from SSA engine)
  disabilityLikelihood: 'high' | 'medium' | 'low';
  ssiEligibilityLikely: boolean;
  ssdiEligibilityLikely: boolean;

  // Facility Information
  facilityType?: FacilityType;
  facilityState: string;

  // Service Details
  emergencyService: boolean;
  medicallyNecessary: boolean;
}
