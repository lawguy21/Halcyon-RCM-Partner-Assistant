// @ts-nocheck
/**
 * Payer Management Controller
 *
 * Business logic layer for payer and contract management REST endpoints.
 * Handles validation, error handling, and response formatting.
 */

import { payerService } from '../services/payerService.js';
import type {
  CreatePayerInput,
  UpdatePayerInput,
  CreateContractInput,
  FeeScheduleImportInput,
  AuthRequirementInput
} from '../services/payerService.js';
import type { ClaimCharge, PayerType } from '@halcyon-rcm/core';

// ============================================================================
// PAYER CRUD OPERATIONS
// ============================================================================

/**
 * List all payers with filtering and pagination
 */
export async function listPayers(options: {
  type?: string;
  state?: string;
  search?: string;
  includeBuiltIn?: boolean;
  includeInactive?: boolean;
  page?: number;
  limit?: number;
}): Promise<{
  success: boolean;
  data: {
    payers: any[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}> {
  const result = await payerService.listPayers({
    type: options.type as PayerType,
    state: options.state,
    search: options.search,
    includeBuiltIn: options.includeBuiltIn !== false,
    includeInactive: options.includeInactive,
    page: options.page || 1,
    limit: Math.min(options.limit || 50, 100)
  });

  return {
    success: true,
    data: {
      payers: result.payers,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit)
      }
    }
  };
}

/**
 * Get a single payer by ID
 */
export async function getPayer(id: string): Promise<{
  success: boolean;
  data?: any;
  error?: { message: string; code: string };
}> {
  const payer = await payerService.getPayer(id);

  if (!payer) {
    return {
      success: false,
      error: {
        message: 'Payer not found',
        code: 'PAYER_NOT_FOUND'
      }
    };
  }

  // Get contract summary if available
  const contractSummary = payerService.getContractSummary(id);

  return {
    success: true,
    data: {
      ...payer,
      contractSummary
    }
  };
}

/**
 * Create a new payer
 */
export async function createPayer(input: CreatePayerInput): Promise<{
  success: boolean;
  data?: any;
  error?: { message: string; code: string };
}> {
  try {
    const payer = await payerService.createPayer(input);

    return {
      success: true,
      data: payer
    };
  } catch (error: any) {
    if (error.code === 'P2002') {
      return {
        success: false,
        error: {
          message: 'A payer with this ID already exists',
          code: 'PAYER_EXISTS'
        }
      };
    }
    throw error;
  }
}

/**
 * Update an existing payer
 */
export async function updatePayer(
  id: string,
  updates: UpdatePayerInput
): Promise<{
  success: boolean;
  data?: any;
  error?: { message: string; code: string };
}> {
  try {
    const payer = await payerService.updatePayer(id, updates);

    return {
      success: true,
      data: payer
    };
  } catch (error: any) {
    if (error.code === 'P2025') {
      return {
        success: false,
        error: {
          message: 'Payer not found',
          code: 'PAYER_NOT_FOUND'
        }
      };
    }
    throw error;
  }
}

// ============================================================================
// CONTRACT OPERATIONS
// ============================================================================

/**
 * Get contracts for a payer
 */
export async function getContracts(payerId: string): Promise<{
  success: boolean;
  data: any[];
}> {
  const contracts = await payerService.getContracts(payerId);

  return {
    success: true,
    data: contracts
  };
}

/**
 * Create a contract for a payer
 */
