'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ConfidenceBadge from '@/components/ConfidenceBadge';
import RecoveryPathwayCard from '@/components/RecoveryPathwayCard';
import { useAssessments } from '@/hooks/useAssessments';
import type { Assessment } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function AssessmentDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get('id');
  const { getAssessment, exportAssessments } = useAssessments();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatingWorkItem, setCreatingWorkItem] = useState(false);
  const [workItemMessage, setWorkItemMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // SSI Assessment state
  const [ssiAssessment, setSSIAssessment] = useState<{
    id: string;
    score: number;
    recommendation: string;
    viabilityRating: string;
    keyFactors: string[];
    suggestedActions: string[];
    assessedAt: string;
  } | null>(null);
  const [loadingSSI, setLoadingSSI] = useState(false);
  const [runningSSI, setRunningSSI] = useState(false);
  const [ssiError, setSSIError] = useState<string | null>(null);

  // Medical bill attachments state
  const [attachments, setAttachments] = useState<Array<{
    id: string;
    originalName: string;
    fileSize: number;
    mimeType: string;
    createdAt: string;
    uploadedBy?: { name: string | null; email: string };
  }>>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Patient portal access state
  const [patientTokens, setPatientTokens] = useState<Array<{
    id: string;
    token: string;
    patientEmail: string | null;
    patientName: string | null;
    expiresAt: string;
    lastAccessedAt: string | null;
    isRevoked: boolean;
    createdAt: string;
  }>>([]);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [linkPatientEmail, setLinkPatientEmail] = useState('');
  const [linkPatientName, setLinkPatientName] = useState('');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Fetch SSI assessment for this assessment
  const fetchSSIAssessment = async (assessmentId: string) => {
    setLoadingSSI(true);
    setSSIError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/assessments/${assessmentId}/ssi-assessment`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSSIAssessment(data.data);
        }
      }
      // 404 means no SSI assessment exists yet, which is fine
    } catch (err) {
      console.error('Error fetching SSI assessment:', err);
    } finally {
      setLoadingSSI(false);
    }
  };

  // Run SSI assessment manually
  const runSSIAssessment = async () => {
    if (!assessment || runningSSI) return;
    setRunningSSI(true);
    setSSIError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/assessments/${assessment.id}/ssi-assessment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ force: true }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSSIAssessment(data.data);
      } else {
        setSSIError(data.error?.message || 'Failed to run SSI assessment');
      }
    } catch (err) {
      console.error('Error running SSI assessment:', err);
      setSSIError('An error occurred while running SSI assessment');
    } finally {
      setRunningSSI(false);
    }
  };

  // Fetch attachments
  const fetchAttachments = async (assessmentId: string) => {
    setLoadingAttachments(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/assessments/${assessmentId}/attachments`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAttachments(data.data);
        }
      }
    } catch (err) {
      console.error('Error fetching attachments:', err);
    } finally {
      setLoadingAttachments(false);
    }
  };

  // Upload medical bill
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !assessment) return;

    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('document', file);

    try {
      const response = await fetch(`${API_BASE_URL}/api/assessments/${assessment.id}/attachments`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const data = await response.json();
      if (response.ok && data.success) {
        fetchAttachments(assessment.id);
      } else {
        setUploadError(data.error?.message || 'Upload failed');
      }
    } catch (err) {
      console.error('Error uploading file:', err);
      setUploadError('An error occurred during upload');
    } finally {
      setUploading(false);
      // Reset the input
      e.target.value = '';
    }
  };

  // Delete attachment
  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!assessment) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/assessments/${assessment.id}/attachments/${attachmentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (response.ok) {
        setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      }
    } catch (err) {
      console.error('Error deleting attachment:', err);
    }
  };

  // Download attachment
  const handleDownloadAttachment = (attachmentId: string, originalName: string) => {
    if (!assessment) return;
    const url = `${API_BASE_URL}/api/assessments/${assessment.id}/attachments/${attachmentId}/download`;
    const a = document.createElement('a');
    a.href = url;
    a.download = originalName;
    a.click();
  };

  // Fetch patient access tokens
  const fetchPatientTokens = async (assessmentId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/patient-portal/tokens/${assessmentId}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) setPatientTokens(data.data);
      }
    } catch (err) {
      console.error('Error fetching patient tokens:', err);
    }
  };

  const generatePatientLink = async () => {
    if (!assessment || generatingLink) return;
    setGeneratingLink(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/patient-portal/tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          assessmentId: assessment.id,
          patientEmail: linkPatientEmail || undefined,
          patientName: linkPatientName || undefined,
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setPatientTokens((prev) => [data.data, ...prev]);
        setLinkPatientEmail('');
        setLinkPatientName('');
      }
    } catch (err) {
      console.error('Error generating patient link:', err);
    } finally {
      setGeneratingLink(false);
    }
  };

  const revokePatientToken = async (tokenId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/patient-portal/tokens/${tokenId}/revoke`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (response.ok) {
        setPatientTokens((prev) =>
          prev.map((t) => t.id === tokenId ? { ...t, isRevoked: true } : t)
        );
      }
    } catch (err) {
      console.error('Error revoking token:', err);
    }
  };

  const copyPortalLink = (token: string) => {
    const url = `${window.location.origin}/patient-portal/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const data = await getAssessment(id);
      setAssessment(data);
      setLoading(false);

      // Also fetch SSI assessment, attachments, and patient tokens
      if (data) {
        fetchSSIAssessment(id);
        fetchAttachments(id);
        fetchPatientTokens(id);
      }
    };
    fetchData();
  }, [id, getAssessment]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

  const handleExportCSV = async () => {
    if (!assessment) return;
    const blob = await exportAssessments([assessment.id], 'csv');
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `assessment-${assessment.accountNumber}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleCreateWorkItem = async () => {
    if (!assessment || creatingWorkItem) return;

    setCreatingWorkItem(true);
    setWorkItemMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/assessments/${assessment.id}/create-work-item`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          queueType: 'NEW_ACCOUNTS',
          priority: 5,
          notes: `Assessment for ${assessment.accountNumber || 'patient'} - ${assessment.primaryRecoveryPath || 'Recovery path pending'}`,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setWorkItemMessage({
          type: 'success',
          text: 'Work queue item created successfully! Redirecting to work queue...',
        });
        // Redirect to work queue after a short delay
        setTimeout(() => {
          router.push('/work-queue');
        }, 1500);
      } else if (response.status === 409) {
        setWorkItemMessage({
          type: 'error',
          text: 'A work queue item already exists for this assessment.',
        });
      } else {
        setWorkItemMessage({
          type: 'error',
          text: data.error?.message || 'Failed to create work queue item. Please try again.',
        });
      }
    } catch (error) {
      console.error('Error creating work item:', error);
      setWorkItemMessage({
        type: 'error',
        text: 'An error occurred. Please try again.',
      });
    } finally {
      setCreatingWorkItem(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="mt-2 text-slate-500">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (!id || !assessment) {
    return (
      <div className="text-center py-12">
        <svg className="w-16 h-16 text-slate-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="mt-4 text-lg font-semibold text-slate-900">Assessment Not Found</h3>
        <p className="mt-1 text-slate-500">The requested assessment could not be found.</p>
        <Link
          href="/assessments"
          className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Assessments
        </Link>
      </div>
    );
  }

  const encounterTypeLabels: Record<string, string> = {
    inpatient: 'Inpatient',
    observation: 'Observation',
    ed: 'Emergency Department',
    outpatient: 'Outpatient',
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-sm">
          <Link href="/assessments" className="text-slate-500 hover:text-slate-700">
            Assessments
          </Link>
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-slate-900 font-medium">{assessment.accountNumber}</span>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center px-4 py-2 border border-slate-300 bg-white text-slate-700 rounded-lg hover:bg-slate-50 font-medium text-sm"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
          <button className="inline-flex items-center px-4 py-2 border border-slate-300 bg-white text-slate-700 rounded-lg hover:bg-slate-50 font-medium text-sm">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Export PDF
          </button>
        </div>
      </div>

      {/* Header Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-slate-900">{assessment.patientName}</h1>
              <ConfidenceBadge confidence={assessment.overallConfidence} />
            </div>
            <p className="text-slate-500 mt-1">Account #{assessment.accountNumber}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500">Estimated Recovery</p>
            <p className="text-3xl font-bold text-green-600">
              {formatCurrency(assessment.estimatedTotalRecovery)}
            </p>
            <p className="text-sm text-slate-500">
              {assessment.recoveryRate.toFixed(1)}% of {formatCurrency(assessment.totalCharges)}
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Date of Service</p>
            <p className="mt-1 text-sm font-medium text-slate-900">{formatDate(assessment.dateOfService)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Encounter Type</p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {encounterTypeLabels[assessment.encounterType]}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Facility State</p>
            <p className="mt-1 text-sm font-medium text-slate-900">{assessment.facilityState}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Insurance Status</p>
            <p className="mt-1 text-sm font-medium text-slate-900">{assessment.insuranceStatus}</p>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-200">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-slate-700">Primary Recovery Path:</span>
            <span className="inline-flex items-center px-3 py-1 text-sm font-semibold bg-blue-100 text-blue-800 rounded-full">
              {assessment.primaryRecoveryPath}
            </span>
          </div>
        </div>
      </div>

      {/* Recovery Pathways */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Recovery Pathways</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <RecoveryPathwayCard
            pathway="medicaid"
            title="Medicaid"
            status={assessment.medicaid.status}
            confidence={assessment.medicaid.confidence}
            estimatedRecovery={assessment.medicaid.estimatedRecovery}
            actions={assessment.medicaid.actions}
            notes={assessment.medicaid.notes}
            isPrimary={assessment.primaryRecoveryPath === 'Medicaid'}
          />
          <RecoveryPathwayCard
            pathway="medicare"
            title="Medicare"
            status={assessment.medicare.status}
            confidence={assessment.medicare.confidence}
            actions={assessment.medicare.actions}
            notes={assessment.medicare.notes}
            isPrimary={assessment.primaryRecoveryPath === 'Medicare'}
          />
          <RecoveryPathwayCard
            pathway="dsh"
            title="DSH (Disproportionate Share)"
            status={assessment.dsh.relevance}
            confidence={assessment.dsh.score}
            actions={[]}
            notes={assessment.dsh.notes}
            isPrimary={assessment.primaryRecoveryPath === 'DSH'}
          />
          <RecoveryPathwayCard
            pathway="state_program"
            title={assessment.stateProgram.programName || 'State Program'}
            status={assessment.stateProgram.eligibilityLikely ? 'likely' : 'possible'}
            confidence={assessment.stateProgram.confidence}
            estimatedRecovery={
              assessment.totalCharges * (assessment.stateProgram.estimatedRecoveryPercent / 100)
            }
            actions={assessment.stateProgram.actions}
            notes={assessment.stateProgram.notes}
            isPrimary={assessment.primaryRecoveryPath === 'State Program'}
          />
        </div>
      </div>

      {/* Recommended Actions & Documentation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recommended Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Recommended Actions</h3>

          {assessment.immediateActions.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-red-600 uppercase tracking-wider mb-3">
                Immediate Actions
              </h4>
              <ul className="space-y-2">
                {assessment.immediateActions.map((action, index) => (
                  <li key={index} className="flex items-start">
                    <input
                      type="checkbox"
                      className="h-4 w-4 mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-3 text-sm text-slate-700">{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {assessment.priorityActions.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-amber-600 uppercase tracking-wider mb-3">
                Priority Actions
              </h4>
              <ul className="space-y-2">
                {assessment.priorityActions.map((action, index) => (
                  <li key={index} className="flex items-start">
                    <input
                      type="checkbox"
                      className="h-4 w-4 mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-3 text-sm text-slate-700">{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {assessment.followUpActions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-3">
                Follow-Up Actions
              </h4>
              <ul className="space-y-2">
                {assessment.followUpActions.map((action, index) => (
                  <li key={index} className="flex items-start">
                    <input
                      type="checkbox"
                      className="h-4 w-4 mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-3 text-sm text-slate-700">{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Required Documentation */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Required Documentation</h3>

          {assessment.documentationNeeded.length > 0 ? (
            <ul className="space-y-3">
              {assessment.documentationNeeded.map((doc, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 text-slate-400 mr-3"
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
                    <span className="text-sm font-medium text-slate-700">{doc}</span>
                  </div>
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded">
                    Needed
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No additional documentation required.</p>
          )}

          {/* State Program Required Documents */}
          {assessment.stateProgram.requiredDocuments.length > 0 && (
            <div className="mt-6 pt-6 border-t border-slate-200">
              <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-3">
                State Program Requirements
              </h4>
              <ul className="space-y-2">
                {assessment.stateProgram.requiredDocuments.map((doc, index) => (
                  <li key={index} className="flex items-center text-sm text-slate-600">
                    <svg
                      className="w-4 h-4 text-amber-500 mr-2"
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
                    {doc}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* DSH Factors */}
      {assessment.dsh.factors.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">DSH Eligibility Factors</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {assessment.dsh.factors.map((factor, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  factor.impact === 'positive'
                    ? 'bg-green-50 border-green-200'
                    : factor.impact === 'negative'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-xs font-medium uppercase tracking-wider ${
                      factor.impact === 'positive'
                        ? 'text-green-600'
                        : factor.impact === 'negative'
                        ? 'text-red-600'
                        : 'text-slate-500'
                    }`}
                  >
                    {factor.impact}
                  </span>
                  <span className="text-xs text-slate-500">
                    Weight: {(factor.weight * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-700">{factor.factor}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between">
            <span className="text-sm text-slate-600">Audit Readiness:</span>
            <span
              className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full ${
                assessment.dsh.auditReadiness === 'strong'
                  ? 'bg-green-100 text-green-800'
                  : assessment.dsh.auditReadiness === 'moderate'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {assessment.dsh.auditReadiness.charAt(0).toUpperCase() +
                assessment.dsh.auditReadiness.slice(1)}
            </span>
          </div>
        </div>
      )}

      {/* SSI Disability Assessment */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">SSI/SSDI Eligibility Assessment</h3>
          {!ssiAssessment && !loadingSSI && (
            <button
              onClick={runSSIAssessment}
              disabled={runningSSI}
              className="inline-flex items-center px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-purple-400 font-medium text-sm"
            >
              {runningSSI ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Running...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  Run SSI Assessment
                </>
              )}
            </button>
          )}
        </div>

        {loadingSSI ? (
          <div className="flex items-center justify-center py-8">
            <svg className="animate-spin h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="ml-2 text-slate-500">Loading SSI assessment...</span>
          </div>
        ) : ssiAssessment ? (
          <div className="space-y-4">
            {/* Score and Rating */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <p className="text-xs font-medium text-purple-600 uppercase tracking-wider mb-1">Score</p>
                <p className="text-3xl font-bold text-purple-700">{ssiAssessment.score}</p>
                <p className="text-xs text-purple-500">out of 100</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 text-center">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Viability</p>
                <p className={`text-lg font-semibold ${
                  ssiAssessment.viabilityRating === 'Very High' || ssiAssessment.viabilityRating === 'High'
                    ? 'text-green-600'
                    : ssiAssessment.viabilityRating === 'Moderate'
                    ? 'text-amber-600'
                    : 'text-red-600'
                }`}>{ssiAssessment.viabilityRating}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 text-center col-span-2">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Recommendation</p>
                <p className="text-sm font-semibold text-slate-700">{ssiAssessment.recommendation}</p>
              </div>
            </div>

            {/* Key Factors */}
            {ssiAssessment.keyFactors && ssiAssessment.keyFactors.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-2">Key Factors</h4>
                <ul className="space-y-1">
                  {ssiAssessment.keyFactors.map((factor, idx) => (
                    <li key={idx} className="flex items-start text-sm text-slate-600">
                      <svg className="w-4 h-4 text-purple-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {factor}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Suggested Actions */}
            {ssiAssessment.suggestedActions && ssiAssessment.suggestedActions.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-2">Suggested Actions</h4>
                <ul className="space-y-1">
                  {ssiAssessment.suggestedActions.map((action, idx) => (
                    <li key={idx} className="flex items-start text-sm text-slate-600">
                      <svg className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Re-run button */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Assessed: {new Date(ssiAssessment.assessedAt).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
                })}
              </p>
              <button
                onClick={runSSIAssessment}
                disabled={runningSSI}
                className="text-sm text-purple-600 hover:text-purple-800 font-medium"
              >
                {runningSSI ? 'Running...' : 'Re-run Assessment'}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-slate-500 mb-1">No SSI assessment available</p>
            <p className="text-sm text-slate-400">Click &quot;Run SSI Assessment&quot; to analyze disability eligibility</p>
            {ssiError && (
              <p className="mt-2 text-sm text-red-600">{ssiError}</p>
            )}
          </div>
        )}
      </div>

      {/* Medical Bills & Documents */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Medical Bills & Documents</h3>
          <label className={`inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm cursor-pointer ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
            {uploading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Uploading...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload Medical Bill
              </>
            )}
            <input
              type="file"
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.tiff"
              onChange={handleFileUpload}
              disabled={uploading}
            />
          </label>
        </div>

        {uploadError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {uploadError}
          </div>
        )}

        {loadingAttachments ? (
          <div className="flex items-center justify-center py-6">
            <svg className="animate-spin h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="ml-2 text-slate-500">Loading attachments...</span>
          </div>
        ) : attachments.length > 0 ? (
          <div className="space-y-2">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
              >
                <div className="flex items-center min-w-0">
                  <svg className="w-8 h-8 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <div className="ml-3 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{attachment.originalName}</p>
                    <p className="text-xs text-slate-500">
                      {(attachment.fileSize / 1024).toFixed(1)} KB
                      {attachment.uploadedBy?.name && ` \u00b7 ${attachment.uploadedBy.name}`}
                      {' \u00b7 '}
                      {new Date(attachment.createdAt).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                  <button
                    onClick={() => handleDownloadAttachment(attachment.id, attachment.originalName)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 rounded"
                    title="Download"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteAttachment(attachment.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                    title="Delete"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <p className="text-slate-500 mb-1">No medical bills uploaded</p>
            <p className="text-sm text-slate-400">Upload PDF or image files of medical bills for this assessment</p>
          </div>
        )}
      </div>

      {/* Patient Portal Access */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Patient Portal Access</h3>
        <p className="text-sm text-slate-500 mb-4">
          Generate a secure link for the patient to upload medical bills and documents directly.
        </p>

        {/* Generate Link Form */}
        <div className="flex items-end gap-3 mb-4">
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-600 mb-1">Patient Name</label>
            <input
              type="text"
              value={linkPatientName}
              onChange={(e) => setLinkPatientName(e.target.value)}
              placeholder="Optional"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-600 mb-1">Patient Email</label>
            <input
              type="email"
              value={linkPatientEmail}
              onChange={(e) => setLinkPatientEmail(e.target.value)}
              placeholder="Optional"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={generatePatientLink}
            disabled={generatingLink}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 font-medium text-sm whitespace-nowrap"
          >
            {generatingLink ? 'Generating...' : 'Generate Link'}
          </button>
        </div>

        {/* Active Links */}
        {patientTokens.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-slate-700">Active Links</h4>
            {patientTokens.map((pt) => (
              <div key={pt.id} className={`flex items-center justify-between p-3 rounded-lg border ${pt.isRevoked ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {pt.patientName || pt.patientEmail || 'Patient'}
                    {pt.isRevoked && <span className="ml-2 text-xs text-red-600 font-medium">Revoked</span>}
                  </p>
                  <p className="text-xs text-slate-500">
                    Created {new Date(pt.createdAt).toLocaleDateString()} &middot; Expires {new Date(pt.expiresAt).toLocaleDateString()}
                    {pt.lastAccessedAt && ` \u00b7 Last accessed ${new Date(pt.lastAccessedAt).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex items-center space-x-2 ml-3 flex-shrink-0">
                  {!pt.isRevoked && (
                    <>
                      <button
                        onClick={() => copyPortalLink(pt.token)}
                        className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        {copiedToken === pt.token ? 'Copied!' : 'Copy Link'}
                      </button>
                      <button
                        onClick={() => revokePatientToken(pt.id)}
                        className="px-3 py-1 text-xs font-medium text-red-600 hover:text-red-800"
                      >
                        Revoke
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Work Item Message */}
      {workItemMessage && (
        <div className={`mb-4 p-4 rounded-lg ${
          workItemMessage.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          <div className="flex items-center space-x-2">
            {workItemMessage.type === 'success' ? (
              <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <p className="text-sm font-medium">{workItemMessage.text}</p>
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-6 border-t border-slate-200">
        <Link
          href="/assessments"
          className="inline-flex items-center text-slate-600 hover:text-slate-900 font-medium"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Assessments
        </Link>
        <div className="flex items-center space-x-3">
          <button className="inline-flex items-center px-4 py-2 border border-slate-300 bg-white text-slate-700 rounded-lg hover:bg-slate-50 font-medium text-sm">
            Mark as Complete
          </button>
          <button
            onClick={handleCreateWorkItem}
            disabled={creatingWorkItem}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 font-medium text-sm"
          >
            {creatingWorkItem ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Creating...
              </>
            ) : (
              'Create Worklist Entry'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AssessmentDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="mt-2 text-slate-500">Loading...</p>
        </div>
      </div>
    }>
      <AssessmentDetailContent />
    </Suspense>
  );
}
