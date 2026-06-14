import { describe, expect, it, mock, beforeEach } from "bun:test";

const putObject = mock(async () => {});
const create = mock(async (args: { data: { id: string } }) => args.data);
const enqueueImageJob = mock(async () => ({ id: "x" }));

mock.module("../src/storage.js", () => ({ getStorage: () => ({ putObject }) }));
mock.module("@db/processor", () => ({ prisma: { job: { create } } }));
mock.module("../src/queue.js", () => ({ enqueueImageJob }));

const { createApp } = await import("../src/app.ts");

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
