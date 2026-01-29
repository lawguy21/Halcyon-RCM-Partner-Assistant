'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';

// ============================================================================
// Types
// ============================================================================

interface ServiceItem {
  cptCode: string;
  description: string;
  units: number;
  modifiers?: string[];
}

interface ShoppableService {
  code: string;
  description: string;
  category: string;
  averagePrice: number;
  isCmsSpecified: boolean;
}

interface EstimateBreakdown {
  cptCode: string;
  description: string;
  units: number;
  grossCharge: number;
  allowedAmount: number;
  contractualAdjustment: number;
  expectedPayment: number;
  patientResponsibility: number;
  notes?: string;
}

interface EstimateResult {
  id: string;
  grossCharges: number;
  contractualAdjustment: number;
  expectedAllowed: number;
  patientResponsibility: {
    deductible: number;
    copay: number;
    coinsurance: number;
    total: number;
  };
  insurancePayment: number;
  breakdown: EstimateBreakdown[];
  estimateType: string;
  disclaimer: string;
  validUntil: string;
  confidenceLevel: number;
  notes: string[];
}

interface BenefitsInfo {
  planName?: string;
  deductible: number;
  outOfPocketMax: number;
  coinsurance: number;
  copay?: number;
  isInNetwork: boolean;
}

// ============================================================================
// Component
// ============================================================================

