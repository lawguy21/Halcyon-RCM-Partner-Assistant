# =============================================================================
# Halcyon RCM Partner Assistant - White-Label Configuration Variables
# =============================================================================
# These variables allow partners to customize their deployment with their own
# branding, domain, and resource naming.
# =============================================================================

variable "project_prefix" {
  description = <<-EOT
    Unique prefix for all AWS resource names (partner identifier).
    This value is used to name ECS clusters, services, task definitions, RDS instances,
    S3 buckets, IAM roles/policies, CloudWatch log groups, and all other resources.
    IMPORTANT: Each partner deployment must have a unique project_prefix to ensure
    complete resource isolation. Use lowercase letters, numbers, and hyphens only.
    Examples: "acme-healthcare", "midwest-rcm", "coastal-billing"
  EOT
  type        = string
  default     = "rcm-partner"

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.project_prefix))
    error_message = "project_prefix must contain only lowercase letters, numbers, and hyphens."
  }

  validation {
    condition     = length(var.project_prefix) >= 3 && length(var.project_prefix) <= 24
    error_message = "project_prefix must be between 3 and 24 characters to ensure valid AWS resource names."
  }
}

variable "brand_name" {
  description = "Brand name for the white-label deployment"
  type        = string
  default     = "RCM Partner"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "prod"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be one of: dev, staging, prod."
  }
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "domain_name" {
  description = "Custom domain for this deployment"
  type        = string
  default     = ""
}

variable "support_email" {
  description = "Support email for this partner"
  type        = string
  default     = ""
}

variable "primary_color" {
  description = "Primary brand color (hex)"
  type        = string
  default     = "#2563eb"

  validation {
    condition     = can(regex("^#[0-9A-Fa-f]{6}$", var.primary_color))
    error_message = "primary_color must be a valid hex color (e.g., #2563eb)."
  }
}

# =============================================================================
# Sensitive Variables (must be provided, no defaults)
# =============================================================================

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT signing secret"
  type        = string
  sensitive   = true
}

# =============================================================================
# Optional Feature Flags
# =============================================================================

variable "enable_multi_az" {
  description = "Enable Multi-AZ deployment for RDS (recommended for production)"
  type        = bool
  default     = true
}

variable "enable_deletion_protection" {
  description = "Enable deletion protection for critical resources"
  type        = bool
  default     = true
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "ecs_cpu" {
  description = "ECS task CPU units (256, 512, 1024, 2048, 4096)"
  type        = number
  default     = 512
}

variable "ecs_memory" {
  description = "ECS task memory in MB"
  type        = number
  default     = 1024
}

variable "ecs_desired_count" {
  description = "Number of ECS tasks to run"
  type        = number
  default     = 2
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days (HIPAA minimum: 2557 = 7 years)"
  type        = number
  default     = 2557
}
