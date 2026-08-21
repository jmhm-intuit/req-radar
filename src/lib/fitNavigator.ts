import type {
  CapabilitySkillAssessment,
  CompetencyFamily,
  CompetencyFamilyAssessment,
  DecisionAction,
  ExpectedProficiency,
  FitSignature,
  JobAssessment,
  JobContextSignal,
  JobReq,
  JobRequirement,
  JobSuccessOutcome,
  JobSuccessProfile,
  Learnability,
  ProfileSkill,
  RankingRobustness,
  RequirementCriticality,
  ScopeStatus,
  SkillCategory,
  SkillMatchStatus,
  TechnicalMode,
  UserProfile,
  WorkprintItem
} from "../types";
import {
  average,
  clamp,
  evidenceForPhrases,
  makeId,
  normalizeText,
  phraseCount,
  uniqueStrings
} from "./text";

export const COMPETENCY_FAMILY_ORDER: CompetencyFamily[] = [
  "STRATEGY",
  "LEADERSHIP_INFLUENCE",
  "OPERATIONS_TRANSFORMATION",
  "ANALYTICS_FINANCE",
  "PRODUCT_CUSTOMER",
  "FUNCTIONAL_DOMAIN",
  "TECHNICAL",
  "SCOPE",
  "CREDENTIAL"
];

export const COMPETENCY_FAMILY_LABELS: Record<CompetencyFamily, string> = {
  STRATEGY: "Strategy & problem framing",
  LEADERSHIP_INFLUENCE: "Leadership & influence",
  OPERATIONS_TRANSFORMATION: "Operations & transformation",
  ANALYTICS_FINANCE: "Analytics & finance",
  PRODUCT_CUSTOMER: "Product & customer",
  FUNCTIONAL_DOMAIN: "Functional & domain",
  TECHNICAL: "Technical",
  SCOPE: "Scope & seniority",
  CREDENTIAL: "Credentials"
};

export const SCOPE_STATUS_LABELS: Record<ScopeStatus, string> = {
  IN_SCOPE_NOW: "In scope now",
  CREDIBLE_STRETCH: "Credible stretch",
  OUT_OF_SCOPE: "Out of scope",
  INSUFFICIENT_EVIDENCE: "Insufficient evidence"
};

export const DECISION_ACTION_LABELS: Record<DecisionAction, string> = {
  PURSUE: "Pursue",
  EXPLORE: "Explore",
  HOLD: "Hold",
  DO_NOT_PURSUE: "Do not pursue",
  VERIFY_ACTIVE: "Verify active"
};

export const MATCH_STATUS_LABELS: Record<SkillMatchStatus, string> = {
  PROVEN: "Proven",
  TRANSFERABLE: "Transferable",
  PARTIAL: "Partial",
  DEVELOPMENT_GAP: "Developmental gap",
  NOT_DEMONSTRATED: "Not demonstrated",
  CRITICAL_BLOCKER: "Critical blocker",
  UNKNOWN: "Unknown",
  NOT_RELEVANT: "Not relevant"
};

export function competencyFamilyForCategory(category: SkillCategory): CompetencyFamily {
  if (category === "STRATEGY") return "STRATEGY";
  if (category === "LEADERSHIP" || category === "COMMUNICATION") return "LEADERSHIP_INFLUENCE";
  if (category === "OPERATIONS" || category === "TRANSFORMATION") return "OPERATIONS_TRANSFORMATION";
  if (category === "ANALYTICS" || category === "FINANCE") return "ANALYTICS_FINANCE";
  if (category === "PRODUCT" || category === "CUSTOMER") return "PRODUCT_CUSTOMER";
  if (category === "TECHNOLOGY") return "TECHNICAL";
  if (category === "CREDENTIAL") return "CREDENTIAL";
  return "FUNCTIONAL_DOMAIN";
}

