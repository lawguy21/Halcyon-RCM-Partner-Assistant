/**
 * CARC/RARC Denial Codes Database
 * Claim Adjustment Reason Codes (CARC) and Remittance Advice Remark Codes (RARC)
 * Used for denial management and appeals
 */

export interface CARCCode {
  code: string;
  description: string;
  category: CARCCategory;
  appealable: boolean;
  commonResolutions: string[];
  urgencyLevel: 'high' | 'medium' | 'low';
  timelyFilingDays?: number;
}

export interface RARCCode {
  code: string;
  description: string;
  actionRequired: string;
}

export type CARCCategory =
  | 'eligibility'
  | 'authorization'
  | 'coding'
  | 'timely_filing'
  | 'duplicate'
  | 'medical_necessity'
  | 'bundling'
  | 'cob'
  | 'technical'
  | 'patient_responsibility'
  | 'other';

// CARC Group Codes
export type CARCGroup = 'CO' | 'PR' | 'OA' | 'CR' | 'PI';

export interface CARCGroupInfo {
  code: CARCGroup;
  name: string;
  description: string;
}

export const CARC_GROUPS: Record<CARCGroup, CARCGroupInfo> = {
  CO: { code: 'CO', name: 'Contractual Obligation', description: 'Amount for which the provider is financially liable' },
  PR: { code: 'PR', name: 'Patient Responsibility', description: 'Amount that may be billed to patient/insured' },
  OA: { code: 'OA', name: 'Other Adjustment', description: 'May not be billed to patient' },
  CR: { code: 'CR', name: 'Correction/Reversal', description: 'Correction to a prior claim' },
  PI: { code: 'PI', name: 'Payer Initiated Reduction', description: 'Reduction initiated by payer' }
};

