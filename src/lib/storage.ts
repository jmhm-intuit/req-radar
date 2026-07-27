import type {
  AppSettings,
  InterestLevel,
  JobReq,
  JobStatus,
  ManualPriority,
  NetworkingStage,
  ParsedBackup,
  RecommendationOverride,
  ReqRadarBackup,
  SkillMatchStatus,
  SyncPreview,
  UserProfile
} from "../types";

const JOBS_STORAGE_KEY = "req-radar:jobs:v1";
const SETTINGS_STORAGE_KEY = "req-radar:settings:v1";
const PROFILE_STORAGE_KEY = "req-radar:profile:v1";

const VALID_STATUSES = new Set<JobStatus>(["NEW", "PURSUING", "MAYBE", "NOT_PURSUING", "APPLIED"]);
const VALID_NETWORKING = new Set<NetworkingStage>([
  "NOT_STARTED", "CONTACT_IDENTIFIED", "MESSAGE_PLANNED", "CONTACTED", "RESPONSE_RECEIVED",
  "CONVERSATION_SCHEDULED", "CONVERSATION_COMPLETED", "REFERRAL_REQUESTED", "REFERRAL_RECEIVED", "NOT_NEEDED"
]);
const VALID_INTEREST = new Set<InterestLevel>(["AUTO", "HIGH", "MEDIUM", "LOW", "NONE"]);
const VALID_PRIORITY = new Set<ManualPriority>(["HIGH", "NORMAL", "LOW", "ARCHIVE"]);
const VALID_RECOMMENDATION = new Set<RecommendationOverride>(["AUTO", "PURSUE", "CONSIDER", "LOW_PRIORITY", "DO_NOT_PURSUE"]);
const VALID_SKILL_STATUS = new Set<SkillMatchStatus>(["MATCH", "PARTIAL", "NO_MATCH", "CRITICAL_GAP", "NOT_RELEVANT"]);

export const DEFAULT_SETTINGS: AppSettings = {
  recruitingPortalUrl: "",
  lastExportAt: "",
  hiddenStatuses: [],
  updatedAt: ""
};

export const DEFAULT_PROFILE: UserProfile = {
  resumeFileName: "",
  resumeText: "",
  skills: [],
  interests: ["Artificial intelligence", "Transformation", "Strategy", "People leadership", "Executive influence"],
  avoid: ["Repetitive operations"],
  updatedAt: ""
};

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function booleanValue(value: unknown): boolean {
  return value === true;
}

function numberValue(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeOverrides(value: unknown): Record<string, SkillMatchStatus> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter((entry): entry is [string, SkillMatchStatus] => typeof entry[1] === "string" && VALID_SKILL_STATUS.has(entry[1] as SkillMatchStatus))
  );
}

export function normalizeJobReq(value: unknown): JobReq | null {
  if (!value || typeof value !== "object") return null;
  const job = value as Partial<JobReq>;
  if (typeof job.id !== "string" || typeof job.title !== "string" || typeof job.descriptionText !== "string") return null;
  const status = typeof job.status === "string" && VALID_STATUSES.has(job.status as JobStatus) ? job.status as JobStatus : "NEW";
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
    status,
    decisionReason: stringValue(job.decisionReason),
    notes: stringValue(job.notes),
    jobUrl: stringValue(job.jobUrl),
    sourceFileName: stringValue(job.sourceFileName),
    sourceHash: stringValue(job.sourceHash),
    networkingStage: typeof job.networkingStage === "string" && VALID_NETWORKING.has(job.networkingStage as NetworkingStage) ? job.networkingStage as NetworkingStage : "NOT_STARTED",
    networkingContact: stringValue(job.networkingContact),
    networkingNotes: stringValue(job.networkingNotes),
    interestOverride: typeof job.interestOverride === "string" && VALID_INTEREST.has(job.interestOverride as InterestLevel) ? job.interestOverride as InterestLevel : "AUTO",
    skillOverrides: normalizeOverrides(job.skillOverrides),
    ageOverride: booleanValue(job.ageOverride),
    manualAdjustment: Math.max(-20, Math.min(20, numberValue(job.manualAdjustment))),
    manualPriority: typeof job.manualPriority === "string" && VALID_PRIORITY.has(job.manualPriority as ManualPriority) ? job.manualPriority as ManualPriority : "NORMAL",
    pinned: booleanValue(job.pinned),
    recommendationOverride: typeof job.recommendationOverride === "string" && VALID_RECOMMENDATION.has(job.recommendationOverride as RecommendationOverride) ? job.recommendationOverride as RecommendationOverride : "AUTO",
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
    hiddenStatuses: stringArray(settings.hiddenStatuses).filter((status): status is JobStatus => VALID_STATUSES.has(status as JobStatus)),
    updatedAt: stringValue(settings.updatedAt)
  };
}

