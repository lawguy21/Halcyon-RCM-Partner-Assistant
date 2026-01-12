/**
 * OCR Service Types
 * Type definitions for OCR processing
 */

export interface OCRResult {
  text: string;
  confidence: number;
  keyValuePairs: Record<string, string>;
  success: boolean;
  engine: string;
}

export interface OCREngineResult {
  text: string;
  confidence: number;
  keyValuePairs: Record<string, string>;
  success: boolean;
}

export interface MultiOCRResults {
  textract: OCREngineResult;
  google: OCREngineResult;
  azure: OCREngineResult;
  best: OCRResult;
}

export interface OCRConfig {
  maxRetries?: number;
  timeoutMs?: number;
}

export const DEFAULT_OCR_CONFIG: OCRConfig = {
  maxRetries: 3,
  timeoutMs: 60000,
};
