import { facetDefinition } from "../data/discovery";
import type {
  DiscoveryFacet,
  PreferenceFacet,
  PreferenceFacetEvidence,
  PreferenceScore,
  ResumeAccomplishmentReflection,
  ResumeReflectionActivity,
  ResumeReflectionCandidate,
  ResumeReflectionCondition,
  ResumeReflectionDrain,
  ScenarioConfidence,
  ScenarioFrequency,
  UserProfile
} from "../types";
import { makeId, normalizeText, uniqueStrings } from "./text";

export const RESUME_ACTIVITY_OPTIONS: Array<{ id: ResumeReflectionActivity; label: string; detail: string }> = [
  { id: "UNDERSTAND_PROBLEM", label: "Understanding the problem", detail: "Diagnosing what was really happening before acting." },
  { id: "DEFINE_STRATEGY", label: "Defining the strategy", detail: "Setting direction and making choices." },
  { id: "ANALYZE_INFORMATION", label: "Analyzing information", detail: "Using data, models, or structured reasoning." },
  { id: "DESIGN_SOLUTION", label: "Designing the solution", detail: "Creating a process, model, product, or way of working." },
  { id: "INFLUENCE_LEADERS", label: "Influencing leaders", detail: "Changing a senior stakeholder's decision." },
  { id: "ALIGN_TEAMS", label: "Aligning teams", detail: "Resolving differences and building commitment across groups." },
  { id: "LEAD_PEOPLE", label: "Leading or developing people", detail: "Setting direction, coaching, or helping others grow." },
  { id: "EXECUTE_SOLUTION", label: "Executing the solution", detail: "Turning the idea into sustained delivery." },
  { id: "SEE_RESULT", label: "Seeing the measurable result", detail: "Owning a visible business or customer outcome." },
  { id: "RECEIVE_RECOGNITION", label: "Receiving recognition", detail: "Being acknowledged for the accomplishment." }
];

export const RESUME_CONDITION_OPTIONS: Array<{ id: ResumeReflectionCondition; label: string }> = [
  { id: "AMBIGUOUS_PROBLEM", label: "The problem was ambiguous" },
  { id: "AUTONOMY", label: "I had real autonomy" },
  { id: "STRONG_STAKEHOLDERS", label: "The people and stakeholders were strong" },
  { id: "BUILD_SOMETHING_NEW", label: "I could build something new" },
  { id: "VISIBLE_OUTCOME", label: "The outcome was visible" },
  { id: "DEVELOP_PEOPLE", label: "I was developing other people" },
  { id: "EXECUTIVE_EXPOSURE", label: "I had executive exposure" },
  { id: "VARIED_WORK", label: "The work was varied" }
];

export const RESUME_DRAIN_OPTIONS: Array<{ id: ResumeReflectionDrain; label: string }> = [
  { id: "RECURRING_ADMIN", label: "Recurring administration" },
  { id: "STATUS_MEETINGS", label: "Too many status meetings" },
  { id: "PERFORMANCE_MANAGEMENT", label: "Performance management" },
  { id: "PROJECT_TRACKING", label: "Detailed project tracking" },
  { id: "LIMITED_AUTHORITY", label: "Limited decision authority" },
  { id: "REPETITIVE_ANALYSIS", label: "Repetitive analysis" },
  { id: "POLITICAL_DYNAMICS", label: "Political stakeholder dynamics" },
  { id: "ACTIVITY_ITSELF", label: "The core activity itself" }
];

const ACTIVITY_FACETS: Record<ResumeReflectionActivity, DiscoveryFacet[]> = {
  UNDERSTAND_PROBLEM: ["STRATEGIC_FRAMING", "AMBIGUITY_NAVIGATION"],
  DEFINE_STRATEGY: ["STRATEGIC_FRAMING"],
  ANALYZE_INFORMATION: ["ANALYTICAL_PROBLEM_SOLVING"],
  DESIGN_SOLUTION: ["BUILDING_SYSTEMS"],
  INFLUENCE_LEADERS: ["EXECUTIVE_INFLUENCE"],
  ALIGN_TEAMS: ["PEER_ALIGNMENT", "INFLUENCE_WITHOUT_AUTHORITY"],
  LEAD_PEOPLE: ["SETTING_TEAM_DIRECTION", "COACHING_AND_DEVELOPMENT"],
  EXECUTE_SOLUTION: ["BUILDING_SYSTEMS", "RUNNING_CADENCE"],
  SEE_RESULT: ["BUSINESS_OWNERSHIP", "CUSTOMER_IMPACT"],
  RECEIVE_RECOGNITION: []
};

