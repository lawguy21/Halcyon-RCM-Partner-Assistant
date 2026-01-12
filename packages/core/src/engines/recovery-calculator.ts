/**
 * Recovery Calculator Engine
 *
 * Main orchestrator that combines all recovery pathway engines:
 * - Medicaid Recovery (M1-M4)
 * - Medicare Recovery (MC1-MC2)
 * - DSH Relevance (DSH1-DSH3)
 * - State Programs (SP0-SP4)
 */

import { HospitalRecoveryInput } from '../models/encounter.js';
import {
  HospitalRecoveryResult,
  MedicaidRecoveryResult,
  MedicareRecoveryResult,
  DSHRelevanceResult,
  StateProgramResult,
  ProjectedRecovery
} from '../models/recovery-result.js';
import { evaluateMedicaidRecovery } from './medicaid-recovery.js';
import { evaluateMedicareRecovery } from './medicare-recovery.js';
import { evaluateDSHRelevance } from './dsh-relevance.js';
import { evaluateStateProgram } from './state-programs.js';

/**
 * Calculate comprehensive hospital recovery assessment
 */
export function calculateHospitalRecovery(input: HospitalRecoveryInput): HospitalRecoveryResult {
  // Run all four pathway trees
  const medicaid = evaluateMedicaidRecovery(input);
  const medicare = evaluateMedicareRecovery(input);
  const dshRelevance = evaluateDSHRelevance(input);
  const stateProgram = evaluateStateProgram(input);

  // Calculate projected recovery amounts
  const projectedRecovery = calculateProjectedRecovery(input, medicaid, stateProgram);

  // Determine primary recovery path
  const primaryRecoveryPath = determinePrimaryPath(medicaid, medicare, stateProgram);

  // Generate priority actions
  const priorityActions = generatePriorityActions(medicaid, medicare, dshRelevance, stateProgram);

  // Calculate overall confidence
  // When Medicaid is confirmed, that IS the primary recovery path - boost confidence
  let overallConfidence: number;
  if (medicaid.status === 'confirmed' && medicaid.confidence >= 90) {
    // Confirmed Medicaid dominates - hospitals just bill directly
    overallConfidence = Math.round(
      (medicaid.confidence * 0.7) +
      (dshRelevance.score * 0.2) +
      (medicare.confidence * 0.1)
    );
  } else {
    overallConfidence = Math.round(
      (medicaid.confidence * 0.4) +
      (stateProgram.confidence * 0.3) +
      (dshRelevance.score * 0.2) +
      (medicare.confidence * 0.1)
    );
  }

  return {
    primaryRecoveryPath,
    overallConfidence,
    estimatedTotalRecovery: projectedRecovery.total,
    priorityActions,

    medicaid,
    medicare,
    dshRelevance,
    stateProgram,

    currentExposure: input.totalCharges,
    projectedRecovery,

    immediateActions: priorityActions.slice(0, 3),
    followUpActions: priorityActions.slice(3),
    documentationNeeded: generateDocumentationList(input, medicaid, stateProgram)
  };
}

/**
 * Calculate projected recovery amounts based on pathway evaluations
 */
function calculateProjectedRecovery(
  input: HospitalRecoveryInput,
  medicaid: MedicaidRecoveryResult,
  stateProgram: StateProgramResult
): ProjectedRecovery {
  const charges = input.totalCharges;

  // Medicaid recovery estimate
  let medicaidRecovery = 0;
  if (medicaid.status === 'confirmed') {
    medicaidRecovery = medicaid.estimatedRecovery;
  } else if (medicaid.status === 'likely') {
    medicaidRecovery = medicaid.estimatedRecovery * 0.7; // Discount for uncertainty
  } else if (medicaid.status === 'possible') {
    medicaidRecovery = medicaid.estimatedRecovery * 0.3;
  }

  // State program recovery (only if Medicaid not primary)
  let stateProgramRecovery = 0;
  if (medicaid.status !== 'confirmed' && stateProgram.eligibilityLikely) {
    stateProgramRecovery = charges * (stateProgram.estimatedRecoveryPercent / 100) * (stateProgram.confidence / 100);
  }

  // Charity write-off value (for tax/reporting purposes)
  const charityWriteoff = Math.max(0, charges - medicaidRecovery - stateProgramRecovery);

  return {
    medicaid: Math.round(medicaidRecovery),
    stateProgram: Math.round(stateProgramRecovery),
    charityWriteoff: Math.round(charityWriteoff * 0.1), // Nominal value for write-off
    total: Math.round(medicaidRecovery + stateProgramRecovery)
  };
}

/**
 * Determine the primary recovery path based on pathway evaluations
 */
function determinePrimaryPath(
  medicaid: MedicaidRecoveryResult,
  medicare: MedicareRecoveryResult,
  stateProgram: StateProgramResult
): string {
  if (medicaid.status === 'confirmed') return 'Medicaid Direct Billing';
  if (medicare.status === 'active_on_dos') return 'Medicare Direct Billing';
  if (medicaid.status === 'likely') return 'Medicaid Application/Retroactive';
  if (stateProgram.eligibilityLikely) return `State Program: ${stateProgram.programName}`;
  if (medicaid.status === 'possible') return 'Medicaid Exploration';
  return 'Financial Assistance Screening';
}

/**
 * Generate prioritized list of actions across all pathways
 */
function generatePriorityActions(
  medicaid: MedicaidRecoveryResult,
  medicare: MedicareRecoveryResult,
  dsh: DSHRelevanceResult,
  stateProgram: StateProgramResult
): string[] {
  const actions: string[] = [];

  // Prioritize by recovery likelihood
  if (medicaid.status === 'confirmed' || medicaid.status === 'likely') {
    actions.push(...medicaid.actions.slice(0, 2));
  }

  if (medicare.status === 'active_on_dos') {
    actions.push(...medicare.actions.slice(0, 1));
  }

  if (stateProgram.eligibilityLikely) {
    actions.push(...stateProgram.actions.slice(0, 2));
  }

  if (medicaid.status === 'possible') {
    actions.push(...medicaid.actions.slice(0, 1));
  }

  if (medicare.status === 'future_likely') {
    actions.push(...medicare.actions.slice(0, 1));
  }

  // Always include DSH documentation if relevant
  if (dsh.relevance === 'high') {
    actions.push('Document encounter for DSH reporting requirements');
  }

  // Deduplicate and return
  return [...new Set(actions)];
}

/**
 * Generate comprehensive documentation list for recovery pathways
 */
function generateDocumentationList(
  input: HospitalRecoveryInput,
  medicaid: MedicaidRecoveryResult,
  stateProgram: StateProgramResult
): string[] {
  const docs: string[] = [];

  // Universal documents
  docs.push('Patient identification');
  docs.push('Date of service documentation');
  docs.push('Service/encounter records');

  // Income-related
  if (medicaid.status !== 'unlikely' || stateProgram.eligibilityLikely) {
    docs.push('Income verification (pay stubs, tax return, benefit statements)');
    docs.push('Household composition documentation');
  }

  // Insurance status
  docs.push('Insurance status verification as of date of service');

  // State program specific
  if (stateProgram.requiredDocuments.length > 0) {
    docs.push(...stateProgram.requiredDocuments);
  }

  // Disability-related
  if (input.ssiEligibilityLikely || input.ssdiEligibilityLikely) {
    docs.push('Medical records supporting disability');
    docs.push('Physician statement on functional limitations');
  }

  // Deduplicate
  return [...new Set(docs)];
}
