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
import { synthesizeDiscovery, discoveryConfidenceLabel } from "./discovery";
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
    const evidence = evidenceForPhrases(`${job.qualifications.join("\n")}\n${job.responsibilities.join("\n")}\n${job.title}`, definition.aliases, 1)[0]
      || evidenceForPhrases(safeOverviewText(job), definition.aliases, 1)[0]
      || `Detected from the job posting: ${definition.name}`;
    return [{
      id: `${normalizeText(definition.name)}-${makeId("req")}`,
      name: definition.name,
      category: definition.category,
      importance: requirementImportance(evidence),
      critical: criticalCredential(definition.name, evidence),
      evidence
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
    requirements.push({
      id: `${normalizeText(item.name)}-${makeId("req")}`,
      name: item.name,
      category: item.category,
      importance: "MUST",
      critical: true,
      evidence: evidenceForPhrases(source, item.patterns, 1)[0] || `Mandatory credential detected: ${item.name}`
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

function relatedProfileSkill(requirement: JobRequirement, profile: UserProfile): ProfileSkill | null {
  const definition = skillDefinition(requirement.name);
  if (!definition) return null;
  const related = new Set(definition.related.map(normalizeText));
  return activeProfileSkills(profile).find((skill) => {
    if (related.has(skill.normalizedName)) return true;
    const candidateDefinition = skillDefinition(skill.name);
    return candidateDefinition?.related.some((item) => normalizeText(item) === normalizeText(requirement.name)) || false;
  }) || null;
}

function capabilityStatus(
  job: JobReq,
  requirement: JobRequirement,
  profile: UserProfile
): CapabilitySkillAssessment {
  const override = job.skillOverrides[requirement.name];
  const exact = exactProfileSkill(requirement, profile);
  const related = relatedProfileSkill(requirement, profile);

  if (override) {
    return {
      requirement,
      status: override,
      matchedProfileSkill: exact || related,
      evidence: (exact || related)?.evidence.map((item) => item.text) || [],
      reason: "Manually classified for this requisition."
    };
  }

  if (exact) {
    const status: SkillMatchStatus = exact.confirmed || exact.evidence.length ? "PROVEN" : "UNKNOWN";
    return {
      requirement,
      status,
      matchedProfileSkill: exact,
      evidence: exact.evidence.map((item) => item.text),
      reason: status === "PROVEN"
        ? `Direct ${exact.source === "RESUME" ? "resume" : "profile"} evidence found.`
        : "The skill is listed, but the evidence has not been reviewed."
    };
  }

  if (related) {
    return {
      requirement,
      status: "TRANSFERABLE",
      matchedProfileSkill: related,
      evidence: related.evidence.map((item) => item.text),
      reason: `Adjacent evidence found through ${related.name}.`
    };
  }

  if (!activeProfileSkills(profile).length) {
    return {
      requirement,
      status: "UNKNOWN",
      matchedProfileSkill: null,
      evidence: [],
      reason: "Upload and review a resume before treating this as a gap."
    };
  }

  return {
    requirement,
    status: requirement.critical ? "CRITICAL_BLOCKER" : "DEVELOPMENT_GAP",
    matchedProfileSkill: null,
    evidence: [],
    reason: requirement.critical
      ? "A mandatory credential or non-negotiable requirement was not found."
      : "No direct or adjacent evidence was found in the current profile."
  };
}

function capabilityScore(items: CapabilitySkillAssessment[]): number {
  if (!items.length) return 50;
  const scoreByStatus: Record<SkillMatchStatus, number> = {
    PROVEN: 100,
    TRANSFERABLE: 68,
    DEVELOPMENT_GAP: 28,
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

export function assessJob(job: JobReq, profile: UserProfile): JobAssessment {
  const fingerprint = buildFingerprint(job);
  const capabilitySkills = fingerprint.requirements.map((requirement) => capabilityStatus(job, requirement, profile));
  const capability = capabilityScore(capabilitySkills);
  const interestSignals = fingerprint.workSignals.map((signal) => interestSignalAssessment(signal, profile));
  const baseInterest = calculateInterest(interestSignals, 0);
  const discovery = synthesizeDiscovery(job, profile, fingerprint);
  const discoveryWeight = discovery.answeredCount === 0
    ? 0
    : Math.min(0.78, 0.18 + (discovery.answeredCount / Math.max(1, discovery.targetCount)) * 0.60);
  const interest = clamp(Math.round(baseInterest * (1 - discoveryWeight) + discovery.score * discoveryWeight + job.interestAdjustment));
  const direction = directionAssessment(job, profile, fingerprint);
  const blockers = capabilitySkills.filter((item) => item.status === "CRITICAL_BLOCKER").map((item) => item.requirement.name);
  const unknowns = uniqueStrings([
    ...(discovery.answeredCount
      ? discovery.unresolvedQuestions.slice(0, 5)
      : interestSignals.filter((item) => item.tone === "UNKNOWN" && item.preference.importance >= 2).map((item) => item.label)),
    ...capabilitySkills.filter((item) => item.status === "UNKNOWN" && item.requirement.importance === "MUST").map((item) => item.requirement.name),
    ...(fingerprint.leadershipModel === "Leadership model unclear" ? ["Leadership model"] : [])
  ]);
  const ageDays = jobAgeDays(job.datePosted);
  const viable = viability(job, blockers, ageDays);
  const stale = ageDays !== null && ageDays > 90 && !job.ageOverride && !job.verifiedActiveAt;
  const readiness = actionReadiness(job.networkingStage);
  const calculatedRecommendation = recommendationFor(capability, interest, direction.score, viable.score, blockers, unknowns, stale);
  const recommendation = job.recommendationOverride === "AUTO" ? calculatedRecommendation : job.recommendationOverride;
  const priorityAdjustment = job.manualPriority === "HIGH" ? 8 : job.manualPriority === "LOW" ? -8 : job.manualPriority === "ARCHIVE" ? -25 : 0;
  const rawScore = capability * 0.35 + interest * 0.30 + direction.score * 0.20 + viable.score * 0.15;
  const finalScore = clamp(Math.round(rawScore + job.manualAdjustment + priorityAdjustment));
  const evidenceConfidence = assessmentConfidence(profile, fingerprint, unknowns);
  const discoveryConfidence = discoveryConfidenceLabel(discovery.confidence);
  const confidence: Confidence = discovery.answeredCount >= 4
    ? (evidenceConfidence === "LOW" ? discoveryConfidence : discoveryConfidence === "HIGH" ? "HIGH" : evidenceConfidence)
    : evidenceConfidence;

  const positiveInterest = interestSignals.filter((item) => item.tone === "POSITIVE").sort((left, right) => right.preference.importance - left.preference.importance || right.alignmentScore - left.alignmentScore);
  const negativeInterest = interestSignals.filter((item) => item.tone === "NEGATIVE").sort((left, right) => right.preference.importance - left.preference.importance || left.alignmentScore - right.alignmentScore);
  const proven = capabilitySkills.filter((item) => item.status === "PROVEN").length;
  const transferable = capabilitySkills.filter((item) => item.status === "TRANSFERABLE").length;

  const reasons = uniqueStrings([
    `${capability}% Capability Fit: ${proven} proven and ${transferable} transferable requirements`,
    `${interest}% Interest Fit${discovery.answeredCount ? `, informed by ${discovery.answeredCount} realistic scenario${discovery.answeredCount === 1 ? "" : "s"}` : positiveInterest[0] ? `, supported by ${positiveInterest[0].label.toLowerCase()}` : ""}`,
    ...(discovery.energizers[0] ? [`Likely energizer: ${discovery.energizers[0]}`] : []),
    ...(discovery.drains[0] ? [`Potential drain: ${discovery.drains[0]}`] : []),
    `${direction.score}% Career Direction Fit${direction.matches.length ? ` with ${direction.matches[0]}` : ""}`,
    viable.label,
    ...(negativeInterest[0]
      ? [negativeInterest[0].preference.score < 0
        ? `Potential drain: ${negativeInterest[0].label}`
        : `Interest gap: limited ${negativeInterest[0].label.toLowerCase()}`]
      : []),
    ...(blockers[0] ? [`Critical blocker: ${blockers[0]}`] : []),
    ...(job.recommendationOverride !== "AUTO" ? ["Recommendation manually overridden"] : []),
    ...(job.manualAdjustment ? [`Manual rank adjustment ${job.manualAdjustment > 0 ? "+" : ""}${job.manualAdjustment}`] : [])
  ]);

  let nextAction = "Review the evidence and decide whether to explore.";
  if (stale) nextAction = "Confirm the requisition is active before investing more time.";
  else if (blockers.length) nextAction = "Validate whether the critical requirement is truly non-negotiable.";
  else if (discovery.answeredCount < Math.min(5, discovery.targetCount)) nextAction = `Continue Fit Discovery: ${discovery.nextQuestion}`;
  else if (recommendation === "PURSUE_NOW" && job.networkingStage === "NOT_STARTED") nextAction = "Identify a contact and validate the role before applying.";
  else if (recommendation === "PURSUE_NOW") nextAction = "Continue networking and prepare a tailored application.";
  else if (recommendation === "EXPLORE_NETWORKING") nextAction = "Use a networking conversation to resolve the key unknowns.";
  else if (recommendation === "STRETCH") nextAction = "Test whether the developmental gaps are acceptable through networking.";
  else if (recommendation === "LOW_PRIORITY") nextAction = "Compare against stronger clusters before spending more time.";
  else if (recommendation === "DO_NOT_PURSUE") nextAction = "Archive unless new evidence changes the assessment.";

  return {
    fingerprint,
    capabilitySkills,
    capabilityScore: capability,
    interestSignals,
    interestScore: interest,
    baseInterestScore: baseInterest,
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

export function compareJobs(source: JobReq, target: JobReq): JobComparison {
  const sourceFingerprint = buildFingerprint(source);
  const targetFingerprint = buildFingerprint(target);
  const titleScore = jaccardPercent(tokenSet(source.normalizedTitle || source.title), tokenSet(target.normalizedTitle || target.title));
  const sourceRequirements = sourceFingerprint.requirements.map((item) => normalizeText(item.name));
  const targetRequirements = targetFingerprint.requirements.map((item) => normalizeText(item.name));
  const requirementScore = jaccardPercent(sourceRequirements, targetRequirements);
  const themeScore = jaccardPercent(sourceFingerprint.themes.map(normalizeText), targetFingerprint.themes.map(normalizeText));
  const groupScore = sourceFingerprint.primaryGroupId === targetFingerprint.primaryGroupId ? 100 : sourceFingerprint.groups.some((group) => targetFingerprint.groups.some((other) => other.id === group.id)) ? 55 : 0;
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

export function buildComparisons(jobs: JobReq[]): JobComparison[] {
  const comparisons: JobComparison[] = [];
  for (let left = 0; left < jobs.length; left += 1) {
    for (let right = left + 1; right < jobs.length; right += 1) {
      const comparison = compareJobs(jobs[left], jobs[right]);
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
