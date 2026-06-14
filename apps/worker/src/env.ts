function parseRedisUrl(raw: string | undefined): string {
  const value = raw?.trim();

  if (!value) {
    throw new Error("Missing required environment variable REDIS_URL.");
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`Invalid REDIS_URL: "${raw}". Must be a valid URL.`);
  }

  if (url.protocol !== "redis:" && url.protocol !== "rediss:") {
    throw new Error(
      `Invalid REDIS_URL protocol: "${url.protocol}". Expected "redis:" or "rediss:".`
    );
  }

  return value;
}

function parseConcurrency(raw: string | undefined): number {
  const value = raw?.trim();

  if (!value) {
    return 4;
  }

  const concurrency = Number(value);

  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error(`Invalid WORKER_CONCURRENCY: "${raw}". Must be a positive integer.`);
  }

  return concurrency;
}

export type WorkerEnv = {
  isDev: boolean;
  redisUrl: string;
  concurrency: number;
};

export function readWorkerEnv(env: NodeJS.ProcessEnv = process.env): WorkerEnv {
  return {
    isDev: (env.NODE_ENV ?? "development") !== "production",
    redisUrl: parseRedisUrl(env.REDIS_URL),
    concurrency: parseConcurrency(env.WORKER_CONCURRENCY),
  };
}
