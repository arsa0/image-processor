import { useEffect, useRef, useState } from "react";
import type { JobCreatedResponse, DownloadResponse } from "@shared/processor";
import { ALLOWED_MIME_TYPE, JobStatus } from "@shared/processor";

import { validateFile } from "./upload.js";
import { uploadJob, getJobDownload } from "./api.js";
import { useJobStatus } from "./useJobStatus.js";

const API_BASE = import.meta.env.PUBLIC_API_URL ?? "";

type HealthState = "checking" | "ok" | "error";

export function App() {
  const [health, setHealth] = useState<HealthState>("checking");
  const [file, setFile] = useState<File | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [job, setJob] = useState<JobCreatedResponse | null>(null);
  const [download, setDownload] = useState<DownloadResponse | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const status = useJobStatus(job?.job_id ?? null);

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

  useEffect(() => {
    const jobId = job?.job_id;
    const completed = status.data?.status === JobStatus.COMPLETED;
    if (!jobId || !completed) return;

    const controller = new AbortController();
    setDownload(null);
    setDownloadError(null);

    getJobDownload(jobId, controller.signal)
      .then((res) => {
        if (!controller.signal.aborted) setDownload(res);
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setDownloadError(err instanceof Error ? err.message : "Could not get download link.");
        }
      });

    return () => controller.abort();
  }, [job?.job_id, status.data?.status]);

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

    setDownload(null);
    setDownloadError(null);
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
      setDownload(null);
      setDownloadError(null);
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
            Status:{" "}
            <strong data-testid="job-status">
              {status.phase === "done" || status.phase === "polling" || status.phase === "timeout"
                ? (status.data?.status ?? job.status)
                : job.status}
            </strong>
          </p>
          {status.data?.status === JobStatus.COMPLETED && (
            <div data-testid="download-area">
              {download ? (
                <a href={download.downloadUrl} data-testid="download-link" download>
                  Download processed image
                </a>
              ) : downloadError ? (
                <p role="alert" data-testid="download-error" style={{ color: "crimson" }}>
                  {downloadError}
                </p>
              ) : (
                <p>Preparing download…</p>
              )}
            </div>
          )}

          {/* Failed: informative error from API */}
          {status.data?.status === JobStatus.FAILED && (
            <p role="alert" data-testid="job-failed" style={{ color: "crimson" }}>
              {status.data.errorMessage ?? "Processing failed. Please try a different image."}
            </p>
          )}

          {/* Timeout: still running after the safety cap */}
          {status.phase === "timeout" && (
            <p role="status" data-testid="job-timeout">
              This is taking longer than expected. The job may still finish — check back shortly.
            </p>
          )}

          {/* Transport-level polling error (network/HTTP) */}
          {status.phase === "error" && (
            <p role="alert" data-testid="status-error" style={{ color: "crimson" }}>
              {status.message}
            </p>
          )}
        </section>
      )}
    </main>
  );
}
