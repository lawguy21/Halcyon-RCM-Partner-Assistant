/**
 * DSH Relevance Engine (DSH1-DSH3 Tree)
 *
 * Evaluates DSH (Disproportionate Share Hospital) relevance:
 * DSH1: Inpatient days signal
 * DSH2: Medicaid/SSI linkage signal
 * DSH3: Uninsured low-income signal
 */

import { HospitalRecoveryInput } from '../models/encounter.js';
import { DSHRelevanceResult, DSHRelevanceFactor } from '../models/recovery-result.js';
import { isIncomeBelowThreshold } from '../config/income-thresholds.js';

/**
 * Evaluate DSH relevance (DSH1-DSH3 tree)
 */
export function evaluateDSHRelevance(input: HospitalRecoveryInput): DSHRelevanceResult {
  const factors: DSHRelevanceFactor[] = [];
  const notes: string[] = [];
  let score = 0;

  // DSH1 - Inpatient days signal
  if (input.encounterType === 'inpatient') {
    if (input.lengthOfStay && input.lengthOfStay >= 1) {
      const losWeight = Math.min(input.lengthOfStay * 3, 25); // Up to 25 points for LOS
      score += losWeight;
      factors.push({
        factor: `Inpatient stay: ${input.lengthOfStay} days`,
        impact: 'positive',
        weight: losWeight
      });
      notes.push('Inpatient days are central to DSH-related utilization metrics');

      if (input.lengthOfStay >= 7) {
        score += 10;
        factors.push({
          factor: 'Extended length of stay (7+ days)',
          impact: 'positive',
          weight: 10
        });
      }
    }
  } else {
    factors.push({
      factor: `Non-inpatient encounter (${input.encounterType})`,
      impact: 'neutral',
      weight: 0
    });
    notes.push('ED/outpatient/observation contributes to low-income care profile but weaker for DSH metrics');
  }

  // DSH2 - Medicaid / SSI linkage signal
  if (input.medicaidStatus === 'active' || input.medicaidStatus === 'pending') {
    score += 25;
    factors.push({
      factor: `Medicaid ${input.medicaidStatus}`,
      impact: 'positive',
      weight: 25
    });
    notes.push('Medicaid status directly impacts DSH utilization calculations');
  }

  if (input.ssiStatus === 'receiving' || input.ssiStatus === 'pending' || input.ssiEligibilityLikely) {
    score += 20;
    factors.push({
      factor: 'SSI recipient/likely - explicit DSH utilization component',
      impact: 'positive',
      weight: 20
    });
    notes.push('SSI is explicitly part of DSH-related utilization constructs');
  }

  // DSH3 - Uninsured low-income signal
  if (input.insuranceStatusOnDOS === 'uninsured') {
    const isLowIncome = isIncomeBelowThreshold(input.householdIncome, 'fpl_200');
    if (isLowIncome) {
      score += 15;
      factors.push({
        factor: 'Uninsured + low income (<200% FPL)',
        impact: 'positive',
        weight: 15
      });
      notes.push('Uninsured low-income care contributes to safety-net profile');
    } else {
      score += 5;
      factors.push({
        factor: 'Uninsured (income above 200% FPL)',
        impact: 'neutral',
        weight: 5
      });
    }
  }

  // Facility type bonus
  if (input.facilityType === 'dsh_hospital' || input.facilityType === 'safety_net') {
    score += 10;
    factors.push({
      factor: `${input.facilityType} designation`,
      impact: 'positive',
      weight: 10
    });
  }

  // Cap score at 100
  score = Math.min(score, 100);

  // Determine relevance level
  let relevance: DSHRelevanceResult['relevance'];
  if (score >= 60) {
    relevance = 'high';
  } else if (score >= 30) {
    relevance = 'medium';
  } else {
    relevance = 'low';
  }

  // Audit readiness based on data quality
  let auditReadiness: DSHRelevanceResult['auditReadiness'] = 'weak';
  if (input.encounterType === 'inpatient' && input.lengthOfStay &&
      (input.medicaidStatus !== 'unknown' || input.insuranceStatusOnDOS)) {
    auditReadiness = 'strong';
  } else if (input.insuranceStatusOnDOS && input.householdIncome) {
    auditReadiness = 'moderate';
  }

  // Add standard DSH note
  notes.push('DSH-relevant utilization indicators assessed - DSH is a hospital qualification/payment program');

  return { relevance, score, factors, auditReadiness, notes };
}
