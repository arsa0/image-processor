import { prisma } from "./client.js";
async function smoke() {
  const job = await prisma.job.findFirst({
    where: { status: "PENDING" },
    select: { id: true, status: true, createdAt: true },
  });
  return job;
}

void smoke;