import sharp from "sharp";

import { processImage } from "../src/pipeline.js";

// Generate a fixture in-memory so the script needs no files baked into the image.
// A 2000x1500 source guarantees the resize branch (downscale) actually runs.
async function makeFixture(): Promise<Uint8Array> {
  const png = await sharp({
    create: {
      width: 2000,
      height: 1500,
      channels: 3,
      background: { r: 120, g: 80, b: 200 },
    },
  })
    .png()
    .toBuffer();
  return new Uint8Array(png);
}

async function main(): Promise<void> {
  console.log(`[smoke] sharp version: ${sharp.versions.sharp}`);
  console.log(`[smoke] libvips version: ${sharp.versions.vips}`);

  const input = await makeFixture();
  const out = await processImage(input);

  // Re-decode the output to PROVE it is a real, valid WebP (not just bytes).
  const meta = await sharp(out.data).metadata();
  if (meta.format !== "webp") {
    throw new Error(`expected webp, got ${meta.format ?? "unknown"}`);
  }
  if (Math.max(out.width, out.height) > 1280) {
    throw new Error(`expected longest side <= 1280, got ${out.width}x${out.height}`);
  }

  console.log(`[smoke] OK: WebP ${out.width}x${out.height}, ${out.size} bytes`);
}

main().catch((err) => {
  console.error("[smoke] FAILED:", err instanceof Error ? err.message : err);
  process.exit(1); // non-zero exit so `docker run` / CI fails loudly
});
