import { Worker, type Job } from "bullmq";
import { Redis } from "ioredis";
import { IMAGE_PROCESSING_QUEUE_NAME, type ImageJobPayload } from "@shared/processor";

import { readWorkerEnv } from "./env.js";
import { logger } from "./logger.js";

function createConnection(redisUrl: string): Redis {
  return new Redis(redisUrl, { maxRetriesPerRequest: null });
}

async function processImageJob(job: Job<ImageJobPayload>): Promise<void> {
  logger.info("Received job", { jobId: job.data.jobId, attempt: job.attemptsMade + 1 });
}

export function createImageWorker(): Worker<ImageJobPayload> {
  const { redisUrl, concurrency } = readWorkerEnv();

  const worker = new Worker<ImageJobPayload>(IMAGE_PROCESSING_QUEUE_NAME, processImageJob, {
    connection: createConnection(redisUrl),
    concurrency,
  });

  worker.on("ready", () => {
    logger.info("Worker connected and waiting for jobs", {
      queue: IMAGE_PROCESSING_QUEUE_NAME,
      concurrency,
    });
  });

  worker.on("completed", (job) => {
    logger.info("Job completed", { jobId: job.data.jobId });
  });

  worker.on("failed", (job, error) => {
    logger.error("Job failed", { jobId: job?.data.jobId, error: error.message });
  });

  worker.on("error", (error) => {
    logger.error("Worker error", { error: error.message });
  });

  return worker;
}
