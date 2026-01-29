# Multi-Tenant Architecture

This document describes the multi-tenant architecture of the Halcyon RCM Partner Assistant, explaining how data isolation, organization management, and security work.

## Table of Contents

- [Overview](#overview)
- [Organization Model](#organization-model)
- [Data Isolation](#data-isolation)
- [Domain Routing](#domain-routing)
- [Authentication and Authorization](#authentication-and-authorization)
- [White-Label Configuration](#white-label-configuration)
- [Security Considerations](#security-considerations)
- [Performance Considerations](#performance-considerations)
- [Best Practices](#best-practices)

---

## Overview

The Halcyon RCM Partner Assistant uses a **single-database, shared-schema multi-tenant architecture** where:

- All tenants (organizations) share the same database
- Data is isolated using `organizationId` foreign keys
- Each organization can have custom branding and configuration
- Role-based access control (RBAC) enforces permissions

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Load Balancer                                │
│                    (Domain-based routing)                           │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│  Partner A    │      │  Partner B    │      │  Partner C    │
│ app.partnerA  │      │ app.partnerB  │      │ app.partnerC  │
└───────┬───────┘      └───────┬───────┘      └───────┬───────┘
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │    API Server         │
                    │  (Org context from    │
                    │   domain/auth)        │
                    └───────────┬───────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │    PostgreSQL DB      │
                    │  (Shared schema,      │
                    │   org-scoped data)    │
                    └───────────────────────┘
```

---

## Organization Model

### Core Organization Entity

```prisma
model Organization {
  id               String            @id @default(cuid())
  name             String
  type             String?           // hospital, rcm_vendor, etc.
  settings         Json?             // Organization-specific settings

  // Relations
  users            User[]
  assessments      Assessment[]
  imports          ImportHistory[]
  presets          CustomPreset[]
  sftpConnections  SFTPConnection[]
  whiteLabelConfig WhiteLabelConfig?

  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt
}
```

### Organization Types

| Type | Description | Typical Use Case |
|------|-------------|------------------|
| `hospital` | Healthcare facility | Primary care hospitals |
| `health_system` | Multi-facility system | Large healthcare networks |
| `rcm_vendor` | RCM service provider | Third-party billing companies |
| `clinic` | Outpatient facility | Specialty clinics |

### Organization Settings

The `settings` JSON field supports organization-specific configuration:

```json
{
  "maxUsers": 100,
  "dataRetentionDays": 2557,
  "allowedModules": ["assessments", "reports", "batch_import"],
  "billingPlan": "enterprise",
  "features": {
    "ssiAssessment": true,
    "clearinghouseIntegration": true
  }
}
```

---

## Data Isolation

### Organization-Scoped Models

All tenant data includes an `organizationId` foreign key:

```prisma
model Assessment {
  id             String        @id @default(cuid())
  // ... other fields

  // Organization scope
  organizationId String?
  organization   Organization? @relation(fields: [organizationId], references: [id])

  @@index([organizationId])
}
```

### Models with Organization Scope

| Model | Isolation Level | Description |
|-------|-----------------|-------------|
| `User` | Organization | Users belong to one organization |
| `Assessment` | Organization | Patient assessments |
| `ImportHistory` | Organization | File import records |
| `CustomPreset` | Organization | Import mapping presets |
| `SFTPConnection` | Organization | SFTP configurations |
| `WhiteLabelConfig` | Organization (1:1) | Branding configuration |
| `RecoveryAccount` | Via Assessment | Recovery tracking |
| `Claim` | Via RecoveryAccount | Claims data |

### Query-Level Isolation

All database queries automatically filter by organization:

```typescript
// API Controller Example
async function getAssessments(req: AuthRequest, res: Response) {
  const { organizationId } = req.user;

  const assessments = await prisma.assessment.findMany({
    where: {
      organizationId,  // Always filter by org
      // ... other filters
    },
  });

  return res.json({ data: assessments });
}
```

### Database Helper Functions

```typescript
// packages/api/src/lib/db-helpers.ts
export function withOrganization(organizationId: string | undefined) {
  return {
    where: {
      organizationId: organizationId || undefined,
    },
  };
}

// Usage
const assessments = await prisma.assessment.findMany({
  ...withOrganization(req.user.organizationId),
  orderBy: { createdAt: 'desc' },
});
```

---

## Domain Routing

### Custom Domain Resolution

The platform supports custom domains for each organization:

```
app.partnera.com  →  Organization A
app.partnerb.com  →  Organization B
rcm.hospital.org  →  Organization C
```

### Domain Resolution Flow

```
1. Request arrives at load balancer
   └─► Host: app.partnera.com

2. Load balancer routes to application server

3. Application middleware resolves organization:
   └─► Query: SELECT * FROM domains WHERE domain = 'app.partnera.com'
   └─► Returns: { organizationId: 'org_abc123' }

4. Organization context set for request
   └─► req.organizationId = 'org_abc123'

5. White-label config loaded
   └─► Query: SELECT * FROM WhiteLabelConfig WHERE organizationId = 'org_abc123'
```

### Domain Resolution Middleware

```typescript
// packages/api/src/middleware/domainResolver.ts
export async function domainResolver(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const host = req.hostname;

  // Look up organization by domain
  const domain = await prisma.customDomain.findUnique({
    where: { domain: host },
    include: { organization: true },
  });

  if (domain) {
    req.organizationId = domain.organizationId;
    req.organization = domain.organization;
  }

  next();
}
```

### Fallback Resolution

If no custom domain matches:

1. Check subdomain pattern: `{slug}.platform.halcyon-rcm.com`
2. Use authenticated user's organization
3. Return 404 for unknown domains

---

## Authentication and Authorization

### User-Organization Relationship

```prisma
model User {
  id             String        @id @default(cuid())
  email          String        @unique
  name           String?
  passwordHash   String?
  role           UserLegacyRole @default(USER)

  // Organization membership
  organizationId String?
  organization   Organization? @relation(fields: [organizationId], references: [id])

  // RBAC relations
  userRoles      UserRole[]
  userDepartments UserDepartment[]
}
```

### Role-Based Access Control (RBAC)

The platform uses a comprehensive RBAC system:

```prisma
model Role {
  id           String     @id @default(cuid())
  name         String     @unique
  description  String?
  permissions  Json       // Array of permission strings
  inheritsFrom Json?      // Role inheritance

  userRoles    UserRole[]
}

model UserRole {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  roleId    String
  role      Role     @relation(fields: [roleId], references: [id])

  assignedAt DateTime @default(now())
  expiresAt  DateTime?
}
```

### Permission System

```typescript
// Permission categories
const PERMISSIONS = {
  // Assessments
  'assessments:read': 'View assessments',
  'assessments:create': 'Create assessments',
  'assessments:update': 'Update assessments',
  'assessments:delete': 'Delete assessments',

  // Reports
  'reports:read': 'View reports',
  'reports:export': 'Export reports',

  // Admin
  'admin:users': 'Manage users',
  'admin:settings': 'Manage settings',
  'admin:organization': 'Manage organization',
};
```

### Authorization Middleware

```typescript
// packages/api/src/middleware/rbac.ts
export function requirePermission(permission: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userPermissions = await getUserPermissions(req.user.id);

    if (!userPermissions.includes(permission)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: permission,
      });
    }

    next();
  };
}

// Usage
router.delete(
  '/assessments/:id',
  requirePermission('assessments:delete'),
  deleteAssessment
);
```

---

## White-Label Configuration

### Configuration Model

```prisma
model WhiteLabelConfig {
  id                    String   @id @default(cuid())
  organizationId        String   @unique

  // Branding
  brandName             String   @default("RCM Partner")
  logoUrl               String?
  faviconUrl            String?
  primaryColor          String   @default("#2563eb")
  secondaryColor        String   @default("#1e40af")

  // Support
  supportEmail          String?
  supportPhone          String?
  companyWebsite        String?

  // Legal
  termsOfServiceUrl     String?
  privacyPolicyUrl      String?
  organizationLegalName String?

  // Features
  features              Json     @default("{}")
  customCss             String?

  // Localization
  timezone              String   @default("America/New_York")
  locale                String   @default("en-US")

  organization          Organization @relation(fields: [organizationId], references: [id])
}
```

### Configuration Loading

```typescript
// packages/web/src/config/white-label.ts
export async function loadWhiteLabelConfig(): Promise<WhiteLabelConfig> {
  // Priority: API > LocalStorage > Environment > Defaults

  // 1. Try API (server-side configuration)
  const apiConfig = await loadFromApi();
  if (apiConfig) return merge(defaults, apiConfig);

  // 2. Try localStorage (persisted changes)
  const storedConfig = loadFromLocalStorage();
  if (storedConfig) return merge(defaults, storedConfig);

  // 3. Environment variables
  const envConfig = loadFromEnvironment();
  return merge(defaults, envConfig);
}
```

### Feature Toggles

```typescript
interface FeatureToggles {
  assessments: boolean;
  batchImport: boolean;
  reports: boolean;
  sftpIntegration: boolean;
  pdfExport: boolean;
  workQueue: boolean;
  eligibilityVerification: boolean;
  denialManagement: boolean;
  complianceTracking: boolean;
}
```

---

## Security Considerations

### Data Isolation Enforcement

| Layer | Protection |
|-------|------------|
| Application | Organization ID in all queries |
| API | Middleware validates org access |
| Database | Row-level organization filters |
| Audit | All access logged with org context |

### Cross-Tenant Access Prevention

```typescript
// Middleware to verify organization access
export function verifyOrganizationAccess(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const requestedOrgId = req.params.organizationId || req.body.organizationId;
  const userOrgId = req.user.organizationId;

  // Admins can access any organization
  if (req.user.role === 'ADMIN') {
    return next();
  }

  // Regular users can only access their organization
  if (requestedOrgId && requestedOrgId !== userOrgId) {
    return res.status(403).json({
      error: 'Access denied to this organization',
    });
  }

  next();
}
```

### Audit Logging

```prisma
model AuditLog {
  id         String   @id @default(cuid())
  action     String   // CREATE, UPDATE, DELETE, EXPORT, IMPORT
  entityType String   // Assessment, Import, etc.
  entityId   String?
  userId     String?
  details    Json?
  ipAddress  String?
  userAgent  String?
  createdAt  DateTime @default(now())

  @@index([entityType, entityId])
  @@index([userId])
  @@index([createdAt])
}
```

### PHI Protection

1. **Encryption at rest**: Database encryption enabled
2. **Encryption in transit**: TLS 1.3 required
3. **Access logging**: All PHI access logged
4. **Data masking**: PHI masked in logs
5. **Retention policies**: Configurable per organization

---

## Performance Considerations

### Database Indexing

Indexes on organization-scoped tables:

```prisma
model Assessment {
  // ...

  @@index([organizationId])
  @@index([organizationId, status])
  @@index([organizationId, createdAt])
}
```

### Query Optimization

```typescript
// Use organization-scoped queries with proper indexes
const assessments = await prisma.assessment.findMany({
  where: {
    organizationId,  // Uses index
    status: 'PENDING',
  },
  take: 50,
  orderBy: { createdAt: 'desc' },
});
```

### Caching Strategy

```typescript
// Cache organization configurations
const cacheKey = `org:${organizationId}:config`;
const cached = await redis.get(cacheKey);

if (!cached) {
  const config = await prisma.whiteLabelConfig.findUnique({
    where: { organizationId },
  });
  await redis.setex(cacheKey, 3600, JSON.stringify(config));
}
```

### Connection Pooling

```typescript
// Prisma connection pool configuration
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Connection pool settings
  log: ['error', 'warn'],
});
```

---

## Best Practices

### 1. Always Include Organization Context

```typescript
// Good
const data = await prisma.assessment.findMany({
  where: { organizationId: req.user.organizationId },
});

// Bad (missing org filter)
const data = await prisma.assessment.findMany();
```

### 2. Validate Organization Access

```typescript
// Validate before any operation
if (resource.organizationId !== req.user.organizationId) {
  throw new ForbiddenError('Access denied');
}
```

### 3. Use Database Transactions

```typescript
// Ensure atomicity for multi-table operations
await prisma.$transaction([
  prisma.assessment.create({ data: { organizationId, ... } }),
  prisma.auditLog.create({ data: { organizationId, ... } }),
]);
```

### 4. Implement Row-Level Security (RLS) - Optional

For additional security, consider PostgreSQL RLS:

```sql
ALTER TABLE "Assessment" ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_isolation ON "Assessment"
  USING (organizationId = current_setting('app.organization_id'));
```

### 5. Regular Security Audits

- Review access patterns
- Check for cross-tenant queries
- Audit permission assignments
- Monitor failed access attempts

---

## Related Documentation

- [WHITE_LABEL_SETUP.md](./WHITE_LABEL_SETUP.md) - Setup guide
- [PARTNER_DEPLOYMENT.md](./PARTNER_DEPLOYMENT.md) - Deployment options
- [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) - Configuration
- [CUSTOM_DOMAIN_SETUP.md](./CUSTOM_DOMAIN_SETUP.md) - Domain configuration
