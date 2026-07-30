import {
  DISCOVERY_FACETS,
  FREQUENCY_SCORE,
  REACTION_SCORE,
  SCENARIO_TEMPLATES,
  facetDefinition,
  scoreToPreference
} from "../data/discovery";
import type {
  Confidence,
  DiscoveryDimensionScore,
  DiscoveryFacet,
  DiscoverySynthesis,
  FitDiscoverySession,
  InferenceLevel,
  InterestDimension,
  JobFingerprint,
  JobReq,
  PreferenceFacet,
  PreferenceFacetEvidence,
  RoleRealityItem,
  RoleRealityPreview,
  RoleScenario,
  RoleWeekItem,
  ScenarioConfidence,
  ScenarioResponse,
  UserProfile
} from "../types";
import {
  clamp,
  containsPhrase,
  evidenceForPhrases,
  makeId,
  normalizeText,
  phraseCount,
  uniqueStrings
} from "./text";

const TARGET_SCENARIOS = 8;

const CONFIDENCE_WEIGHT: Record<ScenarioConfidence, number> = {
  DIRECT_EXPERIENCE: 1,
  RELATED_EXPERIENCE: 0.78,
  ESTIMATE: 0.52,
  UNSURE: 0.25
};

function jobSource(job: JobReq): string {
  const hasStructuredSections = job.responsibilities.length + job.qualifications.length > 0;
  const overview = (hasStructuredSections ? job.descriptionText.split(/\bResponsibilities\b/i)[0] : job.descriptionText)
    .split(/\n+/)
    .filter((line) => !/cookie|tracking technolog|manage settings|give feedback|apply now|related content|jobs for you|equal opportunity|compensation|privacy security/i.test(line))
    .join("\n");
  return [
    job.title,
    job.category,
    job.team,
    overview,
    ...job.responsibilities,
    ...job.qualifications
  ].filter(Boolean).join("\n");
}

function cleanEvidence(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 380);
}

function inferenceFromHits(includeHits: number, evidenceCount: number): InferenceLevel {
  if (includeHits >= 2 || evidenceCount >= 2) return "STATED";
  if (includeHits >= 1 || evidenceCount >= 1) return "STRONGLY_IMPLIED";
  return "POSSIBLE";
}

function realityItem(
  id: string,
  label: string,
  value: string,
  detail: string,
  evidence: string[],
  inferenceLevel: InferenceLevel
): RoleRealityItem {
  return { id, label, value, detail, evidence: evidence.map(cleanEvidence), inferenceLevel };
}

function signalEvidence(fingerprint: JobFingerprint, dimension: InterestDimension): string[] {
  return fingerprint.workSignals.find((signal) => signal.dimension === dimension)?.evidence || [];
}

function topResponsibilities(job: JobReq, limit = 6): string[] {
  const structured = job.responsibilities
    .map(cleanEvidence)
    .filter((item) => item.length >= 20)
    .filter((item) => !/cookie|tracking technolog|manage settings|give feedback/i.test(item));
  if (structured.length) return structured.slice(0, limit);
  const sentences = job.descriptionText
    .split(/(?<=[.!?])\s+|\n+/)
    .map(cleanEvidence)
    .filter((item) => item.length >= 45 && item.length <= 420)
    .filter((item) => /\b(lead|drive|develop|manage|own|partner|analy|build|create|monitor|define|shape|ensure|communicate)\b/i.test(item))
    .filter((item) => !/cookie|tracking technolog|benefits|equal opportunity|compensation/i.test(item));
  return uniqueStrings(sentences).slice(0, limit);
}

function stakeholderSignals(source: string): Array<{ label: string; patterns: string[]; detail: string }> {
  return [
    { label: "Senior leaders", patterns: ["senior leadership", "executive leadership", "senior stakeholders", "executives"], detail: "Frequent partnership with leaders who shape priorities and resources." },
    { label: "Cross-functional partners", patterns: ["cross-functional", "cross functional", "stakeholders throughout", "partner with"], detail: "Results depend on alignment across functions rather than one reporting line." },
    { label: "Direct reports", patterns: ["direct reports", "manage a team", "lead a team", "people manager"], detail: "The posting indicates formal people-management accountability." },
    { label: "Customers", patterns: ["customers", "customer success", "customer outcomes", "customer experience"], detail: "The mandate connects to customer outcomes, directly or indirectly." },
    { label: "Technical or product teams", patterns: ["engineering", "product team", "technical team", "data science", "technology"], detail: "The work requires close partnership with product or technical specialists." },
    { label: "External partners", patterns: ["external partners", "vendors", "partners", "clients"], detail: "Some outcomes may depend on people outside the organization." }
  ].filter((item) => phraseCount(source, item.patterns) > 0);
}

