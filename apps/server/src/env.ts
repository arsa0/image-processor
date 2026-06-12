function parsePort(raw: string | undefined): number {
  const value = raw?.trim();

  if (!value) {
    return 3000;
  }

  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT: "${raw}". Must be an integer 1-65535.`);
  }

  return port;
}

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
      `Invalid REDIS_URL protocol: "${url.protocol}". Expected "redis:" or "rediss:".`,
    );
  }

  return value;
}

export type ServerEnv = {
  port: number;
  isDev: boolean;
  redisUrl: string;
};

export function readServerEnv(env: NodeJS.ProcessEnv = process.env): ServerEnv {
  return {
    port: parsePort(env.PORT),
    isDev: (env.NODE_ENV ?? "development") !== "production",
    redisUrl: parseRedisUrl(env.REDIS_URL),
  };
}
