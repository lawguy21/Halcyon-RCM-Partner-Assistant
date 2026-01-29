#!/bin/bash
# =============================================================================
# RCM Partner Assistant - AWS Deployment Script (White-Label)
# =============================================================================
# This script deploys the API to AWS ECS using partner-specific configuration.
#
# Usage:
#   ./deploy.sh                    # Uses defaults from terraform.tfvars
#   ./deploy.sh partner-rcm prod   # Explicit project prefix and environment
#
# Required environment variables (if not using defaults):
#   PROJECT_PREFIX - Partner identifier (e.g., partner-rcm)
#   ENVIRONMENT    - Deployment environment (dev, staging, prod)
# =============================================================================

set -e

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------

# Load from arguments or environment, with fallbacks
PROJECT_PREFIX="${1:-${PROJECT_PREFIX:-rcm-partner}}"
ENVIRONMENT="${2:-${ENVIRONMENT:-prod}}"
AWS_REGION="${AWS_REGION:-us-east-1}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

# Derived values
NAME_PREFIX="${PROJECT_PREFIX}-${ENVIRONMENT}"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REPO="${NAME_PREFIX}-api"
ECS_CLUSTER="${NAME_PREFIX}-cluster"
ECS_SERVICE="${NAME_PREFIX}-api"

# -----------------------------------------------------------------------------
# Display Configuration
# -----------------------------------------------------------------------------

echo "======================================"
echo "RCM Partner Assistant - AWS Deployment"
echo "======================================"
echo "Project Prefix: $PROJECT_PREFIX"
echo "Environment:    $ENVIRONMENT"
echo "Name Prefix:    $NAME_PREFIX"
echo "Region:         $AWS_REGION"
echo "Account:        $AWS_ACCOUNT_ID"
echo "Image Tag:      $IMAGE_TAG"
echo "ECR Repo:       $ECR_REPO"
echo "ECS Cluster:    $ECS_CLUSTER"
echo "ECS Service:    $ECS_SERVICE"
echo "======================================"

# -----------------------------------------------------------------------------
# Confirmation (for production)
# -----------------------------------------------------------------------------

if [ "$ENVIRONMENT" = "prod" ]; then
    echo ""
    echo "WARNING: You are deploying to PRODUCTION!"
    read -p "Are you sure you want to continue? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled."
        exit 1
    fi
fi

# -----------------------------------------------------------------------------
# Step 1: Login to ECR
# -----------------------------------------------------------------------------

echo ""
echo "[1/5] Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION | \
    docker login --username AWS --password-stdin \
    $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# -----------------------------------------------------------------------------
# Step 2: Build Docker image
# -----------------------------------------------------------------------------

echo ""
echo "[2/5] Building Docker image..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

docker build \
    -t $ECR_REPO:$IMAGE_TAG \
    -f "$PROJECT_ROOT/docker/Dockerfile.api" \
    --build-arg NODE_ENV=$ENVIRONMENT \
    "$PROJECT_ROOT"

# -----------------------------------------------------------------------------
# Step 3: Tag for ECR
# -----------------------------------------------------------------------------

echo ""
echo "[3/5] Tagging image..."
docker tag $ECR_REPO:$IMAGE_TAG \
    $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO:$IMAGE_TAG

# Also tag with commit SHA if available
if command -v git &> /dev/null; then
    COMMIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    docker tag $ECR_REPO:$IMAGE_TAG \
        $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO:$COMMIT_SHA
    echo "Also tagged with commit: $COMMIT_SHA"
fi

# -----------------------------------------------------------------------------
# Step 4: Push to ECR
# -----------------------------------------------------------------------------

echo ""
echo "[4/5] Pushing to ECR..."
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO:$IMAGE_TAG

if [ -n "$COMMIT_SHA" ] && [ "$COMMIT_SHA" != "unknown" ]; then
    docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO:$COMMIT_SHA
fi

# -----------------------------------------------------------------------------
# Step 5: Update ECS service
# -----------------------------------------------------------------------------

echo ""
echo "[5/5] Updating ECS service..."
aws ecs update-service \
    --cluster $ECS_CLUSTER \
    --service $ECS_SERVICE \
    --force-new-deployment \
    --region $AWS_REGION

# -----------------------------------------------------------------------------
# Completion
# -----------------------------------------------------------------------------

echo ""
echo "======================================"
echo "Deployment initiated successfully!"
echo "======================================"
echo ""
echo "Monitor deployment at:"
echo "  https://$AWS_REGION.console.aws.amazon.com/ecs/home?region=$AWS_REGION#/clusters/$ECS_CLUSTER/services/$ECS_SERVICE"
echo ""
echo "View logs at:"
echo "  https://$AWS_REGION.console.aws.amazon.com/cloudwatch/home?region=$AWS_REGION#logsV2:log-groups/log-group/\$252Fecs\$252F$NAME_PREFIX"
echo ""
echo "======================================"
