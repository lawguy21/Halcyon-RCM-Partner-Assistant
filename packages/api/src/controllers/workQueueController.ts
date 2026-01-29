// @ts-nocheck
/**
 * Work Queue Controller
 * Business logic for managing work queue items and assignments
 */

import { prisma } from '../lib/prisma.js';

export type WorkQueueType =
  | 'NEW_ACCOUNTS'
  | 'PENDING_ELIGIBILITY'
  | 'DENIALS'
  | 'APPEALS'
  | 'CALLBACKS'
  | 'COMPLIANCE';

export interface WorkQueueFilters {
  queueType?: WorkQueueType;
  assignedToId?: string;
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  priority?: number;
  dueDateBefore?: string;
  dueDateAfter?: string;
  limit?: number;
  offset?: number;
}

export interface WorkQueueStats {
  totalItems: number;
  pendingItems: number;
  inProgressItems: number;
  completedToday: number;
  overdue: number;
  byQueue: Record<WorkQueueType, { total: number; pending: number; overdue: number }>;
  byAssignee: Array<{ userId: string; userName: string; pending: number; inProgress: number; completedToday: number }>;
}

export interface WorkQueueItemInput {
  accountId: string;
  queueType: WorkQueueType;
  priority?: number;
  dueDate?: string;
  assignedToId?: string;
  notes?: string;
}

