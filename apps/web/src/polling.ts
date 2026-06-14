import type { JobStatusResponse } from "@shared/processor";
import { JobStatus } from "@shared/processor";

export type ResultView =
  | { kind: "none" }
  | { kind: "download" }
  | { kind: "failed"; message: string }
  | { kind: "timeout" };

export const POLL_START_MS = 1_000;
export const POLL_CAP_MS = 8_000;
export const POLL_TIMEOUT_MS = 120_000;

export function isTerminal(status: JobStatus): boolean {
  return status === JobStatus.COMPLETED || status === JobStatus.FAILED;
}

export function nextDelay(attempt: number): number {
  const delay = POLL_START_MS * 2 ** attempt;
  return Math.min(delay, POLL_CAP_MS);
}

export function resultView(phase: string, data: JobStatusResponse | null): ResultView {
  if (data?.status === JobStatus.COMPLETED) return { kind: "download" };
  if (data?.status === JobStatus.FAILED)
    return { kind: "failed", message: data.errorMessage ?? "Processing failed." };
  if (phase === "timeout") return { kind: "timeout" };
  return { kind: "none" };
}
