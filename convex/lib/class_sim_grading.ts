import { percentageToBand } from "./test_blueprints/ielts_practice";

export type HkdsePaperId = "R" | "W" | "L" | "S";

export const PAPER_MAX: Record<HkdsePaperId, number> = {
  R: 20,
  W: 25,
  L: 30,
  S: 10,
};

export const ALL_PAPERS: HkdsePaperId[] = ["R", "W", "L", "S"];

export type ComponentScore = {
  score: number;
  max: number;
  pct: number;
};

export type SimSessionResult = {
  total_score: number;
  total_max: number;
  component_scores: Record<HkdsePaperId, ComponentScore>;
  bands: Record<string, string>;
  overall_band: string;
};

function hashSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function seededFloat(seed: number, salt: number): number {
  const x = Math.sin(seed + salt * 9999) * 10000;
  return x - Math.floor(x);
}

function scoreForPaper(
  email: string,
  paper: HkdsePaperId,
  roundNumber: number,
  targetedPaper?: HkdsePaperId,
): number {
  const max = PAPER_MAX[paper];
  const seed = hashSeed(`${email}:${paper}:round${roundNumber}`);
  const base = seededFloat(seed, 1);

  let pct: number;
  if (roundNumber === 1) {
    // Wider spread for demo differentiation (35%–88%)
    pct = 0.35 + base * 0.53;
  } else {
    const prevSeed = hashSeed(`${email}:${paper}:round${roundNumber - 1}`);
    const prevBase = seededFloat(prevSeed, 1);
    const prevPct = 0.35 + prevBase * 0.53;
    if (paper === targetedPaper) {
      const bump = 8 + seededFloat(seed, 2) * 15;
      pct = Math.min(0.95, prevPct + bump / 100);
    } else {
      pct = prevPct + (seededFloat(seed, 3) - 0.5) * 0.06;
      pct = Math.max(0.3, Math.min(0.92, pct));
    }
  }

  return Math.round(pct * max);
}

export function generateSimSession(
  email: string,
  papers: HkdsePaperId[],
  roundNumber: number,
  targetedPaper?: HkdsePaperId,
): SimSessionResult {
  const assigned = papers.length > 0 ? papers : ALL_PAPERS;
  const component_scores = {} as Record<HkdsePaperId, ComponentScore>;
  let total_score = 0;
  let total_max = 0;

  for (const paper of assigned) {
    const max = PAPER_MAX[paper];
    const score = scoreForPaper(email, paper, roundNumber, targetedPaper);
    const pct = max > 0 ? (score / max) * 100 : 0;
    component_scores[paper] = { score, max, pct };
    total_score += score;
    total_max += max;
  }

  const bands: Record<string, string> = {};
  for (const paper of assigned) {
    const cs = component_scores[paper];
    const key =
      paper === "R"
        ? "reading"
        : paper === "W"
          ? "writing"
          : paper === "L"
            ? "listening_integrated_skills"
            : "speaking";
    bands[key] = percentageToBand(cs.pct);
  }

  const overallPct = total_max > 0 ? (total_score / total_max) * 100 : 0;
  const overall_band = `Band ${percentageToBand(overallPct)}`;

  return {
    total_score,
    total_max,
    component_scores,
    bands,
    overall_band,
  };
}
