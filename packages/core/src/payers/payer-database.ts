/**
 * Payer Master Database
 *
 * Comprehensive database of top 50 major payers in the US healthcare system
 * including Medicare, Medicaid variants, and major commercial insurers.
 *
 * Features:
 * - Payer identification and classification
 * - Clearinghouse and electronic payer IDs
 * - Payer-specific requirements (auth rules, timely filing, appeal deadlines)
 * - Helper functions for payer lookup and search
 */

// ============================================================================
// TYPES
// ============================================================================

export type PayerType = 'government' | 'commercial' | 'workers_comp' | 'auto' | 'other';

export type PayerSubType =
  | 'medicare_ffs'
  | 'medicare_advantage'
  | 'medicaid_ffs'
  | 'medicaid_managed_care'
  | 'bcbs'
  | 'national_commercial'
  | 'regional_commercial'
  | 'tpa'
  | 'workers_comp'
  | 'auto_insurance'
  | 'tricare'
  | 'champva'
  | 'other';

export interface PayerRequirements {
  /** Days from date of service for timely claim filing */
  timelyFilingDays: number;
  /** Days from denial date to file appeal */
  appealDeadline: number;
  /** Whether prior authorization is generally required */
  requiresPriorAuth: boolean;
  /** Days authorization is valid (if applicable) */
  authValidDays?: number;
  /** Whether the payer accepts electronic claims */
  acceptsElectronicClaims: boolean;
  /** Specific billing notes */
  billingNotes?: string[];
}

export interface Payer {
  /** Internal payer ID */
  id: string;
  /** Display name */
  name: string;
  /** Short/common name */
  shortName?: string;
  /** Payer type classification */
  type: PayerType;
  /** More specific payer subtype */
  subType: PayerSubType;
  /** Primary clearinghouse ID (e.g., Availity, Change Healthcare) */
  clearinghouseId?: string;
  /** Electronic payer ID used for EDI transactions */
  electronicPayerId: string;
  /** Payer-specific requirements */
  requirements: PayerRequirements;
  /** State(s) where this payer operates (empty array = nationwide) */
  states: string[];
  /** Parent organization if applicable */
  parentOrganization?: string;
  /** Website for provider portal */
  providerPortal?: string;
  /** Phone number for provider services */
  providerPhone?: string;
  /** Whether payer is currently active */
  isActive: boolean;
}

// ============================================================================
// PAYER DATABASE - TOP 50 MAJOR PAYERS
// ============================================================================

