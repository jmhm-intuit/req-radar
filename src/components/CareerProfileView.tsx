import { useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  AlertCircle,
  BookOpenCheck,
  Check,
  Compass,
  FileText,
  Lightbulb,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
  X
} from "lucide-react";
import { WORK_DIMENSIONS } from "../data/ontology";
import { discoveryPreferenceSummary } from "../lib/discovery";
import { extractSourceFromFile } from "../lib/pdf";
import {
  addManualSkill,
  createPeakExperience,
  extractProfileSkills,
  profileReadiness,
  profileThemes,
  refreshPeakExperience,
  updatePreference
} from "../lib/profile";
import type {
  CareerDirection,
  Confidence,
  PeakExperience,
  PreferenceImportance,
  PreferenceScore,
  ProfileSkill,
  SkillProficiency,
  UserProfile
} from "../types";
import { makeId } from "../lib/text";

interface CareerProfileViewProps {
  profile: UserProfile;
  onChange: (profile: UserProfile) => void;
  notify: (title: string, message: string, kind?: "success" | "error" | "info") => void;
}

const PROFICIENCIES: SkillProficiency[] = ["FOUNDATIONAL", "INTERMEDIATE", "ADVANCED", "EXPERT"];

function confidenceClass(confidence: Confidence): string {
  return `confidence-${confidence.toLowerCase()}`;
}

function scoreLabel(score: PreferenceScore): string {
  return score === 2 ? "Strongly want" : score === 1 ? "Prefer" : score === 0 ? "Neutral" : score === -1 ? "Prefer less" : "Strongly avoid";
}

function updateSkill(profile: UserProfile, id: string, changes: Partial<ProfileSkill>): UserProfile {
  return {
    ...profile,
    skills: profile.skills.map((skill) => skill.id === id ? { ...skill, ...changes } : skill),
    updatedAt: new Date().toISOString()
  };
}

function updatePeak(profile: UserProfile, experience: PeakExperience): UserProfile {
  return {
    ...profile,
    peakExperiences: profile.peakExperiences.map((item) => item.id === experience.id ? refreshPeakExperience(experience) : item),
    updatedAt: new Date().toISOString()
  };
}

function confidenceText(value: number): string {
  return value >= 72 ? "high confidence" : value >= 45 ? "medium confidence" : "needs more evidence";
}

