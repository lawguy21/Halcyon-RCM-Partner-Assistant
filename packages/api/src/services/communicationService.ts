/**
 * Communication and Notification Service
 * Handles all patient and staff communications including 501(r) compliant notices
 */

import { prisma } from '../lib/prisma.js';
import { emailService, type TemplateData } from './emailService.js';

// Communication types
type CommunicationType =
  | 'email'
  | 'sms'
  | 'letter'
  | 'phone'
  | 'internal'
  | '501r_notice';

// 501(r) Notice types per IRS requirements
type Notice501rType =
  | 'fap_application'           // Financial Assistance Policy application
  | 'fap_plain_language_summary' // Plain language summary
  | 'eca_warning'               // Extraordinary Collection Action 30-day warning
  | 'billing_statement'         // Billing statement with FAP information
  | 'eligibility_determination'; // Eligibility determination notice

// Communication status
type CommunicationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'read';

// Communication log entry
interface CommunicationLog {
  id: string;
  accountId: string;
  type: CommunicationType;
  subType?: string;
  recipient: string;
  subject?: string;
  content: string;
  status: CommunicationStatus;
  metadata?: Record<string, unknown>;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

// SMS configuration
interface SMSConfig {
  provider: 'twilio' | 'aws_sns' | 'console';
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioFromNumber?: string;
  awsRegion?: string;
}

// Result type for send operations
interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: Date;
}

/**
 * Communication Service Class
 * Provides unified communication capabilities for patient and staff notifications
 */
class CommunicationService {
  private smsConfig: SMSConfig;

  constructor() {
    this.smsConfig = this.loadSMSConfig();
  }

  /**
   * Load SMS configuration from environment
   */
  private loadSMSConfig(): SMSConfig {
    const provider = (process.env.SMS_PROVIDER || 'console') as SMSConfig['provider'];

    return {
      provider,
      twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
      twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
      twilioFromNumber: process.env.TWILIO_FROM_NUMBER,
      awsRegion: process.env.AWS_REGION || 'us-east-1',
    };
  }

