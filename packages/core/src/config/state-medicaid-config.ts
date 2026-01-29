/**
 * State Medicaid Configuration
 * Comprehensive state-by-state Medicaid eligibility rules and thresholds
 */

export interface StateMedicaidConfig {
  /** Two-letter state code */
  stateCode: string;
  /** Full state name */
  stateName: string;
  /** Whether state expanded Medicaid under ACA */
  isExpansionState: boolean;
  /** Income thresholds as % of FPL */
  incomeThresholds: {
    adults: number;
    children: number;
    pregnant: number;
    parentCaretaker: number;
    elderly: number;
    disabled: number;
  };
  /** Retroactive coverage window in months (0 = no retroactive) */
  retroactiveWindow: number;
  /** Has 1115 waiver affecting retroactive coverage */
  has1115Waiver: boolean;
  /** Waiver details if applicable */
  waiverDetails?: {
    waiverName: string;
    effectiveDate: string;
    retroactiveRestriction?: string;
  };
  /** Presumptive eligibility availability */
  presumptiveEligibility: {
    hospital: boolean;
    children: boolean;
    pregnant: boolean;
    adults: boolean;
    formerFosterCare: boolean;
    parentCaretaker: boolean;
  };
  /** State-specific asset limits (null = no asset test) */
  assetLimits: {
    individual: number | null;
    couple: number | null;
    disabled: number | null;
  };
  /** Application processing timeline (days) */
  processingTimelines: {
    standard: number;
    expedited: number;
    disability: number;
  };
  /** State Medicaid agency contact */
  agency: {
    name: string;
    phone: string;
    website: string;
  };
}

