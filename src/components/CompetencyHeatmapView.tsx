import { useMemo, useState } from "react";
import {
  ChevronRight,
  Filter,
  Grid3X3,
  Search,
  ShieldAlert,
  SlidersHorizontal
} from "lucide-react";
import {
  COMPETENCY_FAMILY_LABELS,
  COMPETENCY_FAMILY_ORDER,
  MATCH_STATUS_LABELS
} from "../lib/fitNavigator";
import type {
  CompetencyFamily,
  JobAssessment,
  JobReq,
  SkillMatchStatus
} from "../types";

interface CompetencyHeatmapViewProps {
  jobs: JobReq[];
  assessments: Map<string, JobAssessment>;
  onOpen: (jobId: string) => void;
}

type HeatmapMode = "ALL" | "ACTIVE" | "GAPS" | "TOP";

const STATUS_PRIORITY: Record<SkillMatchStatus, number> = {
  CRITICAL_BLOCKER: 0,
  NOT_DEMONSTRATED: 1,
  DEVELOPMENT_GAP: 2,
  PARTIAL: 3,
  UNKNOWN: 4,
  TRANSFERABLE: 5,
  PROVEN: 6,
  NOT_RELEVANT: 7
};

function statusClass(value: SkillMatchStatus): string {
  return `match-${value.toLowerCase().replace(/_/g, "-")}`;
}

function statusMark(value: SkillMatchStatus): string {
  return {
    PROVEN: "✓",
    TRANSFERABLE: "↗",
    PARTIAL: "~",
    DEVELOPMENT_GAP: "△",
    NOT_DEMONSTRATED: "–",
    CRITICAL_BLOCKER: "!",
    UNKNOWN: "?",
    NOT_RELEVANT: "·"
  }[value];
}

