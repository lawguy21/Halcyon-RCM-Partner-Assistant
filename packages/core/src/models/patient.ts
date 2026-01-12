/**
 * Patient-related interfaces for Hospital Recovery Engine
 */

// ============================================================================
// PATIENT DEMOGRAPHICS
// ============================================================================

export type PrimaryLanguage =
  | 'English'
  | 'Spanish'
  | 'Chinese'
  | 'Vietnamese'
  | 'Korean'
  | 'Tagalog'
  | 'Arabic'
  | 'Other';

export type PreferredContactMethod = 'Phone' | 'Email' | 'Mail' | 'In-Person';

export interface PatientIdentification {
  patientMRN: string;
  patientName: string;
  dateOfBirth: string;
  ssnLast4?: string;
  contactPhone: string;
  contactEmail?: string;
  primaryLanguage: PrimaryLanguage;
  preferredContact: PreferredContactMethod;
}

// ============================================================================
// INSURANCE & FINANCIAL STATUS
// ============================================================================

export type InsuranceStatusOption =
  | 'No insurance'
  | 'Self-pay'
  | 'Underinsured'
  | 'Medicaid pending'
  | 'Medicaid active'
  | 'Medicare'
  | 'Private insurance'
  | 'Workers comp'
  | 'VA benefits';

export type SSISSdiStatus =
  | 'Never applied'
  | 'Currently pending'
  | 'Denied'
  | 'Receiving SSI'
  | 'Receiving SSDI'
  | 'Unknown';

export type IncomeRange =
  | '<$943'
  | '$943-1500'
  | '$1500-2500'
  | '$2500-4000'
  | '>$4000'
  | 'Unknown';

export type AssetRange =
  | '<$2000'
  | '$2000-5000'
  | '$5000-10000'
  | '>$10000'
  | 'Unknown';

export type WorkStatus =
  | 'Full-time'
  | 'Part-time'
  | 'Sporadic'
  | 'Not working'
  | 'Unable to work';

export type YesNoUnknown = 'Yes' | 'No' | 'Unknown';

export interface InsuranceFinancialStatus {
  insuranceStatus: InsuranceStatusOption[];
  medicaidAppDate?: string;
  previousMedicaid: YesNoUnknown;
  ssiSsdiStatus: SSISSdiStatus;
  monthlyIncome: IncomeRange;
  totalAssets: AssetRange;
  householdSize: number;
  currentlyWorking: WorkStatus;
  monthlyEarnings?: number;
}

// ============================================================================
// FUNCTIONAL ASSESSMENT
// ============================================================================

export type MobilityStatus =
  | 'Ambulatory'
  | 'Ambulatory w/device'
  | 'Wheelchair'
  | 'Bedbound'
  | 'Variable';

export type AssistiveDevice =
  | 'Cane'
  | 'Walker'
  | 'Wheelchair'
  | 'Scooter'
  | 'Prosthetic'
  | 'Oxygen'
  | 'CPAP'
  | 'Hearing aids'
  | 'Feeding tube'
  | 'Catheter'
  | 'Ostomy'
  | 'None';

// ADL Difficulties by category
export type SelfCareDifficulty =
  | 'Bathing'
  | 'Dressing'
  | 'Grooming'
  | 'Toileting'
  | 'Eating';

export type MobilityDifficulty =
  | 'Walking 100ft'
  | 'Standing 15min'
  | 'Sitting 30min'
  | 'Stairs'
  | 'Bed transfers'
  | 'Car transfers';

export type ActivityDifficulty =
  | 'Cooking'
  | 'Cleaning'
  | 'Shopping'
  | 'Managing meds'
  | 'Managing finances'
  | 'Phone use'
  | 'Driving';

export type PhysicalDifficulty =
  | 'Lifting 10lbs'
  | 'Bending'
  | 'Reaching overhead'
  | 'Fine motor'
  | 'Grip strength';

export type ADLDifficulty =
  | SelfCareDifficulty
  | MobilityDifficulty
  | ActivityDifficulty
  | PhysicalDifficulty;

export interface ADLDifficulties {
  selfCare: SelfCareDifficulty[];
  mobility: MobilityDifficulty[];
  activities: ActivityDifficulty[];
  physical: PhysicalDifficulty[];
}

export type CognitiveStatus =
  | 'Alert/oriented'
  | 'Mild memory issues'
  | 'Moderate impairment'
  | 'Severe impairment'
  | 'Fluctuating'
  | 'Unable to assess';

export type LastWorkedTimeframe =
  | 'Currently working'
  | '<1 month'
  | '1-6 months'
  | '6-12 months'
  | '1-2 years'
  | '>2 years'
  | 'Never worked'
  | 'Unknown';

export type ReasonStoppedWorking =
  | 'Medical/disability'
  | 'Laid off'
  | 'Retired'
  | 'Caregiving'
  | 'Incarceration'
  | 'Other';

export type YearsWorkHistoryRange =
  | 'None'
  | '<5 years'
  | '5-10'
  | '10-20'
  | '>20'
  | 'Unknown';

export interface FunctionalAssessment {
  mobilityStatus: MobilityStatus;
  assistiveDevices: AssistiveDevice[];
  adlDifficulties: ADLDifficulties;
  cognitiveStatus: CognitiveStatus;
  painLevel: number; // 0-10 scale
  lastWorkedDate: LastWorkedTimeframe;
  reasonStoppedWorking?: ReasonStoppedWorking;
  lastOccupation: string;
  yearsWorkHistory: YearsWorkHistoryRange;
}

// ============================================================================
// URGENCY & DISPOSITION
// ============================================================================

export type ScreeningUrgency =
  | 'Immediate'
  | 'High 24-48hrs'
  | 'Moderate 1 week'
  | 'Routine';

export type DispositionConcern =
  | 'Homelessness'
  | 'No safe discharge'
  | 'Needs SNF'
  | 'Needs home health'
  | 'No caregiver'
  | 'DME needed'
  | 'Medication affordability'
  | 'Transportation'
  | 'None';

export type LivingSituation =
  | 'Own home'
  | 'Renting'
  | 'With family'
  | 'Assisted living'
  | 'SNF'
  | 'Homeless/shelter'
  | 'Transitional'
  | 'Unknown';

export type SupportSystem =
  | 'Spouse/partner'
  | 'Family'
  | 'Paid caregiver'
  | 'Limited'
  | 'None'
  | 'Unknown';

export type TransportationOption =
  | 'Drives self'
  | 'Family drives'
  | 'Public transit'
  | 'Medical transport'
  | 'Ambulance'
  | 'No reliable'
  | 'Unknown';

export type SpecialCircumstance =
  | 'Terminal illness'
  | 'Presumptive disability'
  | 'Military connected'
  | 'Homeless'
  | 'Domestic violence'
  | 'Recently incarcerated'
  | 'Undocumented'
  | 'Minor child'
  | 'None';

export interface UrgencyDisposition {
  screeningUrgency: ScreeningUrgency;
  dispositionConcerns: DispositionConcern[];
  livingSituation: LivingSituation;
  supportSystem: SupportSystem;
  transportation: TransportationOption;
  specialCircumstances: SpecialCircumstance[];
}

// ============================================================================
// STAFF INFORMATION
// ============================================================================

export type ScreenerTitle =
  | 'Financial Counselor'
  | 'Social Worker'
  | 'Case Manager'
  | 'Patient Navigator'
  | 'Revenue Cycle Specialist'
  | 'Eligibility Specialist'
  | 'Nurse'
  | 'Other';

export interface StaffInformation {
  screenerName: string;
  screenerTitle: ScreenerTitle;
  department: string;
  additionalNotes: string;
}
