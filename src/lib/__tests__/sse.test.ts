import { describe, expect, it } from "vitest";
import { SseParser } from "../sse";

describe("SseParser", () => {
  it("parses a single complete frame", () => {
    const p = new SseParser();
    const out = p.feed("event: token\ndata: {\"text\":\"hi\"}\n\n");
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({ event: "token", data: '{"text":"hi"}' });
  });

  it("waits for the blank-line terminator", () => {
    const p = new SseParser();
    expect(p.feed("event: token\ndata: ")).toEqual([]);
    expect(p.feed("partial")).toEqual([]);
    const out = p.feed("\n\n");
    expect(out).toHaveLength(1);
    expect(out[0].data).toBe("partial");
  });

  it("emits multiple events from one feed", () => {
    const p = new SseParser();
    const stream =
      "event: citations\ndata: {\"citations\":[]}\n\n" +
      "event: token\ndata: {\"text\":\"a\"}\n\n" +
      "event: token\ndata: {\"text\":\"b\"}\n\n" +
      "event: done\ndata: {}\n\n";
    const out = p.feed(stream);
    expect(out.map((e) => e.event)).toEqual(["citations", "token", "token", "done"]);
  });

  it("survives byte-level chunking", () => {
    const p = new SseParser();
    const collected: string[] = [];
    const full = "event: token\ndata: {\"text\":\"hello world\"}\n\n";
    for (const ch of full) {
      for (const ev of p.feed(ch)) collected.push(ev.data);
    }
    expect(collected).toEqual(['{"text":"hello world"}']);
  });

  it("normalises CRLF and bare CR line endings", () => {
    const p = new SseParser();
    const out = p.feed("event: x\r\ndata: y\r\n\r\n");
    expect(out).toEqual([{ event: "x", data: "y" }]);
  });

  it("strips a single leading space from values per spec", () => {
    const p = new SseParser();
    // Two spaces: parser eats one, the other survives.
    const out = p.feed("event: token\ndata:  hello\n\n");
    expect(out[0].data).toBe(" hello");
  });

  it("ignores comment lines starting with ':'", () => {
    const p = new SseParser();
    const out = p.feed(": keep-alive\nevent: token\ndata: ok\n\n");
    expect(out).toEqual([{ event: "token", data: "ok" }]);
  });

  it("joins multiple data: lines with newlines", () => {
    const p = new SseParser();
    const out = p.feed("event: token\ndata: line1\ndata: line2\n\n");
    expect(out[0].data).toBe("line1\nline2");
  });

  it("defaults event name to 'message' when omitted", () => {
    const p = new SseParser();
    const out = p.feed("data: payload\n\n");
    expect(out[0].event).toBe("message");
  });
});
