# RCM Partner Assistant - Infrastructure

This directory contains the infrastructure-as-code for deploying the RCM Partner Assistant as a white-label solution on AWS.

## Overview

The infrastructure supports multi-tenant partner deployments with complete resource isolation. Each partner gets their own:

- VPC with private subnets
- PostgreSQL database (encrypted, Multi-AZ)
- ECS Fargate cluster or App Runner service
- ECR repositories for Docker images
- S3 bucket for logs
- Secrets Manager for credentials
- CloudWatch for logging and monitoring

## Directory Structure

```
infrastructure/
├── aws/                    # Main AWS infrastructure (Terraform)
│   ├── main.tf            # Core infrastructure resources
│   ├── variables.tf       # Configuration variables
│   ├── terraform.tfvars.example  # Example partner configuration
│   ├── deploy.sh          # Deployment script
│   └── apprunner.yaml     # App Runner configuration (dev/staging)
└── aws-apprunner/         # App Runner setup guide (manual setup)
    └── README.md
```

## Deploying for a New Partner

### Prerequisites

1. **AWS Account**: Create an AWS account for the partner (or use separate IAM roles)
2. **BAA Signed**: Sign the Business Associate Agreement in AWS Artifact (required for HIPAA)
3. **AWS CLI**: Install and configure AWS CLI with appropriate credentials
4. **Terraform**: Install Terraform v1.0 or later
5. **Docker**: Install Docker for building container images

### Step 1: Configure Partner Settings

```bash
cd infrastructure/aws

# Copy the example configuration
cp terraform.tfvars.example terraform.tfvars

# Edit with partner-specific values
nano terraform.tfvars
```

Required configuration:

| Variable | Description | Example |
|----------|-------------|---------|
| `project_prefix` | Unique identifier for the partner (lowercase, hyphens) | `acme-rcm` |
| `brand_name` | Display name for the partner | `Acme Healthcare RCM` |
| `environment` | Deployment environment | `prod` |
| `domain_name` | Custom domain (optional) | `rcm.acme.com` |
| `support_email` | Support contact email | `support@acme.com` |
| `primary_color` | Brand color (hex) | `#FF5722` |
| `db_password` | Strong database password | Generated |
| `jwt_secret` | JWT signing secret | Generated |

Generate secure passwords:
```bash
# Database password
openssl rand -base64 32

# JWT secret
openssl rand -base64 32
```

### Step 2: Initialize and Plan

```bash
# Initialize Terraform
terraform init

# Review the planned changes
terraform plan
```

### Step 3: Deploy Infrastructure

```bash
# Apply the configuration
terraform apply

# Save the outputs
terraform output > partner-outputs.txt
```

### Step 4: Deploy Application

```bash
# Set environment variables
export PROJECT_PREFIX=acme-rcm
export ENVIRONMENT=prod

# Run deployment script
./deploy.sh
```

Or deploy manually:

```bash
# Build Docker image
docker build -t acme-rcm-prod-api -f docker/Dockerfile.api .

# Tag and push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
docker tag acme-rcm-prod-api:latest $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/acme-rcm-prod-api:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/acme-rcm-prod-api:latest

# Update ECS service
aws ecs update-service --cluster acme-rcm-prod-cluster --service acme-rcm-prod-api --force-new-deployment
```

### Step 5: Configure DNS (Optional)

If using a custom domain:

1. Get the ACM certificate validation records from Terraform output
2. Add CNAME records to your DNS provider
3. Wait for certificate validation (up to 30 minutes)
4. Add CNAME record pointing your domain to the ALB DNS name

## Required AWS Permissions

