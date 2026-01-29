// @ts-nocheck
/**
 * Clearinghouse Service
 * Business logic for clearinghouse operations including claim submission,
 * status polling, ERA download, and eligibility verification
 */

import cron from 'node-cron';
import { prisma } from '../lib/prisma.js';
import {
  createClearinghouseAdapter,
  type IClearinghouseAdapter,
  type ClearinghouseConfig,
  type ClearinghouseResult,
  type SubmissionResult,
  type StatusResponse,
  type EligibilityResponse,
  type RemittanceAdvice,
  type ClaimData,
  type PatientInfo,
  type PayerInfo,
  type DateRange,
  ClearinghouseError,
  ClearinghouseErrorCode,
} from '../integrations/clearinghouse/index.js';

/**
 * Claim rejection handling result
 */
interface RejectionHandlingResult {
  claimId: string;
  handled: boolean;
  action: 'corrected' | 'resubmitted' | 'manual_review' | 'written_off';
  notes?: string;
  workQueueItemId?: string;
}

/**
 * Scheduled job tracking
 */
interface ScheduledJob {
  name: string;
  task: cron.ScheduledTask;
  lastRun?: Date;
  nextRun?: Date;
}

/**
 * Clearinghouse Service
 *
 * Provides high-level operations for clearinghouse integrations including:
 * - Batch claim submission with tracking
 * - Scheduled claim status polling
 * - Scheduled ERA/835 download
 * - Real-time eligibility verification
 * - Rejection handling and work queue integration
 */
class ClearinghouseService {
  private adapters: Map<string, IClearinghouseAdapter> = new Map();
  private scheduledJobs: Map<string, ScheduledJob> = new Map();
  private isRunning: boolean = false;

