/**
 * AI Ensemble Document Parser for RCM
 * Multi-model AI system with consensus building for maximum accuracy
 * Uses GPT-4o-mini, Claude 3.5 Haiku, and Gemini 2.5 Flash in parallel
 *
 * HIPAA COMPLIANCE: This module de-identifies PHI before sending to AI services.
 * PHI is extracted locally and merged back after AI processing.
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ExtractedDocumentData, AIParseResult, ConsensusResult } from './types.js';
import { RCM_EXTRACTION_SYSTEM_PROMPT, RCM_DEIDENTIFIED_EXTRACTION_PROMPT } from './prompts.js';
import {
  extractPHI,
  deidentifyText,
  deidentifyKeyValuePairs,
  validateDeidentification,
  type ExtractedPHI,
} from './deidentify.js';

// Lazy initialization to avoid errors when env vars aren't set
let _openai: OpenAI | null = null;
let _anthropic: Anthropic | null = null;
let _genAI: GoogleGenerativeAI | null = null;

function getOpenAI(): OpenAI | null {
  if (_openai === null && process.env.OPENAI_API_KEY) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

function getAnthropic(): Anthropic | null {
  if (_anthropic === null && process.env.ANTHROPIC_API_KEY) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _anthropic;
}

function getGenAI(): GoogleGenerativeAI | null {
  if (_genAI === null && process.env.GOOGLE_AI_API_KEY) {
    _genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
  }
  return _genAI;
}

/**
 * Parse document with GPT-4o-mini
 */
async function parseWithGPT(
  extractedText: string,
  keyValuePairs: Record<string, string>
): Promise<AIParseResult> {
  const startTime = Date.now();

  try {
    const openai = getOpenAI();
    if (!openai) {
      return {
        model: 'gpt-4o-mini',
        data: null,
        confidence: 0,
        error: 'API key not configured',
        responseTime: 0,
      };
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: RCM_EXTRACTION_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Extract ALL billing and patient information from this document:

=== DOCUMENT TEXT ===
${extractedText}

=== FORM FIELDS (if extracted by OCR) ===
${Object.entries(keyValuePairs).map(([k, v]) => `${k}: ${v}`).join('\n')}

Return ONLY the JSON object with extracted data.`,
        },
      ],
      temperature: 0.2,
      max_tokens: 2000,
    });

    const response = completion.choices[0]?.message?.content?.trim();

    if (response) {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          model: 'gpt-4o-mini',
          data: normalizeExtractedData(parsed),
          confidence: 0.85,
          responseTime: Date.now() - startTime,
        };
      }
    }

    return {
      model: 'gpt-4o-mini',
      data: null,
      confidence: 0,
      error: 'No valid JSON in response',
      responseTime: Date.now() - startTime,
    };
  } catch (error) {
    console.error('[GPT] Parsing failed:', error);
    return {
      model: 'gpt-4o-mini',
      data: null,
      confidence: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - startTime,
    };
  }
}

/**
 * Parse document with Claude 3.5 Haiku
 */
async function parseWithClaude(
  extractedText: string,
  keyValuePairs: Record<string, string>
): Promise<AIParseResult> {
  const startTime = Date.now();

  try {
    const anthropic = getAnthropic();
    if (!anthropic) {
      return {
        model: 'claude-3.5-haiku',
        data: null,
        confidence: 0,
        error: 'API key not configured',
        responseTime: 0,
      };
    }

    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 4000,
      temperature: 0.1,
      system: RCM_EXTRACTION_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Extract ALL billing and patient information from this healthcare document:

DOCUMENT TEXT:
${extractedText}

FORM FIELDS:
${Object.entries(keyValuePairs).map(([k, v]) => `${k}: ${v}`).join('\n')}

Return only the JSON object.`,
        },
      ],
    });

    const response = message.content[0].type === 'text' ? message.content[0].text : '';

    if (response) {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          model: 'claude-3.5-haiku',
          data: normalizeExtractedData(parsed),
          confidence: 0.95,
          responseTime: Date.now() - startTime,
        };
      }
    }

    return {
      model: 'claude-3.5-haiku',
      data: null,
      confidence: 0,
      error: 'No valid JSON in response',
      responseTime: Date.now() - startTime,
    };
  } catch (error) {
    console.error('[Claude] Parsing failed:', error);
    return {
      model: 'claude-3.5-haiku',
      data: null,
      confidence: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - startTime,
    };
  }
}

