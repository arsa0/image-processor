import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import type { ErrorResponse } from "@shared/processor";

import { readServerEnv } from "./env.js";

export function createApp() {
  const { isDev } = readServerEnv();
  const app = new Hono();

  // Dev-only CORS: prod serves the web app through nginx, which proxies
  // /api to this server same-origin, so no CORS headers are needed there.
  if (isDev) {
    app.use(
      "*",
      cors({
        origin: ["http://localhost:5173", "http://localhost:3000"],
        allowMethods: ["GET", "POST", "OPTIONS"],
      }),
    );
  }

  app.get("/health", (c) => c.json({ status: "ok" }, 200));

  // Centralized error handler -> always returns ErrorResponse shape.
  app.onError((err, c) => {
    if (err instanceof HTTPException) {
      const body: ErrorResponse = {
        message: err.message,
        status: "error",
        code: String(err.status),
      };
      return c.json(body, err.status);
    }

    console.error("Unhandled error:", err);
    const body: ErrorResponse = {
      message: "Internal Server Error",
      status: "error",
      code: "500",
    };
    return c.json(body, 500);
  });

  // Unknown route -> ErrorResponse 404 (consistent client contract).
  app.notFound((c) => {
    const body: ErrorResponse = {
      message: "Not Found",
      status: "error",
      code: "404",
    };
    return c.json(body, 404);
  });

  return app;
}
