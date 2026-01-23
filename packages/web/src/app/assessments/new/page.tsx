'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAssessments } from '@/hooks/useAssessments';
import PDFDocumentUpload from '@/components/PDFDocumentUpload';
import type { AssessmentFormInput } from '@/types';

// Type for extracted fields from PDF upload
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

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

const initialFormData: AssessmentFormInput = {
  // Patient Demographics
  patientName: '',
  dateOfBirth: '',
  stateOfResidence: '',

  // Encounter Details
  accountNumber: '',
  dateOfService: '',
  encounterType: 'inpatient',
  lengthOfStay: undefined,
  totalCharges: 0,
  facilityState: '',
  facilityType: 'standard',

  // Insurance Status
  insuranceStatusOnDOS: 'uninsured',
  highCostSharing: false,
  medicaidStatus: 'unknown',
  medicaidTerminationDate: undefined,
  medicareStatus: 'none',
  ssiStatus: 'unknown',
  ssdiStatus: 'unknown',

  // Financial Screening
  householdIncome: 'under_fpl',
  householdSize: 1,
  estimatedAssets: 'unknown',

  // Disability Assessment
  disabilityLikelihood: 'medium',
  ssiEligibilityLikely: false,
  ssdiEligibilityLikely: false,

  // Service Details
  emergencyService: false,
  medicallyNecessary: true,
};

