import { describe, expect, it, mock, beforeEach } from "bun:test";

const putObject = mock(async () => {});
const create = mock(async (args: { data: { id: string } }) => args.data);
const enqueueImageJob = mock(async () => ({ id: "x" }));
const findUnique = mock(async (_args: unknown): Promise<Record<string, unknown> | null> => null);

mock.module("@db/processor", () => ({
  prisma: { job: { create, findUnique } },
  toSharedStatus: (s: string) => s.toLowerCase(),
}));
mock.module("../src/storage.js", () => ({ getStorage: () => ({ putObject }) }));
mock.module("../src/queue.js", () => ({ enqueueImageJob }));

const { createApp } = await import("../src/app.ts");

describe("GET /api/jobs/:id", () => {
  beforeEach(() => {
    findUnique.mockClear();
  });

  it("returns 200 with status + metadata for a known id", async () => {
    findUnique.mockResolvedValueOnce({
      id: "job-123",
      status: "COMPLETED",
      originalSize: 2048,
      processedSize: 512,
      width: 1280,
      height: 720,
    });

    const res = await createApp().request("/api/jobs/job-123");

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.job_id).toBe("job-123");
    expect(body.status).toBe("completed"); // mapped to shared lowercase
    expect(body.processedSize).toBe(512);
    expect(body.width).toBe(1280);
  });

  it("returns 404 for an unknown id", async () => {
    findUnique.mockResolvedValueOnce(null);

    const res = await createApp().request("/api/jobs/does-not-exist");

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.status).toBe("error");
  });
});

describe("POST /api/jobs", () => {
  beforeEach(() => {
    putObject.mockClear();
    create.mockClear();
    enqueueImageJob.mockClear();
  });

  it("accepts a valid PNG -> 202 with job_id, creates row + queue entry", async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const form = new FormData();
    form.set("image", new File([png], "x.png", { type: "image/png" }));

    const res = await createApp().request("/api/jobs", { method: "POST", body: form });

    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.job_id).toBeString();
    expect(body.status).toBe("pending");
    expect(putObject).toHaveBeenCalledTimes(1); // original uploaded
    expect(create).toHaveBeenCalledTimes(1); // row created
    expect(enqueueImageJob).toHaveBeenCalledTimes(1); // queue entry
  });

  it("rejects a PDF with 400", async () => {
    const form = new FormData();
    form.set("image", new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], "x.pdf"));
    const res = await createApp().request("/api/jobs", { method: "POST", body: form });
    expect(res.status).toBe(400);
  });
});
