import type {
  JobCreatedResponse,
  JobStatusResponse,
  DownloadResponse,
  ErrorResponse,
} from "@shared/processor";

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

export async function getJobDownload(
  jobId: string,
  signal?: AbortSignal
): Promise<DownloadResponse> {
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}/download`, { signal });

  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as ErrorResponse | null;
    throw new Error(err?.message ?? `Download link failed (HTTP ${res.status}).`);
  }

  return (await res.json()) as DownloadResponse;
}

export async function getJobStatus(
  jobId: string,
  signal?: AbortSignal
): Promise<JobStatusResponse> {
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}`, { signal });

  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as ErrorResponse | null;
    throw new Error(err?.message ?? `Status check failed (HTTP ${res.status}).`);
  }

  return (await res.json()) as JobStatusResponse;
}
