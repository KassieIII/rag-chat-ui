"use client";

import { useCallback, useRef, useState } from "react";

import { askStream } from "@/lib/ask-stream";
import type { Citation } from "@/lib/api";
import { apiBaseUrl, cn } from "@/lib/utils";

import { ChatInput } from "@/components/chat-input";
import { CitationCard } from "@/components/citation-card";
import { ThemeToggle } from "@/components/theme-toggle";

interface AssistantMessage {
  role: "assistant";
  text: string;
  citations: Citation[];
  streaming: boolean;
  error?: string;
}

interface UserMessage {
  role: "user";
  text: string;
}

type Message = AssistantMessage | UserMessage;

export default function HomePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(async (question: string) => {
    setBusy(true);
    setMessages((prev) => [
      ...prev,
      { role: "user", text: question },
      { role: "assistant", text: "", citations: [], streaming: true },
    ]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      for await (const update of askStream(apiBaseUrl(), { question }, { signal: controller.signal })) {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role !== "assistant") return prev;
          const next = [...prev];
          const updated: AssistantMessage = { ...last };
          if (update.kind === "citations") updated.citations = update.citations;
          else if (update.kind === "token") updated.text += update.text;
          else if (update.kind === "error") updated.error = update.message;
          else if (update.kind === "done") updated.streaming = false;
          next[next.length - 1] = updated;
          return next;
        });
        if (update.kind === "done") break;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "stream interrupted";
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role !== "assistant") return prev;
        const next = [...prev];
        next[next.length - 1] = { ...last, streaming: false, error: message };
        return next;
      });
    } finally {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role !== "assistant" || !last.streaming) return prev;
        const next = [...prev];
        next[next.length - 1] = { ...last, streaming: false };
        return next;
      });
      setBusy(false);
      abortRef.current = null;
    }
  }, []);

  function abort() {
    abortRef.current?.abort();
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 p-4 md:p-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">rag-chat-ui</h1>
          <p className="text-sm muted">Streaming chat over the rag-docs API · SSE · cited</p>
        </div>
        <ThemeToggle />
      </header>

      <section className="flex-1 space-y-6">
        {messages.length === 0 ? (
          <EmptyState onPick={send} />
        ) : (
          messages.map((m, i) => <MessageBubble key={i} message={m} />)
        )}
      </section>

      <ChatInput onSubmit={send} busy={busy} onAbort={abort} />

      <footer className="text-xs muted">
        Transport: <code className="font-mono">POST /ask/stream</code> · Demo: <code className="font-mono">?demo=1</code> · Built with Next.js 16 + React 19
      </footer>
    </main>
  );
}

function EmptyState({ onPick }: { onPick: (q: string) => void }) {
  const samples = [
    "What is FastAPI dependency injection?",
    "How do I add a startup event in FastAPI?",
    "Compare vector and hybrid retrieval modes.",
  ];
  return (
    <div className="surface animate-fade-in p-6">
      <h2 className="text-lg font-medium">Ask the docs.</h2>
      <p className="mt-1 text-sm muted">
        Streaming Server-Sent Events from <code>POST /ask/stream</code>. Citations arrive first so
        you can read sources while the model is still thinking.
      </p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {samples.map((s) => (
          <li key={s}>
            <button
              onClick={() => onPick(s)}
              className={cn(
                "surface w-full p-3 text-left text-sm transition",
                "hover:border-accent",
              )}
            >
              {s}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div
          className={cn(
            "max-w-[85%] rounded-2xl bg-accent px-4 py-2 text-sm text-accent-fg",
            "animate-fade-in",
          )}
        >
          {message.text}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="surface animate-fade-in p-4 text-sm leading-relaxed">
        {message.text || (message.streaming ? <span className="muted">thinking…</span> : null)}
        {message.streaming && message.text && (
          <span className="ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 animate-blink bg-accent" />
        )}
        {message.error && (
          <p className="mt-3 rounded-md bg-red-500/10 p-2 text-xs text-red-500">
            {message.error}
          </p>
        )}
      </div>

      {message.citations.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {message.citations.map((c, i) => (
            <CitationCard key={c.chunk_id} index={i} citation={c} />
          ))}
        </div>
      )}
    </div>
  );
}