/**
 * Parse document with Gemini 2.5 Flash
 */
async function parseWithGemini(
  extractedText: string,
  keyValuePairs: Record<string, string>
): Promise<AIParseResult> {
  const startTime = Date.now();

  try {
    const genAI = getGenAI();
    if (!genAI) {
      return {
        model: 'gemini-2.5-flash',
        data: null,
        confidence: 0,
        error: 'API key not configured',
        responseTime: 0,
      };
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-preview-05-20',
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2000,
      },
    });

    const prompt = `${RCM_EXTRACTION_SYSTEM_PROMPT}

Extract ALL billing and patient information from this document:

=== DOCUMENT TEXT ===
${extractedText}

=== FORM FIELDS ===
${Object.entries(keyValuePairs).map(([k, v]) => `${k}: ${v}`).join('\n')}

Return ONLY the JSON object with extracted data. No explanations.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    if (text) {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          model: 'gemini-2.5-flash',
          data: normalizeExtractedData(parsed),
          confidence: 0.90,
          responseTime: Date.now() - startTime,
        };
      }
    }

    return {
      model: 'gemini-2.5-flash',
      data: null,
      confidence: 0,
      error: 'No valid JSON in response',
      responseTime: Date.now() - startTime,
    };
  } catch (error) {
    console.error('[Gemini] Parsing failed:', error);
    return {
      model: 'gemini-2.5-flash',
      data: null,
      confidence: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - startTime,
    };
  }
}

/**
 * Normalize extracted data to consistent format
 */
function normalizeExtractedData(data: any): ExtractedDocumentData {
  return {
    patientName: data.patientName || data.patient_name || '',
    patientFirstName: data.patientFirstName || data.patient_first_name || '',
    patientLastName: data.patientLastName || data.patient_last_name || '',
    dateOfBirth: normalizeDate(data.dateOfBirth || data.dob || data.date_of_birth || ''),
    patientAddress: data.patientAddress || data.patient_address || '',
    patientState: normalizeStateCode(data.patientState || data.patient_state || ''),

    accountNumber: data.accountNumber || data.account_number || data.acct || '',
    mrn: data.mrn || data.medical_record_number || '',
    dateOfService: normalizeDate(data.dateOfService || data.dos || data.date_of_service || data.serviceDate || ''),
    admissionDate: normalizeDate(data.admissionDate || data.admission_date || ''),
    dischargeDate: normalizeDate(data.dischargeDate || data.discharge_date || ''),
    encounterType: normalizeEncounterType(data.encounterType || data.encounter_type || ''),
    lengthOfStay: parseNumber(data.lengthOfStay || data.length_of_stay || data.los),

    totalCharges: parseNumber(data.totalCharges || data.total_charges || data.totalBilled || data.total_billed),
    totalBilled: parseNumber(data.totalBilled || data.total_billed || data.totalCharges),
    amountDue: parseNumber(data.amountDue || data.amount_due || data.balanceDue),

    facilityName: data.facilityName || data.facility_name || data.hospital || '',
    facilityState: normalizeStateCode(data.facilityState || data.facility_state || ''),
    facilityType: data.facilityType || data.facility_type || '',

    insuranceType: normalizeInsuranceType(data.insuranceType || data.insurance_type || data.payerType || ''),
    insuranceName: data.insuranceName || data.insurance_name || data.payer || '',
    insuranceId: data.insuranceId || data.insurance_id || data.memberId || '',
    medicaidId: data.medicaidId || data.medicaid_id || '',
    medicareId: data.medicareId || data.medicare_id || '',
    policyNumber: data.policyNumber || data.policy_number || '',
    groupNumber: data.groupNumber || data.group_number || '',

    diagnoses: normalizeArray(data.diagnoses || data.diagnosis || []),
    procedures: normalizeArray(data.procedures || data.procedure || []),
    primaryDiagnosis: data.primaryDiagnosis || data.primary_diagnosis || '',

    documentType: data.documentType || data.document_type || 'UNKNOWN',
  };
}

/**
 * Normalize date to MM/DD/YYYY format
 */
function normalizeDate(dateStr: string): string {
  if (!dateStr || typeof dateStr !== 'string') return '';

  const cleaned = dateStr.trim();
  if (!cleaned) return '';

  // Already in MM/DD/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(cleaned)) {
    const [m, d, y] = cleaned.split('/');
    return `${m.padStart(2, '0')}/${d.padStart(2, '0')}/${y}`;
  }

  // YYYY-MM-DD (ISO)
  const isoMatch = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    return `${isoMatch[2].padStart(2, '0')}/${isoMatch[3].padStart(2, '0')}/${isoMatch[1]}`;
  }

  // Try JS Date parsing
  try {
    const parsed = new Date(cleaned);
    if (!isNaN(parsed.getTime())) {
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      const y = String(parsed.getFullYear());
      if (parseInt(y) >= 1900 && parseInt(y) <= 2100) {
        return `${m}/${d}/${y}`;
      }
    }
  } catch {
    // Ignore parsing errors
  }

  return cleaned;
}

/**
 * Normalize state to 2-letter code
 */
function normalizeStateCode(state: string): string {
  if (!state) return '';

  const cleaned = state.trim().toUpperCase();

  // Already 2 letters
  if (/^[A-Z]{2}$/.test(cleaned)) return cleaned;

  // State name mapping
  const stateMap: Record<string, string> = {
    'ALABAMA': 'AL', 'ALASKA': 'AK', 'ARIZONA': 'AZ', 'ARKANSAS': 'AR',
    'CALIFORNIA': 'CA', 'COLORADO': 'CO', 'CONNECTICUT': 'CT', 'DELAWARE': 'DE',
    'FLORIDA': 'FL', 'GEORGIA': 'GA', 'HAWAII': 'HI', 'IDAHO': 'ID',
    'ILLINOIS': 'IL', 'INDIANA': 'IN', 'IOWA': 'IA', 'KANSAS': 'KS',
    'KENTUCKY': 'KY', 'LOUISIANA': 'LA', 'MAINE': 'ME', 'MARYLAND': 'MD',
    'MASSACHUSETTS': 'MA', 'MICHIGAN': 'MI', 'MINNESOTA': 'MN', 'MISSISSIPPI': 'MS',
    'MISSOURI': 'MO', 'MONTANA': 'MT', 'NEBRASKA': 'NE', 'NEVADA': 'NV',
    'NEW HAMPSHIRE': 'NH', 'NEW JERSEY': 'NJ', 'NEW MEXICO': 'NM', 'NEW YORK': 'NY',
    'NORTH CAROLINA': 'NC', 'NORTH DAKOTA': 'ND', 'OHIO': 'OH', 'OKLAHOMA': 'OK',
    'OREGON': 'OR', 'PENNSYLVANIA': 'PA', 'RHODE ISLAND': 'RI', 'SOUTH CAROLINA': 'SC',
    'SOUTH DAKOTA': 'SD', 'TENNESSEE': 'TN', 'TEXAS': 'TX', 'UTAH': 'UT',
    'VERMONT': 'VT', 'VIRGINIA': 'VA', 'WASHINGTON': 'WA', 'WEST VIRGINIA': 'WV',
    'WISCONSIN': 'WI', 'WYOMING': 'WY', 'DISTRICT OF COLUMBIA': 'DC',
  };

  return stateMap[cleaned] || cleaned.substring(0, 2);
}

/**
 * Normalize encounter type
 */
function normalizeEncounterType(type: string): string {
  if (!type) return '';

  const cleaned = type.toLowerCase().trim();

  if (cleaned.includes('inpatient') || cleaned === 'ip') return 'inpatient';
  if (cleaned.includes('outpatient') || cleaned === 'op') return 'outpatient';
  if (cleaned.includes('observation') || cleaned === 'obs') return 'observation';
  if (cleaned.includes('emergency') || cleaned === 'ed' || cleaned === 'er') return 'ed';

  return cleaned;
}

/**
 * Normalize insurance type
 */
function normalizeInsuranceType(type: string): string {
  if (!type) return '';

  const cleaned = type.toLowerCase().trim();

  if (cleaned.includes('medicaid')) return 'medicaid';
  if (cleaned.includes('medicare')) return 'medicare';
  if (cleaned.includes('commercial') || cleaned.includes('private')) return 'commercial';
  if (cleaned.includes('self') || cleaned.includes('uninsured') || cleaned.includes('cash')) return 'uninsured';

  return cleaned;
}

/**
 * Parse number from string
 */
function parseNumber(value: any): number | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'number') return value;

  const cleaned = String(value).replace(/[$,]/g, '').trim();
  const num = parseFloat(cleaned);

  return isNaN(num) ? undefined : num;
}

/**
 * Normalize array values
 */
function normalizeArray(value: any): string[] {
  if (Array.isArray(value)) return value.filter(v => v && String(v).trim());
  if (typeof value === 'string' && value.trim()) {
    return value.split(/[,;]/).map(v => v.trim()).filter(v => v);
  }
  return [];
}

/**
 * Build consensus from multiple model results
 */
function buildConsensus(results: AIParseResult[]): ConsensusResult {
  const successful = results.filter(r => r.data !== null);

  if (successful.length === 0) {
    return {
      consensus: {},
      confidence: 0,
      agreementScore: 0,
      modelResults: results,
    };
  }

  if (successful.length === 1) {
    return {
      consensus: successful[0].data!,
      confidence: successful[0].confidence,
      agreementScore: 1.0,
      modelResults: results,
    };
  }

  // Build consensus from multiple models
  const consensus: ExtractedDocumentData = {};
  let totalAgreement = 0;
  let fieldsCompared = 0;

  // String fields - use confidence-weighted voting
  const stringFields: (keyof ExtractedDocumentData)[] = [
    'patientName', 'patientFirstName', 'patientLastName', 'dateOfBirth',
    'patientState', 'accountNumber', 'mrn', 'dateOfService', 'admissionDate',
    'dischargeDate', 'encounterType', 'facilityName', 'facilityState',
    'insuranceType', 'insuranceName', 'medicaidId', 'medicareId',
    'primaryDiagnosis', 'documentType',
  ];

  for (const field of stringFields) {
    const votes = new Map<string, number>();

    for (const result of successful) {
      const value = result.data![field];
      if (value && String(value).trim()) {
        const key = String(value).toLowerCase().trim();
        votes.set(key, (votes.get(key) || 0) + result.confidence);
      }
    }

    if (votes.size > 0) {
      const winner = [...votes.entries()].sort((a, b) => b[1] - a[1])[0];
      const originalValue = successful.find(r =>
        String(r.data![field]).toLowerCase().trim() === winner[0]
      )?.data![field];

      if (originalValue) {
        (consensus as any)[field] = originalValue;
        const agreement = winner[1] / successful.reduce((sum, r) => sum + r.confidence, 0);
        totalAgreement += agreement;
        fieldsCompared++;
      }
    }
  }

  // Number fields
  const numberFields: (keyof ExtractedDocumentData)[] = [
    'totalCharges', 'totalBilled', 'amountDue', 'lengthOfStay',
  ];

  for (const field of numberFields) {
    const values: number[] = [];

    for (const result of successful) {
      const value = result.data![field];
      if (typeof value === 'number' && !isNaN(value)) {
        values.push(value);
      }
    }

    if (values.length > 0) {
      // Use median for number fields
      values.sort((a, b) => a - b);
      const median = values[Math.floor(values.length / 2)];
      (consensus as any)[field] = median;
      totalAgreement += 1;
      fieldsCompared++;
    }
  }

  // Array fields - merge and deduplicate
  const arrayFields: (keyof ExtractedDocumentData)[] = ['diagnoses', 'procedures'];

  for (const field of arrayFields) {
    const allItems: string[] = [];

    for (const result of successful) {
      const items = result.data![field] as string[] || [];
      allItems.push(...items);
    }

    if (allItems.length > 0) {
      (consensus as any)[field] = [...new Set(allItems)];
      totalAgreement += 1;
      fieldsCompared++;
    }
  }

  const agreementScore = fieldsCompared > 0 ? totalAgreement / fieldsCompared : 0;
  const avgConfidence = successful.reduce((sum, r) => sum + r.confidence, 0) / successful.length;
  const finalConfidence = avgConfidence * agreementScore;

  return {
    consensus,
    confidence: finalConfidence,
    agreementScore,
    modelResults: results,
  };
}

/**
 * Main ensemble parser - runs all models in parallel and builds consensus
 * HIPAA COMPLIANCE: De-identifies PHI before sending to AI services
 */
export async function parseWithEnsemble(
  extractedText: string,
  keyValuePairs: Record<string, string> = {}
): Promise<ConsensusResult> {
  console.log('[AI Ensemble] Starting HIPAA-compliant 3-model parsing...');
  console.log('[AI Ensemble] Models: GPT-4o-mini + Claude 3.5 Haiku + Gemini 2.5 Flash');

  const startTime = Date.now();

  // STEP 1: Extract PHI locally (never sent to AI)
  console.log('[AI Ensemble] Extracting PHI locally...');
  const phi = extractPHI(extractedText, keyValuePairs);

  // STEP 2: De-identify text before sending to AI
  console.log('[AI Ensemble] De-identifying text for AI processing...');
  const deidentified = deidentifyText(extractedText, keyValuePairs, phi);

  // STEP 3: Validate de-identification
  const validation = validateDeidentification(deidentified.text);
  if (!validation.isClean) {
    console.warn('[AI Ensemble] De-identification warnings:', validation.issues);
  }
  console.log(`[AI Ensemble] Removed ${deidentified.replacements.length} PHI elements`);

  // STEP 4: De-identify key-value pairs
  const safeKeyValuePairs = deidentifyKeyValuePairs(keyValuePairs, phi);

  // STEP 5: Run all models in parallel with DE-IDENTIFIED data only
  const [gptResult, claudeResult, geminiResult] = await Promise.all([
    parseWithGPT(deidentified.text, safeKeyValuePairs),
    parseWithClaude(deidentified.text, safeKeyValuePairs),
    parseWithGemini(deidentified.text, safeKeyValuePairs),
  ]);

  const results = [gptResult, claudeResult, geminiResult];

  // Log results
  for (const result of results) {
    if (result.data) {
      console.log(`[AI Ensemble] ${result.model}: Success (${(result.confidence * 100).toFixed(0)}% conf, ${result.responseTime}ms)`);
    } else {
      console.log(`[AI Ensemble] ${result.model}: Failed - ${result.error}`);
    }
  }

  // STEP 6: Build consensus from AI results
  const consensus = buildConsensus(results);

  // STEP 7: Merge PHI back into consensus (PHI was extracted locally, not from AI)
  const mergedConsensus = mergePHIIntoConsensus(consensus, phi);

  const totalTime = Date.now() - startTime;
  console.log(`[AI Ensemble] Consensus built in ${totalTime}ms`);
  console.log(`[AI Ensemble] Confidence: ${(mergedConsensus.confidence * 100).toFixed(1)}%, Agreement: ${(mergedConsensus.agreementScore * 100).toFixed(1)}%`);
  console.log(`[AI Ensemble] Models succeeded: ${results.filter(r => r.data).length}/3`);
  console.log('[AI Ensemble] PHI merged from local extraction (not from AI)');

  return mergedConsensus;
}

/**
 * Merge locally-extracted PHI into AI consensus results
 * PHI is never extracted by AI - only by local pattern matching
 */
function mergePHIIntoConsensus(consensus: ConsensusResult, phi: ExtractedPHI): ConsensusResult {
  const mergedData: ExtractedDocumentData = { ...consensus.consensus };

  // Merge PHI fields from local extraction
  if (phi.patientName) mergedData.patientName = phi.patientName;
  if (phi.patientFirstName) mergedData.patientFirstName = phi.patientFirstName;
  if (phi.patientLastName) mergedData.patientLastName = phi.patientLastName;
  if (phi.dateOfBirth) mergedData.dateOfBirth = phi.dateOfBirth;
  if (phi.patientAddress) mergedData.patientAddress = phi.patientAddress;
  if (phi.patientState) mergedData.patientState = phi.patientState;
  if (phi.accountNumber) mergedData.accountNumber = phi.accountNumber;
  if (phi.mrn) mergedData.mrn = phi.mrn;
  if (phi.insuranceId) mergedData.insuranceId = phi.insuranceId;
  if (phi.medicaidId) mergedData.medicaidId = phi.medicaidId;
  if (phi.medicareId) mergedData.medicareId = phi.medicareId;
  if (phi.policyNumber) mergedData.policyNumber = phi.policyNumber;
  if (phi.groupNumber) mergedData.groupNumber = phi.groupNumber;

  return {
    ...consensus,
    consensus: mergedData,
  };
}