function normalizeProfile(value: unknown): UserProfile {
  if (!value || typeof value !== "object") return { ...DEFAULT_PROFILE };
  const profile = value as Partial<UserProfile>;
  return {
    resumeFileName: stringValue(profile.resumeFileName),
    resumeText: stringValue(profile.resumeText),
    skills: stringArray(profile.skills),
    interests: stringArray(profile.interests).length ? stringArray(profile.interests) : [...DEFAULT_PROFILE.interests],
    avoid: stringArray(profile.avoid).length ? stringArray(profile.avoid) : [...DEFAULT_PROFILE.avoid],
    updatedAt: stringValue(profile.updatedAt)
  };
}

function identityKey(job: JobReq): string {
  const jobId = job.jobId.trim().toLowerCase();
  if (jobId) return `job:${jobId}`;
  const hash = job.sourceHash.trim().toLowerCase();
  if (hash) return `hash:${hash}`;
  return `id:${job.id}`;
}

function findExisting(jobs: JobReq[], incoming: JobReq): JobReq | undefined {
  const key = identityKey(incoming);
  return jobs.find((job) => identityKey(job) === key || job.id === incoming.id);
}

function timestamp(value: string): number {
  const result = Date.parse(value);
  return Number.isNaN(result) ? 0 : result;
}

function dedupeJobs(jobs: JobReq[]): JobReq[] {
  const map = new Map<string, JobReq>();
  jobs.forEach((job) => {
    const key = identityKey(job);
    const existing = map.get(key);
    if (!existing || timestamp(job.updatedAt) >= timestamp(existing.updatedAt)) map.set(key, job);
  });
  return [...map.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function loadJobs(): JobReq[] {
  try {
    const raw = localStorage.getItem(JOBS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) as unknown : [];
    return Array.isArray(parsed) ? dedupeJobs(parsed.map(normalizeJobReq).filter((job): job is JobReq => Boolean(job))) : [];
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

export function loadProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    return raw ? normalizeProfile(JSON.parse(raw) as unknown) : { ...DEFAULT_PROFILE };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export function saveProfile(profile: UserProfile): void {
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

export function buildExportPayload(jobs: JobReq[], settings: AppSettings, profile: UserProfile, exportedAt = new Date().toISOString()): ReqRadarBackup {
  return {
    app: "ReqRadar",
    schemaVersion: 3,
    appVersion: __APP_VERSION__,
    exportedAt,
    jobs,
    settings: { ...settings, lastExportAt: exportedAt },
    profile
  };
}

export function parseBackupFile(content: string): ParsedBackup {
  const parsed = JSON.parse(content) as unknown;
  const object = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  const candidates = Array.isArray(parsed) ? parsed : Array.isArray(object?.jobs) ? object.jobs : null;
  if (!candidates) throw new Error("This file does not contain a ReqRadar job list.");
  const jobs = dedupeJobs(candidates.map(normalizeJobReq).filter((job): job is JobReq => Boolean(job)));
  return {
    schemaVersion: typeof object?.schemaVersion === "number" ? object.schemaVersion : 1,
    appVersion: stringValue(object?.appVersion || object?.version),
    exportedAt: stringValue(object?.exportedAt),
    jobs,
    settings: normalizeSettings(object?.settings),
    profile: normalizeProfile(object?.profile)
  };
}

export function buildSyncPreview(currentJobs: JobReq[], backup: ParsedBackup): SyncPreview {
  const preview: SyncPreview = { newCount: 0, updatedCount: 0, unchangedCount: 0, conflictCount: 0, totalIncoming: backup.jobs.length };
  backup.jobs.forEach((incoming) => {
    const existing = findExisting(currentJobs, incoming);
    if (!existing) preview.newCount += 1;
    else if (timestamp(incoming.updatedAt) > timestamp(existing.updatedAt)) preview.updatedCount += 1;
    else if (timestamp(incoming.updatedAt) === timestamp(existing.updatedAt) && JSON.stringify(incoming) !== JSON.stringify(existing)) preview.conflictCount += 1;
    else preview.unchangedCount += 1;
  });
  return preview;
}

export function mergeBackup(currentJobs: JobReq[], currentSettings: AppSettings, currentProfile: UserProfile, backup: ParsedBackup): { jobs: JobReq[]; settings: AppSettings; profile: UserProfile; preview: SyncPreview } {
  const merged = [...currentJobs];
  backup.jobs.forEach((incoming) => {
    const existing = findExisting(merged, incoming);
    if (!existing) merged.push(incoming);
    else if (timestamp(incoming.updatedAt) > timestamp(existing.updatedAt)) merged.splice(merged.indexOf(existing), 1, incoming);
  });
  const settings = timestamp(backup.settings.updatedAt) > timestamp(currentSettings.updatedAt) ? backup.settings : currentSettings;
  const profile = timestamp(backup.profile.updatedAt) > timestamp(currentProfile.updatedAt) ? backup.profile : currentProfile;
  return { jobs: dedupeJobs(merged), settings, profile, preview: buildSyncPreview(currentJobs, backup) };
}

export function downloadJson(fileName: string, value: unknown): void {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
