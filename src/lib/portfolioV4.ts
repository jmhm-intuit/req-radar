import { ROLE_GROUPS } from "../data/ontology";
import type {
  ApplicationStage,
  JobAssessment,
  JobReq,
  PortfolioDecisionState,
  PreferenceFacet,
  UserProfile
} from "../types";

export type FamilyRecommendation = "PRIORITIZE" | "EXPLORE" | "MONITOR" | "DEPRIORITIZE" | "CALIBRATE";

export interface CandidateBaselineProgress {
  score: number;
  resumeReady: boolean;
  evidenceReady: boolean;
  reflectionReady: boolean;
  themeReady: boolean;
  completeSteps: number;
  totalSteps: number;
  nextStep: "UPLOAD_RESUME" | "REVIEW_EVIDENCE" | "REFLECT" | "REVIEW_THEMES" | "READY";
  message: string;
}

export interface OpportunityFamilyInsight {
  id: string;
  label: string;
  description: string;
  jobIds: string[];
  roleCount: number;
  experienceFit: number;
  interestFit: number;
  directionFit: number;
  viability: number;
  confidence: number;
  alignment: number;
  recommendation: FamilyRecommendation;
  guidance: string;
  preliminary: boolean;
  commonWork: Array<{ label: string; count: number }>;
  strengths: Array<{ label: string; count: number }>;
  concerns: Array<{ label: string; count: number }>;
  topJobIds: string[];
  scopeSummary: string;
}

export interface ThemeQuadrantItem {
  id: string;
  label: string;
  preference: number;
  confidence: number;
  evidenceCount: number;
  kind: "ANCHOR" | "CAPABILITY_TRAP" | "DEVELOPMENT_PATH" | "DEPRIORITIZE" | "UNKNOWN";
  conditions: string[];
}

