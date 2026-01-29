// @ts-nocheck
/**
 * Payment Posting Service
 * Handles ERA 835 import, payment posting, and reconciliation
 */

import { prisma } from '../lib/prisma.js';
import {
  parse835File,
  validate835File,
  PaymentMatcher,
  type PaymentRemittance,
  type ClaimPayment,
  type PaymentMatchResult,
  type WriteOffRecommendation,
  type PaymentVariance,
  type RemittanceStatus,
  type PostingResult,
  type ReconciliationResult,
  type SystemClaim,
  type SystemPatient,
} from '@halcyon-rcm/core';

// ============================================================================
// TYPES
// ============================================================================

export interface ImportERAResult {
  success: boolean;
  remittanceId?: string;
  checkNumber?: string;
  payerName?: string;
  totalAmount?: number;
  claimCount?: number;
  errors?: string[];
  warnings?: string[];
}

export interface PostPaymentInput {
  remittanceId: string;
  claimId: string;
  eraClaimNumber: string;
  amount: number;
  adjustments?: Array<{
    groupCode: string;
    reasonCode: string;
    amount: number;
  }>;
  postedBy: string;
}

export interface WriteOffInput {
  claimId: string;
  amount: number;
  reason: string;
  carcCode?: string;
  approvedBy?: string;
}

export interface UnmatchedPayment {
  eraClaimNumber: string;
  patientName: string;
  billedAmount: number;
  paidAmount: number;
  status: string;
  suggestedActions: string[];
}

export interface ReconciliationInput {
  depositId: string;
  depositAmount: number;
  depositDate: Date;
  remittanceIds: string[];
  notes?: string;
}

// ============================================================================
// PAYMENT POSTING SERVICE
// ============================================================================

class PaymentPostingService {
  private matcher: PaymentMatcher;

  constructor() {
    this.matcher = new PaymentMatcher();
  }

  /**
   * Import and parse an ERA 835 file
   */
  async importERA(
    fileContent: string,
    fileName?: string,
    userId?: string,
    organizationId?: string
  ): Promise<ImportERAResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate the file first
      const validationErrors = validate835File(fileContent);
      if (validationErrors.length > 0) {
        return {
          success: false,
          errors: validationErrors,
        };
      }

      // Parse the 835 file
      const remittance = parse835File(fileContent);

      // Check for duplicate import (same check number and payer)
      // TENANT ISOLATION: Also filter by organizationId to prevent cross-tenant duplicate detection
      const existingRemittance = await prisma.paymentRemittance.findFirst({
        where: {
          checkNumber: remittance.traceNumber.traceNumber,
          payerName: remittance.payer.name,
          ...(organizationId ? { organizationId } : {}),
        },
      });

      if (existingRemittance) {
        warnings.push(`Remittance may be duplicate: check ${remittance.traceNumber.traceNumber} from ${remittance.payer.name} already exists`);
      }

      // Store the remittance
      const storedRemittance = await prisma.paymentRemittance.create({
        data: {
          fileContent: fileContent,
          fileName: fileName || 'unnamed.835',
          payerName: remittance.payer.name,
          payerId: remittance.payer.id,
          payeeName: remittance.payee.name,
          payeeId: remittance.payee.id,
          checkNumber: remittance.traceNumber.traceNumber,
          checkDate: remittance.financialInfo.effectiveDate
            ? new Date(
                parseInt(remittance.financialInfo.effectiveDate.substring(0, 4)),
                parseInt(remittance.financialInfo.effectiveDate.substring(4, 6)) - 1,
                parseInt(remittance.financialInfo.effectiveDate.substring(6, 8))
              )
            : new Date(),
          totalAmount: remittance.financialInfo.totalAmount,
          paymentMethod: remittance.financialInfo.paymentMethod,
          status: 'PENDING',
          claimCount: remittance.claims.length,
          paidClaimCount: remittance.summary.paidClaims,
          deniedClaimCount: remittance.summary.deniedClaims,
          totalBilled: remittance.summary.totalBilled,
          totalPaid: remittance.summary.totalPaid,
          totalAdjustments: remittance.summary.totalAdjustments,
          totalPatientResponsibility: remittance.summary.totalPatientResponsibility,
          providerAdjustments: remittance.summary.providerAdjustmentsTotal,
          parsedData: remittance as any,
          importedBy: userId,
          organizationId: organizationId,
          importedAt: new Date(),
        },
      });