export class WorkQueueController {
  /**
   * Get work queue items with filters
   */
  async getItems(filters: WorkQueueFilters = {}): Promise<{
    items: any[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const where: any = {};

    if (filters.queueType) where.queueType = filters.queueType;
    if (filters.assignedToId) where.assignedToId = filters.assignedToId;
    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = { lte: filters.priority };

    if (filters.dueDateBefore || filters.dueDateAfter) {
      where.dueDate = {};
      if (filters.dueDateBefore) where.dueDate.lte = new Date(filters.dueDateBefore);
      if (filters.dueDateAfter) where.dueDate.gte = new Date(filters.dueDateAfter);
    }

    const limit = Math.min(filters.limit || 50, 100);
    const offset = filters.offset || 0;

    const [items, total] = await Promise.all([
      prisma.workQueueItem.findMany({
        where,
        include: {
          account: {
            include: {
              assessment: true
            }
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: [
          { priority: 'asc' },
          { dueDate: 'asc' },
          { createdAt: 'asc' }
        ],
        take: limit,
        skip: offset
      }),
      prisma.workQueueItem.count({ where })
    ]);

    return { items, total, limit, offset };
  }

  /**
   * Get a single work queue item
   */
  async getItem(itemId: string): Promise<any | null> {
    return prisma.workQueueItem.findUnique({
      where: { id: itemId },
      include: {
        account: {
          include: {
            assessment: true,
            claims: {
              include: {
                denials: true,
                appeals: true
              }
            },
            communications: true,
            complianceNotices: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
  }

  /**
   * Create a new work queue item
   */
  async createItem(input: WorkQueueItemInput): Promise<{ id: string }> {
    const item = await prisma.workQueueItem.create({
      data: {
        accountId: input.accountId,
        queueType: input.queueType,
        priority: input.priority ?? 5,
        dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
        assignedToId: input.assignedToId,
        notes: input.notes,
        status: 'PENDING'
      }
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: 'WORK_QUEUE_ITEM_CREATED',
        entityType: 'WorkQueueItem',
        entityId: item.id,
        details: {
          accountId: input.accountId,
          queueType: input.queueType
        }
      }
    });

    return { id: item.id };
  }

  /**
   * Claim a work queue item
   */
  async claimItem(itemId: string, userId: string): Promise<{ success: boolean }> {
    const item = await prisma.workQueueItem.findUnique({
      where: { id: itemId }
    });

    if (!item) {
      throw new Error('Work queue item not found');
    }

    if (item.assignedToId && item.assignedToId !== userId) {
      throw new Error('Item is already assigned to another user');
    }

    await prisma.workQueueItem.update({
      where: { id: itemId },
      data: {
        assignedToId: userId,
        status: 'IN_PROGRESS'
      }
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: 'WORK_QUEUE_ITEM_CLAIMED',
        entityType: 'WorkQueueItem',
        entityId: itemId,
        userId,
        details: { previousAssignee: item.assignedToId }
      }
    });

    return { success: true };
  }

  /**
   * Release a work queue item
   */
  async releaseItem(itemId: string, userId: string): Promise<{ success: boolean }> {
    const item = await prisma.workQueueItem.findUnique({
      where: { id: itemId }
    });

    if (!item) {
      throw new Error('Work queue item not found');
    }

    if (item.assignedToId !== userId) {
      throw new Error('You can only release items assigned to you');
    }

    await prisma.workQueueItem.update({
      where: { id: itemId },
      data: {
        assignedToId: null,
        status: 'PENDING'
      }
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: 'WORK_QUEUE_ITEM_RELEASED',
        entityType: 'WorkQueueItem',
        entityId: itemId,
        userId
      }
    });

    return { success: true };
  }

  /**
   * Complete a work queue item
   */
  async completeItem(
    itemId: string,
    userId: string,
    notes?: string
  ): Promise<{ success: boolean }> {
    const item = await prisma.workQueueItem.findUnique({
      where: { id: itemId }
    });

    if (!item) {
      throw new Error('Work queue item not found');
    }

    if (item.assignedToId !== userId) {
      throw new Error('You can only complete items assigned to you');
    }

    await prisma.workQueueItem.update({
      where: { id: itemId },
      data: {
        status: 'COMPLETED',
        notes: notes ? (item.notes ? `${item.notes}\n\n${notes}` : notes) : item.notes
      }
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: 'WORK_QUEUE_ITEM_COMPLETED',
        entityType: 'WorkQueueItem',
        entityId: itemId,
        userId,
        details: { completionNotes: notes }
      }
    });

    return { success: true };
  }

  /**
   * Update item priority
   */
  async updatePriority(itemId: string, priority: number): Promise<{ success: boolean }> {
    if (priority < 1 || priority > 10) {
      throw new Error('Priority must be between 1 and 10');
    }

    await prisma.workQueueItem.update({
      where: { id: itemId },
      data: { priority }
    });

    return { success: true };
  }

  /**
   * Reassign item to another user
   */
  async reassignItem(
    itemId: string,
    newAssigneeId: string,
    currentUserId: string
  ): Promise<{ success: boolean }> {
    const item = await prisma.workQueueItem.findUnique({
      where: { id: itemId }
    });

    if (!item) {
      throw new Error('Work queue item not found');
    }

    await prisma.workQueueItem.update({
      where: { id: itemId },
      data: {
        assignedToId: newAssigneeId
      }
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: 'WORK_QUEUE_ITEM_REASSIGNED',
        entityType: 'WorkQueueItem',
        entityId: itemId,
        userId: currentUserId,
        details: {
          previousAssignee: item.assignedToId,
          newAssignee: newAssigneeId
        }
      }
    });

    return { success: true };
  }

  /**
   * Get work queue statistics
   */
  async getStats(organizationId?: string): Promise<WorkQueueStats> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const baseWhere: any = {};
    if (organizationId) {
      baseWhere.account = {
        assessment: { organizationId }
      };
    }

    // Get all items for stats calculation
    const allItems = await prisma.workQueueItem.findMany({
      where: baseWhere,
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Calculate totals
    const totalItems = allItems.length;
    const pendingItems = allItems.filter(i => i.status === 'PENDING').length;
    const inProgressItems = allItems.filter(i => i.status === 'IN_PROGRESS').length;
    const completedToday = allItems.filter(
      i => i.status === 'COMPLETED' && i.updatedAt >= todayStart
    ).length;
    const overdue = allItems.filter(
      i => i.dueDate && i.dueDate < now && i.status !== 'COMPLETED'
    ).length;

    // Group by queue type
    const byQueue: Record<WorkQueueType, { total: number; pending: number; overdue: number }> = {
      NEW_ACCOUNTS: { total: 0, pending: 0, overdue: 0 },
      PENDING_ELIGIBILITY: { total: 0, pending: 0, overdue: 0 },
      DENIALS: { total: 0, pending: 0, overdue: 0 },
      APPEALS: { total: 0, pending: 0, overdue: 0 },
      CALLBACKS: { total: 0, pending: 0, overdue: 0 },
      COMPLIANCE: { total: 0, pending: 0, overdue: 0 }
    };

    for (const item of allItems) {
      const queue = item.queueType as WorkQueueType;
      if (byQueue[queue]) {
        byQueue[queue].total++;
        if (item.status === 'PENDING') byQueue[queue].pending++;
        if (item.dueDate && item.dueDate < now && item.status !== 'COMPLETED') {
          byQueue[queue].overdue++;
        }
      }
    }

    // Group by assignee
    const assigneeMap = new Map<string, { userName: string; pending: number; inProgress: number; completedToday: number }>();

    for (const item of allItems) {
      if (item.assignedToId && item.assignedTo) {
        const existing = assigneeMap.get(item.assignedToId) || {
          userName: item.assignedTo.name || 'Unknown',
          pending: 0,
          inProgress: 0,
          completedToday: 0
        };

        if (item.status === 'PENDING') existing.pending++;
        if (item.status === 'IN_PROGRESS') existing.inProgress++;
        if (item.status === 'COMPLETED' && item.updatedAt >= todayStart) {
          existing.completedToday++;
        }

        assigneeMap.set(item.assignedToId, existing);
      }
    }

    const byAssignee = Array.from(assigneeMap.entries()).map(([userId, data]) => ({
      userId,
      ...data
    }));

    return {
      totalItems,
      pendingItems,
      inProgressItems,
      completedToday,
      overdue,
      byQueue,
      byAssignee
    };
  }

  /**
   * Get next item for a user to work on
   */
  async getNextItem(
    userId: string,
    queueType?: WorkQueueType
  ): Promise<any | null> {
    const where: any = {
      status: 'PENDING',
      OR: [
        { assignedToId: null },
        { assignedToId: userId }
      ]
    };

    if (queueType) where.queueType = queueType;

    const item = await prisma.workQueueItem.findFirst({
      where,
      orderBy: [
        { priority: 'asc' },
        { dueDate: 'asc' },
        { createdAt: 'asc' }
      ],
      include: {
        account: {
          include: {
            assessment: true
          }
        }
      }
    });

    return item;
  }

  /**
   * Bulk create work queue items
   */
  async bulkCreate(items: WorkQueueItemInput[]): Promise<{ created: number }> {
    const result = await prisma.workQueueItem.createMany({
      data: items.map(input => ({
        accountId: input.accountId,
        queueType: input.queueType,
        priority: input.priority ?? 5,
        dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
        assignedToId: input.assignedToId,
        notes: input.notes,
        status: 'PENDING'
      }))
    });

    return { created: result.count };
  }

  /**
   * Auto-generate work queue items based on rules
   */
  async autoGenerateItems(organizationId: string): Promise<{ created: number }> {
    let created = 0;

    // Get accounts without work queue items
    const accountsWithoutItems = await prisma.recoveryAccount.findMany({
      where: {
        assessment: { organizationId },
        workQueueItems: { none: {} }
      }
    });

    for (const account of accountsWithoutItems) {
      // Create NEW_ACCOUNTS item
      await prisma.workQueueItem.create({
        data: {
          accountId: account.id,
          queueType: 'NEW_ACCOUNTS',
          priority: 5,
          status: 'PENDING'
        }
      });
      created++;
    }

    // Get accounts with pending eligibility
    const pendingEligibility = await prisma.recoveryAccount.findMany({
      where: {
        assessment: { organizationId },
        status: 'ELIGIBILITY_PENDING',
        workQueueItems: {
          none: { queueType: 'PENDING_ELIGIBILITY' }
        }
      }
    });

    for (const account of pendingEligibility) {
      await prisma.workQueueItem.create({
        data: {
          accountId: account.id,
          queueType: 'PENDING_ELIGIBILITY',
          priority: 4,
          status: 'PENDING'
        }
      });
      created++;
    }

    // Get accounts with appeals due
    const appealDeadlines = await prisma.appeal.findMany({
      where: {
        deadline: { gte: new Date() },
        status: { in: ['DRAFT', 'FILED'] },
        claim: {
          account: {
            assessment: { organizationId }
          }
        }
      },
      include: {
        claim: {
          include: {
            account: true
          }
        }
      }
    });

    for (const appeal of appealDeadlines) {
      const existingItem = await prisma.workQueueItem.findFirst({
        where: {
          accountId: appeal.claim.accountId,
          queueType: 'APPEALS',
          status: { not: 'COMPLETED' }
        }
      });

      if (!existingItem) {
        await prisma.workQueueItem.create({
          data: {
            accountId: appeal.claim.accountId,
            queueType: 'APPEALS',
            priority: 2,
            dueDate: appeal.deadline,
            status: 'PENDING',
            notes: `Appeal Level ${appeal.appealLevel} - Deadline: ${appeal.deadline?.toISOString().split('T')[0]}`
          }
        });
        created++;
      }
    }

    return { created };
  }
}

// Export singleton instance
export const workQueueController = new WorkQueueController();
