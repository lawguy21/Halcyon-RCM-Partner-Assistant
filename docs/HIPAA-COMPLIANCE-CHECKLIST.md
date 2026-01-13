# HIPAA Compliance Checklist for Halcyon RCM Partner Assistant

## Business Associate Agreements (BAAs)

### Required BAAs

| Vendor | Service | BAA Status | How to Obtain |
|--------|---------|------------|---------------|
| AWS | Cloud Infrastructure | ⬜ Pending | AWS Console → Artifact → Agreements → AWS BAA |
| Supabase | Database (if using) | ⬜ Pending | Enterprise plan required - contact sales@supabase.io |
| OpenAI | AI Processing | ⬜ N/A | No BAA available - must de-identify PHI before sending |
| Anthropic | AI Processing | ⬜ N/A | No BAA available - must de-identify PHI before sending |
| Google Cloud | AI Processing | ⬜ Pending | Enterprise agreement required |
| Vercel | Frontend Hosting | ⬜ N/A | Keep PHI off frontend - API only |

---

## Step-by-Step: Sign AWS BAA

### Prerequisites
- AWS Account
- IAM user with console access

### Instructions

1. **Log into AWS Console**
   ```
   https://console.aws.amazon.com/
   ```

2. **Navigate to AWS Artifact**
   ```
   Services → AWS Artifact (under Security, Identity, & Compliance)
   ```
   Or direct link:
   ```
   https://console.aws.amazon.com/artifact/
   ```

3. **Access Agreements**
   - Click "Agreements" in the left sidebar
   - Find "AWS Business Associate Addendum"

4. **Review and Accept**
   - Click "Download and review"
   - Read the agreement carefully
   - Check the acceptance box
   - Click "Accept"

5. **Download Copy**
   - Download the executed agreement for your records
   - Store securely with other compliance documents

6. **Verify**
   - The agreement status should show "Active"
   - This covers all HIPAA-eligible AWS services

---

## AWS HIPAA-Eligible Services Reference

After signing the BAA, only use these services for PHI:

### Compute
- ✅ Amazon EC2
- ✅ Amazon ECS (Fargate)
- ✅ AWS Lambda
- ✅ AWS App Runner
- ❌ AWS Lightsail (NOT eligible)

### Database
- ✅ Amazon RDS (PostgreSQL, MySQL, etc.)
- ✅ Amazon Aurora
- ✅ Amazon DynamoDB
- ✅ Amazon DocumentDB
- ❌ Amazon Neptune (NOT eligible)

### Storage
- ✅ Amazon S3 (with encryption)
- ✅ Amazon EBS (encrypted)
- ✅ Amazon EFS (encrypted)

### Networking
- ✅ Amazon VPC
- ✅ Elastic Load Balancing
- ✅ Amazon CloudFront
- ✅ Amazon API Gateway
- ✅ AWS PrivateLink

### Security
- ✅ AWS Secrets Manager
- ✅ AWS KMS
- ✅ AWS CloudTrail
- ✅ Amazon CloudWatch

Full list: https://aws.amazon.com/compliance/hipaa-eligible-services-reference/

---

## AI Services: De-identification Requirement

Since OpenAI, Anthropic, and Google AI don't offer BAAs for standard API access:

### Option 1: De-identify PHI Before Sending

Remove or replace these identifiers before AI processing:

| Identifier | Action |
|------------|--------|
| Names | Remove or replace with [PATIENT] |
| Dates (except year) | Generalize to year only |
| Phone/Fax numbers | Remove |
| Email addresses | Remove |
| SSN | Remove |
| MRN/Account numbers | Remove or hash |
| Health plan IDs | Remove |
| Device identifiers | Remove |
| URLs | Remove |
| IP addresses | Remove |
| Biometric identifiers | Remove |
| Photos | Remove |
| Geographic data smaller than state | Generalize to state |
| Ages over 89 | Replace with "90+" |

### Option 2: Enterprise Agreements

- **OpenAI**: Contact enterprise@openai.com for HIPAA-compliant tier
- **Anthropic**: Contact sales for enterprise agreement
- **Google Cloud**: Vertex AI with BAA through Cloud agreement

### Option 3: Self-Hosted Models

Run open-source LLMs on your own HIPAA-compliant infrastructure:
- Llama 2/3
- Mistral
- Mixtral

---

## Infrastructure Migration Checklist

### Phase 1: Setup AWS Account (Day 1)

- [ ] Create dedicated AWS account for PHI
- [ ] Enable MFA on root account
- [ ] Create IAM admin user with MFA
- [ ] Sign BAA in AWS Artifact
- [ ] Enable CloudTrail (all regions)
- [ ] Enable AWS Config
- [ ] Set up billing alerts

### Phase 2: Deploy Infrastructure (Days 2-3)

- [ ] Install Terraform locally
- [ ] Configure AWS CLI credentials
- [ ] Create terraform.tfvars with secrets
- [ ] Run `terraform init`
- [ ] Run `terraform plan` - review
- [ ] Run `terraform apply`
- [ ] Validate DNS/SSL certificate
- [ ] Test database connectivity

### Phase 3: Deploy Application (Days 4-5)

- [ ] Build Docker image
- [ ] Push to ECR
- [ ] Run database migrations
- [ ] Deploy ECS service
- [ ] Verify health checks
- [ ] Test all API endpoints
- [ ] Configure monitoring alerts

### Phase 4: Update Frontend (Day 6)

- [ ] Update NEXT_PUBLIC_API_URL to new AWS endpoint
- [ ] Redeploy Vercel
- [ ] Test authentication flow
- [ ] Test all user flows
- [ ] Verify no PHI in frontend logs

### Phase 5: Decommission Old Infrastructure (Day 7)

- [ ] Verify all data migrated
- [ ] Update DNS if applicable
- [ ] Delete Railway project
- [ ] Revoke old credentials
- [ ] Document completion

---

## Ongoing Compliance Requirements

### Daily
- [ ] Monitor CloudWatch alerts
- [ ] Review failed login attempts

### Weekly
- [ ] Review audit logs
- [ ] Check for security advisories
- [ ] Verify backups completing

### Monthly
- [ ] Review access permissions
- [ ] Update dependencies (security patches)
- [ ] Review costs and scaling

### Quarterly
- [ ] Security training for team
- [ ] Review and update policies
- [ ] Test backup restoration
- [ ] Penetration testing

### Annually
- [ ] Full risk assessment
- [ ] BAA reviews with vendors
- [ ] Policy documentation updates
- [ ] Disaster recovery drill

---

## Cost Estimation (AWS)

| Service | Monthly Estimate |
|---------|------------------|
| ECS Fargate (2 tasks, t3.medium equivalent) | $70 |
| RDS PostgreSQL (db.t3.medium, Multi-AZ) | $140 |
| NAT Gateway | $45 |
| Application Load Balancer | $25 |
| S3 (logs, 50GB) | $5 |
| CloudWatch Logs | $10 |
| Secrets Manager | $2 |
| KMS | $3 |
| **Total Estimate** | **~$300/month** |

Note: Costs vary by usage. Production workloads may be higher.

---

## Emergency Contacts

| Role | Contact |
|------|---------|
| AWS Support | (Enterprise support recommended for HIPAA) |
| HIPAA Security Officer | [Your security officer] |
| Privacy Officer | [Your privacy officer] |
| Legal Counsel | [Your legal counsel] |

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-12 | Initial | Created document |

---

## Attestation

By implementing the infrastructure and controls described in this document, [Organization Name] attests to maintaining HIPAA compliance for the Halcyon RCM Partner Assistant application.

Signed: _________________________ Date: _____________

Title: _________________________
