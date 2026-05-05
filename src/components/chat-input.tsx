"use client";

import { useRef } from "react";

import { cn } from "@/lib/utils";

export function ChatInput({
  onSubmit,
  busy,
  onAbort,
}: {
  onSubmit: (question: string) => void;
  busy: boolean;
  onAbort: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function submit() {
    const value = ref.current?.value.trim();
    if (!value || busy) return;
    onSubmit(value);
    if (ref.current) ref.current.value = "";
    autosize();
  }

  function autosize() {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="surface flex items-end gap-2 p-2"
    >
      <textarea
        ref={ref}
        rows={1}
        placeholder="Ask the docs… (Enter to send, Shift+Enter for newline)"
        onInput={autosize}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        className={cn(
          "min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 outline-none",
          "placeholder:text-[rgb(var(--muted))]",
        )}
      />
      {busy ? (
        <button
          type="button"
          onClick={onAbort}
          className={cn(
            "h-9 rounded-xl border px-4 text-sm transition",
            "border-[rgb(var(--border))] hover:bg-[rgb(var(--bg))]",
          )}
        >
          Stop
        </button>
      ) : (
        <button
          type="submit"
          className={cn(
            "h-9 rounded-xl bg-accent px-4 text-sm font-medium text-accent-fg",
            "transition hover:opacity-90 disabled:opacity-50",
          )}
        >
          Send
        </button>
      )}
    </form>
  );
}