// Comprehensive CARC Codes Database
export const CARC_CODES: Record<string, CARCCode> = {
  '1': {
    code: '1',
    description: 'Deductible Amount',
    category: 'patient_responsibility',
    appealable: false,
    commonResolutions: ['Bill patient for deductible', 'Verify deductible accumulator', 'Check for secondary insurance'],
    urgencyLevel: 'low'
  },
  '2': {
    code: '2',
    description: 'Coinsurance Amount',
    category: 'patient_responsibility',
    appealable: false,
    commonResolutions: ['Bill patient for coinsurance', 'Verify benefit percentage', 'Check for secondary insurance'],
    urgencyLevel: 'low'
  },
  '3': {
    code: '3',
    description: 'Co-payment Amount',
    category: 'patient_responsibility',
    appealable: false,
    commonResolutions: ['Collect copay from patient', 'Verify copay amount with plan'],
    urgencyLevel: 'low'
  },
  '4': {
    code: '4',
    description: 'The procedure code is inconsistent with the modifier used or a required modifier is missing',
    category: 'coding',
    appealable: true,
    commonResolutions: ['Review modifier usage', 'Add missing modifier', 'Correct procedure code', 'Appeal with documentation'],
    urgencyLevel: 'medium'
  },
  '5': {
    code: '5',
    description: 'The procedure code/bill type is inconsistent with the place of service',
    category: 'coding',
    appealable: true,
    commonResolutions: ['Verify place of service', 'Correct billing code', 'Appeal with medical records'],
    urgencyLevel: 'medium'
  },
  '6': {
    code: '6',
    description: 'The procedure/revenue code is inconsistent with the patient\'s age',
    category: 'coding',
    appealable: true,
    commonResolutions: ['Verify patient DOB', 'Review age-specific codes', 'Appeal with documentation'],
    urgencyLevel: 'medium'
  },
  '7': {
    code: '7',
    description: 'The procedure/revenue code is inconsistent with the patient\'s gender',
    category: 'coding',
    appealable: true,
    commonResolutions: ['Verify patient gender', 'Review gender-specific codes', 'Appeal with medical records'],
    urgencyLevel: 'medium'
  },
  '9': {
    code: '9',
    description: 'The diagnosis is inconsistent with the patient\'s age',
    category: 'coding',
    appealable: true,
    commonResolutions: ['Verify patient DOB', 'Review diagnosis codes', 'Appeal with documentation'],
    urgencyLevel: 'medium'
  },
  '10': {
    code: '10',
    description: 'The diagnosis is inconsistent with the patient\'s gender',
    category: 'coding',
    appealable: true,
    commonResolutions: ['Verify patient gender', 'Review diagnosis codes', 'Appeal with medical records'],
    urgencyLevel: 'medium'
  },
  '11': {
    code: '11',
    description: 'The diagnosis is inconsistent with the procedure',
    category: 'coding',
    appealable: true,
    commonResolutions: ['Review medical necessity', 'Add supporting diagnosis', 'Appeal with clinical notes'],
    urgencyLevel: 'medium'
  },
  '15': {
    code: '15',
    description: 'The authorization number is missing, invalid, or does not apply to the billed services',
    category: 'authorization',
    appealable: true,
    commonResolutions: ['Obtain retroactive authorization', 'Submit correct auth number', 'Appeal with auth documentation'],
    urgencyLevel: 'high',
    timelyFilingDays: 30
  },
  '16': {
    code: '16',
    description: 'Claim/service lacks information or has submission/billing error(s)',
    category: 'technical',
    appealable: true,
    commonResolutions: ['Review claim for errors', 'Resubmit with corrections', 'Contact payer for specifics'],
    urgencyLevel: 'medium'
  },
  '18': {
    code: '18',
    description: 'Exact duplicate claim/service',
    category: 'duplicate',
    appealable: false,
    commonResolutions: ['Verify original claim status', 'Review for different dates', 'Check ICN numbers'],
    urgencyLevel: 'low'
  },
  '19': {
    code: '19',
    description: 'This is a work-related injury/illness and must be submitted to Workers Compensation',
    category: 'cob',
    appealable: true,
    commonResolutions: ['Submit to WC carrier', 'Obtain WC denial', 'Resubmit with WC denial'],
    urgencyLevel: 'medium'
  },
  '22': {
    code: '22',
    description: 'This care may be covered by another payer per coordination of benefits',
    category: 'cob',
    appealable: true,
    commonResolutions: ['Submit to primary payer', 'Obtain EOB from primary', 'Resubmit as secondary'],
    urgencyLevel: 'medium'
  },
  '23': {
    code: '23',
    description: 'The impact of prior payer(s) adjudication including payments and/or adjustments',
    category: 'cob',
    appealable: false,
    commonResolutions: ['Review primary payment', 'Verify COB order', 'Submit with primary EOB'],
    urgencyLevel: 'low'
  },
  '24': {
    code: '24',
    description: 'Charges are covered under a capitation agreement/managed care plan',
    category: 'other',
    appealable: false,
    commonResolutions: ['Verify capitation arrangement', 'Bill appropriate entity', 'Check patient eligibility'],
    urgencyLevel: 'low'
  },
  '26': {
    code: '26',
    description: 'Expenses incurred prior to coverage',
    category: 'eligibility',
    appealable: true,
    commonResolutions: ['Verify coverage dates', 'Check for retroactive eligibility', 'Appeal with enrollment info'],
    urgencyLevel: 'medium'
  },
  '27': {
    code: '27',
    description: 'Expenses incurred after coverage terminated',
    category: 'eligibility',
    appealable: true,
    commonResolutions: ['Verify termination date', 'Check COBRA status', 'Appeal with coverage documentation'],
    urgencyLevel: 'medium'
  },
  '29': {
    code: '29',
    description: 'The time limit for filing has expired',
    category: 'timely_filing',
    appealable: true,
    commonResolutions: ['Document prior submission attempts', 'Request exception', 'Provide proof of timely filing'],
    urgencyLevel: 'high',
    timelyFilingDays: 0
  },
  '31': {
    code: '31',
    description: 'Patient cannot be identified as our insured',
    category: 'eligibility',
    appealable: true,
    commonResolutions: ['Verify member ID', 'Update patient demographics', 'Check spelling of name/DOB'],
    urgencyLevel: 'high'
  },
  '32': {
    code: '32',
    description: 'Our records indicate that this dependent is not an eligible dependent',
    category: 'eligibility',
    appealable: true,
    commonResolutions: ['Verify dependent status', 'Check enrollment records', 'Appeal with proof of relationship'],
    urgencyLevel: 'medium'
  },
  '33': {
    code: '33',
    description: 'Insured has no dependent coverage',
    category: 'eligibility',
    appealable: true,
    commonResolutions: ['Verify benefit coverage', 'Check dependent enrollment', 'Appeal with plan documents'],
    urgencyLevel: 'medium'
  },
  '34': {
    code: '34',
    description: 'Insured has no coverage for newborns',
    category: 'eligibility',
    appealable: true,
    commonResolutions: ['Verify newborn enrollment', 'Check state mandates', 'Appeal with birth certificate'],
    urgencyLevel: 'medium'
  },
  '35': {
    code: '35',
    description: 'Lifetime benefit maximum has been reached',
    category: 'other',
    appealable: false,
    commonResolutions: ['Verify benefit maximum', 'Check for secondary coverage', 'Apply for financial assistance'],
    urgencyLevel: 'low'
  },
  '39': {
    code: '39',
    description: 'Services denied at the time authorization/pre-certification was requested',
    category: 'authorization',
    appealable: true,
    commonResolutions: ['Review denial reason', 'Submit peer-to-peer review', 'Appeal with clinical documentation'],
    urgencyLevel: 'high',
    timelyFilingDays: 60
  },
  '45': {
    code: '45',
    description: 'Charge exceeds fee schedule/maximum allowable or contracted/legislated fee arrangement',
    category: 'other',
    appealable: false,
    commonResolutions: ['Verify fee schedule', 'Write off excess', 'Bill patient if permitted'],
    urgencyLevel: 'low'
  },
  '49': {
    code: '49',
    description: 'This is a non-covered service because it is a routine/preventive exam or a diagnostic/screening procedure done in conjunction with a routine/preventive exam',
    category: 'medical_necessity',
    appealable: true,
    commonResolutions: ['Review preventive vs diagnostic', 'Add supporting diagnosis', 'Appeal with documentation'],
    urgencyLevel: 'medium'
  },
  '50': {
    code: '50',
    description: 'These are non-covered services because this is not deemed a medical necessity by the payer',
    category: 'medical_necessity',
    appealable: true,
    commonResolutions: ['Request peer-to-peer', 'Submit clinical notes', 'Provide published guidelines'],
    urgencyLevel: 'high',
    timelyFilingDays: 60
  },
  '51': {
    code: '51',
    description: 'These are non-covered services because this is a pre-existing condition',
    category: 'eligibility',
    appealable: true,
    commonResolutions: ['Verify ACA compliance', 'Check plan effective date', 'Appeal with enrollment records'],
    urgencyLevel: 'medium'
  },
  '55': {
    code: '55',
    description: 'Procedure/treatment/drug is deemed experimental/investigational by the payer',
    category: 'medical_necessity',
    appealable: true,
    commonResolutions: ['Submit clinical trial data', 'Request external review', 'Provide published studies'],
    urgencyLevel: 'high',
    timelyFilingDays: 60
  },
  '56': {
    code: '56',
    description: 'Procedure/treatment has not been deemed safe and effective',
    category: 'medical_necessity',
    appealable: true,
    commonResolutions: ['Submit FDA approval', 'Provide clinical evidence', 'Request external review'],
    urgencyLevel: 'high',
    timelyFilingDays: 60
  },
  '58': {
    code: '58',
    description: 'Treatment was deemed by the payer to have been rendered in an inappropriate or invalid place of service',
    category: 'coding',
    appealable: true,
    commonResolutions: ['Verify place of service', 'Review medical necessity for setting', 'Appeal with clinical notes'],
    urgencyLevel: 'medium'
  },
  '59': {
    code: '59',
    description: 'Processed based on multiple or concurrent procedure rules',
    category: 'bundling',
    appealable: true,
    commonResolutions: ['Review bundling rules', 'Add modifier 59 if appropriate', 'Appeal with documentation'],
    urgencyLevel: 'medium'
  },
  '96': {
    code: '96',
    description: 'Non-covered charge(s). At least one Remark Code must be provided',
    category: 'other',
    appealable: true,
    commonResolutions: ['Review accompanying RARC', 'Verify covered benefits', 'Appeal based on specific reason'],
    urgencyLevel: 'medium'
  },
  '97': {
    code: '97',
    description: 'The benefit for this service is included in the payment/allowance for another service/procedure that has already been adjudicated',
    category: 'bundling',
    appealable: true,
    commonResolutions: ['Review bundling edits', 'Verify distinct service', 'Appeal with modifier documentation'],
    urgencyLevel: 'medium'
  },
  '109': {
    code: '109',
    description: 'Claim/service not covered by this payer/contractor. You must send the claim/service to the correct payer/contractor',
    category: 'eligibility',
    appealable: false,
    commonResolutions: ['Verify correct payer', 'Check patient eligibility', 'Resubmit to correct payer'],
    urgencyLevel: 'medium'
  },
  '119': {
    code: '119',
    description: 'Benefit maximum for this time period or occurrence has been reached',
    category: 'other',
    appealable: false,
    commonResolutions: ['Verify benefit limits', 'Check for secondary coverage', 'Wait for benefit reset'],
    urgencyLevel: 'low'
  },
  '140': {
    code: '140',
    description: 'Patient/Insured health identification number and name do not match',
    category: 'eligibility',
    appealable: true,
    commonResolutions: ['Verify patient demographics', 'Correct member ID', 'Resubmit with corrections'],
    urgencyLevel: 'high'
  },
  '146': {
    code: '146',
    description: 'Diagnosis was invalid for the date(s) of service reported',
    category: 'coding',
    appealable: true,
    commonResolutions: ['Verify ICD version', 'Update diagnosis code', 'Resubmit with correct code'],
    urgencyLevel: 'medium'
  },
  '151': {
    code: '151',
    description: 'Payment adjusted because the payer deems the information submitted does not support this many/frequency of services',
    category: 'medical_necessity',
    appealable: true,
    commonResolutions: ['Submit frequency justification', 'Provide clinical documentation', 'Appeal with medical necessity'],
    urgencyLevel: 'medium'
  },
  '181': {
    code: '181',
    description: 'Procedure code was invalid on the date of service',
    category: 'coding',
    appealable: true,
    commonResolutions: ['Verify CPT version', 'Update procedure code', 'Resubmit with valid code'],
    urgencyLevel: 'medium'
  },
  '182': {
    code: '182',
    description: 'Procedure modifier was invalid on the date of service',
    category: 'coding',
    appealable: true,
    commonResolutions: ['Verify modifier validity', 'Update modifier', 'Resubmit with corrections'],
    urgencyLevel: 'medium'
  },
  '183': {
    code: '183',
    description: 'The referring provider is not eligible to refer the service billed',
    category: 'authorization',
    appealable: true,
    commonResolutions: ['Verify referring provider NPI', 'Update referral information', 'Appeal with credentials'],
    urgencyLevel: 'medium'
  },
  '185': {
    code: '185',
    description: 'The rendering provider is not eligible to perform the service billed',
    category: 'authorization',
    appealable: true,
    commonResolutions: ['Verify provider credentials', 'Update rendering provider', 'Appeal with documentation'],
    urgencyLevel: 'medium'
  },
  '186': {
    code: '186',
    description: 'Level of care adjustment',
    category: 'medical_necessity',
    appealable: true,
    commonResolutions: ['Review level of care criteria', 'Submit clinical documentation', 'Appeal with medical records'],
    urgencyLevel: 'high',
    timelyFilingDays: 60
  },
  '188': {
    code: '188',
    description: 'This product/procedure is only covered when used according to FDA recommendations',
    category: 'medical_necessity',
    appealable: true,
    commonResolutions: ['Verify FDA-approved use', 'Document off-label justification', 'Appeal with clinical rationale'],
    urgencyLevel: 'medium'
  },
  '192': {
    code: '192',
    description: 'Non-standard adjustment code from paper remittance advice',
    category: 'other',
    appealable: true,
    commonResolutions: ['Request electronic remittance', 'Contact payer for clarification', 'Review paper ERA'],
    urgencyLevel: 'low'
  },
  '197': {
    code: '197',
    description: 'Precertification/authorization/notification absent',
    category: 'authorization',
    appealable: true,
    commonResolutions: ['Request retroactive authorization', 'Submit authorization documentation', 'Appeal with medical necessity'],
    urgencyLevel: 'high',
    timelyFilingDays: 30
  },
  '198': {
    code: '198',
    description: 'Precertification/authorization/notification exceeded',
    category: 'authorization',
    appealable: true,
    commonResolutions: ['Request authorization extension', 'Submit additional documentation', 'Appeal with justification'],
    urgencyLevel: 'high',
    timelyFilingDays: 30
  },
  '199': {
    code: '199',
    description: 'Revenue code and procedure code do not match',
    category: 'coding',
    appealable: true,
    commonResolutions: ['Review revenue/CPT mapping', 'Correct coding', 'Resubmit with corrections'],
    urgencyLevel: 'medium'
  },
  '204': {
    code: '204',
    description: 'This service/equipment/drug is not covered under the patient\'s current benefit plan',
    category: 'eligibility',
    appealable: true,
    commonResolutions: ['Verify benefit coverage', 'Check alternative coverage', 'Appeal for exception'],
    urgencyLevel: 'medium'
  },
  '208': {
    code: '208',
    description: 'National Provider Identifier - Loss/Stolen/Fraud',
    category: 'technical',
    appealable: true,
    commonResolutions: ['Verify NPI status', 'Update provider information', 'Contact NPPES'],
    urgencyLevel: 'high'
  },
  '209': {
    code: '209',
    description: 'Per regulations, payment is adjusted based on a CMS-approved demonstration project',
    category: 'other',
    appealable: false,
    commonResolutions: ['Review demonstration project rules', 'Verify participation status'],
    urgencyLevel: 'low'
  },
  '216': {
    code: '216',
    description: 'Administrative Oversight',
    category: 'other',
    appealable: true,
    commonResolutions: ['Request payer review', 'Submit corrected claim', 'Contact payer for explanation'],
    urgencyLevel: 'medium'
  },
  '227': {
    code: '227',
    description: 'Information requested from the patient/insured/responsible party was not provided or was insufficient/incomplete',
    category: 'technical',
    appealable: true,
    commonResolutions: ['Gather missing information', 'Resubmit with complete data', 'Contact patient for info'],
    urgencyLevel: 'medium'
  },
  '234': {
    code: '234',
    description: 'This procedure is not paid separately',
    category: 'bundling',
    appealable: true,
    commonResolutions: ['Review bundling rules', 'Add modifier if appropriate', 'Appeal with documentation'],
    urgencyLevel: 'medium'
  },
  '235': {
    code: '235',
    description: 'Sales tax',
    category: 'other',
    appealable: false,
    commonResolutions: ['Verify tax requirements', 'Adjust billing accordingly'],
    urgencyLevel: 'low'
  },
  '236': {
    code: '236',
    description: 'This procedure or procedure/modifier combination is not compatible with another procedure or procedure/modifier combination provided on the same day',
    category: 'bundling',
    appealable: true,
    commonResolutions: ['Review NCCI edits', 'Add appropriate modifier', 'Appeal with documentation'],
    urgencyLevel: 'medium'
  },
  '237': {
    code: '237',
    description: 'Legislated/Regulatory Penalty',
    category: 'other',
    appealable: false,
    commonResolutions: ['Review penalty reason', 'Correct future submissions', 'Request waiver if applicable'],
    urgencyLevel: 'medium'
  },
  '242': {
    code: '242',
    description: 'Services not provided by network/primary care providers',
    category: 'authorization',
    appealable: true,
    commonResolutions: ['Verify network status', 'Request out-of-network exception', 'Appeal emergency services'],
    urgencyLevel: 'medium'
  },
  '243': {
    code: '243',
    description: 'Services not authorized by network/primary care providers',
    category: 'authorization',
    appealable: true,
    commonResolutions: ['Obtain proper referral', 'Request retroactive authorization', 'Appeal with medical necessity'],
    urgencyLevel: 'high',
    timelyFilingDays: 30
  },
  '252': {
    code: '252',
    description: 'An attachment/other documentation is required to adjudicate this claim/service',
    category: 'technical',
    appealable: true,
    commonResolutions: ['Submit required documentation', 'Follow up on pending status', 'Provide specific records requested'],
    urgencyLevel: 'high'
  },
  '253': {
    code: '253',
    description: 'Sequestration - Loss or Gain on Reductions',
    category: 'other',
    appealable: false,
    commonResolutions: ['Verify sequestration applies', 'Adjust expected payment'],
    urgencyLevel: 'low'
  },
  '254': {
    code: '254',
    description: 'Claim received by the medical plan but benefits not available under this plan',
    category: 'eligibility',
    appealable: true,
    commonResolutions: ['Verify patient eligibility', 'Check benefit plan', 'Submit to correct plan'],
    urgencyLevel: 'medium'
  },
  '256': {
    code: '256',
    description: 'Service not payable per managed care contract',
    category: 'other',
    appealable: true,
    commonResolutions: ['Review contract terms', 'Verify service coverage', 'Appeal contract interpretation'],
    urgencyLevel: 'medium'
  },
  '269': {
    code: '269',
    description: 'Anesthesia not covered for this service/procedure',
    category: 'medical_necessity',
    appealable: true,
    commonResolutions: ['Document anesthesia necessity', 'Review anesthesia guidelines', 'Appeal with clinical documentation'],
    urgencyLevel: 'medium'
  },
  '272': {
    code: '272',
    description: 'Coverage/program guidelines were not met',
    category: 'medical_necessity',
    appealable: true,
    commonResolutions: ['Review coverage criteria', 'Submit supporting documentation', 'Appeal with clinical notes'],
    urgencyLevel: 'high',
    timelyFilingDays: 60
  },
  '280': {
    code: '280',
    description: 'Claim received and forwarded/transferred to the payer claims processing entity',
    category: 'other',
    appealable: false,
    commonResolutions: ['Wait for processing', 'Follow up with correct payer'],
    urgencyLevel: 'low'
  },
  '281': {
    code: '281',
    description: 'Claim received and forwarded/transferred to the group health plan',
    category: 'cob',
    appealable: false,
    commonResolutions: ['Wait for processing', 'Follow up with group health plan'],
    urgencyLevel: 'low'
  }
};

