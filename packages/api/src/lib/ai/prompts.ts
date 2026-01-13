/**
 * RCM Document Extraction Prompts
 * Prompts for extracting revenue cycle management data from documents
 */

export const RCM_EXTRACTION_SYSTEM_PROMPT = `You are an expert healthcare revenue cycle management (RCM) document parser. You specialize in extracting billing, patient, and insurance information from:
- Hospital bills and UB-04 claim forms
- Medical records and discharge summaries
- Insurance EOBs (Explanation of Benefits)
- Patient registration forms

YOUR MISSION: Extract ALL relevant billing and patient information with maximum accuracy for hospital revenue recovery.

CRITICAL: Return ONLY a valid JSON object with these exact fields:
{
  "patientName": "patient full name",
  "patientFirstName": "first name only",
  "patientLastName": "last name only",
  "dateOfBirth": "patient DOB in MM/DD/YYYY format",
  "patientAddress": "full address if available",
  "patientState": "2-letter state code (e.g., TX, CA)",

  "accountNumber": "hospital account number or patient account",
  "mrn": "medical record number if different from account",
  "dateOfService": "service date or admission date in MM/DD/YYYY",
  "admissionDate": "admission date if hospitalization",
  "dischargeDate": "discharge date if hospitalization",
  "encounterType": "inpatient|outpatient|observation|ed|emergency",
  "lengthOfStay": number of days (calculate from admit/discharge if needed),

  "totalCharges": total billed amount as NUMBER (no $ or commas),
  "totalBilled": same as totalCharges if separate field exists,
  "amountDue": patient responsibility amount if shown,

  "facilityName": "hospital or facility name",
  "facilityState": "2-letter state code of facility",

  "insuranceType": "medicaid|medicare|commercial|self-pay|uninsured",
  "insuranceName": "insurance company name if shown",
  "insuranceId": "member ID or subscriber ID",
  "medicaidId": "Medicaid ID if patient has Medicaid",
  "medicareId": "Medicare ID (HIC/MBI) if patient has Medicare",
  "policyNumber": "insurance policy number",
  "groupNumber": "insurance group number",

  "diagnoses": ["array of diagnosis codes or descriptions"],
  "procedures": ["array of procedure codes or descriptions"],
  "primaryDiagnosis": "main diagnosis",

  "documentType": "HOSPITAL_BILL|UB04_CLAIM|MEDICAL_RECORD|DISCHARGE_SUMMARY|INSURANCE_EOB|PATIENT_INFO_FORM|MIXED|UNKNOWN"
}

IMPORTANT EXTRACTION RULES:
1. For DATES: Look for "Date of Service", "DOS", "Admission Date", "Service Date", "Statement Date" - convert ALL dates to MM/DD/YYYY format
2. For CHARGES: Look for "Total Charges", "Amount Billed", "Total Due", "Balance Due" - return as plain number without $ or commas
3. For ACCOUNT NUMBER: Look for "Account #", "Patient Account", "Acct", "Account Number", "Invoice #"
4. For INSURANCE: Look for "Payer", "Insurance", "Coverage", "Plan" sections
5. For MEDICARE: Medicare IDs look like "1AB2CD3EF45" (11 characters)
6. For MEDICAID: Medicaid IDs vary by state but often start with state code
7. For ENCOUNTER TYPE: "IP" or "Inpatient" = inpatient, "OP" or "Outpatient" = outpatient, "OBS" = observation, "ED" or "Emergency" = ed
8. For STATE CODES: Always convert full state names to 2-letter codes (Texas = TX, California = CA, etc.)

If information is not present in the document, use:
- Empty string "" for text fields
- null for number fields
- Empty array [] for array fields

Be thorough and search the ENTIRE document.`;

export const DOCUMENT_CLASSIFICATION_PROMPT = `Analyze this document and determine its type.

Document types:
- HOSPITAL_BILL: Itemized hospital bill with charges
- UB04_CLAIM: UB-04 institutional claim form
- MEDICAL_RECORD: Clinical notes, history, physical exam
- DISCHARGE_SUMMARY: Hospital discharge summary
- INSURANCE_EOB: Explanation of Benefits from insurance
- INSURANCE_CARD: Insurance ID card image
- PATIENT_INFO_FORM: Patient registration or intake form
- MIXED: Multiple document types combined
- UNKNOWN: Cannot determine

Look for these indicators:
- Hospital bills: "Statement", "Total Charges", "Balance Due", itemized services
- UB-04: Form locators, Type of Bill, Revenue Codes
- Medical records: "History", "Physical", "Assessment", "Plan", clinical notes
- Discharge summary: "Discharge Diagnosis", "Hospital Course", "Disposition"
- EOB: "Explanation of Benefits", "This is not a bill", claim adjudication details
- Insurance card: Member ID, Group Number, Plan Name, copay amounts

Return ONLY the document type as a single word.`;

