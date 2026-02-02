// @ts-nocheck
/**
 * Collection Service
 *
 * Business logic for managing collection accounts, dunning automation,
 * agency assignments, and collection workflow.
 */

import { prisma } from '../lib/prisma.js';
import {
  // State machine
  CollectionState,
  CollectionAction,
  PaymentActivity,
  getNextState,
  validateTransition,
  getStateConfig,
  getAllowedTransitions,
  getAutoActions,

  // Dunning
  AccountType,
  DunningSchedule,
  DunningAccountInput,
  generateDunningPlan,
  getNextDunningAction,
  getPendingDunningActions,
  executeDunningAction,
  shouldSkipDunning,
  pauseDunning,
  resumeDunning,

  // Scoring
  CollectionScoringInput,
  CollectionScoreResult,
  InsuranceStatus,
  PaymentHistoryRating,
  calculateCollectionScore,
  prioritizeAccounts,
  calculatePortfolioMetrics,
  recommendStrategy,
} from '@halcyon-rcm/core';

// ============================================================================
// TYPES
// ============================================================================

export interface CollectionAccountFilters {
  state?: CollectionState;
  states?: CollectionState[];
  agencyId?: string;
  minBalance?: number;
  maxBalance?: number;
  minDaysPastDue?: number;
  maxDaysPastDue?: number;
  organizationId?: string;
  limit?: number;
  offset?: number;
  /** Whether to include demo data. If false, filters out isDemoData=true records. */
  includeDemoData?: boolean;
}

export interface TransitionResult {
  success: boolean;
  accountId: string;
  previousState: CollectionState;
  newState: CollectionState;
  reason: string;
  requiresApproval: boolean;
  actionsPerformed: CollectionAction[];
}

export interface PromiseToPayInput {
  accountId: string;
  promiseDate: string;
  amount: number;
  notes?: string;
  createdBy?: string;
}

export interface PaymentPlanInput {
  accountId: string;
  totalAmount: number;
  numberOfPayments: number;
  paymentFrequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  firstPaymentDate: string;
  paymentAmount: number;
  notes?: string;
  createdBy?: string;
}

export interface AgencyAssignmentResult {
  success: boolean;
  assignedCount: number;
  failedCount: number;
  errors: string[];
  agencyId: string;
  accountIds: string[];
}

export interface DunningBatchResult {
  processed: number;
  actionsExecuted: number;
  skipped: number;
  errors: string[];
  results: Array<{
    accountId: string;
    action: string;
    success: boolean;
    message: string;
  }>;
}

export interface AgingBucket {
  bucket: string;
  minDays: number;
  maxDays: number | null;
  accountCount: number;
  totalBalance: number;
  averageBalance: number;
}

