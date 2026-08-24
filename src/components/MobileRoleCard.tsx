import { ArrowRight, CalendarDays, Pin, PinOff } from "lucide-react";
import { formatStatus } from "../lib/jobs";
import { DECISION_ACTION_LABELS, SCOPE_STATUS_LABELS } from "../lib/fitNavigator";
import type { JobAssessment, JobReq, JobStatus } from "../types";
import { STATUS_OPTIONS } from "./JobTable";

interface MobileRoleCardProps {
  job: JobReq;
  assessment: JobAssessment;
  onOpen: (jobId: string) => void;
  onUpdate?: (jobId: string, changes: Partial<JobReq>) => void;
  showStatus?: boolean;
}

function scoreTone(value: number): string {
  return value >= 75 ? "good" : value >= 55 ? "mid" : "low";
}

export function MobileRoleCard({ job, assessment, onOpen, onUpdate, showStatus = true }: MobileRoleCardProps) {
  return <article className={`mobile-role-card ${job.pinned ? "pinned" : ""}`}>
    <header><div><span>{assessment.fingerprint.primaryGroupLabel}</span><h3>{job.title}</h3></div>{onUpdate && <button className="mobile-pin" onClick={() => onUpdate(job.id, { pinned: !job.pinned })} aria-label={job.pinned ? "Unpin role" : "Pin role"}>{job.pinned ? <PinOff /> : <Pin />}</button>}</header>
    <div className="mobile-role-badges"><span className={`scope-chip scope-${assessment.fitSignature.scopeStatus.toLowerCase().replace(/_/g, "-")}`}>{SCOPE_STATUS_LABELS[assessment.fitSignature.scopeStatus]}</span><span className={`decision-chip decision-${assessment.fitSignature.decisionAction.toLowerCase().replace(/_/g, "-")}`}>{DECISION_ACTION_LABELS[assessment.fitSignature.decisionAction]}</span>{assessment.ageDays !== null && <span className={assessment.ageDays > 90 ? "age-old" : "age-label"}><CalendarDays /> {assessment.ageDays}d</span>}</div>
    <div className="mobile-fit-signature"><div className={scoreTone(assessment.fitSignature.readinessScore)}><strong>{assessment.fitSignature.readinessScore}</strong><span>Experience</span></div><div className={scoreTone(assessment.fitSignature.attractionScore)}><strong>{assessment.fitSignature.attractionScore}</strong><span>Interest</span></div><div className={scoreTone(assessment.fitSignature.directionScore)}><strong>{assessment.fitSignature.directionScore}</strong><span>Direction</span></div><div className={scoreTone(assessment.fitSignature.evidenceConfidence)}><strong>{assessment.fitSignature.evidenceConfidence}</strong><span>Confidence</span></div></div>
    <p>{assessment.fitSignature.decisionReason}</p>
    <div className="mobile-role-next"><span><b>Next:</b> {assessment.nextAction}</span></div>
    <footer>{showStatus && onUpdate ? <label><span>Status</span><select value={job.status} onChange={(event) => onUpdate(job.id, { status: event.target.value as JobStatus })}>{STATUS_OPTIONS.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}</select></label> : <span /> }<button className="mobile-open-role" onClick={() => onOpen(job.id)}>Open role <ArrowRight /></button></footer>
  </article>;
}
