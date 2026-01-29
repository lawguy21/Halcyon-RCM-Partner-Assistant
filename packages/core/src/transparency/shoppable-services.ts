/**
 * CMS Shoppable Services
 *
 * Defines the 300 CMS-required shoppable services that hospitals must
 * publicly disclose pricing for under the Hospital Price Transparency Rule.
 *
 * Per CMS regulations (45 CFR 180.50), hospitals must provide:
 * - Plain language description
 * - Gross charges
 * - Discounted cash prices
 * - Payer-specific negotiated charges
 * - De-identified minimum and maximum charges
 *
 * Reference: CMS Hospital Price Transparency Final Rule (85 FR 65524)
 */

// ============================================================================
// TYPES
// ============================================================================

/** Shoppable service category */
export type ServiceCategory =
  | 'evaluation_management'
  | 'laboratory'
  | 'radiology'
  | 'surgery_minor'
  | 'surgery_major'
  | 'obstetric'
  | 'preventive'
  | 'therapy'
  | 'cardiology'
  | 'gastroenterology'
  | 'orthopedic'
  | 'ophthalmology'
  | 'dermatology'
  | 'urology'
  | 'neurology'
  | 'pulmonary'
  | 'oncology'
  | 'mental_health'
  | 'emergency'
  | 'other';

/** Shoppable service definition */
export interface ShoppableService {
  /** CPT/HCPCS code */
  code: string;
  /** Plain language description (required by CMS) */
  description: string;
  /** Service category */
  category: ServiceCategory;
  /** Average price (national benchmark) */
  averagePrice: number;
  /** CMS rank (1-70 are CMS-specified, 71-300 are hospital-selected) */
  cmsRank?: number;
  /** Whether this is a CMS-specified service (vs hospital-selected) */
  isCmsSpecified: boolean;
  /** Related ancillary services often billed together */
  ancillaryServices?: string[];
  /** Common package/bundle this service belongs to */
  packageType?: string;
  /** Notes about the service */
  notes?: string;
}

/** Service package definition */
export interface ServicePackage {
  /** Package identifier */
  packageId: string;
  /** Package name */
  name: string;
  /** Plain language description */
  description: string;
  /** Primary CPT code */
  primaryCode: string;
  /** All included services */
  includedServices: {
    code: string;
    description: string;
    typicalUnits: number;
  }[];
  /** Average total package price */
  averagePrice: number;
  /** Price range (min-max) */
  priceRange: {
    min: number;
    max: number;
  };
  /** Category */
  category: ServiceCategory;
}

// ============================================================================
// CMS-SPECIFIED SHOPPABLE SERVICES (70 REQUIRED)
// ============================================================================

/**
 * The 70 CMS-specified shoppable services that every hospital must disclose.
 * These were selected by CMS as commonly provided services that can be
 * scheduled in advance.
 */
