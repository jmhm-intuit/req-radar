import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  ChevronRight,
  Search,
  ShieldCheck,
  TrendingUp
} from "lucide-react";
import {
  COMPETENCY_FAMILY_LABELS,
  COMPETENCY_FAMILY_ORDER,
  MATCH_STATUS_LABELS
} from "../lib/fitNavigator";
import type {
  CapabilitySkillAssessment,
  CompetencyFamily,
  JobAssessment,
  JobReq,
  SkillMatchStatus
} from "../types";

interface PortfolioDemandViewProps {
  jobs: JobReq[];
  assessments: Map<string, JobAssessment>;
  onOpen: (jobId: string) => void;
}

interface DemandRow {
  name: string;
  family: CompetencyFamily;
  jobIds: string[];
  mustCount: number;
  centrality: number;
  statuses: Record<SkillMatchStatus, number>;
  assessment: "MARKET_STRENGTH" | "TRANSFERABLE" | "VALIDATE" | "OUT_OF_SCOPE_PATTERN" | "INSUFFICIENT_EVIDENCE";
  score: number;
}

const EMPTY_STATUSES: Record<SkillMatchStatus, number> = {
  PROVEN: 0,
  TRANSFERABLE: 0,
  PARTIAL: 0,
  DEVELOPMENT_GAP: 0,
  NOT_DEMONSTRATED: 0,
  CRITICAL_BLOCKER: 0,
  UNKNOWN: 0,
  NOT_RELEVANT: 0
};

function classify(row: Omit<DemandRow, "assessment" | "score">): Pick<DemandRow, "assessment" | "score"> {
  const total = row.jobIds.length || 1;
  const proven = row.statuses.PROVEN;
  const transferable = row.statuses.TRANSFERABLE;
  const partial = row.statuses.PARTIAL;
  const gaps = row.statuses.DEVELOPMENT_GAP + row.statuses.NOT_DEMONSTRATED;
  const blockers = row.statuses.CRITICAL_BLOCKER;
  const unknown = row.statuses.UNKNOWN;
  const score = Math.round(((proven * 100 + transferable * 76 + partial * 55 + gaps * 30 + blockers * 0 + unknown * 50) / total));
  if (blockers >= Math.max(1, Math.ceil(total * 0.35))) return { assessment: "OUT_OF_SCOPE_PATTERN", score };
  if (proven >= Math.max(2, Math.ceil(total * 0.5))) return { assessment: "MARKET_STRENGTH", score };
  if (proven + transferable >= Math.max(2, Math.ceil(total * 0.55))) return { assessment: "TRANSFERABLE", score };
  if (unknown >= Math.ceil(total * 0.5)) return { assessment: "INSUFFICIENT_EVIDENCE", score };
  return { assessment: "VALIDATE", score };
}

function assessmentLabel(value: DemandRow["assessment"]): string {
  return {
    MARKET_STRENGTH: "Market strength",
    TRANSFERABLE: "Transferable strength",
    VALIDATE: "Validate or strengthen",
    OUT_OF_SCOPE_PATTERN: "Recurring out-of-scope pattern",
    INSUFFICIENT_EVIDENCE: "Needs more evidence"
  }[value];
}

