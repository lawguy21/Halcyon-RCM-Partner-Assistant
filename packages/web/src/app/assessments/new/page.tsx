'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAssessments } from '@/hooks/useAssessments';
import type { AssessmentFormInput } from '@/types';

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
  const [activeSection, setActiveSection] = useState<string>('patient');

  const sections = [
    { id: 'patient', label: 'Patient Demographics' },
    { id: 'encounter', label: 'Encounter Details' },
    { id: 'insurance', label: 'Insurance Status' },
    { id: 'financial', label: 'Financial Screening' },
    { id: 'disability', label: 'Disability Assessment' },
    { id: 'facility', label: 'Facility & Service' },
  ];

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
        {/* Patient Demographics */}
        {activeSection === 'patient' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
            <h2 className="text-lg font-semibold text-slate-900">Patient Demographics</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Patient Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.patientName}
                  onChange={(e) => updateField('patientName', e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.patientName ? 'border-red-300' : 'border-slate-300'
                  }`}
                  placeholder="John Smith"
                />
                {errors.patientName && (
                  <p className="mt-1 text-sm text-red-600">{errors.patientName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => updateField('dateOfBirth', e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  State of Residence
                </label>
                <select
                  value={formData.stateOfResidence}
                  onChange={(e) => updateField('stateOfResidence', e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            <h2 className="text-lg font-semibold text-slate-900">Encounter Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Account Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.accountNumber}
                  onChange={(e) => updateField('accountNumber', e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.accountNumber ? 'border-red-300' : 'border-slate-300'
                  }`}
                  placeholder="ACC-123456"
                />
                {errors.accountNumber && (
                  <p className="mt-1 text-sm text-red-600">{errors.accountNumber}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Date of Service <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.dateOfService}
                  onChange={(e) => updateField('dateOfService', e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.dateOfService ? 'border-red-300' : 'border-slate-300'
                  }`}
                />
                {errors.dateOfService && (
                  <p className="mt-1 text-sm text-red-600">{errors.dateOfService}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Encounter Type
                </label>
                <select
                  value={formData.encounterType}
                  onChange={(e) =>
                    updateField('encounterType', e.target.value as AssessmentFormInput['encounterType'])
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.lengthOfStay || ''}
                  onChange={(e) =>
                    updateField('lengthOfStay', e.target.value ? parseInt(e.target.value) : undefined)
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Total Charges <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.totalCharges || ''}
                    onChange={(e) => updateField('totalCharges', parseFloat(e.target.value) || 0)}
                    className={`w-full border rounded-lg pl-7 pr-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.totalCharges ? 'border-red-300' : 'border-slate-300'
                    }`}
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
            <h2 className="text-lg font-semibold text-slate-900">Insurance & Program Status</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Insurance Status on DOS
                </label>
                <select
                  value={formData.insuranceStatusOnDOS}
                  onChange={(e) =>
                    updateField(
                      'insuranceStatusOnDOS',
                      e.target.value as AssessmentFormInput['insuranceStatusOnDOS']
                    )
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                </label>
                <select
                  value={formData.medicaidStatus}
                  onChange={(e) =>
                    updateField('medicaidStatus', e.target.value as AssessmentFormInput['medicaidStatus'])
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                </label>
                <select
                  value={formData.medicareStatus}
                  onChange={(e) =>
                    updateField('medicareStatus', e.target.value as AssessmentFormInput['medicareStatus'])
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            <h2 className="text-lg font-semibold text-slate-900">Disability Assessment</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Disability Likelihood
                </label>
                <select
                  value={formData.disabilityLikelihood}
                  onChange={(e) =>
                    updateField(
                      'disabilityLikelihood',
                      e.target.value as AssessmentFormInput['disabilityLikelihood']
                    )
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            <h2 className="text-lg font-semibold text-slate-900">Facility & Service Information</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Facility State <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.facilityState}
                  onChange={(e) => updateField('facilityState', e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.facilityState ? 'border-red-300' : 'border-slate-300'
                  }`}
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
            {activeSection !== 'patient' && (
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
                Next
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