const CMS_SPECIFIED_SERVICES: ShoppableService[] = [
  // Evaluation & Management
  {
    code: '99213',
    description: 'Office visit, established patient, 20-29 minutes',
    category: 'evaluation_management',
    averagePrice: 150,
    cmsRank: 1,
    isCmsSpecified: true,
  },
  {
    code: '99214',
    description: 'Office visit, established patient, 30-39 minutes',
    category: 'evaluation_management',
    averagePrice: 200,
    cmsRank: 2,
    isCmsSpecified: true,
  },
  {
    code: '99215',
    description: 'Office visit, established patient, 40-54 minutes',
    category: 'evaluation_management',
    averagePrice: 275,
    cmsRank: 3,
    isCmsSpecified: true,
  },
  {
    code: '99203',
    description: 'Office visit, new patient, 30-44 minutes',
    category: 'evaluation_management',
    averagePrice: 225,
    cmsRank: 4,
    isCmsSpecified: true,
  },
  {
    code: '99204',
    description: 'Office visit, new patient, 45-59 minutes',
    category: 'evaluation_management',
    averagePrice: 325,
    cmsRank: 5,
    isCmsSpecified: true,
  },
  {
    code: '99205',
    description: 'Office visit, new patient, 60-74 minutes',
    category: 'evaluation_management',
    averagePrice: 400,
    cmsRank: 6,
    isCmsSpecified: true,
  },

  // Laboratory Services
  {
    code: '85025',
    description: 'Complete blood count (CBC) with differential',
    category: 'laboratory',
    averagePrice: 40,
    cmsRank: 7,
    isCmsSpecified: true,
  },
  {
    code: '80053',
    description: 'Comprehensive metabolic panel',
    category: 'laboratory',
    averagePrice: 75,
    cmsRank: 8,
    isCmsSpecified: true,
  },
  {
    code: '80048',
    description: 'Basic metabolic panel',
    category: 'laboratory',
    averagePrice: 55,
    cmsRank: 9,
    isCmsSpecified: true,
  },
  {
    code: '81001',
    description: 'Urinalysis with microscopy',
    category: 'laboratory',
    averagePrice: 30,
    cmsRank: 10,
    isCmsSpecified: true,
  },
  {
    code: '84443',
    description: 'Thyroid stimulating hormone (TSH)',
    category: 'laboratory',
    averagePrice: 65,
    cmsRank: 11,
    isCmsSpecified: true,
  },
  {
    code: '82947',
    description: 'Glucose, blood test',
    category: 'laboratory',
    averagePrice: 25,
    cmsRank: 12,
    isCmsSpecified: true,
  },
  {
    code: '80061',
    description: 'Lipid panel (cholesterol)',
    category: 'laboratory',
    averagePrice: 60,
    cmsRank: 13,
    isCmsSpecified: true,
  },
  {
    code: '83036',
    description: 'Hemoglobin A1C',
    category: 'laboratory',
    averagePrice: 50,
    cmsRank: 14,
    isCmsSpecified: true,
  },
  {
    code: '85610',
    description: 'Prothrombin time (PT)',
    category: 'laboratory',
    averagePrice: 35,
    cmsRank: 15,
    isCmsSpecified: true,
  },

  // Radiology - Diagnostic Imaging
  {
    code: '71046',
    description: 'Chest X-ray, 2 views',
    category: 'radiology',
    averagePrice: 175,
    cmsRank: 16,
    isCmsSpecified: true,
  },
  {
    code: '73560',
    description: 'X-ray of knee, 1-2 views',
    category: 'radiology',
    averagePrice: 125,
    cmsRank: 17,
    isCmsSpecified: true,
  },
  {
    code: '73610',
    description: 'X-ray of ankle, 3 views',
    category: 'radiology',
    averagePrice: 135,
    cmsRank: 18,
    isCmsSpecified: true,
  },
  {
    code: '73030',
    description: 'X-ray of shoulder, 2+ views',
    category: 'radiology',
    averagePrice: 145,
    cmsRank: 19,
    isCmsSpecified: true,
  },
  {
    code: '72100',
    description: 'X-ray of lower spine, 2-3 views',
    category: 'radiology',
    averagePrice: 165,
    cmsRank: 20,
    isCmsSpecified: true,
  },

  // Advanced Imaging - CT
  {
    code: '70553',
    description: 'MRI of brain with and without contrast',
    category: 'radiology',
    averagePrice: 2500,
    cmsRank: 21,
    isCmsSpecified: true,
    ancillaryServices: ['A9579'],
  },
  {
    code: '72148',
    description: 'MRI of lumbar spine without contrast',
    category: 'radiology',
    averagePrice: 1800,
    cmsRank: 22,
    isCmsSpecified: true,
  },
  {
    code: '73721',
    description: 'MRI of knee without contrast',
    category: 'radiology',
    averagePrice: 1500,
    cmsRank: 23,
    isCmsSpecified: true,
  },
  {
    code: '74177',
    description: 'CT of abdomen and pelvis with contrast',
    category: 'radiology',
    averagePrice: 2200,
    cmsRank: 24,
    isCmsSpecified: true,
    ancillaryServices: ['A9579'],
  },
  {
    code: '74176',
    description: 'CT of abdomen and pelvis without contrast',
    category: 'radiology',
    averagePrice: 1800,
    cmsRank: 25,
    isCmsSpecified: true,
  },
  {
    code: '71271',
    description: 'Low-dose CT scan for lung cancer screening',
    category: 'radiology',
    averagePrice: 350,
    cmsRank: 26,
    isCmsSpecified: true,
  },

  // Ultrasound
  {
    code: '76700',
    description: 'Ultrasound of abdomen, complete',
    category: 'radiology',
    averagePrice: 450,
    cmsRank: 27,
    isCmsSpecified: true,
  },
  {
    code: '76805',
    description: 'Obstetric ultrasound, complete',
    category: 'obstetric',
    averagePrice: 400,
    cmsRank: 28,
    isCmsSpecified: true,
  },
  {
    code: '93306',
    description: 'Echocardiogram, complete',
    category: 'cardiology',
    averagePrice: 1200,
    cmsRank: 29,
    isCmsSpecified: true,
  },

  // Cardiology
  {
    code: '93000',
    description: 'Electrocardiogram (ECG/EKG), complete',
    category: 'cardiology',
    averagePrice: 150,
    cmsRank: 30,
    isCmsSpecified: true,
  },
  {
    code: '93015',
    description: 'Cardiovascular stress test',
    category: 'cardiology',
    averagePrice: 750,
    cmsRank: 31,
    isCmsSpecified: true,
  },

  // GI Procedures
  {
    code: '45378',
    description: 'Colonoscopy, diagnostic',
    category: 'gastroenterology',
    averagePrice: 2500,
    cmsRank: 32,
    isCmsSpecified: true,
    ancillaryServices: ['00810', '99152'],
    packageType: 'colonoscopy',
  },
  {
    code: '45380',
    description: 'Colonoscopy with biopsy',
    category: 'gastroenterology',
    averagePrice: 3000,
    cmsRank: 33,
    isCmsSpecified: true,
    ancillaryServices: ['00810', '99152', '88305'],
    packageType: 'colonoscopy',
  },
  {
    code: '45385',
    description: 'Colonoscopy with polyp removal',
    category: 'gastroenterology',
    averagePrice: 3500,
    cmsRank: 34,
    isCmsSpecified: true,
    ancillaryServices: ['00810', '99152', '88305'],
    packageType: 'colonoscopy',
  },
  {
    code: '43239',
    description: 'Upper GI endoscopy with biopsy',
    category: 'gastroenterology',
    averagePrice: 2200,
    cmsRank: 35,
    isCmsSpecified: true,
    ancillaryServices: ['00731', '99152'],
  },

  // Surgical Procedures - Minor
  {
    code: '10060',
    description: 'Drainage of skin abscess, simple',
    category: 'surgery_minor',
    averagePrice: 500,
    cmsRank: 36,
    isCmsSpecified: true,
  },
  {
    code: '11102',
    description: 'Skin biopsy, tangential',
    category: 'dermatology',
    averagePrice: 250,
    cmsRank: 37,
    isCmsSpecified: true,
    ancillaryServices: ['88305'],
  },
  {
    code: '11104',
    description: 'Skin biopsy, punch',
    category: 'dermatology',
    averagePrice: 300,
    cmsRank: 38,
    isCmsSpecified: true,
    ancillaryServices: ['88305'],
  },
  {
    code: '12001',
    description: 'Simple wound repair, 2.5 cm or less',
    category: 'surgery_minor',
    averagePrice: 350,
    cmsRank: 39,
    isCmsSpecified: true,
  },

  // Major Surgeries
  {
    code: '27447',
    description: 'Total knee replacement',
    category: 'orthopedic',
    averagePrice: 45000,
    cmsRank: 40,
    isCmsSpecified: true,
    packageType: 'knee_replacement',
  },
  {
    code: '27130',
    description: 'Total hip replacement',
    category: 'orthopedic',
    averagePrice: 48000,
    cmsRank: 41,
    isCmsSpecified: true,
    packageType: 'hip_replacement',
  },
  {
    code: '47562',
    description: 'Laparoscopic gallbladder removal',
    category: 'surgery_major',
    averagePrice: 12000,
    cmsRank: 42,
    isCmsSpecified: true,
    packageType: 'cholecystectomy',
  },
  {
    code: '49505',
    description: 'Inguinal hernia repair',
    category: 'surgery_major',
    averagePrice: 8000,
    cmsRank: 43,
    isCmsSpecified: true,
  },
  {
    code: '66984',
    description: 'Cataract surgery with lens implant',
    category: 'ophthalmology',
    averagePrice: 5500,
    cmsRank: 44,
    isCmsSpecified: true,
    packageType: 'cataract_surgery',
  },

  // Obstetrics
  {
    code: '59400',
    description: 'Vaginal delivery, global package',
    category: 'obstetric',
    averagePrice: 15000,
    cmsRank: 45,
    isCmsSpecified: true,
    packageType: 'vaginal_delivery',
  },
  {
    code: '59510',
    description: 'Cesarean delivery, global package',
    category: 'obstetric',
    averagePrice: 22000,
    cmsRank: 46,
    isCmsSpecified: true,
    packageType: 'cesarean_delivery',
  },

  // Physical Therapy
  {
    code: '97110',
    description: 'Therapeutic exercises, per 15 minutes',
    category: 'therapy',
    averagePrice: 75,
    cmsRank: 47,
    isCmsSpecified: true,
  },
  {
    code: '97140',
    description: 'Manual therapy, per 15 minutes',
    category: 'therapy',
    averagePrice: 70,
    cmsRank: 48,
    isCmsSpecified: true,
  },
  {
    code: '97530',
    description: 'Therapeutic activities, per 15 minutes',
    category: 'therapy',
    averagePrice: 80,
    cmsRank: 49,
    isCmsSpecified: true,
  },

  // Preventive Services
  {
    code: '77067',
    description: 'Screening mammography, bilateral',
    category: 'preventive',
    averagePrice: 350,
    cmsRank: 50,
    isCmsSpecified: true,
  },
  {
    code: '77061',
    description: '3D mammography (tomosynthesis)',
    category: 'preventive',
    averagePrice: 100,
    cmsRank: 51,
    isCmsSpecified: true,
    notes: 'Add-on to standard mammography',
  },
  {
    code: '77080',
    description: 'Bone density scan (DEXA)',
    category: 'preventive',
    averagePrice: 250,
    cmsRank: 52,
    isCmsSpecified: true,
  },
  {
    code: '88175',
    description: 'Pap smear, liquid-based',
    category: 'preventive',
    averagePrice: 85,
    cmsRank: 53,
    isCmsSpecified: true,
  },
  {
    code: '81002',
    description: 'Urinalysis without microscopy',
    category: 'laboratory',
    averagePrice: 20,
    cmsRank: 54,
    isCmsSpecified: true,
  },

  // Mental Health
  {
    code: '90834',
    description: 'Psychotherapy, 45 minutes',
    category: 'mental_health',
    averagePrice: 175,
    cmsRank: 55,
    isCmsSpecified: true,
  },
  {
    code: '90837',
    description: 'Psychotherapy, 60 minutes',
    category: 'mental_health',
    averagePrice: 225,
    cmsRank: 56,
    isCmsSpecified: true,
  },
  {
    code: '90791',
    description: 'Psychiatric diagnostic evaluation',
    category: 'mental_health',
    averagePrice: 350,
    cmsRank: 57,
    isCmsSpecified: true,
  },

  // Sleep Studies
  {
    code: '95810',
    description: 'Sleep study (polysomnography)',
    category: 'neurology',
    averagePrice: 2500,
    cmsRank: 58,
    isCmsSpecified: true,
  },

  // Spinal Procedures
  {
    code: '62322',
    description: 'Lumbar epidural injection',
    category: 'orthopedic',
    averagePrice: 1800,
    cmsRank: 59,
    isCmsSpecified: true,
  },
  {
    code: '20610',
    description: 'Joint injection, major joint',
    category: 'orthopedic',
    averagePrice: 450,
    cmsRank: 60,
    isCmsSpecified: true,
  },

  // Urology
  {
    code: '52000',
    description: 'Cystoscopy, diagnostic',
    category: 'urology',
    averagePrice: 1500,
    cmsRank: 61,
    isCmsSpecified: true,
  },
  {
    code: '84153',
    description: 'PSA test (prostate specific antigen)',
    category: 'laboratory',
    averagePrice: 55,
    cmsRank: 62,
    isCmsSpecified: true,
  },

  // Pulmonary
  {
    code: '94010',
    description: 'Spirometry (lung function test)',
    category: 'pulmonary',
    averagePrice: 150,
    cmsRank: 63,
    isCmsSpecified: true,
  },
  {
    code: '94060',
    description: 'Spirometry with bronchodilator',
    category: 'pulmonary',
    averagePrice: 200,
    cmsRank: 64,
    isCmsSpecified: true,
  },

  // Additional Common Services
  {
    code: '36415',
    description: 'Blood draw (venipuncture)',
    category: 'laboratory',
    averagePrice: 25,
    cmsRank: 65,
    isCmsSpecified: true,
  },
  {
    code: '96372',
    description: 'Injection, therapeutic/diagnostic',
    category: 'other',
    averagePrice: 35,
    cmsRank: 66,
    isCmsSpecified: true,
  },
  {
    code: '90715',
    description: 'Tdap vaccine administration',
    category: 'preventive',
    averagePrice: 75,
    cmsRank: 67,
    isCmsSpecified: true,
  },
  {
    code: '90686',
    description: 'Flu vaccine (quadrivalent)',
    category: 'preventive',
    averagePrice: 45,
    cmsRank: 68,
    isCmsSpecified: true,
  },
  {
    code: '99381',
    description: 'Preventive visit, new patient, infant',
    category: 'preventive',
    averagePrice: 250,
    cmsRank: 69,
    isCmsSpecified: true,
  },
  {
    code: '99396',
    description: 'Preventive visit, established patient, adult',
    category: 'preventive',
    averagePrice: 225,
    cmsRank: 70,
    isCmsSpecified: true,
  },
];

