import {
  DIMENSION_LABELS,
  ROLE_GROUPS,
  SKILL_TAXONOMY,
  THEME_DEFINITIONS,
  WORK_DIMENSIONS
} from "../data/ontology";
import type {
  CapabilitySkillAssessment,
  Confidence,
  FocusBucket,
  InterestDimension,
  InterestSignalAssessment,
  JobAssessment,
  JobComparison,
  JobFingerprint,
  JobReq,
  JobRequirement,
  NetworkingStage,
  ProfileSkill,
  Recommendation,
  RoleGroupSummary,
  SkillMatchStatus,
  UserProfile,
  WorkSignal
} from "../types";
import { synthesizeDiscovery, discoveryConfidenceLabel, generateRoleScenarios } from "./discovery";
import {
  aggregateCompetencyFamilies,
  behaviorFromEvidence,
  buildJobSuccessProfile,
  centralityForRequirement,
  competencyFamilyForCategory,
  expectedProficiency,
  fitSignatureFor,
  learnabilityForRequirement,
  matchConfidenceFor,
  profileEvidenceStrength,
  requirementCriticality,
  scopeReadinessFor,
  targetStrength,
  technicalModeForJob
} from "./fitNavigator";
import { generalThemeInterestForJob } from "./themes";
import {
  average,
  clamp,
  containsPhrase,
  evidenceForPhrases,
  jaccardPercent,
  makeId,
  normalizeText,
  phraseCount,
  tokenSet,
  topCounts,
  uniqueStrings
} from "./text";

function confidenceFromCount(count: number): Confidence {
  if (count >= 3) return "HIGH";
  if (count >= 1) return "MEDIUM";
  return "LOW";
}

function requirementImportance(evidence: string): JobRequirement["importance"] {
  const normalized = normalizeText(evidence);
  if (/\b(preferred|nice to have|bonus|ideally|a plus)\b/.test(normalized)) return "PREFERRED";
  if (/\b(required|must|minimum|need|at least|years of experience|qualification)\b/.test(normalized)) return "MUST";
  return "GENERAL";
}

function criticalCredential(name: string, evidence: string): boolean {
  const definition = SKILL_TAXONOMY.find((item) => item.name === name);
  if (definition?.category !== "CREDENTIAL") return false;
  return !/\b(preferred|nice to have|bonus|a plus)\b/i.test(evidence);
}

function safeOverviewText(job: JobReq): string {
  const beforeResponsibilities = job.descriptionText.split(/\n\s*Responsibilities\b/i)[0] || "";
  const overview = beforeResponsibilities.split(/\n\s*Job Overview\b/i)[1] || beforeResponsibilities;
  return overview
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^(internal career site|search|apply now|give feedback|manage settings|accept)$/i.test(line))
    .filter((line) => !/(we use cookies|tracking technologies|third parties|manage your preferences|consent to the use of cookies)/i.test(line))
    .join("\n")
    .slice(0, 6500);
}

function jobAnalysisSource(job: JobReq): string {
  const structured = [
    job.title,
    job.category,
    job.team,
    ...job.responsibilities,
    ...job.qualifications
  ].filter(Boolean).join("\n");
  const overview = safeOverviewText(job);
  return `${structured}\n${overview}`.trim();
}

export function extractJobRequirements(job: JobReq): JobRequirement[] {
  const source = jobAnalysisSource(job);
  const requirements = SKILL_TAXONOMY.flatMap((definition) => {
    const count = phraseCount(source, definition.aliases);
    if (!count) return [];
    const responsibilityEvidence = evidenceForPhrases(job.responsibilities.join("\n"), definition.aliases, 1)[0];
    const qualificationEvidence = evidenceForPhrases(job.qualifications.join("\n"), definition.aliases, 1)[0];
    const titleEvidence = evidenceForPhrases(`${job.title}\n${job.category}`, definition.aliases, 1)[0];
    const overviewEvidence = evidenceForPhrases(safeOverviewText(job), definition.aliases, 1)[0];
    const evidence = definition.category === "CREDENTIAL"
      ? qualificationEvidence || responsibilityEvidence || titleEvidence || overviewEvidence || `Detected from the job posting: ${definition.name}`
      : responsibilityEvidence || qualificationEvidence || titleEvidence || overviewEvidence || `Detected from the job posting: ${definition.name}`;
    const alternativePathway = /\b(?:or|and\/or)\b/i.test(evidence) && (evidence.match(/,/g) || []).length >= 1;
    const importance = alternativePathway ? "GENERAL" : requirementImportance(evidence);
    const critical = criticalCredential(definition.name, evidence);
    const centrality = centralityForRequirement(job, definition.aliases, evidence, count);
    const family = competencyFamilyForCategory(definition.category);
    const expected = expectedProficiency(evidence, job.minYears);
    const criticality = alternativePathway && !critical
      ? "CONTEXT"
      : requirementCriticality(definition.category, importance, critical, evidence, centrality);
    return [{
      id: `${normalizeText(definition.name)}-${makeId("req")}`,
      name: definition.name,
      category: definition.category,
      family,
      importance,
      criticality,
      critical,
      centrality,
      expectedProficiency: expected,
      learnability: learnabilityForRequirement(family, criticality, expected),
      behavior: behaviorFromEvidence(definition.name, evidence),
      evidence,
      inferenceLevel: "STATED"
    } satisfies JobRequirement];
  });

  const explicitCritical: Array<{ name: string; category: JobRequirement["category"]; patterns: string[] }> = [
    { name: "Licensed attorney", category: "CREDENTIAL", patterns: ["bar admission", "bar membership", "licensed attorney", "juris doctor", "j.d."] },
    { name: "CPA certification", category: "CREDENTIAL", patterns: ["active cpa", "cpa certification", "certified public accountant"] },
    { name: "Medical license", category: "CREDENTIAL", patterns: ["medical license", "licensed physician", "registered nurse", "rn license"] },
    { name: "Security clearance", category: "CREDENTIAL", patterns: ["security clearance", "top secret", "secret clearance"] }
  ];
  explicitCritical.forEach((item) => {
    if (!item.patterns.some((pattern) => containsPhrase(source, pattern))) return;
    if (requirements.some((requirement) => normalizeText(requirement.name) === normalizeText(item.name))) return;
    const evidence = evidenceForPhrases(source, item.patterns, 1)[0] || `Mandatory credential detected: ${item.name}`;
    requirements.push({
      id: `${normalizeText(item.name)}-${makeId("req")}`,
      name: item.name,
      category: item.category,
      family: "CREDENTIAL",
      importance: "MUST",
      criticality: "HARD_GATE",
      critical: true,
      centrality: 5,
      expectedProficiency: "EXPERT",
      learnability: "LOW",
      behavior: behaviorFromEvidence(item.name, evidence),
      evidence,
      inferenceLevel: "STATED"
    });
  });

  return requirements
    .sort((left, right) => {
      const importance = { MUST: 0, GENERAL: 1, PREFERRED: 2 };
      if (left.critical !== right.critical) return left.critical ? -1 : 1;
      if (importance[left.importance] !== importance[right.importance]) return importance[left.importance] - importance[right.importance];
      return left.name.localeCompare(right.name);
    })
    .slice(0, 36);
}

