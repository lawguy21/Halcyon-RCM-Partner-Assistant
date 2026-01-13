#!/bin/bash
# =============================================================================
# Halcyon RCM - AWS Deployment Script
# =============================================================================

set -e

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REPO="halcyon-rcm-api"
IMAGE_TAG="${IMAGE_TAG:-latest}"

echo "======================================"
echo "Halcyon RCM AWS Deployment"
echo "======================================"
echo "Region: $AWS_REGION"
echo "Account: $AWS_ACCOUNT_ID"
echo "Image Tag: $IMAGE_TAG"
echo "======================================"

# Step 1: Login to ECR
echo "Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Step 2: Build Docker image
echo "Building Docker image..."
docker build -t $ECR_REPO:$IMAGE_TAG -f packages/api/Dockerfile .

# Step 3: Tag for ECR
echo "Tagging image..."
docker tag $ECR_REPO:$IMAGE_TAG $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO:$IMAGE_TAG

# Step 4: Push to ECR
echo "Pushing to ECR..."
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO:$IMAGE_TAG

# Step 5: Update ECS service
echo "Updating ECS service..."
aws ecs update-service \
  --cluster halcyon-rcm-cluster \
  --service halcyon-rcm-api \
  --force-new-deployment \
  --region $AWS_REGION

echo "======================================"
echo "Deployment initiated!"
echo "Monitor at: https://$AWS_REGION.console.aws.amazon.com/ecs/home?region=$AWS_REGION#/clusters/halcyon-rcm-cluster/services/halcyon-rcm-api"
echo "======================================"
