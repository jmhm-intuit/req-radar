import type {
  ActionStage,
  ApplicationStage,
  AssessmentState,
  AppSettings,
  FocusBucket,
  FocusBucketOverride,
  JobReq,
  JobStatus,
  ManualPriority,
  NetworkingStage,
  PortfolioDecisionState,
  PortfolioGroupBy,
  ParsedBackup,
  RecommendationOverride,
  ReqRadarBackup,
  SkillMatchStatus,
  SyncPreview,
  UserProfile
} from "../types";
import { createDefaultProfile, normalizeLegacyProfile } from "./profile";
import { normalizeDiscoverySession } from "./discovery";

const JOBS_STORAGE_KEY = "req-radar:jobs:v1";
const SETTINGS_STORAGE_KEY = "req-radar:settings:v1";
const PROFILE_STORAGE_KEY = "req-radar:profile:v1";

export interface StorageWriteResult {
  ok: boolean;
  bytes: number;
  message: string;
}

function storageWrite(key: string, value: unknown, label: string): StorageWriteResult {
  const serialized = JSON.stringify(value);
  const bytes = new TextEncoder().encode(serialized).byteLength;
  try {
    localStorage.setItem(key, serialized);
    return { ok: true, bytes, message: "" };
  } catch (error) {
    const quota = error instanceof DOMException && (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED");
    const detail = quota
      ? `Browser storage is full while saving ${label}. Download a backup before removing older requisitions.`
      : `ReqRadar could not save ${label} in this browser. Your current session is still open, but changes may be lost after refresh.`;
    return { ok: false, bytes, message: detail };
  }
}

const VALID_STATUSES = new Set<JobStatus>(["NEW", "EXPLORING", "PURSUING", "MAYBE", "APPLIED", "NOT_PURSUING", "CLOSED"]);
const VALID_NETWORKING = new Set<NetworkingStage>([
  "NOT_STARTED", "CONTACT_IDENTIFIED", "MESSAGE_PLANNED", "CONTACTED", "RESPONSE_RECEIVED",
  "CONVERSATION_SCHEDULED", "CONVERSATION_COMPLETED", "FOLLOW_UP", "REFERRAL_REQUESTED", "REFERRAL_RECEIVED", "NOT_NEEDED"
]);
const VALID_ACTIONS = new Set<ActionStage>(["REVIEW", "VALIDATE_ROLE", "IDENTIFY_CONTACT", "NETWORK", "PREPARE_APPLICATION", "APPLY", "FOLLOW_UP", "COMPLETE"]);
const VALID_ASSESSMENT_STATES = new Set<AssessmentState>(["UNREVIEWED", "CLASSIFIED", "NEEDS_EVIDENCE", "NEEDS_INTEREST", "COMPLETE"]);
const VALID_DECISION_STATES = new Set<PortfolioDecisionState>(["INBOX", "EXPLORE", "SHORTLIST", "PURSUE", "MONITOR", "NOT_PURSUING"]);
const VALID_APPLICATION_STAGES = new Set<ApplicationStage>(["NOT_STARTED", "VALIDATE_ROLE", "NETWORKING", "PREPARING", "APPLIED", "RECRUITER_CONVERSATION", "INTERVIEWING", "OFFER", "CLOSED"]);
const VALID_PRIORITY = new Set<ManualPriority>(["HIGH", "NORMAL", "LOW", "ARCHIVE"]);
const VALID_RECOMMENDATION = new Set<RecommendationOverride>(["AUTO", "PURSUE_NOW", "EXPLORE_NETWORKING", "STRETCH", "LOW_PRIORITY", "DO_NOT_PURSUE"]);
const VALID_SKILL_STATUS = new Set<SkillMatchStatus>(["PROVEN", "TRANSFERABLE", "PARTIAL", "DEVELOPMENT_GAP", "NOT_DEMONSTRATED", "CRITICAL_BLOCKER", "UNKNOWN", "NOT_RELEVANT"]);
const VALID_FOCUS_BUCKETS = new Set<FocusBucket>([
  "READY_TO_PURSUE", "NEEDS_DISCOVERY", "NEEDS_NETWORKING", "HIGH_INTEREST_STRETCH",
  "CAPABLE_NOT_COMPELLING", "TOO_TECHNICAL", "NOT_INTERESTED", "TOO_OLD",
  "CRITICAL_BLOCKER", "INACTIVE"
]);
const VALID_GROUP_BY = new Set<PortfolioGroupBy>([
  "FOCUS_BUCKET", "ROLE_FAMILY", "STATUS", "POSTING_AGE", "INTEREST_BAND", "CAPABILITY_BAND", "NETWORKING_STAGE"
]);

export const DEFAULT_SETTINGS: AppSettings = {
  recruitingPortalUrl: "",
  lastExportAt: "",
  lastPortfolioReviewAt: "",
  hiddenStatuses: ["NOT_PURSUING", "CLOSED"],
  hiddenFocusBuckets: [],
  preferredView: "HOME",
  portfolioGroupBy: "FOCUS_BUCKET",
  collapsedGroups: ["TOO_TECHNICAL", "NOT_INTERESTED", "TOO_OLD", "CRITICAL_BLOCKER", "INACTIVE"],
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

function normalizeStatus(value: unknown): JobStatus {
  if (typeof value === "string" && VALID_STATUSES.has(value as JobStatus)) return value as JobStatus;
  return "NEW";
}

function normalizeNetworking(value: unknown): NetworkingStage {
  if (value === "CONVERSATION_COMPLETE") return "CONVERSATION_COMPLETED";
  if (typeof value === "string" && VALID_NETWORKING.has(value as NetworkingStage)) return value as NetworkingStage;
  return "NOT_STARTED";
}

function normalizeAction(value: unknown, status: JobStatus): ActionStage {
  if (typeof value === "string" && VALID_ACTIONS.has(value as ActionStage)) return value as ActionStage;
  if (status === "APPLIED") return "FOLLOW_UP";
  if (status === "PURSUING") return "PREPARE_APPLICATION";
  if (status === "NOT_PURSUING" || status === "CLOSED") return "COMPLETE";
  return "REVIEW";
}

function normalizeAssessmentState(value: unknown): AssessmentState {
  if (typeof value === "string" && VALID_ASSESSMENT_STATES.has(value as AssessmentState)) return value as AssessmentState;
  return "UNREVIEWED";
}

function normalizeDecisionState(value: unknown, status: JobStatus): PortfolioDecisionState {
  if (typeof value === "string" && VALID_DECISION_STATES.has(value as PortfolioDecisionState)) return value as PortfolioDecisionState;
  if (status === "PURSUING" || status === "APPLIED") return "PURSUE";
  if (status === "NOT_PURSUING" || status === "CLOSED") return "NOT_PURSUING";
  if (status === "EXPLORING" || status === "MAYBE") return "EXPLORE";
  return "INBOX";
}

function normalizeApplicationStage(value: unknown, status: JobStatus): ApplicationStage {
  if (typeof value === "string" && VALID_APPLICATION_STAGES.has(value as ApplicationStage)) return value as ApplicationStage;
  if (status === "APPLIED") return "APPLIED";
  if (status === "PURSUING") return "VALIDATE_ROLE";
  if (status === "CLOSED") return "CLOSED";
  return "NOT_STARTED";
}

function normalizeRecommendation(value: unknown): RecommendationOverride {
  if (typeof value === "string" && VALID_RECOMMENDATION.has(value as RecommendationOverride)) return value as RecommendationOverride;
  const legacy: Record<string, RecommendationOverride> = {
    PURSUE: "PURSUE_NOW",
    CONSIDER: "EXPLORE_NETWORKING",
    LOW_PRIORITY: "LOW_PRIORITY",
    DO_NOT_PURSUE: "DO_NOT_PURSUE"
  };
  return typeof value === "string" ? legacy[value] || "AUTO" : "AUTO";
}

function normalizeFocusBucketOverride(value: unknown): FocusBucketOverride {
  if (value === "AUTO") return "AUTO";
  if (typeof value === "string" && VALID_FOCUS_BUCKETS.has(value as FocusBucket)) return value as FocusBucket;
  return "AUTO";
}

function normalizeSkillStatus(value: unknown): SkillMatchStatus | null {
  if (typeof value === "string" && VALID_SKILL_STATUS.has(value as SkillMatchStatus)) return value as SkillMatchStatus;
  const legacy: Record<string, SkillMatchStatus> = {
    MATCH: "PROVEN",
    PARTIAL: "PARTIAL",
    NO_MATCH: "NOT_DEMONSTRATED",
    CRITICAL_GAP: "CRITICAL_BLOCKER",
    NOT_RELEVANT: "NOT_RELEVANT"
  };
  return typeof value === "string" ? legacy[value] || null : null;
}

function normalizeOverrides(value: unknown): Record<string, SkillMatchStatus> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([key, status]) => [key, normalizeSkillStatus(status)] as const)
      .filter((entry): entry is [string, SkillMatchStatus] => Boolean(entry[1]))
  );
}