function extractThemes(job: JobReq): string[] {
  const source = jobAnalysisSource(job);
  return THEME_DEFINITIONS
    .map((theme) => ({ label: theme.label, count: phraseCount(source, theme.patterns) }))
    .filter((item) => item.count > 0)
    .sort((left, right) => right.count - left.count)
    .slice(0, 9)
    .map((item) => item.label);
}

function workSignals(job: JobReq): WorkSignal[] {
  const source = jobAnalysisSource(job);
  return WORK_DIMENSIONS.map((definition) => {
    const bodyCount = phraseCount(source, definition.patterns);
    const titleCount = phraseCount(job.title, definition.patterns);
    const evidence = evidenceForPhrases(source, definition.patterns, 3);
    const score = clamp((bodyCount ? 18 : 0) + Math.min(62, bodyCount * 16) + Math.min(20, titleCount * 20));
    return {
      dimension: definition.id,
      score,
      confidence: confidenceFromCount(evidence.length),
      evidence
    };
  });
}

function roleGroupMatches(job: JobReq, themes: string[]): JobFingerprint["groups"] {
  const title = normalizeText(job.title);
  const source = normalizeText(jobAnalysisSource(job));
  const matches = ROLE_GROUPS.filter((group) => group.id !== "other").map((group) => {
    const titleScore = group.titlePatterns.reduce((sum, pattern) => sum + (title.includes(normalizeText(pattern)) ? 32 : 0), 0);
    const bodyScore = group.bodyPatterns.reduce((sum, pattern) => sum + (source.includes(normalizeText(pattern)) ? 12 : 0), 0);
    const themeScore = group.themeIds.reduce((sum, id) => {
      const theme = THEME_DEFINITIONS.find((item) => item.id === id)?.label;
      return sum + (theme && themes.includes(theme) ? 8 : 0);
    }, 0);
    return { id: group.id, label: group.label, score: Math.min(100, titleScore + bodyScore + themeScore) };
  }).sort((left, right) => right.score - left.score);

  const useful = matches.filter((item) => item.score >= 16).slice(0, 4);
  if (!useful.length) {
    const other = ROLE_GROUPS.find((group) => group.id === "other")!;
    return [{ id: other.id, label: other.label, score: 35 }];
  }
  return useful;
}

function inferArchetype(job: JobReq, primaryGroupLabel: string, signals: WorkSignal[]): string {
  const strongest = [...signals].sort((left, right) => right.score - left.score).slice(0, 3);
  const labels = strongest.filter((item) => item.score >= 30).map((item) => DIMENSION_LABELS[item.dimension]);
  if (!labels.length) return primaryGroupLabel;
  if (labels.includes("People leadership")) return `${primaryGroupLabel} — People Leader`;
  if (labels.includes("Strategy") && labels.includes("Transformation")) return `${primaryGroupLabel} — Strategy & Transformation`;
  if (labels.includes("Analytical intensity")) return `${primaryGroupLabel} — Analytical Leader`;
  return `${primaryGroupLabel} — ${labels[0]}`;
}

function inferLeadershipModel(signals: WorkSignal[], job: JobReq): string {
  const people = signals.find((item) => item.dimension === "PEOPLE_LEADERSHIP")?.score || 0;
  const influence = signals.find((item) => item.dimension === "EXECUTIVE_INFLUENCE")?.score || 0;
  const ic = signals.find((item) => item.dimension === "INDIVIDUAL_CONTRIBUTOR")?.score || 0;
  if (people >= 55) return "Direct people leadership";
  if (influence >= 45 && (ic >= 25 || /\bprincipal\b/i.test(job.title))) return "Enterprise influence / principal IC";
  if (influence >= 35) return "Cross-functional influence";
  return "Leadership model unclear";
}

export function buildFingerprint(job: JobReq): JobFingerprint {
  const themes = extractThemes(job);
  const signals = workSignals(job);
  let groups = roleGroupMatches(job, themes);
  if (job.groupOverride) {
    const override = ROLE_GROUPS.find((group) => group.id === job.groupOverride);
    if (override) groups = [{ id: override.id, label: override.label, score: 100 }, ...groups.filter((group) => group.id !== override.id)];
  }
  const primary = groups[0];
  return {
    primaryGroupId: primary.id,
    primaryGroupLabel: primary.label,
    groups,
    archetype: inferArchetype(job, primary.label, signals),
    themes,
    leadershipModel: inferLeadershipModel(signals, job),
    requirements: extractJobRequirements(job),
    workSignals: signals
  };
}

function skillDefinition(name: string) {
  return SKILL_TAXONOMY.find((definition) => normalizeText(definition.name) === normalizeText(name));
}

function activeProfileSkills(profile: UserProfile): ProfileSkill[] {
  return profile.skills.filter((skill) => !skill.excluded);
}

function exactProfileSkill(requirement: JobRequirement, profile: UserProfile): ProfileSkill | null {
  return activeProfileSkills(profile).find((skill) => skill.normalizedName === normalizeText(requirement.name)) || null;
}

const SKILL_TOKEN_GROUPS: string[][] = [
  ["analysis", "analytical", "analytics", "insight", "model", "modeling", "modelling"],
  ["strategy", "strategic", "planning", "prioritization", "prioritisation"],
  ["operation", "operations", "operational", "operating", "bizops"],
  ["transform", "transformation", "change", "redesign"],
  ["lead", "leader", "leadership", "manage", "management"],
  ["influence", "influencing", "stakeholder", "alignment"],
  ["communicate", "communication", "presentation", "storytelling", "narrative"],
  ["customer", "client", "user", "member"],
  ["product", "roadmap", "discovery"],
  ["finance", "financial", "budget", "forecast", "p&l"],
  ["program", "project", "portfolio", "governance"],
  ["artificial", "ai", "machine", "ml", "technology", "technical"],
  ["software", "engineering", "developer", "coding", "architecture"],
  ["coach", "coaching", "mentor", "development", "talent"]
];

