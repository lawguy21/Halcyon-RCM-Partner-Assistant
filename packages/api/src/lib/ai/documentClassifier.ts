/**
 * Document Classifier
 * Classifies healthcare documents by type using AI and pattern matching
 *
 * HIPAA COMPLIANCE: De-identifies PHI before sending to AI for classification
 */

import Anthropic from '@anthropic-ai/sdk';
import type { DocumentType } from './types.js';
import { DOCUMENT_CLASSIFICATION_PROMPT } from './prompts.js';
import { deidentifyText } from './deidentify.js';

// Lazy initialization
let _anthropic: Anthropic | null = null;

function getAnthropic(): Anthropic | null {
  if (_anthropic === null && process.env.ANTHROPIC_API_KEY) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _anthropic;
}

/**
 * Pattern-based document classification (fast, no API call)
 */
export function classifyByPatterns(text: string): DocumentType {
  const textLower = text.toLowerCase();

  // Hospital bill indicators
  const billPatterns = [
    'total charges',
    'amount due',
    'balance due',
    'statement date',
    'pay this amount',
    'patient responsibility',
    'service charges',
    'itemized statement',
  ];

  // UB-04 indicators
  const ub04Patterns = [
    'type of bill',
    'form locator',
    'revenue code',
    'hcpcs',
    'occurrence code',
    'value code',
    'ub-04',
    'cms-1450',
  ];

  // Medical record indicators
  const recordPatterns = [
    'history and physical',
    'chief complaint',
    'physical exam',
    'assessment and plan',
    'review of systems',
    'past medical history',
    'progress note',
    'clinical note',
  ];

  // Discharge summary indicators
  const dischargePatterns = [
    'discharge summary',
    'discharge diagnosis',
    'hospital course',
    'discharge instructions',
    'discharge disposition',
    'follow up',
    'condition at discharge',
  ];

  // Insurance EOB indicators
  const eobPatterns = [
    'explanation of benefits',
    'this is not a bill',
    'amount billed',
    'amount allowed',
    'amount paid',
    'patient responsibility',
    'claim number',
    'processed date',
  ];

  // Patient info form indicators
  const patientFormPatterns = [
    'patient registration',
    'patient information',
    'emergency contact',
    'insurance information',
    'responsible party',
    'consent to treat',
    'hipaa acknowledgement',
  ];

  // Count matches
  const scores: Record<DocumentType, number> = {
    HOSPITAL_BILL: 0,
    UB04_CLAIM: 0,
    MEDICAL_RECORD: 0,
    DISCHARGE_SUMMARY: 0,
    INSURANCE_EOB: 0,
    INSURANCE_CARD: 0,
    PATIENT_INFO_FORM: 0,
    MIXED: 0,
    UNKNOWN: 0,
  };

  for (const pattern of billPatterns) {
    if (textLower.includes(pattern)) scores.HOSPITAL_BILL++;
  }

  for (const pattern of ub04Patterns) {
    if (textLower.includes(pattern)) scores.UB04_CLAIM++;
  }

  for (const pattern of recordPatterns) {
    if (textLower.includes(pattern)) scores.MEDICAL_RECORD++;
  }

  for (const pattern of dischargePatterns) {
    if (textLower.includes(pattern)) scores.DISCHARGE_SUMMARY++;
  }

  for (const pattern of eobPatterns) {
    if (textLower.includes(pattern)) scores.INSURANCE_EOB++;
  }

  for (const pattern of patientFormPatterns) {
    if (textLower.includes(pattern)) scores.PATIENT_INFO_FORM++;
  }

  // Find the type with highest score
  let maxType: DocumentType = 'UNKNOWN';
  let maxScore = 0;
  let secondScore = 0;

  for (const [type, score] of Object.entries(scores) as [DocumentType, number][]) {
    if (type !== 'MIXED' && type !== 'UNKNOWN') {
      if (score > maxScore) {
        secondScore = maxScore;
        maxScore = score;
        maxType = type;
      } else if (score > secondScore) {
        secondScore = score;
      }
    }
  }

  // If multiple types have similar scores, it's mixed
  if (maxScore > 0 && secondScore > 0 && secondScore >= maxScore * 0.6) {
    return 'MIXED';
  }

  // If no strong match, return unknown
  if (maxScore < 2) {
    return 'UNKNOWN';
  }

  return maxType;
}

/**
 * AI-based document classification (slower but more accurate)
 * HIPAA COMPLIANCE: De-identifies PHI before sending to AI
 */
export async function classifyWithAI(text: string): Promise<DocumentType> {
  try {
    const anthropic = getAnthropic();
    if (!anthropic) {
      console.log('[Classifier] No AI available, using pattern matching');
      return classifyByPatterns(text);
    }

    // HIPAA: De-identify text before sending to AI
    const deidentified = deidentifyText(text);
    console.log(`[Classifier] De-identified ${deidentified.replacements.length} PHI elements for classification`);

    // Truncate text if too long
    const truncatedText = deidentified.text.length > 3000
      ? deidentified.text.substring(0, 3000) + '...'
      : deidentified.text;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 50,
      temperature: 0,
      system: DOCUMENT_CLASSIFICATION_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Classify this document:\n\n${truncatedText}`,
        },
      ],
    });

    const response = message.content[0].type === 'text' ? message.content[0].text.trim().toUpperCase() : '';

    // Validate response
    const validTypes: DocumentType[] = [
      'HOSPITAL_BILL',
      'UB04_CLAIM',
      'MEDICAL_RECORD',
      'DISCHARGE_SUMMARY',
      'INSURANCE_EOB',
      'INSURANCE_CARD',
      'PATIENT_INFO_FORM',
      'MIXED',
      'UNKNOWN',
    ];

    if (validTypes.includes(response as DocumentType)) {
      return response as DocumentType;
    }

    // Try to match partial response
    for (const type of validTypes) {
      if (response.includes(type)) {
        return type;
      }
    }

    console.log('[Classifier] AI returned invalid type:', response);
    return classifyByPatterns(text);
  } catch (error) {
    console.error('[Classifier] AI classification failed:', error);
    return classifyByPatterns(text);
  }
}

/**
 * Classify document (uses pattern matching first, AI as fallback if uncertain)
 */
export async function classifyDocument(text: string): Promise<{
  type: DocumentType;
  confidence: number;
  method: 'pattern' | 'ai';
}> {
  const patternResult = classifyByPatterns(text);

  // If pattern matching is confident, use it
  if (patternResult !== 'UNKNOWN' && patternResult !== 'MIXED') {
    return {
      type: patternResult,
      confidence: 0.85,
      method: 'pattern',
    };
  }

  // Use AI for uncertain cases
  const aiResult = await classifyWithAI(text);

  return {
    type: aiResult,
    confidence: aiResult === 'UNKNOWN' ? 0.3 : 0.95,
    method: 'ai',
  };
}
