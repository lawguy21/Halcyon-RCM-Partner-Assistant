'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ConfidenceBadge from '@/components/ConfidenceBadge';
import RecoveryPathwayCard from '@/components/RecoveryPathwayCard';
import { useAssessments } from '@/hooks/useAssessments';
import type { Assessment } from '@/types';

function AssessmentDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get('id');
  const { getAssessment, exportAssessments } = useAssessments();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);

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
          <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">
            Create Worklist Entry
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
