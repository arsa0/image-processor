import dotenv from "dotenv";
import { defineConfig, env } from "prisma/config";

dotenv.config({
  path: new URL("../../../.env", import.meta.url),
  override: true,
});

export default defineConfig({
  schema: "./schema.prisma",
  migrations: {
    path: "./migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
