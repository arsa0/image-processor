import { describe, expect, it } from "bun:test";
import sharp from "sharp";

import { processImage, MAX_DIMENSION } from "../src/pipeline.js";

async function makeImage(width: number, height: number): Promise<Uint8Array> {
  const buf = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 120, g: 80, b: 200 },
    },
  })
    .png()
    .toBuffer();
  return new Uint8Array(buf);
}

async function makeNoisyImage(width: number, height: number): Promise<Uint8Array> {
  const pixels = Buffer.alloc(width * height * 3);
  for (let i = 0; i < pixels.length; i++) {
    pixels[i] = Math.floor(Math.random() * 256);
  }
  const buf = await sharp(pixels, { raw: { width, height, channels: 3 } })
    .png()
    .toBuffer();
  return new Uint8Array(buf);
}

describe("processImage", () => {
  it("outputs a valid WebP", async () => {
    const out = await processImage(await makeImage(2000, 1500));
    const meta = await sharp(out.data).metadata();
    expect(meta.format).toBe("webp");
  });

  it("clamps the longest side to 1280 and preserves aspect ratio", async () => {
    const out = await processImage(await makeImage(4000, 2000));
    expect(Math.max(out.width, out.height)).toBeLessThanOrEqual(MAX_DIMENSION);
    expect(out.width).toBe(1280);
    expect(out.height).toBe(640);
  });

  it("does not upscale a small image", async () => {
    const out = await processImage(await makeImage(300, 200));
    expect(out.width).toBe(300);
    expect(out.height).toBe(200);
  });

  it("produces output smaller than the input", async () => {
    const input = await makeNoisyImage(2000, 1500);
    const out = await processImage(input);
    expect(out.size).toBeLessThan(input.byteLength);
  });

  it("reports a positive processed size", async () => {
    const out = await processImage(await makeImage(1000, 1000));
    expect(out.size).toBeGreaterThan(0);
  });
});
