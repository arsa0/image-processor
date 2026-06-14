import { describe, expect, it, mock, beforeEach } from "bun:test";

type Row = Record<string, unknown> & { id: string; status: string };
const rows = new Map<string, Row>();

const create = mock(async (args: { data: Row }) => {
  const row: Row = { status: "PENDING", ...args.data };
  rows.set(row.id, row);
  return row;
});

const findUnique = mock(async (args: { where: { id: string } }) => {
  return rows.get(args.where.id) ?? null;
});

const putObject = mock(async () => {});
const enqueueImageJob = mock(async () => ({ id: "queued" }));

mock.module("@db/processor", () => ({
  prisma: { job: { create, findUnique } },
  toSharedStatus: (s: string) => s.toLowerCase(),
}));
mock.module("../src/storage.js", () => ({
  getStorage: () => ({ putObject }),
}));
mock.module("../src/queue.js", () => ({ enqueueImageJob }));

const { createApp } = await import("../src/app.ts");

function advance(id: string, status: string, extra: Record<string, unknown> = {}) {
  const row = rows.get(id);
  if (!row) throw new Error(`test setup: no row for ${id}`);
  rows.set(id, { ...row, status, ...extra });
}

describe("API integration: upload -> status transitions (happy path)", () => {
  beforeEach(() => {
    rows.clear();
    create.mockClear();
    findUnique.mockClear();
    putObject.mockClear();
    enqueueImageJob.mockClear();
  });

  it("uploads, then reports pending -> processing -> completed for the same job_id", async () => {
    const app = createApp();

    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const form = new FormData();
    form.set("image", new File([png], "x.png", { type: "image/png" }));

    const created = await app.request("/api/jobs", { method: "POST", body: form });
    expect(created.status).toBe(202);

    const { job_id, status } = await created.json();
    expect(job_id).toBeString();
    expect(status).toBe("pending");

    expect(putObject).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledTimes(1);
    expect(enqueueImageJob).toHaveBeenCalledTimes(1);
    expect(enqueueImageJob).toHaveBeenCalledWith({ jobId: job_id });

    let res = await app.request(`/api/jobs/${job_id}`);
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("pending");

    advance(job_id, "PROCESSING");
    res = await app.request(`/api/jobs/${job_id}`);
    expect((await res.json()).status).toBe("processing");

    advance(job_id, "COMPLETED", {
      processedKey: `processed/${job_id}.webp`,
      originalSize: 2048,
      processedSize: 512,
      width: 1280,
      height: 720,
    });
    res = await app.request(`/api/jobs/${job_id}`);
    const final = await res.json();
    expect(final.status).toBe("completed");
    expect(final.processedSize).toBe(512);
    expect(final.width).toBe(1280);
    expect(final.height).toBe(720);
  });
});