export function CareerProfileView({ profile, onChange, notify }: CareerProfileViewProps) {
  const resumeRef = useRef<HTMLInputElement | null>(null);
  const [resumeBusy, setResumeBusy] = useState(false);
  const [manualSkill, setManualSkill] = useState("");
  const [skillFilter, setSkillFilter] = useState<"ACTIVE" | "REVIEW" | "EXCLUDED">("ACTIVE");
  const [showAllPreferences, setShowAllPreferences] = useState(false);
  const readiness = profileReadiness(profile);
  const themes = profileThemes(profile);
  const discovery = useMemo(() => discoveryPreferenceSummary(profile), [profile]);

  const visibleSkills = useMemo(() => profile.skills.filter((skill) => {
    if (skillFilter === "EXCLUDED") return skill.excluded;
    if (skillFilter === "REVIEW") return !skill.excluded && !skill.confirmed;
    return !skill.excluded;
  }), [profile.skills, skillFilter]);

  const handleResume = async (file: File) => {
    setResumeBusy(true);
    try {
      const source = await extractSourceFromFile(file);
      const skills = extractProfileSkills(source.text, profile.skills);
      onChange({
        ...profile,
        resumeFileName: source.fileName,
        resumeText: source.text,
        skills,
        updatedAt: new Date().toISOString()
      });
      notify("Resume analyzed", `${skills.filter((skill) => !skill.excluded).length} evidence-backed skills were found. Review and confirm the important ones.`, "success");
    } catch (error) {
      notify("Resume could not be analyzed", error instanceof Error ? error.message : "Unknown error", "error");
    } finally {
      setResumeBusy(false);
      if (resumeRef.current) resumeRef.current.value = "";
    }
  };

  const addSkill = () => {
    const next = addManualSkill(profile, manualSkill);
    if (next === profile) return;
    onChange(next);
    setManualSkill("");
  };

  const addDirection = () => {
    const direction: CareerDirection = { id: makeId("direction"), label: "", keywords: [], priority: 2 };
    onChange({ ...profile, careerDirections: [...profile.careerDirections, direction], updatedAt: new Date().toISOString() });
  };

  const updateDirection = (id: string, changes: Partial<CareerDirection>) => {
    onChange({
      ...profile,
      careerDirections: profile.careerDirections.map((direction) => direction.id === id ? { ...direction, ...changes } : direction),
      updatedAt: new Date().toISOString()
    });
  };

  const preferenceColumns = [
    { id: "energizers", title: "Likely energizers", text: "Work you tend to seek or enjoy repeatedly.", items: discovery.energizers, tone: "positive" },
    { id: "conditional", title: "Conditional preferences", text: "Work that fits only under the right conditions.", items: discovery.conditional, tone: "conditional" },
    { id: "drains", title: "Likely drains", text: "Work you can sometimes do but may not want frequently.", items: discovery.drains, tone: "negative" },
    { id: "evidence", title: "Needs more evidence", text: "Preferences that remain tentative or lightly tested.", items: discovery.needsEvidence, tone: "unknown" }
  ] as const;

  return <div className="profile-v3">
    <section className="profile-overview panel">
      <div className="profile-identity"><div className="avatar"><UserRound /></div><div><span className="eyebrow">Career evidence foundation</span><h2>My Career Profile</h2><p>Resume evidence explains what you can do. Realistic role scenarios reveal what kind of work you want to repeat.</p></div></div>
      <div className="readiness-ring" style={{ "--progress": `${readiness.score * 3.6}deg` } as CSSProperties}><div><strong>{readiness.score}%</strong><span>{readiness.label}</span></div></div>
      <div className="readiness-steps">{readiness.steps.map((step) => <span key={step.label} className={step.complete ? "complete" : ""}>{step.complete ? <Check /> : <i />}{step.label}</span>)}</div>
      <div className="profile-actions"><button className="primary" disabled={resumeBusy} onClick={() => resumeRef.current?.click()}><Upload /> {resumeBusy ? "Analyzing..." : profile.resumeText ? "Replace resume" : "Upload resume"}</button><input ref={resumeRef} type="file" accept="application/pdf,text/plain,.pdf,.txt" hidden onChange={(event) => event.target.files?.[0] && handleResume(event.target.files[0])} />{profile.resumeFileName && <span className="file-note"><FileText /> {profile.resumeFileName}</span>}</div>
    </section>

    <section className="panel discovery-foundation">
      <div className="panel-head responsive"><div><span className="eyebrow">Fit Discovery foundation</span><h2>Your emerging work preferences</h2><p>These are hypotheses built from realistic job scenarios and past experience. They become more reliable as you test different roles.</p></div><Compass /></div>
      {profile.interviewAnswers && Object.keys(profile.interviewAnswers).length > 0 && <div className="legacy-discovery-note"><AlertCircle /><div><strong>Your Version 2 answers were retained as tentative evidence.</strong><span>They will not be shown as repeated abstract questions. Job-specific scenarios will validate or refine them.</span></div></div>}
      <div className="preference-discovery-grid">{preferenceColumns.map((column) => <article key={column.id} className={`preference-discovery-column ${column.tone}`}><header><h3>{column.title}</h3><p>{column.text}</p></header>{column.items.length ? <div>{column.items.map((item) => <section key={item.id}><strong>{item.label}</strong><span>{confidenceText(item.confidence)} · importance {item.importance}/3</span>{item.conditions.length > 0 && <small>Depends on: {item.conditions.slice(0, 2).join(", ")}</small>}</section>)}</div> : <div className="preference-empty">Complete job-specific Fit Discovery sessions to reveal this pattern.</div>}</article>)}</div>
      <div className="discovery-method"><span><b>1</b> Step into a real role</span><span><b>2</b> React to realistic scenarios</span><span><b>3</b> Connect to past experience</span><span><b>4</b> Test uncertainty through networking</span></div>
    </section>

    <section className="panel themes-panel">
      <div className="panel-head responsive"><div><span className="eyebrow">Your recurring story</span><h2>Career themes</h2><p>These themes combine resume evidence, peak experiences, discoveries, and possible future directions.</p></div><Sparkles /></div>
      {themes.length ? <div className="theme-cloud large">{themes.map((theme) => <span key={theme.label}>{theme.label}<b>{theme.count}</b></span>)}</div> : <div className="empty-inline">Upload a resume or add a peak experience to reveal your recurring career themes.</div>}
    </section>

    <section className="panel skills-profile-panel">
      <div className="panel-head responsive"><div><span className="eyebrow">Demands–abilities fit</span><h2>Evidence-backed skills</h2><p>Every skill shows where it came from. Confirm, exclude, or adjust proficiency before using it for Capability Fit.</p></div><div className="segmented"><button className={skillFilter === "ACTIVE" ? "active" : ""} onClick={() => setSkillFilter("ACTIVE")}>Active</button><button className={skillFilter === "REVIEW" ? "active" : ""} onClick={() => setSkillFilter("REVIEW")}>Needs review</button><button className={skillFilter === "EXCLUDED" ? "active" : ""} onClick={() => setSkillFilter("EXCLUDED")}>Excluded</button></div></div>
      <div className="add-skill-row"><input value={manualSkill} onChange={(event) => setManualSkill(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addSkill()} placeholder="Add a skill manually, e.g. Organizational transformation" /><button className="secondary" onClick={addSkill}><Plus /> Add skill</button></div>
      {visibleSkills.length ? <div className="profile-skill-grid">{visibleSkills.map((skill) => <article key={skill.id} className={`profile-skill ${skill.confirmed ? "confirmed" : ""} ${skill.excluded ? "excluded" : ""}`}>
        <header><div><span className="skill-category">{skill.category.toLowerCase()}</span><h3>{skill.name}</h3></div><span className={`confidence-chip ${confidenceClass(skill.confidence)}`}>{skill.confidence.toLowerCase()} evidence</span></header>
        <div className="skill-controls"><label>Proficiency<select value={skill.proficiency} onChange={(event) => onChange(updateSkill(profile, skill.id, { proficiency: event.target.value as SkillProficiency }))}>{PROFICIENCIES.map((value) => <option key={value} value={value}>{value.charAt(0) + value.slice(1).toLowerCase()}</option>)}</select></label><button className={`confirm-btn ${skill.confirmed ? "active" : ""}`} onClick={() => onChange(updateSkill(profile, skill.id, { confirmed: !skill.confirmed, excluded: false }))}><Check /> {skill.confirmed ? "Confirmed" : "Confirm"}</button><button className="icon-btn" title={skill.excluded ? "Restore skill" : "Exclude skill"} onClick={() => onChange(updateSkill(profile, skill.id, { excluded: !skill.excluded, confirmed: false }))}>{skill.excluded ? <Plus /> : <X />}</button></div>
        <div className="evidence-list">{skill.evidence.length ? skill.evidence.slice(0, 3).map((evidence) => <blockquote key={evidence.id}>{evidence.text}<cite>{evidence.source}</cite></blockquote>) : <p>No supporting excerpt yet. Keep this only when you can explain where the capability came from.</p>}</div>
      </article>)}</div> : <div className="empty-inline">No skills in this view.</div>}
    </section>

    <section className="panel preferences-panel">
      <div className="panel-head responsive"><div><span className="eyebrow">Manual guardrails</span><h2>Broad work-design preferences</h2><p>Use these controls for durable preferences. Job-specific scenarios should capture context and conditions.</p></div><button className="text-button" onClick={() => setShowAllPreferences(!showAllPreferences)}>{showAllPreferences ? "Show priority dimensions" : "Show all dimensions"}</button></div>
      <div className="preference-grid">{WORK_DIMENSIONS.filter((definition) => showAllPreferences || profile.preferences[definition.id].importance >= 2).map((definition) => {
        const preference = profile.preferences[definition.id];
        return <article key={definition.id} className={`preference-card pref-${preference.score}`}><div><strong>{definition.label}</strong><span>{definition.description}</span></div><div className="preference-inputs"><label><span>{scoreLabel(preference.score)}</span><input type="range" min={-2} max={2} step={1} value={preference.score} onChange={(event) => onChange(updatePreference(profile, definition.id, { score: Number(event.target.value) as PreferenceScore }))} /></label><label className="importance-select">Importance<select value={preference.importance} onChange={(event) => onChange(updatePreference(profile, definition.id, { importance: Number(event.target.value) as PreferenceImportance }))}><option value={1}>Nice to have</option><option value={2}>Important</option><option value={3}>Must shape decision</option></select></label></div><small>{preference.rationale}</small></article>;
      })}</div>
    </section>

    <section className="panel peak-panel">
      <div className="panel-head responsive"><div><span className="eyebrow">Peak experiences</span><h2>What work has energized you?</h2><p>Describe moments when you were highly engaged. Use them as evidence when a scenario asks whether a preference is known or only imagined.</p></div><button className="secondary" onClick={() => onChange({ ...profile, peakExperiences: [...profile.peakExperiences, createPeakExperience()], updatedAt: new Date().toISOString() })}><Plus /> Add experience</button></div>
      {profile.peakExperiences.length ? <div className="peak-list">{profile.peakExperiences.map((experience, index) => <article key={experience.id} className="peak-card"><div className="peak-number">{index + 1}</div><div className="peak-fields"><input value={experience.title} onChange={(event) => onChange(updatePeak(profile, { ...experience, title: event.target.value }))} placeholder="Project or moment" /><textarea rows={5} value={experience.description} onChange={(event) => onChange(updatePeak(profile, { ...experience, description: event.target.value }))} placeholder="What problem were you solving? What did you personally do? Who were you working with? What made it satisfying?" /><div className="detected-themes"><span>Detected themes</span>{experience.detectedThemes.length ? experience.detectedThemes.map((theme) => <button key={theme} className={experience.confirmedThemes.includes(theme) ? "active" : ""} onClick={() => onChange(updatePeak(profile, { ...experience, confirmedThemes: experience.confirmedThemes.includes(theme) ? experience.confirmedThemes.filter((item) => item !== theme) : [...experience.confirmedThemes, theme] }))}>{experience.confirmedThemes.includes(theme) ? <Check /> : <Plus />}{theme}</button>) : <small>Add more detail to detect themes.</small>}</div></div><button className="icon-btn danger-ghost" onClick={() => onChange({ ...profile, peakExperiences: profile.peakExperiences.filter((item) => item.id !== experience.id), updatedAt: new Date().toISOString() })}><Trash2 /></button></article>)}</div> : <div className="empty-inline"><Lightbulb /> Add one experience to distinguish energizing work from merely familiar work.</div>}
    </section>

    <section className="panel directions-panel">
      <div className="panel-head responsive"><div><span className="eyebrow">Possible professional identities</span><h2>Career directions to test</h2><p>These are not permanent commitments. They help identify roles that move you toward a future you want to explore.</p></div><button className="secondary" onClick={addDirection}><Plus /> Add direction</button></div>
      <div className="direction-grid">{profile.careerDirections.map((direction) => <article key={direction.id} className="direction-card"><BookOpenCheck /><label>Direction<input value={direction.label} onChange={(event) => updateDirection(direction.id, { label: event.target.value })} placeholder="e.g. AI Transformation Leader" /></label><label>Keywords<textarea rows={3} value={direction.keywords.join(", ")} onChange={(event) => updateDirection(direction.id, { keywords: event.target.value.split(/[,\n;]/).map((item) => item.trim()).filter(Boolean) })} /></label><label>Priority<select value={direction.priority} onChange={(event) => updateDirection(direction.id, { priority: Number(event.target.value) as PreferenceImportance })}><option value={1}>Explore</option><option value={2}>Important</option><option value={3}>Primary direction</option></select></label><button className="icon-btn danger-ghost" onClick={() => onChange({ ...profile, careerDirections: profile.careerDirections.filter((item) => item.id !== direction.id), updatedAt: new Date().toISOString() })}><Trash2 /></button></article>)}</div>
    </section>

    <section className="panel profile-notes"><div className="section-head"><div><h3>Career coach notes</h3><p>Capture patterns, hypotheses, and trade-offs you want to remember.</p></div><Save /></div><textarea rows={6} value={profile.profileNotes} onChange={(event) => onChange({ ...profile, profileNotes: event.target.value, updatedAt: new Date().toISOString() })} placeholder="Example: I enjoy setting direction and coaching capable people, but I need more evidence about whether recurring performance management would drain me." /></section>
  </div>;
}
