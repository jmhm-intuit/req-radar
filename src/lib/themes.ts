import { DISCOVERY_FACETS, FREQUENCY_SCORE, REACTION_SCORE, facetDefinition, scoreToPreference } from "../data/discovery";
import type {
  DiscoveryFacet,
  JobAssessment,
  JobFingerprint,
  JobReq,
  PortfolioThemeAlignment,
  PortfolioThemeInsight,
  PreferenceFacet,
  PreferenceFacetEvidence,
  PreferenceScore,
  ScenarioConfidence,
  ScenarioFrequency,
  ThemeDiscoveryResponse,
  UserProfile,
  RoleScenario
} from "../types";
import { generateRoleScenarios } from "./discovery";
import { clamp, makeId, uniqueStrings } from "./text";

const CONFIDENCE_VALUE: Record<ScenarioConfidence, number> = {
  DIRECT_EXPERIENCE: 92,
  RELATED_EXPERIENCE: 76,
  ESTIMATE: 54,
  UNSURE: 28
};

export function preferenceToInterestScore(value: PreferenceScore): number {
  if (value === 2) return 94;
  if (value === 1) return 74;
  if (value === -1) return 30;
  if (value === -2) return 10;
  return 50;
}

export function defaultFrequencyForPreference(value: PreferenceScore): ScenarioFrequency {
  if (value === 2) return "MAJOR";
  if (value === 1) return "RECURRING";
  if (value === -1) return "NECESSARY_ONLY";
  if (value === -2) return "NOT_IDEAL";
  return "OCCASIONAL";
}

function hasGeneralThemeEvidence(preference: PreferenceFacet | undefined): boolean {
  return Boolean(preference?.evidence.some((item) => item.sourceType === "GENERAL_THEME" || item.sourceType === "MANUAL"));
}

function sourceConfidence(preference: PreferenceFacet | undefined, profile: UserProfile, facet: DiscoveryFacet): number {
  if (preference) {
    const generalEvidence = hasGeneralThemeEvidence(preference);
    return generalEvidence ? preference.confidence : Math.min(55, preference.confidence || 35);
  }
  const broad = profile.preferences[facetDefinition(facet).dimension];
  if (broad.source === "MANUAL") return 65;
  if (broad.source === "INTERVIEW") return 45;
  if (broad.source === "DISCOVERY") return 40;
  return 24;
}

function effectivePreference(profile: UserProfile, facet: DiscoveryFacet): PreferenceScore {
  const specific = profile.discoveryPreferences.find((item) => item.facet === facet);
  if (specific) return specific.preference;
  return profile.preferences[facetDefinition(facet).dimension]?.score ?? 0;
}

export function buildPortfolioThemeInsights(
  jobs: JobReq[],
  assessments: Map<string, JobAssessment>,
  profile: UserProfile
): PortfolioThemeInsight[] {
  const buckets = new Map<DiscoveryFacet, {
    jobIds: Set<string>;
    responsibilities: string[];
  }>();

  jobs.forEach((job) => {
    const assessment = assessments.get(job.id);
    if (!assessment) return;
    const scenarios = generateRoleScenarios(job, assessment.fingerprint);
    const facetsInJob = new Set<DiscoveryFacet>();
    scenarios.forEach((scenario) => {
      if (facetsInJob.has(scenario.facet)) return;
      facetsInJob.add(scenario.facet);
      const current = buckets.get(scenario.facet) || { jobIds: new Set<string>(), responsibilities: [] };
      current.jobIds.add(job.id);
      current.responsibilities.push(scenario.responsibility, ...scenario.evidence.slice(0, 1));
      buckets.set(scenario.facet, current);
    });
  });

  return DISCOVERY_FACETS.flatMap((definition) => {
    const bucket = buckets.get(definition.id);
    if (!bucket?.jobIds.size) return [];
    const specific = profile.discoveryPreferences.find((item) => item.facet === definition.id);
    const preference = effectivePreference(profile, definition.id);
    const confidence = sourceConfidence(specific, profile, definition.id);
    const roleCount = bucket.jobIds.size;
    const generalEvidence = hasGeneralThemeEvidence(specific);
    return [{
      facet: definition.id,
      label: definition.label,
      shortLabel: definition.shortLabel,
      family: definition.family,
      description: definition.description,
      roleCount,
      jobIds: [...bucket.jobIds],
      representativeResponsibilities: uniqueStrings(bucket.responsibilities.map((item) => item.replace(/\s+/g, " ").trim()).filter((item) => item.length > 25)).slice(0, 4),
      preference,
      confidence,
      status: generalEvidence ? (specific?.status || "TENTATIVE") : "TENTATIVE",
      conditions: specific?.conditions || [],
      preferredFrequency: specific?.preferredFrequency || defaultFrequencyForPreference(preference),
      alignmentScore: preferenceToInterestScore(preference),
      needsDiscovery: !generalEvidence || confidence < 60
    } satisfies PortfolioThemeInsight];
  }).sort((left, right) => {
    if (left.needsDiscovery !== right.needsDiscovery) return left.needsDiscovery ? -1 : 1;
    const leftWeight = left.roleCount * facetDefinition(left.facet).defaultImportance;
    const rightWeight = right.roleCount * facetDefinition(right.facet).defaultImportance;
    return rightWeight - leftWeight || right.confidence - left.confidence;
  });
}