export function CompetencyHeatmapView({ jobs, assessments, onOpen }: CompetencyHeatmapViewProps) {
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<HeatmapMode>("ACTIVE");
  const [drillFamily, setDrillFamily] = useState<CompetencyFamily | "FAMILIES">("FAMILIES");
  const [mobileFamily, setMobileFamily] = useState<CompetencyFamily>("LEADERSHIP_INFLUENCE");
  const [mobileLimit, setMobileLimit] = useState(12);

  const available = useMemo(() => jobs.filter((job) => assessments.has(job.id)).sort((left, right) => (assessments.get(right.id)?.finalScore || 0) - (assessments.get(left.id)?.finalScore || 0)), [jobs, assessments]);
  const detailedRequirements = useMemo(() => {
    if (drillFamily === "FAMILIES") return [];
    const counts = new Map<string, number>();
    available.forEach((job) => assessments.get(job.id)?.capabilitySkills.filter((item) => item.requirement.family === drillFamily).forEach((item) => counts.set(item.requirement.name, (counts.get(item.requirement.name) || 0) + 1)));
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 8).map(([name]) => name);
  }, [available, assessments, drillFamily]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return available.filter((job) => {
      const assessment = assessments.get(job.id)!;
      if (mode === "ACTIVE" && ["NOT_PURSUING", "CLOSED"].includes(job.status)) return false;
      if (mode === "TOP" && !["PURSUE", "EXPLORE"].includes(assessment.fitSignature.decisionAction)) return false;
      if (mode === "GAPS" && !assessment.capabilitySkills.some((item) => ["CRITICAL_BLOCKER", "NOT_DEMONSTRATED", "DEVELOPMENT_GAP", "PARTIAL"].includes(item.status))) return false;
      if (!query) return true;
      return `${job.title} ${job.team} ${assessment.fingerprint.primaryGroupLabel}`.toLowerCase().includes(query);
    });
  }, [available, assessments, mode, search]);

  const columns = drillFamily === "FAMILIES"
    ? COMPETENCY_FAMILY_ORDER
    : detailedRequirements;

  const mobileRows = useMemo(() => visible.map((job) => ({
    job,
    assessment: assessments.get(job.id)!,
    family: assessments.get(job.id)?.competencyFamilies.find((item) => item.family === mobileFamily)
  })).sort((left, right) => (right.family?.score ?? 50) - (left.family?.score ?? 50)), [visible, assessments, mobileFamily]);

  return <div className="heatmap-view">
    <section className="panel heatmap-hero"><div><span className="eyebrow">Hierarchical competency heatmap</span><h2>See evidence patterns across the whole portfolio</h2><p>Start with broad competency families, then drill into one family to inspect individual requirements. Color and symbols both communicate the match.</p></div><Grid3X3 /></section>

    <section className="panel heatmap-controls">
      <div className="fit-quick-views"><button className={mode === "ACTIVE" ? "active" : ""} onClick={() => setMode("ACTIVE")}>Active</button><button className={mode === "TOP" ? "active" : ""} onClick={() => setMode("TOP")}>Pursue & explore</button><button className={mode === "GAPS" ? "active" : ""} onClick={() => setMode("GAPS")}>Gaps & blockers</button><button className={mode === "ALL" ? "active" : ""} onClick={() => setMode("ALL")}>All roles</button></div>
      <div className="heatmap-toolbar"><label className="search"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search opportunities..." /></label><label><SlidersHorizontal /> View<select value={drillFamily} onChange={(event) => setDrillFamily(event.target.value as CompetencyFamily | "FAMILIES")}><option value="FAMILIES">Competency families</option>{COMPETENCY_FAMILY_ORDER.map((family) => <option key={family} value={family}>Drill into: {COMPETENCY_FAMILY_LABELS[family]}</option>)}</select></label></div>
      <div className="heatmap-legend"><span className="match-proven">✓ Proven</span><span className="match-transferable">↗ Transferable</span><span className="match-partial">~ Partial</span><span className="match-development-gap">△ Developmental</span><span className="match-not-demonstrated">– Not demonstrated</span><span className="match-critical-blocker">! Blocker</span><span className="match-unknown">? Unknown</span></div>
    </section>

    <section className="panel heatmap-panel">
      <div className="panel-head responsive"><div><span className="eyebrow">{drillFamily === "FAMILIES" ? "Portfolio coverage" : COMPETENCY_FAMILY_LABELS[drillFamily]}</span><h2>{visible.length} role{visible.length === 1 ? "" : "s"} compared</h2><p>{drillFamily === "FAMILIES" ? "Each cell summarizes all requirements in a competency family." : `Showing the ${detailedRequirements.length} most frequently requested competencies in this family.`}</p></div>{drillFamily !== "FAMILIES" && <button className="secondary" onClick={() => setDrillFamily("FAMILIES")}><ChevronRight className="rotate-180" /> Back to families</button>}</div>
      <div className="heatmap-scroll"><table className="competency-heatmap"><thead><tr><th className="heatmap-role-head">Opportunity</th>{columns.map((column) => <th key={column}>{drillFamily === "FAMILIES" ? COMPETENCY_FAMILY_LABELS[column as CompetencyFamily] : column}</th>)}<th>Scope</th></tr></thead><tbody>{visible.map((job) => {
        const assessment = assessments.get(job.id)!;
        return <tr key={job.id}>
          <th className="heatmap-role"><button onClick={() => onOpen(job.id)}><strong>{job.title}</strong><span>{assessment.fingerprint.primaryGroupLabel}</span></button></th>
          {columns.map((column) => {
            if (drillFamily === "FAMILIES") {
              const family = assessment.competencyFamilies.find((item) => item.family === column);
              const status = family?.dominantStatus || "UNKNOWN";
              return <td key={column}><button className={`heat-cell ${statusClass(status)}`} onClick={() => onOpen(job.id)} title={`${MATCH_STATUS_LABELS[status]} · ${family?.summary || "No material requirement detected"}`}><b>{statusMark(status)}</b><strong>{family?.score ?? 50}</strong><small>{family?.coverage ?? 0}% evidence</small></button></td>;
            }
            const match = assessment.capabilitySkills.find((item) => item.requirement.name === column);
            const status = match?.status || "NOT_RELEVANT";
            return <td key={column}><button className={`heat-cell ${statusClass(status)}`} onClick={() => onOpen(job.id)} title={match ? `${MATCH_STATUS_LABELS[status]} · ${match.reason}` : "Not materially requested by this role"}><b>{statusMark(status)}</b><strong>{match ? match.evidenceStrength || match.matchConfidence : "—"}</strong><small>{match ? MATCH_STATUS_LABELS[status] : "Not required"}</small></button></td>;
          })}
          <td><button className={`scope-mini scope-${assessment.fitSignature.scopeStatus.toLowerCase().replace(/_/g, "-")}`} onClick={() => onOpen(job.id)}>{assessment.fitSignature.scopeStatus === "IN_SCOPE_NOW" ? "In scope" : assessment.fitSignature.scopeStatus === "CREDIBLE_STRETCH" ? "Stretch" : assessment.fitSignature.scopeStatus === "OUT_OF_SCOPE" ? "Out" : "Unknown"}</button></td>
        </tr>;
      })}</tbody></table></div>
      {!visible.length && <div className="empty-inline"><Filter /> No roles match this heatmap view.</div>}
    </section>

    <section className="panel mobile-competency-browser">
      <div className="panel-head"><div><span className="eyebrow">Mobile competency browser</span><h2>Compare one competency family at a time</h2><p>Choose a family, then scan roles vertically. This replaces the wide heatmap on a phone.</p></div></div>
      <label className="mobile-family-picker"><span>Competency family</span><select value={mobileFamily} onChange={(event) => { setMobileFamily(event.target.value as CompetencyFamily); setMobileLimit(12); }}>{COMPETENCY_FAMILY_ORDER.map((family) => <option key={family} value={family}>{COMPETENCY_FAMILY_LABELS[family]}</option>)}</select></label>
      <div className="mobile-competency-list">{mobileRows.slice(0, mobileLimit).map(({ job, assessment, family }) => {
        const status = family?.dominantStatus || "UNKNOWN";
        return <button key={job.id} className={`mobile-competency-card ${statusClass(status)}`} onClick={() => onOpen(job.id)}>
          <div><span>{assessment.fingerprint.primaryGroupLabel}</span><strong>{job.title}</strong><small>{family?.summary || "No material requirement detected in this family."}</small></div>
          <aside><b>{statusMark(status)} {family?.score ?? 50}</b><span>{MATCH_STATUS_LABELS[status]}</span><small>{family?.coverage ?? 0}% evidence</small></aside>
          <ChevronRight />
        </button>;
      })}</div>
      {mobileRows.length > mobileLimit && <button className="mobile-show-all" onClick={() => setMobileLimit((value) => value + 12)}>Show {Math.min(12, mobileRows.length - mobileLimit)} more roles</button>}
      {!mobileRows.length && <div className="empty-inline"><Filter /> No roles match this view.</div>}
    </section>

    <section className="panel heatmap-note"><ShieldAlert /><div><strong>Interpret absence carefully</strong><p>“Not demonstrated” means the current candidate profile does not contain comparable evidence. It does not prove the capability is absent. Open the role or Career Evidence profile to add missing experience.</p></div></section>
  </div>;
}
