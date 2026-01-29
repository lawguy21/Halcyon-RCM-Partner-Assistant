// @ts-nocheck
/**
 * Denial Management Controller
 * Business logic for claims denial analysis and appeals
 */

import {
  analyzeDenial,
  getAllCARCCodes,
  getCARCCodesByCategory,
  isDenialAppealable,
  calculateBatchRecoveryPotential,
  type DenialInput
} from '@halcyon-rcm/core';
import { prisma } from '../lib/prisma.js';
import {
  getCARCCode,
  getRARCCode,
  categorizedenial,
  type CARCCategory
} from '@halcyon-rcm/core';

export interface DenialRecordInput {
  claimId: string;
  carcCode: string;
  rarcCode?: string;
  deniedAmount: number;
  denialDate: string;
  preventable?: boolean;
  rootCause?: string;
}

export interface DenialAnalytics {
  totalDenials: number;
  totalDeniedAmount: number;
  denialsByCategory: Record<CARCCategory, { count: number; amount: number }>;
  topDenialCodes: Array<{ code: string; count: number; amount: number; description: string }>;
  appealableAmount: number;
  appealSuccessRate: number;
  averageAppealTime: number;
  preventableDenials: number;
  preventableAmount: number;
}

export interface AppealRecommendation {
  shouldAppeal: boolean;
  confidence: number;
  reasoning: string[];
  suggestedActions: string[];
  requiredDocuments: string[];
  deadline?: string;
  expectedRecovery?: number;
}

export class DenialController {
  /**
   * Analyze a denial and get resolution recommendations
   */
  async analyzeDenial(input: DenialInput): Promise<{
    analysis: ReturnType<typeof analyzeDenial>;
    carcInfo: any;
    rarcInfo: any;
    recommendation: AppealRecommendation;
  }> {
    const analysis = analyzeDenial(input);
    const carcInfo = getCARCCode(input.carcCode);
    const rarcInfo = input.rarcCode ? getRARCCode(input.rarcCode) : undefined;

    const recommendation = this.generateAppealRecommendation(input, analysis, carcInfo);

    return {
      analysis,
      carcInfo,
      rarcInfo,
      recommendation
    };
  }

  /**
   * Record a new denial
   * IMPORTANT: Caller should verify claim belongs to the organization before calling
   */
  async recordDenial(input: DenialRecordInput, organizationId?: string): Promise<{ id: string }> {
    // Verify the claim belongs to the organization if provided
    if (organizationId) {
      const claim = await prisma.claim.findUnique({
        where: { id: input.claimId },
        include: {
          account: {
            include: {
              assessment: { select: { organizationId: true } }
            }
          }
        }
      });
      if (!claim || claim.account?.assessment?.organizationId !== organizationId) {
        throw new Error('Claim not found or access denied');
      }
    }

    const categoryInfo = categorizedenial(input.carcCode, input.rarcCode);

    const denial = await prisma.denial.create({
      data: {
        claimId: input.claimId,
        carcCode: input.carcCode,
        rarcCode: input.rarcCode,
        category: categoryInfo.category.toUpperCase() as any,
        deniedAmount: input.deniedAmount,
        denialDate: new Date(input.denialDate),
        preventable: input.preventable ?? false,
        rootCause: input.rootCause
      }
    });

    // Update claim status
    await prisma.claim.update({
      where: { id: input.claimId },
      data: {
        status: 'DENIED',
        denialCode: input.carcCode,
        denialReason: getCARCCode(input.carcCode)?.description,
        denialDate: new Date(input.denialDate)
      }
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: 'DENIAL_RECORDED',
        entityType: 'Denial',
        entityId: denial.id,
        details: {
          claimId: input.claimId,
          carcCode: input.carcCode,
          deniedAmount: input.deniedAmount
        }
      }
    });

