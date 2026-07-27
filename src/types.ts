export type JobStatus =
  | "NEW"
  | "PURSUING"
  | "MAYBE"
  | "NOT_PURSUING"
  | "APPLIED";

export type NetworkingStage =
  | "NOT_STARTED"
  | "CONTACT_IDENTIFIED"
  | "MESSAGE_PLANNED"
  | "CONTACTED"
  | "RESPONSE_RECEIVED"
  | "CONVERSATION_SCHEDULED"
  | "CONVERSATION_COMPLETED"
  | "REFERRAL_REQUESTED"
  | "REFERRAL_RECEIVED"
  | "NOT_NEEDED";

export type InterestLevel = "AUTO" | "HIGH" | "MEDIUM" | "LOW" | "NONE";
export type Recommendation = "PURSUE" | "CONSIDER" | "LOW_PRIORITY" | "DO_NOT_PURSUE";
export type RecommendationOverride = "AUTO" | Recommendation;
export type SkillMatchStatus = "MATCH" | "PARTIAL" | "NO_MATCH" | "CRITICAL_GAP" | "NOT_RELEVANT";
export type ManualPriority = "HIGH" | "NORMAL" | "LOW" | "ARCHIVE";

export interface JobReq {
  id: string;
  jobId: string;
  title: string;
  normalizedTitle: string;
  category: string;
  team: string;
  locations: string[];
  hiringManager: string;
  recruiter: string;
  datePosted: string;
  seniority: string;
  minYears: number | null;
  descriptionText: string;
  responsibilities: string[];
  qualifications: string[];
  skills: string[];
  status: JobStatus;
  decisionReason: string;
  notes: string;
  jobUrl: string;
  sourceFileName: string;
  sourceHash: string;
  networkingStage: NetworkingStage;
  networkingContact: string;
  networkingNotes: string;
  interestOverride: InterestLevel;
  skillOverrides: Record<string, SkillMatchStatus>;
  ageOverride: boolean;
  manualAdjustment: number;
  manualPriority: ManualPriority;
  pinned: boolean;
  recommendationOverride: RecommendationOverride;
  createdAt: string;
  updatedAt: string;
  isDemo?: boolean;
}

export interface ParsedJob {
  jobId: string;
  title: string;
  normalizedTitle: string;
  category: string;
  team: string;
  locations: string[];
  hiringManager: string;
  recruiter: string;
  datePosted: string;
  seniority: string;
  minYears: number | null;
  descriptionText: string;
  responsibilities: string[];
  qualifications: string[];
  skills: string[];
}

export type ComparisonType =
  | "POSSIBLE_DUPLICATE"
  | "HIGHLY_SIMILAR"
  | "RELATED"
  | "LOW";

export interface JobComparison {
  sourceJobId: string;
  targetJobId: string;
  score: number;
  type: ComparisonType;
  titleScore: number;
  skillScore: number;
  contextScore: number;
  sharedSkills: string[];
  uniqueToSource: string[];
  uniqueToTarget: string[];
  reasons: string[];
}

export interface DuplicateCheck {
  exactMatch: JobReq | null;
  exactReason: "JOB_ID" | "FILE_HASH" | "";
  comparisons: JobComparison[];
}

export interface UserProfile {
  resumeFileName: string;
  resumeText: string;
  skills: string[];
  interests: string[];
  avoid: string[];
  updatedAt: string;
}

export interface AppSettings {
  recruitingPortalUrl: string;
  lastExportAt: string;
  hiddenStatuses: JobStatus[];
  updatedAt: string;
}

export interface ReqRadarBackup {
  app: "ReqRadar";
  schemaVersion: number;
  appVersion: string;
  exportedAt: string;
  jobs: JobReq[];
  settings: AppSettings;
  profile: UserProfile;
}

export interface ParsedBackup {
  schemaVersion: number;
  appVersion: string;
  exportedAt: string;
  jobs: JobReq[];
  settings: AppSettings;
  profile: UserProfile;
}

export interface SyncPreview {
  newCount: number;
  updatedCount: number;
  unchangedCount: number;
  conflictCount: number;
  totalIncoming: number;
}

export interface SkillAssessment {
  skill: string;
  status: SkillMatchStatus;
  critical: boolean;
  reason: string;
}

export interface JobAssessment {
  skills: SkillAssessment[];
  skillsScore: number;
  interestScore: number;
  interestLevel: Exclude<InterestLevel, "AUTO">;
  ageDays: number | null;
  ageLabel: string;
  freshnessScore: number;
  networkingScore: number;
  calculatedRecommendation: Recommendation;
  recommendation: Recommendation;
  baseScore: number;
  finalScore: number;
  criticalGaps: string[];
  reasons: string[];
  nextAction: string;
}

export interface BatchResult {
  fileName: string;
  status: "ADDED" | "DUPLICATE" | "ERROR";
  title: string;
  detail: string;
}
