import type {
  DuplicateCheck,
  JobComparison,
  JobReq,
  JobStatus,
  ParsedJob
} from "../types";

const FIELD_LABELS = {
  jobId: ["job id", "requisition id", "req id"],
  category: ["category"],
  team: ["team", "organization"],
  location: ["location", "locations"],
  hiringManager: ["hiring manager"],
  recruiter: ["recruiter"],
  datePosted: ["date posted", "posted"]
};

const NOISE_PATTERNS = [
  /^search$/i,
  /^apply now$/i,
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

const TITLE_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "at",
  "for",
  "in",
  "of",
  "on",
  "the",
  "to",
  "with"
]);

const SKILL_DICTIONARY: Array<{ name: string; aliases: string[] }> = [
  { name: "Strategic planning", aliases: ["strategic planning", "annual planning", "quarterly planning"] },
  { name: "Business operations", aliases: ["business operations", "bizops", "operational excellence"] },
  { name: "Program management", aliases: ["program management", "program manager", "program delivery"] },
  { name: "Project management", aliases: ["project management", "project manager"] },
  { name: "Operating model design", aliases: ["operating model", "organizational design"] },
  { name: "Process improvement", aliases: ["process improvement", "process optimization", "improve processes"] },
  { name: "Data analysis", aliases: ["data analysis", "data-driven analysis", "analytical analysis", "analytics"] },
  { name: "Financial modeling", aliases: ["financial model", "financial modeling", "financial modelling", "analytical models", "financial or analytical models"] },
  { name: "Business acumen", aliases: ["business acumen"] },
  { name: "Financial acumen", aliases: ["financial acumen"] },
  { name: "Change management", aliases: ["change management"] },
  { name: "Stakeholder management", aliases: ["stakeholder management", "manage stakeholders", "stakeholder interests"] },
  { name: "Executive communication", aliases: ["executive communication", "senior executives", "executive leadership"] },
  { name: "Cross-functional leadership", aliases: ["cross-functional", "cross functional"] },
  { name: "Decision making", aliases: ["decision-making", "decision making"] },
  { name: "KPI management", aliases: ["kpi", "kpis", "key performance indicator", "performance metric"] },
  { name: "Customer success", aliases: ["customer success"] },
  { name: "Management consulting", aliases: ["management consulting", "consulting"] },
  { name: "Operations", aliases: ["operations"] },
  { name: "Finance", aliases: ["finance"] },
  { name: "Product strategy", aliases: ["product strategy"] },
  { name: "Product management", aliases: ["product management", "product manager"] },
  { name: "Go-to-market", aliases: ["go-to-market", "go to market", "gtm"] },
  { name: "Sales operations", aliases: ["sales operations", "revenue operations", "revops"] },
  { name: "SQL", aliases: ["sql"] },
  { name: "Python", aliases: ["python"] },
  { name: "Java", aliases: ["java"] },
  { name: "JavaScript", aliases: ["javascript"] },
  { name: "TypeScript", aliases: ["typescript"] },
  { name: "React", aliases: ["react", "react.js", "reactjs"] },
  { name: "Node.js", aliases: ["node.js", "nodejs"] },
  { name: "AWS", aliases: ["aws", "amazon web services"] },
  { name: "Azure", aliases: ["azure"] },
  { name: "Google Cloud", aliases: ["google cloud", "gcp"] },
  { name: "Microservices", aliases: ["microservices", "micro-services"] },
  { name: "REST APIs", aliases: ["rest api", "restful"] },
  { name: "Distributed systems", aliases: ["distributed systems", "distributed system"] },
  { name: "Machine learning", aliases: ["machine learning", "ml"] },
  { name: "Artificial intelligence", aliases: ["artificial intelligence", "generative ai", "genai"] },
  { name: "Agile", aliases: ["agile", "scrum"] },
  { name: "Leadership", aliases: ["people leadership", "team leadership", "leadership"] },
  { name: "Written communication", aliases: ["written communication", "writing skills"] },
  { name: "Verbal communication", aliases: ["verbal communication", "presentation skills"] },
  { name: "Influencing", aliases: ["influence stakeholders", "influencing"] },
  { name: "Problem solving", aliases: ["problem solver", "problem solving", "problem-solving"] }
];

function normalizeLigatures(value: string): string {
  return value
    .replace(/\ufb00/g, "ff")
    .replace(/\ufb01/g, "fi")
    .replace(/\ufb02/g, "fl")
    .replace(/\ufb03/g, "ffi")
    .replace(/\ufb04/g, "ffl");
}

function normalizeWhitespace(value: string): string {
  return normalizeLigatures(value).replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").trim();
}

function cleanLine(value: string): string {
  return normalizeWhitespace(value.replace(/[\uf0b7\u2022\u25cf\u25aa]/g, " "));
}

