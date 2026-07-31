import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BrainCircuit,
  Check,
  ChevronRight,
  Compass,
  HelpCircle,
  Layers3,
  Lightbulb,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp
} from "lucide-react";
import { FREQUENCY_LABELS, REACTION_LABELS } from "../data/discovery";
import {
  applyGeneralThemeResponse,
  buildPortfolioThemeInsights,
  portfolioThemeAlignment
} from "../lib/themes";
import type {
  JobAssessment,
  JobReq,
  PortfolioThemeInsight,
  ScenarioConfidence,
  ScenarioFrequency,
  ScenarioReaction,
  ThemeDiscoveryResponse,
  UserProfile
} from "../types";

interface GeneralThemeDiscoveryViewProps {
  jobs: JobReq[];
  assessments: Map<string, JobAssessment>;
  profile: UserProfile;
  onChangeProfile: (profile: UserProfile) => void;
  onOpenRole: (jobId: string) => void;
  onOpenRoleDiscovery: (jobId: string) => void;
  notify: (title: string, message: string, kind?: "success" | "error" | "info") => void;
}

const REACTIONS: ScenarioReaction[] = ["SEEK_MORE", "ENERGIZING", "COMFORTABLE", "TOLERATE", "DRAINING", "AVOID", "DEPENDS"];
const FREQUENCIES: ScenarioFrequency[] = ["MAJOR", "RECURRING", "OCCASIONAL", "NECESSARY_ONLY", "NOT_IDEAL"];
const CONFIDENCES: Array<{ id: ScenarioConfidence; label: string }> = [
  { id: "DIRECT_EXPERIENCE", label: "I know from direct experience" },
  { id: "RELATED_EXPERIENCE", label: "I have related experience" },
  { id: "ESTIMATE", label: "This is my best estimate" },
  { id: "UNSURE", label: "I am not sure yet" }
];
const CONDITIONS = [
  "How much of the week it occupies",
  "Decision authority",
  "Quality of the executive sponsor",
  "Team maturity",
  "Ability to build versus maintain",
  "Availability of analytical or operational support",
  "Stakeholder environment",
  "Career growth and promotion path"
];

function initialResponse(theme: PortfolioThemeInsight): ThemeDiscoveryResponse {
  const reaction: ScenarioReaction = theme.preference >= 2
    ? "SEEK_MORE"
    : theme.preference === 1
      ? "ENERGIZING"
      : theme.preference === -1
        ? "DRAINING"
        : theme.preference === -2
          ? "AVOID"
          : "COMFORTABLE";
  return {
    reaction,
    preferredFrequency: theme.preferredFrequency,
    confidence: theme.confidence >= 80 ? "DIRECT_EXPERIENCE" : theme.confidence >= 60 ? "RELATED_EXPERIENCE" : theme.confidence >= 35 ? "ESTIMATE" : "UNSURE",
    conditions: theme.conditions,
    reflection: ""
  };
}

function themeTone(theme: PortfolioThemeInsight): string {
  if (theme.preference >= 1) return "positive";
  if (theme.preference <= -1) return "negative";
  return theme.status === "CONDITIONAL" ? "conditional" : "neutral";
}

function scoreLabel(value: number): string {
  if (value >= 85) return "Strong energizer";
  if (value >= 68) return "Likely energizer";
  if (value >= 45) return "Context dependent";
  if (value >= 25) return "Lower interest";
  return "Likely drain";
}

