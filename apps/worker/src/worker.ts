import { Worker, type Job } from "bullmq";
import { Redis } from "ioredis";
import {
  IMAGE_PROCESSING_QUEUE_NAME,
  getObjectBodyAsBytes,
  type ImageJobPayload,
} from "@shared/processor";
import { prisma, JobStatus } from "@db/processor";

import { readWorkerEnv } from "./env.js";
import { logger } from "./logger.js";
import { getStorage } from "./storage.js";
import { processImage } from "./pipeline.js";
import { isFinalAttempt } from "./failure.ts";

function createConnection(redisUrl: string): Redis {
  return new Redis(redisUrl, { maxRetriesPerRequest: null });
}

async function processImageJob(job: Job<ImageJobPayload>): Promise<void> {
  const { jobId } = job.data;
  logger.info("Received job", { jobId, attempt: job.attemptsMade + 1 });

  const record = await prisma.job.findUnique({
    where: { id: jobId },
    select: { originalKey: true },
  });

  if (!record) {
    throw new Error(`Job '${jobId}' not found in database.`);
  }

  await prisma.job.update({
    where: { id: jobId },
    data: { status: JobStatus.PROCESSING },
  });

  const body = await getStorage().getObject(record.originalKey);
  const input = await getObjectBodyAsBytes(body);

  const output = await processImage(input);

  const processedKey = `processed/${jobId}.webp`;
  await getStorage().putObject(processedKey, output.data, "image/webp");

  await prisma.job.update({
    where: { id: jobId },
    data: {
      status: JobStatus.COMPLETED,
      processedKey,
      width: output.width,
      height: output.height,
      originalSize: input.length,
      processedSize: output.size,
    },
  });

  logger.info("Job processed", {
    jobId,
    processedKey,
    width: output.width,
    height: output.height,
    originalSize: input.length,
    processedSize: output.size,
  });
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
    logger.error("Job failed", {
      jobId: job?.data.jobId,
      attempt: job?.attemptsMade,
      error: error.message,
    });

    if (!job || !isFinalAttempt(job)) {
      return; // more retries coming — leave the row as PROCESSING
    }

    void prisma.job
      .update({
        where: { id: job.data.jobId },
        data: {
          status: JobStatus.FAILED,
          errorMessage: error.message.slice(0, 500),
        },
      })
      .catch((dbError: unknown) => {
        logger.error("Failed to persist failure status", {
          jobId: job.data.jobId,
          error: dbError instanceof Error ? dbError.message : String(dbError),
        });
      });
  });

  worker.on("error", (error) => {
    logger.error("Worker error", { error: error.message });
  });

  return worker;
}