    return { id: denial.id };
  }

  /**
   * Get denial analytics for an organization
   */
  async getDenialAnalytics(
    organizationId: string,
    startDate?: string,
    endDate?: string
  ): Promise<DenialAnalytics> {
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const denials = await prisma.denial.findMany({
      where: {
        claim: {
          account: {
            assessment: { organizationId }
          }
        },
        ...(startDate || endDate ? { denialDate: dateFilter } : {})
      },
      include: {
        claim: {
          include: {
            appeals: true
          }
        }
      }
    });

    // Calculate analytics
    const totalDenials = denials.length;
    const totalDeniedAmount = denials.reduce(
      (sum, d) => sum + Number(d.deniedAmount),
      0
    );

    // Group by category
    const denialsByCategory: Record<string, { count: number; amount: number }> = {};
    const codeCount: Record<string, { count: number; amount: number; description: string }> = {};

    for (const denial of denials) {
      const category = denial.category.toLowerCase();
      if (!denialsByCategory[category]) {
        denialsByCategory[category] = { count: 0, amount: 0 };
      }
      denialsByCategory[category].count++;
      denialsByCategory[category].amount += Number(denial.deniedAmount);

      const code = denial.carcCode || 'UNKNOWN';
      if (!codeCount[code]) {
        const carcInfo = getCARCCode(code);
        codeCount[code] = {
          count: 0,
          amount: 0,
          description: carcInfo?.description || 'Unknown code'
        };
      }
      codeCount[code].count++;
      codeCount[code].amount += Number(denial.deniedAmount);
    }

    // Sort top denial codes
    const topDenialCodes = Object.entries(codeCount)
      .map(([code, data]) => ({ code, ...data }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    // Calculate appealable amount
    const appealableDenials = denials.filter(d => {
      const carcInfo = getCARCCode(d.carcCode || '');
      return carcInfo?.appealable;
    });
    const appealableAmount = appealableDenials.reduce(
      (sum, d) => sum + Number(d.deniedAmount),
      0
    );

    // Calculate appeal success rate
    const appeals = denials.flatMap(d => d.claim.appeals);
    const wonAppeals = appeals.filter(a => a.status === 'WON');
    const appealSuccessRate = appeals.length > 0
      ? (wonAppeals.length / appeals.length) * 100
      : 0;

    // Calculate average appeal time
    const completedAppeals = appeals.filter(a => a.decisionDate && a.filedDate);
    const avgAppealTime = completedAppeals.length > 0
      ? completedAppeals.reduce((sum, a) => {
          const filed = new Date(a.filedDate!);
          const decision = new Date(a.decisionDate!);
          return sum + (decision.getTime() - filed.getTime()) / (24 * 60 * 60 * 1000);
        }, 0) / completedAppeals.length
      : 0;

    // Calculate preventable denials
    const preventableDenials = denials.filter(d => d.preventable);
    const preventableAmount = preventableDenials.reduce(
      (sum, d) => sum + Number(d.deniedAmount),
      0
    );

    return {
      totalDenials,
      totalDeniedAmount,
      denialsByCategory: denialsByCategory as any,
      topDenialCodes,
      appealableAmount,
      appealSuccessRate,
      averageAppealTime: Math.round(avgAppealTime),
      preventableDenials: preventableDenials.length,
      preventableAmount
    };
  }

  /**
   * Get denials for a specific claim
   * IMPORTANT: Requires organizationId for tenant isolation
   */
  async getClaimDenials(claimId: string, organizationId?: string): Promise<any[]> {
    // Build where clause with optional organization filter
    const whereClause: any = { claimId };
    if (organizationId) {
      whereClause.claim = {
        account: {
          assessment: { organizationId }
        }
      };
    }

    const denials = await prisma.denial.findMany({
      where: whereClause,
      orderBy: { denialDate: 'desc' }
    });

    return denials.map(denial => ({
      ...denial,
      carcInfo: getCARCCode(denial.carcCode || ''),
      rarcInfo: denial.rarcCode ? getRARCCode(denial.rarcCode) : undefined
    }));
  }

  /**
   * Create an appeal for a denial
   * IMPORTANT: Caller should verify claim belongs to the organization before calling
   */
  async createAppeal(input: {
    claimId: string;
    denialId: string;
    appealLevel: number;
    deadline?: string;
  }, organizationId?: string): Promise<{ id: string }> {
    // Verify the claim belongs to the organization if provided
    if (organizationId) {
      const claim = await prisma.claim.findUnique({
        where: { id: input.claimId },
        include: {
          account: {
            include: {
              assessment: { select: { organizationId: true } }
            }
          }
        }
      });
      if (!claim || claim.account?.assessment?.organizationId !== organizationId) {
        throw new Error('Claim not found or access denied');
      }
    }

    const appeal = await prisma.appeal.create({
      data: {
        claimId: input.claimId,
        appealLevel: input.appealLevel,
        deadline: input.deadline ? new Date(input.deadline) : undefined,
        status: 'DRAFT'
      }
    });

    // Update denial resolution to pending
    await prisma.denial.update({
      where: { id: input.denialId },
      data: { resolution: 'PENDING' }
    });

    // Update claim status
    await prisma.claim.update({
      where: { id: input.claimId },
      data: { status: 'APPEALED' }
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: 'APPEAL_CREATED',
        entityType: 'Appeal',
        entityId: appeal.id,
        details: {
          claimId: input.claimId,
          denialId: input.denialId,
          appealLevel: input.appealLevel
        }
      }
    });

    return { id: appeal.id };
  }

  /**
   * Update appeal status
   * IMPORTANT: Caller should verify appeal belongs to the organization before calling
   */
  async updateAppealStatus(
    appealId: string,
    status: 'DRAFT' | 'FILED' | 'UNDER_REVIEW' | 'WON' | 'LOST',
    outcome?: {
      recoveredAmount?: number;
      decisionDate?: string;
      notes?: string;
    },
    organizationId?: string
  ): Promise<{ success: boolean }> {
    // Verify the appeal belongs to the organization if provided
    if (organizationId) {
      const existingAppeal = await prisma.appeal.findUnique({
        where: { id: appealId },
        include: {
          claim: {
            include: {
              account: {
                include: {
                  assessment: { select: { organizationId: true } }
                }
              }
            }
          }
        }
      });
      if (!existingAppeal || existingAppeal.claim?.account?.assessment?.organizationId !== organizationId) {
        throw new Error('Appeal not found or access denied');
      }
    }

    const appeal = await prisma.appeal.update({
      where: { id: appealId },
      data: {
        status,
        ...(status === 'FILED' ? { filedDate: new Date() } : {}),
        ...(outcome?.decisionDate ? { decisionDate: new Date(outcome.decisionDate) } : {}),
        ...(outcome?.recoveredAmount !== undefined ? { recoveredAmount: outcome.recoveredAmount } : {}),
        ...(outcome?.notes ? { outcome: outcome.notes } : {})
      },
      include: {
        claim: true
      }
    });

    // If appeal won, update denial resolution
    if (status === 'WON') {
      const denials = await prisma.denial.findMany({
        where: { claimId: appeal.claimId }
      });

      for (const denial of denials) {
        await prisma.denial.update({
          where: { id: denial.id },
          data: {
            resolution: outcome?.recoveredAmount && outcome.recoveredAmount < Number(denial.deniedAmount)
              ? 'PARTIAL_RECOVERY'
              : 'OVERTURNED',
            resolvedDate: new Date(),
            recoveredAmount: outcome?.recoveredAmount
          }
        });
      }

      // Update claim to paid if fully recovered
      if (outcome?.recoveredAmount) {
        await prisma.claim.update({
          where: { id: appeal.claimId },
          data: {
            status: 'PAID',
            paidAmount: outcome.recoveredAmount
          }
        });
      }
    } else if (status === 'LOST') {
      const denials = await prisma.denial.findMany({
        where: { claimId: appeal.claimId }
      });

      for (const denial of denials) {
        await prisma.denial.update({
          where: { id: denial.id },
          data: {
            resolution: 'UPHELD',
            resolvedDate: new Date()
          }
        });
      }
    }

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: 'APPEAL_STATUS_UPDATED',
        entityType: 'Appeal',
        entityId: appealId,
        details: {
          status,
          outcome
        }
      }
    });

    return { success: true };
  }

  /**
   * Get all CARC codes
   */
  getCARCCodes(): ReturnType<typeof getAllCARCCodes> {
    return getAllCARCCodes();
  }

  /**
   * Get CARC codes by category
   */
  getCARCCodesByCategory(category: CARCCategory): ReturnType<typeof getCARCCodesByCategory> {
    return getCARCCodesByCategory(category);
  }

  /**
   * Calculate batch recovery potential
   * IMPORTANT: Requires organizationId for tenant isolation
   */
  async calculateBatchRecovery(denialIds: string[], organizationId?: string): Promise<{
    totalDenied: number;
    appealableAmount: number;
    expectedRecovery: number;
    recommendedAppeals: string[];
  }> {
    const whereClause: any = { id: { in: denialIds } };
    if (organizationId) {
      whereClause.claim = {
        account: {
          assessment: { organizationId }
        }
      };
    }

    const denials = await prisma.denial.findMany({
      where: whereClause
    });

    let totalDenied = 0;
    let appealableAmount = 0;
    let expectedRecovery = 0;
    const recommendedAppeals: string[] = [];

    for (const denial of denials) {
      const amount = Number(denial.deniedAmount);
      totalDenied += amount;

      const carcInfo = getCARCCode(denial.carcCode || '');
      if (carcInfo?.appealable) {
        appealableAmount += amount;

        // Estimate recovery based on denial category
        const recoveryRate = this.getEstimatedRecoveryRate(carcInfo.category);
        expectedRecovery += amount * recoveryRate;

        if (amount > 500) {
          recommendedAppeals.push(denial.id);
        }
      }
    }

    return {
      totalDenied,
      appealableAmount,
      expectedRecovery: Math.round(expectedRecovery),
      recommendedAppeals
    };
  }

  // Private helper methods
  private generateAppealRecommendation(
    input: DenialInput,
    analysis: ReturnType<typeof analyzeDenial>,
    carcInfo: any
  ): AppealRecommendation {
    const reasoning: string[] = [];
    const suggestedActions: string[] = [];
    const requiredDocuments: string[] = [];

    if (!carcInfo?.appealable) {
      return {
        shouldAppeal: false,
        confidence: 90,
        reasoning: ['This denial code is typically not appealable'],
        suggestedActions: carcInfo?.commonResolutions || ['Review denial for accuracy'],
        requiredDocuments: []
      };
    }

    // Check if amount justifies appeal
    if (input.deniedAmount < 100) {
      reasoning.push('Denied amount may not justify appeal effort');
    } else if (input.deniedAmount > 1000) {
      reasoning.push('Significant amount warrants appeal consideration');
    }

    // Add category-specific reasoning
    switch (carcInfo.category) {
      case 'authorization':
        reasoning.push('Authorization denials often can be overturned with retroactive auth');
        suggestedActions.push('Request retroactive authorization');
        suggestedActions.push('Document medical necessity');
        requiredDocuments.push('Clinical notes', 'Authorization request records');
        break;

      case 'medical_necessity':
        reasoning.push('Medical necessity denials require strong clinical documentation');
        suggestedActions.push('Request peer-to-peer review');
        suggestedActions.push('Gather supporting clinical evidence');
        requiredDocuments.push('Medical records', 'Physician letter of medical necessity', 'Published guidelines');
        break;

      case 'coding':
        reasoning.push('Coding errors can often be corrected and resubmitted');
        suggestedActions.push('Review coding accuracy');
        suggestedActions.push('Correct and resubmit if error found');
        requiredDocuments.push('Operative report', 'Coding guidelines reference');
        break;

      case 'timely_filing':
        reasoning.push('Timely filing denials are difficult but not impossible to appeal');
        suggestedActions.push('Gather proof of prior submission attempts');
        suggestedActions.push('Document any extenuating circumstances');
        requiredDocuments.push('Original submission confirmation', 'Correspondence history');
        break;

      case 'eligibility':
        reasoning.push('Eligibility denials may be resolved with updated information');
        suggestedActions.push('Verify patient eligibility');
        suggestedActions.push('Submit with corrected information');
        requiredDocuments.push('Insurance card', 'Eligibility verification');
        break;

      default:
        suggestedActions.push(...(carcInfo.commonResolutions || []));
    }

    // Calculate appeal deadline
    const deadline = carcInfo.timelyFilingDays
      ? new Date(Date.now() + carcInfo.timelyFilingDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : undefined;

    // Calculate expected recovery
    const recoveryRate = this.getEstimatedRecoveryRate(carcInfo.category);
    const expectedRecovery = Math.round(input.deniedAmount * recoveryRate);

    return {
      shouldAppeal: input.deniedAmount >= 100 && carcInfo.appealable,
      confidence: analysis.confidence,
      reasoning,
      suggestedActions,
      requiredDocuments,
      deadline,
      expectedRecovery
    };
  }

  private getEstimatedRecoveryRate(category: CARCCategory): number {
    const rates: Record<CARCCategory, number> = {
      eligibility: 0.45,
      authorization: 0.55,
      coding: 0.65,
      timely_filing: 0.15,
      duplicate: 0.10,
      medical_necessity: 0.40,
      bundling: 0.50,
      cob: 0.60,
      technical: 0.70,
      patient_responsibility: 0.05,
      other: 0.30
    };

    return rates[category] || 0.30;
  }
}

// Export singleton instance
export const denialController = new DenialController();