function inferLeadershipReality(job: JobReq, fingerprint: JobFingerprint): RoleRealityItem {
  const directEvidence = evidenceForPhrases(jobSource(job), ["direct reports", "manage a team", "lead a team", "people manager"], 3);
  const influenceEvidence = uniqueStrings([
    ...signalEvidence(fingerprint, "EXECUTIVE_INFLUENCE"),
    ...evidenceForPhrases(jobSource(job), ["cross-functional", "influence", "stakeholder", "partner"], 3)
  ]);
  if (directEvidence.length) {
    return realityItem("leadership-mode", "Leadership model", "Direct people leadership", "The posting contains direct evidence of formal team leadership, but the exact team size and management mix may still be unknown.", directEvidence, "STATED");
  }
  if (influenceEvidence.length) {
    return realityItem("leadership-mode", "Leadership model", "Influence-heavy leadership", "Impact appears to come primarily through executives and cross-functional partners. Direct reports are not clearly stated.", influenceEvidence, "STRONGLY_IMPLIED");
  }
  return realityItem("leadership-mode", "Leadership model", "Unclear", "The posting does not provide enough evidence to distinguish direct people leadership from influence without authority.", [], "UNKNOWN");
}

function inferWorkRhythm(job: JobReq, fingerprint: JobFingerprint): RoleRealityItem[] {
  const source = jobSource(job);
  const items: RoleRealityItem[] = [];
  const cadenceEvidence = evidenceForPhrases(source, ["quarterly", "annual planning", "operating rhythm", "monitor", "kpi", "reporting", "execution"], 3);
  if (cadenceEvidence.length) items.push(realityItem("rhythm-cadence", "Recurring cadence", "Moderate to high", "Planning, reviews, monitoring, or follow-through appear to recur throughout the year.", cadenceEvidence, cadenceEvidence.length >= 2 ? "STATED" : "STRONGLY_IMPLIED"));
  const strategyEvidence = signalEvidence(fingerprint, "STRATEGY");
  if (strategyEvidence.length) items.push(realityItem("rhythm-strategy", "Strategic work", "Meaningful", "The role includes framing choices, planning, or setting direction—not only execution.", strategyEvidence, strategyEvidence.length >= 2 ? "STATED" : "STRONGLY_IMPLIED"));
  const analysisEvidence = signalEvidence(fingerprint, "ANALYTICS");
  if (analysisEvidence.length) items.push(realityItem("rhythm-analysis", "Individual analysis", "Present", "The posting expects the role to personally use data or structured analysis to shape decisions.", analysisEvidence, analysisEvidence.length >= 2 ? "STATED" : "STRONGLY_IMPLIED"));
  const varietyEvidence = signalEvidence(fingerprint, "VARIETY");
  if (varietyEvidence.length) items.push(realityItem("rhythm-variety", "Context switching", "Likely", "The breadth of stakeholders and initiatives suggests a varied portfolio rather than one narrow workstream.", varietyEvidence, "POSSIBLE"));
  return items.slice(0, 4);
}

function weekActivities(job: JobReq, fingerprint: JobFingerprint): RoleWeekItem[] {
  const source = jobSource(job);
  const candidates: Array<{ day: string; activity: string; patterns: string[]; fallback: string }> = [
    { day: "Monday", activity: "Frame a strategic decision with senior leaders and clarify the trade-offs that require alignment.", patterns: ["strategic planning", "strategy", "frame decisions", "priorities"], fallback: topResponsibilities(job, 1)[0] || "Review the highest-priority business problem and define the next decision." },
    { day: "Tuesday", activity: "Analyze operating results, identify the cause of a performance gap, and prepare a recommendation.", patterns: ["data-driven", "analysis", "kpi", "performance", "financial model"], fallback: "Synthesize evidence and prepare a recommendation for a complex business question." },
    { day: "Wednesday", activity: "Redesign a process or operating model with cross-functional partners.", patterns: ["operating model", "process improvement", "ways of working", "scale"], fallback: "Work with partners to improve how the organization makes decisions and executes." },
    { day: "Thursday", activity: "Influence stakeholders who do not report to you and resolve competing interests.", patterns: ["cross-functional", "stakeholder", "influence", "partner"], fallback: "Build alignment with the stakeholders required to move the work forward." },
    { day: "Friday", activity: "Monitor strategic priorities and prepare a leadership review, communication, or operating forum.", patterns: ["monitor", "goals", "town hall", "leadership meeting", "quarterly"], fallback: "Review progress, surface risks, and communicate what needs to change next." }
  ];
  return candidates.map((candidate) => {
    const evidence = evidenceForPhrases(source, candidate.patterns, 1)[0];
    const signal = candidate.patterns.some((pattern) => normalizeText(source).includes(normalizeText(pattern)));
    return {
      day: candidate.day,
      activity: signal ? candidate.activity : candidate.fallback,
      evidence: evidence || "Illustrative activity based on the role fingerprint; verify through networking.",
      inferenceLevel: evidence ? "STRONGLY_IMPLIED" : "POSSIBLE"
    };
  });
}

