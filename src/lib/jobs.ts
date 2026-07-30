import { SKILL_TAXONOMY } from "../data/ontology";
import type {
  DuplicateCheck,
  JobReq,
  JobStatus,
  ParsedJob
} from "../types";
import { compareJobs } from "./intelligence";
import { createEmptyDiscoverySession } from "./discovery";
import { makeId, normalizeText, normalizeWhitespace, phraseCount, uniqueStrings } from "./text";

const FIELD_LABELS = {
  jobId: ["job id", "requisition id", "req id", "job requisition id"],
  category: ["category", "job category"],
  team: ["team", "organization", "org"],
  location: ["location", "locations"],
  hiringManager: ["hiring manager"],
  recruiter: ["recruiter"],
  datePosted: ["date posted", "posted", "posting date"]
};

const NOISE_PATTERNS = [
  /^search\b/i,
  /^apply now\b/i,
  /^internal career site$/i,
  /^manage settings$/i,
  /^accept$/i,
  /^give feedback$/i,
  /^footer$/i,
  /^related content$/i,
  /^jobs for you$/i,
  /^viewed jobs$/i,
  /^saved jobs$/i,
  /^sitemap$/i,
  /^legal privacy security/i,
  /^we use cookies/i,
  /^copyright/i,
  /^©/i
];

function cleanLine(value: string): string {
  return normalizeWhitespace(
    value
      .replace(/[\ue000-\uf8ff]/g, " ")
      .replace(/[\u200b-\u200d\u2060\ufeff]/g, " ")
      .replace(/[\uf0b7\u2022\u25cf\u25aa]/g, " ")
  );
}

function isNoiseLine(value: string): boolean {
  const line = cleanLine(value);
  return !line || NOISE_PATTERNS.some((pattern) => pattern.test(line));
}

function extractLabeledValue(lines: string[], labels: string[]): string {
  for (let index = 0; index < lines.length; index += 1) {
    const line = cleanLine(lines[index]);
    const lower = line.toLowerCase();
    for (const label of labels) {
      const pattern = new RegExp(`^${label.replace(/ /g, "\\s+")}\\s*:\\s*(.+)$`, "i");
      const match = line.match(pattern);
      if (match?.[1]) return cleanLine(match[1]);
      if (lower === label || lower === `${label}:`) {
        const next = lines.slice(index + 1).map(cleanLine).find((candidate) => candidate && !isNoiseLine(candidate));
        if (next) return next;
      }
    }
  }
  return "";
}

function extractTitle(lines: string[]): string {
  const categoryIndex = lines.findIndex((line) => /^category\s*:/i.test(cleanLine(line)));
  const candidates = (categoryIndex > 0 ? lines.slice(0, categoryIndex) : lines.slice(0, 15))
    .map(cleanLine)
    .filter((line) => !isNoiseLine(line))
    .filter((line) => !/^(category|team|organization|location|job id|hiring manager|recruiter|date posted)\s*:/i.test(line))
    .filter((line) => line.length >= 4 && line.length <= 180);
  return candidates[0] || "Untitled job requisition";
}

function extractSection(text: string, startHeadings: string[], endHeadings: string[]): string {
  const start = startHeadings.map((heading) => heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const end = endHeadings.map((heading) => heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const pattern = new RegExp(`(?:^|\\n)\\s*(?:${start})\\s*(?:\\n|:)([\\s\\S]*?)(?=\\n\\s*(?:${end})\\b|$)`, "i");
  return text.match(pattern)?.[1]?.trim() || "";
}

function splitSectionItems(section: string): string[] {
  if (!section) return [];
  const normalized = section
    .replace(/\r/g, "")
    .replace(/[\uf0b7\u2022\u25cf\u25aa]/g, "\n- ")
    .replace(/\n\s*[-*]\s*/g, "\n- ")
    .replace(/\n{3,}/g, "\n\n");
  let pieces = normalized
    .split(/\n-\s+|\n(?=[A-Z][^\n]{18,})/)
    .map((item) => cleanLine(item.replace(/^[-*]\s*/, "")))
    .filter((item) => item.length >= 18)
    .filter((item) => !isNoiseLine(item));
  if (pieces.length <= 1) {
    pieces = normalized
      .split(/(?<=[.!?])\s+(?=[A-Z])/)
      .map(cleanLine)
      .filter((item) => item.length >= 25)
      .filter((item) => !isNoiseLine(item));
  }
  return uniqueStrings(pieces).slice(0, 24);
}

function detectSeniority(title: string, text: string): string {
  const source = normalizeText(`${title} ${text.slice(0, 1200)}`);
  if (/\b(chief|svp|evp|vice president|vp)\b/.test(source)) return "Executive";
  if (/\b(principal|distinguished|fellow)\b/.test(source)) return "Principal";
  if (/\b(senior director|director|head of)\b/.test(source)) return "Director";
  if (/\b(senior manager|sr manager)\b/.test(source)) return "Senior Manager";
  if (/\b(manager|lead)\b/.test(source)) return "Manager / Lead";
  if (/\b(senior|sr)\b/.test(source)) return "Senior";
  if (/\b(associate|junior|jr|entry level)\b/.test(source)) return "Entry / Associate";
  return "Not specified";
}

function detectMinimumYears(text: string): number | null {
  const matches = Array.from(text.matchAll(/\b(\d{1,2})\s*\+?\s*(?:or more\s*)?years?\b/gi));
  if (!matches.length) return null;
  const values = matches.map((match) => Number(match[1])).filter(Number.isFinite);
  return values.length ? Math.max(...values) : null;
}

export function extractSkillsFromText(text: string): string[] {
  return SKILL_TAXONOMY
    .map((definition) => ({ name: definition.name, count: phraseCount(text, definition.aliases) }))
    .filter((item) => item.count > 0)
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))
    .slice(0, 35)
    .map((item) => item.name);
}

