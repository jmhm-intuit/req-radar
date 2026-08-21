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
  DECISION_ACTION_LABELS,
  MATCH_STATUS_LABELS,
  SCOPE_STATUS_LABELS
} from "../lib/fitNavigator";
import {
  focusBucketLabel,
  networkingStageLabel,
  recommendationLabel,
  suggestedNetworkingQuestions
} from "../lib/intelligence";
import type {
  ActionStage,
  JobAssessment,
  JobReq,
  JobStatus,
  FocusBucketOverride,
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
  onOpenDiscovery: () => void;
}

type Tab = "OVERVIEW" | "CAPABILITY" | "DISCOVERY" | "NETWORKING" | "DETAILS";

const TAB_LABELS: Record<Tab, string> = {
  OVERVIEW: "Fit signature",
  CAPABILITY: "Match ledger",
  DISCOVERY: "Interest",
  NETWORKING: "Networking",
  DETAILS: "Details"
};

const SKILL_OPTIONS: SkillMatchStatus[] = ["PROVEN", "TRANSFERABLE", "PARTIAL", "DEVELOPMENT_GAP", "NOT_DEMONSTRATED", "CRITICAL_BLOCKER", "UNKNOWN", "NOT_RELEVANT"];
const RECOMMENDATION_OPTIONS: RecommendationOverride[] = ["AUTO", "PURSUE_NOW", "EXPLORE_NETWORKING", "STRETCH", "LOW_PRIORITY", "DO_NOT_PURSUE"];
const PRIORITIES: ManualPriority[] = ["HIGH", "NORMAL", "LOW", "ARCHIVE"];
const ACTION_OPTIONS: ActionStage[] = ["REVIEW", "VALIDATE_ROLE", "IDENTIFY_CONTACT", "NETWORK", "PREPARE_APPLICATION", "APPLY", "FOLLOW_UP", "COMPLETE"];
const FOCUS_OPTIONS: FocusBucketOverride[] = [
  "AUTO", "READY_TO_PURSUE", "NEEDS_DISCOVERY", "NEEDS_NETWORKING", "HIGH_INTEREST_STRETCH",
  "CAPABLE_NOT_COMPELLING", "TOO_TECHNICAL", "NOT_INTERESTED", "TOO_OLD", "CRITICAL_BLOCKER", "INACTIVE"
];

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

