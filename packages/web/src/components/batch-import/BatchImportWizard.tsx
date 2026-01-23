'use client';

import React, { useState, useCallback } from 'react';
import { useBatchImport, ImportOptions } from '../../hooks/useBatchImport';
import { FileUploadStep } from './FileUploadStep';
import { ValidationStep } from './ValidationStep';
import { ProgressStep } from './ProgressStep';
import { ResultsStep } from './ResultsStep';

type WizardStep = 'upload' | 'validate' | 'progress' | 'results';

const STEPS: { id: WizardStep; label: string }[] = [
  { id: 'upload', label: 'Upload' },
  { id: 'validate', label: 'Validate' },
  { id: 'progress', label: 'Import' },
  { id: 'results', label: 'Results' },
];

export function BatchImportWizard() {
  const [step, setStep] = useState<WizardStep>('upload');
  const {
    state,
    uploadFile,
    startImport,
    cancelImport,
    reset,
    subscribeToProgress,
  } = useBatchImport();

  const handleFileSelect = useCallback(async (file: File, options: ImportOptions) => {
    const result = await uploadFile(file, options);
    if (result.success) {
      setStep('validate');
    }
  }, [uploadFile]);

  const handleStartImport = useCallback(async () => {
    setStep('progress');
    subscribeToProgress();
    await startImport();
  }, [startImport, subscribeToProgress]);

  const handleCancel = useCallback(async () => {
    await cancelImport();
    setStep('results');
  }, [cancelImport]);

  const handleReset = useCallback(() => {
    reset();
    setStep('upload');
  }, [reset]);

  const handleComplete = useCallback(() => {
    setStep('results');
  }, []);

  const currentStepIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((s, index) => (
            <div key={s.id} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                  step === s.id
                    ? 'bg-blue-600 text-white'
                    : currentStepIndex > index
                    ? 'bg-green-500 text-white'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {currentStepIndex > index ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`w-16 md:w-24 h-1 mx-2 rounded transition-colors ${
                    currentStepIndex > index ? 'bg-green-500' : 'bg-slate-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-sm text-slate-600">
          {STEPS.map((s) => (
            <span key={s.id} className={step === s.id ? 'font-medium text-slate-900' : ''}>
              {s.label}
            </span>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {state.error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start space-x-3">
          <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <h4 className="text-sm font-medium text-red-800">Error</h4>
            <p className="text-sm text-red-700 mt-1">{state.error}</p>
          </div>
        </div>
      )}

      {/* Step Content */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        {step === 'upload' && (
          <FileUploadStep onFileSelect={handleFileSelect} isLoading={state.isValidating} />
        )}
        {step === 'validate' && (
          <ValidationStep
            validation={state.validation}
            onStartImport={handleStartImport}
            onBack={() => setStep('upload')}
            isLoading={state.isImporting}
          />
        )}
        {step === 'progress' && (
          <ProgressStep
            progress={state.progress}
            onCancel={handleCancel}
            onComplete={handleComplete}
          />
        )}
        {step === 'results' && (
          <ResultsStep
            importId={state.importId}
            progress={state.progress}
            onReset={handleReset}
          />
        )}
      </div>
    </div>
  );
}

export default BatchImportWizard;
