import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Compass,
  Database,
  ExternalLink,
  FileText,
  Lightbulb,
  Network,
  Save,
  ShieldAlert,
  Sparkles,
  Target,
  Trash2,
  X
} from "lucide-react";
import { ROLE_GROUPS } from "../data/ontology";
import { formatStatus } from "../lib/jobs";
import {
  networkingStageLabel,
  recommendationLabel,
  suggestedNetworkingQuestions
} from "../lib/intelligence";
import type {
  ActionStage,
  JobAssessment,
  JobReq,
  JobStatus,
  ManualPriority,
  NetworkingStage,
  RecommendationOverride,
  SkillMatchStatus
} from "../types";
import { NETWORKING_OPTIONS, STATUS_OPTIONS } from "./JobTable";

interface JobDrawerProps {
  job: JobReq;
  assessment: JobAssessment;
  onUpdate: (changes: Partial<JobReq>) => void;
  onDelete: () => void;
  onClose: () => void;
  notify: (title: string, message: string, kind?: "success" | "error" | "info") => void;
}

type Tab = "OVERVIEW" | "CAPABILITY" | "INTEREST" | "NETWORKING" | "DETAILS";

const SKILL_OPTIONS: SkillMatchStatus[] = ["PROVEN", "TRANSFERABLE", "DEVELOPMENT_GAP", "CRITICAL_BLOCKER", "UNKNOWN", "NOT_RELEVANT"];
const RECOMMENDATION_OPTIONS: RecommendationOverride[] = ["AUTO", "PURSUE_NOW", "EXPLORE_NETWORKING", "STRETCH", "LOW_PRIORITY", "DO_NOT_PURSUE"];
const PRIORITIES: ManualPriority[] = ["HIGH", "NORMAL", "LOW", "ARCHIVE"];
const ACTION_OPTIONS: ActionStage[] = ["REVIEW", "VALIDATE_ROLE", "IDENTIFY_CONTACT", "NETWORK", "PREPARE_APPLICATION", "APPLY", "FOLLOW_UP", "COMPLETE"];

function recommendationClass(value: JobAssessment["recommendation"]): string {
  return `rec-${value.toLowerCase().replace(/_/g, "-")}`;
}

function skillClass(value: SkillMatchStatus): string {
  return `skill-${value.toLowerCase().replace(/_/g, "-")}`;
}

function actionLabel(value: ActionStage): string {
  return value.split("_").map((part) => part.charAt(0) + part.slice(1).toLowerCase()).join(" ");
}

function fitTone(value: number): string {
  return value >= 75 ? "good" : value >= 50 ? "mid" : "bad";
}

function Metric({ label, value, detail }: { label: string; value: number; detail: string }) {
  return <div className={`drawer-metric ${fitTone(value)}`}><strong>{value}</strong><span>{label}</span><small>{detail}</small></div>;
}