export function buildRoleRealityPreview(job: JobReq, fingerprint: JobFingerprint): RoleRealityPreview {
  const source = jobSource(job);
  const responsibilities = topResponsibilities(job, 6).map((item, index) => realityItem(
    `responsibility-${index}`,
    `Responsibility ${index + 1}`,
    item,
    "Likely to be a recurring part of the role because it appears in the responsibilities or overview.",
    [item],
    "STATED"
  ));

  const stakeholders = stakeholderSignals(source).map((item, index) => {
    const evidence = evidenceForPhrases(source, item.patterns, 2);
    return realityItem(`stakeholder-${index}`, item.label, item.label, item.detail, evidence, evidence.length >= 2 ? "STATED" : "STRONGLY_IMPLIED");
  });

  const leadership = inferLeadershipReality(job, fingerprint);
  if (!stakeholders.some((item) => item.id === leadership.id)) stakeholders.unshift(leadership);

  const impactModes: RoleRealityItem[] = [];
  const influenceEvidence = signalEvidence(fingerprint, "EXECUTIVE_INFLUENCE");
  if (influenceEvidence.length) impactModes.push(realityItem("impact-influence", "How impact happens", "Influence and alignment", "The role appears to create impact by shaping decisions and coordinating other leaders or teams.", influenceEvidence, "STRONGLY_IMPLIED"));
  const buildEvidence = signalEvidence(fingerprint, "BUILDING_NEW");
  if (buildEvidence.length) impactModes.push(realityItem("impact-build", "How impact happens", "Build or redesign systems", "A meaningful part of the mandate appears to involve creating or changing an operating model, process, capability, or product.", buildEvidence, "STRONGLY_IMPLIED"));
  const ownershipEvidence = signalEvidence(fingerprint, "BUSINESS_OWNERSHIP");
  if (ownershipEvidence.length) impactModes.push(realityItem("impact-own", "How impact happens", "Direct business ownership", "The posting contains evidence of direct accountability for measurable business outcomes.", ownershipEvidence, "STRONGLY_IMPLIED"));
  if (!impactModes.length) impactModes.push(realityItem("impact-unknown", "How impact happens", "Unclear", "The posting does not make the mechanism of impact explicit.", [], "UNKNOWN"));

  const successSignals: RoleRealityItem[] = [];
  const successPatterns = [
    { label: "Strategic alignment", patterns: ["alignment", "strategy", "priorities"], detail: "Leaders and teams make coherent choices around the same priorities." },
    { label: "Execution against goals", patterns: ["goals", "kpi", "results", "execution", "performance"], detail: "Strategic priorities translate into measurable progress and consistent follow-through." },
    { label: "Operating leverage", patterns: ["scale", "operating model", "process", "efficiency"], detail: "The organization works with less friction and can deliver at greater scale." },
    { label: "Customer value", patterns: ["customer", "client", "user"], detail: "Internal choices create visible value for customers or users." },
    { label: "Team capability", patterns: ["people", "culture", "develop", "team"], detail: "The team becomes more capable, aligned, or effective." }
  ];
  successPatterns.forEach((item, index) => {
    const evidence = evidenceForPhrases(source, item.patterns, 2);
    if (evidence.length) successSignals.push(realityItem(`success-${index}`, item.label, item.label, item.detail, evidence, evidence.length >= 2 ? "STATED" : "STRONGLY_IMPLIED"));
  });

  const unknowns = uniqueStrings([
    leadership.inferenceLevel === "UNKNOWN" || leadership.value !== "Direct people leadership" ? "Whether the role has direct reports and what kind of people-management work is required" : "Team size, maturity, and the amount of recurring people management",
    !/decision rights|authority|own the decision/i.test(source) ? "Which decisions the role owns directly versus influences" : "",
    !/travel|onsite|on-site/i.test(source) ? "Travel and in-person expectations" : "",
    !/percentage|% of|typical week|day.to.day/i.test(source) ? "The actual weekly mix of strategy, analysis, meetings, and recurring operations" : "",
    !/first 90|first year|12 months|success in/i.test(source) ? "What success looks like after the first year" : ""
  ]);

  return {
    responsibilities,
    stakeholders: stakeholders.slice(0, 6),
    impactModes: impactModes.slice(0, 4),
    workRhythm: inferWorkRhythm(job, fingerprint),
    successSignals: successSignals.slice(0, 5),
    unknowns,
    week: weekActivities(job, fingerprint)
  };
}

