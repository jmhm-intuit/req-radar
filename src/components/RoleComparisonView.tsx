import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronRight,
  GitCompareArrows,
  Search,
  Sparkles,
  Target,
  X
} from "lucide-react";
import {
  DECISION_ACTION_LABELS,
  MATCH_STATUS_LABELS,
  SCOPE_STATUS_LABELS
} from "../lib/fitNavigator";
import type {
  JobAssessment,
  JobReq,
  SkillMatchStatus
} from "../types";

interface RoleComparisonViewProps {
  jobs: JobReq[];
  assessments: Map<string, JobAssessment>;
  onOpen: (jobId: string) => void;
}

const STATUS_ORDER: Record<SkillMatchStatus, number> = {
  CRITICAL_BLOCKER: 0,
  NOT_DEMONSTRATED: 1,
  DEVELOPMENT_GAP: 2,
  PARTIAL: 3,
  UNKNOWN: 4,
  TRANSFERABLE: 5,
  PROVEN: 6,
  NOT_RELEVANT: 7
};

function statusClass(status: SkillMatchStatus): string {
  return `match-${status.toLowerCase().replace(/_/g, "-")}`;
}

function statusMark(status: SkillMatchStatus): string {
  return { PROVEN: "✓", TRANSFERABLE: "↗", PARTIAL: "~", DEVELOPMENT_GAP: "△", NOT_DEMONSTRATED: "–", CRITICAL_BLOCKER: "!", UNKNOWN: "?", NOT_RELEVANT: "·" }[status];
}