export function PortfolioDemandView({ jobs, assessments, onOpen }: PortfolioDemandViewProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<DemandRow["assessment"] | "ALL">("ALL");
  const [expandedFamily, setExpandedFamily] = useState<CompetencyFamily | "">("");
  const [showAllFamilies, setShowAllFamilies] = useState(false);

  const rows = useMemo(() => {
    const map = new Map<string, Omit<DemandRow, "assessment" | "score">>();
    jobs.forEach((job) => {
      const assessment = assessments.get(job.id);
      if (!assessment || ["NOT_PURSUING", "CLOSED"].includes(job.status)) return;
      assessment.capabilitySkills.forEach((item: CapabilitySkillAssessment) => {
        const key = item.requirement.name.toLowerCase();
        const existing = map.get(key) || {
          name: item.requirement.name,
          family: item.requirement.family,
          jobIds: [],
          mustCount: 0,
          centrality: 0,
          statuses: { ...EMPTY_STATUSES }
        };
        if (!existing.jobIds.includes(job.id)) existing.jobIds.push(job.id);
        if (["HARD_GATE", "DAY_ONE_ESSENTIAL"].includes(item.requirement.criticality)) existing.mustCount += 1;
        existing.centrality += item.requirement.centrality;
        existing.statuses[item.status] += 1;
        map.set(key, existing);
      });
    });
    return [...map.values()].map((row) => ({ ...row, ...classify(row) })).sort((a, b) => b.jobIds.length - a.jobIds.length || b.score - a.score || a.name.localeCompare(b.name));
  }, [jobs, assessments]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => (filter === "ALL" || row.assessment === filter) && (!query || `${row.name} ${COMPETENCY_FAMILY_LABELS[row.family]}`.toLowerCase().includes(query)));
  }, [rows, search, filter]);

  const familySummaries = useMemo(() => COMPETENCY_FAMILY_ORDER.flatMap((family) => {
    const familyRows = visible.filter((row) => row.family === family);
    if (!familyRows.length) return [];
    const jobIds = new Set(familyRows.flatMap((row) => row.jobIds));
    const weightedTotal = familyRows.reduce((sum, row) => sum + row.score * Math.max(1, row.jobIds.length), 0);
    const weight = familyRows.reduce((sum, row) => sum + Math.max(1, row.jobIds.length), 0);
    const counts = { MARKET_STRENGTH: 0, TRANSFERABLE: 0, VALIDATE: 0, OUT_OF_SCOPE_PATTERN: 0, INSUFFICIENT_EVIDENCE: 0 };
    familyRows.forEach((row) => { counts[row.assessment] += 1; });
    const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as DemandRow["assessment"];
    return [{ family, rows: familyRows, roleCount: jobIds.size, score: Math.round(weightedTotal / Math.max(1, weight)), dominant }];
  }).sort((left, right) => right.roleCount - left.roleCount || right.score - left.score), [visible]);

  const strengths = rows.filter((row) => row.assessment === "MARKET_STRENGTH").slice(0, 6);
  const transferable = rows.filter((row) => row.assessment === "TRANSFERABLE").slice(0, 6);
  const risks = rows.filter((row) => row.assessment === "OUT_OF_SCOPE_PATTERN" || row.assessment === "VALIDATE").slice(0, 6);

  return <div className="demand-view">
    <section className="panel demand-hero"><div><span className="eyebrow">Portfolio Demand Map</span><h2>What does your opportunity set repeatedly ask for?</h2><p>Reverse the analysis: see which competencies appear across roles, where your past experience is strongest, and which recurring gaps should shape the search.</p></div><BarChart3 /></section>

    <section className="demand-summary-grid">
      <article className="panel demand-summary strength"><ShieldCheck /><div><span>Recurring market strengths</span><h3>{strengths[0]?.name || "No repeated strength yet"}</h3><p>{strengths.length ? strengths.map((row) => `${row.name} · ${row.jobIds.length}`).join(" · ") : "Review resume evidence to identify repeated strengths."}</p></div></article>
      <article className="panel demand-summary transfer"><TrendingUp /><div><span>Transferable opportunities</span><h3>{transferable[0]?.name || "No repeated transferable pattern"}</h3><p>{transferable.length ? transferable.map((row) => `${row.name} · ${row.jobIds.length}`).join(" · ") : "Adjacent competencies will appear here."}</p></div></article>
      <article className="panel demand-summary risk"><AlertTriangle /><div><span>Patterns to validate or avoid</span><h3>{risks[0]?.name || "No repeated blocker"}</h3><p>{risks.length ? risks.map((row) => `${row.name} · ${row.jobIds.length}`).join(" · ") : "No recurring out-of-scope pattern detected."}</p></div></article>
    </section>

    <section className="panel demand-controls"><label className="search"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search competencies..." /></label><div className="fit-quick-views"><button className={filter === "ALL" ? "active" : ""} onClick={() => setFilter("ALL")}>All</button><button className={filter === "MARKET_STRENGTH" ? "active" : ""} onClick={() => setFilter("MARKET_STRENGTH")}>Market strengths</button><button className={filter === "TRANSFERABLE" ? "active" : ""} onClick={() => setFilter("TRANSFERABLE")}>Transferable</button><button className={filter === "VALIDATE" ? "active" : ""} onClick={() => setFilter("VALIDATE")}>Validate</button><button className={filter === "OUT_OF_SCOPE_PATTERN" ? "active" : ""} onClick={() => setFilter("OUT_OF_SCOPE_PATTERN")}>Out-of-scope patterns</button></div></section>

    <section className="panel mobile-demand-family-panel">
      <div className="panel-head"><div><span className="eyebrow">Portfolio demand by family</span><h2>See the pattern before the 50 individual competencies</h2><p>Open one family at a time. Each card summarizes how often the portfolio asks for it and how strong your current evidence appears.</p></div></div>
      <div className="mobile-demand-family-list">{familySummaries.slice(0, showAllFamilies ? familySummaries.length : 5).map((summary) => {
        const expanded = expandedFamily === summary.family;
        return <article key={summary.family} className={expanded ? "expanded" : ""}>
          <button className="mobile-demand-family-head" onClick={() => setExpandedFamily(expanded ? "" : summary.family)}>
            <div><span>{assessmentLabel(summary.dominant)}</span><h3>{COMPETENCY_FAMILY_LABELS[summary.family]}</h3><p>{summary.rows.slice(0, 3).map((row) => row.name).join(" · ")}</p></div>
            <aside><strong>{summary.roleCount}</strong><span>roles</span><b>{summary.score}% coverage</b></aside>
            <ChevronRight />
          </button>
          {expanded && <div className="mobile-demand-competencies">{summary.rows.map((row) => <div key={row.name}>
            <header><div><strong>{row.name}</strong><span>{assessmentLabel(row.assessment)}</span></div><b>{row.score}</b></header>
            <p>Requested by {row.jobIds.length} active role{row.jobIds.length === 1 ? "" : "s"} · {row.mustCount} day-one or gate requirement{row.mustCount === 1 ? "" : "s"}</p>
            <div className="demand-status-stack">{(["PROVEN", "TRANSFERABLE", "PARTIAL", "DEVELOPMENT_GAP", "NOT_DEMONSTRATED", "CRITICAL_BLOCKER", "UNKNOWN"] as SkillMatchStatus[]).filter((status) => row.statuses[status]).map((status) => <span key={status} className={`match-${status.toLowerCase().replace(/_/g, "-")}`}>{MATCH_STATUS_LABELS[status]} {row.statuses[status]}</span>)}</div>
            <div className="mobile-demand-role-links">{row.jobIds.slice(0, 3).map((id) => { const job = jobs.find((item) => item.id === id); return job ? <button key={id} onClick={() => onOpen(id)}>{job.title}<ChevronRight /></button> : null; })}</div>
          </div>)}</div>}
        </article>;
      })}</div>
      {familySummaries.length > 5 && <button className="mobile-show-all" onClick={() => setShowAllFamilies((value) => !value)}>{showAllFamilies ? "Show fewer families" : `Show all ${familySummaries.length} families`}</button>}
    </section>

    <section className="panel demand-table-panel desktop-demand-ledger"><div className="panel-head responsive"><div><span className="eyebrow">Competency demand ledger</span><h2>{visible.length} recurring competencies</h2><p>Demand counts include active roles. Coverage is based on the evidence currently attached to your candidate profile.</p></div></div><div className="table-wrap"><table className="demand-table"><thead><tr><th>Competency</th><th>Family</th><th>Requested by</th><th>Day-one / gate</th><th>Evidence pattern</th><th>Coverage</th><th>Roles</th></tr></thead><tbody>{visible.map((row) => <tr key={row.name}><td><strong>{row.name}</strong><small>{assessmentLabel(row.assessment)}</small></td><td>{COMPETENCY_FAMILY_LABELS[row.family]}</td><td><b>{row.jobIds.length}</b><span> active roles</span></td><td>{row.mustCount}</td><td><div className="demand-status-stack">{(["PROVEN", "TRANSFERABLE", "PARTIAL", "DEVELOPMENT_GAP", "NOT_DEMONSTRATED", "CRITICAL_BLOCKER", "UNKNOWN"] as SkillMatchStatus[]).filter((status) => row.statuses[status]).map((status) => <span key={status} className={`match-${status.toLowerCase().replace(/_/g, "-")}`}>{MATCH_STATUS_LABELS[status]} {row.statuses[status]}</span>)}</div></td><td><div className="demand-score"><strong>{row.score}</strong><i><b style={{ width: `${row.score}%` }} /></i></div></td><td><div className="demand-role-links">{row.jobIds.slice(0, 3).map((id) => { const job = jobs.find((item) => item.id === id); return job ? <button key={id} onClick={() => onOpen(id)}>{job.title}<ChevronRight /></button> : null; })}{row.jobIds.length > 3 && <small>+{row.jobIds.length - 3} more</small>}</div></td></tr>)}</tbody></table></div>{!visible.length && <div className="empty-inline">No competencies match this view.</div>}</section>
  </div>;
}
