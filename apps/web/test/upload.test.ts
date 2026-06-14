import { describe, expect, it } from "bun:test";
import { MAX_UPLOAD_SIZE } from "@shared/processor";
import { validateFile } from "../src/upload.ts";

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
