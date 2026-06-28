import type { HkdsePaperId } from "./class_sim_grading";
import { ALL_PAPERS } from "./class_sim_grading";

export type ClassCsvRow = {
  name: string;
  email: string;
  grade: string;
  papers: HkdsePaperId[];
  targeted_paper?: HkdsePaperId;
  attempts?: number;
};

export type TargetedCsvRow = ClassCsvRow & {
  round_1_band?: string;
  round_1_pct?: number;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parsePapersString(raw: string): HkdsePaperId[] {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed || trimmed === "all") return [...ALL_PAPERS];
  const parts = trimmed.split(/[,;\s]+/).map((p) => p.trim().toUpperCase());
  const valid = parts.filter((p): p is HkdsePaperId => ["R", "W", "L", "S"].includes(p));
  if (valid.length === 0) return [...ALL_PAPERS];
  return [...new Set(valid)];
}

export function parseRosterRows(
  rows: Array<{
    name: string;
    email: string;
    grade: string;
    papers: string;
  }>,
): { ok: true; rows: ClassCsvRow[] } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const parsed: ClassCsvRow[] = [];

  rows.forEach((row, i) => {
    const line = i + 2;
    const name = row.name?.trim();
    const email = row.email?.trim().toLowerCase();
    const grade = row.grade?.trim() ?? "";

    if (!name) {
      errors.push(`Row ${line}: name is required`);
      return;
    }
    if (!email || !EMAIL_RE.test(email)) {
      errors.push(`Row ${line}: valid email is required`);
      return;
    }

    parsed.push({
      name,
      email,
      grade,
      papers: parsePapersString(row.papers ?? "all"),
    });
  });

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, rows: parsed };
}

export function parseTargetedRows(
  rows: Array<{
    name: string;
    email: string;
    grade: string;
    papers: string;
    targeted_paper?: string;
    attempts?: string;
    round_1_band?: string;
    round_1_pct?: string;
  }>,
): { ok: true; rows: TargetedCsvRow[] } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const parsed: TargetedCsvRow[] = [];

  rows.forEach((row, i) => {
    const line = i + 2;
    const name = row.name?.trim();
    const email = row.email?.trim().toLowerCase();
    const grade = row.grade?.trim() ?? "";

    if (!name) {
      errors.push(`Row ${line}: name is required`);
      return;
    }
    if (!email || !EMAIL_RE.test(email)) {
      errors.push(`Row ${line}: valid email is required`);
      return;
    }

    const targetedRaw = row.targeted_paper?.trim().toUpperCase();
    let targeted_paper: HkdsePaperId | undefined;
    if (targetedRaw && ["R", "W", "L", "S"].includes(targetedRaw)) {
      targeted_paper = targetedRaw as HkdsePaperId;
    }

    const attemptsRaw = row.attempts?.trim();
    let attempts: number | undefined;
    if (attemptsRaw) {
      const n = Number(attemptsRaw);
      if (!Number.isFinite(n) || n < 1 || n > 5) {
        errors.push(`Row ${line}: attempts must be 1–5`);
        return;
      }
      attempts = Math.round(n);
    }

    const papers = targeted_paper ? [targeted_paper] : parsePapersString(row.papers ?? "all");

    parsed.push({
      name,
      email,
      grade,
      papers,
      targeted_paper,
      attempts,
      round_1_band: row.round_1_band?.trim() || undefined,
      round_1_pct: row.round_1_pct ? Number(row.round_1_pct) : undefined,
    });
  });

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, rows: parsed };
}

export function escapeCsvCell(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function papersToCsvString(papers: HkdsePaperId[]): string {
  if (papers.length === 4) return "all";
  return papers.join(",");
}
