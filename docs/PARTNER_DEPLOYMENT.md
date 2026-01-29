# Partner Deployment Guide

This guide covers deployment options for white-label partner instances of the Halcyon RCM Partner Assistant.

## Table of Contents

- [Overview](#overview)
- [Deployment Options](#deployment-options)
- [Docker Deployment](#docker-deployment)
- [AWS Deployment](#aws-deployment)
- [Vercel Deployment](#vercel-deployment)
- [Environment-Specific Configurations](#environment-specific-configurations)
- [Health Checks and Monitoring](#health-checks-and-monitoring)
- [Scaling Considerations](#scaling-considerations)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Halcyon RCM Partner Assistant supports multiple deployment options to accommodate different partner requirements:

| Deployment Type | Best For | Complexity | Cost |
|----------------|----------|------------|------|
| Docker Compose | Development, Small deployments | Low | Low |
| AWS (ECS/Fargate) | Production, HIPAA compliance | Medium-High | Medium-High |
| AWS App Runner | Simple production deployments | Low | Medium |
| Vercel + Managed DB | Quick deployments, Frontend-focused | Low | Low-Medium |

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Load Balancer / CDN                     │
│                    (CloudFront, ALB, Vercel)                │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
       ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
       │  Web App    │ │  API Server │ │  Worker     │
       │  (Next.js)  │ │  (Express)  │ │  (Optional) │
       └─────────────┘ └─────────────┘ └─────────────┘
              │               │               │
              └───────────────┼───────────────┘
                              ▼
                    ┌─────────────────┐
                    │   PostgreSQL    │
                    │   (RDS/Managed) │
                    └─────────────────┘
                              │
                    ┌─────────────────┐
                    │   Redis (Opt)   │
                    │   (ElastiCache) │
                    └─────────────────┘
```

---

## Deployment Options

### Quick Comparison

| Feature | Docker | AWS ECS | AWS App Runner | Vercel |
|---------|--------|---------|----------------|--------|
| HIPAA Eligible | Yes* | Yes | Yes | No |
| Auto-scaling | Manual | Yes | Yes | Yes |
| SSL/TLS | Manual | ACM | Automatic | Automatic |
| Custom Domains | Yes | Yes | Yes | Yes |
| Database | Self-managed | RDS | RDS | External |
| Cost (monthly) | $50-200 | $200-1000+ | $100-500 | $20-200 |

*Requires proper configuration and BAA

---

## Docker Deployment

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- 2GB+ RAM

### Quick Start

```bash
# Clone and configure
git clone <repository>
cd halcyon-rcm-partner-assistant
cp .env.example .env

# Edit .env with partner configuration
# Then start services
docker-compose -f docker/docker-compose.yml up -d
```

### Docker Compose Configuration

```yaml
# docker/docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: halcyon-rcm-postgres
    environment:
      POSTGRES_USER: halcyon
      POSTGRES_PASSWORD: ${DB_PASSWORD:-halcyon_secret}
      POSTGRES_DB: halcyon_rcm
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U halcyon -d halcyon_rcm"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: halcyon-rcm-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build:
      context: ..
      dockerfile: packages/api/Dockerfile
    container_name: halcyon-rcm-api
    environment:
      - NODE_ENV=production
      - PORT=3001
      - DATABASE_URL=postgresql://halcyon:${DB_PASSWORD:-halcyon_secret}@postgres:5432/halcyon_rcm?schema=public
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
    ports:
      - "3001:3001"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: >
      sh -c "npx prisma migrate deploy && npm run start"

  web:
    build:
      context: ..
      dockerfile: docker/Dockerfile.web
    container_name: halcyon-rcm-web
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=http://api:3001
    ports:
      - "3000:3000"
    depends_on:
      - api

volumes:
  postgres_data:
  redis_data:
```

### Partner-Specific Docker Deployment

Create a partner-specific compose file:

```yaml
# docker/docker-compose.partner.yml
version: '3.8'

services:
  api:
    environment:
      - NEXT_PUBLIC_BRAND_NAME=Partner Healthcare
      - EMAIL_FROM_ADDRESS=noreply@partner.com

  web:
    environment:
      - NEXT_PUBLIC_BRAND_NAME=Partner Healthcare
      - NEXT_PUBLIC_PRIMARY_COLOR=#10B981
```

Deploy:
```bash
docker-compose -f docker/docker-compose.yml -f docker/docker-compose.partner.yml up -d
```

### Docker Production Best Practices

1. **Use secrets management:**
   ```yaml
   services:
     api:
       secrets:
         - db_password
         - jwt_secret
   secrets:
     db_password:
       external: true
     jwt_secret:
       external: true
   ```

2. **Enable health checks for all services**

3. **Use named volumes for data persistence**

4. **Set resource limits:**
   ```yaml
   services:
     api:
       deploy:
         resources:
           limits:
             cpus: '1'
             memory: 1G
   ```

---

## AWS Deployment

### Using Terraform

The `infrastructure/aws/main.tf` provides a HIPAA-compliant AWS deployment.

#### Prerequisites

1. AWS CLI configured
2. Terraform installed
3. BAA signed in AWS Artifact (for HIPAA)

#### Deploy

```bash
cd infrastructure/aws

# Initialize Terraform
terraform init

# Create variables file
cat > terraform.tfvars <<EOF
aws_region = "us-east-1"
environment = "production"
db_password = "your-secure-db-password"
jwt_secret = "your-secure-jwt-secret"
EOF

# Review plan
terraform plan

# Apply
terraform apply
```

### Infrastructure Components

The Terraform configuration creates:

| Component | Purpose | HIPAA Consideration |
|-----------|---------|---------------------|
| VPC | Network isolation | Private subnets for DB |
| RDS PostgreSQL | Database | Encrypted, Multi-AZ |
| ECS Fargate | Container hosting | No persistent storage |
| ALB | Load balancing | SSL termination |
| CloudWatch | Logging | 7-year retention |
| KMS | Encryption | Customer-managed keys |
| Secrets Manager | Credentials | Encrypted at rest |
| S3 | Logs storage | Versioned, encrypted |

### Manual AWS Setup (Alternative)

#### 1. Create RDS Database

```bash
aws rds create-db-instance \
  --db-instance-identifier halcyon-rcm-db \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 15 \
  --master-username halcyon_admin \
  --master-user-password "$DB_PASSWORD" \
  --allocated-storage 100 \
  --storage-encrypted \
  --multi-az \
  --publicly-accessible false
```

#### 2. Create ECS Cluster

```bash
aws ecs create-cluster \
  --cluster-name halcyon-rcm-cluster \
  --capacity-providers FARGATE FARGATE_SPOT \
  --default-capacity-provider-strategy capacityProvider=FARGATE,weight=1
```

#### 3. Deploy with ECR

```bash
# Build and push Docker image
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

docker build -t halcyon-rcm-api -f packages/api/Dockerfile .
docker tag halcyon-rcm-api:latest $ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/halcyon-rcm-api:latest
docker push $ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/halcyon-rcm-api:latest
```

### AWS App Runner (Simplified)

For simpler deployments:

```bash
# Create App Runner service from ECR
aws apprunner create-service \
  --service-name halcyon-rcm-api \
  --source-configuration '{
    "ImageRepository": {
      "ImageIdentifier": "'$ACCOUNT_ID'.dkr.ecr.us-east-1.amazonaws.com/halcyon-rcm-api:latest",
      "ImageRepositoryType": "ECR"
    }
  }' \
  --instance-configuration '{
    "Cpu": "1 vCPU",
    "Memory": "2 GB"
  }'
```

---

## Vercel Deployment

### Web Frontend Deployment

#### 1. Install Vercel CLI

```bash
npm install -g vercel
```

#### 2. Deploy

```bash
cd packages/web

# First deployment
vercel

# Production deployment
vercel --prod
```

#### 3. Configure Environment Variables

In Vercel Dashboard or via CLI:

```bash
vercel env add NEXT_PUBLIC_API_URL production
vercel env add NEXT_PUBLIC_BRAND_NAME production
vercel env add NEXTAUTH_SECRET production
vercel env add NEXTAUTH_URL production
```

### Vercel Configuration

Create `vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "NEXT_PUBLIC_API_URL": "@api_url",
    "NEXT_PUBLIC_BRAND_NAME": "@brand_name"
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" }
      ]
    }
  ]
}
```

### API Backend Options with Vercel

Since Vercel is primarily for frontend, deploy the API separately:

1. **Railway** - Simple Node.js hosting
2. **Render** - Docker-based hosting
3. **AWS ECS/App Runner** - Full AWS infrastructure
4. **DigitalOcean App Platform** - Simple container hosting

---

## Environment-Specific Configurations

### Development

```bash
# .env.development
NODE_ENV=development
DATABASE_URL=postgresql://halcyon_user:halcyon123@localhost:5432/halcyon_dev
JWT_SECRET=development-only-secret
NEXT_PUBLIC_API_URL=http://localhost:3001
EMAIL_PROVIDER=console
```

### Staging

```bash
# .env.staging
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@staging-db.example.com:5432/halcyon_staging
JWT_SECRET=staging-secret-from-secrets-manager
NEXT_PUBLIC_API_URL=https://staging-api.partner.com
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.staging_key
```

### Production

```bash
# .env.production
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@prod-db.example.com:5432/halcyon_prod?sslmode=require
JWT_SECRET=production-secret-from-secrets-manager
NEXT_PUBLIC_API_URL=https://api.partner.com
EMAIL_PROVIDER=ses
LOG_LEVEL=warn
```

---

## Health Checks and Monitoring

### Health Check Endpoints

The API provides health check endpoints:

```bash
# Basic health check
curl https://api.partner.com/health
# Response: {"status":"ok","timestamp":"2024-01-15T10:30:00Z"}

# Detailed health check
curl https://api.partner.com/health/detailed
# Response: {"status":"ok","database":"connected","redis":"connected","version":"1.0.0"}
```

### Monitoring Setup

#### CloudWatch (AWS)

```bash
# Create CloudWatch alarm for API errors
aws cloudwatch put-metric-alarm \
  --alarm-name halcyon-api-errors \
  --metric-name 5XXError \
  --namespace AWS/ApplicationELB \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2
```

#### Uptime Monitoring

Configure external monitoring (e.g., Pingdom, UptimeRobot):

- Monitor: `https://api.partner.com/health`
- Interval: 1 minute
- Alert on: 2+ failures

---

## Scaling Considerations

### Horizontal Scaling

**API Servers:**
```yaml
# docker-compose.scale.yml
services:
  api:
    deploy:
      replicas: 3
```

**AWS ECS:**
```hcl
resource "aws_ecs_service" "api" {
  desired_count = 3
}
```

### Database Scaling

1. **Vertical scaling**: Increase RDS instance size
2. **Read replicas**: Add RDS read replicas for read-heavy workloads
3. **Connection pooling**: Use PgBouncer or RDS Proxy

### Caching Strategy

Use Redis for:
- Session storage
- API response caching
- Job queue (BullMQ)

```typescript
// Cache frequently accessed data
const cacheKey = `org:${organizationId}:config`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const config = await prisma.whiteLabelConfig.findUnique({...});
await redis.setex(cacheKey, 3600, JSON.stringify(config));
```

---

## Troubleshooting

### Container Won't Start

**Check logs:**
```bash
docker logs halcyon-rcm-api
# or
aws logs get-log-events --log-group-name /ecs/halcyon-rcm --log-stream-name api/...
```

**Common causes:**
- Missing environment variables
- Database connection failed
- Port already in use

### Database Connection Issues

**Test connection:**
```bash
# From container
docker exec -it halcyon-rcm-api sh -c "npx prisma db pull"

# From host
psql $DATABASE_URL -c "SELECT 1"
```

**Common causes:**
- Wrong connection string
- Network/security group issues
- Database not running

### SSL/TLS Issues

**Test certificate:**
```bash
openssl s_client -connect api.partner.com:443 -servername api.partner.com
```

**Check certificate chain:**
```bash
curl -vI https://api.partner.com
```

### Performance Issues

**Check API response times:**
```bash
curl -w "@curl-format.txt" -s https://api.partner.com/health
```

**Monitor resource usage:**
```bash
# Docker
docker stats

# AWS
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=halcyon-rcm-api
```

---

## Related Documentation

- [WHITE_LABEL_SETUP.md](./WHITE_LABEL_SETUP.md) - Overall setup guide
- [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) - Configuration reference
- [CUSTOM_DOMAIN_SETUP.md](./CUSTOM_DOMAIN_SETUP.md) - DNS configuration
- [MULTI_TENANT_ARCHITECTURE.md](./MULTI_TENANT_ARCHITECTURE.md) - Architecture overview
