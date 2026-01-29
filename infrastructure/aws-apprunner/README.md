# AWS App Runner Setup Guide (HIPAA-Compliant)

This guide walks you through setting up the RCM Partner Assistant API on AWS App Runner.

> **Note**: For production white-label deployments, we recommend using the Terraform configuration in `infrastructure/aws/`. This manual guide is useful for quick dev/staging setups or understanding the architecture.

**Estimated Time:** 30-45 minutes
**Estimated Cost:** ~$100-150/month

---

## Prerequisites

- [x] AWS Account created
- [x] BAA signed in AWS Artifact
- [ ] AWS CLI installed (optional, for CLI method)
- [ ] Partner configuration values ready (see `infrastructure/aws/terraform.tfvars.example`)

---

## Partner Configuration

Before starting, decide on these values for your partner deployment:

| Variable | Example | Description |
|----------|---------|-------------|
| `PROJECT_PREFIX` | `acme-rcm` | Unique identifier (lowercase, hyphens) |
| `ENVIRONMENT` | `prod` | Environment name |
| `BRAND_NAME` | `Acme Healthcare RCM` | Display name |

Replace placeholders like `[PROJECT_PREFIX]` in this guide with your actual values.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    AWS (HIPAA BAA)                       │
│                                                          │
│   ┌──────────────────┐      ┌──────────────────────┐   │
│   │   App Runner     │      │   RDS PostgreSQL     │   │
│   │   (API Server)   │─────▶│   (Encrypted)        │   │
│   │   Auto-scaling   │      │   Multi-AZ           │   │
│   └──────────────────┘      └──────────────────────────┘   │
│            │                                              │
│            │ VPC Connector                                │
│            ▼                                              │
│   ┌──────────────────┐      ┌──────────────────────┐   │
│   │  Secrets Manager │      │    CloudWatch        │   │
│   │  (Credentials)   │      │    (Logs/Audit)      │   │
│   └──────────────────┘      └──────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## Step 1: Create VPC (5 minutes)

We need a VPC for the database. App Runner will connect via VPC Connector.

### Via Console:

1. Go to **VPC Console**: https://console.aws.amazon.com/vpc/
2. Click **"Create VPC"**
3. Select **"VPC and more"** (creates subnets automatically)
4. Settings:
   - Name: `[PROJECT_PREFIX]-[ENVIRONMENT]`
   - IPv4 CIDR: `10.0.0.0/16`
   - Number of AZs: `2`
   - Number of public subnets: `2`
   - Number of private subnets: `2`
   - NAT gateways: `None` (save cost)
   - VPC endpoints: `None`
5. Click **"Create VPC"**

**Save these values:**
- VPC ID: `vpc-xxxxxxxxx`
- Private Subnet 1: `subnet-xxxxxxxxx`
- Private Subnet 2: `subnet-xxxxxxxxx`

---

## Step 2: Create Security Group for Database (3 minutes)

1. In VPC Console, go to **Security Groups**
2. Click **"Create security group"**
3. Settings:
   - Name: `[PROJECT_PREFIX]-rds-sg`
   - Description: `Security group for RDS database`
   - VPC: Select your VPC
4. Inbound Rules:
   - Type: `PostgreSQL`
   - Port: `5432`
   - Source: `10.0.0.0/16` (entire VPC)
5. Click **"Create security group"**

**Save:** Security Group ID: `sg-xxxxxxxxx`

---

## Step 3: Create RDS PostgreSQL Database (10 minutes)

1. Go to **RDS Console**: https://console.aws.amazon.com/rds/
2. Click **"Create database"**
3. Settings:

   **Engine:**
   - Engine type: `PostgreSQL`
   - Version: `PostgreSQL 15.x`

   **Templates:**
   - Select: `Production` (for Multi-AZ)
   - Or `Dev/Test` to save cost initially

   **Settings:**
   - DB identifier: `[PROJECT_PREFIX]-[ENVIRONMENT]-db`
   - Master username: `[PROJECT_PREFIX]_admin` (underscores, not hyphens)
   - Master password: **[Create a strong password - SAVE THIS!]**

   **Instance:**
   - DB instance class: `db.t3.micro` (dev) or `db.t3.small` (prod)
   - Storage: `20 GB` gp3

   **Connectivity:**
   - VPC: Your VPC
   - Subnet group: Create new → select private subnets
   - Public access: **No** (IMPORTANT for HIPAA)
   - Security group: Select your security group

   **Database options:**
   - Initial database name: `[PROJECT_PREFIX]` (underscores, not hyphens)

   **Encryption:**
   - Enable encryption: **Yes** (REQUIRED FOR HIPAA)

   **Backup:**
   - Backup retention: `7 days` minimum

4. Click **"Create database"** (takes 5-10 minutes)

**Save these values:**
- Endpoint: `[PROJECT_PREFIX]-[ENVIRONMENT]-db.xxxxxxxxx.us-east-1.rds.amazonaws.com`
- Port: `5432`
- Database name: `[PROJECT_PREFIX]`
- Username: `[PROJECT_PREFIX]_admin`
- Password: `[your password]`

---

## Step 4: Create Secrets in Secrets Manager (3 minutes)

1. Go to **Secrets Manager**: https://console.aws.amazon.com/secretsmanager/
2. Click **"Store a new secret"**

### Secret 1: Database URL

- Secret type: `Other type of secret`
- Key/value:
  - Key: `url`
  - Value: `postgresql://[USERNAME]:[PASSWORD]@[RDS_ENDPOINT]:5432/[DB_NAME]?sslmode=require`
