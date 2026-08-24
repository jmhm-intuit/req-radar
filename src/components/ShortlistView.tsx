import { useMemo, useState } from "react";
import {
  Archive,
  ArrowRight,
  Bookmark,
  BriefcaseBusiness,
  ChevronRight,
  CircleHelp,
  Compass,
  Eye,
  FileSearch,
  ListChecks,
  Search,
  Target,
  UserRound
} from "lucide-react";
import { candidateBaselineProgress, decisionStateLabel } from "../lib/portfolioV4";
import type { JobAssessment, JobReq, PortfolioDecisionState, UserProfile } from "../types";

interface ShortlistViewProps {
  jobs: JobReq[];
  assessments: Map<string, JobAssessment>;
  profile: UserProfile;
  onOpenJob: (jobId: string) => void;
  onSetDecision: (jobId: string, state: PortfolioDecisionState) => void;
  onOpenLandscape: () => void;
  onOpenProfile: () => void;
  onOpenDiscovery: (jobId: string) => void;
  onOpenPipeline: () => void;
}

const STATES: PortfolioDecisionState[] = ["INBOX", "EXPLORE", "SHORTLIST", "PURSUE", "MONITOR", "NOT_PURSUING"];

function fitLabel(value: number): string {
  if (value >= 80) return "Very strong";
  if (value >= 68) return "Strong";
  if (value >= 56) return "Promising";
  if (value >= 44) return "Mixed";
  return "Low";
}

function assessmentState(job: JobReq, assessment: JobAssessment | undefined, baselineReady: boolean): { label: string; tone: string; detail: string } {
  if (!assessment) return { label: "Analyzing", tone: "neutral", detail: "The role analysis is still being prepared." };
  if (!baselineReady || assessment.fitSignature.evidenceConfidence < 42) return { label: "Needs evidence", tone: "caution", detail: "Candidate evidence is not strong enough for a reliable ranking." };
  if (assessment.discovery.answeredCount === 0 && assessment.generalThemeConfidence < 55) return { label: "Needs interest calibration", tone: "caution", detail: "Review the recurring responsibilities before using Interest Fit." };
  if (assessment.unknowns.length > 2) return { label: "Needs role validation", tone: "info", detail: assessment.unknowns[0] || "Important role context remains unknown." };
  return { label: "Assessment ready", tone: "positive", detail: assessment.fitSignature.decisionReason };
}

function stateIcon(state: PortfolioDecisionState) {
  if (state === "INBOX") return <FileSearch />;
  if (state === "EXPLORE") return <Compass />;
  if (state === "SHORTLIST") return <Bookmark />;
  if (state === "PURSUE") return <Target />;
  if (state === "MONITOR") return <Eye />;
  return <Archive />;
}

