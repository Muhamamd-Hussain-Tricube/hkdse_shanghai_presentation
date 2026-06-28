import type { HkdsePaperId } from "@/lib/hkdse-paper-meta";

export type ClassCsvRow = {
  name: string;
  email: string;
  grade: string;
  papers: HkdsePaperId[];
};

export type TargetedCsvRow = ClassCsvRow & {
  targeted_paper?: HkdsePaperId;
  attempts?: number;
  round_1_band?: string;
  round_1_pct?: number;
};

const ALL_PAPERS: HkdsePaperId[] = ["R", "W", "L", "S"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parsePapersString(raw: string): HkdsePaperId[] {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed || trimmed === "all") return [...ALL_PAPERS];
  const parts = trimmed.split(/[,;\s]+/).map((p) => p.trim().toUpperCase());
  const valid = parts.filter((p): p is HkdsePaperId => ["R", "W", "L", "S"].includes(p));
  if (valid.length === 0) return [...ALL_PAPERS];
  return [...new Set(valid)];
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

export function parseCsvText(text: string): Record<string, string>[] {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = cells[i] ?? "";
    });
    return row;
  });
}

export function parseRosterCsv(text: string):
  | {
      ok: true;
      rows: ClassCsvRow[];
      rawRows: Array<{ name: string; email: string; grade: string; papers: string }>;
    }
  | { ok: false; errors: string[] } {
  const parsed = parseCsvText(text);
  const errors: string[] = [];
  const rows: ClassCsvRow[] = [];
  const rawRows: Array<{ name: string; email: string; grade: string; papers: string }> = [];

  parsed.forEach((row, i) => {
    const line = i + 2;
    const name = row.name?.trim();
    const email = row.email?.trim().toLowerCase();
    const grade = row.grade?.trim() ?? "";
    const papersRaw = row.papers?.trim() ?? "all";

    if (!name) {
      errors.push(`Row ${line}: name is required`);
      return;
    }
    if (!email || !EMAIL_RE.test(email)) {
      errors.push(`Row ${line}: valid email is required`);
      return;
    }

    rawRows.push({ name, email, grade, papers: papersRaw });
    rows.push({
      name,
      email,
      grade,
      papers: parsePapersString(papersRaw),
    });
  });

  if (errors.length > 0) return { ok: false, errors };
  if (rows.length === 0) return { ok: false, errors: ["CSV has no data rows"] };
  return { ok: true, rows, rawRows };
}

export function parseTargetedCsv(text: string):
  | {
      ok: true;
      rawRows: Array<{
        name: string;
        email: string;
        grade: string;
        papers: string;
        targeted_paper?: string;
        attempts?: string;
        round_1_band?: string;
        round_1_pct?: string;
      }>;
    }
  | { ok: false; errors: string[] } {
  const parsed = parseCsvText(text);
  const errors: string[] = [];
  const rawRows: Array<{
    name: string;
    email: string;
    grade: string;
    papers: string;
    targeted_paper?: string;
    attempts?: string;
    round_1_band?: string;
    round_1_pct?: string;
  }> = [];

  parsed.forEach((row, i) => {
    const line = i + 2;
    const name = row.name?.trim();
    const email = row.email?.trim().toLowerCase();

    if (!name) {
      errors.push(`Row ${line}: name is required`);
      return;
    }
    if (!email || !EMAIL_RE.test(email)) {
      errors.push(`Row ${line}: valid email is required`);
      return;
    }

    rawRows.push({
      name,
      email,
      grade: row.grade?.trim() ?? "",
      papers: row.papers?.trim() ?? "all",
      targeted_paper: row.targeted_paper?.trim(),
      attempts: row.attempts?.trim(),
      round_1_band: row.round_1_band?.trim(),
      round_1_pct: row.round_1_pct?.trim(),
    });
  });

  if (errors.length > 0) return { ok: false, errors };
  if (rawRows.length === 0) return { ok: false, errors: ["CSV has no data rows"] };
  return { ok: true, rawRows };
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
