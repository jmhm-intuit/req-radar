import type {
  InterestLevel,
  JobAssessment,
  JobReq,
  NetworkingStage,
  Recommendation,
  SkillAssessment,
  SkillMatchStatus,
  UserProfile
} from "../types";

const RELATED_SKILLS: string[][] = [
  ["artificial intelligence", "machine learning", "generative ai", "ai adoption"],
  ["strategic planning", "strategy", "business strategy", "product strategy"],
  ["business operations", "operations", "operational excellence", "program management"],
  ["data analysis", "analytics", "sql", "financial modeling"],
  ["stakeholder management", "influencing", "executive communication", "cross-functional leadership"],
  ["change management", "transformation", "operating model design", "process improvement"],
  ["product management", "product strategy", "product operations"],
  ["leadership", "people leadership", "team leadership", "management"],
  ["aws", "azure", "google cloud", "cloud"],
  ["java", "javascript", "typescript", "python", "software engineering"],
  ["rest apis", "microservices", "distributed systems", "backend engineering"]
];

const CRITICAL_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: "Licensed attorney / Bar admission", pattern: /\b(attorney|lawyer|bar admission|bar membership|juris doctor|j\.d\.)\b/i },
  { label: "CPA certification", pattern: /\b(cpa|certified public accountant)\b/i },
  { label: "Medical license", pattern: /\b(physician|medical doctor|m\.d\.|registered nurse|rn license|clinical license)\b/i },
  { label: "Security clearance", pattern: /\b(security clearance|top secret|secret clearance)\b/i },
  { label: "Professional engineering license", pattern: /\bprofessional engineer|\bp\.e\. license\b/i },
  { label: "Mandatory language fluency", pattern: /\b(fluent|native proficiency|required language)\b.{0,30}\b(spanish|french|german|mandarin|japanese|portuguese)\b/i }
];

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9+#. ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function relatedGroup(value: string): string[] {
  const normalized = normalize(value);
  return RELATED_SKILLS.find((group) => group.some((item) => normalized.includes(normalize(item)))) || [];
}

function tokenOverlap(left: string, right: string): number {
  const leftTokens = new Set(normalize(left).split(" ").filter((token) => token.length > 2));
  const rightTokens = new Set(normalize(right).split(" ").filter((token) => token.length > 2));
  if (!leftTokens.size || !rightTokens.size) return 0;
  const overlap = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  return overlap / Math.min(leftTokens.size, rightTokens.size);
}

function profileMatches(skill: string, profileSkills: string[]): "MATCH" | "PARTIAL" | "NO_MATCH" {
  const normalizedSkill = normalize(skill);
  if (profileSkills.some((item) => normalize(item) === normalizedSkill)) return "MATCH";
  if (profileSkills.some((item) => normalize(item).includes(normalizedSkill) || normalizedSkill.includes(normalize(item)))) {
    return "MATCH";
  }

  const group = relatedGroup(skill);
  if (group.length && profileSkills.some((item) => group.some((related) => normalize(item).includes(normalize(related)) || normalize(related).includes(normalize(item))))) {
    return "PARTIAL";
  }

  if (profileSkills.some((item) => tokenOverlap(skill, item) >= 0.5)) return "PARTIAL";
  return "NO_MATCH";
}

export function extractCriticalRequirements(job: JobReq): string[] {
  const source = `${job.title}\n${job.qualifications.join("\n")}\n${job.descriptionText}`;
  return CRITICAL_PATTERNS.filter(({ pattern }) => pattern.test(source)).map(({ label }) => label);
}

function skillAssessment(job: JobReq, profile: UserProfile): SkillAssessment[] {
  const critical = extractCriticalRequirements(job);
  const requirements = unique([...job.skills, ...critical]);
  return requirements.map((skill) => {
    const override = job.skillOverrides[skill];
    const isCritical = critical.includes(skill);
    if (override) {
      return {
        skill,
        status: override,
        critical: isCritical || override === "CRITICAL_GAP",
        reason: "Manually classified"
      };
    }

    const result = profileMatches(skill, profile.skills);
    let status: SkillMatchStatus = result;
    if (isCritical && result === "NO_MATCH") status = "CRITICAL_GAP";
    return {
      skill,
      status,
      critical: isCritical,
      reason: result === "MATCH"
        ? "Direct evidence in your skills profile"
        : result === "PARTIAL"
          ? "Related or transferable experience found"
          : isCritical
            ? "Mandatory credential or license was not found"
            : "No matching evidence found in your profile"
    };
  });
}

