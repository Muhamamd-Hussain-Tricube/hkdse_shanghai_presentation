type StatBlock = {
  mean: number;
  median: number;
  min: number;
  max: number;
  count: number;
};

type Props = {
  title: string;
  stats: StatBlock;
  suffix?: string;
};

function StatCard({
  label,
  value,
  suffix = "%",
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 shadow-soft">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl text-foreground">
        {Math.round(value)}
        {suffix}
      </p>
    </div>
  );
}

export function ClassStatCards({ title, stats, suffix = "%" }: Props) {
  if (stats.count === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface/50 p-8 text-center text-sm text-muted-foreground">
        No completed results yet for {title}.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-display text-lg text-foreground">{title}</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Average" value={stats.mean} suffix={suffix} />
        <StatCard label="Median" value={stats.median} suffix={suffix} />
        <StatCard label="Maximum" value={stats.max} suffix={suffix} />
        <StatCard label="Minimum" value={stats.min} suffix={suffix} />
      </div>
    </div>
  );
}
