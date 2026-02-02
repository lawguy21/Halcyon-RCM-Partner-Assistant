import Link from 'next/link';
import ConfidenceBadge from './ConfidenceBadge';
import type { Assessment } from '@/types';

interface AssessmentCardProps {
  assessment: Assessment;
  compact?: boolean;
}

const pathwayColors: Record<string, string> = {
  medicaid: 'bg-purple-100 text-purple-800',
  medicare: 'bg-blue-100 text-blue-800',
  dsh: 'bg-green-100 text-green-800',
  state_program: 'bg-amber-100 text-amber-800',
};

const encounterTypeLabels: Record<string, string> = {
  inpatient: 'Inpatient',
  observation: 'Observation',
  ed: 'ED',
  outpatient: 'Outpatient',
};

export default function AssessmentCard({
  assessment,
  compact = false,
}: AssessmentCardProps) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  const pathwayKey = assessment.primaryRecoveryPath.toLowerCase().replace(' ', '_');

  if (compact) {
    return (
      <Link
        href={`/assessments/detail?id=${assessment.id}`}
        className="block bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium text-slate-900 truncate">
                {assessment.patientName}
              </p>
              <span className="text-xs text-slate-500">
                #{assessment.accountNumber}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {formatDate(assessment.dateOfService)} - {assessment.facilityState}
            </p>
          </div>
          <ConfidenceBadge confidence={assessment.overallConfidence} size="sm" />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span
            className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${
              pathwayColors[pathwayKey] || 'bg-slate-100 text-slate-800'
            }`}
          >
            {assessment.primaryRecoveryPath}
          </span>
          <span className="text-sm font-semibold text-green-600">
            {formatCurrency(assessment.estimatedTotalRecovery)}
          </span>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/assessments/detail?id=${assessment.id}`}
      className="block bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-3">
              <h3 className="text-lg font-semibold text-slate-900">
                {assessment.patientName}
              </h3>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full ${
                  pathwayColors[pathwayKey] || 'bg-slate-100 text-slate-800'
                }`}
              >
                {assessment.primaryRecoveryPath}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Account #{assessment.accountNumber}
            </p>
          </div>
          <ConfidenceBadge confidence={assessment.overallConfidence} />
        </div>

        {/* Key Metrics */}
        <div className="mt-6 grid grid-cols-4 gap-4">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total Charges
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {formatCurrency(assessment.totalCharges)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Est. Recovery
            </p>
            <p className="mt-1 text-lg font-semibold text-green-600">
              {formatCurrency(assessment.estimatedTotalRecovery)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Recovery Rate
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {assessment.recoveryRate.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Date of Service
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {formatDate(assessment.dateOfService)}
            </p>
          </div>
        </div>

        {/* Encounter Details */}
        <div className="mt-4 flex items-center space-x-4 text-sm text-slate-600">
          <span className="inline-flex items-center">
            <svg
              className="w-4 h-4 mr-1.5 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            {encounterTypeLabels[assessment.encounterType]}
          </span>
          <span className="inline-flex items-center">
            <svg
              className="w-4 h-4 mr-1.5 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            {assessment.facilityState}
          </span>
          <span className="inline-flex items-center">
            <svg
              className="w-4 h-4 mr-1.5 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            {assessment.insuranceStatus}
          </span>
        </div>

        {/* Priority Actions Preview */}
        {assessment.priorityActions.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
              Priority Actions
            </p>
            <ul className="space-y-1">
              {assessment.priorityActions.slice(0, 3).map((action, index) => (
                <li
                  key={index}
                  className="flex items-center text-sm text-slate-600"
                >
                  <svg
                    className="w-4 h-4 mr-2 text-blue-500"
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
                  {action}
                </li>
              ))}
              {assessment.priorityActions.length > 3 && (
                <li className="text-sm text-blue-600">
                  +{assessment.priorityActions.length - 3} more actions
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </Link>
  );
}
