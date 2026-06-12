import { Queue } from "bullmq";
import { Redis } from "ioredis";
import {
  IMAGE_PROCESSING_QUEUE_NAME,
  type ImageJobPayload,
} from "@shared/processor";

import { readServerEnv } from "./env.js";

let connection: Redis | undefined;
let queue: Queue<ImageJobPayload> | undefined;

/* Shared connection. maxRetriesPerRequest: null is required by BullMQ for
 * blocking commands and keeps the connection from erroring out under load
 */
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

/* Single enqueue API used by POST /api/jobs (T2.3)
 * Using payload.jobId as the BullMQ job id de-duplicates: one queue entry
 * per DB job, and supports idempotent reprocessing (T3.3)
 */
export function enqueueImageJob(payload: ImageJobPayload) {
  return getImageQueue().add("process", payload, {
    jobId: payload.jobId,
    removeOnComplete: true,
    removeOnFail: false,
  });
}

// Used by tests/scripts and graceful shutdown to release connections.
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
