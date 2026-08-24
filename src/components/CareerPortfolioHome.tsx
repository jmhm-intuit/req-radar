import { useMemo } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock3,
  Compass,
  FileSearch,
  Layers3,
  ListChecks,
  Route,
  Sparkles,
  Target,
  TrendingUp,
  UserRound
} from "lucide-react";
import {
  buildOpportunityFamilyInsights,
  buildThemeQuadrants,
  candidateBaselineProgress,
  decisionStateLabel,
  type OpportunityFamilyInsight
} from "../lib/portfolioV4";
import type { AppSettings, JobAssessment, JobReq, UserProfile } from "../types";

interface CareerPortfolioHomeProps {
  jobs: JobReq[];
  assessments: Map<string, JobAssessment>;
  profile: UserProfile;
  settings: AppSettings;
  onUpload: () => void;
  onOpenProfile: () => void;
  onOpenLandscape: (familyId?: string) => void;
  onOpenShortlist: () => void;
  onOpenPipeline: () => void;
  onOpenLibrary: () => void;
  onOpenJob: (jobId: string) => void;
  onMarkReviewed: () => void;
}

function fitLabel(value: number): string {
  if (value >= 80) return "Very strong";
  if (value >= 68) return "Strong";
  if (value >= 56) return "Promising";
  if (value >= 44) return "Mixed";
  return "Low";
}

function recommendationLabel(family: OpportunityFamilyInsight): string {
  const labels = {
    PRIORITIZE: "Prioritize",
    EXPLORE: "Explore",
    MONITOR: "Monitor",
    DEPRIORITIZE: "Deprioritize",
    CALIBRATE: "Calibrate first"
  } as const;
  return labels[family.recommendation];
}

function ageInDays(date: string): number {
  const value = Date.parse(date);
  return Number.isNaN(value) ? Number.MAX_SAFE_INTEGER : Math.floor((Date.now() - value) / 86400000);
}

