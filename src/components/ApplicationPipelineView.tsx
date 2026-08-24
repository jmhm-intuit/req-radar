import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock3,
  MessageSquareText,
  Network,
  Send,
  Sparkles,
  Target,
  Trophy,
  UserRoundSearch
} from "lucide-react";
import { applicationStageLabel, defaultNextAction } from "../lib/portfolioV4";
import type { ApplicationStage, JobAssessment, JobReq, PortfolioDecisionState } from "../types";

interface ApplicationPipelineViewProps {
  jobs: JobReq[];
  assessments: Map<string, JobAssessment>;
  onOpenJob: (jobId: string) => void;
  onUpdateJob: (jobId: string, changes: Partial<JobReq>) => void;
  onSetDecision: (jobId: string, state: PortfolioDecisionState) => void;
  onOpenShortlist: () => void;
}

const ACTIVE_STAGES: ApplicationStage[] = [
  "VALIDATE_ROLE",
  "NETWORKING",
  "PREPARING",
  "APPLIED",
  "RECRUITER_CONVERSATION",
  "INTERVIEWING",
  "OFFER",
  "CLOSED"
];

function stageIcon(stage: ApplicationStage) {
  if (stage === "VALIDATE_ROLE") return <UserRoundSearch />;
  if (stage === "NETWORKING") return <Network />;
  if (stage === "PREPARING") return <Sparkles />;
  if (stage === "APPLIED") return <Send />;
  if (stage === "RECRUITER_CONVERSATION") return <MessageSquareText />;
  if (stage === "INTERVIEWING") return <Target />;
  if (stage === "OFFER") return <Trophy />;
  return <CheckCircle2 />;
}

function stageStatus(stage: ApplicationStage): JobReq["status"] {
  if (stage === "APPLIED" || stage === "RECRUITER_CONVERSATION" || stage === "INTERVIEWING" || stage === "OFFER") return "APPLIED";
  if (stage === "CLOSED") return "CLOSED";
  return "PURSUING";
}

