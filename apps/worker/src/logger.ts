type LogLevel = "info" | "warn" | "error";

function log(level: LogLevel, message: string, fields: Record<string, unknown> = {}): void {
  const entry = {
    level,
    time: new Date().toISOString(),
    message,
    ...fields,
  };

  const line = JSON.stringify(entry);

  if (level === "error") {
    console.error(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  info: (message: string, fields?: Record<string, unknown>) => log("info", message, fields),
  warn: (message: string, fields?: Record<string, unknown>) => log("warn", message, fields),
  error: (message: string, fields?: Record<string, unknown>) => log("error", message, fields),
};