export function GeneralThemeDiscoveryView({
  jobs,
  assessments,
  profile,
  onChangeProfile,
  onOpenRole,
  onOpenRoleDiscovery,
  notify
}: GeneralThemeDiscoveryViewProps) {
  const themes = useMemo(() => buildPortfolioThemeInsights(jobs, assessments, profile), [jobs, assessments, profile]);
  const alignment = useMemo(() => portfolioThemeAlignment(themes), [themes]);
  const [activeFacet, setActiveFacet] = useState(themes.find((item) => item.needsDiscovery)?.facet || themes[0]?.facet || null);
  const activeTheme = themes.find((item) => item.facet === activeFacet) || themes[0];
  const [draft, setDraft] = useState<ThemeDiscoveryResponse>(() => activeTheme ? initialResponse(activeTheme) : {
    reaction: "COMFORTABLE",
    preferredFrequency: "OCCASIONAL",
    confidence: "ESTIMATE",
    conditions: [],
    reflection: ""
  });

  useEffect(() => {
    if (!activeTheme) return;
    setDraft(initialResponse(activeTheme));
  }, [activeTheme?.facet, activeTheme?.confidence, activeTheme?.preference, activeTheme?.preferredFrequency]);

  if (!jobs.length) {
    return <div className="empty-page"><Compass /><h2>General Theme Discovery needs a portfolio</h2><p>Upload several job descriptions first. ReqRadar will identify the responsibilities and work patterns that recur across them.</p></div>;
  }

  const nextTheme = () => {
    if (!activeTheme) return;
    const currentIndex = themes.findIndex((item) => item.facet === activeTheme.facet);
    const next = themes.slice(currentIndex + 1).find((item) => item.needsDiscovery) || themes.find((item) => item.needsDiscovery && item.facet !== activeTheme.facet) || themes[(currentIndex + 1) % themes.length];
    if (next) setActiveFacet(next.facet);
  };

  const saveTheme = () => {
    if (!activeTheme) return;
    onChangeProfile(applyGeneralThemeResponse(profile, activeTheme, draft));
    notify("General theme saved", `${activeTheme.label} will now shape the baseline Interest Fit across relevant roles.`, "success");
    nextTheme();
  };

  const toggleCondition = (condition: string) => {
    setDraft((current) => ({
      ...current,
      conditions: current.conditions.includes(condition)
        ? current.conditions.filter((item) => item !== condition)
        : [...current.conditions, condition]
    }));
  };

  const topPositive = themes.filter((item) => item.alignmentScore >= 68).sort((a, b) => b.alignmentScore - a.alignmentScore).slice(0, 4);
  const topNegative = themes.filter((item) => item.alignmentScore < 45).sort((a, b) => a.alignmentScore - b.alignmentScore).slice(0, 4);
  const needsDiscovery = themes.filter((item) => item.needsDiscovery).length;

  return <div className="general-theme-discovery">
    <section className="panel theme-discovery-hero">
      <div>
        <span className="eyebrow">Layer 1 · General Theme Discovery</span>
        <h1>Learn your broad work preferences once, then reuse them across every opportunity</h1>
        <p>ReqRadar finds responsibilities that recur across your portfolio and asks what it would feel like to repeat that kind of work—not whether you like an abstract label.</p>
      </div>
      <div className="theme-alignment-score">
        <strong>{alignment.score}</strong>
        <span>Portfolio Theme Alignment</span>
        <small>{alignment.confidence}% confidence · {alignment.assessedThemes}/{alignment.totalThemes} themes assessed</small>
      </div>
    </section>

    <section className="theme-summary-grid">
      <article className="panel"><div className="section-head"><div><h3>Common themes</h3><p>Patterns detected across the current opportunity set.</p></div><Layers3 /></div><strong className="summary-big-number">{themes.length}</strong><span>{needsDiscovery} still need reflection</span></article>
      <article className="panel positive"><div className="section-head"><div><h3>Likely energizers</h3><p>Broad themes currently associated with positive energy.</p></div><TrendingUp /></div>{topPositive.length ? topPositive.map((item) => <span className="theme-summary-line" key={item.facet}>{item.label}<b>{item.roleCount} roles</b></span>) : <p className="muted">Complete the discovery cards to reveal energizers.</p>}</article>
      <article className="panel negative"><div className="section-head"><div><h3>Likely drains</h3><p>Work that may be acceptable only in small doses.</p></div><TrendingDown /></div>{topNegative.length ? topNegative.map((item) => <span className="theme-summary-line" key={item.facet}>{item.label}<b>{item.roleCount} roles</b></span>) : <p className="muted">No consistent drain has been confirmed.</p>}</article>
    </section>

    {activeTheme && <section className="panel theme-reflection-studio">
      <div className="panel-head responsive">
        <div><span className="eyebrow">Portfolio-grounded reflection</span><h2>{activeTheme.label}</h2><p>{activeTheme.description}</p></div>
        <div className="theme-role-count"><strong>{activeTheme.roleCount}</strong><span>roles include this theme</span></div>
      </div>

      <div className="theme-reflection-layout">
        <aside className="theme-evidence-panel">
          <h3>Imagine repeating this work</h3>
          <p>These responsibilities come from different opportunities in your current portfolio.</p>
          <div>{activeTheme.representativeResponsibilities.map((responsibility, index) => <blockquote key={`${responsibility}-${index}`}><span>{index + 1}</span>{responsibility}</blockquote>)}</div>
          <div className="theme-role-links"><span>Examples in your portfolio</span>{activeTheme.jobIds.slice(0, 5).map((jobId) => {
            const job = jobs.find((item) => item.id === jobId);
            return job ? <button key={jobId} onClick={() => onOpenRole(jobId)}>{job.title}<ChevronRight /></button> : null;
          })}</div>
        </aside>

        <main className="theme-question-panel">
          <div className="theme-question-copy"><BrainCircuit /><div><h3>If this were a recurring part of your work, what reaction feels most accurate?</h3><p>Answer for the work itself. Separate genuine energy from being good at it, receiving recognition, or seeing it as a promotion path.</p></div></div>
          <div className="reaction-grid theme-reactions">{REACTIONS.map((reaction) => <button key={reaction} className={draft.reaction === reaction ? "selected" : ""} onClick={() => setDraft((current) => ({ ...current, reaction }))}><span>{draft.reaction === reaction ? <Check /> : null}</span><strong>{REACTION_LABELS[reaction]}</strong></button>)}</div>

          <div className="scenario-two-column">
            <label><span>How often would this fit your ideal role?</span><select value={draft.preferredFrequency} onChange={(event) => setDraft((current) => ({ ...current, preferredFrequency: event.target.value as ScenarioFrequency }))}>{FREQUENCIES.map((frequency) => <option key={frequency} value={frequency}>{FREQUENCY_LABELS[frequency]}</option>)}</select></label>
            <label><span>How certain are you?</span><select value={draft.confidence} onChange={(event) => setDraft((current) => ({ ...current, confidence: event.target.value as ScenarioConfidence }))}>{CONFIDENCES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
          </div>

          {(draft.reaction === "DEPENDS" || draft.conditions.length > 0) && <section className="conditions-section"><h4>What conditions would change your answer?</h4><div>{CONDITIONS.map((condition) => <button key={condition} className={draft.conditions.includes(condition) ? "active" : ""} onClick={() => toggleCondition(condition)}>{draft.conditions.includes(condition) ? <Check /> : null}{condition}</button>)}</div></section>}
          {draft.reaction !== "DEPENDS" && <button className="text-button add-conditions" onClick={() => setDraft((current) => ({ ...current, reaction: "DEPENDS" }))}><HelpCircle /> My answer depends on context</button>}

          <label className="theme-reflection-note"><span>What experience supports your answer?</span><textarea rows={4} value={draft.reflection} onChange={(event) => setDraft((current) => ({ ...current, reflection: event.target.value }))} placeholder="Example: I enjoyed designing a new planning process, but I lost energy once recurring reporting became most of the work." /></label>
          <footer className="stage-footer"><button className="secondary" onClick={nextTheme}>Skip for now</button><button className="primary" onClick={saveTheme}>Save theme and continue <ArrowRight /></button></footer>
        </main>
      </div>
    </section>}

    <section className="panel theme-portfolio-table">
      <div className="panel-head responsive"><div><span className="eyebrow">Your General Theme Profile</span><h2>How the common work in this portfolio aligns with you</h2><p>Role-specific discovery can later raise or lower a job relative to this baseline.</p></div><Target /></div>
      <div className="theme-profile-grid">{themes.map((theme) => <article key={theme.facet} className={`theme-profile-card ${themeTone(theme)} ${theme.needsDiscovery ? "needs-discovery" : ""}`}>
        <header><div><span>{theme.family.replace(/_/g, " ").toLowerCase()}</span><h3>{theme.label}</h3></div><button onClick={() => setActiveFacet(theme.facet)}>{theme.needsDiscovery ? "Discover" : "Refine"}</button></header>
        <div className="theme-profile-score"><strong>{theme.alignmentScore}</strong><span>{scoreLabel(theme.alignmentScore)}<small>{theme.confidence}% confidence</small></span></div>
        <div className="theme-profile-meta"><span>{theme.roleCount} roles</span><span>{FREQUENCY_LABELS[theme.preferredFrequency]}</span></div>
        {theme.conditions.length > 0 && <p><Lightbulb /> Depends on {theme.conditions.slice(0, 2).join(" and ").toLowerCase()}.</p>}
        <footer><button className="text-button" onClick={() => {
          const jobId = theme.jobIds[0];
          if (jobId) onOpenRoleDiscovery(jobId);
        }}>See a role-specific example <ChevronRight /></button></footer>
      </article>)}</div>
    </section>
  </div>;
}