function distinctPhraseHits(source: string, patterns: string[]): number {
  return patterns.filter((pattern) => phraseCount(source, [pattern]) > 0).length;
}

function templateScore(job: JobReq, template: typeof SCENARIO_TEMPLATES[number]): number {
  const source = jobSource(job);
  const includeHits = distinctPhraseHits(source, template.includePatterns);
  const optionalHits = distinctPhraseHits(source, template.optionalPatterns || []);
  const excludeHits = distinctPhraseHits(source, template.excludePatterns || []);

  const peopleFacets: DiscoveryFacet[] = ["SETTING_TEAM_DIRECTION", "COACHING_AND_DEVELOPMENT", "DELEGATION_AND_ACCOUNTABILITY", "PERFORMANCE_MANAGEMENT", "HIRING_AND_TEAM_DESIGN", "PEOPLE_ADMINISTRATION"];
  if (peopleFacets.includes(template.facet)) {
    const direct = distinctPhraseHits(source, ["direct reports", "manage a team", "lead a team", "people manager", "team leadership", "manage people", "people leadership"]);
    // Do not infer formal people-management scenarios from generic words such as team, lead, or develop.
    if (!direct) return -1000;
  }

  // Template priority is a tie-breaker, not evidence that the scenario belongs in the role.
  // This prevents high-priority themes (for example AI) from appearing when the posting does not support them.
  let score = Math.round(template.priority / 10) + includeHits * 34 + optionalHits * 10 - excludeHits * 40;
  if (template.facet === "INFLUENCE_WITHOUT_AUTHORITY" && distinctPhraseHits(source, ["direct reports", "manage a team", "lead a team", "people manager"])) score -= 20;
  return score;
}

