/**
 * UB-04 Revenue Code Database
 * Standard revenue codes used on institutional claims (0100-0999)
 * Includes code, description, and category
 */

export interface RevenueCode {
  code: string;
  description: string;
  category: RevenueCategory;
  requiresCPT: boolean;
  requiresHCPCS: boolean;
  commonUsage: string;
}

export type RevenueCategory =
  | 'accommodation'
  | 'ancillary'
  | 'outpatient'
  | 'clinic'
  | 'emergency'
  | 'supplies'
  | 'pharmacy'
  | 'laboratory'
  | 'radiology'
  | 'therapy'
  | 'professional'
  | 'other';

// UB-04 Revenue Code Database
export const REVENUE_CODES: Record<string, RevenueCode> = {
  // ============================================================================
  // 0100-0109 ALL-INCLUSIVE RATE
  // ============================================================================

  '0100': {
    code: '0100',
    description: 'All-Inclusive Rate - Room & Board Plus Ancillary',
    category: 'accommodation',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'All-inclusive daily rate'
  },
  '0101': {
    code: '0101',
    description: 'All-Inclusive Rate - Room & Board',
    category: 'accommodation',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'Room and board only rate'
  },

  // ============================================================================
  // 0110-0119 ROOM & BOARD - PRIVATE
  // ============================================================================

  '0110': {
    code: '0110',
    description: 'Room & Board - Private (General Classification)',
    category: 'accommodation',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'Private room general'
  },
  '0111': {
    code: '0111',
    description: 'Room & Board - Private - Medical/Surgical/GYN',
    category: 'accommodation',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'Private room med/surg'
  },
  '0112': {
    code: '0112',
    description: 'Room & Board - Private - Obstetrics',
    category: 'accommodation',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'Private room OB'
  },
  '0113': {
    code: '0113',
    description: 'Room & Board - Private - Pediatric',
    category: 'accommodation',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'Private room pediatric'
  },
  '0114': {
    code: '0114',
    description: 'Room & Board - Private - Psychiatric',
    category: 'accommodation',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'Private room psych'
  },
  '0116': {
    code: '0116',
    description: 'Room & Board - Private - Detoxification',
    category: 'accommodation',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'Private room detox'
  },
  '0117': {
    code: '0117',
    description: 'Room & Board - Private - Oncology',
    category: 'accommodation',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'Private room oncology'
  },
  '0119': {
    code: '0119',
    description: 'Room & Board - Private - Other',
    category: 'accommodation',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'Private room other'
  },

  // ============================================================================
  // 0120-0129 ROOM & BOARD - SEMI-PRIVATE (2 BED)
  // ============================================================================

  '0120': {
    code: '0120',
    description: 'Room & Board - Semi-Private Two Bed (General Classification)',
    category: 'accommodation',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'Semi-private room general'
  },
  '0121': {
    code: '0121',
    description: 'Room & Board - Semi-Private - Medical/Surgical/GYN',
    category: 'accommodation',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'Semi-private room med/surg'
  },
  '0122': {
    code: '0122',
    description: 'Room & Board - Semi-Private - Obstetrics',
    category: 'accommodation',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'Semi-private room OB'
  },
  '0123': {
    code: '0123',
    description: 'Room & Board - Semi-Private - Pediatric',
    category: 'accommodation',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'Semi-private room pediatric'
  },
  '0124': {
    code: '0124',
    description: 'Room & Board - Semi-Private - Psychiatric',
    category: 'accommodation',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'Semi-private room psych'
  },
  '0126': {
    code: '0126',
    description: 'Room & Board - Semi-Private - Detoxification',
    category: 'accommodation',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'Semi-private room detox'
  },
  '0127': {
    code: '0127',
    description: 'Room & Board - Semi-Private - Oncology',
    category: 'accommodation',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'Semi-private room oncology'
  },

  // ============================================================================
  // 0130-0139 ROOM & BOARD - SEMI-PRIVATE (3-4 BED)
  // ============================================================================

  '0130': {
    code: '0130',
    description: 'Room & Board - Semi-Private Three/Four Bed (General Classification)',
    category: 'accommodation',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'Ward room general'
  },

  // ============================================================================
  // 0140-0149 ROOM & BOARD - PRIVATE (DELUXE)
  // ============================================================================

  '0140': {
    code: '0140',
    description: 'Room & Board - Private (Deluxe)',
    category: 'accommodation',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'Deluxe private room'
  },

  // ============================================================================
  // 0150-0159 ROOM & BOARD - WARD
  // ============================================================================

  '0150': {
    code: '0150',
    description: 'Room & Board - Ward (General Classification)',
    category: 'accommodation',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'Ward room general'
  },

  // ============================================================================
  // 0160-0169 ROOM & BOARD - OTHER
  // ============================================================================

  '0160': {
    code: '0160',
    description: 'Room & Board - Other (General Classification)',
    category: 'accommodation',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'Other room type'
  },

  // ============================================================================
  // 0170-0179 NURSERY
  // ============================================================================

  '0170': {
    code: '0170',
    description: 'Nursery (General Classification)',
    category: 'accommodation',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'Newborn nursery general'
  },
  '0171': {
    code: '0171',
    description: 'Nursery - Newborn - Level I',
    category: 'accommodation',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'Well baby nursery'
  },
  '0172': {
    code: '0172',
    description: 'Nursery - Newborn - Level II',
    category: 'accommodation',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'Special care nursery'
  },
  '0173': {
    code: '0173',
    description: 'Nursery - Newborn - Level III',
    category: 'accommodation',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'Neonatal ICU'
  },
  '0174': {
    code: '0174',
    description: 'Nursery - Newborn - Level IV',
    category: 'accommodation',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'Advanced NICU'
  },

  // ============================================================================
  // 0180-0189 LEAVE OF ABSENCE
  // ============================================================================

  '0180': {
    code: '0180',
    description: 'Leave of Absence (General Classification)',
    category: 'accommodation',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'Patient leave general'
  },
  '0183': {
    code: '0183',
    description: 'Leave of Absence - Therapeutic Leave',
    category: 'accommodation',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'Therapeutic leave'
  },

  // ============================================================================
  // 0190-0199 SUBACUTE CARE
  // ============================================================================

  '0190': {
    code: '0190',
    description: 'Subacute Care (General Classification)',
    category: 'accommodation',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'Subacute care general'
  },
  '0191': {
    code: '0191',
    description: 'Subacute Care - Level I',
    category: 'accommodation',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'Subacute care level I'
  },
  '0192': {
    code: '0192',
    description: 'Subacute Care - Level II',
    category: 'accommodation',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'Subacute care level II'
  },
  '0193': {
    code: '0193',
    description: 'Subacute Care - Level III',
    category: 'accommodation',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'Subacute care level III'
  },
  '0194': {
    code: '0194',
    description: 'Subacute Care - Level IV',
    category: 'accommodation',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'Subacute care level IV'
  },

  // ============================================================================
  // 0200-0209 INTENSIVE CARE
  // ============================================================================

  '0200': {
    code: '0200',
    description: 'Intensive Care (General Classification)',
    category: 'accommodation',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'ICU general'
  },
  '0201': {
    code: '0201',
    description: 'Intensive Care - Surgical',
    category: 'accommodation',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'Surgical ICU'
  },
  '0202': {
    code: '0202',
    description: 'Intensive Care - Medical',
    category: 'accommodation',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'Medical ICU'
  },
  '0203': {
    code: '0203',
    description: 'Intensive Care - Pediatric',
    category: 'accommodation',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'Pediatric ICU'
  },
  '0204': {
    code: '0204',
    description: 'Intensive Care - Psychiatric',
    category: 'accommodation',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'Psychiatric ICU'
  },
  '0206': {
    code: '0206',
    description: 'Intensive Care - Intermediate ICU',
    category: 'accommodation',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'Step-down ICU'
  },
  '0207': {
    code: '0207',
    description: 'Intensive Care - Burn Care',
    category: 'accommodation',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'Burn ICU'
  },
  '0208': {
    code: '0208',
    description: 'Intensive Care - Trauma',
    category: 'accommodation',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'Trauma ICU'
  },
  '0209': {
    code: '0209',
    description: 'Intensive Care - Other ICU',
    category: 'accommodation',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'Other ICU'
  },

  // ============================================================================
  // 0210-0219 CORONARY CARE
  // ============================================================================

  '0210': {
    code: '0210',
    description: 'Coronary Care (General Classification)',
    category: 'accommodation',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'CCU general'
  },
  '0211': {
    code: '0211',
    description: 'Coronary Care - Myocardial Infarction',
    category: 'accommodation',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'MI unit'
  },
  '0212': {
    code: '0212',
    description: 'Coronary Care - Pulmonary Care',
    category: 'accommodation',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'Pulmonary ICU'
  },
  '0213': {
    code: '0213',
    description: 'Coronary Care - Heart Transplant',
    category: 'accommodation',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'Heart transplant unit'
  },
  '0214': {
    code: '0214',
    description: 'Coronary Care - Intermediate CCU',
    category: 'accommodation',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'Step-down CCU'
  },

  // ============================================================================
  // 0250-0259 PHARMACY
  // ============================================================================

  '0250': {
    code: '0250',
    description: 'Pharmacy (General Classification)',
    category: 'pharmacy',
    requiresCPT: false,
    requiresHCPCS: true,
    commonUsage: 'General pharmacy'
  },
  '0251': {
    code: '0251',
    description: 'Pharmacy - Generic Drugs',
    category: 'pharmacy',
    requiresCPT: false,
    requiresHCPCS: true,
    commonUsage: 'Generic drugs'
  },
  '0252': {
    code: '0252',
    description: 'Pharmacy - Non-Generic Drugs',
    category: 'pharmacy',
    requiresCPT: false,
    requiresHCPCS: true,
    commonUsage: 'Brand name drugs'
  },
  '0253': {
    code: '0253',
    description: 'Pharmacy - Take Home Drugs',
    category: 'pharmacy',
    requiresCPT: false,
    requiresHCPCS: true,
    commonUsage: 'Discharge medications'
  },
  '0254': {
    code: '0254',
    description: 'Pharmacy - Drugs Incident to Other Diagnostic Services',
    category: 'pharmacy',
    requiresCPT: false,
    requiresHCPCS: true,
    commonUsage: 'Diagnostic drugs'
  },
  '0255': {
    code: '0255',
    description: 'Pharmacy - Drugs Incident to Radiology',
    category: 'pharmacy',
    requiresCPT: false,
    requiresHCPCS: true,
    commonUsage: 'Radiology contrast'
  },
  '0256': {
    code: '0256',
    description: 'Pharmacy - Experimental Drugs',
    category: 'pharmacy',
    requiresCPT: false,
    requiresHCPCS: true,
    commonUsage: 'Experimental drugs'
  },
  '0257': {
    code: '0257',
    description: 'Pharmacy - Non-Prescription Drugs',
    category: 'pharmacy',
    requiresCPT: false,
    requiresHCPCS: true,
    commonUsage: 'OTC medications'
  },
  '0258': {
    code: '0258',
    description: 'Pharmacy - IV Solutions',
    category: 'pharmacy',
    requiresCPT: false,
    requiresHCPCS: true,
    commonUsage: 'IV fluids'
  },
  '0259': {
    code: '0259',
    description: 'Pharmacy - Other Pharmacy',
    category: 'pharmacy',
    requiresCPT: false,
    requiresHCPCS: true,
    commonUsage: 'Other pharmacy'
  },

  // ============================================================================
  // 0260-0269 IV THERAPY
  // ============================================================================

  '0260': {
    code: '0260',
    description: 'IV Therapy (General Classification)',
    category: 'pharmacy',
    requiresCPT: false,
    requiresHCPCS: true,
    commonUsage: 'IV therapy general'
  },
  '0261': {
    code: '0261',
    description: 'IV Therapy - Infusion Pump',
    category: 'pharmacy',
    requiresCPT: false,
    requiresHCPCS: true,
    commonUsage: 'IV pump'
  },
  '0262': {
    code: '0262',
    description: 'IV Therapy - Pharmacy Services',
    category: 'pharmacy',
    requiresCPT: false,
    requiresHCPCS: true,
    commonUsage: 'IV pharmacy'
  },
  '0263': {
    code: '0263',
    description: 'IV Therapy - Drug/Supply Delivery',
    category: 'pharmacy',
    requiresCPT: false,
    requiresHCPCS: true,
    commonUsage: 'IV drug delivery'
  },
  '0264': {
    code: '0264',
    description: 'IV Therapy - Supplies',
    category: 'pharmacy',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'IV supplies'
  },

  // ============================================================================
  // 0270-0279 MEDICAL/SURGICAL SUPPLIES
  // ============================================================================

  '0270': {
    code: '0270',
    description: 'Medical/Surgical Supplies (General Classification)',
    category: 'supplies',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'General supplies'
  },
  '0271': {
    code: '0271',
    description: 'Medical/Surgical Supplies - Non-Sterile',
    category: 'supplies',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'Non-sterile supplies'
  },
  '0272': {
    code: '0272',
    description: 'Medical/Surgical Supplies - Sterile',
    category: 'supplies',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'Sterile supplies'
  },
  '0273': {
    code: '0273',
    description: 'Medical/Surgical Supplies - Take Home',
    category: 'supplies',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'Discharge supplies'
  },
  '0274': {
    code: '0274',
    description: 'Medical/Surgical Supplies - Prosthetic/Orthotic Devices',
    category: 'supplies',
    requiresCPT: false,
    requiresHCPCS: true,
    commonUsage: 'Prosthetics/orthotics'
  },
  '0275': {
    code: '0275',
    description: 'Medical/Surgical Supplies - Pacemaker',
    category: 'supplies',
    requiresCPT: false,
    requiresHCPCS: true,
    commonUsage: 'Pacemaker device'
  },
  '0276': {
    code: '0276',
    description: 'Medical/Surgical Supplies - Intraocular Lens',
    category: 'supplies',
    requiresCPT: false,
    requiresHCPCS: true,
    commonUsage: 'IOL implant'
  },
  '0278': {
    code: '0278',
    description: 'Medical/Surgical Supplies - Other Implants',
    category: 'supplies',
    requiresCPT: false,
    requiresHCPCS: true,
    commonUsage: 'Other implants'
  },

  // ============================================================================
  // 0280-0289 ONCOLOGY
  // ============================================================================

  '0280': {
    code: '0280',
    description: 'Oncology (General Classification)',
    category: 'therapy',
    requiresCPT: true,
    requiresHCPCS: true,
    commonUsage: 'Oncology services general'
  },
  '0281': {
    code: '0281',
    description: 'Oncology - Treatment Planning',
    category: 'therapy',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Radiation treatment planning'
  },
  '0282': {
    code: '0282',
    description: 'Oncology - Radiation Therapy',
    category: 'therapy',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Radiation therapy'
  },
  '0283': {
    code: '0283',
    description: 'Oncology - Chemotherapy IV',
    category: 'therapy',
    requiresCPT: true,
    requiresHCPCS: true,
    commonUsage: 'IV chemotherapy'
  },
  '0284': {
    code: '0284',
    description: 'Oncology - Chemotherapy Oral',
    category: 'therapy',
    requiresCPT: false,
    requiresHCPCS: true,
    commonUsage: 'Oral chemotherapy'
  },
  '0289': {
    code: '0289',
    description: 'Oncology - Other',
    category: 'therapy',
    requiresCPT: true,
    requiresHCPCS: true,
    commonUsage: 'Other oncology services'
  },

  // ============================================================================
  // 0290-0299 DURABLE MEDICAL EQUIPMENT
  // ============================================================================

  '0290': {
    code: '0290',
    description: 'Durable Medical Equipment (General Classification)',
    category: 'supplies',
    requiresCPT: false,
    requiresHCPCS: true,
    commonUsage: 'DME general'
  },
  '0291': {
    code: '0291',
    description: 'Durable Medical Equipment - Rental',
    category: 'supplies',
    requiresCPT: false,
    requiresHCPCS: true,
    commonUsage: 'DME rental'
  },
  '0292': {
    code: '0292',
    description: 'Durable Medical Equipment - Purchase of New DME',
    category: 'supplies',
    requiresCPT: false,
    requiresHCPCS: true,
    commonUsage: 'New DME purchase'
  },
  '0293': {
    code: '0293',
    description: 'Durable Medical Equipment - Purchase of Used DME',
    category: 'supplies',
    requiresCPT: false,
    requiresHCPCS: true,
    commonUsage: 'Used DME purchase'
  },
  '0294': {
    code: '0294',
    description: 'Durable Medical Equipment - Supplies/Drugs',
    category: 'supplies',
    requiresCPT: false,
    requiresHCPCS: true,
    commonUsage: 'DME supplies'
  },

  // ============================================================================
  // 0300-0309 LABORATORY
  // ============================================================================

  '0300': {
    code: '0300',
    description: 'Laboratory (General Classification)',
    category: 'laboratory',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Lab general'
  },
  '0301': {
    code: '0301',
    description: 'Laboratory - Chemistry',
    category: 'laboratory',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Chemistry tests'
  },
  '0302': {
    code: '0302',
    description: 'Laboratory - Immunology',
    category: 'laboratory',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Immunology tests'
  },
  '0303': {
    code: '0303',
    description: 'Laboratory - Renal Patient Home',
    category: 'laboratory',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Home dialysis lab'
  },
  '0304': {
    code: '0304',
    description: 'Laboratory - Non-Routine Dialysis',
    category: 'laboratory',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Dialysis lab'
  },
  '0305': {
    code: '0305',
    description: 'Laboratory - Hematology',
    category: 'laboratory',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Hematology tests'
  },
  '0306': {
    code: '0306',
    description: 'Laboratory - Bacteriology/Microbiology',
    category: 'laboratory',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Microbiology tests'
  },
  '0307': {
    code: '0307',
    description: 'Laboratory - Urology',
    category: 'laboratory',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Urinalysis'
  },
  '0309': {
    code: '0309',
    description: 'Laboratory - Other',
    category: 'laboratory',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Other lab tests'
  },

  // ============================================================================
  // 0310-0319 LABORATORY - PATHOLOGY
  // ============================================================================

  '0310': {
    code: '0310',
    description: 'Laboratory - Pathology (General Classification)',
    category: 'laboratory',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Pathology general'
  },
  '0311': {
    code: '0311',
    description: 'Laboratory - Pathology - Cytology',
    category: 'laboratory',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Cytology'
  },
  '0312': {
    code: '0312',
    description: 'Laboratory - Pathology - Histology',
    category: 'laboratory',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Histology'
  },
  '0314': {
    code: '0314',
    description: 'Laboratory - Pathology - Biopsy',
    category: 'laboratory',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Biopsy pathology'
  },
  '0319': {
    code: '0319',
    description: 'Laboratory - Pathology - Other',
    category: 'laboratory',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Other pathology'
  },

  // ============================================================================
  // 0320-0329 RADIOLOGY - DIAGNOSTIC
  // ============================================================================

  '0320': {
    code: '0320',
    description: 'Radiology - Diagnostic (General Classification)',
    category: 'radiology',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Diagnostic radiology general'
  },
  '0321': {
    code: '0321',
    description: 'Radiology - Diagnostic - Angiocardiography',
    category: 'radiology',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Cardiac angiography'
  },
  '0322': {
    code: '0322',
    description: 'Radiology - Diagnostic - Arthrography',
    category: 'radiology',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Joint arthrography'
  },
  '0323': {
    code: '0323',
    description: 'Radiology - Diagnostic - Arteriography',
    category: 'radiology',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Arteriography'
  },
  '0324': {
    code: '0324',
    description: 'Radiology - Diagnostic - Chest X-Ray',
    category: 'radiology',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Chest X-ray'
  },
  '0329': {
    code: '0329',
    description: 'Radiology - Diagnostic - Other',
    category: 'radiology',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Other diagnostic radiology'
  },

  // ============================================================================
  // 0330-0339 RADIOLOGY - THERAPEUTIC
  // ============================================================================

  '0330': {
    code: '0330',
    description: 'Radiology - Therapeutic (General Classification)',
    category: 'radiology',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Therapeutic radiology general'
  },
  '0333': {
    code: '0333',
    description: 'Radiology - Therapeutic - Radiation Therapy',
    category: 'radiology',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Radiation therapy'
  },

  // ============================================================================
  // 0340-0349 NUCLEAR MEDICINE
  // ============================================================================

  '0340': {
    code: '0340',
    description: 'Nuclear Medicine (General Classification)',
    category: 'radiology',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Nuclear medicine general'
  },
  '0341': {
    code: '0341',
    description: 'Nuclear Medicine - Diagnostic',
    category: 'radiology',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Diagnostic nuclear medicine'
  },
  '0342': {
    code: '0342',
    description: 'Nuclear Medicine - Therapeutic',
    category: 'radiology',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Therapeutic nuclear medicine'
  },
  '0343': {
    code: '0343',
    description: 'Nuclear Medicine - Diagnostic Radiopharmaceuticals',
    category: 'radiology',
    requiresCPT: false,
    requiresHCPCS: true,
    commonUsage: 'Diagnostic radiopharmaceuticals'
  },
  '0344': {
    code: '0344',
    description: 'Nuclear Medicine - Therapeutic Radiopharmaceuticals',
    category: 'radiology',
    requiresCPT: false,
    requiresHCPCS: true,
    commonUsage: 'Therapeutic radiopharmaceuticals'
  },

  // ============================================================================
  // 0350-0359 CT SCAN
  // ============================================================================

  '0350': {
    code: '0350',
    description: 'CT Scan (General Classification)',
    category: 'radiology',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'CT scan general'
  },
  '0351': {
    code: '0351',
    description: 'CT Scan - Head',
    category: 'radiology',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'CT head'
  },
  '0352': {
    code: '0352',
    description: 'CT Scan - Body',
    category: 'radiology',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'CT body'
  },
  '0359': {
    code: '0359',
    description: 'CT Scan - Other',
    category: 'radiology',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Other CT scan'
  },

  // ============================================================================
  // 0360-0369 OPERATING ROOM SERVICES
  // ============================================================================

  '0360': {
    code: '0360',
    description: 'Operating Room Services (General Classification)',
    category: 'ancillary',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'OR services general'
  },
  '0361': {
    code: '0361',
    description: 'Operating Room Services - Minor Surgery',
    category: 'ancillary',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Minor surgery'
  },
  '0362': {
    code: '0362',
    description: 'Operating Room Services - Organ Transplant - Other Than Kidney',
    category: 'ancillary',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Organ transplant OR'
  },
  '0367': {
    code: '0367',
    description: 'Operating Room Services - Kidney Transplant',
    category: 'ancillary',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Kidney transplant OR'
  },
  '0369': {
    code: '0369',
    description: 'Operating Room Services - Other Operating Room',
    category: 'ancillary',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Other OR services'
  },

  // ============================================================================
  // 0370-0379 ANESTHESIA
  // ============================================================================

  '0370': {
    code: '0370',
    description: 'Anesthesia (General Classification)',
    category: 'ancillary',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Anesthesia general'
  },
  '0371': {
    code: '0371',
    description: 'Anesthesia - Incident to Radiology',
    category: 'ancillary',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Radiology anesthesia'
  },
  '0372': {
    code: '0372',
    description: 'Anesthesia - Incident to Other Diagnostic Services',
    category: 'ancillary',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Diagnostic anesthesia'
  },
  '0374': {
    code: '0374',
    description: 'Anesthesia - Acupuncture',
    category: 'ancillary',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Acupuncture anesthesia'
  },
  '0379': {
    code: '0379',
    description: 'Anesthesia - Other',
    category: 'ancillary',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Other anesthesia'
  },

  // ============================================================================
  // 0380-0389 BLOOD
  // ============================================================================

  '0380': {
    code: '0380',
    description: 'Blood (General Classification)',
    category: 'ancillary',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Blood products general'
  },
  '0381': {
    code: '0381',
    description: 'Blood - Packed Red Cells',
    category: 'ancillary',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'PRBCs'
  },
  '0382': {
    code: '0382',
    description: 'Blood - Whole Blood',
    category: 'ancillary',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Whole blood'
  },
  '0383': {
    code: '0383',
    description: 'Blood - Plasma',
    category: 'ancillary',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Plasma'
  },
  '0384': {
    code: '0384',
    description: 'Blood - Platelets',
    category: 'ancillary',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Platelets'
  },
  '0385': {
    code: '0385',
    description: 'Blood - Leukocytes',
    category: 'ancillary',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'White blood cells'
  },
  '0386': {
    code: '0386',
    description: 'Blood - Other Components',
    category: 'ancillary',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Other blood components'
  },
  '0387': {
    code: '0387',
    description: 'Blood - Other Derivatives (Cryoprecipitates)',
    category: 'ancillary',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Cryoprecipitate'
  },
  '0389': {
    code: '0389',
    description: 'Blood - Other Blood',
    category: 'ancillary',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Other blood products'
  },

  // ============================================================================
  // 0390-0399 BLOOD STORAGE/PROCESSING
  // ============================================================================

  '0390': {
    code: '0390',
    description: 'Blood Storage/Processing (General Classification)',
    category: 'ancillary',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Blood storage general'
  },
  '0391': {
    code: '0391',
    description: 'Blood Storage/Processing - Blood Administration',
    category: 'ancillary',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Blood administration'
  },
  '0399': {
    code: '0399',
    description: 'Blood Storage/Processing - Other',
    category: 'ancillary',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Other blood storage'
  },

  // ============================================================================
  // 0400-0409 OTHER IMAGING SERVICES
  // ============================================================================

  '0400': {
    code: '0400',
    description: 'Other Imaging Services (General Classification)',
    category: 'radiology',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Other imaging general'
  },
  '0401': {
    code: '0401',
    description: 'Other Imaging Services - Diagnostic Mammography',
    category: 'radiology',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Diagnostic mammogram'
  },
  '0402': {
    code: '0402',
    description: 'Other Imaging Services - Ultrasound',
    category: 'radiology',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Ultrasound'
  },
  '0403': {
    code: '0403',
    description: 'Other Imaging Services - Screening Mammography',
    category: 'radiology',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Screening mammogram'
  },
  '0404': {
    code: '0404',
    description: 'Other Imaging Services - Positron Emission Tomography (PET)',
    category: 'radiology',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'PET scan'
  },

  // ============================================================================
  // 0410-0419 RESPIRATORY SERVICES
  // ============================================================================

  '0410': {
    code: '0410',
    description: 'Respiratory Services (General Classification)',
    category: 'therapy',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Respiratory services general'
  },
  '0412': {
    code: '0412',
    description: 'Respiratory Services - Inhalation Services',
    category: 'therapy',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Inhalation therapy'
  },
  '0413': {
    code: '0413',
    description: 'Respiratory Services - Hyperbaric Oxygen Therapy',
    category: 'therapy',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Hyperbaric oxygen'
  },

  // ============================================================================
  // 0420-0429 PHYSICAL THERAPY
  // ============================================================================

  '0420': {
    code: '0420',
    description: 'Physical Therapy (General Classification)',
    category: 'therapy',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Physical therapy general'
  },
  '0421': {
    code: '0421',
    description: 'Physical Therapy - Visit Charge',
    category: 'therapy',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'PT visit'
  },
  '0422': {
    code: '0422',
    description: 'Physical Therapy - Hourly Charge',
    category: 'therapy',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'PT hourly'
  },
  '0423': {
    code: '0423',
    description: 'Physical Therapy - Group Rate',
    category: 'therapy',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'PT group'
  },
  '0424': {
    code: '0424',
    description: 'Physical Therapy - Evaluation or Re-Evaluation',
    category: 'therapy',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'PT evaluation'
  },
  '0429': {
    code: '0429',
    description: 'Physical Therapy - Other',
    category: 'therapy',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Other PT'
  },

  // ============================================================================
  // 0430-0439 OCCUPATIONAL THERAPY
  // ============================================================================

  '0430': {
    code: '0430',
    description: 'Occupational Therapy (General Classification)',
    category: 'therapy',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Occupational therapy general'
  },
  '0431': {
    code: '0431',
    description: 'Occupational Therapy - Visit Charge',
    category: 'therapy',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'OT visit'
  },
  '0432': {
    code: '0432',
    description: 'Occupational Therapy - Hourly Charge',
    category: 'therapy',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'OT hourly'
  },
  '0433': {
    code: '0433',
    description: 'Occupational Therapy - Group Rate',
    category: 'therapy',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'OT group'
  },
  '0434': {
    code: '0434',
    description: 'Occupational Therapy - Evaluation or Re-Evaluation',
    category: 'therapy',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'OT evaluation'
  },

  // ============================================================================
  // 0440-0449 SPEECH-LANGUAGE PATHOLOGY
  // ============================================================================

  '0440': {
    code: '0440',
    description: 'Speech-Language Pathology (General Classification)',
    category: 'therapy',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Speech therapy general'
  },
  '0441': {
    code: '0441',
    description: 'Speech-Language Pathology - Visit Charge',
    category: 'therapy',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Speech therapy visit'
  },
  '0442': {
    code: '0442',
    description: 'Speech-Language Pathology - Hourly Charge',
    category: 'therapy',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Speech therapy hourly'
  },
  '0443': {
    code: '0443',
    description: 'Speech-Language Pathology - Group Rate',
    category: 'therapy',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Speech therapy group'
  },
  '0444': {
    code: '0444',
    description: 'Speech-Language Pathology - Evaluation or Re-Evaluation',
    category: 'therapy',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Speech therapy evaluation'
  },

  // ============================================================================
  // 0450-0459 EMERGENCY ROOM
  // ============================================================================

  '0450': {
    code: '0450',
    description: 'Emergency Room (General Classification)',
    category: 'emergency',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'ER general'
  },
  '0451': {
    code: '0451',
    description: 'Emergency Room - EMTALA Emergency Medical Screening Services',
    category: 'emergency',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'ER screening'
  },
  '0452': {
    code: '0452',
    description: 'Emergency Room - ER Beyond EMTALA Screening',
    category: 'emergency',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'ER beyond screening'
  },
  '0456': {
    code: '0456',
    description: 'Emergency Room - Urgent Care',
    category: 'emergency',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Urgent care'
  },
  '0459': {
    code: '0459',
    description: 'Emergency Room - Other',
    category: 'emergency',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Other ER'
  },

  // ============================================================================
  // 0460-0469 PULMONARY FUNCTION
  // ============================================================================

  '0460': {
    code: '0460',
    description: 'Pulmonary Function (General Classification)',
    category: 'ancillary',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Pulmonary function general'
  },

  // ============================================================================
  // 0470-0479 AUDIOLOGY
  // ============================================================================

  '0470': {
    code: '0470',
    description: 'Audiology (General Classification)',
    category: 'ancillary',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Audiology general'
  },
  '0471': {
    code: '0471',
    description: 'Audiology - Diagnostic',
    category: 'ancillary',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Hearing tests'
  },
  '0472': {
    code: '0472',
    description: 'Audiology - Treatment',
    category: 'ancillary',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Hearing treatment'
  },

  // ============================================================================
  // 0480-0489 CARDIOLOGY
  // ============================================================================

  '0480': {
    code: '0480',
    description: 'Cardiology (General Classification)',
    category: 'ancillary',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Cardiology general'
  },
  '0481': {
    code: '0481',
    description: 'Cardiology - Cardiac Catheterization Lab',
    category: 'ancillary',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Cardiac cath lab'
  },
  '0482': {
    code: '0482',
    description: 'Cardiology - Stress Test',
    category: 'ancillary',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Cardiac stress test'
  },
  '0483': {
    code: '0483',
    description: 'Cardiology - Echocardiology',
    category: 'ancillary',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Echocardiography'
  },
  '0489': {
    code: '0489',
    description: 'Cardiology - Other',
    category: 'ancillary',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Other cardiology'
  },

  // ============================================================================
  // 0490-0499 AMBULATORY SURGICAL CARE
  // ============================================================================

  '0490': {
    code: '0490',
    description: 'Ambulatory Surgical Care (General Classification)',
    category: 'outpatient',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Outpatient surgery general'
  },
  '0499': {
    code: '0499',
    description: 'Ambulatory Surgical Care - Other',
    category: 'outpatient',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Other outpatient surgery'
  },

  // ============================================================================
  // 0500-0509 OUTPATIENT SERVICES
  // ============================================================================

  '0500': {
    code: '0500',
    description: 'Outpatient Services (General Classification)',
    category: 'outpatient',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Outpatient services general'
  },
  '0509': {
    code: '0509',
    description: 'Outpatient Services - Other',
    category: 'outpatient',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Other outpatient'
  },

  // ============================================================================
  // 0510-0519 CLINIC
  // ============================================================================

  '0510': {
    code: '0510',
    description: 'Clinic (General Classification)',
    category: 'clinic',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Clinic general'
  },
  '0513': {
    code: '0513',
    description: 'Clinic - Pediatric',
    category: 'clinic',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Pediatric clinic'
  },
  '0514': {
    code: '0514',
    description: 'Clinic - OB/GYN',
    category: 'clinic',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'OB/GYN clinic'
  },
  '0515': {
    code: '0515',
    description: 'Clinic - Psychiatric',
    category: 'clinic',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Psychiatric clinic'
  },
  '0516': {
    code: '0516',
    description: 'Clinic - Dental',
    category: 'clinic',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Dental clinic'
  },
  '0519': {
    code: '0519',
    description: 'Clinic - Other',
    category: 'clinic',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Other clinic'
  },

  // ============================================================================
  // 0520-0529 FREE-STANDING CLINIC
  // ============================================================================

  '0520': {
    code: '0520',
    description: 'Free-Standing Clinic (General Classification)',
    category: 'clinic',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Freestanding clinic general'
  },
  '0521': {
    code: '0521',
    description: 'Free-Standing Clinic - Rural Health Clinic',
    category: 'clinic',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'RHC visit'
  },
  '0522': {
    code: '0522',
    description: 'Free-Standing Clinic - FQHC',
    category: 'clinic',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'FQHC visit'
  },
  '0523': {
    code: '0523',
    description: 'Free-Standing Clinic - Family Practice',
    category: 'clinic',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Family practice clinic'
  },
  '0524': {
    code: '0524',
    description: 'Free-Standing Clinic - Visiting Nurse Services',
    category: 'clinic',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Visiting nurse'
  },
  '0525': {
    code: '0525',
    description: 'Free-Standing Clinic - Urgent Care',
    category: 'clinic',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Urgent care clinic'
  },

  // ============================================================================
  // 0530-0539 OSTEOPATHIC SERVICES
  // ============================================================================

  '0530': {
    code: '0530',
    description: 'Osteopathic Services (General Classification)',
    category: 'therapy',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Osteopathic services'
  },

  // ============================================================================
  // 0540-0549 AMBULANCE
  // ============================================================================

  '0540': {
    code: '0540',
    description: 'Ambulance (General Classification)',
    category: 'other',
    requiresCPT: false,
    requiresHCPCS: true,
    commonUsage: 'Ambulance general'
  },
  '0541': {
    code: '0541',
    description: 'Ambulance - Supplies',
    category: 'other',
    requiresCPT: false,
    requiresHCPCS: true,
    commonUsage: 'Ambulance supplies'
  },
  '0542': {
    code: '0542',
    description: 'Ambulance - Medical Transport',
    category: 'other',
    requiresCPT: false,
    requiresHCPCS: true,
    commonUsage: 'Medical transport'
  },
  '0543': {
    code: '0543',
    description: 'Ambulance - Heart Mobile',
    category: 'other',
    requiresCPT: false,
    requiresHCPCS: true,
    commonUsage: 'Cardiac transport'
  },
  '0544': {
    code: '0544',
    description: 'Ambulance - Oxygen',
    category: 'other',
    requiresCPT: false,
    requiresHCPCS: true,
    commonUsage: 'Ambulance oxygen'
  },
  '0545': {
    code: '0545',
    description: 'Ambulance - Air',
    category: 'other',
    requiresCPT: false,
    requiresHCPCS: true,
    commonUsage: 'Air ambulance'
  },
  '0546': {
    code: '0546',
    description: 'Ambulance - Neonatal',
    category: 'other',
    requiresCPT: false,
    requiresHCPCS: true,
    commonUsage: 'Neonatal transport'
  },
  '0547': {
    code: '0547',
    description: 'Ambulance - Pharmacy',
    category: 'other',
    requiresCPT: false,
    requiresHCPCS: true,
    commonUsage: 'Ambulance pharmacy'
  },
  '0548': {
    code: '0548',
    description: 'Ambulance - EKG Transmission',
    category: 'other',
    requiresCPT: false,
    requiresHCPCS: true,
    commonUsage: 'Ambulance EKG'
  },

  // ============================================================================
  // 0550-0559 SKILLED NURSING
  // ============================================================================

  '0550': {
    code: '0550',
    description: 'Skilled Nursing (General Classification)',
    category: 'ancillary',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'Skilled nursing general'
  },
  '0551': {
    code: '0551',
    description: 'Skilled Nursing - Visit Charge',
    category: 'ancillary',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'SNF visit'
  },
  '0552': {
    code: '0552',
    description: 'Skilled Nursing - Hourly Charge',
    category: 'ancillary',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'SNF hourly'
  },
  '0559': {
    code: '0559',
    description: 'Skilled Nursing - Other',
    category: 'ancillary',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'Other SNF'
  },

  // ============================================================================
  // 0560-0569 MRI
  // ============================================================================

  '0610': {
    code: '0610',
    description: 'MRI (General Classification)',
    category: 'radiology',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'MRI general'
  },
  '0611': {
    code: '0611',
    description: 'MRI - Brain',
    category: 'radiology',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'MRI brain'
  },
  '0612': {
    code: '0612',
    description: 'MRI - Spinal',
    category: 'radiology',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'MRI spine'
  },
  '0619': {
    code: '0619',
    description: 'MRI - Other',
    category: 'radiology',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Other MRI'
  },

  // ============================================================================
  // 0620-0629 DIALYSIS
  // ============================================================================

  '0820': {
    code: '0820',
    description: 'Hemodialysis - Outpatient or Home',
    category: 'therapy',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Outpatient hemodialysis'
  },
  '0821': {
    code: '0821',
    description: 'Hemodialysis - Composite/First Rate',
    category: 'therapy',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Hemodialysis composite'
  },
  '0825': {
    code: '0825',
    description: 'Hemodialysis - Training',
    category: 'therapy',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Dialysis training'
  },
  '0831': {
    code: '0831',
    description: 'Peritoneal Dialysis - Inpatient',
    category: 'therapy',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Inpatient peritoneal dialysis'
  },
  '0841': {
    code: '0841',
    description: 'CAPD - Continuous Ambulatory Peritoneal Dialysis',
    category: 'therapy',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'CAPD'
  },
  '0851': {
    code: '0851',
    description: 'CCPD - Continuous Cycling Peritoneal Dialysis',
    category: 'therapy',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'CCPD'
  },

  // ============================================================================
  // 0900-0909 BEHAVIORAL HEALTH
  // ============================================================================

  '0900': {
    code: '0900',
    description: 'Behavioral Health Treatment/Services (General)',
    category: 'therapy',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Behavioral health general'
  },
  '0901': {
    code: '0901',
    description: 'Behavioral Health - Electroshock Treatment',
    category: 'therapy',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'ECT'
  },
  '0902': {
    code: '0902',
    description: 'Behavioral Health - Milieu Therapy',
    category: 'therapy',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Milieu therapy'
  },
  '0903': {
    code: '0903',
    description: 'Behavioral Health - Play Therapy',
    category: 'therapy',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Play therapy'
  },
  '0904': {
    code: '0904',
    description: 'Behavioral Health - Activity Therapy',
    category: 'therapy',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Activity therapy'
  },
  '0905': {
    code: '0905',
    description: 'Behavioral Health - Intensive Outpatient - Psychiatric',
    category: 'therapy',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Psychiatric IOP'
  },
  '0906': {
    code: '0906',
    description: 'Behavioral Health - Intensive Outpatient - Chemical Dependency',
    category: 'therapy',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Substance IOP'
  },
  '0907': {
    code: '0907',
    description: 'Behavioral Health - Community Behavioral Health Center',
    category: 'therapy',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'CBHC services'
  },

  // ============================================================================
  // 0960-0969 PROFESSIONAL FEES
  // ============================================================================

  '0960': {
    code: '0960',
    description: 'Professional Fees (General Classification)',
    category: 'professional',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Professional fees general'
  },
  '0961': {
    code: '0961',
    description: 'Professional Fees - Psychiatric',
    category: 'professional',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Psychiatry fees'
  },
  '0962': {
    code: '0962',
    description: 'Professional Fees - Ophthalmology',
    category: 'professional',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Ophthalmology fees'
  },
  '0963': {
    code: '0963',
    description: 'Professional Fees - Anesthesiologist (MD)',
    category: 'professional',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'Anesthesia MD fees'
  },
  '0964': {
    code: '0964',
    description: 'Professional Fees - Anesthetist (CRNA)',
    category: 'professional',
    requiresCPT: true,
    requiresHCPCS: false,
    commonUsage: 'CRNA fees'
  },

  // ============================================================================
  // 0980-0989 OBSERVATION
  // ============================================================================

  '0762': {
    code: '0762',
    description: 'Observation Room - Hourly',
    category: 'outpatient',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'Observation hourly'
  },

  // ============================================================================
  // 0990-0999 OTHER
  // ============================================================================

  '0999': {
    code: '0999',
    description: 'Other Revenue',
    category: 'other',
    requiresCPT: false,
    requiresHCPCS: false,
    commonUsage: 'Other revenue'
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get a revenue code by code string
 */
export function getRevenueCode(code: string): RevenueCode | undefined {
  // Normalize to 4 digits with leading zeros
  const normalizedCode = code.padStart(4, '0');
  return REVENUE_CODES[normalizedCode];
}

/**
 * Search revenue codes by description or code
 */
export function searchRevenueCodes(query: string, limit: number = 50): RevenueCode[] {
  const normalizedQuery = query.toLowerCase().trim();

  return Object.values(REVENUE_CODES)
    .filter(rc =>
      rc.code.includes(normalizedQuery) ||
      rc.description.toLowerCase().includes(normalizedQuery) ||
      rc.commonUsage.toLowerCase().includes(normalizedQuery)
    )
    .slice(0, limit);
}

/**
 * Get revenue codes by category
 */
export function getRevenueCodesByCategory(category: RevenueCategory): RevenueCode[] {
  return Object.values(REVENUE_CODES).filter(rc => rc.category === category);
}

/**
 * Get all revenue codes
 */
export function getAllRevenueCodes(): RevenueCode[] {
  return Object.values(REVENUE_CODES);
}

/**
 * Get revenue codes that require CPT
 */
export function getRevenueCodesRequiringCPT(): RevenueCode[] {
  return Object.values(REVENUE_CODES).filter(rc => rc.requiresCPT);
}

/**
 * Get revenue codes that require HCPCS
 */
export function getRevenueCodesRequiringHCPCS(): RevenueCode[] {
  return Object.values(REVENUE_CODES).filter(rc => rc.requiresHCPCS);
}

/**
 * Validate revenue code format
 */
export function isValidRevenueCodeFormat(code: string): boolean {
  // Revenue codes are 4 digits (0100-0999)
  const normalizedCode = code.padStart(4, '0');
  return /^0[1-9][0-9]{2}$/.test(normalizedCode);
}

/**
 * Get revenue code category display name
 */
export function getRevenueCategoryName(category: RevenueCategory): string {
  const categoryNames: Record<RevenueCategory, string> = {
    accommodation: 'Room and Board',
    ancillary: 'Ancillary Services',
    outpatient: 'Outpatient Services',
    clinic: 'Clinic Services',
    emergency: 'Emergency Services',
    supplies: 'Supplies and Equipment',
    pharmacy: 'Pharmacy',
    laboratory: 'Laboratory',
    radiology: 'Radiology and Imaging',
    therapy: 'Therapy Services',
    professional: 'Professional Fees',
    other: 'Other Services'
  };
  return categoryNames[category];
}
