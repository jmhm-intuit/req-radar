import type {
  AppSettings,
  JobReq,
  JobStatus,
  ParsedBackup,
  ReqRadarBackup,
  SyncPreview
} from "../types";

const JOBS_STORAGE_KEY = "req-radar:jobs:v1";
const SETTINGS_STORAGE_KEY = "req-radar:settings:v1";
const VALID_STATUSES = new Set<JobStatus>([
  "NEW",
  "PURSUING",
  "MAYBE",
  "NOT_PURSUING",
  "APPLIED"
]);

export const DEFAULT_SETTINGS: AppSettings = {
  recruitingPortalUrl: "",
  lastExportAt: "",
  updatedAt: ""
};

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function normalizeJobReq(value: unknown): JobReq | null {
  if (!value || typeof value !== "object") return null;
  const job = value as Partial<JobReq>;
  if (
    typeof job.id !== "string" ||
    typeof job.title !== "string" ||
    typeof job.descriptionText !== "string" ||
    typeof job.status !== "string" ||
    !VALID_STATUSES.has(job.status as JobStatus)
  ) {
    return null;
  }

  const now = new Date().toISOString();
  return {
    id: job.id,
    jobId: stringValue(job.jobId),
    title: job.title,
    normalizedTitle: stringValue(job.normalizedTitle) || job.title,
    category: stringValue(job.category),
    team: stringValue(job.team),
    locations: stringArray(job.locations),
    hiringManager: stringValue(job.hiringManager),
    recruiter: stringValue(job.recruiter),
    datePosted: stringValue(job.datePosted),
    seniority: stringValue(job.seniority),
    minYears: typeof job.minYears === "number" ? job.minYears : null,
    descriptionText: job.descriptionText,
    responsibilities: stringArray(job.responsibilities),
    qualifications: stringArray(job.qualifications),
    skills: stringArray(job.skills),
    status: job.status as JobStatus,
    decisionReason: stringValue(job.decisionReason),
    notes: stringValue(job.notes),
    jobUrl: stringValue(job.jobUrl),
    sourceFileName: stringValue(job.sourceFileName),
    sourceHash: stringValue(job.sourceHash),
    createdAt: stringValue(job.createdAt) || now,
    updatedAt: stringValue(job.updatedAt) || stringValue(job.createdAt) || now,
    ...(job.isDemo ? { isDemo: true } : {})
  };
}

function normalizeSettings(value: unknown): AppSettings {
  if (!value || typeof value !== "object") return { ...DEFAULT_SETTINGS };
  const settings = value as Partial<AppSettings>;
  return {
    recruitingPortalUrl: stringValue(settings.recruitingPortalUrl),
    lastExportAt: stringValue(settings.lastExportAt),
    updatedAt: stringValue(settings.updatedAt)
  };
}

function identityKey(job: JobReq): string {
  const normalizedJobId = job.jobId.trim().toLowerCase();
  if (normalizedJobId) return `job:${normalizedJobId}`;
  const normalizedHash = job.sourceHash.trim().toLowerCase();
  if (normalizedHash) return `hash:${normalizedHash}`;
  return `id:${job.id}`;
}

function findExisting(jobs: JobReq[], incoming: JobReq): JobReq | undefined {
  const jobId = incoming.jobId.trim().toLowerCase();
  if (jobId) {
    const byJobId = jobs.find((job) => job.jobId.trim().toLowerCase() === jobId);
    if (byJobId) return byJobId;
  }

  const sourceHash = incoming.sourceHash.trim().toLowerCase();
  if (sourceHash) {
    const byHash = jobs.find((job) => job.sourceHash.trim().toLowerCase() === sourceHash);
    if (byHash) return byHash;
  }

  return jobs.find((job) => job.id === incoming.id);
}

function comparableJob(job: JobReq): string {
  return JSON.stringify({ ...job, isDemo: Boolean(job.isDemo) });
}

function timestamp(value: string): number {
  const result = Date.parse(value);
  return Number.isNaN(result) ? 0 : result;
}