export function ShortlistView({ jobs, assessments, profile, onOpenJob, onSetDecision, onOpenLandscape, onOpenProfile, onOpenDiscovery, onOpenPipeline }: ShortlistViewProps) {
  const [state, setState] = useState<PortfolioDecisionState>(jobs.some((job) => job.decisionState === "SHORTLIST") ? "SHORTLIST" : "INBOX");
  const [query, setQuery] = useState("");
  const baseline = useMemo(() => candidateBaselineProgress(profile), [profile]);
  const counts = Object.fromEntries(STATES.map((item) => [item, jobs.filter((job) => job.decisionState === item).length])) as Record<PortfolioDecisionState, number>;
  const visible = useMemo(() => jobs
    .filter((job) => job.decisionState === state)
    .filter((job) => !query || `${job.title} ${job.team} ${job.category} ${assessments.get(job.id)?.fingerprint.primaryGroupLabel || ""}`.toLowerCase().includes(query.toLowerCase()))
    .sort((left, right) => {
      if (baseline.nextStep !== "READY") {
        const pinDelta = Number(right.pinned) - Number(left.pinned);
        if (pinDelta) return pinDelta;
        return right.createdAt.localeCompare(left.createdAt) || left.title.localeCompare(right.title);
      }
      const leftAssessment = assessments.get(left.id);
      const rightAssessment = assessments.get(right.id);
      const leftScore = leftAssessment?.finalScore || 0;
      const rightScore = rightAssessment?.finalScore || 0;
      return (right.pinned ? 10 : 0) + rightScore - ((left.pinned ? 10 : 0) + leftScore);
    }), [jobs, state, query, assessments, baseline.nextStep]);

  return <div className="v4-shortlist">
    <section className="v4-shortlist-hero">
      <div><span className="eyebrow">Portfolio decisions</span><h2>Reduce the landscape to a focused active set</h2><p>Roles enter the application pipeline only after you deliberately move them to Pursue. The shortlist should normally contain no more than ten opportunities.</p></div>
      <div><button className="secondary" onClick={onOpenLandscape}><Compass /> Review landscape</button><button className="primary" onClick={onOpenPipeline}>Application pipeline <ArrowRight /></button></div>
    </section>

    <section className="v4-decision-tabs">{STATES.map((item) => <button key={item} className={state === item ? "active" : ""} onClick={() => setState(item)}>{stateIcon(item)}<span>{decisionStateLabel(item)}</span><b>{counts[item]}</b></button>)}</section>

    <section className="v4-shortlist-toolbar"><label><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${decisionStateLabel(state).toLowerCase()} roles`} /></label><div><span>{visible.length} role{visible.length === 1 ? "" : "s"}</span>{state === "SHORTLIST" && visible.length > 10 && <b className="warning">Consider reducing this to ten</b>}</div></section>

    {!baseline.resumeReady && <section className="v4-inline-guidance"><UserRound /><div><strong>Resume evidence is missing</strong><p>The role list is available, but candidate fit should remain preliminary until a resume is uploaded.</p></div><button onClick={onOpenProfile}>Build baseline</button></section>}

    {!visible.length ? <section className="v4-empty-page compact">{stateIcon(state)}<h2>No roles in {decisionStateLabel(state)}</h2><p>{state === "INBOX" ? "Newly uploaded roles will appear here before you classify them." : state === "SHORTLIST" ? "Use the opportunity landscape to identify the few roles worth deeper review." : "Move roles here when the decision state changes."}</p>{state === "SHORTLIST" && <button className="primary" onClick={onOpenLandscape}>Explore opportunity families</button>}</section> : <div className="v4-decision-list">{visible.map((job, index) => {
      const assessment = assessments.get(job.id);
      const readiness = assessmentState(job, assessment, baseline.nextStep === "READY");
      return <article className="v4-decision-card" key={job.id}>
        <button className="v4-decision-card-main" onClick={() => onOpenJob(job.id)}>
          <span className="v4-decision-order">{baseline.nextStep === "READY" ? index + 1 : "?"}</span>
          <div className="v4-decision-title"><h3>{job.title}</h3><p>{assessment?.fingerprint.primaryGroupLabel || job.category || "Unclassified role"}</p><small>{job.team || job.locations.join(" · ") || "Organization not stated"}</small></div>
          <ChevronRight />
        </button>
        <div className="v4-decision-fit">
          <span><b>{assessment ? baseline.nextStep === "READY" ? fitLabel(assessment.fitSignature.readinessScore) : "Preliminary" : "—"}</b>Experience</span>
          <span><b>{assessment ? baseline.nextStep === "READY" ? fitLabel(assessment.fitSignature.attractionScore) : "Calibrate" : "—"}</b>Interest</span>
          <span><b>{assessment ? assessment.fitSignature.scopeStatus.replace(/_/g, " ").toLowerCase() : "—"}</b>Scope</span>
          <span><b>{assessment?.ageLabel || "Unknown"}</b>Age</span>
        </div>
        <div className={`v4-assessment-readiness ${readiness.tone}`}><CircleHelp /><div><strong>{readiness.label}</strong><span>{readiness.detail}</span></div>{readiness.label.includes("interest") && <button onClick={() => onOpenDiscovery(job.id)}>Discover fit</button>}</div>
        <div className="v4-decision-card-actions">
          {state !== "EXPLORE" && <button onClick={() => onSetDecision(job.id, "EXPLORE")}>Explore</button>}
          {state !== "SHORTLIST" && <button onClick={() => onSetDecision(job.id, "SHORTLIST")}><Bookmark /> Shortlist</button>}
          {state !== "PURSUE" && <button className="primary-compact" onClick={() => onSetDecision(job.id, "PURSUE")}><Target /> Pursue</button>}
          {state !== "MONITOR" && <button onClick={() => onSetDecision(job.id, "MONITOR")}>Monitor</button>}
          {state !== "NOT_PURSUING" && <button className="danger-ghost" onClick={() => onSetDecision(job.id, "NOT_PURSUING")}>Not pursuing</button>}
        </div>
      </article>;
    })}</div>}
  </div>;
}
