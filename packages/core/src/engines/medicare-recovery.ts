/**
 * Medicare Recovery Engine (MC1-MC2 Tree)
 *
 * Evaluates Medicare recovery pathways:
 * MC1: Medicare active on date of service
 * MC2: SSDI → future Medicare eligibility
 */

import { HospitalRecoveryInput } from '../models/encounter.js';
import { MedicareRecoveryResult } from '../models/recovery-result.js';

/**
 * Evaluate Medicare recovery pathway (MC1-MC2 tree)
 */
export function evaluateMedicareRecovery(input: HospitalRecoveryInput): MedicareRecoveryResult {
  const actions: string[] = [];
  const notes: string[] = [];
  let status: MedicareRecoveryResult['status'] = 'unlikely';
  let confidence = 0;
  let pathway = '';
  let estimatedTimeToEligibility: string | undefined;

  // MC1 - Medicare active on date of service
  if (input.medicareStatus === 'active_part_a' && input.encounterType === 'inpatient') {
    status = 'active_on_dos';
    confidence = 95;
    pathway = 'MC1: Medicare Part A active on DOS';
    actions.push('Bill Medicare Part A for inpatient stay');
    actions.push('Verify Medicare eligibility and coverage dates');
    notes.push('Medicare billing should proceed - verify no MSP issues');
    return { status, confidence, pathway, actions, notes };
  }

  if (input.medicareStatus === 'active_part_b') {
    if (input.encounterType !== 'inpatient') {
      status = 'active_on_dos';
      confidence = 90;
      pathway = 'MC1: Medicare Part B active on DOS';
      actions.push('Bill Medicare Part B for outpatient/ED services');
      notes.push('Part B covers outpatient services');
    } else {
      notes.push('Part B active but Part A needed for inpatient - check Part A status');
      actions.push('Verify Part A enrollment status');
    }
  }

  // MC2 - SSDI → future Medicare
  if (input.ssdiEligibilityLikely || input.ssdiStatus === 'pending' || input.ssdiStatus === 'receiving') {
    if (input.ssdiStatus === 'receiving') {
      status = 'future_likely';
      confidence = 85;
      pathway = 'MC2: SSDI recipient - Medicare eligibility in 24-month waiting period';
      estimatedTimeToEligibility = '0-24 months (depending on SSDI start date)';
      actions.push('Verify SSDI effective date to calculate Medicare eligibility');
      actions.push('Set reminder for Medicare enrollment period');
      notes.push('Medicare coverage begins 24 months after SSDI entitlement');
    } else if (input.ssdiStatus === 'pending') {
      status = 'future_likely';
      confidence = 60;
      pathway = 'MC2: SSDI pending - future Medicare likely if approved';
      estimatedTimeToEligibility = '24-36 months (approval + waiting period)';
      actions.push('Monitor SSDI application outcome');
      actions.push('Plan for future Medicare enrollment');
      notes.push('If SSDI approved, Medicare begins after 24-month waiting period');
    } else if (input.ssdiEligibilityLikely && input.disabilityLikelihood === 'high') {
      status = 'future_likely';
      confidence = 50;
      pathway = 'MC2: SSDI eligibility likely - recommend filing';
      estimatedTimeToEligibility = '30-48 months (application + approval + waiting period)';
      actions.push('Initiate SSDI application for disability benefits');
      actions.push('Document work history and disability for SSDI');
      notes.push('High disability likelihood supports SSDI filing');
      notes.push('SSDI approval leads to Medicare after 24-month waiting period');
    }
  }

  // Age-based Medicare (65+)
  // Note: This would need DOB input to calculate

  if (status === 'unlikely') {
    pathway = 'No Medicare pathway identified';
    notes.push('Patient does not appear eligible for Medicare');
    notes.push('Consider SSDI filing if disability is likely');
  }

  return { status, confidence, pathway, actions, estimatedTimeToEligibility, notes };
}
