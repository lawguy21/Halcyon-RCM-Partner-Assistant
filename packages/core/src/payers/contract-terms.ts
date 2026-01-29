/**
 * Contract Terms Management
 *
 * Manages payer contract terms including reimbursement methodologies,
 * carve-outs, authorization requirements, and deadline tracking.
 *
 * Features:
 * - Contract terms storage and retrieval
 * - Reimbursement calculation based on contract methodology
 * - Authorization requirement checking
 * - Timely filing and appeal deadline management
 */

import { getPayer, getTimelyFilingDays, getAppealDeadlineDays } from './payer-database.js';
import { getMedicareAllowedAmount } from './fee-schedule.js';

// ============================================================================
// TYPES
// ============================================================================

export type ReimbursementType =
  | 'percent_of_medicare'
  | 'percent_of_charges'
  | 'fee_schedule'
  | 'case_rate'
  | 'per_diem'
  | 'drg'
  | 'capitation'
  | 'hybrid';

export type ContractStatus = 'active' | 'pending' | 'terminated' | 'expired';

export type ServiceCategory =
  | 'inpatient'
  | 'outpatient'
  | 'emergency'
  | 'professional'
  | 'lab'
  | 'imaging'
  | 'dme'
  | 'pharmacy'
  | 'behavioral_health'
  | 'skilled_nursing'
  | 'home_health'
  | 'hospice'
  | 'other';

export interface ContractTerms {
  /** Unique identifier */
  id?: string;
  /** Payer ID */
  payerId: string;
  /** Contract name/description */
  contractName?: string;
  /** Contract effective date */
  effectiveDate: Date;
  /** Contract termination date */
  termDate?: Date;
  /** Contract status */
  status: ContractStatus;
  /** Primary reimbursement methodology */
  reimbursementType: ReimbursementType;
  /** Percentage of Medicare (if applicable) */
  percentOfMedicare?: number;
  /** Percentage of charges (if applicable) */
  percentOfCharges?: number;
  /** Case rate amount (if applicable) */
  caseRateAmount?: number;
  /** Per diem rate (if applicable) */
  perDiemRate?: number;
  /** DRG base rate (if applicable) */
  drgBaseRate?: number;
  /** Carve-out terms */
  carveOuts?: CarveOut[];
  /** Service-specific reimbursement overrides */
  serviceOverrides?: ServiceReimbursementOverride[];
  /** Stop-loss threshold (outlier threshold) */
  stopLossThreshold?: number;
  /** Stop-loss percentage */
  stopLossPercentage?: number;
  /** Contract escalation percentage (annual increase) */
  escalationPercentage?: number;
  /** Next escalation date */
  nextEscalationDate?: Date;
  /** Notes */
  notes?: string;
  /** Created timestamp */
  createdAt?: Date;
  /** Updated timestamp */
  updatedAt?: Date;
}

export interface CarveOut {
  /** Service category or specific codes */
  serviceCategory?: ServiceCategory;
  /** Specific CPT codes */
  cptCodes?: string[];
  /** Reimbursement type for carve-out */
  reimbursementType: ReimbursementType;
  /** Rate or percentage */
  rate?: number;
  /** Description */
  description?: string;
}

export interface ServiceReimbursementOverride {
  /** Service category */
  serviceCategory: ServiceCategory;
  /** Reimbursement type */
  reimbursementType: ReimbursementType;
  /** Rate or percentage */
  rate: number;
}

export interface AuthRequirement {
  /** Unique identifier */
  id?: string;
  /** Payer ID */
  payerId: string;
  /** CPT code (specific code or wildcard pattern) */
  cptCode: string;
  /** Whether auth is required */
  requiresAuth: boolean;
  /** Number of days auth is valid */
  authValidDays?: number;
  /** Place of service restrictions */
  placeOfServiceRestrictions?: string[];
  /** Diagnosis restrictions */
  diagnosisRestrictions?: string[];
  /** Notification vs full auth required */
  notificationOnly?: boolean;
  /** Turnaround time for auth response (days) */
  turnaroundDays?: number;
  /** Emergency exception applies */
  emergencyException?: boolean;
  /** Retrospective auth allowed */
  retroAuthAllowed?: boolean;
  /** Days allowed for retro auth */
  retroAuthDays?: number;
  /** Notes */
  notes?: string;
  /** Effective date */
  effectiveDate?: Date;
  /** Termination date */
  terminationDate?: Date;
}

