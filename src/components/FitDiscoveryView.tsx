import { useMemo, useState } from "react";
import {
  ArrowRight,
  BrainCircuit,
  Compass,
  GitCompareArrows,
  HelpCircle,
  Lightbulb,
  MessageCircleQuestion,
  Network,
  Sparkles,
  Target
} from "lucide-react";
import { recommendationLabel } from "../lib/intelligence";
import type { JobAssessment, JobReq, UserProfile } from "../types";

interface FitDiscoveryViewProps {
  jobs: JobReq[];
  assessments: Map<string, JobAssessment>;
  profile: UserProfile;
  onOpenThemes: () => void;
  onOpenJob: (jobId: string) => void;
  onOpenDiscovery: (jobId: string) => void;
  onUpdateJob: (jobId: string, changes: Partial<JobReq>) => void;
}

function fitTone(value: number): string {
  return value >= 72 ? "good" : value >= 48 ? "mid" : "bad";
}

function progressFor(assessment: JobAssessment): { answered: number; total: number; percent: number } {
  const answered = assessment.discovery.answeredCount;
  const total = assessment.discovery.targetCount;
  return { answered, total, percent: total ? Math.round((answered / total) * 100) : 0 };
}

function Progress({ assessment }: { assessment: JobAssessment }) {
  const progress = progressFor(assessment);
  return <div className="discovery-progress-inline"><div><span style={{ width: `${progress.percent}%` }} /></div><small>{progress.answered}/{progress.total} role scenarios</small></div>;
}

