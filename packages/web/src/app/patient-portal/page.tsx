'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useApi } from '@/hooks/useApi';

// Types for patient portal data
interface PatientInfo {
  id: string;
  firstName: string;
  lastName: string;
  accountNumber: string;
  dateOfBirth: string;
  email?: string;
  phone?: string;
}

interface AccountBalance {
  totalBalance: number;
  currentBalance: number;
  pastDueBalance: number;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  paymentStatus: 'current' | 'past_due' | 'collections' | 'paid_in_full';
}

interface FAPApplication {
  id: string;
  status: 'not_started' | 'pending_documents' | 'under_review' | 'approved' | 'denied' | 'expired';
  submittedDate?: string;
  determinationDate?: string;
  approvedDiscount?: number;
  requiredDocuments: string[];
  submittedDocuments: string[];
  notes?: string;
}

interface PaymentPlan {
  id: string;
  totalAmount: number;
  remainingBalance: number;
  monthlyPayment: number;
  nextPaymentDate: string;
  paymentsRemaining: number;
  paymentsMade: number;
  status: 'active' | 'completed' | 'defaulted' | 'pending_approval';
}

interface CommunicationItem {
  id: string;
  date: string;
  type: 'inbound' | 'outbound';
  method: 'phone' | 'email' | 'mail' | 'portal';
  subject: string;
  summary: string;
  agentName?: string;
}

interface UploadedDocument {
  id: string;
  type: 'income_verification' | 'insurance_card' | 'id_verification' | 'other';
  fileName: string;
  uploadDate: string;
  status: 'pending_review' | 'accepted' | 'rejected';
  rejectionReason?: string;
}

// Mock data for demonstration
const mockPatientInfo: PatientInfo = {
  id: 'P12345',
  firstName: 'John',
  lastName: 'Smith',
  accountNumber: 'ACC-2024-78901',
  dateOfBirth: '1985-03-15',
  email: 'j***@email.com',
  phone: '(555) ***-1234',
};

const mockAccountBalance: AccountBalance = {
  totalBalance: 4250.00,
  currentBalance: 1500.00,
  pastDueBalance: 0,
  lastPaymentDate: '2024-01-15',
  lastPaymentAmount: 150.00,
  paymentStatus: 'current',
};

const mockFAPApplication: FAPApplication = {
  id: 'FAP-2024-001',
  status: 'pending_documents',
  submittedDate: '2024-01-10',
  requiredDocuments: ['Tax Return (most recent)', 'Pay Stubs (last 3 months)', 'Government ID'],
  submittedDocuments: ['Government ID'],
  notes: 'Please submit income verification documents to complete your application.',
};

const mockPaymentPlan: PaymentPlan = {
  id: 'PP-2024-001',
  totalAmount: 4250.00,
  remainingBalance: 3850.00,
  monthlyPayment: 150.00,
  nextPaymentDate: '2024-02-15',
  paymentsRemaining: 26,
  paymentsMade: 3,
  status: 'active',
};

const mockCommunications: CommunicationItem[] = [
  {
    id: 'C001',
    date: '2024-01-20',
    type: 'outbound',
    method: 'email',
    subject: 'Financial Assistance Application Update',
    summary: 'Reminder to submit remaining documents for your FAP application.',
    agentName: 'Patient Services',
  },
  {
    id: 'C002',
    date: '2024-01-15',
    type: 'inbound',
    method: 'phone',
    subject: 'Payment Plan Inquiry',
    summary: 'Patient called to inquire about payment plan options. Set up monthly payment plan.',
    agentName: 'Sarah M.',
  },
  {
    id: 'C003',
    date: '2024-01-10',
    type: 'outbound',
    method: 'mail',
    subject: 'Financial Assistance Application Received',
    summary: 'Confirmation of FAP application receipt. Listed required documents.',
    agentName: 'Patient Services',
  },
];

const mockUploadedDocuments: UploadedDocument[] = [
  {
    id: 'D001',
    type: 'id_verification',
    fileName: 'drivers_license.pdf',
    uploadDate: '2024-01-10',
    status: 'accepted',
  },
];

