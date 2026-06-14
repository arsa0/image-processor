import sharp from "sharp";

export const MAX_DIMENSION = 1280;
export const WEBP_QUALITY = 80;

export type ProcessedImage = {
  data: Buffer;
  width: number;
  height: number;
  size: number;
};

export async function processImage(input: Uint8Array): Promise<ProcessedImage> {
  const { data, info } = await sharp(input)
    .rotate()
    .resize(MAX_DIMENSION, MAX_DIMENSION, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer({ resolveWithObject: true });

  return {
    data,
    width: info.width,
    height: info.height,
    size: info.size,
  };
}
