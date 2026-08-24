import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
  Compass,
  Layers3,
  ListChecks,
  Search,
  Sparkles,
  Target,
  TrendingUp
} from "lucide-react";
import {
  buildOpportunityFamilyInsights,
  candidateBaselineProgress,
  type FamilyRecommendation,
  type OpportunityFamilyInsight
} from "../lib/portfolioV4";
import type { JobAssessment, JobReq, PortfolioDecisionState, UserProfile } from "../types";

interface OpportunityLandscapeV4Props {
  jobs: JobReq[];
  assessments: Map<string, JobAssessment>;
  profile: UserProfile;
  selectedFamilyId?: string;
  onSelectedFamilyChange?: (familyId: string) => void;
  onOpenJob: (jobId: string) => void;
  onSetDecision: (jobId: string, state: PortfolioDecisionState) => void;
  onOpenProfile: () => void;
  onOpenShortlist: () => void;
}

const RECOMMENDATION_LABELS: Record<FamilyRecommendation, string> = {
  PRIORITIZE: "Prioritize",
  EXPLORE: "Explore",
  MONITOR: "Monitor",
  DEPRIORITIZE: "Deprioritize",
  CALIBRATE: "Calibrate first"
};

function fitBand(value: number): string {
  if (value >= 80) return "Very strong";
  if (value >= 68) return "Strong";
  if (value >= 56) return "Promising";
  if (value >= 44) return "Mixed";
  return "Low";
}

function roleReason(assessment: JobAssessment): string {
  if (assessment.criticalBlockers.length) return assessment.criticalBlockers[0];
  if (assessment.fitSignature.scopeStatus === "OUT_OF_SCOPE") return assessment.fitSignature.scopeReason;
  if (assessment.fitSignature.evidenceConfidence < 45) return "More candidate evidence is needed before using this as a reliable ranking.";
  if (assessment.fitSignature.attractionScore < 52) return "The role appears credible, but the recurring work may not be sufficiently attractive.";
  return assessment.fitSignature.decisionReason || assessment.nextAction;
}

function recommendationIcon(recommendation: FamilyRecommendation) {
  if (recommendation === "PRIORITIZE") return <CheckCircle2 />;
  if (recommendation === "EXPLORE") return <Compass />;
  if (recommendation === "MONITOR") return <BarChart3 />;
  if (recommendation === "CALIBRATE") return <Sparkles />;
  return <AlertTriangle />;
}

