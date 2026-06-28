/** Map practice percentage to a 1–5 star display (PDF demo convention). */
export function percentageToStars(pct: number): number {
  if (pct >= 88) return 5;
  if (pct >= 70) return 4;
  if (pct >= 55) return 3;
  if (pct >= 40) return 2;
  return 1;
}

export function formatStars(count: number): string {
  const n = Math.max(0, Math.min(5, Math.round(count)));
  return "★".repeat(n) + "☆".repeat(5 - n);
}

export function starsFromBand(band: string): number {
  const normalized = band.replace(/^Band\s+/i, "").trim();
  if (normalized === "5**") return 5;
  if (normalized === "5*" || normalized === "5") return 4;
  if (normalized === "4") return 3;
  if (normalized === "3") return 2;
  if (normalized === "2") return 1;
  return 1;
}
