export const QUEUES = {
  GENERATION_JOBS: 'generation_jobs',
  STATUS_UPDATES: 'status_updates',
} as const;

export const EXCHANGES = {
  GENERATION: 'generation_exchange',
  STATUS: 'status_exchange',
} as const;

export const WS_EVENTS = {
  JOB_CREATED: 'job:created',
  JOB_STATUS: 'job:status',
  JOB_COMPLETED: 'job:completed',
  JOB_FAILED: 'job:failed',
} as const;

export const GENERATION_TIMEOUT_MS = 10_000;
export const DEFAULT_MAX_RETRIES = 3;
export const RATE_LIMIT_TTL = 60;
export const RATE_LIMIT_MAX = 10;
