# =============================================================================
# Halcyon RCM Partner Assistant - HIPAA-Compliant AWS Infrastructure
# =============================================================================
# White-Label Deployment Configuration
#
# This Terraform configuration supports multi-tenant partner deployments with
# customizable branding and isolated resources per partner.
#
# Prerequisites:
# 1. AWS CLI configured with credentials
# 2. Terraform installed
# 3. BAA signed in AWS Artifact
#
# Usage:
#   cd infrastructure/aws
#   cp terraform.tfvars.example terraform.tfvars
#   # Edit terraform.tfvars with partner-specific values
#   terraform init
#   terraform plan
#   terraform apply
# =============================================================================

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }

  # Store state in S3 with encryption (recommended for HIPAA)
  # Uncomment and customize for your deployment
  # backend "s3" {
  #   bucket         = "${var.project_prefix}-terraform-state"
  #   key            = "${var.environment}/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "${var.project_prefix}-terraform-locks"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = local.common_tags
  }
}

# =============================================================================
# Locals - Resource Naming and Tagging
# =============================================================================

locals {
  name_prefix = "${var.project_prefix}-${var.environment}"

  common_tags = {
    Project     = var.project_prefix
    Environment = var.environment
    BrandName   = var.brand_name
    HIPAA       = "true"
    ManagedBy   = "terraform"
  }
}

data "aws_caller_identity" "current" {}

# =============================================================================
# VPC - Isolated Network for HIPAA
# =============================================================================

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${local.name_prefix}-vpc"
  }
}

# Public subnets (for load balancer)
resource "aws_subnet" "public_1" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "${var.aws_region}a"
  map_public_ip_on_launch = true

  tags = { Name = "${local.name_prefix}-public-1" }
}

resource "aws_subnet" "public_2" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.2.0/24"
  availability_zone       = "${var.aws_region}b"
  map_public_ip_on_launch = true

  tags = { Name = "${local.name_prefix}-public-2" }
}

# Private subnets (for database and app)
resource "aws_subnet" "private_1" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.10.0/24"
  availability_zone = "${var.aws_region}a"

  tags = { Name = "${local.name_prefix}-private-1" }
}

resource "aws_subnet" "private_2" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.11.0/24"
  availability_zone = "${var.aws_region}b"

  tags = { Name = "${local.name_prefix}-private-2" }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "${local.name_prefix}-igw" }
}

# Route table for public subnets
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = { Name = "${local.name_prefix}-public-rt" }
}

resource "aws_route_table_association" "public_1" {
  subnet_id      = aws_subnet.public_1.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "public_2" {
  subnet_id      = aws_subnet.public_2.id
  route_table_id = aws_route_table.public.id
}

# NAT Gateway for private subnets
resource "aws_eip" "nat" {
  domain = "vpc"
  tags   = { Name = "${local.name_prefix}-nat-eip" }
}

resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public_1.id
  tags          = { Name = "${local.name_prefix}-nat" }
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }

  tags = { Name = "${local.name_prefix}-private-rt" }
}

resource "aws_route_table_association" "private_1" {
  subnet_id      = aws_subnet.private_1.id
  route_table_id = aws_route_table.private.id
}

resource "aws_route_table_association" "private_2" {
  subnet_id      = aws_subnet.private_2.id
  route_table_id = aws_route_table.private.id
}

# =============================================================================
# Security Groups
# =============================================================================

# ALB Security Group
resource "aws_security_group" "alb" {
  name        = "${local.name_prefix}-alb-sg"
  description = "Security group for ALB"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${local.name_prefix}-alb-sg" }
}

# App Security Group
resource "aws_security_group" "app" {
  name        = "${local.name_prefix}-app-sg"
  description = "Security group for application"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 3001
    to_port         = 3001
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
    description     = "From ALB"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${local.name_prefix}-app-sg" }
}

# Database Security Group
resource "aws_security_group" "db" {
  name        = "${local.name_prefix}-db-sg"
  description = "Security group for RDS"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
    description     = "PostgreSQL from app"
  }

  tags = { Name = "${local.name_prefix}-db-sg" }
}

