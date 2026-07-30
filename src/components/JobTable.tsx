import {
  ChevronRight,
  ExternalLink,
  Pin,
  PinOff
} from "lucide-react";
import { formatStatus } from "../lib/jobs";
import { networkingStageLabel, recommendationLabel } from "../lib/intelligence";
import type {
  JobAssessment,
  JobReq,
  JobStatus,
  NetworkingStage
} from "../types";

export const STATUS_OPTIONS: JobStatus[] = ["NEW", "EXPLORING", "PURSUING", "MAYBE", "APPLIED", "NOT_PURSUING", "CLOSED"];
export const NETWORKING_OPTIONS: NetworkingStage[] = [
  "NOT_STARTED", "CONTACT_IDENTIFIED", "MESSAGE_PLANNED", "CONTACTED", "RESPONSE_RECEIVED",
  "CONVERSATION_SCHEDULED", "CONVERSATION_COMPLETED", "FOLLOW_UP", "REFERRAL_REQUESTED", "REFERRAL_RECEIVED", "NOT_NEEDED"
];

function statusClass(status: JobStatus): string {
  return `status-${status.toLowerCase().replace(/_/g, "-")}`;
}

function recommendationClass(value: JobAssessment["recommendation"]): string {
  return `rec-${value.toLowerCase().replace(/_/g, "-")}`;
}

function fitTone(value: number): string {
  return value >= 75 ? "good" : value >= 50 ? "mid" : "bad";
}

function Score({ value, label }: { value: number; label: string }) {
  return <span className={`fit-score ${fitTone(value)}`}><strong>{value}</strong><small>{label}</small></span>;
}

interface JobTableProps {
  jobs: JobReq[];
  assessments: Map<string, JobAssessment>;
  onOpen: (jobId: string) => void;
  onUpdate: (jobId: string, changes: Partial<JobReq>) => void;
  compact?: boolean;
  startRank?: number;
}

export function JobTable({ jobs, assessments, onOpen, onUpdate, compact = false, startRank = 0 }: JobTableProps) {
  if (!jobs.length) return <div className="empty-inline">No requisitions match this view.</div>;
  return (
    <div className="table-wrap">
      <table className={`jobs-table ${compact ? "compact" : ""}`}>
        <thead><tr>
          <th>#</th>
          <th>Opportunity</th>
          {!compact && <th>Role family</th>}
          <th>Status</th>
          <th>Recommendation</th>
          <th>Capability</th>
          <th>Interest</th>
          {!compact && <th>Direction</th>}
          <th>Age</th>
          {!compact && <th>Networking</th>}
          <th />
        </tr></thead>
        <tbody>{jobs.map((job, index) => {
          const assessment = assessments.get(job.id);
          if (!assessment) return null;
          return <tr key={job.id} className={`${job.pinned ? "pinned-row" : ""} ${job.status === "NOT_PURSUING" || job.status === "CLOSED" ? "inactive-row" : ""}`}>
            <td><div className="rank-cell"><button className="icon-btn subtle" onClick={() => onUpdate(job.id, { pinned: !job.pinned })} title={job.pinned ? "Unpin" : "Pin to top"}>{job.pinned ? <Pin size={15} /> : <PinOff size={15} />}</button><strong>{startRank + index + 1}</strong><span>{assessment.finalScore}</span></div></td>
            <td><button className="job-link" onClick={() => onOpen(job.id)}><strong>{job.title}</strong><span>{job.jobId || "No Job ID"} · {job.team || job.category || "Team not specified"}</span></button></td>
            {!compact && <td><span className="group-pill">{assessment.fingerprint.primaryGroupLabel}</span><small className="table-sub">{assessment.fingerprint.leadershipModel}</small></td>}
            <td><select className={`compact-select ${statusClass(job.status)}`} value={job.status} onChange={(event) => onUpdate(job.id, { status: event.target.value as JobStatus })}>{STATUS_OPTIONS.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}</select></td>
            <td><span className={`recommendation ${recommendationClass(assessment.recommendation)}`}>{recommendationLabel(assessment.recommendation)}</span><small className="table-sub confidence">{assessment.confidence.toLowerCase()} confidence</small></td>
            <td><Score value={assessment.capabilityScore} label={assessment.criticalBlockers.length ? "blocker" : "fit"} /></td>
            <td><div className="table-fit-stack"><Score value={assessment.interestScore} label="fit" /><small>{assessment.discovery.answeredCount}/{assessment.discovery.targetCount} scenarios</small></div></td>
            {!compact && <td><Score value={assessment.directionScore} label="direction" /></td>}
            <td><span className={assessment.ageDays !== null && assessment.ageDays > 90 && !job.ageOverride && !job.verifiedActiveAt ? "age-old" : "age-label"}>{assessment.ageLabel}</span></td>
            {!compact && <td><select className="compact-select network-select" value={job.networkingStage} onChange={(event) => onUpdate(job.id, { networkingStage: event.target.value as NetworkingStage })}>{NETWORKING_OPTIONS.map((stage) => <option key={stage} value={stage}>{networkingStageLabel(stage)}</option>)}</select></td>}
            <td><div className="row-actions">{job.jobUrl && <button className="icon-btn" onClick={() => window.open(job.jobUrl, "_blank", "noopener,noreferrer")} title="Open job requisition"><ExternalLink size={16} /></button>}<button className="icon-btn" onClick={() => onOpen(job.id)} title="Review evidence"><ChevronRight size={18} /></button></div></td>
          </tr>;
        })}</tbody>
      </table>
    </div>
  );
}
