import { describe, expect, it, afterEach } from "bun:test";
import { getJobDownload } from "../src/api.ts";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("getJobDownload", () => {
  it("returns the download payload on 200", async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({ downloadUrl: "https://x/y", expiresAt: "2026-01-01T00:00:00.000Z" }),
        { status: 200, headers: { "content-type": "application/json" } }
      )) as typeof fetch;

    const res = await getJobDownload("abc");
    expect(res.downloadUrl).toBe("https://x/y");
  });

  it("throws the server message on non-2xx", async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ message: "not ready", status: "409" }), {
        status: 409,
      })) as typeof fetch;

    await expect(getJobDownload("abc")).rejects.toThrow("not ready");
  });
});
