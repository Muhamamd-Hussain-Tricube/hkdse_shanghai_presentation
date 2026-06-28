export type HkdsePastPaperManifest = {
  source_url: string;
  audio_by_year: Record<string, string>;
  gaps: string[];
};

const MANIFEST_URL = "/hkdse-past-papers/manifest.json";

let cachedManifest: HkdsePastPaperManifest | null = null;

export async function loadHkdsePastPaperManifest(): Promise<HkdsePastPaperManifest> {
  if (cachedManifest) return cachedManifest;
  const response = await fetch(MANIFEST_URL);
  if (!response.ok) {
    throw new Error(`Failed to load HKDSE past paper manifest (${response.status})`);
  }
  cachedManifest = (await response.json()) as HkdsePastPaperManifest;
  return cachedManifest;
}

export function getAudioUrlForYear(
  manifest: HkdsePastPaperManifest,
  year: string,
): string | undefined {
  return manifest.audio_by_year[year];
}

/** Demo year wired to scraped 2025 Paper 3 audio when available. */
export const HKDSE_DEMO_AUDIO_YEAR = "2025";

export async function getDemoPaper3AudioUrl(): Promise<string | undefined> {
  try {
    const manifest = await loadHkdsePastPaperManifest();
    return getAudioUrlForYear(manifest, HKDSE_DEMO_AUDIO_YEAR);
  } catch {
    return undefined;
  }
}