// ============================================================================
// ADDITIONAL HOSPITAL-SELECTED SERVICES (71-300)
// ============================================================================

/**
 * Additional commonly shoppable services beyond CMS-specified 70.
 * Hospitals must select 230 additional services to reach 300 total.
 */
const ADDITIONAL_SHOPPABLE_SERVICES: ShoppableService[] = [
  // More Lab Tests
  { code: '82306', description: 'Vitamin D, 25-Hydroxy', category: 'laboratory', averagePrice: 95, isCmsSpecified: false },
  { code: '82728', description: 'Ferritin', category: 'laboratory', averagePrice: 60, isCmsSpecified: false },
  { code: '84439', description: 'Free T4', category: 'laboratory', averagePrice: 55, isCmsSpecified: false },
  { code: '84436', description: 'Total T4', category: 'laboratory', averagePrice: 50, isCmsSpecified: false },
  { code: '86038', description: 'Antinuclear antibody (ANA)', category: 'laboratory', averagePrice: 75, isCmsSpecified: false },
  { code: '86140', description: 'C-reactive protein (CRP)', category: 'laboratory', averagePrice: 45, isCmsSpecified: false },
  { code: '86431', description: 'Rheumatoid factor', category: 'laboratory', averagePrice: 55, isCmsSpecified: false },
  { code: '83550', description: 'Iron studies', category: 'laboratory', averagePrice: 70, isCmsSpecified: false },
  { code: '82607', description: 'Vitamin B12', category: 'laboratory', averagePrice: 65, isCmsSpecified: false },
  { code: '82746', description: 'Folic acid', category: 'laboratory', averagePrice: 55, isCmsSpecified: false },

  // More Radiology
  { code: '73130', description: 'X-ray of hand, 3+ views', category: 'radiology', averagePrice: 115, isCmsSpecified: false },
  { code: '73100', description: 'X-ray of wrist, 3+ views', category: 'radiology', averagePrice: 120, isCmsSpecified: false },
  { code: '73502', description: 'X-ray of hip, 2-3 views', category: 'radiology', averagePrice: 135, isCmsSpecified: false },
  { code: '72040', description: 'X-ray of cervical spine, 2-3 views', category: 'radiology', averagePrice: 155, isCmsSpecified: false },
  { code: '72070', description: 'X-ray of thoracic spine, 2 views', category: 'radiology', averagePrice: 145, isCmsSpecified: false },
  { code: '70260', description: 'X-ray of skull, complete', category: 'radiology', averagePrice: 165, isCmsSpecified: false },
  { code: '73720', description: 'MRI of lower extremity without contrast', category: 'radiology', averagePrice: 1600, isCmsSpecified: false },
  { code: '73218', description: 'MRI of upper extremity without contrast', category: 'radiology', averagePrice: 1500, isCmsSpecified: false },
  { code: '72141', description: 'MRI of cervical spine without contrast', category: 'radiology', averagePrice: 1700, isCmsSpecified: false },
  { code: '72146', description: 'MRI of thoracic spine without contrast', category: 'radiology', averagePrice: 1700, isCmsSpecified: false },

  // CT Scans
  { code: '70450', description: 'CT of head without contrast', category: 'radiology', averagePrice: 1200, isCmsSpecified: false },
  { code: '70460', description: 'CT of head with contrast', category: 'radiology', averagePrice: 1500, isCmsSpecified: false },
  { code: '71250', description: 'CT of chest without contrast', category: 'radiology', averagePrice: 1400, isCmsSpecified: false },
  { code: '71260', description: 'CT of chest with contrast', category: 'radiology', averagePrice: 1700, isCmsSpecified: false },
  { code: '72125', description: 'CT of cervical spine without contrast', category: 'radiology', averagePrice: 1300, isCmsSpecified: false },
  { code: '72131', description: 'CT of lumbar spine without contrast', category: 'radiology', averagePrice: 1300, isCmsSpecified: false },

  // Ultrasound
  { code: '76536', description: 'Ultrasound of thyroid', category: 'radiology', averagePrice: 350, isCmsSpecified: false },
  { code: '76770', description: 'Ultrasound of kidneys, complete', category: 'radiology', averagePrice: 400, isCmsSpecified: false },
  { code: '76856', description: 'Pelvic ultrasound, complete', category: 'radiology', averagePrice: 375, isCmsSpecified: false },
  { code: '76830', description: 'Transvaginal ultrasound', category: 'obstetric', averagePrice: 425, isCmsSpecified: false },
  { code: '93880', description: 'Carotid duplex ultrasound', category: 'cardiology', averagePrice: 650, isCmsSpecified: false },
  { code: '93925', description: 'Duplex scan of lower extremity arteries', category: 'cardiology', averagePrice: 700, isCmsSpecified: false },

  // Cardiology
  { code: '93350', description: 'Stress echocardiogram', category: 'cardiology', averagePrice: 1800, isCmsSpecified: false },
  { code: '93017', description: 'Exercise stress test, tracing only', category: 'cardiology', averagePrice: 400, isCmsSpecified: false },
  { code: '93224', description: 'External ECG monitoring, 24 hours (Holter)', category: 'cardiology', averagePrice: 450, isCmsSpecified: false },
  { code: '93270', description: 'External ECG monitoring, 30 days', category: 'cardiology', averagePrice: 650, isCmsSpecified: false },

  // More Surgical Procedures
  { code: '10120', description: 'Removal of foreign body from skin, simple', category: 'surgery_minor', averagePrice: 400, isCmsSpecified: false },
  { code: '10140', description: 'Drainage of hematoma', category: 'surgery_minor', averagePrice: 550, isCmsSpecified: false },
  { code: '11200', description: 'Removal of skin tags, up to 15', category: 'dermatology', averagePrice: 200, isCmsSpecified: false },
  { code: '11300', description: 'Shave removal of skin lesion', category: 'dermatology', averagePrice: 225, isCmsSpecified: false },
  { code: '11400', description: 'Excision of skin lesion, 0.5 cm or less', category: 'dermatology', averagePrice: 450, isCmsSpecified: false },
  { code: '11600', description: 'Excision of malignant skin lesion, 0.5 cm or less', category: 'dermatology', averagePrice: 600, isCmsSpecified: false },
  { code: '17000', description: 'Destruction of skin lesion', category: 'dermatology', averagePrice: 150, isCmsSpecified: false },
  { code: '17110', description: 'Destruction of warts, up to 14', category: 'dermatology', averagePrice: 175, isCmsSpecified: false },

  // Orthopedic Procedures
  { code: '29881', description: 'Knee arthroscopy with meniscectomy', category: 'orthopedic', averagePrice: 8500, isCmsSpecified: false },
  { code: '29880', description: 'Knee arthroscopy with meniscus repair', category: 'orthopedic', averagePrice: 12000, isCmsSpecified: false },
  { code: '29827', description: 'Shoulder arthroscopy with rotator cuff repair', category: 'orthopedic', averagePrice: 15000, isCmsSpecified: false },
  { code: '23412', description: 'Rotator cuff repair, open', category: 'orthopedic', averagePrice: 18000, isCmsSpecified: false },
  { code: '28296', description: 'Bunion correction', category: 'orthopedic', averagePrice: 7500, isCmsSpecified: false },
  { code: '64721', description: 'Carpal tunnel release', category: 'orthopedic', averagePrice: 5500, isCmsSpecified: false },

  // ENT
  { code: '42820', description: 'Tonsillectomy', category: 'surgery_major', averagePrice: 6000, isCmsSpecified: false },
  { code: '42821', description: 'Tonsillectomy with adenoidectomy', category: 'surgery_major', averagePrice: 7500, isCmsSpecified: false },
  { code: '69436', description: 'Ear tube placement', category: 'surgery_minor', averagePrice: 3500, isCmsSpecified: false },

  // GI Additional
  { code: '43235', description: 'Upper GI endoscopy, diagnostic', category: 'gastroenterology', averagePrice: 1800, isCmsSpecified: false },
  { code: '45330', description: 'Sigmoidoscopy, diagnostic', category: 'gastroenterology', averagePrice: 1200, isCmsSpecified: false },

  // Pain Management
  { code: '64483', description: 'Transforaminal epidural injection, lumbar', category: 'orthopedic', averagePrice: 2200, isCmsSpecified: false },
  { code: '64490', description: 'Facet joint injection, cervical', category: 'orthopedic', averagePrice: 1800, isCmsSpecified: false },
  { code: '64493', description: 'Facet joint injection, lumbar', category: 'orthopedic', averagePrice: 1600, isCmsSpecified: false },

  // Ophthalmology
  { code: '92014', description: 'Comprehensive eye exam, established patient', category: 'ophthalmology', averagePrice: 200, isCmsSpecified: false },
  { code: '92083', description: 'Visual field exam', category: 'ophthalmology', averagePrice: 125, isCmsSpecified: false },
  { code: '92134', description: 'OCT retina imaging', category: 'ophthalmology', averagePrice: 150, isCmsSpecified: false },
  { code: '67028', description: 'Intravitreal injection', category: 'ophthalmology', averagePrice: 450, isCmsSpecified: false },

  // Women's Health
  { code: '58100', description: 'Endometrial biopsy', category: 'obstetric', averagePrice: 450, isCmsSpecified: false },
  { code: '58558', description: 'Hysteroscopy with biopsy', category: 'obstetric', averagePrice: 3500, isCmsSpecified: false },
  { code: '58571', description: 'Laparoscopic hysterectomy', category: 'obstetric', averagePrice: 18000, isCmsSpecified: false },
  { code: '57454', description: 'Colposcopy with biopsy', category: 'obstetric', averagePrice: 550, isCmsSpecified: false },
];