export function requirementCriticality(
  category: SkillCategory,
  importance: JobRequirement["importance"],
  critical: boolean,
  evidence: string,
  centrality: number
): RequirementCriticality {
  if (critical || category === "CREDENTIAL" && importance === "MUST") return "HARD_GATE";
  if (importance === "PREFERRED") return "PREFERRED";
  const normalized = normalizeText(evidence);
  if (importance === "MUST" || /\b(must|required|minimum|at least|need to|responsible for)\b/.test(normalized)) return "DAY_ONE_ESSENTIAL";
  if (centrality >= 4) return "CORE_DEVELOPABLE";
  if (centrality >= 2) return "SUPPORTING";
  return "UNCLEAR";
}

export function expectedProficiency(evidence: string, minYears: number | null): ExpectedProficiency {
  const normalized = normalizeText(evidence);
  const years = Number((normalized.match(/\b(\d{1,2})\+?\s*(?:years|yrs)\b/) || [])[1] || minYears || 0);
  if (/\b(expert|deep expertise|extensive experience|recognized authority)\b/.test(normalized) || years >= 10) return "EXPERT";
  if (/\b(strong|advanced|significant|proven track record|highly experienced)\b/.test(normalized) || years >= 6) return "ADVANCED";
  if (/\b(experience with|working knowledge|demonstrated ability|proficiency)\b/.test(normalized) || years >= 2) return "WORKING";
  if (/\b(familiar|exposure|basic|understanding)\b/.test(normalized)) return "FOUNDATIONAL";
  return "UNKNOWN";
}

export function learnabilityForRequirement(
  family: CompetencyFamily,
  criticality: RequirementCriticality,
  expected: ExpectedProficiency
): Learnability {
  if (criticality === "HARD_GATE" || family === "CREDENTIAL") return "LOW";
  if (family === "TECHNICAL" && (criticality === "DAY_ONE_ESSENTIAL" || expected === "EXPERT")) return "LOW";
  if (criticality === "DAY_ONE_ESSENTIAL" || expected === "ADVANCED") return "MEDIUM";
  if (criticality === "CORE_DEVELOPABLE" || criticality === "SUPPORTING" || criticality === "PREFERRED") return "HIGH";
  return "UNKNOWN";
}

export function centralityForRequirement(job: JobReq, aliases: string[], evidence: string, count: number): number {
  let score = 1;
  if (count >= 2) score += 1;
  if (count >= 4) score += 1;
  if (job.responsibilities.some((item) => aliases.some((alias) => normalizeText(item).includes(normalizeText(alias))))) score += 1;
  if (job.title && aliases.some((alias) => normalizeText(job.title).includes(normalizeText(alias)))) score += 1;
  if (/\b(core|primary|critical|key|essential|lead|own|responsible)\b/i.test(evidence)) score += 1;
  return Math.max(1, Math.min(5, score));
}

export function behaviorFromEvidence(name: string, evidence: string): string {
  const clean = evidence.replace(/^[•\-*\s]+/, "").trim();
  if (clean.length >= 25) return clean.length > 180 ? `${clean.slice(0, 177)}…` : clean;
  return `Apply ${name.toLowerCase()} to deliver the role's outcomes.`;
}

function proficiencyStrength(skill: ProfileSkill): number {
  const proficiency = { FOUNDATIONAL: 28, INTERMEDIATE: 52, ADVANCED: 76, EXPERT: 94 }[skill.proficiency];
  const confidence = { LOW: 0, MEDIUM: 7, HIGH: 13 }[skill.confidence];
  const evidence = Math.min(18, skill.evidence.length * 6);
  const confirmed = skill.confirmed ? 8 : 0;
  const manual = skill.source === "MANUAL" ? 3 : 0;
  return clamp(proficiency + confidence + evidence + confirmed + manual, 0, 100);
}

export function profileEvidenceStrength(skill: ProfileSkill | null): number {
  return skill ? proficiencyStrength(skill) : 0;
}