export async function createContract(input: CreateContractInput): Promise<{
  success: boolean;
  data?: any;
  error?: { message: string; code: string };
}> {
  // Validate dates
  const effectiveDate = new Date(input.effectiveDate);
  if (isNaN(effectiveDate.getTime())) {
    return {
      success: false,
      error: {
        message: 'Invalid effective date',
        code: 'INVALID_DATE'
      }
    };
  }

  if (input.termDate) {
    const termDate = new Date(input.termDate);
    if (isNaN(termDate.getTime()) || termDate <= effectiveDate) {
      return {
        success: false,
        error: {
          message: 'Term date must be after effective date',
          code: 'INVALID_DATE'
        }
      };
    }
  }

  // Validate reimbursement type specific fields
  if (input.reimbursementType === 'percent_of_medicare' && !input.percentOfMedicare) {
    return {
      success: false,
      error: {
        message: 'percentOfMedicare is required for percent_of_medicare reimbursement type',
        code: 'MISSING_REQUIRED_FIELD'
      }
    };
  }

  if (input.reimbursementType === 'percent_of_charges' && !input.percentOfCharges) {
    return {
      success: false,
      error: {
        message: 'percentOfCharges is required for percent_of_charges reimbursement type',
        code: 'MISSING_REQUIRED_FIELD'
      }
    };
  }

  const contract = await payerService.createContract(input);

  return {
    success: true,
    data: contract
  };
}

// ============================================================================
// FEE SCHEDULE OPERATIONS
// ============================================================================

/**
 * Import fee schedule from CSV data
 */
export async function importFeeSchedule(input: FeeScheduleImportInput): Promise<{
  success: boolean;
  data?: any;
  error?: { message: string; code: string };
}> {
  if (!input.csvData || !Array.isArray(input.csvData) || input.csvData.length === 0) {
    return {
      success: false,
      error: {
        message: 'CSV data is required and must be a non-empty array',
        code: 'INVALID_DATA'
      }
    };
  }

  const result = await payerService.importFeeSchedule(input);

  return {
    success: true,
    data: result
  };
}

/**
 * Lookup fee for a specific CPT code
 */
export async function lookupFee(
  payerId: string,
  cptCode: string,
  dateOfService: string,
  options?: {
    modifier?: string;
    placeOfService?: string;
  }
): Promise<{
  success: boolean;
  data?: any;
  error?: { message: string; code: string };
}> {
  const dos = new Date(dateOfService);
  if (isNaN(dos.getTime())) {
    return {
      success: false,
      error: {
        message: 'Invalid date of service',
        code: 'INVALID_DATE'
      }
    };
  }

  const fee = await payerService.lookupFee(payerId, cptCode, dos, options);

  if (!fee) {
    return {
      success: true,
      data: {
        found: false,
        payerId,
        cptCode,
        dateOfService: dos,
        message: 'No fee schedule entry found for this CPT code'
      }
    };
  }

  return {
    success: true,
    data: {
      found: true,
      ...fee
    }
  };
}

/**
 * Calculate expected reimbursement for a claim
 */
export async function getExpectedReimbursement(
  payerId: string,
  charges: ClaimCharge[]
): Promise<{
  success: boolean;
  data?: any;
  error?: { message: string; code: string };
}> {
  if (!charges || !Array.isArray(charges) || charges.length === 0) {
    return {
      success: false,
      error: {
        message: 'Charges array is required and must be non-empty',
        code: 'INVALID_DATA'
      }
    };
  }

  // Validate charges
  for (const charge of charges) {
    if (!charge.cptCode) {
      return {
        success: false,
        error: {
          message: 'Each charge must have a cptCode',
          code: 'INVALID_DATA'
        }
      };
    }
    if (typeof charge.billedAmount !== 'number' || charge.billedAmount < 0) {
      return {
        success: false,
        error: {
          message: 'Each charge must have a valid billedAmount',
          code: 'INVALID_DATA'
        }
      };
    }
    if (typeof charge.units !== 'number' || charge.units < 1) {
      return {
        success: false,
        error: {
          message: 'Each charge must have units >= 1',
          code: 'INVALID_DATA'
        }
      };
    }
  }

  const result = await payerService.getExpectedReimbursement(payerId, charges);

  return {
    success: true,
    data: result
  };
}

/**
 * Compare fee schedule to Medicare rates
 */
export function compareFeeScheduleToMedicare(
  payerId: string,
  cptCodes: string[]
): {
  success: boolean;
  data: any[];
} {
  const benchmarks = payerService.compareFeeScheduleToMedicare(payerId, cptCodes);

  return {
    success: true,
    data: benchmarks
  };
}