function calculateSkillsScore(skills: SkillAssessment[]): number {
  if (!skills.length) return 50;
  let total = 0;
  let weight = 0;
  skills.forEach((skill) => {
    const itemWeight = skill.critical ? 2 : 1;
    weight += itemWeight;
    if (skill.status === "MATCH") total += 100 * itemWeight;
    if (skill.status === "PARTIAL") total += 55 * itemWeight;
    if (skill.status === "NOT_RELEVANT") {
      total += 70 * itemWeight;
      weight -= itemWeight * 0.35;
    }
  });
  const score = weight ? Math.round(total / weight) : 50;
  return skills.some((skill) => skill.status === "CRITICAL_GAP") ? Math.min(score, 35) : score;
}

function levelFromScore(score: number): Exclude<InterestLevel, "AUTO"> {
  if (score >= 78) return "HIGH";
  if (score >= 55) return "MEDIUM";
  if (score >= 30) return "LOW";
  return "NONE";
}

function interestAssessment(job: JobReq, profile: UserProfile): { score: number; level: Exclude<InterestLevel, "AUTO">; reasons: string[] } {
  if (job.interestOverride !== "AUTO") {
    const scores: Record<Exclude<InterestLevel, "AUTO">, number> = {
      HIGH: 90,
      MEDIUM: 65,
      LOW: 35,
      NONE: 5
    };
    return { score: scores[job.interestOverride], level: job.interestOverride, reasons: ["Interest was set manually"] };
  }

  const source = normalize(`${job.title} ${job.category} ${job.team} ${job.descriptionText}`);
  const positive = profile.interests.filter((interest) => source.includes(normalize(interest)));
  const negative = profile.avoid.filter((item) => source.includes(normalize(item)));
  if (!profile.interests.length && !profile.avoid.length) {
    return { score: 55, level: "MEDIUM", reasons: ["Add interests in My Profile for a more personalized score"] };
  }
  const raw = 45 + Math.min(45, positive.length * 14) - Math.min(45, negative.length * 20);
  const score = Math.max(0, Math.min(100, raw));
  const reasons = [
    ...positive.slice(0, 3).map((item) => `Matches interest: ${item}`),
    ...negative.slice(0, 3).map((item) => `Contains lower-interest work: ${item}`)
  ];
  return { score, level: levelFromScore(score), reasons: reasons.length ? reasons : ["No strong preference signals found"] };
}

export function parsePostedDate(value: string): Date | null {
  if (!value.trim()) return null;
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  const cleaned = value.replace(/(st|nd|rd|th)/gi, "").trim();
  const fallback = new Date(cleaned);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

export function jobAgeDays(value: string): number | null {
  const date = parsePostedDate(value);
  if (!date) return null;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
}

function freshness(ageDays: number | null): { score: number; label: string } {
  if (ageDays === null) return { score: 55, label: "Age unknown" };
  if (ageDays <= 30) return { score: 100, label: `${ageDays}d · Fresh` };
  if (ageDays <= 60) return { score: 75, label: `${ageDays}d · Active` };
  if (ageDays <= 90) return { score: 45, label: `${ageDays}d · Aging` };
  return { score: 0, label: `${ageDays}d · Too old` };
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
    REFERRAL_REQUESTED: "Referral requested",
    REFERRAL_RECEIVED: "Referral received",
    NOT_NEEDED: "Not needed"
  };
  return labels[stage];
}