export function JobDrawer({ job, assessment, onUpdate, onDelete, onClose, notify }: JobDrawerProps) {
  const [tab, setTab] = useState<Tab>("OVERVIEW");
  const [questionDraft, setQuestionDraft] = useState("");

  useEffect(() => setTab("OVERVIEW"), [job.id]);

  const openJob = () => {
    try {
      const value = job.jobUrl.trim();
      if (!value) throw new Error("Add a job requisition URL first.");
      const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
      window.open(url.toString(), "_blank", "noopener,noreferrer");
    } catch (error) {
      notify("Job link is not ready", error instanceof Error ? error.message : "Check the URL.", "error");
    }
  };

  const addSuggestedQuestions = () => {
    const suggestions = suggestedNetworkingQuestions(assessment);
    onUpdate({ networkingQuestions: [...new Set([...job.networkingQuestions, ...suggestions])] });
  };

  const addQuestion = () => {
    const clean = questionDraft.trim();
    if (!clean) return;
    onUpdate({ networkingQuestions: [...job.networkingQuestions, clean] });
    setQuestionDraft("");
  };

  const hypothesis = job.networkingHypothesis || `This role is primarily ${assessment.fingerprint.themes.slice(0, 2).join(" and ").toLowerCase() || "aligned work"}, and the most important uncertainty is ${assessment.unknowns[0]?.toLowerCase() || "the actual mix of responsibilities"}.`;

  return <><button className="drawer-backdrop" onClick={onClose} aria-label="Close job details" /><aside className="drawer v2">
    <header><div><span className="eyebrow">{job.jobId || "No Job ID"} · {assessment.fingerprint.primaryGroupLabel}</span><h2>{job.title}</h2><div className="drawer-head-badges"><span className={`recommendation ${recommendationClass(assessment.recommendation)}`}>{recommendationLabel(assessment.recommendation)}</span><span className="rank-score">Rank score {assessment.finalScore}</span><span className={`confidence-chip confidence-${assessment.confidence.toLowerCase()}`}>{assessment.confidence.toLowerCase()} confidence</span></div></div><button className="icon-btn" onClick={onClose}><X /></button></header>
    <nav className="drawer-tabs">{(["OVERVIEW", "CAPABILITY", "INTEREST", "NETWORKING", "DETAILS"] as Tab[]).map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item.charAt(0) + item.slice(1).toLowerCase()}</button>)}</nav>
    <div className="drawer-body">
      {tab === "OVERVIEW" && <>
        <section className="assessment-hero v2"><div className="metric-row"><Metric label="Capability" value={assessment.capabilityScore} detail="Can I do it?" /><Metric label="Interest" value={assessment.interestScore} detail="Would it energize me?" /><Metric label="Direction" value={assessment.directionScore} detail="Where does it lead?" /><Metric label="Viability" value={assessment.viabilityScore} detail={assessment.ageLabel} /></div><div className="recommendation-summary"><Target /><div><strong>{recommendationLabel(assessment.recommendation)}</strong><p>{assessment.nextAction}</p></div></div></section>
        <section className="drawer-section evidence-summary"><div className="section-head"><div><h3>Why ReqRadar recommends this</h3><p>Fit, viability, status, and action readiness are kept separate.</p></div><Sparkles /></div><ul>{assessment.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>{assessment.unknowns.length > 0 && <div className="unknown-box"><Lightbulb /><div><strong>Questions that could change the recommendation</strong><p>{assessment.unknowns.join(" · ")}</p></div></div>}</section>
        <section className="drawer-section role-fingerprint"><div className="section-head"><div><h3>Job fingerprint</h3><p>{assessment.fingerprint.archetype}</p></div><Compass /></div><div className="fingerprint-grid"><div><span>Primary family</span><strong>{assessment.fingerprint.primaryGroupLabel}</strong></div><div><span>Leadership model</span><strong>{assessment.fingerprint.leadershipModel}</strong></div><div><span>Work themes</span><div className="theme-cloud small">{assessment.fingerprint.themes.map((theme) => <b key={theme}>{theme}</b>)}</div></div><div><span>Direction matches</span><strong>{assessment.directionMatches.join(", ") || "No strong direction match yet"}</strong></div></div></section>
        <section className="drawer-section controls-grid"><label>Status<select value={job.status} onChange={(event) => onUpdate({ status: event.target.value as JobStatus })}>{STATUS_OPTIONS.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}</select></label><label>Next action<select value={job.actionStage} onChange={(event) => onUpdate({ actionStage: event.target.value as ActionStage })}>{ACTION_OPTIONS.map((value) => <option key={value} value={value}>{actionLabel(value)}</option>)}</select></label><label>System recommendation<select value={job.recommendationOverride} onChange={(event) => onUpdate({ recommendationOverride: event.target.value as RecommendationOverride })}>{RECOMMENDATION_OPTIONS.map((value) => <option key={value} value={value}>{value === "AUTO" ? "Automatic" : recommendationLabel(value)}</option>)}</select></label><label>Manual priority<select value={job.manualPriority} onChange={(event) => onUpdate({ manualPriority: event.target.value as ManualPriority })}>{PRIORITIES.map((value) => <option key={value} value={value}>{value.charAt(0) + value.slice(1).toLowerCase()}</option>)}</select></label><label>Rank adjustment<input type="number" min={-20} max={20} value={job.manualAdjustment} onChange={(event) => onUpdate({ manualAdjustment: Math.max(-20, Math.min(20, Number(event.target.value) || 0)) })} /></label><label>Interest adjustment<input type="number" min={-20} max={20} value={job.interestAdjustment} onChange={(event) => onUpdate({ interestAdjustment: Math.max(-20, Math.min(20, Number(event.target.value) || 0)) })} /></label></section>
        <section className="drawer-section stale-control"><div><h3>Posting viability</h3><p>{assessment.ageLabel}. Jobs older than 90 days default to Do not pursue until verified active.</p></div><div><label><input type="checkbox" checked={job.ageOverride} onChange={(event) => onUpdate({ ageOverride: event.target.checked })} /> Ignore age rule</label><label>Verified active date<input type="date" value={job.verifiedActiveAt.slice(0, 10)} onChange={(event) => onUpdate({ verifiedActiveAt: event.target.value })} /></label></div></section>
      </>}

      {tab === "CAPABILITY" && <>
        <section className="drawer-section intro-card"><ShieldAlert /><div><h3>Capability Fit: {assessment.capabilityScore}%</h3><p>Requirements are weighted by must-have, general, and preferred importance. Critical credentials act as gates.</p></div></section>
        <div className="capability-list">{assessment.capabilitySkills.length ? assessment.capabilitySkills.map((item) => <article key={item.requirement.id} className={`capability-item ${skillClass(item.status)}`}><header><div><span>{item.requirement.importance.toLowerCase()} · {item.requirement.category.toLowerCase()}</span><h3>{item.requirement.name}</h3></div>{item.requirement.critical && <b className="critical-tag">Critical</b>}</header><blockquote>{item.requirement.evidence}</blockquote><div className="match-explanation"><strong>{item.status.replace(/_/g, " ").toLowerCase()}</strong><p>{item.reason}</p></div>{item.evidence.length > 0 && <div className="resume-evidence"><span>Profile evidence</span>{item.evidence.slice(0, 2).map((evidence) => <p key={evidence}>{evidence}</p>)}</div>}<label>Correct classification<select value={job.skillOverrides[item.requirement.name] || item.status} onChange={(event) => onUpdate({ skillOverrides: { ...job.skillOverrides, [item.requirement.name]: event.target.value as SkillMatchStatus } })}>{SKILL_OPTIONS.map((value) => <option key={value} value={value}>{value.replace(/_/g, " ").toLowerCase()}</option>)}</select></label></article>) : <div className="empty-inline">No structured requirements were detected. Review the raw job description under Details.</div>}</div>
      </>}

      {tab === "INTEREST" && <>
        <section className="drawer-section intro-card"><Sparkles /><div><h3>Interest & Energy Fit: {assessment.interestScore}%</h3><p>This compares the role's work characteristics with your confirmed preferences. Missing information remains unknown.</p></div></section>
        <div className="interest-signal-list">{assessment.interestSignals.sort((left, right) => right.preference.importance - left.preference.importance).map((item) => <article key={item.dimension} className={`interest-signal tone-${item.tone.toLowerCase()}`}><header><div><h3>{item.label}</h3><span>{item.preference.score > 0 ? "You want more" : item.preference.score < 0 ? "You prefer less" : "Neutral preference"} · importance {item.preference.importance}/3</span></div><strong>{item.tone === "UNKNOWN" ? "?" : item.alignmentScore}</strong></header><p>{item.explanation}</p>{item.jobSignal.evidence[0] && <blockquote>{item.jobSignal.evidence[0]}</blockquote>}</article>)}</div>
        <section className="drawer-section"><label className="field"><span>Fit interpretation notes</span><textarea rows={5} value={job.fitNotes} onChange={(event) => onUpdate({ fitNotes: event.target.value })} placeholder="Example: Recruiter confirmed this role includes direct people leadership and less recurring program administration than the posting suggests." /></label></section>
      </>}

      {tab === "NETWORKING" && <>
        <section className="drawer-section intro-card"><Network /><div><h3>Networking as a career experiment</h3><p>Use conversations to test assumptions and reduce uncertainty. Networking does not inflate the fit score.</p></div></section>
        <section className="drawer-section controls-grid"><label>Stage<select value={job.networkingStage} onChange={(event) => onUpdate({ networkingStage: event.target.value as NetworkingStage })}>{NETWORKING_OPTIONS.map((stage) => <option key={stage} value={stage}>{networkingStageLabel(stage)}</option>)}</select></label><label>Contact<input value={job.networkingContact} onChange={(event) => onUpdate({ networkingContact: event.target.value })} placeholder="Name or relationship" /></label></section>
        <section className="drawer-section"><label className="field"><span>Hypothesis to test</span><textarea rows={4} value={job.networkingHypothesis || hypothesis} onFocus={() => !job.networkingHypothesis && onUpdate({ networkingHypothesis: hypothesis })} onChange={(event) => onUpdate({ networkingHypothesis: event.target.value })} /></label></section>
        <section className="drawer-section"><div className="section-head"><div><h3>Questions to ask</h3><p>Target questions that could change your interest or recommendation.</p></div><button className="secondary small" onClick={addSuggestedQuestions}><Lightbulb /> Suggest questions</button></div><div className="question-builder"><input value={questionDraft} onChange={(event) => setQuestionDraft(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addQuestion()} placeholder="Add a question" /><button onClick={addQuestion}><ChevronRight /></button></div><ul className="network-questions">{job.networkingQuestions.map((question, index) => <li key={`${question}-${index}`}><span>{question}</span><button onClick={() => onUpdate({ networkingQuestions: job.networkingQuestions.filter((_, itemIndex) => itemIndex !== index) })}><X /></button></li>)}</ul></section>
        <section className="drawer-section"><label className="field"><span>Conversation notes</span><textarea rows={5} value={job.networkingNotes} onChange={(event) => onUpdate({ networkingNotes: event.target.value })} placeholder="Message, follow-up date, referral status..." /></label><label className="field"><span>What changed after the conversation?</span><textarea rows={5} value={job.networkingLearnings} onChange={(event) => onUpdate({ networkingLearnings: event.target.value })} placeholder="Which assumption was confirmed? Which was disproved? Did your interest increase or decrease?" /></label></section>
      </>}

      {tab === "DETAILS" && <>
        <section className="drawer-section controls-grid"><label>Role family override<select value={job.groupOverride} onChange={(event) => onUpdate({ groupOverride: event.target.value })}><option value="">Automatic</option>{ROLE_GROUPS.map((group) => <option key={group.id} value={group.id}>{group.label}</option>)}</select></label><label>Date posted<input value={job.datePosted} onChange={(event) => onUpdate({ datePosted: event.target.value })} /></label><label className="wide-field">Job requisition URL<input value={job.jobUrl} onChange={(event) => onUpdate({ jobUrl: event.target.value })} placeholder="https://..." /></label></section>
        {job.jobUrl && <button className="secondary full" onClick={openJob}><ExternalLink /> Open job requisition</button>}
        <section className="drawer-section"><h3>Req metadata</h3><dl className="detail-grid"><div><dt>Category</dt><dd>{job.category || "Not specified"}</dd></div><div><dt>Team</dt><dd>{job.team || "Not specified"}</dd></div><div><dt>Hiring manager</dt><dd>{job.hiringManager || "Not specified"}</dd></div><div><dt>Recruiter</dt><dd>{job.recruiter || "Not specified"}</dd></div><div><dt>Location</dt><dd>{job.locations.join("; ") || "Not specified"}</dd></div><div><dt>Seniority</dt><dd>{job.seniority || "Not specified"}</dd></div></dl></section>
        <section className="drawer-section"><h3>Responsibilities</h3>{job.responsibilities.length ? <ul className="text-list">{job.responsibilities.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="muted">No structured responsibilities detected.</p>}</section>
        <section className="drawer-section"><h3>Qualifications</h3>{job.qualifications.length ? <ul className="text-list">{job.qualifications.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="muted">No structured qualifications detected.</p>}</section>
        <section className="drawer-section"><label className="field"><span>Personal notes</span><textarea rows={6} value={job.notes} onChange={(event) => onUpdate({ notes: event.target.value })} /></label></section>
        <section className="drawer-section raw-description"><details><summary><FileText /> Raw job description</summary><pre>{job.descriptionText}</pre></details></section>
        <div className="local-note"><Database /> Stored locally in this browser. Use Sync to move it to another device.</div>
      </>}
    </div>
    <footer><button className="danger" onClick={onDelete}><Trash2 /> Delete</button><div>{job.jobUrl && <button className="secondary" onClick={openJob}><ExternalLink /> Open req</button>}<button className="primary" onClick={onClose}><CheckCircle2 /> Done</button></div></footer>
  </aside></>;
}
