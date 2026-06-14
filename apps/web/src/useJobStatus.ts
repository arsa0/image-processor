import { useEffect, useState } from "react";
import type { JobStatusResponse } from "@shared/processor";
import { getJobStatus } from "./api.js";
import { isTerminal, nextDelay, POLL_TIMEOUT_MS } from "./polling.js";

export type JobStatusState =
  | { phase: "idle" }
  | { phase: "polling"; data: JobStatusResponse | null }
  | { phase: "done"; data: JobStatusResponse }
  | { phase: "timeout"; data: JobStatusResponse | null }
  | { phase: "error"; message: string };

export function useJobStatus(jobId: string | null): JobStatusState {
  const [state, setState] = useState<JobStatusState>({ phase: "idle" });

  useEffect(() => {
    if (!jobId) {
      setState({ phase: "idle" });
      return;
    }

    setState({ phase: "polling", data: null });

    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    const startedAt = Date.now();

    async function tick(): Promise<void> {
      try {
        const data = await getJobStatus(jobId!, controller.signal);

        if (controller.signal.aborted) return;

        if (isTerminal(data.status)) {
          setState({ phase: "done", data });
          return;
        }

        if (Date.now() - startedAt >= POLL_TIMEOUT_MS) {
          setState({ phase: "timeout", data });
          return;
        }

        setState({ phase: "polling", data });
        timer = setTimeout(() => void tick(), nextDelay(attempt));
        attempt += 1;
      } catch (err) {
        if (controller.signal.aborted) return;
        setState({
          phase: "error",
          message: err instanceof Error ? err.message : "Status check failed.",
        });
      }
    }

    void tick();

    return () => {
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [jobId]);

  return state;
}
