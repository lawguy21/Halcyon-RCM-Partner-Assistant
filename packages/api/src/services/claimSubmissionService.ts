/**
 * Claim Submission Service
 * Handles X12 837 claim creation, submission, and status tracking
 */

import { prisma } from '../lib/prisma.js';
import {
  validateClaimData,
  formatProfessionalClaim,
  formatInstitutionalClaim,
  createDefaultInterchangeInfo,
  createDefaultFunctionalGroupInfo,
  generateInterchangeControlNumber,
  type ProfessionalClaim,
  type InstitutionalClaim,
  type ClaimSubmission,
  type ClaimSubmissionStatus,
  type ClaimValidationResult,
  type InterchangeInfo,
  type FunctionalGroupInfo,
  type DiagnosisSet,
  type SubscriberInfo,
  type PatientInfo,
  type PayerInfo,
  type BillingProviderInfo,
  type ClaimHeader,
  type ProcedureInfo,
  type RevenueCodeLine,
} from '@halcyon-rcm/core';
import { Prisma } from '@prisma/client';

// ============================================================================
// CONFIGURATION
// ============================================================================

interface ClaimSubmissionConfig {
  /** Sender ID for X12 interchange */
  senderId: string;
  /** Sender ID qualifier (default: ZZ) */
  senderIdQualifier?: string;
  /** Application sender code for functional group */
  applicationSenderCode: string;
  /** Default receiver ID */
  defaultReceiverId?: string;
  /** Production mode (default: false for test) */
  isProduction?: boolean;
  /** Clearinghouse configuration */
  clearinghouse?: {
    id: string;
    apiEndpoint?: string;
    apiKey?: string;
  };
}

// Default configuration (should be overridden via environment)
const defaultConfig: ClaimSubmissionConfig = {
  senderId: process.env.X12_SENDER_ID || 'HALCYONRCM',
  senderIdQualifier: process.env.X12_SENDER_QUALIFIER || 'ZZ',
  applicationSenderCode: process.env.X12_APP_SENDER_CODE || 'HALCYONRCM',
  defaultReceiverId: process.env.X12_DEFAULT_RECEIVER_ID,
  isProduction: process.env.NODE_ENV === 'production',
};

// ============================================================================
// TYPES
// ============================================================================

export interface CreateClaimInput {
  encounterId?: string;
  recoveryAccountId?: string;
  claimType: 'professional' | 'institutional';
  // Provider info
  billingProvider: BillingProviderInfo;
  renderingProvider?: any;
  referringProvider?: any;
  serviceFacility?: any;
  attendingProvider?: any;
  // Patient/Subscriber info
  subscriber: SubscriberInfo;
  patient: PatientInfo;
  // Payer info
  payer: PayerInfo;
  secondaryPayer?: PayerInfo;
  // Diagnoses
  diagnoses: DiagnosisSet;
  // Services
  serviceLines?: ProcedureInfo[];
  revenueLines?: RevenueCodeLine[];
  // Claim header overrides
  patientControlNumber?: string;
  priorAuthorizationNumber?: string;
  referralNumber?: string;
  admissionDate?: string;
  dischargeDate?: string;
  statementFromDate?: string;
  statementThroughDate?: string;
}

export interface CreateClaimResult {
  success: boolean;
  claimSubmissionId?: string;
  claimId?: string;
  validation: ClaimValidationResult;
  x12Content?: string;
  errors?: string[];
}

export interface SubmitClaimResult {
  success: boolean;
  claimSubmissionId: string;
  interchangeControlNumber?: string;
  clearinghouseTrackingNumber?: string;
  status: ClaimSubmissionStatus;
  errors?: string[];
}

export interface ClaimStatusResult {
  claimSubmissionId: string;
  status: ClaimSubmissionStatus;
  statusCode?: string;
  statusDescription?: string;
  payerClaimControlNumber?: string;
  clearinghouseTrackingNumber?: string;
  submittedAt?: Date;
  lastUpdatedAt?: Date;
  history: Array<{
    status: string;
    timestamp: Date;
    details?: string;
  }>;
}