export function targetStrength(expected: ExpectedProficiency): number {
  return { FOUNDATIONAL: 28, WORKING: 52, ADVANCED: 76, EXPERT: 92, UNKNOWN: 55 }[expected];
}

export function matchConfidenceFor(
  requirement: JobRequirement,
  skill: ProfileSkill | null,
  status: SkillMatchStatus
): number {
  let score = requirement.evidence ? 28 : 12;
  if (requirement.inferenceLevel === "STATED") score += 18;
  if (requirement.centrality >= 4) score += 8;
  if (skill) {
    score += Math.min(24, skill.evidence.length * 7);
    if (skill.confirmed) score += 12;
    if (skill.confidence === "HIGH") score += 8;
    else if (skill.confidence === "MEDIUM") score += 4;
  }
  if (status === "UNKNOWN") score = Math.min(score, 42);
  if (status === "NOT_DEMONSTRATED") score = Math.max(score, 55);
  return clamp(score, 10, 100);
}

const STATUS_SCORES: Record<SkillMatchStatus, number> = {
  PROVEN: 100,
  TRANSFERABLE: 76,
  PARTIAL: 56,
  DEVELOPMENT_GAP: 36,
  NOT_DEMONSTRATED: 25,
  CRITICAL_BLOCKER: 0,
  UNKNOWN: 50,
  NOT_RELEVANT: 70
};

const CRITICALITY_WEIGHTS: Record<RequirementCriticality, number> = {
  HARD_GATE: 4.5,
  DAY_ONE_ESSENTIAL: 3.4,
  CORE_DEVELOPABLE: 2.6,
  SUPPORTING: 1.6,
  PREFERRED: 1,
  CONTEXT: 0.7,
  UNCLEAR: 1
};

function dominantStatus(items: CapabilitySkillAssessment[]): SkillMatchStatus {
  if (items.some((item) => item.status === "CRITICAL_BLOCKER")) return "CRITICAL_BLOCKER";
  if (!items.length) return "UNKNOWN";
  const active = items.filter((item) => item.status !== "NOT_RELEVANT");
  if (!active.length) return "NOT_RELEVANT";
  const counts = new Map<SkillMatchStatus, number>();
  active.forEach((item) => counts.set(item.status, (counts.get(item.status) || 0) + item.requirement.centrality));
  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] || "UNKNOWN";
}

