import { useEffect, useRef, useState } from "react";
import type { JobCreatedResponse } from "@shared/processor";
import { ALLOWED_MIME_TYPE } from "@shared/processor";
import { validateFile } from "./upload.js";
import { uploadJob } from "./api.js";

const API_BASE = import.meta.env.PUBLIC_API_URL ?? "";

type HealthState = "checking" | "ok" | "error";

export function App() {
  const [health, setHealth] = useState<HealthState>("checking");
  const [file, setFile] = useState<File | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [job, setJob] = useState<JobCreatedResponse | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function checkHealth(): Promise<void> {
      try {
        const res = await fetch(`${API_BASE}/health`, { signal: controller.signal });
        setHealth(res.ok ? "ok" : "error");
      } catch {
        if (!controller.signal.aborted) setHealth("error");
      }
    }
    void checkHealth();
    return () => controller.abort();
  }, []);

  // Abort any in-flight upload on unmount.
  useEffect(() => () => abortRef.current?.abort(), []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): void {
    setSubmitError(null);
    setJob(null);
    const selected = e.target.files?.[0] ?? null;

    if (!selected) {
      setFile(null);
      setClientError(null);
      return;
    }

    const result = validateFile(selected);
    if (!result.ok) {
      setFile(null);
      setClientError(result.message);
      return;
    }

    setClientError(null);
    setFile(selected);
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!file) return;

    setSubmitting(true);
    setSubmitError(null);
    setJob(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const created = await uploadJob(file, controller.signal);
      setJob(created);
    } catch (err) {
      if (!controller.signal.aborted) {
        setSubmitError(err instanceof Error ? err.message : "Upload failed.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ fontFamily: "system-ui", padding: "2rem", maxWidth: 480 }}>
      <h1>Image Processor</h1>
      <p>
        API health: <strong data-testid="health-status">{health}</strong>
      </p>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1rem" }}>
        <input
          type="file"
          accept={ALLOWED_MIME_TYPE.join(",")}
          onChange={handleFileChange}
          data-testid="file-input"
        />

        {clientError && (
          <p role="alert" data-testid="client-error" style={{ color: "crimson" }}>
            {clientError}
          </p>
        )}

        <button type="submit" disabled={!file || submitting} data-testid="submit">
          {submitting ? "Uploading…" : "Upload"}
        </button>
      </form>

      {submitError && (
        <p role="alert" data-testid="submit-error" style={{ color: "crimson" }}>
          {submitError}
        </p>
      )}

      {job && (
        <section data-testid="job-result" style={{ marginTop: "1rem" }}>
          <p>
            Job ID: <code data-testid="job-id">{job.job_id}</code>
          </p>
          <p>
            Status: <strong data-testid="job-status">{job.status}</strong>
          </p>
        </section>
      )}
    </main>
  );
}
