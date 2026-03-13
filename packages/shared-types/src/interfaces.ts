import { JobStatus, JobType } from './enums';

export interface GenerationJob {
  id: string;
  prompt: string;
  enhancedPrompt: string | null;
  type: JobType;
  status: JobStatus;
  provider: string | null;
  resultText: string | null;
  resultImageUrl: string | null;
  errorMessage: string | null;
  retryCount: number;
  maxRetries: number;
  parameters: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  cancelledAt: string | null;
}

export interface GenerationJobMessage {
  jobId: string;
  type: JobType;
  prompt: string;
  parameters: Record<string, unknown> | null;
}

export interface JobStatusUpdateMessage {
  jobId: string;
  status: JobStatus;
  enhancedPrompt?: string;
  provider?: string;
  resultText?: string;
  resultImageUrl?: string;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreateGenerationDto {
  prompt: string;
  type: JobType;
  parameters?: Record<string, unknown>;
}
