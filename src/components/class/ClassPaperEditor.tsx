import { useTranslation } from "react-i18next";
import type { HkdsePaperId } from "@/lib/hkdse-paper-meta";
import { HKDSE_PAPER_META } from "@/lib/hkdse-paper-meta";

const ALL_PAPERS: HkdsePaperId[] = ["R", "W", "L", "S"];

export function ClassPaperEditor({
  enrollments,
  onUpdatePapers,
}: {
  enrollments: Array<{
    id: string;
    student_name: string;
    email: string;
    status: string;
    hkdse_papers: HkdsePaperId[];
  }>;
  onUpdatePapers: (enrollmentId: string, papers: HkdsePaperId[]) => void;
}) {
  const { t } = useTranslation();
  const pending = enrollments.filter((e) => e.status === "pending");

  if (pending.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow-soft">
      <h3 className="font-display text-lg text-foreground">{t("classes.paperEditorTitle")}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{t("classes.paperEditorHint")}</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 pr-4">{t("classes.compareColName")}</th>
              {ALL_PAPERS.map((p) => (
                <th key={p} className="py-2 px-2 text-center">
                  {HKDSE_PAPER_META[p].shortLabel}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pending.map((e) => (
              <tr key={e.id} className="border-b border-border/60">
                <td className="py-2 pr-4">
                  <span className="font-medium text-foreground">{e.student_name}</span>
                  <span className="block text-xs text-muted-foreground">{e.email}</span>
                </td>
                {ALL_PAPERS.map((paper) => {
                  const checked = e.hkdse_papers.includes(paper);
                  return (
                    <td key={paper} className="py-2 px-2 text-center">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const next = checked
                            ? e.hkdse_papers.filter((p) => p !== paper)
                            : [...e.hkdse_papers, paper];
                          onUpdatePapers(e.id, next.length > 0 ? next : [...ALL_PAPERS]);
                        }}
                        className="h-4 w-4 rounded border-input"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
