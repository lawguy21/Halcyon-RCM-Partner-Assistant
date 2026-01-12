interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
  variant?: 'default' | 'success' | 'warning' | 'info';
}

const variantStyles = {
  default: {
    bg: 'bg-white',
    iconBg: 'bg-slate-100',
    iconText: 'text-slate-600',
  },
  success: {
    bg: 'bg-white',
    iconBg: 'bg-green-100',
    iconText: 'text-green-600',
  },
  warning: {
    bg: 'bg-white',
    iconBg: 'bg-amber-100',
    iconText: 'text-amber-600',
  },
  info: {
    bg: 'bg-white',
    iconBg: 'bg-blue-100',
    iconText: 'text-blue-600',
  },
};

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = 'default',
}: StatCardProps) {
  const styles = variantStyles[variant];

  return (
    <div className={`${styles.bg} rounded-xl shadow-sm border border-slate-200 p-6`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
          {subtitle && (
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          )}
          {trend && (
            <div className="mt-3 flex items-center space-x-1">
              <span
                className={`inline-flex items-center text-sm font-medium ${
                  trend.positive ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {trend.positive ? (
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                )}
                {trend.value}%
              </span>
              <span className="text-sm text-slate-500">{trend.label}</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={`${styles.iconBg} ${styles.iconText} p-3 rounded-lg`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
