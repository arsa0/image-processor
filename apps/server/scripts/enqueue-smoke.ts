import { closeQueue, enqueueImageJob } from "../src/queue.js";

const jobId = `smoke-${Date.now()}`;
const job = await enqueueImageJob({ jobId });

console.log("Enqueued BullMQ job:", {
  name: job.name,
  id: job.id,
  data: job.data,
});

await closeQueue();
