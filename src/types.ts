export type JobStatus =
  | "NEW"
  | "PURSUING"
  | "MAYBE"
  | "NOT_PURSUING"
  | "APPLIED";

export interface JobReq {
  id: string;
  jobId: string;
  title: string;
  normalizedTitle: string;
  category: string;
  team: string;
  locations: string[];
  hiringManager: string;
  recruiter: string;
  datePosted: string;
  seniority: string;
  minYears: number | null;
  descriptionText: string;
  responsibilities: string[];
  qualifications: string[];
  skills: string[];
  status: JobStatus;
  decisionReason: string;
  notes: string;
  sourceFileName: string;
  sourceHash: string;
  createdAt: string;
  updatedAt: string;
  isDemo?: boolean;
}

export interface ParsedJob {
  jobId: string;
  title: string;
  normalizedTitle: string;
  category: string;
  team: string;
  locations: string[];
  hiringManager: string;
  recruiter: string;
  datePosted: string;
  seniority: string;
  minYears: number | null;
  descriptionText: string;
  responsibilities: string[];
  qualifications: string[];
  skills: string[];
}

export type ComparisonType =
  | "POSSIBLE_DUPLICATE"
  | "HIGHLY_SIMILAR"
  | "RELATED"
  | "LOW";

export interface JobComparison {
  sourceJobId: string;
  targetJobId: string;
  score: number;
  type: ComparisonType;
  titleScore: number;
  skillScore: number;
  contextScore: number;
  sharedSkills: string[];
  uniqueToSource: string[];
  uniqueToTarget: string[];
  reasons: string[];
}

export interface DuplicateCheck {
  exactMatch: JobReq | null;
  exactReason: "JOB_ID" | "FILE_HASH" | "";
  comparisons: JobComparison[];
}

export interface ImportPayload {
  app: "ReqRadar";
  version: string;
  exportedAt: string;
  jobs: JobReq[];
}