// RARC Codes Database
export const RARC_CODES: Record<string, RARCCode> = {
  'M1': { code: 'M1', description: 'X-ray not taken within the past 12 months or near the start of treatment', actionRequired: 'Provide recent X-ray documentation' },
  'M2': { code: 'M2', description: 'Not paid separately when the patient is an inpatient', actionRequired: 'Review inpatient billing rules' },
  'M3': { code: 'M3', description: 'Equipment is the same or similar to equipment already being used', actionRequired: 'Document need for additional equipment' },
  'M4': { code: 'M4', description: 'Alert: You may appeal this decision', actionRequired: 'Consider filing an appeal' },
  'M5': { code: 'M5', description: 'Not covered unless submitted with other code(s) from this list', actionRequired: 'Review required code combinations' },
  'M6': { code: 'M6', description: 'Alert: You may be subject to penalties for late filing', actionRequired: 'Submit future claims timely' },
  'M7': { code: 'M7', description: 'Missing, incomplete, or invalid modifier', actionRequired: 'Add or correct modifier' },
  'M10': { code: 'M10', description: 'Patient home program is a requirement', actionRequired: 'Document home program compliance' },
  'M12': { code: 'M12', description: 'Diagnosis and procedure do not match for this patient', actionRequired: 'Review diagnosis-procedure relationship' },
  'M15': { code: 'M15', description: 'Missing/incomplete/invalid authorization number', actionRequired: 'Submit valid authorization number' },
  'M16': { code: 'M16', description: 'Alert: Please see our website, provider manual, or call us for more details', actionRequired: 'Review payer resources for guidance' },
  'M20': { code: 'M20', description: 'Missing/incomplete/invalid HCPCS', actionRequired: 'Submit valid HCPCS code' },
  'M21': { code: 'M21', description: 'Missing/incomplete/invalid place of service', actionRequired: 'Correct place of service code' },
  'M24': { code: 'M24', description: 'Missing/incomplete/invalid number of units', actionRequired: 'Submit correct unit count' },
  'M27': { code: 'M27', description: 'Missing/incomplete/invalid entitlement number or SSN', actionRequired: 'Verify patient identifier' },
  'M32': { code: 'M32', description: 'Alert: This is a conditional payment', actionRequired: 'Track for potential recovery' },
  'M36': { code: 'M36', description: 'This claim was denied for filing past the timely filing deadline', actionRequired: 'Submit timely filing proof or appeal' },
  'M38': { code: 'M38', description: 'Missing/incomplete/invalid rendering provider primary identifier', actionRequired: 'Submit valid NPI' },
  'M39': { code: 'M39', description: 'Missing/incomplete/invalid referring provider primary identifier', actionRequired: 'Submit valid referring NPI' },
  'M40': { code: 'M40', description: 'Missing/incomplete/invalid service facility primary identifier', actionRequired: 'Submit valid facility NPI' },
  'M50': { code: 'M50', description: 'Missing/incomplete/invalid Claim Received Date', actionRequired: 'Verify claim receipt' },
  'M51': { code: 'M51', description: 'Missing/incomplete/invalid procedure code(s)', actionRequired: 'Submit valid procedure codes' },
  'M61': { code: 'M61', description: 'Missing/incomplete/invalid referring/ordering provider primary identifier for this claim/service', actionRequired: 'Add referring provider NPI' },
  'M76': { code: 'M76', description: 'Missing/incomplete/invalid diagnosis or condition', actionRequired: 'Submit valid diagnosis' },
  'M77': { code: 'M77', description: 'Missing/incomplete/invalid place of service', actionRequired: 'Correct place of service' },
  'M79': { code: 'M79', description: 'Missing/incomplete/invalid charge amount', actionRequired: 'Submit valid charges' },
  'M80': { code: 'M80', description: 'Not covered when performed during the same session/date as a previously processed service', actionRequired: 'Review bundling rules' },
  'M81': { code: 'M81', description: 'You are required to code this service using a HCPCS code', actionRequired: 'Use appropriate HCPCS code' },
  'N1': { code: 'N1', description: 'You may appeal this decision', actionRequired: 'File appeal if appropriate' },
  'N4': { code: 'N4', description: 'Missing/incomplete/invalid prior Insurance information', actionRequired: 'Submit primary insurance EOB' },
  'N115': { code: 'N115', description: 'This decision was based on a coverage/program guideline', actionRequired: 'Review coverage guidelines' },
  'N130': { code: 'N130', description: 'Consult your explanation of benefits or call customer service', actionRequired: 'Contact payer for details' },
  'N432': { code: 'N432', description: 'Alert: Adjustment based on a Recovery Audit', actionRequired: 'Review audit findings and appeal if appropriate' }
};