export default function NewAssessmentPage() {
  const router = useRouter();
  const { createAssessment, loading } = useAssessments();
  const [formData, setFormData] = useState<AssessmentFormInput>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeSection, setActiveSection] = useState<string>('upload');
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());
  const [documentInfo, setDocumentInfo] = useState<{ type?: string; confidence?: number } | null>(null);

  const sections = [
    { id: 'upload', label: 'Upload Document' },
    { id: 'patient', label: 'Patient Demographics' },
    { id: 'encounter', label: 'Encounter Details' },
    { id: 'insurance', label: 'Insurance Status' },
    { id: 'financial', label: 'Financial Screening' },
    { id: 'disability', label: 'Disability Assessment' },
    { id: 'facility', label: 'Facility & Service' },
  ];

  // Handle extracted fields from PDF upload
  const handleFieldsExtracted = useCallback((fields: ExtractedFields) => {
    const newAutoFilled = new Set<string>();
    const updates: Partial<AssessmentFormInput> = {};

    // Map extracted fields to form fields with confidence threshold
    const confidenceThreshold = 0.5;

    if (fields.patientName && (fields._confidence.patientName || 0) >= confidenceThreshold) {
      updates.patientName = fields.patientName;
      newAutoFilled.add('patientName');
    }
    if (fields.dateOfBirth && (fields._confidence.dateOfBirth || 0) >= confidenceThreshold) {
      updates.dateOfBirth = fields.dateOfBirth;
      newAutoFilled.add('dateOfBirth');
    }
    if (fields.stateOfResidence && (fields._confidence.stateOfResidence || 0) >= confidenceThreshold) {
      updates.stateOfResidence = fields.stateOfResidence;
      newAutoFilled.add('stateOfResidence');
    }
    if (fields.accountNumber && (fields._confidence.accountNumber || 0) >= confidenceThreshold) {
      updates.accountNumber = fields.accountNumber;
      newAutoFilled.add('accountNumber');
    }
    if (fields.dateOfService && (fields._confidence.dateOfService || 0) >= confidenceThreshold) {
      updates.dateOfService = fields.dateOfService;
      newAutoFilled.add('dateOfService');
    }
    if (fields.encounterType && (fields._confidence.encounterType || 0) >= confidenceThreshold) {
      updates.encounterType = fields.encounterType;
      newAutoFilled.add('encounterType');
    }
    if (fields.lengthOfStay && (fields._confidence.lengthOfStay || 0) >= confidenceThreshold) {
      updates.lengthOfStay = fields.lengthOfStay;
      newAutoFilled.add('lengthOfStay');
    }
    if (fields.totalCharges && (fields._confidence.totalCharges || 0) >= confidenceThreshold) {
      updates.totalCharges = fields.totalCharges;
      newAutoFilled.add('totalCharges');
    }
    if (fields.facilityState && (fields._confidence.facilityState || 0) >= confidenceThreshold) {
      updates.facilityState = fields.facilityState;
      newAutoFilled.add('facilityState');
    }
    if (fields.insuranceStatusOnDOS && (fields._confidence.insuranceStatusOnDOS || 0) >= confidenceThreshold) {
      updates.insuranceStatusOnDOS = fields.insuranceStatusOnDOS as AssessmentFormInput['insuranceStatusOnDOS'];
      newAutoFilled.add('insuranceStatusOnDOS');
    }
    if (fields.medicaidStatus && (fields._confidence.medicaidStatus || 0) >= confidenceThreshold) {
      updates.medicaidStatus = fields.medicaidStatus as AssessmentFormInput['medicaidStatus'];
      newAutoFilled.add('medicaidStatus');
    }
    if (fields.medicareStatus && (fields._confidence.medicareStatus || 0) >= confidenceThreshold) {
      updates.medicareStatus = fields.medicareStatus as AssessmentFormInput['medicareStatus'];
      newAutoFilled.add('medicareStatus');
    }
    if (fields.disabilityLikelihood && (fields._confidence.disabilityLikelihood || 0) >= confidenceThreshold) {
      updates.disabilityLikelihood = fields.disabilityLikelihood as AssessmentFormInput['disabilityLikelihood'];
      newAutoFilled.add('disabilityLikelihood');
    }

    // Update form data with extracted fields
    setFormData((prev) => ({ ...prev, ...updates }));
    setAutoFilledFields(newAutoFilled);
    setDocumentInfo({
      type: fields._documentType,
      confidence: Object.values(fields._confidence).reduce((a, b) => a + b, 0) / Object.keys(fields._confidence).length,
    });

    // Navigate to patient section to review extracted data
    if (Object.keys(updates).length > 0) {
      setActiveSection('patient');
    }
  }, []);

  // Helper to check if a field was auto-filled
  const isAutoFilled = (field: string) => autoFilledFields.has(field);

  // Style helper for auto-filled fields
  const getFieldClassName = (field: string, hasError: boolean = false) => {
    const baseClasses = 'w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
    if (hasError) return `${baseClasses} border-red-300`;
    if (isAutoFilled(field)) return `${baseClasses} border-green-300 bg-green-50`;
    return `${baseClasses} border-slate-300`;
  };

  const updateField = <K extends keyof AssessmentFormInput>(
    field: K,
    value: AssessmentFormInput[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const { [field]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.patientName.trim()) {
      newErrors.patientName = 'Patient name is required';
    }
    if (!formData.accountNumber.trim()) {
      newErrors.accountNumber = 'Account number is required';
    }
    if (!formData.dateOfService) {
      newErrors.dateOfService = 'Date of service is required';
    }
    if (formData.totalCharges <= 0) {
      newErrors.totalCharges = 'Total charges must be greater than 0';
    }
    if (!formData.facilityState) {
      newErrors.facilityState = 'Facility state is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const result = await createAssessment(formData);
    if (result) {
      router.push(`/assessments/${result.id}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-2 text-sm mb-4">
          <Link href="/assessments" className="text-slate-500 hover:text-slate-700">
            Assessments
          </Link>
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-slate-900 font-medium">New Assessment</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Create New Assessment</h1>
        <p className="text-slate-500 mt-1">
          Enter patient and encounter details to generate a recovery assessment
        </p>
      </div>

      {/* Section Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6 overflow-hidden">
        <div className="flex overflow-x-auto">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex-1 min-w-fit px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeSection === section.id
                  ? 'border-blue-600 text-blue-600 bg-blue-50'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Upload Document */}
        {activeSection === 'upload' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Upload Document</h2>
              <p className="text-sm text-slate-500 mt-1">
                Upload a hospital bill, medical record, or insurance EOB to auto-fill the form.
                You can skip this step and enter data manually.
              </p>
            </div>

            <PDFDocumentUpload
              onFieldsExtracted={handleFieldsExtracted}
              apiUrl={process.env.NEXT_PUBLIC_API_URL || ''}
              fastMode={false}
            />

            {/* Auto-filled summary */}
            {autoFilledFields.size > 0 && documentInfo && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <svg
                    className="w-5 h-5 text-green-500 mt-0.5"
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
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      {autoFilledFields.size} fields extracted from {documentInfo.type?.replace(/_/g, ' ').toLowerCase() || 'document'}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      Fields highlighted in green have been auto-filled. Click &quot;Next&quot; to review and edit.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Skip upload option */}
            <div className="text-center pt-4 border-t border-slate-200">
              <p className="text-sm text-slate-500 mb-3">
                or continue without uploading
              </p>
              <button
                type="button"
                onClick={() => setActiveSection('patient')}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Enter data manually
              </button>
            </div>
          </div>
        )}

        {/* Patient Demographics */}
        {activeSection === 'patient' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Patient Demographics</h2>
              {autoFilledFields.size > 0 && (
                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                  Auto-filled fields highlighted in green
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Patient Name <span className="text-red-500">*</span>
                  {isAutoFilled('patientName') && (
                    <span className="ml-2 text-xs text-green-600">(auto-filled)</span>
                  )}
                </label>
                <input
                  type="text"
                  value={formData.patientName}
                  onChange={(e) => updateField('patientName', e.target.value)}
                  className={getFieldClassName('patientName', !!errors.patientName)}
                  placeholder="John Smith"
                />
                {errors.patientName && (
                  <p className="mt-1 text-sm text-red-600">{errors.patientName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Date of Birth
                  {isAutoFilled('dateOfBirth') && (
                    <span className="ml-2 text-xs text-green-600">(auto-filled)</span>
                  )}
                </label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => updateField('dateOfBirth', e.target.value)}
                  className={getFieldClassName('dateOfBirth')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  State of Residence
                  {isAutoFilled('stateOfResidence') && (
                    <span className="ml-2 text-xs text-green-600">(auto-filled)</span>
                  )}
                </label>
                <select
                  value={formData.stateOfResidence}
                  onChange={(e) => updateField('stateOfResidence', e.target.value)}
                  className={getFieldClassName('stateOfResidence')}
                >
                  <option value="">Select state...</option>
                  {US_STATES.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Encounter Details */}
        {activeSection === 'encounter' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Encounter Details</h2>
              {autoFilledFields.size > 0 && (
                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                  Auto-filled fields highlighted in green
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Account Number <span className="text-red-500">*</span>
                  {isAutoFilled('accountNumber') && (
                    <span className="ml-2 text-xs text-green-600">(auto-filled)</span>
                  )}
                </label>
                <input
                  type="text"
                  value={formData.accountNumber}
                  onChange={(e) => updateField('accountNumber', e.target.value)}
                  className={getFieldClassName('accountNumber', !!errors.accountNumber)}
                  placeholder="ACC-123456"
                />
                {errors.accountNumber && (
                  <p className="mt-1 text-sm text-red-600">{errors.accountNumber}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Date of Service <span className="text-red-500">*</span>
                  {isAutoFilled('dateOfService') && (
                    <span className="ml-2 text-xs text-green-600">(auto-filled)</span>
                  )}
                </label>
                <input
                  type="date"
                  value={formData.dateOfService}
                  onChange={(e) => updateField('dateOfService', e.target.value)}
                  className={getFieldClassName('dateOfService', !!errors.dateOfService)}
                />
                {errors.dateOfService && (
                  <p className="mt-1 text-sm text-red-600">{errors.dateOfService}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Encounter Type
                  {isAutoFilled('encounterType') && (
                    <span className="ml-2 text-xs text-green-600">(auto-filled)</span>
                  )}
                </label>
                <select
                  value={formData.encounterType}
                  onChange={(e) =>
                    updateField('encounterType', e.target.value as AssessmentFormInput['encounterType'])
                  }
                  className={getFieldClassName('encounterType')}
                >
                  <option value="inpatient">Inpatient</option>
                  <option value="observation">Observation</option>
                  <option value="ed">Emergency Department</option>
                  <option value="outpatient">Outpatient</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Length of Stay (days)
                  {isAutoFilled('lengthOfStay') && (
                    <span className="ml-2 text-xs text-green-600">(auto-filled)</span>
                  )}
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.lengthOfStay || ''}
                  onChange={(e) =>
                    updateField('lengthOfStay', e.target.value ? parseInt(e.target.value) : undefined)
                  }
                  className={getFieldClassName('lengthOfStay')}
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Total Charges <span className="text-red-500">*</span>
                  {isAutoFilled('totalCharges') && (
                    <span className="ml-2 text-xs text-green-600">(auto-filled)</span>
                  )}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.totalCharges || ''}
                    onChange={(e) => updateField('totalCharges', parseFloat(e.target.value) || 0)}
                    className={`${getFieldClassName('totalCharges', !!errors.totalCharges)} pl-7`}
                    placeholder="0.00"
                  />
                </div>
                {errors.totalCharges && (
                  <p className="mt-1 text-sm text-red-600">{errors.totalCharges}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Insurance Status */}
        {activeSection === 'insurance' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Insurance & Program Status</h2>
              {autoFilledFields.size > 0 && (
                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                  Auto-filled fields highlighted in green
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Insurance Status on DOS
                  {isAutoFilled('insuranceStatusOnDOS') && (
                    <span className="ml-2 text-xs text-green-600">(auto-filled)</span>
                  )}
                </label>
                <select
                  value={formData.insuranceStatusOnDOS}
                  onChange={(e) =>
                    updateField(
                      'insuranceStatusOnDOS',
                      e.target.value as AssessmentFormInput['insuranceStatusOnDOS']
                    )
                  }
                  className={getFieldClassName('insuranceStatusOnDOS')}
                >
                  <option value="uninsured">Uninsured</option>
                  <option value="underinsured">Underinsured</option>
                  <option value="medicaid">Medicaid</option>
                  <option value="medicare">Medicare</option>
                  <option value="commercial">Commercial</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Medicaid Status
                  {isAutoFilled('medicaidStatus') && (
                    <span className="ml-2 text-xs text-green-600">(auto-filled)</span>
                  )}
                </label>
                <select
                  value={formData.medicaidStatus}
                  onChange={(e) =>
                    updateField('medicaidStatus', e.target.value as AssessmentFormInput['medicaidStatus'])
                  }
                  className={getFieldClassName('medicaidStatus')}
                >
                  <option value="unknown">Unknown</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="recently_terminated">Recently Terminated</option>
                  <option value="never">Never Enrolled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Medicare Status
                  {isAutoFilled('medicareStatus') && (
                    <span className="ml-2 text-xs text-green-600">(auto-filled)</span>
                  )}
                </label>
                <select
                  value={formData.medicareStatus}
                  onChange={(e) =>
                    updateField('medicareStatus', e.target.value as AssessmentFormInput['medicareStatus'])
                  }
                  className={getFieldClassName('medicareStatus')}
                >
                  <option value="none">None</option>
                  <option value="active_part_a">Active Part A</option>
                  <option value="active_part_b">Active Part B</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">SSI Status</label>
                <select
                  value={formData.ssiStatus}
                  onChange={(e) =>
                    updateField('ssiStatus', e.target.value as AssessmentFormInput['ssiStatus'])
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="unknown">Unknown</option>
                  <option value="receiving">Receiving</option>
                  <option value="pending">Pending</option>
                  <option value="denied">Denied</option>
                  <option value="never_applied">Never Applied</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">SSDI Status</label>
                <select
                  value={formData.ssdiStatus}
                  onChange={(e) =>
                    updateField('ssdiStatus', e.target.value as AssessmentFormInput['ssdiStatus'])
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="unknown">Unknown</option>
                  <option value="receiving">Receiving</option>
                  <option value="pending">Pending</option>
                  <option value="denied">Denied</option>
                  <option value="never_applied">Never Applied</option>
                </select>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="highCostSharing"
                  checked={formData.highCostSharing}
                  onChange={(e) => updateField('highCostSharing', e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="highCostSharing" className="text-sm text-slate-700">
                  High cost sharing (underinsured)
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Financial Screening */}
        {activeSection === 'financial' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
            <h2 className="text-lg font-semibold text-slate-900">Financial Screening</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Household Income (% FPL)
                </label>
                <select
                  value={formData.householdIncome}
                  onChange={(e) =>
                    updateField('householdIncome', e.target.value as AssessmentFormInput['householdIncome'])
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="under_fpl">Under 100% FPL</option>
                  <option value="fpl_138">100-138% FPL</option>
                  <option value="fpl_200">139-200% FPL</option>
                  <option value="fpl_250">201-250% FPL</option>
                  <option value="fpl_300">251-300% FPL</option>
                  <option value="fpl_400">301-400% FPL</option>
                  <option value="over_400_fpl">Over 400% FPL</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Household Size</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={formData.householdSize}
                  onChange={(e) => updateField('householdSize', parseInt(e.target.value) || 1)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Estimated Assets</label>
                <select
                  value={formData.estimatedAssets}
                  onChange={(e) =>
                    updateField('estimatedAssets', e.target.value as AssessmentFormInput['estimatedAssets'])
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="unknown">Unknown</option>
                  <option value="under_2000">Under $2,000</option>
                  <option value="2000_5000">$2,000 - $5,000</option>
                  <option value="5000_10000">$5,000 - $10,000</option>
                  <option value="over_10000">Over $10,000</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Disability Assessment */}
        {activeSection === 'disability' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Disability Assessment</h2>
              {autoFilledFields.size > 0 && (
                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                  Auto-filled fields highlighted in green
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Disability Likelihood
                  {isAutoFilled('disabilityLikelihood') && (
                    <span className="ml-2 text-xs text-green-600">(auto-filled)</span>
                  )}
                </label>
                <select
                  value={formData.disabilityLikelihood}
                  onChange={(e) =>
                    updateField(
                      'disabilityLikelihood',
                      e.target.value as AssessmentFormInput['disabilityLikelihood']
                    )
                  }
                  className={getFieldClassName('disabilityLikelihood')}
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="ssiEligibilityLikely"
                    checked={formData.ssiEligibilityLikely}
                    onChange={(e) => updateField('ssiEligibilityLikely', e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="ssiEligibilityLikely" className="text-sm text-slate-700">
                    SSI eligibility likely
                  </label>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="ssdiEligibilityLikely"
                    checked={formData.ssdiEligibilityLikely}
                    onChange={(e) => updateField('ssdiEligibilityLikely', e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="ssdiEligibilityLikely" className="text-sm text-slate-700">
                    SSDI eligibility likely
                  </label>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Facility & Service */}
        {activeSection === 'facility' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Facility & Service Information</h2>
              {autoFilledFields.size > 0 && (
                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                  Auto-filled fields highlighted in green
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Facility State <span className="text-red-500">*</span>
                  {isAutoFilled('facilityState') && (
                    <span className="ml-2 text-xs text-green-600">(auto-filled)</span>
                  )}
                </label>
                <select
                  value={formData.facilityState}
                  onChange={(e) => updateField('facilityState', e.target.value)}
                  className={getFieldClassName('facilityState', !!errors.facilityState)}
                >
                  <option value="">Select state...</option>
                  {US_STATES.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
                {errors.facilityState && (
                  <p className="mt-1 text-sm text-red-600">{errors.facilityState}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Facility Type</label>
                <select
                  value={formData.facilityType}
                  onChange={(e) =>
                    updateField('facilityType', e.target.value as AssessmentFormInput['facilityType'])
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="standard">Standard</option>
                  <option value="public_hospital">Public Hospital</option>
                  <option value="dsh_hospital">DSH Hospital</option>
                  <option value="safety_net">Safety Net</option>
                  <option value="critical_access">Critical Access</option>
                </select>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="emergencyService"
                  checked={formData.emergencyService}
                  onChange={(e) => updateField('emergencyService', e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="emergencyService" className="text-sm text-slate-700">
                  Emergency service
                </label>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="medicallyNecessary"
                  checked={formData.medicallyNecessary}
                  onChange={(e) => updateField('medicallyNecessary', e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="medicallyNecessary" className="text-sm text-slate-700">
                  Medically necessary
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="mt-8 flex items-center justify-between">
          <Link
            href="/assessments"
            className="inline-flex items-center text-slate-600 hover:text-slate-900 font-medium"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Cancel
          </Link>

          <div className="flex items-center space-x-4">
            {activeSection !== 'upload' && (
              <button
                type="button"
                onClick={() => {
                  const currentIndex = sections.findIndex((s) => s.id === activeSection);
                  if (currentIndex > 0) {
                    setActiveSection(sections[currentIndex - 1].id);
                  }
                }}
                className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
              >
                Previous
              </button>
            )}

            {activeSection !== 'facility' ? (
              <button
                type="button"
                onClick={() => {
                  const currentIndex = sections.findIndex((s) => s.id === activeSection);
                  if (currentIndex < sections.length - 1) {
                    setActiveSection(sections[currentIndex + 1].id);
                  }
                }}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                {activeSection === 'upload' ? 'Skip Upload' : 'Next'}
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                    Creating...
                  </>
                ) : (
                  <>
                    Create Assessment
                    <svg
                      className="w-4 h-4 ml-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