# =============================================================================
# KMS Key for Encryption
# =============================================================================

resource "aws_kms_key" "main" {
  description             = "KMS key for ${var.brand_name} encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = { Name = "${local.name_prefix}-kms" }
}

resource "aws_kms_alias" "main" {
  name          = "alias/${local.name_prefix}-key"
  target_key_id = aws_kms_key.main.key_id
}

# =============================================================================
# RDS PostgreSQL - Encrypted Database
# =============================================================================

resource "aws_db_subnet_group" "main" {
  name       = "${local.name_prefix}-db-subnet"
  subnet_ids = [aws_subnet.private_1.id, aws_subnet.private_2.id]

  tags = { Name = "${local.name_prefix}-db-subnet-group" }
}

resource "aws_db_instance" "main" {
  identifier     = "${local.name_prefix}-db"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = var.db_instance_class

  allocated_storage     = 100
  max_allocated_storage = 500
  storage_type          = "gp3"
  storage_encrypted     = true  # HIPAA REQUIRED
  kms_key_id            = aws_kms_key.main.arn

  db_name  = replace(var.project_prefix, "-", "_")
  username = "${replace(var.project_prefix, "-", "_")}_admin"
  password = var.db_password

  vpc_security_group_ids = [aws_security_group.db.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  multi_az               = var.enable_multi_az  # HIPAA recommended - high availability
  publicly_accessible    = false # HIPAA REQUIRED - no public access

  backup_retention_period = 35   # HIPAA - retain backups
  backup_window          = "03:00-04:00"
  maintenance_window     = "Mon:04:00-Mon:05:00"

  deletion_protection = var.enable_deletion_protection
  skip_final_snapshot = var.environment != "prod"
  final_snapshot_identifier = "${local.name_prefix}-final-snapshot"

  # Enhanced monitoring
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn

  # Performance insights (encrypted)
  performance_insights_enabled    = true
  performance_insights_kms_key_id = aws_kms_key.main.arn

  # Audit logging
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  tags = { Name = "${local.name_prefix}-database" }
}

# RDS Monitoring Role
resource "aws_iam_role" "rds_monitoring" {
  name = "${local.name_prefix}-rds-monitoring"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "monitoring.rds.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# =============================================================================
# Secrets Manager - Store Sensitive Configuration
# =============================================================================

resource "aws_secretsmanager_secret" "db_url" {
  name        = "${var.project_prefix}/database-url"
  description = "Database connection string for ${var.brand_name}"
  kms_key_id  = aws_kms_key.main.arn
}

resource "aws_secretsmanager_secret_version" "db_url" {
  secret_id = aws_secretsmanager_secret.db_url.id
  secret_string = jsonencode({
    url = "postgresql://${aws_db_instance.main.username}:${var.db_password}@${aws_db_instance.main.endpoint}/${aws_db_instance.main.db_name}?sslmode=require"
  })
}

resource "aws_secretsmanager_secret" "jwt" {
  name        = "${var.project_prefix}/jwt-secret"
  description = "JWT signing secret for ${var.brand_name}"
  kms_key_id  = aws_kms_key.main.arn
}

resource "aws_secretsmanager_secret_version" "jwt" {
  secret_id     = aws_secretsmanager_secret.jwt.id
  secret_string = jsonencode({ secret = var.jwt_secret })
}

# Brand configuration secret (for white-label settings)
resource "aws_secretsmanager_secret" "brand_config" {
  name        = "${var.project_prefix}/brand-config"
  description = "Brand configuration for ${var.brand_name}"
  kms_key_id  = aws_kms_key.main.arn
}

resource "aws_secretsmanager_secret_version" "brand_config" {
  secret_id = aws_secretsmanager_secret.brand_config.id
  secret_string = jsonencode({
    brand_name    = var.brand_name
    primary_color = var.primary_color
    support_email = var.support_email
    domain_name   = var.domain_name
  })
}

# =============================================================================
# ECS Fargate - Container Hosting
# =============================================================================

resource "aws_ecs_cluster" "main" {
  name = "${local.name_prefix}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  configuration {
    execute_command_configuration {
      kms_key_id = aws_kms_key.main.arn
      logging    = "OVERRIDE"

      log_configuration {
        cloud_watch_encryption_enabled = true
        cloud_watch_log_group_name     = aws_cloudwatch_log_group.ecs.name
      }
    }
  }
}

resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/${local.name_prefix}"
  retention_in_days = var.log_retention_days  # HIPAA retention requirement
  kms_key_id        = aws_kms_key.main.arn
}