// Helper functions
export function getCARCCode(code: string): CARCCode | undefined {
  return CARC_CODES[code];
}

export function getRARCCode(code: string): RARCCode | undefined {
  return RARC_CODES[code];
}

export function getCARCCodesByCategory(category: CARCCategory): CARCCode[] {
  return Object.values(CARC_CODES).filter(code => code.category === category);
}

export function getAppealableCARCCodes(): CARCCode[] {
  return Object.values(CARC_CODES).filter(code => code.appealable);
}

export function getHighUrgencyCARCCodes(): CARCCode[] {
  return Object.values(CARC_CODES).filter(code => code.urgencyLevel === 'high');
}

export function getAllCARCCodes(): CARCCode[] {
  return Object.values(CARC_CODES);
}

export function getAllRARCCodes(): RARCCode[] {
  return Object.values(RARC_CODES);
}

export function getResolutionActions(carcCode: string): string[] {
  const code = getCARCCode(carcCode);
  return code?.commonResolutions ?? [];
}

export function categorizedenial(carcCode: string, rarcCode?: string): {
  category: CARCCategory;
  appealable: boolean;
  urgency: 'high' | 'medium' | 'low';
  resolutions: string[];
  rarcAction?: string;
} {
  const carc = getCARCCode(carcCode);
  const rarc = rarcCode ? getRARCCode(rarcCode) : undefined;

  return {
    category: carc?.category ?? 'other',
    appealable: carc?.appealable ?? false,
    urgency: carc?.urgencyLevel ?? 'medium',
    resolutions: carc?.commonResolutions ?? [],
    rarcAction: rarc?.actionRequired
  };
}
