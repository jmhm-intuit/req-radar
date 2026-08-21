import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownUp,
  ChevronRight,
  Compass,
  ExternalLink,
  Filter,
  Pin,
  PinOff,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp
} from "lucide-react";
import { formatStatus } from "../lib/jobs";
import {
  DECISION_ACTION_LABELS,
  MATCH_STATUS_LABELS,
  SCOPE_STATUS_LABELS
} from "../lib/fitNavigator";
import type {
  DecisionAction,
  JobAssessment,
  JobReq,
  JobStatus,
  ScopeStatus
} from "../types";
import { STATUS_OPTIONS } from "./JobTable";

interface EvidencePortfolioViewProps {
  jobs: JobReq[];
  assessments: Map<string, JobAssessment>;
  onOpen: (jobId: string) => void;
  onUpdate: (jobId: string, changes: Partial<JobReq>) => void;
  onOpenHeatmap: () => void;
  onOpenDemand: () => void;
  onOpenCompare: () => void;
}

type QuickView = "ACTIVE" | DecisionAction | ScopeStatus | "ALL";
type SortMode = "PRIORITY" | "READINESS" | "INTEREST" | "EVIDENCE" | "AGE";

const ACTION_ORDER: Record<DecisionAction, number> = {
  PURSUE: 0,
  EXPLORE: 1,
  HOLD: 2,
  VERIFY_ACTIVE: 3,
  DO_NOT_PURSUE: 4
};

const SCOPE_ORDER: Record<ScopeStatus, number> = {
  IN_SCOPE_NOW: 0,
  CREDIBLE_STRETCH: 1,
  INSUFFICIENT_EVIDENCE: 2,
  OUT_OF_SCOPE: 3
};

function topCounts(values: string[], limit: number): Array<{ label: string; count: number }> {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  return [...counts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)).slice(0, limit);
}

function actionClass(value: DecisionAction): string {
  return `decision-${value.toLowerCase().replace(/_/g, "-")}`;
}

function scopeClass(value: ScopeStatus): string {
  return `scope-${value.toLowerCase().replace(/_/g, "-")}`;
}

function technicalModeLabel(value: JobAssessment["successProfile"]["technicalMode"]): string {
  const labels = {
    NON_TECHNICAL: "Non-technical",
    TECHNICAL_ENVIRONMENT: "Technical environment",
    TECHNICAL_FLUENCY: "Technical fluency",
    HANDS_ON_EXECUTION: "Hands-on technical",
    UNKNOWN: "Technical scope unknown"
  } as const;
  return labels[value];
}

function ScoreBar({ value, label }: { value: number; label: string }) {
  return <div className="signature-score"><div><strong>{value}</strong><span>{label}</span></div><i><b style={{ width: `${value}%` }} /></i></div>;
}

