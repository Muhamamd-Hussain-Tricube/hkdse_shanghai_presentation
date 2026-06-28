// Shared helper to call Google AI Studio's Gemini API via its
// OpenAI-compatible endpoint. Lets us reuse the existing OpenAI-shaped
// request/response code in all edge functions with minimal changes.

const GEMINI_OPENAI_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

function mapModel(model: string | undefined): string {
  if (!model) return "gemini-flash-latest";
  const stripped = model.replace(/^google\//, "");
  switch (stripped) {
    // Lovable-only preview names → Google AI Studio public ids.
    case "gemini-3-flash-preview":
    case "gemini-3.1-flash-image-preview":
      return "gemini-flash-latest";
    case "gemini-3.1-pro-preview":
    case "gemini-3-pro-image-preview":
      return "gemini-2.5-pro";
    default:
      return stripped;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Drop-in replacement for the Lovable AI Gateway chat completions call.
 * Retries on 429 / 5xx with exponential backoff (Google AI Studio free tier
 * has tight per-minute quotas).
 */
export async function geminiChatCompletion(
  apiKey: string,
  body: Record<string, unknown> & { model?: string },
): Promise<Response> {
  const payload = { ...body, model: mapModel(body.model as string | undefined) };
  const maxAttempts = 5;
  let lastRes: Response | null = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(GEMINI_OPENAI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (res.ok) return res;
    if (res.status !== 429 && res.status < 500) return res;

    // Try to honor server-suggested retry delay if present.
    let delayMs = 2000 * Math.pow(2, attempt); // 2s, 4s, 8s, 16s, 32s
    try {
      const cloned = res.clone();
      const text = await cloned.text();
      const m = text.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/);
      if (m) delayMs = Math.max(delayMs, Math.ceil(parseFloat(m[1]) * 1000) + 500);
      // Re-create response so caller can read body if we exhaust retries.
      lastRes = new Response(text, {
        status: res.status,
        statusText: res.statusText,
        headers: res.headers,
      });
    } catch {
      lastRes = res;
    }
    if (attempt === maxAttempts - 1) break;
    await sleep(Math.min(delayMs, 30000));
  }
  return lastRes!;
}
