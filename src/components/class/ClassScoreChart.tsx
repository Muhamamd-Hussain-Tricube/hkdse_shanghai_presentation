import { Line, LineChart, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { HKDSE_PAPER_META, type HkdsePaperId } from "@/lib/hkdse-paper-meta";

export type HistoryPoint = {
  round_number: number;
  label: string;
  snapshot_at: number;
  median_pct: number;
  mean_pct: number;
  per_paper_median: Record<HkdsePaperId, number>;
};

const chartConfig: ChartConfig = {
  median: { label: "Class median", color: "oklch(0.27 0.06 255)" },
  mean: { label: "Class mean", color: "oklch(0.78 0.13 65)" },
};

export function ClassScoreChart({ history }: { history: HistoryPoint[] }) {
  if (history.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Complete a round to see score trends over time.
      </div>
    );
  }

  const data = history.map((h) => ({
    name: `Round ${h.round_number}`,
    label: h.label,
    median: Math.round(h.median_pct),
    mean: Math.round(h.mean_pct),
  }));

  return (
    <div className="space-y-4">
      <ChartContainer config={chartConfig} className="h-[280px] w-full">
        <LineChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} />
          <YAxis
            domain={[0, 100]}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Line
            type="monotone"
            dataKey="median"
            stroke="var(--color-median)"
            strokeWidth={2}
            dot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="mean"
            stroke="var(--color-mean)"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={{ r: 3 }}
          />
        </LineChart>
      </ChartContainer>

      {history.length >= 2 && (
        <div className="flex flex-wrap gap-2">
          {HKDSE_PAPER_META.map((paper) => {
            const first = history[0].per_paper_median[paper.id];
            const last = history[history.length - 1].per_paper_median[paper.id];
            const delta = Math.round(last - first);
            return (
              <span
                key={paper.id}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  delta >= 0 ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                }`}
              >
                {paper.label}: {delta >= 0 ? "+" : ""}
                {delta}% median
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