export function aggregateCompetencyFamilies(
  items: CapabilitySkillAssessment[],
  scopeScore: number,
  scopeConfidence: number,
  scopeSummary: string
): CompetencyFamilyAssessment[] {
  const results: CompetencyFamilyAssessment[] = COMPETENCY_FAMILY_ORDER.filter((family) => family !== "SCOPE").map((family) => {
    const requirements = items.filter((item) => item.requirement.family === family);
    // Context-only alternatives (for example, “strategy, consulting, finance, analytics, or operations”)
    // remain visible in the Match Ledger but do not act like separate day-one gaps.
    const scoredRequirements = requirements.filter((item) => item.requirement.criticality !== "CONTEXT");
    let total = 0;
    let weight = 0;
    scoredRequirements.forEach((item) => {
      const itemWeight = CRITICALITY_WEIGHTS[item.requirement.criticality] * Math.max(1, item.requirement.centrality / 2);
      total += STATUS_SCORES[item.status] * itemWeight;
      weight += itemWeight;
    });
    const score = scoredRequirements.length ? Math.round(total / Math.max(1, weight)) : 50;
    const provenCount = scoredRequirements.filter((item) => item.status === "PROVEN").length;
    const transferableCount = scoredRequirements.filter((item) => item.status === "TRANSFERABLE").length;
    const blockerCount = scoredRequirements.filter((item) => item.status === "CRITICAL_BLOCKER").length;
    const gapCount = scoredRequirements.filter((item) => ["PARTIAL", "DEVELOPMENT_GAP", "NOT_DEMONSTRATED"].includes(item.status)).length;
    const evidenced = scoredRequirements.filter((item) => item.matchedProfileSkill && item.evidence.length).length;
    const coverage = scoredRequirements.length ? Math.round((evidenced / scoredRequirements.length) * 100) : 0;
    const confidence = scoredRequirements.length ? Math.round(average(scoredRequirements.map((item) => item.matchConfidence), 45)) : 35;
    const summary = !requirements.length
      ? "No material requirement detected in this family."
      : !scoredRequirements.length
        ? "Only contextual or alternative-pathway experience was detected."
        : blockerCount
          ? `${blockerCount} hard blocker${blockerCount === 1 ? "" : "s"} requires review.`
          : `${provenCount} proven · ${transferableCount} transferable · ${gapCount} gap${gapCount === 1 ? "" : "s"}.`;
    return {
      family,
      label: COMPETENCY_FAMILY_LABELS[family],
      score,
      confidence,
      coverage,
      dominantStatus: dominantStatus(scoredRequirements),
      provenCount,
      transferableCount,
      gapCount,
      blockerCount,
      requirements,
      summary
    } satisfies CompetencyFamilyAssessment;
  });

  results.splice(COMPETENCY_FAMILY_ORDER.indexOf("SCOPE"), 0, {
    family: "SCOPE",
    label: COMPETENCY_FAMILY_LABELS.SCOPE,
    score: scopeScore,
    confidence: scopeConfidence,
    coverage: scopeConfidence,
    dominantStatus: scopeScore >= 76 ? "PROVEN" : scopeScore >= 58 ? "TRANSFERABLE" : scopeScore >= 42 ? "PARTIAL" : "NOT_DEMONSTRATED",
    provenCount: scopeScore >= 76 ? 1 : 0,
    transferableCount: scopeScore >= 58 && scopeScore < 76 ? 1 : 0,
    gapCount: scopeScore < 58 ? 1 : 0,
    blockerCount: 0,
    requirements: [],
    summary: scopeSummary
  });

  return results;
}

function normalizedJobSource(job: JobReq): string {
  return normalizeText([job.title, job.category, job.team, ...job.responsibilities, ...job.qualifications, job.descriptionText].join("\n"));
}

export function technicalModeForJob(job: JobReq, requirements: JobRequirement[]): { mode: TechnicalMode; score: number; reason: string } {
  const source = normalizedJobSource(job);
  const handsOn = phraseCount(source, [
    "write code", "coding", "software development", "software engineering", "production systems", "system design",
    "technical architecture", "architect distributed", "build machine learning", "train models", "data pipeline",
    "api development", "debug", "deploy", "hands-on engineering", "cloud infrastructure"
  ]);
  const fluency = phraseCount(source, [
    "technical fluency", "technical depth", "partner with engineering", "translate business requirements",
    "technical stakeholders", "technology roadmap", "ai strategy", "data strategy", "product and engineering"
  ]);
  const environment = phraseCount(source, [
    "ai adoption", "digital transformation", "technology transformation", "emerging technology", "technical teams",
    "engineering leaders", "data teams", "ai enablement"
  ]);
  const technicalRequirements = requirements.filter((item) => item.family === "TECHNICAL");
  const mustTechnical = technicalRequirements.filter((item) => item.criticality === "DAY_ONE_ESSENTIAL" || item.criticality === "HARD_GATE").length;
  const titleHandsOn = /\b(engineer|architect|developer|data scientist|machine learning scientist|security engineer)\b/.test(normalizeText(job.title));

  if (titleHandsOn || handsOn >= 3 || mustTechnical >= 3 && handsOn >= 1) {
    return { mode: "HANDS_ON_EXECUTION", score: clamp(68 + handsOn * 7 + mustTechnical * 5), reason: "Hands-on technical execution appears central to day-one success." };
  }
  if (fluency >= 2 || mustTechnical >= 1) {
    return { mode: "TECHNICAL_FLUENCY", score: clamp(42 + fluency * 8 + mustTechnical * 6), reason: "The role requires technical judgment and fluency, but not clearly hands-on implementation." };
  }
  if (environment >= 1 || technicalRequirements.length) {
    return { mode: "TECHNICAL_ENVIRONMENT", score: clamp(20 + environment * 7 + technicalRequirements.length * 4), reason: "Technology is primarily the operating context or partner environment." };
  }
  return { mode: "NON_TECHNICAL", score: 10, reason: "No central hands-on technical demand is evident in the posting." };
}

