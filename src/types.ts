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

export type DiscoveryFacet =
  | "STRATEGIC_FRAMING"
  | "ANALYTICAL_PROBLEM_SOLVING"
  | "BUILDING_SYSTEMS"
  | "RUNNING_CADENCE"
  | "AMBIGUITY_NAVIGATION"
  | "AUTONOMY_AND_AUTHORITY"
  | "WORK_VARIETY"
  | "AI_TRANSFORMATION"
  | "CUSTOMER_IMPACT"
  | "PRODUCT_OWNERSHIP"
  | "BUSINESS_OWNERSHIP"
  | "SETTING_TEAM_DIRECTION"
  | "COACHING_AND_DEVELOPMENT"
  | "DELEGATION_AND_ACCOUNTABILITY"
  | "PERFORMANCE_MANAGEMENT"
  | "HIRING_AND_TEAM_DESIGN"
  | "PEOPLE_ADMINISTRATION"
  | "EXECUTIVE_INFLUENCE"
  | "PEER_ALIGNMENT"
  | "INFLUENCE_WITHOUT_AUTHORITY"
  | "ORGANIZATIONAL_COMMUNICATION";

export type PreferenceScore = -2 | -1 | 0 | 1 | 2;
export type PreferenceImportance = 1 | 2 | 3;
export type Confidence = "HIGH" | "MEDIUM" | "LOW";
export type ScenarioConfidence = "DIRECT_EXPERIENCE" | "RELATED_EXPERIENCE" | "ESTIMATE" | "UNSURE";
export type ScenarioReaction = "SEEK_MORE" | "ENERGIZING" | "COMFORTABLE" | "TOLERATE" | "DRAINING" | "AVOID" | "DEPENDS";
export type ScenarioFrequency = "MAJOR" | "RECURRING" | "OCCASIONAL" | "NECESSARY_ONLY" | "NOT_IDEAL";
export type InferenceLevel = "STATED" | "STRONGLY_IMPLIED" | "POSSIBLE" | "UNKNOWN";
export type PreferenceFacetStatus = "TENTATIVE" | "CONFIRMED" | "CONDITIONAL";
export type DiscoverySessionStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
export type NetworkingLearningOutcome = "NOT_RECORDED" | "CONFIRMED" | "DISPROVED" | "NUANCED" | "STILL_UNKNOWN";
export type InterestChange = "NOT_RECORDED" | "INCREASED" | "SAME" | "DECREASED";

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

export type FocusBucket =
  | "READY_TO_PURSUE"
  | "NEEDS_DISCOVERY"
  | "NEEDS_NETWORKING"
  | "HIGH_INTEREST_STRETCH"
  | "CAPABLE_NOT_COMPELLING"
  | "TOO_TECHNICAL"
  | "NOT_INTERESTED"
  | "TOO_OLD"
  | "CRITICAL_BLOCKER"
  | "INACTIVE";

export type FocusBucketOverride = "AUTO" | FocusBucket;

export type PortfolioGroupBy =
  | "FOCUS_BUCKET"
  | "ROLE_FAMILY"
  | "STATUS"
  | "POSTING_AGE"
  | "INTEREST_BAND"
  | "CAPABILITY_BAND"
  | "NETWORKING_STAGE";

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
  source: "DEFAULT" | "INTERVIEW" | "MANUAL" | "DISCOVERY";
  rationale: string;
}

export interface PreferenceFacetEvidence {
  id: string;
  sourceType: "LEGACY_INTERVIEW" | "SCENARIO" | "GENERAL_THEME" | "PEAK_EXPERIENCE" | "MANUAL";
  sourceLabel: string;
  detail: string;
  jobId?: string;
  scenarioId?: string;
  createdAt: string;
}

export interface PreferenceFacet {
  id: string;
  facet: DiscoveryFacet;
  label: string;
  dimension: InterestDimension;
  preference: PreferenceScore;
  confidence: number;
  importance: PreferenceImportance;
  status: PreferenceFacetStatus;
  conditions: string[];
  evidence: PreferenceFacetEvidence[];
  preferredFrequency: ScenarioFrequency;
  updatedAt: string;
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
  discoveryPreferences: PreferenceFacet[];
  legacyInterviewMigrated: boolean;
  peakExperiences: PeakExperience[];
  careerDirections: CareerDirection[];
  profileNotes: string;
  updatedAt: string;
}

