# Email Template Customization

This guide covers customizing email templates for white-label partner instances of the Halcyon RCM Partner Assistant.

## Table of Contents

- [Overview](#overview)
- [Available Templates](#available-templates)
- [Template Variables](#template-variables)
- [Template Syntax](#template-syntax)
- [Adding Custom Templates](#adding-custom-templates)
- [Testing Emails](#testing-emails)
- [Email Provider Configuration](#email-provider-configuration)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Halcyon RCM platform includes a flexible email templating system that supports:

- **Handlebars-style variables**: `{{variableName}}`
- **Conditional content**: `{{#if condition}}...{{/if}}`
- **Multiple providers**: SendGrid, AWS SES, SMTP, or console (development)
- **HTML and plain text**: Automatic plain text conversion from HTML

### Template Location

Email templates are stored in:
```
packages/api/src/templates/
```

---

## Available Templates

### Patient Communication Templates

| Template | Purpose | Key Variables |
|----------|---------|---------------|
| `fap-application` | Financial Assistance Program invitation | `patientName`, `accountNumber`, `totalCharges`, `facilityName` |
| `eligibility-approved` | Eligibility approval notification | `patientName`, `programName`, `coverageDetails` |
| `eligibility-pending` | Eligibility pending status | `patientName`, `applicationDate`, `expectedDate` |
| `eca-warning` | Extraordinary Collection Actions warning (501r) | `patientName`, `accountNumber`, `dueDate`, `amount` |
| `payment-reminder` | Payment reminder notice | `patientName`, `balance`, `dueDate`, `paymentUrl` |

### Staff Communication Templates

| Template | Purpose | Key Variables |
|----------|---------|---------------|
| `staff-assignment` | Work queue assignment notification | `staffName`, `accountNumber`, `priority`, `dueDate` |

---

## Template Variables

### Common Variables (Available in All Templates)

| Variable | Description | Example |
|----------|-------------|---------|
| `{{patientName}}` | Patient full name | John Smith |
| `{{patientFirstName}}` | Patient first name | John |
| `{{patientLastName}}` | Patient last name | Smith |
| `{{accountNumber}}` | Account/MRN number | ACC-123456 |
| `{{facilityName}}` | Hospital/facility name | Partner Healthcare |
| `{{facilityPhone}}` | Facility phone number | (555) 123-4567 |
| `{{facilityWebsite}}` | Facility website URL | https://partner.com |
| `{{noticeDate}}` | Date of the notice | January 15, 2024 |

### Financial Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{{totalCharges}}` | Total charges amount | 5,432.10 |
| `{{balance}}` | Current balance | 2,150.00 |
| `{{estimatedRecovery}}` | Estimated recovery amount | 4,500.00 |
| `{{paymentAmount}}` | Payment amount due | 250.00 |
| `{{dueDate}}` | Payment due date | February 1, 2024 |

### Program-Specific Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{{programName}}` | Assistance program name | Medicaid |
| `{{coveragePercentage}}` | Coverage percentage | 100% |
| `{{applicationStatus}}` | Application status | Pending Review |
| `{{fapApplicationUrl}}` | FAP application link | /apply/fap |
| `{{fapContactPhone}}` | FAP contact phone | (555) 987-6543 |

### Staff Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{{staffName}}` | Staff member name | Jane Doe |
| `{{staffEmail}}` | Staff email | jane.doe@partner.com |
| `{{queueName}}` | Work queue name | Pending Eligibility |
| `{{priority}}` | Task priority | High |
| `{{assignedDate}}` | Assignment date | January 15, 2024 |

---

## Template Syntax

### Basic Variable Substitution

```html
<p>Dear {{patientName}},</p>
<p>Your account number is {{accountNumber}}.</p>
```

### Nested Object Access

```html
<p>Provider: {{provider.name}}</p>
<p>Address: {{provider.address.city}}, {{provider.address.state}}</p>
```

### Conditional Blocks

**Show content if variable exists:**
```html
{{#if totalCharges}}
<p>Your current balance is ${{totalCharges}}</p>
{{/if}}
```

**Show content if variable is falsy:**
```html
{{#unless insuranceVerified}}
<p>Please verify your insurance information.</p>
{{/unless}}
```

### Date Formatting

Dates are automatically formatted when the value is a Date object:

```html
<!-- Input: noticeDate = new Date('2024-01-15') -->
<!-- Output: January 15, 2024 -->
<p>Date: {{noticeDate}}</p>
```

---

## Adding Custom Templates

### Step 1: Create the Template File

Create a new HTML file in `packages/api/src/templates/`:

```html
<!-- packages/api/src/templates/custom-notification.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{subject}}</title>
  <style>
    body {
      font-family: Arial, Helvetica, sans-serif;
      line-height: 1.6;
      color: #333333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      padding: 20px 0;
      border-bottom: 2px solid #2c5aa0;
    }
    .content {
      padding: 30px 0;
    }
    .footer {
      text-align: center;
      padding: 20px 0;
      border-top: 1px solid #dee2e6;
      font-size: 12px;
      color: #6c757d;
    }
  </style>
</head>
<body>
  <div class="header">
    <div style="font-size: 24px; font-weight: bold; color: #2c5aa0;">
      {{facilityName}}
    </div>
  </div>

  <div class="content">
    <p>Dear {{patientName}},</p>

    <p>{{messageBody}}</p>

    {{#if actionRequired}}
    <div style="background-color: #fff3cd; padding: 15px; margin: 20px 0;">
      <strong>Action Required:</strong> {{actionDescription}}
    </div>
    {{/if}}

    <p>Sincerely,</p>
    <p><strong>{{senderName}}</strong><br>{{facilityName}}</p>
  </div>

  <div class="footer">
    <p>{{facilityName}} | {{facilityPhone}}</p>
    <p>{{facilityAddress}}</p>
  </div>
</body>
</html>
```

### Step 2: Register the Template (Optional)

Templates are auto-discovered, but you can explicitly register them:

```typescript
// packages/api/src/services/emailService.ts
// Templates are automatically loaded from the templates directory
```

### Step 3: Use the Template

```typescript
import { emailService } from './services/emailService';

// Render and send the email
const html = emailService.renderTemplate('custom-notification', {
  patientName: 'John Smith',
  facilityName: 'Partner Healthcare',
  messageBody: 'Your appointment has been confirmed.',
  actionRequired: true,
  actionDescription: 'Please bring your insurance card.',
  senderName: 'Patient Services',
  facilityPhone: '(555) 123-4567',
  facilityAddress: '123 Medical Center Dr, City, ST 12345'
});

await emailService.sendRenderedEmail(
  'patient@example.com',
  'Appointment Confirmation',
  html
);
```

---

## Testing Emails

### Console Mode (Development)

In development, emails are logged to the console instead of being sent:

```bash
# .env
EMAIL_PROVIDER=console
```

Output:
```
========================================
[EmailService] EMAIL SENT (Console Mode)
========================================
To: patient@example.com
Subject: Appointment Confirmation
----------------------------------------
HTML Content:
<!DOCTYPE html>...
========================================
```

### Preview Templates

Use the API to preview rendered templates:

```bash
curl -X POST https://api.partner.com/api/email/preview \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "template": "fap-application",
    "data": {
      "patientName": "John Smith",
      "accountNumber": "ACC-123456",
      "facilityName": "Partner Healthcare",
      "totalCharges": "5,432.10"
    }
  }'
```

### Send Test Email

```bash
curl -X POST https://api.partner.com/api/email/test \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "template": "fap-application",
    "to": "test@example.com",
    "data": {
      "patientName": "Test Patient",
      "accountNumber": "TEST-123",
      "facilityName": "Test Facility"
    }
  }'
```

### List Available Templates

```bash
curl https://api.partner.com/api/email/templates \
  -H "Authorization: Bearer $TOKEN"
```

Response:
```json
{
  "success": true,
  "data": [
    "fap-application",
    "eligibility-approved",
    "eligibility-pending",
    "eca-warning",
    "payment-reminder",
    "staff-assignment"
  ]
}
```

---

## Email Provider Configuration

### SendGrid

```bash
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.xxxxxxxxxx
EMAIL_FROM_ADDRESS=noreply@partner.com
EMAIL_FROM_NAME="Partner Healthcare"
```

### AWS SES

```bash
EMAIL_PROVIDER=ses
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAxxxxxxxxxx
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxx
EMAIL_FROM_ADDRESS=noreply@partner.com
EMAIL_FROM_NAME="Partner Healthcare"
```

**SES Setup Requirements:**
1. Verify sending domain in SES
2. Request production access (move out of sandbox)
3. Configure DKIM and SPF records

### SMTP

```bash
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.partner.com
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USERNAME=noreply@partner.com
SMTP_PASSWORD=your_smtp_password
EMAIL_FROM_ADDRESS=noreply@partner.com
EMAIL_FROM_NAME="Partner Healthcare"
```

---

## Troubleshooting

### Template Not Found

**Error:** `Template not found: custom-template`

**Solutions:**
1. Verify file exists: `packages/api/src/templates/custom-template.html`
2. Check file extension is `.html`
3. Clear template cache:
   ```typescript
   emailService.clearTemplateCache();
   ```

### Variables Not Replaced

**Symptoms:** Output shows `{{variableName}}` instead of value

**Solutions:**
1. Check variable name spelling (case-sensitive)
2. Verify data object has the property
3. Check for typos in template (extra spaces, etc.)

```html
<!-- Correct -->
{{patientName}}

<!-- Incorrect (won't work) -->
{{ patientName }}
{{PatientName}}
{{patient_name}}
```

### Email Not Delivered

**Checklist:**
1. Check spam/junk folder
2. Verify `EMAIL_FROM_ADDRESS` is verified with provider
3. Check provider dashboard for errors
4. Verify DNS records (SPF, DKIM, DMARC)

### HTML Rendering Issues

**Solutions:**
1. Use inline CSS (email clients strip `<style>` tags)
2. Use tables for layout (better email client support)
3. Test with email testing tools (Litmus, Email on Acid)

### Plain Text Conversion Issues

The system automatically converts HTML to plain text. If issues occur:

1. Check for complex HTML structures
2. Verify no JavaScript in templates
3. Test plain text output:
   ```typescript
   const html = emailService.renderTemplate('template', data);
   console.log(emailService.htmlToPlainText(html));
   ```

---

## Best Practices

### Email Design

1. **Mobile-first**: 60%+ of emails opened on mobile
2. **Max width 600px**: Standard email width
3. **Inline CSS**: Better email client support
4. **Alt text**: Include for all images
5. **Plain text fallback**: Always provide

### Content Guidelines

1. **Clear subject lines**: Be specific, avoid spam triggers
2. **Personalization**: Use patient name, account number
3. **Call to action**: Make next steps clear
4. **Contact info**: Always include how to reach support
5. **Compliance**: Include required disclaimers (501r, HIPAA)

### Testing Checklist

- [ ] Template renders without errors
- [ ] All variables are replaced
- [ ] Links are correct and work
- [ ] Images load properly
- [ ] Mobile view looks good
- [ ] Plain text version is readable
- [ ] Spam score is acceptable
- [ ] Unsubscribe link works (if applicable)

---

## Related Documentation

- [WHITE_LABEL_SETUP.md](./WHITE_LABEL_SETUP.md) - Overall setup guide
- [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) - Email configuration
- [MULTI_TENANT_ARCHITECTURE.md](./MULTI_TENANT_ARCHITECTURE.md) - Data isolation
