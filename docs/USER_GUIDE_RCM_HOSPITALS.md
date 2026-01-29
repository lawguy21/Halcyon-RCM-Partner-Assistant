# Halcyon RCM Partner Assistant
## Complete User Guide for Revenue Cycle Management

**Version 1.0**
**For RCM Organizations & Healthcare Facilities**

---

# Table of Contents

1. [Introduction](#1-introduction)
2. [Getting Started](#2-getting-started)
3. [Dashboard Overview](#3-dashboard-overview)
4. [Patient Assessments](#4-patient-assessments)
5. [Eligibility Screening](#5-eligibility-screening)
6. [Data Import & Batch Processing](#6-data-import--batch-processing)
7. [Work Queue Management](#7-work-queue-management)
8. [Denial Management & Appeals](#8-denial-management--appeals)
9. [Price Transparency & Estimates](#9-price-transparency--estimates)
10. [Reports & Analytics](#10-reports--analytics)
11. [Settings & Configuration](#11-settings--configuration)
12. [Best Practices](#12-best-practices)
13. [Troubleshooting](#13-troubleshooting)
14. [Glossary](#14-glossary)

---

# 1. Introduction

## 1.1 About Halcyon RCM Partner Assistant

The Halcyon RCM Partner Assistant is a comprehensive revenue cycle management platform designed to help healthcare organizations maximize patient account recovery. The system analyzes patient financial data to identify optimal recovery pathways including Medicaid, Medicare, Disproportionate Share Hospital (DSH) programs, and state-specific assistance programs.

## 1.2 Key Benefits

- **Maximize Recovery**: Identify the best recovery pathway for each patient account
- **Reduce Denials**: Proactive denial prevention and appeal management
- **Streamline Operations**: Automated work queues and prioritization
- **Improve Efficiency**: Batch processing for high-volume accounts
- **Ensure Compliance**: Built-in eligibility verification and documentation tracking
- **Gain Visibility**: Real-time analytics and performance dashboards

## 1.3 Who Should Use This Guide

This guide is designed for:

- **RCM Specialists** who process patient accounts daily
- **Eligibility Coordinators** who verify insurance coverage
- **Denial Management Teams** who handle appeals
- **Hospital Administrators** who oversee revenue cycle operations
- **Financial Counselors** who assist patients with coverage options

---

# 2. Getting Started

## 2.1 Logging In

1. Navigate to your organization's Halcyon portal URL
2. Enter your email address and password
3. Click **Sign In**
4. Complete two-factor authentication if enabled

## 2.2 First-Time Setup

Upon first login, you may need to complete initial setup:

1. **Profile Configuration**: Update your name and contact information
2. **Notification Preferences**: Choose email and in-app alert settings
3. **Default Settings**: Set your preferred date format and export options

## 2.3 Navigation Overview

The main navigation menu provides access to all features:

| Menu Item | Description |
|-----------|-------------|
| Dashboard | Overview of key metrics and recent activity |
| Assessments | Patient account analysis and recovery pathways |
| Eligibility | Medicaid/Medicare screening tools |
| Import | Single file data import with mapping |
| Batch Import | High-volume data processing |
| Work Queue | Task management and prioritization |
| Denials | Appeal management and analytics |
| Price Estimate | Patient cost transparency tool |
| Reports | Analytics and performance dashboards |
| Settings | System configuration and preferences |

---

# 3. Dashboard Overview

## 3.1 Summary Statistics

The dashboard displays four key performance indicators:

### Total Assessments
The total number of patient accounts analyzed in the system. This includes all assessments regardless of status or outcome.

### Total Charges
The aggregate dollar amount of charges under assessment. This represents the potential revenue being analyzed for recovery opportunities.

### Estimated Recovery
The projected total recovery amount based on identified pathways. This figure updates as assessments are completed and pathways are confirmed.

### Recovery Rate
The percentage of charges expected to be recovered. A higher rate indicates more successful pathway identification and execution.

## 3.2 Recovery by Pathway

A visual breakdown showing recovery distribution across:

- **Medicaid**: State-funded healthcare coverage
- **Medicare**: Federal healthcare for seniors and disabled
- **DSH (Disproportionate Share Hospital)**: Federal supplemental payments
- **State Programs**: State-specific assistance programs

## 3.3 Recent Assessments

A quick-view table showing the six most recent assessments with:
- Patient identifier
- Total charges
- Recommended pathway
- Confidence level
- Assessment date

## 3.4 Quick Actions

Shortcuts to common tasks:
- **New Assessment**: Create a manual assessment
- **Import CSV**: Upload patient data
- **View Reports**: Access analytics

---

# 4. Patient Assessments

## 4.1 Understanding Assessments

An assessment is a comprehensive analysis of a patient account to determine:
- Eligibility for coverage programs
- Optimal recovery pathway
- Required documentation
- Estimated recovery amount
- Confidence level of recommendations

## 4.2 Creating a New Assessment

### Step 1: Navigate to New Assessment
Click **Assessments** > **New Assessment** from the navigation menu.

### Step 2: Enter Patient Information
Complete the required fields:

| Field | Description | Required |
|-------|-------------|----------|
| Patient Name | Full legal name | Yes |
| Date of Birth | MM/DD/YYYY format | Yes |
| SSN (Last 4) | Last four digits only | No |
| Address | Street, City, State, ZIP | Yes |
| Phone | Primary contact number | No |
| Email | Contact email address | No |

### Step 3: Enter Financial Information
Provide household and income details:

| Field | Description |
|-------|-------------|
| Household Size | Number of persons in household |
| Annual Income | Gross annual household income |
| Employment Status | Employed, Unemployed, Retired, Disabled |
| Assets | Total household assets (if required by state) |

### Step 4: Enter Insurance Information
Document current or prior coverage:

| Field | Description |
|-------|-------------|
| Insurance Status | Insured, Uninsured, Underinsured |
| Carrier Name | Insurance company name |
| Policy Number | Insurance policy ID |
| Coverage Type | Commercial, Medicaid, Medicare, Self-Pay |

### Step 5: Enter Account Information
Add the charges to be analyzed:

| Field | Description |
|-------|-------------|
| Date of Service | When services were provided |
| Total Charges | Gross charges for the encounter |
| Facility | Location where services were rendered |
| Account Number | Internal patient account number |

### Step 6: Submit Assessment
Click **Analyze** to process the assessment. The system will:
1. Verify patient demographics
2. Calculate income-based eligibility
3. Identify applicable programs
4. Recommend optimal pathways
5. Generate confidence scores

## 4.3 Viewing Assessment Results

### Recovery Pathways
Each assessment displays recommended pathways ranked by likelihood of success:

**Pathway Card Information:**
- **Program Name**: Medicaid, Medicare, DSH, or State Program
- **Estimated Recovery**: Dollar amount expected
- **Confidence Level**: High (80%+), Medium (50-79%), Low (<50%)
- **Reasoning**: Explanation of the recommendation
- **Requirements**: Documentation needed to pursue

### Confidence Scoring
Confidence levels are calculated based on:
- Data completeness
- Eligibility criteria match
- Historical success rates
- Documentation availability

### Required Actions
Actions are categorized by urgency:

| Category | Timeframe | Examples |
|----------|-----------|----------|
| Immediate | Within 24 hours | Missing critical documents |
| Priority | Within 1 week | Eligibility verification needed |
| Follow-up | Within 30 days | Appeal deadline approaching |

## 4.4 Exporting Assessments

### Individual Export
From any assessment detail page:
1. Click the **Export** button
2. Choose format: CSV, PDF, or Excel
3. Select data fields to include
4. Click **Download**

### Bulk Export
From the assessments list:
1. Select assessments using checkboxes
2. Click **Export Selected**
3. Choose export format and options
4. Click **Download**

---

# 5. Eligibility Screening

## 5.1 Overview

The Eligibility Screening tool performs comprehensive analysis of patient eligibility for:
- **Medicaid** (state-specific rules for all 50 states)
- **Medicare** (age, disability, and condition-based)
- **Dual Eligibility** (combined Medicare/Medicaid)
- **Presumptive Eligibility** (temporary coverage)
- **Retroactive Coverage** (backdated eligibility)

## 5.2 Performing an Eligibility Screen

### Step 1: Access the Screening Tool
Navigate to **Eligibility** from the main menu.

### Step 2: Enter Demographics
| Field | Description |
|-------|-------------|
| Date of Birth | Patient's birthdate |
| State of Residence | Current state (determines rules) |
| Citizenship Status | US Citizen, Permanent Resident, etc. |
| Residency Duration | How long in current state |

### Step 3: Enter Household Information
| Field | Description |
|-------|-------------|
| Household Size | Total persons in household |
| Gross Monthly Income | Before-tax monthly earnings |
| Employment Status | Current employment situation |
| Employer Coverage | Whether employer offers insurance |

### Step 4: Enter Special Conditions
Check applicable conditions:
- [ ] Pregnant
- [ ] Disability (SSDI recipient)
- [ ] End-Stage Renal Disease (ESRD)
- [ ] Amyotrophic Lateral Sclerosis (ALS)
- [ ] Blind
- [ ] Age 65 or older

### Step 5: Review Results

**Medicaid Eligibility Results:**
- MAGI calculation and Federal Poverty Level percentage
- Medicaid expansion eligibility (if state expanded)
- Traditional Medicaid categories
- Spend-down requirements (if applicable)

**Medicare Eligibility Results:**
- Age-based eligibility (65+)
- Disability-based eligibility (SSDI 24+ months)
- Condition-based eligibility (ESRD, ALS)
- Part A, B, C, D coverage details

**Dual-Eligible Analysis:**
- Qualified Medicare Beneficiary (QMB)
- Specified Low-Income Medicare Beneficiary (SLMB)
- Qualifying Individual (QI)
- Full Dual Eligible status

## 5.3 State-Specific Rules

The system automatically applies state-specific:
- Income thresholds (FPL percentages)
- Asset limits
- Covered populations
- Application procedures
- Retroactive coverage windows

**Medicaid Expansion States:**
Income up to 138% FPL qualifies for adult Medicaid coverage.

**Non-Expansion States:**
Traditional categorical eligibility applies (pregnant, disabled, children, elderly).

## 5.4 Next Steps and Documentation

After screening, the system provides:
- Required application forms
- Supporting documentation checklist
- Application submission instructions
- Estimated processing timeframes
- Appeals process (if denied)

---

# 6. Data Import & Batch Processing

## 6.1 Single File Import

### Overview
Import patient data from CSV files with intelligent column mapping.

### Step 1: Prepare Your File
Ensure your CSV file:
- Has headers in the first row
- Uses UTF-8 encoding
- Contains no merged cells
- Has consistent data formatting

### Step 2: Upload File
1. Navigate to **Import**
2. Click **Upload CSV** or drag and drop
3. File preview displays first 3 rows

### Step 3: Select Mapping Preset (Optional)
Choose a preset for common RCM systems:
- Availity
- Change Healthcare
- Waystar
- Optum
- Custom presets

### Step 4: Map Columns
For each required field, select the matching column from your file:

| System Field | Your Column |
|--------------|-------------|
| Patient Name | [Select...] |
| Date of Birth | [Select...] |
| Account Number | [Select...] |
| Date of Service | [Select...] |
| Total Charges | [Select...] |
| Insurance | [Select...] |

### Step 5: Configure Options
- **Skip duplicate accounts**: Prevent re-importing existing records
- **Continue on errors**: Process valid rows even if some fail
- **Date format**: Match your file's date formatting

### Step 6: Execute Import
Click **Import** to begin processing. Monitor progress:
- Records processed
- Records skipped
- Errors encountered

### Step 7: Review Results
Download the import report showing:
- Successfully imported records
- Skipped duplicates
- Error details with row numbers

## 6.2 Batch Import (High Volume)

### Overview
Process large files (100,000+ records) with optimized performance.

### When to Use Batch Import
- Files larger than 10MB
- More than 10,000 records
- Overnight processing preferred
- Minimal manual oversight needed

### Step 1: Prepare Large File
Batch import supports:
- File size up to 100MB
- 100,000+ rows
- Processing speed: 100-500 rows/second

### Step 2: Upload and Configure
1. Navigate to **Batch Import**
2. Upload your file
3. Select or create mapping preset
4. Enable/disable options:
   - Continue on errors
   - Duplicate detection
   - Email notification on completion

### Step 3: Start Background Processing
Click **Start Batch Import** to queue the job. You can:
- Close the browser
- Work on other tasks
- Receive email when complete

### Step 4: Monitor Progress
Return to Batch Import to view:
- Percentage complete
- Estimated time remaining
- Rows processed/remaining
- Current error count

### Step 5: Download Results
When complete, download:
- Success report (imported records)
- Error report (failed records with reasons)
- Duplicate report (skipped records)

## 6.3 Creating Custom Presets

### Why Use Presets
- Eliminate manual mapping each import
- Ensure consistency across users
- Save time on recurring imports

### Creating a Preset
1. Navigate to **Settings** > **Mapping Presets**
2. Click **Create New Preset**
3. Enter preset details:
   - Name (e.g., "Epic Export Format")
   - Vendor (optional)
   - Description
   - Date format
   - Delimiter (comma, tab, pipe)
4. Define column mappings
5. Save preset

### Sharing Presets
Presets can be:
- **Personal**: Only you can use
- **Organization**: All users in your org
- **System**: Built-in, read-only

---

# 7. Work Queue Management

## 7.1 Overview

The Work Queue organizes patient accounts into actionable task lists, ensuring:
- Nothing falls through the cracks
- High-priority items are addressed first
- Team workload is balanced
- Deadlines are tracked

## 7.2 Queue Types

### New Accounts
Freshly imported or created assessments requiring initial review.

### Pending Eligibility
Accounts awaiting eligibility determination or verification.

### Denials
Claims denied by payers requiring review or appeal.

### Appeals
Active appeals at various stages of the process.

### Callbacks
Accounts requiring follow-up communication.

### Compliance
Items flagged for compliance review or documentation.

## 7.3 Working with the Queue

### Viewing Queue Items
1. Navigate to **Work Queue**
2. Select queue type using tabs
3. Items display with:
   - Patient/Account identifier
   - Priority level
   - Due date
   - Assigned user
   - Status

### Claiming an Item
1. Click **Claim** on an unclaimed item
2. Item moves to your assigned list
3. Status changes to "In Progress"

### Completing an Item
1. Open the item details
2. Perform required actions
3. Add notes if needed
4. Click **Mark Complete**

### Releasing an Item
If you cannot complete an item:
1. Click **Release**
2. Item returns to queue
3. Add reason for release

## 7.4 Priority Levels

| Priority | Description | Example |
|----------|-------------|---------|
| Critical | Immediate attention required | Filing deadline today |
| High | Complete within 24 hours | Appeal deadline this week |
| Medium | Complete within 1 week | Standard processing |
| Low | Complete within 30 days | Non-urgent follow-up |
| Lowest | No deadline | Optional review |

## 7.5 Queue Statistics

Monitor team performance:
- **Pending**: Items awaiting work
- **In Progress**: Currently being worked
- **Overdue**: Past due date
- **Completed Today**: Finished items
- **Average Time**: Mean completion time

---

# 8. Denial Management & Appeals

## 8.1 Understanding Denials

When a claim is denied, the system captures:
- Denial reason code (CARC/RARC)
- Denied amount
- Denial date
- Payer information
- Timely filing deadline

## 8.2 Denial Analytics Dashboard

### Key Metrics
- **Total Denials**: Count of denied claims
- **Denied Amount**: Dollar value at risk
- **Appeal Success Rate**: Historical win percentage
- **Preventable Denials**: Avoidable denial count

### Top Denial Codes
Identifies your most common denial reasons:
- Code and description
- Frequency count
- Total dollar impact
- Prevention recommendations

### Appealable Amount
Shows total recoverable funds through successful appeals.

## 8.3 CARC Code Reference

Search the Claim Adjustment Reason Code database:
1. Navigate to **Denials** > **CARC Lookup**
2. Enter code number or keyword
3. View:
   - Code definition
   - Common causes
   - Resolution steps
   - Appeal likelihood

## 8.4 Analyzing a Denial

### AI-Powered Analysis
For each denial, the system provides:

**Appeal Recommendation:**
- Should you appeal? (Yes/No/Maybe)
- Confidence percentage
- Expected recovery if successful
- Success factors

**Required Documentation:**
- Missing information identified
- Supporting documents needed
- Medical records requirements
- Authorization documentation

**Timeline:**
- Denial received date
- Appeal deadline
- Days remaining
- Recommended action date

## 8.5 Creating an Appeal

### Step 1: Select Denial
From Denial Management, click **Create Appeal** on the denial.

### Step 2: Choose Appeal Level
- **Initial Appeal**: First-level reconsideration
- **Second Appeal**: After initial denial upheld
- **External Review**: Independent review organization

### Step 3: Enter Appeal Details
| Field | Description |
|-------|-------------|
| Appeal Reason | Why denial should be overturned |
| Supporting Evidence | Documentation being submitted |
| Requested Action | Specific outcome sought |
| Expedited? | Emergency/urgent request |

### Step 4: Attach Documentation
Upload supporting files:
- Medical records
- Prior authorizations
- Clinical notes
- Supporting letters

### Step 5: Submit Appeal
Click **Submit** to:
- Generate appeal letter
- Track submission date
- Set follow-up reminders
- Monitor deadline

## 8.6 Tracking Appeals

Monitor all active appeals:
- Current status
- Days since submission
- Expected response date
- Required follow-up actions

---

# 9. Price Transparency & Estimates

## 9.1 Overview

The Price Estimate tool helps patients understand their expected costs before or after service, supporting:
- Price transparency compliance
- Patient financial counseling
- Payment plan discussions
- Self-pay pricing

## 9.2 Creating a Price Estimate

### Step 1: Search Services
1. Navigate to **Price Estimate**
2. Search by:
   - CPT code
   - Service description
   - Shoppable service category

### Step 2: Select Services
Add services to the estimate:
- Click **Add** for each service
- Adjust quantities if needed
- View gross charges

### Step 3: Enter Insurance Details
For insured patients:

| Field | Description |
|-------|-------------|
| Insurance Carrier | Payer name |
| Plan Type | PPO, HMO, EPO, etc. |
| In-Network? | Network status |
| Deductible | Annual deductible amount |
| Deductible Met | Amount already paid |
| Out-of-Pocket Max | Maximum patient pays |
| OOP Met | Amount toward max |
| Coinsurance | Percentage patient pays |
| Copay | Flat fee per visit |

### Step 4: Generate Estimate

**Cost Breakdown:**
| Line Item | Amount |
|-----------|--------|
| Gross Charges | $X,XXX.XX |
| Insurance Adjustment | -$XXX.XX |
| Insurance Payment | -$X,XXX.XX |
| **Patient Responsibility** | **$XXX.XX** |

**Patient Responsibility Detail:**
- Deductible: $XXX.XX
- Coinsurance: $XXX.XX
- Copay: $XX.XX
- **Total Due**: $XXX.XX

### Step 5: Export Estimate
- **Print**: Paper copy for patient
- **PDF**: Digital document
- **Email**: Send to patient directly

## 9.3 Confidence Levels

Estimates display confidence indicators:

| Level | Meaning |
|-------|---------|
| High | Complete information, reliable estimate |
| Medium | Some assumptions made |
| Low | Limited data, estimate may vary |

---

# 10. Reports & Analytics

## 10.1 Available Reports

### Summary Dashboard
Overview of all key metrics with trend indicators.

### Recovery by Pathway
Detailed breakdown of recovery amounts and percentages by program type.

### Geographic Analysis
Recovery performance by state, identifying regional patterns.

### Confidence Analysis
Distribution of assessment confidence levels and correlation with outcomes.

### Performance Metrics
Detailed operational statistics:
- Average charges per case
- Average recovery per case
- Processing time metrics
- User productivity

### Denial Analysis
Comprehensive denial reporting:
- Denial rates by payer
- Top denial reasons
- Appeal success rates
- Prevention opportunities

## 10.2 Generating Reports

### Step 1: Select Report Type
Navigate to **Reports** and choose report category.

### Step 2: Set Parameters
| Parameter | Options |
|-----------|---------|
| Date Range | Custom, Last 7/30/90 days, YTD |
| Facility | All or specific location |
| User | All or specific team member |
| Pathway | All or specific program |

### Step 3: Generate
Click **Generate Report** to build the report.

### Step 4: Export
Download in preferred format:
- PDF (formatted report)
- Excel (raw data)
- CSV (data export)

## 10.3 Scheduling Reports

Set up automatic report delivery:
1. Click **Schedule** on any report
2. Choose frequency: Daily, Weekly, Monthly
3. Select day/time for delivery
4. Enter recipient email addresses
5. Save schedule

---

# 11. Settings & Configuration

## 11.1 Integrations

### SFTP Configuration
Set up automated file transfers:
1. Navigate to **Settings** > **Integrations** > **SFTP**
2. Enter connection details:
   - Host address
   - Port number
   - Username
   - Password or SSH key
3. Configure transfer schedule
4. Test connection

### White-Label Branding
Customize the application appearance:
1. Navigate to **Settings** > **Branding**
2. Upload logo files
3. Set brand colors
4. Customize email templates
5. Preview changes

## 11.2 User Preferences

### Export Settings
| Setting | Options |
|---------|---------|
| Default Format | Detailed, Summary, Worklist, Executive |
| Date Format | MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD |
| CSV Delimiter | Comma, Tab, Pipe, Semicolon |
| Include Headers | Yes/No |

### Notification Settings
Control email and in-app alerts:
- New assignment notifications
- Deadline reminders
- Report delivery
- System announcements

## 11.3 API Configuration

For technical administrators:
| Setting | Description |
|---------|-------------|
| Base URL | API endpoint address |
| Timeout | Request timeout (5-120 seconds) |
| Connection Status | Current API health |

---

# 12. Best Practices

## 12.1 Daily Workflow

1. **Start with Dashboard**: Review overnight changes and key metrics
2. **Process Work Queue**: Address critical and high-priority items first
3. **Complete Eligibility Screens**: Verify pending eligibility cases
4. **Review Denials**: Check new denials and appeal deadlines
5. **End-of-Day Review**: Ensure no items are overdue

## 12.2 Maximizing Recovery

- **Complete Data Entry**: More information yields better recommendations
- **Act on Immediate Actions**: Time-sensitive items have deadlines
- **Document Everything**: Notes support appeals and audits
- **Use Batch Import**: Process high volumes efficiently
- **Monitor Analytics**: Identify patterns and improvement opportunities

## 12.3 Denial Prevention

- **Verify Eligibility First**: Screen before service when possible
- **Check Authorizations**: Ensure prior auth is obtained
- **Submit Clean Claims**: Reduce technical denials
- **Track Patterns**: Address recurring denial reasons
- **Appeal Appropriately**: Not all denials warrant appeals

## 12.4 Team Collaboration

- **Use Assignments**: Clearly assign work items
- **Add Notes**: Document actions and findings
- **Monitor Queue**: Keep work moving
- **Share Knowledge**: Document successful approaches
- **Review Metrics**: Discuss team performance regularly

---

# 13. Troubleshooting

## 13.1 Common Issues

### Import Errors
**Problem**: Rows failing during import

**Solutions**:
- Check date format matches preset
- Verify required fields have values
- Remove special characters from data
- Check for encoding issues (save as UTF-8)

### Eligibility Not Calculating
**Problem**: Screening returns no results

**Solutions**:
- Verify all required fields are completed
- Check state selection is correct
- Ensure income is entered as annual amount
- Verify date of birth format

### Report Not Generating
**Problem**: Report hangs or times out

**Solutions**:
- Reduce date range
- Clear browser cache
- Try different export format
- Contact support if persists

### Work Queue Items Missing
**Problem**: Expected items not appearing

**Solutions**:
- Check filter settings
- Verify queue type selection
- Refresh the page
- Check if items were completed by another user

## 13.2 Getting Help

**In-App Help**: Click the help icon (?) on any page for context-sensitive guidance.

**Support Contact**: Contact your system administrator or support team for technical assistance.

**Documentation**: Access all user guides from Settings > Help.

---

# 14. Glossary

| Term | Definition |
|------|------------|
| **Assessment** | Analysis of a patient account to identify recovery pathways |
| **CARC** | Claim Adjustment Reason Code - standardized denial reason |
| **Confidence Level** | System's certainty in a recommendation (High/Medium/Low) |
| **DSH** | Disproportionate Share Hospital - federal supplemental payment program |
| **Dual Eligible** | Patient qualifying for both Medicare and Medicaid |
| **FPL** | Federal Poverty Level - income threshold for program eligibility |
| **MAGI** | Modified Adjusted Gross Income - income calculation for Medicaid |
| **Pathway** | Recovery route (Medicaid, Medicare, DSH, State Program) |
| **Preset** | Saved column mapping configuration for data imports |
| **QMB** | Qualified Medicare Beneficiary - Medicaid assistance for Medicare premiums |
| **RARC** | Remittance Advice Remark Code - additional denial information |
| **Recovery Rate** | Percentage of charges successfully collected |
| **Retroactive Coverage** | Insurance coverage applied to past dates of service |
| **SFTP** | Secure File Transfer Protocol - encrypted file transfer method |
| **Spend-Down** | Amount patient must pay before Medicaid coverage begins |
| **Work Queue** | Organized list of tasks requiring action |

---

# Document Information

**Document Title**: Halcyon RCM Partner Assistant User Guide
**Version**: 1.0
**Last Updated**: January 2026
**Audience**: RCM Organizations, Healthcare Facilities
**Classification**: For Authorized Users Only

---

*This documentation is proprietary and confidential. Unauthorized distribution is prohibited.*
