/**
 * Email Service
 * Handles email sending with support for SendGrid, AWS SES, and SMTP
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Type definitions for email providers
interface SendGridConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
}

interface SESConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  fromEmail: string;
  fromName: string;
}

interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
}

type EmailProvider = 'sendgrid' | 'ses' | 'smtp' | 'console';

interface EmailConfig {
  provider: EmailProvider;
  sendgrid?: SendGridConfig;
  ses?: SESConfig;
  smtp?: SMTPConfig;
}

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  provider: EmailProvider;
  error?: string;
  timestamp: Date;
}

interface TemplateData {
  [key: string]: string | number | boolean | Date | undefined | null | TemplateData | TemplateData[];
}

// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

/**
 * Email Service Class
 * Provides templated email sending with multiple provider support
 */
class EmailService {
  private config: EmailConfig;
  private templateCache: Map<string, string> = new Map();

  constructor() {
    this.config = this.loadConfig();
  }

  /**
   * Load email configuration from environment variables
   */
  private loadConfig(): EmailConfig {
    const provider = (process.env.EMAIL_PROVIDER || 'console') as EmailProvider;

    const config: EmailConfig = { provider };

    switch (provider) {
      case 'sendgrid':
        config.sendgrid = {
          apiKey: process.env.SENDGRID_API_KEY || '',
          fromEmail: process.env.EMAIL_FROM_ADDRESS || 'noreply@halcyon-rcm.com',
          fromName: process.env.EMAIL_FROM_NAME || 'Halcyon RCM',
        };
        break;

      case 'ses':
        config.ses = {
          region: process.env.AWS_REGION || 'us-east-1',
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
          fromEmail: process.env.EMAIL_FROM_ADDRESS || 'noreply@halcyon-rcm.com',
          fromName: process.env.EMAIL_FROM_NAME || 'Halcyon RCM',
        };
        break;

      case 'smtp':
        config.smtp = {
          host: process.env.SMTP_HOST || 'localhost',
          port: parseInt(process.env.SMTP_PORT || '587', 10),
          secure: process.env.SMTP_SECURE === 'true',
          username: process.env.SMTP_USERNAME || '',
          password: process.env.SMTP_PASSWORD || '',
          fromEmail: process.env.EMAIL_FROM_ADDRESS || 'noreply@halcyon-rcm.com',
          fromName: process.env.EMAIL_FROM_NAME || 'Halcyon RCM',
        };
        break;

      case 'console':
      default:
        // Console mode for development/testing
        break;
    }

    return config;
  }