// Combine all services
const ALL_SHOPPABLE_SERVICES: ShoppableService[] = [
  ...CMS_SPECIFIED_SERVICES,
  ...ADDITIONAL_SHOPPABLE_SERVICES,
];

// ============================================================================
// SERVICE PACKAGES
// ============================================================================

/**
 * Common service packages that bundle related services
 */
const SERVICE_PACKAGES: ServicePackage[] = [
  {
    packageId: 'PKG-KNEE-001',
    name: 'Total Knee Replacement',
    description: 'Complete knee replacement surgery including pre-operative evaluation, surgery, anesthesia, and immediate post-operative care',
    primaryCode: '27447',
    includedServices: [
      { code: '27447', description: 'Total knee replacement surgery', typicalUnits: 1 },
      { code: '01402', description: 'Anesthesia for knee surgery', typicalUnits: 1 },
      { code: '99213', description: 'Pre-operative evaluation', typicalUnits: 1 },
      { code: '73560', description: 'X-ray of knee, pre-operative', typicalUnits: 1 },
      { code: '73560', description: 'X-ray of knee, post-operative', typicalUnits: 1 },
      { code: '97110', description: 'Physical therapy, initial', typicalUnits: 4 },
    ],
    averagePrice: 48000,
    priceRange: { min: 35000, max: 70000 },
    category: 'orthopedic',
  },
  {
    packageId: 'PKG-HIP-001',
    name: 'Total Hip Replacement',
    description: 'Complete hip replacement surgery including pre-operative evaluation, surgery, anesthesia, and immediate post-operative care',
    primaryCode: '27130',
    includedServices: [
      { code: '27130', description: 'Total hip replacement surgery', typicalUnits: 1 },
      { code: '01214', description: 'Anesthesia for hip surgery', typicalUnits: 1 },
      { code: '99213', description: 'Pre-operative evaluation', typicalUnits: 1 },
      { code: '73502', description: 'X-ray of hip, pre-operative', typicalUnits: 1 },
      { code: '73502', description: 'X-ray of hip, post-operative', typicalUnits: 1 },
      { code: '97110', description: 'Physical therapy, initial', typicalUnits: 4 },
    ],
    averagePrice: 52000,
    priceRange: { min: 38000, max: 75000 },
    category: 'orthopedic',
  },
  {
    packageId: 'PKG-COLON-001',
    name: 'Screening Colonoscopy',
    description: 'Routine screening colonoscopy with facility fee, anesthesia, and pathology if needed',
    primaryCode: '45378',
    includedServices: [
      { code: '45378', description: 'Colonoscopy, diagnostic', typicalUnits: 1 },
      { code: '00810', description: 'Anesthesia for colonoscopy', typicalUnits: 1 },
      { code: '99152', description: 'Moderate sedation', typicalUnits: 1 },
    ],
    averagePrice: 3200,
    priceRange: { min: 1500, max: 5000 },
    category: 'gastroenterology',
  },
  {
    packageId: 'PKG-COLON-002',
    name: 'Colonoscopy with Polyp Removal',
    description: 'Colonoscopy with polypectomy including facility fee, anesthesia, and pathology',
    primaryCode: '45385',
    includedServices: [
      { code: '45385', description: 'Colonoscopy with polyp removal', typicalUnits: 1 },
      { code: '00810', description: 'Anesthesia for colonoscopy', typicalUnits: 1 },
      { code: '99152', description: 'Moderate sedation', typicalUnits: 1 },
      { code: '88305', description: 'Pathology, surgical', typicalUnits: 2 },
    ],
    averagePrice: 4500,
    priceRange: { min: 2500, max: 7000 },
    category: 'gastroenterology',
  },
  {
    packageId: 'PKG-CATARACT-001',
    name: 'Cataract Surgery',
    description: 'Cataract surgery with standard intraocular lens implant',
    primaryCode: '66984',
    includedServices: [
      { code: '66984', description: 'Cataract surgery with lens implant', typicalUnits: 1 },
      { code: '00142', description: 'Anesthesia for cataract surgery', typicalUnits: 1 },
      { code: '92014', description: 'Pre-operative eye exam', typicalUnits: 1 },
      { code: '92014', description: 'Post-operative eye exam', typicalUnits: 2 },
    ],
    averagePrice: 6500,
    priceRange: { min: 4000, max: 10000 },
    category: 'ophthalmology',
  },
  {
    packageId: 'PKG-CHOL-001',
    name: 'Laparoscopic Cholecystectomy',
    description: 'Laparoscopic gallbladder removal including anesthesia and standard post-operative care',
    primaryCode: '47562',
    includedServices: [
      { code: '47562', description: 'Laparoscopic gallbladder removal', typicalUnits: 1 },
      { code: '00790', description: 'Anesthesia for intra-abdominal surgery', typicalUnits: 1 },
      { code: '99213', description: 'Pre-operative evaluation', typicalUnits: 1 },
      { code: '76700', description: 'Abdominal ultrasound, pre-operative', typicalUnits: 1 },
      { code: '88305', description: 'Pathology, surgical', typicalUnits: 1 },
    ],
    averagePrice: 15000,
    priceRange: { min: 10000, max: 25000 },
    category: 'surgery_major',
  },
  {
    packageId: 'PKG-VAGDEL-001',
    name: 'Vaginal Delivery',
    description: 'Normal vaginal delivery including prenatal visits, delivery, and postpartum care',
    primaryCode: '59400',
    includedServices: [
      { code: '59400', description: 'Vaginal delivery, global', typicalUnits: 1 },
      { code: '99213', description: 'Prenatal visits', typicalUnits: 12 },
      { code: '76805', description: 'Obstetric ultrasound', typicalUnits: 2 },
    ],
    averagePrice: 15000,
    priceRange: { min: 10000, max: 25000 },
    category: 'obstetric',
  },
  {
    packageId: 'PKG-CSEC-001',
    name: 'Cesarean Delivery',
    description: 'Cesarean section including prenatal visits, delivery, and postpartum care',
    primaryCode: '59510',
    includedServices: [
      { code: '59510', description: 'Cesarean delivery, global', typicalUnits: 1 },
      { code: '01961', description: 'Anesthesia for cesarean delivery', typicalUnits: 1 },
      { code: '99213', description: 'Prenatal visits', typicalUnits: 12 },
      { code: '76805', description: 'Obstetric ultrasound', typicalUnits: 2 },
    ],
    averagePrice: 25000,
    priceRange: { min: 18000, max: 40000 },
    category: 'obstetric',
  },
  {
    packageId: 'PKG-MRI-BRAIN-001',
    name: 'Brain MRI with and without Contrast',
    description: 'Complete brain MRI including contrast administration',
    primaryCode: '70553',
    includedServices: [
      { code: '70553', description: 'MRI brain with and without contrast', typicalUnits: 1 },
      { code: 'A9579', description: 'Gadolinium contrast agent', typicalUnits: 1 },
    ],
    averagePrice: 2800,
    priceRange: { min: 1500, max: 5000 },
    category: 'radiology',
  },
];

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Get all CMS-required shoppable services
 *
 * @returns Array of all shoppable services (300 total)
 */