export interface ReimbursementCalculationResult {
  /** Total expected reimbursement */
  totalReimbursement: number;
  /** Methodology used */
  methodology: ReimbursementType;
  /** Line item details */
  lineItems: ReimbursementLineItem[];
  /** Contract terms used */
  contractId?: string;
  /** Whether stop-loss was triggered */
  stopLossTriggered: boolean;
  /** Stop-loss amount (if triggered) */
  stopLossAmount?: number;
  /** Calculation notes */
  notes: string[];
}

export interface ReimbursementLineItem {
  /** CPT code */
  cptCode: string;
  /** Billed amount */
  billedAmount: number;
  /** Units */
  units: number;
  /** Expected reimbursement */
  expectedReimbursement: number;
  /** Methodology used for this line */
  methodology: ReimbursementType;
  /** Whether carve-out applied */
  carveOutApplied: boolean;
  /** Notes */
  notes?: string;
}

export interface TimelyFilingDeadline {
  /** Payer ID */
  payerId: string;
  /** Payer name */
  payerName?: string;
  /** Date of service */
  dateOfService: Date;
  /** Filing deadline date */
  deadlineDate: Date;
  /** Days from DOS to deadline */
  daysAllowed: number;
  /** Days remaining until deadline */
  daysRemaining: number;
  /** Whether deadline has passed */
  isPastDeadline: boolean;
  /** Urgency level */
  urgencyLevel: 'critical' | 'warning' | 'normal';
}

export interface AppealDeadline {
  /** Payer ID */
  payerId: string;
  /** Payer name */
  payerName?: string;
  /** Denial date */
  denialDate: Date;
  /** Appeal deadline date */
  deadlineDate: Date;
  /** Days from denial to deadline */
  daysAllowed: number;
  /** Days remaining until deadline */
  daysRemaining: number;
  /** Whether deadline has passed */
  isPastDeadline: boolean;
  /** Urgency level */
  urgencyLevel: 'critical' | 'warning' | 'normal';
  /** Appeal level */
  appealLevel?: number;
}

// ============================================================================
// IN-MEMORY STORAGE
// ============================================================================

/**
 * Contract terms storage
 * Key: payerId
 */
const contractTermsStore: Map<string, ContractTerms[]> = new Map();

/**
 * Auth requirements storage
 * Key: payerId:cptCode
 */
const authRequirementsStore: Map<string, AuthRequirement> = new Map();

// ============================================================================
// CONTRACT TERMS FUNCTIONS
// ============================================================================

/**
 * Add or update contract terms
 */
export function setContractTerms(terms: ContractTerms): void {
  const existing = contractTermsStore.get(terms.payerId) || [];

  // Check if updating existing
  const existingIndex = existing.findIndex(t =>
    t.effectiveDate.getTime() === terms.effectiveDate.getTime()
  );

  if (existingIndex >= 0) {
    existing[existingIndex] = {
      ...terms,
      updatedAt: new Date()
    };
  } else {
    existing.push({
      ...terms,
      createdAt: terms.createdAt || new Date(),
      updatedAt: new Date()
    });
  }

  contractTermsStore.set(terms.payerId, existing);
}

/**
 * Get contract terms for a payer on a specific date
 */
export function getContractTerms(
  payerId: string,
  serviceDate?: Date
): ContractTerms | undefined {
  const contracts = contractTermsStore.get(payerId);
  if (!contracts || contracts.length === 0) return undefined;

  const dos = serviceDate || new Date();

  // Find active contract for the date of service
  const activeContract = contracts.find(contract => {
    const effective = contract.effectiveDate.getTime();
    const term = contract.termDate?.getTime() ?? Infinity;
    return dos.getTime() >= effective && dos.getTime() <= term && contract.status === 'active';
  });

  if (activeContract) return activeContract;

  // Fall back to most recent contract if no active one found
  return contracts
    .filter(c => c.status === 'active')
    .sort((a, b) => b.effectiveDate.getTime() - a.effectiveDate.getTime())[0];
}

/**
 * Get all contracts for a payer
 */
export function getAllContractsForPayer(payerId: string): ContractTerms[] {
  return contractTermsStore.get(payerId) || [];
}

/**
 * Calculate reimbursement based on contract terms
 */