      // Create individual claim payment records
      for (const claim of remittance.claims) {
        await this.createClaimPaymentRecord(storedRemittance.id, claim);
      }

      return {
        success: true,
        remittanceId: storedRemittance.id,
        checkNumber: remittance.traceNumber.traceNumber,
        payerName: remittance.payer.name,
        totalAmount: remittance.financialInfo.totalAmount,
        claimCount: remittance.claims.length,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      console.error('ERA import error:', error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error during ERA import'],
      };
    }
  }

  /**
   * Create a claim payment record from ERA data
   */
  private async createClaimPaymentRecord(
    remittanceId: string,
    claim: ClaimPayment
  ): Promise<void> {
    // Try to find matching claim in system
    const systemClaim = await prisma.claim.findFirst({
      where: {
        OR: [
          { claimNumber: claim.claimNumber },
          { claimNumber: claim.payerClaimControlNumber || '' },
        ],
      },
    });

    await prisma.claimPayment.create({
      data: {
        remittanceId,
        eraClaimNumber: claim.claimNumber,
        payerClaimNumber: claim.payerClaimControlNumber,
        claimId: systemClaim?.id,
        matchStatus: systemClaim ? 'MATCHED' : 'UNMATCHED',
        matchConfidence: systemClaim ? 'HIGH' : 'LOW',
        patientLastName: claim.patient.lastName,
        patientFirstName: claim.patient.firstName,
        patientId: claim.patient.id,
        claimStatus: claim.status,
        statusDescription: claim.statusDescription,
        billedAmount: claim.billedAmount,
        paidAmount: claim.paidAmount,
        patientResponsibility: claim.patientResponsibility,
        adjustmentsData: claim.adjustments as any,
        servicesData: claim.services as any,
        referencesData: claim.references as any,
        datesData: claim.dates as any,
        isDenied: claim.status === '4',
        isPosted: false,
      },
    });
  }

  /**
   * Post a single payment to a claim
   */
  async postPayment(input: PostPaymentInput): Promise<PostingResult> {
    const warnings: string[] = [];

    try {
      // Get the claim payment record
      const claimPayment = await prisma.claimPayment.findFirst({
        where: {
          remittanceId: input.remittanceId,
          eraClaimNumber: input.eraClaimNumber,
        },
        include: {
          remittance: true,
        },
      });

      if (!claimPayment) {
        return {
          success: false,
          error: 'Claim payment record not found',
          warnings: [],
          amountPosted: 0,
          adjustmentsPosted: [],
          writeOffsCreated: [],
        };
      }

      if (claimPayment.isPosted) {
        return {
          success: false,
          error: 'Payment already posted',
          warnings: [],
          amountPosted: 0,
          adjustmentsPosted: [],
          writeOffsCreated: [],
        };
      }

      // Get or verify the target claim
      const targetClaim = await prisma.claim.findUnique({
        where: { id: input.claimId },
      });

      if (!targetClaim) {
        return {
          success: false,
          error: 'Target claim not found',
          warnings: [],
          amountPosted: 0,
          adjustmentsPosted: [],
          writeOffsCreated: [],
        };
      }

      // Create the payment record
      const payment = await prisma.payment.create({
        data: {
          remittanceId: input.remittanceId,
          claimId: input.claimId,
          claimPaymentId: claimPayment.id,
          amount: input.amount,
          adjustmentsData: input.adjustments as any,
          postedBy: input.postedBy,
          postedAt: new Date(),
        },
      });

      // Update the claim payment record
      await prisma.claimPayment.update({
        where: { id: claimPayment.id },
        data: {
          claimId: input.claimId,
          matchStatus: 'MATCHED',
          isPosted: true,
          postedAt: new Date(),
          postedBy: input.postedBy,
        },
      });

      // Update the system claim
      await prisma.claim.update({
        where: { id: input.claimId },
        data: {
          paidAmount: {
            increment: input.amount,
          },
          status: input.amount > 0 ? 'PAID' : targetClaim.status,
        },
      });

      // Update remittance status
      await this.updateRemittanceStatus(input.remittanceId);

      // Process write-offs for adjustments
      const writeOffsCreated: WriteOffRecommendation[] = [];
      if (input.adjustments) {
        for (const adj of input.adjustments) {
          // Create write-off record for contractual adjustments
          if (adj.groupCode === 'CO' && adj.amount > 0) {
            await prisma.writeOff.create({
              data: {
                claimId: input.claimId,
                paymentId: payment.id,
                amount: adj.amount,
                reason: `CARC ${adj.reasonCode}`,
                carcCode: adj.reasonCode,
                groupCode: adj.groupCode,
                autoPosted: true,
                createdAt: new Date(),
              },
            });
          }
        }
      }

      return {
        success: true,
        paymentId: payment.id,
        warnings,
        amountPosted: input.amount,
        adjustmentsPosted: (input.adjustments || []).map(a => ({
          groupCode: a.groupCode as any,
          reasonCode: a.reasonCode,
          amount: a.amount,
        })),
        writeOffsCreated,
      };
    } catch (error) {
      console.error('Post payment error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        warnings: [],
        amountPosted: 0,
        adjustmentsPosted: [],
        writeOffsCreated: [],
      };
    }
  }

  /**
   * Auto-post all eligible payments in a remittance
   * IMPORTANT: Requires organizationId for tenant isolation
   */
  async autoPostPayments(
    remittanceId: string,
    postedBy: string,
    organizationId?: string
  ): Promise<{
    success: boolean;
    posted: number;
    failed: number;
    skipped: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let posted = 0;
    let failed = 0;
    let skipped = 0;

    try {
      // Verify remittance belongs to organization
      if (organizationId) {
        const remittance = await prisma.paymentRemittance.findUnique({
          where: { id: remittanceId },
          select: { organizationId: true }
        });
        if (!remittance || remittance.organizationId !== organizationId) {
          return {
            success: false,
            posted: 0,
            failed: 0,
            skipped: 0,
            errors: ['Remittance not found or access denied']
          };
        }
      }

      // Get all unposted claim payments for this remittance
      const claimPayments = await prisma.claimPayment.findMany({
        where: {
          remittanceId,
          isPosted: false,
        },
      });

      // Get all system claims for matching (filtered by organization)
      const systemClaims = await this.getSystemClaimsForMatching(organizationId);

      for (const cp of claimPayments) {
        // Skip denied claims
        if (cp.isDenied) {
          skipped++;
          continue;
        }

        // Find matching claim
        let matchedClaimId = cp.claimId;

        if (!matchedClaimId) {
          // Try to match
          const eraPayment: ClaimPayment = {
            claimNumber: cp.eraClaimNumber,
            status: cp.claimStatus as any,
            statusDescription: cp.statusDescription || '',
            billedAmount: cp.billedAmount.toNumber(),
            paidAmount: cp.paidAmount.toNumber(),
            patientResponsibility: cp.patientResponsibility.toNumber(),
            patient: {
              lastName: cp.patientLastName || '',
              firstName: cp.patientFirstName || undefined,
              id: cp.patientId || undefined,
            },
            adjustments: (cp.adjustmentsData as any[]) || [],
            services: (cp.servicesData as any[]) || [],
            references: (cp.referencesData as any[]) || [],
            dates: (cp.datesData as any[]) || [],
            amounts: [],
            quantities: [],
          };

          const matchResult = this.matcher.matchPaymentToClaim(eraPayment, systemClaims);

          if (!matchResult.matchedClaimId || matchResult.confidence === 'LOW') {
            skipped++;
            continue;
          }

          if (!this.matcher.canAutoPost(eraPayment, matchResult)) {
            skipped++;
            continue;
          }

          matchedClaimId = matchResult.matchedClaimId;
        }

        // Post the payment
        const result = await this.postPayment({
          remittanceId,
          claimId: matchedClaimId,
          eraClaimNumber: cp.eraClaimNumber,
          amount: cp.paidAmount.toNumber(),
          adjustments: (cp.adjustmentsData as any[])?.map(a => ({
            groupCode: a.groupCode,
            reasonCode: a.reasonCode,
            amount: a.amount,
          })),
          postedBy,
        });

        if (result.success) {
          posted++;
        } else {
          failed++;
          errors.push(`Claim ${cp.eraClaimNumber}: ${result.error}`);
        }
      }

      return {
        success: failed === 0,
        posted,
        failed,
        skipped,
        errors,
      };
    } catch (error) {
      console.error('Auto-post error:', error);
      return {
        success: false,
        posted,
        failed,
        skipped,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Get unmatched payments for a remittance
   * IMPORTANT: Requires organizationId for tenant isolation
   */
  async reviewUnmatched(remittanceId: string, organizationId?: string): Promise<UnmatchedPayment[]> {
    // First verify remittance belongs to organization
    if (organizationId) {
      const remittance = await prisma.paymentRemittance.findUnique({
        where: { id: remittanceId },
        select: { organizationId: true }
      });
      if (!remittance || remittance.organizationId !== organizationId) {
        return []; // Return empty instead of exposing cross-tenant data
      }
    }

    const claimPayments = await prisma.claimPayment.findMany({
      where: {
        remittanceId,
        OR: [
          { matchStatus: 'UNMATCHED' },
          { claimId: null },
        ],
      },
    });

    return claimPayments.map(cp => ({
      eraClaimNumber: cp.eraClaimNumber,
      patientName: `${cp.patientLastName || ''}, ${cp.patientFirstName || ''}`.trim(),
      billedAmount: cp.billedAmount.toNumber(),
      paidAmount: cp.paidAmount.toNumber(),
      status: cp.statusDescription || cp.claimStatus,
      suggestedActions: cp.isDenied
        ? ['Review denial - CARC codes available', 'Consider appeal if appropriate']
        : ['Search for claim manually', 'Verify patient registration'],
    }));
  }

  /**
   * Create a write-off for a claim
   */
  async createWriteOff(input: WriteOffInput): Promise<{
    success: boolean;
    writeOffId?: string;
    error?: string;
  }> {
    try {
      // Verify claim exists
      const claim = await prisma.claim.findUnique({
        where: { id: input.claimId },
      });

      if (!claim) {
        return {
          success: false,
          error: 'Claim not found',
        };
      }

      // Create write-off
      const writeOff = await prisma.writeOff.create({
        data: {
          claimId: input.claimId,
          amount: input.amount,
          reason: input.reason,
          carcCode: input.carcCode,
          approvedBy: input.approvedBy,
          approvedAt: input.approvedBy ? new Date() : null,
          createdAt: new Date(),
        },
      });

      // Update claim balance
      await prisma.claim.update({
        where: { id: input.claimId },
        data: {
          // Assuming there's a writeOffAmount field or similar
          status: claim.billedAmount.toNumber() <= (claim.paidAmount?.toNumber() || 0) + input.amount
            ? 'PAID'
            : claim.status,
        },
      });

      return {
        success: true,
        writeOffId: writeOff.id,
      };
    } catch (error) {
      console.error('Create write-off error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Reconcile remittances with a bank deposit
   */
  async reconcileDeposit(input: ReconciliationInput): Promise<ReconciliationResult> {
    const matchedRemittances: string[] = [];
    const unmatchedRemittances: string[] = [];
    const notes: string[] = [];

    try {
      // Get all specified remittances
      const remittances = await prisma.paymentRemittance.findMany({
        where: {
          id: { in: input.remittanceIds },
        },
      });

      // Calculate total from remittances
      let matchedAmount = 0;
      for (const rem of remittances) {
        matchedAmount += rem.totalAmount.toNumber();
        matchedRemittances.push(rem.id);
      }

      // Calculate variance
      const variance = input.depositAmount - matchedAmount;
      const isReconciled = Math.abs(variance) < 0.01;

      if (!isReconciled) {
        notes.push(`Variance of $${variance.toFixed(2)} detected`);
        if (variance > 0) {
          notes.push('Deposit amount exceeds remittance total - check for missing remittances');
        } else {
          notes.push('Remittance total exceeds deposit - verify all remittances are for this deposit');
        }
      }

      // Create reconciliation record
      const reconciliation = await prisma.depositReconciliation.create({
        data: {
          depositId: input.depositId,
          depositAmount: input.depositAmount,
          depositDate: input.depositDate,
          matchedAmount,
          variance,
          isReconciled,
          notes: input.notes,
          reconciledAt: new Date(),
        },
      });

      // Update remittances with reconciliation
      await prisma.paymentRemittance.updateMany({
        where: {
          id: { in: input.remittanceIds },
        },
        data: {
          status: 'RECONCILED',
          depositId: input.depositId,
          reconciledAt: new Date(),
        },
      });

      return {
        depositId: input.depositId,
        depositAmount: input.depositAmount,
        matchedAmount,
        variance,
        isReconciled,
        matchedRemittances,
        unmatchedRemittances,
        notes,
      };
    } catch (error) {
      console.error('Reconciliation error:', error);
      return {
        depositId: input.depositId,
        depositAmount: input.depositAmount,
        matchedAmount: 0,
        variance: input.depositAmount,
        isReconciled: false,
        matchedRemittances: [],
        unmatchedRemittances: input.remittanceIds,
        notes: [error instanceof Error ? error.message : 'Reconciliation failed'],
      };
    }
  }

  /**
   * Get remittance by ID with full details
   * IMPORTANT: Requires organizationId for tenant isolation
   */
  async getRemittance(remittanceId: string, organizationId?: string) {
    const remittance = await prisma.paymentRemittance.findUnique({
      where: { id: remittanceId },
      include: {
        claimPayments: true,
        payments: true,
      },
    });

    // Verify tenant ownership if organizationId provided
    if (organizationId && remittance?.organizationId !== organizationId) {
      return null; // Return null instead of exposing cross-tenant data
    }

    return remittance;
  }

  /**
   * List remittances with optional filtering
   */
  async listRemittances(options: {
    status?: RemittanceStatus;
    payerName?: string;
    fromDate?: Date;
    toDate?: Date;
    organizationId?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (options.status) {
      where.status = options.status;
    }
    if (options.payerName) {
      where.payerName = { contains: options.payerName, mode: 'insensitive' };
    }
    if (options.fromDate || options.toDate) {
      where.checkDate = {};
      if (options.fromDate) where.checkDate.gte = options.fromDate;
      if (options.toDate) where.checkDate.lte = options.toDate;
    }
    if (options.organizationId) {
      where.organizationId = options.organizationId;
    }

    const [remittances, total] = await Promise.all([
      prisma.paymentRemittance.findMany({
        where,
        orderBy: { importedAt: 'desc' },
        take: options.limit || 50,
        skip: options.offset || 0,
        include: {
          _count: {
            select: { claimPayments: true, payments: true },
          },
        },
      }),
      prisma.paymentRemittance.count({ where }),
    ]);

    return {
      remittances,
      total,
      limit: options.limit || 50,
      offset: options.offset || 0,
    };
  }

  /**
   * Get reconciliation report
   */
  async getReconciliationReport(options: {
    fromDate?: Date;
    toDate?: Date;
    organizationId?: string;
  }) {
    const where: any = {};

    if (options.fromDate || options.toDate) {
      where.checkDate = {};
      if (options.fromDate) where.checkDate.gte = options.fromDate;
      if (options.toDate) where.checkDate.lte = options.toDate;
    }
    if (options.organizationId) {
      where.organizationId = options.organizationId;
    }

    // Get all remittances in period
    const remittances = await prisma.paymentRemittance.findMany({
      where,
      orderBy: { checkDate: 'asc' },
    });

    // Calculate totals
    const totals = {
      totalRemittances: remittances.length,
      totalAmount: 0,
      reconciledAmount: 0,
      unreconciledAmount: 0,
      reconciledCount: 0,
      pendingCount: 0,
      postedCount: 0,
    };

    for (const rem of remittances) {
      totals.totalAmount += rem.totalAmount.toNumber();

      if (rem.status === 'RECONCILED') {
        totals.reconciledAmount += rem.totalAmount.toNumber();
        totals.reconciledCount++;
      } else {
        totals.unreconciledAmount += rem.totalAmount.toNumber();
      }

      if (rem.status === 'PENDING') {
        totals.pendingCount++;
      } else if (rem.status === 'POSTED') {
        totals.postedCount++;
      }
    }

    // Get unreconciled remittances
    const unreconciledRemittances = remittances.filter(r => r.status !== 'RECONCILED');

    return {
      totals,
      remittances: remittances.map(r => ({
        id: r.id,
        checkNumber: r.checkNumber,
        checkDate: r.checkDate,
        payerName: r.payerName,
        amount: r.totalAmount.toNumber(),
        status: r.status,
        isReconciled: r.status === 'RECONCILED',
        depositId: r.depositId,
      })),
      unreconciledRemittances: unreconciledRemittances.map(r => ({
        id: r.id,
        checkNumber: r.checkNumber,
        amount: r.totalAmount.toNumber(),
        payerName: r.payerName,
        daysPending: Math.floor((Date.now() - r.importedAt.getTime()) / (1000 * 60 * 60 * 24)),
      })),
    };
  }

  /**
   * Update remittance status based on claim payments
   */
  private async updateRemittanceStatus(remittanceId: string): Promise<void> {
    const claimPayments = await prisma.claimPayment.findMany({
      where: { remittanceId },
    });

    const totalClaims = claimPayments.length;
    const postedClaims = claimPayments.filter(cp => cp.isPosted).length;

    let status: RemittanceStatus;
    if (postedClaims === 0) {
      status = 'PENDING';
    } else if (postedClaims === totalClaims) {
      status = 'POSTED';
    } else {
      status = 'PARTIAL';
    }

    await prisma.paymentRemittance.update({
      where: { id: remittanceId },
      data: { status },
    });
  }

  /**
   * Get system claims formatted for matching
   * IMPORTANT: Requires organizationId for tenant isolation
   */
  private async getSystemClaimsForMatching(organizationId?: string): Promise<SystemClaim[]> {
    const whereClause: any = {
      status: { not: 'PAID' },
    };

    // TENANT ISOLATION: Filter by organization
    if (organizationId) {
      whereClause.account = {
        assessment: { organizationId }
      };
    }

    const claims = await prisma.claim.findMany({
      where: whereClause,
      include: {
        account: {
          include: {
            assessment: true,
          },
        },
      },
    });

    return claims.map(c => ({
      id: c.id,
      claimNumber: c.claimNumber || '',
      patientId: c.account?.assessment?.id || '',
      patientFirstName: c.account?.assessment?.patientFirstName || undefined,
      patientLastName: c.account?.assessment?.patientLastName || undefined,
      patientDob: c.account?.assessment?.patientDob || undefined,
      billedAmount: c.billedAmount.toNumber(),
      expectedPayment: c.allowedAmount?.toNumber(),
      dateOfService: c.submittedDate || undefined,
      status: c.status,
    }));
  }
}

// Export singleton instance
export const paymentPostingService = new PaymentPostingService();

// Export class for testing
export { PaymentPostingService };
