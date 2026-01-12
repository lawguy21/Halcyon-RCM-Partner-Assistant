interface ConfidenceBadgeProps {
  confidence: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function ConfidenceBadge({
  confidence,
  showLabel = true,
  size = 'md',
}: ConfidenceBadgeProps) {
  const getColor = () => {
    if (confidence >= 75) return 'green';
    if (confidence >= 50) return 'yellow';
    return 'red';
  };

  const getLabel = () => {
    if (confidence >= 75) return 'High';
    if (confidence >= 50) return 'Medium';
    return 'Low';
  };

  const color = getColor();
  const label = getLabel();

  const colorStyles = {
    green: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      ring: 'ring-green-600/20',
      dot: 'bg-green-500',
    },
    yellow: {
      bg: 'bg-amber-100',
      text: 'text-amber-800',
      ring: 'ring-amber-600/20',
      dot: 'bg-amber-500',
    },
    red: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      ring: 'ring-red-600/20',
      dot: 'bg-red-500',
    },
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  const dotSizeStyles = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  };

  const styles = colorStyles[color];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ring-inset ${styles.bg} ${styles.text} ${styles.ring} ${sizeStyles[size]}`}
    >
      <span className={`rounded-full ${styles.dot} ${dotSizeStyles[size]}`} />
      {showLabel && <span>{label}</span>}
      <span>{confidence}%</span>
    </span>
  );
}