export function normalizeTitle(title: string): string {
  return normalizeWhitespace(
    title
      .replace(/[|/]/g, " - ")
      .replace(/[^a-zA-Z0-9+#. -]/g, " ")
      .replace(/\s+-\s+-\s+/g, " - ")
  );
}

export function parseJobText(rawText: string): ParsedJob {
  const text = rawText
    .replace(/\ufb00/g, "ff")
    .replace(/\ufb01/g, "fi")
    .replace(/\ufb02/g, "fl")
    .replace(/\ufb03/g, "ffi")
    .replace(/\ufb04/g, "ffl")
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const lines = text.split("\n");
  const title = extractTitle(lines);
  const responsibilitiesSection = extractSection(text, ["Responsibilities", "What you'll do", "What you will do", "The role"], [
    "Qualifications", "Requirements", "Minimum Qualifications", "Basic Qualifications", "Preferred Qualifications", "Footer", "Related Content"
  ]);
  const qualificationsSection = extractSection(text, ["Qualifications", "Requirements", "Minimum Qualifications", "Basic Qualifications"], [
    "Preferred Qualifications", "Footer", "Related Content", "The expected base pay range", "Benefits", "Jobs For You", "View all"
  ]);
  const preferredSection = extractSection(text, ["Preferred Qualifications", "Preferred experience", "Nice to have"], [
    "Footer", "Related Content", "The expected base pay range", "Benefits", "Jobs For You", "View all"
  ]);
  const locationValue = extractLabeledValue(lines, FIELD_LABELS.location);
  const locations = locationValue
    ? locationValue.split(/;|\s+and\s+|\|/i).map(cleanLine).filter(Boolean)
    : [];
  const responsibilities = splitSectionItems(responsibilitiesSection);
  const qualifications = uniqueStrings([
    ...splitSectionItems(qualificationsSection),
    ...splitSectionItems(preferredSection).map((item) => `Preferred: ${item}`)
  ]);
  const skillSource = `${title}\n${responsibilities.join("\n")}\n${qualifications.join("\n")}`;
  return {
    jobId: extractLabeledValue(lines, FIELD_LABELS.jobId),
    title,
    normalizedTitle: normalizeTitle(title),
    category: extractLabeledValue(lines, FIELD_LABELS.category),
    team: extractLabeledValue(lines, FIELD_LABELS.team),
    locations,
    hiringManager: extractLabeledValue(lines, FIELD_LABELS.hiringManager),
    recruiter: extractLabeledValue(lines, FIELD_LABELS.recruiter),
    datePosted: extractLabeledValue(lines, FIELD_LABELS.datePosted),
    seniority: detectSeniority(title, text),
    minYears: detectMinimumYears(qualificationsSection || text),
    descriptionText: text.slice(0, 140000),
    responsibilities,
    qualifications,
    skills: extractSkillsFromText(skillSource)
  };
}

export function checkDuplicates(parsed: ParsedJob, sourceHash: string, jobs: JobReq[]): DuplicateCheck {
  const normalizedJobId = normalizeText(parsed.jobId);
  const byJobId = normalizedJobId
    ? jobs.find((job) => normalizeText(job.jobId) === normalizedJobId) || null
    : null;
  if (byJobId) return { exactMatch: byJobId, exactReason: "JOB_ID", comparisons: [] };
  const byHash = sourceHash
    ? jobs.find((job) => job.sourceHash && job.sourceHash === sourceHash) || null
    : null;
  if (byHash) return { exactMatch: byHash, exactReason: "FILE_HASH", comparisons: [] };

  const temporaryJob = createJob(parsed, "NEW", "", "", "", "", sourceHash);
  const comparisons = jobs
    .map((job) => compareJobs(temporaryJob, job))
    .filter((comparison) => comparison.score >= 38)
    .sort((left, right) => right.score - left.score)
    .slice(0, 8);
  return { exactMatch: null, exactReason: "", comparisons };
}

export function createJob(
  parsed: ParsedJob,
  status: JobStatus,
  decisionReason: string,
  notes: string,
  jobUrl: string,
  sourceFileName: string,
  sourceHash: string
): JobReq {
  const now = new Date().toISOString();
  return {
    id: makeId("job"),
    ...parsed,
    status,
    decisionReason: decisionReason.trim(),
    notes: notes.trim(),
    jobUrl: jobUrl.trim(),
    sourceFileName,
    sourceHash,
    networkingStage: "NOT_STARTED",
    networkingContact: "",
    networkingNotes: "",
    networkingHypothesis: "",
    networkingLearnings: "",
    networkingQuestions: [],
    actionStage: "REVIEW",
    skillOverrides: {},
    ageOverride: false,
    verifiedActiveAt: "",
    manualAdjustment: 0,
    manualPriority: "NORMAL",
    pinned: false,
    recommendationOverride: "AUTO",
    interestAdjustment: 0,
    groupOverride: "",
    fitNotes: "",
    fitDiscovery: createEmptyDiscoverySession(),
    createdAt: now,
    updatedAt: now
  };
}

export async function sha256ArrayBuffer(buffer: BufferSource): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function sha256Text(text: string): Promise<string> {
  return sha256ArrayBuffer(new TextEncoder().encode(text));
}

export function formatStatus(status: JobStatus): string {
  const labels: Record<JobStatus, string> = {
    NEW: "New",
    EXPLORING: "Exploring",
    PURSUING: "Pursuing",
    MAYBE: "Maybe",
    APPLIED: "Applied",
    NOT_PURSUING: "Not pursuing",
    CLOSED: "Closed"
  };
  return labels[status];
}
