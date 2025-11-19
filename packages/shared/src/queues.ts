export const MANUAL_SCAN_QUEUE = 'scan.manual';
export const SCHEDULED_SCAN_QUEUE = 'scan.scheduled';
export const DEAD_LETTER_QUEUE = 'scan.dead-letter';
export const SCAN_JOB_NAME = 'scan-execution';
export const SCHEDULED_SCAN_JOB_ID = 'scheduled-scan-job';

export type ScanTrigger = 'manual' | 'scheduled';

export interface ScanJobRequest {
  pairId?: number;
  force?: boolean;
}

export interface ScanJobPayload extends ScanJobRequest {
  trigger: ScanTrigger;
  requestedAt: string;
  requestedBy?: string;
}

export interface ScanJobResult {
  pairsScanned: number;
  opportunitiesFound: number;
  closedOpportunities: number;
  durationMs: number;
  errors: string[];
}

export interface ScanJobResponse {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  queuedAt: string;
  completedAt?: string;
  estimatedDuration?: number;
}

export interface QueueDepthSnapshot {
  waiting: number;
  active: number;
  delayed: number;
  failed: number;
  completed: number;
}