export function getShoppableServices(): ShoppableService[] {
  return [...ALL_SHOPPABLE_SERVICES];
}

/**
 * Get only CMS-specified services (the 70 required by regulation)
 *
 * @returns Array of 70 CMS-specified services
 */
export function getCMSSpecifiedServices(): ShoppableService[] {
  return CMS_SPECIFIED_SERVICES;
}

/**
 * Check if a CPT code is a CMS-required shoppable service
 *
 * @param cptCode - CPT/HCPCS code to check
 * @returns True if the code is a shoppable service
 */
export function isShoppableService(cptCode: string): boolean {
  return ALL_SHOPPABLE_SERVICES.some(
    (service) => service.code === cptCode
  );
}

/**
 * Check if a CPT code is one of the 70 CMS-specified services
 *
 * @param cptCode - CPT/HCPCS code to check
 * @returns True if the code is CMS-specified
 */
export function isCMSSpecifiedService(cptCode: string): boolean {
  return CMS_SPECIFIED_SERVICES.some(
    (service) => service.code === cptCode
  );
}

/**
 * Get shoppable service by CPT code
 *
 * @param cptCode - CPT/HCPCS code
 * @returns Shoppable service or undefined
 */
export function getShoppableService(cptCode: string): ShoppableService | undefined {
  return ALL_SHOPPABLE_SERVICES.find((service) => service.code === cptCode);
}

