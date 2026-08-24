import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  FileText,
  Lightbulb,
  RotateCcw,
  Sparkles,
  Target,
  Trash2
} from "lucide-react";
import {
  RESUME_ACTIVITY_OPTIONS,
  RESUME_CONDITION_OPTIONS,
  RESUME_DRAIN_OPTIONS,
  buildResumeReflectionCandidates,
  createResumeReflection,
  removeResumeReflection,
  saveResumeReflection
} from "../lib/resumeDiscovery";
import type {
  ResumeAccomplishmentReflection,
  ResumeReflectionActivity,
  ResumeReflectionCondition,
  ResumeReflectionDrain,
  ScenarioConfidence,
  ScenarioFrequency,
  UserProfile
} from "../types";

interface ResumeInterestDiscoveryProps {
  profile: UserProfile;
  onChange: (profile: UserProfile) => void;
  onOpenProfile?: () => void;
  onOpenThemes?: () => void;
  notify?: (title: string, message: string, kind?: "success" | "error" | "info") => void;
  compact?: boolean;
}

const FREQUENCY_OPTIONS: Array<{ id: ScenarioFrequency; label: string; detail: string }> = [
  { id: "MAJOR", label: "Defining part", detail: "I want this to shape the role." },
  { id: "RECURRING", label: "Recurring", detail: "I want this often, but not all the time." },
  { id: "OCCASIONAL", label: "Occasional", detail: "Useful in the right moments." },
  { id: "NECESSARY_ONLY", label: "Only when needed", detail: "I can do it, but would limit it." },
  { id: "NOT_IDEAL", label: "Not in my ideal role", detail: "I would prefer to avoid repeating it." }
];

const CONFIDENCE_OPTIONS: Array<{ id: ScenarioConfidence; label: string }> = [
  { id: "DIRECT_EXPERIENCE", label: "Repeated direct experience" },
  { id: "RELATED_EXPERIENCE", label: "One or related experience" },
  { id: "ESTIMATE", label: "Best estimate" },
  { id: "UNSURE", label: "Still unsure" }
];

function toggleValue<T extends string>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function completedLabel(count: number, total: number): string {
  if (!total) return "No resume evidence yet";
  if (count >= Math.min(5, total)) return "Strong reflection foundation";
  if (count >= 2) return "Interest profile is emerging";
  return "Start with two real accomplishments";
}