export function generateRoleScenarios(job: JobReq, fingerprint: JobFingerprint): RoleScenario[] {
  const source = jobSource(job);
  const candidates = SCENARIO_TEMPLATES.map((template) => {
    const includeHits = distinctPhraseHits(source, template.includePatterns);
    const evidence = evidenceForPhrases(source, template.evidencePatterns, 3);
    const definition = facetDefinition(template.facet);
    let inferenceLevel = inferenceFromHits(includeHits, evidence.length);
    if (template.facet === "INFLUENCE_WITHOUT_AUTHORITY" && !containsPhrase(source, "influence without authority")) inferenceLevel = evidence.length ? "STRONGLY_IMPLIED" : "POSSIBLE";
    if (template.facet === "AUTONOMY_AND_AUTHORITY" && !["decision rights", "authority", "accountable", "own the outcome"].some((pattern) => containsPhrase(source, pattern))) inferenceLevel = evidence.length ? "STRONGLY_IMPLIED" : "POSSIBLE";
    if (template.facet === "WORK_VARIETY" && !containsPhrase(source, "variety")) inferenceLevel = evidence.length ? "STRONGLY_IMPLIED" : "POSSIBLE";
    return {
      score: templateScore(job, template),
      family: definition.family,
      scenario: {
        id: template.id,
        facet: template.facet,
        dimension: definition.dimension,
        title: template.title,
        situation: template.situation,
        responsibility: template.responsibility,
        tension: template.tension,
        purpose: template.purpose,
        evidence: evidence.length ? evidence.map(cleanEvidence) : ["This scenario is based on the role fingerprint and should be verified if it matters to your decision."],
        inferenceLevel,
        frequencyAssumption: template.frequencyAssumption,
        conditionOptions: template.conditionOptions,
        reflectionPrompt: template.reflectionPrompt
      } satisfies RoleScenario
    };
  }).sort((left, right) => right.score - left.score);

  const selected: RoleScenario[] = [];
  const usedFacets = new Set<DiscoveryFacet>();
  const familyCounts = new Map<DiscoveryDimensionScore["id"], number>();
  const influenceFacets = new Set<DiscoveryFacet>(["EXECUTIVE_INFLUENCE", "PEER_ALIGNMENT", "INFLUENCE_WITHOUT_AUTHORITY", "ORGANIZATIONAL_COMMUNICATION"]);
  let influenceCount = 0;
  const directPeopleRole = distinctPhraseHits(source, ["direct reports", "manage a team", "lead a team", "people manager", "team leadership", "manage people", "people leadership"]) > 0;

  const canAdd = (candidate: typeof candidates[number], bypassFamilyCap = false): boolean => {
    if (candidate.score < 24 || usedFacets.has(candidate.scenario.facet)) return false;
    if (influenceFacets.has(candidate.scenario.facet) && influenceCount >= 2) return false;
    const cap = candidate.family === "LEADERSHIP_SOCIAL" ? (directPeopleRole ? 3 : 2) : 3;
    if (!bypassFamilyCap && (familyCounts.get(candidate.family) || 0) >= cap) return false;
    return true;
  };

  const addCandidate = (candidate: typeof candidates[number], bypassFamilyCap = false) => {
    if (selected.length >= TARGET_SCENARIOS || !canAdd(candidate, bypassFamilyCap)) return;
    selected.push(candidate.scenario);
    usedFacets.add(candidate.scenario.facet);
    familyCounts.set(candidate.family, (familyCounts.get(candidate.family) || 0) + 1);
    if (influenceFacets.has(candidate.scenario.facet)) influenceCount += 1;
  };

  // Preserve the most decision-relevant tensions without allowing several near-duplicate influence questions to dominate.
  const anchors: DiscoveryFacet[] = [
    "STRATEGIC_FRAMING",
    "BUILDING_SYSTEMS",
    "RUNNING_CADENCE",
    directPeopleRole ? "SETTING_TEAM_DIRECTION" : "INFLUENCE_WITHOUT_AUTHORITY"
  ];
  anchors.forEach((facet) => {
    const candidate = candidates.find((item) => item.scenario.facet === facet);
    if (candidate) addCandidate(candidate);
  });

  candidates.forEach((candidate) => addCandidate(candidate));

  // When a role has sparse evidence, add a small number of clearly labeled hypotheses rather than repeating broad questions.
  const essentialFallbacks: DiscoveryFacet[] = ["AMBIGUITY_NAVIGATION", "BUILDING_SYSTEMS", "RUNNING_CADENCE", "INFLUENCE_WITHOUT_AUTHORITY"];
  essentialFallbacks.forEach((facet) => {
    if (selected.length >= Math.min(6, TARGET_SCENARIOS) || usedFacets.has(facet)) return;
    const candidate = candidates.find((item) => item.scenario.facet === facet);
    if (!candidate) return;
    const possibleCandidate = {
      ...candidate,
      score: 24,
      scenario: { ...candidate.scenario, inferenceLevel: candidate.scenario.evidence[0]?.startsWith("This scenario") ? "POSSIBLE" : candidate.scenario.inferenceLevel }
    };
    addCandidate(possibleCandidate, true);
  });

  return selected.slice(0, TARGET_SCENARIOS);
}

export function createEmptyDiscoverySession(): FitDiscoverySession {
  return {
    id: makeId("discovery"),
    status: "NOT_STARTED",
    scenarioOrder: [],
    responses: {},
    skippedScenarioIds: [],
    repeatedScenarioIds: [],
    startedAt: "",
    completedAt: "",
    lastViewedAt: "",
    hypothesis: "",
    unresolvedQuestions: [],
    networkingOutcome: "NOT_RECORDED",
    interestChange: "NOT_RECORDED",
    learningNotes: ""
  };
}

