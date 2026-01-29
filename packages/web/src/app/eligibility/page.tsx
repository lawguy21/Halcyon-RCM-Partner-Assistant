'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useEligibility, type EligibilityScreeningInput, type EligibilityResult, type StateEligibilityInfo } from '@/hooks/useEligibility';

const US_STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' },
];

const EMPLOYMENT_STATUS_OPTIONS = [
  { value: 'employed', label: 'Employed' },
  { value: 'unemployed', label: 'Unemployed' },
  { value: 'self_employed', label: 'Self-Employed' },
  { value: 'retired', label: 'Retired' },
  { value: 'student', label: 'Student' },
  { value: 'disabled', label: 'Disabled/Unable to Work' },
];

const INSURANCE_STATUS_OPTIONS = [
  { value: 'uninsured', label: 'Uninsured' },
  { value: 'medicare_only', label: 'Medicare Only' },
  { value: 'medicaid_only', label: 'Medicaid Only' },
  { value: 'commercial', label: 'Commercial Insurance' },
  { value: 'dual_eligible', label: 'Dual Eligible (Medicare + Medicaid)' },
];

interface FormData {
  patientName: string;
  dateOfBirth: string;
  stateOfResidence: string;
  householdIncome: number;
  householdSize: number;
  incomeFrequency: 'annual' | 'monthly';
  employmentStatus: string;
  isDisabled: boolean;
  hasEndStageRenalDisease: boolean;
  hasALS: boolean;
  isReceivingSSDI: boolean;
  ssdiStartDate: string;
  insuranceStatus: string;
  hasMedicare: boolean;
  hasMedicaid: boolean;
  medicaidStatus: 'active' | 'pending' | 'denied' | 'none';
  dateOfService: string;
}

const initialFormData: FormData = {
  patientName: '',
  dateOfBirth: '',
  stateOfResidence: '',
  householdIncome: 0,
  householdSize: 1,
  incomeFrequency: 'annual',
  employmentStatus: 'employed',
  isDisabled: false,
  hasEndStageRenalDisease: false,
  hasALS: false,
  isReceivingSSDI: false,
  ssdiStartDate: '',
  insuranceStatus: 'uninsured',
  hasMedicare: false,
  hasMedicaid: false,
  medicaidStatus: 'none',
  dateOfService: '',
};