export function EvidencePortfolioView({ jobs, assessments, onOpen, onUpdate, onOpenHeatmap, onOpenDemand, onOpenCompare }: EvidencePortfolioViewProps) {
  const [search, setSearch] = useState("");
  const [quickView, setQuickView] = useState<QuickView>("ACTIVE");
  const [sortMode, setSortMode] = useState<SortMode>("PRIORITY");
  const [roleFamily, setRoleFamily] = useState("ALL");
  const [showLimit, setShowLimit] = useState(25);

  const assessedJobs = useMemo(() => jobs.filter((job) => assessments.has(job.id)), [jobs, assessments]);
  const actionCounts = useMemo(() => Object.fromEntries((["PURSUE", "EXPLORE", "HOLD", "DO_NOT_PURSUE", "VERIFY_ACTIVE"] as DecisionAction[]).map((action) => [action, assessedJobs.filter((job) => assessments.get(job.id)?.fitSignature.decisionAction === action).length])) as Record<DecisionAction, number>, [assessedJobs, assessments]);
  const scopeCounts = useMemo(() => Object.fromEntries((["IN_SCOPE_NOW", "CREDIBLE_STRETCH", "OUT_OF_SCOPE", "INSUFFICIENT_EVIDENCE"] as ScopeStatus[]).map((status) => [status, assessedJobs.filter((job) => assessments.get(job.id)?.fitSignature.scopeStatus === status).length])) as Record<ScopeStatus, number>, [assessedJobs, assessments]);
  const families = useMemo(() => [...new Set(assessedJobs.map((job) => assessments.get(job.id)?.fingerprint.primaryGroupLabel).filter((value): value is string => Boolean(value)))].sort(), [assessedJobs, assessments]);

  const recurringStrengths = useMemo(() => topCounts([...assessments.values()].flatMap((assessment) => assessment.capabilitySkills.filter((item) => item.status === "PROVEN").map((item) => item.requirement.name)), 5), [assessments]);
  const recurringTransferable = useMemo(() => topCounts([...assessments.values()].flatMap((assessment) => assessment.capabilitySkills.filter((item) => item.status === "TRANSFERABLE" || item.status === "PARTIAL").map((item) => item.requirement.name)), 5), [assessments]);
  const recurringBlockers = useMemo(() => topCounts([...assessments.values()].flatMap((assessment) => assessment.capabilitySkills.filter((item) => item.status === "CRITICAL_BLOCKER" || item.status === "NOT_DEMONSTRATED").map((item) => item.requirement.name)), 5), [assessments]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const activeStatuses: JobStatus[] = ["NEW", "EXPLORING", "PURSUING", "MAYBE", "APPLIED"];
    return assessedJobs.filter((job) => {
      const assessment = assessments.get(job.id)!;
      if (quickView === "ACTIVE" && !activeStatuses.includes(job.status)) return false;
      if ((["PURSUE", "EXPLORE", "HOLD", "DO_NOT_PURSUE", "VERIFY_ACTIVE"] as string[]).includes(quickView) && assessment.fitSignature.decisionAction !== quickView) return false;
      if ((["IN_SCOPE_NOW", "CREDIBLE_STRETCH", "OUT_OF_SCOPE", "INSUFFICIENT_EVIDENCE"] as string[]).includes(quickView) && assessment.fitSignature.scopeStatus !== quickView) return false;
      if (roleFamily !== "ALL" && assessment.fingerprint.primaryGroupLabel !== roleFamily) return false;
      if (!query) return true;
      const haystack = `${job.title} ${job.jobId} ${job.team} ${job.category} ${assessment.fingerprint.primaryGroupLabel} ${assessment.capabilitySkills.map((item) => item.requirement.name).join(" ")}`.toLowerCase();
      return haystack.includes(query);
    }).sort((left, right) => {
      const a = assessments.get(left.id)!;
      const b = assessments.get(right.id)!;
      if (left.pinned !== right.pinned) return left.pinned ? -1 : 1;
      if (sortMode === "READINESS") return b.fitSignature.readinessScore - a.fitSignature.readinessScore;
      if (sortMode === "INTEREST") return b.fitSignature.attractionScore - a.fitSignature.attractionScore;
      if (sortMode === "EVIDENCE") return b.fitSignature.evidenceConfidence - a.fitSignature.evidenceConfidence;
      if (sortMode === "AGE") return (a.ageDays ?? 9999) - (b.ageDays ?? 9999);
      const actionOrder = ACTION_ORDER[a.fitSignature.decisionAction] - ACTION_ORDER[b.fitSignature.decisionAction];
      if (actionOrder) return actionOrder;
      const scopeOrder = SCOPE_ORDER[a.fitSignature.scopeStatus] - SCOPE_ORDER[b.fitSignature.scopeStatus];
      if (scopeOrder) return scopeOrder;
      return b.finalScore - a.finalScore;
    });
  }, [assessedJobs, assessments, search, quickView, sortMode, roleFamily]);

  const strongestNext = filtered.find((job) => assessments.get(job.id)?.fitSignature.decisionAction === "EXPLORE" || assessments.get(job.id)?.fitSignature.decisionAction === "PURSUE");
  const strongestNextAssessment = strongestNext ? assessments.get(strongestNext.id) : null;

  return <div className="evidence-portfolio">
    <section className="panel fit-portfolio-hero">
      <div><span className="eyebrow">Evidence-Based Fit Navigator</span><h2>Understand scope first, then decide where to invest</h2><p>ReqRadar separates whether a role is in scope, what your experience proves, how attractive the work is, and how confident the assessment should be.</p></div>
      <div className="fit-summary-grid">
        <button className="fit-summary strong" onClick={() => setQuickView("PURSUE")}><strong>{actionCounts.PURSUE}</strong><span>Pursue</span><small>Strong evidence and attraction</small></button>
        <button className="fit-summary explore" onClick={() => setQuickView("EXPLORE")}><strong>{actionCounts.EXPLORE}</strong><span>Explore</span><small>Worth targeted validation</small></button>
        <button className="fit-summary stretch" onClick={() => setQuickView("CREDIBLE_STRETCH")}><strong>{scopeCounts.CREDIBLE_STRETCH}</strong><span>Credible stretches</span><small>Manageable gaps</small></button>
        <button className="fit-summary out" onClick={() => setQuickView("OUT_OF_SCOPE")}><strong>{scopeCounts.OUT_OF_SCOPE}</strong><span>Out of scope</span><small>Hard gates or central gaps</small></button>
      </div>
    </section>

    <section className="fit-insight-grid">
      <article className="panel portfolio-insight strength"><ShieldCheck /><div><span>Strongest recurring evidence</span><h3>{recurringStrengths[0]?.label || "Build your evidence profile"}</h3><p>{recurringStrengths.length ? recurringStrengths.map((item) => `${item.label} (${item.count})`).join(" · ") : "Upload and review a resume to trace role requirements to experience."}</p></div></article>
      <article className="panel portfolio-insight transfer"><TrendingUp /><div><span>Most common transferable areas</span><h3>{recurringTransferable[0]?.label || "No repeated pattern yet"}</h3><p>{recurringTransferable.length ? recurringTransferable.map((item) => `${item.label} (${item.count})`).join(" · ") : "Related evidence will appear here when roles require adjacent experience."}</p></div></article>
      <article className="panel portfolio-insight risk"><AlertTriangle /><div><span>Recurring gaps to inspect</span><h3>{recurringBlockers[0]?.label || "No repeated blocker"}</h3><p>{recurringBlockers.length ? recurringBlockers.map((item) => `${item.label} (${item.count})`).join(" · ") : "No common hard gate has been detected across the current portfolio."}</p></div></article>
      <article className="panel portfolio-insight next"><Target /><div><span>Highest-value next action</span><h3>{strongestNext?.title || "Add opportunities"}</h3><p>{strongestNextAssessment?.nextAction || "Upload job descriptions and complete the Career Evidence profile."}</p></div></article>
    </section>

    <section className="panel portfolio-tools">
      <div className="portfolio-view-tabs">
        <button onClick={onOpenHeatmap}><Target /> Competency heatmap</button>
        <button onClick={onOpenDemand}><TrendingUp /> Portfolio demand</button>
        <button onClick={onOpenCompare}><Compass /> Compare 3–5 roles</button>
      </div>
      <div className="fit-quick-views">
        <button className={quickView === "ACTIVE" ? "active" : ""} onClick={() => setQuickView("ACTIVE")}>Active <b>{assessedJobs.filter((job) => !["NOT_PURSUING", "CLOSED"].includes(job.status)).length}</b></button>
        <button className={quickView === "PURSUE" ? "active" : ""} onClick={() => setQuickView("PURSUE")}>Pursue <b>{actionCounts.PURSUE}</b></button>
        <button className={quickView === "EXPLORE" ? "active" : ""} onClick={() => setQuickView("EXPLORE")}>Explore <b>{actionCounts.EXPLORE}</b></button>
        <button className={quickView === "VERIFY_ACTIVE" ? "active" : ""} onClick={() => setQuickView("VERIFY_ACTIVE")}>Verify active <b>{actionCounts.VERIFY_ACTIVE}</b></button>
        <button className={quickView === "DO_NOT_PURSUE" ? "active" : ""} onClick={() => setQuickView("DO_NOT_PURSUE")}>Do not pursue <b>{actionCounts.DO_NOT_PURSUE}</b></button>
        <button className={quickView === "ALL" ? "active" : ""} onClick={() => setQuickView("ALL")}>All <b>{assessedJobs.length}</b></button>
      </div>
      <div className="fit-filter-row">
        <label className="search"><Search /><input value={search} onChange={(event) => { setSearch(event.target.value); setShowLimit(25); }} placeholder="Search role, family, team, or competency..." /></label>
        <label><Filter /> Role family<select value={roleFamily} onChange={(event) => setRoleFamily(event.target.value)}><option value="ALL">All families</option>{families.map((family) => <option key={family} value={family}>{family}</option>)}</select></label>
        <label><ArrowDownUp /> Sort<select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}><option value="PRIORITY">Recommended priority</option><option value="READINESS">Readiness</option><option value="INTEREST">Interest</option><option value="EVIDENCE">Evidence confidence</option><option value="AGE">Newest first</option></select></label>
      </div>
    </section>

    <section className="panel fit-signature-table-panel">
      <div className="panel-head responsive"><div><span className="eyebrow">Fit Signature table</span><h2>{filtered.length} opportunity{filtered.length === 1 ? "" : "ies"}</h2><p>Scope and action are independent. A role can be in scope but not interesting, or a credible stretch worth exploring.</p></div><small className="legend-note">“Not demonstrated” means missing from the current evidence profile—not necessarily absent.</small></div>
      <div className="table-wrap fit-table-wrap"><table className="fit-signature-table"><thead><tr><th>#</th><th>Opportunity</th><th>Scope</th><th>Action</th><th>Readiness</th><th>Technical scope</th><th>Interest</th><th>Direction</th><th>Evidence</th><th>Age</th><th>Status</th><th /></tr></thead><tbody>{filtered.slice(0, showLimit).map((job, index) => {
        const assessment = assessments.get(job.id)!;
        return <tr key={job.id} className={`${job.pinned ? "pinned-row" : ""} ${assessment.fitSignature.scopeStatus === "OUT_OF_SCOPE" ? "out-scope-row" : ""}`}>
          <td><div className="rank-cell"><button className="icon-btn subtle" onClick={() => onUpdate(job.id, { pinned: !job.pinned })}>{job.pinned ? <Pin size={15} /> : <PinOff size={15} />}</button><strong>{index + 1}</strong><span>{assessment.finalScore}</span></div></td>
          <td><button className="job-link" onClick={() => onOpen(job.id)}><strong>{job.title}</strong><span>{assessment.fingerprint.primaryGroupLabel} · {job.team || job.category || "Team not specified"}</span></button></td>
          <td><span className={`scope-chip ${scopeClass(assessment.fitSignature.scopeStatus)}`}>{SCOPE_STATUS_LABELS[assessment.fitSignature.scopeStatus]}</span><small className="table-sub">{assessment.fitSignature.scopeReason}</small></td>
          <td><span className={`decision-chip ${actionClass(assessment.fitSignature.decisionAction)}`}>{DECISION_ACTION_LABELS[assessment.fitSignature.decisionAction]}</span><small className="table-sub">{assessment.fitSignature.rankingRobustness.toLowerCase()} rank</small></td>
          <td><ScoreBar value={assessment.fitSignature.readinessScore} label="overall" /><small className="table-sub">G {assessment.generalCompetencyScore} · D {assessment.domainReadinessScore} · S {assessment.scopeReadinessScore}</small></td>
          <td><span className={`technical-mode technical-${assessment.successProfile.technicalMode.toLowerCase().replace(/_/g, "-")}`}>{technicalModeLabel(assessment.successProfile.technicalMode)}</span><small className="table-sub">{assessment.technicalReadinessScore}% readiness</small></td>
          <td><ScoreBar value={assessment.fitSignature.attractionScore} label="attraction" /></td>
          <td><ScoreBar value={assessment.fitSignature.directionScore} label="direction" /></td>
          <td><ScoreBar value={assessment.fitSignature.evidenceConfidence} label="confidence" /><small className="table-sub">{assessment.capabilitySkills.filter((item) => item.status === "PROVEN").length} proven · {assessment.capabilitySkills.filter((item) => item.status === "TRANSFERABLE").length} transferable</small></td>
          <td><span className={assessment.fitSignature.decisionAction === "VERIFY_ACTIVE" ? "age-old" : "age-label"}>{assessment.ageLabel}</span></td>
          <td><select className={`compact-select status-${job.status.toLowerCase().replace(/_/g, "-")}`} value={job.status} onChange={(event) => onUpdate(job.id, { status: event.target.value as JobStatus })}>{STATUS_OPTIONS.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}</select></td>
          <td><div className="row-actions">{job.jobUrl && <button className="icon-btn" title="Open job requisition" onClick={() => window.open(job.jobUrl, "_blank", "noopener,noreferrer")}><ExternalLink size={16} /></button>}<button className="icon-btn" title={`Open Match Ledger · ${MATCH_STATUS_LABELS[assessment.competencyFamilies.find((family) => family.family === "STRATEGY")?.dominantStatus || "UNKNOWN"]}`} onClick={() => onOpen(job.id)}><ChevronRight size={18} /></button></div></td>
        </tr>;
      })}</tbody></table></div>
      {filtered.length > showLimit && <button className="show-more" onClick={() => setShowLimit((value) => value + 25)}>Show {Math.min(25, filtered.length - showLimit)} more</button>}
      {!filtered.length && <div className="empty-inline"><Sparkles /> No roles match these filters. Try All opportunities or clear the search.</div>}
    </section>
  </div>;
}
