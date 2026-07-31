import { useMemo, useState } from "react";
import {
  Archive,
  ChevronDown,
  ChevronRight,
  Filter,
  Search,
  SlidersHorizontal,
  Target
} from "lucide-react";
import { formatStatus } from "../lib/jobs";
import { focusBucketDescription, focusBucketLabel, networkingStageLabel } from "../lib/intelligence";
import type {
  AppSettings,
  FocusBucket,
  JobAssessment,
  JobReq,
  JobStatus,
  PortfolioGroupBy
} from "../types";
import { JobTable, STATUS_OPTIONS } from "./JobTable";

interface PortfolioNavigatorProps {
  jobs: JobReq[];
  assessments: Map<string, JobAssessment>;
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
  onOpen: (jobId: string) => void;
  onUpdate: (jobId: string, changes: Partial<JobReq>) => void;
}

type QuickView = "FOCUS_NOW" | "ALL" | FocusBucket;

const FOCUS_BUCKET_ORDER: FocusBucket[] = [
  "READY_TO_PURSUE",
  "NEEDS_DISCOVERY",
  "NEEDS_NETWORKING",
  "HIGH_INTEREST_STRETCH",
  "CAPABLE_NOT_COMPELLING",
  "TOO_TECHNICAL",
  "NOT_INTERESTED",
  "TOO_OLD",
  "CRITICAL_BLOCKER",
  "INACTIVE"
];

const GROUP_BY_OPTIONS: Array<{ id: PortfolioGroupBy; label: string }> = [
  { id: "FOCUS_BUCKET", label: "Focus bucket" },
  { id: "ROLE_FAMILY", label: "Role family" },
  { id: "STATUS", label: "Decision status" },
  { id: "POSTING_AGE", label: "Posting age" },
  { id: "INTEREST_BAND", label: "Interest Fit" },
  { id: "CAPABILITY_BAND", label: "Capability Fit" },
  { id: "NETWORKING_STAGE", label: "Networking stage" }
];

function ageBand(assessment: JobAssessment): string {
  if (assessment.ageDays === null) return "Age unknown";
  if (assessment.ageDays <= 30) return "0–30 days · Fresh";
  if (assessment.ageDays <= 60) return "31–60 days · Active";
  if (assessment.ageDays <= 90) return "61–90 days · Aging";
  return "90+ days · Verify active";
}

function fitBand(value: number): string {
  if (value >= 80) return "80–100 · Strong";
  if (value >= 65) return "65–79 · Good";
  if (value >= 50) return "50–64 · Mixed";
  return "Below 50 · Low";
}

function groupKey(job: JobReq, assessment: JobAssessment, groupBy: PortfolioGroupBy): string {
  if (groupBy === "FOCUS_BUCKET") return assessment.focusBucket;
  if (groupBy === "ROLE_FAMILY") return assessment.fingerprint.primaryGroupLabel || "Unclassified";
  if (groupBy === "STATUS") return formatStatus(job.status);
  if (groupBy === "POSTING_AGE") return ageBand(assessment);
  if (groupBy === "INTEREST_BAND") return fitBand(assessment.interestScore);
  if (groupBy === "CAPABILITY_BAND") return fitBand(assessment.capabilityScore);
  return networkingStageLabel(job.networkingStage);
}

function groupLabel(key: string, groupBy: PortfolioGroupBy): string {
  return groupBy === "FOCUS_BUCKET" ? focusBucketLabel(key as FocusBucket) : key;
}

function groupDescription(key: string, groupBy: PortfolioGroupBy): string {
  if (groupBy === "FOCUS_BUCKET") return focusBucketDescription(key as FocusBucket);
  if (groupBy === "ROLE_FAMILY") return "Roles with a similar problem space, responsibility mix, and market profile.";
  if (groupBy === "STATUS") return "Opportunities grouped by your current decision, not by the system recommendation.";
  if (groupBy === "POSTING_AGE") return "Prioritize fresh opportunities and verify older requisitions before investing time.";
  if (groupBy === "INTEREST_BAND") return "Jobs grouped by the General Theme baseline plus role-specific discovery adjustment.";
  if (groupBy === "CAPABILITY_BAND") return "Jobs grouped by resume evidence against required capabilities.";
  return "Opportunities grouped by the next relationship-building step.";
}