const SKILL_STOP_WORDS = new Set([
  "and", "or", "of", "the", "a", "an", "to", "for", "with", "in", "on", "at", "by", "from",
  "skill", "skills", "experience", "knowledge", "ability", "expertise"
]);

function canonicalSkillTokens(value: string): Set<string> {
  const raw = normalizeText(value).split(/\s+/).filter((token) => token.length > 1 && !SKILL_STOP_WORDS.has(token));
  return new Set(raw.map((token) => {
    const group = SKILL_TOKEN_GROUPS.find((items) => items.includes(token));
    if (group) return group[0];
    return token
      .replace(/(izations?|isations?)$/, "ize")
      .replace(/(ments?|ness|ities|ity)$/, "")
      .replace(/(ing|ed|es|s)$/, "");
  }).filter((token) => token.length > 1));
}

function definitionText(name: string): string {
  const definition = skillDefinition(name);
  return definition
    ? [definition.name, ...definition.aliases, ...definition.related].join(" ")
    : name;
}

function skillAffinity(requirement: JobRequirement, skill: ProfileSkill): number {
  const requirementName = normalizeText(requirement.name);
  const skillName = normalizeText(skill.name);
  if (requirementName === skillName) return 100;

  const requirementDefinition = skillDefinition(requirement.name);
  const candidateDefinition = skillDefinition(skill.name);
  const relatedNames = new Set([
    ...(requirementDefinition?.related || []),
    ...(candidateDefinition?.related || [])
  ].map(normalizeText));
  if (relatedNames.has(requirementName) || relatedNames.has(skillName)) return 88;

  const requirementText = definitionText(requirement.name);
  const candidateText = definitionText(skill.name);
  if (normalizeText(requirementText).includes(skillName) || normalizeText(candidateText).includes(requirementName)) return 82;

  const requirementTokens = canonicalSkillTokens(requirementText);
  const candidateTokens = canonicalSkillTokens(candidateText);
  const shared = [...requirementTokens].filter((token) => candidateTokens.has(token));
  const union = new Set([...requirementTokens, ...candidateTokens]);
  const overlap = union.size ? shared.length / union.size : 0;
  const sameCategory = candidateDefinition?.category === requirement.category || skill.category === requirement.category;

  if (shared.length >= 2 && overlap >= 0.22) return 72;
  if (shared.length >= 1 && overlap >= 0.34 && sameCategory) return 64;
  if (shared.length >= 1 && overlap >= 0.50) return 60;
  return 0;
}

function relatedProfileSkill(requirement: JobRequirement, profile: UserProfile): ProfileSkill | null {
  const candidates = activeProfileSkills(profile)
    .map((skill) => ({ skill, affinity: skillAffinity(requirement, skill) }))
    .filter((item) => item.affinity >= 60)
    .sort((left, right) => {
      if (right.affinity !== left.affinity) return right.affinity - left.affinity;
      return profileEvidenceStrength(right.skill) - profileEvidenceStrength(left.skill);
    });
  return candidates[0]?.skill || null;
}

function capabilityStatus(
  job: JobReq,
  requirement: JobRequirement,
  profile: UserProfile
): CapabilitySkillAssessment {
  const override = job.skillOverrides[requirement.name];
  const exact = exactProfileSkill(requirement, profile);
  const related = relatedProfileSkill(requirement, profile);
  const matched = exact || related;
  const strength = profileEvidenceStrength(matched);
  const target = targetStrength(requirement.expectedProficiency);

  let status: SkillMatchStatus;
  let reason: string;

  if (override) {
    status = override;
    reason = "Manually classified for this requisition.";
  } else if (exact) {
    if (!exact.evidence.length && !exact.confirmed) {
      status = "UNKNOWN";
      reason = "The competency is listed, but supporting experience evidence has not been reviewed.";
    } else if (strength >= target - 8) {
      status = "PROVEN";
      reason = `Direct evidence is comparable to the expected ${requirement.expectedProficiency.toLowerCase()} level.`;
    } else if (strength >= target - 28) {
      status = "PARTIAL";
      reason = "Direct evidence exists, but the depth, recency, or scope appears below the role's expectation.";
    } else {
      status = "NOT_DEMONSTRATED";
      reason = "The current profile mentions this competency but does not yet demonstrate it at the expected level.";
    }
  } else if (related) {
    status = strength >= 42 ? "TRANSFERABLE" : "PARTIAL";
    reason = status === "TRANSFERABLE"
      ? `Adjacent evidence found through ${related.name}; the transition path appears credible.`
      : `Related evidence exists through ${related.name}, but the transfer needs validation.`;
  } else if (!activeProfileSkills(profile).length) {
    status = "UNKNOWN";
    reason = "Upload and review a resume before treating this as a gap.";
  } else if (requirement.criticality === "HARD_GATE") {
    status = "CRITICAL_BLOCKER";
    reason = "A hard gate or mandatory credential was not demonstrated in the current profile.";
  } else if (requirement.criticality === "DAY_ONE_ESSENTIAL" && requirement.learnability === "LOW") {
    status = "CRITICAL_BLOCKER";
    reason = "This appears central on day one and is unlikely to be learned during normal onboarding.";
  } else if (requirement.criticality === "DAY_ONE_ESSENTIAL") {
    status = "NOT_DEMONSTRATED";
    reason = "No comparable evidence was found for a day-one requirement. This is not proof the capability is absent.";
  } else {
    status = "DEVELOPMENT_GAP";
    reason = "No direct evidence was found, but the requirement appears learnable or supporting rather than blocking.";
  }

  const evidence = matched?.evidence.map((item) => item.text) || [];
  return {
    requirement,
    status,
    matchedProfileSkill: matched,
    evidence,
    evidenceStrength: strength,
    matchConfidence: matchConfidenceFor(requirement, matched, status),
    scopeNote: `${requirement.expectedProficiency.toLowerCase()} expectation · ${requirement.centrality}/5 centrality · ${requirement.learnability.toLowerCase()} learnability`,
    reason
  };
}

function capabilityScore(items: CapabilitySkillAssessment[]): number {
  if (!items.length) return 50;
  const scoreByStatus: Record<SkillMatchStatus, number> = {
    PROVEN: 100,
    TRANSFERABLE: 76,
    PARTIAL: 55,
    DEVELOPMENT_GAP: 36,
    NOT_DEMONSTRATED: 25,
    CRITICAL_BLOCKER: 0,
    UNKNOWN: 50,
    NOT_RELEVANT: 70
  };
  const weightByImportance = { MUST: 3, GENERAL: 2, PREFERRED: 1 } as const;
  let total = 0;
  let weight = 0;
  items.forEach((item) => {
    if (item.status === "NOT_RELEVANT") return;
    const itemWeight = weightByImportance[item.requirement.importance] * (item.requirement.critical ? 1.4 : 1);
    total += scoreByStatus[item.status] * itemWeight;
    weight += itemWeight;
  });
  const result = weight ? Math.round(total / weight) : 50;
  return items.some((item) => item.status === "CRITICAL_BLOCKER") ? Math.min(35, result) : result;
}

