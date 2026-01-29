/**
 * CPT Code Database
 * Top 500 most common CPT codes for hospital billing
 * Includes code, description, category, RVU values, and status indicators
 */

export interface CPTCode {
  code: string;
  description: string;
  category: CPTCategory;
  workRVU: number;
  practiceExpenseRVU: number;
  malpracticeRVU: number;
  totalRVU: number;
  statusIndicator: CPTStatusIndicator;
  globalDays: number | null;
  modifierAllowed: boolean;
}

export type CPTCategory =
  | 'evaluation_management'
  | 'anesthesia'
  | 'surgery'
  | 'radiology'
  | 'pathology_lab'
  | 'medicine'
  | 'category_ii'
  | 'category_iii';

export type CPTStatusIndicator =
  | 'A' // Active
  | 'B' // Bundled
  | 'C' // Contractor priced
  | 'D' // Deleted
  | 'E' // Excluded
  | 'F' // Carrier priced
  | 'G' // Not valid for Medicare
  | 'H' // Bundled/excluded
  | 'I' // Not valid for OPPS
  | 'J' // Comprehensive APC
  | 'N' // Packaged
  | 'P' // Partial hospitalization
  | 'Q' // Packaged APC
  | 'R' // Blood products
  | 'S' // Significant procedure
  | 'T' // Significant procedure, multiple reduction
  | 'V' // Clinic/ER visit
  | 'X' // Ancillary service;

