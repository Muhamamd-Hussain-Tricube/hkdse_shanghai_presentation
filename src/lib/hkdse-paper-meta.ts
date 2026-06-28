export type HkdsePaperId = "R" | "W" | "L" | "S";

export const HKDSE_PAPER_IDS: HkdsePaperId[] = ["R", "W", "L", "S"];

export const HKDSE_PAPER_META: Array<{
  id: HkdsePaperId;
  title: string;
  label: string;
  minutes: number;
}> = [
  { id: "R", title: "Paper 1 Reading", label: "Reading", minutes: 90 },
  { id: "W", title: "Paper 2 Writing", label: "Writing", minutes: 120 },
  {
    id: "L",
    title: "Paper 3 Listening & Integrated Skills",
    label: "Listening & Integrated Skills",
    minutes: 120,
  },
  { id: "S", title: "Paper 4 Speaking", label: "Speaking", minutes: 20 },
];

export function resolveAssignedPapers(
  hkdsePapers: HkdsePaperId[] | undefined | null,
): HkdsePaperId[] {
  if (!hkdsePapers || hkdsePapers.length === 0) return [...HKDSE_PAPER_IDS];
  return hkdsePapers.filter((p) => HKDSE_PAPER_IDS.includes(p));
}

export function paperLabel(id: HkdsePaperId): string {
  return HKDSE_PAPER_META.find((p) => p.id === id)?.title ?? id;
}