function interestSignalAssessment(
  signal: WorkSignal,
  profile: UserProfile
): InterestSignalAssessment {
  const preference = profile.preferences[signal.dimension];
  const label = DIMENSION_LABELS[signal.dimension];
  if (!signal.evidence.length) {
    return {
      dimension: signal.dimension,
      label,
      preference,
      jobSignal: signal,
      alignmentScore: 50,
      tone: "UNKNOWN",
      explanation: `The posting does not make ${label.toLowerCase()} clear.`
    };
  }

  let alignmentScore = 50;
  if (preference.score > 0) alignmentScore = signal.score;
  else if (preference.score < 0) alignmentScore = 100 - signal.score;
  else alignmentScore = 60;
  alignmentScore = clamp(alignmentScore);
  const tone = alignmentScore >= 70 ? "POSITIVE" : alignmentScore <= 38 ? "NEGATIVE" : "NEUTRAL";
  const direction = preference.score > 0 ? "you want more of it" : preference.score < 0 ? "you prefer less of it" : "you are neutral";
  return {
    dimension: signal.dimension,
    label,
    preference,
    jobSignal: signal,
    alignmentScore,
    tone,
    explanation: `${label} appears ${signal.score >= 70 ? "strong" : signal.score >= 35 ? "moderate" : "limited"}; ${direction}.`
  };
}

function calculateInterest(items: InterestSignalAssessment[], adjustment: number): number {
  let total = 0;
  let weight = 0;
  items.forEach((item) => {
    const itemWeight = item.preference.importance;
    total += item.alignmentScore * itemWeight;
    weight += itemWeight;
  });
  return clamp(Math.round((weight ? total / weight : 50) + adjustment));
}

function directionAssessment(job: JobReq, profile: UserProfile, fingerprint: JobFingerprint): { score: number; matches: string[] } {
  if (!profile.careerDirections.length) return { score: 50, matches: [] };
  const source = normalizeText(`${fingerprint.primaryGroupLabel} ${fingerprint.themes.join(" ")} ${jobAnalysisSource(job)}`);
  let weighted = 0;
  let totalWeight = 0;
  const matches: string[] = [];
  profile.careerDirections.forEach((direction) => {
    const keywordMatches = direction.keywords.filter((keyword) => source.includes(normalizeText(keyword))).length;
    const labelMatch = source.includes(normalizeText(direction.label)) ? 2 : 0;
    const raw = clamp((keywordMatches + labelMatch) * 24);
    weighted += raw * direction.priority;
    totalWeight += direction.priority;
    if (raw >= 35) matches.push(direction.label);
  });
  return { score: totalWeight ? Math.round(weighted / totalWeight) : 50, matches };
}

