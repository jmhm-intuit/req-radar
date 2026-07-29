export type JobStatus =
  | "NEW"
  | "EXPLORING"
  | "PURSUING"
  | "MAYBE"
  | "APPLIED"
  | "NOT_PURSUING"
  | "CLOSED";

export type NetworkingStage =
  | "NOT_STARTED"
  | "CONTACT_IDENTIFIED"
  | "MESSAGE_PLANNED"
  | "CONTACTED"
  | "RESPONSE_RECEIVED"
  | "CONVERSATION_SCHEDULED"
  | "CONVERSATION_COMPLETED"
  | "FOLLOW_UP"
  | "REFERRAL_REQUESTED"
  | "REFERRAL_RECEIVED"
  | "NOT_NEEDED";

export type ActionStage =
  | "REVIEW"
  | "VALIDATE_ROLE"
  | "IDENTIFY_CONTACT"
  | "NETWORK"
  | "PREPARE_APPLICATION"
  | "APPLY"
  | "FOLLOW_UP"
  | "COMPLETE";

export type InterestDimension =
  | "PEOPLE_LEADERSHIP"
  | "PEOPLE_DEVELOPMENT"
  | "STRATEGY"
  | "TRANSFORMATION"
  | "AI_INNOVATION"
  | "EXECUTIVE_INFLUENCE"
  | "AMBIGUITY"
  | "ANALYTICS"
  | "PRODUCT"
  | "CUSTOMER_IMPACT"
  | "AUTONOMY"
  | "VARIETY"
  | "BUILDING_NEW"
  | "BUSINESS_OWNERSHIP"
  | "RECURRING_OPERATIONS"
  | "INDIVIDUAL_CONTRIBUTOR";

export type PreferenceScore = -2 | -1 | 0 | 1 | 2;
export type PreferenceImportance = 1 | 2 | 3;
export type Confidence = "HIGH" | "MEDIUM" | "LOW";
export type SkillCategory =
  | "STRATEGY"
  | "OPERATIONS"
  | "TRANSFORMATION"
  | "LEADERSHIP"
  | "ANALYTICS"
  | "PRODUCT"
  | "CUSTOMER"
  | "TECHNOLOGY"
  | "FINANCE"
  | "COMMUNICATION"
  | "DOMAIN"
  | "CREDENTIAL"
  | "OTHER";

export type SkillProficiency = "FOUNDATIONAL" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
export type SkillEvidenceSource = "RESUME" | "MANUAL" | "LEGACY";
export type RequirementImportance = "MUST" | "GENERAL" | "PREFERRED";
export type SkillMatchStatus =
  | "PROVEN"
  | "TRANSFERABLE"
  | "DEVELOPMENT_GAP"
  | "CRITICAL_BLOCKER"
  | "UNKNOWN"
  | "NOT_RELEVANT";

export type Recommendation =
  | "PURSUE_NOW"
  | "EXPLORE_NETWORKING"
  | "STRETCH"
  | "LOW_PRIORITY"
  | "DO_NOT_PURSUE";

export type RecommendationOverride = "AUTO" | Recommendation;
export type ManualPriority = "HIGH" | "NORMAL" | "LOW" | "ARCHIVE";

export interface EvidenceItem {
  id: string;
  text: string;
  source: string;
}

export interface ProfileSkill {
  id: string;
  name: string;
  normalizedName: string;
  category: SkillCategory;
  proficiency: SkillProficiency;
  confidence: Confidence;
  evidence: EvidenceItem[];
  source: SkillEvidenceSource;
  confirmed: boolean;
  excluded: boolean;
}

export interface CareerPreference {
  dimension: InterestDimension;
  score: PreferenceScore;
  importance: PreferenceImportance;
  source: "DEFAULT" | "INTERVIEW" | "MANUAL";
  rationale: string;
}

export interface PeakExperience {
  id: string;
  title: string;
  description: string;
  detectedThemes: string[];
  confirmedThemes: string[];
}

export interface CareerDirection {
  id: string;
  label: string;
  keywords: string[];
  priority: PreferenceImportance;
}

