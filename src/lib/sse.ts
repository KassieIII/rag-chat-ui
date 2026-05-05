/**
 * Pure SSE frame parser. The streaming Fetch API gives us arbitrary byte
 * chunks, not whole frames, so a stateful parser keeps a buffer and emits
 * complete `event:`/`data:` blocks separated by a blank line.
 *
 * Why not `EventSource`? It only supports GET. The /ask/stream endpoint
 * is POST with a JSON body, so we drive the stream ourselves over `fetch`.
 *
 * Spec reference: https://html.spec.whatwg.org/multipage/server-sent-events.html
 */

export interface SseEvent {
  /** The `event:` field, defaults to `"message"` per spec. */
  event: string;
  /** The concatenated `data:` lines for this event (newlines preserved). */
  data: string;
}

export class SseParser {
  private buffer = "";

  /**
   * Feed a chunk of decoded text into the parser. Returns any complete
   * events that became available. Partial trailing data is retained.
   */
  feed(chunk: string): SseEvent[] {
    // Normalise line endings as the spec requires: \r\n and \r both
    // collapse to \n before processing.
    this.buffer += chunk.replace(/\r\n?/g, "\n");

    const events: SseEvent[] = [];

    let sep = this.buffer.indexOf("\n\n");
    while (sep !== -1) {
      const raw = this.buffer.slice(0, sep);
      this.buffer = this.buffer.slice(sep + 2);
      const ev = this.parseFrame(raw);
      if (ev) events.push(ev);
      sep = this.buffer.indexOf("\n\n");
    }

    return events;
  }

  private parseFrame(raw: string): SseEvent | null {
    if (raw.length === 0) return null;
    let event = "message";
    const dataLines: string[] = [];

    for (const line of raw.split("\n")) {
      if (line.length === 0 || line.startsWith(":")) continue;
      const idx = line.indexOf(":");
      const field = idx === -1 ? line : line.slice(0, idx);
      // Per spec, drop a single leading space in the value.
      let value = idx === -1 ? "" : line.slice(idx + 1);
      if (value.startsWith(" ")) value = value.slice(1);

      if (field === "event") event = value;
      else if (field === "data") dataLines.push(value);
      // id / retry / unknown fields are ignored on purpose.
    }

    if (dataLines.length === 0) return null;
    return { event, data: dataLines.join("\n") };
  }
}