function networkingScore(stage: NetworkingStage): number {
  const scores: Record<NetworkingStage, number> = {
    NOT_STARTED: 20,
    CONTACT_IDENTIFIED: 40,
    MESSAGE_PLANNED: 50,
    CONTACTED: 65,
    RESPONSE_RECEIVED: 75,
    CONVERSATION_SCHEDULED: 85,
    CONVERSATION_COMPLETED: 90,
    REFERRAL_REQUESTED: 92,
    REFERRAL_RECEIVED: 100,
    NOT_NEEDED: 75
  };
  return scores[stage];
}

export function recommendationLabel(value: Recommendation): string {
  const labels: Record<Recommendation, string> = {
    PURSUE: "Pursue",
    CONSIDER: "Consider",
    LOW_PRIORITY: "Low priority",
    DO_NOT_PURSUE: "Do not pursue"
  };
  return labels[value];
}

export function assessJob(job: JobReq, profile: UserProfile): JobAssessment {
  const skills = skillAssessment(job, profile);
  const skillsScore = calculateSkillsScore(skills);
  const interest = interestAssessment(job, profile);
  const ageDays = jobAgeDays(job.datePosted);
  const fresh = freshness(ageDays);
  const networkScore = networkingScore(job.networkingStage);
  const criticalGaps = skills.filter((skill) => skill.status === "CRITICAL_GAP").map((skill) => skill.skill);
  const priorityAdjustment = job.manualPriority === "HIGH" ? 8 : job.manualPriority === "LOW" ? -8 : job.manualPriority === "ARCHIVE" ? -25 : 0;
  const baseScore = Math.round(skillsScore * 0.45 + interest.score * 0.30 + fresh.score * 0.15 + networkScore * 0.10);
  const finalScore = Math.max(0, Math.min(100, baseScore + job.manualAdjustment + priorityAdjustment));

  let calculatedRecommendation: Recommendation;
  if (criticalGaps.length) calculatedRecommendation = "DO_NOT_PURSUE";
  else if (ageDays !== null && ageDays > 90 && !job.ageOverride) calculatedRecommendation = "DO_NOT_PURSUE";
  else if (finalScore >= 75) calculatedRecommendation = "PURSUE";
  else if (finalScore >= 58) calculatedRecommendation = "CONSIDER";
  else if (finalScore >= 40) calculatedRecommendation = "LOW_PRIORITY";
  else calculatedRecommendation = "DO_NOT_PURSUE";

  const recommendation = job.recommendationOverride === "AUTO"
    ? calculatedRecommendation
    : job.recommendationOverride;

  const reasons = [
    `${skillsScore}% Skills Fit`,
    `${interest.level === "NONE" ? "No" : interest.level.charAt(0) + interest.level.slice(1).toLowerCase()} Interest Fit`,
    fresh.label,
    ...interest.reasons.slice(0, 2)
  ];
  if (criticalGaps.length) reasons.unshift(`Critical gap: ${criticalGaps[0]}`);
  if (job.manualAdjustment) reasons.push(`Manual rank adjustment ${job.manualAdjustment > 0 ? "+" : ""}${job.manualAdjustment}`);
  if (job.recommendationOverride !== "AUTO") reasons.unshift("Recommendation manually overridden");

  let nextAction = "Review the role and decide your next step";
  if (recommendation === "PURSUE" && job.networkingStage === "NOT_STARTED") nextAction = "Start networking and identify a contact";
  else if (recommendation === "PURSUE") nextAction = "Continue networking and prepare the application";
  else if (recommendation === "CONSIDER") nextAction = "Resolve partial skill gaps and confirm your interest";
  else if (ageDays !== null && ageDays > 90 && !job.ageOverride) nextAction = "Confirm the requisition is still active before investing time";
  else if (criticalGaps.length) nextAction = "Validate whether the mandatory requirement can be waived";
  else if (recommendation === "DO_NOT_PURSUE") nextAction = "Archive or mark as not pursuing";

  return {
    skills,
    skillsScore,
    interestScore: interest.score,
    interestLevel: interest.level,
    ageDays,
    ageLabel: fresh.label,
    freshnessScore: fresh.score,
    networkingScore: networkScore,
    calculatedRecommendation,
    recommendation,
    baseScore,
    finalScore,
    criticalGaps,
    reasons,
    nextAction
  };
}