export function calculateReimbursement(
  payerId: string,
  charges: Array<{
    cptCode: string;
    billedAmount: number;
    units: number;
    serviceCategory?: ServiceCategory;
  }>,
  serviceDate?: Date
): ReimbursementCalculationResult {
  const contract = getContractTerms(payerId, serviceDate);
  const notes: string[] = [];
  const lineItems: ReimbursementLineItem[] = [];
  let totalReimbursement = 0;
  let stopLossTriggered = false;
  let stopLossAmount = 0;

  if (!contract) {
    notes.push('No contract found; using default estimation');
  }

  const methodology = contract?.reimbursementType || 'percent_of_charges';

  for (const charge of charges) {
    let lineReimbursement = 0;
    let lineMethodology = methodology;
    let carveOutApplied = false;
    let lineNotes: string | undefined;

    // Check for carve-outs
    if (contract?.carveOuts) {
      const carveOut = contract.carveOuts.find(co =>
        co.cptCodes?.includes(charge.cptCode) ||
        co.serviceCategory === charge.serviceCategory
      );

      if (carveOut) {
        carveOutApplied = true;
        lineMethodology = carveOut.reimbursementType;

        switch (carveOut.reimbursementType) {
          case 'percent_of_medicare':
            const medicareRate = getMedicareAllowedAmount(charge.cptCode) || 0;
            lineReimbursement = medicareRate * (carveOut.rate || 100) / 100 * charge.units;
            lineNotes = `Carve-out: ${carveOut.rate}% of Medicare`;
            break;
          case 'percent_of_charges':
            lineReimbursement = charge.billedAmount * (carveOut.rate || 50) / 100;
            lineNotes = `Carve-out: ${carveOut.rate}% of charges`;
            break;
          case 'fee_schedule':
            lineReimbursement = (carveOut.rate || 0) * charge.units;
            lineNotes = 'Carve-out: Fee schedule rate';
            break;
          default:
            lineReimbursement = charge.billedAmount * 0.5;
        }
      }
    }

    // Check for service overrides
    if (!carveOutApplied && contract?.serviceOverrides && charge.serviceCategory) {
      const override = contract.serviceOverrides.find(
        so => so.serviceCategory === charge.serviceCategory
      );

      if (override) {
        lineMethodology = override.reimbursementType;
        switch (override.reimbursementType) {
          case 'percent_of_medicare':
            const medicareRate = getMedicareAllowedAmount(charge.cptCode) || 0;
            lineReimbursement = medicareRate * override.rate / 100 * charge.units;
            lineNotes = `Service override: ${override.rate}% of Medicare`;
            break;
          case 'percent_of_charges':
            lineReimbursement = charge.billedAmount * override.rate / 100;
            lineNotes = `Service override: ${override.rate}% of charges`;
            break;
          default:
            lineReimbursement = charge.billedAmount * 0.5;
        }
      }
    }

    // Apply standard contract methodology if no carve-out/override
    if (!carveOutApplied && lineReimbursement === 0) {
      switch (methodology) {
        case 'percent_of_medicare':
          const medicareRate = getMedicareAllowedAmount(charge.cptCode);
          if (medicareRate) {
            const percent = contract?.percentOfMedicare || 100;
            lineReimbursement = medicareRate * percent / 100 * charge.units;
            lineNotes = `${percent}% of Medicare`;
          } else {
            lineReimbursement = charge.billedAmount * 0.4;
            lineNotes = 'Medicare rate not found; estimated at 40% of billed';
          }
          break;

        case 'percent_of_charges':
          const chargePercent = contract?.percentOfCharges || 50;
          lineReimbursement = charge.billedAmount * chargePercent / 100;
          lineNotes = `${chargePercent}% of charges`;
          break;

        case 'fee_schedule':
          lineReimbursement = charge.billedAmount * 0.5;
          lineNotes = 'Fee schedule lookup required';
          break;

        case 'case_rate':
          lineReimbursement = contract?.caseRateAmount || charge.billedAmount * 0.4;
          lineNotes = 'Case rate applied';
          break;

        case 'per_diem':
          lineReimbursement = contract?.perDiemRate || charge.billedAmount * 0.3;
          lineNotes = 'Per diem rate applied';
          break;

        case 'drg':
          lineReimbursement = contract?.drgBaseRate || charge.billedAmount * 0.4;
          lineNotes = 'DRG rate applied';
          break;

        default:
          lineReimbursement = charge.billedAmount * 0.5;
          lineNotes = 'Default 50% of charges';
      }
    }

    totalReimbursement += lineReimbursement;

    lineItems.push({
      cptCode: charge.cptCode,
      billedAmount: charge.billedAmount,
      units: charge.units,
      expectedReimbursement: Math.round(lineReimbursement * 100) / 100,
      methodology: lineMethodology,
      carveOutApplied,
      notes: lineNotes
    });
  }

  // Check stop-loss
  const totalBilled = charges.reduce((sum, c) => sum + c.billedAmount, 0);
  if (contract?.stopLossThreshold && totalBilled > contract.stopLossThreshold) {
    stopLossTriggered = true;
    const excessAmount = totalBilled - contract.stopLossThreshold;
    const stopLossPercent = contract.stopLossPercentage || 80;
    stopLossAmount = excessAmount * stopLossPercent / 100;
    totalReimbursement += stopLossAmount;
    notes.push(`Stop-loss triggered: additional $${stopLossAmount.toFixed(2)} for charges above threshold`);
  }

  return {
    totalReimbursement: Math.round(totalReimbursement * 100) / 100,
    methodology,
    lineItems,
    contractId: contract?.id,
    stopLossTriggered,
    stopLossAmount: stopLossTriggered ? Math.round(stopLossAmount * 100) / 100 : undefined,
    notes
  };
}