export function normalizeJobReq(value: unknown): JobReq | null {
  if (!value || typeof value !== "object") return null;
  const job = value as Record<string, unknown>;
  if (typeof job.id !== "string" || typeof job.title !== "string" || typeof job.descriptionText !== "string") return null;
  const status = normalizeStatus(job.status);
  const now = new Date().toISOString();
  const legacyInterest = stringValue(job.interestOverride);
  const interestAdjustment = typeof job.interestAdjustment === "number"
    ? Math.max(-20, Math.min(20, job.interestAdjustment))
    : legacyInterest === "HIGH" ? 15 : legacyInterest === "MEDIUM" ? 5 : legacyInterest === "LOW" ? -10 : legacyInterest === "NONE" ? -20 : 0;

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
    networkingStage: normalizeNetworking(job.networkingStage),
    networkingContact: stringValue(job.networkingContact),
    networkingNotes: stringValue(job.networkingNotes),
    networkingHypothesis: stringValue(job.networkingHypothesis),
    networkingLearnings: stringValue(job.networkingLearnings),
    networkingQuestions: stringArray(job.networkingQuestions),
    actionStage: normalizeAction(job.actionStage, status),
    assessmentState: normalizeAssessmentState(job.assessmentState),
    decisionState: normalizeDecisionState(job.decisionState, status),
    applicationStage: normalizeApplicationStage(job.applicationStage, status),
    applicationNextAction: stringValue(job.applicationNextAction),
    applicationNextActionDue: stringValue(job.applicationNextActionDue),
    applicationLastActivityAt: stringValue(job.applicationLastActivityAt),
    applicationNotes: stringValue(job.applicationNotes),
    skillOverrides: normalizeOverrides(job.skillOverrides),
    ageOverride: booleanValue(job.ageOverride),
    verifiedActiveAt: stringValue(job.verifiedActiveAt),
    manualAdjustment: Math.max(-20, Math.min(20, numberValue(job.manualAdjustment))),
    manualPriority: typeof job.manualPriority === "string" && VALID_PRIORITY.has(job.manualPriority as ManualPriority) ? job.manualPriority as ManualPriority : "NORMAL",
    pinned: booleanValue(job.pinned),
    recommendationOverride: normalizeRecommendation(job.recommendationOverride),
    interestAdjustment,
    groupOverride: stringValue(job.groupOverride),
    focusBucketOverride: normalizeFocusBucketOverride(job.focusBucketOverride),
    fitNotes: stringValue(job.fitNotes),
    fitDiscovery: normalizeDiscoverySession(job.fitDiscovery),
    createdAt: stringValue(job.createdAt) || now,
    updatedAt: stringValue(job.updatedAt) || stringValue(job.createdAt) || now,
    ...(job.isDemo ? { isDemo: true } : {})
  };
}

