// @ts-nocheck
/**
 * Payer Management Service
 *
 * Business logic for payer and contract management including:
 * - Payer CRUD operations
 * - Contract management
 * - Fee schedule import and lookup
 * - Authorization requirements
 * - Reimbursement calculations
 */

import { prisma } from '../lib/prisma.js';
import {
  // Payer database
  getPayer as getCorePayerById,
  searchPayers as searchCorePayers,
  getPayersByType as getCorePayersByType,
  getAllPayers as getAllCorePayers,
  getMedicarePayers,
  getMedicaidPayers,
  getBCBSPayers,
  type Payer,
  type PayerType,

  // Fee schedule
  lookupFee,
  calculateExpectedPayment as coreCalculateExpectedPayment,
  importFeeSchedule as coreImportFeeSchedule,
  compareToMedicare,
  getFeeScheduleForPayer,
  getFeeScheduleStats,
  addFeeScheduleEntry,
  type ClaimCharge,
  type FeeScheduleCSVRow,

  // Contract terms
  setContractTerms,
  getContractTerms,
  getAllContractsForPayer,
  calculateReimbursement as coreCalculateReimbursement,
  setAuthRequirement,
  checkAuthRequirement,
  getAuthRequirementsForPayer,
  batchCheckAuthRequirements,
  getTimelyFilingDeadline,
  getAppealDeadline,
  getContractSummary,
  type ContractTerms,
  type ReimbursementType,
  type AuthRequirement
} from '@halcyon-rcm/core';

// ============================================================================
// TYPES
// ============================================================================

export interface CreatePayerInput {
  name: string;
  type: PayerType;
  payerId: string;
  electronicPayerId?: string;
  clearinghouseId?: string;
  timelyFilingDays?: number;
  appealDays?: number;
  requiresPriorAuth?: boolean;
  providerPhone?: string;
  providerPortal?: string;
  states?: string[];
  notes?: string;
  organizationId?: string;
}

export interface UpdatePayerInput {
  name?: string;
  type?: PayerType;
  electronicPayerId?: string;
  clearinghouseId?: string;
  timelyFilingDays?: number;
  appealDays?: number;
  requiresPriorAuth?: boolean;
  providerPhone?: string;
  providerPortal?: string;
  states?: string[];
  notes?: string;
  isActive?: boolean;
}

export interface CreateContractInput {
  payerId: string;
  contractName?: string;
  effectiveDate: string;
  termDate?: string;
  reimbursementType: ReimbursementType;
  percentOfMedicare?: number;
  percentOfCharges?: number;
  caseRateAmount?: number;
  perDiemRate?: number;
  drgBaseRate?: number;
  stopLossThreshold?: number;
  stopLossPercentage?: number;
  escalationPercentage?: number;
  notes?: string;
}

export interface FeeScheduleImportInput {
  payerId: string;
  contractId?: string;
  csvData: FeeScheduleCSVRow[];
  effectiveDate?: string;
  updateExisting?: boolean;
}

export interface AuthRequirementInput {
  payerId: string;
  cptCode: string;
  requiresAuth: boolean;
  authValidDays?: number;
  notificationOnly?: boolean;
  turnaroundDays?: number;
  emergencyException?: boolean;
  retroAuthAllowed?: boolean;
  retroAuthDays?: number;
  notes?: string;
}

// ============================================================================
// PAYER SERVICE CLASS
// ============================================================================

export class PayerService {
  /**
   * Create a new payer (stored in database)
   */
  async createPayer(input: CreatePayerInput): Promise<any> {
    const payer = await prisma.payer.create({
      data: {
        payerId: input.payerId,
        name: input.name,
        type: input.type.toUpperCase(),
        electronicPayerId: input.electronicPayerId,
        clearinghouseId: input.clearinghouseId,
        timelyFilingDays: input.timelyFilingDays ?? 90,
        appealDays: input.appealDays ?? 60,
        requiresPriorAuth: input.requiresPriorAuth ?? false,
        providerPhone: input.providerPhone,
        providerPortal: input.providerPortal,
        states: input.states ?? [],
        notes: input.notes,
        organizationId: input.organizationId,
        isActive: true
      }
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: 'PAYER_CREATED',
        entityType: 'Payer',
        entityId: payer.id,
        details: {
          payerId: input.payerId,
          name: input.name
        }
      }
    });