/**
 * Get fee schedule statistics
 */
export function getFeeScheduleStats(payerId: string): {
  success: boolean;
  data: any;
} {
  const stats = payerService.getFeeScheduleStats(payerId);

  return {
    success: true,
    data: stats
  };
}

// ============================================================================
// AUTHORIZATION REQUIREMENTS
// ============================================================================

/**
 * Get authorization requirements for CPT codes
 */
export async function getAuthRequirements(
  payerId: string,
  cptCodes: string[],
  options?: {
    placeOfService?: string;
    isEmergency?: boolean;
  }
): Promise<{
  success: boolean;
  data: any;
}> {
  const requirements = await payerService.getAuthRequirements(payerId, cptCodes, options);

  // Convert Map to object for JSON serialization
  const result: Record<string, any> = {};
  for (const [code, req] of requirements) {
    result[code] = req;
  }

  return {
    success: true,
    data: {
      payerId,
      requirements: result,
      summary: {
        totalCodes: cptCodes.length,
        requiresAuth: Object.values(result).filter((r: any) => r.requiresAuth).length,
        noAuthRequired: Object.values(result).filter((r: any) => !r.requiresAuth).length
      }
    }
  };
}

/**
 * Set authorization requirement for a CPT code
 */
export async function setAuthRequirement(input: AuthRequirementInput): Promise<{
  success: boolean;
  data?: any;
  error?: { message: string; code: string };
}> {
  if (!input.payerId || !input.cptCode) {
    return {
      success: false,
      error: {
        message: 'payerId and cptCode are required',
        code: 'MISSING_REQUIRED_FIELD'
      }
    };
  }

  const requirement = await payerService.setAuthRequirement(input);

  return {
    success: true,
    data: requirement
  };
}

// ============================================================================
// DEADLINE OPERATIONS
// ============================================================================

/**
 * Get timely filing deadline
 */
export function getTimelyFilingDeadline(
  payerId: string,
  dateOfService: string
): {
  success: boolean;
  data?: any;
  error?: { message: string; code: string };
} {
  const dos = new Date(dateOfService);
  if (isNaN(dos.getTime())) {
    return {
      success: false,
      error: {
        message: 'Invalid date of service',
        code: 'INVALID_DATE'
      }
    };
  }

  const deadline = payerService.getTimelyFilingDeadline(payerId, dos);

  return {
    success: true,
    data: deadline
  };
}

/**
 * Get appeal deadline
 */
export function getAppealDeadline(
  payerId: string,
  denialDate: string,
  appealLevel?: number
): {
  success: boolean;
  data?: any;
  error?: { message: string; code: string };
} {
  const denial = new Date(denialDate);
  if (isNaN(denial.getTime())) {
    return {
      success: false,
      error: {
        message: 'Invalid denial date',
        code: 'INVALID_DATE'
      }
    };
  }

  const deadline = payerService.getAppealDeadline(payerId, denial, appealLevel);

  return {
    success: true,
    data: deadline
  };
}

// ============================================================================
// PAYER CATEGORIES
// ============================================================================

/**
 * Get Medicare payers
 */
export function getMedicarePayers(): {
  success: boolean;
  data: any[];
} {
  const payers = payerService.getMedicarePayers();

  return {
    success: true,
    data: payers
  };
}

/**
 * Get Medicaid payers
 */
export function getMedicaidPayers(): {
  success: boolean;
  data: any[];
} {
  const payers = payerService.getMedicaidPayers();

  return {
    success: true,
    data: payers
  };
}

/**
 * Get BCBS payers
 */
export function getBCBSPayers(): {
  success: boolean;
  data: any[];
} {
  const payers = payerService.getBCBSPayers();

  return {
    success: true,
    data: payers
  };
}

/**
 * Search payers by name or ID
 */
export function searchPayers(term: string): {
  success: boolean;
  data: any[];
} {
  const payers = payerService.searchPayers(term);

  return {
    success: true,
    data: payers
  };
}
