// @ts-nocheck
/**
 * Compliance Controller
 * Business logic for 501(r) charity care and DSH audit compliance
 */

import {
  evaluateCharityCare501r,
  calculateDSHAudit,
  type CharityCare501rInput,
  type DSHAuditInput
} from '@halcyon-rcm/core';
import { prisma } from '../lib/prisma.js';

export interface ComplianceNoticeInput {
  accountId: string;
  noticeType: 'FAP_PLAIN_LANGUAGE' | 'ECA_30_DAY' | 'ECA_WRITTEN' | 'FAP_APPLICATION' | 'FAP_DETERMINATION';
  sentDate: string;
  deliveryMethod: string;
  confirmed?: boolean;
}

export interface ComplianceTimelineItem {
  date: string;
  event: string;
  status: 'completed' | 'pending' | 'overdue' | 'upcoming';
  daysRemaining?: number;
}

export interface ComplianceDashboardData {
  // 501(r) Summary
  charityCare: {
    totalAccounts: number;
    accountsWithFAPNotice: number;
    accountsNearingECADeadline: number;
    accountsPastECADeadline: number;
    totalCharityCarePending: number;
  };

  // DSH Summary
  dsh: {
    currentDPP: number;
    qualifiesForDSH: boolean;
    auditReadinessScore: number;
    documentationGaps: string[];
    excessPaymentRisk: number;
  };

  // Upcoming deadlines
  upcomingDeadlines: ComplianceTimelineItem[];

  // Compliance alerts
  alerts: Array<{
    severity: 'high' | 'medium' | 'low';
    message: string;
    accountIds?: string[];
  }>;
}

export class ComplianceController {
  /**
   * Evaluate 501(r) compliance for a patient account
   */
  async evaluateCharityCarecompliance(input: CharityCare501rInput): Promise<{
    compliance: ReturnType<typeof evaluateCharityCare501r>;
    timeline: ComplianceTimelineItem[];
  }> {
    const result = evaluateCharityCare501r(input);

    // Build compliance timeline
    const timeline = this.buildComplianceTimeline(input, result);

    return {
      compliance: result,
      timeline
    };
  }

  /**
   * Calculate DSH audit metrics
   */
  async calculateDSHMetrics(input: DSHAuditInput): Promise<ReturnType<typeof calculateDSHAudit>> {
    return calculateDSHAudit(input);
  }

  /**
   * Get compliance dashboard data
   */
  async getDashboardData(organizationId: string): Promise<ComplianceDashboardData> {
    // Get accounts with compliance notices
    const complianceNotices = await prisma.complianceNotice.findMany({
      where: {
        account: {
          assessment: {
            organizationId
          }
        }
      },
      include: {
        account: true
      }
    });

    // Get recovery accounts for analysis
    const recoveryAccounts = await prisma.recoveryAccount.findMany({
      where: {
        assessment: {
          organizationId
        }
      },
      include: {
        complianceNotices: true
      }
    });

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Calculate 501(r) metrics
    const accountsWithFAP = new Set(
      complianceNotices
        .filter(n => n.noticeType === 'FAP_PLAIN_LANGUAGE' && n.sentDate)
        .map(n => n.accountId)
    );

    const accountsNearingECA = recoveryAccounts.filter(account => {
      const notices = account.complianceNotices;
      const fapNotice = notices.find(n => n.noticeType === 'FAP_PLAIN_LANGUAGE');
      if (!fapNotice?.sentDate) return false;

      const ecaAllowedDate = new Date(fapNotice.sentDate);
      ecaAllowedDate.setDate(ecaAllowedDate.getDate() + 240);

      return ecaAllowedDate > now && ecaAllowedDate <= thirtyDaysFromNow;
    });

    const accountsPastECA = recoveryAccounts.filter(account => {
      const notices = account.complianceNotices;
      const fapNotice = notices.find(n => n.noticeType === 'FAP_PLAIN_LANGUAGE');
      if (!fapNotice?.sentDate) return false;

      const ecaAllowedDate = new Date(fapNotice.sentDate);
      ecaAllowedDate.setDate(ecaAllowedDate.getDate() + 240);

      return ecaAllowedDate <= now;
    });

    // Calculate upcoming deadlines
    const upcomingDeadlines = this.calculateUpcomingDeadlines(recoveryAccounts);

    // Generate alerts
    const alerts = this.generateComplianceAlerts(
      recoveryAccounts,
      accountsNearingECA,
      accountsPastECA
    );

    return {
      charityCare: {
        totalAccounts: recoveryAccounts.length,
        accountsWithFAPNotice: accountsWithFAP.size,
        accountsNearingECADeadline: accountsNearingECA.length,
        accountsPastECADeadline: accountsPastECA.length,
        totalCharityCarePending: recoveryAccounts.filter(a => a.status === 'SCREENED').length
      },
      dsh: {
        currentDPP: 0, // Would come from actual DSH calculation
        qualifiesForDSH: false,
        auditReadinessScore: 0,
        documentationGaps: [],
        excessPaymentRisk: 0
      },
      upcomingDeadlines,
      alerts
    };
  }