const WORKPRINT_DEFINITIONS: Array<{ id: string; label: string; patterns: string[] }> = [
  { id: "strategy", label: "Strategy & framing", patterns: ["strategy", "strategic", "priorit", "decision", "annual planning", "long-term"] },
  { id: "transformation", label: "Transformation & building", patterns: ["transform", "operating model", "build", "create", "redesign", "change management"] },
  { id: "influence", label: "Influence & alignment", patterns: ["stakeholder", "executive", "influence", "cross-functional", "alignment", "communicate"] },
  { id: "operations", label: "Operations & cadence", patterns: ["monitor", "kpi", "cadence", "quarterly", "governance", "execution", "process"] },
  { id: "analytics", label: "Analytics & modeling", patterns: ["analysis", "analytical", "data-driven", "model", "metrics", "financial"] },
  { id: "people", label: "People leadership", patterns: ["manage a team", "direct reports", "coach", "develop talent", "performance management", "people leader"] },
  { id: "product-customer", label: "Product & customer", patterns: ["product", "customer", "user", "adoption", "retention", "market"] },
  { id: "technical", label: "Technical execution", patterns: ["software", "engineering", "architecture", "code", "machine learning", "data pipeline", "cloud"] }
];

function cleanResponsibility(value: string): string {
  return value.replace(/^[•\-*\s]+/, "").replace(/\s+/g, " ").trim();
}

function responsibilityOutcomes(job: JobReq): JobSuccessOutcome[] {
  const responsibilities = job.responsibilities.map(cleanResponsibility).filter((item) => item.length >= 18);
  const outcomePriority = responsibilities.filter((item) => /\b(lead|drive|deliver|improve|accelerate|enable|ensure|shape|create|build|increase|reduce|achieve)\b/i.test(item));
  const selected = uniqueStrings([...outcomePriority, ...responsibilities]).slice(0, 5);
  return selected.map((statement) => ({ id: makeId("outcome"), statement, source: statement, inferenceLevel: "STATED" }));
}

function recurringResponsibilities(job: JobReq): JobSuccessOutcome[] {
  return uniqueStrings(job.responsibilities.map(cleanResponsibility).filter((item) => item.length >= 18)).slice(0, 7).map((statement) => ({
    id: makeId("responsibility"), statement, source: statement, inferenceLevel: "STATED"
  }));
}

function contextSignal(
  id: string,
  label: string,
  value: string,
  source: string,
  patterns: string[],
  fallback: string
): JobContextSignal {
  const evidence = evidenceForPhrases(source, patterns, 2);
  return {
    id,
    label,
    value: evidence.length ? value : fallback,
    evidence,
    inferenceLevel: evidence.length ? "STRONGLY_IMPLIED" : "UNKNOWN"
  };
}