export interface RoleScenario {
  id: string;
  facet: DiscoveryFacet;
  dimension: InterestDimension;
  title: string;
  situation: string;
  responsibility: string;
  tension: string;
  purpose: string;
  evidence: string[];
  inferenceLevel: InferenceLevel;
  frequencyAssumption: string;
  conditionOptions: string[];
  reflectionPrompt: string;
}

export interface ScenarioResponse {
  scenarioId: string;
  facet: DiscoveryFacet;
  reaction: ScenarioReaction;
  preferredFrequency: ScenarioFrequency;
  confidence: ScenarioConfidence;
  conditions: string[];
  linkedExperienceId: string;
  reflection: string;
  markedRepetitive: boolean;
  answeredAt: string;
}

export interface FitDiscoverySession {
  id: string;
  status: DiscoverySessionStatus;
  scenarioOrder: string[];
  responses: Record<string, ScenarioResponse>;
  skippedScenarioIds: string[];
  repeatedScenarioIds: string[];
  startedAt: string;
  completedAt: string;
  lastViewedAt: string;
  hypothesis: string;
  unresolvedQuestions: string[];
  networkingOutcome: NetworkingLearningOutcome;
  interestChange: InterestChange;
  learningNotes: string;
}

export interface RoleRealityItem {
  id: string;
  label: string;
  value: string;
  detail: string;
  evidence: string[];
  inferenceLevel: InferenceLevel;
}

export interface RoleWeekItem {
  day: string;
  activity: string;
  evidence: string;
  inferenceLevel: InferenceLevel;
}

export interface RoleRealityPreview {
  responsibilities: RoleRealityItem[];
  stakeholders: RoleRealityItem[];
  impactModes: RoleRealityItem[];
  workRhythm: RoleRealityItem[];
  successSignals: RoleRealityItem[];
  unknowns: string[];
  week: RoleWeekItem[];
}

export interface DiscoveryDimensionScore {
  id: "WORK_CONTENT" | "WORK_DESIGN" | "LEADERSHIP_SOCIAL";
  label: string;
  score: number;
  confidence: number;
  answeredFacets: DiscoveryFacet[];
  explanation: string;
}

export interface DiscoverySynthesis {
  score: number;
  confidence: number;
  status: DiscoverySessionStatus;
  answeredCount: number;
  targetCount: number;
  dimensions: DiscoveryDimensionScore[];
  energizers: string[];
  drains: string[];
  conditions: string[];
  unresolvedQuestions: string[];
  contradictions: string[];
  nextQuestion: string;
  hypothesis: string;
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
  focusBucketOverride: FocusBucketOverride;
  fitNotes: string;
  fitDiscovery: FitDiscoverySession;
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
  baseInterestScore: number;
  generalThemeScore: number;
  generalThemeConfidence: number;
  roleSpecificAdjustment: number;
  discovery: DiscoverySynthesis;
  workContentScore: number;
  workDesignScore: number;
  leadershipSocialScore: number;
  directionScore: number;
  directionMatches: string[];
  viabilityScore: number;
  actionReadiness: number;
  ageDays: number | null;
  ageLabel: string;
  technicalIntensity: number;
  technicalReason: string;
  focusBucket: FocusBucket;
  focusReason: string;
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

export interface PortfolioThemeInsight {
  facet: DiscoveryFacet;
  label: string;
  shortLabel: string;
  family: "WORK_CONTENT" | "WORK_DESIGN" | "LEADERSHIP_SOCIAL";
  description: string;
  roleCount: number;
  jobIds: string[];
  representativeResponsibilities: string[];
  preference: PreferenceScore;
  confidence: number;
  status: PreferenceFacetStatus;
  conditions: string[];
  preferredFrequency: ScenarioFrequency;
  alignmentScore: number;
  needsDiscovery: boolean;
}

export interface ThemeDiscoveryResponse {
  reaction: ScenarioReaction;
  preferredFrequency: ScenarioFrequency;
  confidence: ScenarioConfidence;
  conditions: string[];
  reflection: string;
}

export interface PortfolioThemeAlignment {
  score: number;
  confidence: number;
  assessedThemes: number;
  totalThemes: number;
}

export interface AppSettings {
  recruitingPortalUrl: string;
  lastExportAt: string;
  hiddenStatuses: JobStatus[];
  hiddenFocusBuckets: FocusBucket[];
  preferredView: "PORTFOLIO" | "ROLES";
  portfolioGroupBy: PortfolioGroupBy;
  collapsedGroups: string[];
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
