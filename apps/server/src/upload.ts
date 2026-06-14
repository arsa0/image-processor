import { MAX_UPLOAD_SIZE } from "@shared/processor";

export type UploadValidation =
  | { ok: true; mime: string }
  | { ok: false; status: 400 | 413; message: string };

/**
 * Detects image type from leading magic bytes. Returns a canonical MIME
 * string or null. We trust bytes, never the client-declared Content-Type.
 */
export function sniffImageMime(bytes: Uint8Array): string | null {
  // JPEG: FF D8 FF
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length >= 8 && png.every((b, i) => bytes[i] === b)) {
    return "image/png";
  }

  // WebP: "RIFF" .... "WEBP"  (bytes 0-3 and 8-11)
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 && // RIFF
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50 // WEBP
  ) {
    return "image/webp";
  }

  return null;
}

/**
 * Validates a decoded upload. Order matters: empty -> size -> type, so the
 * caller always gets the most specific failure first.
 */
export function validateImageUpload(bytes: Uint8Array): UploadValidation {
  if (bytes.length === 0) {
    return { ok: false, status: 400, message: "Uploaded file is empty." };
  }

  if (bytes.length > MAX_UPLOAD_SIZE) {
    return {
      ok: false,
      status: 413,
      message: `File exceeds maximum size of ${MAX_UPLOAD_SIZE} bytes.`,
    };
  }

  const mime = sniffImageMime(bytes);
  if (!mime) {
    return {
      ok: false,
      status: 400,
      message: "Unsupported image type. Allowed: JPEG, PNG, WebP.",
    };
  }

  return { ok: true, mime };
}
