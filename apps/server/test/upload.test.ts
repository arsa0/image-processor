import { describe, expect, it } from "bun:test";
import { MAX_UPLOAD_SIZE } from "@shared/processor";
import { sniffImageMime, validateImageUpload } from "../src/upload.ts";

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const WEBP = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);
const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // "%PDF"

describe("sniffImageMime", () => {
  it("detects jpeg/png/webp from magic bytes", () => {
    expect(sniffImageMime(JPEG)).toBe("image/jpeg");
    expect(sniffImageMime(PNG)).toBe("image/png");
    expect(sniffImageMime(WEBP)).toBe("image/webp");
  });

  it("returns null for unsupported types", () => {
    expect(sniffImageMime(PDF)).toBeNull();
  });
});

describe("validateImageUpload", () => {
  it("accepts a valid image and reports the sniffed mime", () => {
    expect(validateImageUpload(PNG)).toEqual({ ok: true, mime: "image/png" });
  });

  it("rejects empty uploads with 400", () => {
    expect(validateImageUpload(new Uint8Array(0))).toMatchObject({
      ok: false,
      status: 400,
    });
  });

  it("rejects oversize uploads with 413", () => {
    const big = new Uint8Array(MAX_UPLOAD_SIZE + 1);
    expect(validateImageUpload(big)).toMatchObject({ ok: false, status: 413 });
  });

  it("rejects wrong type with 400", () => {
    expect(validateImageUpload(PDF)).toMatchObject({ ok: false, status: 400 });
  });
});