    return payer;
  }

  /**
   * Update an existing payer
   */
  async updatePayer(id: string, updates: UpdatePayerInput): Promise<any> {
    const payer = await prisma.payer.update({
      where: { id },
      data: {
        ...updates,
        type: updates.type?.toUpperCase(),
        updatedAt: new Date()
      }
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: 'PAYER_UPDATED',
        entityType: 'Payer',
        entityId: id,
        details: updates
      }
    });

    return payer;
  }

  /**
   * Get payer by ID - checks both database and built-in database
   */
  async getPayer(id: string): Promise<any | null> {
    // First check database
    const dbPayer = await prisma.payer.findUnique({
      where: { id },
      include: {
        contracts: true
      }
    });

    if (dbPayer) return dbPayer;

    // Check by payerId field
    const dbPayerByPayerId = await prisma.payer.findFirst({
      where: { payerId: id },
      include: {
        contracts: true
      }
    });

    if (dbPayerByPayerId) return dbPayerByPayerId;

    // Fall back to built-in payer database
    const corePayer = getCorePayerById(id);
    if (corePayer) {
      return {
        ...corePayer,
        isBuiltIn: true,
        timelyFilingDays: corePayer.requirements.timelyFilingDays,
        appealDays: corePayer.requirements.appealDeadline,
        requiresPriorAuth: corePayer.requirements.requiresPriorAuth
      };
    }

    return null;
  }

  /**
   * List all payers (database + built-in)
   */
  async listPayers(options?: {
    type?: PayerType;
    state?: string;
    search?: string;
    includeBuiltIn?: boolean;
    includeInactive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{
    payers: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 50;
    const skip = (page - 1) * limit;

    // Build database query
    const where: any = {};
    if (options?.type) {
      where.type = options.type.toUpperCase();
    }
    if (options?.state) {
      where.states = { has: options.state };
    }
    if (options?.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { payerId: { contains: options.search, mode: 'insensitive' } }
      ];
    }
    if (!options?.includeInactive) {
      where.isActive = true;
    }

    // Get database payers
    const [dbPayers, dbCount] = await Promise.all([
      prisma.payer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' }
      }),
      prisma.payer.count({ where })
    ]);

    let allPayers = dbPayers;
    let totalCount = dbCount;

    // Include built-in payers if requested
    if (options?.includeBuiltIn !== false) {
      let corePayers = getAllCorePayers();

      if (options?.type) {
        corePayers = getCorePayersByType(options.type);
      }
      if (options?.search) {
        corePayers = searchCorePayers(options.search);
      }

      // Convert core payers to compatible format
      const formattedCorePayers = corePayers.map(p => ({
        ...p,
        isBuiltIn: true,
        timelyFilingDays: p.requirements.timelyFilingDays,
        appealDays: p.requirements.appealDeadline,
        requiresPriorAuth: p.requirements.requiresPriorAuth
      }));

      // Filter out any built-in payers that exist in database
      const dbPayerIds = new Set(dbPayers.map(p => p.payerId));
      const uniqueCorePayers = formattedCorePayers.filter(p => !dbPayerIds.has(p.id));

      allPayers = [...dbPayers, ...uniqueCorePayers.slice(skip, skip + limit)];
      totalCount = dbCount + uniqueCorePayers.length;
    }

    return {
      payers: allPayers,
      total: totalCount,
      page,
      limit
    };
  }

  /**
   * Create a contract for a payer
   */
  async createContract(input: CreateContractInput): Promise<any> {
    // Create in database
    const contract = await prisma.contract.create({
      data: {
        payerId: input.payerId,
        contractName: input.contractName,
        effectiveDate: new Date(input.effectiveDate),
        termDate: input.termDate ? new Date(input.termDate) : null,
        reimbursementType: input.reimbursementType,
        percentOfMedicare: input.percentOfMedicare,
        percentOfCharges: input.percentOfCharges,
        caseRateAmount: input.caseRateAmount,
        perDiemRate: input.perDiemRate,
        drgBaseRate: input.drgBaseRate,
        stopLossThreshold: input.stopLossThreshold,
        stopLossPercentage: input.stopLossPercentage,
        escalationPercentage: input.escalationPercentage,
        notes: input.notes,
        status: 'ACTIVE'
      }
    });

    // Also set in core engine for calculations
    setContractTerms({
      id: contract.id,
      payerId: input.payerId,
      contractName: input.contractName,
      effectiveDate: new Date(input.effectiveDate),
      termDate: input.termDate ? new Date(input.termDate) : undefined,
      status: 'active',
      reimbursementType: input.reimbursementType,
      percentOfMedicare: input.percentOfMedicare,
      percentOfCharges: input.percentOfCharges,
      caseRateAmount: input.caseRateAmount,
      perDiemRate: input.perDiemRate,
      drgBaseRate: input.drgBaseRate,
      stopLossThreshold: input.stopLossThreshold,
      stopLossPercentage: input.stopLossPercentage,
      escalationPercentage: input.escalationPercentage,
      notes: input.notes
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: 'CONTRACT_CREATED',
        entityType: 'Contract',
        entityId: contract.id,
        details: {
          payerId: input.payerId,
          reimbursementType: input.reimbursementType
        }
      }
    });

    return contract;
  }

  /**
   * Get contracts for a payer
   */
  async getContracts(payerId: string): Promise<any[]> {
    const contracts = await prisma.contract.findMany({
      where: { payerId },
      include: {
        feeScheduleEntries: {
          take: 10
        }
      },
      orderBy: { effectiveDate: 'desc' }
    });

    return contracts;
  }

  /**
   * Import fee schedule for a payer
   */
  async importFeeSchedule(input: FeeScheduleImportInput): Promise<any> {
    const result = coreImportFeeSchedule(
      input.payerId,
      input.csvData,
      {
        contractId: input.contractId,
        defaultEffectiveDate: input.effectiveDate ? new Date(input.effectiveDate) : undefined,
        updateExisting: input.updateExisting
      }
    );

    // Store in database if contract ID provided
    if (input.contractId && result.importedCount > 0) {
      const entries = input.csvData
        .filter(row => row.cptCode && row.allowedAmount)
        .map(row => ({
          contractId: input.contractId!,
          cptCode: row.cptCode,
          modifier: row.modifier || null,
          allowedAmount: parseFloat(row.allowedAmount.replace(/[$,]/g, '')),
          nonFacilityRate: row.nonFacilityRate ? parseFloat(row.nonFacilityRate.replace(/[$,]/g, '')) : null,
          facilityRate: row.facilityRate ? parseFloat(row.facilityRate.replace(/[$,]/g, '')) : null,
          effectiveDate: row.effectiveDate ? new Date(row.effectiveDate) : new Date(),
          terminationDate: row.terminationDate ? new Date(row.terminationDate) : null
        }));

      await prisma.feeScheduleEntry.createMany({
        data: entries,
        skipDuplicates: true
      });
    }

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: 'FEE_SCHEDULE_IMPORTED',
        entityType: 'FeeSchedule',
        entityId: input.payerId,
        details: {
          payerId: input.payerId,
          importedCount: result.importedCount,
          errorCount: result.errors.length
        }
      }
    });

    return result;
  }

  /**
   * Lookup fee for a CPT code
   */
  async lookupFee(
    payerId: string,
    cptCode: string,
    dateOfService: Date,
    options?: {
      modifier?: string;
      placeOfService?: string;
    }
  ): Promise<any | null> {
    // Check database first
    const dbEntry = await prisma.feeScheduleEntry.findFirst({
      where: {
        contract: { payerId },
        cptCode,
        modifier: options?.modifier || null,
        effectiveDate: { lte: dateOfService },
        OR: [
          { terminationDate: null },
          { terminationDate: { gte: dateOfService } }
        ]
      },
      include: {
        contract: true
      },
      orderBy: { effectiveDate: 'desc' }
    });

    if (dbEntry) {
      return {
        cptCode: dbEntry.cptCode,
        allowedAmount: Number(dbEntry.allowedAmount),
        modifier: dbEntry.modifier,
        effectiveDate: dbEntry.effectiveDate,
        terminationDate: dbEntry.terminationDate,
        source: 'database',
        contractName: dbEntry.contract.contractName
      };
    }

    // Fall back to core engine
    const coreEntry = lookupFee(payerId, cptCode, dateOfService, options);
    if (coreEntry) {
      return {
        ...coreEntry,
        source: 'engine'
      };
    }

    return null;
  }

  /**
   * Calculate expected reimbursement
   */
  async getExpectedReimbursement(
    payerId: string,
    charges: ClaimCharge[]
  ): Promise<any> {
    // Use core engine for calculation
    const result = coreCalculateExpectedPayment(payerId, charges);

    return {
      ...result,
      calculatedAt: new Date()
    };
  }

  /**
   * Calculate reimbursement based on contract terms
   */
  async calculateContractReimbursement(
    payerId: string,
    charges: Array<{
      cptCode: string;
      billedAmount: number;
      units: number;
      serviceCategory?: string;
    }>,
    serviceDate?: Date
  ): Promise<any> {
    const result = coreCalculateReimbursement(payerId, charges as any, serviceDate);

    return {
      ...result,
      calculatedAt: new Date()
    };
  }

  /**
   * Get authorization requirements for CPT codes
   */
  async getAuthRequirements(
    payerId: string,
    cptCodes: string[],
    options?: {
      placeOfService?: string;
      isEmergency?: boolean;
    }
  ): Promise<Map<string, any>> {
    // Check database first
    const dbRequirements = await prisma.authRequirement.findMany({
      where: {
        payerId,
        cptCode: { in: cptCodes }
      }
    });

    const results = new Map<string, any>();

    // Add database results
    for (const req of dbRequirements) {
      results.set(req.cptCode, {
        requiresAuth: req.requiresAuth,
        authValidDays: req.authValidDays,
        notificationOnly: req.notificationOnly,
        emergencyException: req.emergencyException,
        retroAuthAllowed: req.retroAuthAllowed,
        retroAuthDays: req.retroAuthDays,
        source: 'database'
      });
    }

    // Fill in missing with core engine
    const missingCodes = cptCodes.filter(code => !results.has(code));
    if (missingCodes.length > 0) {
      const coreResults = batchCheckAuthRequirements(payerId, missingCodes, options);
      for (const [code, result] of coreResults) {
        if (!results.has(code)) {
          results.set(code, {
            ...result,
            source: 'engine'
          });
        }
      }
    }

    return results;
  }

  /**
   * Set authorization requirement
   */
  async setAuthRequirement(input: AuthRequirementInput): Promise<any> {
    const requirement = await prisma.authRequirement.upsert({
      where: {
        payerId_cptCode: {
          payerId: input.payerId,
          cptCode: input.cptCode
        }
      },
      create: {
        payerId: input.payerId,
        cptCode: input.cptCode,
        requiresAuth: input.requiresAuth,
        authValidDays: input.authValidDays,
        notificationOnly: input.notificationOnly,
        turnaroundDays: input.turnaroundDays,
        emergencyException: input.emergencyException,
        retroAuthAllowed: input.retroAuthAllowed,
        retroAuthDays: input.retroAuthDays,
        notes: input.notes
      },
      update: {
        requiresAuth: input.requiresAuth,
        authValidDays: input.authValidDays,
        notificationOnly: input.notificationOnly,
        turnaroundDays: input.turnaroundDays,
        emergencyException: input.emergencyException,
        retroAuthAllowed: input.retroAuthAllowed,
        retroAuthDays: input.retroAuthDays,
        notes: input.notes,
        updatedAt: new Date()
      }
    });

    // Also set in core engine
    setAuthRequirement({
      payerId: input.payerId,
      cptCode: input.cptCode,
      requiresAuth: input.requiresAuth,
      authValidDays: input.authValidDays,
      notificationOnly: input.notificationOnly,
      turnaroundDays: input.turnaroundDays,
      emergencyException: input.emergencyException,
      retroAuthAllowed: input.retroAuthAllowed,
      retroAuthDays: input.retroAuthDays,
      notes: input.notes
    });

    return requirement;
  }

  /**
   * Get timely filing deadline
   */
  getTimelyFilingDeadline(payerId: string, dateOfService: Date): any {
    return getTimelyFilingDeadline(payerId, dateOfService);
  }

  /**
   * Get appeal deadline
   */
  getAppealDeadline(payerId: string, denialDate: Date, appealLevel?: number): any {
    return getAppealDeadline(payerId, denialDate, appealLevel);
  }

  /**
   * Compare payer rates to Medicare
   */
  compareFeeScheduleToMedicare(payerId: string, cptCodes: string[]): any[] {
    return compareToMedicare(payerId, cptCodes);
  }

  /**
   * Get contract summary
   */
  getContractSummary(payerId: string): any {
    return getContractSummary(payerId);
  }

  /**
   * Get fee schedule statistics
   */
  getFeeScheduleStats(payerId: string): any {
    return getFeeScheduleStats(payerId);
  }

  /**
   * Get Medicare payers
   */
  getMedicarePayers(): Payer[] {
    return getMedicarePayers();
  }

  /**
   * Get Medicaid payers
   */
  getMedicaidPayers(): Payer[] {
    return getMedicaidPayers();
  }

  /**
   * Get BCBS payers
   */
  getBCBSPayers(): Payer[] {
    return getBCBSPayers();
  }

  /**
   * Search payers
   */
  searchPayers(term: string): Payer[] {
    return searchCorePayers(term);
  }
}

// Export singleton instance
export const payerService = new PayerService();
