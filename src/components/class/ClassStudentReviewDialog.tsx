import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { HkdsePaperId } from "@/lib/hkdse-paper-meta";
import { HKDSE_PAPER_META } from "@/lib/hkdse-paper-meta";

export type ClassStudentReviewData = {
  id: string;
  student_name: string;
  email: string;
  status: string;
  overall_band: string | null;
  overall_pct: number | null;
  session?: {
    total_score: number;
    total_max: number;
    component_scores: Record<
      HkdsePaperId,
      { score: number; max: number; pct: number }
    >;
    bands: Record<string, string>;
    overall_band: string;
  } | null;
};

export function ClassStudentReviewDialog({
  student,
  open,
  onOpenChange,
}: {
  student: ClassStudentReviewData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!student) return null;

  const papers: HkdsePaperId[] = ["R", "W", "L", "S"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{student.student_name}</DialogTitle>
          <p className="text-sm text-muted-foreground">{student.email}</p>
        </DialogHeader>

        {student.status !== "completed" || !student.session ? (
          <p className="text-sm text-muted-foreground">
            This student has not completed the practice round yet.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-surface/50 p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Overall</p>
              <p className="mt-1 font-display text-2xl text-foreground">
                {student.session.overall_band}
              </p>
              <p className="text-sm text-muted-foreground">
                {student.session.total_score}/{student.session.total_max} marks
                {student.overall_pct != null && ` (${student.overall_pct.toFixed(0)}%)`}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Per paper (HKEAA-style)
              </p>
              {papers.map((paper) => {
                const comp = student.session?.component_scores[paper];
                if (!comp) return null;
                const meta = HKDSE_PAPER_META[paper];
                const bandKey =
                  paper === "R"
                    ? "reading"
                    : paper === "W"
                      ? "writing"
                      : paper === "L"
                        ? "listening_integrated_skills"
                        : "speaking";
                const band = student.session?.bands[bandKey];
                return (
                  <div
                    key={paper}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <span>{meta.shortLabel}</span>
                    <span className="font-medium">
                      {comp.score}/{comp.max}
                      {band && <span className="ml-2 text-muted-foreground">({band})</span>}
                    </span>
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-muted-foreground">
              Practice estimate using HKEAA descriptors — not an official HKDSE score.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