const CONDITION_FACETS: Record<ResumeReflectionCondition, DiscoveryFacet[]> = {
  AMBIGUOUS_PROBLEM: ["AMBIGUITY_NAVIGATION"],
  AUTONOMY: ["AUTONOMY_AND_AUTHORITY"],
  STRONG_STAKEHOLDERS: ["PEER_ALIGNMENT"],
  BUILD_SOMETHING_NEW: ["BUILDING_SYSTEMS"],
  VISIBLE_OUTCOME: ["BUSINESS_OWNERSHIP"],
  DEVELOP_PEOPLE: ["COACHING_AND_DEVELOPMENT"],
  EXECUTIVE_EXPOSURE: ["EXECUTIVE_INFLUENCE"],
  VARIED_WORK: ["WORK_VARIETY"]
};

const DRAIN_FACETS: Record<Exclude<ResumeReflectionDrain, "ACTIVITY_ITSELF">, DiscoveryFacet[]> = {
  RECURRING_ADMIN: ["RUNNING_CADENCE", "PEOPLE_ADMINISTRATION"],
  STATUS_MEETINGS: ["RUNNING_CADENCE", "ORGANIZATIONAL_COMMUNICATION"],
  PERFORMANCE_MANAGEMENT: ["PERFORMANCE_MANAGEMENT"],
  PROJECT_TRACKING: ["RUNNING_CADENCE"],
  LIMITED_AUTHORITY: ["AUTONOMY_AND_AUTHORITY"],
  REPETITIVE_ANALYSIS: ["ANALYTICAL_PROBLEM_SOLVING"],
  POLITICAL_DYNAMICS: ["PEER_ALIGNMENT", "EXECUTIVE_INFLUENCE"]
};

const CONFIDENCE_SCORE: Record<ScenarioConfidence, number> = {
  DIRECT_EXPERIENCE: 92,
  RELATED_EXPERIENCE: 74,
  ESTIMATE: 52,
  UNSURE: 28
};

const FREQUENCY_PREFERENCE: Record<ScenarioFrequency, PreferenceScore> = {
  MAJOR: 2,
  RECURRING: 1,
  OCCASIONAL: 0,
  NECESSARY_ONLY: -1,
  NOT_IDEAL: -2
};

function stableCandidateId(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `resume-accomplishment-${(hash >>> 0).toString(36)}`;
}

function isUsefulEvidence(value: string): boolean {
  const clean = value.trim();
  if (clean.length < 35) return false;
  const normalized = normalizeText(clean);
  return ![
    "added and confirmed manually",
    "imported from the previous reqradar skills list"
  ].some((phrase) => normalized.includes(phrase));
}

export function buildResumeReflectionCandidates(profile: UserProfile): ResumeReflectionCandidate[] {
  const grouped = new Map<string, ResumeReflectionCandidate & { confirmedCount: number }>();
  profile.skills.filter((skill) => !skill.excluded).forEach((skill) => {
    skill.evidence.forEach((evidence) => {
      if (!isUsefulEvidence(evidence.text)) return;
      const key = normalizeText(evidence.text);
      const existing = grouped.get(key) || {
        id: stableCandidateId(key),
        evidenceText: evidence.text.trim(),
        sourceLabel: evidence.source || "Resume",
        capabilityNames: [],
        evidenceIds: [],
        confirmedCount: 0
      };
      existing.capabilityNames = uniqueStrings([...existing.capabilityNames, skill.name]);
      existing.evidenceIds = uniqueStrings([...existing.evidenceIds, evidence.id]);
      if (skill.confirmed) existing.confirmedCount += 1;
      grouped.set(key, existing);
    });
  });

  const reflected = new Set((profile.resumeReflections || []).map((item) => item.candidateId));
  return [...grouped.values()]
    .sort((left, right) => {
      const leftDone = reflected.has(left.id) ? 1 : 0;
      const rightDone = reflected.has(right.id) ? 1 : 0;
      if (leftDone !== rightDone) return leftDone - rightDone;
      return right.confirmedCount - left.confirmedCount || right.capabilityNames.length - left.capabilityNames.length || right.evidenceText.length - left.evidenceText.length;
    })
    .map(({ confirmedCount: _confirmedCount, ...candidate }) => candidate)
    .slice(0, 12);
}