function isNoiseLine(value: string): boolean {
  const line = cleanLine(value);
  if (!line) return true;
  return NOISE_PATTERNS.some((pattern) => pattern.test(line));
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
  const candidates = (categoryIndex > 0 ? lines.slice(0, categoryIndex) : lines.slice(0, 12))
    .map(cleanLine)
    .filter((line) => !isNoiseLine(line))
    .filter((line) => !/^(category|team|location|job id|hiring manager|recruiter|date posted)\s*:/i.test(line))
    .filter((line) => line.length >= 4 && line.length <= 160);

  return candidates[0] || "Untitled job requisition";
}

function extractSection(text: string, startHeading: string, endHeadings: string[]): string {
  const escapedEnd = endHeadings.map((heading) => heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const pattern = new RegExp(`${startHeading}\\s*([\\s\\S]*?)(?=\\n\\s*(?:${escapedEnd})\\b|$)`, "i");
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
    .map((item) => normalizeWhitespace(item.replace(/^[-*]\s*/, "")))
    .filter((item) => item.length >= 18)
    .filter((item) => !isNoiseLine(item));

  if (pieces.length <= 1) {
    pieces = normalized
      .split(/(?<=[.!?])\s+(?=[A-Z])/)
      .map(cleanLine)
      .filter((item) => item.length >= 25)
      .filter((item) => !isNoiseLine(item));
  }

  return Array.from(new Set(pieces)).slice(0, 18);
}

function detectSeniority(title: string, text: string): string {
  const source = `${title} ${text.slice(0, 1200)}`.toLowerCase();
  if (/\bchief\b|\bvice president\b|\bvp\b/.test(source)) return "Executive";
  if (/\bdirector\b/.test(source)) return "Director";
  if (/\bprincipal\b/.test(source)) return "Principal";
  if (/\bstaff\b/.test(source)) return "Staff";
  if (/\bsenior\b|\bsr\.?\b/.test(source)) return "Senior";
  if (/\bmanager\b|\blead\b/.test(source)) return "Manager / Lead";
  if (/\bassociate\b|\bjunior\b|\bjr\.?\b|\bentry level\b/.test(source)) return "Entry / Associate";
  return "Not specified";
}

function detectMinimumYears(text: string): number | null {
  const matches = Array.from(text.matchAll(/\b(\d{1,2})\s*\+?\s*(?:or more\s*)?years?\b/gi));
  if (!matches.length) return null;
  const values = matches.map((match) => Number(match[1])).filter(Number.isFinite);
  return values.length ? Math.max(...values) : null;
}

function detectSkills(text: string): string[] {
  const lower = ` ${text.toLowerCase().replace(/\s+/g, " ")} `;
  const skills = SKILL_DICTIONARY.filter(({ aliases }) =>
    aliases.some((alias) => {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(lower);
    })
  ).map(({ name }) => name);

  return Array.from(new Set(skills)).slice(0, 24);
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
  const text = normalizeLigatures(rawText)
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const lines = text.split("\n");
  const title = extractTitle(lines);
  const responsibilitiesSection = extractSection(text, "Responsibilities", [
    "Qualifications",
    "Requirements",
    "Minimum Qualifications",
    "Footer",
    "Related Content"
  ]);
  const qualificationsSection = extractSection(text, "Qualifications", [
    "Footer",
    "Related Content",
    "The expected base pay range",
    "Benefits",
    "Jobs For You",
    "View all"
  ]);

  const locationValue = extractLabeledValue(lines, FIELD_LABELS.location);
  const locations = locationValue
    ? locationValue.split(/;|\s+and\s+|\|/i).map(cleanLine).filter(Boolean)
    : [];

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
    descriptionText: text.slice(0, 100000),
    responsibilities: splitSectionItems(responsibilitiesSection),
    qualifications: splitSectionItems(qualificationsSection),
    skills: detectSkills(`${title}\n${responsibilitiesSection}\n${qualificationsSection}`)
  };
}

function normalizeToken(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9+#. ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleTokens(value: string): Set<string> {
  return new Set(
    normalizeToken(value)
      .split(" ")
      .filter((token) => token.length > 1 && !TITLE_STOP_WORDS.has(token))
  );
}

function jaccard(left: Set<string>, right: Set<string>): number {
  if (!left.size && !right.size) return 0;
  const intersection = [...left].filter((value) => right.has(value)).length;
  const union = new Set([...left, ...right]).size;
  return union ? (intersection / union) * 100 : 0;
}

function sameText(left: string, right: string): boolean {
  return Boolean(left && right && normalizeToken(left) === normalizeToken(right));
}

function locationOverlap(left: string[], right: string[]): boolean {
  const rightSet = new Set(right.map(normalizeToken).filter(Boolean));
  return left.some((location) => rightSet.has(normalizeToken(location)));
}

function skillSet(skills: string[]): Set<string> {
  return new Set(skills.map(normalizeToken).filter(Boolean));
}