export function RoleComparisonView({ jobs, assessments, onOpen }: RoleComparisonViewProps) {
  const ranked = useMemo(() => jobs.filter((job) => assessments.has(job.id) && !["NOT_PURSUING", "CLOSED"].includes(job.status)).sort((a, b) => (assessments.get(b.id)?.finalScore || 0) - (assessments.get(a.id)?.finalScore || 0)), [jobs, assessments]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    setSelectedIds((current) => current.length ? current.filter((id) => jobs.some((job) => job.id === id)) : ranked.slice(0, 3).map((job) => job.id));
  }, [jobs.length, ranked.length]);

  const selected = selectedIds.map((id) => jobs.find((job) => job.id === id)).filter((job): job is JobReq => Boolean(job));
  const pickerJobs = ranked.filter((job) => `${job.title} ${job.team} ${assessments.get(job.id)?.fingerprint.primaryGroupLabel}`.toLowerCase().includes(search.toLowerCase()));

  const requirementRows = useMemo(() => {
    const counts = new Map<string, { name: string; centrality: number; roles: number }>();
    selected.forEach((job) => assessments.get(job.id)?.capabilitySkills.forEach((item) => {
      const key = item.requirement.name.toLowerCase();
      const existing = counts.get(key) || { name: item.requirement.name, centrality: 0, roles: 0 };
      existing.centrality += item.requirement.centrality;
      existing.roles += 1;
      counts.set(key, existing);
    }));
    return [...counts.values()].sort((a, b) => b.roles - a.roles || b.centrality - a.centrality || a.name.localeCompare(b.name)).slice(0, 14);
  }, [selectedIds, assessments]);

  const commonProven = useMemo(() => {
    if (selected.length < 2) return [];
    const sets = selected.map((job) => new Set(assessments.get(job.id)?.capabilitySkills.filter((item) => item.status === "PROVEN").map((item) => item.requirement.name) || []));
    return [...sets[0]].filter((name) => sets.every((set) => set.has(name))).slice(0, 8);
  }, [selectedIds, assessments]);

  const differentiators = useMemo(() => selected.map((job) => {
    const assessment = assessments.get(job.id)!;
    const uniqueWork = assessment.successProfile.workprint.filter((item) => item.score >= 14).slice(0, 3);
    const uniqueGaps = assessment.capabilitySkills.filter((item) => ["CRITICAL_BLOCKER", "NOT_DEMONSTRATED", "DEVELOPMENT_GAP", "PARTIAL"].includes(item.status)).sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]).slice(0, 3);
    return { job, uniqueWork, uniqueGaps };
  }), [selectedIds, assessments]);

  const toggle = (id: string) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 5 ? [...current, id] : current);
  };

  return <div className="role-comparison-view">
    <section className="panel compare-hero"><div><span className="eyebrow">Multi-role comparison</span><h2>Compare the work, evidence, and trade-offs—not only the score</h2><p>Select two to five opportunities. ReqRadar highlights common strengths, different responsibility mixes, unique gaps, and the decisions most likely to separate the roles.</p></div><GitCompareArrows /></section>

    <section className="panel compare-selector"><div className="selected-role-chips">{selected.map((job) => <span key={job.id}><button onClick={() => onOpen(job.id)}>{job.title}</button><button onClick={() => toggle(job.id)}><X /></button></span>)}<button className="add-role-chip" onClick={() => setPickerOpen(!pickerOpen)}>+ Add role</button></div><small>{selected.length}/5 selected · choose at least two</small>{pickerOpen && <div className="role-picker"><label className="search"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search roles..." /></label><div>{pickerJobs.map((job) => <button key={job.id} className={selectedIds.includes(job.id) ? "selected" : ""} disabled={!selectedIds.includes(job.id) && selectedIds.length >= 5} onClick={() => toggle(job.id)}>{selectedIds.includes(job.id) ? <Check /> : <i /> }<span><strong>{job.title}</strong><small>{assessments.get(job.id)?.fingerprint.primaryGroupLabel}</small></span></button>)}</div></div>}</section>

    {selected.length >= 2 ? <>
      <section className="compare-card-grid">{selected.map((job) => { const assessment = assessments.get(job.id)!; return <article className="panel compare-role-card" key={job.id}><header><div><span>{assessment.fingerprint.primaryGroupLabel}</span><h3>{job.title}</h3></div><button className="icon-btn" onClick={() => onOpen(job.id)}><ChevronRight /></button></header><div className="compare-signature"><span className={`scope-chip scope-${assessment.fitSignature.scopeStatus.toLowerCase().replace(/_/g, "-")}`}>{SCOPE_STATUS_LABELS[assessment.fitSignature.scopeStatus]}</span><span className={`decision-chip decision-${assessment.fitSignature.decisionAction.toLowerCase().replace(/_/g, "-")}`}>{DECISION_ACTION_LABELS[assessment.fitSignature.decisionAction]}</span></div><div className="compare-metrics"><div><strong>{assessment.fitSignature.readinessScore}</strong><span>Readiness</span></div><div><strong>{assessment.fitSignature.attractionScore}</strong><span>Attraction</span></div><div><strong>{assessment.fitSignature.directionScore}</strong><span>Direction</span></div><div><strong>{assessment.fitSignature.evidenceConfidence}</strong><span>Evidence</span></div></div><p>{assessment.fitSignature.decisionReason}</p><small>{assessment.fitSignature.rankingSensitivity}</small></article>; })}</section>

      <section className="panel compare-workprints"><div className="panel-head responsive"><div><span className="eyebrow">Role Workprints</span><h2>How the responsibility mix differs</h2><p>Workprint percentages are estimated from posting signals and should be validated when they materially affect your choice.</p></div><Target /></div><div className="workprint-comparison">{selected.map((job) => { const assessment = assessments.get(job.id)!; return <article key={job.id}><button onClick={() => onOpen(job.id)}>{job.title}</button><div>{assessment.successProfile.workprint.slice(0, 6).map((item) => <span key={item.id}><i><b style={{ width: `${item.score}%` }} /></i><strong>{item.label}</strong><small>{item.score}%</small></span>)}</div></article>; })}</div></section>

      <section className="comparison-insight-grid"><article className="panel compare-insight strengths"><Sparkles /><div><span>Common proven strengths</span><h3>{commonProven.length ? commonProven.join(" · ") : "No competency is proven across every selected role"}</h3><p>These capabilities are reusable across the selected opportunity set.</p></div></article>{differentiators.map(({ job, uniqueWork, uniqueGaps }) => <article className="panel compare-insight" key={job.id}><div><span>{job.title}</span><h3>{uniqueWork.map((item) => item.label).join(" · ") || "No distinct work signal"}</h3><p>{uniqueGaps.length ? `Distinct gaps: ${uniqueGaps.map((item) => item.requirement.name).join(", ")}` : "No material gap detected in the top requirements."}</p></div></article>)}</section>

      <section className="panel compare-ledger"><div className="panel-head responsive"><div><span className="eyebrow">Cross-role Match Ledger</span><h2>Requirement-by-requirement evidence</h2><p>Open a role to inspect the exact job-description text and the supporting past experience.</p></div></div><div className="heatmap-scroll"><table className="comparison-ledger-table"><thead><tr><th>Competency</th>{selected.map((job) => <th key={job.id}>{job.title}</th>)}</tr></thead><tbody>{requirementRows.map((row) => <tr key={row.name}><th>{row.name}<small>{row.roles} of {selected.length} roles</small></th>{selected.map((job) => { const item = assessments.get(job.id)?.capabilitySkills.find((match) => match.requirement.name === row.name); const status = item?.status || "NOT_RELEVANT"; return <td key={job.id}><button className={`ledger-cell ${statusClass(status)}`} onClick={() => onOpen(job.id)}><b>{statusMark(status)}</b><strong>{item ? MATCH_STATUS_LABELS[status] : "Not required"}</strong><small>{item?.matchedProfileSkill?.name || item?.reason || ""}</small></button></td>; })}</tr>)}</tbody></table></div></section>

      <section className="panel compare-responsibilities"><div className="panel-head responsive"><div><span className="eyebrow">Life in the role</span><h2>Recurring responsibilities</h2><p>Use these side by side to picture which work you would actually repeat.</p></div></div><div>{selected.map((job) => { const assessment = assessments.get(job.id)!; return <article key={job.id}><button onClick={() => onOpen(job.id)}>{job.title}<ChevronRight /></button><ul>{assessment.successProfile.recurringResponsibilities.slice(0, 5).map((item) => <li key={item.id}>{item.statement}</li>)}</ul></article>; })}</div></section>
    </> : <section className="panel empty"><GitCompareArrows /><h3>Select at least two roles</h3><p>Add opportunities above to compare their Fit Signatures, Workprints, requirements, and evidence.</p></section>}
  </div>;
}