export interface UserProfile {
  resumeFileName: string;
  resumeText: string;
  skills: ProfileSkill[];
  preferences: Record<InterestDimension, CareerPreference>;
  interviewAnswers: Record<string, string>;
  peakExperiences: PeakExperience[];
  careerDirections: CareerDirection[];
  profileNotes: string;
  updatedAt: string;
}

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
  networkingHypothesis: string;
  networkingLearnings: string;
  networkingQuestions: string[];
  actionStage: ActionStage;
  skillOverrides: Record<string, SkillMatchStatus>;
  ageOverride: boolean;
  verifiedActiveAt: string;
  manualAdjustment: number;
  manualPriority: ManualPriority;
  pinned: boolean;
  recommendationOverride: RecommendationOverride;
  interestAdjustment: number;
  groupOverride: string;
  fitNotes: string;
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

export interface JobRequirement {
  id: string;
  name: string;
  category: SkillCategory;
  importance: RequirementImportance;
  critical: boolean;
  evidence: string;
}

export interface WorkSignal {
  dimension: InterestDimension;
  score: number;
  confidence: Confidence;
  evidence: string[];
}

export interface RoleGroupMatch {
  id: string;
  label: string;
  score: number;
}

export interface JobFingerprint {
  primaryGroupId: string;
  primaryGroupLabel: string;
  groups: RoleGroupMatch[];
  archetype: string;
  themes: string[];
  leadershipModel: string;
  requirements: JobRequirement[];
  workSignals: WorkSignal[];
}

export interface CapabilitySkillAssessment {
  requirement: JobRequirement;
  status: SkillMatchStatus;
  matchedProfileSkill: ProfileSkill | null;
  evidence: string[];
  reason: string;
}

export interface InterestSignalAssessment {
  dimension: InterestDimension;
  label: string;
  preference: CareerPreference;
  jobSignal: WorkSignal;
  alignmentScore: number;
  tone: "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "UNKNOWN";
  explanation: string;
}

export interface JobAssessment {
  fingerprint: JobFingerprint;
  capabilitySkills: CapabilitySkillAssessment[];
  capabilityScore: number;
  interestSignals: InterestSignalAssessment[];
  interestScore: number;
  directionScore: number;
  directionMatches: string[];
  viabilityScore: number;
  actionReadiness: number;
  ageDays: number | null;
  ageLabel: string;
  calculatedRecommendation: Recommendation;
  recommendation: Recommendation;
  confidence: Confidence;
  finalScore: number;
  criticalBlockers: string[];
  unknowns: string[];
  reasons: string[];
  nextAction: string;
}

export type ComparisonType = "POSSIBLE_DUPLICATE" | "HIGHLY_SIMILAR" | "RELATED" | "LOW";

export interface JobComparison {
  sourceJobId: string;
  targetJobId: string;
  score: number;
  type: ComparisonType;
  titleScore: number;
  requirementScore: number;
  themeScore: number;
  groupScore: number;
  sharedRequirements: string[];
  sharedThemes: string[];
  reasons: string[];
}

export interface DuplicateCheck {
  exactMatch: JobReq | null;
  exactReason: "JOB_ID" | "FILE_HASH" | "";
  comparisons: JobComparison[];
}

export interface RoleGroupSummary {
  id: string;
  label: string;
  description: string;
  jobIds: string[];
  averageCapability: number;
  averageInterest: number;
  averageDirection: number;
  commonThemes: Array<{ label: string; count: number }>;
  commonGaps: Array<{ label: string; count: number }>;
  topJobId: string;
}

export interface AppSettings {
  recruitingPortalUrl: string;
  lastExportAt: string;
  hiddenStatuses: JobStatus[];
  preferredView: "PORTFOLIO" | "ROLES";
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

export interface BatchResult {
  fileName: string;
  status: "ADDED" | "DUPLICATE" | "ERROR";
  title: string;
  detail: string;
}

export interface InterviewChoice {
  id: string;
  label: string;
  description: string;
  impacts: Partial<Record<InterestDimension, PreferenceScore>>;
}

export interface InterviewQuestion {
  id: string;
  prompt: string;
  context: string;
  choices: InterviewChoice[];
}