function DeferredTextarea({
  value,
  onCommit,
  rows = 5,
  placeholder = ""
}: {
  value: string;
  onCommit: (value: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = () => {
    if (draft !== value) onCommit(draft);
  };
  return <textarea rows={rows} value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={commit} placeholder={placeholder} />;
}

export function JobDrawer({ job, assessment, onUpdate, onDelete, onClose, notify, onOpenDiscovery }: JobDrawerProps) {
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
    <header><div><span className="eyebrow">{job.jobId || "No Job ID"} · {assessment.fingerprint.primaryGroupLabel}</span><h2>{job.title}</h2><div className="drawer-head-badges"><span className={`scope-chip scope-${assessment.fitSignature.scopeStatus.toLowerCase().replace(/_/g, "-")}`}>{SCOPE_STATUS_LABELS[assessment.fitSignature.scopeStatus]}</span><span className={`decision-chip decision-${assessment.fitSignature.decisionAction.toLowerCase().replace(/_/g, "-")}`}>{DECISION_ACTION_LABELS[assessment.fitSignature.decisionAction]}</span><span className="rank-score">Rank score {assessment.finalScore}</span><span className={`confidence-chip confidence-${assessment.confidence.toLowerCase()}`}>{assessment.fitSignature.evidenceConfidence}% evidence</span></div></div><button className="icon-btn" onClick={onClose}><X /></button></header>
    <nav className="drawer-tabs">{(["OVERVIEW", "CAPABILITY", "DISCOVERY", "NETWORKING", "DETAILS"] as Tab[]).map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{TAB_LABELS[item]}</button>)}</nav>
    <div className="drawer-body">
      {tab === "OVERVIEW" && <>
        <section className="assessment-hero v2 fit-signature-hero"><div className="fit-signature-callout"><div><span className={`scope-chip scope-${assessment.fitSignature.scopeStatus.toLowerCase().replace(/_/g, "-")}`}>{SCOPE_STATUS_LABELS[assessment.fitSignature.scopeStatus]}</span><h3>{assessment.fitSignature.scopeReason}</h3></div><div><span className={`decision-chip decision-${assessment.fitSignature.decisionAction.toLowerCase().replace(/_/g, "-")}`}>{DECISION_ACTION_LABELS[assessment.fitSignature.decisionAction]}</span><p>{assessment.fitSignature.decisionReason}</p></div></div><div className="metric-row"><Metric label="Readiness" value={assessment.fitSignature.readinessScore} detail="Can I meet the day-one demands?" /><Metric label="Attraction" value={assessment.fitSignature.attractionScore} detail="Would I want to repeat the work?" /><Metric label="Direction" value={assessment.fitSignature.directionScore} detail="Does it move me forward?" /><Metric label="Evidence" value={assessment.fitSignature.evidenceConfidence} detail="How reliable is this assessment?" /></div><div className="recommendation-summary"><Target /><div><strong>{assessment.fitSignature.rankingRobustness.charAt(0) + assessment.fitSignature.rankingRobustness.slice(1).toLowerCase()} ranking</strong><p>{assessment.fitSignature.rankingSensitivity}</p></div></div></section>
        <section className="drawer-section readiness-dimensions"><div className="section-head"><div><h3>Readiness by dimension</h3><p>General competencies, functional context, technical demands, and organizational scope remain separate.</p></div><ShieldAlert /></div><div className="readiness-dimension-grid"><Metric label="General competencies" value={assessment.generalCompetencyScore} detail="Strategy, leadership, operations, analytics" /><Metric label="Functional & domain" value={assessment.domainReadinessScore} detail="Product, customer, industry context" /><Metric label="Technical readiness" value={assessment.technicalReadinessScore} detail={assessment.successProfile.technicalMode.replace(/_/g, " ").toLowerCase()} /><Metric label="Scope readiness" value={assessment.scopeReadinessScore} detail="Level, authority, leadership scope" /></div></section>
        <section className="drawer-section success-profile"><div className="section-head"><div><h3>Job Success Profile</h3><p>Understand the work before judging the title. Statements below remain traceable to the posting.</p></div><Compass /></div><div className="success-profile-grid"><article><span>Outcomes this role must create</span><ul>{assessment.successProfile.outcomes.slice(0, 5).map((item) => <li key={item.id}>{item.statement}</li>)}</ul></article><article><span>Recurring responsibilities</span><ul>{assessment.successProfile.recurringResponsibilities.slice(0, 5).map((item) => <li key={item.id}>{item.statement}</li>)}</ul></article></div><div className="role-workprint"><span>Estimated work mix</span>{assessment.successProfile.workprint.slice(0, 6).map((item) => <div key={item.id}><strong>{item.label}</strong><i><b style={{ width: `${item.score}%` }} /></i><small>{item.score}%</small></div>)}</div><div className="role-context-grid">{assessment.successProfile.contexts.map((item) => <article key={item.id} className={item.inferenceLevel === "UNKNOWN" ? "unknown" : ""}><span>{item.label}</span><strong>{item.value}</strong><small>{item.inferenceLevel.replace(/_/g, " ").toLowerCase()}</small></article>)}</div></section>
        <section className="drawer-section evidence-summary"><div className="section-head"><div><h3>Why ReqRadar placed this role here</h3><p>Scope, readiness, attraction, viability, and your workflow decision are kept separate.</p></div><Sparkles /></div><ul>{assessment.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>{assessment.unknowns.length > 0 && <div className="unknown-box"><Lightbulb /><div><strong>What could change the assessment</strong><p>{assessment.unknowns.join(" · ")}</p></div></div>}</section>
        <section className="drawer-section role-fingerprint"><div className="section-head"><div><h3>Role identity</h3><p>{assessment.fingerprint.archetype}</p></div><Compass /></div><div className="fingerprint-grid"><div><span>Primary family</span><strong>{assessment.fingerprint.primaryGroupLabel}</strong></div><div><span>Leadership model</span><strong>{assessment.fingerprint.leadershipModel}</strong></div><div><span>Technical mode</span><strong>{assessment.successProfile.technicalMode.replace(/_/g, " ").toLowerCase()}</strong></div><div><span>Direction matches</span><strong>{assessment.directionMatches.join(", ") || "No strong direction match yet"}</strong></div><div><span>Work themes</span><div className="theme-cloud small">{assessment.fingerprint.themes.map((theme) => <b key={theme}>{theme}</b>)}</div></div></div></section>
        <section className="drawer-section controls-grid"><label>Status<select value={job.status} onChange={(event) => onUpdate({ status: event.target.value as JobStatus })}>{STATUS_OPTIONS.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}</select></label><label>Next action<select value={job.actionStage} onChange={(event) => onUpdate({ actionStage: event.target.value as ActionStage })}>{ACTION_OPTIONS.map((value) => <option key={value} value={value}>{actionLabel(value)}</option>)}</select></label><label>System recommendation<select value={job.recommendationOverride} onChange={(event) => onUpdate({ recommendationOverride: event.target.value as RecommendationOverride })}>{RECOMMENDATION_OPTIONS.map((value) => <option key={value} value={value}>{value === "AUTO" ? "Automatic" : recommendationLabel(value)}</option>)}</select></label><label>Manual priority<select value={job.manualPriority} onChange={(event) => onUpdate({ manualPriority: event.target.value as ManualPriority })}>{PRIORITIES.map((value) => <option key={value} value={value}>{value.charAt(0) + value.slice(1).toLowerCase()}</option>)}</select></label><label>Rank adjustment<input type="number" min={-20} max={20} value={job.manualAdjustment} onChange={(event) => onUpdate({ manualAdjustment: Math.max(-20, Math.min(20, Number(event.target.value) || 0)) })} /></label><label>Interest adjustment<input type="number" min={-20} max={20} value={job.interestAdjustment} onChange={(event) => onUpdate({ interestAdjustment: Math.max(-20, Math.min(20, Number(event.target.value) || 0)) })} /></label><label>Focus bucket<select value={job.focusBucketOverride} onChange={(event) => onUpdate({ focusBucketOverride: event.target.value as FocusBucketOverride })}>{FOCUS_OPTIONS.map((value) => <option key={value} value={value}>{value === "AUTO" ? `Automatic · ${focusBucketLabel(assessment.focusBucket)}` : focusBucketLabel(value)}</option>)}</select></label></section>
        <section className="drawer-section stale-control"><div><h3>Posting viability</h3><p>{assessment.ageLabel}. Jobs older than 90 days default to Do not pursue until verified active.</p></div><div><label><input type="checkbox" checked={job.ageOverride} onChange={(event) => onUpdate({ ageOverride: event.target.checked })} /> Ignore age rule</label><label>Verified active date<input type="date" value={job.verifiedActiveAt.slice(0, 10)} onChange={(event) => onUpdate({ verifiedActiveAt: event.target.value })} /></label></div></section>
      </>}

      {tab === "CAPABILITY" && <>
        <section className="drawer-section intro-card match-ledger-intro"><ShieldAlert /><div><h3>Match Ledger · {assessment.capabilityScore}% readiness</h3><p>Each classification connects a role demand to evidence in your past experience. “Not demonstrated” means the current profile does not show enough evidence—it does not claim that you lack the capability.</p></div></section>
        <section className="drawer-section competency-family-strip"><div className="section-head"><div><h3>Readiness by competency family</h3><p>Start broad, then inspect the requirements that drive each result.</p></div></div><div>{assessment.competencyFamilies.filter((family) => family.requirements.length || family.family === "SCOPE").map((family) => <article key={family.family} className={`family-summary ${skillClass(family.dominantStatus)}`}><header><span>{family.label}</span><strong>{family.score}</strong></header><i><b style={{ width: `${family.score}%` }} /></i><p>{family.summary}</p><small>{family.confidence}% confidence · {family.coverage}% evidence coverage</small></article>)}</div></section>
        <section className="drawer-section ledger-explainer"><div><b>✓ Proven</b><span>Comparable evidence at the expected level</span></div><div><b>↗ Transferable</b><span>Adjacent experience with a credible transition</span></div><div><b>~ Partial</b><span>Direct evidence below the expected depth or scope</span></div><div><b>△ Developmental</b><span>Likely learnable rather than blocking</span></div><div><b>– Not demonstrated</b><span>Missing from the current evidence profile</span></div><div><b>! Blocker</b><span>Central and difficult to resolve during onboarding</span></div></section>
        <div className="match-ledger-list">{assessment.capabilitySkills.length ? assessment.capabilitySkills.map((item) => <article key={item.requirement.id} className={`match-ledger-item ${skillClass(item.status)}`}>
          <header><div><span>{item.requirement.family.replace(/_/g, " ").toLowerCase()} · {item.requirement.criticality.replace(/_/g, " ").toLowerCase()}</span><h3>{item.requirement.name}</h3></div><span className={`match-status ${skillClass(item.status)}`}>{MATCH_STATUS_LABELS[item.status]}</span></header>
          <div className="ledger-demand"><span>Role demand</span><p>{item.requirement.behavior}</p><blockquote>{item.requirement.evidence}</blockquote><div><small>{item.requirement.expectedProficiency.toLowerCase()} proficiency</small><small>{item.requirement.centrality}/5 centrality</small><small>{item.requirement.learnability.toLowerCase()} learnability</small><small>{item.requirement.inferenceLevel.replace(/_/g, " ").toLowerCase()}</small></div></div>
          <div className="ledger-match"><span>Candidate evidence</span><strong>{item.reason}</strong>{item.matchedProfileSkill ? <div className="matched-skill"><b>{item.matchedProfileSkill.name}</b><small>{item.matchedProfileSkill.proficiency.toLowerCase()} · {item.evidenceStrength}% evidence strength</small></div> : <p className="muted">No reviewed profile competency is currently linked.</p>}{item.evidence.length > 0 && <div className="resume-evidence">{item.evidence.slice(0, 3).map((evidence) => <p key={evidence}>{evidence}</p>)}</div>}<small>{item.matchConfidence}% match confidence · {item.scopeNote}</small></div>
          <label className="ledger-override">Correct classification<select value={job.skillOverrides[item.requirement.name] || item.status} onChange={(event) => onUpdate({ skillOverrides: { ...job.skillOverrides, [item.requirement.name]: event.target.value as SkillMatchStatus } })}>{SKILL_OPTIONS.map((value) => <option key={value} value={value}>{MATCH_STATUS_LABELS[value]}</option>)}</select></label>
        </article>) : <div className="empty-inline">No structured requirements were detected. Review the raw job description under Details.</div>}</div>
      </>}

      {tab === "DISCOVERY" && <>
        <section className="drawer-section intro-card discovery-intro-card"><Compass /><div><h3>Interest Fit: {assessment.interestScore}%</h3><p>{assessment.baseInterestScore}% comes from your General Theme Profile. Role-specific reflection currently adjusts this by {assessment.roleSpecificAdjustment > 0 ? "+" : ""}{assessment.roleSpecificAdjustment} points.</p></div><button className="primary" onClick={onOpenDiscovery}><Sparkles /> {assessment.discovery.answeredCount ? "Continue studio" : "Start studio"}</button></section>
        <section className="drawer-section discovery-dimension-strip"><Metric label="Work content" value={assessment.workContentScore} detail="Problems & responsibilities" /><Metric label="Work design" value={assessment.workDesignScore} detail="Autonomy, rhythm, ambiguity" /><Metric label="Leadership" value={assessment.leadershipSocialScore} detail="People & influence" /></section>
        <section className="drawer-section discovery-progress-drawer"><div><span style={{ width: `${Math.round((assessment.discovery.answeredCount / Math.max(1, assessment.discovery.targetCount)) * 100)}%` }} /></div><small>{assessment.discovery.answeredCount} of {assessment.discovery.targetCount} realistic scenarios completed · {assessment.discovery.confidence}% discovery confidence</small></section>
        <div className="drawer-discovery-insights"><article className="positive"><h3>Likely energizers</h3>{assessment.discovery.energizers.length ? <ul>{assessment.discovery.energizers.map((item) => <li key={item}>{item}</li>)}</ul> : <p>Complete scenarios to identify energizers.</p>}</article><article className="negative"><h3>Potential drains</h3>{assessment.discovery.drains.length ? <ul>{assessment.discovery.drains.map((item) => <li key={item}>{item}</li>)}</ul> : <p>No strong drain identified yet.</p>}</article><article className="conditional"><h3>Conditions that matter</h3>{assessment.discovery.conditions.length ? <ul>{assessment.discovery.conditions.map((item) => <li key={item}>{item}</li>)}</ul> : <p>No conditional preference recorded yet.</p>}</article></div>
        <section className="drawer-section unknown-box"><Lightbulb /><div><strong>Most important question to resolve</strong><p>{assessment.discovery.unresolvedQuestions[0] || assessment.discovery.nextQuestion}</p></div></section>
        <section className="drawer-section"><details className="posting-signal-details"><summary>View posting-based interest signals</summary><div className="interest-signal-list">{assessment.interestSignals.sort((left, right) => right.preference.importance - left.preference.importance).map((item) => <article key={item.dimension} className={`interest-signal tone-${item.tone.toLowerCase()}`}><header><div><h3>{item.label}</h3><span>{item.preference.score > 0 ? "You want more" : item.preference.score < 0 ? "You prefer less" : "Neutral preference"} · importance {item.preference.importance}/3</span></div><strong>{item.tone === "UNKNOWN" ? "?" : item.alignmentScore}</strong></header><p>{item.explanation}</p>{item.jobSignal.evidence[0] && <blockquote>{item.jobSignal.evidence[0]}</blockquote>}</article>)}</div></details></section>
        <section className="drawer-section"><label className="field"><span>Fit interpretation notes</span><DeferredTextarea rows={5} value={job.fitNotes} onCommit={(value) => onUpdate({ fitNotes: value })} placeholder="Example: Recruiter confirmed this role includes direct people leadership and less recurring program administration than the posting suggests." /></label></section>
      </>}

      {tab === "NETWORKING" && <>
        <section className="drawer-section intro-card"><Network /><div><h3>Networking as a career experiment</h3><p>Use conversations to test assumptions and reduce uncertainty. Networking does not inflate the fit score.</p></div></section>
        <section className="drawer-section controls-grid"><label>Stage<select value={job.networkingStage} onChange={(event) => onUpdate({ networkingStage: event.target.value as NetworkingStage })}>{NETWORKING_OPTIONS.map((stage) => <option key={stage} value={stage}>{networkingStageLabel(stage)}</option>)}</select></label><label>Contact<input value={job.networkingContact} onChange={(event) => onUpdate({ networkingContact: event.target.value })} placeholder="Name or relationship" /></label></section>
        <section className="drawer-section"><label className="field"><span>Hypothesis to test</span><DeferredTextarea rows={4} value={job.networkingHypothesis || hypothesis} onCommit={(value) => onUpdate({ networkingHypothesis: value })} /></label></section>
        <section className="drawer-section"><div className="section-head"><div><h3>Questions to ask</h3><p>Target questions that could change your interest or recommendation.</p></div><button className="secondary small" onClick={addSuggestedQuestions}><Lightbulb /> Suggest questions</button></div><div className="question-builder"><input value={questionDraft} onChange={(event) => setQuestionDraft(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addQuestion()} placeholder="Add a question" /><button onClick={addQuestion}><ChevronRight /></button></div><ul className="network-questions">{job.networkingQuestions.map((question, index) => <li key={`${question}-${index}`}><span>{question}</span><button onClick={() => onUpdate({ networkingQuestions: job.networkingQuestions.filter((_, itemIndex) => itemIndex !== index) })}><X /></button></li>)}</ul></section>
        <section className="drawer-section"><label className="field"><span>Conversation notes</span><DeferredTextarea rows={5} value={job.networkingNotes} onCommit={(value) => onUpdate({ networkingNotes: value })} placeholder="Message, follow-up date, referral status..." /></label><label className="field"><span>What changed after the conversation?</span><DeferredTextarea rows={5} value={job.networkingLearnings} onCommit={(value) => onUpdate({ networkingLearnings: value })} placeholder="Which assumption was confirmed? Which was disproved? Did your interest increase or decrease?" /></label></section>
      </>}

      {tab === "DETAILS" && <>
        <section className="drawer-section controls-grid"><label>Role family override<select value={job.groupOverride} onChange={(event) => onUpdate({ groupOverride: event.target.value })}><option value="">Automatic</option>{ROLE_GROUPS.map((group) => <option key={group.id} value={group.id}>{group.label}</option>)}</select></label><label>Date posted<input value={job.datePosted} onChange={(event) => onUpdate({ datePosted: event.target.value })} /></label><label className="wide-field">Job requisition URL<input value={job.jobUrl} onChange={(event) => onUpdate({ jobUrl: event.target.value })} placeholder="https://..." /></label></section>
        {job.jobUrl && <button className="secondary full" onClick={openJob}><ExternalLink /> Open job requisition</button>}
        <section className="drawer-section"><h3>Req metadata</h3><dl className="detail-grid"><div><dt>Category</dt><dd>{job.category || "Not specified"}</dd></div><div><dt>Team</dt><dd>{job.team || "Not specified"}</dd></div><div><dt>Hiring manager</dt><dd>{job.hiringManager || "Not specified"}</dd></div><div><dt>Recruiter</dt><dd>{job.recruiter || "Not specified"}</dd></div><div><dt>Location</dt><dd>{job.locations.join("; ") || "Not specified"}</dd></div><div><dt>Seniority</dt><dd>{job.seniority || "Not specified"}</dd></div></dl></section>
        <section className="drawer-section"><h3>Responsibilities</h3>{job.responsibilities.length ? <ul className="text-list">{job.responsibilities.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="muted">No structured responsibilities detected.</p>}</section>
        <section className="drawer-section"><h3>Qualifications</h3>{job.qualifications.length ? <ul className="text-list">{job.qualifications.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="muted">No structured qualifications detected.</p>}</section>
        <section className="drawer-section"><label className="field"><span>Personal notes</span><DeferredTextarea rows={6} value={job.notes} onCommit={(value) => onUpdate({ notes: value })} /></label></section>
        <section className="drawer-section raw-description"><details><summary><FileText /> Raw job description</summary><pre>{job.descriptionText}</pre></details></section>
        <div className="local-note"><Database /> Stored locally in this browser. Use Sync to move it to another device.</div>
      </>}
    </div>
    <footer><button className="danger" onClick={onDelete}><Trash2 /> Delete</button><div>{job.jobUrl && <button className="secondary" onClick={openJob}><ExternalLink /> Open req</button>}<button className="primary" onClick={onClose}><CheckCircle2 /> Done</button></div></footer>
  </aside></>;
}
