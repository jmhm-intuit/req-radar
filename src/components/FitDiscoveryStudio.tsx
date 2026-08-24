import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Compass,
  ExternalLink,
  HelpCircle,
  History,
  Lightbulb,
  MessageCircleQuestion,
  Network,
  RotateCcw,
  Sparkles,
  Target,
  Users,
  X
} from "lucide-react";
import {
  FREQUENCY_LABELS,
  REACTION_LABELS,
  facetDefinition
} from "../data/discovery";
import {
  buildRoleRealityPreview,
  generateRoleScenarios,
  normalizeDiscoverySession,
  synthesizeDiscovery
} from "../lib/discovery";
import type {
  FitDiscoverySession,
  InterestChange,
  JobAssessment,
  JobReq,
  NetworkingLearningOutcome,
  RoleRealityItem,
  RoleScenario,
  ScenarioConfidence,
  ScenarioFrequency,
  ScenarioReaction,
  ScenarioResponse,
  UserProfile
} from "../types";

interface FitDiscoveryStudioProps {
  job: JobReq;
  assessment: JobAssessment;
  profile: UserProfile;
  onUpdateJob: (changes: Partial<JobReq>) => void;
  onClose: () => void;
  notify: (title: string, message: string, kind?: "success" | "error" | "info") => void;
}

type Stage = "REALITY" | "SCENARIOS" | "SYNTHESIS" | "NETWORKING";

const REACTIONS: ScenarioReaction[] = ["SEEK_MORE", "ENERGIZING", "COMFORTABLE", "TOLERATE", "DRAINING", "AVOID", "DEPENDS"];
const FREQUENCIES: ScenarioFrequency[] = ["MAJOR", "RECURRING", "OCCASIONAL", "NECESSARY_ONLY", "NOT_IDEAL"];
const CONFIDENCES: Array<{ id: ScenarioConfidence; label: string; detail: string }> = [
  { id: "DIRECT_EXPERIENCE", label: "I know from direct experience", detail: "You have done closely comparable work." },
  { id: "RELATED_EXPERIENCE", label: "I have related experience", detail: "You have seen enough to form a useful view." },
  { id: "ESTIMATE", label: "This is my best estimate", detail: "The preference is plausible but not yet tested." },
  { id: "UNSURE", label: "I am not sure yet", detail: "Treat this as a question to explore." }
];

function inferenceLabel(value: RoleScenario["inferenceLevel"]): string {
  return value === "STATED" ? "Stated in the posting" : value === "STRONGLY_IMPLIED" ? "Strongly implied" : value === "POSSIBLE" ? "Possible interpretation" : "Unknown";
}

function inferenceClass(value: RoleScenario["inferenceLevel"]): string {
  return `inference-${value.toLowerCase().replace(/_/g, "-")}`;
}

function defaultResponse(scenario: RoleScenario): ScenarioResponse {
  return {
    scenarioId: scenario.id,
    facet: scenario.facet,
    reaction: "COMFORTABLE",
    preferredFrequency: "OCCASIONAL",
    confidence: "ESTIMATE",
    conditions: [],
    linkedExperienceId: "",
    reflection: "",
    markedRepetitive: false,
    answeredAt: ""
  };
}

function sessionWith(
  session: FitDiscoverySession,
  changes: Partial<FitDiscoverySession>
): FitDiscoverySession {
  return { ...session, ...changes, lastViewedAt: new Date().toISOString() };
}

function RealityColumn({ title, items, empty }: { title: string; items: RoleRealityItem[]; empty: string }) {
  return <article className="reality-column"><h3>{title}</h3>{items.length ? <div>{items.map((item) => <section key={item.id}><header><strong>{item.value}</strong><span className={inferenceClass(item.inferenceLevel)}>{inferenceLabel(item.inferenceLevel)}</span></header><p>{item.detail}</p>{item.evidence[0] && <blockquote>{item.evidence[0]}</blockquote>}</section>)}</div> : <p className="muted">{empty}</p>}</article>;
}

function DiscoveryMetric({ label, value, confidence, detail }: { label: string; value: number; confidence: number; detail: string }) {
  const tone = value >= 72 ? "good" : value >= 48 ? "mid" : "bad";
  return <article className={`discovery-metric ${tone}`}><div><strong>{value}</strong><span>{label}</span></div><p>{detail}</p><small>{confidence ? `${confidence}% evidence confidence` : "Not assessed yet"}</small></article>;
}

