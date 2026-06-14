import { createImageWorker } from "./worker.js";
import { logger } from "./logger.js";

const worker = createImageWorker();

async function shutdown(signal: string): Promise<void> {
  logger.info("Shutting down worker", { signal });
  try {
    await worker.close();
  } catch (error) {
    logger.error("Error during worker shutdown", {
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    process.exit(0);
  }
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
