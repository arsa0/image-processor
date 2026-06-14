import {
  CreateBucketCommand,
  HeadBucketCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import {
  createStorageAdapter,
  createStorageConfigFromEnv,
  getObjectBodyAsBytes,
} from "../src/storage.ts";

async function ensureBucketExists(client: S3Client, bucket: string): Promise<void> {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
  }
}

async function run(): Promise<void> {
  const config = createStorageConfigFromEnv();

  const rawClient = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  await ensureBucketExists(rawClient, config.bucket);

  const adapter = createStorageAdapter(config);
  const key = `roundtrip/${Date.now()}-fixture.txt`;
  const payload = new TextEncoder().encode(`minio-roundtrip-${Date.now()}`);

  await adapter.putObject(key, payload, "text/plain");

  const body = await adapter.getObject(key);
  const bytes = await getObjectBodyAsBytes(body);

  if (bytes.length !== payload.length) {
    throw new Error("Direct getObject length mismatch.");
  }

  const url = await adapter.getPresignedDownloadUrl(key, 120);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Presigned download failed with status ${response.status}.`);
  }

  const downloaded = new Uint8Array(await response.arrayBuffer());

  if (downloaded.length !== payload.length) {
    throw new Error("Presigned fetch length mismatch.");
  }

  for (let i = 0; i < payload.length; i += 1) {
    if (downloaded[i] !== payload[i] || bytes[i] !== payload[i]) {
      throw new Error(`Round-trip byte mismatch at index ${i}.`);
    }
  }

  console.log(
    `Round-trip OK bucket=${config.bucket} key=${key} bytes=${payload.length}`,
  );
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`MinIO round-trip failed: ${message}`);
  throw error;
});