export default function PriceEstimatePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ShoppableService[]>([]);
  const [selectedServices, setSelectedServices] = useState<ServiceItem[]>([]);
  const [estimate, setEstimate] = useState<EstimateResult | null>(null);
  const [showResults, setShowResults] = useState(false);

  // Insurance information
  const [hasInsurance, setHasInsurance] = useState(false);
  const [benefits, setBenefits] = useState<BenefitsInfo>({
    planName: '',
    deductible: 0,
    outOfPocketMax: 0,
    coinsurance: 0.2,
    copay: 0,
    isInNetwork: true,
  });

  // Load popular services on mount
  useEffect(() => {
    fetchServices('');
  }, []);

  // Search services
  const fetchServices = useCallback(async (query: string) => {
    try {
      const url = query
        ? `/api/transparency/shoppable-services?search=${encodeURIComponent(query)}&limit=20`
        : '/api/transparency/shoppable-services?limit=20';

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setSearchResults(data.data);
      }
    } catch {
      console.error('Failed to search services');
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchServices(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, fetchServices]);

  // Add service to selection
  const addService = useCallback((service: ShoppableService) => {
    const existing = selectedServices.find((s) => s.cptCode === service.code);
    if (existing) {
      setSelectedServices(
        selectedServices.map((s) =>
          s.cptCode === service.code ? { ...s, units: s.units + 1 } : s
        )
      );
    } else {
      setSelectedServices([
        ...selectedServices,
        {
          cptCode: service.code,
          description: service.description,
          units: 1,
        },
      ]);
    }
  }, [selectedServices]);

  // Remove service from selection
  const removeService = useCallback((cptCode: string) => {
    setSelectedServices(selectedServices.filter((s) => s.cptCode !== cptCode));
  }, [selectedServices]);

  // Update service units
  const updateUnits = useCallback((cptCode: string, units: number) => {
    if (units < 1) return;
    setSelectedServices(
      selectedServices.map((s) =>
        s.cptCode === cptCode ? { ...s, units } : s
      )
    );
  }, [selectedServices]);

  // Generate estimate
  const generateEstimate = useCallback(async () => {
    if (selectedServices.length === 0) {
      setError('Please select at least one service');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const requestBody: any = {
        services: selectedServices.map((s) => ({
          cptCode: s.cptCode,
          description: s.description,
          units: s.units,
          modifiers: s.modifiers,
        })),
      };

      if (hasInsurance && benefits.deductible > 0) {
        requestBody.benefits = {
          planName: benefits.planName,
          deductible: benefits.deductible,
          outOfPocketMax: benefits.outOfPocketMax,
          coinsurance: benefits.coinsurance,
          copay: benefits.copay,
          isInNetwork: benefits.isInNetwork,
        };
      }

      const response = await fetch('/api/transparency/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.success) {
        setEstimate(data.data);
        setShowResults(true);
      } else {
        setError(data.error || 'Failed to generate estimate');
      }
    } catch {
      setError('Failed to generate estimate. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedServices, hasInsurance, benefits]);

  // Reset form
  const resetForm = useCallback(() => {
    setSelectedServices([]);
    setEstimate(null);
    setShowResults(false);
    setError(null);
  }, []);

  // Print estimate
  const printEstimate = useCallback(() => {
    window.print();
  }, []);

  // Format currency
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);

  // Get confidence badge color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 75) return 'bg-green-100 text-green-800';
    if (confidence >= 50) return 'bg-amber-100 text-amber-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Price Estimate</h2>
          <p className="text-slate-500 mt-1">
            Get an estimate of your healthcare costs
          </p>
        </div>
        {showResults && (
          <div className="flex items-center space-x-4">
            <button
              onClick={printEstimate}
              className="inline-flex items-center px-4 py-2 border border-slate-300 bg-white text-slate-700 rounded-lg hover:bg-slate-50 font-medium text-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
            </button>
            <button
              onClick={resetForm}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
            >
              New Estimate
            </button>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start space-x-3 print:hidden">
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
        /* Estimate Form */
        <div className="space-y-6">
          {/* Service Search */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Select Services</h3>

            {/* Search Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Search for procedures or services
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by CPT code or description..."
                  className="w-full border border-slate-300 rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="border border-slate-200 rounded-lg max-h-64 overflow-y-auto mb-4">
                {searchResults.map((service) => (
                  <button
                    key={service.code}
                    onClick={() => addService(service)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-b-0 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-medium text-slate-900">{service.code}</span>
                      <span className="text-slate-600 ml-2">{service.description}</span>
                      {service.isCmsSpecified && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          CMS Required
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-slate-500">
                      Est. {formatCurrency(service.averagePrice)}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Selected Services */}
            {selectedServices.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-slate-700 mb-2">Selected Services</h4>
                <div className="space-y-2">
                  {selectedServices.map((service) => (
                    <div
                      key={service.cptCode}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <span className="font-medium text-slate-900">{service.cptCode}</span>
                        <span className="text-slate-600 ml-2 text-sm">{service.description}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => updateUnits(service.cptCode, service.units - 1)}
                            className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 flex items-center justify-center"
                          >
                            -
                          </button>
                          <span className="w-8 text-center">{service.units}</span>
                          <button
                            onClick={() => updateUnits(service.cptCode, service.units + 1)}
                            className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 flex items-center justify-center"
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={() => removeService(service.cptCode)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Insurance Information */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Insurance Information</h3>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={hasInsurance}
                  onChange={(e) => setHasInsurance(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700">I have insurance</span>
              </label>
            </div>

            {hasInsurance && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Plan Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={benefits.planName}
                    onChange={(e) => setBenefits({ ...benefits, planName: e.target.value })}
                    placeholder="e.g., Blue Cross PPO"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Annual Deductible
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={benefits.deductible || ''}
                      onChange={(e) => setBenefits({ ...benefits, deductible: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-slate-300 rounded-lg pl-7 pr-3 py-2 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Out-of-Pocket Maximum
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={benefits.outOfPocketMax || ''}
                      onChange={(e) => setBenefits({ ...benefits, outOfPocketMax: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-slate-300 rounded-lg pl-7 pr-3 py-2 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Coinsurance (Your Share)
                  </label>
                  <select
                    value={benefits.coinsurance}
                    onChange={(e) => setBenefits({ ...benefits, coinsurance: parseFloat(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={0}>0% (Plan pays 100%)</option>
                    <option value={0.1}>10% (Plan pays 90%)</option>
                    <option value={0.2}>20% (Plan pays 80%)</option>
                    <option value={0.3}>30% (Plan pays 70%)</option>
                    <option value={0.4}>40% (Plan pays 60%)</option>
                    <option value={0.5}>50% (Plan pays 50%)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Copay (if applicable)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                    <input
                      type="number"
                      min="0"
                      step="5"
                      value={benefits.copay || ''}
                      onChange={(e) => setBenefits({ ...benefits, copay: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-slate-300 rounded-lg pl-7 pr-3 py-2 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Network Status
                  </label>
                  <select
                    value={benefits.isInNetwork ? 'in' : 'out'}
                    onChange={(e) => setBenefits({ ...benefits, isInNetwork: e.target.value === 'in' })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="in">In-Network</option>
                    <option value="out">Out-of-Network</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center text-slate-600 hover:text-slate-900 font-medium"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </Link>

            <button
              onClick={generateEstimate}
              disabled={loading || selectedServices.length === 0}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Calculating...
                </>
              ) : (
                <>
                  Get Estimate
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Estimate Results */
        estimate && (
          <div className="space-y-6" id="estimate-results">
            {/* Summary Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-900">Your Price Estimate</h3>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getConfidenceColor(estimate.confidenceLevel)}`}>
                  {estimate.confidenceLevel >= 75 ? 'High' : estimate.confidenceLevel >= 50 ? 'Medium' : 'Low'} Confidence ({estimate.confidenceLevel}%)
                </span>
              </div>

              {/* Cost Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500">Total Charges</p>
                  <p className="text-xl font-bold text-slate-900">{formatCurrency(estimate.grossCharges)}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600">Insurance Adjustment</p>
                  <p className="text-xl font-bold text-green-700">-{formatCurrency(estimate.contractualAdjustment)}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600">Insurance Pays</p>
                  <p className="text-xl font-bold text-blue-700">{formatCurrency(estimate.insurancePayment)}</p>
                </div>
                <div className="p-4 bg-amber-50 rounded-lg border-2 border-amber-200">
                  <p className="text-sm text-amber-600">Your Estimated Cost</p>
                  <p className="text-2xl font-bold text-amber-700">{formatCurrency(estimate.patientResponsibility.total)}</p>
                </div>
              </div>

              {/* Patient Responsibility Breakdown */}
              {(estimate.patientResponsibility.deductible > 0 ||
                estimate.patientResponsibility.copay > 0 ||
                estimate.patientResponsibility.coinsurance > 0) && (
                <div className="p-4 bg-slate-50 rounded-lg mb-6">
                  <h4 className="text-sm font-medium text-slate-700 mb-3">Your Cost Breakdown</h4>
                  <div className="space-y-2">
                    {estimate.patientResponsibility.deductible > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Deductible</span>
                        <span className="font-medium">{formatCurrency(estimate.patientResponsibility.deductible)}</span>
                      </div>
                    )}
                    {estimate.patientResponsibility.copay > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Copay</span>
                        <span className="font-medium">{formatCurrency(estimate.patientResponsibility.copay)}</span>
                      </div>
                    )}
                    {estimate.patientResponsibility.coinsurance > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Coinsurance</span>
                        <span className="font-medium">{formatCurrency(estimate.patientResponsibility.coinsurance)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Validity Notice */}
              <p className="text-xs text-slate-500">
                This estimate is valid until {new Date(estimate.validUntil).toLocaleDateString()}
              </p>
            </div>

            {/* Service Breakdown */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Service Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 font-medium text-slate-700">Service</th>
                      <th className="text-right py-3 px-4 font-medium text-slate-700">Units</th>
                      <th className="text-right py-3 px-4 font-medium text-slate-700">Charge</th>
                      <th className="text-right py-3 px-4 font-medium text-slate-700">Allowed</th>
                      <th className="text-right py-3 px-4 font-medium text-slate-700">Your Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estimate.breakdown.map((item, index) => (
                      <tr key={index} className="border-b border-slate-100">
                        <td className="py-3 px-4">
                          <div>
                            <span className="font-medium text-slate-900">{item.cptCode}</span>
                            <p className="text-xs text-slate-500">{item.description}</p>
                            {item.notes && (
                              <p className="text-xs text-amber-600 mt-1">{item.notes}</p>
                            )}
                          </div>
                        </td>
                        <td className="text-right py-3 px-4">{item.units}</td>
                        <td className="text-right py-3 px-4">{formatCurrency(item.grossCharge)}</td>
                        <td className="text-right py-3 px-4">{formatCurrency(item.expectedPayment)}</td>
                        <td className="text-right py-3 px-4 font-medium">{formatCurrency(item.patientResponsibility)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="bg-slate-50 rounded-xl p-6">
              <h4 className="text-sm font-semibold text-slate-700 mb-2">Important Information</h4>
              <p className="text-sm text-slate-600">{estimate.disclaimer}</p>

              {estimate.notes.length > 0 && (
                <div className="mt-4">
                  <h5 className="text-sm font-medium text-slate-700 mb-2">Notes</h5>
                  <ul className="list-disc list-inside space-y-1">
                    {estimate.notes.map((note, index) => (
                      <li key={index} className="text-sm text-slate-600">{note}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Action Buttons (Print Only) */}
            <div className="flex items-center justify-between print:hidden">
              <button
                onClick={resetForm}
                className="inline-flex items-center text-slate-600 hover:text-slate-900 font-medium"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                New Estimate
              </button>

              <div className="flex items-center space-x-4">
                <button
                  onClick={printEstimate}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium text-sm"
                >
                  Print Estimate
                </button>
                <Link
                  href="/patient-portal"
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium inline-flex items-center"
                >
                  Schedule Appointment
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        )
      )}

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #estimate-results,
          #estimate-results * {
            visibility: visible;
          }
          #estimate-results {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
