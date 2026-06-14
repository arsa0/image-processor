import { JobStatus } from "@shared/processor";

export const POLL_START_MS = 1_000; // first wait ~1s
export const POLL_CAP_MS = 8_000; // never wait more than ~8s
export const POLL_TIMEOUT_MS = 120_000; // ~2min safety stop

export function isTerminal(status: JobStatus): boolean {
  return status === JobStatus.COMPLETED || status === JobStatus.FAILED;
}

export function nextDelay(attempt: number): number {
  const delay = POLL_START_MS * 2 ** attempt;
  return Math.min(delay, POLL_CAP_MS);
}