export function FitDiscoveryView({ jobs, assessments, profile, onOpenThemes, onOpenJob, onOpenDiscovery, onUpdateJob }: FitDiscoveryViewProps) {
  const ranked = useMemo(() => [...jobs].sort((left, right) => {
    const a = assessments.get(left.id);
    const b = assessments.get(right.id);
    const aProgress = a ? progressFor(a).percent : 0;
    const bProgress = b ? progressFor(b).percent : 0;
    if (aProgress !== bProgress) return aProgress - bProgress;
    const aDiscoveryNeed = a?.focusBucket === "NEEDS_DISCOVERY" ? 1 : 0;
    const bDiscoveryNeed = b?.focusBucket === "NEEDS_DISCOVERY" ? 1 : 0;
    if (aDiscoveryNeed !== bDiscoveryNeed) return bDiscoveryNeed - aDiscoveryNeed;
    return (b?.finalScore || 0) - (a?.finalScore || 0);
  }), [jobs, assessments]);

  const completed = jobs.filter((job) => job.fitDiscovery.status === "COMPLETED").length;
  const inProgress = jobs.filter((job) => job.fitDiscovery.status === "IN_PROGRESS").length;
  const notStarted = jobs.length - completed - inProgress;
  const needNetworking = jobs.filter((job) => {
    const assessment = assessments.get(job.id);
    return Boolean(assessment && assessment.discovery.answeredCount >= 2 && assessment.discovery.unresolvedQuestions.length > 0 && job.networkingStage === "NOT_STARTED");
  }).length;
  const generalThemesAssessed = profile.discoveryPreferences.filter((item) => item.evidence.some((evidence) => evidence.sourceType === "GENERAL_THEME" || evidence.sourceType === "MANUAL")).length;

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
    return <div className="empty-page"><Compass /><h2>Role Discovery begins with a real opportunity</h2><p>Upload job requisitions, then ReqRadar will translate each one into a Role Reality Preview and a short set of targeted scenarios.</p></div>;
  }

  return <div className="fit-discovery-home">
    <section className="discovery-home-hero panel"><div><span className="eyebrow">Layer 2 · Role-Specific Discovery</span><h1>Explore what is distinctive, uncertain, or potentially draining in one role</h1><p>Your General Theme Profile provides the baseline. Each role now asks only the three to five questions most likely to change that rating.</p></div><div className="discovery-home-stats"><span><b>{notStarted}</b> not started</span><span><b>{inProgress}</b> in progress</span><span><b>{completed}</b> completed</span><span><b>{needNetworking}</b> need learning</span></div></section>

    <section className="panel dual-discovery-explainer"><BrainCircuit /><div><span className="eyebrow">Start broad, then get specific</span><h2>{generalThemesAssessed} general themes currently shape your baseline</h2><p>Role responses remain attached to that opportunity. They no longer rewrite your global profile after every answer.</p></div><button className="secondary" onClick={onOpenThemes}>Review General Themes <ArrowRight /></button></section>

    <section className="panel discovery-queue"><div className="panel-head responsive"><div><span className="eyebrow">Role discovery queue</span><h2>Step into the opportunities where specific context matters</h2><p>Incomplete sessions appear first. Each card shows the general baseline and the adjustment created by role-specific evidence.</p></div><span className="result-count">{jobs.length} opportunities</span></div><div className="discovery-job-grid">{ranked.slice(0, 36).map((job) => {
      const assessment = assessments.get(job.id);
      if (!assessment) return null;
      const progress = progressFor(assessment);
      return <article key={job.id} className={`discovery-job-card ${job.fitDiscovery.status.toLowerCase().replace(/_/g, "-")}`}>
        <header><div><span className="group-pill">{assessment.fingerprint.primaryGroupLabel}</span><h3>{job.title}</h3><small>{job.jobId || "No Job ID"} · {assessment.ageLabel}</small></div><span className={`fit-score ${fitTone(assessment.interestScore)}`}><strong>{assessment.interestScore}</strong><small>interest</small></span></header>
        <Progress assessment={assessment} />
        <div className="baseline-adjustment-row"><span><b>{assessment.baseInterestScore}</b> theme baseline</span><span className={assessment.roleSpecificAdjustment > 0 ? "positive" : assessment.roleSpecificAdjustment < 0 ? "negative" : "neutral"}><b>{assessment.roleSpecificAdjustment > 0 ? "+" : ""}{assessment.roleSpecificAdjustment}</b> role adjustment</span><span><b>{assessment.generalThemeConfidence}%</b> baseline confidence</span></div>
        <div className="discovery-card-copy">{assessment.discovery.answeredCount ? <><strong>{assessment.discovery.energizers[0] || "A nuanced role fit is emerging"}</strong><p>{assessment.discovery.conditions[0] ? `Depends on ${assessment.discovery.conditions[0].toLowerCase()}.` : assessment.discovery.unresolvedQuestions[0] || assessment.nextAction}</p></> : <><strong>{assessment.fingerprint.archetype}</strong><p>{assessment.discovery.nextQuestion}</p></>}</div>
        <footer><button className="secondary" onClick={() => onOpenJob(job.id)}>Open role</button><button className="primary" onClick={() => onOpenDiscovery(job.id)}>{progress.percent ? "Continue role discovery" : "Start role discovery"} <ArrowRight /></button></footer>
      </article>;
    })}</div></section>

    <section className="panel pairwise-discovery"><div className="panel-head responsive"><div><span className="eyebrow">Controlled comparison</span><h2>Compare two opportunities through the work itself</h2><p>Assume title and compensation are equal. Which responsibility mix would you rather live for the next two years?</p></div><GitCompareArrows /></div><div className="pairwise-selectors"><label>Opportunity A<select value={leftId} onChange={(event) => setLeftId(event.target.value)}>{jobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}</select></label><GitCompareArrows /><label>Opportunity B<select value={rightId} onChange={(event) => setRightId(event.target.value)}>{jobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}</select></label></div>{left && right && leftAssessment && rightAssessment && left.id !== right.id ? <div className="pairwise-cards">{[[left, leftAssessment], [right, rightAssessment]].map(([job, assessment]) => {
      const typedJob = job as JobReq;
      const typedAssessment = assessment as JobAssessment;
      return <article key={typedJob.id}><span className="group-pill">{typedAssessment.fingerprint.primaryGroupLabel}</span><h3>{typedJob.title}</h3><div className="pairwise-metrics"><span><b>{typedAssessment.capabilityScore}</b> capability</span><span><b>{typedAssessment.baseInterestScore}</b> baseline</span><span><b>{typedAssessment.roleSpecificAdjustment > 0 ? "+" : ""}{typedAssessment.roleSpecificAdjustment}</b> role adjustment</span><span><b>{typedAssessment.interestScore}</b> final interest</span></div><ul><li><Sparkles /> {typedAssessment.discovery.energizers[0] || typedAssessment.fingerprint.themes[0] || "Primary work theme unclear"}</li><li><HelpCircle /> {typedAssessment.discovery.unresolvedQuestions[0] || "No major unknown recorded"}</li><li><Target /> {recommendationLabel(typedAssessment.recommendation)}</li></ul><button className="primary" onClick={() => prefer(typedJob, typedJob.id === left.id ? right : left)}>I would prefer this work</button></article>;
    })}</div> : <div className="empty-inline"><Lightbulb /> Select two different opportunities to compare.</div>}</section>

    <section className="panel discovery-learning-loop"><div><Network /><div><span className="eyebrow">Learning loop</span><h2>Networking is evidence, not a score bonus</h2><p>Use each conversation to test one hypothesis about the responsibility mix, leadership model, or decision authority.</p></div></div><div><span><MessageCircleQuestion /> Ask what percentage of the week is strategy versus recurring operation.</span><span><MessageCircleQuestion /> Clarify direct reports, team maturity, and difficult management situations.</span><span><MessageCircleQuestion /> Ask which decisions the role owns and what frustrates strong performers.</span></div></section>
  </div>;
}