// ============================================================================
// AUTHORIZATION REQUIREMENT FUNCTIONS
// ============================================================================

/**
 * Add authorization requirement
 */
export function setAuthRequirement(requirement: AuthRequirement): void {
  const key = `${requirement.payerId}:${requirement.cptCode}`;
  authRequirementsStore.set(key, requirement);
}

/**
 * Check if authorization is required for a specific payer and CPT code
 */
export function checkAuthRequirement(
  payerId: string,
  cptCode: string,
  options?: {
    placeOfService?: string;
    diagnosisCode?: string;
    isEmergency?: boolean;
  }
): AuthRequirement | undefined {
  // Check for exact match
  const exactKey = `${payerId}:${cptCode}`;
  let requirement = authRequirementsStore.get(exactKey);

  // Check for wildcard match (e.g., "2*" for all surgery codes)
  if (!requirement) {
    for (const [key, req] of authRequirementsStore.entries()) {
      if (!key.startsWith(`${payerId}:`)) continue;

      const reqCptCode = key.split(':')[1];
      if (reqCptCode && reqCptCode.endsWith('*')) {
        const prefix = reqCptCode.slice(0, -1);
        if (cptCode.startsWith(prefix)) {
          requirement = req;
          break;
        }
      }
    }
  }

  if (!requirement) return undefined;

  // Check if emergency exception applies
  if (options?.isEmergency && requirement.emergencyException) {
    return {
      ...requirement,
      requiresAuth: false,
      notes: 'Emergency exception applies'
    };
  }

  // Check place of service restrictions
  if (requirement.placeOfServiceRestrictions &&
      options?.placeOfService &&
      !requirement.placeOfServiceRestrictions.includes(options.placeOfService)) {
    return {
      ...requirement,
      requiresAuth: false,
      notes: 'Place of service not subject to auth requirement'
    };
  }

  return requirement;
}

/**
 * Get all auth requirements for a payer
 */
export function getAuthRequirementsForPayer(payerId: string): AuthRequirement[] {
  const requirements: AuthRequirement[] = [];

  for (const [key, req] of authRequirementsStore.entries()) {
    if (key.startsWith(`${payerId}:`)) {
      requirements.push(req);
    }
  }

  return requirements.sort((a, b) => a.cptCode.localeCompare(b.cptCode));
}

/**
 * Batch check auth requirements for multiple CPT codes
 */
export function batchCheckAuthRequirements(
  payerId: string,
  cptCodes: string[],
  options?: {
    placeOfService?: string;
    isEmergency?: boolean;
  }
): Map<string, { requiresAuth: boolean; authDetails?: AuthRequirement }> {
  const results = new Map<string, { requiresAuth: boolean; authDetails?: AuthRequirement }>();

  for (const cptCode of cptCodes) {
    const requirement = checkAuthRequirement(payerId, cptCode, options);
    results.set(cptCode, {
      requiresAuth: requirement?.requiresAuth ?? false,
      authDetails: requirement
    });
  }

  return results;
}

// ============================================================================
// DEADLINE FUNCTIONS
// ============================================================================

/**
 * Get timely filing deadline for a payer
 */