export function normalizeDiscoverySession(value: unknown): FitDiscoverySession {
  const fallback = createEmptyDiscoverySession();
  if (!value || typeof value !== "object") return fallback;
  const raw = value as Partial<FitDiscoverySession>;
  const responses: Record<string, ScenarioResponse> = {};
  if (raw.responses && typeof raw.responses === "object") {
    Object.entries(raw.responses).forEach(([id, value]) => {
      if (!value || typeof value !== "object") return;
      const response = value as Partial<ScenarioResponse>;
      if (!response.scenarioId || !response.facet || !response.reaction || !response.preferredFrequency || !response.confidence) return;
      responses[id] = {
        scenarioId: response.scenarioId,
        facet: response.facet,
        reaction: response.reaction,
        preferredFrequency: response.preferredFrequency,
        confidence: response.confidence,
        conditions: Array.isArray(response.conditions) ? response.conditions.filter((item): item is string => typeof item === "string") : [],
        linkedExperienceId: typeof response.linkedExperienceId === "string" ? response.linkedExperienceId : "",
        reflection: typeof response.reflection === "string" ? response.reflection : "",
        markedRepetitive: response.markedRepetitive === true,
        answeredAt: typeof response.answeredAt === "string" ? response.answeredAt : ""
      };
    });
  }
  const status = raw.status === "COMPLETED" || raw.status === "IN_PROGRESS" ? raw.status : Object.keys(responses).length ? "IN_PROGRESS" : "NOT_STARTED";
  return {
    ...fallback,
    id: typeof raw.id === "string" ? raw.id : fallback.id,
    status,
    scenarioOrder: Array.isArray(raw.scenarioOrder) ? raw.scenarioOrder.filter((item): item is string => typeof item === "string") : [],
    responses,
    skippedScenarioIds: Array.isArray(raw.skippedScenarioIds) ? raw.skippedScenarioIds.filter((item): item is string => typeof item === "string") : [],
    repeatedScenarioIds: Array.isArray(raw.repeatedScenarioIds) ? raw.repeatedScenarioIds.filter((item): item is string => typeof item === "string") : [],
    startedAt: typeof raw.startedAt === "string" ? raw.startedAt : "",
    completedAt: typeof raw.completedAt === "string" ? raw.completedAt : "",
    lastViewedAt: typeof raw.lastViewedAt === "string" ? raw.lastViewedAt : "",
    hypothesis: typeof raw.hypothesis === "string" ? raw.hypothesis : "",
    unresolvedQuestions: Array.isArray(raw.unresolvedQuestions) ? raw.unresolvedQuestions.filter((item): item is string => typeof item === "string") : [],
    networkingOutcome: raw.networkingOutcome || "NOT_RECORDED",
    interestChange: raw.interestChange || "NOT_RECORDED",
    learningNotes: typeof raw.learningNotes === "string" ? raw.learningNotes : ""
  };
}

function responseValue(response: ScenarioResponse): number {
  const reaction = REACTION_SCORE[response.reaction];
  const frequency = FREQUENCY_SCORE[response.preferredFrequency];
  return Math.max(-2, Math.min(2, reaction + frequency));
}

function dimensionScore(
  family: DiscoveryDimensionScore["id"],
  label: string,
  scenarios: RoleScenario[],
  responses: ScenarioResponse[]
): DiscoveryDimensionScore {
  const facets = new Set(DISCOVERY_FACETS.filter((facet) => facet.family === family).map((facet) => facet.id));
  const relevant = responses.filter((response) => facets.has(response.facet) && !response.markedRepetitive);
  if (!relevant.length) {
    return { id: family, label, score: 50, confidence: 0, answeredFacets: [], explanation: "Not enough scenario evidence yet." };
  }
  let weightedTotal = 0;
  let weightTotal = 0;
  relevant.forEach((response) => {
    const scenario = scenarios.find((item) => item.id === response.scenarioId);
    const inferenceWeight = scenario?.inferenceLevel === "STATED" ? 1 : scenario?.inferenceLevel === "STRONGLY_IMPLIED" ? 0.88 : 0.68;
    const weight = CONFIDENCE_WEIGHT[response.confidence] * inferenceWeight;
    weightedTotal += responseValue(response) * weight;
    weightTotal += weight;
  });
  const averageValue = weightTotal ? weightedTotal / weightTotal : 0;
  const score = clamp(Math.round(50 + averageValue * 25));
  const confidence = clamp(Math.round((weightTotal / Math.max(1, relevant.length)) * 100));
  const positive = relevant.filter((response) => responseValue(response) >= 0.75).length;
  const negative = relevant.filter((response) => responseValue(response) <= -0.75).length;
  const explanation = positive && negative
    ? "Your responses are mixed, suggesting this area depends on the exact conditions."
    : positive
      ? "Your scenario responses indicate this part of the work is likely to create energy."
      : negative
        ? "Your scenario responses indicate this part of the work may be draining if it is frequent."
        : "Your responses suggest comfort without a strong positive or negative preference.";
  return { id: family, label, score, confidence, answeredFacets: relevant.map((item) => item.facet), explanation };
}

function contradictionMessages(profile: UserProfile, responses: ScenarioResponse[]): string[] {
  return responses.flatMap((response) => {
    const existing = profile.discoveryPreferences.find((item) => item.facet === response.facet && item.confidence >= 65);
    if (!existing) return [];
    const value = responseValue(response);
    if ((existing.preference >= 1 && value <= -0.75) || (existing.preference <= -1 && value >= 0.75)) {
      return [`${facetDefinition(response.facet).label}: this job-specific reaction differs from your established preference.`];
    }
    return [];
  });
}