export function compareJobs(source: JobReq, target: JobReq): JobComparison {
  const sourceTitleTokens = titleTokens(source.normalizedTitle || source.title);
  const targetTitleTokens = titleTokens(target.normalizedTitle || target.title);
  const titleScore = Math.round(jaccard(sourceTitleTokens, targetTitleTokens));

  const sourceSkills = skillSet(source.skills);
  const targetSkills = skillSet(target.skills);
  const skillScore = Math.round(jaccard(sourceSkills, targetSkills));

  let contextPoints = 0;
  const reasons: string[] = [];
  if (sameText(source.category, target.category)) {
    contextPoints += 25;
    reasons.push("Same category");
  }
  if (sameText(source.team, target.team)) {
    contextPoints += 25;
    reasons.push("Same team or organization");
  }
  if (sameText(source.hiringManager, target.hiringManager)) {
    contextPoints += 20;
    reasons.push("Same hiring manager");
  }
  if (sameText(source.seniority, target.seniority)) {
    contextPoints += 15;
    reasons.push("Same seniority");
  }
  if (locationOverlap(source.locations, target.locations)) {
    contextPoints += 15;
    reasons.push("Overlapping location");
  }
  const contextScore = contextPoints;

  let score = Math.round(titleScore * 0.45 + skillScore * 0.35 + contextScore * 0.2);
  const exactNormalizedTitle = sameText(source.normalizedTitle, target.normalizedTitle);
  if (exactNormalizedTitle && (sameText(source.hiringManager, target.hiringManager) || sameText(source.team, target.team))) {
    score = Math.max(score, 91);
  } else if (exactNormalizedTitle) {
    score = Math.max(score, 82);
  }

  const sharedSkills = source.skills.filter((skill) => targetSkills.has(normalizeToken(skill)));
  const uniqueToSource = source.skills.filter((skill) => !targetSkills.has(normalizeToken(skill)));
  const uniqueToTarget = target.skills.filter((skill) => !sourceSkills.has(normalizeToken(skill)));

  if (titleScore >= 70) reasons.unshift("Strong title overlap");
  if (skillScore >= 60) reasons.push(`${sharedSkills.length} shared skills`);

  const type =
    score >= 88
      ? "POSSIBLE_DUPLICATE"
      : score >= 72
        ? "HIGHLY_SIMILAR"
        : score >= 50
          ? "RELATED"
          : "LOW";

  return {
    sourceJobId: source.id,
    targetJobId: target.id,
    score,
    type,
    titleScore,
    skillScore,
    contextScore,
    sharedSkills,
    uniqueToSource,
    uniqueToTarget,
    reasons: reasons.slice(0, 5)
  };
}

export function buildComparisons(jobs: JobReq[]): JobComparison[] {
  const comparisons: JobComparison[] = [];
  for (let leftIndex = 0; leftIndex < jobs.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < jobs.length; rightIndex += 1) {
      const comparison = compareJobs(jobs[leftIndex], jobs[rightIndex]);
      if (comparison.type !== "LOW") comparisons.push(comparison);
    }
  }
  return comparisons.sort((left, right) => right.score - left.score);
}

export function checkDuplicates(
  parsed: ParsedJob,
  sourceHash: string,
  jobs: JobReq[]
): DuplicateCheck {
  const normalizedJobId = normalizeToken(parsed.jobId);
  const byJobId = normalizedJobId
    ? jobs.find((job) => normalizeToken(job.jobId) === normalizedJobId) || null
    : null;
  if (byJobId) {
    return { exactMatch: byJobId, exactReason: "JOB_ID", comparisons: [] };
  }

  const byHash = sourceHash
    ? jobs.find((job) => job.sourceHash && job.sourceHash === sourceHash) || null
    : null;
  if (byHash) {
    return { exactMatch: byHash, exactReason: "FILE_HASH", comparisons: [] };
  }

  const temporaryJob: JobReq = {
    id: "draft",
    ...parsed,
    status: "NEW",
    decisionReason: "",
    notes: "",
    sourceFileName: "",
    sourceHash,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const comparisons = jobs
    .map((job) => compareJobs(temporaryJob, job))
    .filter((comparison) => comparison.score >= 45)
    .sort((left, right) => right.score - left.score)
    .slice(0, 8);

  return { exactMatch: null, exactReason: "", comparisons };
}

export function createJob(
  parsed: ParsedJob,
  status: JobStatus,
  decisionReason: string,
  notes: string,
  sourceFileName: string,
  sourceHash: string
): JobReq {
  const now = new Date().toISOString();
  return {
    id: typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `job-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ...parsed,
    status,
    decisionReason: decisionReason.trim(),
    notes: notes.trim(),
    sourceFileName,
    sourceHash,
    createdAt: now,
    updatedAt: now
  };
}

export async function sha256ArrayBuffer(buffer: BufferSource): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function sha256Text(text: string): Promise<string> {
  return sha256ArrayBuffer(new TextEncoder().encode(text));
}

export function formatStatus(status: JobStatus): string {
  const labels: Record<JobStatus, string> = {
    NEW: "New",
    PURSUING: "Pursuing",
    MAYBE: "Maybe",
    NOT_PURSUING: "Not pursuing",
    APPLIED: "Applied"
  };
  return labels[status];
}