  /**
   * Start the clearinghouse service and initialize scheduled jobs
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log('[Clearinghouse Service] Starting...');

    // Load active clearinghouse configurations
    const configs = await prisma.clearinghouseConfig.findMany({
      where: { isActive: true },
    });

    // Initialize adapters
    for (const config of configs) {
      try {
        await this.initializeAdapter(config);
      } catch (error) {
        console.error(`[Clearinghouse Service] Failed to initialize ${config.name}:`, error);
      }
    }

    // Schedule status polling (every 30 minutes during business hours)
    this.scheduleJob('status-poll', '*/30 8-18 * * 1-5', async () => {
      await this.pollClaimStatus();
    });

    // Schedule ERA download (twice daily)
    this.scheduleJob('era-download', '0 6,18 * * *', async () => {
      await this.downloadRemittances();
    });

    console.log(`[Clearinghouse Service] Started with ${configs.length} clearinghouses`);
  }

  /**
   * Stop the clearinghouse service
   */
  async stop(): Promise<void> {
    this.isRunning = false;

    // Stop all scheduled jobs
    for (const [name, job] of this.scheduledJobs) {
      job.task.stop();
      console.log(`[Clearinghouse Service] Stopped job: ${name}`);
    }
    this.scheduledJobs.clear();

    // Disconnect all adapters
    for (const [id, adapter] of this.adapters) {
      try {
        await adapter.disconnect();
      } catch (error) {
        console.error(`[Clearinghouse Service] Error disconnecting ${id}:`, error);
      }
    }
    this.adapters.clear();

    console.log('[Clearinghouse Service] Stopped');
  }

  /**
   * Initialize a clearinghouse adapter from database config
   */
  private async initializeAdapter(dbConfig: any): Promise<void> {
    const config: ClearinghouseConfig = {
      id: dbConfig.id,
      name: dbConfig.name,
      type: dbConfig.type,
      apiUrl: dbConfig.apiUrl,
      tokenEndpoint: dbConfig.tokenEndpoint,
      credentials: this.decryptCredentials(dbConfig.credentials),
      supportedTransactions: dbConfig.supportedTransactions || [],
      organizationId: dbConfig.organizationId,
      isActive: dbConfig.isActive,
      isPrimary: dbConfig.isPrimary,
      timeout: dbConfig.timeout || 30000,
      retry: dbConfig.retry || { maxRetries: 3, retryDelay: 1000 },
      environment: dbConfig.environment,
    };

    const adapter = createClearinghouseAdapter(config.type, config);
    await adapter.connect();
    this.adapters.set(config.id, adapter);

    console.log(`[Clearinghouse Service] Initialized adapter: ${config.name}`);
  }

  /**
   * Get adapter for a specific clearinghouse config
   */
  private getAdapter(configId: string): IClearinghouseAdapter {
    const adapter = this.adapters.get(configId);
    if (!adapter) {
      throw new ClearinghouseError(
        ClearinghouseErrorCode.CONNECTION_FAILED,
        `No adapter found for clearinghouse config: ${configId}`
      );
    }
    return adapter;
  }

  /**
   * Get primary adapter for an organization
   */
  private async getPrimaryAdapter(organizationId: string): Promise<{
    adapter: IClearinghouseAdapter;
    configId: string;
  }> {
    const config = await prisma.clearinghouseConfig.findFirst({
      where: {
        organizationId,
        isActive: true,
        isPrimary: true,
      },
    });

    if (!config) {
      throw new ClearinghouseError(
        ClearinghouseErrorCode.CONNECTION_FAILED,
        `No primary clearinghouse configured for organization: ${organizationId}`
      );
    }

    return {
      adapter: this.getAdapter(config.id),
      configId: config.id,
    };
  }

  /**
   * Submit a batch of claims to the clearinghouse
   */
  async submitClaimBatch(
    claimIds: string[],
    options?: {
      organizationId?: string;
      clearinghouseConfigId?: string;
      priority?: 'normal' | 'high' | 'urgent';
    }
  ): Promise<{
    transactionId: string;
    accepted: number;
    rejected: number;
    pending: number;
    errors: string[];
  }> {
    console.log(`[Clearinghouse Service] Submitting batch of ${claimIds.length} claims`);

    // Load claims from database
    const claims = await prisma.claim.findMany({
      where: { id: { in: claimIds } },
      include: {
        account: {
          include: {
            assessment: true,
          },
        },
      },
    });

    if (claims.length === 0) {
      throw new ClearinghouseError(
        ClearinghouseErrorCode.INVALID_CLAIM_DATA,
        'No claims found for the provided IDs'
      );
    }

    // Get the appropriate adapter
    let adapter: IClearinghouseAdapter;
    let configId: string;

    if (options?.clearinghouseConfigId) {
      adapter = this.getAdapter(options.clearinghouseConfigId);
      configId = options.clearinghouseConfigId;
    } else {
      const organizationId = options?.organizationId ||
        claims[0].account?.assessment?.organizationId;

      if (!organizationId) {
        throw new ClearinghouseError(
          ClearinghouseErrorCode.VALIDATION_ERROR,
          'Organization ID is required for claim submission'
        );
      }

      const primary = await this.getPrimaryAdapter(organizationId);
      adapter = primary.adapter;
      configId = primary.configId;
    }

    // Transform claims to submission format
    const claimData = await Promise.all(
      claims.map((claim) => this.transformClaimForSubmission(claim))
    );

    // Create transaction record
    const transaction = await prisma.clearinghouseTransaction.create({
      data: {
        type: 'CLAIM_SUBMISSION',
        configId,
        claimIds,
        status: 'PENDING',
        submittedAt: new Date(),
      },
    });

    try {
      // Submit to clearinghouse
      const result = await adapter.submitClaims(claimData, {
        batchId: transaction.id,
        priority: options?.priority,
      });

      if (!result.success) {
        // Update transaction with failure
        await prisma.clearinghouseTransaction.update({
          where: { id: transaction.id },
          data: {
            status: 'FAILED',
            response: result.error as any,
            completedAt: new Date(),
          },
        });

        throw new ClearinghouseError(
          ClearinghouseErrorCode.SUBMISSION_FAILED,
          result.error?.message || 'Claim submission failed'
        );
      }

      // Update transaction with success
      await prisma.clearinghouseTransaction.update({
        where: { id: transaction.id },
        data: {
          status: result.data!.status.toUpperCase(),
          response: result.data as any,
          transactionId: result.data!.transactionId,
          completedAt: new Date(),
        },
      });

      // Update claim statuses
      if (result.data!.claimStatuses) {
        for (const claimStatus of result.data!.claimStatuses) {
          await prisma.claim.update({
            where: { id: claimStatus.claimId },
            data: {
              status: claimStatus.status === 'accepted' ? 'SUBMITTED' : 'DENIED',
              submittedDate: new Date(),
              // Store clearinghouse claim ID for tracking
            },
          });

          // Handle rejections
          if (claimStatus.status === 'rejected' && claimStatus.errors?.length) {
            await this.handleRejection(claimStatus.claimId, claimStatus.errors);
          }
        }
      }

      return {
        transactionId: result.data!.transactionId,
        accepted: result.data!.acceptedCount,
        rejected: result.data!.rejectedCount,
        pending: result.data!.pendingCount || 0,
        errors: result.data!.errors.map((e) => e.message),
      };
    } catch (error) {
      // Update transaction on error
      await prisma.clearinghouseTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'FAILED',
          response: { error: error instanceof Error ? error.message : 'Unknown error' },
          completedAt: new Date(),
        },
      });

      throw error;
    }
  }

  /**
   * Poll claim status for pending claims
   */
  async pollClaimStatus(): Promise<{
    checked: number;
    updated: number;
    errors: number;
  }> {
    console.log('[Clearinghouse Service] Starting claim status poll...');

    let checked = 0;
    let updated = 0;
    let errors = 0;

    // Get claims needing status check (submitted but not final)
    const pendingClaims = await prisma.claim.findMany({
      where: {
        status: { in: ['SUBMITTED', 'PENDING'] },
        submittedDate: { not: null },
      },
      include: {
        account: {
          include: {
            assessment: true,
          },
        },
      },
    });

    // Group by organization for efficient processing
    const claimsByOrg = new Map<string, typeof pendingClaims>();
    for (const claim of pendingClaims) {
      const orgId = claim.account?.assessment?.organizationId || 'unknown';
      if (!claimsByOrg.has(orgId)) {
        claimsByOrg.set(orgId, []);
      }
      claimsByOrg.get(orgId)!.push(claim);
    }

    // Process each organization
    for (const [orgId, orgClaims] of claimsByOrg) {
      if (orgId === 'unknown') continue;

      try {
        const { adapter, configId } = await this.getPrimaryAdapter(orgId);

        // Check status in batches
        const batchSize = 50;
        for (let i = 0; i < orgClaims.length; i += batchSize) {
          const batch = orgClaims.slice(i, i + batchSize);
          const claimIds = batch.map((c) => c.id);

          const result = await adapter.checkStatus(claimIds, {
            includeAdjudication: true,
          });

          checked += batch.length;

          if (result.success && result.data) {
            for (const status of result.data) {
              try {
                const wasUpdated = await this.updateClaimFromStatus(status);
                if (wasUpdated) updated++;
              } catch (e) {
                errors++;
                console.error(`[Clearinghouse Service] Error updating claim ${status.claimId}:`, e);
              }
            }
          } else {
            errors += batch.length;
          }

          // Rate limiting
          await this.sleep(500);
        }
      } catch (error) {
        console.error(`[Clearinghouse Service] Error polling org ${orgId}:`, error);
        errors += orgClaims.length;
      }
    }

    console.log(`[Clearinghouse Service] Status poll complete: ${checked} checked, ${updated} updated, ${errors} errors`);

    return { checked, updated, errors };
  }

  /**
   * Download Electronic Remittance Advice files
   */
  async downloadRemittances(): Promise<{
    downloaded: number;
    totalPayments: number;
    errors: number;
  }> {
    console.log('[Clearinghouse Service] Starting ERA download...');

    let downloaded = 0;
    let totalPayments = 0;
    let errors = 0;

    // Get all active clearinghouse configs
    const configs = await prisma.clearinghouseConfig.findMany({
      where: { isActive: true },
    });

    // Calculate date range (last 7 days)
    const dateRange: DateRange = {
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
    };

    for (const config of configs) {
      try {
        const adapter = this.getAdapter(config.id);

        const result = await adapter.getRemittances(dateRange, {
          unprocessedOnly: true,
          includeClaimDetails: true,
        });

        if (result.success && result.data) {
          for (const era of result.data) {
            try {
              // Check if already processed
              const existing = await prisma.clearinghouseTransaction.findFirst({
                where: {
                  type: 'ERA_DOWNLOAD',
                  transactionId: era.id,
                },
              });

              if (existing) continue;

              // Record ERA transaction
              await prisma.clearinghouseTransaction.create({
                data: {
                  type: 'ERA_DOWNLOAD',
                  configId: config.id,
                  transactionId: era.id,
                  claimIds: era.claims?.map((c) => c.claimId) || [],
                  status: 'COMPLETED',
                  response: era as any,
                  submittedAt: era.productionDate,
                  completedAt: new Date(),
                },
              });

              downloaded++;
              totalPayments += era.totalPaymentAmount;

              // Process claim-level payment info
              if (era.claims) {
                for (const eraClaim of era.claims) {
                  await this.processERAClaimPayment(eraClaim, era);
                }
              }
            } catch (e) {
              errors++;
              console.error(`[Clearinghouse Service] Error processing ERA ${era.id}:`, e);
            }
          }
        }
      } catch (error) {
        errors++;
        console.error(`[Clearinghouse Service] Error downloading ERAs from ${config.name}:`, error);
      }
    }

    console.log(`[Clearinghouse Service] ERA download complete: ${downloaded} downloaded, $${totalPayments.toFixed(2)} total, ${errors} errors`);

    return { downloaded, totalPayments, errors };
  }

  /**
   * Verify patient eligibility
   */
  async verifyEligibility(
    patientId: string,
    payerId: string,
    options?: {
      organizationId?: string;
      clearinghouseConfigId?: string;
      serviceType?: string;
      dateOfService?: Date;
      providerNpi?: string;
    }
  ): Promise<ClearinghouseResult<EligibilityResponse>> {
    console.log(`[Clearinghouse Service] Verifying eligibility for patient ${patientId}`);

    // Load patient and payer info from database
    const assessment = await prisma.assessment.findFirst({
      where: {
        OR: [
          { id: patientId },
          { mrn: patientId },
          { accountNumber: patientId },
        ],
      },
    });

    if (!assessment) {
      return {
        success: false,
        error: {
          code: ClearinghouseErrorCode.PATIENT_NOT_FOUND,
          message: 'Patient not found',
        },
      };
    }

    // Build patient info
    const patient: PatientInfo = {
      firstName: assessment.patientFirstName || '',
      lastName: assessment.patientLastName || '',
      dateOfBirth: assessment.patientDob || new Date(),
      gender: 'U',
      // memberId would come from insurance record
    };

    // Build payer info
    const payer: PayerInfo = {
      payerId,
      serviceType: options?.serviceType || '30',
    };

    // Get adapter
    let adapter: IClearinghouseAdapter;
    let configId: string;

    if (options?.clearinghouseConfigId) {
      adapter = this.getAdapter(options.clearinghouseConfigId);
      configId = options.clearinghouseConfigId;
    } else {
      const orgId = options?.organizationId || assessment.organizationId;
      if (!orgId) {
        return {
          success: false,
          error: {
            code: ClearinghouseErrorCode.VALIDATION_ERROR,
            message: 'Organization ID is required',
          },
        };
      }

      const primary = await this.getPrimaryAdapter(orgId);
      adapter = primary.adapter;
      configId = primary.configId;
    }

    // Record transaction
    const transaction = await prisma.clearinghouseTransaction.create({
      data: {
        type: 'ELIGIBILITY_CHECK',
        configId,
        claimIds: [patientId],
        status: 'PENDING',
        submittedAt: new Date(),
      },
    });

    try {
      const result = await adapter.verifyEligibility(patient, payer, {
        dateOfService: options?.dateOfService,
        providerNpi: options?.providerNpi,
        includeBenefits: true,
      });

      // Update transaction
      await prisma.clearinghouseTransaction.update({
        where: { id: transaction.id },
        data: {
          status: result.success ? 'COMPLETED' : 'FAILED',
          response: (result.data || result.error) as any,
          completedAt: new Date(),
        },
      });

      return result;
    } catch (error) {
      await prisma.clearinghouseTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'FAILED',
          response: { error: error instanceof Error ? error.message : 'Unknown error' },
          completedAt: new Date(),
        },
      });

      throw error;
    }
  }

  /**
   * Handle claim rejection
   */
  async handleRejection(
    claimId: string,
    errors: Array<{ code: string; message: string }>
  ): Promise<RejectionHandlingResult> {
    console.log(`[Clearinghouse Service] Handling rejection for claim ${claimId}`);

    const claim = await prisma.claim.findUnique({
      where: { id: claimId },
      include: { account: true },
    });

    if (!claim) {
      return {
        claimId,
        handled: false,
        action: 'manual_review',
        notes: 'Claim not found',
      };
    }

    // Analyze rejection reasons
    const errorCodes = errors.map((e) => e.code);
    const errorMessages = errors.map((e) => e.message).join('; ');

    // Update claim with denial info
    await prisma.claim.update({
      where: { id: claimId },
      data: {
        status: 'DENIED',
        denialCode: errorCodes[0],
        denialReason: errorMessages,
        denialDate: new Date(),
      },
    });

    // Record denial
    await prisma.denial.create({
      data: {
        claimId,
        category: this.categorizeDenial(errorCodes),
        carcCode: errorCodes[0],
        deniedAmount: claim.billedAmount,
        denialDate: new Date(),
        preventable: this.isPreventableDenial(errorCodes),
        rootCause: this.analyzeRootCause(errorCodes, errorMessages),
      },
    });

    // Create work queue item for follow-up
    const workQueueItem = await prisma.workQueueItem.create({
      data: {
        accountId: claim.accountId,
        queueType: 'DENIALS',
        priority: this.calculateDenialPriority(claim.billedAmount, errorCodes),
        dueDate: this.calculateDenialDueDate(claim),
        notes: `Denial: ${errorMessages}`,
      },
    });

    return {
      claimId,
      handled: true,
      action: 'manual_review',
      notes: `Created work queue item for denial follow-up`,
      workQueueItemId: workQueueItem.id,
    };
  }

  /**
   * Test connection to a clearinghouse
   */
  async testConnection(configId: string): Promise<ClearinghouseResult<{
    success: boolean;
    latencyMs: number;
    message: string;
  }>> {
    const config = await prisma.clearinghouseConfig.findUnique({
      where: { id: configId },
    });

    if (!config) {
      return {
        success: false,
        error: {
          code: ClearinghouseErrorCode.CONNECTION_FAILED,
          message: 'Clearinghouse configuration not found',
        },
      };
    }

    try {
      // Create temporary adapter if not already initialized
      let adapter = this.adapters.get(configId);
      let wasTemporary = false;

      if (!adapter) {
        await this.initializeAdapter(config);
        adapter = this.adapters.get(configId);
        wasTemporary = true;
      }

      if (!adapter) {
        return {
          success: false,
          error: {
            code: ClearinghouseErrorCode.CONNECTION_FAILED,
            message: 'Failed to initialize adapter',
          },
        };
      }

      const result = await adapter.testConnection();

      // Clean up temporary adapter
      if (wasTemporary && !config.isActive) {
        await adapter.disconnect();
        this.adapters.delete(configId);
      }

      if (result.success && result.data) {
        return {
          success: true,
          data: {
            success: result.data.success,
            latencyMs: result.data.latencyMs,
            message: `Connected successfully to ${config.name}`,
          },
        };
      }

      return {
        success: false,
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ClearinghouseErrorCode.CONNECTION_FAILED,
          message: error instanceof Error ? error.message : 'Connection test failed',
        },
      };
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Schedule a cron job
   */
  private scheduleJob(name: string, schedule: string, handler: () => Promise<void>): void {
    if (!cron.validate(schedule)) {
      console.error(`[Clearinghouse Service] Invalid cron expression for ${name}: ${schedule}`);
      return;
    }

    const task = cron.schedule(schedule, async () => {
      const job = this.scheduledJobs.get(name);
      if (job) {
        job.lastRun = new Date();
      }

      try {
        await handler();
      } catch (error) {
        console.error(`[Clearinghouse Service] Error in scheduled job ${name}:`, error);
      }
    });

    this.scheduledJobs.set(name, { name, task });
    console.log(`[Clearinghouse Service] Scheduled job: ${name} (${schedule})`);
  }

  /**
   * Transform database claim to submission format
   */
  private async transformClaimForSubmission(claim: any): Promise<ClaimData> {
    // This would need to be implemented based on actual data model
    // For now, return a placeholder structure
    return {
      id: claim.id,
      patientControlNumber: claim.claimNumber || claim.id,
      claimType: 'professional',
      patient: {
        firstName: claim.account?.assessment?.patientFirstName || 'Unknown',
        lastName: claim.account?.assessment?.patientLastName || 'Unknown',
        dateOfBirth: claim.account?.assessment?.patientDob || new Date(),
        gender: 'U',
        memberId: '',
      },
      payer: {
        payerId: '',
        name: '',
      },
      provider: {
        npi: '',
        name: '',
        taxId: '',
      },
      serviceLines: [],
      diagnoses: [],
      totalCharges: Number(claim.billedAmount) || 0,
      dateOfService: claim.submittedDate || new Date(),
    };
  }

  /**
   * Update claim from status response
   */
  private async updateClaimFromStatus(status: StatusResponse): Promise<boolean> {
    const claim = await prisma.claim.findUnique({
      where: { id: status.claimId },
    });

    if (!claim) return false;

    const updates: any = {};
    let wasUpdated = false;

    // Map status to claim status
    const newStatus = this.mapStatusToClaimStatus(status.status);
    if (newStatus !== claim.status) {
      updates.status = newStatus;
      wasUpdated = true;
    }

    // Update adjudication info if available
    if (status.adjudicationInfo) {
      if (status.adjudicationInfo.allowedAmount !== undefined) {
        updates.allowedAmount = status.adjudicationInfo.allowedAmount;
      }
      if (status.adjudicationInfo.paidAmount !== undefined) {
        updates.paidAmount = status.adjudicationInfo.paidAmount;
      }
      if (status.adjudicationInfo.patientResponsibility !== undefined) {
        updates.patientResponsibility = status.adjudicationInfo.patientResponsibility;
      }
      wasUpdated = true;
    }

    if (wasUpdated) {
      await prisma.claim.update({
        where: { id: status.claimId },
        data: updates,
      });
    }

    return wasUpdated;
  }

  /**
   * Process ERA claim payment
   */
  private async processERAClaimPayment(eraClaim: any, era: RemittanceAdvice): Promise<void> {
    // Find matching claim
    const claim = await prisma.claim.findFirst({
      where: {
        OR: [
          { id: eraClaim.claimId },
          { claimNumber: eraClaim.patientControlNumber },
        ],
      },
    });

    if (claim) {
      await prisma.claim.update({
        where: { id: claim.id },
        data: {
          status: eraClaim.paidAmount > 0 ? 'PAID' : 'DENIED',
          paidAmount: eraClaim.paidAmount,
          allowedAmount: eraClaim.billedAmount - (eraClaim.adjustments?.reduce((sum: number, a: any) => sum + a.amount, 0) || 0),
          patientResponsibility: eraClaim.patientResponsibility,
        },
      });
    }
  }

  /**
   * Map clearinghouse status to claim status
   */
  private mapStatusToClaimStatus(status: StatusResponse['status']): string {
    switch (status) {
      case 'accepted':
      case 'acknowledged':
      case 'forwarded':
        return 'SUBMITTED';
      case 'adjudicated':
      case 'paid':
        return 'PAID';
      case 'rejected':
      case 'denied':
        return 'DENIED';
      case 'pending':
      case 'in_review':
        return 'PENDING';
      default:
        return 'PENDING';
    }
  }

  /**
   * Categorize denial based on error codes
   */
  private categorizeDenial(codes: string[]): string {
    const code = codes[0]?.toUpperCase() || '';

    if (code.includes('ELIG') || ['1', '2', '3', '4'].includes(code)) {
      return 'ELIGIBILITY';
    }
    if (code.includes('AUTH') || code === '15' || code === '197') {
      return 'AUTHORIZATION';
    }
    if (code.includes('COD') || code.includes('HCPCS') || code.includes('CPT')) {
      return 'CODING';
    }
    if (code.includes('TIME') || code === '29') {
      return 'TIMELY_FILING';
    }
    if (code.includes('DUP') || code === '18') {
      return 'DUPLICATE';
    }
    if (code.includes('MED') || code === '50' || code === '96') {
      return 'MEDICAL_NECESSITY';
    }

    return 'OTHER';
  }

  /**
   * Determine if denial was preventable
   */
  private isPreventableDenial(codes: string[]): boolean {
    const preventableCodes = ['1', '2', '3', '4', '18', '29', 'ELIG', 'TIME', 'DUP'];
    return codes.some((c) => preventableCodes.some((p) => c.toUpperCase().includes(p)));
  }

  /**
   * Analyze root cause of denial
   */
  private analyzeRootCause(codes: string[], messages: string): string {
    // Simple analysis - would be more sophisticated in production
    const category = this.categorizeDenial(codes);

    switch (category) {
      case 'ELIGIBILITY':
        return 'Coverage verification failure';
      case 'AUTHORIZATION':
        return 'Prior authorization not obtained or expired';
      case 'CODING':
        return 'Coding error or invalid code';
      case 'TIMELY_FILING':
        return 'Claim submitted after filing deadline';
      case 'DUPLICATE':
        return 'Duplicate claim submission';
      case 'MEDICAL_NECESSITY':
        return 'Service not medically necessary per payer';
      default:
        return messages.substring(0, 200);
    }
  }

  /**
   * Calculate priority for denial work queue item
   */
  private calculateDenialPriority(amount: any, codes: string[]): number {
    const numAmount = Number(amount) || 0;

    // Higher amounts = higher priority (lower number)
    let priority = 5;

    if (numAmount > 10000) priority = 1;
    else if (numAmount > 5000) priority = 2;
    else if (numAmount > 1000) priority = 3;
    else if (numAmount > 500) priority = 4;

    // Time-sensitive denials get higher priority
    if (codes.some((c) => c.includes('TIME') || c === '29')) {
      priority = Math.max(1, priority - 2);
    }

    return priority;
  }

  /**
   * Calculate due date for denial follow-up
   */
  private calculateDenialDueDate(claim: any): Date {
    // Default to 30 days
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    // If there's a known timely filing deadline, use that
    const account = claim.account;
    if (account?.appealDeadline && new Date(account.appealDeadline) < dueDate) {
      return new Date(account.appealDeadline);
    }

    return dueDate;
  }

  /**
   * Decrypt credentials from database
   */
  private decryptCredentials(encrypted: any): any {
    // In production, use proper decryption
    // For now, assume stored as JSON
    if (typeof encrypted === 'string') {
      try {
        return JSON.parse(Buffer.from(encrypted, 'base64').toString('utf-8'));
      } catch {
        return encrypted;
      }
    }
    return encrypted;
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const clearinghouseService = new ClearinghouseService();
