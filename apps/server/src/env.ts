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

export type ServerEnv = {
  port: number;
  isDev: boolean;
};

export function readServerEnv(env: NodeJS.ProcessEnv = process.env): ServerEnv {
  return {
    port: parsePort(env.PORT),
    isDev: (env.NODE_ENV ?? "development") !== "production",
  };
}
