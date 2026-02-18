'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { usePatientPortal, type PatientPortalData, type PatientDocument } from '@/hooks/usePatientPortal';

export default function PatientPortalTokenPage() {
  const params = useParams();
  const token = params.token as string;
  const { loading, error, validateToken, getDocuments, uploadDocument, deleteDocument } = usePatientPortal(token);

  const [portalData, setPortalData] = useState<PatientPortalData | null>(null);
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'documents' | 'info'>('upload');
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
    { key: 'upload' as const, label: 'Upload Documents' },
    { key: 'documents' as const, label: `My Documents (${documents.length})` },
    { key: 'info' as const, label: 'Account Info' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome{portalData.patientName ? `, ${portalData.patientName}` : ''}
        </h1>
        <p className="text-slate-500 mt-1">
          Use this portal to securely upload medical bills and documents for your assessment.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="border-b border-slate-200">
          <nav className="flex -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-3 px-4 text-center text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Upload Tab */}
          {activeTab === 'upload' && (
            <div className="space-y-6">
              {/* Upload Zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  uploading ? 'border-blue-300 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
                }`}
              >
                {uploading ? (
                  <div>
                    <svg className="animate-spin h-10 w-10 text-blue-600 mx-auto" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <p className="mt-3 text-blue-600 font-medium">Uploading your document...</p>
                  </div>
                ) : (
                  <div>
                    <svg className="w-12 h-12 text-slate-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <p className="mt-3 text-slate-700 font-medium">Drag and drop your file here</p>
                    <p className="mt-1 text-sm text-slate-500">or</p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-3 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
                    >
                      Browse Files
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept=".pdf,.png,.jpg,.jpeg,.tiff"
                      onChange={handleFileSelect}
                    />
                    <p className="mt-3 text-xs text-slate-400">
                      PDF, PNG, JPG, or TIFF up to 50MB
                    </p>
                  </div>
                )}
              </div>

              {uploadSuccess && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-green-700 font-medium">Document uploaded successfully!</span>
                </div>
              )}

              {uploadError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
                  <svg className="w-5 h-5 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm text-red-700">{uploadError}</span>
                </div>
              )}

              {/* What to Upload Guide */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
                <h3 className="text-sm font-semibold text-blue-900 mb-3">What documents should I upload?</h3>
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

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div>
              {documents.length > 0 ? (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center min-w-0">
                        <svg className="w-8 h-8 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <div className="ml-3 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{doc.originalName}</p>
                          <p className="text-xs text-slate-500">
                            {(doc.fileSize / 1024).toFixed(1)} KB &middot;{' '}
                            {new Date(doc.createdAt).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric', year: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(doc.id)}
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
              ) : (
                <div className="text-center py-12">
                  <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <p className="text-slate-500">No documents uploaded yet</p>
                  <button
                    onClick={() => setActiveTab('upload')}
                    className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Upload your first document
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Account Info Tab */}
          {activeTab === 'info' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Account Number</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{portalData.assessment.accountNumber || 'N/A'}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Encounter Type</p>
                  <p className="mt-1 text-sm font-medium text-slate-900 capitalize">{portalData.assessment.encounterType}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Facility State</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{portalData.assessment.facilityState}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Status</p>
                  <p className="mt-1 text-sm font-medium text-slate-900 capitalize">{portalData.assessment.status}</p>
                </div>
                {portalData.assessment.admissionDate && (
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Admission Date</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {new Date(portalData.assessment.admissionDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {portalData.assessment.dischargeDate && (
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Discharge Date</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {new Date(portalData.assessment.dischargeDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