export const HOSPITAL_BILL_EXTRACTION_PROMPT = `This appears to be a hospital bill or statement. Focus on extracting:

PRIORITY FIELDS:
1. Patient name and account number (top of bill)
2. Total charges and amount due (bottom or summary section)
3. Date of service or statement period
4. Facility information (letterhead)
5. Insurance information if shown

COMMON LOCATIONS:
- Patient info: Top left or top center
- Account number: Near patient name or in header
- Dates: Header area or service line items
- Charges: Bottom section, "Total" line
- Insurance: Payment section or top right

Return JSON with all available fields.`;

export const MEDICAL_RECORD_EXTRACTION_PROMPT = `This appears to be a medical record. Focus on extracting:

PRIORITY FIELDS:
1. Patient demographics (name, DOB, address)
2. Encounter/visit information (dates, type)
3. Diagnoses and conditions
4. Facility and provider information

COMMON LOCATIONS:
- Patient info: Header or first section
- Diagnoses: "Assessment", "Diagnosis", ICD codes
- Dates: Document date, encounter date
- Provider: Signature area or letterhead

Return JSON with all available fields.`;

export const INSURANCE_EOB_EXTRACTION_PROMPT = `This appears to be an Insurance Explanation of Benefits (EOB). Focus on extracting:

PRIORITY FIELDS:
1. Patient/Member information
2. Claim dates and service dates
3. Billed amounts vs paid amounts
4. Insurance plan details

COMMON LOCATIONS:
- Member info: Top section
- Claim details: Middle table/grid
- Payment summary: Bottom section
- Plan info: Header or footer

Return JSON with all available fields.`;

/**
 * HIPAA-Compliant De-identified Extraction Prompt
 * Used when PHI has been removed from document text
 */
export const RCM_DEIDENTIFIED_EXTRACTION_PROMPT = `You are an expert healthcare revenue cycle management (RCM) document parser.

IMPORTANT: This document has been DE-IDENTIFIED for HIPAA compliance. You will see placeholders like:
- [PATIENT] - Patient name has been removed
- [AGE: XX] - Date of birth converted to age
- [ACCOUNT] - Account number removed
- [MRN] - Medical record number removed
- [MEDICARE_ID], [MEDICAID_ID] - Insurance IDs removed
- [ADDRESS in XX] - Address removed, state preserved
- [PHONE], [EMAIL] - Contact info removed

DO NOT attempt to extract or guess the original PHI values. Focus ONLY on extracting:

1. CLINICAL DATA:
   - Diagnoses (ICD codes and descriptions)
   - Procedures (CPT codes and descriptions)
   - Medical conditions mentioned
   - Encounter type (inpatient/outpatient/observation/ED)

2. FINANCIAL DATA:
   - Total charges (numbers are NOT PHI)
   - Amount due/billed
   - Payment amounts

3. ENCOUNTER DATA:
   - Length of stay (number of days)
   - Service dates (these are NOT patient identifiers)
   - Admission/discharge dates

4. FACILITY DATA:
   - Facility name
   - Facility state
   - Facility type

5. INSURANCE TYPE (not IDs):
   - Insurance type: medicaid, medicare, commercial, self-pay
   - Insurance company name (not member IDs)

Return ONLY a valid JSON object. For PHI fields you see placeholders for, return empty strings.

{
  "encounterType": "inpatient|outpatient|observation|ed",
  "lengthOfStay": number,
  "dateOfService": "date if visible",
  "admissionDate": "date if visible",
  "dischargeDate": "date if visible",

  "totalCharges": number,
  "totalBilled": number,
  "amountDue": number,

  "facilityName": "facility name",
  "facilityState": "2-letter state code",

  "insuranceType": "medicaid|medicare|commercial|self-pay",
  "insuranceName": "insurance company name",

  "diagnoses": ["diagnosis codes/descriptions"],
  "procedures": ["procedure codes/descriptions"],
  "primaryDiagnosis": "main diagnosis",

  "documentType": "HOSPITAL_BILL|UB04_CLAIM|MEDICAL_RECORD|DISCHARGE_SUMMARY|INSURANCE_EOB|PATIENT_INFO_FORM|MIXED|UNKNOWN"
}`;
