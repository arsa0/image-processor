# Image Processor

An async image processing app built in a production-style monorepo. Upload a JPG, PNG, or WebP; get a job ID back immediately; poll until the worker finishes; download the processed WebP.

---

## Running it

**Prerequisites:** Docker and Docker Compose. Nothing else needs to be installed locally.

```bash
git clone https://github.com/arsa0/image-processor.git
cd image-processor
docker compose up --build
```

That single command brings up the full stack. Once it's up:

| URL | What it is |
|-----|-----------|
| http://localhost:8080 | Web UI — upload images here |
| http://localhost:3000/health | API health check |
| http://localhost:9001 | MinIO console (`minioadmin` / `minioadmin`) |

Run in the background: `docker compose up --build -d`  
Tear down: `docker compose down`  
Wipe data volumes too: `docker compose down -v`

### What compose does automatically

1. **postgres**, **redis**, and **minio** start first, each with healthchecks — nothing proceeds until they're actually ready, not just "started".
2. **minio-init** is a one-shot container that creates the `image-processor` bucket, then exits.
3. **migrate** is a one-shot container that runs `prisma migrate deploy` to create the `Job` table, then exits.
4. **server**, **worker**, and **web** only start once all their dependencies report healthy or completed.

---

## Environment variables

These are wired automatically inside Docker Compose. If running services manually outside Docker:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres connection string |
| `REDIS_URL` | Redis connection for the job queue |
| `S3_ENDPOINT` | Storage endpoint (MinIO locally, S3/GCS in the cloud) |
| `S3_REGION` | Bucket region |
| `S3_BUCKET` | Bucket name |
| `S3_ACCESS_KEY_ID` | Storage access key |
| `S3_SECRET_ACCESS_KEY` | Storage secret |
| `S3_FORCE_PATH_STYLE` | Set `true` for MinIO (path-style URLs) |
| `PORT` | API server port (default `3000`) |
| `MAX_UPLOAD_BYTES` | Upload size cap (default `20971520` = 20 MB) |
| `PUBLIC_API_URL` | Base URL the server uses for self-references |
| `WORKER_CONCURRENCY` | Parallel jobs the worker processes at once |

---

## Architecture & technology decisions

### Server / worker separation

Image processing — decode, resize, re-encode — is CPU-heavy and slow. Running it inside the request handler would block the API under any real load. Instead:

- The **server** does the fast part: validate, store the original, create a DB row, enqueue, and return a job ID immediately (202).
- The **worker** does the slow part in a separate process, independently scalable.

This is the async job pattern: the client gets a handle right away and polls for the result.

### BullMQ + Redis for the queue, Postgres for job state

A deliberate split of responsibilities:

- **Redis + BullMQ** handles *transport* — delivering work to a worker, retries, exponential backoff, and recovering stalled jobs if a worker crashes mid-process. Redis is in-memory and purpose-built for this.
- **Postgres + Prisma** is the *source of truth* for job state (`pending → processing → completed/failed`) and metadata (dimensions, file sizes, error messages). This is the durable record that survives a Redis flush and that the frontend polls.

Each tool does what it's best at rather than one being overloaded for both roles.

### Object storage via the S3 API (MinIO locally)

Images don't belong in a database or on a container's local disk — local disks vanish on restart and don't scale across machines. They go into object storage addressed through the S3-compatible API via the AWS SDK.

Locally that's **MinIO**, which speaks the exact same API with zero cloud setup or credentials. Because the code only talks to the S3 API, pointing it at real AWS S3 or GCS (via its S3-compatible endpoint) is purely a matter of changing env vars — no code change required.

### Presigned download URLs

When a job completes, the download endpoint returns a **presigned URL** that points directly at the storage rather than streaming bytes through the API server. Large-file traffic never touches the server, and the URL is time-limited so access is controlled without making the bucket public.

### Sharp for image processing

`sharp` (libvips under the hood) is the fastest, most memory-efficient option for resize/encode in the JS/TS ecosystem. The pipeline is:

1. `rotate()` — honor EXIF orientation so uploaded photos aren't sideways.
2. `resize(1280, 1280, { fit: 'inside', withoutEnlargement: true })` — longest side ≤ 1280px, aspect ratio preserved, small images never upscaled.
3. `webp({ quality: 80 })` — modern format, excellent compression ratio.

The Dockerfiles use a **Debian-based Bun image, not Alpine**, because sharp's native binaries are unreliable on Alpine's musl libc.

### Crash handling & resilience

- **3 attempts with exponential backoff** (starting at 1s) so transient failures retry automatically.
- **Stalled-job recovery**: if a worker is killed mid-job, BullMQ detects the stall and re-queues it for another worker to pick up.
- **Idempotent processing**: jobs always work from the original stored object and overwrite the output, so re-running a job is safe.
- **Graceful shutdown**: `SIGINT`/`SIGTERM` triggers `worker.close()` so the current job finishes or is released cleanly rather than being dropped mid-process.

### Frontend polling with exponential backoff

Since processing is async, the UI polls the status endpoint rather than waiting. Polling uses **exponential backoff** (~1s initial, capped at ~8s) to avoid hammering the server. It stops at a terminal state (`completed`/`failed`) and has a ~2-minute safety timeout, with timers cleaned up on unmount to prevent leaks.

In production, **nginx serves the built static files and proxies `/api` to the server**, so the browser talks to one origin and CORS is not needed.

### Monorepo: Turborepo + Bun workspaces

All three apps plus the shared `db` and `shared` packages live in one repo. **Bun workspaces** link them locally so the server, worker, and web all import the same TypeScript types and API contracts from `packages/shared` — request/response shapes can't drift out of sync across services. **Turborepo** caches and orchestrates `build`/`lint`/`typecheck`/`test` across packages. **Bun** is the runtime, package manager, and test runner in one, keeping tooling minimal.

### TypeScript strict everywhere

`strict: true` in the shared base config catches type errors at compile time across every package. Important when the same job/status contracts flow through three separate services.

---

## Optional: cloud deployment (GCS + GCP VM)

Because the storage layer speaks the S3 API, you can swap MinIO for **Google Cloud Storage** by enabling GCS's S3-compatible interoperability endpoint and updating the storage env vars — no application code changes. Run the server and worker on a **GCP VM** (or any cloud VM), point `DATABASE_URL` at Cloud SQL, `REDIS_URL` at Memorystore, and the rest of the compose setup transfers directly.