export function synthesizeDiscovery(job: JobReq, profile: UserProfile, fingerprint: JobFingerprint): DiscoverySynthesis {
  const scenarios = generateRoleScenarios(job, fingerprint);
  const session = normalizeDiscoverySession(job.fitDiscovery);
  const responses = Object.values(session.responses).filter((response) => !response.markedRepetitive);
  const workContent = dimensionScore("WORK_CONTENT", "Work-content attraction", scenarios, responses);
  const workDesign = dimensionScore("WORK_DESIGN", "Work-design fit", scenarios, responses);
  const leadership = dimensionScore("LEADERSHIP_SOCIAL", "Leadership & social fit", scenarios, responses);
  const dimensions = [workContent, workDesign, leadership];
  const answeredCount = responses.length;
  const targetCount = scenarios.length;
  const completion = targetCount ? answeredCount / targetCount : 0;
  const answeredConfidence = responses.length
    ? responses.reduce((sum, response) => sum + CONFIDENCE_WEIGHT[response.confidence], 0) / responses.length
    : 0;
  const confidence = clamp(Math.round((completion * 0.55 + answeredConfidence * 0.45) * 100));
  const weightedDimensions = dimensions.filter((item) => item.confidence > 0);
  const score = weightedDimensions.length
    ? clamp(Math.round(weightedDimensions.reduce((sum, item) => sum + item.score * Math.max(0.35, item.confidence / 100), 0) / weightedDimensions.reduce((sum, item) => sum + Math.max(0.35, item.confidence / 100), 0)))
    : 50;

  const energizers = responses
    .filter((response) => responseValue(response) >= 0.75)
    .sort((left, right) => responseValue(right) - responseValue(left))
    .map((response) => facetDefinition(response.facet).label);
  const drains = responses
    .filter((response) => responseValue(response) <= -0.75)
    .sort((left, right) => responseValue(left) - responseValue(right))
    .map((response) => facetDefinition(response.facet).label);
  const conditions = uniqueStrings(responses.filter((response) => response.reaction === "DEPENDS").flatMap((response) => response.conditions));
  const preview = buildRoleRealityPreview(job, fingerprint);
  const unanswered = scenarios.filter((scenario) => !session.responses[scenario.id] && !session.skippedScenarioIds.includes(scenario.id));
  const unresolvedQuestions = uniqueStrings([
    ...session.unresolvedQuestions,
    ...preview.unknowns,
    ...unanswered.slice(0, 2).map((scenario) => `How would you react if ${scenario.title.toLowerCase()} were a recurring part of the job?`)
  ]).slice(0, 7);
  const contradictions = contradictionMessages(profile, responses);
  const nextQuestion = unanswered[0]?.title || unresolvedQuestions[0] || "Review the synthesis and decide what to validate through networking.";
  const primaryCondition = conditions[0];
  const primaryUnknown = unresolvedQuestions[0];
  const hypothesis = session.hypothesis || (primaryCondition
    ? `This opportunity may fit if ${primaryCondition.toLowerCase()} is favorable.`
    : primaryUnknown
      ? `This opportunity looks promising, but the decision depends on learning more about ${primaryUnknown.toLowerCase()}.`
      : energizers.length
        ? `This opportunity appears attractive because it offers ${energizers.slice(0, 2).join(" and ").toLowerCase()}.`
        : "The role needs more job-specific discovery before a confident interest judgment is possible.");

  return {
    score,
    confidence,
    status: session.status,
    answeredCount,
    targetCount,
    dimensions,
    energizers: uniqueStrings(energizers).slice(0, 6),
    drains: uniqueStrings(drains).slice(0, 6),
    conditions: conditions.slice(0, 8),
    unresolvedQuestions,
    contradictions,
    nextQuestion,
    hypothesis
  };
}

function confidenceNumber(value: ScenarioConfidence): number {
  return Math.round(CONFIDENCE_WEIGHT[value] * 100);
}

function evidenceForResponse(job: JobReq, scenario: RoleScenario, response: ScenarioResponse): PreferenceFacetEvidence {
  return {
    id: makeId("pref-evidence"),
    sourceType: "SCENARIO",
    sourceLabel: job.title,
    detail: response.reflection.trim() || `${scenario.title}: ${response.reaction.replace(/_/g, " ").toLowerCase()}.`,
    jobId: job.id,
    scenarioId: scenario.id,
    createdAt: response.answeredAt || new Date().toISOString()
  };
}

