import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Layers3, Target } from "lucide-react";
import type { JobAssessment, JobReq, RoleGroupSummary } from "../types";
import { JobTable } from "./JobTable";
import { MobileRoleCard } from "./MobileRoleCard";

interface GroupsViewProps {
  groups: RoleGroupSummary[];
  jobs: JobReq[];
  assessments: Map<string, JobAssessment>;
  onOpen: (jobId: string) => void;
  onUpdate: (jobId: string, changes: Partial<JobReq>) => void;
  selectedGroupId?: string;
  onSelectedGroupChange?: (groupId: string) => void;
}

function groupGuidance(group: RoleGroupSummary): string {
  if (group.averageCapability >= 75 && group.averageInterest >= 75) return "Prioritize this family";
  if (group.averageCapability >= 75 && group.averageInterest < 58) return "Strong experience, but inspect the weekly work carefully";
  if (group.averageCapability < 62 && group.averageInterest >= 72) return "High-interest stretch";
  if (group.averageDirection >= 75) return "Promising future direction; validate the capability gaps";
  return "Compare the responsibilities before investing significant time";
}

export function GroupsView({ groups, jobs, assessments, onOpen, onUpdate, selectedGroupId, onSelectedGroupChange }: GroupsViewProps) {
  const [internalSelectedId, setInternalSelectedId] = useState(selectedGroupId || groups[0]?.id || "");
  const selectedId = selectedGroupId || internalSelectedId;
  const selected = groups.find((group) => group.id === selectedId) || groups[0];

  useEffect(() => {
    if (selectedGroupId && groups.some((group) => group.id === selectedGroupId)) setInternalSelectedId(selectedGroupId);
  }, [selectedGroupId, groups]);

  const chooseGroup = (id: string) => {
    setInternalSelectedId(id);
    onSelectedGroupChange?.(id);
    window.setTimeout(() => document.querySelector(".group-detail")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  const selectedJobs = useMemo(() => {
    if (!selected) return [];
    return selected.jobIds
      .map((id) => jobs.find((job) => job.id === id))
      .filter((job): job is JobReq => Boolean(job))
      .sort((left, right) => (assessments.get(right.id)?.finalScore || 0) - (assessments.get(left.id)?.finalScore || 0));
  }, [selected, jobs, assessments]);

  if (!groups.length) {
    return <div className="empty-page"><Layers3 /><h2>No role families yet</h2><p>Upload multiple job requisitions and ReqRadar will organize them into recurring career patterns.</p></div>;
  }

  return <div className="groups-layout">
    <section className="group-list panel">
      <div className="panel-head"><div><span className="eyebrow">Portfolio organization</span><h2>Role families</h2><p>Jobs are grouped by responsibilities, themes, and work design—not only title similarity.</p></div></div>
      <div className="group-cards">{groups.map((group) => <button key={group.id} className={`group-card ${selected?.id === group.id ? "active" : ""}`} onClick={() => chooseGroup(group.id)}>
        <div><strong>{group.label}</strong><span>{group.jobIds.length} role{group.jobIds.length === 1 ? "" : "s"}</span></div>
        <p>{group.description}</p>
        <div className="group-mini-scores"><span><b>{group.averageCapability}</b> Experience</span><span><b>{group.averageInterest}</b> Interest</span><span><b>{group.averageDirection}</b> Direction</span></div>
        <small className="group-guidance">{groupGuidance(group)}</small>
        <ArrowRight size={17} />
      </button>)}</div>
    </section>

    {selected && <section className="group-detail panel">
      <div className="panel-head responsive"><div><span className="eyebrow">Selected role family</span><h2>{selected.label}</h2><p>{selected.description}</p></div><div className="group-score-hero"><Target /><strong>{Math.round((selected.averageCapability + selected.averageInterest + selected.averageDirection) / 3)}</strong><span>portfolio alignment</span></div></div>
      <div className="mobile-group-fit-summary"><div><strong>{selected.averageCapability}</strong><span>Experience Fit</span></div><div><strong>{selected.averageInterest}</strong><span>Interest Fit</span></div><div><strong>{selected.averageDirection}</strong><span>Career direction</span></div><p>{groupGuidance(selected)}</p></div>
      <div className="group-insights">
        <article><h3>Common themes</h3>{selected.commonThemes.length ? <div className="theme-cloud">{selected.commonThemes.map((item) => <span key={item.label}>{item.label}<b>{item.count}</b></span>)}</div> : <p className="muted">No recurring themes detected yet.</p>}</article>
        <article><h3>Common capability gaps</h3>{selected.commonGaps.length ? <ul className="insight-list">{selected.commonGaps.map((item) => <li key={item.label}><span>{item.label}</span><b>{item.count} role{item.count === 1 ? "" : "s"}</b></li>)}</ul> : <p className="positive-copy">No repeated gaps are currently visible in this family.</p>}</article>
      </div>
      <div className="section-head"><div><h3>Roles in this family</h3><p>Ranked using experience evidence, interest, career direction, viability, and your manual adjustments.</p></div><span className="count-badge">{selectedJobs.length}</span></div>
      <div className="desktop-role-table"><JobTable jobs={selectedJobs} assessments={assessments} onOpen={onOpen} onUpdate={onUpdate} compact /></div>
      <div className="mobile-role-list">{selectedJobs.map((job) => { const assessment = assessments.get(job.id); return assessment ? <MobileRoleCard key={job.id} job={job} assessment={assessment} onOpen={onOpen} onUpdate={onUpdate} /> : null; })}</div>
    </section>}
  </div>;
}