function averagePreference(values: PreferenceScore[]): PreferenceScore {
  if (!values.length) return 0;
  const average = values.reduce<number>((sum, value) => sum + value, 0) / values.length;
  if (average >= 1.5) return 2;
  if (average >= 0.5) return 1;
  if (average <= -1.5) return -2;
  if (average <= -0.5) return -1;
  return 0;
}

function preferenceFrequency(value: PreferenceScore): ScenarioFrequency {
  if (value === 2) return "MAJOR";
  if (value === 1) return "RECURRING";
  if (value === -1) return "NECESSARY_ONLY";
  if (value === -2) return "NOT_IDEAL";
  return "OCCASIONAL";
}

interface FacetContribution {
  reflection: ResumeAccomplishmentReflection;
  score: PreferenceScore;
  conditions: string[];
  detail: string;
}

function addContribution(map: Map<DiscoveryFacet, FacetContribution[]>, facet: DiscoveryFacet, contribution: FacetContribution): void {
  map.set(facet, [...(map.get(facet) || []), contribution]);
}

function reflectionContributions(reflection: ResumeAccomplishmentReflection): Map<DiscoveryFacet, FacetContribution[]> {
  const map = new Map<DiscoveryFacet, FacetContribution[]>();
  const desired = FREQUENCY_PREFERENCE[reflection.desiredFrequency];
  const activityScore: PreferenceScore = desired === -2 ? -2 : desired === -1 ? -1 : desired === 0 ? 1 : desired;

  reflection.enjoyedActivities.forEach((activity) => {
    ACTIVITY_FACETS[activity].forEach((facet) => addContribution(map, facet, {
      reflection,
      score: activityScore,
      conditions: [],
      detail: `The applicant selected “${RESUME_ACTIVITY_OPTIONS.find((item) => item.id === activity)?.label || activity}” as an enjoyable part of this accomplishment.`
    }));
  });

  reflection.energizingConditions.forEach((condition) => {
    const label = RESUME_CONDITION_OPTIONS.find((item) => item.id === condition)?.label || condition;
    CONDITION_FACETS[condition].forEach((facet) => addContribution(map, facet, {
      reflection,
      score: 1,
      conditions: [label],
      detail: `This experience was more attractive because ${label.toLowerCase()}.`
    }));
  });

  reflection.drains.forEach((drain) => {
    const label = RESUME_DRAIN_OPTIONS.find((item) => item.id === drain)?.label || drain;
    const facets = drain === "ACTIVITY_ITSELF"
      ? uniqueStrings(reflection.enjoyedActivities.flatMap((activity) => ACTIVITY_FACETS[activity])) as DiscoveryFacet[]
      : DRAIN_FACETS[drain];
    facets.forEach((facet) => addContribution(map, facet, {
      reflection,
      score: drain === "ACTIVITY_ITSELF" ? -2 : -1,
      conditions: [label],
      detail: `The applicant would prefer less of this work when it includes ${label.toLowerCase()}.`
    }));
  });

  return map;
}

