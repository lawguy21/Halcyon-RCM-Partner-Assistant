# Environment Variables Reference

Complete reference for all environment variables used by the Halcyon RCM Partner Assistant.

## Table of Contents

- [Database Configuration](#database-configuration)
- [Server Configuration](#server-configuration)
- [Authentication](#authentication)
- [White-Label Branding](#white-label-branding)
- [Email Configuration](#email-configuration)
- [Cloud Services](#cloud-services)
- [External Integrations](#external-integrations)
- [Feature Flags](#feature-flags)
- [Security Considerations](#security-considerations)

---

## Database Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | **Yes** | - | PostgreSQL connection string |
| `REDIS_URL` | No | - | Redis connection string for caching/queues |

### Database URL Format

```bash
# Standard format
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"

# Examples
# Local development
DATABASE_URL="postgresql://halcyon_user:halcyon123@localhost:5432/halcyon_rcm"

# Docker
DATABASE_URL="postgresql://halcyon:halcyon_secret@postgres:5432/halcyon_rcm?schema=public"

# AWS RDS (with SSL)
DATABASE_URL="postgresql://admin:password@mydb.cluster-xxxx.us-east-1.rds.amazonaws.com:5432/halcyon_rcm?sslmode=require"
```

### Redis URL Format

```bash
# Standard format
REDIS_URL="redis://[:PASSWORD@]HOST:PORT[/DATABASE]"

# Examples
REDIS_URL="redis://localhost:6379"
REDIS_URL="redis://:password@redis.example.com:6379/0"
```

---

## Server Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3001` | API server port |
| `NODE_ENV` | No | `development` | Environment: `development`, `production`, `test` |
| `CORS_ORIGIN` | No | `http://localhost:3000` | Allowed CORS origins (comma-separated) |
| `LOG_LEVEL` | No | `info` | Logging level: `debug`, `info`, `warn`, `error` |

### Examples

```bash
# Development
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Production
PORT=3001
NODE_ENV=production
CORS_ORIGIN=https://app.partner.com,https://admin.partner.com
LOG_LEVEL=warn
```

---

## Authentication

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | **Yes** | - | Secret key for JWT signing (min 32 chars) |
| `JWT_EXPIRES_IN` | No | `7d` | JWT token expiration time |
| `NEXTAUTH_SECRET` | **Yes** | - | NextAuth.js secret key |
| `NEXTAUTH_URL` | **Yes** | - | Base URL for NextAuth callbacks |

### Security Requirements

```bash
# Generate secure secrets
openssl rand -base64 32  # For JWT_SECRET
openssl rand -base64 32  # For NEXTAUTH_SECRET
```

### Examples

```bash
JWT_SECRET=your-super-secure-jwt-secret-at-least-32-characters
JWT_EXPIRES_IN=7d
NEXTAUTH_SECRET=your-nextauth-secret-at-least-32-characters
NEXTAUTH_URL=https://app.partner.com
```

---

## White-Label Branding

All white-label variables are prefixed with `NEXT_PUBLIC_` to be accessible in the browser.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_BRAND_NAME` | No | `RCM Partner` | Application brand name |
| `NEXT_PUBLIC_LOGO_URL` | No | `/logo.svg` | Logo image URL |
| `NEXT_PUBLIC_FAVICON` | No | `/favicon.ico` | Browser favicon URL |
| `NEXT_PUBLIC_PRIMARY_COLOR` | No | `#2563eb` | Primary brand color (hex) |
| `NEXT_PUBLIC_SECONDARY_COLOR` | No | `#1e40af` | Secondary brand color (hex) |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | No | `support@halcyonrcm.com` | Support email address |
| `NEXT_PUBLIC_SUPPORT_PHONE` | No | `1-800-HALCYON` | Support phone number |
| `NEXT_PUBLIC_CUSTOM_CSS` | No | - | Custom CSS to inject |
| `NEXT_PUBLIC_API_URL` | **Yes** | - | API server URL |

### Examples

```bash
# Partner branding
NEXT_PUBLIC_BRAND_NAME="Acme Health RCM"
NEXT_PUBLIC_LOGO_URL="/acme-logo.svg"
NEXT_PUBLIC_FAVICON="/acme-favicon.ico"
NEXT_PUBLIC_PRIMARY_COLOR="#10B981"
NEXT_PUBLIC_SECONDARY_COLOR="#059669"
NEXT_PUBLIC_SUPPORT_EMAIL="support@acmehealth.com"
NEXT_PUBLIC_SUPPORT_PHONE="1-888-ACME-RCM"
NEXT_PUBLIC_API_URL="https://api.acmehealth.com"
```

---

## Email Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `EMAIL_PROVIDER` | No | `console` | Provider: `sendgrid`, `ses`, `smtp`, `console` |
| `EMAIL_FROM_ADDRESS` | No | `noreply@halcyon-rcm.com` | Sender email address |
| `EMAIL_FROM_NAME` | No | `Halcyon RCM` | Sender display name |

### SendGrid Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SENDGRID_API_KEY` | If SendGrid | - | SendGrid API key |

### AWS SES Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AWS_REGION` | If SES | `us-east-1` | AWS region |
| `AWS_ACCESS_KEY_ID` | If SES | - | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | If SES | - | AWS secret key |

### SMTP Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SMTP_HOST` | If SMTP | - | SMTP server hostname |
| `SMTP_PORT` | If SMTP | `587` | SMTP server port |
| `SMTP_SECURE` | If SMTP | `false` | Use TLS (`true`/`false`) |
| `SMTP_USERNAME` | If SMTP | - | SMTP username |
| `SMTP_PASSWORD` | If SMTP | - | SMTP password |

### Examples

```bash
# SendGrid
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxx
EMAIL_FROM_ADDRESS=noreply@partner.com
EMAIL_FROM_NAME="Partner RCM"

# AWS SES
EMAIL_PROVIDER=ses
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAXXXXXXXX
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxx
EMAIL_FROM_ADDRESS=noreply@partner.com

# SMTP
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.partner.com
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USERNAME=noreply@partner.com
SMTP_PASSWORD=smtp_password
```

---

## Cloud Services

### AWS Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AWS_ACCESS_KEY_ID` | If AWS | - | AWS access key ID |
| `AWS_SECRET_ACCESS_KEY` | If AWS | - | AWS secret access key |
| `AWS_REGION` | If AWS | `us-east-1` | AWS region |

### AI Services (Optional)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | No | - | OpenAI API key for AI features |
| `ANTHROPIC_API_KEY` | No | - | Anthropic API key |
| `GOOGLE_AI_KEY` | No | - | Google AI API key |

### OCR Services (Optional)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GOOGLE_CLOUD_KEY` | No | - | Google Cloud Vision API key |
| `AZURE_COMPUTER_VISION_KEY` | No | - | Azure Computer Vision key |
| `AZURE_COMPUTER_VISION_ENDPOINT` | No | - | Azure endpoint URL |

---

## External Integrations

### Mugetsu SSI Eligibility Engine

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MUGETSU_API_URL` | No | - | Mugetsu API endpoint URL |
| `MUGETSU_API_KEY` | No | - | Mugetsu API authentication key |
| `MUGETSU_TIMEOUT` | No | `30000` | Request timeout in milliseconds |
| `MUGETSU_MAX_RETRIES` | No | `3` | Maximum retry attempts |
| `MUGETSU_RETRY_DELAY` | No | `1000` | Retry delay in milliseconds |

### Analytics (Optional)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SENTRY_DSN` | No | - | Sentry error tracking DSN |

---

## Feature Flags

Feature flags are typically managed through the white-label configuration in the database, but can be overridden via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `FEATURE_BATCH_IMPORT` | `true` | Enable batch CSV import |
| `FEATURE_SFTP_INTEGRATION` | `true` | Enable SFTP file sync |
| `FEATURE_PDF_EXPORT` | `true` | Enable PDF report generation |
| `FEATURE_SSI_ASSESSMENT` | `true` | Enable SSI eligibility assessments |

---

## Security Considerations

### Secrets Management

**Never commit secrets to version control.** Use one of these approaches:

1. **Environment files**: Use `.env` files excluded from git
2. **AWS Secrets Manager**: Store secrets in AWS
3. **Docker secrets**: Use Docker's secrets management
4. **Kubernetes secrets**: Use K8s secrets for container deployments

### Required Secrets

These variables contain sensitive data and must be kept secure:

| Variable | Risk Level | Notes |
|----------|------------|-------|
| `DATABASE_URL` | **Critical** | Contains database credentials |
| `JWT_SECRET` | **Critical** | Compromises all user sessions |
| `NEXTAUTH_SECRET` | **Critical** | Compromises authentication |
| `SENDGRID_API_KEY` | High | Can send emails as your domain |
| `AWS_SECRET_ACCESS_KEY` | High | Full AWS access if compromised |
| `SMTP_PASSWORD` | High | Email sending access |

### Secret Rotation

Rotate secrets regularly:

```bash
# Generate new JWT secret
NEW_SECRET=$(openssl rand -base64 32)

# Update in production (zero-downtime)
# 1. Add new secret to JWT_SECRET_NEW
# 2. Deploy code that accepts both secrets
# 3. Wait for old tokens to expire
# 4. Remove old secret
```

### Environment-Specific Configuration

```bash
# .env.development
NODE_ENV=development
DATABASE_URL=postgresql://dev_user:dev_pass@localhost:5432/halcyon_dev
JWT_SECRET=development-only-secret-not-for-production

# .env.production
NODE_ENV=production
DATABASE_URL=postgresql://prod_user:SECURE_PASSWORD@db.example.com:5432/halcyon_prod
JWT_SECRET=production-secret-from-secrets-manager
```

---

## Complete Example

```bash
# =============================================================================
# PARTNER CONFIGURATION EXAMPLE
# =============================================================================

# Database
DATABASE_URL="postgresql://partner_user:secure_password@db.partner.com:5432/partner_rcm?sslmode=require"
REDIS_URL="redis://:redis_password@redis.partner.com:6379/0"

# Server
PORT=3001
NODE_ENV=production
CORS_ORIGIN=https://app.partner.com,https://admin.partner.com
LOG_LEVEL=info

# Authentication
JWT_SECRET=your-production-jwt-secret-min-32-characters-long
JWT_EXPIRES_IN=7d
NEXTAUTH_SECRET=your-production-nextauth-secret-min-32-chars
NEXTAUTH_URL=https://app.partner.com

# White-Label Branding
NEXT_PUBLIC_BRAND_NAME="Partner Healthcare RCM"
NEXT_PUBLIC_LOGO_URL="https://cdn.partner.com/logo.svg"
NEXT_PUBLIC_FAVICON="https://cdn.partner.com/favicon.ico"
NEXT_PUBLIC_PRIMARY_COLOR="#10B981"
NEXT_PUBLIC_SECONDARY_COLOR="#059669"
NEXT_PUBLIC_SUPPORT_EMAIL="support@partner.com"
NEXT_PUBLIC_SUPPORT_PHONE="1-800-PARTNER"
NEXT_PUBLIC_API_URL="https://api.partner.com"

# Email (SendGrid)
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxx
EMAIL_FROM_ADDRESS=noreply@partner.com
EMAIL_FROM_NAME="Partner Healthcare"

# AWS (for SES, S3, etc.)
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_REGION=us-east-1

# Integrations
MUGETSU_API_URL=https://api.mugetsu.com/v1
MUGETSU_API_KEY=mugetsu_api_key_here

# Monitoring
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
```

---

## Related Documentation

- [WHITE_LABEL_SETUP.md](./WHITE_LABEL_SETUP.md) - Setup guide
- [PARTNER_DEPLOYMENT.md](./PARTNER_DEPLOYMENT.md) - Deployment options
- [MULTI_TENANT_ARCHITECTURE.md](./MULTI_TENANT_ARCHITECTURE.md) - Architecture overview