// CPT Code Database - Top 500 most common codes
export const CPT_CODES: Record<string, CPTCode> = {
  // ============================================================================
  // EVALUATION AND MANAGEMENT (99xxx)
  // ============================================================================

  // Office/Outpatient Visits - New Patient
  '99202': {
    code: '99202',
    description: 'Office/outpatient visit, new patient, straightforward MDM, 15-29 min',
    category: 'evaluation_management',
    workRVU: 0.93,
    practiceExpenseRVU: 1.12,
    malpracticeRVU: 0.09,
    totalRVU: 2.14,
    statusIndicator: 'V',
    globalDays: null,
    modifierAllowed: true
  },
  '99203': {
    code: '99203',
    description: 'Office/outpatient visit, new patient, low MDM, 30-44 min',
    category: 'evaluation_management',
    workRVU: 1.60,
    practiceExpenseRVU: 1.56,
    malpracticeRVU: 0.13,
    totalRVU: 3.29,
    statusIndicator: 'V',
    globalDays: null,
    modifierAllowed: true
  },
  '99204': {
    code: '99204',
    description: 'Office/outpatient visit, new patient, moderate MDM, 45-59 min',
    category: 'evaluation_management',
    workRVU: 2.60,
    practiceExpenseRVU: 2.16,
    malpracticeRVU: 0.18,
    totalRVU: 4.94,
    statusIndicator: 'V',
    globalDays: null,
    modifierAllowed: true
  },
  '99205': {
    code: '99205',
    description: 'Office/outpatient visit, new patient, high MDM, 60-74 min',
    category: 'evaluation_management',
    workRVU: 3.50,
    practiceExpenseRVU: 2.63,
    malpracticeRVU: 0.23,
    totalRVU: 6.36,
    statusIndicator: 'V',
    globalDays: null,
    modifierAllowed: true
  },

  // Office/Outpatient Visits - Established Patient
  '99211': {
    code: '99211',
    description: 'Office/outpatient visit, established patient, may not require physician presence',
    category: 'evaluation_management',
    workRVU: 0.18,
    practiceExpenseRVU: 0.47,
    malpracticeRVU: 0.02,
    totalRVU: 0.67,
    statusIndicator: 'V',
    globalDays: null,
    modifierAllowed: true
  },
  '99212': {
    code: '99212',
    description: 'Office/outpatient visit, established patient, straightforward MDM, 10-19 min',
    category: 'evaluation_management',
    workRVU: 0.70,
    practiceExpenseRVU: 0.89,
    malpracticeRVU: 0.06,
    totalRVU: 1.65,
    statusIndicator: 'V',
    globalDays: null,
    modifierAllowed: true
  },
  '99213': {
    code: '99213',
    description: 'Office/outpatient visit, established patient, low MDM, 20-29 min',
    category: 'evaluation_management',
    workRVU: 1.30,
    practiceExpenseRVU: 1.26,
    malpracticeRVU: 0.10,
    totalRVU: 2.66,
    statusIndicator: 'V',
    globalDays: null,
    modifierAllowed: true
  },
  '99214': {
    code: '99214',
    description: 'Office/outpatient visit, established patient, moderate MDM, 30-39 min',
    category: 'evaluation_management',
    workRVU: 1.92,
    practiceExpenseRVU: 1.67,
    malpracticeRVU: 0.14,
    totalRVU: 3.73,
    statusIndicator: 'V',
    globalDays: null,
    modifierAllowed: true
  },
  '99215': {
    code: '99215',
    description: 'Office/outpatient visit, established patient, high MDM, 40-54 min',
    category: 'evaluation_management',
    workRVU: 2.80,
    practiceExpenseRVU: 2.15,
    malpracticeRVU: 0.18,
    totalRVU: 5.13,
    statusIndicator: 'V',
    globalDays: null,
    modifierAllowed: true
  },

  // Hospital Inpatient/Observation - Initial
  '99221': {
    code: '99221',
    description: 'Initial hospital inpatient/observation care, low MDM, 40 min',
    category: 'evaluation_management',
    workRVU: 2.00,
    practiceExpenseRVU: 0.96,
    malpracticeRVU: 0.13,
    totalRVU: 3.09,
    statusIndicator: 'V',
    globalDays: null,
    modifierAllowed: true
  },
  '99222': {
    code: '99222',
    description: 'Initial hospital inpatient/observation care, moderate MDM, 55 min',
    category: 'evaluation_management',
    workRVU: 2.61,
    practiceExpenseRVU: 1.17,
    malpracticeRVU: 0.17,
    totalRVU: 3.95,
    statusIndicator: 'V',
    globalDays: null,
    modifierAllowed: true
  },
  '99223': {
    code: '99223',
    description: 'Initial hospital inpatient/observation care, high MDM, 75 min',
    category: 'evaluation_management',
    workRVU: 3.86,
    practiceExpenseRVU: 1.64,
    malpracticeRVU: 0.24,
    totalRVU: 5.74,
    statusIndicator: 'V',
    globalDays: null,
    modifierAllowed: true
  },

  // Hospital Inpatient/Observation - Subsequent
  '99231': {
    code: '99231',
    description: 'Subsequent hospital inpatient/observation care, low MDM, 25 min',
    category: 'evaluation_management',
    workRVU: 0.99,
    practiceExpenseRVU: 0.43,
    malpracticeRVU: 0.06,
    totalRVU: 1.48,
    statusIndicator: 'V',
    globalDays: null,
    modifierAllowed: true
  },
  '99232': {
    code: '99232',
    description: 'Subsequent hospital inpatient/observation care, moderate MDM, 35 min',
    category: 'evaluation_management',
    workRVU: 1.59,
    practiceExpenseRVU: 0.63,
    malpracticeRVU: 0.10,
    totalRVU: 2.32,
    statusIndicator: 'V',
    globalDays: null,
    modifierAllowed: true
  },
  '99233': {
    code: '99233',
    description: 'Subsequent hospital inpatient/observation care, high MDM, 50 min',
    category: 'evaluation_management',
    workRVU: 2.31,
    practiceExpenseRVU: 0.87,
    malpracticeRVU: 0.14,
    totalRVU: 3.32,
    statusIndicator: 'V',
    globalDays: null,
    modifierAllowed: true
  },

  // Hospital Discharge
  '99238': {
    code: '99238',
    description: 'Hospital inpatient/observation discharge day management, 30 min or less',
    category: 'evaluation_management',
    workRVU: 1.50,
    practiceExpenseRVU: 0.67,
    malpracticeRVU: 0.10,
    totalRVU: 2.27,
    statusIndicator: 'V',
    globalDays: null,
    modifierAllowed: true
  },
  '99239': {
    code: '99239',
    description: 'Hospital inpatient/observation discharge day management, more than 30 min',
    category: 'evaluation_management',
    workRVU: 2.11,
    practiceExpenseRVU: 0.89,
    malpracticeRVU: 0.13,
    totalRVU: 3.13,
    statusIndicator: 'V',
    globalDays: null,
    modifierAllowed: true
  },

  // Emergency Department Visits
  '99281': {
    code: '99281',
    description: 'Emergency department visit, self-limited or minor problem',
    category: 'evaluation_management',
    workRVU: 0.45,
    practiceExpenseRVU: 0.48,
    malpracticeRVU: 0.04,
    totalRVU: 0.97,
    statusIndicator: 'V',
    globalDays: null,
    modifierAllowed: true
  },
  '99282': {
    code: '99282',
    description: 'Emergency department visit, low to moderate severity',
    category: 'evaluation_management',
    workRVU: 0.93,
    practiceExpenseRVU: 0.80,
    malpracticeRVU: 0.08,
    totalRVU: 1.81,
    statusIndicator: 'V',
    globalDays: null,
    modifierAllowed: true
  },
  '99283': {
    code: '99283',
    description: 'Emergency department visit, moderate severity',
    category: 'evaluation_management',
    workRVU: 1.60,
    practiceExpenseRVU: 1.14,
    malpracticeRVU: 0.13,
    totalRVU: 2.87,
    statusIndicator: 'V',
    globalDays: null,
    modifierAllowed: true
  },
  '99284': {
    code: '99284',
    description: 'Emergency department visit, high severity',
    category: 'evaluation_management',
    workRVU: 2.74,
    practiceExpenseRVU: 1.71,
    malpracticeRVU: 0.21,
    totalRVU: 4.66,
    statusIndicator: 'V',
    globalDays: null,
    modifierAllowed: true
  },
  '99285': {
    code: '99285',
    description: 'Emergency department visit, high severity with immediate threat to life',
    category: 'evaluation_management',
    workRVU: 4.00,
    practiceExpenseRVU: 2.36,
    malpracticeRVU: 0.30,
    totalRVU: 6.66,
    statusIndicator: 'V',
    globalDays: null,
    modifierAllowed: true
  },

  // Critical Care
  '99291': {
    code: '99291',
    description: 'Critical care, evaluation and management, first 30-74 min',
    category: 'evaluation_management',
    workRVU: 4.50,
    practiceExpenseRVU: 1.99,
    malpracticeRVU: 0.34,
    totalRVU: 6.83,
    statusIndicator: 'S',
    globalDays: null,
    modifierAllowed: true
  },
  '99292': {
    code: '99292',
    description: 'Critical care, each additional 30 min',
    category: 'evaluation_management',
    workRVU: 2.25,
    practiceExpenseRVU: 0.91,
    malpracticeRVU: 0.17,
    totalRVU: 3.33,
    statusIndicator: 'S',
    globalDays: null,
    modifierAllowed: true
  },

  // Consultations
  '99241': {
    code: '99241',
    description: 'Office consultation, straightforward MDM, 15 min',
    category: 'evaluation_management',
    workRVU: 0.64,
    practiceExpenseRVU: 0.78,
    malpracticeRVU: 0.05,
    totalRVU: 1.47,
    statusIndicator: 'V',
    globalDays: null,
    modifierAllowed: true
  },
  '99242': {
    code: '99242',
    description: 'Office consultation, straightforward MDM, 30 min',
    category: 'evaluation_management',
    workRVU: 1.34,
    practiceExpenseRVU: 1.19,
    malpracticeRVU: 0.10,
    totalRVU: 2.63,
    statusIndicator: 'V',
    globalDays: null,
    modifierAllowed: true
  },
  '99243': {
    code: '99243',
    description: 'Office consultation, low complexity MDM, 40 min',
    category: 'evaluation_management',
    workRVU: 1.79,
    practiceExpenseRVU: 1.48,
    malpracticeRVU: 0.13,
    totalRVU: 3.40,
    statusIndicator: 'V',
    globalDays: null,
    modifierAllowed: true
  },
  '99244': {
    code: '99244',
    description: 'Office consultation, moderate complexity MDM, 60 min',
    category: 'evaluation_management',
    workRVU: 2.83,
    practiceExpenseRVU: 2.01,
    malpracticeRVU: 0.19,
    totalRVU: 5.03,
    statusIndicator: 'V',
    globalDays: null,
    modifierAllowed: true
  },
  '99245': {
    code: '99245',
    description: 'Office consultation, high complexity MDM, 80 min',
    category: 'evaluation_management',
    workRVU: 3.77,
    practiceExpenseRVU: 2.51,
    malpracticeRVU: 0.24,
    totalRVU: 6.52,
    statusIndicator: 'V',
    globalDays: null,
    modifierAllowed: true
  },

  // Nursing Facility Services
  '99304': {
    code: '99304',
    description: 'Initial nursing facility care, low MDM',
    category: 'evaluation_management',
    workRVU: 1.50,
    practiceExpenseRVU: 0.95,
    malpracticeRVU: 0.12,
    totalRVU: 2.57,
    statusIndicator: 'V',
    globalDays: null,
    modifierAllowed: true
  },
  '99305': {
    code: '99305',
    description: 'Initial nursing facility care, moderate MDM',
    category: 'evaluation_management',
    workRVU: 2.14,
    practiceExpenseRVU: 1.23,
    malpracticeRVU: 0.16,
    totalRVU: 3.53,
    statusIndicator: 'V',
    globalDays: null,
    modifierAllowed: true
  },
  '99306': {
    code: '99306',
    description: 'Initial nursing facility care, high MDM',
    category: 'evaluation_management',
    workRVU: 2.92,
    practiceExpenseRVU: 1.55,
    malpracticeRVU: 0.21,
    totalRVU: 4.68,
    statusIndicator: 'V',
    globalDays: null,
    modifierAllowed: true
  },

  // Preventive Medicine
  '99385': {
    code: '99385',
    description: 'Initial preventive medicine E/M, 18-39 years',
    category: 'evaluation_management',
    workRVU: 1.50,
    practiceExpenseRVU: 1.45,
    malpracticeRVU: 0.12,
    totalRVU: 3.07,
    statusIndicator: 'V',
    globalDays: null,
    modifierAllowed: true
  },
  '99386': {
    code: '99386',
    description: 'Initial preventive medicine E/M, 40-64 years',
    category: 'evaluation_management',
    workRVU: 1.75,
    practiceExpenseRVU: 1.62,
    malpracticeRVU: 0.13,
    totalRVU: 3.50,
    statusIndicator: 'V',
    globalDays: null,
    modifierAllowed: true
  },
  '99387': {
    code: '99387',
    description: 'Initial preventive medicine E/M, 65+ years',
    category: 'evaluation_management',
    workRVU: 2.00,
    practiceExpenseRVU: 1.78,
    malpracticeRVU: 0.14,
    totalRVU: 3.92,
    statusIndicator: 'V',
    globalDays: null,
    modifierAllowed: true
  },
  '99395': {
    code: '99395',
    description: 'Periodic preventive medicine E/M, 18-39 years',
    category: 'evaluation_management',
    workRVU: 1.30,
    practiceExpenseRVU: 1.31,
    malpracticeRVU: 0.10,
    totalRVU: 2.71,
    statusIndicator: 'V',
    globalDays: null,
    modifierAllowed: true
  },
  '99396': {
    code: '99396',
    description: 'Periodic preventive medicine E/M, 40-64 years',
    category: 'evaluation_management',
    workRVU: 1.50,
    practiceExpenseRVU: 1.45,
    malpracticeRVU: 0.11,
    totalRVU: 3.06,
    statusIndicator: 'V',
    globalDays: null,
    modifierAllowed: true
  },
  '99397': {
    code: '99397',
    description: 'Periodic preventive medicine E/M, 65+ years',
    category: 'evaluation_management',
    workRVU: 1.75,
    practiceExpenseRVU: 1.58,
    malpracticeRVU: 0.12,
    totalRVU: 3.45,
    statusIndicator: 'V',
    globalDays: null,
    modifierAllowed: true
  },

  // ============================================================================
  // SURGERY - CARDIOVASCULAR (33xxx)
  // ============================================================================

  '33208': {
    code: '33208',
    description: 'Insertion of permanent pacemaker with transvenous electrodes',
    category: 'surgery',
    workRVU: 9.53,
    practiceExpenseRVU: 8.12,
    malpracticeRVU: 1.05,
    totalRVU: 18.70,
    statusIndicator: 'T',
    globalDays: 90,
    modifierAllowed: true
  },
  '33249': {
    code: '33249',
    description: 'Insertion of ICD with single or dual chamber electrodes',
    category: 'surgery',
    workRVU: 11.44,
    practiceExpenseRVU: 9.76,
    malpracticeRVU: 1.26,
    totalRVU: 22.46,
    statusIndicator: 'T',
    globalDays: 90,
    modifierAllowed: true
  },
  '33533': {
    code: '33533',
    description: 'CABG, single arterial graft',
    category: 'surgery',
    workRVU: 33.74,
    practiceExpenseRVU: 27.89,
    malpracticeRVU: 4.05,
    totalRVU: 65.68,
    statusIndicator: 'T',
    globalDays: 90,
    modifierAllowed: true
  },
  '33534': {
    code: '33534',
    description: 'CABG, two arterial grafts',
    category: 'surgery',
    workRVU: 38.42,
    practiceExpenseRVU: 31.54,
    malpracticeRVU: 4.61,
    totalRVU: 74.57,
    statusIndicator: 'T',
    globalDays: 90,
    modifierAllowed: true
  },

  // ============================================================================
  // SURGERY - ORTHOPEDIC (27xxx)
  // ============================================================================

  '27130': {
    code: '27130',
    description: 'Total hip arthroplasty',
    category: 'surgery',
    workRVU: 20.69,
    practiceExpenseRVU: 17.15,
    malpracticeRVU: 2.48,
    totalRVU: 40.32,
    statusIndicator: 'T',
    globalDays: 90,
    modifierAllowed: true
  },
  '27447': {
    code: '27447',
    description: 'Total knee arthroplasty',
    category: 'surgery',
    workRVU: 20.70,
    practiceExpenseRVU: 17.16,
    malpracticeRVU: 2.48,
    totalRVU: 40.34,
    statusIndicator: 'T',
    globalDays: 90,
    modifierAllowed: true
  },
  '27245': {
    code: '27245',
    description: 'Treatment of intertrochanteric femoral fracture with plate/screw',
    category: 'surgery',
    workRVU: 13.98,
    practiceExpenseRVU: 11.58,
    malpracticeRVU: 1.68,
    totalRVU: 27.24,
    statusIndicator: 'T',
    globalDays: 90,
    modifierAllowed: true
  },
  '27236': {
    code: '27236',
    description: 'Open treatment of femoral fracture with internal fixation',
    category: 'surgery',
    workRVU: 14.08,
    practiceExpenseRVU: 11.66,
    malpracticeRVU: 1.69,
    totalRVU: 27.43,
    statusIndicator: 'T',
    globalDays: 90,
    modifierAllowed: true
  },

  // ============================================================================
  // SURGERY - SPINE (22xxx)
  // ============================================================================

  '22551': {
    code: '22551',
    description: 'Arthrodesis, anterior interbody, cervical below C2',
    category: 'surgery',
    workRVU: 25.96,
    practiceExpenseRVU: 21.50,
    malpracticeRVU: 3.12,
    totalRVU: 50.58,
    statusIndicator: 'T',
    globalDays: 90,
    modifierAllowed: true
  },
  '22612': {
    code: '22612',
    description: 'Arthrodesis, posterior or posterolateral lumbar',
    category: 'surgery',
    workRVU: 23.87,
    practiceExpenseRVU: 19.77,
    malpracticeRVU: 2.86,
    totalRVU: 46.50,
    statusIndicator: 'T',
    globalDays: 90,
    modifierAllowed: true
  },
  '22630': {
    code: '22630',
    description: 'Arthrodesis, posterior interbody lumbar',
    category: 'surgery',
    workRVU: 22.50,
    practiceExpenseRVU: 18.64,
    malpracticeRVU: 2.70,
    totalRVU: 43.84,
    statusIndicator: 'T',
    globalDays: 90,
    modifierAllowed: true
  },

  // ============================================================================
  // SURGERY - GENERAL (4xxxx)
  // ============================================================================

  '43239': {
    code: '43239',
    description: 'EGD with biopsy, single or multiple',
    category: 'surgery',
    workRVU: 2.39,
    practiceExpenseRVU: 5.85,
    malpracticeRVU: 0.19,
    totalRVU: 8.43,
    statusIndicator: 'T',
    globalDays: 0,
    modifierAllowed: true
  },
  '43249': {
    code: '43249',
    description: 'EGD with balloon dilation of esophagus',
    category: 'surgery',
    workRVU: 2.83,
    practiceExpenseRVU: 6.55,
    malpracticeRVU: 0.23,
    totalRVU: 9.61,
    statusIndicator: 'T',
    globalDays: 0,
    modifierAllowed: true
  },
  '45378': {
    code: '45378',
    description: 'Colonoscopy, diagnostic with collection of specimen(s)',
    category: 'surgery',
    workRVU: 3.36,
    practiceExpenseRVU: 7.12,
    malpracticeRVU: 0.27,
    totalRVU: 10.75,
    statusIndicator: 'T',
    globalDays: 0,
    modifierAllowed: true
  },
  '45380': {
    code: '45380',
    description: 'Colonoscopy with biopsy',
    category: 'surgery',
    workRVU: 3.69,
    practiceExpenseRVU: 7.53,
    malpracticeRVU: 0.30,
    totalRVU: 11.52,
    statusIndicator: 'T',
    globalDays: 0,
    modifierAllowed: true
  },
  '45385': {
    code: '45385',
    description: 'Colonoscopy with removal of polyp by snare technique',
    category: 'surgery',
    workRVU: 4.57,
    practiceExpenseRVU: 8.68,
    malpracticeRVU: 0.37,
    totalRVU: 13.62,
    statusIndicator: 'T',
    globalDays: 0,
    modifierAllowed: true
  },
  '47562': {
    code: '47562',
    description: 'Laparoscopic cholecystectomy',
    category: 'surgery',
    workRVU: 10.38,
    practiceExpenseRVU: 8.85,
    malpracticeRVU: 1.15,
    totalRVU: 20.38,
    statusIndicator: 'T',
    globalDays: 10,
    modifierAllowed: true
  },
  '47563': {
    code: '47563',
    description: 'Laparoscopic cholecystectomy with cholangiography',
    category: 'surgery',
    workRVU: 11.53,
    practiceExpenseRVU: 9.82,
    malpracticeRVU: 1.27,
    totalRVU: 22.62,
    statusIndicator: 'T',
    globalDays: 10,
    modifierAllowed: true
  },
  '49505': {
    code: '49505',
    description: 'Repair initial inguinal hernia, age 5+',
    category: 'surgery',
    workRVU: 7.29,
    practiceExpenseRVU: 6.21,
    malpracticeRVU: 0.80,
    totalRVU: 14.30,
    statusIndicator: 'T',
    globalDays: 10,
    modifierAllowed: true
  },
  '49650': {
    code: '49650',
    description: 'Laparoscopic repair of initial inguinal hernia',
    category: 'surgery',
    workRVU: 8.91,
    practiceExpenseRVU: 7.59,
    malpracticeRVU: 0.98,
    totalRVU: 17.48,
    statusIndicator: 'T',
    globalDays: 10,
    modifierAllowed: true
  },

  // ============================================================================
  // RADIOLOGY - DIAGNOSTIC (7xxxx)
  // ============================================================================

  '70553': {
    code: '70553',
    description: 'MRI brain with and without contrast',
    category: 'radiology',
    workRVU: 2.28,
    practiceExpenseRVU: 7.85,
    malpracticeRVU: 0.13,
    totalRVU: 10.26,
    statusIndicator: 'S',
    globalDays: null,
    modifierAllowed: true
  },
  '71046': {
    code: '71046',
    description: 'Chest X-ray, 2 views',
    category: 'radiology',
    workRVU: 0.22,
    practiceExpenseRVU: 0.67,
    malpracticeRVU: 0.02,
    totalRVU: 0.91,
    statusIndicator: 'S',
    globalDays: null,
    modifierAllowed: true
  },
  '71250': {
    code: '71250',
    description: 'CT thorax without contrast',
    category: 'radiology',
    workRVU: 1.16,
    practiceExpenseRVU: 4.86,
    malpracticeRVU: 0.07,
    totalRVU: 6.09,
    statusIndicator: 'S',
    globalDays: null,
    modifierAllowed: true
  },
  '71260': {
    code: '71260',
    description: 'CT thorax with contrast',
    category: 'radiology',
    workRVU: 1.38,
    practiceExpenseRVU: 5.42,
    malpracticeRVU: 0.08,
    totalRVU: 6.88,
    statusIndicator: 'S',
    globalDays: null,
    modifierAllowed: true
  },
  '71275': {
    code: '71275',
    description: 'CT angiography, chest',
    category: 'radiology',
    workRVU: 2.20,
    practiceExpenseRVU: 7.55,
    malpracticeRVU: 0.13,
    totalRVU: 9.88,
    statusIndicator: 'S',
    globalDays: null,
    modifierAllowed: true
  },
  '72148': {
    code: '72148',
    description: 'MRI lumbar spine without contrast',
    category: 'radiology',
    workRVU: 1.52,
    practiceExpenseRVU: 6.23,
    malpracticeRVU: 0.09,
    totalRVU: 7.84,
    statusIndicator: 'S',
    globalDays: null,
    modifierAllowed: true
  },
  '72156': {
    code: '72156',
    description: 'MRI lumbar spine with and without contrast',
    category: 'radiology',
    workRVU: 2.15,
    practiceExpenseRVU: 7.65,
    malpracticeRVU: 0.12,
    totalRVU: 9.92,
    statusIndicator: 'S',
    globalDays: null,
    modifierAllowed: true
  },
  '72193': {
    code: '72193',
    description: 'CT pelvis with contrast',
    category: 'radiology',
    workRVU: 1.40,
    practiceExpenseRVU: 5.52,
    malpracticeRVU: 0.08,
    totalRVU: 7.00,
    statusIndicator: 'S',
    globalDays: null,
    modifierAllowed: true
  },
  '73721': {
    code: '73721',
    description: 'MRI lower extremity joint without contrast',
    category: 'radiology',
    workRVU: 1.30,
    practiceExpenseRVU: 5.85,
    malpracticeRVU: 0.08,
    totalRVU: 7.23,
    statusIndicator: 'S',
    globalDays: null,
    modifierAllowed: true
  },
  '74176': {
    code: '74176',
    description: 'CT abdomen and pelvis without contrast',
    category: 'radiology',
    workRVU: 1.74,
    practiceExpenseRVU: 6.48,
    malpracticeRVU: 0.10,
    totalRVU: 8.32,
    statusIndicator: 'S',
    globalDays: null,
    modifierAllowed: true
  },
  '74177': {
    code: '74177',
    description: 'CT abdomen and pelvis with contrast',
    category: 'radiology',
    workRVU: 2.01,
    practiceExpenseRVU: 7.25,
    malpracticeRVU: 0.12,
    totalRVU: 9.38,
    statusIndicator: 'S',
    globalDays: null,
    modifierAllowed: true
  },
  '74178': {
    code: '74178',
    description: 'CT abdomen and pelvis without and with contrast',
    category: 'radiology',
    workRVU: 2.39,
    practiceExpenseRVU: 8.12,
    malpracticeRVU: 0.14,
    totalRVU: 10.65,
    statusIndicator: 'S',
    globalDays: null,
    modifierAllowed: true
  },

  // ============================================================================
  // RADIOLOGY - ULTRASOUND
  // ============================================================================

  '76700': {
    code: '76700',
    description: 'Ultrasound, abdominal, complete',
    category: 'radiology',
    workRVU: 0.81,
    practiceExpenseRVU: 2.87,
    malpracticeRVU: 0.05,
    totalRVU: 3.73,
    statusIndicator: 'S',
    globalDays: null,
    modifierAllowed: true
  },
  '76805': {
    code: '76805',
    description: 'Ultrasound, pregnant uterus, after first trimester',
    category: 'radiology',
    workRVU: 0.99,
    practiceExpenseRVU: 3.28,
    malpracticeRVU: 0.06,
    totalRVU: 4.33,
    statusIndicator: 'S',
    globalDays: null,
    modifierAllowed: true
  },
  '76830': {
    code: '76830',
    description: 'Ultrasound, transvaginal',
    category: 'radiology',
    workRVU: 0.83,
    practiceExpenseRVU: 2.92,
    malpracticeRVU: 0.05,
    totalRVU: 3.80,
    statusIndicator: 'S',
    globalDays: null,
    modifierAllowed: true
  },
  '76856': {
    code: '76856',
    description: 'Ultrasound, pelvic, complete',
    category: 'radiology',
    workRVU: 0.74,
    practiceExpenseRVU: 2.75,
    malpracticeRVU: 0.04,
    totalRVU: 3.53,
    statusIndicator: 'S',
    globalDays: null,
    modifierAllowed: true
  },
  '76882': {
    code: '76882',
    description: 'Ultrasound, extremity, limited',
    category: 'radiology',
    workRVU: 0.41,
    practiceExpenseRVU: 1.72,
    malpracticeRVU: 0.02,
    totalRVU: 2.15,
    statusIndicator: 'S',
    globalDays: null,
    modifierAllowed: true
  },
  '93306': {
    code: '93306',
    description: 'Echocardiography, transthoracic, complete',
    category: 'radiology',
    workRVU: 1.50,
    practiceExpenseRVU: 4.89,
    malpracticeRVU: 0.09,
    totalRVU: 6.48,
    statusIndicator: 'S',
    globalDays: null,
    modifierAllowed: true
  },

  // ============================================================================
  // PATHOLOGY AND LABORATORY (8xxxx)
  // ============================================================================

  '80048': {
    code: '80048',
    description: 'Basic metabolic panel',
    category: 'pathology_lab',
    workRVU: 0.00,
    practiceExpenseRVU: 1.12,
    malpracticeRVU: 0.00,
    totalRVU: 1.12,
    statusIndicator: 'A',
    globalDays: null,
    modifierAllowed: false
  },
  '80053': {
    code: '80053',
    description: 'Comprehensive metabolic panel',
    category: 'pathology_lab',
    workRVU: 0.00,
    practiceExpenseRVU: 1.46,
    malpracticeRVU: 0.00,
    totalRVU: 1.46,
    statusIndicator: 'A',
    globalDays: null,
    modifierAllowed: false
  },
  '80061': {
    code: '80061',
    description: 'Lipid panel',
    category: 'pathology_lab',
    workRVU: 0.00,
    practiceExpenseRVU: 0.81,
    malpracticeRVU: 0.00,
    totalRVU: 0.81,
    statusIndicator: 'A',
    globalDays: null,
    modifierAllowed: false
  },
  '81001': {
    code: '81001',
    description: 'Urinalysis with microscopy',
    category: 'pathology_lab',
    workRVU: 0.00,
    practiceExpenseRVU: 0.31,
    malpracticeRVU: 0.00,
    totalRVU: 0.31,
    statusIndicator: 'A',
    globalDays: null,
    modifierAllowed: false
  },
  '82565': {
    code: '82565',
    description: 'Creatinine, blood',
    category: 'pathology_lab',
    workRVU: 0.00,
    practiceExpenseRVU: 0.23,
    malpracticeRVU: 0.00,
    totalRVU: 0.23,
    statusIndicator: 'A',
    globalDays: null,
    modifierAllowed: false
  },
  '82947': {
    code: '82947',
    description: 'Glucose, quantitative, blood',
    category: 'pathology_lab',
    workRVU: 0.00,
    practiceExpenseRVU: 0.19,
    malpracticeRVU: 0.00,
    totalRVU: 0.19,
    statusIndicator: 'A',
    globalDays: null,
    modifierAllowed: false
  },
  '83036': {
    code: '83036',
    description: 'Hemoglobin A1c',
    category: 'pathology_lab',
    workRVU: 0.00,
    practiceExpenseRVU: 0.53,
    malpracticeRVU: 0.00,
    totalRVU: 0.53,
    statusIndicator: 'A',
    globalDays: null,
    modifierAllowed: false
  },
  '84443': {
    code: '84443',
    description: 'Thyroid stimulating hormone (TSH)',
    category: 'pathology_lab',
    workRVU: 0.00,
    practiceExpenseRVU: 0.68,
    malpracticeRVU: 0.00,
    totalRVU: 0.68,
    statusIndicator: 'A',
    globalDays: null,
    modifierAllowed: false
  },
  '85025': {
    code: '85025',
    description: 'Complete blood count with differential',
    category: 'pathology_lab',
    workRVU: 0.00,
    practiceExpenseRVU: 0.42,
    malpracticeRVU: 0.00,
    totalRVU: 0.42,
    statusIndicator: 'A',
    globalDays: null,
    modifierAllowed: false
  },
  '85610': {
    code: '85610',
    description: 'Prothrombin time (PT)',
    category: 'pathology_lab',
    workRVU: 0.00,
    practiceExpenseRVU: 0.22,
    malpracticeRVU: 0.00,
    totalRVU: 0.22,
    statusIndicator: 'A',
    globalDays: null,
    modifierAllowed: false
  },
  '85730': {
    code: '85730',
    description: 'Partial thromboplastin time (PTT)',
    category: 'pathology_lab',
    workRVU: 0.00,
    practiceExpenseRVU: 0.28,
    malpracticeRVU: 0.00,
    totalRVU: 0.28,
    statusIndicator: 'A',
    globalDays: null,
    modifierAllowed: false
  },
  '86140': {
    code: '86140',
    description: 'C-reactive protein',
    category: 'pathology_lab',
    workRVU: 0.00,
    practiceExpenseRVU: 0.31,
    malpracticeRVU: 0.00,
    totalRVU: 0.31,
    statusIndicator: 'A',
    globalDays: null,
    modifierAllowed: false
  },
  '87086': {
    code: '87086',
    description: 'Urine culture, quantitative',
    category: 'pathology_lab',
    workRVU: 0.00,
    practiceExpenseRVU: 0.57,
    malpracticeRVU: 0.00,
    totalRVU: 0.57,
    statusIndicator: 'A',
    globalDays: null,
    modifierAllowed: false
  },
  '87491': {
    code: '87491',
    description: 'Chlamydia trachomatis, amplified probe',
    category: 'pathology_lab',
    workRVU: 0.00,
    practiceExpenseRVU: 1.18,
    malpracticeRVU: 0.00,
    totalRVU: 1.18,
    statusIndicator: 'A',
    globalDays: null,
    modifierAllowed: false
  },
  '88305': {
    code: '88305',
    description: 'Level IV surgical pathology, gross and microscopic',
    category: 'pathology_lab',
    workRVU: 1.19,
    practiceExpenseRVU: 0.95,
    malpracticeRVU: 0.06,
    totalRVU: 2.20,
    statusIndicator: 'A',
    globalDays: null,
    modifierAllowed: true
  },

  // ============================================================================
  // MEDICINE - CARDIOVASCULAR (9xxxx)
  // ============================================================================

  '93000': {
    code: '93000',
    description: 'Electrocardiogram, complete',
    category: 'medicine',
    workRVU: 0.17,
    practiceExpenseRVU: 0.54,
    malpracticeRVU: 0.01,
    totalRVU: 0.72,
    statusIndicator: 'S',
    globalDays: null,
    modifierAllowed: true
  },
  '93010': {
    code: '93010',
    description: 'Electrocardiogram, interpretation and report only',
    category: 'medicine',
    workRVU: 0.17,
    practiceExpenseRVU: 0.06,
    malpracticeRVU: 0.01,
    totalRVU: 0.24,
    statusIndicator: 'S',
    globalDays: null,
    modifierAllowed: true
  },
  '93015': {
    code: '93015',
    description: 'Cardiovascular stress test, complete',
    category: 'medicine',
    workRVU: 0.75,
    practiceExpenseRVU: 2.58,
    malpracticeRVU: 0.05,
    totalRVU: 3.38,
    statusIndicator: 'S',
    globalDays: null,
    modifierAllowed: true
  },
  '93458': {
    code: '93458',
    description: 'Cardiac catheterization, left heart, with ventriculography',
    category: 'medicine',
    workRVU: 4.22,
    practiceExpenseRVU: 12.55,
    malpracticeRVU: 0.34,
    totalRVU: 17.11,
    statusIndicator: 'S',
    globalDays: 0,
    modifierAllowed: true
  },
  '93460': {
    code: '93460',
    description: 'Cardiac catheterization, right and left heart',
    category: 'medicine',
    workRVU: 5.15,
    practiceExpenseRVU: 14.78,
    malpracticeRVU: 0.41,
    totalRVU: 20.34,
    statusIndicator: 'S',
    globalDays: 0,
    modifierAllowed: true
  },

  // ============================================================================
  // MEDICINE - PULMONARY
  // ============================================================================

  '94010': {
    code: '94010',
    description: 'Spirometry, including flow volume loop',
    category: 'medicine',
    workRVU: 0.17,
    practiceExpenseRVU: 0.55,
    malpracticeRVU: 0.01,
    totalRVU: 0.73,
    statusIndicator: 'S',
    globalDays: null,
    modifierAllowed: true
  },
  '94060': {
    code: '94060',
    description: 'Bronchodilator responsiveness, spirometry before and after',
    category: 'medicine',
    workRVU: 0.31,
    practiceExpenseRVU: 0.89,
    malpracticeRVU: 0.02,
    totalRVU: 1.22,
    statusIndicator: 'S',
    globalDays: null,
    modifierAllowed: true
  },
  '94640': {
    code: '94640',
    description: 'Pressurized inhalation treatment',
    category: 'medicine',
    workRVU: 0.00,
    practiceExpenseRVU: 0.35,
    malpracticeRVU: 0.00,
    totalRVU: 0.35,
    statusIndicator: 'S',
    globalDays: null,
    modifierAllowed: true
  },
  '94760': {
    code: '94760',
    description: 'Pulse oximetry, single determination',
    category: 'medicine',
    workRVU: 0.00,
    practiceExpenseRVU: 0.11,
    malpracticeRVU: 0.00,
    totalRVU: 0.11,
    statusIndicator: 'S',
    globalDays: null,
    modifierAllowed: true
  },

  // ============================================================================
  // MEDICINE - INFUSION/INJECTION
  // ============================================================================

  '96360': {
    code: '96360',
    description: 'IV infusion, hydration, initial, 31 min to 1 hour',
    category: 'medicine',
    workRVU: 0.17,
    practiceExpenseRVU: 0.72,
    malpracticeRVU: 0.01,
    totalRVU: 0.90,
    statusIndicator: 'S',
    globalDays: null,
    modifierAllowed: true
  },
  '96361': {
    code: '96361',
    description: 'IV infusion, hydration, each additional hour',
    category: 'medicine',
    workRVU: 0.00,
    practiceExpenseRVU: 0.24,
    malpracticeRVU: 0.00,
    totalRVU: 0.24,
    statusIndicator: 'S',
    globalDays: null,
    modifierAllowed: true
  },
  '96365': {
    code: '96365',
    description: 'IV infusion for therapy/prophylaxis, initial, up to 1 hour',
    category: 'medicine',
    workRVU: 0.21,
    practiceExpenseRVU: 0.85,
    malpracticeRVU: 0.02,
    totalRVU: 1.08,
    statusIndicator: 'S',
    globalDays: null,
    modifierAllowed: true
  },
  '96366': {
    code: '96366',
    description: 'IV infusion for therapy/prophylaxis, each additional hour',
    category: 'medicine',
    workRVU: 0.00,
    practiceExpenseRVU: 0.28,
    malpracticeRVU: 0.00,
    totalRVU: 0.28,
    statusIndicator: 'S',
    globalDays: null,
    modifierAllowed: true
  },
  '96372': {
    code: '96372',
    description: 'Therapeutic injection, subcutaneous or intramuscular',
    category: 'medicine',
    workRVU: 0.17,
    practiceExpenseRVU: 0.54,
    malpracticeRVU: 0.01,
    totalRVU: 0.72,
    statusIndicator: 'S',
    globalDays: null,
    modifierAllowed: true
  },
  '96374': {
    code: '96374',
    description: 'Therapeutic IV push, single or initial substance',
    category: 'medicine',
    workRVU: 0.18,
    practiceExpenseRVU: 0.59,
    malpracticeRVU: 0.01,
    totalRVU: 0.78,
    statusIndicator: 'S',
    globalDays: null,
    modifierAllowed: true
  },
  '96375': {
    code: '96375',
    description: 'Therapeutic IV push, each additional substance',
    category: 'medicine',
    workRVU: 0.00,
    practiceExpenseRVU: 0.20,
    malpracticeRVU: 0.00,
    totalRVU: 0.20,
    statusIndicator: 'S',
    globalDays: null,
    modifierAllowed: true
  },

  // ============================================================================
  // MEDICINE - PHYSICAL THERAPY
  // ============================================================================

  '97110': {
    code: '97110',
    description: 'Therapeutic exercises, each 15 min',
    category: 'medicine',
    workRVU: 0.45,
    practiceExpenseRVU: 0.45,
    malpracticeRVU: 0.02,
    totalRVU: 0.92,
    statusIndicator: 'S',
    globalDays: null,
    modifierAllowed: true
  },
  '97112': {
    code: '97112',
    description: 'Neuromuscular reeducation, each 15 min',
    category: 'medicine',
    workRVU: 0.45,
    practiceExpenseRVU: 0.45,
    malpracticeRVU: 0.02,
    totalRVU: 0.92,
    statusIndicator: 'S',
    globalDays: null,
    modifierAllowed: true
  },
  '97140': {
    code: '97140',
    description: 'Manual therapy techniques, each 15 min',
    category: 'medicine',
    workRVU: 0.43,
    practiceExpenseRVU: 0.43,
    malpracticeRVU: 0.02,
    totalRVU: 0.88,
    statusIndicator: 'S',
    globalDays: null,
    modifierAllowed: true
  },
  '97530': {
    code: '97530',
    description: 'Therapeutic activities, each 15 min',
    category: 'medicine',
    workRVU: 0.44,
    practiceExpenseRVU: 0.44,
    malpracticeRVU: 0.02,
    totalRVU: 0.90,
    statusIndicator: 'S',
    globalDays: null,
    modifierAllowed: true
  },

  // ============================================================================
  // ANESTHESIA (0xxxx)
  // ============================================================================

  '00100': {
    code: '00100',
    description: 'Anesthesia for procedures on salivary glands',
    category: 'anesthesia',
    workRVU: 3.00,
    practiceExpenseRVU: 0.75,
    malpracticeRVU: 0.15,
    totalRVU: 3.90,
    statusIndicator: 'A',
    globalDays: null,
    modifierAllowed: true
  },
  '00300': {
    code: '00300',
    description: 'Anesthesia for procedures on head and neck',
    category: 'anesthesia',
    workRVU: 5.00,
    practiceExpenseRVU: 1.25,
    malpracticeRVU: 0.25,
    totalRVU: 6.50,
    statusIndicator: 'A',
    globalDays: null,
    modifierAllowed: true
  },
  '00400': {
    code: '00400',
    description: 'Anesthesia for procedures on integumentary system, extremities',
    category: 'anesthesia',
    workRVU: 3.00,
    practiceExpenseRVU: 0.75,
    malpracticeRVU: 0.15,
    totalRVU: 3.90,
    statusIndicator: 'A',
    globalDays: null,
    modifierAllowed: true
  },
  '00560': {
    code: '00560',
    description: 'Anesthesia for cardiac procedures',
    category: 'anesthesia',
    workRVU: 18.00,
    practiceExpenseRVU: 4.50,
    malpracticeRVU: 0.90,
    totalRVU: 23.40,
    statusIndicator: 'A',
    globalDays: null,
    modifierAllowed: true
  },
  '00740': {
    code: '00740',
    description: 'Anesthesia for upper GI endoscopy',
    category: 'anesthesia',
    workRVU: 3.00,
    practiceExpenseRVU: 0.75,
    malpracticeRVU: 0.15,
    totalRVU: 3.90,
    statusIndicator: 'A',
    globalDays: null,
    modifierAllowed: true
  },
  '00810': {
    code: '00810',
    description: 'Anesthesia for lower intestinal endoscopy',
    category: 'anesthesia',
    workRVU: 3.00,
    practiceExpenseRVU: 0.75,
    malpracticeRVU: 0.15,
    totalRVU: 3.90,
    statusIndicator: 'A',
    globalDays: null,
    modifierAllowed: true
  },

  // ============================================================================
  // Additional Common E/M Codes
  // ============================================================================

  '99417': {
    code: '99417',
    description: 'Prolonged office visit, each additional 15 min',
    category: 'evaluation_management',
    workRVU: 1.00,
    practiceExpenseRVU: 0.45,
    malpracticeRVU: 0.06,
    totalRVU: 1.51,
    statusIndicator: 'V',
    globalDays: null,
    modifierAllowed: true
  },
  '99441': {
    code: '99441',
    description: 'Telephone E/M service, 5-10 min',
    category: 'evaluation_management',
    workRVU: 0.25,
    practiceExpenseRVU: 0.30,
    malpracticeRVU: 0.02,
    totalRVU: 0.57,
    statusIndicator: 'V',
    globalDays: null,
    modifierAllowed: true
  },
  '99442': {
    code: '99442',
    description: 'Telephone E/M service, 11-20 min',
    category: 'evaluation_management',
    workRVU: 0.50,
    practiceExpenseRVU: 0.45,
    malpracticeRVU: 0.04,
    totalRVU: 0.99,
    statusIndicator: 'V',
    globalDays: null,
    modifierAllowed: true
  },
  '99443': {
    code: '99443',
    description: 'Telephone E/M service, 21-30 min',
    category: 'evaluation_management',
    workRVU: 0.75,
    practiceExpenseRVU: 0.55,
    malpracticeRVU: 0.05,
    totalRVU: 1.35,
    statusIndicator: 'V',
    globalDays: null,
    modifierAllowed: true
  },

  // Transitional Care Management
  '99495': {
    code: '99495',
    description: 'Transitional care management, moderate complexity, within 14 days',
    category: 'evaluation_management',
    workRVU: 2.11,
    practiceExpenseRVU: 1.26,
    malpracticeRVU: 0.13,
    totalRVU: 3.50,
    statusIndicator: 'V',
    globalDays: null,
    modifierAllowed: true
  },
  '99496': {
    code: '99496',
    description: 'Transitional care management, high complexity, within 7 days',
    category: 'evaluation_management',
    workRVU: 3.05,
    practiceExpenseRVU: 1.67,
    malpracticeRVU: 0.19,
    totalRVU: 4.91,
    statusIndicator: 'V',
    globalDays: null,
    modifierAllowed: true
  },

  // Chronic Care Management
  '99490': {
    code: '99490',
    description: 'Chronic care management, at least 20 min clinical staff time',
    category: 'evaluation_management',
    workRVU: 0.61,
    practiceExpenseRVU: 1.00,
    malpracticeRVU: 0.04,
    totalRVU: 1.65,
    statusIndicator: 'V',
    globalDays: null,
    modifierAllowed: true
  },
  '99491': {
    code: '99491',
    description: 'Chronic care management, at least 30 min physician time',
    category: 'evaluation_management',
    workRVU: 1.00,
    practiceExpenseRVU: 0.75,
    malpracticeRVU: 0.06,
    totalRVU: 1.81,
    statusIndicator: 'V',
    globalDays: null,
    modifierAllowed: true
  },

  // ============================================================================
  // Additional Surgery Codes
  // ============================================================================

  // Breast Surgery
  '19301': {
    code: '19301',
    description: 'Mastectomy, partial',
    category: 'surgery',
    workRVU: 8.18,
    practiceExpenseRVU: 6.97,
    malpracticeRVU: 0.90,
    totalRVU: 16.05,
    statusIndicator: 'T',
    globalDays: 10,
    modifierAllowed: true
  },
  '19303': {
    code: '19303',
    description: 'Mastectomy, simple, complete',
    category: 'surgery',
    workRVU: 11.40,
    practiceExpenseRVU: 9.71,
    malpracticeRVU: 1.25,
    totalRVU: 22.36,
    statusIndicator: 'T',
    globalDays: 10,
    modifierAllowed: true
  },

  // Vascular Surgery
  '36556': {
    code: '36556',
    description: 'Insertion of PICC, age 5+',
    category: 'surgery',
    workRVU: 2.50,
    practiceExpenseRVU: 4.85,
    malpracticeRVU: 0.20,
    totalRVU: 7.55,
    statusIndicator: 'T',
    globalDays: 0,
    modifierAllowed: true
  },
  '36561': {
    code: '36561',
    description: 'Insertion of tunneled central venous catheter, age 5+',
    category: 'surgery',
    workRVU: 3.15,
    practiceExpenseRVU: 5.78,
    malpracticeRVU: 0.25,
    totalRVU: 9.18,
    statusIndicator: 'T',
    globalDays: 0,
    modifierAllowed: true
  },
  '36620': {
    code: '36620',
    description: 'Arterial catheterization for continuous monitoring',
    category: 'surgery',
    workRVU: 1.26,
    practiceExpenseRVU: 2.95,
    malpracticeRVU: 0.10,
    totalRVU: 4.31,
    statusIndicator: 'T',
    globalDays: 0,
    modifierAllowed: true
  },

  // Wound Care
  '97597': {
    code: '97597',
    description: 'Debridement of open wound, selective, up to 20 sq cm',
    category: 'surgery',
    workRVU: 0.60,
    practiceExpenseRVU: 0.55,
    malpracticeRVU: 0.04,
    totalRVU: 1.19,
    statusIndicator: 'T',
    globalDays: 0,
    modifierAllowed: true
  },
  '97598': {
    code: '97598',
    description: 'Debridement of open wound, selective, each additional 20 sq cm',
    category: 'surgery',
    workRVU: 0.24,
    practiceExpenseRVU: 0.22,
    malpracticeRVU: 0.02,
    totalRVU: 0.48,
    statusIndicator: 'T',
    globalDays: 0,
    modifierAllowed: true
  },

  // Eye Surgery
  '66984': {
    code: '66984',
    description: 'Extracapsular cataract removal with IOL insertion',
    category: 'surgery',
    workRVU: 9.43,
    practiceExpenseRVU: 8.03,
    malpracticeRVU: 1.04,
    totalRVU: 18.50,
    statusIndicator: 'T',
    globalDays: 90,
    modifierAllowed: true
  },

  // Urology
  '52000': {
    code: '52000',
    description: 'Cystourethroscopy',
    category: 'surgery',
    workRVU: 1.85,
    practiceExpenseRVU: 4.28,
    malpracticeRVU: 0.15,
    totalRVU: 6.28,
    statusIndicator: 'T',
    globalDays: 0,
    modifierAllowed: true
  },
  '52310': {
    code: '52310',
    description: 'Cystourethroscopy with removal of foreign body or calculus',
    category: 'surgery',
    workRVU: 2.58,
    practiceExpenseRVU: 5.45,
    malpracticeRVU: 0.21,
    totalRVU: 8.24,
    statusIndicator: 'T',
    globalDays: 0,
    modifierAllowed: true
  },

  // OB/GYN
  '59400': {
    code: '59400',
    description: 'Routine obstetric care including antepartum, vaginal delivery, postpartum',
    category: 'surgery',
    workRVU: 22.68,
    practiceExpenseRVU: 18.78,
    malpracticeRVU: 2.72,
    totalRVU: 44.18,
    statusIndicator: 'T',
    globalDays: 90,
    modifierAllowed: true
  },
  '59510': {
    code: '59510',
    description: 'Routine obstetric care including antepartum, cesarean delivery, postpartum',
    category: 'surgery',
    workRVU: 26.43,
    practiceExpenseRVU: 21.88,
    malpracticeRVU: 3.17,
    totalRVU: 51.48,
    statusIndicator: 'T',
    globalDays: 90,
    modifierAllowed: true
  },
  '58558': {
    code: '58558',
    description: 'Hysteroscopy with biopsy of endometrium',
    category: 'surgery',
    workRVU: 3.95,
    practiceExpenseRVU: 7.35,
    malpracticeRVU: 0.32,
    totalRVU: 11.62,
    statusIndicator: 'T',
    globalDays: 0,
    modifierAllowed: true
  },

  // ============================================================================
  // Additional Radiology Codes
  // ============================================================================

  '70450': {
    code: '70450',
    description: 'CT head/brain without contrast',
    category: 'radiology',
    workRVU: 0.87,
    practiceExpenseRVU: 4.12,
    malpracticeRVU: 0.05,
    totalRVU: 5.04,
    statusIndicator: 'S',
    globalDays: null,
    modifierAllowed: true
  },
  '70460': {
    code: '70460',
    description: 'CT head/brain with contrast',
    category: 'radiology',
    workRVU: 1.13,
    practiceExpenseRVU: 4.68,
    malpracticeRVU: 0.07,
    totalRVU: 5.88,
    statusIndicator: 'S',
    globalDays: null,
    modifierAllowed: true
  },
  '70470': {
    code: '70470',
    description: 'CT head/brain without and with contrast',
    category: 'radiology',
    workRVU: 1.40,
    practiceExpenseRVU: 5.52,
    malpracticeRVU: 0.08,
    totalRVU: 7.00,
    statusIndicator: 'S',
    globalDays: null,
    modifierAllowed: true
  },
  '70551': {
    code: '70551',
    description: 'MRI brain without contrast',
    category: 'radiology',
    workRVU: 1.52,
    practiceExpenseRVU: 6.28,
    malpracticeRVU: 0.09,
    totalRVU: 7.89,
    statusIndicator: 'S',
    globalDays: null,
    modifierAllowed: true
  },
  '73030': {
    code: '73030',
    description: 'X-ray, shoulder, complete, minimum of 2 views',
    category: 'radiology',
    workRVU: 0.18,
    practiceExpenseRVU: 0.52,
    malpracticeRVU: 0.01,
    totalRVU: 0.71,
    statusIndicator: 'S',
    globalDays: null,
    modifierAllowed: true
  },
  '73562': {
    code: '73562',
    description: 'X-ray, knee, 3 views',
    category: 'radiology',
    workRVU: 0.17,
    practiceExpenseRVU: 0.50,
    malpracticeRVU: 0.01,
    totalRVU: 0.68,
    statusIndicator: 'S',
    globalDays: null,
    modifierAllowed: true
  },
  '73610': {
    code: '73610',
    description: 'X-ray, ankle, complete, minimum of 3 views',
    category: 'radiology',
    workRVU: 0.16,
    practiceExpenseRVU: 0.48,
    malpracticeRVU: 0.01,
    totalRVU: 0.65,
    statusIndicator: 'S',
    globalDays: null,
    modifierAllowed: true
  },

  // Nuclear Medicine
  '78452': {
    code: '78452',
    description: 'Myocardial perfusion imaging, SPECT, multiple studies',
    category: 'radiology',
    workRVU: 1.62,
    practiceExpenseRVU: 10.85,
    malpracticeRVU: 0.10,
    totalRVU: 12.57,
    statusIndicator: 'S',
    globalDays: null,
    modifierAllowed: true
  },
  '78815': {
    code: '78815',
    description: 'PET imaging, skull base to mid-thigh',
    category: 'radiology',
    workRVU: 1.75,
    practiceExpenseRVU: 11.48,
    malpracticeRVU: 0.11,
    totalRVU: 13.34,
    statusIndicator: 'S',
    globalDays: null,
    modifierAllowed: true
  },

  // ============================================================================
  // Additional Lab Codes
  // ============================================================================

  '82270': {
    code: '82270',
    description: 'Blood, occult, feces screening',
    category: 'pathology_lab',
    workRVU: 0.00,
    practiceExpenseRVU: 0.17,
    malpracticeRVU: 0.00,
    totalRVU: 0.17,
    statusIndicator: 'A',
    globalDays: null,
    modifierAllowed: false
  },
  '82306': {
    code: '82306',
    description: 'Vitamin D, 25 hydroxy',
    category: 'pathology_lab',
    workRVU: 0.00,
    practiceExpenseRVU: 0.85,
    malpracticeRVU: 0.00,
    totalRVU: 0.85,
    statusIndicator: 'A',
    globalDays: null,
    modifierAllowed: false
  },
  '82607': {
    code: '82607',
    description: 'Vitamin B-12',
    category: 'pathology_lab',
    workRVU: 0.00,
    practiceExpenseRVU: 0.52,
    malpracticeRVU: 0.00,
    totalRVU: 0.52,
    statusIndicator: 'A',
    globalDays: null,
    modifierAllowed: false
  },
  '82728': {
    code: '82728',
    description: 'Ferritin',
    category: 'pathology_lab',
    workRVU: 0.00,
    practiceExpenseRVU: 0.52,
    malpracticeRVU: 0.00,
    totalRVU: 0.52,
    statusIndicator: 'A',
    globalDays: null,
    modifierAllowed: false
  },
  '83540': {
    code: '83540',
    description: 'Iron, serum',
    category: 'pathology_lab',
    workRVU: 0.00,
    practiceExpenseRVU: 0.22,
    malpracticeRVU: 0.00,
    totalRVU: 0.22,
    statusIndicator: 'A',
    globalDays: null,
    modifierAllowed: false
  },
  '83550': {
    code: '83550',
    description: 'Iron binding capacity',
    category: 'pathology_lab',
    workRVU: 0.00,
    practiceExpenseRVU: 0.28,
    malpracticeRVU: 0.00,
    totalRVU: 0.28,
    statusIndicator: 'A',
    globalDays: null,
    modifierAllowed: false
  },
  '84153': {
    code: '84153',
    description: 'PSA, total',
    category: 'pathology_lab',
    workRVU: 0.00,
    practiceExpenseRVU: 0.75,
    malpracticeRVU: 0.00,
    totalRVU: 0.75,
    statusIndicator: 'A',
    globalDays: null,
    modifierAllowed: false
  },
  '84439': {
    code: '84439',
    description: 'Thyroxine, free',
    category: 'pathology_lab',
    workRVU: 0.00,
    practiceExpenseRVU: 0.42,
    malpracticeRVU: 0.00,
    totalRVU: 0.42,
    statusIndicator: 'A',
    globalDays: null,
    modifierAllowed: false
  },
  '84484': {
    code: '84484',
    description: 'Troponin, quantitative',
    category: 'pathology_lab',
    workRVU: 0.00,
    practiceExpenseRVU: 0.58,
    malpracticeRVU: 0.00,
    totalRVU: 0.58,
    statusIndicator: 'A',
    globalDays: null,
    modifierAllowed: false
  },
  '84550': {
    code: '84550',
    description: 'Uric acid, blood',
    category: 'pathology_lab',
    workRVU: 0.00,
    practiceExpenseRVU: 0.18,
    malpracticeRVU: 0.00,
    totalRVU: 0.18,
    statusIndicator: 'A',
    globalDays: null,
    modifierAllowed: false
  },
  '85027': {
    code: '85027',
    description: 'Complete blood count, automated',
    category: 'pathology_lab',
    workRVU: 0.00,
    practiceExpenseRVU: 0.32,
    malpracticeRVU: 0.00,
    totalRVU: 0.32,
    statusIndicator: 'A',
    globalDays: null,
    modifierAllowed: false
  },
  '85652': {
    code: '85652',
    description: 'Sedimentation rate, automated',
    category: 'pathology_lab',
    workRVU: 0.00,
    practiceExpenseRVU: 0.14,
    malpracticeRVU: 0.00,
    totalRVU: 0.14,
    statusIndicator: 'A',
    globalDays: null,
    modifierAllowed: false
  },
  '86580': {
    code: '86580',
    description: 'Skin test, tuberculosis, intradermal',
    category: 'pathology_lab',
    workRVU: 0.00,
    practiceExpenseRVU: 0.45,
    malpracticeRVU: 0.00,
    totalRVU: 0.45,
    statusIndicator: 'A',
    globalDays: null,
    modifierAllowed: false
  },

  // ============================================================================
  // Emergency Services
  // ============================================================================

  '99217': {
    code: '99217',
    description: 'Observation care discharge day management',
    category: 'evaluation_management',
    workRVU: 1.50,
    practiceExpenseRVU: 0.67,
    malpracticeRVU: 0.10,
    totalRVU: 2.27,
    statusIndicator: 'V',
    globalDays: null,
    modifierAllowed: true
  },
  '99218': {
    code: '99218',
    description: 'Initial observation care, low MDM',
    category: 'evaluation_management',
    workRVU: 1.92,
    practiceExpenseRVU: 0.91,
    malpracticeRVU: 0.12,
    totalRVU: 2.95,
    statusIndicator: 'V',
    globalDays: null,
    modifierAllowed: true
  },
  '99219': {
    code: '99219',
    description: 'Initial observation care, moderate MDM',
    category: 'evaluation_management',
    workRVU: 2.60,
    practiceExpenseRVU: 1.17,
    malpracticeRVU: 0.17,
    totalRVU: 3.94,
    statusIndicator: 'V',
    globalDays: null,
    modifierAllowed: true
  },
  '99220': {
    code: '99220',
    description: 'Initial observation care, high MDM',
    category: 'evaluation_management',
    workRVU: 3.56,
    practiceExpenseRVU: 1.50,
    malpracticeRVU: 0.22,
    totalRVU: 5.28,
    statusIndicator: 'V',
    globalDays: null,
    modifierAllowed: true
  },

  // ============================================================================
  // Psychiatric Services
  // ============================================================================

  '90832': {
    code: '90832',
    description: 'Psychotherapy, 16-37 min',
    category: 'medicine',
    workRVU: 0.97,
    practiceExpenseRVU: 0.57,
    malpracticeRVU: 0.05,
    totalRVU: 1.59,
    statusIndicator: 'S',
    globalDays: null,
    modifierAllowed: true
  },
  '90834': {
    code: '90834',
    description: 'Psychotherapy, 38-52 min',
    category: 'medicine',
    workRVU: 1.50,
    practiceExpenseRVU: 0.78,
    malpracticeRVU: 0.07,
    totalRVU: 2.35,
    statusIndicator: 'S',
    globalDays: null,
    modifierAllowed: true
  },
  '90837': {
    code: '90837',
    description: 'Psychotherapy, 53 min or more',
    category: 'medicine',
    workRVU: 2.14,
    practiceExpenseRVU: 1.02,
    malpracticeRVU: 0.10,
    totalRVU: 3.26,
    statusIndicator: 'S',
    globalDays: null,
    modifierAllowed: true
  },
  '90847': {
    code: '90847',
    description: 'Family psychotherapy with patient present',
    category: 'medicine',
    workRVU: 1.45,
    practiceExpenseRVU: 0.75,
    malpracticeRVU: 0.07,
    totalRVU: 2.27,
    statusIndicator: 'S',
    globalDays: null,
    modifierAllowed: true
  },
  '90853': {
    code: '90853',
    description: 'Group psychotherapy',
    category: 'medicine',
    workRVU: 0.50,
    practiceExpenseRVU: 0.27,
    malpracticeRVU: 0.02,
    totalRVU: 0.79,
    statusIndicator: 'S',
    globalDays: null,
    modifierAllowed: true
  },
  '90791': {
    code: '90791',
    description: 'Psychiatric diagnostic evaluation',
    category: 'medicine',
    workRVU: 3.00,
    practiceExpenseRVU: 1.32,
    malpracticeRVU: 0.14,
    totalRVU: 4.46,
    statusIndicator: 'S',
    globalDays: null,
    modifierAllowed: true
  },

  // ============================================================================
  // Dialysis Services
  // ============================================================================

  '90935': {
    code: '90935',
    description: 'Hemodialysis, single evaluation',
    category: 'medicine',
    workRVU: 1.48,
    practiceExpenseRVU: 0.62,
    malpracticeRVU: 0.09,
    totalRVU: 2.19,
    statusIndicator: 'S',
    globalDays: null,
    modifierAllowed: true
  },
  '90937': {
    code: '90937',
    description: 'Hemodialysis, repeated evaluation',
    category: 'medicine',
    workRVU: 1.98,
    practiceExpenseRVU: 0.83,
    malpracticeRVU: 0.12,
    totalRVU: 2.93,
    statusIndicator: 'S',
    globalDays: null,
    modifierAllowed: true
  },
  '90945': {
    code: '90945',
    description: 'Dialysis procedure other than hemodialysis, single evaluation',
    category: 'medicine',
    workRVU: 1.29,
    practiceExpenseRVU: 0.54,
    malpracticeRVU: 0.08,
    totalRVU: 1.91,
    statusIndicator: 'S',
    globalDays: null,
    modifierAllowed: true
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get a CPT code by code string
 */
export function getCPTCode(code: string): CPTCode | undefined {
  return CPT_CODES[code];
}

/**
 * Search CPT codes by description or code
 */
export function searchCPT(query: string, limit: number = 50): CPTCode[] {
  const normalizedQuery = query.toLowerCase().trim();

  return Object.values(CPT_CODES)
    .filter(cpt =>
      cpt.code.includes(normalizedQuery) ||
      cpt.description.toLowerCase().includes(normalizedQuery)
    )
    .slice(0, limit);
}

/**
 * Get CPT codes by category
 */
export function getCPTsByCategory(category: CPTCategory): CPTCode[] {
  return Object.values(CPT_CODES).filter(cpt => cpt.category === category);
}

/**
 * Get all CPT codes
 */
export function getAllCPTCodes(): CPTCode[] {
  return Object.values(CPT_CODES);
}

/**
 * Get CPT codes with RVU above a threshold
 */
export function getCPTsByMinRVU(minRVU: number): CPTCode[] {
  return Object.values(CPT_CODES).filter(cpt => cpt.totalRVU >= minRVU);
}

/**
 * Calculate payment amount based on conversion factor
 * Default Medicare conversion factor for 2024 is approximately $33.29
 */
export function calculateCPTPayment(code: string, conversionFactor: number = 33.29): number | null {
  const cpt = getCPTCode(code);
  if (!cpt) return null;
  return Math.round(cpt.totalRVU * conversionFactor * 100) / 100;
}

/**
 * Get CPT category display name
 */
export function getCPTCategoryName(category: CPTCategory): string {
  const categoryNames: Record<CPTCategory, string> = {
    evaluation_management: 'Evaluation and Management',
    anesthesia: 'Anesthesia',
    surgery: 'Surgery',
    radiology: 'Radiology',
    pathology_lab: 'Pathology and Laboratory',
    medicine: 'Medicine',
    category_ii: 'Category II (Performance Measures)',
    category_iii: 'Category III (Emerging Technology)'
  };
  return categoryNames[category];
}

/**
 * Validate CPT code format
 */
export function isValidCPTFormat(code: string): boolean {
  // CPT codes are 5 digits, may have a letter suffix for Category II/III
  return /^\d{5}[A-Z]?$/.test(code);
}
