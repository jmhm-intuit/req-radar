import { useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Sparkles,
  Target,
  UserRound
} from "lucide-react";
import { buildThemeQuadrants, candidateBaselineProgress } from "../lib/portfolioV4";
import type { JobAssessment, JobReq, UserProfile } from "../types";
import { CareerProfileView } from "./CareerProfileView";
import { GeneralThemeDiscoveryView } from "./GeneralThemeDiscoveryView";
import { ResumeInterestDiscovery } from "./ResumeInterestDiscovery";

type BaselineTab = "FOUNDATION" | "REFLECT" | "THEMES";

interface CandidateBaselineViewProps {
  jobs: JobReq[];
  assessments: Map<string, JobAssessment>;
  profile: UserProfile;
  onChangeProfile: (profile: UserProfile) => void;
  onOpenJob: (jobId: string) => void;
  onOpenRoleDiscovery: (jobId: string) => void;
  onOpenLandscape: () => void;
  notify: (title: string, message: string, kind?: "success" | "error" | "info") => void;
}

export function CandidateBaselineView({ jobs, assessments, profile, onChangeProfile, onOpenJob, onOpenRoleDiscovery, onOpenLandscape, notify }: CandidateBaselineViewProps) {
  const progress = useMemo(() => candidateBaselineProgress(profile), [profile]);
  const themes = useMemo(() => buildThemeQuadrants(profile), [profile]);
  const [tab, setTab] = useState<BaselineTab>(() => {
    if (!progress.resumeReady || !progress.evidenceReady) return "FOUNDATION";
    if (!progress.reflectionReady) return "REFLECT";
    return "THEMES";
  });
  const anchors = themes.filter((theme) => theme.kind === "ANCHOR");
  const traps = themes.filter((theme) => theme.kind === "CAPABILITY_TRAP" || theme.kind === "DEPRIORITIZE");
  const development = themes.filter((theme) => theme.kind === "DEVELOPMENT_PATH" || theme.kind === "UNKNOWN");

  return <div className="v4-baseline">
    <section className="v4-baseline-hero">
      <div><span className="eyebrow">Candidate baseline</span><h2>First establish what you have done and what parts you want to repeat</h2><p>The resume is evidence of capability. Reflection turns selected accomplishments into hypotheses about energy, preferred work, and conditions.</p></div>
      <div className="v4-baseline-score"><strong>{progress.score}%</strong><span>baseline ready</span><small>{progress.message}</small></div>
    </section>

    <section className="v4-baseline-steps">
      <button className={`${tab === "FOUNDATION" ? "active" : ""} ${progress.evidenceReady ? "complete" : ""}`} onClick={() => setTab("FOUNDATION")}><span>{progress.evidenceReady ? <CheckCircle2 /> : <FileText />}</span><div><strong>1. Experience evidence</strong><small>Resume, accomplishments, and competency evidence</small></div></button>
      <button className={`${tab === "REFLECT" ? "active" : ""} ${progress.reflectionReady ? "complete" : ""}`} onClick={() => setTab("REFLECT")}><span>{progress.reflectionReady ? <CheckCircle2 /> : <Sparkles />}</span><div><strong>2. Experience reflection</strong><small>Separate achievement from enjoyment</small></div></button>
      <button className={`${tab === "THEMES" ? "active" : ""} ${progress.themeReady ? "complete" : ""}`} onClick={() => setTab("THEMES")}><span>{progress.themeReady ? <CheckCircle2 /> : <Target />}</span><div><strong>3. Work themes</strong><small>Confirm energizers, conditions, and drains</small></div></button>
    </section>

    {themes.length > 0 && <section className="v4-theme-summary-strip">
      <article><span>Career anchors</span><strong>{anchors.length}</strong><small>{anchors.slice(0, 3).map((theme) => theme.label).join(" · ") || "Still emerging"}</small></article>
      <article><span>Capability traps</span><strong>{traps.length}</strong><small>{traps.slice(0, 3).map((theme) => theme.label).join(" · ") || "No pattern yet"}</small></article>
      <article><span>Development paths</span><strong>{development.length}</strong><small>{development.slice(0, 3).map((theme) => theme.label).join(" · ") || "No pattern yet"}</small></article>
    </section>}

    {tab === "FOUNDATION" && <div className="v4-baseline-content"><CareerProfileView profile={profile} onChange={onChangeProfile} notify={notify} onOpenDiscovery={() => setTab("REFLECT")} /></div>}
    {tab === "REFLECT" && <div className="v4-baseline-content"><ResumeInterestDiscovery profile={profile} onChange={onChangeProfile} onOpenProfile={() => setTab("FOUNDATION")} onOpenThemes={() => setTab("THEMES")} notify={notify} /></div>}
    {tab === "THEMES" && <div className="v4-baseline-content"><GeneralThemeDiscoveryView jobs={jobs} assessments={assessments} profile={profile} onChangeProfile={onChangeProfile} onOpenRole={onOpenJob} onOpenRoleDiscovery={onOpenRoleDiscovery} notify={notify} /></div>}

    {progress.nextStep === "READY" && <section className="v4-baseline-ready"><CheckCircle2 /><div><strong>Your baseline is ready to guide the opportunity landscape</strong><p>You can continue refining it over time. New resume evidence and role discoveries will update confidence without restarting the process.</p></div><button className="primary" onClick={onOpenLandscape}>Explore career paths <ArrowRight /></button></section>}
  </div>;
}
