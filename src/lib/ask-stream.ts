import type { AskRequest, AskStreamUpdate } from "./api";
import { SseParser } from "./sse";

/**
 * POST to /ask/stream and yield decoded updates as they arrive. The
 * caller is responsible for aborting via the `signal` option.
 */
export async function* askStream(
  baseUrl: string,
  body: AskRequest,
  init: { signal?: AbortSignal } = {},
): AsyncGenerator<AskStreamUpdate, void, void> {
  const res = await fetch(`${baseUrl}/ask/stream`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "text/event-stream",
    },
    body: JSON.stringify({ question: body.question, top_k: body.top_k ?? 5 }),
    signal: init.signal,
  });

  if (!res.ok || !res.body) {
    let detail = `HTTP ${res.status}`;
    try {
      const txt = await res.text();
      if (txt) detail += `: ${txt}`;
    } catch {
      // ignore — the status alone is enough context.
    }
    yield { kind: "error", message: detail };
    return;
  }

  const decoder = new TextDecoder("utf-8");
  const reader = res.body.getReader();
  const parser = new SseParser();

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      for (const ev of parser.feed(decoder.decode(value, { stream: true }))) {
        const update = decode(ev.event, ev.data);
        if (update) yield update;
        if (update?.kind === "done") return;
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // already released
    }
  }
}

function decode(event: string, data: string): AskStreamUpdate | null {
  try {
    const payload = JSON.parse(data) as Record<string, unknown>;
    if (event === "citations") {
      return { kind: "citations", citations: (payload.citations as never) ?? [] };
    }
    if (event === "token") {
      return { kind: "token", text: String(payload.text ?? "") };
    }
    if (event === "error") {
      return { kind: "error", message: String(payload.message ?? "stream error") };
    }
    if (event === "done") return { kind: "done" };
  } catch {
    return { kind: "error", message: `bad SSE payload: ${data.slice(0, 200)}` };
  }
  return null;
}