export interface ResubmitClaimInput {
  corrections?: Partial<CreateClaimInput>;
  reason?: string;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class ClaimSubmissionService {
  private config: ClaimSubmissionConfig;

  constructor(config: Partial<ClaimSubmissionConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Create a claim from encounter/recovery account data
   */
  async createClaim(input: CreateClaimInput): Promise<CreateClaimResult> {
    try {
      // Generate claim identifiers
      const claimId = crypto.randomUUID();
      const patientControlNumber = input.patientControlNumber ||
        this.generatePatientControlNumber(input.patient.accountNumber);

      // Build claim header
      const header: ClaimHeader = {
        claimId,
        patientControlNumber,
        claimType: input.claimType,
        totalChargeAmount: this.calculateTotalCharges(input),
        claimFrequencyCode: '1', // Original
        providerSignatureOnFile: true,
        providerAcceptAssignment: true,
        benefitsAssignmentCertification: true,
        releaseOfInformation: 'Y',
        priorAuthorizationNumber: input.priorAuthorizationNumber,
        referralNumber: input.referralNumber,
        admissionDate: input.admissionDate,
        dischargeDate: input.dischargeDate,
      };

      // Build the appropriate claim type
      let claim: ProfessionalClaim | InstitutionalClaim;
      let validation: ClaimValidationResult;

      if (input.claimType === 'professional') {
        claim = {
          header,
          billingProvider: input.billingProvider,
          renderingProvider: input.renderingProvider,
          referringProvider: input.referringProvider,
          serviceFacility: input.serviceFacility,
          subscriber: input.subscriber,
          patient: input.patient,
          payer: input.payer,
          secondaryPayer: input.secondaryPayer,
          diagnoses: input.diagnoses,
          serviceLines: input.serviceLines || [],
        } as ProfessionalClaim;

        validation = validateClaimData(claim, 'professional');
      } else {
        claim = {
          header,
          billingProvider: input.billingProvider,
          attendingProvider: input.attendingProvider,
          operatingProvider: input.renderingProvider,
          renderingProvider: input.renderingProvider,
          referringProvider: input.referringProvider,
          serviceFacility: input.serviceFacility,
          subscriber: input.subscriber,
          patient: input.patient,
          payer: input.payer,
          secondaryPayer: input.secondaryPayer,
          diagnoses: input.diagnoses,
          revenueLines: input.revenueLines || [],
          statementFromDate: input.statementFromDate || '',
          statementThroughDate: input.statementThroughDate || '',
        } as InstitutionalClaim;

        validation = validateClaimData(claim, 'institutional');
      }

      // If validation fails, return early
      if (!validation.isValid) {
        return {
          success: false,
          validation,
          errors: validation.errors.map(e => e.message),
        };
      }

      // Format the X12 837 content
      const interchange = createDefaultInterchangeInfo(
        this.config.senderId,
        input.payer.payerId,
        {
          isProduction: this.config.isProduction,
          senderQualifier: this.config.senderIdQualifier,
        }
      );

      const functionalGroup = createDefaultFunctionalGroupInfo(
        this.config.applicationSenderCode,
        input.payer.payerId,
        input.claimType
      );

      let x12Content: string;
      if (input.claimType === 'professional') {
        x12Content = formatProfessionalClaim(
          claim as ProfessionalClaim,
          interchange,
          functionalGroup
        );
      } else {
        x12Content = formatInstitutionalClaim(
          claim as InstitutionalClaim,
          interchange,
          functionalGroup
        );
      }

      // Store the claim submission
      const claimSubmission = await prisma.claimSubmission.create({
        data: {
          claimId,
          claimType: input.claimType,
          x12Content,
          status: 'validated',
          patientControlNumber,
          interchangeControlNumber: interchange.interchangeControlNumber,
          totalChargeAmount: new Prisma.Decimal(header.totalChargeAmount),
          payerId: input.payer.payerId,
          payerName: input.payer.name,
          patientFirstName: input.patient.firstName,
          patientLastName: input.patient.lastName,
          patientDob: new Date(input.patient.dateOfBirth),
          subscriberMemberId: input.subscriber.memberId,
          billingProviderNpi: input.billingProvider.npi,
          recoveryAccountId: input.recoveryAccountId,
          validationErrors: validation.errors.length > 0 ? validation.errors as any : undefined,
          validationWarnings: validation.warnings.length > 0 ? validation.warnings as any : undefined,
        },
      });

      // Record status history
      await prisma.claimStatusHistory.create({
        data: {
          claimSubmissionId: claimSubmission.id,
          status: 'validated',
          details: 'Claim created and validated successfully',
          source: 'system',
        },
      });

      return {
        success: true,
        claimSubmissionId: claimSubmission.id,
        claimId,
        validation,
        x12Content,
      };
    } catch (error: any) {
      console.error('[ClaimSubmissionService] Error creating claim:', error);
      return {
        success: false,
        validation: {
          isValid: false,
          errors: [{ code: 'SYSTEM_ERROR', message: error.message, severity: 'fatal' }],
          warnings: [],
        },
        errors: [error.message],
      };
    }
  }

  /**
   * Submit a claim to the clearinghouse
   * IMPORTANT: Requires organizationId for tenant isolation
   */
  async submitClaim(claimSubmissionId: string, organizationId?: string): Promise<SubmitClaimResult> {
    try {
      // Get the claim submission with organization check
      const submission = await prisma.claimSubmission.findUnique({
        where: { id: claimSubmissionId },
        include: {
          recoveryAccount: {
            include: {
              assessment: { select: { organizationId: true } }
            }
          }
        }
      });

      if (!submission) {
        return {
          success: false,
          claimSubmissionId,
          status: 'draft',
          errors: ['Claim submission not found'],
        };
      }

      // Verify tenant ownership if organizationId provided
      if (organizationId && submission.recoveryAccount?.assessment?.organizationId !== organizationId) {
        return {
          success: false,
          claimSubmissionId,
          status: 'draft',
          errors: ['Claim submission not found'],
        };
      }

      // Check if already submitted
      if (['submitted', 'acknowledged', 'accepted', 'pending', 'paid'].includes(submission.status)) {
        return {
          success: false,
          claimSubmissionId,
          status: submission.status as ClaimSubmissionStatus,
          errors: ['Claim has already been submitted'],
        };
      }

      // Update status to queued
      await prisma.claimSubmission.update({
        where: { id: claimSubmissionId },
        data: { status: 'queued' },
      });

      await this.recordStatusHistory(claimSubmissionId, 'queued', 'Claim queued for submission');

      // In a production environment, this would send to the clearinghouse
      // For now, we simulate the submission process
      const clearinghouseResult = await this.sendToClearinghouse(submission.x12Content, submission);

      if (clearinghouseResult.success) {
        await prisma.claimSubmission.update({
          where: { id: claimSubmissionId },
          data: {
            status: 'submitted',
            submittedAt: new Date(),
            clearinghouseId: this.config.clearinghouse?.id,
            clearinghouseBatchId: clearinghouseResult.batchId,
            clearinghouseTrackingNumber: clearinghouseResult.trackingNumber,
          },
        });

        await this.recordStatusHistory(
          claimSubmissionId,
          'submitted',
          `Submitted to clearinghouse. Tracking: ${clearinghouseResult.trackingNumber}`
        );

        return {
          success: true,
          claimSubmissionId,
          interchangeControlNumber: submission.interchangeControlNumber || undefined,
          clearinghouseTrackingNumber: clearinghouseResult.trackingNumber,
          status: 'submitted',
        };
      } else {
        await prisma.claimSubmission.update({
          where: { id: claimSubmissionId },
          data: {
            status: 'rejected',
            clearinghouseResponse: clearinghouseResult.response as any,
          },
        });

        await this.recordStatusHistory(
          claimSubmissionId,
          'rejected',
          `Clearinghouse rejection: ${clearinghouseResult.error}`
        );

        return {
          success: false,
          claimSubmissionId,
          status: 'rejected',
          errors: [clearinghouseResult.error || 'Clearinghouse submission failed'],
        };
      }
    } catch (error: any) {
      console.error('[ClaimSubmissionService] Error submitting claim:', error);
      return {
        success: false,
        claimSubmissionId,
        status: 'draft',
        errors: [error.message],
      };
    }
  }

  /**
   * Get claim status
   * IMPORTANT: Requires organizationId for tenant isolation
   */
  async getClaimStatus(claimSubmissionId: string, organizationId?: string): Promise<ClaimStatusResult | null> {
    try {
      const submission = await prisma.claimSubmission.findUnique({
        where: { id: claimSubmissionId },
        include: {
          statusHistory: {
            orderBy: { timestamp: 'desc' },
            take: 20,
          },
          recoveryAccount: {
            include: {
              assessment: { select: { organizationId: true } }
            }
          }
        },
      });

      if (!submission) {
        return null;
      }

      // Verify tenant ownership if organizationId provided
      if (organizationId && submission.recoveryAccount?.assessment?.organizationId !== organizationId) {
        return null; // Return null instead of exposing cross-tenant data
      }

      return {
        claimSubmissionId: submission.id,
        status: submission.status as ClaimSubmissionStatus,
        statusCode: submission.statusCode || undefined,
        statusDescription: submission.statusDescription || undefined,
        payerClaimControlNumber: submission.payerClaimControlNumber || undefined,
        clearinghouseTrackingNumber: submission.clearinghouseTrackingNumber || undefined,
        submittedAt: submission.submittedAt || undefined,
        lastUpdatedAt: submission.updatedAt,
        history: submission.statusHistory.map(h => ({
          status: h.status,
          timestamp: h.timestamp,
          details: h.details || undefined,
        })),
      };
    } catch (error: any) {
      console.error('[ClaimSubmissionService] Error getting claim status:', error);
      return null;
    }
  }

  /**
   * Resubmit a rejected or denied claim with corrections
   */
  async resubmitClaim(
    claimSubmissionId: string,
    input: ResubmitClaimInput
  ): Promise<CreateClaimResult> {
    try {
      // Get the original claim submission
      const originalSubmission = await prisma.claimSubmission.findUnique({
        where: { id: claimSubmissionId },
      });

      if (!originalSubmission) {
        return {
          success: false,
          validation: {
            isValid: false,
            errors: [{ code: 'NOT_FOUND', message: 'Original claim submission not found', severity: 'fatal' }],
            warnings: [],
          },
          errors: ['Original claim submission not found'],
        };
      }

      // Can only resubmit rejected or denied claims
      if (!['rejected', 'denied'].includes(originalSubmission.status)) {
        return {
          success: false,
          validation: {
            isValid: false,
            errors: [{
              code: 'INVALID_STATUS',
              message: `Cannot resubmit claim with status: ${originalSubmission.status}`,
              severity: 'fatal',
            }],
            warnings: [],
          },
          errors: [`Cannot resubmit claim with status: ${originalSubmission.status}`],
        };
      }

      // Parse the original claim data and apply corrections
      // Note: In a real implementation, you'd store the original claim data structure
      // For now, we'll just create a new claim with replacement frequency code

      // Mark the original as superseded
      await prisma.claimSubmission.update({
        where: { id: claimSubmissionId },
        data: { status: 'cancelled' },
      });

      await this.recordStatusHistory(
        claimSubmissionId,
        'cancelled',
        `Superseded by resubmission. Reason: ${input.reason || 'Corrections applied'}`
      );

      // The corrections should contain the full claim data
      // In production, you'd merge the original data with corrections
      if (!input.corrections) {
        return {
          success: false,
          validation: {
            isValid: false,
            errors: [{ code: 'MISSING_DATA', message: 'Corrections data required for resubmission', severity: 'fatal' }],
            warnings: [],
          },
          errors: ['Corrections data required for resubmission'],
        };
      }

      // Create the replacement claim
      const result = await this.createClaim(input.corrections as CreateClaimInput);

      if (result.success && result.claimSubmissionId) {
        // Link to original claim
        await prisma.claimSubmission.update({
          where: { id: result.claimSubmissionId },
          data: {
            originalClaimId: claimSubmissionId,
          },
        });
      }

      return result;
    } catch (error: any) {
      console.error('[ClaimSubmissionService] Error resubmitting claim:', error);
      return {
        success: false,
        validation: {
          isValid: false,
          errors: [{ code: 'SYSTEM_ERROR', message: error.message, severity: 'fatal' }],
          warnings: [],
        },
        errors: [error.message],
      };
    }
  }

  /**
   * Batch submit multiple claims
   */
  async batchSubmit(claimSubmissionIds: string[]): Promise<{
    success: boolean;
    results: Array<{
      claimSubmissionId: string;
      success: boolean;
      status?: ClaimSubmissionStatus;
      error?: string;
    }>;
    summary: {
      total: number;
      successful: number;
      failed: number;
    };
  }> {
    const results: Array<{
      claimSubmissionId: string;
      success: boolean;
      status?: ClaimSubmissionStatus;
      error?: string;
    }> = [];

    let successful = 0;
    let failed = 0;

    for (const id of claimSubmissionIds) {
      try {
        const result = await this.submitClaim(id);
        results.push({
          claimSubmissionId: id,
          success: result.success,
          status: result.status,
          error: result.errors?.join('; '),
        });

        if (result.success) {
          successful++;
        } else {
          failed++;
        }
      } catch (error: any) {
        results.push({
          claimSubmissionId: id,
          success: false,
          error: error.message,
        });
        failed++;
      }
    }

    return {
      success: failed === 0,
      results,
      summary: {
        total: claimSubmissionIds.length,
        successful,
        failed,
      },
    };
  }

  /**
   * Get X12 content for a claim
   * IMPORTANT: Requires organizationId for tenant isolation
   */
  async getX12Content(claimSubmissionId: string, organizationId?: string): Promise<string | null> {
    const submission = await prisma.claimSubmission.findUnique({
      where: { id: claimSubmissionId },
      select: {
        x12Content: true,
        recoveryAccount: {
          select: {
            assessment: { select: { organizationId: true } }
          }
        }
      },
    });

    if (!submission) {
      return null;
    }

    // Verify tenant ownership if organizationId provided
    if (organizationId && submission.recoveryAccount?.assessment?.organizationId !== organizationId) {
      return null; // Return null instead of exposing cross-tenant data
    }

    return submission.x12Content || null;
  }

  /**
   * List claim submissions with filtering
   * IMPORTANT: Requires organizationId for tenant isolation
   */
  async listClaims(options: {
    status?: ClaimSubmissionStatus;
    payerId?: string;
    recoveryAccountId?: string;
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
    offset?: number;
    organizationId?: string;
  } = {}): Promise<{
    claims: any[];
    total: number;
  }> {
    const where: Prisma.ClaimSubmissionWhereInput = {};

    // TENANT ISOLATION: Filter by organization
    if (options.organizationId) {
      where.recoveryAccount = {
        assessment: { organizationId: options.organizationId }
      };
    }

    if (options.status) {
      where.status = options.status;
    }

    if (options.payerId) {
      where.payerId = options.payerId;
    }

    if (options.recoveryAccountId) {
      where.recoveryAccountId = options.recoveryAccountId;
    }

    if (options.fromDate || options.toDate) {
      where.createdAt = {};
      if (options.fromDate) {
        where.createdAt.gte = options.fromDate;
      }
      if (options.toDate) {
        where.createdAt.lte = options.toDate;
      }
    }

    const [claims, total] = await Promise.all([
      prisma.claimSubmission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options.limit || 50,
        skip: options.offset || 0,
        select: {
          id: true,
          claimId: true,
          claimType: true,
          status: true,
          patientControlNumber: true,
          totalChargeAmount: true,
          payerId: true,
          payerName: true,
          patientFirstName: true,
          patientLastName: true,
          submittedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.claimSubmission.count({ where }),
    ]);

    return { claims, total };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private generatePatientControlNumber(accountNumber?: string): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const prefix = accountNumber ? accountNumber.substring(0, 6) : 'CLM';
    return `${prefix}${timestamp}${random}`.substring(0, 20);
  }

  private calculateTotalCharges(input: CreateClaimInput): number {
    if (input.claimType === 'professional' && input.serviceLines) {
      return input.serviceLines.reduce((sum, line) => sum + line.chargeAmount, 0);
    } else if (input.claimType === 'institutional' && input.revenueLines) {
      return input.revenueLines.reduce((sum, line) => sum + line.chargeAmount, 0);
    }
    return 0;
  }

  private async recordStatusHistory(
    claimSubmissionId: string,
    status: string,
    details?: string
  ): Promise<void> {
    await prisma.claimStatusHistory.create({
      data: {
        claimSubmissionId,
        status,
        details,
        source: 'system',
      },
    });
  }

  private async sendToClearinghouse(
    x12Content: string,
    submission: any
  ): Promise<{
    success: boolean;
    trackingNumber?: string;
    batchId?: string;
    response?: any;
    error?: string;
  }> {
    // In production, this would integrate with a clearinghouse API
    // For now, we simulate a successful submission

    if (!this.config.clearinghouse?.apiEndpoint) {
      // Simulate local processing
      const trackingNumber = `TRK${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const batchId = `BATCH${Date.now()}`;

      console.log('[ClaimSubmissionService] Simulated clearinghouse submission:', {
        trackingNumber,
        batchId,
        claimId: submission.claimId,
        contentLength: x12Content.length,
      });

      return {
        success: true,
        trackingNumber,
        batchId,
        response: { status: 'accepted', timestamp: new Date().toISOString() },
      };
    }

    // Real clearinghouse integration would go here
    try {
      // Example: POST to clearinghouse API
      // const response = await fetch(this.config.clearinghouse.apiEndpoint, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/x-x12',
      //     'Authorization': `Bearer ${this.config.clearinghouse.apiKey}`,
      //   },
      //   body: x12Content,
      // });

      return {
        success: true,
        trackingNumber: `TRK${Date.now()}`,
        batchId: `BATCH${Date.now()}`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        response: { error: error.message },
      };
    }
  }
}

// Export singleton instance
export const claimSubmissionService = new ClaimSubmissionService();

// Export class for custom instantiation
export { ClaimSubmissionService };