// All 50 states + DC Medicaid configurations
export const STATE_MEDICAID_CONFIGS: Record<string, StateMedicaidConfig> = {
  AL: {
    stateCode: 'AL',
    stateName: 'Alabama',
    isExpansionState: false,
    incomeThresholds: {
      adults: 0,
      children: 146,
      pregnant: 146,
      parentCaretaker: 18,
      elderly: 100,
      disabled: 100
    },
    retroactiveWindow: 3,
    has1115Waiver: false,
    presumptiveEligibility: {
      hospital: true,
      children: true,
      pregnant: true,
      adults: false,
      formerFosterCare: true,
      parentCaretaker: false
    },
    assetLimits: { individual: 2000, couple: 3000, disabled: 2000 },
    processingTimelines: { standard: 45, expedited: 10, disability: 90 },
    agency: { name: 'Alabama Medicaid Agency', phone: '1-800-362-1504', website: 'https://medicaid.alabama.gov' }
  },
  AK: {
    stateCode: 'AK',
    stateName: 'Alaska',
    isExpansionState: true,
    incomeThresholds: {
      adults: 138,
      children: 208,
      pregnant: 208,
      parentCaretaker: 138,
      elderly: 100,
      disabled: 100
    },
    retroactiveWindow: 3,
    has1115Waiver: false,
    presumptiveEligibility: {
      hospital: true,
      children: true,
      pregnant: true,
      adults: true,
      formerFosterCare: true,
      parentCaretaker: true
    },
    assetLimits: { individual: null, couple: null, disabled: 2000 },
    processingTimelines: { standard: 45, expedited: 10, disability: 90 },
    agency: { name: 'Alaska DHSS', phone: '1-800-780-9972', website: 'http://dhss.alaska.gov/dpa/Pages/medicaid' }
  },
  AZ: {
    stateCode: 'AZ',
    stateName: 'Arizona',
    isExpansionState: true,
    incomeThresholds: {
      adults: 138,
      children: 147,
      pregnant: 161,
      parentCaretaker: 138,
      elderly: 100,
      disabled: 100
    },
    retroactiveWindow: 3,
    has1115Waiver: true,
    waiverDetails: {
      waiverName: 'AHCCCS Complete Care',
      effectiveDate: '2016-10-01',
      retroactiveRestriction: 'Standard 3-month retroactive maintained'
    },
    presumptiveEligibility: {
      hospital: true,
      children: true,
      pregnant: true,
      adults: true,
      formerFosterCare: true,
      parentCaretaker: true
    },
    assetLimits: { individual: null, couple: null, disabled: 2000 },
    processingTimelines: { standard: 45, expedited: 10, disability: 90 },
    agency: { name: 'AHCCCS', phone: '1-800-334-5283', website: 'https://www.azahcccs.gov' }
  },
  AR: {
    stateCode: 'AR',
    stateName: 'Arkansas',
    isExpansionState: true,
    incomeThresholds: {
      adults: 138,
      children: 216,
      pregnant: 214,
      parentCaretaker: 138,
      elderly: 100,
      disabled: 100
    },
    retroactiveWindow: 0,
    has1115Waiver: true,
    waiverDetails: {
      waiverName: 'Arkansas Works',
      effectiveDate: '2018-01-01',
      retroactiveRestriction: 'No retroactive coverage for expansion adults'
    },
    presumptiveEligibility: {
      hospital: true,
      children: true,
      pregnant: true,
      adults: false,
      formerFosterCare: true,
      parentCaretaker: false
    },
    assetLimits: { individual: null, couple: null, disabled: 2000 },
    processingTimelines: { standard: 45, expedited: 10, disability: 90 },
    agency: { name: 'Arkansas DHS', phone: '1-800-482-8988', website: 'https://humanservices.arkansas.gov/divisions-shared-services/medical-services' }
  },
  CA: {
    stateCode: 'CA',
    stateName: 'California',
    isExpansionState: true,
    incomeThresholds: {
      adults: 138,
      children: 266,
      pregnant: 213,
      parentCaretaker: 138,
      elderly: 138,
      disabled: 138
    },
    retroactiveWindow: 3,
    has1115Waiver: true,
    waiverDetails: {
      waiverName: 'Medi-Cal 2020',
      effectiveDate: '2016-01-01',
      retroactiveRestriction: 'Full retroactive coverage maintained'
    },
    presumptiveEligibility: {
      hospital: true,
      children: true,
      pregnant: true,
      adults: true,
      formerFosterCare: true,
      parentCaretaker: true
    },
    assetLimits: { individual: null, couple: null, disabled: null },
    processingTimelines: { standard: 45, expedited: 10, disability: 90 },
    agency: { name: 'DHCS Medi-Cal', phone: '1-800-541-5555', website: 'https://www.dhcs.ca.gov/services/medi-cal' }
  },
  CO: {
    stateCode: 'CO',
    stateName: 'Colorado',
    isExpansionState: true,
    incomeThresholds: {
      adults: 138,
      children: 265,
      pregnant: 265,
      parentCaretaker: 138,
      elderly: 100,
      disabled: 100
    },
    retroactiveWindow: 3,
    has1115Waiver: false,
    presumptiveEligibility: {
      hospital: true,
      children: true,
      pregnant: true,
      adults: true,
      formerFosterCare: true,
      parentCaretaker: true
    },
    assetLimits: { individual: null, couple: null, disabled: 2000 },
    processingTimelines: { standard: 45, expedited: 10, disability: 90 },
    agency: { name: 'Colorado Health First', phone: '1-800-221-3943', website: 'https://www.healthfirstcolorado.com' }
  },
  CT: {
    stateCode: 'CT',
    stateName: 'Connecticut',
    isExpansionState: true,
    incomeThresholds: {
      adults: 138,
      children: 323,
      pregnant: 263,
      parentCaretaker: 138,
      elderly: 100,
      disabled: 100
    },
    retroactiveWindow: 3,
    has1115Waiver: false,
    presumptiveEligibility: {
      hospital: true,
      children: true,
      pregnant: true,
      adults: true,
      formerFosterCare: true,
      parentCaretaker: true
    },
    assetLimits: { individual: null, couple: null, disabled: 1600 },
    processingTimelines: { standard: 45, expedited: 10, disability: 90 },
    agency: { name: 'CT DSS', phone: '1-855-626-6632', website: 'https://portal.ct.gov/husky' }
  },
  DE: {
    stateCode: 'DE',
    stateName: 'Delaware',
    isExpansionState: true,
    incomeThresholds: {
      adults: 138,
      children: 217,
      pregnant: 217,
      parentCaretaker: 138,
      elderly: 100,
      disabled: 100
    },
    retroactiveWindow: 3,
    has1115Waiver: false,
    presumptiveEligibility: {
      hospital: true,
      children: true,
      pregnant: true,
      adults: true,
      formerFosterCare: true,
      parentCaretaker: true
    },
    assetLimits: { individual: null, couple: null, disabled: 2000 },
    processingTimelines: { standard: 45, expedited: 10, disability: 90 },
    agency: { name: 'Delaware Medicaid', phone: '1-800-372-2022', website: 'https://dhss.delaware.gov/dhss/dmma' }
  },
  DC: {
    stateCode: 'DC',
    stateName: 'District of Columbia',
    isExpansionState: true,
    incomeThresholds: {
      adults: 215,
      children: 324,
      pregnant: 324,
      parentCaretaker: 215,
      elderly: 100,
      disabled: 100
    },
    retroactiveWindow: 3,
    has1115Waiver: false,
    presumptiveEligibility: {
      hospital: true,
      children: true,
      pregnant: true,
      adults: true,
      formerFosterCare: true,
      parentCaretaker: true
    },
    assetLimits: { individual: null, couple: null, disabled: null },
    processingTimelines: { standard: 45, expedited: 10, disability: 90 },
    agency: { name: 'DC Medicaid', phone: '1-202-727-5355', website: 'https://dhcf.dc.gov' }
  },
  FL: {
    stateCode: 'FL',
    stateName: 'Florida',
    isExpansionState: false,
    incomeThresholds: {
      adults: 0,
      children: 215,
      pregnant: 196,
      parentCaretaker: 31,
      elderly: 100,
      disabled: 100
    },
    retroactiveWindow: 3,
    has1115Waiver: true,
    waiverDetails: {
      waiverName: 'Statewide Medicaid Managed Care',
      effectiveDate: '2014-08-01',
      retroactiveRestriction: 'Standard retroactive maintained'
    },
    presumptiveEligibility: {
      hospital: true,
      children: true,
      pregnant: true,
      adults: false,
      formerFosterCare: true,
      parentCaretaker: false
    },
    assetLimits: { individual: 2000, couple: 3000, disabled: 2000 },
    processingTimelines: { standard: 45, expedited: 10, disability: 90 },
    agency: { name: 'Florida AHCA', phone: '1-888-419-3456', website: 'https://ahca.myflorida.com/medicaid' }
  },
  GA: {
    stateCode: 'GA',
    stateName: 'Georgia',
    isExpansionState: false,
    incomeThresholds: {
      adults: 0,
      children: 252,
      pregnant: 225,
      parentCaretaker: 36,
      elderly: 100,
      disabled: 100
    },
    retroactiveWindow: 3,
    has1115Waiver: true,
    waiverDetails: {
      waiverName: 'Georgia Pathways',
      effectiveDate: '2023-07-01',
      retroactiveRestriction: 'No retroactive for Pathways population'
    },
    presumptiveEligibility: {
      hospital: true,
      children: true,
      pregnant: true,
      adults: false,
      formerFosterCare: true,
      parentCaretaker: false
    },
    assetLimits: { individual: 2000, couple: 3000, disabled: 2000 },
    processingTimelines: { standard: 45, expedited: 10, disability: 90 },
    agency: { name: 'Georgia DCH', phone: '1-866-322-4260', website: 'https://medicaid.georgia.gov' }
  },
  HI: {
    stateCode: 'HI',
    stateName: 'Hawaii',
    isExpansionState: true,
    incomeThresholds: {
      adults: 138,
      children: 313,
      pregnant: 196,
      parentCaretaker: 138,
      elderly: 100,
      disabled: 100
    },
    retroactiveWindow: 3,
    has1115Waiver: false,
    presumptiveEligibility: {
      hospital: true,
      children: true,
      pregnant: true,
      adults: true,
      formerFosterCare: true,
      parentCaretaker: true
    },
    assetLimits: { individual: null, couple: null, disabled: 2000 },
    processingTimelines: { standard: 45, expedited: 10, disability: 90 },
    agency: { name: 'Med-QUEST', phone: '1-800-316-8005', website: 'https://medquest.hawaii.gov' }
  },
  ID: {
    stateCode: 'ID',
    stateName: 'Idaho',
    isExpansionState: true,
    incomeThresholds: {
      adults: 138,
      children: 190,
      pregnant: 138,
      parentCaretaker: 138,
      elderly: 100,
      disabled: 100
    },
    retroactiveWindow: 3,
    has1115Waiver: false,
    presumptiveEligibility: {
      hospital: true,
      children: true,
      pregnant: true,
      adults: true,
      formerFosterCare: true,
      parentCaretaker: true
    },
    assetLimits: { individual: null, couple: null, disabled: 2000 },
    processingTimelines: { standard: 45, expedited: 10, disability: 90 },
    agency: { name: 'Idaho Medicaid', phone: '1-877-456-1233', website: 'https://healthandwelfare.idaho.gov/services-programs/medicaid-health' }
  },
  IL: {
    stateCode: 'IL',
    stateName: 'Illinois',
    isExpansionState: true,
    incomeThresholds: {
      adults: 138,
      children: 318,
      pregnant: 213,
      parentCaretaker: 138,
      elderly: 100,
      disabled: 100
    },
    retroactiveWindow: 3,
    has1115Waiver: false,
    presumptiveEligibility: {
      hospital: true,
      children: true,
      pregnant: true,
      adults: true,
      formerFosterCare: true,
      parentCaretaker: true
    },
    assetLimits: { individual: null, couple: null, disabled: 2000 },
    processingTimelines: { standard: 45, expedited: 10, disability: 90 },
    agency: { name: 'Illinois HFS', phone: '1-800-843-6154', website: 'https://www2.illinois.gov/hfs' }
  },
  IN: {
    stateCode: 'IN',
    stateName: 'Indiana',
    isExpansionState: true,
    incomeThresholds: {
      adults: 138,
      children: 265,
      pregnant: 213,
      parentCaretaker: 138,
      elderly: 100,
      disabled: 100
    },
    retroactiveWindow: 0,
    has1115Waiver: true,
    waiverDetails: {
      waiverName: 'Healthy Indiana Plan (HIP)',
      effectiveDate: '2015-02-01',
      retroactiveRestriction: 'No retroactive coverage for HIP members'
    },
    presumptiveEligibility: {
      hospital: true,
      children: true,
      pregnant: true,
      adults: false,
      formerFosterCare: true,
      parentCaretaker: false
    },
    assetLimits: { individual: null, couple: null, disabled: 2000 },
    processingTimelines: { standard: 45, expedited: 10, disability: 90 },
    agency: { name: 'Indiana FSSA', phone: '1-800-403-0864', website: 'https://www.in.gov/medicaid' }
  },
  IA: {
    stateCode: 'IA',
    stateName: 'Iowa',
    isExpansionState: true,
    incomeThresholds: {
      adults: 138,
      children: 307,
      pregnant: 380,
      parentCaretaker: 138,
      elderly: 100,
      disabled: 100
    },
    retroactiveWindow: 0,
    has1115Waiver: true,
    waiverDetails: {
      waiverName: 'Iowa Wellness Plan',
      effectiveDate: '2014-01-01',
      retroactiveRestriction: 'No retroactive coverage for expansion adults'
    },
    presumptiveEligibility: {
      hospital: true,
      children: true,
      pregnant: true,
      adults: false,
      formerFosterCare: true,
      parentCaretaker: false
    },
    assetLimits: { individual: null, couple: null, disabled: 2000 },
    processingTimelines: { standard: 45, expedited: 10, disability: 90 },
    agency: { name: 'Iowa DHS', phone: '1-800-338-8366', website: 'https://dhs.iowa.gov/ime' }
  },
  KS: {
    stateCode: 'KS',
    stateName: 'Kansas',
    isExpansionState: false,
    incomeThresholds: {
      adults: 0,
      children: 175,
      pregnant: 171,
      parentCaretaker: 38,
      elderly: 100,
      disabled: 100
    },
    retroactiveWindow: 3,
    has1115Waiver: false,
    presumptiveEligibility: {
      hospital: true,
      children: true,
      pregnant: true,
      adults: false,
      formerFosterCare: true,
      parentCaretaker: false
    },
    assetLimits: { individual: 2000, couple: 3000, disabled: 2000 },
    processingTimelines: { standard: 45, expedited: 10, disability: 90 },
    agency: { name: 'Kansas KDHE', phone: '1-800-792-4884', website: 'https://www.kancare.ks.gov' }
  },
  KY: {
    stateCode: 'KY',
    stateName: 'Kentucky',
    isExpansionState: true,
    incomeThresholds: {
      adults: 138,
      children: 218,
      pregnant: 200,
      parentCaretaker: 138,
      elderly: 100,
      disabled: 100
    },
    retroactiveWindow: 3,
    has1115Waiver: false,
    presumptiveEligibility: {
      hospital: true,
      children: true,
      pregnant: true,
      adults: true,
      formerFosterCare: true,
      parentCaretaker: true
    },
    assetLimits: { individual: null, couple: null, disabled: 2000 },
    processingTimelines: { standard: 45, expedited: 10, disability: 90 },
    agency: { name: 'Kentucky DMS', phone: '1-800-635-2570', website: 'https://chfs.ky.gov/agencies/dms' }
  },
  LA: {
    stateCode: 'LA',
    stateName: 'Louisiana',
    isExpansionState: true,
    incomeThresholds: {
      adults: 138,
      children: 255,
      pregnant: 214,
      parentCaretaker: 138,
      elderly: 100,
      disabled: 100
    },
    retroactiveWindow: 3,
    has1115Waiver: false,
    presumptiveEligibility: {
      hospital: true,
      children: true,
      pregnant: true,
      adults: true,
      formerFosterCare: true,
      parentCaretaker: true
    },
    assetLimits: { individual: null, couple: null, disabled: 2000 },
    processingTimelines: { standard: 45, expedited: 10, disability: 90 },
    agency: { name: 'Louisiana DHH', phone: '1-888-342-6207', website: 'https://ldh.la.gov/medicaid' }
  },
  ME: {
    stateCode: 'ME',
    stateName: 'Maine',
    isExpansionState: true,
    incomeThresholds: {
      adults: 138,
      children: 213,
      pregnant: 214,
      parentCaretaker: 138,
      elderly: 100,
      disabled: 100
    },
    retroactiveWindow: 3,
    has1115Waiver: false,
    presumptiveEligibility: {
      hospital: true,
      children: true,
      pregnant: true,
      adults: true,
      formerFosterCare: true,
      parentCaretaker: true
    },
    assetLimits: { individual: null, couple: null, disabled: 2000 },
    processingTimelines: { standard: 45, expedited: 10, disability: 90 },
    agency: { name: 'Maine DHHS', phone: '1-800-977-6740', website: 'https://www.maine.gov/dhhs/ofi/programs-services/mainecare' }
  },
  MD: {
    stateCode: 'MD',
    stateName: 'Maryland',
    isExpansionState: true,
    incomeThresholds: {
      adults: 138,
      children: 322,
      pregnant: 264,
      parentCaretaker: 138,
      elderly: 100,
      disabled: 100
    },
    retroactiveWindow: 3,
    has1115Waiver: false,
    presumptiveEligibility: {
      hospital: true,
      children: true,
      pregnant: true,
      adults: true,
      formerFosterCare: true,
      parentCaretaker: true
    },
    assetLimits: { individual: null, couple: null, disabled: 2000 },
    processingTimelines: { standard: 45, expedited: 10, disability: 90 },
    agency: { name: 'Maryland Health Connection', phone: '1-855-642-8572', website: 'https://health.maryland.gov/mmcp' }
  },
  MA: {
    stateCode: 'MA',
    stateName: 'Massachusetts',
    isExpansionState: true,
    incomeThresholds: {
      adults: 138,
      children: 317,
      pregnant: 205,
      parentCaretaker: 138,
      elderly: 100,
      disabled: 100
    },
    retroactiveWindow: 3,
    has1115Waiver: true,
    waiverDetails: {
      waiverName: 'MassHealth',
      effectiveDate: '2017-11-01',
      retroactiveRestriction: 'Full retroactive coverage maintained'
    },
    presumptiveEligibility: {
      hospital: true,
      children: true,
      pregnant: true,
      adults: true,
      formerFosterCare: true,
      parentCaretaker: true
    },
    assetLimits: { individual: null, couple: null, disabled: null },
    processingTimelines: { standard: 45, expedited: 10, disability: 90 },
    agency: { name: 'MassHealth', phone: '1-800-841-2900', website: 'https://www.mass.gov/masshealth' }
  },
  MI: {
    stateCode: 'MI',
    stateName: 'Michigan',
    isExpansionState: true,
    incomeThresholds: {
      adults: 138,
      children: 217,
      pregnant: 200,
      parentCaretaker: 138,
      elderly: 100,
      disabled: 100
    },
    retroactiveWindow: 0,
    has1115Waiver: true,
    waiverDetails: {
      waiverName: 'Healthy Michigan Plan',
      effectiveDate: '2014-04-01',
      retroactiveRestriction: 'No retroactive coverage for Healthy Michigan enrollees'
    },
    presumptiveEligibility: {
      hospital: true,
      children: true,
      pregnant: true,
      adults: false,
      formerFosterCare: true,
      parentCaretaker: false
    },
    assetLimits: { individual: null, couple: null, disabled: 2000 },
    processingTimelines: { standard: 45, expedited: 10, disability: 90 },
    agency: { name: 'Michigan DHHS', phone: '1-844-799-9876', website: 'https://www.michigan.gov/mdhhs/assistance-programs/medicaid' }
  },
  MN: {
    stateCode: 'MN',
    stateName: 'Minnesota',
    isExpansionState: true,
    incomeThresholds: {
      adults: 138,
      children: 283,
      pregnant: 283,
      parentCaretaker: 138,
      elderly: 100,
      disabled: 100
    },
    retroactiveWindow: 3,
    has1115Waiver: false,
    presumptiveEligibility: {
      hospital: true,
      children: true,
      pregnant: true,
      adults: true,
      formerFosterCare: true,
      parentCaretaker: true
    },
    assetLimits: { individual: null, couple: null, disabled: 3000 },
    processingTimelines: { standard: 45, expedited: 10, disability: 90 },
    agency: { name: 'Minnesota DHS', phone: '1-800-657-3739', website: 'https://mn.gov/dhs/medicaid' }
  },
  MS: {
    stateCode: 'MS',
    stateName: 'Mississippi',
    isExpansionState: false,
    incomeThresholds: {
      adults: 0,
      children: 209,
      pregnant: 199,
      parentCaretaker: 27,
      elderly: 100,
      disabled: 100
    },
    retroactiveWindow: 3,
    has1115Waiver: false,
    presumptiveEligibility: {
      hospital: true,
      children: true,
      pregnant: true,
      adults: false,
      formerFosterCare: true,
      parentCaretaker: false
    },
    assetLimits: { individual: 2000, couple: 3000, disabled: 2000 },
    processingTimelines: { standard: 45, expedited: 10, disability: 90 },
    agency: { name: 'Mississippi DOM', phone: '1-800-421-2408', website: 'https://medicaid.ms.gov' }
  },
  MO: {
    stateCode: 'MO',
    stateName: 'Missouri',
    isExpansionState: true,
    incomeThresholds: {
      adults: 138,
      children: 305,
      pregnant: 305,
      parentCaretaker: 138,
      elderly: 100,
      disabled: 100
    },
    retroactiveWindow: 3,
    has1115Waiver: false,
    presumptiveEligibility: {
      hospital: true,
      children: true,
      pregnant: true,
      adults: true,
      formerFosterCare: true,
      parentCaretaker: true
    },
    assetLimits: { individual: null, couple: null, disabled: 2000 },
    processingTimelines: { standard: 45, expedited: 10, disability: 90 },
    agency: { name: 'MO HealthNet', phone: '1-800-392-2161', website: 'https://dss.mo.gov/mhd' }
  },
  MT: {
    stateCode: 'MT',
    stateName: 'Montana',
    isExpansionState: true,
    incomeThresholds: {
      adults: 138,
      children: 266,
      pregnant: 161,
      parentCaretaker: 138,
      elderly: 100,
      disabled: 100
    },
    retroactiveWindow: 0,
    has1115Waiver: true,
    waiverDetails: {
      waiverName: 'Montana HELP',
      effectiveDate: '2016-01-01',
      retroactiveRestriction: 'No retroactive coverage for HELP enrollees'
    },
    presumptiveEligibility: {
      hospital: true,
      children: true,
      pregnant: true,
      adults: false,
      formerFosterCare: true,
      parentCaretaker: false
    },
    assetLimits: { individual: null, couple: null, disabled: 2000 },
    processingTimelines: { standard: 45, expedited: 10, disability: 90 },
    agency: { name: 'Montana DPHHS', phone: '1-800-362-8312', website: 'https://dphhs.mt.gov/medicaid' }
  },
  NE: {
    stateCode: 'NE',
    stateName: 'Nebraska',
    isExpansionState: true,
    incomeThresholds: {
      adults: 138,
      children: 218,
      pregnant: 199,
      parentCaretaker: 138,
      elderly: 100,
      disabled: 100
    },
    retroactiveWindow: 3,
    has1115Waiver: false,
    presumptiveEligibility: {
      hospital: true,
      children: true,
      pregnant: true,
      adults: true,
      formerFosterCare: true,
      parentCaretaker: true
    },
    assetLimits: { individual: null, couple: null, disabled: 4000 },
    processingTimelines: { standard: 45, expedited: 10, disability: 90 },
    agency: { name: 'Nebraska DHHS', phone: '1-800-383-4278', website: 'https://dhhs.ne.gov/Pages/Medicaid.aspx' }
  },
  NV: {
    stateCode: 'NV',
    stateName: 'Nevada',
    isExpansionState: true,
    incomeThresholds: {
      adults: 138,
      children: 205,
      pregnant: 165,
      parentCaretaker: 138,
      elderly: 100,
      disabled: 100
    },
    retroactiveWindow: 3,
    has1115Waiver: false,
    presumptiveEligibility: {
      hospital: true,
      children: true,
      pregnant: true,
      adults: true,
      formerFosterCare: true,
      parentCaretaker: true
    },
    assetLimits: { individual: null, couple: null, disabled: 2000 },
    processingTimelines: { standard: 45, expedited: 10, disability: 90 },
    agency: { name: 'Nevada DHCFP', phone: '1-800-992-0900', website: 'https://dhcfp.nv.gov' }
  },
  NH: {
    stateCode: 'NH',
    stateName: 'New Hampshire',
    isExpansionState: true,
    incomeThresholds: {
      adults: 138,
      children: 323,
      pregnant: 201,
      parentCaretaker: 138,
      elderly: 100,
      disabled: 100
    },
    retroactiveWindow: 0,
    has1115Waiver: true,
    waiverDetails: {
      waiverName: 'NH Health Protection Program',
      effectiveDate: '2016-01-01',
      retroactiveRestriction: 'No retroactive coverage for expansion adults'
    },
    presumptiveEligibility: {
      hospital: true,
      children: true,
      pregnant: true,
      adults: false,
      formerFosterCare: true,
      parentCaretaker: false
    },
    assetLimits: { individual: null, couple: null, disabled: 2500 },
    processingTimelines: { standard: 45, expedited: 10, disability: 90 },
    agency: { name: 'NH DHHS', phone: '1-844-275-3447', website: 'https://www.dhhs.nh.gov/programs-services/medicaid' }
  },
  NJ: {
    stateCode: 'NJ',
    stateName: 'New Jersey',
    isExpansionState: true,
    incomeThresholds: {
      adults: 138,
      children: 355,
      pregnant: 205,
      parentCaretaker: 138,
      elderly: 100,
      disabled: 100
    },
    retroactiveWindow: 3,
    has1115Waiver: false,
    presumptiveEligibility: {
      hospital: true,
      children: true,
      pregnant: true,
      adults: true,
      formerFosterCare: true,
      parentCaretaker: true
    },
    assetLimits: { individual: null, couple: null, disabled: 4000 },
    processingTimelines: { standard: 45, expedited: 10, disability: 90 },
    agency: { name: 'NJ FamilyCare', phone: '1-800-701-0710', website: 'https://www.state.nj.us/humanservices/dmahs/clients/medicaid' }
  },
  NM: {
    stateCode: 'NM',
    stateName: 'New Mexico',
    isExpansionState: true,
    incomeThresholds: {
      adults: 138,
      children: 305,
      pregnant: 255,
      parentCaretaker: 138,
      elderly: 100,
      disabled: 100
    },
    retroactiveWindow: 3,
    has1115Waiver: false,
    presumptiveEligibility: {
      hospital: true,
      children: true,
      pregnant: true,
      adults: true,
      formerFosterCare: true,
      parentCaretaker: true
    },
    assetLimits: { individual: null, couple: null, disabled: null },
    processingTimelines: { standard: 45, expedited: 10, disability: 90 },
    agency: { name: 'NM HSD', phone: '1-888-997-2583', website: 'https://www.hsd.state.nm.us/LookingForAssistance/medicaid.aspx' }
  },
  NY: {
    stateCode: 'NY',
    stateName: 'New York',
    isExpansionState: true,
    incomeThresholds: {
      adults: 138,
      children: 405,
      pregnant: 223,
      parentCaretaker: 138,
      elderly: 100,
      disabled: 100
    },
    retroactiveWindow: 3,
    has1115Waiver: true,
    waiverDetails: {
      waiverName: 'Medicaid Redesign Team (MRT)',
      effectiveDate: '2014-04-01',
      retroactiveRestriction: 'Full retroactive coverage maintained'
    },
    presumptiveEligibility: {
      hospital: true,
      children: true,
      pregnant: true,
      adults: true,
      formerFosterCare: true,
      parentCaretaker: true
    },
    assetLimits: { individual: null, couple: null, disabled: 15900 },
    processingTimelines: { standard: 45, expedited: 10, disability: 90 },
    agency: { name: 'NY State of Health', phone: '1-855-355-5777', website: 'https://nystateofhealth.ny.gov' }
  },
  NC: {
    stateCode: 'NC',
    stateName: 'North Carolina',
    isExpansionState: true,
    incomeThresholds: {
      adults: 138,
      children: 216,
      pregnant: 201,
      parentCaretaker: 138,
      elderly: 100,
      disabled: 100
    },
    retroactiveWindow: 3,
    has1115Waiver: false,
    presumptiveEligibility: {
      hospital: true,
      children: true,
      pregnant: true,
      adults: true,
      formerFosterCare: true,
      parentCaretaker: true
    },
    assetLimits: { individual: null, couple: null, disabled: 2000 },
    processingTimelines: { standard: 45, expedited: 10, disability: 90 },
    agency: { name: 'NC Medicaid', phone: '1-888-245-0179', website: 'https://medicaid.ncdhhs.gov' }
  },
  ND: {
    stateCode: 'ND',
    stateName: 'North Dakota',
    isExpansionState: true,
    incomeThresholds: {
      adults: 138,
      children: 175,
      pregnant: 152,
      parentCaretaker: 138,
      elderly: 100,
      disabled: 100
    },
    retroactiveWindow: 3,
    has1115Waiver: false,
    presumptiveEligibility: {
      hospital: true,
      children: true,
      pregnant: true,
      adults: true,
      formerFosterCare: true,
      parentCaretaker: true
    },
    assetLimits: { individual: null, couple: null, disabled: 3000 },
    processingTimelines: { standard: 45, expedited: 10, disability: 90 },
    agency: { name: 'ND DHS', phone: '1-800-755-2604', website: 'https://www.hhs.nd.gov/healthcare/medicaid' }
  },
  OH: {
    stateCode: 'OH',
    stateName: 'Ohio',
    isExpansionState: true,
    incomeThresholds: {
      adults: 138,
      children: 211,
      pregnant: 205,
      parentCaretaker: 138,
      elderly: 100,
      disabled: 100
    },
    retroactiveWindow: 3,
    has1115Waiver: false,
    presumptiveEligibility: {
      hospital: true,
      children: true,
      pregnant: true,
      adults: true,
      formerFosterCare: true,
      parentCaretaker: true
    },
    assetLimits: { individual: null, couple: null, disabled: 2000 },
    processingTimelines: { standard: 45, expedited: 10, disability: 90 },
    agency: { name: 'Ohio Medicaid', phone: '1-800-324-8680', website: 'https://medicaid.ohio.gov' }
  },
  OK: {
    stateCode: 'OK',
    stateName: 'Oklahoma',
    isExpansionState: true,
    incomeThresholds: {
      adults: 138,
      children: 210,
      pregnant: 138,
      parentCaretaker: 138,
      elderly: 100,
      disabled: 100
    },
    retroactiveWindow: 3,
    has1115Waiver: false,
    presumptiveEligibility: {
      hospital: true,
      children: true,
      pregnant: true,
      adults: true,
      formerFosterCare: true,
      parentCaretaker: true
    },
    assetLimits: { individual: null, couple: null, disabled: 2000 },
    processingTimelines: { standard: 45, expedited: 10, disability: 90 },
    agency: { name: 'OHCA', phone: '1-800-987-7767', website: 'https://oklahoma.gov/ohca.html' }
  },
  OR: {
    stateCode: 'OR',
    stateName: 'Oregon',
    isExpansionState: true,
    incomeThresholds: {
      adults: 138,
      children: 305,
      pregnant: 190,
      parentCaretaker: 138,
      elderly: 100,
      disabled: 100
    },
    retroactiveWindow: 3,
    has1115Waiver: true,
    waiverDetails: {
      waiverName: 'Oregon Health Plan',
      effectiveDate: '2012-07-01',
      retroactiveRestriction: 'Full retroactive coverage maintained'
    },
    presumptiveEligibility: {
      hospital: true,
      children: true,
      pregnant: true,
      adults: true,
      formerFosterCare: true,
      parentCaretaker: true
    },
    assetLimits: { individual: null, couple: null, disabled: null },
    processingTimelines: { standard: 45, expedited: 10, disability: 90 },
    agency: { name: 'Oregon Health Authority', phone: '1-800-699-9075', website: 'https://www.oregon.gov/oha/hsd/ohp' }
  },
  PA: {
    stateCode: 'PA',
    stateName: 'Pennsylvania',
    isExpansionState: true,
    incomeThresholds: {
      adults: 138,
      children: 319,
      pregnant: 220,
      parentCaretaker: 138,
      elderly: 100,
      disabled: 100
    },
    retroactiveWindow: 3,
    has1115Waiver: false,
    presumptiveEligibility: {
      hospital: true,
      children: true,
      pregnant: true,
      adults: true,
      formerFosterCare: true,
      parentCaretaker: true
    },
    assetLimits: { individual: null, couple: null, disabled: 2000 },
    processingTimelines: { standard: 45, expedited: 10, disability: 90 },
    agency: { name: 'PA DHS', phone: '1-866-550-4355', website: 'https://www.dhs.pa.gov/Services/Assistance/Pages/MA-General-Eligibility.aspx' }
  },
  RI: {
    stateCode: 'RI',
    stateName: 'Rhode Island',
    isExpansionState: true,
    incomeThresholds: {
      adults: 138,
      children: 266,
      pregnant: 258,
      parentCaretaker: 138,
      elderly: 100,
      disabled: 100
    },
    retroactiveWindow: 3,
    has1115Waiver: true,
    waiverDetails: {
      waiverName: 'Rhode Island Global Consumer Choice Compact',
      effectiveDate: '2009-01-01',
      retroactiveRestriction: 'Full retroactive coverage maintained'
    },
    presumptiveEligibility: {
      hospital: true,
      children: true,
      pregnant: true,
      adults: true,
      formerFosterCare: true,
      parentCaretaker: true
    },
    assetLimits: { individual: null, couple: null, disabled: 4000 },
    processingTimelines: { standard: 45, expedited: 10, disability: 90 },
    agency: { name: 'RI EOHHS', phone: '1-855-840-4774', website: 'https://eohhs.ri.gov/consumer/eligibility' }
  },
  SC: {
    stateCode: 'SC',
    stateName: 'South Carolina',
    isExpansionState: false,
    incomeThresholds: {
      adults: 0,
      children: 213,
      pregnant: 199,
      parentCaretaker: 67,
      elderly: 100,
      disabled: 100
    },
    retroactiveWindow: 3,
    has1115Waiver: false,
    presumptiveEligibility: {
      hospital: true,
      children: true,
      pregnant: true,
      adults: false,
      formerFosterCare: true,
      parentCaretaker: false
    },
    assetLimits: { individual: 2000, couple: 3000, disabled: 2000 },
    processingTimelines: { standard: 45, expedited: 10, disability: 90 },
    agency: { name: 'SC DHHS', phone: '1-888-549-0820', website: 'https://www.scdhhs.gov' }
  },
  SD: {
    stateCode: 'SD',
    stateName: 'South Dakota',
    isExpansionState: true,
    incomeThresholds: {
      adults: 138,
      children: 204,
      pregnant: 138,
      parentCaretaker: 138,
      elderly: 100,
      disabled: 100
    },
    retroactiveWindow: 3,
    has1115Waiver: false,
    presumptiveEligibility: {
      hospital: true,
      children: true,
      pregnant: true,
      adults: true,
      formerFosterCare: true,
      parentCaretaker: true
    },
    assetLimits: { individual: null, couple: null, disabled: 2000 },
    processingTimelines: { standard: 45, expedited: 10, disability: 90 },
    agency: { name: 'SD DSS', phone: '1-800-452-7691', website: 'https://dss.sd.gov/medicaid' }
  },
  TN: {
    stateCode: 'TN',
    stateName: 'Tennessee',
    isExpansionState: false,
    incomeThresholds: {
      adults: 0,
      children: 254,
      pregnant: 195,
      parentCaretaker: 98,
      elderly: 100,
      disabled: 100
    },
    retroactiveWindow: 3,
    has1115Waiver: true,
    waiverDetails: {
      waiverName: 'TennCare',
      effectiveDate: '2002-01-01',
      retroactiveRestriction: 'Full retroactive coverage maintained'
    },
    presumptiveEligibility: {
      hospital: true,
      children: true,
      pregnant: true,
      adults: false,
      formerFosterCare: true,
      parentCaretaker: false
    },
    assetLimits: { individual: 2000, couple: 3000, disabled: 2000 },
    processingTimelines: { standard: 45, expedited: 10, disability: 90 },
    agency: { name: 'TennCare', phone: '1-866-311-4287', website: 'https://www.tn.gov/tenncare' }
  },
  TX: {
    stateCode: 'TX',
    stateName: 'Texas',
    isExpansionState: false,
    incomeThresholds: {
      adults: 0,
      children: 202,
      pregnant: 203,
      parentCaretaker: 15,
      elderly: 100,
      disabled: 100
    },
    retroactiveWindow: 3,
    has1115Waiver: true,
    waiverDetails: {
      waiverName: 'Texas Healthcare Transformation',
      effectiveDate: '2011-12-01',
      retroactiveRestriction: 'Full retroactive coverage maintained'
    },
    presumptiveEligibility: {
      hospital: true,
      children: true,
      pregnant: true,
      adults: false,
      formerFosterCare: true,
      parentCaretaker: false
    },
    assetLimits: { individual: 2000, couple: 3000, disabled: 2000 },
    processingTimelines: { standard: 45, expedited: 10, disability: 90 },
    agency: { name: 'Texas HHSC', phone: '1-877-541-7905', website: 'https://www.hhs.texas.gov/services/health/medicaid-chip' }
  },
  UT: {
    stateCode: 'UT',
    stateName: 'Utah',
    isExpansionState: true,
    incomeThresholds: {
      adults: 138,
      children: 205,
      pregnant: 144,
      parentCaretaker: 138,
      elderly: 100,
      disabled: 100
    },
    retroactiveWindow: 0,
    has1115Waiver: true,
    waiverDetails: {
      waiverName: 'Utah Primary Care Network',
      effectiveDate: '2019-01-01',
      retroactiveRestriction: 'No retroactive coverage for expansion adults'
    },
    presumptiveEligibility: {
      hospital: true,
      children: true,
      pregnant: true,
      adults: false,
      formerFosterCare: true,
      parentCaretaker: false
    },
    assetLimits: { individual: null, couple: null, disabled: 2000 },
    processingTimelines: { standard: 45, expedited: 10, disability: 90 },
    agency: { name: 'Utah Medicaid', phone: '1-800-662-9651', website: 'https://medicaid.utah.gov' }
  },
  VT: {
    stateCode: 'VT',
    stateName: 'Vermont',
    isExpansionState: true,
    incomeThresholds: {
      adults: 138,
      children: 317,
      pregnant: 213,
      parentCaretaker: 138,
      elderly: 100,
      disabled: 100
    },
    retroactiveWindow: 3,
    has1115Waiver: true,
    waiverDetails: {
      waiverName: 'Global Commitment to Health',
      effectiveDate: '2005-10-01',
      retroactiveRestriction: 'Full retroactive coverage maintained'
    },
    presumptiveEligibility: {
      hospital: true,
      children: true,
      pregnant: true,
      adults: true,
      formerFosterCare: true,
      parentCaretaker: true
    },
    assetLimits: { individual: null, couple: null, disabled: null },
    processingTimelines: { standard: 45, expedited: 10, disability: 90 },
    agency: { name: 'DVHA', phone: '1-800-250-8427', website: 'https://dvha.vermont.gov' }
  },
  VA: {
    stateCode: 'VA',
    stateName: 'Virginia',
    isExpansionState: true,
    incomeThresholds: {
      adults: 138,
      children: 148,
      pregnant: 148,
      parentCaretaker: 138,
      elderly: 100,
      disabled: 100
    },
    retroactiveWindow: 3,
    has1115Waiver: false,
    presumptiveEligibility: {
      hospital: true,
      children: true,
      pregnant: true,
      adults: true,
      formerFosterCare: true,
      parentCaretaker: true
    },
    assetLimits: { individual: null, couple: null, disabled: 2000 },
    processingTimelines: { standard: 45, expedited: 10, disability: 90 },
    agency: { name: 'DMAS', phone: '1-804-786-6145', website: 'https://www.dmas.virginia.gov' }
  },
  WA: {
    stateCode: 'WA',
    stateName: 'Washington',
    isExpansionState: true,
    incomeThresholds: {
      adults: 138,
      children: 312,
      pregnant: 198,
      parentCaretaker: 138,
      elderly: 100,
      disabled: 100
    },
    retroactiveWindow: 3,
    has1115Waiver: false,
    presumptiveEligibility: {
      hospital: true,
      children: true,
      pregnant: true,
      adults: true,
      formerFosterCare: true,
      parentCaretaker: true
    },
    assetLimits: { individual: null, couple: null, disabled: 2000 },
    processingTimelines: { standard: 45, expedited: 10, disability: 90 },
    agency: { name: 'HCA', phone: '1-800-562-3022', website: 'https://www.hca.wa.gov/health-care-services-supports/apple-health-medicaid-coverage' }
  },
  WV: {
    stateCode: 'WV',
    stateName: 'West Virginia',
    isExpansionState: true,
    incomeThresholds: {
      adults: 138,
      children: 305,
      pregnant: 185,
      parentCaretaker: 138,
      elderly: 100,
      disabled: 100
    },
    retroactiveWindow: 3,
    has1115Waiver: false,
    presumptiveEligibility: {
      hospital: true,
      children: true,
      pregnant: true,
      adults: true,
      formerFosterCare: true,
      parentCaretaker: true
    },
    assetLimits: { individual: null, couple: null, disabled: 2000 },
    processingTimelines: { standard: 45, expedited: 10, disability: 90 },
    agency: { name: 'WV DHHR', phone: '1-877-716-1212', website: 'https://dhhr.wv.gov/bms' }
  },
  WI: {
    stateCode: 'WI',
    stateName: 'Wisconsin',
    isExpansionState: false,
    incomeThresholds: {
      adults: 100,
      children: 306,
      pregnant: 306,
      parentCaretaker: 100,
      elderly: 100,
      disabled: 100
    },
    retroactiveWindow: 3,
    has1115Waiver: true,
    waiverDetails: {
      waiverName: 'BadgerCare Plus',
      effectiveDate: '2008-02-01',
      retroactiveRestriction: 'Full retroactive coverage maintained'
    },
    presumptiveEligibility: {
      hospital: true,
      children: true,
      pregnant: true,
      adults: true,
      formerFosterCare: true,
      parentCaretaker: true
    },
    assetLimits: { individual: null, couple: null, disabled: 2000 },
    processingTimelines: { standard: 45, expedited: 10, disability: 90 },
    agency: { name: 'Wisconsin DHS', phone: '1-800-362-3002', website: 'https://www.dhs.wisconsin.gov/medicaid' }
  },
  WY: {
    stateCode: 'WY',
    stateName: 'Wyoming',
    isExpansionState: false,
    incomeThresholds: {
      adults: 0,
      children: 154,
      pregnant: 154,
      parentCaretaker: 55,
      elderly: 100,
      disabled: 100
    },
    retroactiveWindow: 3,
    has1115Waiver: false,
    presumptiveEligibility: {
      hospital: true,
      children: true,
      pregnant: true,
      adults: false,
      formerFosterCare: true,
      parentCaretaker: false
    },
    assetLimits: { individual: 2000, couple: 3000, disabled: 2000 },
    processingTimelines: { standard: 45, expedited: 10, disability: 90 },
    agency: { name: 'Wyoming DFS', phone: '1-307-777-7531', website: 'https://health.wyo.gov/healthcarefin/medicaid' }
  }
};

