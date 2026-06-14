import { describe, expect, it } from "bun:test";
import { isFinalAttempt } from "../src/failure.js";

const fakeJob = (attemptsMade: number, attempts?: number) =>
  ({ attemptsMade, opts: { attempts } }) as Parameters<typeof isFinalAttempt>[0];

describe("isFinalAttempt", () => {
  it("is not final while retries remain", () => {
    expect(isFinalAttempt(fakeJob(1, 3))).toBe(false);
    expect(isFinalAttempt(fakeJob(2, 3))).toBe(false);
  });

  it("is final once attemptsMade reaches the configured limit", () => {
    expect(isFinalAttempt(fakeJob(3, 3))).toBe(true);
  });

  it("treats a missing attempts option as single-attempt", () => {
    expect(isFinalAttempt(fakeJob(1))).toBe(true);
  });
});
