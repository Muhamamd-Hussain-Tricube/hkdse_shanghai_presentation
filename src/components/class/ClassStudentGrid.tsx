import { Check } from "lucide-react";

export type StudentTile = {
  id: string;
  student_name: string;
  status: string;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function ClassStudentGrid({
  students,
  onStudentClick,
}: {
  students: StudentTile[];
  onStudentClick?: (student: StudentTile) => void;
}) {
  return (
    <div className="grid grid-cols-5 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
      {students.map((s) => {
        const done = s.status === "completed";
        const active = s.status === "in_progress";
        const clickable = onStudentClick && done;
        return (
          <button
            key={s.id}
            type="button"
            disabled={!clickable}
            onClick={() => clickable && onStudentClick(s)}
            className={`group relative flex flex-col items-center gap-1 rounded-lg border p-2 transition-all duration-300 ${
              done
                ? "border-success/40 bg-success/10"
                : active
                  ? "border-accent/50 bg-accent/15 animate-pulse"
                  : "border-border bg-surface"
            } ${clickable ? "cursor-pointer hover:shadow-card hover:ring-2 hover:ring-primary/30" : ""}`}
            title={
              clickable
                ? `${s.student_name} — click to review`
                : s.student_name
            }
          >
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold ${
                done
                  ? "bg-success/20 text-success"
                  : active
                    ? "bg-accent/30 text-accent-foreground"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {done ? <Check className="h-4 w-4" /> : initials(s.student_name)}
            </div>
            <span className="line-clamp-2 text-center text-[10px] leading-tight text-muted-foreground">
              {s.student_name.split(" ")[0]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
