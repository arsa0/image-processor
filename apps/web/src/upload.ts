import { ALLOWED_MIME_TYPE, MAX_UPLOAD_SIZE } from "@shared/processor";

export type FileValidation = { ok: true } | { ok: false; message: string };

/**
 * Client-side pre-check (UX only). The server re-validates by magic bytes,
 * so this is purely to give the user fast, friendly feedback.
 */
export function validateFile(file: File): FileValidation {
  if (!ALLOWED_MIME_TYPE.includes(file.type)) {
    return {
      ok: false,
      message: `Unsupported file type. Allowed: ${ALLOWED_MIME_TYPE.join(", ")}.`,
    };
  }

  if (file.size > MAX_UPLOAD_SIZE) {
    const maxMb = Math.round(MAX_UPLOAD_SIZE / (1024 * 1024));
    return { ok: false, message: `File is too large. Maximum size is ${maxMb} MB.` };
  }

  if (file.size === 0) {
    return { ok: false, message: "File is empty." };
  }

  return { ok: true };
}