function normalizeSettings(value: unknown): AppSettings {
  if (!value || typeof value !== "object") return { ...DEFAULT_SETTINGS };
  const settings = value as Record<string, unknown>;
  return {
    recruitingPortalUrl: stringValue(settings.recruitingPortalUrl),
    lastExportAt: stringValue(settings.lastExportAt),
    lastPortfolioReviewAt: stringValue(settings.lastPortfolioReviewAt),
    hiddenStatuses: stringArray(settings.hiddenStatuses).filter((status): status is JobStatus => VALID_STATUSES.has(status as JobStatus)),
    hiddenFocusBuckets: stringArray(settings.hiddenFocusBuckets).filter((bucket): bucket is FocusBucket => VALID_FOCUS_BUCKETS.has(bucket as FocusBucket)),
    preferredView: typeof settings.preferredView === "string" && ["HOME", "PROFILE", "LANDSCAPE", "SHORTLIST", "PIPELINE", "LIBRARY", "PORTFOLIO", "ROLES"].includes(settings.preferredView)
      ? settings.preferredView as AppSettings["preferredView"]
      : "HOME",
    portfolioGroupBy: typeof settings.portfolioGroupBy === "string" && VALID_GROUP_BY.has(settings.portfolioGroupBy as PortfolioGroupBy) ? settings.portfolioGroupBy as PortfolioGroupBy : "FOCUS_BUCKET",
    collapsedGroups: stringArray(settings.collapsedGroups),
    updatedAt: stringValue(settings.updatedAt)
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
  return [...map.values()].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
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

export function saveJobs(jobs: JobReq[]): StorageWriteResult {
  return storageWrite(JOBS_STORAGE_KEY, jobs, "job requisitions");
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    return raw ? normalizeSettings(JSON.parse(raw) as unknown) : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: AppSettings): StorageWriteResult {
  return storageWrite(SETTINGS_STORAGE_KEY, settings, "settings");
}

export function loadProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    return raw ? normalizeLegacyProfile(JSON.parse(raw) as unknown) : createDefaultProfile();
  } catch {
    return createDefaultProfile();
  }
}