export function getTimelyFilingDeadline(
  payerId: string,
  dateOfService: Date
): TimelyFilingDeadline {
  const payer = getPayer(payerId);
  const daysAllowed = getTimelyFilingDays(payerId);

  const deadlineDate = new Date(dateOfService);
  deadlineDate.setDate(deadlineDate.getDate() + daysAllowed);

  const today = new Date();
  const daysRemaining = Math.ceil((deadlineDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  const isPastDeadline = daysRemaining < 0;

  let urgencyLevel: 'critical' | 'warning' | 'normal';
  if (isPastDeadline || daysRemaining <= 7) {
    urgencyLevel = 'critical';
  } else if (daysRemaining <= 30) {
    urgencyLevel = 'warning';
  } else {
    urgencyLevel = 'normal';
  }

  return {
    payerId,
    payerName: payer?.name,
    dateOfService,
    deadlineDate,
    daysAllowed,
    daysRemaining,
    isPastDeadline,
    urgencyLevel
  };
}

/**
 * Get appeal deadline for a payer
 */
export function getAppealDeadline(
  payerId: string,
  denialDate: Date,
  appealLevel?: number
): AppealDeadline {
  const payer = getPayer(payerId);
  let daysAllowed = getAppealDeadlineDays(payerId);

  // Some payers have shorter deadlines for subsequent appeals
  if (appealLevel && appealLevel > 1) {
    daysAllowed = Math.min(daysAllowed, 60);
  }

  const deadlineDate = new Date(denialDate);
  deadlineDate.setDate(deadlineDate.getDate() + daysAllowed);

  const today = new Date();
  const daysRemaining = Math.ceil((deadlineDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  const isPastDeadline = daysRemaining < 0;

  let urgencyLevel: 'critical' | 'warning' | 'normal';
  if (isPastDeadline || daysRemaining <= 7) {
    urgencyLevel = 'critical';
  } else if (daysRemaining <= 14) {
    urgencyLevel = 'warning';
  } else {
    urgencyLevel = 'normal';
  }

  return {
    payerId,
    payerName: payer?.name,
    denialDate,
    deadlineDate,
    daysAllowed,
    daysRemaining,
    isPastDeadline,
    urgencyLevel,
    appealLevel
  };
}

/**
 * Calculate multiple filing deadlines at once
 */
export function batchCalculateDeadlines(
  claims: Array<{
    payerId: string;
    dateOfService: Date;
    claimId?: string;
  }>
): Array<TimelyFilingDeadline & { claimId?: string }> {
  return claims.map(claim => ({
    ...getTimelyFilingDeadline(claim.payerId, claim.dateOfService),
    claimId: claim.claimId
  }));
}

/**
 * Get claims approaching filing deadline
 */
export function getClaimsApproachingDeadline(
  claims: Array<{
    payerId: string;
    dateOfService: Date;
    claimId?: string;
  }>,
  daysThreshold: number = 30
): Array<TimelyFilingDeadline & { claimId?: string }> {
  const deadlines = batchCalculateDeadlines(claims);
  return deadlines
    .filter(d => d.daysRemaining <= daysThreshold && !d.isPastDeadline)
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
}

/**
 * Get claims past filing deadline
 */
export function getClaimsPastDeadline(
  claims: Array<{
    payerId: string;
    dateOfService: Date;
    claimId?: string;
  }>
): Array<TimelyFilingDeadline & { claimId?: string }> {
  const deadlines = batchCalculateDeadlines(claims);
  return deadlines
    .filter(d => d.isPastDeadline)
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if a contract is currently active
 */
export function isContractActive(payerId: string): boolean {
  const contract = getContractTerms(payerId);
  return contract?.status === 'active';
}

/**
 * Get days until contract termination
 */
export function getDaysUntilContractExpiration(payerId: string): number | null {
  const contract = getContractTerms(payerId);
  if (!contract?.termDate) return null;

  const today = new Date();
  return Math.ceil((contract.termDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * Clear all contract terms for a payer
 */
export function clearContractTerms(payerId: string): void {
  contractTermsStore.delete(payerId);
}

/**
 * Clear all auth requirements for a payer
 */
export function clearAuthRequirements(payerId: string): void {
  for (const key of authRequirementsStore.keys()) {
    if (key.startsWith(`${payerId}:`)) {
      authRequirementsStore.delete(key);
    }
  }
}

/**
 * Get contract summary for a payer
 */
export function getContractSummary(payerId: string): {
  hasActiveContract: boolean;
  reimbursementType?: ReimbursementType;
  percentOfMedicare?: number;
  effectiveDate?: Date;
  termDate?: Date;
  daysUntilExpiration?: number | null;
  carveOutCount: number;
  authRequirementCount: number;
} {
  const contract = getContractTerms(payerId);
  const authReqs = getAuthRequirementsForPayer(payerId);

  return {
    hasActiveContract: !!contract && contract.status === 'active',
    reimbursementType: contract?.reimbursementType,
    percentOfMedicare: contract?.percentOfMedicare,
    effectiveDate: contract?.effectiveDate,
    termDate: contract?.termDate,
    daysUntilExpiration: getDaysUntilContractExpiration(payerId),
    carveOutCount: contract?.carveOuts?.length || 0,
    authRequirementCount: authReqs.length
  };
}