- Secret name: `[PROJECT_PREFIX]/database-url`
- Click **"Store"**

### Secret 2: JWT Secret

- Secret type: `Other type of secret`
- Key/value:
  - Key: `secret`
  - Value: Generate with `openssl rand -base64 32`
- Secret name: `[PROJECT_PREFIX]/jwt-secret`
- Click **"Store"**

---

## Step 5: Create ECR Repository (2 minutes)

1. Go to **ECR Console**: https://console.aws.amazon.com/ecr/
2. Click **"Create repository"**
3. Settings:
   - Visibility: `Private`
   - Repository name: `[PROJECT_PREFIX]-[ENVIRONMENT]-api`
   - Encryption: `AES-256`
4. Click **"Create repository"**

**Save:** Repository URI: `123456789.dkr.ecr.us-east-1.amazonaws.com/[PROJECT_PREFIX]-[ENVIRONMENT]-api`

---

## Step 6: Push Docker Image to ECR (5 minutes)

Run these commands locally (requires Docker and AWS CLI):

```bash
# Set your values
export PROJECT_PREFIX=your-partner
export ENVIRONMENT=prod
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export AWS_REGION=us-east-1

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Build the image (from project root)
cd /path/to/Halcyon-RCM-Partner-Assistant
docker build -t $PROJECT_PREFIX-$ENVIRONMENT-api -f docker/Dockerfile.api .

# Tag the image
docker tag $PROJECT_PREFIX-$ENVIRONMENT-api:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$PROJECT_PREFIX-$ENVIRONMENT-api:latest

# Push to ECR
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$PROJECT_PREFIX-$ENVIRONMENT-api:latest
```

---

## Step 7: Create App Runner VPC Connector (3 minutes)

1. Go to **App Runner Console**: https://console.aws.amazon.com/apprunner/
2. Go to **"VPC connectors"** in the left menu
3. Click **"Create VPC connector"**
4. Settings:
   - Name: `[PROJECT_PREFIX]-connector`
   - VPC: Your VPC
   - Subnets: Select both private subnets
   - Security group: Create new or use your RDS security group
5. Click **"Create"**

---

## Step 8: Create App Runner Service (10 minutes)

1. Go to **App Runner Console**: https://console.aws.amazon.com/apprunner/
2. Click **"Create service"**

### Source:
- Repository type: `Container registry`
- Provider: `Amazon ECR`
- Container image URI: `[your ECR URI]:latest`
- ECR access role: `Create new service role`

### Deployment settings:
- Deployment trigger: `Manual` (or Automatic if you want auto-deploy)

### Configure service:
- Service name: `[PROJECT_PREFIX]-[ENVIRONMENT]-api`
- CPU: `1 vCPU`
- Memory: `2 GB`
- Port: `3001`

### Environment variables:
Add these:
| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `3001` |
| `BRAND_NAME` | `[Your Brand Name]` |
| `PRIMARY_COLOR` | `#2563eb` |
| `SUPPORT_EMAIL` | `support@partner.com` |
| `DATABASE_URL` | `[Get from Secrets Manager or paste directly]` |
| `JWT_SECRET` | `[Get from Secrets Manager or paste directly]` |

### Networking:
- Select **"Custom VPC"**
- VPC connector: Your VPC connector

### Health check:
- Protocol: `HTTP`
- Path: `/health`

4. Click **"Create & deploy"**

---

## Step 9: Update Frontend Environment (2 minutes)

Once App Runner is deployed, you'll get a URL like:
`https://xxxxxxxx.us-east-1.awsapprunner.com`

Update your frontend deployment:
1. Go to your frontend hosting (Vercel, etc.)
2. Update `NEXT_PUBLIC_API_URL` to your App Runner URL
3. Redeploy

---

## Step 10: Run Database Migrations (2 minutes)

You need to run Prisma migrations against the new database. Options:

**Option A:** Use AWS CloudShell or an EC2 instance in the VPC

**Option B:** Add a migration step to your Docker startup (recommended)

**Option C:** Temporarily allow public access to RDS, run migrations, then disable

---

## Verification Checklist

- [ ] App Runner service is "Running"
- [ ] Health check at `https://[your-url]/health` returns `{"status":"healthy"}`
- [ ] Can login through the frontend
- [ ] Database connection working

---

## Costs Breakdown

| Service | Monthly Cost |
|---------|--------------|
| App Runner (1 vCPU, 2GB, light usage) | ~$25-50 |
| RDS db.t3.micro (dev) | ~$15 |
| RDS db.t3.small (prod) | ~$30 |
| Secrets Manager (2 secrets) | ~$1 |
| Data transfer | ~$5-10 |
| **Total (dev)** | **~$50-75** |
| **Total (prod)** | **~$75-100** |

---

## Next Steps

For production deployments with full white-label support:
1. Use the Terraform configuration in `infrastructure/aws/`
2. See `infrastructure/README.md` for detailed instructions
3. The Terraform approach provides better automation and consistency

---

## Troubleshooting

### App Runner can't connect to RDS
- Verify VPC connector is attached
- Check security group allows port 5432 from VPC CIDR
- Verify RDS is in private subnets

### Health check failing
- Check CloudWatch logs for errors
- Verify PORT environment variable is set to 3001
- Check DATABASE_URL is correct

### Database connection errors
- Verify DATABASE_URL includes `?sslmode=require`
- Check RDS security group rules
- Verify username/password are correct
