import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { JobStatus, type JobCreatedResponse } from "@shared/processor";
import { prisma } from "@db/processor";

import { enqueueImageJob } from "../queue.js";
import { getStorage } from "../storage.js";
import { validateImageUpload } from "../upload.js";

export const jobsRoute = new Hono();

jobsRoute.post("/", async (c) => {
  const form = await c.req.formData();
  const field = form.get("image");

  if (!(field instanceof File)) {
    throw new HTTPException(400, { message: "Missing 'image' file field." });
  }

  const bytes = new Uint8Array(await field.arrayBuffer());
  const result = validateImageUpload(bytes);
  if (!result.ok) {
    throw new HTTPException(result.status, { message: result.message });
  }

  const jobId = crypto.randomUUID();
  const originalKey = `originals/${jobId}`;

  await getStorage().putObject(originalKey, bytes, result.mime);

  await prisma.job.create({
    data: {
      id: jobId,
      originalKey,
      originalSize: bytes.length,
    },
  });

  await enqueueImageJob({ jobId });

  const body: JobCreatedResponse = { job_id: jobId, status: JobStatus.PENDING };
  return c.json(body, 202);
});
