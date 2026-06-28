import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { HkdsePaperId } from "@/lib/hkdse-paper-meta";
import { HkdseResultsPanel, type HkdseResultSummary } from "@/components/hkdse/HkdseResultsPanel";

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
    section_scores?: Record<string, unknown>;
    result_summary?: HkdseResultSummary;
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

  const summary: HkdseResultSummary =
    student.session?.result_summary ??
    ({
      overall_level_estimate: student.session?.overall_band,
      component_scores: Object.fromEntries(
        Object.entries(student.session?.component_scores ?? {}).map(([id, comp]) => [
          id,
          { title: id, score: comp.score, max: comp.max },
        ]),
      ),
      bands: student.session?.bands,
      disclaimer:
        "Practice estimate using HKEAA descriptors — not an official HKDSE score.",
    } as HkdseResultSummary);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{student.student_name}</DialogTitle>
          <p className="text-sm text-muted-foreground">{student.email}</p>
        </DialogHeader>

        {student.status !== "completed" || !student.session ? (
          <p className="text-sm text-muted-foreground">
            This student has not completed the practice round yet.
          </p>
        ) : (
          <HkdseResultsPanel
            summary={summary}
            sectionScores={(student.session.section_scores as Record<string, any>) ?? {}}
            totalScore={student.session.total_score}
            totalMax={student.session.total_max}
            compact={!student.session.result_summary?.paper4_report}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