function dedupeJobs(jobs: JobReq[]): JobReq[] {
  const byIdentity = new Map<string, JobReq>();
  jobs.forEach((job) => {
    const key = identityKey(job);
    const existing = byIdentity.get(key);
    if (!existing || timestamp(job.updatedAt) >= timestamp(existing.updatedAt)) {
      byIdentity.set(key, job);
    }
  });
  return [...byIdentity.values()].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt)
  );
}

export function loadJobs(): JobReq[] {
  try {
    const raw = localStorage.getItem(JOBS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return dedupeJobs(parsed.map(normalizeJobReq).filter((job): job is JobReq => Boolean(job)));
  } catch {
    return [];
  }
}

export function saveJobs(jobs: JobReq[]): void {
  localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(jobs));
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    return raw ? normalizeSettings(JSON.parse(raw) as unknown) : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

export function buildExportPayload(
  jobs: JobReq[],
  settings: AppSettings,
  exportedAt = new Date().toISOString()
): ReqRadarBackup {
  return {
    app: "ReqRadar",
    schemaVersion: 2,
    appVersion: __APP_VERSION__,
    exportedAt,
    jobs,
    settings: {
      ...settings,
      lastExportAt: exportedAt
    }
  };
}

export function parseBackupFile(content: string): ParsedBackup {
  const parsed = JSON.parse(content) as unknown;
  const objectPayload = parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? parsed as Record<string, unknown>
    : null;
  const candidates = Array.isArray(parsed)
    ? parsed
    : Array.isArray(objectPayload?.jobs)
      ? objectPayload.jobs
      : null;

  if (!candidates) {
    throw new Error("This file does not contain a ReqRadar job list.");
  }

  const jobs = dedupeJobs(
    candidates.map(normalizeJobReq).filter((job): job is JobReq => Boolean(job))
  );
  if (!jobs.length && candidates.length) {
    throw new Error("No valid ReqRadar job requisitions were found in this file.");
  }

  return {
    schemaVersion: typeof objectPayload?.schemaVersion === "number"
      ? objectPayload.schemaVersion
      : 1,
    appVersion: stringValue(objectPayload?.appVersion || objectPayload?.version),
    exportedAt: stringValue(objectPayload?.exportedAt),
    jobs,
    settings: normalizeSettings(objectPayload?.settings)
  };
}

export function buildSyncPreview(currentJobs: JobReq[], backup: ParsedBackup): SyncPreview {
  const preview: SyncPreview = {
    newCount: 0,
    updatedCount: 0,
    unchangedCount: 0,
    conflictCount: 0,
    totalIncoming: backup.jobs.length
  };

  backup.jobs.forEach((incoming) => {
    const existing = findExisting(currentJobs, incoming);
    if (!existing) {
      preview.newCount += 1;
      return;
    }

    const incomingTime = timestamp(incoming.updatedAt);
    const existingTime = timestamp(existing.updatedAt);
    if (incomingTime > existingTime) {
      preview.updatedCount += 1;
    } else if (
      incomingTime === existingTime &&
      comparableJob(incoming) !== comparableJob(existing)
    ) {
      preview.conflictCount += 1;
    } else {
      preview.unchangedCount += 1;
    }
  });

  return preview;
}

export function mergeBackup(
  currentJobs: JobReq[],
  currentSettings: AppSettings,
  backup: ParsedBackup
): { jobs: JobReq[]; settings: AppSettings; preview: SyncPreview } {
  const preview = buildSyncPreview(currentJobs, backup);
  const merged = [...currentJobs];

  backup.jobs.forEach((incoming) => {
    const existing = findExisting(merged, incoming);
    if (!existing) {
      merged.push(incoming);
      return;
    }

    if (timestamp(incoming.updatedAt) > timestamp(existing.updatedAt)) {
      const index = merged.findIndex((job) => job.id === existing.id);
      merged[index] = { ...incoming, id: existing.id };
    }
  });

  const shouldUseIncomingSettings =
    Boolean(backup.settings.recruitingPortalUrl) &&
    (!currentSettings.recruitingPortalUrl ||
      timestamp(backup.settings.updatedAt) > timestamp(currentSettings.updatedAt));

  return {
    jobs: dedupeJobs(merged),
    settings: shouldUseIncomingSettings
      ? { ...currentSettings, ...backup.settings }
      : currentSettings,
    preview
  };
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
