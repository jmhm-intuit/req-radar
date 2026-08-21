import type { JobReq, UserProfile } from "../types";

function stable(value: unknown): string {
  return JSON.stringify(value, Object.keys(value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}).sort());
}

function compactHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function jobAnalysisSignature(job: JobReq): string {
  return compactHash(JSON.stringify({
    engineVersion: "3.2.0",
    title: job.title,
    normalizedTitle: job.normalizedTitle,
    category: job.category,
    team: job.team,
    locations: job.locations,
    datePosted: job.datePosted,
    seniority: job.seniority,
    minYears: job.minYears,
    descriptionText: job.descriptionText,
    responsibilities: job.responsibilities,
    qualifications: job.qualifications,
    skills: job.skills,
    skillOverrides: job.skillOverrides,
    ageOverride: job.ageOverride,
    verifiedActiveAt: job.verifiedActiveAt,
    manualAdjustment: job.manualAdjustment,
    manualPriority: job.manualPriority,
    recommendationOverride: job.recommendationOverride,
    interestAdjustment: job.interestAdjustment,
    groupOverride: job.groupOverride,
    focusBucketOverride: job.focusBucketOverride,
    networkingStage: job.networkingStage,
    fitDiscovery: {
      status: job.fitDiscovery.status,
      responses: job.fitDiscovery.responses,
      skippedScenarioIds: job.fitDiscovery.skippedScenarioIds,
      networkingOutcome: job.fitDiscovery.networkingOutcome,
      interestChange: job.fitDiscovery.interestChange
    }
  }));
}

export function profileAnalysisSignature(profile: UserProfile): string {
  return compactHash(JSON.stringify({
    engineVersion: "3.2.0",
    skills: profile.skills.map((skill) => ({
      name: skill.normalizedName,
      proficiency: skill.proficiency,
      confidence: skill.confidence,
      confirmed: skill.confirmed,
      excluded: skill.excluded,
      evidenceCount: skill.evidence.length
    })),
    preferences: Object.values(profile.preferences).map((item) => ({
      dimension: item.dimension,
      score: item.score,
      importance: item.importance,
      source: item.source
    })),
    discoveryPreferences: profile.discoveryPreferences.map((item) => ({
      facet: item.facet,
      preference: item.preference,
      confidence: item.confidence,
      importance: item.importance,
      status: item.status,
      conditions: item.conditions,
      preferredFrequency: item.preferredFrequency,
      evidence: item.evidence.map((evidence) => ({ sourceType: evidence.sourceType, detail: evidence.detail }))
    })),
    careerDirections: profile.careerDirections
  }));
}

export function workflowSignature(job: JobReq): string {
  return compactHash(stable({
    status: job.status,
    pinned: job.pinned,
    actionStage: job.actionStage,
    notes: job.notes,
    networkingContact: job.networkingContact,
    networkingNotes: job.networkingNotes,
    jobUrl: job.jobUrl
  }));
}