export function parsePostedDate(value: string): Date | null {
  if (!value.trim()) return null;
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  const fallback = new Date(value.replace(/(st|nd|rd|th)/gi, "").trim());
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

export function jobAgeDays(value: string): number | null {
  const date = parsePostedDate(value);
  if (!date) return null;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
}

function viability(job: JobReq, blockers: string[], ageDays: number | null): { score: number; label: string } {
  if (blockers.length) return { score: 0, label: "Critical blocker" };
  if (ageDays === null) return { score: 55, label: "Age unknown" };
  if (ageDays <= 30) return { score: 100, label: `${ageDays}d · Fresh` };
  if (ageDays <= 60) return { score: 78, label: `${ageDays}d · Active` };
  if (ageDays <= 90) return { score: 52, label: `${ageDays}d · Aging` };
  if (job.ageOverride || job.verifiedActiveAt) return { score: 62, label: `${ageDays}d · Verified active` };
  return { score: 0, label: `${ageDays}d · Stale` };
}

export function networkingStageLabel(stage: NetworkingStage): string {
  const labels: Record<NetworkingStage, string> = {
    NOT_STARTED: "Not started",
    CONTACT_IDENTIFIED: "Contact identified",
    MESSAGE_PLANNED: "Message planned",
    CONTACTED: "Contacted",
    RESPONSE_RECEIVED: "Response received",
    CONVERSATION_SCHEDULED: "Conversation scheduled",
    CONVERSATION_COMPLETED: "Conversation completed",
    FOLLOW_UP: "Follow up",
    REFERRAL_REQUESTED: "Referral requested",
    REFERRAL_RECEIVED: "Referral received",
    NOT_NEEDED: "Not needed"
  };
  return labels[stage];
}

function actionReadiness(stage: NetworkingStage): number {
  const scores: Record<NetworkingStage, number> = {
    NOT_STARTED: 10,
    CONTACT_IDENTIFIED: 30,
    MESSAGE_PLANNED: 42,
    CONTACTED: 58,
    RESPONSE_RECEIVED: 70,
    CONVERSATION_SCHEDULED: 80,
    CONVERSATION_COMPLETED: 92,
    FOLLOW_UP: 78,
    REFERRAL_REQUESTED: 94,
    REFERRAL_RECEIVED: 100,
    NOT_NEEDED: 75
  };
  return scores[stage];
}

export function recommendationLabel(value: Recommendation): string {
  const labels: Record<Recommendation, string> = {
    PURSUE_NOW: "Pursue now",
    EXPLORE_NETWORKING: "Explore through networking",
    STRETCH: "Stretch opportunity",
    LOW_PRIORITY: "Low priority",
    DO_NOT_PURSUE: "Do not pursue"
  };
  return labels[value];
}

function recommendationFor(
  capability: number,
  interest: number,
  direction: number,
  viabilityScore: number,
  blockers: string[],
  unknowns: string[],
  stale: boolean
): Recommendation {
  if (blockers.length || stale || viabilityScore <= 10) return "DO_NOT_PURSUE";
  if (interest >= 75 && direction >= 60 && capability >= 72) return "PURSUE_NOW";
  if (interest >= 75 && direction >= 60 && capability >= 48) return "STRETCH";
  if (unknowns.length >= 2 && capability >= 55 && (interest >= 50 || direction >= 70)) return "EXPLORE_NETWORKING";
  if (capability >= 68 && interest >= 52 && direction >= 55) return "EXPLORE_NETWORKING";
  if (capability >= 50 || interest >= 55 || direction >= 60) return "LOW_PRIORITY";
  return "DO_NOT_PURSUE";
}

function assessmentConfidence(profile: UserProfile, fingerprint: JobFingerprint, unknowns: string[]): Confidence {
  const profileEvidence = profile.skills.filter((skill) => !skill.excluded && (skill.confirmed || skill.evidence.length)).length;
  const requirementEvidence = fingerprint.requirements.filter((requirement) => requirement.evidence).length;
  if (profileEvidence >= 8 && requirementEvidence >= 5 && unknowns.length <= 2) return "HIGH";
  if (profileEvidence >= 3 && requirementEvidence >= 2 && unknowns.length <= 6) return "MEDIUM";
  return "LOW";
}

export function suggestedNetworkingQuestions(assessment: JobAssessment): string[] {
  const questions: string[] = [];
  if (assessment.fingerprint.leadershipModel === "Leadership model unclear") questions.push("Does this role manage people directly, or lead primarily through influence?");
  const recurring = assessment.interestSignals.find((item) => item.dimension === "RECURRING_OPERATIONS");
  if (recurring?.tone === "NEGATIVE" || recurring?.tone === "UNKNOWN") questions.push("What percentage of the role is recurring cadence versus new strategic work?");
  const strategy = assessment.interestSignals.find((item) => item.dimension === "STRATEGY");
  if (strategy?.tone === "UNKNOWN") questions.push("Which decisions and strategic choices does this person own?");
  const people = assessment.interestSignals.find((item) => item.dimension === "PEOPLE_LEADERSHIP");
  if (people?.tone === "UNKNOWN") questions.push("What is the team structure and how much coaching or talent development is expected?");
  if (assessment.recommendation === "STRETCH") questions.push("Which experience gaps are truly required on day one, and which can be learned in role?");
  if (assessment.ageDays !== null && assessment.ageDays > 90) questions.push("Is the requisition still active, and where is the team in the process?");
  questions.push("What would success look like after 12 months?", "What makes strong candidates enjoy—or dislike—this role?");
  return uniqueStrings(questions).slice(0, 6);
}

function technicalRoleAssessment(job: JobReq, fingerprint: JobFingerprint): { score: number; reason: string } {
  const technical = technicalModeForJob(job, fingerprint.requirements);
  return { score: technical.score, reason: technical.reason };
}

export function focusBucketLabel(bucket: FocusBucket): string {
  const labels: Record<FocusBucket, string> = {
    READY_TO_PURSUE: "Ready to pursue",
    NEEDS_DISCOVERY: "Needs role discovery",
    NEEDS_NETWORKING: "Needs networking",
    HIGH_INTEREST_STRETCH: "High-interest stretch",
    CAPABLE_NOT_COMPELLING: "Capable but not compelling",
    TOO_TECHNICAL: "Too technical right now",
    NOT_INTERESTED: "Not interested enough",
    TOO_OLD: "Too old — verify active",
    CRITICAL_BLOCKER: "Critical blocker",
    INACTIVE: "Not pursuing / closed"
  };
  return labels[bucket];
}

export function focusBucketDescription(bucket: FocusBucket): string {
  const descriptions: Record<FocusBucket, string> = {
    READY_TO_PURSUE: "Strong capability and interest with no major practical blocker.",
    NEEDS_DISCOVERY: "The broad themes look promising, but role-specific responsibilities still need reflection.",
    NEEDS_NETWORKING: "An important unknown could materially change the decision.",
    HIGH_INTEREST_STRETCH: "The work is attractive, with capability gaps that may be manageable.",
    CAPABLE_NOT_COMPELLING: "Your experience matches, but the work may not provide enough energy or direction fit.",
    TOO_TECHNICAL: "The role appears to require technical execution beyond the current evidence or preferred work mix.",
    NOT_INTERESTED: "Interest is low enough that stronger alternatives deserve attention first.",
    TOO_OLD: "The posting is more than 90 days old and should be verified before investing more time.",
    CRITICAL_BLOCKER: "A mandatory credential or non-negotiable requirement is not currently supported.",
    INACTIVE: "You marked the opportunity as not pursuing or closed."
  };
  return descriptions[bucket];
}

function determineFocusBucket(
  job: JobReq,
  capability: number,
  interest: number,
  recommendation: Recommendation,
  blockers: string[],
  stale: boolean,
  technical: { score: number; reason: string },
  discovery: ReturnType<typeof synthesizeDiscovery>,
  generalThemeConfidence: number,
  unknowns: string[]
): { bucket: FocusBucket; reason: string } {
  if (job.focusBucketOverride !== "AUTO") return { bucket: job.focusBucketOverride, reason: "Manually assigned focus category." };
  if (job.status === "NOT_PURSUING" || job.status === "CLOSED" || job.manualPriority === "ARCHIVE") return { bucket: "INACTIVE", reason: "The opportunity is currently inactive in your workflow." };
  if (blockers.length) return { bucket: "CRITICAL_BLOCKER", reason: `Critical requirement: ${blockers[0]}.` };
  if (stale) return { bucket: "TOO_OLD", reason: "Published more than 90 days ago and not verified active." };
  if (technical.score >= 62 && capability < 62) return { bucket: "TOO_TECHNICAL", reason: technical.reason };
  const discoveryNeeded = discovery.answeredCount < Math.min(3, discovery.targetCount);
  if (interest <= 45 && (generalThemeConfidence >= 45 || discovery.confidence >= 45)) return { bucket: "NOT_INTERESTED", reason: "The work themes or role-specific responsibilities show limited attraction." };
  if (interest >= 74 && capability < 70) return { bucket: "HIGH_INTEREST_STRETCH", reason: "High interest with capability gaps that require validation." };
  if (capability >= 78 && interest < 62) return { bucket: "CAPABLE_NOT_COMPELLING", reason: "Strong capability evidence, but the role may not be energizing enough." };
  if (discoveryNeeded && interest >= 58) return { bucket: "NEEDS_DISCOVERY", reason: "The general theme baseline is promising; specific responsibility mix is not yet tested." };
  if (unknowns.length >= 2 && job.networkingStage === "NOT_STARTED") return { bucket: "NEEDS_NETWORKING", reason: `Resolve ${unknowns[0].toLowerCase()} before deciding.` };
  if (recommendation === "PURSUE_NOW") return { bucket: "READY_TO_PURSUE", reason: "Strong combined fit with no major blocker." };
  if (recommendation === "STRETCH") return { bucket: "HIGH_INTEREST_STRETCH", reason: "Attractive role with manageable developmental gaps." };
  if (recommendation === "EXPLORE_NETWORKING") return { bucket: "NEEDS_NETWORKING", reason: "A conversation could resolve the most important uncertainty." };
  if (recommendation === "DO_NOT_PURSUE") return { bucket: "NOT_INTERESTED", reason: "Current evidence does not justify prioritizing this opportunity." };
  return { bucket: "NEEDS_DISCOVERY", reason: "More role-specific evidence is needed to rank this opportunity confidently." };
}

export function assessJob(job: JobReq, profile: UserProfile): JobAssessment {
  const fingerprint = buildFingerprint(job);
  const successProfile = buildJobSuccessProfile(job, fingerprint.requirements);
  const capabilitySkills = fingerprint.requirements.map((requirement) => capabilityStatus(job, requirement, profile));
  const rawCapability = capabilityScore(capabilitySkills);
  const scopeReadiness = scopeReadinessFor(job, profile, capabilitySkills);
  const competencyFamilies = aggregateCompetencyFamilies(
    capabilitySkills,
    scopeReadiness.score,
    scopeReadiness.confidence,
    scopeReadiness.summary
  );

  const familyWithRequirements = (ids: Array<JobRequirement["family"]>, fallback: number) => {
    const selected = competencyFamilies.filter((family) => ids.includes(family.family) && family.requirements.length);
    return selected.length ? Math.round(average(selected.map((family) => family.score), fallback)) : fallback;
  };
  const generalCompetencyScore = familyWithRequirements(
    ["STRATEGY", "LEADERSHIP_INFLUENCE", "OPERATIONS_TRANSFORMATION", "ANALYTICS_FINANCE"],
    rawCapability
  );
  const domainReadinessScore = familyWithRequirements(["PRODUCT_CUSTOMER", "FUNCTIONAL_DOMAIN"], 65);
  const technicalFamily = competencyFamilies.find((family) => family.family === "TECHNICAL");
  const technicalReadinessScore = successProfile.technicalMode === "NON_TECHNICAL"
    ? 100
    : successProfile.technicalMode === "TECHNICAL_ENVIRONMENT"
      ? Math.max(76, technicalFamily?.score || 60)
      : successProfile.technicalMode === "TECHNICAL_FLUENCY"
        ? Math.max(48, technicalFamily?.score || 55)
        : technicalFamily?.score || 35;
  const scopeReadinessScore = scopeReadiness.score;
  const technicalWeight = successProfile.technicalMode === "HANDS_ON_EXECUTION" ? 0.25 : successProfile.technicalMode === "TECHNICAL_FLUENCY" ? 0.15 : 0.05;
  const domainWeight = 0.20;
  const scopeWeight = 0.20;
  const generalWeight = 1 - technicalWeight - domainWeight - scopeWeight;
  const capability = clamp(Math.round(
    generalCompetencyScore * generalWeight
      + domainReadinessScore * domainWeight
      + technicalReadinessScore * technicalWeight
      + scopeReadinessScore * scopeWeight
  ));

  const interestSignals = fingerprint.workSignals.map((signal) => interestSignalAssessment(signal, profile));
  const broadInterest = calculateInterest(interestSignals, 0);
  const preparedScenarios = generateRoleScenarios(job, fingerprint);
  const generalTheme = generalThemeInterestForJob(job, fingerprint, profile, preparedScenarios);
  const themeWeight = generalTheme.confidence >= 65 ? 0.78 : generalTheme.confidence >= 45 ? 0.62 : generalTheme.confidence >= 25 ? 0.40 : 0.20;
  const baseInterest = clamp(Math.round(generalTheme.score * themeWeight + broadInterest * (1 - themeWeight)));
  const discovery = synthesizeDiscovery(job, profile, fingerprint, preparedScenarios);
  const roleWeight = discovery.answeredCount === 0
    ? 0
    : Math.min(0.72, 0.22 + (discovery.answeredCount / Math.max(1, discovery.targetCount)) * 0.50);
  const roleSpecificAdjustment = discovery.answeredCount
    ? Math.max(-20, Math.min(20, Math.round((discovery.score - baseInterest) * roleWeight)))
    : 0;
  const interest = clamp(Math.round(baseInterest + roleSpecificAdjustment + job.interestAdjustment));
  const direction = directionAssessment(job, profile, fingerprint);
  const blockers = capabilitySkills.filter((item) => item.status === "CRITICAL_BLOCKER").map((item) => item.requirement.name);
  const unknowns = uniqueStrings([
    ...(discovery.answeredCount
      ? discovery.unresolvedQuestions.slice(0, 4)
      : interestSignals.filter((item) => item.tone === "UNKNOWN" && item.preference.importance >= 2).map((item) => item.label)),
    ...capabilitySkills.filter((item) => item.status === "UNKNOWN" && item.requirement.importance === "MUST").map((item) => item.requirement.name),
    ...successProfile.unknowns.slice(0, 3),
    ...(fingerprint.leadershipModel === "Leadership model unclear" ? ["Leadership model"] : [])
  ]);
  const ageDays = jobAgeDays(job.datePosted);
  const viable = viability(job, blockers, ageDays);
  const technical = technicalRoleAssessment(job, fingerprint);
  const stale = ageDays !== null && ageDays > 90 && !job.ageOverride && !job.verifiedActiveAt;
  const readiness = actionReadiness(job.networkingStage);
  const fitSignature = fitSignatureFor({
    job,
    profile,
    capabilityItems: capabilitySkills,
    families: competencyFamilies,
    successProfile,
    readinessScore: capability,
    interestScore: interest,
    directionScore: direction.score,
    viabilityScore: viable.score,
    ageDays,
    criticalBlockers: blockers
  });
  const evidenceConfidenceScore = fitSignature.evidenceConfidence;

  const automaticRecommendation: Recommendation = fitSignature.decisionAction === "PURSUE"
    ? "PURSUE_NOW"
    : fitSignature.decisionAction === "EXPLORE"
      ? (fitSignature.scopeStatus === "CREDIBLE_STRETCH" && interest >= 72 ? "STRETCH" : "EXPLORE_NETWORKING")
      : fitSignature.decisionAction === "HOLD"
        ? "LOW_PRIORITY"
        : "DO_NOT_PURSUE";
  const calculatedRecommendation = automaticRecommendation;
  const recommendation = job.recommendationOverride === "AUTO" ? calculatedRecommendation : job.recommendationOverride;
  const priorityAdjustment = job.manualPriority === "HIGH" ? 8 : job.manualPriority === "LOW" ? -8 : job.manualPriority === "ARCHIVE" ? -25 : 0;
  const scopeAdjustment = fitSignature.scopeStatus === "IN_SCOPE_NOW" ? 7 : fitSignature.scopeStatus === "CREDIBLE_STRETCH" ? 0 : fitSignature.scopeStatus === "INSUFFICIENT_EVIDENCE" ? -10 : -30;
  const actionAdjustment = fitSignature.decisionAction === "PURSUE" ? 7 : fitSignature.decisionAction === "EXPLORE" ? 2 : fitSignature.decisionAction === "HOLD" ? -5 : fitSignature.decisionAction === "VERIFY_ACTIVE" ? -12 : -24;
  const rawScore = capability * 0.35 + interest * 0.30 + direction.score * 0.20 + viable.score * 0.15;
  const finalScore = clamp(Math.round(rawScore + scopeAdjustment + actionAdjustment + job.manualAdjustment + priorityAdjustment));
  const evidenceConfidence = evidenceConfidenceScore >= 72 ? "HIGH" : evidenceConfidenceScore >= 45 ? "MEDIUM" : "LOW";
  const discoveryConfidence = discoveryConfidenceLabel(discovery.confidence);
  const confidence: Confidence = discovery.answeredCount >= 4
    ? (evidenceConfidence === "LOW" ? discoveryConfidence : discoveryConfidence === "HIGH" ? "HIGH" : evidenceConfidence)
    : evidenceConfidence;
  const focus = determineFocusBucket(
    job, capability, interest, recommendation, blockers, stale, technical, discovery, generalTheme.confidence, unknowns
  );

  const negativeInterest = interestSignals.filter((item) => item.tone === "NEGATIVE").sort((left, right) => right.preference.importance - left.preference.importance || left.alignmentScore - right.alignmentScore);
  const strongestFamily = competencyFamilies
    .filter((family) => family.requirements.length || family.family === "SCOPE")
    .sort((left, right) => right.score - left.score)[0];
  const weakestFamily = competencyFamilies
    .filter((family) => family.requirements.length || family.family === "SCOPE")
    .sort((left, right) => left.score - right.score)[0];

  const reasons = uniqueStrings([
    `${fitSignature.scopeStatus.replace(/_/g, " ").toLowerCase()}: ${fitSignature.scopeReason}`,
    `${capability}% readiness: ${generalCompetencyScore}% general competencies · ${domainReadinessScore}% domain · ${technicalReadinessScore}% technical · ${scopeReadinessScore}% scope`,
    `${interest}% Interest Fit: ${baseInterest} general-theme baseline${roleSpecificAdjustment ? ` ${roleSpecificAdjustment > 0 ? "+" : ""}${roleSpecificAdjustment} role-specific adjustment` : ""}`,
    strongestFamily ? `Strongest evidence family: ${strongestFamily.label} (${strongestFamily.score})` : "",
    weakestFamily && weakestFamily.score < 65 ? `Primary evidence gap: ${weakestFamily.label} (${weakestFamily.score})` : "",
    `${successProfile.technicalMode.replace(/_/g, " ").toLowerCase()}: ${successProfile.technicalModeReason}`,
    `${direction.score}% Career Direction Fit${direction.matches.length ? ` with ${direction.matches[0]}` : ""}`,
    `${evidenceConfidenceScore}% evidence confidence · ${fitSignature.rankingRobustness.toLowerCase()} ranking`,
    viable.label,
    ...(negativeInterest[0] ? [`Potential drain: ${negativeInterest[0].label}`] : []),
    ...(blockers[0] ? [`Critical blocker: ${blockers[0]}`] : []),
    ...(job.recommendationOverride !== "AUTO" ? ["Recommendation manually overridden"] : []),
    ...(job.manualAdjustment ? [`Manual rank adjustment ${job.manualAdjustment > 0 ? "+" : ""}${job.manualAdjustment}`] : [])
  ]);

  let nextAction = "Review the Match Ledger and decide whether to explore.";
  if (fitSignature.decisionAction === "VERIFY_ACTIVE") nextAction = "Confirm the requisition is active before investing more time.";
  else if (fitSignature.scopeStatus === "OUT_OF_SCOPE") nextAction = "Review the hard gate or technical scope before archiving.";
  else if (fitSignature.scopeStatus === "INSUFFICIENT_EVIDENCE") nextAction = "Strengthen the candidate evidence profile for the central requirements.";
  else if (discovery.answeredCount < Math.min(4, discovery.targetCount) && interest >= 55) nextAction = `Continue role discovery: ${discovery.nextQuestion}`;
  else if (fitSignature.decisionAction === "PURSUE" && job.networkingStage === "NOT_STARTED") nextAction = "Identify a contact and validate the work mix before applying.";
  else if (fitSignature.decisionAction === "PURSUE") nextAction = "Prepare a tailored application using the strongest evidence matches.";
  else if (fitSignature.decisionAction === "EXPLORE") nextAction = "Resolve the most decision-relevant unknown through networking or evidence review.";
  else if (fitSignature.decisionAction === "HOLD") nextAction = "Compare with stronger in-scope opportunities before investing more time.";
  else if (fitSignature.decisionAction === "DO_NOT_PURSUE") nextAction = "Archive unless new evidence materially changes scope or attraction.";

  return {
    fingerprint,
    successProfile,
    fitSignature,
    capabilitySkills,
    competencyFamilies,
    capabilityScore: capability,
    generalCompetencyScore,
    domainReadinessScore,
    technicalReadinessScore,
    scopeReadinessScore,
    evidenceConfidenceScore,
    interestSignals,
    interestScore: interest,
    baseInterestScore: baseInterest,
    generalThemeScore: generalTheme.score,
    generalThemeConfidence: generalTheme.confidence,
    roleSpecificAdjustment,
    discovery,
    workContentScore: discovery.dimensions.find((item) => item.id === "WORK_CONTENT")?.score || 50,
    workDesignScore: discovery.dimensions.find((item) => item.id === "WORK_DESIGN")?.score || 50,
    leadershipSocialScore: discovery.dimensions.find((item) => item.id === "LEADERSHIP_SOCIAL")?.score || 50,
    directionScore: direction.score,
    directionMatches: direction.matches,
    viabilityScore: viable.score,
    actionReadiness: readiness,
    ageDays,
    ageLabel: viable.label,
    technicalIntensity: technical.score,
    technicalReason: technical.reason,
    focusBucket: focus.bucket,
    focusReason: focus.reason,
    calculatedRecommendation,
    recommendation,
    confidence,
    finalScore,
    criticalBlockers: blockers,
    unknowns,
    reasons,
    nextAction
  };
}

export function compareJobFingerprints(
  source: JobReq,
  target: JobReq,
  sourceFingerprint: JobFingerprint,
  targetFingerprint: JobFingerprint
): JobComparison {
  const titleScore = jaccardPercent(tokenSet(source.normalizedTitle || source.title), tokenSet(target.normalizedTitle || target.title));
  const sourceRequirements = sourceFingerprint.requirements.map((item) => normalizeText(item.name));
  const targetRequirements = targetFingerprint.requirements.map((item) => normalizeText(item.name));
  const requirementScore = jaccardPercent(sourceRequirements, targetRequirements);
  const themeScore = jaccardPercent(sourceFingerprint.themes.map(normalizeText), targetFingerprint.themes.map(normalizeText));
  const groupScore = sourceFingerprint.primaryGroupId === targetFingerprint.primaryGroupId
    ? 100
    : sourceFingerprint.groups.some((group) => targetFingerprint.groups.some((other) => other.id === group.id))
      ? 55
      : 0;
  let score = Math.round(titleScore * 0.35 + requirementScore * 0.35 + themeScore * 0.15 + groupScore * 0.15);
  if (normalizeText(source.normalizedTitle) === normalizeText(target.normalizedTitle)) score = Math.max(82, score);
  if (source.jobId && normalizeText(source.jobId) === normalizeText(target.jobId)) score = 100;
  const sharedRequirements = sourceFingerprint.requirements.map((item) => item.name).filter((name) => targetRequirements.includes(normalizeText(name)));
  const sharedThemes = sourceFingerprint.themes.filter((theme) => targetFingerprint.themes.includes(theme));
  const type = score >= 86 ? "POSSIBLE_DUPLICATE" : score >= 68 ? "HIGHLY_SIMILAR" : score >= 38 ? "RELATED" : "LOW";
  return {
    sourceJobId: source.id,
    targetJobId: target.id,
    score,
    type,
    titleScore,
    requirementScore,
    themeScore,
    groupScore,
    sharedRequirements,
    sharedThemes,
    reasons: uniqueStrings([
      sourceFingerprint.primaryGroupId === targetFingerprint.primaryGroupId ? `Same role family: ${sourceFingerprint.primaryGroupLabel}` : "",
      sharedRequirements.length ? `${sharedRequirements.length} shared requirements` : "",
      sharedThemes.length ? `Shared themes: ${sharedThemes.slice(0, 3).join(", ")}` : "",
      titleScore >= 60 ? "Strong title overlap" : ""
    ]).slice(0, 5)
  };
}

export function compareJobs(source: JobReq, target: JobReq): JobComparison {
  return compareJobFingerprints(source, target, buildFingerprint(source), buildFingerprint(target));
}

export function buildComparisons(jobs: JobReq[]): JobComparison[] {
  const comparisons: JobComparison[] = [];
  const fingerprints = new Map(jobs.map((job) => [job.id, buildFingerprint(job)]));
  for (let left = 0; left < jobs.length; left += 1) {
    for (let right = left + 1; right < jobs.length; right += 1) {
      const sourceFingerprint = fingerprints.get(jobs[left].id);
      const targetFingerprint = fingerprints.get(jobs[right].id);
      if (!sourceFingerprint || !targetFingerprint) continue;
      const comparison = compareJobFingerprints(jobs[left], jobs[right], sourceFingerprint, targetFingerprint);
      if (comparison.type !== "LOW") comparisons.push(comparison);
    }
  }
  return comparisons.sort((left, right) => right.score - left.score);
}

export function buildComparisonsFromAssessments(
  jobs: JobReq[],
  assessments: Map<string, JobAssessment>
): JobComparison[] {
  const comparisons: JobComparison[] = [];
  for (let left = 0; left < jobs.length; left += 1) {
    const sourceAssessment = assessments.get(jobs[left].id);
    if (!sourceAssessment) continue;
    for (let right = left + 1; right < jobs.length; right += 1) {
      const targetAssessment = assessments.get(jobs[right].id);
      if (!targetAssessment) continue;
      const comparison = compareJobFingerprints(
        jobs[left],
        jobs[right],
        sourceAssessment.fingerprint,
        targetAssessment.fingerprint
      );
      if (comparison.type !== "LOW") comparisons.push(comparison);
    }
  }
  return comparisons.sort((left, right) => right.score - left.score);
}

export function buildRoleGroups(
  jobs: JobReq[],
  assessments: Map<string, JobAssessment>
): RoleGroupSummary[] {
  const groups = new Map<string, { label: string; description: string; jobs: JobReq[] }>();
  jobs.forEach((job) => {
    const assessment = assessments.get(job.id);
    if (!assessment) return;
    const memberships = assessment.fingerprint.groups.filter((group, index) => index === 0 || group.score >= 55);
    memberships.forEach((membership) => {
      const definition = ROLE_GROUPS.find((group) => group.id === membership.id);
      const current = groups.get(membership.id) || {
        label: membership.label,
        description: definition?.description || "Emerging role family.",
        jobs: []
      };
      if (!current.jobs.some((candidate) => candidate.id === job.id)) current.jobs.push(job);
      groups.set(membership.id, current);
    });
  });

  return [...groups.entries()].map(([id, group]) => {
    const groupAssessments = group.jobs.map((job) => assessments.get(job.id)!).filter(Boolean);
    const commonThemes = topCounts(groupAssessments.flatMap((assessment) => assessment.fingerprint.themes), 6);
    const commonGaps = topCounts(groupAssessments.flatMap((assessment) => assessment.capabilitySkills.filter((item) => item.status === "DEVELOPMENT_GAP" || item.status === "CRITICAL_BLOCKER").map((item) => item.requirement.name)), 5);
    const top = [...group.jobs].sort((left, right) => (assessments.get(right.id)?.finalScore || 0) - (assessments.get(left.id)?.finalScore || 0))[0];
    return {
      id,
      label: group.label,
      description: group.description,
      jobIds: group.jobs.map((job) => job.id),
      averageCapability: average(groupAssessments.map((assessment) => assessment.capabilityScore), 0),
      averageInterest: average(groupAssessments.map((assessment) => assessment.interestScore), 0),
      averageDirection: average(groupAssessments.map((assessment) => assessment.directionScore), 0),
      commonThemes,
      commonGaps,
      topJobId: top?.id || ""
    };
  }).sort((left, right) => right.jobIds.length - left.jobIds.length || right.averageInterest - left.averageInterest);
}

export function portfolioThemes(assessments: Iterable<JobAssessment>): Array<{ label: string; count: number }> {
  return topCounts([...assessments].flatMap((assessment) => assessment.fingerprint.themes), 10);
}