function formatDue(value: string): string {
  if (!value) return "No due date";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  const diff = Math.ceil((date.getTime() - Date.now()) / 86400000);
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return "Due today";
  if (diff === 1) return "Due tomorrow";
  return `Due ${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

function PipelineCard({ job, assessment, onOpenJob, onUpdateJob, onSetDecision }: {
  job: JobReq;
  assessment?: JobAssessment;
  onOpenJob: (jobId: string) => void;
  onUpdateJob: (jobId: string, changes: Partial<JobReq>) => void;
  onSetDecision: (jobId: string, state: PortfolioDecisionState) => void;
}) {
  const [actionDraft, setActionDraft] = useState(job.applicationNextAction || defaultNextAction(job.applicationStage));
  const [notesDraft, setNotesDraft] = useState(job.applicationNotes);

  useEffect(() => setActionDraft(job.applicationNextAction || defaultNextAction(job.applicationStage)), [job.applicationNextAction, job.applicationStage]);
  useEffect(() => setNotesDraft(job.applicationNotes), [job.applicationNotes]);

  const updateStage = (stage: ApplicationStage) => {
    const now = new Date().toISOString();
    const previousDefault = defaultNextAction(job.applicationStage);
    const nextAction = !job.applicationNextAction || job.applicationNextAction === previousDefault
      ? defaultNextAction(stage)
      : job.applicationNextAction;
    onUpdateJob(job.id, {
      applicationStage: stage,
      status: stageStatus(stage),
      decisionState: stage === "CLOSED" ? "NOT_PURSUING" : "PURSUE",
      applicationLastActivityAt: now,
      applicationNextAction: nextAction
    });
  };

  return <article className="v4-pipeline-card">
    <button className="v4-pipeline-card-title" onClick={() => onOpenJob(job.id)}><div><h3>{job.title}</h3><p>{assessment?.fingerprint.primaryGroupLabel || job.category || "Opportunity"}</p></div><ChevronRight /></button>
    <div className="v4-pipeline-fit"><span><b>{assessment?.fitSignature.readinessScore ?? "—"}</b>Experience</span><span><b>{assessment?.fitSignature.attractionScore ?? "—"}</b>Interest</span><span><b>{assessment?.fitSignature.evidenceConfidence ?? "—"}</b>Confidence</span></div>
    <label className="v4-pipeline-field"><span>Application stage</span><select value={job.applicationStage} onChange={(event) => updateStage(event.target.value as ApplicationStage)}>{ACTIVE_STAGES.map((stage) => <option key={stage} value={stage}>{applicationStageLabel(stage)}</option>)}</select></label>
    <label className="v4-pipeline-field"><span>Next action</span><input value={actionDraft} onChange={(event) => setActionDraft(event.target.value)} onBlur={() => onUpdateJob(job.id, { applicationNextAction: actionDraft.trim(), applicationLastActivityAt: new Date().toISOString() })} placeholder={defaultNextAction(job.applicationStage)} /></label>
    <div className="v4-pipeline-date-row"><label><span>Due</span><input type="date" value={job.applicationNextActionDue} onChange={(event) => onUpdateJob(job.id, { applicationNextActionDue: event.target.value, applicationLastActivityAt: new Date().toISOString() })} /></label><span className={job.applicationNextActionDue && job.applicationNextActionDue < new Date().toISOString().slice(0, 10) ? "overdue" : ""}><CalendarDays /> {formatDue(job.applicationNextActionDue)}</span></div>
    <label className="v4-pipeline-field notes"><span>Application notes</span><textarea rows={3} value={notesDraft} onChange={(event) => setNotesDraft(event.target.value)} onBlur={() => onUpdateJob(job.id, { applicationNotes: notesDraft.trim(), applicationLastActivityAt: new Date().toISOString() })} placeholder="Contacts, application preparation, interview learning..." /></label>
    <div className="v4-pipeline-card-actions"><button onClick={() => onSetDecision(job.id, "SHORTLIST")}>Return to shortlist</button><button onClick={() => onOpenJob(job.id)}>Open role <ArrowRight /></button></div>
  </article>;
}

export function ApplicationPipelineView({ jobs, assessments, onOpenJob, onUpdateJob, onSetDecision, onOpenShortlist }: ApplicationPipelineViewProps) {
  const pipelineJobs = useMemo(() => jobs.filter((job) => job.decisionState === "PURSUE" || job.applicationStage !== "NOT_STARTED"), [jobs]);
  const [activeStage, setActiveStage] = useState<ApplicationStage | "ALL">("ALL");
  const dueTasks = useMemo(() => pipelineJobs
    .filter((job) => job.applicationStage !== "CLOSED" && job.applicationNextActionDue)
    .sort((left, right) => left.applicationNextActionDue.localeCompare(right.applicationNextActionDue))
    .slice(0, 5), [pipelineJobs]);
  const visibleStages = ACTIVE_STAGES.filter((stage) => stage !== "CLOSED" || pipelineJobs.some((job) => job.applicationStage === "CLOSED"));

  if (!pipelineJobs.length) return <div className="v4-pipeline"><section className="v4-empty-hero compact"><div className="v4-empty-icon"><BriefcaseBusiness /></div><span className="eyebrow">Application Navigator</span><h2>No active applications yet</h2><p>Application tracking begins only after a role has been evaluated and deliberately moved to Pursue.</p><button className="primary" onClick={onOpenShortlist}>Review the shortlist <ArrowRight /></button></section></div>;

  return <div className="v4-pipeline">
    <section className="v4-pipeline-hero"><div><span className="eyebrow">Application Navigator</span><h2>{pipelineJobs.filter((job) => job.applicationStage !== "CLOSED").length} active applications</h2><p>Every role should have one visible next action. The pipeline begins only after the opportunity has earned a Pursue decision.</p></div><button className="secondary" onClick={onOpenShortlist}>Review portfolio decisions</button></section>

    {dueTasks.length > 0 && <section className="v4-today-panel"><header><Clock3 /><div><strong>Upcoming actions</strong><span>Keep the application process moving without losing the portfolio view.</span></div></header><div>{dueTasks.map((job) => <button key={job.id} onClick={() => onOpenJob(job.id)}><span>{formatDue(job.applicationNextActionDue)}</span><div><strong>{job.applicationNextAction || defaultNextAction(job.applicationStage)}</strong><small>{job.title}</small></div><ChevronRight /></button>)}</div></section>}

    <section className="v4-pipeline-tabs"><button className={activeStage === "ALL" ? "active" : ""} onClick={() => setActiveStage("ALL")}><CircleDot /><span>All</span><b>{pipelineJobs.length}</b></button>{visibleStages.map((stage) => <button key={stage} className={activeStage === stage ? "active" : ""} onClick={() => setActiveStage(stage)}>{stageIcon(stage)}<span>{applicationStageLabel(stage)}</span><b>{pipelineJobs.filter((job) => job.applicationStage === stage).length}</b></button>)}</section>

    <div className="v4-pipeline-board">{visibleStages.filter((stage) => activeStage === "ALL" || activeStage === stage).map((stage) => {
      const stageJobs = pipelineJobs.filter((job) => job.applicationStage === stage);
      if (!stageJobs.length && activeStage === "ALL") return null;
      return <section className="v4-pipeline-column" key={stage}><header>{stageIcon(stage)}<div><strong>{applicationStageLabel(stage)}</strong><span>{stageJobs.length} role{stageJobs.length === 1 ? "" : "s"}</span></div></header><div>{stageJobs.length ? stageJobs.map((job) => <PipelineCard key={job.id} job={job} assessment={assessments.get(job.id)} onOpenJob={onOpenJob} onUpdateJob={onUpdateJob} onSetDecision={onSetDecision} />) : <p className="v4-empty-column">No roles at this stage.</p>}</div></section>;
    })}</div>
  </div>;
}