# ECR Repository for API Docker images
resource "aws_ecr_repository" "api" {
  name                 = "${local.name_prefix}-api"
  image_tag_mutability = "MUTABLE"

  encryption_configuration {
    encryption_type = "KMS"
    kms_key         = aws_kms_key.main.arn
  }

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = { Name = "${local.name_prefix}-api" }
}

# ECR Repository for Web Docker images
resource "aws_ecr_repository" "web" {
  name                 = "${local.name_prefix}-web"
  image_tag_mutability = "MUTABLE"

  encryption_configuration {
    encryption_type = "KMS"
    kms_key         = aws_kms_key.main.arn
  }

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = { Name = "${local.name_prefix}-web" }
}

# ECS Task Execution Role
resource "aws_iam_role" "ecs_execution" {
  name = "${local.name_prefix}-ecs-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "ecs_secrets" {
  name = "secrets-access"
  role = aws_iam_role.ecs_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          aws_secretsmanager_secret.db_url.arn,
          aws_secretsmanager_secret.jwt.arn,
          aws_secretsmanager_secret.brand_config.arn
        ]
      },
      {
        Effect = "Allow"
        Action = ["kms:Decrypt"]
        Resource = [aws_kms_key.main.arn]
      }
    ]
  })
}

# ECS Task Definition
resource "aws_ecs_task_definition" "api" {
  family                   = "${local.name_prefix}-api"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.ecs_cpu
  memory                   = var.ecs_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn

  container_definitions = jsonencode([{
    name  = "api"
    image = "${aws_ecr_repository.api.repository_url}:latest"

    portMappings = [{
      containerPort = 3001
      hostPort      = 3001
      protocol      = "tcp"
    }]

    environment = [
      { name = "NODE_ENV", value = var.environment == "prod" ? "production" : var.environment },
      { name = "PORT", value = "3001" },
      { name = "BRAND_NAME", value = var.brand_name },
      { name = "PRIMARY_COLOR", value = var.primary_color },
      { name = "SUPPORT_EMAIL", value = var.support_email }
    ]

    secrets = [
      {
        name      = "DATABASE_URL"
        valueFrom = "${aws_secretsmanager_secret.db_url.arn}:url::"
      },
      {
        name      = "JWT_SECRET"
        valueFrom = "${aws_secretsmanager_secret.jwt.arn}:secret::"
      }
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "api"
      }
    }

    healthCheck = {
      command     = ["CMD-SHELL", "curl -f http://localhost:3001/health || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 60
    }
  }])
}

# ECS Service
resource "aws_ecs_service" "api" {
  name            = "${local.name_prefix}-api"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = var.ecs_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [aws_subnet.private_1.id, aws_subnet.private_2.id]
    security_groups  = [aws_security_group.app.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 3001
  }

  depends_on = [aws_lb_listener.https]
}

# =============================================================================
# App Runner Service (Alternative to ECS for simpler deployments)
# =============================================================================

resource "aws_apprunner_service" "api" {
  count        = var.environment == "dev" ? 1 : 0  # Only for dev environments
  service_name = "${local.name_prefix}-api-runner"

  source_configuration {
    auto_deployments_enabled = false

    image_repository {
      image_identifier      = "${aws_ecr_repository.api.repository_url}:latest"
      image_repository_type = "ECR"

      image_configuration {
        port = "3001"
        runtime_environment_variables = {
          NODE_ENV      = var.environment
          BRAND_NAME    = var.brand_name
          PRIMARY_COLOR = var.primary_color
          SUPPORT_EMAIL = var.support_email
        }
      }
    }

    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_ecr[0].arn
    }
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-api-runner"
  })
}