export function buildJobSuccessProfile(job: JobReq, requirements: JobRequirement[]): JobSuccessProfile {
  const source = [job.title, ...job.responsibilities, ...job.qualifications, job.descriptionText].join("\n");
  const normalized = normalizeText(source);
  const technical = technicalModeForJob(job, requirements);
  const rawWorkprint = WORKPRINT_DEFINITIONS.map((definition) => {
    const hits = phraseCount(normalized, definition.patterns);
    const evidence = evidenceForPhrases(source, definition.patterns, 3);
    return { id: definition.id, label: definition.label, raw: hits, evidence };
  });
  const rawTotal = rawWorkprint.reduce((sum, item) => sum + item.raw, 0);
  const workprint: WorkprintItem[] = rawWorkprint.map((item) => ({
    id: item.id,
    label: item.label,
    score: rawTotal ? Math.round((item.raw / rawTotal) * 100) : 0,
    evidence: item.evidence
  })).filter((item) => item.score > 0).sort((left, right) => right.score - left.score);

  const contexts = [
    contextSignal("executive", "Executive exposure", "High", source, ["senior leadership", "executive leadership", "senior executives", "c-suite"], "Not clearly stated"),
    contextSignal("cross-functional", "Cross-functional intensity", "High", source, ["cross-functional", "cross functional", "across teams", "stakeholders throughout"], "Not clearly stated"),
    contextSignal("people", "Direct people leadership", "Likely required", source, ["direct reports", "manage a team", "people manager", "manager of managers"], "Unknown"),
    contextSignal("authority", "Decision authority", "Meaningful ownership implied", source, ["own", "decision rights", "accountable for", "responsible for", "lead the development"], "Unknown"),
    contextSignal("ambiguity", "Ambiguity", "High", source, ["ambiguity", "shape", "define", "build from scratch", "new strategic"], "Not clearly stated"),
    contextSignal("customer", "Customer proximity", "Visible customer impact", source, ["customer", "client", "user", "member"], "Not clearly stated")
  ];

  const unknowns = uniqueStrings([
    contexts.find((item) => item.id === "people")?.inferenceLevel === "UNKNOWN" ? "Direct reports and team size are not stated" : "",
    contexts.find((item) => item.id === "authority")?.inferenceLevel === "UNKNOWN" ? "Decision authority is unclear" : "",
    "The actual percentage of strategic work versus recurring operations is not stated",
    !/\btravel\b/i.test(source) ? "Travel expectations are not stated" : ""
  ]).filter(Boolean);

  return {
    outcomes: responsibilityOutcomes(job),
    recurringResponsibilities: recurringResponsibilities(job),
    contexts,
    workprint,
    technicalMode: technical.mode,
    technicalModeReason: technical.reason,
    unknowns
  };
}

export function scopeReadinessFor(
  job: JobReq,
  profile: UserProfile,
  capabilityItems: CapabilitySkillAssessment[]
): { score: number; confidence: number; summary: string } {
  const roleSource = normalizeText(`${job.title} ${job.seniority} ${job.qualifications.join(" ")} ${job.responsibilities.join(" ")}`);
  const profileSource = normalizeText(`${profile.resumeText} ${profile.skills.map((item) => item.name).join(" ")}`);
  const targetSenior = /\b(principal|director|head|vice president|vp|senior manager|manager of managers)\b/.test(roleSource) || (job.minYears || 0) >= 8;
  const profileSenior = /\b(principal|director|head|vice president|vp|senior manager|lead)\b/.test(profileSource);
  const needsPeople = /\b(direct reports|manage a team|people manager|manager of managers)\b/.test(roleSource);
  const hasPeople = capabilityItems.some((item) => item.requirement.name === "People leadership" && ["PROVEN", "TRANSFERABLE", "PARTIAL"].includes(item.status)) || /\b(managed|led a team|direct reports|people manager)\b/.test(profileSource);
  const needsExecutive = /\b(executive|senior leadership|c-suite)\b/.test(roleSource);
  const hasExecutive = capabilityItems.some((item) => ["Executive communication", "Influencing", "Cross-functional leadership"].includes(item.requirement.name) && ["PROVEN", "TRANSFERABLE", "PARTIAL"].includes(item.status));
  const needsEnterprise = /\b(enterprise|company-wide|organization-wide|global|across the organization)\b/.test(roleSource);
  const hasEnterprise = /\b(enterprise|company-wide|organization-wide|global|across .* teams|cross-functional)\b/.test(profileSource);

  let score = 55;
  if (!targetSenior || profileSenior) score += 16;
  else score -= 18;
  if (!needsPeople || hasPeople) score += 10;
  else score -= 14;
  if (!needsExecutive || hasExecutive) score += 10;
  else score -= 8;
  if (!needsEnterprise || hasEnterprise) score += 9;
  else score -= 7;
  if ((job.minYears || 0) && profile.resumeText) score += 4;
  const confidenceSignals = [Boolean(profile.resumeText), targetSenior, needsPeople || needsExecutive || needsEnterprise, profile.skills.some((item) => item.confirmed)].filter(Boolean).length;
  const confidence = clamp(28 + confidenceSignals * 16);
  const summaryParts = [
    targetSenior ? (profileSenior ? "seniority evidence is comparable" : "seniority evidence needs validation") : "seniority demand appears moderate",
    needsPeople ? (hasPeople ? "people-leadership evidence exists" : "direct-management evidence is limited") : "direct reports are not a clear gate",
    needsExecutive ? (hasExecutive ? "executive exposure is supported" : "executive-level scope needs evidence") : "executive exposure is not central"
  ];
  return { score: clamp(score), confidence, summary: summaryParts.join("; ") + "." };
}