function mergePreferenceScore(existing: PreferenceFacet | undefined, incoming: number, confidence: number): number {
  if (!existing) return incoming;
  const existingWeight = Math.max(0.35, existing.confidence / 100);
  const incomingWeight = Math.max(0.25, confidence / 100);
  return (existing.preference * existingWeight + incoming * incomingWeight) / (existingWeight + incomingWeight);
}

export function integrateScenarioResponse(
  profile: UserProfile,
  job: JobReq,
  scenario: RoleScenario,
  response: ScenarioResponse
): UserProfile {
  if (response.markedRepetitive) return profile;
  const definition = facetDefinition(scenario.facet);
  const existing = profile.discoveryPreferences.find((item) => item.facet === scenario.facet);
  const rawValue = responseValue(response);
  const incomingPreference = scoreToPreference(rawValue);
  const confidence = confidenceNumber(response.confidence);
  const mergedPreference = scoreToPreference(mergePreferenceScore(existing, incomingPreference, confidence));
  const evidence = evidenceForResponse(job, scenario, response);
  const next: PreferenceFacet = {
    id: existing?.id || makeId("preference-facet"),
    facet: scenario.facet,
    label: definition.label,
    dimension: definition.dimension,
    preference: mergedPreference,
    confidence: existing ? clamp(Math.round(existing.confidence * 0.55 + confidence * 0.45)) : confidence,
    importance: existing?.importance || definition.defaultImportance,
    status: response.reaction === "DEPENDS" ? "CONDITIONAL" : response.confidence === "DIRECT_EXPERIENCE" ? "CONFIRMED" : existing?.status === "CONFIRMED" ? "CONFIRMED" : "TENTATIVE",
    conditions: uniqueStrings([...(existing?.conditions || []), ...response.conditions]),
    evidence: [...(existing?.evidence || []).filter((item) => item.scenarioId !== scenario.id || item.jobId !== job.id), evidence].slice(-10),
    updatedAt: new Date().toISOString()
  };

  const preferences = { ...profile.preferences };
  const broad = preferences[definition.dimension];
  if (broad && broad.source !== "MANUAL") {
    preferences[definition.dimension] = {
      ...broad,
      score: mergedPreference,
      source: "DISCOVERY",
      rationale: `Refined through ${next.evidence.filter((item) => item.sourceType === "SCENARIO").length} realistic job scenario${next.evidence.length === 1 ? "" : "s"}.`
    };
  }

  return {
    ...profile,
    preferences,
    discoveryPreferences: [...profile.discoveryPreferences.filter((item) => item.facet !== scenario.facet), next],
    updatedAt: new Date().toISOString()
  };
}

export function discoveryPreferenceSummary(profile: UserProfile): {
  energizers: PreferenceFacet[];
  conditional: PreferenceFacet[];
  drains: PreferenceFacet[];
  needsEvidence: PreferenceFacet[];
} {
  const sorted = [...profile.discoveryPreferences].sort((left, right) => right.importance - left.importance || right.confidence - left.confidence);
  return {
    energizers: sorted.filter((item) => item.preference >= 1 && item.status !== "CONDITIONAL").slice(0, 8),
    conditional: sorted.filter((item) => item.status === "CONDITIONAL").slice(0, 8),
    drains: sorted.filter((item) => item.preference <= -1 && item.status !== "CONDITIONAL").slice(0, 8),
    needsEvidence: sorted.filter((item) => item.confidence < 55 || item.status === "TENTATIVE").slice(0, 8)
  };
}

export function discoveryConfidenceLabel(value: number): Confidence {
  if (value >= 72) return "HIGH";
  if (value >= 42) return "MEDIUM";
  return "LOW";
}

export function scenarioCompletion(job: JobReq, fingerprint: JobFingerprint): { answered: number; total: number; percent: number } {
  const scenarios = generateRoleScenarios(job, fingerprint);
  const session = normalizeDiscoverySession(job.fitDiscovery);
  const answered = Object.values(session.responses).filter((response) => !response.markedRepetitive).length;
  const total = scenarios.length;
  return { answered, total, percent: total ? Math.round((answered / total) * 100) : 0 };
}

export function unansweredScenario(job: JobReq, fingerprint: JobFingerprint): RoleScenario | null {
  const scenarios = generateRoleScenarios(job, fingerprint);
  const session = normalizeDiscoverySession(job.fitDiscovery);
  return scenarios.find((scenario) => !session.responses[scenario.id] && !session.skippedScenarioIds.includes(scenario.id)) || null;
}