function average(values: number[], fallback = 0): number {
  if (!values.length) return fallback;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function normalizedLabel(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ");
}

function topCounts(values: string[], limit: number): Array<{ label: string; count: number }> {
  const map = new Map<string, { label: string; count: number }>();
  values.forEach((value) => {
    const label = value.trim();
    if (!label) return;
    const key = normalizedLabel(label);
    if (!key) return;
    const existing = map.get(key);
    map.set(key, { label: existing?.label || label, count: (existing?.count || 0) + 1 });
  });
  return [...map.values()].sort((left, right) => right.count - left.count || left.label.localeCompare(right.label)).slice(0, limit);
}

export function candidateBaselineProgress(profile: UserProfile): CandidateBaselineProgress {
  const resumeReady = Boolean(profile.resumeText.trim());
  const activeSkills = profile.skills.filter((skill) => !skill.excluded);
  const evidenceReady = activeSkills.filter((skill) => skill.confirmed || skill.evidence.length > 0).length >= 5;
  const reflectionReady = (profile.resumeReflections || []).length >= 2;
  const meaningfulThemes = profile.discoveryPreferences.filter((item) => item.evidence.length > 0 || item.status !== "TENTATIVE");
  const themeReady = meaningfulThemes.length >= 4;
  const steps = [resumeReady, evidenceReady, reflectionReady, themeReady];
  const completeSteps = steps.filter(Boolean).length;
  const score = Math.round((completeSteps / steps.length) * 100);
  if (!resumeReady) return { score, resumeReady, evidenceReady, reflectionReady, themeReady, completeSteps, totalSteps: 4, nextStep: "UPLOAD_RESUME", message: "Upload your resume to create the experience evidence foundation." };
  if (!evidenceReady) return { score, resumeReady, evidenceReady, reflectionReady, themeReady, completeSteps, totalSteps: 4, nextStep: "REVIEW_EVIDENCE", message: "Confirm the experiences and competencies that should represent you." };
  if (!reflectionReady) return { score, resumeReady, evidenceReady, reflectionReady, themeReady, completeSteps, totalSteps: 4, nextStep: "REFLECT", message: "Reflect on at least two resume accomplishments to separate achievement from enjoyment." };
  if (!themeReady) return { score, resumeReady, evidenceReady, reflectionReady, themeReady, completeSteps, totalSteps: 4, nextStep: "REVIEW_THEMES", message: "Review the emerging work themes before ranking individual roles." };
  return { score, resumeReady, evidenceReady, reflectionReady, themeReady, completeSteps, totalSteps: 4, nextStep: "READY", message: "Your baseline is ready to guide opportunity-family and role decisions." };
}

function recommendationFor(
  experienceFit: number,
  interestFit: number,
  directionFit: number,
  confidence: number,
  blockers: number,
  preliminary: boolean
): FamilyRecommendation {
  if (preliminary || confidence < 42) return "CALIBRATE";
  if (blockers > 0 && experienceFit < 55) return "DEPRIORITIZE";
  if (experienceFit >= 72 && interestFit >= 68 && directionFit >= 65) return "PRIORITIZE";
  if (experienceFit >= 62 && (interestFit >= 58 || directionFit >= 72)) return "EXPLORE";
  if (interestFit < 45 || experienceFit < 45) return "DEPRIORITIZE";
  return "MONITOR";
}

function guidanceFor(recommendation: FamilyRecommendation, experienceFit: number, interestFit: number): string {
  if (recommendation === "CALIBRATE") return "Calibrate your resume evidence and work preferences before treating this as a ranked path.";
  if (recommendation === "PRIORITIZE") return "This family combines strong evidence, attractive work, and a promising career direction.";
  if (recommendation === "EXPLORE") return experienceFit >= interestFit
    ? "Your experience is credible. Use role discovery to confirm whether the recurring work is energizing."
    : "The work appears attractive. Validate the most important experience gaps before investing heavily.";
  if (recommendation === "MONITOR") return "Keep this family visible, but resolve the main uncertainty before shortlisting roles.";
  return "The current combination of evidence, interest, or scope makes this a lower-priority path.";
}

function roleGroupDefinition(id: string): { label: string; description: string } {
  const definition = ROLE_GROUPS.find((group) => group.id === id);
  return {
    label: definition?.label || "Other / Emerging Pattern",
    description: definition?.description || "Roles that do not yet form a strong recurring family."
  };
}

function activeForLandscape(job: JobReq): boolean {
  return job.decisionState !== "NOT_PURSUING" && !["NOT_PURSUING", "CLOSED"].includes(job.status);
}

export function buildOpportunityFamilyInsights(
  jobs: JobReq[],
  assessments: Map<string, JobAssessment>,
  profile: UserProfile
): OpportunityFamilyInsight[] {
  const baseline = candidateBaselineProgress(profile);
  const buckets = new Map<string, JobReq[]>();

  jobs.filter(activeForLandscape).forEach((job) => {
    const assessment = assessments.get(job.id);
    if (!assessment) return;
    const id = job.groupOverride || assessment.fingerprint.primaryGroupId || "other";
    buckets.set(id, [...(buckets.get(id) || []), job]);
  });

  let entries = [...buckets.entries()].sort((left, right) => right[1].length - left[1].length);
  if (entries.length > 7) {
    const keep = entries.slice(0, 6);
    const remainder = entries.slice(6).flatMap((entry) => entry[1]);
    entries = [...keep, ["other", remainder] as [string, JobReq[]]];
  }

  return entries.map(([id, familyJobs]) => {
    const familyAssessments = familyJobs.map((job) => assessments.get(job.id)).filter((item): item is JobAssessment => Boolean(item));
    const experienceFit = average(familyAssessments.map((item) => item.fitSignature.readinessScore));
    const interestFit = average(familyAssessments.map((item) => item.fitSignature.attractionScore));
    const directionFit = average(familyAssessments.map((item) => item.fitSignature.directionScore));
    const viability = average(familyAssessments.map((item) => item.fitSignature.viabilityScore));
    const confidence = average(familyAssessments.map((item) => item.fitSignature.evidenceConfidence));
    const blockers = familyAssessments.reduce((sum, item) => sum + item.criticalBlockers.length, 0);
    const preliminary = baseline.score < 75;
    const recommendation = recommendationFor(experienceFit, interestFit, directionFit, confidence, blockers, preliminary);
    const definition = roleGroupDefinition(id);
    const commonWork = topCounts(familyAssessments.flatMap((assessment) => assessment.successProfile.workprint.filter((item) => item.score >= 35).map((item) => item.label)), 5);
    const strengths = topCounts(familyAssessments.flatMap((assessment) => assessment.capabilitySkills.filter((item) => item.status === "PROVEN" || item.status === "TRANSFERABLE").map((item) => item.requirement.name)), 5);
    const concerns = topCounts(familyAssessments.flatMap((assessment) => assessment.capabilitySkills.filter((item) => ["PARTIAL", "DEVELOPMENT_GAP", "NOT_DEMONSTRATED", "CRITICAL_BLOCKER", "UNKNOWN"].includes(item.status)).map((item) => item.requirement.name)), 5);
    const topJobIds = [...familyJobs]
      .sort((left, right) => {
        if (preliminary) {
          const pinDelta = Number(right.pinned) - Number(left.pinned);
          if (pinDelta) return pinDelta;
          const rightDate = Date.parse(right.datePosted || right.createdAt) || 0;
          const leftDate = Date.parse(left.datePosted || left.createdAt) || 0;
          return rightDate - leftDate || left.title.localeCompare(right.title);
        }
        const leftAssessment = assessments.get(left.id);
        const rightAssessment = assessments.get(right.id);
        const leftScore = leftAssessment ? leftAssessment.finalScore + (left.pinned ? 12 : 0) : 0;
        const rightScore = rightAssessment ? rightAssessment.finalScore + (right.pinned ? 12 : 0) : 0;
        return rightScore - leftScore;
      })
      .slice(0, 5)
      .map((job) => job.id);
    const scopeCounts = familyAssessments.reduce<Record<string, number>>((counts, assessment) => {
      counts[assessment.fitSignature.scopeStatus] = (counts[assessment.fitSignature.scopeStatus] || 0) + 1;
      return counts;
    }, {});
    const scopeSummary = scopeCounts.OUT_OF_SCOPE
      ? `${scopeCounts.OUT_OF_SCOPE} role${scopeCounts.OUT_OF_SCOPE === 1 ? "" : "s"} currently out of scope`
      : scopeCounts.CREDIBLE_STRETCH
        ? `${scopeCounts.CREDIBLE_STRETCH} credible stretch role${scopeCounts.CREDIBLE_STRETCH === 1 ? "" : "s"}`
        : "Mostly in scope based on current evidence";
    const alignment = Math.round(experienceFit * .36 + interestFit * .30 + directionFit * .22 + viability * .12 - Math.min(18, blockers * 4));

    return {
      id,
      label: definition.label,
      description: definition.description,
      jobIds: familyJobs.map((job) => job.id),
      roleCount: familyJobs.length,
      experienceFit,
      interestFit,
      directionFit,
      viability,
      confidence,
      alignment,
      recommendation,
      guidance: guidanceFor(recommendation, experienceFit, interestFit),
      preliminary,
      commonWork,
      strengths,
      concerns,
      topJobIds,
      scopeSummary
    };
  }).sort((left, right) => {
    if (left.preliminary && right.preliminary) {
      return right.roleCount - left.roleCount || left.label.localeCompare(right.label);
    }
    const order: Record<FamilyRecommendation, number> = { PRIORITIZE: 0, EXPLORE: 1, MONITOR: 2, CALIBRATE: 3, DEPRIORITIZE: 4 };
    return order[left.recommendation] - order[right.recommendation] || right.alignment - left.alignment || right.roleCount - left.roleCount;
  });
}

function themeKind(preference: PreferenceFacet): ThemeQuadrantItem["kind"] {
  const evidenceCount = preference.evidence.length;
  const demonstrated = evidenceCount >= 2 || preference.confidence >= 65;
  if (preference.confidence < 35 || preference.preference === 0) return "UNKNOWN";
  if (preference.preference >= 1 && demonstrated) return "ANCHOR";
  if (preference.preference <= -1 && demonstrated) return "CAPABILITY_TRAP";
  if (preference.preference >= 1 && !demonstrated) return "DEVELOPMENT_PATH";
  if (preference.preference <= -1) return "DEPRIORITIZE";
  return "UNKNOWN";
}

export function buildThemeQuadrants(profile: UserProfile): ThemeQuadrantItem[] {
  return profile.discoveryPreferences.map((preference) => ({
    id: preference.id,
    label: preference.label,
    preference: preference.preference,
    confidence: preference.confidence,
    evidenceCount: preference.evidence.length,
    kind: themeKind(preference),
    conditions: preference.conditions
  })).sort((left, right) => right.preference - left.preference || right.confidence - left.confidence);
}

export function decisionStateLabel(state: PortfolioDecisionState): string {
  const labels: Record<PortfolioDecisionState, string> = {
    INBOX: "Inbox",
    EXPLORE: "Explore",
    SHORTLIST: "Shortlist",
    PURSUE: "Pursue",
    MONITOR: "Monitor",
    NOT_PURSUING: "Not pursuing"
  };
  return labels[state];
}

export function applicationStageLabel(stage: ApplicationStage): string {
  const labels: Record<ApplicationStage, string> = {
    NOT_STARTED: "Not started",
    VALIDATE_ROLE: "Validate role",
    NETWORKING: "Networking",
    PREPARING: "Preparing",
    APPLIED: "Applied",
    RECRUITER_CONVERSATION: "Recruiter conversation",
    INTERVIEWING: "Interviewing",
    OFFER: "Offer",
    CLOSED: "Closed"
  };
  return labels[stage];
}

export function defaultNextAction(stage: ApplicationStage): string {
  const actions: Record<ApplicationStage, string> = {
    NOT_STARTED: "Decide whether this role belongs in the active pipeline",
    VALIDATE_ROLE: "Validate role scope, team structure, and posting activity",
    NETWORKING: "Identify and contact one relevant person",
    PREPARING: "Tailor the resume and select evidence stories",
    APPLIED: "Record the application date and plan the follow-up",
    RECRUITER_CONVERSATION: "Prepare questions and role-fit evidence",
    INTERVIEWING: "Prepare for the next interview stage",
    OFFER: "Evaluate the offer against career priorities",
    CLOSED: "Record the outcome and learning"
  };
  return actions[stage];
}
