import type { LocalStoreData } from "./types";

const STORAGE_KEY = "ed-advisor-local-v1";

const emptyStore = (): LocalStoreData => ({
  users: [],
  organizations: [],
  members: [],
  cases: [],
  invitations: [],
  invitationTests: [],
  assignments: [],
  sessions: [],
  responses: [],
  interviews: [],
  reports: [],
  authSessionUserId: null,
  seeded: false,
});

let cache: LocalStoreData | null = null;
const listeners = new Set<() => void>();

export function uid(prefix = "id"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function now(): number {
  return Date.now();
}

export function loadStore(): LocalStoreData {
  if (cache) return cache;
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      cache = emptyStore();
      return cache;
    }
    cache = JSON.parse(raw) as LocalStoreData;
    return cache;
  } catch {
    cache = emptyStore();
    return cache;
  }
}

export function saveStore(data: LocalStoreData) {
  cache = data;
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
  listeners.forEach((l) => l());
}

export function updateStore(mutator: (prev: LocalStoreData) => LocalStoreData) {
  const prev = loadStore();
  const next = mutator(structuredClone(prev));
  saveStore(next);
  return next;
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function publicRow<T extends { id: string }>(row: T): T & { _id: string } {
  return { ...row, _id: row.id };
}
