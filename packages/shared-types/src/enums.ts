export enum JobStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum JobType {
  TEXT = 'text',
  IMAGE = 'image',
}