export function portfolioThemeAlignment(insights: PortfolioThemeInsight[]): PortfolioThemeAlignment {
  if (!insights.length) return { score: 50, confidence: 0, assessedThemes: 0, totalThemes: 0 };
  let weightedScore = 0;
  let weightedConfidence = 0;
  let totalWeight = 0;
  insights.forEach((theme) => {
    const importance = facetDefinition(theme.facet).defaultImportance;
    const weight = Math.max(1, theme.roleCount) * importance;
    weightedScore += theme.alignmentScore * weight;
    weightedConfidence += theme.confidence * weight;
    totalWeight += weight;
  });
  return {
    score: clamp(Math.round(weightedScore / Math.max(1, totalWeight))),
    confidence: clamp(Math.round(weightedConfidence / Math.max(1, totalWeight))),
    assessedThemes: insights.filter((item) => !item.needsDiscovery).length,
    totalThemes: insights.length
  };
}

function responsePreference(response: ThemeDiscoveryResponse): PreferenceScore {
  const reaction = REACTION_SCORE[response.reaction];
  const frequency = FREQUENCY_SCORE[response.preferredFrequency];
  return scoreToPreference(reaction * 0.78 + frequency * 0.22);
}

export function applyGeneralThemeResponse(
  profile: UserProfile,
  insight: PortfolioThemeInsight,
  response: ThemeDiscoveryResponse
): UserProfile {
  const now = new Date().toISOString();
  const definition = facetDefinition(insight.facet);
  const existing = profile.discoveryPreferences.find((item) => item.facet === insight.facet);
  const preference = responsePreference(response);
  const confidence = CONFIDENCE_VALUE[response.confidence];
  const evidence: PreferenceFacetEvidence = {
    id: makeId("theme-evidence"),
    sourceType: "GENERAL_THEME",
    sourceLabel: `General Theme Discovery · ${insight.roleCount} role${insight.roleCount === 1 ? "" : "s"}`,
    detail: response.reflection.trim() || `${insight.label}: ${response.reaction.replace(/_/g, " ").toLowerCase()} when this is a common responsibility.`,
    createdAt: now
  };
  const next: PreferenceFacet = {
    id: existing?.id || makeId("preference-facet"),
    facet: insight.facet,
    label: definition.label,
    dimension: definition.dimension,
    preference,
    confidence,
    importance: existing?.importance || definition.defaultImportance,
    status: response.reaction === "DEPENDS" ? "CONDITIONAL" : response.confidence === "DIRECT_EXPERIENCE" ? "CONFIRMED" : "TENTATIVE",
    conditions: uniqueStrings([...(existing?.conditions || []), ...response.conditions]),
    evidence: [
      ...(existing?.evidence || []).filter((item) => item.sourceType !== "GENERAL_THEME"),
      evidence
    ].slice(-12),
    preferredFrequency: response.preferredFrequency,
    updatedAt: now
  };

  const preferences = { ...profile.preferences };
  const broad = preferences[definition.dimension];
  if (broad && broad.source !== "MANUAL") {
    preferences[definition.dimension] = {
      ...broad,
      score: preference,
      source: "DISCOVERY",
      rationale: `Validated in General Theme Discovery across ${insight.roleCount} current opportunit${insight.roleCount === 1 ? "y" : "ies"}.`
    };
  }

  return {
    ...profile,
    preferences,
    discoveryPreferences: [
      ...profile.discoveryPreferences.filter((item) => item.facet !== insight.facet),
      next
    ],
    updatedAt: now
  };
}

export function generalThemeInterestForJob(
  job: JobReq,
  fingerprint: JobFingerprint,
  profile: UserProfile,
  preparedScenarios?: RoleScenario[]
): { score: number; confidence: number; facets: DiscoveryFacet[] } {
  const scenarios = preparedScenarios || generateRoleScenarios(job, fingerprint);
  const facets = uniqueStrings(scenarios.map((item) => item.facet)) as DiscoveryFacet[];
  if (!facets.length) return { score: 50, confidence: 10, facets: [] };
  let weightedScore = 0;
  let weightedConfidence = 0;
  let totalWeight = 0;
  facets.forEach((facet) => {
    const definition = facetDefinition(facet);
    const preference = effectivePreference(profile, facet);
    const specific = profile.discoveryPreferences.find((item) => item.facet === facet);
    const confidence = sourceConfidence(specific, profile, facet);
    const weight = definition.defaultImportance;
    weightedScore += preferenceToInterestScore(preference) * weight;
    weightedConfidence += confidence * weight;
    totalWeight += weight;
  });
  return {
    score: clamp(Math.round(weightedScore / Math.max(1, totalWeight))),
    confidence: clamp(Math.round(weightedConfidence / Math.max(1, totalWeight))),
    facets
  };
}