function evidenceConfidenceScore(items: CapabilitySkillAssessment[], profile: UserProfile, successProfile: JobSuccessProfile): number {
  if (!items.length) return profile.resumeText ? 48 : 20;
  const itemConfidence = average(items.map((item) => item.matchConfidence), 35);
  const evidenced = items.filter((item) => item.matchedProfileSkill && item.evidence.length).length / items.length;
  const activeSkills = profile.skills.filter((item) => !item.excluded);
  const profileReviewed = activeSkills.length ? activeSkills.filter((item) => item.confirmed).length / activeSkills.length : 0;
  const roleClarity = successProfile.outcomes.length >= 3 ? 1 : successProfile.outcomes.length ? 0.6 : 0.3;
  return clamp(Math.round(itemConfidence * 0.52 + evidenced * 100 * 0.24 + profileReviewed * 100 * 0.14 + roleClarity * 100 * 0.10));
}

export function fitSignatureFor(input: {
  job: JobReq;
  profile: UserProfile;
  capabilityItems: CapabilitySkillAssessment[];
  families: CompetencyFamilyAssessment[];
  successProfile: JobSuccessProfile;
  readinessScore: number;
  interestScore: number;
  directionScore: number;
  viabilityScore: number;
  ageDays: number | null;
  criticalBlockers: string[];
}): FitSignature {
  const { job, profile, capabilityItems, families, successProfile, readinessScore, interestScore, directionScore, viabilityScore, ageDays, criticalBlockers } = input;
  const evidenceConfidence = evidenceConfidenceScore(capabilityItems, profile, successProfile);
  const technicalFamily = families.find((item) => item.family === "TECHNICAL");
  const scopeFamily = families.find((item) => item.family === "SCOPE");
  const unknownRatio = capabilityItems.length ? capabilityItems.filter((item) => item.status === "UNKNOWN").length / capabilityItems.length : 1;
  let scopeStatus: ScopeStatus = "CREDIBLE_STRETCH";
  let scopeReason = "The role is plausible, with some evidence or scope gaps to validate.";

  if ((!profile.resumeText && profile.skills.length < 3) || evidenceConfidence < 30 || unknownRatio > 0.6) {
    scopeStatus = "INSUFFICIENT_EVIDENCE";
    scopeReason = "The current profile does not contain enough reviewed evidence to make a reliable scope decision.";
  } else if (criticalBlockers.length) {
    scopeStatus = "OUT_OF_SCOPE";
    scopeReason = `A hard gate is not demonstrated: ${criticalBlockers[0]}.`;
  } else if (successProfile.technicalMode === "HANDS_ON_EXECUTION" && (technicalFamily?.score || 50) < 48) {
    scopeStatus = "OUT_OF_SCOPE";
    scopeReason = "Hands-on technical execution is central and the current profile does not show comparable evidence.";
  } else if ((scopeFamily?.score || 50) < 38 || readinessScore < 38) {
    scopeStatus = "OUT_OF_SCOPE";
    scopeReason = "The day-one scope or capability demand is materially above the current evidence.";
  } else if (readinessScore >= 72 && (scopeFamily?.score || 50) >= 62 && (technicalFamily?.score || 50) >= 45) {
    scopeStatus = "IN_SCOPE_NOW";
    scopeReason = "The profile contains credible day-one evidence across the role's central demands.";
  }

  const stale = ageDays !== null && ageDays > 90 && !job.ageOverride && !job.verifiedActiveAt;
  let decisionAction: DecisionAction = "HOLD";
  let decisionReason = "Keep the role visible while stronger evidence or interest signals emerge.";
  if (stale) {
    decisionAction = "VERIFY_ACTIVE";
    decisionReason = "The posting is more than 90 days old and should be confirmed active first.";
  } else if (scopeStatus === "OUT_OF_SCOPE") {
    decisionAction = "DO_NOT_PURSUE";
    decisionReason = scopeReason;
  } else if (scopeStatus === "INSUFFICIENT_EVIDENCE") {
    decisionAction = "EXPLORE";
    decisionReason = "Improve the evidence profile or validate the most important requirements before deciding.";
  } else if (scopeStatus === "IN_SCOPE_NOW" && readinessScore >= 72 && interestScore >= 68 && directionScore >= 58 && viabilityScore >= 45) {
    decisionAction = "PURSUE";
    decisionReason = "Strong readiness and attraction with no current hard gate.";
  } else if (interestScore >= 70 && scopeStatus === "CREDIBLE_STRETCH") {
    decisionAction = "EXPLORE";
    decisionReason = "The work is attractive and the gaps appear suitable for networking or targeted validation.";
  } else if (interestScore < 42 && evidenceConfidence >= 50) {
    decisionAction = "DO_NOT_PURSUE";
    decisionReason = "The recurring work appears insufficiently attractive despite adequate assessment confidence.";
  } else if (readinessScore >= 62 || interestScore >= 62 || directionScore >= 72) {
    decisionAction = "EXPLORE";
    decisionReason = "The role has enough upside to justify targeted discovery before committing.";
  }

  const variants = [
    readinessScore * 0.55 + interestScore * 0.20 + directionScore * 0.10 + viabilityScore * 0.15,
    readinessScore * 0.25 + interestScore * 0.50 + directionScore * 0.15 + viabilityScore * 0.10,
    readinessScore * 0.25 + interestScore * 0.20 + directionScore * 0.40 + viabilityScore * 0.15,
    readinessScore * 0.30 + interestScore * 0.25 + directionScore * 0.15 + viabilityScore * 0.30
  ];
  const spread = Math.max(...variants) - Math.min(...variants);
  const rankingRobustness: RankingRobustness = spread <= 8 ? "ROBUST" : spread <= 17 ? "MODERATE" : "SENSITIVE";
  const dimensions = [
    { label: "readiness", value: readinessScore },
    { label: "interest", value: interestScore },
    { label: "career direction", value: directionScore },
    { label: "viability", value: viabilityScore }
  ].sort((left, right) => right.value - left.value);
  const rankingSensitivity = rankingRobustness === "ROBUST"
    ? "The assessment remains stable across reasonable priority changes."
    : `The result is most sensitive to how much weight you place on ${dimensions[0].label} versus ${dimensions[dimensions.length - 1].label}.`;

  return {
    scopeStatus,
    scopeReason,
    readinessScore,
    attractionScore: interestScore,
    directionScore,
    viabilityScore,
    evidenceConfidence,
    decisionAction,
    decisionReason,
    rankingRobustness,
    rankingSensitivity
  };
}

export function familyScore(assessment: JobAssessment, family: CompetencyFamily): CompetencyFamilyAssessment | undefined {
  return assessment.competencyFamilies.find((item) => item.family === family);
}