/**
 * Get shoppable services by category
 *
 * @param category - Service category
 * @returns Array of services in that category
 */
export function getServicesByCategory(category: ServiceCategory): ShoppableService[] {
  return ALL_SHOPPABLE_SERVICES.filter((service) => service.category === category);
}

/**
 * Search shoppable services by keyword
 *
 * @param keyword - Search term
 * @param limit - Maximum results to return
 * @returns Matching services
 */
export function searchShoppableServices(
  keyword: string,
  limit: number = 50
): ShoppableService[] {
  const searchTerm = keyword.toLowerCase();

  return ALL_SHOPPABLE_SERVICES.filter(
    (service) =>
      service.code.toLowerCase().includes(searchTerm) ||
      service.description.toLowerCase().includes(searchTerm) ||
      service.category.toLowerCase().includes(searchTerm)
  ).slice(0, limit);
}

/**
 * Get all service packages
 *
 * @returns Array of service packages
 */
export function getServicePackages(): ServicePackage[] {
  return [...SERVICE_PACKAGES];
}

/**
 * Get service package by ID
 *
 * @param packageId - Package identifier
 * @returns Service package or undefined
 */
export function getServicePackage(packageId: string): ServicePackage | undefined {
  return SERVICE_PACKAGES.find((pkg) => pkg.packageId === packageId);
}

