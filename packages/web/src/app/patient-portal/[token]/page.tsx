'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { usePatientPortal, type PatientPortalData, type PatientDocument } from '@/hooks/usePatientPortal';

// FPL Guidelines for discount eligibility display
const FPL_DISCOUNT_TIERS = [
  { range: '0% - 200% FPL', discount: '100% (Free Care)' },
  { range: '201% - 300% FPL', discount: '75% Discount' },
  { range: '301% - 400% FPL', discount: '50% Discount' },
  { range: 'Above 400% FPL', discount: 'May qualify for payment plan' },
];

const DOCUMENT_TYPE_OPTIONS = [
  { value: 'income_verification', label: 'Income Verification (Tax Returns, Pay Stubs)' },
  { value: 'insurance_card', label: 'Insurance Card' },
  { value: 'id_verification', label: 'ID Verification (Driver\'s License, Passport)' },
  { value: 'medical_bill', label: 'Medical Bill or Statement' },
  { value: 'eob', label: 'Insurance Explanation of Benefits (EOB)' },
  { value: 'other', label: 'Other Document' },
];

export default function PatientPortalTokenPage() {
  const params = useParams();
  const token = params.token as string;
  const { loading, error, validateToken, getDocuments, uploadDocument, deleteDocument } = usePatientPortal(token);

  const [portalData, setPortalData] = useState<PatientPortalData | null>(null);
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'communications' | 'assistance'>('overview');
  const [selectedDocType, setSelectedDocType] = useState('income_verification');
  const [showCallbackModal, setShowCallbackModal] = useState(false);
  const [callbackForm, setCallbackForm] = useState({ preferredTime: '', phoneNumber: '', reason: '' });
  const [callbackSubmitted, setCallbackSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validate token and load data on mount
  useEffect(() => {
    const init = async () => {
      const data = await validateToken();
      if (data) {
        setPortalData(data);
        const docs = await getDocuments();
        setDocuments(docs);
      }
    };
    init();
  }, [validateToken, getDocuments]);

  const handleUpload = useCallback(async (file: File) => {
    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    const result = await uploadDocument(file);
    if (result) {
      setDocuments((prev) => [result, ...prev]);
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    } else {
      setUploadError(error || 'Upload failed. Please try again.');
    }
    setUploading(false);
  }, [uploadDocument, error]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
      e.target.value = '';
    }
  }, [handleUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  }, [handleUpload]);

  const handleDelete = useCallback(async (docId: string) => {
    const success = await deleteDocument(docId);
    if (success) {
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    }
  }, [deleteDocument]);

  const handleCallbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCallbackSubmitted(true);
    setTimeout(() => {
      setShowCallbackModal(false);
      setCallbackSubmitted(false);
      setCallbackForm({ preferredTime: '', phoneNumber: '', reason: '' });
    }, 2000);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-amber-100 text-amber-800',
      pending_info: 'bg-amber-100 text-amber-800',
      completed: 'bg-green-100 text-green-800',
      denied: 'bg-red-100 text-red-800',
      approved: 'bg-green-100 text-green-800',
    };
    return colors[status] || 'bg-slate-100 text-slate-800';
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-blue-600 mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="mt-3 text-slate-500">Verifying your access...</p>
        </div>
      </div>
    );
  }

  // Error state (invalid/expired token)
  if (error || !portalData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Access Unavailable</h2>
          <p className="text-slate-500">{error || 'This link is no longer valid. Please contact the hospital for a new access link.'}</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview' as const, label: 'Account Overview', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'documents' as const, label: 'Upload Documents', icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12' },
    { id: 'communications' as const, label: 'Messages', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' },
    { id: 'assistance' as const, label: 'Financial Assistance', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold">
          Welcome{portalData.patientName ? `, ${portalData.patientName}` : ' to Your Patient Portal'}
        </h1>
        <p className="mt-1 text-blue-100">
          Manage your account, upload documents, and access financial assistance resources.
        </p>
      </div>

      {/* Patient Info Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xl font-semibold">
              {portalData.patientName
                ? portalData.patientName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                : 'PT'}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                {portalData.patientName || 'Patient'}
              </h2>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-slate-500">
                {portalData.assessment.accountNumber && (
                  <span>Account: {portalData.assessment.accountNumber}</span>
                )}
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(portalData.assessment.status)}`}>
                  {portalData.assessment.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowCallbackModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            Request a Callback
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200">
          <nav className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                </svg>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* ============ Account Overview Tab ============ */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Assessment Details */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Your Account Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Account Number</p>
                    <p className="text-lg font-semibold text-slate-900 mt-1">
                      {portalData.assessment.accountNumber || 'N/A'}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Encounter Type</p>
                    <p className="text-lg font-semibold text-slate-900 mt-1 capitalize">
                      {portalData.assessment.encounterType}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Facility State</p>
                    <p className="text-lg font-semibold text-slate-900 mt-1">
                      {portalData.assessment.facilityState}
                    </p>
                  </div>
                </div>
              </div>

              {/* Dates */}
              {(portalData.assessment.admissionDate || portalData.assessment.dischargeDate) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {portalData.assessment.admissionDate && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2">
                        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm font-medium text-blue-900">Admission Date</p>
                      </div>
                      <p className="text-lg font-semibold text-blue-800 mt-1">
                        {formatDate(portalData.assessment.admissionDate)}
                      </p>
                    </div>
                  )}
                  {portalData.assessment.dischargeDate && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2">
                        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm font-medium text-green-900">Discharge Date</p>
                      </div>
                      <p className="text-lg font-semibold text-green-800 mt-1">
                        {formatDate(portalData.assessment.dischargeDate)}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Documents Summary */}
              <div className="bg-slate-50 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Documents Uploaded</p>
                    <p className="text-xs text-slate-500">{documents.length} document{documents.length !== 1 ? 's' : ''} on file</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('documents')}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Upload More
                </button>
              </div>

              {/* Quick Actions */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => setActiveTab('documents')}
                    className="flex items-center space-x-3 p-4 bg-white border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
                  >
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 flex-shrink-0">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">Upload Documents</p>
                      <p className="text-xs text-slate-500">Submit required paperwork</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('assistance')}
                    className="flex items-center space-x-3 p-4 bg-white border border-slate-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors text-left"
                  >
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600 flex-shrink-0">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">Financial Assistance</p>
                      <p className="text-xs text-slate-500">Check eligibility for aid</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setShowCallbackModal(true)}
                    className="flex items-center space-x-3 p-4 bg-white border border-slate-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors text-left"
                  >
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 flex-shrink-0">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">Request a Callback</p>
                      <p className="text-xs text-slate-500">Speak with our team</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============ Upload Documents Tab ============ */}
          {activeTab === 'documents' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Upload Documents</h3>
                <p className="text-sm text-slate-500 mb-4">
                  Submit documents securely to support your financial assistance application or account verification.
                </p>
              </div>

              {/* Document Type Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  What type of document are you uploading?
                </label>
                <select
                  value={selectedDocType}
                  onChange={(e) => setSelectedDocType(e.target.value)}
                  className="w-full md:w-auto px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900"
                >
                  {DOCUMENT_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Upload Zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => !uploading && fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                  uploading
                    ? 'border-blue-300 bg-blue-50 cursor-not-allowed'
                    : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg,.tiff"
                  onChange={handleFileSelect}
                  disabled={uploading}
                />

                {uploading ? (
                  <div className="space-y-4">
                    <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <p className="text-sm font-medium text-blue-600">Uploading your document...</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        <span className="text-blue-600">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        PDF, PNG, JPG, or TIFF files up to 50MB
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {uploadSuccess && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-green-700 font-medium">Document uploaded successfully!</span>
                </div>
              )}

              {uploadError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
                  <svg className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm text-red-700">{uploadError}</span>
                </div>
              )}

              {/* Uploaded Documents List */}
              {documents.length > 0 ? (
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-3">Your Uploaded Documents ({documents.length})</h4>
                  <div className="space-y-3">
                    {documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-slate-200 flex-shrink-0">
                            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{doc.originalName}</p>
                            <p className="text-xs text-slate-500">
                              {formatFileSize(doc.fileSize)} &middot; {formatDate(doc.createdAt)}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}
                          className="ml-4 p-2 text-slate-400 hover:text-red-600 rounded flex-shrink-0"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <p className="text-slate-500">No documents uploaded yet</p>
                  <p className="text-sm text-slate-400 mt-1">Upload your first document above</p>
                </div>
              )}

              {/* What to Upload Guide */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
                <h4 className="text-sm font-semibold text-blue-900 mb-3">What documents should I upload?</h4>
                <ul className="space-y-2">
                  {[
                    'Medical bills or itemized statements',
                    'Insurance Explanation of Benefits (EOB)',
                    'Proof of income (pay stubs, tax returns)',
                    'Photo ID (driver\'s license, state ID)',
                    'Insurance cards (front and back)',
                    'Any correspondence from your insurance company',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start text-sm text-blue-800">
                      <svg className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* ============ Messages Tab ============ */}
          {activeTab === 'communications' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Messages</h3>
                <p className="text-sm text-slate-500 mb-4">
                  View communications from your patient financial services team.
                </p>
              </div>

              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <p className="text-slate-600 font-medium">No messages yet</p>
                <p className="text-sm text-slate-400 mt-1">
                  Messages from your hospital&apos;s patient services team will appear here.
                </p>
                <button
                  onClick={() => setShowCallbackModal(true)}
                  className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Request a Callback Instead
                </button>
              </div>
            </div>
          )}

          {/* ============ Financial Assistance Tab ============ */}
          {activeTab === 'assistance' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Financial Assistance Program (FAP)</h3>
                <p className="text-sm text-slate-500 mb-4">
                  Our hospital offers financial assistance to patients who qualify. This program can help reduce or eliminate your medical bills based on your income.
                </p>
              </div>

              {/* Eligibility Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
                <h4 className="font-medium text-blue-900 mb-2">You may qualify if:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
                  <li>Your household income is at or below 400% of the Federal Poverty Level (FPL)</li>
                  <li>You do not have health insurance or are underinsured</li>
                  <li>You are experiencing financial hardship due to medical expenses</li>
                </ul>
              </div>

              {/* How to Apply Steps */}
              <div className="border border-slate-200 rounded-lg p-6">
                <h4 className="font-medium text-slate-900 mb-4">How to Apply</h4>
                <div className="space-y-4">
                  {[
                    { step: 1, title: 'Upload Required Documents', description: 'Submit income verification, ID, and insurance information through the Upload Documents tab.', action: () => setActiveTab('documents') },
                    { step: 2, title: 'Application Review', description: 'Our team will review your documents and determine eligibility within 5-7 business days.' },
                    { step: 3, title: 'Receive Determination', description: 'You will be notified of the decision. If approved, discounts are applied automatically to your account.' },
                  ].map((item) => (
                    <div key={item.step} className="flex items-start space-x-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                        {item.step}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{item.title}</p>
                        <p className="text-sm text-slate-500 mt-0.5">{item.description}</p>
                        {item.action && (
                          <button
                            onClick={item.action}
                            className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Go to Upload Documents
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Required Documents Checklist */}
              <div className="border border-slate-200 rounded-lg p-6">
                <h4 className="font-medium text-slate-900 mb-4">Required Documents Checklist</h4>
                <div className="space-y-3">
                  {[
                    { label: 'Tax Return (most recent year)', uploaded: documents.some(d => d.originalName.toLowerCase().includes('tax')) },
                    { label: 'Pay Stubs (last 3 months)', uploaded: documents.some(d => d.originalName.toLowerCase().includes('pay')) },
                    { label: 'Government-issued Photo ID', uploaded: documents.some(d => d.originalName.toLowerCase().match(/id|license|passport/)) },
                    { label: 'Insurance Card (if applicable)', uploaded: documents.some(d => d.originalName.toLowerCase().includes('insurance')) },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center space-x-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        item.uploaded ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-400'
                      }`}>
                        {item.uploaded ? (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <span className="text-xs font-medium">{i + 1}</span>
                        )}
                      </div>
                      <span className={`text-sm ${item.uploaded ? 'text-slate-500 line-through' : 'text-slate-700'}`}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setActiveTab('documents')}
                  className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Upload Missing Documents
                </button>
              </div>

              {/* Discount Eligibility Table */}
              <div className="border border-slate-200 rounded-lg p-6">
                <h4 className="font-medium text-slate-900 mb-4">Discount Eligibility Guide</h4>
                <p className="text-sm text-slate-600 mb-4">
                  The amount of financial assistance you may receive depends on your household income as a percentage of the Federal Poverty Level.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 pr-4 font-medium text-slate-700">Income Level (% of FPL)</th>
                        <th className="text-left py-2 font-medium text-slate-700">Potential Discount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {FPL_DISCOUNT_TIERS.map((tier, i) => (
                        <tr key={i}>
                          <td className="py-2 pr-4 text-slate-600">{tier.range}</td>
                          <td className="py-2 text-green-600 font-medium">{tier.discount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 501(r) Notice */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p className="text-xs text-slate-600">
                  In accordance with IRS Section 501(r) requirements, our hospital provides financial assistance
                  to eligible patients who cannot afford to pay for medically necessary care. You have the right to
                  apply for financial assistance before any extraordinary collection actions are taken.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Help Resources Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Need Help?</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start space-x-3 p-4 bg-slate-50 rounded-lg">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-slate-900">Call Patient Services</p>
              <p className="text-sm text-slate-500">Mon-Fri, 8am-6pm</p>
              <button
                onClick={() => setShowCallbackModal(true)}
                className="text-sm text-blue-600 font-medium mt-1"
              >
                Request a callback
              </button>
            </div>
          </div>
          <div className="flex items-start space-x-3 p-4 bg-slate-50 rounded-lg">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600 flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-slate-900">Secure Portal</p>
              <p className="text-sm text-slate-500">Your documents are encrypted and protected</p>
              <p className="text-xs text-slate-400 mt-1">This portal link expires automatically for your security</p>
            </div>
          </div>
        </div>
      </div>

      {/* Callback Request Modal */}
      {showCallbackModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            {callbackSubmitted ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Callback Requested!</h3>
                <p className="text-sm text-slate-500 mt-2">
                  We will call you at your requested time. Thank you!
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-slate-900">Request a Callback</h3>
                  <button
                    onClick={() => setShowCallbackModal(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <form onSubmit={handleCallbackSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="phoneNumber" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      id="phoneNumber"
                      value={callbackForm.phoneNumber}
                      onChange={(e) => setCallbackForm({ ...callbackForm, phoneNumber: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900"
                      placeholder="(555) 555-5555"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="preferredTime" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Preferred Time
                    </label>
                    <select
                      id="preferredTime"
                      value={callbackForm.preferredTime}
                      onChange={(e) => setCallbackForm({ ...callbackForm, preferredTime: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900"
                      required
                    >
                      <option value="">Select a time...</option>
                      <option value="morning">Morning (8am - 12pm)</option>
                      <option value="afternoon">Afternoon (12pm - 4pm)</option>
                      <option value="evening">Evening (4pm - 6pm)</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="reason" className="block text-sm font-medium text-slate-700 mb-1.5">
                      What would you like to discuss?
                    </label>
                    <textarea
                      id="reason"
                      value={callbackForm.reason}
                      onChange={(e) => setCallbackForm({ ...callbackForm, reason: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 resize-none"
                      placeholder="Brief description of your question or concern..."
                    />
                  </div>
                  <div className="flex justify-end space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCallbackModal(false)}
                      className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors"
                    >
                      Request Callback
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
