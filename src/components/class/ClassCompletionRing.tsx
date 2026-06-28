type Props = {
  pct: number;
  completed: number;
  total: number;
  label?: string;
};

export function ClassCompletionRing({ pct, completed, total, label }: Props) {
  const clamped = Math.min(100, Math.max(0, pct));
  const radius = 72;
  const stroke = 10;
  const normalized = radius - stroke / 2;
  const circumference = normalized * 2 * Math.PI;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative flex items-center justify-center">
        <svg width={radius * 2} height={radius * 2} className="-rotate-90">
          <circle
            cx={radius}
            cy={radius}
            r={normalized}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-muted/40"
          />
          <circle
            cx={radius}
            cy={radius}
            r={normalized}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="text-primary transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-3xl text-foreground">{Math.round(clamped)}%</span>
          {label && <span className="text-xs text-muted-foreground">{label}</span>}
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{completed}</span> / {total} completed
      </p>
    </div>
  );
}
