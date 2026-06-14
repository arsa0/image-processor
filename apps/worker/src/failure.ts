import type { Job } from "bullmq";

export function isFinalAttempt(job: Pick<Job, "attemptsMade" | "opts">): boolean {
  const allowed = job.opts.attempts ?? 1;
  return job.attemptsMade >= allowed;
}