  /**
   * Render a template with Handlebars-style variable substitution
   * Supports {{variable}} and {{object.property}} syntax
   */
  public renderTemplate(templateName: string, data: TemplateData): string {
    const templatePath = path.join(TEMPLATES_DIR, `${templateName}.html`);

    // Check cache first
    let template = this.templateCache.get(templatePath);

    if (!template) {
      if (!fs.existsSync(templatePath)) {
        throw new Error(`Template not found: ${templateName}`);
      }
      template = fs.readFileSync(templatePath, 'utf-8');
      this.templateCache.set(templatePath, template);
    }

    // Replace Handlebars-style variables {{variable}}
    let rendered = template.replace(/\{\{(\s*[\w.]+\s*)\}\}/g, (match, key) => {
      const trimmedKey = key.trim();
      const value = this.getNestedValue(data, trimmedKey);

      if (value === undefined || value === null) {
        return '';
      }

      // Format dates
      if (value instanceof Date) {
        return value.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      }

      return String(value);
    });

    // Handle simple conditionals {{#if variable}}...{{/if}}
    rendered = rendered.replace(
      /\{\{#if\s+([\w.]+)\s*\}\}([\s\S]*?)\{\{\/if\}\}/g,
      (match, condition, content) => {
        const value = this.getNestedValue(data, condition.trim());
        return value ? content : '';
      }
    );

    // Handle {{#unless variable}}...{{/unless}}
    rendered = rendered.replace(
      /\{\{#unless\s+([\w.]+)\s*\}\}([\s\S]*?)\{\{\/unless\}\}/g,
      (match, condition, content) => {
        const value = this.getNestedValue(data, condition.trim());
        return !value ? content : '';
      }
    );

    return rendered;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: TemplateData, path: string): unknown {
    return path.split('.').reduce((current: unknown, key: string) => {
      if (current && typeof current === 'object' && key in (current as Record<string, unknown>)) {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  }

  /**
   * Clear the template cache (useful for development)
   */
  public clearTemplateCache(): void {
    this.templateCache.clear();
  }

  /**
   * Send a rendered email
   */
  public async sendRenderedEmail(
    to: string | string[],
    subject: string,
    html: string,
    options?: Partial<EmailOptions>
  ): Promise<EmailResult> {
    const emailOptions: EmailOptions = {
      to,
      subject,
      html,
      text: options?.text || this.htmlToPlainText(html),
      replyTo: options?.replyTo,
      cc: options?.cc,
      bcc: options?.bcc,
      attachments: options?.attachments,
    };

    switch (this.config.provider) {
      case 'sendgrid':
        return this.sendViaSendGrid(emailOptions);
      case 'ses':
        return this.sendViaSES(emailOptions);
      case 'smtp':
        return this.sendViaSMTP(emailOptions);
      case 'console':
      default:
        return this.sendViaConsole(emailOptions);
    }
  }

  /**
   * Send email via SendGrid
   */
  private async sendViaSendGrid(options: EmailOptions): Promise<EmailResult> {
    const config = this.config.sendgrid;
    if (!config || !config.apiKey) {
      return {
        success: false,
        provider: 'sendgrid',
        error: 'SendGrid API key not configured',
        timestamp: new Date(),
      };
    }

    try {
      const recipients = Array.isArray(options.to) ? options.to : [options.to];

      const message = {
        personalizations: [{ to: recipients.map(email => ({ email })) }],
        from: { email: config.fromEmail, name: config.fromName },
        subject: options.subject,
        content: [
          { type: 'text/plain', value: options.text || '' },
          { type: 'text/html', value: options.html },
        ],
      };

      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`SendGrid API error: ${response.status} - ${errorBody}`);
      }

      const messageId = response.headers.get('x-message-id') || undefined;

      return {
        success: true,
        messageId,
        provider: 'sendgrid',
        timestamp: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[EmailService] SendGrid error:', errorMessage);
      return {
        success: false,
        provider: 'sendgrid',
        error: errorMessage,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Send email via AWS SES
   */
  private async sendViaSES(options: EmailOptions): Promise<EmailResult> {
    const config = this.config.ses;
    if (!config || !config.accessKeyId) {
      return {
        success: false,
        provider: 'ses',
        error: 'AWS SES credentials not configured',
        timestamp: new Date(),
      };
    }

    try {
      // Dynamic import for AWS SDK to avoid loading when not needed
      const { SESClient, SendEmailCommand } = await import('@aws-sdk/client-ses');

      const client = new SESClient({
        region: config.region,
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        },
      });

      const recipients = Array.isArray(options.to) ? options.to : [options.to];

      const command = new SendEmailCommand({
        Source: `${config.fromName} <${config.fromEmail}>`,
        Destination: {
          ToAddresses: recipients,
          CcAddresses: options.cc,
          BccAddresses: options.bcc,
        },
        Message: {
          Subject: { Data: options.subject, Charset: 'UTF-8' },
          Body: {
            Text: { Data: options.text || '', Charset: 'UTF-8' },
            Html: { Data: options.html, Charset: 'UTF-8' },
          },
        },
        ReplyToAddresses: options.replyTo ? [options.replyTo] : undefined,
      });

      const response = await client.send(command);

      return {
        success: true,
        messageId: response.MessageId,
        provider: 'ses',
        timestamp: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[EmailService] AWS SES error:', errorMessage);
      return {
        success: false,
        provider: 'ses',
        error: errorMessage,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Send email via SMTP
   */
  private async sendViaSMTP(options: EmailOptions): Promise<EmailResult> {
    const config = this.config.smtp;
    if (!config || !config.host) {
      return {
        success: false,
        provider: 'smtp',
        error: 'SMTP configuration not provided',
        timestamp: new Date(),
      };
    }

    try {
      // Dynamic import for nodemailer to avoid loading when not needed
      const nodemailer = await import('nodemailer');

      const transporter = nodemailer.default.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: config.username ? {
          user: config.username,
          pass: config.password,
        } : undefined,
      });

      const recipients = Array.isArray(options.to) ? options.to.join(', ') : options.to;

      const info = await transporter.sendMail({
        from: `"${config.fromName}" <${config.fromEmail}>`,
        to: recipients,
        cc: options.cc?.join(', '),
        bcc: options.bcc?.join(', '),
        replyTo: options.replyTo,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments?.map(att => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType,
        })),
      });

      return {
        success: true,
        messageId: info.messageId,
        provider: 'smtp',
        timestamp: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[EmailService] SMTP error:', errorMessage);
      return {
        success: false,
        provider: 'smtp',
        error: errorMessage,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Console output for development/testing
   */
  private async sendViaConsole(options: EmailOptions): Promise<EmailResult> {
    const recipients = Array.isArray(options.to) ? options.to.join(', ') : options.to;

    console.log('\n========================================');
    console.log('[EmailService] EMAIL SENT (Console Mode)');
    console.log('========================================');
    console.log(`To: ${recipients}`);
    console.log(`Subject: ${options.subject}`);
    console.log('----------------------------------------');
    console.log('HTML Content:');
    console.log(options.html.substring(0, 500) + (options.html.length > 500 ? '...' : ''));
    console.log('========================================\n');

    return {
      success: true,
      messageId: `console-${Date.now()}`,
      provider: 'console',
      timestamp: new Date(),
    };
  }

  /**
   * Convert HTML to plain text
   */
  private htmlToPlainText(html: string): string {
    return html
      // Remove style and script tags with content
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      // Replace common block elements with newlines
      .replace(/<\/?(div|p|br|h[1-6]|li|tr)[^>]*>/gi, '\n')
      // Replace table cells with tabs
      .replace(/<\/?(td|th)[^>]*>/gi, '\t')
      // Remove remaining tags
      .replace(/<[^>]+>/g, '')
      // Decode common HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Clean up whitespace
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();
  }

  /**
   * Get the current provider
   */
  public getProvider(): EmailProvider {
    return this.config.provider;
  }

  /**
   * Check if the service is properly configured
   */
  public isConfigured(): boolean {
    switch (this.config.provider) {
      case 'sendgrid':
        return !!this.config.sendgrid?.apiKey;
      case 'ses':
        return !!this.config.ses?.accessKeyId;
      case 'smtp':
        return !!this.config.smtp?.host;
      case 'console':
        return true;
      default:
        return false;
    }
  }

  /**
   * List available templates
   */
  public listTemplates(): string[] {
    try {
      if (!fs.existsSync(TEMPLATES_DIR)) {
        return [];
      }
      return fs.readdirSync(TEMPLATES_DIR)
        .filter(file => file.endsWith('.html'))
        .map(file => file.replace('.html', ''));
    } catch {
      return [];
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();
export type { EmailOptions, EmailResult, TemplateData, EmailProvider };
