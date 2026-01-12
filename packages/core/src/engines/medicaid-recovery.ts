/**
 * Medicaid Recovery Engine (M1-M4 Tree)
 *
 * Evaluates Medicaid recovery pathways:
 * M1: Coverage on date of service
 * M2: Retroactive Medicaid plausibility
 * M3: Disability-linked Medicaid (SSI pathway)
 * M4: Medicaid pending
 */

import { HospitalRecoveryInput } from '../models/encounter.js';
import { MedicaidRecoveryResult } from '../models/recovery-result.js';
import {
  MEDICAID_EXPANSION_STATES,
  isIncomeBelowThreshold,
  IncomeLevel
} from '../config/income-thresholds.js';

/**
 * Evaluate Medicaid recovery pathway (M1-M4 tree)
 */
export function evaluateMedicaidRecovery(input: HospitalRecoveryInput): MedicaidRecoveryResult {
  const actions: string[] = [];
  const notes: string[] = [];
  let status: MedicaidRecoveryResult['status'] = 'unlikely';
  let confidence = 0;
  let pathway = '';
  let estimatedRecovery = 0;
  let timelineWeeks = '';

  const isExpansionState = MEDICAID_EXPANSION_STATES.includes(input.stateOfService);
  const medicaidIncomeLimit: IncomeLevel = isExpansionState ? 'fpl_138' : 'under_fpl';

  // M1 - Coverage on date of service
  if (input.medicaidStatus === 'active') {
    status = 'confirmed';
    confidence = 95;
    pathway = 'M1: Active Medicaid on DOS';
    estimatedRecovery = input.totalCharges * 0.45; // ~45% Medicaid reimbursement rate
    timelineWeeks = '4-8 weeks';
    actions.push('Bill Medicaid directly for date of service');
    actions.push('Verify eligibility and obtain prior authorization if required');
    notes.push('Highest confidence recovery - direct Medicaid billing');
    return { status, confidence, pathway, actions, estimatedRecovery, timelineWeeks, notes };
  }

  // M2 - Retroactive Medicaid plausibility
  if (input.insuranceStatusOnDOS === 'uninsured') {
    const incomeQualifies = isIncomeBelowThreshold(input.householdIncome, medicaidIncomeLimit);

    if (incomeQualifies) {
      status = 'likely';
      confidence = 70;
      pathway = 'M2: Retroactive Medicaid';
      estimatedRecovery = input.totalCharges * 0.40;
      timelineWeeks = '8-16 weeks';
      actions.push('Initiate Medicaid application with retroactive coverage request');
      actions.push('Document income and household size for eligibility');
      actions.push('Request 3-month retroactive coverage period');
      notes.push(`State is ${isExpansionState ? 'expansion' : 'non-expansion'} - income threshold ${isExpansionState ? '138%' : '100%'} FPL`);
      notes.push('Retroactive coverage can apply to 3 months prior to application');
    }
  }

  // M3 - Disability-linked Medicaid (SSI pathway)
  // Note: M1 returns early if confirmed, so status here is 'unlikely' or 'likely'
  if (input.ssiEligibilityLikely || input.ssiStatus === 'pending') {
    status = status === 'likely' ? 'likely' : 'possible';
    confidence = Math.max(confidence, 60);
    pathway = pathway || 'M3: SSI → Medicaid pathway';
    estimatedRecovery = estimatedRecovery || input.totalCharges * 0.35;
    timelineWeeks = timelineWeeks || '12-24 weeks';
    actions.push('Coordinate SSI application with Medicaid eligibility');
    actions.push('Document disability for SSI determination');
    notes.push('SSI approval automatically confers Medicaid in most states');
    notes.push('Consider expedited SSI processing if terminal/severe condition');
  }

  // M4 - Medicaid pending
  if (input.medicaidStatus === 'pending') {
    status = 'likely';
    confidence = 75;
    pathway = 'M4: Medicaid Application Pending';
    estimatedRecovery = input.totalCharges * 0.42;
    timelineWeeks = '6-12 weeks';
    actions.push('Track pending Medicaid application status');
    actions.push('Hold account in eligibility verification queue');
    actions.push('Follow up with state Medicaid agency weekly');
    notes.push('Pending application - monitor for approval/denial');
  }

  // Recently terminated - may have coverage gap issues
  if (input.medicaidStatus === 'recently_terminated') {
    actions.push('Review termination reason - may be eligible for reinstatement');
    actions.push('Check for procedural termination vs. eligibility loss');
    notes.push('Recent termination may indicate reapplication opportunity');
    if (status === 'unlikely') {
      status = 'possible';
      confidence = 40;
      pathway = 'M2: Potential re-enrollment or retroactive coverage';
    }
  }

  // Default unlikely
  if (status === 'unlikely') {
    pathway = 'No clear Medicaid pathway identified';
    actions.push('Screen for other coverage options');
    actions.push('Evaluate state program eligibility');
    notes.push('Patient does not appear to qualify for Medicaid based on current information');
  }

  return { status, confidence, pathway, actions, estimatedRecovery, timelineWeeks, notes };
}
