import type { JobCreatedResponse, ErrorResponse } from "@shared/processor";

const API_BASE = import.meta.env.PUBLIC_API_URL ?? "";

export async function uploadJob(file: File, signal?: AbortSignal): Promise<JobCreatedResponse> {
  const form = new FormData();
  form.append("image", file);

  const res = await fetch(`${API_BASE}/api/jobs`, {
    method: "POST",
    body: form,
    signal,
  });

  if (!res.ok) {
    // Server returns ErrorResponse { message, status, code? }
    const err = (await res.json().catch(() => null)) as ErrorResponse | null;
    throw new Error(err?.message ?? `Upload failed (HTTP ${res.status}).`);
  }

  return (await res.json()) as JobCreatedResponse;
}