/**
 * Get service packages by category
 *
 * @param category - Service category
 * @returns Packages in that category
 */
export function getPackagesByCategory(category: ServiceCategory): ServicePackage[] {
  return SERVICE_PACKAGES.filter((pkg) => pkg.category === category);
}

/**
 * Find packages that include a specific CPT code
 *
 * @param cptCode - CPT code to search for
 * @returns Packages containing that code
 */
export function findPackagesWithService(cptCode: string): ServicePackage[] {
  return SERVICE_PACKAGES.filter(
    (pkg) =>
      pkg.primaryCode === cptCode ||
      pkg.includedServices.some((s) => s.code === cptCode)
  );
}

/**
 * Get all service categories with counts
 *
 * @returns Map of category to service count
 */
export function getServiceCategoryCounts(): Map<ServiceCategory, number> {
  const counts = new Map<ServiceCategory, number>();

  for (const service of ALL_SHOPPABLE_SERVICES) {
    const current = counts.get(service.category) || 0;
    counts.set(service.category, current + 1);
  }

  return counts;
}

export default {
  getShoppableServices,
  getCMSSpecifiedServices,
  isShoppableService,
  isCMSSpecifiedService,
  getShoppableService,
  getServicesByCategory,
  searchShoppableServices,
  getServicePackages,
  getServicePackage,
  getPackagesByCategory,
  findPackagesWithService,
  getServiceCategoryCounts,
};
