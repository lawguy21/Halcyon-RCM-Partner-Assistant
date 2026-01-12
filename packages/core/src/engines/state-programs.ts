/**
 * State Programs Engine (SP0-SP4 Tree)
 *
 * Evaluates state-specific uncompensated care programs:
 * SP0: State program lookup
 * SP1: 1115 UC/LIP pool evaluation
 * SP2: Charity care reimbursement evaluation
 * SP3: Indigent care pool evaluation
 * SP4: Health safety net evaluation
 */

import { HospitalRecoveryInput } from '../models/encounter.js';
import { StateProgramResult, StateProgramArchetype } from '../models/recovery-result.js';
import { STATE_PROGRAM_MAP } from '../config/state-programs.js';
import { isIncomeBelowThreshold, parseFPLString } from '../config/income-thresholds.js';

/**
 * Evaluate state program eligibility (SP0-SP4 tree)
 */
export function evaluateStateProgram(input: HospitalRecoveryInput): StateProgramResult {
  const state = input.stateOfService;
  const mapping = STATE_PROGRAM_MAP[state];

  const actions: string[] = [];
  const notes: string[] = [];
  const requiredDocuments: string[] = [];

  // Default values
  let archetype: StateProgramArchetype = 'unknown';
  let programName = 'Unknown State Program';
  let confidence = 30;
  let eligibilityLikely = false;
  let estimatedRecoveryPercent = 0;

  if (mapping) {
    archetype = mapping.archetype;
    programName = mapping.programName;

    // Check if encounter type is covered
    if (mapping.appliesToEncounterTypes.includes(input.encounterType)) {
      confidence += 20;
    } else {
      notes.push(`${input.encounterType} encounters may have limited coverage under ${programName}`);
    }

    // Check residency
    if (mapping.requiresResidency && input.stateOfResidence === input.stateOfService) {
      confidence += 15;
      requiredDocuments.push('Proof of state residency');
    } else if (mapping.requiresResidency) {
      confidence -= 20;
      notes.push('Residency requirement may not be met - out-of-state patient');
    }

    // Check income eligibility
    const incomeThreshold = parseFPLString(mapping.incomeLimit);

    if (isIncomeBelowThreshold(input.householdIncome, incomeThreshold)) {
      confidence += 25;
      eligibilityLikely = true;
      notes.push(`Income appears below ${mapping.incomeLimit} threshold`);
    } else {
      confidence -= 15;
      notes.push(`Income may exceed ${mapping.incomeLimit} eligibility limit`);
    }

    // Generate archetype-specific actions and documents
    const archetypeDetails = getArchetypeDetails(archetype, programName);
    actions.push(...archetypeDetails.actions);
    requiredDocuments.push(...archetypeDetails.requiredDocuments);
    estimatedRecoveryPercent = archetypeDetails.estimatedRecoveryPercent;

    if (archetypeDetails.additionalNotes) {
      notes.push(archetypeDetails.additionalNotes);
    }

    notes.push(mapping.notes);

  } else {
    // Unknown state - provide generic guidance
    programName = `${state} State Program (not mapped)`;
    actions.push('Research state-specific uncompensated care programs');
    actions.push('Contact state hospital association for program guidance');
    actions.push('Check for 1115 waiver programs in state');
    requiredDocuments.push('Income verification');
    requiredDocuments.push('Residency documentation');
    requiredDocuments.push('Insurance status verification');
    notes.push('State program not in mapping table - manual research recommended');
    notes.push('Check CMS 1115 waiver list for state-specific programs');
  }

  // Uninsured status increases state program relevance
  if (input.insuranceStatusOnDOS === 'uninsured') {
    confidence += 10;
  }

  confidence = Math.min(Math.max(confidence, 0), 100);

  return {
    archetype,
    programName,
    confidence,
    eligibilityLikely,
    requiredDocuments,
    actions,
    estimatedRecoveryPercent,
    notes
  };
}

/**
 * Get archetype-specific details for state program evaluation
 */
function getArchetypeDetails(archetype: StateProgramArchetype, programName: string): {
  actions: string[];
  requiredDocuments: string[];
  estimatedRecoveryPercent: number;
  additionalNotes?: string;
} {
  switch (archetype) {
    case '1115_uc_pool':
    case '1115_lip_pool':
      return {
        actions: [
          `Submit encounter data for ${programName} pool consideration`,
          'Ensure proper uncompensated care classification'
        ],
        requiredDocuments: [
          'Encounter record with dates of service',
          'Payer status documentation',
          'Facility provider agreement with pool'
        ],
        estimatedRecoveryPercent: 30
      };

    case 'charity_care_reimb':
      return {
        actions: [
          `Complete ${programName} application`,
          'Conduct financial screening interview'
        ],
        requiredDocuments: [
          'Income verification (pay stubs, tax return)',
          'Household size documentation',
          'Asset declaration (if required)',
          'Insurance status verification'
        ],
        estimatedRecoveryPercent: 25
      };

    case 'indigent_care_pool':
      return {
        actions: [
          `Document encounter for ${programName} reporting`,
          'Verify facility eligibility for pool participation'
        ],
        requiredDocuments: [
          'Encounter record with service dates',
          'Payer status at time of service',
          'Income screening documentation'
        ],
        estimatedRecoveryPercent: 28
      };

    case 'all_payer_uc_pooling':
      return {
        actions: [
          'Classify care as charity vs. bad debt per state guidelines',
          'Complete eligibility screening for charity classification'
        ],
        requiredDocuments: [
          'Financial screening documentation',
          'Charity care application',
          'Service documentation'
        ],
        estimatedRecoveryPercent: 35, // Higher due to rate-setting structure
        additionalNotes: 'UCC pooling embedded in rate structure - proper classification critical'
      };

    case 'health_safety_net':
      return {
        actions: [
          `Submit ${programName} claim for eligible services`,
          'Verify patient HSN eligibility'
        ],
        requiredDocuments: [
          'HSN eligibility determination',
          'Income documentation',
          'Residency verification',
          'MassHealth application status (if applicable)'
        ],
        estimatedRecoveryPercent: 32
      };

    default:
      return {
        actions: [
          'Research applicable state programs',
          'Contact hospital financial counseling'
        ],
        requiredDocuments: [
          'Income verification',
          'Insurance status documentation'
        ],
        estimatedRecoveryPercent: 20
      };
  }
}
