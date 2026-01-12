import ConfidenceBadge from './ConfidenceBadge';

interface RecoveryPathwayCardProps {
  pathway: 'medicaid' | 'medicare' | 'dsh' | 'state_program';
  title: string;
  status: string;
  confidence: number;
  estimatedRecovery?: number;
  actions: string[];
  notes: string[];
  isPrimary?: boolean;
}

const pathwayStyles = {
  medicaid: {
    gradient: 'from-purple-500 to-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-700',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  medicare: {
    gradient: 'from-blue-500 to-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
  },
  dsh: {
    gradient: 'from-green-500 to-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  state_program: {
    gradient: 'from-amber-500 to-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
      </svg>
    ),
  },
};

const statusStyles: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-800',
  likely: 'bg-blue-100 text-blue-800',
  possible: 'bg-amber-100 text-amber-800',
  unlikely: 'bg-slate-100 text-slate-800',
  active_on_dos: 'bg-green-100 text-green-800',
  future_likely: 'bg-blue-100 text-blue-800',
  high: 'bg-green-100 text-green-800',
  medium: 'bg-amber-100 text-amber-800',
  low: 'bg-slate-100 text-slate-800',
};

export default function RecoveryPathwayCard({
  pathway,
  title,
  status,
  confidence,
  estimatedRecovery,
  actions,
  notes,
  isPrimary = false,
}: RecoveryPathwayCardProps) {
  const styles = pathwayStyles[pathway];

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const formatStatus = (s: string) =>
    s
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border ${
        isPrimary ? 'border-2 border-blue-400 ring-2 ring-blue-100' : 'border-slate-200'
      } overflow-hidden`}
    >
      {/* Header */}
      <div className={`bg-gradient-to-r ${styles.gradient} px-6 py-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 rounded-lg p-2 text-white">
              {styles.icon}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-semibold text-white">{title}</h3>
                {isPrimary && (
                  <span className="px-2 py-0.5 bg-white/20 text-white text-xs font-medium rounded-full">
                    Primary
                  </span>
                )}
              </div>
              <p className="text-white/80 text-sm">Recovery Pathway</p>
            </div>
          </div>
          <ConfidenceBadge confidence={confidence} />
        </div>
      </div>

      {/* Body */}
      <div className="p-6 space-y-4">
        {/* Status & Recovery */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Status
            </p>
            <span
              className={`inline-flex items-center px-2.5 py-1 mt-1 text-sm font-medium rounded-full ${
                statusStyles[status] || 'bg-slate-100 text-slate-800'
              }`}
            >
              {formatStatus(status)}
            </span>
          </div>
          {estimatedRecovery !== undefined && (
            <div className="text-right">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Est. Recovery
              </p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {formatCurrency(estimatedRecovery)}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        {actions.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
              Recommended Actions
            </p>
            <ul className="space-y-2">
              {actions.map((action, index) => (
                <li key={index} className="flex items-start">
                  <span
                    className={`flex-shrink-0 w-5 h-5 ${styles.bg} ${styles.text} rounded-full flex items-center justify-center text-xs font-medium mr-2 mt-0.5`}
                  >
                    {index + 1}
                  </span>
                  <span className="text-sm text-slate-700">{action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Notes */}
        {notes.length > 0 && (
          <div className={`${styles.bg} ${styles.border} border rounded-lg p-3`}>
            <p className={`text-xs font-medium ${styles.text} uppercase tracking-wider mb-1`}>
              Notes
            </p>
            <ul className="space-y-1">
              {notes.map((note, index) => (
                <li key={index} className="text-sm text-slate-600 flex items-start">
                  <svg
                    className={`w-4 h-4 ${styles.text} mr-2 mt-0.5 flex-shrink-0`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {note}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
