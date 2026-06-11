export enum JobStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
}

export type JobCreatedResponse = {
  message: string;
  status: string;
};

export type JobStatusResponse = {
  message: string;
  status: string;
};

export type DownloadResponse = {
  message: string;
  status: string;
};

export type ErrorResponse = {
  message: string;
  status: string;
};
