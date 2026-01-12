'use client';

import { useState, useCallback, useRef } from 'react';

interface ExtractedFields {
  patientName?: string;
  dateOfBirth?: string;
  stateOfResidence?: string;
  accountNumber?: string;
  dateOfService?: string;
  encounterType?: 'inpatient' | 'observation' | 'ed' | 'outpatient';
  lengthOfStay?: number;
  totalCharges?: number;
  facilityState?: string;
  facilityType?: string;
  insuranceStatusOnDOS?: string;
  medicaidStatus?: string;
  medicareStatus?: string;
  disabilityLikelihood?: string;
  _confidence: Record<string, number>;
  _documentType?: string;
}

interface ProcessingResult {
  fields: ExtractedFields;
  document: {
    type: string;
    typeConfidence: number;
    classificationMethod: string;
  };
  ocr: {
    engine: string;
    confidence: number;
    textLength: number;
  };
  parsing: {
    confidence: number;
    agreementScore: number;
    modelsUsed: Array<{
      model: string;
      success: boolean;
      confidence: number;
      responseTime: number;
    }>;
  };
  review: {
    lowConfidence: string[];
    highConfidence: string[];
  };
  stats: {
    processingTimeMs: number;
    fastMode?: boolean;
  };
}

interface PDFDocumentUploadProps {
  onFieldsExtracted: (fields: ExtractedFields) => void;
  apiUrl?: string;
  fastMode?: boolean;
}

type ProcessingStage = 'idle' | 'uploading' | 'ocr' | 'parsing' | 'mapping' | 'complete' | 'error';

const STAGE_LABELS: Record<ProcessingStage, string> = {
  idle: 'Ready to upload',
  uploading: 'Uploading document...',
  ocr: 'Extracting text (OCR)...',
  parsing: 'AI parsing data...',
  mapping: 'Mapping fields...',
  complete: 'Processing complete!',
  error: 'Processing failed',
};

const STAGE_PROGRESS: Record<ProcessingStage, number> = {
  idle: 0,
  uploading: 10,
  ocr: 40,
  parsing: 70,
  mapping: 90,
  complete: 100,
  error: 0,
};

export default function PDFDocumentUpload({
  onFieldsExtracted,
  apiUrl = process.env.NEXT_PUBLIC_API_URL || '',
  fastMode = false,
}: PDFDocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [stage, setStage] = useState<ProcessingStage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setSelectedFile(null);
    setStage('idle');
    setError(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const processDocument = useCallback(async (file: File) => {
    setError(null);
    setStage('uploading');

    try {
      // Create form data
      const formData = new FormData();
      formData.append('document', file);

      // Simulate stage progression
      const stageTimeout = (stage: ProcessingStage, delay: number) =>
        new Promise<void>((resolve) => {
          setTimeout(() => {
            setStage(stage);
            resolve();
          }, delay);
        });

      // Start processing
      const processPromise = fetch(
        `${apiUrl}/api/documents/process${fastMode ? '?fastMode=true' : ''}`,
        {
          method: 'POST',
          body: formData,
        }
      );

      // Simulate stage progression while waiting
      await stageTimeout('ocr', 500);
      await stageTimeout('parsing', 2000);
      await stageTimeout('mapping', 1000);

      const response = await processPromise;
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Processing failed');
      }

      setResult(data.data);
      setStage('complete');

      // Pass extracted fields to parent
      onFieldsExtracted(data.data.fields);
    } catch (err) {
      console.error('Document processing error:', err);
      setError(err instanceof Error ? err.message : 'Processing failed');
      setStage('error');
    }
  }, [apiUrl, fastMode, onFieldsExtracted]);

  const handleFile = useCallback(async (file: File) => {
    // Validate file type
    const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/tiff'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a PDF or image file (PNG, JPEG, TIFF)');
      return;
    }

    // Validate file size (50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File too large. Maximum size is 50MB');
      return;
    }

    setSelectedFile(file);
    await processDocument(file);
  }, [processDocument]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (stage !== 'idle' && stage !== 'complete' && stage !== 'error') return;

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [stage, handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (stage === 'idle' || stage === 'complete' || stage === 'error') {
      setIsDragging(true);
    }
  }, [stage]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleClick = useCallback(() => {
    if (stage === 'idle' || stage === 'complete' || stage === 'error') {
      fileInputRef.current?.click();
    }
  }, [stage]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const isProcessing = stage !== 'idle' && stage !== 'complete' && stage !== 'error';

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          isProcessing
            ? 'cursor-wait'
            : 'cursor-pointer'
        } ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : stage === 'error'
            ? 'border-red-300 bg-red-50'
            : stage === 'complete'
            ? 'border-green-300 bg-green-50'
            : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.tiff"
          onChange={handleInputChange}
          className="hidden"
          disabled={isProcessing}
        />

        {isProcessing ? (
          <div className="space-y-4">
            {/* Processing Animation */}
            <div className="flex justify-center">
              <svg
                className="h-12 w-12 text-blue-500 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>

            {/* Stage Label */}
            <p className="text-sm font-medium text-slate-700">
              {STAGE_LABELS[stage]}
            </p>

            {/* Progress Bar */}
            <div className="w-full bg-slate-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${STAGE_PROGRESS[stage]}%` }}
              />
            </div>

            {/* File Info */}
            {selectedFile && (
              <p className="text-xs text-slate-500">
                {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </p>
            )}
          </div>
        ) : stage === 'complete' && result ? (
          <div className="space-y-3">
            {/* Success Icon */}
            <svg
              className="mx-auto h-12 w-12 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>

            {/* Results Summary */}
            <div>
              <p className="text-sm font-medium text-slate-700">
                Document processed successfully!
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {result.document.type} | {result.ocr.engine} |
                {(result.parsing.confidence * 100).toFixed(0)}% confidence
              </p>
            </div>

            {/* Processing Stats */}
            <div className="flex justify-center gap-4 text-xs text-slate-500">
              <span>OCR: {result.ocr.textLength} chars</span>
              <span>Time: {(result.stats.processingTimeMs / 1000).toFixed(1)}s</span>
              <span>
                Models: {result.parsing.modelsUsed.filter(m => m.success).length}/
                {result.parsing.modelsUsed.length}
              </span>
            </div>

            {/* Actions */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                resetState();
              }}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Upload a different document
            </button>
          </div>
        ) : stage === 'error' ? (
          <div className="space-y-3">
            {/* Error Icon */}
            <svg
              className="mx-auto h-12 w-12 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>

            <div>
              <p className="text-sm font-medium text-red-700">
                {error || 'Processing failed'}
              </p>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                resetState();
              }}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Upload Icon */}
            <svg
              className="mx-auto h-12 w-12 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>

            <div>
              <p className="text-sm font-medium text-slate-700">
                <span className="text-blue-600">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-slate-500">
                PDF, PNG, JPEG, or TIFF up to 50MB
              </p>
            </div>

            <p className="text-xs text-slate-400">
              Upload a hospital bill, medical record, or insurance EOB to auto-fill the form
            </p>
          </div>
        )}
      </div>

      {/* Low Confidence Fields Warning */}
      {stage === 'complete' && result && result.review.lowConfidence.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <svg
              className="w-5 h-5 text-amber-500 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-amber-800">
                Please review these fields
              </p>
              <p className="text-xs text-amber-600 mt-1">
                Lower confidence: {result.review.lowConfidence.join(', ')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
