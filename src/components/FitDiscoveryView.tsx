import { useMemo, useState } from "react";
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Compass,
  GitCompareArrows,
  HelpCircle,
  Lightbulb,
  MessageCircleQuestion,
  Network,
  Sparkles,
  Target
} from "lucide-react";
import { discoveryPreferenceSummary, scenarioCompletion } from "../lib/discovery";
import { recommendationLabel } from "../lib/intelligence";
import type { JobAssessment, JobReq, UserProfile } from "../types";

interface FitDiscoveryViewProps {
  jobs: JobReq[];
  assessments: Map<string, JobAssessment>;
  profile: UserProfile;
  onOpenJob: (jobId: string) => void;
  onOpenDiscovery: (jobId: string) => void;
  onUpdateJob: (jobId: string, changes: Partial<JobReq>) => void;
}

function fitTone(value: number): string {
  return value >= 72 ? "good" : value >= 48 ? "mid" : "bad";
}

function Progress({ job, assessment }: { job: JobReq; assessment: JobAssessment }) {
  const progress = scenarioCompletion(job, assessment.fingerprint);
  return <div className="discovery-progress-inline"><div><span style={{ width: `${progress.percent}%` }} /></div><small>{progress.answered}/{progress.total} scenarios</small></div>;
}

export function FitDiscoveryView({ jobs, assessments, profile, onOpenJob, onOpenDiscovery, onUpdateJob }: FitDiscoveryViewProps) {
  const summary = useMemo(() => discoveryPreferenceSummary(profile), [profile]);
  const ranked = useMemo(() => [...jobs].sort((left, right) => {
    const a = assessments.get(left.id);
    const b = assessments.get(right.id);
    const aProgress = a ? scenarioCompletion(left, a.fingerprint).percent : 0;
    const bProgress = b ? scenarioCompletion(right, b.fingerprint).percent : 0;
    if (aProgress !== bProgress) return aProgress - bProgress;
    return (b?.finalScore || 0) - (a?.finalScore || 0);
  }), [jobs, assessments]);
  const completed = jobs.filter((job) => job.fitDiscovery.status === "COMPLETED").length;
  const inProgress = jobs.filter((job) => job.fitDiscovery.status === "IN_PROGRESS").length;
  const notStarted = jobs.length - completed - inProgress;
  const needNetworking = jobs.filter((job) => {
    const assessment = assessments.get(job.id);
    return Boolean(assessment && assessment.discovery.answeredCount >= 3 && assessment.discovery.unresolvedQuestions.length > 0 && job.networkingStage === "NOT_STARTED");
  }).length;
  const [leftId, setLeftId] = useState(jobs[0]?.id || "");
  const [rightId, setRightId] = useState(jobs[1]?.id || "");
  const left = jobs.find((job) => job.id === leftId);
  const right = jobs.find((job) => job.id === rightId);
  const leftAssessment = left ? assessments.get(left.id) : undefined;
  const rightAssessment = right ? assessments.get(right.id) : undefined;

  const prefer = (preferred: JobReq, other: JobReq) => {
    onUpdateJob(preferred.id, { manualAdjustment: Math.min(20, preferred.manualAdjustment + 3), fitNotes: `${preferred.fitNotes}${preferred.fitNotes ? "\n" : ""}Pairwise comparison: preferred over ${other.title}.` });
    onUpdateJob(other.id, { manualAdjustment: Math.max(-20, other.manualAdjustment - 1) });
  };

  if (!jobs.length) {
    return <div className="empty-page"><Compass /><h2>Fit Discovery begins with a real opportunity</h2><p>Upload job requisitions, then ReqRadar will translate each one into a Role Reality Preview and targeted scenarios.</p></div>;
  }

  return <div className="fit-discovery-home">
    <section className="discovery-home-hero panel"><div><span className="eyebrow">Fit Discovery Studio</span><h1>Move from abstract preferences to lived-role reflection</h1><p>Visualize the responsibilities, react to realistic situations, connect them to past experience, and identify what to test through networking.</p></div><div className="discovery-home-stats"><span><b>{notStarted}</b> not started</span><span><b>{inProgress}</b> in progress</span><span><b>{completed}</b> completed</span><span><b>{needNetworking}</b> need learning</span></div></section>

    <section className="panel discovery-profile-snapshot"><div className="panel-head responsive"><div><span className="eyebrow">Emerging self-discovery</span><h2>What the evidence currently says about you</h2><p>These conclusions remain visible as hypotheses with confidence, not permanent personality labels.</p></div><BrainCircuit /></div><div className="discovery-snapshot-grid"><article className="positive"><h3>Likely energizers</h3>{summary.energizers.length ? summary.energizers.slice(0, 5).map((item) => <span key={item.id}>{item.label}<small>{item.confidence}% confidence</small></span>) : <p>Complete scenarios to discover patterns.</p>}</article><article className="conditional"><h3>Conditional preferences</h3>{summary.conditional.length ? summary.conditional.slice(0, 5).map((item) => <span key={item.id}>{item.label}<small>{item.conditions.slice(0, 2).join(", ") || "Context matters"}</small></span>) : <p>No conditions recorded yet.</p>}</article><article className="negative"><h3>Likely drains</h3>{summary.drains.length ? summary.drains.slice(0, 5).map((item) => <span key={item.id}>{item.label}<small>{item.confidence}% confidence</small></span>) : <p>No consistent drain identified yet.</p>}</article><article className="unknown"><h3>Needs more evidence</h3>{summary.needsEvidence.length ? summary.needsEvidence.slice(0, 5).map((item) => <span key={item.id}>{item.label}<small>{item.status.toLowerCase()}</small></span>) : <p>Your strongest preferences have useful evidence.</p>}</article></div></section>

    <section className="panel discovery-queue"><div className="panel-head responsive"><div><span className="eyebrow">Discovery queue</span><h2>Step into your highest-priority opportunities</h2><p>Incomplete sessions appear first. Each role receives a distinct scenario set based on its responsibilities and unknowns.</p></div><span className="result-count">{jobs.length} opportunities</span></div><div className="discovery-job-grid">{ranked.slice(0, 30).map((job) => {
      const assessment = assessments.get(job.id);
      if (!assessment) return null;
      const progress = scenarioCompletion(job, assessment.fingerprint);
      return <article key={job.id} className={`discovery-job-card ${job.fitDiscovery.status.toLowerCase().replace(/_/g, "-")}`}><header><div><span className="group-pill">{assessment.fingerprint.primaryGroupLabel}</span><h3>{job.title}</h3><small>{job.jobId || "No Job ID"} · {assessment.ageLabel}</small></div><span className={`fit-score ${fitTone(assessment.interestScore)}`}><strong>{assessment.interestScore}</strong><small>interest</small></span></header><Progress job={job} assessment={assessment} /><div className="discovery-card-metrics"><span><b>{assessment.workContentScore}</b> work content</span><span><b>{assessment.workDesignScore}</b> work design</span><span><b>{assessment.leadershipSocialScore}</b> leadership</span></div><div className="discovery-card-copy">{assessment.discovery.answeredCount ? <><strong>{assessment.discovery.energizers[0] || "A nuanced fit is emerging"}</strong><p>{assessment.discovery.conditions[0] ? `Depends on ${assessment.discovery.conditions[0].toLowerCase()}.` : assessment.discovery.unresolvedQuestions[0] || assessment.nextAction}</p></> : <><strong>{assessment.fingerprint.archetype}</strong><p>{assessment.discovery.nextQuestion}</p></>}</div><footer><button className="secondary" onClick={() => onOpenJob(job.id)}>Open role</button><button className="primary" onClick={() => onOpenDiscovery(job.id)}>{progress.percent ? "Continue discovery" : "Start discovery"} <ArrowRight /></button></footer></article>;
    })}</div></section>

    <section className="panel pairwise-discovery"><div className="panel-head responsive"><div><span className="eyebrow">Controlled comparison</span><h2>Compare two opportunities through the work itself</h2><p>Assume title and compensation are equal. Which role would you rather live for the next two years?</p></div><GitCompareArrows /></div><div className="pairwise-selectors"><label>Opportunity A<select value={leftId} onChange={(event) => setLeftId(event.target.value)}>{jobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}</select></label><GitCompareArrows /><label>Opportunity B<select value={rightId} onChange={(event) => setRightId(event.target.value)}>{jobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}</select></label></div>{left && right && leftAssessment && rightAssessment && left.id !== right.id ? <div className="pairwise-cards">{[[left, leftAssessment], [right, rightAssessment]].map(([job, assessment]) => {
      const typedJob = job as JobReq;
      const typedAssessment = assessment as JobAssessment;
      return <article key={typedJob.id}><span className="group-pill">{typedAssessment.fingerprint.primaryGroupLabel}</span><h3>{typedJob.title}</h3><div className="pairwise-metrics"><span><b>{typedAssessment.capabilityScore}</b> capability</span><span><b>{typedAssessment.workContentScore}</b> content</span><span><b>{typedAssessment.workDesignScore}</b> design</span><span><b>{typedAssessment.leadershipSocialScore}</b> leadership</span></div><ul><li><Sparkles /> {typedAssessment.discovery.energizers[0] || typedAssessment.fingerprint.themes[0] || "Primary work theme unclear"}</li><li><HelpCircle /> {typedAssessment.discovery.unresolvedQuestions[0] || "No major unknown recorded"}</li><li><Target /> {recommendationLabel(typedAssessment.recommendation)}</li></ul><button className="primary" onClick={() => prefer(typedJob, typedJob.id === left.id ? right : left)}>I would prefer this work</button></article>;
    })}</div> : <div className="empty-inline"><Lightbulb /> Select two different opportunities to compare.</div>}</section>

    <section className="panel discovery-learning-loop"><div><Network /><div><span className="eyebrow">Learning loop</span><h2>Networking is evidence, not a score bonus</h2><p>Use each conversation to test one hypothesis about the role, then record whether your interest increased, decreased, or became more nuanced.</p></div></div><div><span><MessageCircleQuestion /> Ask what percentage of the week is strategy versus recurring operation.</span><span><MessageCircleQuestion /> Clarify direct reports, team maturity, and difficult management situations.</span><span><MessageCircleQuestion /> Ask which decisions the role owns and what frustrates strong performers.</span></div></section>
  </div>;
}
