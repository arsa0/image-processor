import { describe, expect, it } from "bun:test";

import { readWorkerEnv } from "../src/env.js";

const baseEnv = { REDIS_URL: "redis://localhost:6379" };

describe("readWorkerEnv", () => {
  it("defaults concurrency to 4 when unset", () => {
    const env = readWorkerEnv({ ...baseEnv } as NodeJS.ProcessEnv);
    expect(env.concurrency).toBe(4);
    expect(env.redisUrl).toBe("redis://localhost:6379");
  });

  it("parses a valid WORKER_CONCURRENCY", () => {
    const env = readWorkerEnv({ ...baseEnv, WORKER_CONCURRENCY: "8" } as NodeJS.ProcessEnv);
    expect(env.concurrency).toBe(8);
  });

  it("rejects a non-positive concurrency", () => {
    expect(() =>
      readWorkerEnv({ ...baseEnv, WORKER_CONCURRENCY: "0" } as NodeJS.ProcessEnv)
    ).toThrow(/WORKER_CONCURRENCY/);
  });

  it("rejects a missing REDIS_URL", () => {
    expect(() => readWorkerEnv({} as NodeJS.ProcessEnv)).toThrow(/REDIS_URL/);
  });

  it("rejects an invalid REDIS_URL protocol", () => {
    expect(() =>
      readWorkerEnv({ REDIS_URL: "http://localhost:6379" } as NodeJS.ProcessEnv)
    ).toThrow(/protocol/);
  });
});
