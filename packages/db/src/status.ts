import { JobStatus as DbJobStatus } from "@prisma/client";
import { JobStatus as SharedJobStatus } from "@shared/processor";

export function toSharedStatus(status: DbJobStatus): SharedJobStatus {
  switch (status) {
    case DbJobStatus.PENDING:
      return SharedJobStatus.PENDING;
    case DbJobStatus.PROCESSING:
      return SharedJobStatus.PROCESSING;
    case DbJobStatus.COMPLETED:
      return SharedJobStatus.COMPLETED;
    case DbJobStatus.FAILED:
      return SharedJobStatus.FAILED;
  }
}
