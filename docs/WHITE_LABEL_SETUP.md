# White-Label Setup Guide

This guide walks through setting up a new white-label instance of the Halcyon RCM Partner Assistant for a partner organization.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Step 1: Environment Configuration](#step-1-environment-configuration)
- [Step 2: Database Setup](#step-2-database-setup)
- [Step 3: Branding Configuration](#step-3-branding-configuration)
- [Step 4: Custom Domain Setup](#step-4-custom-domain-setup)
- [Step 5: Email Template Customization](#step-5-email-template-customization)
- [Step 6: Mobile App Branding](#step-6-mobile-app-branding)
- [Step 7: Deployment](#step-7-deployment)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Halcyon RCM Partner Assistant is a multi-tenant Revenue Cycle Management platform that supports white-labeling for partner organizations. Each partner can have:

- Custom branding (logo, colors, name)
- Custom domain
- Isolated data (organization-scoped)
- Feature toggles
- Custom email templates
- Branded mobile apps (iOS/Android)

## Prerequisites

Before starting the white-label setup, ensure you have:

- **Node.js 20+** - Required for running the application
- **PostgreSQL 15+** - Database server
- **Docker** (optional) - For containerized deployments
- **Redis** (optional) - For caching and job queues
- **Git** - For source code management

### Development Tools

```bash
# Verify Node.js version
node --version  # Should be v20.x or higher

# Verify npm
npm --version

# Verify PostgreSQL
psql --version  # Should be 15.x or higher
```

---

## Step 1: Environment Configuration

### 1.1 Create Environment File

Copy the example environment file and configure it for your partner:

```bash
cp .env.example .env
```

### 1.2 Required Environment Variables

Edit the `.env` file with partner-specific values:

```bash
# Database Configuration
DATABASE_URL="postgresql://user:password@localhost:5432/partner_rcm?schema=public"

# Server Configuration
PORT=3001
NODE_ENV=production
CORS_ORIGIN=https://partner-domain.com

# Authentication
JWT_SECRET=your-secure-jwt-secret-min-32-chars
JWT_EXPIRES_IN=7d

# NextAuth Configuration
NEXTAUTH_SECRET=your-nextauth-secret-min-32-chars
NEXTAUTH_URL=https://partner-domain.com

# API URL (for web client)
NEXT_PUBLIC_API_URL=https://api.partner-domain.com
```

### 1.3 White-Label Specific Variables

```bash
# Branding
NEXT_PUBLIC_BRAND_NAME="Partner RCM"
NEXT_PUBLIC_LOGO_URL="/partner-logo.svg"
NEXT_PUBLIC_PRIMARY_COLOR="#2563eb"
NEXT_PUBLIC_SECONDARY_COLOR="#1e40af"
NEXT_PUBLIC_SUPPORT_EMAIL="support@partner.com"
NEXT_PUBLIC_SUPPORT_PHONE="1-800-PARTNER"
NEXT_PUBLIC_FAVICON="/partner-favicon.ico"
```

> **Note:** See [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) for the complete list of environment variables.

---

## Step 2: Database Setup

### 2.1 Create the Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database and user
CREATE DATABASE partner_rcm;
CREATE USER partner_user WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE partner_rcm TO partner_user;
```

### 2.2 Run Prisma Migrations

```bash
# Navigate to the API package
cd packages/api

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# (Optional) Seed initial data
npx prisma db seed
```

### 2.3 Create the Partner Organization

Create the organization record in the database:

```bash
# Using Prisma Studio (GUI)
npx prisma studio

# Or via SQL
INSERT INTO "Organization" (id, name, type, settings, "createdAt", "updatedAt")
VALUES (
  'partner-org-id',
  'Partner Healthcare',
  'hospital',
  '{"maxUsers": 100, "dataRetentionDays": 2557}',
  NOW(),
  NOW()
);
```

### 2.4 Create White-Label Configuration

```sql
INSERT INTO "WhiteLabelConfig" (
  id,
  "organizationId",
  "brandName",
  "logoUrl",
  "primaryColor",
  "secondaryColor",
  "supportEmail",
  "supportPhone",
  "companyWebsite",
  "timezone",
  "locale",
  features,
  "createdAt",
  "updatedAt"
) VALUES (
  'wl-config-id',
  'partner-org-id',
  'Partner RCM',
  '/partner-logo.svg',
  '#2563eb',
  '#1e40af',
  'support@partner.com',
  '1-800-PARTNER',
  'https://partner.com',
  'America/New_York',
  'en-US',
  '{"assessments": true, "batchImport": true, "reports": true, "sftpIntegration": true}',
  NOW(),
  NOW()
);
```

---

## Step 3: Branding Configuration

### 3.1 Via Admin UI

1. Log in as an admin user
2. Navigate to **Settings > Branding**
3. Configure the following:

| Setting | Description |
|---------|-------------|
| Brand Name | Display name throughout the app |
| Logo URL | Path to logo image (SVG/PNG recommended) |
| Primary Color | Main brand color (hex) |
| Secondary Color | Accent color (hex) |
| Support Email | Customer support email |
| Support Phone | Customer support phone |
| Favicon | Browser tab icon |

### 3.2 Via API

```bash
# Update white-label configuration via API
curl -X PUT https://api.partner.com/api/white-label/config \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "brandName": "Partner RCM",
    "logoUrl": "/partner-logo.svg",
    "primaryColor": "#2563eb",
    "secondaryColor": "#1e40af",
    "supportEmail": "support@partner.com",
    "supportPhone": "1-800-PARTNER",
    "features": {
      "assessments": true,
      "batchImport": true,
      "reports": true,
      "sftpIntegration": true,
      "pdfExport": true,
      "workQueue": true,
      "eligibilityVerification": true,
      "denialManagement": true,
      "complianceTracking": true
    }
  }'
```

### 3.3 Feature Toggles

Control which features are available to the partner:

| Feature | Description |
|---------|-------------|
| `assessments` | Recovery assessment module |
| `batchImport` | CSV/file bulk import |
| `reports` | Analytics and reporting |
| `sftpIntegration` | SFTP file sync |
| `pdfExport` | PDF report generation |
| `workQueue` | Work queue management |
| `eligibilityVerification` | Insurance eligibility checks |
| `denialManagement` | Claim denial workflow |
| `complianceTracking` | 501(r) compliance features |

---

## Step 4: Custom Domain Setup

### 4.1 DNS Configuration

See [CUSTOM_DOMAIN_SETUP.md](./CUSTOM_DOMAIN_SETUP.md) for detailed instructions.

**Quick Setup:**

1. Add CNAME record pointing to the platform:
   ```
   app.partner.com  CNAME  platform.halcyon-rcm.com
   ```

2. Add TXT record for domain verification:
   ```
   _halcyon-verify.partner.com  TXT  verify=partner-org-id
   ```

### 4.2 SSL Certificate

SSL certificates are automatically provisioned via Let's Encrypt for verified domains.

---

## Step 5: Email Template Customization

### 5.1 Available Templates

| Template | Purpose |
|----------|---------|
| `fap-application` | Financial Assistance Program invitation |
| `eligibility-approved` | Eligibility approval notification |
| `eligibility-pending` | Eligibility pending notification |
| `eca-warning` | Extraordinary Collection Actions warning |
| `payment-reminder` | Payment reminder notice |
| `staff-assignment` | Work queue assignment notification |

### 5.2 Template Variables

Templates support Handlebars-style variables:

```html
<p>Dear {{patientName}},</p>
<p>Your account {{accountNumber}} at {{facilityName}}...</p>
```

See [EMAIL_TEMPLATE_CUSTOMIZATION.md](./EMAIL_TEMPLATE_CUSTOMIZATION.md) for details.

---

## Step 6: Mobile App Branding

### 6.1 Build Branded Mobile Apps

```bash
# Build for both platforms
./scripts/build-mobile.sh \
  --app-id "com.partner.rcm" \
  --app-name "Partner RCM" \
  --platform both
```

### 6.2 Update Capacitor Configuration

Edit `packages/web/capacitor.config.ts`:

```typescript
const config: CapacitorConfig = {
  appId: 'com.partner.rcm',
  appName: 'Partner RCM',
  webDir: 'out',
  plugins: {
    SplashScreen: {
      backgroundColor: '#2563eb', // Partner primary color
    },
    StatusBar: {
      backgroundColor: '#2563eb',
    },
  },
};
```

See [MOBILE_APP_BRANDING.md](./MOBILE_APP_BRANDING.md) for complete instructions.

---

## Step 7: Deployment

### 7.1 Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose -f docker/docker-compose.yml up -d

# With partner-specific env file
docker-compose --env-file .env.partner up -d
```

### 7.2 AWS Deployment

```bash
# Using Terraform
cd infrastructure/aws
terraform init
terraform plan -var="db_password=secure_password" -var="jwt_secret=secure_jwt_secret"
terraform apply
```

### 7.3 Vercel Deployment

```bash
# Deploy web frontend
cd packages/web
vercel --prod

# Set environment variables in Vercel dashboard
```

See [PARTNER_DEPLOYMENT.md](./PARTNER_DEPLOYMENT.md) for detailed deployment options.

---

## Troubleshooting

### Database Connection Issues

```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1"

# Check Prisma connection
cd packages/api && npx prisma db pull
```

### Branding Not Updating

1. Clear browser cache
2. Check localStorage: `localStorage.removeItem('halcyon_white_label_config')`
3. Verify API returns correct config: `GET /api/white-label/config`

### Mobile Build Failures

```bash
# Clean and rebuild
cd packages/web
rm -rf out .next
npm run build
npx cap sync
```

### SSL Certificate Issues

1. Verify DNS records are propagated: `dig app.partner.com`
2. Check domain verification TXT record
3. Wait up to 24 hours for certificate provisioning

---

## Related Documentation

- [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) - Complete environment variable reference
- [CUSTOM_DOMAIN_SETUP.md](./CUSTOM_DOMAIN_SETUP.md) - DNS and SSL configuration
- [EMAIL_TEMPLATE_CUSTOMIZATION.md](./EMAIL_TEMPLATE_CUSTOMIZATION.md) - Email template guide
- [MOBILE_APP_BRANDING.md](./MOBILE_APP_BRANDING.md) - Mobile app build instructions
- [PARTNER_DEPLOYMENT.md](./PARTNER_DEPLOYMENT.md) - Deployment options
- [MULTI_TENANT_ARCHITECTURE.md](./MULTI_TENANT_ARCHITECTURE.md) - Architecture overview