export function saveProfile(profile: UserProfile): StorageWriteResult {
  return storageWrite(PROFILE_STORAGE_KEY, profile, "career profile");
}

export function buildExportPayload(jobs: JobReq[], settings: AppSettings, profile: UserProfile, exportedAt = new Date().toISOString()): ReqRadarBackup {
  return {
    app: "ReqRadar",
    schemaVersion: 9,
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
    profile: object?.profile ? normalizeLegacyProfile(object.profile) : createDefaultProfile()
  };
}

export function buildSyncPreview(currentJobs: JobReq[], backup: ParsedBackup): SyncPreview {
  const preview: SyncPreview = { newCount: 0, updatedCount: 0, unchangedCount: 0, conflictCount: 0, totalIncoming: backup.jobs.length };
  backup.jobs.forEach((incoming) => {
    const existing = findExisting(currentJobs, incoming);
    if (!existing) preview.newCount += 1;
    else if (timestamp(incoming.updatedAt) > timestamp(existing.updatedAt)) preview.updatedCount += 1;
    else if (timestamp(incoming.updatedAt) === timestamp(existing.updatedAt)) preview.unchangedCount += 1;
    else preview.conflictCount += 1;
  });
  return preview;
}

export function mergeBackup(
  currentJobs: JobReq[],
  currentSettings: AppSettings,
  currentProfile: UserProfile,
  backup: ParsedBackup,
  mode: "merge" | "replace"
): { jobs: JobReq[]; settings: AppSettings; profile: UserProfile } {
  if (mode === "replace") return { jobs: dedupeJobs(backup.jobs), settings: backup.settings, profile: backup.profile };
  const merged = [...currentJobs];
  backup.jobs.forEach((incoming) => {
    const existingIndex = merged.findIndex((job) => identityKey(job) === identityKey(incoming) || job.id === incoming.id);
    if (existingIndex < 0) merged.push(incoming);
    else if (timestamp(incoming.updatedAt) > timestamp(merged[existingIndex].updatedAt)) merged[existingIndex] = incoming;
  });
  const settings = timestamp(backup.settings.updatedAt) > timestamp(currentSettings.updatedAt) ? backup.settings : currentSettings;
  const profile = timestamp(backup.profile.updatedAt) > timestamp(currentProfile.updatedAt) ? backup.profile : currentProfile;
  return { jobs: dedupeJobs(merged), settings, profile };
}

export function downloadJson(payload: ReqRadarBackup): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const date = payload.exportedAt.slice(0, 10);
  link.href = url;
  link.download = `req-radar-v4.0-backup-${date}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