function rebuildResumeReflectionPreferences(profile: UserProfile, reflections: ResumeAccomplishmentReflection[]): UserProfile {
  const contributions = new Map<DiscoveryFacet, FacetContribution[]>();
  reflections.forEach((reflection) => {
    reflectionContributions(reflection).forEach((items, facet) => {
      contributions.set(facet, [...(contributions.get(facet) || []), ...items]);
    });
  });

  const now = new Date().toISOString();
  const cleaned = profile.discoveryPreferences
    .map((preference) => ({
      ...preference,
      evidence: preference.evidence.filter((item) => item.sourceType !== "RESUME_REFLECTION")
    }))
    .filter((preference) => preference.evidence.length > 0);
  const byFacet = new Map(cleaned.map((item) => [item.facet, item]));

  contributions.forEach((items, facet) => {
    const definition = facetDefinition(facet);
    const existing = byFacet.get(facet);
    const values = items.map((item) => item.score);
    const resumePreference = averagePreference(values);
    const confidence = Math.round(items.reduce((sum, item) => sum + CONFIDENCE_SCORE[item.reflection.confidence], 0) / Math.max(1, items.length));
    const existingHasStrongerSource = Boolean(existing?.evidence.some((item) => item.sourceType === "GENERAL_THEME" || item.sourceType === "MANUAL"));
    const conditions = uniqueStrings([...(existing?.conditions || []), ...items.flatMap((item) => item.conditions)]);
    const resumeEvidence: PreferenceFacetEvidence[] = items.map((item) => ({
      id: makeId("resume-preference-evidence"),
      sourceType: "RESUME_REFLECTION",
      sourceLabel: `Resume reflection · ${item.reflection.sourceLabel || "Experience"}`,
      detail: `${item.reflection.accomplishment}\n${item.detail}${item.reflection.reflection ? `\nReflection: ${item.reflection.reflection}` : ""}`,
      resumeReflectionId: item.reflection.id,
      createdAt: item.reflection.completedAt || now
    }));
    const preference = existingHasStrongerSource ? existing!.preference : resumePreference;
    const next: PreferenceFacet = {
      id: existing?.id || makeId("preference-facet"),
      facet,
      label: existing?.label || definition.label,
      dimension: existing?.dimension || definition.dimension,
      preference,
      confidence: existingHasStrongerSource ? Math.max(existing!.confidence, Math.round((existing!.confidence + confidence) / 2)) : confidence,
      importance: existing?.importance || definition.defaultImportance,
      status: conditions.length ? "CONDITIONAL" : items.every((item) => item.reflection.confidence === "DIRECT_EXPERIENCE") ? "CONFIRMED" : existing?.status || "TENTATIVE",
      conditions,
      evidence: [...(existing?.evidence || []), ...resumeEvidence].slice(-18),
      preferredFrequency: existingHasStrongerSource ? existing!.preferredFrequency : preferenceFrequency(resumePreference),
      updatedAt: now
    };
    byFacet.set(facet, next);
  });

  const discoveryPreferences = [...byFacet.values()];
  const preferences = { ...profile.preferences };
  const byDimension = new Map<string, PreferenceFacet[]>();
  discoveryPreferences.forEach((item) => byDimension.set(item.dimension, [...(byDimension.get(item.dimension) || []), item]));
  byDimension.forEach((items, dimension) => {
    const key = dimension as keyof typeof preferences;
    const current = preferences[key];
    if (!current || current.source === "MANUAL") return;
    const weighted = items.filter((item) => item.evidence.some((evidence) => evidence.sourceType === "RESUME_REFLECTION"));
    if (!weighted.length) return;
    preferences[key] = {
      ...current,
      score: averagePreference(weighted.map((item) => item.preference)),
      source: "DISCOVERY",
      rationale: `Inferred from ${reflections.length} reflection${reflections.length === 1 ? "" : "s"} on real resume accomplishments.`
    };
  });

  return {
    ...profile,
    preferences,
    discoveryPreferences,
    resumeReflections: reflections,
    updatedAt: now
  };
}

export function saveResumeReflection(profile: UserProfile, reflection: ResumeAccomplishmentReflection): UserProfile {
  const reflections = [
    ...(profile.resumeReflections || []).filter((item) => item.candidateId !== reflection.candidateId),
    reflection
  ];
  return rebuildResumeReflectionPreferences(profile, reflections);
}

export function removeResumeReflection(profile: UserProfile, candidateId: string): UserProfile {
  return rebuildResumeReflectionPreferences(profile, (profile.resumeReflections || []).filter((item) => item.candidateId !== candidateId));
}

export function createResumeReflection(candidate: ResumeReflectionCandidate): ResumeAccomplishmentReflection {
  return {
    id: makeId("resume-reflection"),
    candidateId: candidate.id,
    accomplishment: candidate.evidenceText,
    sourceLabel: candidate.sourceLabel,
    capabilityNames: candidate.capabilityNames,
    enjoyedActivities: [],
    desiredFrequency: "RECURRING",
    energizingConditions: [],
    drains: [],
    confidence: "DIRECT_EXPERIENCE",
    reflection: "",
    completedAt: ""
  };
}
