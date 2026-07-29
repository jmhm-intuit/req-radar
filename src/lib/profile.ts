import {
  DEFAULT_PREFERENCES,
  INTERVIEW_QUESTIONS,
  SKILL_TAXONOMY,
  THEME_DEFINITIONS
} from "../data/ontology";
import type {
  CareerDirection,
  CareerPreference,
  Confidence,
  InterestDimension,
  PeakExperience,
  PreferenceScore,
  ProfileSkill,
  SkillProficiency,
  UserProfile
} from "../types";
import {
  containsPhrase,
  evidenceForPhrases,
  makeId,
  normalizeText,
  phraseCount,
  topCounts,
  uniqueStrings
} from "./text";

export function createDefaultProfile(): UserProfile {
  return {
    resumeFileName: "",
    resumeText: "",
    skills: [],
    preferences: structuredCloneSafe(DEFAULT_PREFERENCES),
    interviewAnswers: {},
    peakExperiences: [],
    careerDirections: [
      {
        id: makeId("direction"),
        label: "AI Transformation Leader",
        keywords: ["AI", "artificial intelligence", "transformation", "adoption", "operating model"],
        priority: 3
      },
      {
        id: makeId("direction"),
        label: "Enterprise Business Operations Leader",
        keywords: ["business operations", "strategy", "operating model", "executive influence", "planning"],
        priority: 2
      },
      {
        id: makeId("direction"),
        label: "People Leader in Strategy & Operations",
        keywords: ["people leadership", "team", "strategy", "transformation", "operations"],
        priority: 2
      }
    ],
    profileNotes: "",
    updatedAt: ""
  };
}

function structuredCloneSafe<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

function confidenceFromEvidence(count: number): Confidence {
  if (count >= 3) return "HIGH";
  if (count >= 1) return "MEDIUM";
  return "LOW";
}

function proficiencyFromEvidence(count: number, source: string): SkillProficiency {
  const seniorSignals = phraseCount(source, ["principal", "director", "head of", "vice president", "led", "owned", "built", "drove"]);
  if (count >= 4 || (count >= 2 && seniorSignals >= 2)) return "EXPERT";
  if (count >= 2 || seniorSignals >= 2) return "ADVANCED";
  if (count === 1) return "INTERMEDIATE";
  return "FOUNDATIONAL";
}

export function extractProfileSkills(resumeText: string, existing: ProfileSkill[] = []): ProfileSkill[] {
  const extracted = SKILL_TAXONOMY.flatMap((definition) => {
    const count = phraseCount(resumeText, definition.aliases);
    if (!count) return [];
    const evidence = evidenceForPhrases(resumeText, definition.aliases, 4).map((text) => ({
      id: makeId("evidence"),
      text,
      source: "Resume"
    }));
    const existingSkill = existing.find((skill) => normalizeText(skill.name) === normalizeText(definition.name));
    return [{
      id: existingSkill?.id || makeId("skill"),
      name: definition.name,
      normalizedName: normalizeText(definition.name),
      category: definition.category,
      proficiency: existingSkill?.proficiency || proficiencyFromEvidence(count, resumeText),
      confidence: existingSkill?.confidence || confidenceFromEvidence(evidence.length),
      evidence: evidence.length ? evidence : existingSkill?.evidence || [],
      source: "RESUME" as const,
      confirmed: existingSkill?.confirmed || false,
      excluded: existingSkill?.excluded || false
    }];
  });

  const manual = existing.filter((skill) => skill.source !== "RESUME" || !extracted.some((item) => item.normalizedName === skill.normalizedName));
  return [...extracted, ...manual].sort((left, right) => {
    if (left.excluded !== right.excluded) return left.excluded ? 1 : -1;
    if (left.confirmed !== right.confirmed) return left.confirmed ? -1 : 1;
    return left.name.localeCompare(right.name);
  });
}

export function addManualSkill(profile: UserProfile, name: string): UserProfile {
  const clean = name.trim();
  if (!clean) return profile;
  const definition = SKILL_TAXONOMY.find((item) => normalizeText(item.name) === normalizeText(clean));
  if (profile.skills.some((skill) => normalizeText(skill.name) === normalizeText(clean))) return profile;
  const skill: ProfileSkill = {
    id: makeId("skill"),
    name: definition?.name || clean,
    normalizedName: normalizeText(definition?.name || clean),
    category: definition?.category || "OTHER",
    proficiency: "ADVANCED",
    confidence: "HIGH",
    evidence: [{ id: makeId("evidence"), text: "Added and confirmed manually.", source: "Manual" }],
    source: "MANUAL",
    confirmed: true,
    excluded: false
  };
  return { ...profile, skills: [...profile.skills, skill], updatedAt: new Date().toISOString() };
}

export function extractThemes(value: string, limit = 8): string[] {
  return THEME_DEFINITIONS
    .map((theme) => ({ label: theme.label, count: phraseCount(value, theme.patterns) }))
    .filter((item) => item.count > 0)
    .sort((left, right) => right.count - left.count)
    .slice(0, limit)
    .map((item) => item.label);
}