export default function EligibilityPage() {
  const {
    loading,
    error,
    screenEligibility,
    getStateInfo,
    getAllStates,
  } = useEligibility();

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<EligibilityResult | null>(null);
  const [stateInfo, setStateInfo] = useState<StateEligibilityInfo | null>(null);
  const [allStates, setAllStates] = useState<StateEligibilityInfo[]>([]);
  const [showResults, setShowResults] = useState(false);

  // Load all states info on mount
  useEffect(() => {
    const loadStates = async () => {
      const states = await getAllStates();
      setAllStates(states);
    };
    loadStates();
  }, [getAllStates]);

  // Load state-specific info when state changes
  useEffect(() => {
    const loadStateInfo = async () => {
      if (formData.stateOfResidence) {
        const info = await getStateInfo(formData.stateOfResidence);
        setStateInfo(info);
      } else {
        setStateInfo(null);
      }
    };
    loadStateInfo();
  }, [formData.stateOfResidence, getStateInfo]);

  const updateField = useCallback(<K extends keyof FormData>(
    field: K,
    value: FormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const { [field]: _, ...rest } = prev;
        return rest;
      });
    }
  }, [formErrors]);

  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.patientName.trim()) {
      errors.patientName = 'Patient name is required';
    }
    if (!formData.dateOfBirth) {
      errors.dateOfBirth = 'Date of birth is required';
    }
    if (!formData.stateOfResidence) {
      errors.stateOfResidence = 'State of residence is required';
    }
    if (formData.householdSize < 1) {
      errors.householdSize = 'Household size must be at least 1';
    }
    if (formData.householdIncome < 0) {
      errors.householdIncome = 'Household income cannot be negative';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const input: EligibilityScreeningInput = {
      dateOfBirth: formData.dateOfBirth,
      stateOfResidence: formData.stateOfResidence,
      householdSize: formData.householdSize,
      householdIncome: formData.incomeFrequency === 'monthly'
        ? formData.householdIncome * 12
        : formData.householdIncome,
      incomeFrequency: 'annual',
      isDisabled: formData.isDisabled,
      hasEndStageRenalDisease: formData.hasEndStageRenalDisease,
      hasALS: formData.hasALS,
      isReceivingSSDI: formData.isReceivingSSDI,
      ssdiStartDate: formData.ssdiStartDate || undefined,
      hasMedicare: formData.hasMedicare,
      hasMedicaid: formData.hasMedicaid,
      medicaidStatus: formData.medicaidStatus,
      dateOfService: formData.dateOfService || undefined,
    };

    const screeningResult = await screenEligibility(input);
    if (screeningResult) {
      setResult(screeningResult);
      setShowResults(true);
    }
  }, [formData, validateForm, screenEligibility]);

  const handleReset = useCallback(() => {
    setFormData(initialFormData);
    setFormErrors({});
    setResult(null);
    setShowResults(false);
    setStateInfo(null);
  }, []);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const formatPercentage = (value: number) =>
    `${Math.round(value)}%`;

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 75) return 'text-green-600 bg-green-100';
    if (confidence >= 50) return 'text-amber-600 bg-amber-100';
    return 'text-red-600 bg-red-100';
  };

  const getEligibilityBadge = (isEligible: boolean, confidence: number) => {
    if (isEligible) {
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getConfidenceColor(confidence)}`}>
          Likely Eligible ({formatPercentage(confidence)} confidence)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-slate-600 bg-slate-100">
        Not Eligible
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Eligibility Screening</h2>
          <p className="text-slate-500 mt-1">
            Screen patients for Medicaid and Medicare eligibility
          </p>
        </div>
        {showResults && (
          <button
            onClick={handleReset}
            className="inline-flex items-center px-4 py-2 border border-slate-300 bg-white text-slate-700 rounded-lg hover:bg-slate-50 font-medium text-sm"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            New Screening
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start space-x-3">
          <svg className="w-5 h-5 text-red-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-red-800">Error</h4>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {!showResults ? (
        /* Screening Form */
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient Information */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Patient Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Patient Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.patientName}
                  onChange={(e) => updateField('patientName', e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    formErrors.patientName ? 'border-red-300' : 'border-slate-300'
                  }`}
                  placeholder="John Smith"
                />
                {formErrors.patientName && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.patientName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => updateField('dateOfBirth', e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    formErrors.dateOfBirth ? 'border-red-300' : 'border-slate-300'
                  }`}
                />
                {formErrors.dateOfBirth && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.dateOfBirth}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  State of Residence <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.stateOfResidence}
                  onChange={(e) => updateField('stateOfResidence', e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    formErrors.stateOfResidence ? 'border-red-300' : 'border-slate-300'
                  }`}
                >
                  <option value="">Select state...</option>
                  {US_STATES.map((state) => (
                    <option key={state.code} value={state.code}>
                      {state.name}
                    </option>
                  ))}
                </select>
                {formErrors.stateOfResidence && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.stateOfResidence}</p>
                )}
              </div>
            </div>

            {/* State Info Banner */}
            {stateInfo && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium text-blue-800">{stateInfo.stateName}</span>
                  {stateInfo.isExpansionState && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Medicaid Expansion State
                    </span>
                  )}
                  {stateInfo.hasPresumptiveEligibility && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      Presumptive Eligibility
                    </span>
                  )}
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  Retroactive coverage window: {stateInfo.retroactiveWindow} months
                </p>
              </div>
            )}
          </div>

          {/* Household & Income */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Household & Income</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Household Income <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={formData.householdIncome || ''}
                    onChange={(e) => updateField('householdIncome', parseFloat(e.target.value) || 0)}
                    className={`w-full border rounded-lg pl-7 pr-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.householdIncome ? 'border-red-300' : 'border-slate-300'
                    }`}
                    placeholder="0"
                  />
                </div>
                {formErrors.householdIncome && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.householdIncome}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Income Frequency
                </label>
                <select
                  value={formData.incomeFrequency}
                  onChange={(e) => updateField('incomeFrequency', e.target.value as 'annual' | 'monthly')}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="annual">Annual</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Household Size <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={formData.householdSize}
                  onChange={(e) => updateField('householdSize', parseInt(e.target.value) || 1)}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    formErrors.householdSize ? 'border-red-300' : 'border-slate-300'
                  }`}
                />
                {formErrors.householdSize && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.householdSize}</p>
                )}
              </div>
            </div>
          </div>

          {/* Employment & Disability Status */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Employment & Disability Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Employment Status
                </label>
                <select
                  value={formData.employmentStatus}
                  onChange={(e) => updateField('employmentStatus', e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {EMPLOYMENT_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">
                  Disability Status
                </label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={formData.isDisabled}
                      onChange={(e) => updateField('isDisabled', e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700">Has a disability</span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={formData.hasEndStageRenalDisease}
                      onChange={(e) => updateField('hasEndStageRenalDisease', e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700">End-Stage Renal Disease (ESRD)</span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={formData.hasALS}
                      onChange={(e) => updateField('hasALS', e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700">Amyotrophic Lateral Sclerosis (ALS)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="flex items-center space-x-3 mb-2">
                  <input
                    type="checkbox"
                    checked={formData.isReceivingSSDI}
                    onChange={(e) => updateField('isReceivingSSDI', e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Receiving SSDI</span>
                </label>
                {formData.isReceivingSSDI && (
                  <div className="ml-7">
                    <label className="block text-sm text-slate-600 mb-1">SSDI Start Date</label>
                    <input
                      type="date"
                      value={formData.ssdiStartDate}
                      onChange={(e) => updateField('ssdiStartDate', e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Insurance Status */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Insurance Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Current Insurance Status
                </label>
                <select
                  value={formData.insuranceStatus}
                  onChange={(e) => updateField('insuranceStatus', e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {INSURANCE_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Medicaid Application Status
                </label>
                <select
                  value={formData.medicaidStatus}
                  onChange={(e) => updateField('medicaidStatus', e.target.value as FormData['medicaidStatus'])}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="none">Not Applied</option>
                  <option value="pending">Application Pending</option>
                  <option value="active">Currently Active</option>
                  <option value="denied">Previously Denied</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.hasMedicare}
                    onChange={(e) => updateField('hasMedicare', e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Has Medicare coverage</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.hasMedicaid}
                    onChange={(e) => updateField('hasMedicaid', e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Has Medicaid coverage</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Date of Service (Optional)
                </label>
                <input
                  type="date"
                  value={formData.dateOfService}
                  onChange={(e) => updateField('dateOfService', e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Used to calculate retroactive coverage eligibility
                </p>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center text-slate-600 hover:text-slate-900 font-medium"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Cancel
            </Link>

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
                  Screening...
                </>
              ) : (
                <>
                  Screen Eligibility
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        /* Screening Results */
        result && (
          <div className="space-y-6">
            {/* Summary Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-900">Screening Results</h3>
                <span className="text-sm text-slate-500">
                  Patient: {formData.patientName}
                </span>
              </div>

              {/* Recommendation Banner */}
              <div className={`p-4 rounded-lg mb-6 ${
                result.recommendation.confidence >= 75
                  ? 'bg-green-50 border border-green-200'
                  : result.recommendation.confidence >= 50
                    ? 'bg-amber-50 border border-amber-200'
                    : 'bg-slate-50 border border-slate-200'
              }`}>
                <div className="flex items-start space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    result.recommendation.confidence >= 75
                      ? 'bg-green-100'
                      : result.recommendation.confidence >= 50
                        ? 'bg-amber-100'
                        : 'bg-slate-100'
                  }`}>
                    <svg className={`w-5 h-5 ${
                      result.recommendation.confidence >= 75
                        ? 'text-green-600'
                        : result.recommendation.confidence >= 50
                          ? 'text-amber-600'
                          : 'text-slate-600'
                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-slate-900">
                      Primary Path: {result.recommendation.primaryPath}
                    </h4>
                    <p className="text-sm text-slate-600 mt-1">
                      Confidence: {formatPercentage(result.recommendation.confidence)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Results Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* MAGI Results */}
                <div className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-slate-900">MAGI Calculation</h4>
                    {getEligibilityBadge(result.magi.isEligible, result.magi.confidence)}
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Total MAGI:</span>
                      <span className="font-medium text-slate-900">{formatCurrency(result.magi.totalMAGI)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">FPL Percentage:</span>
                      <span className="font-medium text-slate-900">{formatPercentage(result.magi.fplPercentage)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Counted Income:</span>
                      <span className="text-slate-900">{formatCurrency(result.magi.incomeBreakdown.countedIncome)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Disregards:</span>
                      <span className="text-slate-900">{formatCurrency(result.magi.incomeBreakdown.disregards)}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
                      <span className="text-slate-600">Net Countable Income:</span>
                      <span className="font-medium text-slate-900">{formatCurrency(result.magi.incomeBreakdown.netCountableIncome)}</span>
                    </div>
                  </div>
                </div>

                {/* Presumptive Eligibility */}
                <div className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-slate-900">Presumptive Eligibility</h4>
                    {getEligibilityBadge(result.presumptive.isEligible, result.presumptive.confidence)}
                  </div>
                  {result.presumptive.isEligible ? (
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-slate-600">Programs Available:</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {result.presumptive.programsAvailable.map((program) => (
                            <span
                              key={program}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800"
                            >
                              {program}
                            </span>
                          ))}
                        </div>
                      </div>
                      {result.presumptive.coverageEndDate && (
                        <div className="flex justify-between">
                          <span className="text-slate-600">Coverage End Date:</span>
                          <span className="text-slate-900">{result.presumptive.coverageEndDate}</span>
                        </div>
                      )}
                      {result.presumptive.applicationDeadline && (
                        <div className="flex justify-between">
                          <span className="text-slate-600">Application Deadline:</span>
                          <span className="font-medium text-amber-600">{result.presumptive.applicationDeadline}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">Not eligible for presumptive eligibility programs.</p>
                  )}
                </div>

                {/* Retroactive Coverage */}
                <div className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-slate-900">Retroactive Coverage</h4>
                    {getEligibilityBadge(result.retroactive.isEligible, result.retroactive.confidence)}
                  </div>
                  {result.retroactive.isEligible ? (
                    <div className="space-y-2 text-sm">
                      {result.retroactive.coverageStartDate && (
                        <div className="flex justify-between">
                          <span className="text-slate-600">Coverage Start Date:</span>
                          <span className="text-slate-900">{result.retroactive.coverageStartDate}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-slate-600">Months Covered:</span>
                        <span className="font-medium text-slate-900">{result.retroactive.monthsCovered}</span>
                      </div>
                      {result.retroactive.hasWaiverRestriction && (
                        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                          This state has waiver restrictions that may affect retroactive coverage.
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">Not eligible for retroactive coverage.</p>
                  )}
                </div>

                {/* Medicare Eligibility */}
                <div className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-slate-900">Medicare Eligibility</h4>
                    {getEligibilityBadge(result.medicare.isEligible, result.medicare.confidence)}
                  </div>
                  {result.medicare.isEligible ? (
                    <div className="space-y-2 text-sm">
                      {result.medicare.eligibilityBasis && (
                        <div className="flex justify-between">
                          <span className="text-slate-600">Eligibility Basis:</span>
                          <span className="text-slate-900">{result.medicare.eligibilityBasis}</span>
                        </div>
                      )}
                      {result.medicare.eligibilityDate && (
                        <div className="flex justify-between">
                          <span className="text-slate-600">Eligibility Date:</span>
                          <span className="text-slate-900">{result.medicare.eligibilityDate}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">Not eligible for Medicare at this time.</p>
                  )}
                </div>

                {/* Dual Eligible Status */}
                {result.dualEligible && (
                  <div className="border border-slate-200 rounded-lg p-4 md:col-span-2">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-slate-900">Dual-Eligible Status</h4>
                      {result.dualEligible.isDualEligible ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getConfidenceColor(result.dualEligible.confidence)}`}>
                          Dual Eligible ({formatPercentage(result.dualEligible.confidence)} confidence)
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-slate-600 bg-slate-100">
                          Not Dual Eligible
                        </span>
                      )}
                    </div>
                    {result.dualEligible.isDualEligible && (
                      <div className="space-y-3 text-sm">
                        {result.dualEligible.category && (
                          <div className="flex justify-between">
                            <span className="text-slate-600">Category:</span>
                            <span className="font-medium text-slate-900">{result.dualEligible.category}</span>
                          </div>
                        )}
                        {result.dualEligible.billingInstructions && result.dualEligible.billingInstructions.length > 0 && (
                          <div>
                            <span className="text-slate-600">Billing Instructions:</span>
                            <ul className="mt-1 space-y-1">
                              {result.dualEligible.billingInstructions.map((instruction, index) => (
                                <li key={index} className="flex items-start space-x-2">
                                  <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span className="text-slate-700">{instruction}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Immediate Actions */}
            {result.recommendation.immediateActions.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Immediate Actions</h3>
                <ul className="space-y-2">
                  {result.recommendation.immediateActions.map((action, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </span>
                      <span className="text-slate-700">{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Documents Needed */}
            {result.recommendation.documentsNeeded.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Documents Needed</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {result.recommendation.documentsNeeded.map((doc, index) => (
                    <div key={index} className="flex items-center space-x-2 p-2 bg-slate-50 rounded-lg">
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-sm text-slate-700">{doc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleReset}
                className="inline-flex items-center text-slate-600 hover:text-slate-900 font-medium"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                New Screening
              </button>

              <div className="flex items-center space-x-4">
                <button
                  type="button"
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium text-sm"
                >
                  Print Results
                </button>
                <Link
                  href="/assessments/new"
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium inline-flex items-center"
                >
                  Create Assessment
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}
