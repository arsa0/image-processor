import { describe, expect, it } from "bun:test";
import { JobStatus } from "@shared/processor";
import { isTerminal, nextDelay, POLL_START_MS, POLL_CAP_MS } from "../src/polling.ts";

describe("isTerminal", () => {
  it("is true for completed and failed", () => {
    expect(isTerminal(JobStatus.COMPLETED)).toBe(true);
    expect(isTerminal(JobStatus.FAILED)).toBe(true);
  });

  it("is false for pending and processing", () => {
    expect(isTerminal(JobStatus.PENDING)).toBe(false);
    expect(isTerminal(JobStatus.PROCESSING)).toBe(false);
  });
});

describe("nextDelay", () => {
  it("starts at ~1s and doubles", () => {
    expect(nextDelay(0)).toBe(POLL_START_MS);
    expect(nextDelay(1)).toBe(2_000);
    expect(nextDelay(2)).toBe(4_000);
    expect(nextDelay(3)).toBe(8_000);
  });

  it("caps at ~8s", () => {
    expect(nextDelay(4)).toBe(POLL_CAP_MS);
    expect(nextDelay(10)).toBe(POLL_CAP_MS);
  });

  it("never exceeds the cap", () => {
    for (let i = 0; i < 20; i++) {
      expect(nextDelay(i)).toBeLessThanOrEqual(POLL_CAP_MS);
    }
  });
});