# App Runner ECR Access Role
resource "aws_iam_role" "apprunner_ecr" {
  count = var.environment == "dev" ? 1 : 0
  name  = "${local.name_prefix}-apprunner-ecr"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "build.apprunner.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "apprunner_ecr" {
  count      = var.environment == "dev" ? 1 : 0
  role       = aws_iam_role.apprunner_ecr[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess"
}

# =============================================================================
# Application Load Balancer
# =============================================================================

resource "aws_lb" "main" {
  name               = "${local.name_prefix}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = [aws_subnet.public_1.id, aws_subnet.public_2.id]

  enable_deletion_protection = var.enable_deletion_protection

  access_logs {
    bucket  = aws_s3_bucket.logs.id
    prefix  = "alb"
    enabled = true
  }

  tags = { Name = "${local.name_prefix}-alb" }
}

resource "aws_lb_target_group" "api" {
  name        = "${local.name_prefix}-api-tg"
  port        = 3001
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 2
  }
}

# ACM Certificate
resource "aws_acm_certificate" "main" {
  domain_name       = var.domain_name != "" ? "api.${var.domain_name}" : "api.${var.project_prefix}.example.com"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = { Name = "${local.name_prefix}-cert" }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"  # Strong TLS
  certificate_arn   = aws_acm_certificate.main.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }
}

# =============================================================================
# S3 Bucket for Logs (Encrypted, Versioned)
# =============================================================================

resource "aws_s3_bucket" "logs" {
  bucket = "${local.name_prefix}-logs-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_versioning" "logs" {
  bucket = aws_s3_bucket.logs.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.main.arn
      sse_algorithm     = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "logs" {
  bucket = aws_s3_bucket.logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id

  rule {
    id     = "retain-7-years"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 365
      storage_class = "GLACIER"
    }

    expiration {
      days = 2557  # 7 years - HIPAA minimum
    }
  }
}

# ALB logging policy
resource "aws_s3_bucket_policy" "logs" {
  bucket = aws_s3_bucket.logs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::127311923021:root"  # ELB account for us-east-1
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.logs.arn}/alb/*"
      }
    ]
  })
}

# =============================================================================
# Outputs
# =============================================================================

output "api_endpoint" {
  value       = "https://${aws_lb.main.dns_name}"
  description = "API endpoint URL"
}

output "api_url" {
  value       = aws_lb.main.dns_name
  description = "API load balancer DNS name"
}

output "database_endpoint" {
  value       = aws_db_instance.main.endpoint
  description = "Database endpoint (private)"
  sensitive   = true
}

output "ecr_api_url" {
  value       = aws_ecr_repository.api.repository_url
  description = "ECR repository URL for API Docker images"
}

output "ecr_web_url" {
  value       = aws_ecr_repository.web.repository_url
  description = "ECR repository URL for Web Docker images"
}

output "apprunner_url" {
  value       = var.environment == "dev" ? aws_apprunner_service.api[0].service_url : null
  description = "App Runner service URL (dev environment only)"
}

output "vpc_id" {
  value       = aws_vpc.main.id
  description = "VPC ID"
}

output "cluster_name" {
  value       = aws_ecs_cluster.main.name
  description = "ECS cluster name"
}

output "service_name" {
  value       = aws_ecs_service.api.name
  description = "ECS service name"
}

output "log_group" {
  value       = aws_cloudwatch_log_group.ecs.name
  description = "CloudWatch log group name"
}

output "deployment_info" {
  value = {
    project_prefix = var.project_prefix
    brand_name     = var.brand_name
    environment    = var.environment
    region         = var.aws_region
  }
  description = "Deployment configuration summary"
}
