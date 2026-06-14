import { describe, expect, it } from "bun:test";

import {
  createStorageAdapter,
  createStorageConfigFromEnv,
  getObjectBodyAsBytes,
} from "../src/storage.ts";

describe("storage config parser", () => {
  it("parses required fields and boolean options", () => {
    const config = createStorageConfigFromEnv({
      S3_ENDPOINT: "http://localhost:9000/",
      S3_REGION: "us-east-1",
      S3_BUCKET: "image-processor",
      S3_ACCESS_KEY_ID: "minioadmin",
      S3_SECRET_ACCESS_KEY: "minioadmin",
      S3_FORCE_PATH_STYLE: "true",
    });

    expect(config).toEqual({
      endpoint: "http://localhost:9000",
      region: "us-east-1",
      bucket: "image-processor",
      accessKeyId: "minioadmin",
      secretAccessKey: "minioadmin",
      forcePathStyle: true,
    });
  });

  it("throws for missing required environment variable", () => {
    expect(() =>
      createStorageConfigFromEnv({
        S3_ENDPOINT: "http://localhost:9000",
      }),
    ).toThrow("Missing required environment variable S3_REGION.");
  });

  it("throws for invalid force path style values", () => {
    expect(() =>
      createStorageConfigFromEnv({
        S3_ENDPOINT: "http://localhost:9000",
        S3_REGION: "us-east-1",
        S3_BUCKET: "image-processor",
        S3_ACCESS_KEY_ID: "minioadmin",
        S3_SECRET_ACCESS_KEY: "minioadmin",
        S3_FORCE_PATH_STYLE: "maybe",
      }),
    ).toThrow("Invalid boolean for S3_FORCE_PATH_STYLE");
  });
});

describe("storage adapter callable guards", () => {
  const adapter = createStorageAdapter({
    endpoint: "http://localhost:9000",
    region: "us-east-1",
    bucket: "image-processor",
    accessKeyId: "minioadmin",
    secretAccessKey: "minioadmin",
    forcePathStyle: true,
  });

  it("rejects empty putObject key before network call", async () => {
    await expect(
      adapter.putObject("", new Uint8Array([1, 2, 3]), "image/png"),
    ).rejects.toThrow("putObject key must be a non-empty string.");
  });

  it("rejects empty getObject key before network call", async () => {
    await expect(adapter.getObject("  ")).rejects.toThrow(
      "getObject key must be a non-empty string.",
    );
  });

  it("rejects invalid presigned expiry before network call", async () => {
    await expect(adapter.getPresignedDownloadUrl("sample.png", 0)).rejects.toThrow(
      "expiresSeconds must be between",
    );
  });
});

describe("getObjectBodyAsBytes", () => {
  it("returns uint8array body as-is", async () => {
    const source = new Uint8Array([10, 20, 30]);
    const bytes = await getObjectBodyAsBytes(source as never);

    expect(Array.from(bytes)).toEqual([10, 20, 30]);
  });

  it("throws for empty body", async () => {
    await expect(getObjectBodyAsBytes(undefined)).rejects.toThrow(
      "Object body is empty.",
    );
  });
});
