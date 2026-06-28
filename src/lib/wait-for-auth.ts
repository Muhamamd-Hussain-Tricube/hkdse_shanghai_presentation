import { localApi } from "./local-demo/handlers";

/** Poll until auth session is active after signup (local mode). */
export async function waitForAuthSession(_convex?: unknown, maxMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const me = localApi.me();
    if (me?.user) return me;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("Auth session not ready");
}
