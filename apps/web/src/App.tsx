import { useEffect, useState } from "react";

const API_BASE = import.meta.env.PUBLIC_API_URL ?? "";

type HealthState = "checking" | "ok" | "error";

export function App() {
  const [health, setHealth] = useState<HealthState>("checking");

  useEffect(() => {
    const controller = new AbortController();

    async function checkHealth(): Promise<void> {
      try {
        const res = await fetch(`${API_BASE}/health`, {
          signal: controller.signal,
        });
        setHealth(res.ok ? "ok" : "error");
      } catch {
        if (!controller.signal.aborted) {
          setHealth("error");
        }
      }
    }

    void checkHealth();
    return () => controller.abort();
  }, []);

  return (
    <main style={{ fontFamily: "system-ui", padding: "2rem" }}>
      <h1>Image Processor</h1>
      <p>
        API health: <strong data-testid="health-status">{health}</strong>
      </p>
    </main>
  );
}