export const PAYER_DATABASE: Record<string, Payer> = {
  // -------------------------------------------------------------------------
  // MEDICARE
  // -------------------------------------------------------------------------
  'MEDICARE_FFS': {
    id: 'MEDICARE_FFS',
    name: 'Medicare Fee-For-Service',
    shortName: 'Medicare FFS',
    type: 'government',
    subType: 'medicare_ffs',
    electronicPayerId: 'CMS',
    requirements: {
      timelyFilingDays: 365,
      appealDeadline: 120,
      requiresPriorAuth: false,
      acceptsElectronicClaims: true,
      billingNotes: [
        'ABN required for non-covered services',
        'Medical necessity documentation required',
        'LCD/NCD policies apply'
      ]
    },
    states: [],
    providerPortal: 'https://www.cms.gov/medicare',
    providerPhone: '1-800-MEDICARE',
    isActive: true
  },

  'MEDICARE_PART_B': {
    id: 'MEDICARE_PART_B',
    name: 'Medicare Part B',
    shortName: 'Medicare B',
    type: 'government',
    subType: 'medicare_ffs',
    electronicPayerId: '00882',
    requirements: {
      timelyFilingDays: 365,
      appealDeadline: 120,
      requiresPriorAuth: false,
      acceptsElectronicClaims: true
    },
    states: [],
    isActive: true
  },

  'MEDICARE_RAILROAD': {
    id: 'MEDICARE_RAILROAD',
    name: 'Medicare Railroad Retirement Board',
    shortName: 'Railroad Medicare',
    type: 'government',
    subType: 'medicare_ffs',
    electronicPayerId: '00882',
    requirements: {
      timelyFilingDays: 365,
      appealDeadline: 120,
      requiresPriorAuth: false,
      acceptsElectronicClaims: true
    },
    states: [],
    isActive: true
  },

  // -------------------------------------------------------------------------
  // MEDICARE ADVANTAGE (Top Plans)
  // -------------------------------------------------------------------------
  'HUMANA_MA': {
    id: 'HUMANA_MA',
    name: 'Humana Medicare Advantage',
    shortName: 'Humana MA',
    type: 'commercial',
    subType: 'medicare_advantage',
    electronicPayerId: '61101',
    clearinghouseId: 'AVAILITY',
    requirements: {
      timelyFilingDays: 365,
      appealDeadline: 60,
      requiresPriorAuth: true,
      authValidDays: 90,
      acceptsElectronicClaims: true
    },
    states: [],
    parentOrganization: 'Humana Inc.',
    providerPortal: 'https://www.humana.com/provider',
    isActive: true
  },

  'UHC_MA': {
    id: 'UHC_MA',
    name: 'UnitedHealthcare Medicare Advantage',
    shortName: 'UHC MA',
    type: 'commercial',
    subType: 'medicare_advantage',
    electronicPayerId: '87726',
    clearinghouseId: 'OPTUM',
    requirements: {
      timelyFilingDays: 365,
      appealDeadline: 60,
      requiresPriorAuth: true,
      authValidDays: 90,
      acceptsElectronicClaims: true
    },
    states: [],
    parentOrganization: 'UnitedHealth Group',
    providerPortal: 'https://www.uhcprovider.com',
    isActive: true
  },

  'AETNA_MA': {
    id: 'AETNA_MA',
    name: 'Aetna Medicare Advantage',
    shortName: 'Aetna MA',
    type: 'commercial',
    subType: 'medicare_advantage',
    electronicPayerId: '60054',
    clearinghouseId: 'AVAILITY',
    requirements: {
      timelyFilingDays: 365,
      appealDeadline: 60,
      requiresPriorAuth: true,
      authValidDays: 60,
      acceptsElectronicClaims: true
    },
    states: [],
    parentOrganization: 'CVS Health',
    providerPortal: 'https://www.aetna.com/health-care-professionals.html',
    isActive: true
  },

  // -------------------------------------------------------------------------
  // MEDICAID (State Programs)
  // -------------------------------------------------------------------------
  'MEDICAID_CA': {
    id: 'MEDICAID_CA',
    name: 'Medi-Cal (California Medicaid)',
    shortName: 'Medi-Cal',
    type: 'government',
    subType: 'medicaid_ffs',
    electronicPayerId: 'MCDCA',
    requirements: {
      timelyFilingDays: 180,
      appealDeadline: 90,
      requiresPriorAuth: true,
      authValidDays: 60,
      acceptsElectronicClaims: true,
      billingNotes: ['TAR required for certain services']
    },
    states: ['CA'],
    providerPortal: 'https://www.medi-cal.ca.gov',
    isActive: true
  },

  'MEDICAID_NY': {
    id: 'MEDICAID_NY',
    name: 'New York Medicaid',
    shortName: 'NY Medicaid',
    type: 'government',
    subType: 'medicaid_ffs',
    electronicPayerId: 'MCDNY',
    requirements: {
      timelyFilingDays: 90,
      appealDeadline: 60,
      requiresPriorAuth: true,
      acceptsElectronicClaims: true
    },
    states: ['NY'],
    providerPortal: 'https://www.emedny.org',
    isActive: true
  },

  'MEDICAID_TX': {
    id: 'MEDICAID_TX',
    name: 'Texas Medicaid',
    shortName: 'TX Medicaid',
    type: 'government',
    subType: 'medicaid_ffs',
    electronicPayerId: 'MCDTX',
    requirements: {
      timelyFilingDays: 95,
      appealDeadline: 120,
      requiresPriorAuth: true,
      acceptsElectronicClaims: true
    },
    states: ['TX'],
    providerPortal: 'https://www.tmhp.com',
    isActive: true
  },

  'MEDICAID_FL': {
    id: 'MEDICAID_FL',
    name: 'Florida Medicaid',
    shortName: 'FL Medicaid',
    type: 'government',
    subType: 'medicaid_ffs',
    electronicPayerId: 'MCDFL',
    requirements: {
      timelyFilingDays: 365,
      appealDeadline: 120,
      requiresPriorAuth: true,
      acceptsElectronicClaims: true
    },
    states: ['FL'],
    isActive: true
  },

  'MEDICAID_PA': {
    id: 'MEDICAID_PA',
    name: 'Pennsylvania Medicaid',
    shortName: 'PA Medicaid',
    type: 'government',
    subType: 'medicaid_ffs',
    electronicPayerId: 'MCDPA',
    requirements: {
      timelyFilingDays: 180,
      appealDeadline: 90,
      requiresPriorAuth: true,
      acceptsElectronicClaims: true
    },
    states: ['PA'],
    isActive: true
  },

  'MEDICAID_IL': {
    id: 'MEDICAID_IL',
    name: 'Illinois Medicaid',
    shortName: 'IL Medicaid',
    type: 'government',
    subType: 'medicaid_ffs',
    electronicPayerId: 'MCDIL',
    requirements: {
      timelyFilingDays: 180,
      appealDeadline: 60,
      requiresPriorAuth: true,
      acceptsElectronicClaims: true
    },
    states: ['IL'],
    isActive: true
  },

  'MEDICAID_OH': {
    id: 'MEDICAID_OH',
    name: 'Ohio Medicaid',
    shortName: 'OH Medicaid',
    type: 'government',
    subType: 'medicaid_ffs',
    electronicPayerId: 'MCDOH',
    requirements: {
      timelyFilingDays: 365,
      appealDeadline: 90,
      requiresPriorAuth: true,
      acceptsElectronicClaims: true
    },
    states: ['OH'],
    isActive: true
  },

  // -------------------------------------------------------------------------
  // MAJOR COMMERCIAL PAYERS
  // -------------------------------------------------------------------------
  'UHC_COMMERCIAL': {
    id: 'UHC_COMMERCIAL',
    name: 'UnitedHealthcare Commercial',
    shortName: 'UHC',
    type: 'commercial',
    subType: 'national_commercial',
    electronicPayerId: '87726',
    clearinghouseId: 'OPTUM',
    requirements: {
      timelyFilingDays: 90,
      appealDeadline: 180,
      requiresPriorAuth: true,
      authValidDays: 90,
      acceptsElectronicClaims: true
    },
    states: [],
    parentOrganization: 'UnitedHealth Group',
    providerPortal: 'https://www.uhcprovider.com',
    providerPhone: '1-877-842-3210',
    isActive: true
  },

  'ANTHEM_BCBS': {
    id: 'ANTHEM_BCBS',
    name: 'Anthem Blue Cross Blue Shield',
    shortName: 'Anthem',
    type: 'commercial',
    subType: 'bcbs',
    electronicPayerId: '00130',
    clearinghouseId: 'AVAILITY',
    requirements: {
      timelyFilingDays: 90,
      appealDeadline: 180,
      requiresPriorAuth: true,
      authValidDays: 60,
      acceptsElectronicClaims: true
    },
    states: ['CA', 'CO', 'CT', 'GA', 'IN', 'KY', 'ME', 'MO', 'NH', 'NV', 'NY', 'OH', 'VA', 'WI'],
    parentOrganization: 'Elevance Health',
    providerPortal: 'https://www.anthem.com/provider',
    isActive: true
  },

  'BCBS_MICHIGAN': {
    id: 'BCBS_MICHIGAN',
    name: 'Blue Cross Blue Shield of Michigan',
    shortName: 'BCBS MI',
    type: 'commercial',
    subType: 'bcbs',
    electronicPayerId: '00710',
    clearinghouseId: 'AVAILITY',
    requirements: {
      timelyFilingDays: 365,
      appealDeadline: 180,
      requiresPriorAuth: true,
      acceptsElectronicClaims: true
    },
    states: ['MI'],
    isActive: true
  },

  'BCBS_TEXAS': {
    id: 'BCBS_TEXAS',
    name: 'Blue Cross Blue Shield of Texas',
    shortName: 'BCBS TX',
    type: 'commercial',
    subType: 'bcbs',
    electronicPayerId: '84980',
    clearinghouseId: 'AVAILITY',
    requirements: {
      timelyFilingDays: 95,
      appealDeadline: 180,
      requiresPriorAuth: true,
      acceptsElectronicClaims: true
    },
    states: ['TX'],
    parentOrganization: 'Health Care Service Corporation',
    isActive: true
  },

  'BCBS_FLORIDA': {
    id: 'BCBS_FLORIDA',
    name: 'Florida Blue (BCBS Florida)',
    shortName: 'Florida Blue',
    type: 'commercial',
    subType: 'bcbs',
    electronicPayerId: '00590',
    clearinghouseId: 'AVAILITY',
    requirements: {
      timelyFilingDays: 365,
      appealDeadline: 180,
      requiresPriorAuth: true,
      acceptsElectronicClaims: true
    },
    states: ['FL'],
    isActive: true
  },

  'BCBS_ILLINOIS': {
    id: 'BCBS_ILLINOIS',
    name: 'Blue Cross Blue Shield of Illinois',
    shortName: 'BCBS IL',
    type: 'commercial',
    subType: 'bcbs',
    electronicPayerId: '00621',
    clearinghouseId: 'AVAILITY',
    requirements: {
      timelyFilingDays: 365,
      appealDeadline: 180,
      requiresPriorAuth: true,
      acceptsElectronicClaims: true
    },
    states: ['IL'],
    parentOrganization: 'Health Care Service Corporation',
    isActive: true
  },

  'BCBS_NEWJERSEY': {
    id: 'BCBS_NEWJERSEY',
    name: 'Horizon Blue Cross Blue Shield of New Jersey',
    shortName: 'Horizon BCBS',
    type: 'commercial',
    subType: 'bcbs',
    electronicPayerId: '22099',
    clearinghouseId: 'AVAILITY',
    requirements: {
      timelyFilingDays: 180,
      appealDeadline: 180,
      requiresPriorAuth: true,
      acceptsElectronicClaims: true
    },
    states: ['NJ'],
    isActive: true
  },

  'AETNA': {
    id: 'AETNA',
    name: 'Aetna',
    shortName: 'Aetna',
    type: 'commercial',
    subType: 'national_commercial',
    electronicPayerId: '60054',
    clearinghouseId: 'AVAILITY',
    requirements: {
      timelyFilingDays: 90,
      appealDeadline: 180,
      requiresPriorAuth: true,
      authValidDays: 60,
      acceptsElectronicClaims: true
    },
    states: [],
    parentOrganization: 'CVS Health',
    providerPortal: 'https://www.aetna.com/health-care-professionals.html',
    providerPhone: '1-800-624-0756',
    isActive: true
  },

  'CIGNA': {
    id: 'CIGNA',
    name: 'Cigna Healthcare',
    shortName: 'Cigna',
    type: 'commercial',
    subType: 'national_commercial',
    electronicPayerId: '62308',
    clearinghouseId: 'AVAILITY',
    requirements: {
      timelyFilingDays: 90,
      appealDeadline: 180,
      requiresPriorAuth: true,
      authValidDays: 90,
      acceptsElectronicClaims: true
    },
    states: [],
    parentOrganization: 'The Cigna Group',
    providerPortal: 'https://cignaforhcp.cigna.com',
    providerPhone: '1-800-244-6224',
    isActive: true
  },

  'HUMANA': {
    id: 'HUMANA',
    name: 'Humana Commercial',
    shortName: 'Humana',
    type: 'commercial',
    subType: 'national_commercial',
    electronicPayerId: '61101',
    clearinghouseId: 'AVAILITY',
    requirements: {
      timelyFilingDays: 365,
      appealDeadline: 180,
      requiresPriorAuth: true,
      authValidDays: 90,
      acceptsElectronicClaims: true
    },
    states: [],
    parentOrganization: 'Humana Inc.',
    providerPortal: 'https://www.humana.com/provider',
    providerPhone: '1-800-457-4708',
    isActive: true
  },

  'KAISER': {
    id: 'KAISER',
    name: 'Kaiser Permanente',
    shortName: 'Kaiser',
    type: 'commercial',
    subType: 'regional_commercial',
    electronicPayerId: '94135',
    requirements: {
      timelyFilingDays: 365,
      appealDeadline: 180,
      requiresPriorAuth: true,
      acceptsElectronicClaims: true,
      billingNotes: ['Closed panel HMO - limited out-of-network coverage']
    },
    states: ['CA', 'CO', 'GA', 'HI', 'MD', 'OR', 'VA', 'WA', 'DC'],
    isActive: true
  },

  'CENTENE': {
    id: 'CENTENE',
    name: 'Centene Corporation',
    shortName: 'Centene',
    type: 'commercial',
    subType: 'national_commercial',
    electronicPayerId: '68069',
    clearinghouseId: 'AVAILITY',
    requirements: {
      timelyFilingDays: 180,
      appealDeadline: 90,
      requiresPriorAuth: true,
      acceptsElectronicClaims: true
    },
    states: [],
    parentOrganization: 'Centene Corporation',
    isActive: true
  },

  'MOLINA': {
    id: 'MOLINA',
    name: 'Molina Healthcare',
    shortName: 'Molina',
    type: 'commercial',
    subType: 'national_commercial',
    electronicPayerId: '38333',
    clearinghouseId: 'AVAILITY',
    requirements: {
      timelyFilingDays: 365,
      appealDeadline: 60,
      requiresPriorAuth: true,
      acceptsElectronicClaims: true
    },
    states: [],
    providerPortal: 'https://provider.molinahealthcare.com',
    isActive: true
  },

  'WELLCARE': {
    id: 'WELLCARE',
    name: 'WellCare Health Plans',
    shortName: 'WellCare',
    type: 'commercial',
    subType: 'national_commercial',
    electronicPayerId: '83359',
    clearinghouseId: 'AVAILITY',
    requirements: {
      timelyFilingDays: 365,
      appealDeadline: 60,
      requiresPriorAuth: true,
      acceptsElectronicClaims: true
    },
    states: [],
    parentOrganization: 'Centene Corporation',
    isActive: true
  },

  'HEALTHFIRST': {
    id: 'HEALTHFIRST',
    name: 'Healthfirst',
    shortName: 'Healthfirst',
    type: 'commercial',
    subType: 'regional_commercial',
    electronicPayerId: '13360',
    requirements: {
      timelyFilingDays: 120,
      appealDeadline: 60,
      requiresPriorAuth: true,
      acceptsElectronicClaims: true
    },
    states: ['NY', 'NJ'],
    isActive: true
  },

  'AMERIHEALTH': {
    id: 'AMERIHEALTH',
    name: 'AmeriHealth',
    shortName: 'AmeriHealth',
    type: 'commercial',
    subType: 'regional_commercial',
    electronicPayerId: '36149',
    clearinghouseId: 'AVAILITY',
    requirements: {
      timelyFilingDays: 180,
      appealDeadline: 60,
      requiresPriorAuth: true,
      acceptsElectronicClaims: true
    },
    states: ['PA', 'NJ', 'DE'],
    isActive: true
  },

  'EMBLEMHEALTH': {
    id: 'EMBLEMHEALTH',
    name: 'EmblemHealth',
    shortName: 'Emblem',
    type: 'commercial',
    subType: 'regional_commercial',
    electronicPayerId: '13551',
    requirements: {
      timelyFilingDays: 180,
      appealDeadline: 60,
      requiresPriorAuth: true,
      acceptsElectronicClaims: true
    },
    states: ['NY'],
    isActive: true
  },

  'OSCAR': {
    id: 'OSCAR',
    name: 'Oscar Health',
    shortName: 'Oscar',
    type: 'commercial',
    subType: 'national_commercial',
    electronicPayerId: '84131',
    requirements: {
      timelyFilingDays: 365,
      appealDeadline: 180,
      requiresPriorAuth: true,
      acceptsElectronicClaims: true
    },
    states: [],
    providerPortal: 'https://provider.hioscar.com',
    isActive: true
  },

  'BRIGHT_HEALTH': {
    id: 'BRIGHT_HEALTH',
    name: 'Bright Health',
    shortName: 'Bright',
    type: 'commercial',
    subType: 'regional_commercial',
    electronicPayerId: '77003',
    requirements: {
      timelyFilingDays: 365,
      appealDeadline: 180,
      requiresPriorAuth: true,
      acceptsElectronicClaims: true
    },
    states: ['AL', 'AZ', 'CA', 'CO', 'FL', 'GA', 'IL', 'NC', 'OH', 'SC', 'TN', 'TX'],
    isActive: true
  },

  'CLOVER': {
    id: 'CLOVER',
    name: 'Clover Health',
    shortName: 'Clover',
    type: 'commercial',
    subType: 'medicare_advantage',
    electronicPayerId: '68071',
    requirements: {
      timelyFilingDays: 365,
      appealDeadline: 60,
      requiresPriorAuth: true,
      acceptsElectronicClaims: true
    },
    states: ['AZ', 'GA', 'MS', 'NJ', 'PA', 'SC', 'TN', 'TX'],
    isActive: true
  },

  // -------------------------------------------------------------------------
  // TRICARE & CHAMPVA
  // -------------------------------------------------------------------------
  'TRICARE': {
    id: 'TRICARE',
    name: 'TRICARE',
    shortName: 'TRICARE',
    type: 'government',
    subType: 'tricare',
    electronicPayerId: '99726',
    requirements: {
      timelyFilingDays: 365,
      appealDeadline: 90,
      requiresPriorAuth: true,
      acceptsElectronicClaims: true
    },
    states: [],
    providerPortal: 'https://www.tricare.mil/providers',
    isActive: true
  },

  'CHAMPVA': {
    id: 'CHAMPVA',
    name: 'CHAMPVA',
    shortName: 'CHAMPVA',
    type: 'government',
    subType: 'champva',
    electronicPayerId: '84146',
    requirements: {
      timelyFilingDays: 365,
      appealDeadline: 90,
      requiresPriorAuth: false,
      acceptsElectronicClaims: true
    },
    states: [],
    isActive: true
  },

  // -------------------------------------------------------------------------
  // WORKERS COMPENSATION
  // -------------------------------------------------------------------------
  'TRAVELERS_WC': {
    id: 'TRAVELERS_WC',
    name: 'Travelers Workers Compensation',
    shortName: 'Travelers WC',
    type: 'workers_comp',
    subType: 'workers_comp',
    electronicPayerId: '25372',
    requirements: {
      timelyFilingDays: 365,
      appealDeadline: 60,
      requiresPriorAuth: false,
      acceptsElectronicClaims: true
    },
    states: [],
    isActive: true
  },

  'HARTFORD_WC': {
    id: 'HARTFORD_WC',
    name: 'The Hartford Workers Compensation',
    shortName: 'Hartford WC',
    type: 'workers_comp',
    subType: 'workers_comp',
    electronicPayerId: '00660',
    requirements: {
      timelyFilingDays: 365,
      appealDeadline: 60,
      requiresPriorAuth: false,
      acceptsElectronicClaims: true
    },
    states: [],
    isActive: true
  },

  'LIBERTY_MUTUAL_WC': {
    id: 'LIBERTY_MUTUAL_WC',
    name: 'Liberty Mutual Workers Compensation',
    shortName: 'Liberty WC',
    type: 'workers_comp',
    subType: 'workers_comp',
    electronicPayerId: 'LIBMU',
    requirements: {
      timelyFilingDays: 365,
      appealDeadline: 60,
      requiresPriorAuth: false,
      acceptsElectronicClaims: true
    },
    states: [],
    isActive: true
  },

  // -------------------------------------------------------------------------
  // AUTO INSURANCE
  // -------------------------------------------------------------------------
  'GEICO_AUTO': {
    id: 'GEICO_AUTO',
    name: 'GEICO Auto Medical',
    shortName: 'GEICO',
    type: 'auto',
    subType: 'auto_insurance',
    electronicPayerId: 'GEICO',
    requirements: {
      timelyFilingDays: 365,
      appealDeadline: 60,
      requiresPriorAuth: false,
      acceptsElectronicClaims: true
    },
    states: [],
    isActive: true
  },

  'STATE_FARM_AUTO': {
    id: 'STATE_FARM_AUTO',
    name: 'State Farm Auto Medical',
    shortName: 'State Farm',
    type: 'auto',
    subType: 'auto_insurance',
    electronicPayerId: 'STFRM',
    requirements: {
      timelyFilingDays: 365,
      appealDeadline: 60,
      requiresPriorAuth: false,
      acceptsElectronicClaims: true
    },
    states: [],
    isActive: true
  },

  // -------------------------------------------------------------------------
  // ADDITIONAL REGIONAL/STATE MEDICAID MCOs
  // -------------------------------------------------------------------------
  'AMERIGROUP': {
    id: 'AMERIGROUP',
    name: 'Amerigroup',
    shortName: 'Amerigroup',
    type: 'commercial',
    subType: 'medicaid_managed_care',
    electronicPayerId: '77001',
    clearinghouseId: 'AVAILITY',
    requirements: {
      timelyFilingDays: 180,
      appealDeadline: 90,
      requiresPriorAuth: true,
      acceptsElectronicClaims: true
    },
    states: [],
    parentOrganization: 'Elevance Health',
    isActive: true
  },

  'CAREMORE': {
    id: 'CAREMORE',
    name: 'CareMore Health',
    shortName: 'CareMore',
    type: 'commercial',
    subType: 'medicare_advantage',
    electronicPayerId: '39151',
    requirements: {
      timelyFilingDays: 365,
      appealDeadline: 60,
      requiresPriorAuth: true,
      acceptsElectronicClaims: true
    },
    states: ['AZ', 'CA', 'CT', 'IA', 'NV', 'TN', 'VA'],
    parentOrganization: 'Elevance Health',
    isActive: true
  },

  'FIDELIS': {
    id: 'FIDELIS',
    name: 'Fidelis Care',
    shortName: 'Fidelis',
    type: 'commercial',
    subType: 'medicaid_managed_care',
    electronicPayerId: '60035',
    requirements: {
      timelyFilingDays: 180,
      appealDeadline: 60,
      requiresPriorAuth: true,
      acceptsElectronicClaims: true
    },
    states: ['NY'],
    parentOrganization: 'Centene Corporation',
    isActive: true
  },

  'COMMUNITY_HEALTH_PLAN': {
    id: 'COMMUNITY_HEALTH_PLAN',
    name: 'Community Health Plan',
    shortName: 'CHP',
    type: 'commercial',
    subType: 'regional_commercial',
    electronicPayerId: '91131',
    requirements: {
      timelyFilingDays: 180,
      appealDeadline: 60,
      requiresPriorAuth: true,
      acceptsElectronicClaims: true
    },
    states: ['WA'],
    isActive: true
  },

  'PRIORITY_HEALTH': {
    id: 'PRIORITY_HEALTH',
    name: 'Priority Health',
    shortName: 'Priority',
    type: 'commercial',
    subType: 'regional_commercial',
    electronicPayerId: '47027',
    requirements: {
      timelyFilingDays: 180,
      appealDeadline: 60,
      requiresPriorAuth: true,
      acceptsElectronicClaims: true
    },
    states: ['MI'],
    isActive: true
  },

  'HAP': {
    id: 'HAP',
    name: 'Health Alliance Plan',
    shortName: 'HAP',
    type: 'commercial',
    subType: 'regional_commercial',
    electronicPayerId: '38217',
    requirements: {
      timelyFilingDays: 365,
      appealDeadline: 180,
      requiresPriorAuth: true,
      acceptsElectronicClaims: true
    },
    states: ['MI'],
    isActive: true
  },

  'GEISINGER': {
    id: 'GEISINGER',
    name: 'Geisinger Health Plan',
    shortName: 'Geisinger',
    type: 'commercial',
    subType: 'regional_commercial',
    electronicPayerId: '75218',
    requirements: {
      timelyFilingDays: 365,
      appealDeadline: 180,
      requiresPriorAuth: true,
      acceptsElectronicClaims: true
    },
    states: ['PA'],
    isActive: true
  },

  'UPMC': {
    id: 'UPMC',
    name: 'UPMC Health Plan',
    shortName: 'UPMC',
    type: 'commercial',
    subType: 'regional_commercial',
    electronicPayerId: '68039',
    requirements: {
      timelyFilingDays: 365,
      appealDeadline: 180,
      requiresPriorAuth: true,
      acceptsElectronicClaims: true
    },
    states: ['PA', 'WV', 'MD'],
    isActive: true
  },

  'EXCELLUS': {
    id: 'EXCELLUS',
    name: 'Excellus BlueCross BlueShield',
    shortName: 'Excellus',
    type: 'commercial',
    subType: 'bcbs',
    electronicPayerId: '00650',
    requirements: {
      timelyFilingDays: 180,
      appealDeadline: 180,
      requiresPriorAuth: true,
      acceptsElectronicClaims: true
    },
    states: ['NY'],
    isActive: true
  },

  'MEDICA': {
    id: 'MEDICA',
    name: 'Medica',
    shortName: 'Medica',
    type: 'commercial',
    subType: 'regional_commercial',
    electronicPayerId: '31063',
    requirements: {
      timelyFilingDays: 180,
      appealDeadline: 60,
      requiresPriorAuth: true,
      acceptsElectronicClaims: true
    },
    states: ['MN', 'WI', 'ND', 'SD'],
    isActive: true
  },

  'HEALTHPARTNERS': {
    id: 'HEALTHPARTNERS',
    name: 'HealthPartners',
    shortName: 'HealthPartners',
    type: 'commercial',
    subType: 'regional_commercial',
    electronicPayerId: '31062',
    requirements: {
      timelyFilingDays: 365,
      appealDeadline: 180,
      requiresPriorAuth: true,
      acceptsElectronicClaims: true
    },
    states: ['MN', 'WI'],
    isActive: true
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get a payer by ID
 */
export function getPayer(payerId: string): Payer | undefined {
  return PAYER_DATABASE[payerId];
}

/**
 * Get a payer by electronic payer ID
 */
export function getPayerByElectronicId(electronicPayerId: string): Payer | undefined {
  return Object.values(PAYER_DATABASE).find(
    payer => payer.electronicPayerId === electronicPayerId
  );
}

/**
 * Search payers by name (case-insensitive partial match)
 */
export function searchPayers(searchTerm: string): Payer[] {
  const lowerTerm = searchTerm.toLowerCase();
  return Object.values(PAYER_DATABASE).filter(payer =>
    payer.name.toLowerCase().includes(lowerTerm) ||
    (payer.shortName?.toLowerCase().includes(lowerTerm) ?? false) ||
    payer.electronicPayerId.toLowerCase().includes(lowerTerm)
  );
}

/**
 * Get payers by type
 */
export function getPayersByType(type: PayerType): Payer[] {
  return Object.values(PAYER_DATABASE).filter(payer => payer.type === type);
}

/**
 * Get payers by subtype
 */
export function getPayersBySubType(subType: PayerSubType): Payer[] {
  return Object.values(PAYER_DATABASE).filter(payer => payer.subType === subType);
}

/**
 * Get payers operating in a specific state
 */
export function getPayersByState(stateCode: string): Payer[] {
  const upperState = stateCode.toUpperCase();
  return Object.values(PAYER_DATABASE).filter(payer =>
    payer.states.length === 0 || payer.states.includes(upperState)
  );
}

/**
 * Get all Medicare payers (FFS and Advantage)
 */
export function getMedicarePayers(): Payer[] {
  return Object.values(PAYER_DATABASE).filter(payer =>
    payer.subType === 'medicare_ffs' || payer.subType === 'medicare_advantage'
  );
}

/**
 * Get all Medicaid payers (FFS and Managed Care)
 */
export function getMedicaidPayers(): Payer[] {
  return Object.values(PAYER_DATABASE).filter(payer =>
    payer.subType === 'medicaid_ffs' || payer.subType === 'medicaid_managed_care'
  );
}

/**
 * Get all BCBS payers
 */
export function getBCBSPayers(): Payer[] {
  return Object.values(PAYER_DATABASE).filter(payer => payer.subType === 'bcbs');
}

/**
 * Get all active payers
 */
export function getActivePayers(): Payer[] {
  return Object.values(PAYER_DATABASE).filter(payer => payer.isActive);
}

/**
 * Get all payers as an array
 */
export function getAllPayers(): Payer[] {
  return Object.values(PAYER_DATABASE);
}

/**
 * Get timely filing deadline for a payer
 */
export function getTimelyFilingDays(payerId: string): number {
  const payer = getPayer(payerId);
  return payer?.requirements.timelyFilingDays ?? 90;
}

/**
 * Get appeal deadline for a payer
 */
export function getAppealDeadlineDays(payerId: string): number {
  const payer = getPayer(payerId);
  return payer?.requirements.appealDeadline ?? 60;
}

/**
 * Check if payer requires prior authorization
 */
export function requiresPriorAuth(payerId: string): boolean {
  const payer = getPayer(payerId);
  return payer?.requirements.requiresPriorAuth ?? false;
}

/**
 * Get the count of payers by type
 */
export function getPayerCountByType(): Record<PayerType, number> {
  const counts: Record<PayerType, number> = {
    government: 0,
    commercial: 0,
    workers_comp: 0,
    auto: 0,
    other: 0
  };

  for (const payer of Object.values(PAYER_DATABASE)) {
    counts[payer.type]++;
  }

  return counts;
}