export function OpportunityLandscapeV4({
  jobs,
  assessments,
  profile,
  selectedFamilyId,
  onSelectedFamilyChange,
  onOpenJob,
  onSetDecision,
  onOpenProfile,
  onOpenShortlist
}: OpportunityLandscapeV4Props) {
  const families = useMemo(() => buildOpportunityFamilyInsights(jobs, assessments, profile), [jobs, assessments, profile]);
  const baseline = useMemo(() => candidateBaselineProgress(profile), [profile]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FamilyRecommendation | "ALL">("ALL");
  const [internalSelected, setInternalSelected] = useState(selectedFamilyId || families[0]?.id || "");
  const selectedId = selectedFamilyId || internalSelected;
  const filtered = families.filter((family) => {
    if (filter !== "ALL" && family.recommendation !== filter) return false;
    if (query && !`${family.label} ${family.description} ${family.commonWork.map((item) => item.label).join(" ")}`.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });
  const selected = families.find((family) => family.id === selectedId) || filtered[0] || families[0];

  useEffect(() => {
    if (selectedFamilyId && families.some((family) => family.id === selectedFamilyId)) setInternalSelected(selectedFamilyId);
  }, [selectedFamilyId, families]);

  const selectFamily = (id: string) => {
    setInternalSelected(id);
    onSelectedFamilyChange?.(id);
    window.setTimeout(() => document.querySelector(".v4-family-detail")?.scrollIntoView({ behavior: "smooth", block: "start" }), 20);
  };

  const selectedRoles = useMemo(() => {
    if (!selected) return [];
    return selected.topJobIds
      .map((id) => jobs.find((job) => job.id === id))
      .filter((job): job is JobReq => Boolean(job));
  }, [selected, jobs]);

  if (!families.length) return <section className="v4-empty-page"><Layers3 /><h2>No opportunity families yet</h2><p>Upload multiple job descriptions. ReqRadar will use responsibilities, work patterns, scope, and technical depth to organize them into a small set of career paths.</p></section>;

  return <div className="v4-landscape">
    <section className="v4-landscape-intro">
      <div><span className="eyebrow">Opportunity landscape</span><h2>{families.length} career paths summarize {jobs.filter((job) => job.decisionState !== "NOT_PURSUING").length} active opportunities</h2><p>Compare paths first. Individual roles are ranked only within a family where the work and career direction are reasonably comparable.</p></div>
      <div className={`v4-calibration-status ${baseline.nextStep === "READY" ? "ready" : "needs"}`}><Target /><span><strong>{baseline.nextStep === "READY" ? "Candidate baseline ready" : "Preliminary family ranking"}</strong><small>{baseline.message}</small></span>{baseline.nextStep !== "READY" && <button onClick={onOpenProfile}>Improve baseline</button>}</div>
    </section>

    <section className="v4-landscape-controls">
      <label><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search a work family or responsibility" /></label>
      <div className="v4-filter-chips"><button className={filter === "ALL" ? "active" : ""} onClick={() => setFilter("ALL")}>All <b>{families.length}</b></button>{(["PRIORITIZE", "EXPLORE", "MONITOR", "DEPRIORITIZE"] as FamilyRecommendation[]).map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{RECOMMENDATION_LABELS[item]} <b>{families.filter((family) => family.recommendation === item).length}</b></button>)}</div>
    </section>

    <div className="v4-landscape-layout">
      <section className="v4-family-list"><div className="v4-family-list-head"><Layers3 /><div><strong>Opportunity families</strong><span>One primary family per role</span></div></div>{filtered.map((family, index) => <button key={family.id} className={`v4-family-list-card ${family.id === selected?.id ? "active" : ""}`} onClick={() => selectFamily(family.id)}>
        <span className="v4-family-index">{index + 1}</span>
        <div><strong>{family.label}</strong><small>{family.roleCount} role{family.roleCount === 1 ? "" : "s"} · {RECOMMENDATION_LABELS[family.recommendation]}</small><p>{family.commonWork.slice(0, 3).map((item) => item.label).join(" · ") || family.description}</p></div>
        <ChevronRight />
      </button>)}</section>

      {selected && <section className="v4-family-detail">
        <header className={`v4-family-detail-hero ${selected.recommendation.toLowerCase()}`}>
          <div className="v4-family-detail-title"><span>{recommendationIcon(selected.recommendation)} {RECOMMENDATION_LABELS[selected.recommendation]}</span><h2>{selected.label}</h2><p>{selected.description}</p></div>
          <div className="v4-family-detail-count"><strong>{selected.roleCount}</strong><span>active roles</span><small>{selected.scopeSummary}</small></div>
        </header>

        <div className="v4-family-fit-grid">
          <article><span>Experience fit</span><strong>{selected.preliminary ? "Preliminary" : fitBand(selected.experienceFit)}</strong><small>{selected.experienceFit}/100 evidence alignment</small></article>
          <article><span>Interest fit</span><strong>{selected.preliminary ? "Needs calibration" : fitBand(selected.interestFit)}</strong><small>{selected.interestFit}/100 recurring-work attraction</small></article>
          <article><span>Career direction</span><strong>{fitBand(selected.directionFit)}</strong><small>{selected.directionFit}/100 directional alignment</small></article>
          <article><span>Confidence</span><strong>{fitBand(selected.confidence)}</strong><small>{selected.confidence}/100 evidence coverage</small></article>
        </div>

        <section className="v4-family-guidance-panel"><Target /><div><strong>{selected.guidance}</strong><p>{selected.preliminary ? "ReqRadar is showing the structure of the portfolio, but not treating the order as a reliable candidate ranking yet." : `This family currently has an alignment index of ${selected.alignment}. Use the responsibilities and evidence below to decide whether it belongs in the shortlist.`}</p></div></section>

        <div className="v4-family-insight-grid">
          <article><h3>What this path commonly involves</h3><div className="v4-work-list">{selected.commonWork.length ? selected.commonWork.map((item) => <span key={item.label}><BriefcaseBusiness /><b>{item.label}</b><small>{item.count} role{item.count === 1 ? "" : "s"}</small></span>) : <p>No stable responsibility pattern yet.</p>}</div></article>
          <article><h3>Strongest supporting evidence</h3><div className="v4-tag-list positive">{selected.strengths.length ? selected.strengths.map((item) => <span key={item.label}>{item.label}<b>{item.count}</b></span>) : <p>No repeated proven evidence yet.</p>}</div></article>
          <article><h3>What may limit the fit</h3><div className="v4-tag-list caution">{selected.concerns.length ? selected.concerns.map((item) => <span key={item.label}>{item.label}<b>{item.count}</b></span>) : <p>No repeated concern detected.</p>}</div></article>
        </div>

        <section className="v4-family-roles">
          <header><div><span className="eyebrow">Best roles inside this path</span><h3>Compare individual opportunities only after the family makes sense</h3></div><button className="secondary" onClick={onOpenShortlist}><ListChecks /> Open shortlist</button></header>
          <div>{selectedRoles.map((job, index) => {
            const assessment = assessments.get(job.id);
            if (!assessment) return null;
            return <article className="v4-family-role-card" key={job.id}>
              <button className="v4-role-open" onClick={() => onOpenJob(job.id)}><span className="v4-role-rank">{selected.preliminary ? "?" : index + 1}</span><div><h4>{job.title}</h4><p>{assessment.fingerprint.archetype} · {assessment.ageLabel}</p><small>{roleReason(assessment)}</small></div><ChevronRight /></button>
              <div className="v4-role-fit-row"><span><b>{selected.preliminary ? "Preliminary" : fitBand(assessment.fitSignature.readinessScore)}</b>Experience</span><span><b>{selected.preliminary ? "Needs calibration" : fitBand(assessment.fitSignature.attractionScore)}</b>Interest</span><span><b>{assessment.fitSignature.scopeStatus.replace(/_/g, " ").toLowerCase()}</b>Scope</span></div>
              <div className="v4-role-decision-actions"><button className={job.decisionState === "SHORTLIST" ? "active" : ""} onClick={() => onSetDecision(job.id, "SHORTLIST")}>Shortlist</button><button className={job.decisionState === "PURSUE" ? "active" : ""} onClick={() => onSetDecision(job.id, "PURSUE")}>Pursue</button><button className={job.decisionState === "MONITOR" ? "active" : ""} onClick={() => onSetDecision(job.id, "MONITOR")}>Monitor</button></div>
            </article>;
          })}</div>
        </section>
      </section>}
    </div>
  </div>;
}
