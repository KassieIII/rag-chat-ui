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
  if (baseUrl === "demo") {
    yield* mockAskStream(body.question, init.signal);
    return;
  }

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

async function* mockAskStream(
  question: string,
  signal?: AbortSignal,
): AsyncGenerator<AskStreamUpdate, void, void> {
  const citations = [
    {
      chunk_id: 14,
      document_id: 2,
      source: "https://github.com/KassieIII/rag-docs/blob/main/README.md#streaming-answers-sse",
      heading: "Streaming answers (SSE)",
      score: 0.84,
      text: "POST /ask/stream returns text/event-stream. Citations arrive up-front, then answer text streams in token events, and the connection ends with done.",
    },
    {
      chunk_id: 27,
      document_id: 3,
      source: "https://github.com/KassieIII/rag-docs/blob/main/README.md#retrieval-modes",
      heading: "Retrieval modes",
      score: 0.79,
      text: "Hybrid retrieval over-fetches vector and BM25 candidates, then fuses rankings with Reciprocal Rank Fusion so literal tokens and semantic matches both survive.",
    },
  ];
  const answer = demoAnswer(question);

  await pause(180, signal);
  yield { kind: "citations", citations };
  for (const token of answer.match(/\S+\s*/g) ?? []) {
    await pause(36, signal);
    yield { kind: "token", text: token };
  }
  yield { kind: "done" };
}

function demoAnswer(question: string): string {
  if (question.toLowerCase().includes("hybrid")) {
    return "Hybrid mode asks both pgvector and Postgres BM25 for candidates, then merges them with Reciprocal Rank Fusion. That keeps paraphrase recall from embeddings while still catching exact tokens like decorators, flags, and version strings [chunk:27].";
  }
  return `For "${question}", the UI opens a POST stream, renders citations as soon as the backend sends them, then appends token events into the answer bubble. The same parser handles byte-level chunks, CRLF line endings, comments, multi-line data fields, and a final done event [chunk:14].`;
}

function pause(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.reject(new DOMException("Aborted", "AbortError"));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}
