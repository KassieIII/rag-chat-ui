/** Mirrors `app/schemas.py::Citation` from the rag-docs backend. */
export interface Citation {
  chunk_id: number;
  document_id: number;
  source: string;
  heading: string | null;
  score: number;
  text: string;
}

export interface AskRequest {
  question: string;
  top_k?: number;
}

/** One emitted update from the streaming /ask/stream endpoint. */
export type AskStreamUpdate =
  | { kind: "citations"; citations: Citation[] }
  | { kind: "token"; text: string }
  | { kind: "done" }
  | { kind: "error"; message: string };
