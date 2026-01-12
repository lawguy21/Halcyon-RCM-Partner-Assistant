/**
 * State Program Configuration
 * Maps all 51 US jurisdictions (50 states + DC) to their uncompensated care programs
 */

import { StateProgramArchetype } from '../models/recovery-result.js';

// ============================================================================
// STATE PROGRAM MAPPING INTERFACE
// ============================================================================

export interface StateProgramMapping {
  archetype: StateProgramArchetype;
  programName: string;
  incomeLimit: string; // FPL percentage
  requiresResidency: boolean;
  appliesToEncounterTypes: string[];
  notes: string;
}

// ============================================================================
// STATE PROGRAM MAP - All 51 Jurisdictions
// ============================================================================

export const STATE_PROGRAM_MAP: Record<string, StateProgramMapping> = {
  // ============================================================================
  // ALABAMA
  // ============================================================================
  'AL': {
    archetype: 'charity_care_reimb',
    programName: 'Alabama Hospital Charity Care Program',
    incomeLimit: '200% FPL',
    requiresResidency: true,
    appliesToEncounterTypes: ['inpatient', 'outpatient', 'ed'],
    notes: 'Non-expansion state; hospital-based charity care programs; limited state funding'
  },

  // ============================================================================
  // ALASKA
  // ============================================================================
  'AK': {
    archetype: '1115_uc_pool',
    programName: 'Alaska 1115 Behavioral Health Waiver',
    incomeLimit: '138% FPL',
    requiresResidency: true,
    appliesToEncounterTypes: ['inpatient', 'outpatient', 'ed'],
    notes: 'Medicaid expansion state; 1115 waiver focuses on behavioral health; standard charity care available'
  },

  // ============================================================================
  // ARIZONA
  // ============================================================================
  'AZ': {
    archetype: '1115_uc_pool',
    programName: 'Arizona Health Care Cost Containment System (AHCCCS)',
    incomeLimit: '138% FPL',
    requiresResidency: true,
    appliesToEncounterTypes: ['inpatient', 'outpatient', 'ed'],
    notes: 'Expansion state; AHCCCS is 1115 demonstration; covers broad population'
  },

  // ============================================================================
  // ARKANSAS
  // ============================================================================
  'AR': {
    archetype: '1115_uc_pool',
    programName: 'Arkansas Works (1115 Waiver)',
    incomeLimit: '138% FPL',
    requiresResidency: true,
    appliesToEncounterTypes: ['inpatient', 'outpatient', 'ed'],
    notes: 'Expansion via 1115 waiver; premium assistance model for marketplace coverage'
  },

  // ============================================================================
  // CALIFORNIA
  // ============================================================================
  'CA': {
    archetype: '1115_uc_pool',
    programName: 'California Global Payment Program (GPP) / Medi-Cal',
    incomeLimit: '138% FPL',
    requiresResidency: true,
    appliesToEncounterTypes: ['inpatient', 'outpatient', 'ed'],
    notes: 'Expansion state; GPP for public hospitals; strong Medi-Cal coverage; CalAIM 1115 waiver'
  },

  // ============================================================================
  // COLORADO
  // ============================================================================
  'CO': {
    archetype: 'charity_care_reimb',
    programName: 'Colorado Indigent Care Program (CICP)',
    incomeLimit: '250% FPL',
    requiresResidency: true,
    appliesToEncounterTypes: ['inpatient', 'outpatient', 'ed'],
    notes: 'Expansion state; CICP provides discounted care for uninsured; sliding scale fees'
  },

  // ============================================================================
  // CONNECTICUT
  // ============================================================================
  'CT': {
    archetype: 'charity_care_reimb',
    programName: 'Connecticut Hospital Financial Assistance',
    incomeLimit: '250% FPL',
    requiresResidency: true,
    appliesToEncounterTypes: ['inpatient', 'outpatient', 'ed'],
    notes: 'Expansion state; mandated hospital charity care policies; HUSKY Health covers low-income'
  },

  // ============================================================================
  // DELAWARE
  // ============================================================================
  'DE': {
    archetype: 'charity_care_reimb',
    programName: 'Delaware Hospital Charity Care Program',
    incomeLimit: '200% FPL',
    requiresResidency: true,
    appliesToEncounterTypes: ['inpatient', 'outpatient', 'ed'],
    notes: 'Expansion state; Diamond State Health Plan; hospital-based charity care'
  },

  // ============================================================================
  // DISTRICT OF COLUMBIA
  // ============================================================================
  'DC': {
    archetype: 'health_safety_net',
    programName: 'DC Healthcare Alliance',
    incomeLimit: '200% FPL',
    requiresResidency: true,
    appliesToEncounterTypes: ['inpatient', 'outpatient', 'ed'],
    notes: 'Expansion jurisdiction; Alliance covers residents ineligible for Medicaid including undocumented'
  },

  // ============================================================================
  // FLORIDA
  // ============================================================================
  'FL': {
    archetype: '1115_lip_pool',
    programName: 'Florida Low Income Pool (LIP)',
    incomeLimit: '200% FPL',
    requiresResidency: true,
    appliesToEncounterTypes: ['inpatient', 'outpatient', 'ed'],
    notes: 'Non-expansion state; 1115 waiver LIP provides UC funding to hospitals'
  },

  // ============================================================================
  // GEORGIA
  // ============================================================================
  'GA': {
    archetype: 'indigent_care_pool',
    programName: 'Georgia Indigent Care Trust Fund',
    incomeLimit: '200% FPL',
    requiresResidency: true,
    appliesToEncounterTypes: ['inpatient', 'outpatient', 'ed'],
    notes: 'Non-expansion state; limited 1115 waiver; Indigent Care Trust Fund supports hospitals'
  },

  // ============================================================================
  // HAWAII
  // ============================================================================
  'HI': {
    archetype: 'health_safety_net',
    programName: 'Hawaii QUEST Integration',
    incomeLimit: '138% FPL',
    requiresResidency: true,
    appliesToEncounterTypes: ['inpatient', 'outpatient', 'ed'],
    notes: 'Expansion state; QUEST 1115 waiver provides comprehensive managed care; near-universal coverage'
  },

  // ============================================================================
  // IDAHO
  // ============================================================================
  'ID': {
    archetype: 'charity_care_reimb',
    programName: 'Idaho Hospital Charity Care / Catastrophic Health Care Program',
    incomeLimit: '138% FPL',
    requiresResidency: true,
    appliesToEncounterTypes: ['inpatient', 'outpatient', 'ed'],
    notes: 'Expansion state (2020); County CAT program for catastrophic costs; hospital charity care'
  },

  // ============================================================================
  // ILLINOIS
  // ============================================================================
  'IL': {
    archetype: 'charity_care_reimb',
    programName: 'Illinois Hospital Uninsured Patient Discount Act',
    incomeLimit: '200% FPL',
    requiresResidency: true,
    appliesToEncounterTypes: ['inpatient', 'outpatient', 'ed'],
    notes: 'Expansion state; mandated discounts for uninsured; strong charity care requirements'
  },

  // ============================================================================
  // INDIANA
  // ============================================================================
  'IN': {
    archetype: '1115_uc_pool',
    programName: 'Healthy Indiana Plan (HIP 2.0)',
    incomeLimit: '138% FPL',
    requiresResidency: true,
    appliesToEncounterTypes: ['inpatient', 'outpatient', 'ed'],
    notes: 'Expansion via 1115 waiver; POWER account model; HIP covers expansion population'
  },

  // ============================================================================
  // IOWA
  // ============================================================================
  'IA': {
    archetype: '1115_uc_pool',
    programName: 'Iowa Wellness Plan (1115 Waiver)',
    incomeLimit: '138% FPL',
    requiresResidency: true,
    appliesToEncounterTypes: ['inpatient', 'outpatient', 'ed'],
    notes: 'Expansion state; 1115 waiver provides managed care coverage'
  },

  // ============================================================================
  // KANSAS
  // ============================================================================
  'KS': {
    archetype: 'charity_care_reimb',
    programName: 'Kansas Hospital Charity Care Program',
    incomeLimit: '200% FPL',
    requiresResidency: true,
    appliesToEncounterTypes: ['inpatient', 'outpatient', 'ed'],
    notes: 'Non-expansion state; hospital-based charity care; MediKan for limited populations'
  },

  // ============================================================================
  // KENTUCKY
  // ============================================================================
  'KY': {
    archetype: '1115_uc_pool',
    programName: 'Kentucky HEALTH (1115 Waiver)',
    incomeLimit: '138% FPL',
    requiresResidency: true,
    appliesToEncounterTypes: ['inpatient', 'outpatient', 'ed'],
    notes: 'Expansion state; 1115 waiver; strong Medicaid coverage through kynect'
  },

  // ============================================================================
  // LOUISIANA
  // ============================================================================
  'LA': {
    archetype: '1115_uc_pool',
    programName: 'Louisiana 1115 Waiver / Healthy Louisiana',
    incomeLimit: '138% FPL',
    requiresResidency: true,
    appliesToEncounterTypes: ['inpatient', 'outpatient', 'ed'],
    notes: 'Expansion state (2016); 1115 waiver for managed care; public hospital system'
  },

  // ============================================================================
  // MAINE
  // ============================================================================
  'ME': {
    archetype: 'charity_care_reimb',
    programName: 'Maine Hospital Charity Care Program',
    incomeLimit: '138% FPL',
    requiresResidency: true,
    appliesToEncounterTypes: ['inpatient', 'outpatient', 'ed'],
    notes: 'Expansion state (2019); MaineCare covers expansion; hospital charity care available'
  },

  // ============================================================================
  // MARYLAND
  // ============================================================================
  'MD': {
    archetype: 'all_payer_uc_pooling',
    programName: 'Maryland All-Payer Rate Setting UCC Pool',
    incomeLimit: '200% FPL',
    requiresResidency: true,
    appliesToEncounterTypes: ['inpatient', 'outpatient', 'ed'],
    notes: 'UCC built into all-payer rates with pooling equalization'
  },

  // ============================================================================
  // MASSACHUSETTS
  // ============================================================================
  'MA': {
    archetype: 'health_safety_net',
    programName: 'Massachusetts Health Safety Net (HSN)',
    incomeLimit: '300% FPL',
    requiresResidency: true,
    appliesToEncounterTypes: ['inpatient', 'outpatient', 'ed'],
    notes: 'Expansion state; HSN pays hospitals/CHCs for essential services; strong MassHealth coverage'
  },

  // ============================================================================
  // MICHIGAN
  // ============================================================================
  'MI': {
    archetype: '1115_uc_pool',
    programName: 'Healthy Michigan Plan (1115 Waiver)',
    incomeLimit: '138% FPL',
    requiresResidency: true,
    appliesToEncounterTypes: ['inpatient', 'outpatient', 'ed'],
    notes: 'Expansion state; 1115 waiver provides managed care with healthy behaviors incentives'
  },

  // ============================================================================
  // MINNESOTA
  // ============================================================================
  'MN': {
    archetype: 'health_safety_net',
    programName: 'Minnesota Care / MinnesotaCare',
    incomeLimit: '200% FPL',
    requiresResidency: true,
    appliesToEncounterTypes: ['inpatient', 'outpatient', 'ed'],
    notes: 'Expansion state; MinnesotaCare covers 200% FPL; strong public option; 1115 BHP waiver'
  },

  // ============================================================================
  // MISSISSIPPI
  // ============================================================================
  'MS': {
    archetype: 'charity_care_reimb',
    programName: 'Mississippi Hospital Charity Care Program',
    incomeLimit: '200% FPL',
    requiresResidency: true,
    appliesToEncounterTypes: ['inpatient', 'outpatient', 'ed'],
    notes: 'Non-expansion state; limited coverage; hospital-based charity care'
  },

  // ============================================================================
  // MISSOURI
  // ============================================================================
  'MO': {
    archetype: 'charity_care_reimb',
    programName: 'Missouri Hospital Charity Care Program',
    incomeLimit: '138% FPL',
    requiresResidency: true,
    appliesToEncounterTypes: ['inpatient', 'outpatient', 'ed'],
    notes: 'Expansion state (2021); MO HealthNet; hospital charity care for remaining uninsured'
  },

  // ============================================================================
  // MONTANA
  // ============================================================================
  'MT': {
    archetype: '1115_uc_pool',
    programName: 'Montana HELP Act (1115 Waiver)',
    incomeLimit: '138% FPL',
    requiresResidency: true,
    appliesToEncounterTypes: ['inpatient', 'outpatient', 'ed'],
    notes: 'Expansion state; HELP Act 1115 waiver; premium requirements for some enrollees'
  },

  // ============================================================================
  // NEBRASKA
  // ============================================================================
  'NE': {
    archetype: 'charity_care_reimb',
    programName: 'Nebraska Heritage Health (Expansion)',
    incomeLimit: '138% FPL',
    requiresResidency: true,
    appliesToEncounterTypes: ['inpatient', 'outpatient', 'ed'],
    notes: 'Expansion state (2020); Heritage Health managed care; hospital charity care'
  },

  // ============================================================================
  // NEVADA
  // ============================================================================
  'NV': {
    archetype: 'charity_care_reimb',
    programName: 'Nevada Hospital Charity Care Program',
    incomeLimit: '138% FPL',
    requiresResidency: true,
    appliesToEncounterTypes: ['inpatient', 'outpatient', 'ed'],
    notes: 'Expansion state; Nevada Medicaid managed care; hospital charity care requirements'
  },

  // ============================================================================
  // NEW HAMPSHIRE
  // ============================================================================
  'NH': {
    archetype: '1115_uc_pool',
    programName: 'New Hampshire Granite Advantage (1115 Waiver)',
    incomeLimit: '138% FPL',
    requiresResidency: true,
    appliesToEncounterTypes: ['inpatient', 'outpatient', 'ed'],
    notes: 'Expansion state; Granite Advantage 1115 waiver; managed care model'
  },

  // ============================================================================
  // NEW JERSEY
  // ============================================================================
  'NJ': {
    archetype: 'charity_care_reimb',
    programName: 'NJ Hospital Care Payment Assistance (Charity Care)',
    incomeLimit: '300% FPL',
    requiresResidency: true,
    appliesToEncounterTypes: ['inpatient', 'outpatient', 'ed'],
    notes: 'Expansion state; strong charity care law up to 300% FPL; NJ FamilyCare'
  },

  // ============================================================================
  // NEW MEXICO
  // ============================================================================
  'NM': {
    archetype: '1115_uc_pool',
    programName: 'New Mexico Centennial Care 2.0 (1115 Waiver)',
    incomeLimit: '138% FPL',
    requiresResidency: true,
    appliesToEncounterTypes: ['inpatient', 'outpatient', 'ed'],
    notes: 'Expansion state; Centennial Care 1115 waiver; managed care statewide'
  },

  // ============================================================================
  // NEW YORK
  // ============================================================================
  'NY': {
    archetype: 'indigent_care_pool',
    programName: 'NY Hospital Indigent Care Pool / Essential Plan',
    incomeLimit: '250% FPL',
    requiresResidency: true,
    appliesToEncounterTypes: ['inpatient', 'outpatient', 'ed'],
    notes: 'Expansion state; Essential Plan covers up to 200% FPL; Indigent Care Pool for hospitals'
  },

  // ============================================================================
  // NORTH CAROLINA
  // ============================================================================
  'NC': {
    archetype: '1115_uc_pool',
    programName: 'North Carolina Medicaid Expansion (2023)',
    incomeLimit: '138% FPL',
    requiresResidency: true,
    appliesToEncounterTypes: ['inpatient', 'outpatient', 'ed'],
    notes: 'Expansion state (2023); NC Medicaid Managed Care; hospital charity care'
  },

  // ============================================================================
  // NORTH DAKOTA
  // ============================================================================
  'ND': {
    archetype: 'charity_care_reimb',
    programName: 'North Dakota Medicaid Expansion',
    incomeLimit: '138% FPL',
    requiresResidency: true,
    appliesToEncounterTypes: ['inpatient', 'outpatient', 'ed'],
    notes: 'Expansion state; strong Medicaid coverage; hospital charity care'
  },

  // ============================================================================
  // OHIO
  // ============================================================================
  'OH': {
    archetype: 'charity_care_reimb',
    programName: 'Ohio Hospital Care Assurance Program (HCAP)',
    incomeLimit: '200% FPL',
    requiresResidency: true,
    appliesToEncounterTypes: ['inpatient', 'outpatient', 'ed'],
    notes: 'Expansion state; HCAP provider assessments fund uninsured care; strong charity care'
  },

  // ============================================================================
  // OKLAHOMA
  // ============================================================================
  'OK': {
    archetype: '1115_uc_pool',
    programName: 'Oklahoma SoonerCare (1115 Waiver)',
    incomeLimit: '138% FPL',
    requiresResidency: true,
    appliesToEncounterTypes: ['inpatient', 'outpatient', 'ed'],
    notes: 'Expansion state (2021); SoonerCare 1115 waiver; managed care transition'
  },

  // ============================================================================
  // OREGON
  // ============================================================================
  'OR': {
    archetype: '1115_uc_pool',
    programName: 'Oregon Health Plan (OHP) 1115 Waiver',
    incomeLimit: '138% FPL',
    requiresResidency: true,
    appliesToEncounterTypes: ['inpatient', 'outpatient', 'ed'],
    notes: 'Expansion state; OHP 1115 waiver with CCOs; covers 138% FPL'
  },

  // ============================================================================
  // PENNSYLVANIA
  // ============================================================================
  'PA': {
    archetype: 'charity_care_reimb',
    programName: 'Pennsylvania Charity Care / Fair Care',
    incomeLimit: '250% FPL',
    requiresResidency: true,
    appliesToEncounterTypes: ['inpatient', 'outpatient', 'ed'],
    notes: 'Expansion state; HealthChoices managed care; hospital charity care requirements'
  },

  // ============================================================================
  // RHODE ISLAND
  // ============================================================================
  'RI': {
    archetype: '1115_uc_pool',
    programName: 'Rhode Island 1115 Global Consumer Choice Compact',
    incomeLimit: '138% FPL',
    requiresResidency: true,
    appliesToEncounterTypes: ['inpatient', 'outpatient', 'ed'],
    notes: 'Expansion state; 1115 waiver with global cap; RIte Care managed care'
  },

  // ============================================================================
  // SOUTH CAROLINA
  // ============================================================================
  'SC': {
    archetype: 'charity_care_reimb',
    programName: 'South Carolina Hospital Charity Care Program',
    incomeLimit: '200% FPL',
    requiresResidency: true,
    appliesToEncounterTypes: ['inpatient', 'outpatient', 'ed'],
    notes: 'Non-expansion state; Healthy Connections Medicaid; hospital charity care'
  },

  // ============================================================================
  // SOUTH DAKOTA
  // ============================================================================
  'SD': {
    archetype: 'charity_care_reimb',
    programName: 'South Dakota Medicaid Expansion (2023)',
    incomeLimit: '138% FPL',
    requiresResidency: true,
    appliesToEncounterTypes: ['inpatient', 'outpatient', 'ed'],
    notes: 'Expansion state (2023); new Medicaid expansion; hospital charity care'
  },

  // ============================================================================
  // TENNESSEE
  // ============================================================================
  'TN': {
    archetype: '1115_uc_pool',
    programName: 'TennCare (1115 Waiver)',
    incomeLimit: '200% FPL',
    requiresResidency: true,
    appliesToEncounterTypes: ['inpatient', 'outpatient', 'ed'],
    notes: 'Non-expansion state; TennCare 1115 waiver is entire Medicaid program; limited eligibility'
  },

  // ============================================================================
  // TEXAS
  // ============================================================================
  'TX': {
    archetype: '1115_uc_pool',
    programName: 'Texas 1115 Uncompensated Care Pool',
    incomeLimit: '200% FPL',
    requiresResidency: true,
    appliesToEncounterTypes: ['inpatient', 'outpatient', 'ed'],
    notes: 'Non-expansion state; 1115 waiver UC pool provides significant hospital funding'
  },

  // ============================================================================
  // UTAH
  // ============================================================================
  'UT': {
    archetype: '1115_uc_pool',
    programName: 'Utah Medicaid Expansion (1115 Waiver)',
    incomeLimit: '138% FPL',
    requiresResidency: true,
    appliesToEncounterTypes: ['inpatient', 'outpatient', 'ed'],
    notes: 'Expansion state (2020); 1115 waiver with bridge coverage; PCN program'
  },

  // ============================================================================
  // VERMONT
  // ============================================================================
  'VT': {
    archetype: 'health_safety_net',
    programName: 'Vermont Global Commitment to Health (1115 Waiver)',
    incomeLimit: '138% FPL',
    requiresResidency: true,
    appliesToEncounterTypes: ['inpatient', 'outpatient', 'ed'],
    notes: 'Expansion state; 1115 global commitment waiver; near-universal coverage'
  },

  // ============================================================================
  // VIRGINIA
  // ============================================================================
  'VA': {
    archetype: 'charity_care_reimb',
    programName: 'Virginia Medicaid Expansion',
    incomeLimit: '138% FPL',
    requiresResidency: true,
    appliesToEncounterTypes: ['inpatient', 'outpatient', 'ed'],
    notes: 'Expansion state (2019); managed care statewide; hospital charity care'
  },

  // ============================================================================
  // WASHINGTON
  // ============================================================================
  'WA': {
    archetype: '1115_uc_pool',
    programName: 'Washington Apple Health (1115 Waiver)',
    incomeLimit: '138% FPL',
    requiresResidency: true,
    appliesToEncounterTypes: ['inpatient', 'outpatient', 'ed'],
    notes: 'Expansion state; Apple Health 1115 waiver; managed care; strong coverage'
  },

  // ============================================================================
  // WEST VIRGINIA
  // ============================================================================
  'WV': {
    archetype: 'charity_care_reimb',
    programName: 'West Virginia Medicaid Expansion',
    incomeLimit: '138% FPL',
    requiresResidency: true,
    appliesToEncounterTypes: ['inpatient', 'outpatient', 'ed'],
    notes: 'Expansion state; Mountain Health Trust managed care; hospital charity care'
  },

  // ============================================================================
  // WISCONSIN
  // ============================================================================
  'WI': {
    archetype: 'charity_care_reimb',
    programName: 'Wisconsin BadgerCare Plus',
    incomeLimit: '200% FPL',
    requiresResidency: true,
    appliesToEncounterTypes: ['inpatient', 'outpatient', 'ed'],
    notes: 'Partial expansion to 100% FPL; BadgerCare Plus covers adults; hospital charity care'
  },

  // ============================================================================
  // WYOMING
  // ============================================================================
  'WY': {
    archetype: 'charity_care_reimb',
    programName: 'Wyoming Hospital Charity Care Program',
    incomeLimit: '200% FPL',
    requiresResidency: true,
    appliesToEncounterTypes: ['inpatient', 'outpatient', 'ed'],
    notes: 'Non-expansion state; limited Medicaid eligibility; hospital-based charity care'
  }
};

/**
 * Get state program mapping for a given state code
 */
export function getStateProgramMapping(stateCode: string): StateProgramMapping | undefined {
  return STATE_PROGRAM_MAP[stateCode.toUpperCase()];
}

/**
 * Check if a state has a specific archetype
 */
export function hasArchetype(stateCode: string, archetype: StateProgramArchetype): boolean {
  const mapping = getStateProgramMapping(stateCode);
  return mapping?.archetype === archetype;
}

/**
 * Get all states with a specific archetype
 */
export function getStatesByArchetype(archetype: StateProgramArchetype): string[] {
  return Object.entries(STATE_PROGRAM_MAP)
    .filter(([, mapping]) => mapping.archetype === archetype)
    .map(([code]) => code);
}