export default function PatientPortalPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'communications' | 'assistance'>('overview');
  const [patientInfo] = useState<PatientInfo>(mockPatientInfo);
  const [accountBalance] = useState<AccountBalance>(mockAccountBalance);
  const [fapApplication] = useState<FAPApplication>(mockFAPApplication);
  const [paymentPlan] = useState<PaymentPlan>(mockPaymentPlan);
  const [communications] = useState<CommunicationItem[]>(mockCommunications);
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>(mockUploadedDocuments);

  const [showCallbackModal, setShowCallbackModal] = useState(false);
  const [callbackForm, setCallbackForm] = useState({
    preferredTime: '',
    phoneNumber: '',
    reason: '',
  });
  const [callbackSubmitted, setCallbackSubmitted] = useState(false);

  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedDocType, setSelectedDocType] = useState<UploadedDocument['type']>('income_verification');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const maskDOB = (dob: string) => {
    const date = new Date(dob);
    return `**/**/${date.getFullYear()}`;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      current: 'bg-green-100 text-green-800',
      paid_in_full: 'bg-green-100 text-green-800',
      past_due: 'bg-amber-100 text-amber-800',
      collections: 'bg-red-100 text-red-800',
      active: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      defaulted: 'bg-red-100 text-red-800',
      pending_approval: 'bg-amber-100 text-amber-800',
      pending_documents: 'bg-amber-100 text-amber-800',
      under_review: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      denied: 'bg-red-100 text-red-800',
      expired: 'bg-slate-100 text-slate-800',
      not_started: 'bg-slate-100 text-slate-800',
      pending_review: 'bg-amber-100 text-amber-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-slate-100 text-slate-800';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      current: 'Current',
      paid_in_full: 'Paid in Full',
      past_due: 'Past Due',
      collections: 'In Collections',
      active: 'Active',
      completed: 'Completed',
      defaulted: 'Defaulted',
      pending_approval: 'Pending Approval',
      pending_documents: 'Documents Needed',
      under_review: 'Under Review',
      approved: 'Approved',
      denied: 'Denied',
      expired: 'Expired',
      not_started: 'Not Started',
      pending_review: 'Pending Review',
      accepted: 'Accepted',
      rejected: 'Rejected',
    };
    return labels[status] || status;
  };

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Simulate file upload
    setUploadingFile(true);
    setUploadProgress(0);

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploadingFile(false);

          // Add the uploaded document to the list
          const newDoc: UploadedDocument = {
            id: `D${Date.now()}`,
            type: selectedDocType,
            fileName: file.name,
            uploadDate: new Date().toISOString().split('T')[0],
            status: 'pending_review',
          };
          setUploadedDocuments((prev) => [...prev, newDoc]);

          // Reset file input
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }

          return 0;
        }
        return prev + 10;
      });
    }, 200);
  }, [selectedDocType]);

  const handleCallbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate callback request submission
    setCallbackSubmitted(true);
    setTimeout(() => {
      setShowCallbackModal(false);
      setCallbackSubmitted(false);
      setCallbackForm({ preferredTime: '', phoneNumber: '', reason: '' });
    }, 2000);
  };

  const documentTypeLabels: Record<UploadedDocument['type'], string> = {
    income_verification: 'Income Verification',
    insurance_card: 'Insurance Card',
    id_verification: 'ID Verification',
    other: 'Other Document',
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold">Welcome to Your Patient Portal</h1>
        <p className="mt-1 text-blue-100">
          Manage your account, view your balance, and access financial assistance resources.
        </p>
      </div>

      {/* Patient Info Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xl font-semibold">
              {patientInfo.firstName[0]}{patientInfo.lastName[0]}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                {patientInfo.firstName} {patientInfo.lastName}
              </h2>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-slate-500">
                <span>Account: {patientInfo.accountNumber}</span>
                <span>DOB: {maskDOB(patientInfo.dateOfBirth)}</span>
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

      {/* Navigation Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200">
          <nav className="flex overflow-x-auto">
            {[
              { id: 'overview', label: 'Account Overview', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
              { id: 'documents', label: 'Upload Documents', icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12' },
              { id: 'communications', label: 'Messages', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' },
              { id: 'assistance', label: 'Financial Assistance', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
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
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Account Balance Section */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Your Account Balance</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-sm text-slate-500">Total Balance</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      {formatCurrency(accountBalance.totalBalance)}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-sm text-slate-500">Current Amount Due</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      {formatCurrency(accountBalance.currentBalance)}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-sm text-slate-500">Payment Status</p>
                    <span className={`inline-flex mt-2 px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(accountBalance.paymentStatus)}`}>
                      {getStatusLabel(accountBalance.paymentStatus)}
                    </span>
                  </div>
                </div>
                {accountBalance.lastPaymentDate && (
                  <p className="mt-4 text-sm text-slate-500">
                    Last payment: {formatCurrency(accountBalance.lastPaymentAmount || 0)} on {formatDate(accountBalance.lastPaymentDate)}
                  </p>
                )}
              </div>

              {/* Payment Plan Section */}
              {paymentPlan && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Your Payment Plan</h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-700">Plan Status:</span>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(paymentPlan.status)}`}>
                            {getStatusLabel(paymentPlan.status)}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mt-2">
                          Monthly Payment: <span className="font-semibold">{formatCurrency(paymentPlan.monthlyPayment)}</span>
                        </p>
                        <p className="text-sm text-slate-600">
                          Next Payment Due: <span className="font-semibold">{formatDate(paymentPlan.nextPaymentDate)}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-500">Remaining Balance</p>
                        <p className="text-xl font-bold text-slate-900">{formatCurrency(paymentPlan.remainingBalance)}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {paymentPlan.paymentsRemaining} payments remaining
                        </p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                        <span>Progress</span>
                        <span>{paymentPlan.paymentsMade} of {paymentPlan.paymentsMade + paymentPlan.paymentsRemaining} payments</span>
                      </div>
                      <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all"
                          style={{ width: `${(paymentPlan.paymentsMade / (paymentPlan.paymentsMade + paymentPlan.paymentsRemaining)) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* FAP Status Summary */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Financial Assistance Status</h3>
                <div className={`rounded-lg p-4 border ${
                  fapApplication.status === 'approved' ? 'bg-green-50 border-green-200' :
                  fapApplication.status === 'pending_documents' || fapApplication.status === 'under_review' ? 'bg-amber-50 border-amber-200' :
                  'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-700">Application Status:</span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(fapApplication.status)}`}>
                          {getStatusLabel(fapApplication.status)}
                        </span>
                      </div>
                      {fapApplication.notes && (
                        <p className="text-sm text-slate-600 mt-2">{fapApplication.notes}</p>
                      )}
                    </div>
                    <button
                      onClick={() => setActiveTab('assistance')}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Documents Tab */}
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
                  onChange={(e) => setSelectedDocType(e.target.value as UploadedDocument['type'])}
                  className="w-full md:w-auto px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900"
                >
                  <option value="income_verification">Income Verification (Tax Returns, Pay Stubs)</option>
                  <option value="insurance_card">Insurance Card</option>
                  <option value="id_verification">ID Verification (Driver's License, Passport)</option>
                  <option value="other">Other Document</option>
                </select>
              </div>

              {/* Upload Area */}
              <div
                onClick={() => !uploadingFile && fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                  uploadingFile
                    ? 'border-blue-300 bg-blue-50 cursor-not-allowed'
                    : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploadingFile}
                />

                {uploadingFile ? (
                  <div className="space-y-4">
                    <svg
                      className="mx-auto h-12 w-12 text-blue-500 animate-pulse"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-slate-700">Uploading...</p>
                      <div className="mt-2 w-64 mx-auto bg-slate-200 rounded-full h-2.5">
                        <div
                          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{uploadProgress}% complete</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
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
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        <span className="text-blue-600">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-slate-500">
                        PDF, JPG, or PNG files up to 10MB
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Uploaded Documents List */}
              {uploadedDocuments.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-3">Your Uploaded Documents</h4>
                  <div className="space-y-3">
                    {uploadedDocuments.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-slate-200">
                            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{doc.fileName}</p>
                            <p className="text-xs text-slate-500">
                              {documentTypeLabels[doc.type]} - Uploaded {formatDate(doc.uploadDate)}
                            </p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(doc.status)}`}>
                          {getStatusLabel(doc.status)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Communications Tab */}
          {activeTab === 'communications' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Communication History</h3>
                <p className="text-sm text-slate-500 mb-4">
                  View your past communications with our patient financial services team.
                </p>
              </div>

              {communications.length > 0 ? (
                <div className="space-y-4">
                  {communications.map((comm) => (
                    <div key={comm.id} className="border border-slate-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            comm.type === 'inbound' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                          }`}>
                            {comm.type === 'inbound' ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                              </svg>
                            )}
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-slate-900">{comm.subject}</h4>
                            <p className="text-sm text-slate-600 mt-1">{comm.summary}</p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                              <span className="capitalize">{comm.method}</span>
                              {comm.agentName && <span>with {comm.agentName}</span>}
                            </div>
                          </div>
                        </div>
                        <span className="text-xs text-slate-500 whitespace-nowrap">
                          {formatDate(comm.date)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg className="w-12 h-12 text-slate-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <p className="mt-2 text-slate-500">No communications yet</p>
                </div>
              )}
            </div>
          )}

          {/* Financial Assistance Tab */}
          {activeTab === 'assistance' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Financial Assistance Program (FAP)</h3>
                <p className="text-sm text-slate-500 mb-4">
                  Our hospital offers financial assistance to patients who qualify. This program can help reduce or eliminate your medical bills based on your income.
                </p>
              </div>

              {/* Current Application Status */}
              <div className="bg-slate-50 rounded-lg p-6">
                <h4 className="font-medium text-slate-900 mb-4">Your Application Status</h4>
                <div className="flex items-center gap-3 mb-4">
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(fapApplication.status)}`}>
                    {getStatusLabel(fapApplication.status)}
                  </span>
                  {fapApplication.submittedDate && (
                    <span className="text-sm text-slate-500">
                      Submitted: {formatDate(fapApplication.submittedDate)}
                    </span>
                  )}
                </div>

                {/* Document Checklist */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-slate-700">Required Documents:</p>
                  {fapApplication.requiredDocuments.map((doc, index) => {
                    const isSubmitted = fapApplication.submittedDocuments.includes(doc);
                    return (
                      <div key={index} className="flex items-center gap-2">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          isSubmitted ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-400'
                        }`}>
                          {isSubmitted ? (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <span className="text-xs">{index + 1}</span>
                          )}
                        </div>
                        <span className={`text-sm ${isSubmitted ? 'text-slate-500 line-through' : 'text-slate-700'}`}>
                          {doc}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {fapApplication.status === 'pending_documents' && (
                  <button
                    onClick={() => setActiveTab('documents')}
                    className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Upload Missing Documents
                  </button>
                )}
              </div>

              {/* FAP Policy Information */}
              <div className="border border-slate-200 rounded-lg p-6">
                <h4 className="font-medium text-slate-900 mb-4">About Our Financial Assistance Policy</h4>
                <div className="space-y-4 text-sm text-slate-600">
                  <p>
                    In accordance with IRS Section 501(r) requirements, our hospital provides financial assistance
                    to eligible patients who cannot afford to pay for medically necessary care.
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h5 className="font-medium text-blue-900 mb-2">You may qualify if:</h5>
                    <ul className="list-disc list-inside space-y-1 text-blue-800">
                      <li>Your household income is at or below 400% of the Federal Poverty Level (FPL)</li>
                      <li>You do not have health insurance or are underinsured</li>
                      <li>You are experiencing financial hardship due to medical expenses</li>
                    </ul>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <a
                      href="#"
                      className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download FAP Policy (PDF)
                    </a>
                    <a
                      href="#"
                      className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Plain Language Summary
                    </a>
                    <a
                      href="#"
                      className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      FAP Application Form
                    </a>
                  </div>
                </div>
              </div>

              {/* Eligibility Estimate */}
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
                      <tr>
                        <td className="py-2 pr-4 text-slate-600">0% - 200% FPL</td>
                        <td className="py-2 text-green-600 font-medium">100% (Free Care)</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 text-slate-600">201% - 300% FPL</td>
                        <td className="py-2 text-green-600 font-medium">75% Discount</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 text-slate-600">301% - 400% FPL</td>
                        <td className="py-2 text-green-600 font-medium">50% Discount</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 text-slate-600">Above 400% FPL</td>
                        <td className="py-2 text-slate-600">May qualify for payment plan</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Helpful Resources Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Need Help?</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start space-x-3 p-4 bg-slate-50 rounded-lg">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-slate-900">Call Us</p>
              <p className="text-sm text-slate-500">Mon-Fri, 8am-6pm</p>
              <p className="text-sm text-blue-600 font-medium mt-1">1-800-555-0123</p>
            </div>
          </div>
          <div className="flex items-start space-x-3 p-4 bg-slate-50 rounded-lg">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600 flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-slate-900">Email Us</p>
              <p className="text-sm text-slate-500">We respond within 24 hours</p>
              <p className="text-sm text-blue-600 font-medium mt-1">billing@hospital.org</p>
            </div>
          </div>
          <div className="flex items-start space-x-3 p-4 bg-slate-50 rounded-lg">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-slate-900">FAQs</p>
              <p className="text-sm text-slate-500">Common questions answered</p>
              <a href="#" className="text-sm text-blue-600 font-medium mt-1 inline-block">View FAQs</a>
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