export function refreshPeakExperience(experience: PeakExperience): PeakExperience {
  const detectedThemes = extractThemes(`${experience.title}\n${experience.description}`, 7);
  return {
    ...experience,
    detectedThemes,
    confirmedThemes: uniqueStrings([
      ...experience.confirmedThemes.filter((theme) => detectedThemes.includes(theme)),
      ...detectedThemes.filter((theme) => experience.confirmedThemes.includes(theme))
    ])
  };
}

export function createPeakExperience(): PeakExperience {
  return {
    id: makeId("peak"),
    title: "",
    description: "",
    detectedThemes: [],
    confirmedThemes: []
  };
}

function choosePreferenceScore(values: PreferenceScore[]): PreferenceScore {
  if (!values.length) return 0;
  const average = values.reduce<number>((sum, value) => sum + value, 0) / values.length;
  if (average >= 1.5) return 2;
  if (average >= 0.5) return 1;
  if (average <= -1.5) return -2;
  if (average <= -0.5) return -1;
  return 0;
}

export function applyInterviewAnswers(
  profile: UserProfile,
  answers: Record<string, string>
): UserProfile {
  const impacts = new Map<InterestDimension, PreferenceScore[]>();
  INTERVIEW_QUESTIONS.forEach((question) => {
    const choice = question.choices.find((item) => item.id === answers[question.id]);
    if (!choice) return;
    Object.entries(choice.impacts).forEach(([dimension, score]) => {
      if (typeof score !== "number") return;
      const key = dimension as InterestDimension;
      impacts.set(key, [...(impacts.get(key) || []), score]);
    });
  });

  const preferences = { ...profile.preferences };
  impacts.forEach((scores, dimension) => {
    const previous = preferences[dimension] || DEFAULT_PREFERENCES[dimension];
    preferences[dimension] = {
      ...previous,
      score: choosePreferenceScore(scores),
      source: "INTERVIEW",
      rationale: `Based on ${scores.length} guided career choice${scores.length === 1 ? "" : "s"}.`
    };
  });

  return {
    ...profile,
    interviewAnswers: { ...answers },
    preferences,
    updatedAt: new Date().toISOString()
  };
}

export function updatePreference(
  profile: UserProfile,
  dimension: InterestDimension,
  changes: Partial<CareerPreference>
): UserProfile {
  return {
    ...profile,
    preferences: {
      ...profile.preferences,
      [dimension]: {
        ...profile.preferences[dimension],
        ...changes,
        dimension,
        source: "MANUAL"
      }
    },
    updatedAt: new Date().toISOString()
  };
}

export function profileThemes(profile: UserProfile): Array<{ label: string; count: number }> {
  const sources = [
    ...extractThemes(profile.resumeText, 12),
    ...profile.peakExperiences.flatMap((item) => item.confirmedThemes.length ? item.confirmedThemes : item.detectedThemes),
    ...profile.careerDirections.flatMap((direction) => direction.keywords)
  ];
  return topCounts(sources, 10);
}

export function profileReadiness(profile: UserProfile): {
  score: number;
  label: string;
  steps: Array<{ label: string; complete: boolean }>;
} {
  const steps = [
    { label: "Resume uploaded", complete: Boolean(profile.resumeText.trim()) },
    { label: "At least 8 skills detected", complete: profile.skills.filter((skill) => !skill.excluded).length >= 8 },
    { label: "Skills reviewed", complete: profile.skills.filter((skill) => !skill.excluded).some((skill) => skill.confirmed) },
    { label: "Interest interview completed", complete: Object.keys(profile.interviewAnswers).length >= Math.ceil(INTERVIEW_QUESTIONS.length * 0.7) },
    { label: "Peak experience captured", complete: profile.peakExperiences.some((item) => item.description.trim().length >= 40) },
    { label: "Career direction defined", complete: profile.careerDirections.some((item) => item.label.trim()) }
  ];
  const score = Math.round((steps.filter((step) => step.complete).length / steps.length) * 100);
  return { score, label: score >= 85 ? "Ready" : score >= 55 ? "Developing" : "Needs setup", steps };
}

