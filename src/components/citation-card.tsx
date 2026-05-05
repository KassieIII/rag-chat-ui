"use client";

import type { Citation } from "@/lib/api";
import { cn } from "@/lib/utils";

export function CitationCard({ index, citation }: { index: number; citation: Citation }) {
  const preview = citation.text.length > 240 ? citation.text.slice(0, 240) + "…" : citation.text;
  return (
    <a
      href={citation.source}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "surface block animate-fade-in p-3 text-sm transition",
        "hover:border-accent hover:shadow-sm",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-mono muted">[chunk:{citation.chunk_id}]</span>
        <span className="text-xs muted">score {citation.score.toFixed(3)}</span>
      </div>
      <div className="mt-1 truncate text-xs text-accent">
        {index + 1}. {citation.heading ?? new URL(citation.source).hostname}
      </div>
      <p className="mt-2 line-clamp-3 leading-relaxed">{preview}</p>
    </a>
  );
}