export function CareerPortfolioHome({
  jobs,
  assessments,
  profile,
  settings,
  onUpload,
  onOpenProfile,
  onOpenLandscape,
  onOpenShortlist,
  onOpenPipeline,
  onOpenLibrary,
  onOpenJob,
  onMarkReviewed
}: CareerPortfolioHomeProps) {
  const baseline = useMemo(() => candidateBaselineProgress(profile), [profile]);
  const families = useMemo(() => buildOpportunityFamilyInsights(jobs, assessments, profile), [jobs, assessments, profile]);
  const themes = useMemo(() => buildThemeQuadrants(profile), [profile]);
  const activeJobs = jobs.filter((job) => job.decisionState !== "NOT_PURSUING" && !["NOT_PURSUING", "CLOSED"].includes(job.status));
  const shortlist = jobs.filter((job) => job.decisionState === "SHORTLIST");
  const pursuing = jobs.filter((job) => job.decisionState === "PURSUE");
  const pipeline = pursuing.filter((job) => job.applicationStage !== "NOT_STARTED" && job.applicationStage !== "CLOSED");
  const since = settings.lastPortfolioReviewAt ? Date.parse(settings.lastPortfolioReviewAt) : Date.now() - 7 * 86400000;
  const newJobs = jobs.filter((job) => Date.parse(job.createdAt) > since).length;
  const anchors = themes.filter((theme) => theme.kind === "ANCHOR").slice(0, 5);
  const traps = themes.filter((theme) => theme.kind === "CAPABILITY_TRAP" || theme.kind === "DEPRIORITIZE").slice(0, 4);
  const development = themes.filter((theme) => theme.kind === "DEVELOPMENT_PATH" || theme.kind === "UNKNOWN").slice(0, 4);
  const bestFamily = families.find((family) => family.recommendation === "PRIORITIZE") || families[0];
  const nextRole = bestFamily?.topJobIds.map((id) => jobs.find((job) => job.id === id)).find(Boolean);
  const dueTasks = pipeline
    .filter((job) => job.applicationNextActionDue)
    .sort((left, right) => left.applicationNextActionDue.localeCompare(right.applicationNextActionDue));

  if (!jobs.length) {
    return <div className="v4-home">
      <section className="v4-empty-hero">
        <div className="v4-empty-icon"><Route /></div>
        <span className="eyebrow">Career Portfolio Navigator</span>
        <h2>Turn a changing list of roles into a small number of career paths</h2>
        <p>Upload job requisitions, ground the analysis in your resume, calibrate what work you want to repeat, and then choose which opportunities deserve active pursuit.</p>
        <div><button className="primary" onClick={onUpload}>Upload job requisitions <ArrowRight /></button><button className="secondary" onClick={onOpenProfile}>Build candidate baseline</button></div>
      </section>
      <section className="v4-how-grid">
        <article><span>1</span><UserRound /><h3>Ground in experience</h3><p>Use resume accomplishments as evidence of capability and as prompts for interest reflection.</p></article>
        <article><span>2</span><Layers3 /><h3>Understand the landscape</h3><p>Organize roles into meaningful work families before comparing individual postings.</p></article>
        <article><span>3</span><Target /><h3>Prioritize opportunities</h3><p>Build a focused shortlist, then activate networking and application tracking.</p></article>
      </section>
    </div>;
  }

  return <div className="v4-home">
    <section className={`v4-briefing-hero ${baseline.nextStep !== "READY" ? "needs-baseline" : "ready"}`}>
      <div className="v4-briefing-copy">
        <span className="eyebrow">Opportunity portfolio briefing</span>
        <h2>{activeJobs.length} active opportunities across {families.length || "emerging"} work families</h2>
        <p>{baseline.nextStep === "READY"
          ? "Your candidate baseline is ready. Start with the career paths, then drill into the strongest individual opportunities."
          : baseline.message}</p>
        <div className="v4-hero-actions">
          {baseline.nextStep === "READY" ? <button className="primary" onClick={() => onOpenLandscape(bestFamily?.id)}>Explore the landscape <ArrowRight /></button> : <button className="primary" onClick={onOpenProfile}>Continue baseline <ArrowRight /></button>}
          <button className="secondary" onClick={onUpload}>Upload more roles</button>
        </div>
      </div>
      <div className="v4-briefing-metrics">
        <article><strong>{families.length}</strong><span>work families</span></article>
        <article><strong>{shortlist.length}</strong><span>shortlisted</span></article>
        <article><strong>{pipeline.length}</strong><span>active applications</span></article>
        <article><strong>{newJobs}</strong><span>new since review</span></article>
      </div>
      {newJobs > 0 && <button className="v4-review-chip" onClick={onMarkReviewed}><CheckCircle2 /> Mark portfolio reviewed</button>}
    </section>

    {baseline.nextStep !== "READY" && <section className="v4-baseline-gate">
      <div className="v4-baseline-progress"><span style={{ width: `${baseline.score}%` }} /></div>
      <div><UserRound /><span><strong>Build a reliable candidate baseline</strong><small>{baseline.completeSteps} of {baseline.totalSteps} foundation steps complete</small></span></div>
      <ol>
        <li className={baseline.resumeReady ? "complete" : ""}>Resume uploaded</li>
        <li className={baseline.evidenceReady ? "complete" : ""}>Experience evidence reviewed</li>
        <li className={baseline.reflectionReady ? "complete" : ""}>Accomplishments reflected on</li>
        <li className={baseline.themeReady ? "complete" : ""}>Work themes calibrated</li>
      </ol>
      <button className="primary" onClick={onOpenProfile}>Continue setup <ChevronRight /></button>
    </section>}

    <section className="v4-section">
      <header className="v4-section-head"><div><span className="eyebrow">Career paths in your portfolio</span><h2>Start with the work families—not a 30-row ranking</h2><p>Each opportunity appears in one primary family based on responsibilities, work design, leadership mode, and technical depth.</p></div><button className="secondary" onClick={() => onOpenLandscape()}>See all families <ArrowRight /></button></header>
      <div className="v4-family-preview-grid">{families.slice(0, 3).map((family, index) => <article className={`v4-family-preview ${family.recommendation.toLowerCase()}`} key={family.id}>
        <div className="v4-family-rank"><span>{index + 1}</span><b>{recommendationLabel(family)}</b></div>
        <button className="v4-family-title" onClick={() => onOpenLandscape(family.id)}><h3>{family.label}</h3><ChevronRight /></button>
        <p>{family.description}</p>
        <div className="v4-fit-triad"><span><b>{family.preliminary ? "Preliminary" : fitLabel(family.experienceFit)}</b>Experience</span><span><b>{family.preliminary ? "Needs calibration" : fitLabel(family.interestFit)}</b>Interest</span><span><b>{fitLabel(family.directionFit)}</b>Direction</span></div>
        <div className="v4-family-work"><strong>Common work</strong><p>{family.commonWork.slice(0, 3).map((item) => item.label).join(" · ") || "More roles are needed to reveal a stable pattern."}</p></div>
        <div className="v4-family-guidance"><Target /><span>{family.guidance}</span></div>
        <button className="text-action" onClick={() => onOpenLandscape(family.id)}>Explore {family.roleCount} role{family.roleCount === 1 ? "" : "s"} <ArrowRight /></button>
      </article>)}</div>
    </section>

    <section className="v4-section v4-work-profile-section">
      <header className="v4-section-head"><div><span className="eyebrow">Your emerging work profile</span><h2>What you can do and what you want to repeat</h2><p>Resume evidence supports capability. Accomplishment reflection distinguishes genuine energy from success, recognition, or obligation.</p></div><button className="secondary" onClick={onOpenProfile}>Review profile <ArrowRight /></button></header>
      <div className="v4-theme-columns">
        <article className="anchor"><Sparkles /><h3>Career anchors</h3><p>Strong capability or evidence paired with positive interest.</p><div>{anchors.length ? anchors.map((theme) => <span key={theme.id}>{theme.label}<small>{theme.confidence}% confidence</small></span>) : <button onClick={onOpenProfile}>Complete resume reflections</button>}</div></article>
        <article className="trap"><Clock3 /><h3>Capability traps</h3><p>Work you may perform well but prefer not to repeat frequently.</p><div>{traps.length ? traps.map((theme) => <span key={theme.id}>{theme.label}<small>{theme.conditions[0] || "Lower preference"}</small></span>) : <span>Not enough reflection evidence yet</span>}</div></article>
        <article className="develop"><TrendingUp /><h3>Development paths</h3><p>Attractive work where evidence or confidence is still emerging.</p><div>{development.length ? development.map((theme) => <span key={theme.id}>{theme.label}<small>{theme.confidence}% confidence</small></span>) : <span>No major development path identified</span>}</div></article>
      </div>
    </section>

    <section className="v4-section v4-next-actions-section">
      <header className="v4-section-head"><div><span className="eyebrow">What should happen next?</span><h2>A short action queue—not another dashboard to interpret</h2></div></header>
      <div className="v4-action-queue">
        {baseline.nextStep !== "READY" && <button onClick={onOpenProfile}><span><UserRound /></span><div><strong>{baseline.message}</strong><small>This improves the assessment across every opportunity family.</small></div><ChevronRight /></button>}
        {baseline.nextStep === "READY" && bestFamily && <button onClick={() => onOpenLandscape(bestFamily.id)}><span><Layers3 /></span><div><strong>Review {bestFamily.label}</strong><small>{bestFamily.roleCount} roles · {bestFamily.guidance}</small></div><ChevronRight /></button>}
        {nextRole && <button onClick={() => onOpenJob(nextRole.id)}><span><FileSearch /></span><div><strong>Evaluate {nextRole.title}</strong><small>Review the responsibilities, evidence, interest conditions, and open questions.</small></div><ChevronRight /></button>}
        <button onClick={onOpenShortlist}><span><ListChecks /></span><div><strong>{shortlist.length ? `Review ${shortlist.length} shortlisted role${shortlist.length === 1 ? "" : "s"}` : "Create a focused shortlist"}</strong><small>Move from broad landscape to no more than ten roles worth deeper attention.</small></div><ChevronRight /></button>
        {pipeline.length > 0 && <button onClick={onOpenPipeline}><span><BriefcaseBusiness /></span><div><strong>{dueTasks.length ? `${dueTasks.length} dated application action${dueTasks.length === 1 ? "" : "s"}` : `${pipeline.length} active application${pipeline.length === 1 ? "" : "s"}`}</strong><small>{dueTasks[0]?.applicationNextAction || "Open the application pipeline and record the next action."}</small></div><ChevronRight /></button>}
      </div>
    </section>

    <section className="v4-section v4-portfolio-state">
      <header className="v4-section-head"><div><span className="eyebrow">Decision progression</span><h2>Separate discovery from pursuit</h2><p>Uploading a job does not start an application. Roles move through landscape, shortlist, pursue, and application stages deliberately.</p></div></header>
      <div className="v4-state-grid">{(["INBOX", "EXPLORE", "SHORTLIST", "PURSUE", "MONITOR", "NOT_PURSUING"] as const).map((state) => {
        const count = jobs.filter((job) => job.decisionState === state).length;
        return <button key={state} onClick={state === "PURSUE" ? onOpenPipeline : onOpenShortlist}><CircleDot /><strong>{count}</strong><span>{decisionStateLabel(state)}</span></button>;
      })}</div>
      <button className="text-action" onClick={onOpenLibrary}>Open the complete role library and advanced analysis <ArrowRight /></button>
    </section>
  </div>;
}