export function FitDiscoveryStudio({ job, assessment, profile, onUpdateJob, onClose, notify }: FitDiscoveryStudioProps) {
  const session = useMemo(() => normalizeDiscoverySession(job.fitDiscovery), [job.fitDiscovery]);
  const scenarios = useMemo(() => generateRoleScenarios(job, assessment.fingerprint), [job, assessment.fingerprint]);
  const preview = useMemo(() => buildRoleRealityPreview(job, assessment.fingerprint), [job, assessment.fingerprint]);
  const synthesis = useMemo(() => synthesizeDiscovery(job, profile, assessment.fingerprint), [job, profile, assessment.fingerprint]);
  const firstUnanswered = scenarios.findIndex((scenario) => !session.responses[scenario.id] && !session.skippedScenarioIds.includes(scenario.id));
  const [stage, setStage] = useState<Stage>(session.status === "NOT_STARTED" ? "REALITY" : firstUnanswered >= 0 ? "SCENARIOS" : "SYNTHESIS");
  const [scenarioIndex, setScenarioIndex] = useState(firstUnanswered >= 0 ? firstUnanswered : 0);
  const activeScenario = scenarios[scenarioIndex] || scenarios[0];
  const [draft, setDraft] = useState<ScenarioResponse>(() => activeScenario ? session.responses[activeScenario.id] || defaultResponse(activeScenario) : defaultResponse({ id: "empty", facet: "STRATEGIC_FRAMING", dimension: "STRATEGY", title: "", situation: "", responsibility: "", tension: "", purpose: "", evidence: [], inferenceLevel: "UNKNOWN", frequencyAssumption: "", conditionOptions: [], reflectionPrompt: "" }));
  const [repetitionPrompt, setRepetitionPrompt] = useState(false);

  useEffect(() => {
    if (!activeScenario) return;
    setDraft(session.responses[activeScenario.id] || defaultResponse(activeScenario));
    setRepetitionPrompt(false);
  }, [activeScenario?.id, job.id]);

  useEffect(() => {
    if (stage === "REALITY" && session.status === "NOT_STARTED") return;
    if (session.lastViewedAt) return;
    onUpdateJob({ fitDiscovery: sessionWith(session, { lastViewedAt: new Date().toISOString() }) });
  }, []);

  const beginDiscovery = () => {
    const now = new Date().toISOString();
    onUpdateJob({
      fitDiscovery: sessionWith(session, {
        status: "IN_PROGRESS",
        scenarioOrder: scenarios.map((scenario) => scenario.id),
        startedAt: session.startedAt || now
      })
    });
    setStage("SCENARIOS");
    setScenarioIndex(firstUnanswered >= 0 ? firstUnanswered : 0);
  };

  const selectCondition = (condition: string) => {
    setDraft((current) => ({
      ...current,
      conditions: current.conditions.includes(condition)
        ? current.conditions.filter((item) => item !== condition)
        : [...current.conditions, condition]
    }));
  };

  const saveResponse = () => {
    if (!activeScenario) return;
    const response: ScenarioResponse = { ...draft, scenarioId: activeScenario.id, facet: activeScenario.facet, markedRepetitive: false, answeredAt: new Date().toISOString() };
    const responses = { ...session.responses, [activeScenario.id]: response };
    const answered = Object.keys(responses).length;
    const completed = answered + session.skippedScenarioIds.length >= scenarios.length;
    const nextSession = sessionWith(session, {
      status: completed ? "COMPLETED" : "IN_PROGRESS",
      scenarioOrder: scenarios.map((scenario) => scenario.id),
      responses,
      completedAt: completed ? new Date().toISOString() : session.completedAt,
      hypothesis: synthesis.hypothesis,
      unresolvedQuestions: synthesis.unresolvedQuestions
    });
    onUpdateJob({ fitDiscovery: nextSession });
    notify("Role reflection saved", `${facetDefinition(activeScenario.facet).label} will adjust this opportunity only. General preferences are updated in General Theme Discovery.`, "success");

    const nextIndex = scenarios.findIndex((scenario, index) => index > scenarioIndex && !responses[scenario.id] && !session.skippedScenarioIds.includes(scenario.id));
    if (nextIndex >= 0) setScenarioIndex(nextIndex);
    else setStage("SYNTHESIS");
  };

  const skipScenario = (repetitive = false) => {
    if (!activeScenario) return;
    const skipped = [...new Set([...session.skippedScenarioIds, activeScenario.id])];
    const repeated = repetitive ? [...new Set([...session.repeatedScenarioIds, activeScenario.id])] : session.repeatedScenarioIds;
    onUpdateJob({ fitDiscovery: sessionWith(session, { status: "IN_PROGRESS", scenarioOrder: scenarios.map((scenario) => scenario.id), skippedScenarioIds: skipped, repeatedScenarioIds: repeated }) });
    const nextIndex = scenarios.findIndex((scenario, index) => index > scenarioIndex && !session.responses[scenario.id] && !skipped.includes(scenario.id));
    if (nextIndex >= 0) setScenarioIndex(nextIndex);
    else setStage("SYNTHESIS");
  };

  const resetResponse = () => {
    if (!activeScenario) return;
    const responses = { ...session.responses };
    delete responses[activeScenario.id];
    onUpdateJob({ fitDiscovery: sessionWith(session, { responses, status: "IN_PROGRESS", completedAt: "" }) });
    setDraft(defaultResponse(activeScenario));
  };

  const addDiscoveryQuestions = () => {
    const questions = synthesis.unresolvedQuestions.slice(0, 6);
    onUpdateJob({
      networkingQuestions: [...new Set([...job.networkingQuestions, ...questions])],
      networkingHypothesis: job.networkingHypothesis || synthesis.hypothesis,
      fitDiscovery: sessionWith(session, { hypothesis: job.networkingHypothesis || synthesis.hypothesis, unresolvedQuestions: questions })
    });
    notify("Networking plan updated", `${questions.length} discovery question${questions.length === 1 ? "" : "s"} added.`, "success");
  };

  const updateLearning = (changes: Partial<FitDiscoverySession>) => {
    onUpdateJob({ fitDiscovery: sessionWith(session, changes) });
  };

  const stageSteps: Array<{ id: Stage; label: string; icon: typeof Compass }> = [
    { id: "REALITY", label: "Role reality", icon: BriefcaseBusiness },
    { id: "SCENARIOS", label: "Step into the role", icon: MessageCircleQuestion },
    { id: "SYNTHESIS", label: "Review fit", icon: Sparkles },
    { id: "NETWORKING", label: "Learn more", icon: Network }
  ];

  return <div className="discovery-layer"><button className="discovery-backdrop" onClick={onClose} aria-label="Close Fit Discovery" /><section className="fit-discovery-studio">
    <header className="discovery-header"><div><span className="eyebrow">Fit Discovery Studio · {job.jobId || "No Job ID"}</span><h2>{job.title}</h2><p>Understand what this role may actually feel like, then use your own experience to judge the opportunity.</p></div><button className="icon-btn" onClick={onClose}><X /></button></header>
    <nav className="discovery-steps">{stageSteps.map((step, index) => { const Icon = step.icon; return <button key={step.id} className={stage === step.id ? "active" : ""} onClick={() => setStage(step.id)}><span>{session.status === "COMPLETED" && step.id === "SCENARIOS" ? <Check /> : index + 1}</span><Icon /><b>{step.label}</b></button>; })}</nav>

    <section className="role-baseline-strip">
      <div><span>General theme baseline</span><strong>{assessment.baseInterestScore}</strong><small>{assessment.generalThemeConfidence}% confidence</small></div>
      <div className={assessment.roleSpecificAdjustment > 0 ? "positive" : assessment.roleSpecificAdjustment < 0 ? "negative" : "neutral"}><span>Role-specific adjustment</span><strong>{assessment.roleSpecificAdjustment > 0 ? "+" : ""}{assessment.roleSpecificAdjustment}</strong><small>{assessment.discovery.answeredCount}/{assessment.discovery.targetCount} scenarios</small></div>
      <div><span>Current Interest Fit</span><strong>{assessment.interestScore}</strong><small>baseline + role evidence</small></div>
    </section>

    <div className="discovery-body">
      {stage === "REALITY" && <div className="reality-preview">
        <section className="reality-hero"><div><span className="eyebrow">A realistic preview before you rate the role</span><h3>What this job may feel like week to week</h3><p>Statements are labeled so facts, strong implications, and interpretations are not confused.</p></div><div className="reality-summary"><span><b>{preview.responsibilities.length}</b> recurring responsibilities</span><span><b>{preview.unknowns.length}</b> important unknowns</span><span><b>{scenarios.length}</b> targeted scenarios</span></div></section>

        <div className="reality-grid"><RealityColumn title="Core responsibilities" items={preview.responsibilities} empty="No structured responsibilities were detected." /><RealityColumn title="People and leadership" items={preview.stakeholders} empty="Stakeholders are unclear." /><RealityColumn title="How impact happens" items={preview.impactModes} empty="Impact mode is unclear." /><RealityColumn title="Likely work rhythm" items={preview.workRhythm} empty="The weekly rhythm is not stated." /></div>

        <section className="plausible-week"><div className="section-head"><div><h3>A plausible week in the role</h3><p>This is a visualization, not a factual schedule. Use it to imagine repeating the work.</p></div><CalendarDays /></div><div>{preview.week.map((item) => <article key={item.day}><strong>{item.day}</strong><p>{item.activity}</p><small className={inferenceClass(item.inferenceLevel)}>{inferenceLabel(item.inferenceLevel)}</small><blockquote>{item.evidence}</blockquote></article>)}</div></section>

        <section className="unknowns-panel"><div><HelpCircle /><div><h3>What the posting cannot tell you</h3><p>These uncertainties should remain visible instead of being silently scored as neutral.</p></div></div><ul>{preview.unknowns.map((unknown) => <li key={unknown}>{unknown}</li>)}</ul></section>

        <footer className="stage-footer"><button className="secondary" onClick={onClose}>Close for now</button><button className="primary" onClick={beginDiscovery}><Compass /> Begin scenario discovery <ChevronRight /></button></footer>
      </div>}

      {stage === "SCENARIOS" && activeScenario && <div className="scenario-stage">
        <div className="scenario-progress"><div><span style={{ width: `${Math.round((Object.keys(session.responses).length / Math.max(1, scenarios.length)) * 100)}%` }} /></div><small>{Object.keys(session.responses).length} of {scenarios.length} scenarios reflected on</small></div>
        <div className="scenario-layout"><aside className="scenario-index"><span className="eyebrow">Adaptive scenario set</span>{scenarios.map((scenario, index) => <button key={scenario.id} className={`${scenarioIndex === index ? "active" : ""} ${session.responses[scenario.id] ? "complete" : ""} ${session.skippedScenarioIds.includes(scenario.id) ? "skipped" : ""}`} onClick={() => setScenarioIndex(index)}><span>{session.responses[scenario.id] ? <Check /> : index + 1}</span><div><strong>{scenario.title}</strong><small>{facetDefinition(scenario.facet).label}</small></div></button>)}</aside>

          <main className="scenario-card"><header><div><span className={`inference-badge ${inferenceClass(activeScenario.inferenceLevel)}`}>{inferenceLabel(activeScenario.inferenceLevel)}</span><span className="facet-badge">{facetDefinition(activeScenario.facet).label}</span><h3>{activeScenario.title}</h3></div><button className="text-button" onClick={() => setRepetitionPrompt(true)}>This feels repetitive</button></header>
            <section className="scenario-narrative"><div><span>Situation</span><p>{activeScenario.situation}</p></div><div><span>Your responsibility</span><p>{activeScenario.responsibility}</p></div><div><span>The tension</span><p>{activeScenario.tension}</p></div></section>
            <div className="scenario-purpose"><Lightbulb /><div><strong>What this question is trying to clarify</strong><p>{activeScenario.purpose}</p></div></div>
            <section className="scenario-evidence"><strong>Why this scenario appears for this role</strong>{activeScenario.evidence.map((evidence) => <blockquote key={evidence}>{evidence}</blockquote>)}<small>{activeScenario.frequencyAssumption}</small></section>

            {repetitionPrompt && <section className="repetition-box"><History /><div><strong>We are checking a distinct facet: {facetDefinition(activeScenario.facet).label}.</strong><p>Your earlier profile may cover a related idea, but this scenario tests how it feels in this job context. Skip it when the distinction does not matter to you.</p><div><button className="secondary small" onClick={() => setRepetitionPrompt(false)}>Continue</button><button className="secondary small" onClick={() => skipScenario(true)}>Mark repetitive and skip</button></div></div></section>}

            <section className="scenario-question"><h4>How would you react if this were a recurring part of the role?</h4><div className="reaction-grid">{REACTIONS.map((reaction) => <button key={reaction} className={draft.reaction === reaction ? "selected" : ""} onClick={() => setDraft((current) => ({ ...current, reaction }))}><span>{draft.reaction === reaction ? <Check /> : null}</span><strong>{REACTION_LABELS[reaction]}</strong></button>)}</div></section>

            <section className="scenario-two-column"><label><span>How often would this fit your ideal role?</span><select value={draft.preferredFrequency} onChange={(event) => setDraft((current) => ({ ...current, preferredFrequency: event.target.value as ScenarioFrequency }))}>{FREQUENCIES.map((frequency) => <option key={frequency} value={frequency}>{FREQUENCY_LABELS[frequency]}</option>)}</select></label><label><span>How certain are you?</span><select value={draft.confidence} onChange={(event) => setDraft((current) => ({ ...current, confidence: event.target.value as ScenarioConfidence }))}>{CONFIDENCES.map((confidence) => <option key={confidence.id} value={confidence.id}>{confidence.label}</option>)}</select></label></section>

            {draft.reaction === "DEPENDS" && <section className="conditions-section"><h4>What conditions would change your answer?</h4><div>{activeScenario.conditionOptions.map((condition) => <button key={condition} className={draft.conditions.includes(condition) ? "active" : ""} onClick={() => selectCondition(condition)}>{draft.conditions.includes(condition) ? <Check /> : null}{condition}</button>)}</div></section>}

            <section className="experience-reflection"><h4>Connect the reaction to your own experience</h4><p>{activeScenario.reflectionPrompt}</p><label><span>Relevant experience</span><select value={draft.linkedExperienceId} onChange={(event) => setDraft((current) => ({ ...current, linkedExperienceId: event.target.value }))}><option value="">No specific experience selected</option>{profile.peakExperiences.map((experience) => <option key={experience.id} value={experience.id}>{experience.title || "Untitled peak experience"}</option>)}</select></label><textarea rows={4} value={draft.reflection} onChange={(event) => setDraft((current) => ({ ...current, reflection: event.target.value }))} placeholder="What did you enjoy or dislike? Would you want to repeat it weekly? Did you enjoy doing the work, or mainly being successful at it?" /></section>

            <footer className="stage-footer"><div><button className="secondary" disabled={scenarioIndex === 0} onClick={() => setScenarioIndex((current) => Math.max(0, current - 1))}><ArrowLeft /> Previous</button>{session.responses[activeScenario.id] && <button className="text-button" onClick={resetResponse}><RotateCcw /> Reset answer</button>}</div><div><button className="secondary" onClick={() => skipScenario(false)}>Skip for now</button><button className="primary" onClick={saveResponse}>Save reflection {scenarioIndex < scenarios.length - 1 ? <ArrowRight /> : <CheckCircle2 />}</button></div></footer>
          </main>
        </div>
      </div>}

      {stage === "SYNTHESIS" && <div className="synthesis-stage">
        <section className="synthesis-hero"><div><span className="eyebrow">Evidence-backed fit synthesis</span><h3>{synthesis.answeredCount ? `${synthesis.answeredCount} scenarios reveal a more nuanced picture` : "Complete scenarios to personalize the fit"}</h3><p>Your general themes establish the baseline. These role-specific responsibilities adjust only this opportunity.</p></div><div className="synthesis-score"><strong>{assessment.interestScore}</strong><span>Interest Fit</span><small>{synthesis.confidence}% discovery confidence</small></div></section>
        <div className="five-fit-grid"><DiscoveryMetric label="Work content" value={assessment.workContentScore} confidence={synthesis.dimensions.find((item) => item.id === "WORK_CONTENT")?.confidence || 0} detail="Do the actual problems and responsibilities attract you?" /><DiscoveryMetric label="Work design" value={assessment.workDesignScore} confidence={synthesis.dimensions.find((item) => item.id === "WORK_DESIGN")?.confidence || 0} detail="Do autonomy, ambiguity, variety, and cadence fit?" /><DiscoveryMetric label="Leadership & social" value={assessment.leadershipSocialScore} confidence={synthesis.dimensions.find((item) => item.id === "LEADERSHIP_SOCIAL")?.confidence || 0} detail="Does the leadership mode and stakeholder environment fit?" /><DiscoveryMetric label="Career direction" value={assessment.directionScore} confidence={profile.careerDirections.length ? 70 : 20} detail="Does the role move toward an identity you want to test?" /><DiscoveryMetric label="Capability" value={assessment.capabilityScore} confidence={assessment.confidence === "HIGH" ? 85 : assessment.confidence === "MEDIUM" ? 60 : 35} detail="Does your evidence demonstrate the required capabilities?" /></div>

        <div className="synthesis-insights"><article className="positive"><h3>Likely energizers</h3>{synthesis.energizers.length ? <ul>{synthesis.energizers.map((item) => <li key={item}><Check /> {item}</li>)}</ul> : <p>More scenario evidence is needed.</p>}</article><article className="negative"><h3>Potential drains</h3>{synthesis.drains.length ? <ul>{synthesis.drains.map((item) => <li key={item}><AlertCircle /> {item}</li>)}</ul> : <p>No strong drain has been identified yet.</p>}</article><article className="conditional"><h3>Conditions that matter</h3>{synthesis.conditions.length ? <ul>{synthesis.conditions.map((item) => <li key={item}><HelpCircle /> {item}</li>)}</ul> : <p>No conditional preference has been recorded yet.</p>}</article></div>

        {synthesis.contradictions.length > 0 && <section className="contradiction-panel"><AlertCircle /><div><h3>Different context, different reaction</h3><p>The app did not average these differences away. Review what changed.</p><ul>{synthesis.contradictions.map((item) => <li key={item}>{item}</li>)}</ul></div></section>}

        <section className="recommendation-explanation"><Target /><div><span className="eyebrow">Current recommendation</span><h3>{assessment.recommendation.replace(/_/g, " ").toLowerCase()}</h3><p>{assessment.nextAction}</p><ul>{assessment.reasons.slice(0, 6).map((reason) => <li key={reason}>{reason}</li>)}</ul></div></section>

        <section className="unknowns-panel"><div><HelpCircle /><div><h3>Most important questions still unresolved</h3><p>These are the questions most likely to change your rating.</p></div></div><ul>{synthesis.unresolvedQuestions.slice(0, 6).map((item) => <li key={item}>{item}</li>)}</ul></section>
        <footer className="stage-footer"><button className="secondary" onClick={() => setStage("SCENARIOS")}><ArrowLeft /> Review scenarios</button><button className="primary" onClick={() => setStage("NETWORKING")}><Network /> Turn uncertainty into a learning plan <ArrowRight /></button></footer>
      </div>}

      {stage === "NETWORKING" && <div className="networking-discovery-stage">
        <section className="networking-hypothesis"><div><Network /><div><span className="eyebrow">Career experiment</span><h3>Test the assumption that could change your decision</h3></div></div><textarea rows={4} value={session.hypothesis || synthesis.hypothesis} onFocus={() => !session.hypothesis && updateLearning({ hypothesis: synthesis.hypothesis })} onChange={(event) => updateLearning({ hypothesis: event.target.value })} /></section>
        <div className="networking-discovery-grid"><section><div className="section-head"><div><h3>Questions to ask</h3><p>Use realistic questions about the work—not generic culture questions.</p></div><button className="secondary small" onClick={addDiscoveryQuestions}><ClipboardCheck /> Add to job plan</button></div><ul>{synthesis.unresolvedQuestions.slice(0, 7).map((question) => <li key={question}><MessageCircleQuestion /> {question}</li>)}</ul></section><section><h3>Record what changed</h3><label><span>What did the conversation reveal?</span><select value={session.networkingOutcome} onChange={(event) => updateLearning({ networkingOutcome: event.target.value as NetworkingLearningOutcome })}><option value="NOT_RECORDED">Not recorded</option><option value="CONFIRMED">Hypothesis confirmed</option><option value="DISPROVED">Hypothesis disproved</option><option value="NUANCED">More nuanced than expected</option><option value="STILL_UNKNOWN">Still unknown</option></select></label><label><span>Did your interest change?</span><select value={session.interestChange} onChange={(event) => updateLearning({ interestChange: event.target.value as InterestChange })}><option value="NOT_RECORDED">Not recorded</option><option value="INCREASED">Interest increased</option><option value="SAME">Interest stayed the same</option><option value="DECREASED">Interest decreased</option></select></label><label><span>Learning notes</span><textarea rows={6} value={session.learningNotes} onChange={(event) => updateLearning({ learningNotes: event.target.value })} placeholder="Which assumption was confirmed or disproved? What new question remains?" /></label></section></div>
        {job.jobUrl && <button className="secondary full" onClick={() => window.open(job.jobUrl, "_blank", "noopener,noreferrer")}><ExternalLink /> Open job requisition</button>}
        <footer className="stage-footer"><button className="secondary" onClick={() => setStage("SYNTHESIS")}><ArrowLeft /> Back to fit</button><button className="primary" onClick={onClose}><CheckCircle2 /> Save and return to portfolio</button></footer>
      </div>}
    </div>
  </section></div>;
}
