import type { ImportPayload, JobReq, JobStatus } from "../types";

const STORAGE_KEY = "req-radar:jobs:v1";
const VALID_STATUSES = new Set<JobStatus>([
  "NEW",
  "PURSUING",
  "MAYBE",
  "NOT_PURSUING",
  "APPLIED"
]);

function isJobReq(value: unknown): value is JobReq {
  if (!value || typeof value !== "object") return false;
  const job = value as Partial<JobReq>;
  return Boolean(
    typeof job.id === "string" &&
      typeof job.title === "string" &&
      typeof job.descriptionText === "string" &&
      typeof job.status === "string" &&
      VALID_STATUSES.has(job.status as JobStatus) &&
      Array.isArray(job.locations) &&
      Array.isArray(job.skills) &&
      Array.isArray(job.responsibilities) &&
      Array.isArray(job.qualifications)
  );
}

export function loadJobs(): JobReq[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isJobReq);
  } catch {
    return [];
  }
}

export function saveJobs(jobs: JobReq[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
}

export function buildExportPayload(jobs: JobReq[]): ImportPayload {
  return {
    app: "ReqRadar",
    version: __APP_VERSION__,
    exportedAt: new Date().toISOString(),
    jobs
  };
}

export function parseImportFile(content: string): JobReq[] {
  const parsed = JSON.parse(content) as unknown;
  const candidates = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object" && "jobs" in parsed
      ? (parsed as { jobs?: unknown }).jobs
      : null;

  if (!Array.isArray(candidates)) {
    throw new Error("This file does not contain a ReqRadar job list.");
  }

  const jobs = candidates.filter(isJobReq);
  if (!jobs.length && candidates.length) {
    throw new Error("No valid ReqRadar job requisitions were found in this file.");
  }
  return jobs;
}

export function downloadJson(filename: string, payload: unknown): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
