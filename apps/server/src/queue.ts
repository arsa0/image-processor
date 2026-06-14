import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { IMAGE_PROCESSING_QUEUE_NAME, type ImageJobPayload } from "@shared/processor";

import { readServerEnv } from "./env.js";

let connection: Redis | undefined;
let queue: Queue<ImageJobPayload> | undefined;

export function getRedisConnection(): Redis {
  if (!connection) {
    const { redisUrl } = readServerEnv();
    connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
  }

  return connection;
}

export function getImageQueue(): Queue<ImageJobPayload> {
  if (!queue) {
    queue = new Queue<ImageJobPayload>(IMAGE_PROCESSING_QUEUE_NAME, {
      connection: getRedisConnection(),
    });
  }

  return queue;
}

export function enqueueImageJob(payload: ImageJobPayload) {
  return getImageQueue().add("process", payload, {
    jobId: payload.jobId,
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: true,
    removeOnFail: false,
  });
}

export async function closeQueue(): Promise<void> {
  if (queue) {
    await queue.close();
    queue = undefined;
  }

  if (connection) {
    await connection.quit();
    connection = undefined;
  }
}
