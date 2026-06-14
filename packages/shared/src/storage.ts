import {
  GetObjectCommand,
  type GetObjectCommandOutput,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import {
  S3_PRESIGNED_DOWNLOAD_MAX_EXPIRES_SECONDS,
  S3_PRESIGNED_DOWNLOAD_MIN_EXPIRES_SECONDS,
  S3_PRESIGNED_DOWNLOAD_URL_DEFAULT_EXPIRES_SECONDS,
} from "./constants.js";
import type {
  PutObjectBody,
  StorageAdapter,
  StorageConfig,
} from "./types.js";

type EnvMap = Record<string, string | undefined>;

const TRUE_VALUES = new Set(["true", "1", "yes", "y", "on"]);
const FALSE_VALUES = new Set(["false", "0", "no", "n", "off"]);

function parseBoolean(value: string, key: string): boolean {
  const normalized = value.trim().toLowerCase();

  if (TRUE_VALUES.has(normalized)) {
    return true;
  }

  if (FALSE_VALUES.has(normalized)) {
    return false;
  }

  throw new Error(
    `Invalid boolean for ${key}: "${value}". Use true/false, 1/0, yes/no, or on/off.`,
  );
}

function getRequiredEnv(env: EnvMap, key: string): string {
  const value = env[key]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable ${key}.`);
  }

  return value;
}

function parseForcePathStyle(env: EnvMap, defaultValue = false): boolean {
  const raw = env.S3_FORCE_PATH_STYLE;

  if (raw == null || raw.trim() === "") {
    return defaultValue;
  }

  return parseBoolean(raw, "S3_FORCE_PATH_STYLE");
}

function normalizeEndpoint(endpoint: string): string {
  return endpoint.replace(/\/+$/, "");
}

function parseOptionalEndpoint(value: string | undefined): string | undefined {
  const normalized = value?.trim();

  if (!normalized) {
    return undefined;
  }

  return normalizeEndpoint(normalized);
}

function ensureValidExpiresSeconds(expiresSeconds: number): number {
  if (!Number.isInteger(expiresSeconds)) {
    throw new Error("expiresSeconds must be an integer number of seconds.");
  }

  if (
    expiresSeconds < S3_PRESIGNED_DOWNLOAD_MIN_EXPIRES_SECONDS ||
    expiresSeconds > S3_PRESIGNED_DOWNLOAD_MAX_EXPIRES_SECONDS
  ) {
    throw new Error(
      `expiresSeconds must be between ${S3_PRESIGNED_DOWNLOAD_MIN_EXPIRES_SECONDS} and ${S3_PRESIGNED_DOWNLOAD_MAX_EXPIRES_SECONDS}.`,
    );
  }

  return expiresSeconds;
}

function createS3ClientConfig(config: StorageConfig, endpoint: string): S3ClientConfig {
  return {
    endpoint,
    region: config.region,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  };
}

function getDefaultEnv(): EnvMap {
  return (globalThis as { process?: { env?: EnvMap } }).process?.env ?? {};
}

export function createStorageConfigFromEnv(env: EnvMap = getDefaultEnv()): StorageConfig {
  const publicEndpoint = parseOptionalEndpoint(env.S3_PUBLIC_ENDPOINT);

  return {
    endpoint: normalizeEndpoint(getRequiredEnv(env, "S3_ENDPOINT")),
    ...(publicEndpoint ? { publicEndpoint } : {}),
    region: getRequiredEnv(env, "S3_REGION"),
    bucket: getRequiredEnv(env, "S3_BUCKET"),
    accessKeyId: getRequiredEnv(env, "S3_ACCESS_KEY_ID"),
    secretAccessKey: getRequiredEnv(env, "S3_SECRET_ACCESS_KEY"),
    forcePathStyle: parseForcePathStyle(env, false),
  };
}

export function createStorageAdapter(config: StorageConfig): StorageAdapter {
  const s3 = new S3Client(createS3ClientConfig(config, config.endpoint));
  const presignS3 = new S3Client(
    createS3ClientConfig(config, config.publicEndpoint ?? config.endpoint),
  );

  return {
    async putObject(key: string, body: PutObjectBody, contentType: string) {
      if (!key.trim()) {
        throw new Error("putObject key must be a non-empty string.");
      }

      if (!contentType.trim()) {
        throw new Error("putObject contentType must be a non-empty string.");
      }

      await s3.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
    },

    async getObject(key: string): Promise<GetObjectCommandOutput["Body"]> {
      if (!key.trim()) {
        throw new Error("getObject key must be a non-empty string.");
      }

      const result = await s3.send(
        new GetObjectCommand({
          Bucket: config.bucket,
          Key: key,
        }),
      );

      if (!result.Body) {
        throw new Error(`Object ${key} has no body.`);
      }

      return result.Body;
    },

    async getPresignedDownloadUrl(
      key: string,
      expiresSeconds = S3_PRESIGNED_DOWNLOAD_URL_DEFAULT_EXPIRES_SECONDS,
    ): Promise<string> {
      if (!key.trim()) {
        throw new Error(
          "getPresignedDownloadUrl key must be a non-empty string.",
        );
      }

      const validatedExpiresSeconds = ensureValidExpiresSeconds(expiresSeconds);

      return getSignedUrl(
        presignS3,
        new GetObjectCommand({
          Bucket: config.bucket,
          Key: key,
        }),
        {
          expiresIn: validatedExpiresSeconds,
        },
      );
    },
  };
}

export function createStorageAdapterFromEnv(env: EnvMap = getDefaultEnv()): StorageAdapter {
  return createStorageAdapter(createStorageConfigFromEnv(env));
}

export async function getObjectBodyAsBytes(
  body: GetObjectCommandOutput["Body"],
): Promise<Uint8Array> {
  if (!body) {
    throw new Error("Object body is empty.");
  }

  if (
    typeof (body as { transformToByteArray?: unknown }).transformToByteArray ===
    "function"
  ) {
    return (body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray();
  }

  if (body instanceof Uint8Array) {
    return body;
  }

  if (body instanceof ArrayBuffer) {
    return new Uint8Array(body);
  }

  throw new Error("Unsupported S3 object body type.");
}