  /**
   * Send a templated email
   * @param to - Recipient email address(es)
   * @param template - Template name (without .html extension)
   * @param data - Template variable data
   */
  public async sendEmail(
    to: string | string[],
    template: string,
    data: TemplateData
  ): Promise<SendResult> {
    try {
      // Render the template
      const html = emailService.renderTemplate(template, data);

      // Determine subject based on template or data
      const subject = (data.subject as string) || this.getDefaultSubject(template);

      // Send the email
      const result = await emailService.sendRenderedEmail(to, subject, html);

      console.log(`[CommunicationService] Email sent via ${result.provider}: ${result.success}`);

      return {
        success: result.success,
        messageId: result.messageId,
        error: result.error,
        timestamp: result.timestamp,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[CommunicationService] Email error:', errorMessage);
      return {
        success: false,
        error: errorMessage,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get default email subject based on template name
   */
  private getDefaultSubject(template: string): string {
    const subjects: Record<string, string> = {
      'fap-application': 'Financial Assistance Program Application',
      'eca-warning': 'Important Notice: Action Required Within 30 Days',
      'eligibility-approved': 'Your Financial Assistance Application Has Been Approved',
      'eligibility-pending': 'Your Financial Assistance Application Status',
      'payment-reminder': 'Payment Plan Reminder',
      'staff-assignment': 'New Work Assignment Notification',
    };
    return subjects[template] || 'Important Notice from Healthcare Facility';
  }

  /**
   * Send an SMS notification
   * @param to - Phone number in E.164 format (+1XXXXXXXXXX)
   * @param message - SMS message content (max 160 chars recommended)
   */
  public async sendSMS(to: string, message: string): Promise<SendResult> {
    // Validate phone number format
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(to)) {
      return {
        success: false,
        error: 'Invalid phone number format. Use E.164 format (+1XXXXXXXXXX)',
        timestamp: new Date(),
      };
    }

    switch (this.smsConfig.provider) {
      case 'twilio':
        return this.sendViaTwilio(to, message);
      case 'aws_sns':
        return this.sendViaAWSSNS(to, message);
      case 'console':
      default:
        return this.sendSMSViaConsole(to, message);
    }
  }

  /**
   * Send SMS via Twilio
   */
  private async sendViaTwilio(to: string, message: string): Promise<SendResult> {
    const { twilioAccountSid, twilioAuthToken, twilioFromNumber } = this.smsConfig;

    if (!twilioAccountSid || !twilioAuthToken || !twilioFromNumber) {
      return {
        success: false,
        error: 'Twilio credentials not configured',
        timestamp: new Date(),
      };
    }

    try {
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: to,
            From: twilioFromNumber,
            Body: message,
          }),
        }
      );

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Twilio API error: ${response.status} - ${errorBody}`);
      }

      const result = await response.json() as { sid?: string };

      return {
        success: true,
        messageId: result.sid,
        timestamp: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[CommunicationService] Twilio error:', errorMessage);
      return {
        success: false,
        error: errorMessage,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Send SMS via AWS SNS
   */
  private async sendViaAWSSNS(to: string, message: string): Promise<SendResult> {
    try {
      const { SNSClient, PublishCommand } = await import('@aws-sdk/client-sns');

      const client = new SNSClient({ region: this.smsConfig.awsRegion });

      const command = new PublishCommand({
        PhoneNumber: to,
        Message: message,
        MessageAttributes: {
          'AWS.SNS.SMS.SMSType': {
            DataType: 'String',
            StringValue: 'Transactional',
          },
        },
      });

      const response = await client.send(command);

      return {
        success: true,
        messageId: response.MessageId,
        timestamp: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[CommunicationService] AWS SNS error:', errorMessage);
      return {
        success: false,
        error: errorMessage,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Console output for SMS (development mode)
   */
  private async sendSMSViaConsole(to: string, message: string): Promise<SendResult> {
    console.log('\n========================================');
    console.log('[CommunicationService] SMS SENT (Console Mode)');
    console.log('========================================');
    console.log(`To: ${to}`);
    console.log(`Message: ${message}`);
    console.log('========================================\n');

    return {
      success: true,
      messageId: `console-sms-${Date.now()}`,
      timestamp: new Date(),
    };
  }

  /**
   * Log a communication to the database
   * @param accountId - Patient account ID
   * @param type - Type of communication
   * @param content - Communication content
   * @param options - Additional options
   */
  public async logCommunication(
    accountId: string,
    type: CommunicationType,
    content: string,
    options?: {
      subType?: string;
      recipient?: string;
      subject?: string;
      status?: CommunicationStatus;
      metadata?: Record<string, unknown>;
      messageId?: string;
    }
  ): Promise<CommunicationLog> {
    const now = new Date();

    const logEntry = await prisma.auditLog.create({
      data: {
        action: 'COMMUNICATION',
        entityType: 'Communication',
        entityId: accountId,
        details: JSON.parse(JSON.stringify({
          type,
          subType: options?.subType,
          recipient: options?.recipient || 'N/A',
          subject: options?.subject,
          content: content.substring(0, 1000), // Truncate for storage
          status: options?.status || 'sent',
          metadata: options?.metadata,
          messageId: options?.messageId,
          sentAt: now.toISOString(),
        })),
      },
    });

    // Transform to CommunicationLog format
    const details = logEntry.details as Record<string, unknown>;

    return {
      id: logEntry.id,
      accountId,
      type: details.type as CommunicationType,
      subType: details.subType as string | undefined,
      recipient: details.recipient as string,
      subject: details.subject as string | undefined,
      content: details.content as string,
      status: details.status as CommunicationStatus,
      metadata: details.metadata as Record<string, unknown> | undefined,
      sentAt: now,
      createdAt: logEntry.createdAt,
      updatedAt: logEntry.createdAt,
    };
  }

  /**
   * Send a 501(r) compliant notice
   * These notices are required under IRS Section 501(r) for nonprofit hospitals
   *
   * @param accountId - Patient account ID
   * @param noticeType - Type of 501(r) notice
   * @param options - Additional notice options
   */
  public async send501rNotice(
    accountId: string,
    noticeType: Notice501rType,
    options?: {
      deliveryMethod?: 'email' | 'mail' | 'both';
      recipientEmail?: string;
      additionalData?: TemplateData;
    }
  ): Promise<{
    success: boolean;
    emailResult?: SendResult;
    logId: string;
    deadlineDate?: Date;
  }> {
    // Fetch account/patient information
    const assessment = await prisma.assessment.findFirst({
      where: { accountNumber: accountId },
      include: { organization: true },
    });

    if (!assessment) {
      throw new Error(`Account not found: ${accountId}`);
    }

    // Build template data with 501(r) required information
    const templateData: TemplateData = {
      // Patient information
      patientName: `${assessment.patientFirstName || ''} ${assessment.patientLastName || ''}`.trim() || 'Patient',
      accountNumber: assessment.accountNumber,

      // Facility information
      facilityName: assessment.organization?.name || 'Healthcare Facility',
      facilityPhone: process.env.FACILITY_PHONE || '1-800-XXX-XXXX',
      facilityWebsite: process.env.FACILITY_WEBSITE || 'www.example.com',

      // Financial information
      totalCharges: assessment.totalCharges?.toString() || '0.00',

      // Dates
      currentDate: new Date(),
      noticeDate: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),

      // 501(r) specific information
      fapApplicationUrl: process.env.FAP_APPLICATION_URL || '/financial-assistance',
      fapContactPhone: process.env.FAP_CONTACT_PHONE || '1-800-XXX-XXXX',

      // Merge additional data
      ...options?.additionalData,
    };

    // Calculate deadline for ECA warning (30 days from now)
    let deadlineDate: Date | undefined;
    if (noticeType === 'eca_warning') {
      deadlineDate = new Date();
      deadlineDate.setDate(deadlineDate.getDate() + 30);
      templateData.ecaDeadlineDate = deadlineDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      templateData.ecaDaysRemaining = '30';
    }

    // Map notice type to template
    const templateMap: Record<Notice501rType, string> = {
      'fap_application': 'fap-application',
      'fap_plain_language_summary': 'fap-application',
      'eca_warning': 'eca-warning',
      'billing_statement': 'payment-reminder',
      'eligibility_determination': 'eligibility-approved',
    };

    const template = templateMap[noticeType];
    let emailResult: SendResult | undefined;

    // Send via email if requested
    const deliveryMethod = options?.deliveryMethod || 'email';
    if ((deliveryMethod === 'email' || deliveryMethod === 'both') && options?.recipientEmail) {
      emailResult = await this.sendEmail(options.recipientEmail, template, templateData);
    }

    // Log the 501(r) communication
    const log = await this.logCommunication(
      accountId,
      '501r_notice',
      `501(r) Notice: ${noticeType}`,
      {
        subType: noticeType,
        recipient: options?.recipientEmail || 'mail',
        subject: this.getDefaultSubject(template),
        status: emailResult?.success ? 'sent' : 'pending',
        metadata: {
          noticeType,
          deliveryMethod,
          deadlineDate: deadlineDate?.toISOString(),
          templateUsed: template,
          emailMessageId: emailResult?.messageId,
        },
        messageId: emailResult?.messageId,
      }
    );

    console.log(`[CommunicationService] 501(r) notice sent: ${noticeType} for account ${accountId}`);

    return {
      success: emailResult?.success ?? true,
      emailResult,
      logId: log.id,
      deadlineDate,
    };
  }

  /**
   * Send internal staff notification
   * @param userId - Staff user ID
   * @param message - Notification message
   * @param options - Additional options
   */
  public async sendStaffNotification(
    userId: string,
    message: string,
    options?: {
      type?: 'assignment' | 'reminder' | 'alert' | 'info';
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      relatedAccountId?: string;
      relatedAssessmentId?: string;
      actionUrl?: string;
      sendEmail?: boolean;
    }
  ): Promise<SendResult> {
    // Fetch user information
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return {
        success: false,
        error: `User not found: ${userId}`,
        timestamp: new Date(),
      };
    }

    // Log internal notification
    await prisma.auditLog.create({
      data: {
        action: 'NOTIFICATION',
        entityType: 'StaffNotification',
        entityId: userId,
        userId,
        details: {
          message,
          type: options?.type || 'info',
          priority: options?.priority || 'normal',
          relatedAccountId: options?.relatedAccountId,
          relatedAssessmentId: options?.relatedAssessmentId,
          actionUrl: options?.actionUrl,
          read: false,
        },
      },
    });

    // Send email notification if requested
    let emailResult: SendResult | undefined;
    if (options?.sendEmail && user.email) {
      const templateData: TemplateData = {
        staffName: user.name || user.email,
        message,
        notificationType: options?.type || 'info',
        priority: options?.priority || 'normal',
        actionUrl: options?.actionUrl || process.env.APP_URL || '/',
        currentDate: new Date(),
      };

      emailResult = await this.sendEmail(user.email, 'staff-assignment', templateData);
    }

    console.log(`[CommunicationService] Staff notification sent to ${userId}: ${options?.type || 'info'}`);

    return {
      success: true,
      messageId: emailResult?.messageId,
      timestamp: new Date(),
    };
  }

  /**
   * Get communication history for an account
   * @param accountId - Patient account ID
   * @param options - Query options
   */
  public async getPatientCommunications(
    accountId: string,
    options?: {
      type?: CommunicationType;
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<{
    communications: CommunicationLog[];
    total: number;
    hasMore: boolean;
  }> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    // Build where clause for AuditLog
    const whereClause: Record<string, unknown> = {
      entityType: 'Communication',
      entityId: accountId,
    };

    if (options?.startDate || options?.endDate) {
      whereClause.createdAt = {};
      if (options?.startDate) {
        (whereClause.createdAt as Record<string, Date>).gte = options.startDate;
      }
      if (options?.endDate) {
        (whereClause.createdAt as Record<string, Date>).lte = options.endDate;
      }
    }

    // Fetch logs
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({ where: whereClause }),
    ]);

    // Transform to CommunicationLog format
    const communications: CommunicationLog[] = logs
      .filter(log => {
        const details = log.details as Record<string, unknown> | null;
        if (!options?.type) return true;
        return details?.type === options.type;
      })
      .map(log => {
        const details = (log.details as Record<string, unknown>) || {};
        return {
          id: log.id,
          accountId,
          type: (details.type as CommunicationType) || 'email',
          subType: details.subType as string | undefined,
          recipient: (details.recipient as string) || 'N/A',
          subject: details.subject as string | undefined,
          content: (details.content as string) || '',
          status: (details.status as CommunicationStatus) || 'sent',
          metadata: details.metadata as Record<string, unknown> | undefined,
          sentAt: details.sentAt ? new Date(details.sentAt as string) : undefined,
          deliveredAt: details.deliveredAt ? new Date(details.deliveredAt as string) : undefined,
          readAt: details.readAt ? new Date(details.readAt as string) : undefined,
          errorMessage: details.errorMessage as string | undefined,
          createdAt: log.createdAt,
          updatedAt: log.createdAt,
        };
      });

    return {
      communications,
      total,
      hasMore: offset + communications.length < total,
    };
  }

  /**
   * Check if SMS is configured
   */
  public isSMSConfigured(): boolean {
    switch (this.smsConfig.provider) {
      case 'twilio':
        return !!(this.smsConfig.twilioAccountSid && this.smsConfig.twilioAuthToken);
      case 'aws_sns':
        return !!this.smsConfig.awsRegion;
      case 'console':
        return true;
      default:
        return false;
    }
  }

  /**
   * Get the current SMS provider
   */
  public getSMSProvider(): SMSConfig['provider'] {
    return this.smsConfig.provider;
  }
}

// Export singleton instance
export const communicationService = new CommunicationService();
export type {
  CommunicationType,
  Notice501rType,
  CommunicationStatus,
  CommunicationLog,
  SendResult,
};