export interface CollectionDashboard {
  totalAccounts: number;
  totalBalance: number;
  accountsByState: Record<CollectionState, { count: number; balance: number }>;
  agingBuckets: AgingBucket[];
  collectionRate: number;
  averageDaysToPay: number;
  atAgencyCount: number;
  atAgencyBalance: number;
  promiseToPayActive: number;
  paymentPlansActive: number;
  recentActivity: Array<{
    date: Date;
    type: string;
    amount: number;
    count: number;
  }>;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class CollectionService {
  /**
   * Get collection accounts with filters
   */
  async getAccountsInCollection(filters: CollectionAccountFilters = {}): Promise<{
    accounts: any[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const where: any = {};

    if (filters.state) {
      where.state = filters.state;
    } else if (filters.states && filters.states.length > 0) {
      where.state = { in: filters.states };
    }

    if (filters.agencyId) {
      where.assignedAgencyId = filters.agencyId;
    }

    if (filters.minBalance !== undefined || filters.maxBalance !== undefined) {
      where.balance = {};
      if (filters.minBalance !== undefined) where.balance.gte = filters.minBalance;
      if (filters.maxBalance !== undefined) where.balance.lte = filters.maxBalance;
    }

    if (filters.organizationId) {
      where.patient = { assessment: { organizationId: filters.organizationId } };
    }

    // Demo data filter - when includeDemoData is false, exclude demo records
    if (filters.includeDemoData === false) {
      where.isDemoData = false;
    }

    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const [accounts, total] = await Promise.all([
      prisma.collectionAccount.findMany({
        where,
        include: {
          patient: true,
          assignedAgency: true,
          actions: {
            take: 5,
            orderBy: { performedAt: 'desc' },
          },
          promisesToPay: {
            where: { status: 'PENDING' },
            take: 1,
          },
        },
        orderBy: [
          { balance: 'desc' },
          { lastActivityDate: 'asc' },
        ],
        take: limit,
        skip: offset,
      }),
      prisma.collectionAccount.count({ where }),
    ]);

    // Calculate days past due for each account
    const accountsWithAge = accounts.map(account => {
      const daysPastDue = account.dueDate
        ? Math.max(0, Math.floor((Date.now() - new Date(account.dueDate).getTime()) / (24 * 60 * 60 * 1000)))
        : 0;
      return { ...account, daysPastDue };
    });

    // Filter by days past due if specified
    let filteredAccounts = accountsWithAge;
    if (filters.minDaysPastDue !== undefined || filters.maxDaysPastDue !== undefined) {
      filteredAccounts = accountsWithAge.filter(a => {
        if (filters.minDaysPastDue !== undefined && a.daysPastDue < filters.minDaysPastDue) return false;
        if (filters.maxDaysPastDue !== undefined && a.daysPastDue > filters.maxDaysPastDue) return false;
        return true;
      });
    }

    return {
      accounts: filteredAccounts,
      total,
      limit,
      offset,
    };
  }

  /**
   * Get a single collection account by ID
   * IMPORTANT: Requires organizationId for tenant isolation
   */
  async getAccountById(accountId: string, organizationId?: string): Promise<any | null> {
    const account = await prisma.collectionAccount.findUnique({
      where: { id: accountId },
      include: {
        patient: {
          include: {
            assessment: { select: { organizationId: true } }
          }
        },
        assignedAgency: true,
        actions: {
          orderBy: { performedAt: 'desc' },
          take: 20,
        },
        promisesToPay: {
          orderBy: { promiseDate: 'desc' },
        },
      },
    });

    if (!account) return null;

    // Verify tenant ownership if organizationId provided
    if (organizationId && account.patient?.assessment?.organizationId !== organizationId) {
      return null; // Return null instead of exposing cross-tenant data
    }

    // Calculate days past due
    const daysPastDue = account.dueDate
      ? Math.max(0, Math.floor((Date.now() - new Date(account.dueDate).getTime()) / (24 * 60 * 60 * 1000)))
      : 0;

    // Get state configuration
    const stateConfig = getStateConfig(account.state as CollectionState);

    // Get allowed transitions
    const allowedTransitions = getAllowedTransitions(account.state as CollectionState);

    return {
      ...account,
      daysPastDue,
      stateConfig,
      allowedTransitions,
    };
  }

  /**
   * Transition an account to a new state
   * IMPORTANT: Requires organizationId for tenant isolation
   */
  async transitionAccount(
    accountId: string,
    newState: CollectionState,
    reason: string,
    performedBy?: string,
    organizationId?: string
  ): Promise<TransitionResult> {
    const account = await prisma.collectionAccount.findUnique({
      where: { id: accountId },
      include: {
        patient: {
          include: {
            assessment: { select: { organizationId: true } }
          }
        }
      }
    });

    if (!account) {
      throw new Error(`Account ${accountId} not found`);
    }

    // Verify tenant ownership if organizationId provided
    if (organizationId && account.patient?.assessment?.organizationId !== organizationId) {
      throw new Error(`Account ${accountId} not found`);
    }

    const currentState = account.state as CollectionState;
    const daysPastDue = account.dueDate
      ? Math.max(0, Math.floor((Date.now() - new Date(account.dueDate).getTime()) / (24 * 60 * 60 * 1000)))
      : 0;

    // Validate the transition
    const validation = validateTransition(currentState, newState, daysPastDue);

    if (!validation.valid) {
      return {
        success: false,
        accountId,
        previousState: currentState,
        newState: currentState,
        reason: validation.reason,
        requiresApproval: false,
        actionsPerformed: [],
      };
    }

    // Update the account state
    await prisma.collectionAccount.update({
      where: { id: accountId },
      data: {
        state: newState,
        lastActivityDate: new Date(),
      },
    });

    // Record the action
    await prisma.collectionAction.create({
      data: {
        accountId,
        action: 'STATE_TRANSITION',
        result: `Transitioned from ${currentState} to ${newState}`,
        performedAt: new Date(),
        performedBy: performedBy || 'SYSTEM',
        metadata: {
          previousState: currentState,
          newState,
          reason,
        },
      },
    });

    // Get and execute auto-actions for the new state
    const autoActions = getAutoActions(newState);
    const actionsPerformed: CollectionAction[] = [];

    for (const action of autoActions) {
      // Record the auto-action
      await prisma.collectionAction.create({
        data: {
          accountId,
          action,
          result: `Auto-action triggered by state transition to ${newState}`,
          performedAt: new Date(),
          performedBy: 'SYSTEM',
        },
      });
      actionsPerformed.push(action);
    }

    // Log to audit
    await prisma.auditLog.create({
      data: {
        action: 'COLLECTION_STATE_TRANSITION',
        entityType: 'CollectionAccount',
        entityId: accountId,
        userId: performedBy,
        details: {
          previousState: currentState,
          newState,
          reason,
          actionsPerformed,
        },
      },
    });

    return {
      success: true,
      accountId,
      previousState: currentState,
      newState,
      reason: validation.reason,
      requiresApproval: validation.requiresApproval,
      actionsPerformed,
    };
  }

  /**
   * Run dunning batch for all eligible accounts
   */
  async runDunningBatch(organizationId?: string): Promise<DunningBatchResult> {
    const result: DunningBatchResult = {
      processed: 0,
      actionsExecuted: 0,
      skipped: 0,
      errors: [],
      results: [],
    };

    // Get accounts that need dunning
    const where: any = {
      state: {
        in: ['CURRENT', 'PAST_DUE_30', 'PAST_DUE_60', 'PAST_DUE_90', 'PAST_DUE_120', 'PRE_COLLECTION'],
      },
      balance: { gt: 0 },
    };

    if (organizationId) {
      where.patient = { assessment: { organizationId } };
    }

    const accounts = await prisma.collectionAccount.findMany({
      where,
      include: {
        patient: true,
        promisesToPay: {
          where: { status: 'PENDING' },
        },
      },
    });

    for (const account of accounts) {
      result.processed++;

      try {
        // Build dunning input
        const dueDate = account.dueDate || account.createdAt;
        const lastPayment = await prisma.collectionAction.findFirst({
          where: {
            accountId: account.id,
            action: 'APPLY_PAYMENT',
          },
          orderBy: { performedAt: 'desc' },
        });

        const dunningInput: DunningAccountInput = {
          accountId: account.id,
          accountType: (account.accountType as AccountType) || 'SELF_PAY',
          currentState: account.state as CollectionState,
          balance: Number(account.balance),
          dueDate: new Date(dueDate),
          lastPaymentDate: lastPayment?.performedAt,
          promiseToPayDate: account.promisesToPay[0]?.promiseDate,
          promiseToPayAmount: account.promisesToPay[0] ? Number(account.promisesToPay[0].amount) : undefined,
          hasHardship: account.hasHardship || false,
          onPaymentPlan: account.onPaymentPlan || false,
          hasValidPhone: !!account.patient?.phone,
          hasValidEmail: !!account.patient?.email,
          hasRespondedToContact: false,
          contactAttemptCount: 0,
          hasActiveDispute: account.hasActiveDispute || false,
          isOnHardship: account.hasHardship || false,
        };

        // Check if should skip
        const skipCheck = shouldSkipDunning(dunningInput);
        if (skipCheck.skip) {
          result.skipped++;
          result.results.push({
            accountId: account.id,
            action: 'SKIP',
            success: true,
            message: skipCheck.reason || 'Skipped',
          });
          continue;
        }

        // Generate dunning plan
        const plan = generateDunningPlan(dunningInput);

        // Get next action
        const nextAction = getNextDunningAction(plan);
        if (!nextAction) {
          result.skipped++;
          continue;
        }

        // Execute the action
        const execResult = executeDunningAction(account.id, nextAction);

        // Record the action in database
        await prisma.collectionAction.create({
          data: {
            accountId: account.id,
            action: nextAction.action,
            result: execResult.message,
            performedAt: new Date(),
            performedBy: 'DUNNING_BATCH',
            metadata: {
              channel: nextAction.channel,
              template: nextAction.template,
            },
          },
        });

        // Update last activity date
        await prisma.collectionAccount.update({
          where: { id: account.id },
          data: { lastActivityDate: new Date() },
        });

        result.actionsExecuted++;
        result.results.push({
          accountId: account.id,
          action: nextAction.action,
          success: execResult.success,
          message: execResult.message,
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Account ${account.id}: ${errorMsg}`);
        result.results.push({
          accountId: account.id,
          action: 'ERROR',
          success: false,
          message: errorMsg,
        });
      }
    }

    // Log the batch run
    await prisma.auditLog.create({
      data: {
        action: 'DUNNING_BATCH_RUN',
        entityType: 'CollectionAccount',
        details: {
          processed: result.processed,
          actionsExecuted: result.actionsExecuted,
          skipped: result.skipped,
          errorCount: result.errors.length,
        },
      },
    });

    return result;
  }

  /**
   * Assign accounts to a collection agency
   * IMPORTANT: Caller should verify accounts belong to the organization before calling
   */
  async assignToAgency(
    accountIds: string[],
    agencyId: string,
    assignedBy?: string,
    organizationId?: string
  ): Promise<AgencyAssignmentResult> {
    const result: AgencyAssignmentResult = {
      success: true,
      assignedCount: 0,
      failedCount: 0,
      errors: [],
      agencyId,
      accountIds: [],
    };

    // Verify agency exists
    const agency = await prisma.collectionAgency.findUnique({
      where: { id: agencyId },
    });

    if (!agency) {
      throw new Error(`Agency ${agencyId} not found`);
    }

    for (const accountId of accountIds) {
      try {
        // Get account with organization check
        const account = await prisma.collectionAccount.findUnique({
          where: { id: accountId },
          include: {
            patient: {
              include: {
                assessment: { select: { organizationId: true } }
              }
            }
          }
        });

        if (!account) {
          result.failedCount++;
          result.errors.push(`Account ${accountId} not found`);
          continue;
        }

        // Verify tenant ownership if organizationId provided
        if (organizationId && account.patient?.assessment?.organizationId !== organizationId) {
          result.failedCount++;
          result.errors.push(`Account ${accountId} not found`);
          continue;
        }

        // Check if account can be sent to agency
        const stateConfig = getStateConfig(account.state as CollectionState);
        if (!stateConfig.canSendToAgency) {
          result.failedCount++;
          result.errors.push(`Account ${accountId} in state ${account.state} cannot be sent to agency`);
          continue;
        }

        // Update account
        await prisma.collectionAccount.update({
          where: { id: accountId },
          data: {
            state: 'COLLECTION_AGENCY',
            assignedAgencyId: agencyId,
            agencyAssignedDate: new Date(),
            lastActivityDate: new Date(),
          },
        });

        // Record the action
        await prisma.collectionAction.create({
          data: {
            accountId,
            action: 'SEND_TO_AGENCY',
            result: `Assigned to agency: ${agency.name}`,
            performedAt: new Date(),
            performedBy: assignedBy || 'SYSTEM',
            metadata: {
              agencyId,
              agencyName: agency.name,
            },
          },
        });

        result.assignedCount++;
        result.accountIds.push(accountId);
      } catch (error) {
        result.failedCount++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Account ${accountId}: ${errorMsg}`);
      }
    }

    result.success = result.failedCount === 0;

    // Log the batch assignment
    await prisma.auditLog.create({
      data: {
        action: 'AGENCY_ASSIGNMENT',
        entityType: 'CollectionAccount',
        userId: assignedBy,
        details: {
          agencyId,
          agencyName: agency.name,
          assignedCount: result.assignedCount,
          failedCount: result.failedCount,
          accountIds: result.accountIds,
        },
      },
    });

    return result;
  }

  /**
   * Recall an account from a collection agency
   * IMPORTANT: Requires organizationId for tenant isolation
   */
  async recallFromAgency(accountId: string, recalledBy?: string, organizationId?: string): Promise<TransitionResult> {
    const account = await prisma.collectionAccount.findUnique({
      where: { id: accountId },
      include: {
        assignedAgency: true,
        patient: {
          include: {
            assessment: { select: { organizationId: true } }
          }
        }
      },
    });

    if (!account) {
      throw new Error(`Account ${accountId} not found`);
    }

    // Verify tenant ownership if organizationId provided
    if (organizationId && account.patient?.assessment?.organizationId !== organizationId) {
      throw new Error(`Account ${accountId} not found`);
    }

    if (account.state !== 'COLLECTION_AGENCY') {
      throw new Error(`Account ${accountId} is not at collection agency`);
    }

    const agencyName = account.assignedAgency?.name || 'Unknown agency';

    // Update account
    await prisma.collectionAccount.update({
      where: { id: accountId },
      data: {
        state: 'PRE_COLLECTION',
        assignedAgencyId: null,
        agencyRecalledDate: new Date(),
        lastActivityDate: new Date(),
      },
    });

    // Record the action
    await prisma.collectionAction.create({
      data: {
        accountId,
        action: 'RECALL_FROM_AGENCY',
        result: `Recalled from agency: ${agencyName}`,
        performedAt: new Date(),
        performedBy: recalledBy || 'SYSTEM',
        metadata: {
          previousAgencyId: account.assignedAgencyId,
          previousAgencyName: agencyName,
        },
      },
    });

    return {
      success: true,
      accountId,
      previousState: 'COLLECTION_AGENCY',
      newState: 'PRE_COLLECTION',
      reason: `Recalled from ${agencyName}`,
      requiresApproval: false,
      actionsPerformed: ['RECALL_FROM_AGENCY'],
    };
  }

  /**
   * Record a promise to pay
   * IMPORTANT: Requires organizationId for tenant isolation
   */
  async recordPromiseToPay(input: PromiseToPayInput, organizationId?: string): Promise<{ id: string; success: boolean }> {
    const account = await prisma.collectionAccount.findUnique({
      where: { id: input.accountId },
      include: {
        patient: {
          include: {
            assessment: { select: { organizationId: true } }
          }
        }
      }
    });

    if (!account) {
      throw new Error(`Account ${input.accountId} not found`);
    }

    // Verify tenant ownership if organizationId provided
    if (organizationId && account.patient?.assessment?.organizationId !== organizationId) {
      throw new Error(`Account ${input.accountId} not found`);
    }

    // Create promise to pay
    const promise = await prisma.promiseToPay.create({
      data: {
        accountId: input.accountId,
        promiseDate: new Date(input.promiseDate),
        amount: input.amount,
        status: 'PENDING',
        notes: input.notes,
        createdBy: input.createdBy,
      },
    });

    // Record the action
    await prisma.collectionAction.create({
      data: {
        accountId: input.accountId,
        action: 'RECORD_PROMISE_TO_PAY',
        result: `Promise to pay $${input.amount} by ${input.promiseDate}`,
        performedAt: new Date(),
        performedBy: input.createdBy || 'SYSTEM',
        metadata: {
          promiseId: promise.id,
          amount: input.amount,
          promiseDate: input.promiseDate,
        },
      },
    });

    // Update account
    await prisma.collectionAccount.update({
      where: { id: input.accountId },
      data: { lastActivityDate: new Date() },
    });

    return { id: promise.id, success: true };
  }

  /**
   * Process a payment plan
   * IMPORTANT: Requires organizationId for tenant isolation
   */
  async processPaymentPlan(input: PaymentPlanInput, organizationId?: string): Promise<{ success: boolean; planId: string }> {
    const account = await prisma.collectionAccount.findUnique({
      where: { id: input.accountId },
      include: {
        patient: {
          include: {
            assessment: { select: { organizationId: true } }
          }
        }
      }
    });

    if (!account) {
      throw new Error(`Account ${input.accountId} not found`);
    }

    // Verify tenant ownership if organizationId provided
    if (organizationId && account.patient?.assessment?.organizationId !== organizationId) {
      throw new Error(`Account ${input.accountId} not found`);
    }

    // Create payment plan record (as a series of promise-to-pay entries)
    const planId = `PP-${Date.now()}`;
    const firstPaymentDate = new Date(input.firstPaymentDate);

    // Calculate payment schedule
    const promises = [];
    let currentDate = new Date(firstPaymentDate);

    for (let i = 0; i < input.numberOfPayments; i++) {
      promises.push(
        prisma.promiseToPay.create({
          data: {
            accountId: input.accountId,
            promiseDate: new Date(currentDate),
            amount: input.paymentAmount,
            status: 'PENDING',
            notes: `Payment plan ${planId} - Payment ${i + 1} of ${input.numberOfPayments}`,
            createdBy: input.createdBy,
          },
        })
      );

      // Advance to next payment date
      switch (input.paymentFrequency) {
        case 'WEEKLY':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'BIWEEKLY':
          currentDate.setDate(currentDate.getDate() + 14);
          break;
        case 'MONTHLY':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
      }
    }

    await Promise.all(promises);

    // Update account state
    const currentState = account.state as CollectionState;
    const { nextState } = getNextState(currentState, 0, 'PAYMENT_PLAN_STARTED', Number(account.balance));

    await prisma.collectionAccount.update({
      where: { id: input.accountId },
      data: {
        state: nextState,
        onPaymentPlan: true,
        paymentPlanId: planId,
        lastActivityDate: new Date(),
      },
    });

    // Record the action
    await prisma.collectionAction.create({
      data: {
        accountId: input.accountId,
        action: 'SET_UP_PAYMENT_PLAN',
        result: `Payment plan created: ${input.numberOfPayments} payments of $${input.paymentAmount} ${input.paymentFrequency}`,
        performedAt: new Date(),
        performedBy: input.createdBy || 'SYSTEM',
        metadata: {
          planId,
          totalAmount: input.totalAmount,
          numberOfPayments: input.numberOfPayments,
          paymentFrequency: input.paymentFrequency,
          paymentAmount: input.paymentAmount,
        },
      },
    });

    return { success: true, planId };
  }

  /**
   * Get collection dashboard metrics
   */
  async getDashboard(organizationId?: string, includeDemoData?: boolean): Promise<CollectionDashboard> {
    const where: any = {};
    if (organizationId) {
      where.patient = { assessment: { organizationId } };
    }
    // Demo data filter - when includeDemoData is false, exclude demo records
    if (includeDemoData === false) {
      where.isDemoData = false;
    }

    // Get all accounts
    const accounts = await prisma.collectionAccount.findMany({
      where,
      select: {
        id: true,
        state: true,
        balance: true,
        dueDate: true,
        assignedAgencyId: true,
        onPaymentPlan: true,
        promisesToPay: {
          where: { status: 'PENDING' },
          select: { id: true },
        },
      },
    });

    const totalAccounts = accounts.length;
    const totalBalance = accounts.reduce((sum, a) => sum + Number(a.balance), 0);

    // Group by state
    const accountsByState: Record<string, { count: number; balance: number }> = {};
    const stateNames: CollectionState[] = [
      'CURRENT', 'PAST_DUE_30', 'PAST_DUE_60', 'PAST_DUE_90',
      'PAST_DUE_120', 'PRE_COLLECTION', 'COLLECTION_AGENCY',
      'BAD_DEBT', 'PAID', 'WRITTEN_OFF'
    ];

    for (const state of stateNames) {
      accountsByState[state] = { count: 0, balance: 0 };
    }

    for (const account of accounts) {
      const state = account.state as CollectionState;
      if (accountsByState[state]) {
        accountsByState[state].count++;
        accountsByState[state].balance += Number(account.balance);
      }
    }

    // Calculate aging buckets
    const now = Date.now();
    const agingBuckets: AgingBucket[] = [
      { bucket: 'Current', minDays: -Infinity, maxDays: 0, accountCount: 0, totalBalance: 0, averageBalance: 0 },
      { bucket: '1-30 Days', minDays: 1, maxDays: 30, accountCount: 0, totalBalance: 0, averageBalance: 0 },
      { bucket: '31-60 Days', minDays: 31, maxDays: 60, accountCount: 0, totalBalance: 0, averageBalance: 0 },
      { bucket: '61-90 Days', minDays: 61, maxDays: 90, accountCount: 0, totalBalance: 0, averageBalance: 0 },
      { bucket: '91-120 Days', minDays: 91, maxDays: 120, accountCount: 0, totalBalance: 0, averageBalance: 0 },
      { bucket: '120+ Days', minDays: 121, maxDays: null, accountCount: 0, totalBalance: 0, averageBalance: 0 },
    ];

    for (const account of accounts) {
      if (!account.dueDate) continue;
      const daysPastDue = Math.floor((now - new Date(account.dueDate).getTime()) / (24 * 60 * 60 * 1000));

      for (const bucket of agingBuckets) {
        if (daysPastDue >= bucket.minDays && (bucket.maxDays === null || daysPastDue <= bucket.maxDays)) {
          bucket.accountCount++;
          bucket.totalBalance += Number(account.balance);
          break;
        }
      }
    }

    // Calculate averages
    for (const bucket of agingBuckets) {
      bucket.averageBalance = bucket.accountCount > 0
        ? Math.round(bucket.totalBalance / bucket.accountCount)
        : 0;
    }

    // Get agency stats
    const atAgencyAccounts = accounts.filter(a => a.state === 'COLLECTION_AGENCY');
    const atAgencyCount = atAgencyAccounts.length;
    const atAgencyBalance = atAgencyAccounts.reduce((sum, a) => sum + Number(a.balance), 0);

    // Get promise to pay and payment plan counts
    const promiseToPayActive = accounts.filter(a => a.promisesToPay.length > 0).length;
    const paymentPlansActive = accounts.filter(a => a.onPaymentPlan).length;

    // Get recent payments
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentPayments = await prisma.collectionAction.findMany({
      where: {
        action: 'APPLY_PAYMENT',
        performedAt: { gte: thirtyDaysAgo },
        ...(organizationId ? {
          account: { patient: { assessment: { organizationId } } }
        } : {}),
      },
      orderBy: { performedAt: 'desc' },
      take: 100,
    });

    // Group payments by date
    const paymentsByDate: Record<string, { amount: number; count: number }> = {};
    for (const payment of recentPayments) {
      const dateKey = payment.performedAt.toISOString().split('T')[0];
      if (!paymentsByDate[dateKey]) {
        paymentsByDate[dateKey] = { amount: 0, count: 0 };
      }
      paymentsByDate[dateKey].count++;
      // Try to extract amount from metadata
      const metadata = payment.metadata as any;
      if (metadata?.amount) {
        paymentsByDate[dateKey].amount += Number(metadata.amount);
      }
    }

    const recentActivity = Object.entries(paymentsByDate)
      .map(([date, data]) => ({
        date: new Date(date),
        type: 'PAYMENT',
        amount: data.amount,
        count: data.count,
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 7);

    // Calculate collection rate (paid / total in last 30 days)
    const paidInPeriod = accountsByState['PAID']?.balance || 0;
    const collectionRate = totalBalance > 0
      ? Math.round((paidInPeriod / (paidInPeriod + totalBalance)) * 100)
      : 0;

    // Calculate average days to pay (simplified)
    const averageDaysToPay = 45; // This would need actual payment history analysis

    return {
      totalAccounts,
      totalBalance,
      accountsByState: accountsByState as Record<CollectionState, { count: number; balance: number }>,
      agingBuckets,
      collectionRate,
      averageDaysToPay,
      atAgencyCount,
      atAgencyBalance,
      promiseToPayActive,
      paymentPlansActive,
      recentActivity,
    };
  }

  /**
   * Get aging report
   */
  async getAgingReport(organizationId?: string, includeDemoData?: boolean): Promise<{
    reportDate: Date;
    buckets: AgingBucket[];
    total: { accountCount: number; totalBalance: number };
    byInsurance: Record<string, AgingBucket[]>;
  }> {
    const where: any = {
      balance: { gt: 0 },
      state: { notIn: ['PAID', 'WRITTEN_OFF'] },
    };

    if (organizationId) {
      where.patient = { assessment: { organizationId } };
    }
    // Demo data filter - when includeDemoData is false, exclude demo records
    if (includeDemoData === false) {
      where.isDemoData = false;
    }

    const accounts = await prisma.collectionAccount.findMany({
      where,
      include: {
        patient: true,
      },
    });

    const now = Date.now();
    const buckets: AgingBucket[] = [
      { bucket: 'Current', minDays: -Infinity, maxDays: 0, accountCount: 0, totalBalance: 0, averageBalance: 0 },
      { bucket: '1-30 Days', minDays: 1, maxDays: 30, accountCount: 0, totalBalance: 0, averageBalance: 0 },
      { bucket: '31-60 Days', minDays: 31, maxDays: 60, accountCount: 0, totalBalance: 0, averageBalance: 0 },
      { bucket: '61-90 Days', minDays: 61, maxDays: 90, accountCount: 0, totalBalance: 0, averageBalance: 0 },
      { bucket: '91-120 Days', minDays: 91, maxDays: 120, accountCount: 0, totalBalance: 0, averageBalance: 0 },
      { bucket: '120+ Days', minDays: 121, maxDays: null, accountCount: 0, totalBalance: 0, averageBalance: 0 },
    ];

    const byInsurance: Record<string, AgingBucket[]> = {};

    for (const account of accounts) {
      const dueDate = account.dueDate || account.createdAt;
      const daysPastDue = Math.floor((now - new Date(dueDate).getTime()) / (24 * 60 * 60 * 1000));
      const balance = Number(account.balance);
      const insuranceStatus = account.insuranceStatus || 'UNKNOWN';

      // Initialize insurance buckets if needed
      if (!byInsurance[insuranceStatus]) {
        byInsurance[insuranceStatus] = buckets.map(b => ({ ...b, accountCount: 0, totalBalance: 0, averageBalance: 0 }));
      }

      // Find appropriate bucket
      for (let i = 0; i < buckets.length; i++) {
        const bucket = buckets[i];
        if (daysPastDue >= bucket.minDays && (bucket.maxDays === null || daysPastDue <= bucket.maxDays)) {
          bucket.accountCount++;
          bucket.totalBalance += balance;
          byInsurance[insuranceStatus][i].accountCount++;
          byInsurance[insuranceStatus][i].totalBalance += balance;
          break;
        }
      }
    }

    // Calculate averages
    for (const bucket of buckets) {
      bucket.averageBalance = bucket.accountCount > 0
        ? Math.round(bucket.totalBalance / bucket.accountCount)
        : 0;
    }

    for (const ins of Object.values(byInsurance)) {
      for (const bucket of ins) {
        bucket.averageBalance = bucket.accountCount > 0
          ? Math.round(bucket.totalBalance / bucket.accountCount)
          : 0;
      }
    }

    const total = {
      accountCount: buckets.reduce((sum, b) => sum + b.accountCount, 0),
      totalBalance: buckets.reduce((sum, b) => sum + b.totalBalance, 0),
    };

    return {
      reportDate: new Date(),
      buckets,
      total,
      byInsurance,
    };
  }

  /**
   * Score and prioritize accounts
   */
  async scoreAndPrioritizeAccounts(
    organizationId?: string,
    limit: number = 100,
    includeDemoData?: boolean
  ): Promise<{
    accounts: Array<CollectionScoreResult & { accountDetails: any }>;
    portfolioMetrics: ReturnType<typeof calculatePortfolioMetrics>;
  }> {
    const where: any = {
      balance: { gt: 25 },
      state: { notIn: ['PAID', 'WRITTEN_OFF'] },
    };

    if (organizationId) {
      where.patient = { assessment: { organizationId } };
    }
    // Demo data filter - when includeDemoData is false, exclude demo records
    if (includeDemoData === false) {
      where.isDemoData = false;
    }

    const accounts = await prisma.collectionAccount.findMany({
      where,
      include: {
        patient: true,
        promisesToPay: {
          where: { status: { not: 'FULFILLED' } },
        },
        actions: {
          where: {
            action: { in: ['APPLY_PAYMENT', 'RECORD_PROMISE_TO_PAY'] },
          },
        },
      },
      take: limit,
    });

    const scoringInputs: CollectionScoringInput[] = accounts.map(account => {
      const dueDate = account.dueDate || account.createdAt;
      const daysPastDue = Math.max(0, Math.floor(
        (Date.now() - new Date(dueDate).getTime()) / (24 * 60 * 60 * 1000)
      ));
      const accountAgeDays = Math.floor(
        (Date.now() - new Date(account.createdAt).getTime()) / (24 * 60 * 60 * 1000)
      );

      const paymentActions = account.actions.filter(a => a.action === 'APPLY_PAYMENT');
      const brokenPromises = account.promisesToPay.filter(p => p.status === 'BROKEN').length;

      return {
        accountId: account.id,
        balance: Number(account.balance),
        originalAmount: Number(account.originalAmount || account.balance),
        accountAgeDays,
        daysPastDue,
        collectionState: account.state as CollectionState,
        accountType: (account.accountType as AccountType) || 'SELF_PAY',
        insuranceStatus: (account.insuranceStatus as InsuranceStatus) || 'UNINSURED',
        paymentHistory: this.getPaymentHistoryRating(paymentActions.length, brokenPromises),
        previousPaymentCount: paymentActions.length,
        previousPaymentTotal: 0, // Would need to sum from metadata
        brokenPromiseCount: brokenPromises,
        returnedPaymentCount: 0, // Would need tracking
        hasValidPhone: !!account.patient?.phone,
        hasValidEmail: !!account.patient?.email,
        hasRespondedToContact: false,
        contactAttemptCount: 0,
        hasActiveDispute: account.hasActiveDispute || false,
        isOnHardship: account.hasHardship || false,
      };
    });

    const scoredAccounts = scoringInputs.map(input => {
      const score = calculateCollectionScore(input);
      const accountDetails = accounts.find(a => a.id === input.accountId);
      return { ...score, accountDetails };
    });

    // Sort by expected recovery descending
    scoredAccounts.sort((a, b) => b.expectedRecovery - a.expectedRecovery);

    const portfolioMetrics = calculatePortfolioMetrics(scoringInputs);

    return {
      accounts: scoredAccounts,
      portfolioMetrics,
    };
  }

  /**
   * Helper to determine payment history rating
   */
  private getPaymentHistoryRating(paymentCount: number, brokenPromises: number): PaymentHistoryRating {
    if (paymentCount === 0 && brokenPromises === 0) return 'NO_HISTORY';
    if (brokenPromises >= 3) return 'POOR';
    if (brokenPromises >= 1) return 'FAIR';
    if (paymentCount >= 3) return 'EXCELLENT';
    if (paymentCount >= 1) return 'GOOD';
    return 'FAIR';
  }
}

// Export singleton instance
export const collectionService = new CollectionService();