// Helper functions
export function getStateConfig(stateCode: string): StateMedicaidConfig | undefined {
  return STATE_MEDICAID_CONFIGS[stateCode.toUpperCase()];
}

export function isExpansionState(stateCode: string): boolean {
  const config = getStateConfig(stateCode);
  return config?.isExpansionState ?? false;
}

export function getRetroactiveWindow(stateCode: string): number {
  const config = getStateConfig(stateCode);
  return config?.retroactiveWindow ?? 3;
}

export function hasPresumptiveEligibility(stateCode: string, category: keyof StateMedicaidConfig['presumptiveEligibility']): boolean {
  const config = getStateConfig(stateCode);
  return config?.presumptiveEligibility[category] ?? false;
}

export function getIncomeThreshold(stateCode: string, category: keyof StateMedicaidConfig['incomeThresholds']): number {
  const config = getStateConfig(stateCode);
  return config?.incomeThresholds[category] ?? 0;
}

export function getAllExpansionStates(): string[] {
  return Object.keys(STATE_MEDICAID_CONFIGS).filter(code => STATE_MEDICAID_CONFIGS[code]?.isExpansionState);
}

export function getAllNonExpansionStates(): string[] {
  return Object.keys(STATE_MEDICAID_CONFIGS).filter(code => !STATE_MEDICAID_CONFIGS[code]?.isExpansionState);
}

export function getStatesWithNoRetroactive(): string[] {
  return Object.keys(STATE_MEDICAID_CONFIGS).filter(code => STATE_MEDICAID_CONFIGS[code]?.retroactiveWindow === 0);
}

export function getStatesWith1115Waiver(): string[] {
  return Object.keys(STATE_MEDICAID_CONFIGS).filter(code => STATE_MEDICAID_CONFIGS[code]?.has1115Waiver);
}