  /**
   * Record a compliance notice
   */
  async recordNotice(input: ComplianceNoticeInput): Promise<{ id: string }> {
    const notice = await prisma.complianceNotice.create({
      data: {
        accountId: input.accountId,
        noticeType: input.noticeType,
        sentDate: new Date(input.sentDate),
        deliveryMethod: input.deliveryMethod,
        confirmed: input.confirmed || false
      }
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: 'COMPLIANCE_NOTICE_SENT',
        entityType: 'ComplianceNotice',
        entityId: notice.id,
        details: {
          noticeType: input.noticeType,
          accountId: input.accountId,
          sentDate: input.sentDate
        }
      }
    });

    return { id: notice.id };
  }

  /**
   * Get compliance notices for an account
   */
  async getAccountNotices(accountId: string): Promise<any[]> {
    const notices = await prisma.complianceNotice.findMany({
      where: { accountId },
      orderBy: { sentDate: 'desc' }
    });

    return notices;
  }

  /**
   * Check if ECA is allowed for an account
   */
  async checkECAStatus(accountId: string): Promise<{
    ecaAllowed: boolean;
    ecaAllowedDate?: string;
    daysUntilECAAllowed?: number;
    missingRequirements: string[];
  }> {
    const notices = await prisma.complianceNotice.findMany({
      where: { accountId }
    });

    const fapPlainLanguage = notices.find(n => n.noticeType === 'FAP_PLAIN_LANGUAGE');
    const eca30Day = notices.find(n => n.noticeType === 'ECA_30_DAY');
    const ecaWritten = notices.find(n => n.noticeType === 'ECA_WRITTEN');

    const missingRequirements: string[] = [];

    if (!fapPlainLanguage?.sentDate) {
      missingRequirements.push('FAP Plain Language Summary not sent');
    }
    if (!eca30Day?.sentDate) {
      missingRequirements.push('30-day ECA notice not sent');
    }
    if (!ecaWritten?.sentDate) {
      missingRequirements.push('Written ECA notice not sent');
    }

    if (!fapPlainLanguage?.sentDate) {
      return {
        ecaAllowed: false,
        missingRequirements
      };
    }

    const ecaAllowedDate = new Date(fapPlainLanguage.sentDate);
    ecaAllowedDate.setDate(ecaAllowedDate.getDate() + 240);

    const now = new Date();
    const daysUntilECAAllowed = Math.ceil(
      (ecaAllowedDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
    );

    return {
      ecaAllowed: daysUntilECAAllowed <= 0 && missingRequirements.length === 0,
      ecaAllowedDate: ecaAllowedDate.toISOString().split('T')[0],
      daysUntilECAAllowed: Math.max(0, daysUntilECAAllowed),
      missingRequirements
    };
  }

  /**
   * Get accounts requiring compliance action
   */
  async getAccountsRequiringAction(
    organizationId: string,
    actionType: 'fap_notice' | 'eca_deadline' | 'application_followup'
  ): Promise<any[]> {
    const now = new Date();

    switch (actionType) {
      case 'fap_notice':
        // Accounts without FAP notice sent within 120 days of service
        return prisma.recoveryAccount.findMany({
          where: {
            assessment: { organizationId },
            complianceNotices: {
              none: {
                noticeType: 'FAP_PLAIN_LANGUAGE'
              }
            }
          },
          include: {
            assessment: true
          }
        });

      case 'eca_deadline':
        // Accounts approaching 240-day ECA deadline
        const accounts = await prisma.recoveryAccount.findMany({
          where: {
            assessment: { organizationId }
          },
          include: {
            complianceNotices: true,
            assessment: true
          }
        });

        return accounts.filter(account => {
          const fapNotice = account.complianceNotices.find(
            n => n.noticeType === 'FAP_PLAIN_LANGUAGE' && n.sentDate
          );
          if (!fapNotice?.sentDate) return false;

          const ecaDate = new Date(fapNotice.sentDate);
          ecaDate.setDate(ecaDate.getDate() + 240);

          const daysRemaining = Math.ceil(
            (ecaDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
          );

          return daysRemaining > 0 && daysRemaining <= 30;
        });

      case 'application_followup':
        // Accounts with FAP application but no determination
        return prisma.recoveryAccount.findMany({
          where: {
            assessment: { organizationId },
            complianceNotices: {
              some: { noticeType: 'FAP_APPLICATION' },
              none: { noticeType: 'FAP_DETERMINATION' }
            }
          },
          include: {
            assessment: true,
            complianceNotices: true
          }
        });

      default:
        return [];
    }
  }

  // Private helper methods
  private buildComplianceTimeline(
    input: CharityCare501rInput,
    result: ReturnType<typeof evaluateCharityCare501r>
  ): ComplianceTimelineItem[] {
    const timeline: ComplianceTimelineItem[] = [];
    const now = new Date();
    const dosDate = new Date(input.dateOfService);

    // Day 1: Date of Service
    timeline.push({
      date: input.dateOfService,
      event: 'Date of Service',
      status: 'completed'
    });

    // Day 120: FAP Notice Deadline
    const fapDeadline = new Date(dosDate);
    fapDeadline.setDate(fapDeadline.getDate() + 120);

    const fapSent = input.notificationsSent?.some(n => n.type === 'FAP_PLAIN_LANGUAGE');
    timeline.push({
      date: fapDeadline.toISOString().split('T')[0],
      event: 'FAP Plain Language Summary Deadline',
      status: fapSent ? 'completed' : (fapDeadline < now ? 'overdue' : 'pending'),
      daysRemaining: fapSent ? undefined : Math.max(0, Math.ceil((fapDeadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
    });

    // Day 240: ECA Allowed Date
    const ecaDate = new Date(dosDate);
    ecaDate.setDate(ecaDate.getDate() + 240);

    timeline.push({
      date: ecaDate.toISOString().split('T')[0],
      event: 'Extraordinary Collection Actions Allowed',
      status: ecaDate <= now ? 'completed' : 'upcoming',
      daysRemaining: Math.max(0, Math.ceil((ecaDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
    });

    return timeline;
  }

  private calculateUpcomingDeadlines(accounts: any[]): ComplianceTimelineItem[] {
    const deadlines: ComplianceTimelineItem[] = [];
    const now = new Date();

    for (const account of accounts) {
      const fapNotice = account.complianceNotices?.find(
        (n: any) => n.noticeType === 'FAP_PLAIN_LANGUAGE' && n.sentDate
      );

      if (fapNotice?.sentDate) {
        const ecaDate = new Date(fapNotice.sentDate);
        ecaDate.setDate(ecaDate.getDate() + 240);

        if (ecaDate > now) {
          const daysRemaining = Math.ceil(
            (ecaDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
          );

          if (daysRemaining <= 60) {
            deadlines.push({
              date: ecaDate.toISOString().split('T')[0],
              event: `ECA deadline for account ${account.id.substring(0, 8)}`,
              status: daysRemaining <= 30 ? 'pending' : 'upcoming',
              daysRemaining
            });
          }
        }
      }
    }

    return deadlines.sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    ).slice(0, 10);
  }

  private generateComplianceAlerts(
    allAccounts: any[],
    nearingECA: any[],
    pastECA: any[]
  ): Array<{ severity: 'high' | 'medium' | 'low'; message: string; accountIds?: string[] }> {
    const alerts: Array<{ severity: 'high' | 'medium' | 'low'; message: string; accountIds?: string[] }> = [];

    if (pastECA.length > 0) {
      alerts.push({
        severity: 'high',
        message: `${pastECA.length} account(s) are past the 240-day ECA deadline and may be eligible for collection actions`,
        accountIds: pastECA.map(a => a.id)
      });
    }

    if (nearingECA.length > 0) {
      alerts.push({
        severity: 'medium',
        message: `${nearingECA.length} account(s) are approaching ECA deadline within 30 days`,
        accountIds: nearingECA.map(a => a.id)
      });
    }

    const accountsWithoutFAP = allAccounts.filter(
      a => !a.complianceNotices?.some((n: any) => n.noticeType === 'FAP_PLAIN_LANGUAGE')
    );

    if (accountsWithoutFAP.length > 0) {
      alerts.push({
        severity: 'medium',
        message: `${accountsWithoutFAP.length} account(s) do not have a FAP Plain Language Summary on file`,
        accountIds: accountsWithoutFAP.map(a => a.id)
      });
    }

    return alerts;
  }
}

// Export singleton instance
export const complianceController = new ComplianceController();
