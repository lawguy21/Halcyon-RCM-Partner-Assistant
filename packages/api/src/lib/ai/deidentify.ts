/**
 * PHI De-identification Utility
 * HIPAA-compliant data sanitization before sending to AI services
 *
 * AI services (OpenAI, Anthropic, Google) do not have BAAs for standard API access.
 * This module removes/masks Protected Health Information (PHI) before AI processing.
 */

/**
 * PHI identifiers that must be removed per HIPAA Safe Harbor method
 */
export interface PHIIdentifiers {
  names: string[];
  dates: string[];
  phoneNumbers: string[];
  emails: string[];
  ssns: string[];
  mrns: string[];
  accountNumbers: string[];
  insuranceIds: string[];
  addresses: string[];
  ipAddresses: string[];
}

/**
 * De-identified text result
 */
export interface DeidentifiedResult {
  text: string;
  extractedPHI: ExtractedPHI;
  replacements: PHIReplacement[];
}

/**
 * PHI extracted from document (stored locally, never sent to AI)
 */
export interface ExtractedPHI {
  patientName?: string;
  patientFirstName?: string;
  patientLastName?: string;
  dateOfBirth?: string;
  age?: number;
  patientAddress?: string;
  patientState?: string;
  accountNumber?: string;
  mrn?: string;
  insuranceId?: string;
  medicaidId?: string;
  medicareId?: string;
  policyNumber?: string;
  groupNumber?: string;
  phoneNumber?: string;
  email?: string;
  ssn?: string;
}

/**
 * Record of what was replaced
 */
export interface PHIReplacement {
  original: string;
  replacement: string;
  type: string;
  position: number;
}

/**
 * Regex patterns for detecting PHI
 */