export function ResumeInterestDiscovery({ profile, onChange, onOpenProfile, onOpenThemes, notify, compact = false }: ResumeInterestDiscoveryProps) {
  const candidates = useMemo(() => buildResumeReflectionCandidates(profile), [profile]);
  const completed = profile.resumeReflections || [];
  const completedIds = useMemo(() => new Set(completed.map((item) => item.candidateId)), [completed]);
  const [selectedId, setSelectedId] = useState(() => candidates.find((item) => !completedIds.has(item.id))?.id || candidates[0]?.id || "");
  const selected = candidates.find((item) => item.id === selectedId) || candidates[0];
  const existing = selected ? completed.find((item) => item.candidateId === selected.id) : undefined;
  const [draft, setDraft] = useState<ResumeAccomplishmentReflection | null>(() => selected ? existing || createResumeReflection(selected) : null);

  useEffect(() => {
    if (!candidates.length) {
      setSelectedId("");
      setDraft(null);
      return;
    }
    if (!candidates.some((item) => item.id === selectedId)) {
      const next = candidates.find((item) => !completedIds.has(item.id)) || candidates[0];
      setSelectedId(next.id);
    }
  }, [candidates, completedIds, selectedId]);

  useEffect(() => {
    if (!selected) {
      setDraft(null);
      return;
    }
    setDraft(existing || createResumeReflection(selected));
  }, [selected?.id, existing?.completedAt]);

  const selectNext = () => {
    if (!selected) return;
    const currentIndex = candidates.findIndex((item) => item.id === selected.id);
    const remaining = candidates.find((item, index) => index > currentIndex && !completedIds.has(item.id))
      || candidates.find((item) => !completedIds.has(item.id) && item.id !== selected.id)
      || candidates[(currentIndex + 1) % candidates.length];
    if (remaining) setSelectedId(remaining.id);
  };

  const save = () => {
    if (!draft || !selected) return;
    if (!draft.enjoyedActivities.length && !draft.drains.length) {
      notify?.("Add one reaction", "Select at least one enjoyable activity or one part you would prefer not to repeat.", "error");
      return;
    }
    const next = saveResumeReflection(profile, {
      ...draft,
      candidateId: selected.id,
      accomplishment: selected.evidenceText,
      sourceLabel: selected.sourceLabel,
      capabilityNames: selected.capabilityNames,
      completedAt: new Date().toISOString()
    });
    onChange(next);
    notify?.("Experience reflected", "ReqRadar updated your interest evidence while keeping capability evidence separate.", "success");
    window.setTimeout(selectNext, 0);
  };

  const remove = () => {
    if (!selected || !existing) return;
    onChange(removeResumeReflection(profile, selected.id));
    notify?.("Reflection removed", "The resume evidence remains; only the interest interpretation was removed.", "info");
  };

  if (!profile.resumeText.trim()) {
    return <section className={`panel resume-discovery-empty ${compact ? "compact" : ""}`}>
      <div className="resume-discovery-icon"><FileText /></div>
      <div><span className="eyebrow">Resume-led discovery</span><h2>Start from work you have actually done</h2><p>Upload a resume first. ReqRadar will extract accomplishments and ask which parts of the work were energizing—not assume that every successful result was enjoyable.</p></div>
      {onOpenProfile && <button className="primary" onClick={onOpenProfile}>Upload resume <ChevronRight /></button>}
    </section>;
  }

  if (!candidates.length) {
    return <section className={`panel resume-discovery-empty ${compact ? "compact" : ""}`}>
      <div className="resume-discovery-icon"><Lightbulb /></div>
      <div><span className="eyebrow">Resume-led discovery</span><h2>Confirm experience evidence first</h2><p>ReqRadar found the resume, but not enough accomplishment-level evidence to reflect on. Review detected competencies and add specific outcomes or project examples.</p></div>
      {onOpenProfile && <button className="secondary" onClick={onOpenProfile}>Review career evidence</button>}
    </section>;
  }

  if (!selected || !draft) return null;

  const target = Math.min(5, candidates.length);
  const completedCount = candidates.filter((item) => completedIds.has(item.id)).length;
  const progress = Math.min(100, Math.round((completedCount / Math.max(1, target)) * 100));

  return <section className={`panel resume-interest-discovery ${compact ? "compact" : ""}`}>
    <header className="resume-discovery-head">
      <div><span className="eyebrow">Resume-led Interest Discovery</span><h2>Separate what you achieved from what you enjoyed doing</h2><p>Reflect on a small number of high-signal accomplishments. Your answers become evidence for general themes and improve the role-level Interest Fit.</p></div>
      <div className="resume-reflection-progress"><strong>{completedCount}/{target}</strong><span>{completedLabel(completedCount, target)}</span><i><b style={{ width: `${progress}%` }} /></i></div>
    </header>

    <div className="resume-candidate-rail" aria-label="Resume accomplishments">
      {candidates.slice(0, 8).map((candidate, index) => <button key={candidate.id} className={`${candidate.id === selected.id ? "active" : ""} ${completedIds.has(candidate.id) ? "complete" : ""}`} onClick={() => setSelectedId(candidate.id)}><span>{completedIds.has(candidate.id) ? <Check /> : index + 1}</span><strong>Experience {index + 1}</strong><small>{candidate.capabilityNames.slice(0, 2).join(" · ")}</small></button>)}
    </div>

    <div className="resume-reflection-layout">
      <aside className="resume-accomplishment-card">
        <span className="eyebrow">The result on your resume</span>
        <blockquote>{selected.evidenceText}</blockquote>
        <div className="capability-chip-row">{selected.capabilityNames.slice(0, 6).map((name) => <span key={name}>{name}</span>)}</div>
        <div className="reflection-reminder"><Target /><p><strong>Do not rate the result alone.</strong> Think about the actions you repeated, the environment, and whether you would want that experience to define another role.</p></div>
      </aside>

      <div className="resume-reflection-form">
        <section>
          <div className="reflection-question"><span>1</span><div><h3>Which parts did you genuinely enjoy?</h3><p>Select all that created energy. Recognition is separated from the work itself.</p></div></div>
          <div className="reflection-option-grid activities">{RESUME_ACTIVITY_OPTIONS.map((option) => <button type="button" key={option.id} className={draft.enjoyedActivities.includes(option.id) ? "selected" : ""} onClick={() => setDraft({ ...draft, enjoyedActivities: toggleValue<ResumeReflectionActivity>(draft.enjoyedActivities, option.id) })}><span>{draft.enjoyedActivities.includes(option.id) ? <Check /> : null}</span><div><strong>{option.label}</strong><small>{option.detail}</small></div></button>)}</div>
        </section>

        <section>
          <div className="reflection-question"><span>2</span><div><h3>How much of your next role should include this work?</h3><p>This helps distinguish a proud one-time accomplishment from work you want to repeat.</p></div></div>
          <div className="frequency-choice-row">{FREQUENCY_OPTIONS.map((option) => <button type="button" key={option.id} className={draft.desiredFrequency === option.id ? "selected" : ""} onClick={() => setDraft({ ...draft, desiredFrequency: option.id })}><strong>{option.label}</strong><small>{option.detail}</small></button>)}</div>
        </section>

        <section>
          <div className="reflection-question"><span>3</span><div><h3>What made the experience attractive?</h3><p>These conditions reveal why the same responsibility can feel different in another role.</p></div></div>
          <div className="reflection-chip-grid">{RESUME_CONDITION_OPTIONS.map((option) => <button type="button" key={option.id} className={draft.energizingConditions.includes(option.id) ? "selected positive" : ""} onClick={() => setDraft({ ...draft, energizingConditions: toggleValue<ResumeReflectionCondition>(draft.energizingConditions, option.id) })}>{draft.energizingConditions.includes(option.id) && <Check />}{option.label}</button>)}</div>
        </section>

        <section>
          <div className="reflection-question"><span>4</span><div><h3>What would you prefer not to repeat?</h3><p>Being capable of a task does not mean it belongs in your ideal weekly rhythm.</p></div></div>
          <div className="reflection-chip-grid">{RESUME_DRAIN_OPTIONS.map((option) => <button type="button" key={option.id} className={draft.drains.includes(option.id) ? "selected negative" : ""} onClick={() => setDraft({ ...draft, drains: toggleValue<ResumeReflectionDrain>(draft.drains, option.id) })}>{draft.drains.includes(option.id) && <Check />}{option.label}</button>)}</div>
        </section>

        <section className="reflection-final-grid">
          <div><div className="reflection-question"><span>5</span><div><h3>How certain are you?</h3><p>Direct repeated experience should influence fit more than a guess.</p></div></div><div className="confidence-choice-row">{CONFIDENCE_OPTIONS.map((option) => <button type="button" key={option.id} className={draft.confidence === option.id ? "selected" : ""} onClick={() => setDraft({ ...draft, confidence: option.id })}>{option.label}</button>)}</div></div>
          <label><span>Optional reflection</span><textarea rows={5} value={draft.reflection} onChange={(event) => setDraft({ ...draft, reflection: event.target.value })} placeholder="What exactly gave you energy? Did you enjoy doing the work, the outcome, the team, or the recognition?" /></label>
        </section>
      </div>
    </div>

    <footer className="resume-discovery-actions">
      <div>{existing && <button className="danger-ghost" onClick={remove}><Trash2 /> Remove reflection</button>}<button className="secondary" onClick={() => setDraft(existing || createResumeReflection(selected))}><RotateCcw /> Reset</button></div>
      <div>{onOpenThemes && completedCount >= 2 && <button className="secondary" onClick={onOpenThemes}><Sparkles /> See emerging themes</button>}<button className="primary" onClick={save}>Save and continue <ArrowRight /></button></div>
    </footer>
  </section>;
}
