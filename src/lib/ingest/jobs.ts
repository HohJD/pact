import type { ReviewDraft } from "./pipeline";

export type JobStatus =
  | "RUNNING"
  | "NEEDS_PROVIDER"
  | "IN_REVIEW"
  | "PUBLISHED"
  | "REJECTED"
  | "ERROR";

export interface IngestJob {
  id: string;
  status: JobStatus;
  /** completed stage names, in order (drives the UI stepper) */
  stagesDone: string[];
  draft: ReviewDraft | null;
  error: string | null;
  source: { kind: "URL" | "PDF" | "TEXT"; label: string };
  createdAt: number;
}

const store = globalThis as unknown as { __pactIngestJobs?: Map<string, IngestJob> };
const sourceTextStore = globalThis as unknown as {
  __pactIngestSourceTexts?: Map<
    string,
    { text: string; url: string | null; kind: "URL" | "PDF" | "TEXT" }
  >;
};

export function ingestJobs(): Map<string, IngestJob> {
  return (store.__pactIngestJobs ??= new Map());
}

export function ingestSourceTexts(): Map<
  string,
  { text: string; url: string | null; kind: "URL" | "PDF" | "TEXT" }
> {
  return (sourceTextStore.__pactIngestSourceTexts ??= new Map());
}

export function createJob(source: IngestJob["source"]): IngestJob {
  const job: IngestJob = {
    id: `job_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    status: "RUNNING",
    stagesDone: [],
    draft: null,
    error: null,
    source,
    createdAt: Date.now(),
  };
  ingestJobs().set(job.id, job);
  return job;
}
