import { describe, expect, it } from "bun:test";
import { MAX_UPLOAD_SIZE } from "@shared/processor";
import { sniffImageMime, validateFile, validateImageUpload } from "../src/upload.ts";

function makeFile(bytes: number, type: string): File {
  return new File([new Uint8Array(bytes)], "x", { type });
}

describe("validateFile", () => {
  it("accepts a valid jpeg/png/webp", () => {
    expect(validateFile(makeFile(10, "image/jpeg")).ok).toBe(true);
    expect(validateFile(makeFile(10, "image/png")).ok).toBe(true);
    expect(validateFile(makeFile(10, "image/webp")).ok).toBe(true);
  });

  it("rejects unsupported types", () => {
    expect(validateFile(makeFile(10, "application/pdf"))).toMatchObject({ ok: false });
  });

  it("rejects oversize files", () => {
    expect(validateFile(makeFile(MAX_UPLOAD_SIZE + 1, "image/png"))).toMatchObject({
      ok: false,
    });
  });

  it("rejects empty files", () => {
    expect(validateFile(makeFile(0, "image/png"))).toMatchObject({ ok: false });
  });
});

describe("validateImageUpload — edge cases", () => {
  it("prioritizes the empty check over the type check", () => {
    expect(validateImageUpload(new Uint8Array(0))).toMatchObject({ ok: false, status: 400 });
  });

  it("accepts a file at exactly the max size", () => {
    const atLimit = new Uint8Array(MAX_UPLOAD_SIZE);
    atLimit.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]); // PNG signature up front
    expect(validateImageUpload(atLimit)).toMatchObject({ ok: true, mime: "image/png" });
  });

  it("rejects a truncated PNG signature", () => {
    expect(sniffImageMime(new Uint8Array([0x89, 0x50, 0x4e]))).toBeNull();
  });

  it("rejects RIFF containers that are not WebP", () => {
    const wav = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45]); // "RIFF....WAVE"
    expect(sniffImageMime(wav)).toBeNull();
  });
});