export function normalizeLegacyProfile(value: unknown): UserProfile {
  const fallback = createDefaultProfile();
  if (!value || typeof value !== "object") return fallback;
  const profile = value as Record<string, unknown>;
  const resumeFileName = typeof profile.resumeFileName === "string" ? profile.resumeFileName : "";
  const resumeText = typeof profile.resumeText === "string" ? profile.resumeText : "";

  let skills: ProfileSkill[] = [];
  if (Array.isArray(profile.skills)) {
    if (profile.skills.every((item) => typeof item === "string")) {
      skills = (profile.skills as string[]).map((name) => {
        const definition = SKILL_TAXONOMY.find((item) => normalizeText(item.name) === normalizeText(name));
        return {
          id: makeId("skill"),
          name: definition?.name || name,
          normalizedName: normalizeText(definition?.name || name),
          category: definition?.category || "OTHER",
          proficiency: "ADVANCED",
          confidence: "MEDIUM",
          evidence: [{ id: makeId("evidence"), text: "Imported from the previous ReqRadar skills list.", source: "Legacy profile" }],
          source: "LEGACY",
          confirmed: true,
          excluded: false
        } satisfies ProfileSkill;
      });
    } else {
      skills = (profile.skills as unknown[]).flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const raw = item as Partial<ProfileSkill>;
        if (typeof raw.name !== "string") return [];
        return [{
          id: typeof raw.id === "string" ? raw.id : makeId("skill"),
          name: raw.name,
          normalizedName: typeof raw.normalizedName === "string" ? raw.normalizedName : normalizeText(raw.name),
          category: raw.category || "OTHER",
          proficiency: raw.proficiency || "INTERMEDIATE",
          confidence: raw.confidence || "MEDIUM",
          evidence: Array.isArray(raw.evidence) ? raw.evidence.filter((entry): entry is ProfileSkill["evidence"][number] => Boolean(entry && typeof entry.text === "string")) : [],
          source: raw.source || "MANUAL",
          confirmed: raw.confirmed === true,
          excluded: raw.excluded === true
        }];
      });
    }
  }

  const preferences = structuredCloneSafe(DEFAULT_PREFERENCES);
  if (profile.preferences && typeof profile.preferences === "object") {
    Object.entries(profile.preferences as Record<string, unknown>).forEach(([key, value]) => {
      if (!(key in preferences) || !value || typeof value !== "object") return;
      const current = preferences[key as InterestDimension];
      const raw = value as Partial<CareerPreference>;
      preferences[key as InterestDimension] = {
        ...current,
        ...raw,
        dimension: key as InterestDimension
      };
    });
  } else {
    const interests = Array.isArray(profile.interests) ? profile.interests.filter((item): item is string => typeof item === "string") : [];
    const avoid = Array.isArray(profile.avoid) ? profile.avoid.filter((item): item is string => typeof item === "string") : [];
    if (interests.some((item) => containsPhrase(item, "people leadership"))) preferences.PEOPLE_LEADERSHIP = { ...preferences.PEOPLE_LEADERSHIP, score: 2 };
    if (interests.some((item) => containsPhrase(item, "strategy"))) preferences.STRATEGY = { ...preferences.STRATEGY, score: 2 };
    if (interests.some((item) => containsPhrase(item, "transformation"))) preferences.TRANSFORMATION = { ...preferences.TRANSFORMATION, score: 2 };
    if (interests.some((item) => containsPhrase(item, "artificial intelligence"))) preferences.AI_INNOVATION = { ...preferences.AI_INNOVATION, score: 2 };
    if (avoid.some((item) => containsPhrase(item, "repetitive"))) preferences.RECURRING_OPERATIONS = { ...preferences.RECURRING_OPERATIONS, score: -2 };
  }

  const careerDirections = Array.isArray(profile.careerDirections)
    ? (profile.careerDirections as unknown[]).flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const raw = item as Partial<CareerDirection>;
      if (typeof raw.label !== "string") return [];
      return [{
        id: typeof raw.id === "string" ? raw.id : makeId("direction"),
        label: raw.label,
        keywords: Array.isArray(raw.keywords) ? raw.keywords.filter((keyword): keyword is string => typeof keyword === "string") : [],
        priority: raw.priority === 1 || raw.priority === 2 || raw.priority === 3 ? raw.priority : 2
      }];
    })
    : fallback.careerDirections;

  const peakExperiences = Array.isArray(profile.peakExperiences)
    ? (profile.peakExperiences as unknown[]).flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const raw = item as Partial<PeakExperience>;
      return [{
        id: typeof raw.id === "string" ? raw.id : makeId("peak"),
        title: typeof raw.title === "string" ? raw.title : "",
        description: typeof raw.description === "string" ? raw.description : "",
        detectedThemes: Array.isArray(raw.detectedThemes) ? raw.detectedThemes.filter((theme): theme is string => typeof theme === "string") : [],
        confirmedThemes: Array.isArray(raw.confirmedThemes) ? raw.confirmedThemes.filter((theme): theme is string => typeof theme === "string") : []
      }];
    })
    : [];

  return {
    resumeFileName,
    resumeText,
    skills: resumeText ? extractProfileSkills(resumeText, skills) : skills,
    preferences,
    interviewAnswers: profile.interviewAnswers && typeof profile.interviewAnswers === "object" ? Object.fromEntries(Object.entries(profile.interviewAnswers as Record<string, unknown>).filter((entry): entry is [string, string] => typeof entry[1] === "string")) : {},
    peakExperiences,
    careerDirections,
    profileNotes: typeof profile.profileNotes === "string" ? profile.profileNotes : "",
    updatedAt: typeof profile.updatedAt === "string" ? profile.updatedAt : ""
  };
}