The IAM user/role running Terraform needs these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:*",
        "ecs:*",
        "ecr:*",
        "rds:*",
        "secretsmanager:*",
        "kms:*",
        "iam:*",
        "elasticloadbalancing:*",
        "acm:*",
        "s3:*",
        "logs:*",
        "apprunner:*"
      ],
      "Resource": "*"
    }
  ]
}
```

For production, use more restrictive permissions scoped to the partner's resources.

## Cost Estimates

### Development Environment

| Service | Monthly Cost |
|---------|--------------|
| App Runner (1 vCPU, 2GB) | $25-50 |
| RDS db.t3.micro | $15 |
| Secrets Manager | $2 |
| Data Transfer | $5-10 |
| **Total** | **$50-75** |

### Production Environment

| Service | Monthly Cost |
|---------|--------------|
| ECS Fargate (2 tasks) | $75-100 |
| RDS db.t3.medium (Multi-AZ) | $120 |
| NAT Gateway | $35 |
| ALB | $25 |
| Secrets Manager | $2 |
| KMS | $1 |
| S3 (logs) | $5 |
| CloudWatch | $10 |
| Data Transfer | $20-50 |
| **Total** | **$300-400** |

### High-Availability Production

| Service | Monthly Cost |
|---------|--------------|
| ECS Fargate (4 tasks) | $150-200 |
| RDS db.t3.large (Multi-AZ) | $240 |
| NAT Gateway (2 AZs) | $70 |
| ALB | $25 |
| Secrets Manager | $2 |
| KMS | $1 |
| S3 (logs) | $10 |
| CloudWatch | $20 |
| Data Transfer | $50-100 |
| **Total** | **$600-700** |

## Scaling Considerations

### Vertical Scaling

Adjust instance sizes in `terraform.tfvars`:

```hcl
# Database
db_instance_class = "db.t3.large"  # or db.r6g.large for memory-intensive

# ECS Tasks
ecs_cpu    = 1024  # 1 vCPU
ecs_memory = 2048  # 2 GB
```

### Horizontal Scaling

Increase the number of ECS tasks:

```hcl
ecs_desired_count = 4  # 4 tasks for higher throughput
```

### Auto Scaling (Advanced)

Add auto-scaling to `main.tf`:

```hcl
resource "aws_appautoscaling_target" "ecs" {
  max_capacity       = 10
  min_capacity       = 2
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.api.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "cpu" {
  name               = "${local.name_prefix}-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 70.0
  }
}
```

### Database Read Replicas

For read-heavy workloads, add read replicas:

```hcl
resource "aws_db_instance" "replica" {
  identifier             = "${local.name_prefix}-db-replica"
  replicate_source_db    = aws_db_instance.main.identifier
  instance_class         = var.db_instance_class
  publicly_accessible    = false
  vpc_security_group_ids = [aws_security_group.db.id]
}
```

## HIPAA Compliance Checklist

This infrastructure includes these HIPAA requirements:

- [x] **Encryption at Rest**: RDS, S3, EBS, and CloudWatch Logs encrypted with KMS
- [x] **Encryption in Transit**: TLS 1.3 for all communications
- [x] **Access Logging**: ALB access logs, CloudTrail, CloudWatch Logs
- [x] **Multi-AZ**: Database and ECS tasks across availability zones
- [x] **Private Subnets**: Database and application in private subnets
- [x] **No Public Access**: Database not publicly accessible
- [x] **Backup Retention**: 35-day database backup retention
- [x] **Log Retention**: 7-year log retention (2557 days)
- [x] **Network Isolation**: VPC with security groups
- [x] **Secrets Management**: AWS Secrets Manager for credentials

Additional steps for full compliance:

- [ ] Sign BAA in AWS Artifact
- [ ] Enable AWS CloudTrail
- [ ] Configure AWS Config rules
- [ ] Set up AWS GuardDuty
- [ ] Review and approve security groups
- [ ] Document data flow diagrams
- [ ] Implement incident response procedures

## Troubleshooting

### ECS Service Not Starting

1. Check CloudWatch logs:
   ```bash
   aws logs tail /ecs/$PROJECT_PREFIX-$ENVIRONMENT --follow
   ```

2. Verify secrets are accessible:
   ```bash
   aws secretsmanager get-secret-value --secret-id $PROJECT_PREFIX/database-url
   ```

3. Check security group rules allow traffic

### Database Connection Issues

1. Verify VPC connectivity
2. Check security group allows port 5432
3. Confirm DATABASE_URL format includes `?sslmode=require`

### Certificate Validation Failed

1. Check DNS CNAME records are correct
2. Wait up to 72 hours for DNS propagation
3. Verify domain ownership

### Deployment Script Fails

1. Ensure AWS CLI is configured correctly
2. Verify ECR repository exists
3. Check Docker is running
4. Confirm IAM permissions

## Support

For infrastructure issues:
- Review CloudWatch logs and metrics
- Check AWS Health Dashboard
- Contact AWS Support (if BAA signed)

For application issues:
- Check application logs in CloudWatch
- Review the `/health` endpoint
- Contact the development team
