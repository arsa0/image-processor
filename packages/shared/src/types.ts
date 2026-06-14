import type { GetObjectCommandOutput, PutObjectCommandInput } from "@aws-sdk/client-s3";

export enum JobStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
}

export type JobCreatedResponse = {
  job_id: string;
  status: JobStatus;
  originalSize?: number;
  processedSize?: number;
  width?: number;
  height?: number;
};

export type JobStatusResponse = {
  job_id: string;
  status: JobStatus;
  originalSize?: number;
  processedSize?: number;
  width?: number;
  height?: number;
  errorMessage?: string;
};

export type DownloadResponse = {
  downloadUrl: string;
  expiresAt: string;
};

export type ErrorResponse = {
  message: string;
  status: string;
  code?: string;
};

export type PutObjectBody = NonNullable<PutObjectCommandInput["Body"]>;
export type GetObjectBody = NonNullable<GetObjectCommandOutput["Body"]>;

export type StorageConfig = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
};

export type StorageAdapter = {
  putObject: (key: string, body: PutObjectBody, contentType: string) => Promise<void>;
  getObject: (key: string) => Promise<GetObjectBody>;
  getPresignedDownloadUrl: (key: string, expiresSeconds?: number) => Promise<string>;
};

export type ImageJobPayload = {
  jobId: string;
};