function groupOrder(key: string, groupBy: PortfolioGroupBy): number {
  if (groupBy === "FOCUS_BUCKET") return FOCUS_BUCKET_ORDER.indexOf(key as FocusBucket);
  const bandOrder = ["80–100 · Strong", "65–79 · Good", "50–64 · Mixed", "Below 50 · Low"];
  if (groupBy === "INTEREST_BAND" || groupBy === "CAPABILITY_BAND") return bandOrder.indexOf(key);
  const ageOrder = ["0–30 days · Fresh", "31–60 days · Active", "61–90 days · Aging", "90+ days · Verify active", "Age unknown"];
  if (groupBy === "POSTING_AGE") return ageOrder.indexOf(key);
  return 999;
}

function quickViewBuckets(view: QuickView): FocusBucket[] | null {
  if (view === "ALL") return null;
  if (view === "FOCUS_NOW") return ["READY_TO_PURSUE", "NEEDS_DISCOVERY", "NEEDS_NETWORKING", "HIGH_INTEREST_STRETCH"];
  return [view];
}

export function PortfolioNavigator({ jobs, assessments, settings, onSettingsChange, onOpen, onUpdate }: PortfolioNavigatorProps) {
  const [search, setSearch] = useState("");
  const [quickView, setQuickView] = useState<QuickView>("FOCUS_NOW");
  const [expandedLimits, setExpandedLimits] = useState<Record<string, number>>({});

  const setSettings = (changes: Partial<AppSettings>) => onSettingsChange({ ...settings, ...changes, updatedAt: new Date().toISOString() });

  const toggleStatus = (status: JobStatus) => {
    setSettings({
      hiddenStatuses: settings.hiddenStatuses.includes(status)
        ? settings.hiddenStatuses.filter((item) => item !== status)
        : [...settings.hiddenStatuses, status]
    });
  };

  const toggleGroup = (key: string) => {
    setSettings({
      collapsedGroups: settings.collapsedGroups.includes(key)
        ? settings.collapsedGroups.filter((item) => item !== key)
        : [...settings.collapsedGroups, key]
    });
  };

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    const quickBuckets = quickViewBuckets(quickView);
    return jobs.filter((job) => {
      const assessment = assessments.get(job.id);
      if (!assessment) return false;
      if (settings.hiddenStatuses.includes(job.status)) return false;
      if (settings.hiddenFocusBuckets.includes(assessment.focusBucket)) return false;
      if (quickBuckets && !quickBuckets.includes(assessment.focusBucket)) return false;
      if (!query) return true;
      const haystack = `${job.title} ${job.jobId} ${job.team} ${job.category} ${assessment.fingerprint.primaryGroupLabel} ${assessment.fingerprint.themes.join(" ")} ${assessment.focusReason}`.toLowerCase();
      return haystack.includes(query);
    }).sort((left, right) => {
      if (left.pinned !== right.pinned) return left.pinned ? -1 : 1;
      return (assessments.get(right.id)?.finalScore || 0) - (assessments.get(left.id)?.finalScore || 0);
    });
  }, [jobs, assessments, search, quickView, settings.hiddenStatuses, settings.hiddenFocusBuckets]);

  const groups = useMemo(() => {
    const map = new Map<string, JobReq[]>();
    visible.forEach((job) => {
      const assessment = assessments.get(job.id);
      if (!assessment) return;
      const key = groupKey(job, assessment, settings.portfolioGroupBy);
      map.set(key, [...(map.get(key) || []), job]);
    });
    return [...map.entries()].sort(([left], [right]) => {
      const order = groupOrder(left, settings.portfolioGroupBy) - groupOrder(right, settings.portfolioGroupBy);
      return order !== 0 ? order : left.localeCompare(right);
    });
  }, [visible, assessments, settings.portfolioGroupBy]);

  const bucketCounts = useMemo(() => Object.fromEntries(FOCUS_BUCKET_ORDER.map((bucket) => [bucket, jobs.filter((job) => assessments.get(job.id)?.focusBucket === bucket).length])) as Record<FocusBucket, number>, [jobs, assessments]);

  return <section className="portfolio-navigator">
    <div className="panel navigator-hero">
      <div><span className="eyebrow">Focus Navigator</span><h2>Turn 20–50 opportunities into a manageable decision queue</h2><p>Each job receives one primary navigation bucket and an explanation. Change status, ranking, or the bucket manually whenever your judgment differs.</p></div>
      <div className="navigator-total"><strong>{visible.length}</strong><span>shown of {jobs.length}</span></div>
    </div>

    <div className="panel navigator-controls">
      <div className="quick-views" aria-label="Saved focus views">
        <button className={quickView === "FOCUS_NOW" ? "active" : ""} onClick={() => setQuickView("FOCUS_NOW")}><Target /> Focus now <b>{["READY_TO_PURSUE", "NEEDS_DISCOVERY", "NEEDS_NETWORKING", "HIGH_INTEREST_STRETCH"].reduce((sum, bucket) => sum + bucketCounts[bucket as FocusBucket], 0)}</b></button>
        <button className={quickView === "NEEDS_DISCOVERY" ? "active" : ""} onClick={() => setQuickView("NEEDS_DISCOVERY")}>Needs discovery <b>{bucketCounts.NEEDS_DISCOVERY}</b></button>
        <button className={quickView === "NEEDS_NETWORKING" ? "active" : ""} onClick={() => setQuickView("NEEDS_NETWORKING")}>Needs networking <b>{bucketCounts.NEEDS_NETWORKING}</b></button>
        <button className={quickView === "TOO_OLD" ? "active" : ""} onClick={() => setQuickView("TOO_OLD")}>Too old <b>{bucketCounts.TOO_OLD}</b></button>
        <button className={quickView === "TOO_TECHNICAL" ? "active" : ""} onClick={() => setQuickView("TOO_TECHNICAL")}>Too technical <b>{bucketCounts.TOO_TECHNICAL}</b></button>
        <button className={quickView === "NOT_INTERESTED" ? "active" : ""} onClick={() => setQuickView("NOT_INTERESTED")}>Not interested <b>{bucketCounts.NOT_INTERESTED}</b></button>
        <button className={quickView === "ALL" ? "active" : ""} onClick={() => setQuickView("ALL")}>All roles <b>{jobs.length}</b></button>
      </div>

      <div className="navigator-toolbar">
        <label className="search"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, team, family, theme, or reason..." /></label>
        <label className="select-filter"><SlidersHorizontal /> Group by<select value={settings.portfolioGroupBy} onChange={(event) => setSettings({ portfolioGroupBy: event.target.value as PortfolioGroupBy })}>{GROUP_BY_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
      </div>

      <div className="status-filters"><span><Filter /> Visible statuses</span>{STATUS_OPTIONS.map((status) => <button key={status} className={!settings.hiddenStatuses.includes(status) ? "active" : ""} onClick={() => toggleStatus(status)}>{formatStatus(status)}</button>)}<button className="reset-filter" onClick={() => setSettings({ hiddenStatuses: [] })}>Show all</button></div>
    </div>

    <div className="navigator-groups">{groups.length ? groups.map(([key, groupJobs]) => {
      const collapsed = settings.collapsedGroups.includes(key);
      const limit = expandedLimits[key] || 10;
      const shown = groupJobs.slice(0, limit);
      return <section className={`panel navigator-group ${collapsed ? "collapsed" : ""}`} key={key}>
        <button className="navigator-group-head" onClick={() => toggleGroup(key)}>
          <span className="collapse-icon">{collapsed ? <ChevronRight /> : <ChevronDown />}</span>
          <div><h3>{groupLabel(key, settings.portfolioGroupBy)}</h3><p>{groupDescription(key, settings.portfolioGroupBy)}</p></div>
          <strong>{groupJobs.length}</strong>
        </button>
        {!collapsed && <>
          {settings.portfolioGroupBy === "FOCUS_BUCKET" && <div className={`focus-explanation focus-${key.toLowerCase().replace(/_/g, "-")}`}><Target /><span>{groupJobs[0] && assessments.get(groupJobs[0].id)?.focusReason}</span></div>}
          <JobTable jobs={shown} assessments={assessments} onOpen={onOpen} onUpdate={onUpdate} compact />
          {groupJobs.length > shown.length && <button className="show-more" onClick={() => setExpandedLimits((current) => ({ ...current, [key]: limit + 10 }))}>Show {Math.min(10, groupJobs.length - shown.length)} more <ChevronDown /></button>}
        </>}
      </section>;
    }) : <div className="panel empty"><Archive /><h3>No opportunities match this view</h3><p>Try another focus view, show more statuses, or clear the search.</p><button className="secondary" onClick={() => { setQuickView("ALL"); setSearch(""); setSettings({ hiddenStatuses: [], hiddenFocusBuckets: [] }); }}>Reset navigator</button></div>}</div>
  </section>;
}