const PHI_PATTERNS = {
  // Names - common name patterns (will also use provided name if available)
  name: /(?:patient|name|pt)\s*[:.]?\s*([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+)/gi,

  // Dates - various formats
  dateMMDDYYYY: /\b(0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12]\d|3[01])[\/\-](19|20)\d{2}\b/g,
  dateYYYYMMDD: /\b(19|20)\d{2}[\/\-](0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12]\d|3[01])\b/g,
  dateWritten: /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi,

  // Phone numbers
  phone: /\b(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,

  // Email addresses
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,

  // SSN
  ssn: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,

  // Medical Record Numbers (varies but often 6-10 digits)
  mrn: /\b(?:MRN|Medical Record|Med Rec)[\s#:]*(\d{5,10})\b/gi,

  // Account numbers
  account: /\b(?:Account|Acct|Patient Account)[\s#:]*([A-Z0-9]{5,15})\b/gi,

  // Medicare ID (11 chars: 1AB2CD3EF45)
  medicareId: /\b[1-9][A-Z][A-Z0-9]\d[A-Z][A-Z0-9]\d[A-Z][A-Z0-9]\d{2}\b/g,

  // Medicaid ID (varies by state, usually 9-12 alphanumeric)
  medicaidId: /\b(?:Medicaid|MCD)[\s#:]*([A-Z0-9]{8,12})\b/gi,

  // Insurance/Member ID
  insuranceId: /\b(?:Member|Subscriber|Insurance|Policy)[\s#:]*(?:ID|Number)?[\s#:]*([A-Z0-9]{6,20})\b/gi,

  // Street addresses
  address: /\d{1,5}\s+(?:[A-Z][a-z]+\s+)+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct|Circle|Cir)\.?(?:\s*,?\s*(?:Apt|Suite|Unit|#)\s*[A-Z0-9-]+)?/gi,

  // ZIP codes
  zipCode: /\b\d{5}(?:-\d{4})?\b/g,

  // IP addresses
  ipAddress: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
};

/**
 * Calculate age from date of birth
 */
export function calculateAge(dateOfBirth: string): number | undefined {
  if (!dateOfBirth) return undefined;

  // Try to parse the date
  let dob: Date;

  // MM/DD/YYYY format
  const mdyMatch = dateOfBirth.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdyMatch) {
    dob = new Date(parseInt(mdyMatch[3]), parseInt(mdyMatch[1]) - 1, parseInt(mdyMatch[2]));
  } else {
    // Try standard Date parsing
    dob = new Date(dateOfBirth);
  }

  if (isNaN(dob.getTime())) return undefined;

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  // HIPAA: Ages over 89 should be reported as 90+
  if (age > 89) {
    return 90;
  }

  return age;
}

/**
 * Extract state from address
 */
export function extractState(address: string): string | undefined {
  if (!address) return undefined;

  // State abbreviations
  const stateMatch = address.match(/\b([A-Z]{2})\s*\d{5}/);
  if (stateMatch) return stateMatch[1];

  // Full state names
  const stateNames: Record<string, string> = {
    'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
    'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
    'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
    'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
    'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
    'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
    'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
    'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
    'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
    'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
    'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
    'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
    'wisconsin': 'WI', 'wyoming': 'WY', 'district of columbia': 'DC',
  };

  const addressLower = address.toLowerCase();
  for (const [name, abbr] of Object.entries(stateNames)) {
    if (addressLower.includes(name)) return abbr;
  }

  return undefined;
}

/**
 * Extract PHI from text using pattern matching
 * This data is stored locally and NEVER sent to AI services
 */
export function extractPHI(text: string, keyValuePairs: Record<string, string> = {}): ExtractedPHI {
  const phi: ExtractedPHI = {};

  // Extract from key-value pairs first (more reliable)
  const kvLower = Object.fromEntries(
    Object.entries(keyValuePairs).map(([k, v]) => [k.toLowerCase(), v])
  );

  // Patient name
  phi.patientName = kvLower['patient name'] || kvLower['patient'] || kvLower['name'];
  if (phi.patientName) {
    const nameParts = phi.patientName.split(/\s+/);
    if (nameParts.length >= 2) {
      phi.patientFirstName = nameParts[0];
      phi.patientLastName = nameParts[nameParts.length - 1];
    }
  }

  // Date of birth and age
  phi.dateOfBirth = kvLower['date of birth'] || kvLower['dob'] || kvLower['birth date'];
  if (phi.dateOfBirth) {
    phi.age = calculateAge(phi.dateOfBirth);
  }

  // Address and state
  phi.patientAddress = kvLower['address'] || kvLower['patient address'];
  phi.patientState = kvLower['state'] || extractState(phi.patientAddress || '');

  // Account/MRN
  phi.accountNumber = kvLower['account number'] || kvLower['account'] || kvLower['acct'];
  phi.mrn = kvLower['mrn'] || kvLower['medical record number'];

  // Insurance IDs
  phi.insuranceId = kvLower['member id'] || kvLower['subscriber id'] || kvLower['insurance id'];
  phi.medicaidId = kvLower['medicaid id'] || kvLower['medicaid'];
  phi.medicareId = kvLower['medicare id'] || kvLower['medicare'] || kvLower['hic'] || kvLower['mbi'];
  phi.policyNumber = kvLower['policy number'] || kvLower['policy'];
  phi.groupNumber = kvLower['group number'] || kvLower['group'];

  // Contact info
  phi.phoneNumber = kvLower['phone'] || kvLower['telephone'];
  phi.email = kvLower['email'] || kvLower['e-mail'];

  // Extract from text using regex if not found in key-value pairs
  if (!phi.dateOfBirth) {
    const dateMatch = text.match(PHI_PATTERNS.dateMMDDYYYY);
    if (dateMatch) {
      phi.dateOfBirth = dateMatch[0];
      phi.age = calculateAge(phi.dateOfBirth);
    }
  }

  if (!phi.phoneNumber) {
    const phoneMatch = text.match(PHI_PATTERNS.phone);
    if (phoneMatch) phi.phoneNumber = phoneMatch[0];
  }

  if (!phi.email) {
    const emailMatch = text.match(PHI_PATTERNS.email);
    if (emailMatch) phi.email = emailMatch[0];
  }

  if (!phi.accountNumber) {
    const accountMatch = text.match(PHI_PATTERNS.account);
    if (accountMatch) phi.accountNumber = accountMatch[1];
  }

  if (!phi.mrn) {
    const mrnMatch = text.match(PHI_PATTERNS.mrn);
    if (mrnMatch) phi.mrn = mrnMatch[1];
  }

  if (!phi.medicareId) {
    const medicareMatch = text.match(PHI_PATTERNS.medicareId);
    if (medicareMatch) phi.medicareId = medicareMatch[0];
  }

  // SSN (should never be sent anywhere, just detected for removal)
  const ssnMatch = text.match(PHI_PATTERNS.ssn);
  if (ssnMatch) phi.ssn = '[DETECTED-NOT-STORED]';

  return phi;
}

/**
 * De-identify text by removing/replacing PHI
 * Returns text safe to send to AI services
 */
export function deidentifyText(
  text: string,
  keyValuePairs: Record<string, string> = {},
  extractedPHI?: ExtractedPHI
): DeidentifiedResult {
  const replacements: PHIReplacement[] = [];
  let deidentifiedText = text;
  const phi = extractedPHI || extractPHI(text, keyValuePairs);

  // Helper to replace and track
  const replaceAll = (pattern: RegExp | string, replacement: string, type: string) => {
    const regex = typeof pattern === 'string'
      ? new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
      : pattern;

    let match;
    const globalRegex = new RegExp(regex.source, 'gi');
    while ((match = globalRegex.exec(text)) !== null) {
      replacements.push({
        original: match[0],
        replacement,
        type,
        position: match.index,
      });
    }

    deidentifiedText = deidentifiedText.replace(regex, replacement);
  };

  // Remove specific known PHI values first
  if (phi.patientName) {
    replaceAll(phi.patientName, '[PATIENT]', 'name');
  }
  if (phi.patientFirstName) {
    replaceAll(phi.patientFirstName, '[FIRST_NAME]', 'name');
  }
  if (phi.patientLastName) {
    replaceAll(phi.patientLastName, '[LAST_NAME]', 'name');
  }
  if (phi.dateOfBirth) {
    const ageStr = phi.age ? `[AGE: ${phi.age}]` : '[DOB_REDACTED]';
    replaceAll(phi.dateOfBirth, ageStr, 'dob');
  }
  if (phi.ssn) {
    replaceAll(PHI_PATTERNS.ssn, '[SSN_REDACTED]', 'ssn');
  }
  if (phi.accountNumber) {
    replaceAll(phi.accountNumber, '[ACCOUNT]', 'account');
  }
  if (phi.mrn) {
    replaceAll(phi.mrn, '[MRN]', 'mrn');
  }
  if (phi.insuranceId) {
    replaceAll(phi.insuranceId, '[INSURANCE_ID]', 'insurance_id');
  }
  if (phi.medicaidId) {
    replaceAll(phi.medicaidId, '[MEDICAID_ID]', 'medicaid_id');
  }
  if (phi.medicareId) {
    replaceAll(phi.medicareId, '[MEDICARE_ID]', 'medicare_id');
  }
  if (phi.policyNumber) {
    replaceAll(phi.policyNumber, '[POLICY]', 'policy');
  }
  if (phi.groupNumber) {
    replaceAll(phi.groupNumber, '[GROUP]', 'group');
  }
  if (phi.phoneNumber) {
    replaceAll(phi.phoneNumber, '[PHONE]', 'phone');
  }
  if (phi.email) {
    replaceAll(phi.email, '[EMAIL]', 'email');
  }

  // Replace address but keep state
  if (phi.patientAddress) {
    const stateStr = phi.patientState ? `[ADDRESS in ${phi.patientState}]` : '[ADDRESS_REDACTED]';
    replaceAll(phi.patientAddress, stateStr, 'address');
  }

  // Catch remaining patterns that weren't in key-value pairs
  // SSNs (critical - always remove)
  deidentifiedText = deidentifiedText.replace(PHI_PATTERNS.ssn, '[SSN_REDACTED]');

  // Phone numbers
  deidentifiedText = deidentifiedText.replace(PHI_PATTERNS.phone, '[PHONE]');

  // Email addresses
  deidentifiedText = deidentifiedText.replace(PHI_PATTERNS.email, '[EMAIL]');

  // IP addresses
  deidentifiedText = deidentifiedText.replace(PHI_PATTERNS.ipAddress, '[IP_REDACTED]');

  // Street addresses (but not city/state)
  deidentifiedText = deidentifiedText.replace(PHI_PATTERNS.address, '[ADDRESS]');

  // Medicare IDs
  deidentifiedText = deidentifiedText.replace(PHI_PATTERNS.medicareId, '[MEDICARE_ID]');

  return {
    text: deidentifiedText,
    extractedPHI: phi,
    replacements,
  };
}

/**
 * De-identify key-value pairs from OCR
 * Returns pairs safe to send to AI services
 */
export function deidentifyKeyValuePairs(
  keyValuePairs: Record<string, string>,
  extractedPHI?: ExtractedPHI
): Record<string, string> {
  const phi = extractedPHI || extractPHI('', keyValuePairs);
  const safeKV: Record<string, string> = {};

  // PHI field names to exclude entirely
  const phiFields = new Set([
    'patient name', 'patient', 'name', 'first name', 'last name',
    'date of birth', 'dob', 'birth date',
    'ssn', 'social security',
    'address', 'patient address', 'street', 'street address',
    'phone', 'telephone', 'cell', 'mobile',
    'email', 'e-mail',
    'account number', 'account', 'acct', 'patient account',
    'mrn', 'medical record number', 'medical record',
    'member id', 'subscriber id', 'insurance id',
    'medicaid id', 'medicaid number',
    'medicare id', 'medicare number', 'hic', 'mbi',
    'policy number', 'policy',
    'group number', 'group',
  ]);

  for (const [key, value] of Object.entries(keyValuePairs)) {
    const keyLower = key.toLowerCase().trim();

    // Skip PHI fields entirely
    if (phiFields.has(keyLower)) {
      // But include age if we have DOB
      if ((keyLower === 'date of birth' || keyLower === 'dob') && phi.age) {
        safeKV['Age'] = String(phi.age);
      }
      // Include state if we have address
      if (keyLower.includes('address') && phi.patientState) {
        safeKV['Patient State'] = phi.patientState;
      }
      continue;
    }

    // Include non-PHI fields
    safeKV[key] = value;
  }

  return safeKV;
}

/**
 * Check if text likely contains PHI
 */
export function containsPHI(text: string): boolean {
  // Check for SSN (highest priority)
  if (PHI_PATTERNS.ssn.test(text)) return true;

  // Check for email
  if (PHI_PATTERNS.email.test(text)) return true;

  // Check for phone
  if (PHI_PATTERNS.phone.test(text)) return true;

  // Check for Medicare ID
  if (PHI_PATTERNS.medicareId.test(text)) return true;

  // Check for dates (potential DOB)
  if (PHI_PATTERNS.dateMMDDYYYY.test(text)) return true;

  return false;
}

/**
 * Validate that text has been properly de-identified
 */
export function validateDeidentification(text: string): {
  isClean: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check for remaining PHI patterns
  if (PHI_PATTERNS.ssn.test(text)) {
    issues.push('SSN pattern detected');
  }

  if (PHI_PATTERNS.email.test(text) && !text.includes('[EMAIL]')) {
    issues.push('Email address detected');
  }

  // Check that no obvious PHI remains
  const dangerousPatterns = [
    /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/, // SSN
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(text)) {
      issues.push(`Potential PHI pattern: ${pattern.source}`);
    }
  }

  return {
    isClean: issues.length === 0,
    issues,
  };
}
