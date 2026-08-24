import { useMemo } from "react";
import { ArrowRight, BriefcaseBusiness, FileText, Sparkles } from "lucide-react";
import { buildResumeReflectionCandidates } from "../lib/resumeDiscovery";
import type { JobAssessment, JobReq, UserProfile } from "../types";
import { FitDiscoveryView } from "./FitDiscoveryView";
import { ResumeInterestDiscovery } from "./ResumeInterestDiscovery";

interface DiscoveryHubViewProps {
  jobs: JobReq[];
  assessments: Map<string, JobAssessment>;
  profile: UserProfile;
  onChangeProfile: (profile: UserProfile) => void;
  onOpenProfile: () => void;
  onOpenThemes: () => void;
  onOpenJob: (jobId: string) => void;
  onOpenDiscovery: (jobId: string) => void;
  onUpdateJob: (jobId: string, changes: Partial<JobReq>) => void;
  notify: (title: string, message: string, kind?: "success" | "error" | "info") => void;
}

export function DiscoveryHubView({
  jobs,
  assessments,
  profile,
  onChangeProfile,
  onOpenProfile,
  onOpenThemes,
  onOpenJob,
  onOpenDiscovery,
  onUpdateJob,
  notify
}: DiscoveryHubViewProps) {
  const candidates = useMemo(() => buildResumeReflectionCandidates(profile), [profile]);
  const reflected = profile.resumeReflections?.length || 0;
  const themeEvidence = profile.discoveryPreferences.filter((item) => item.evidence.some((evidence) => evidence.sourceType === "GENERAL_THEME" || evidence.sourceType === "RESUME_REFLECTION")).length;
  const roleSessions = jobs.filter((job) => Object.keys(job.fitDiscovery?.responses || {}).length > 0).length;

  return <div className="discovery-hub">
    <section className="panel discovery-path-hero">
      <div><span className="eyebrow">A guided path from experience to opportunity</span><h2>Understand yourself first, then test specific roles</h2><p>ReqRadar starts with real resume accomplishments, turns them into evidence-backed work preferences, and only then asks the questions that are unique to an individual opportunity.</p></div>
      <div className="discovery-path-steps">
        <button className={reflected >= 2 ? "complete" : "active"} onClick={() => document.querySelector(".resume-interest-discovery")?.scrollIntoView({ behavior: "smooth", block: "start" })}><span>{reflected >= 2 ? "✓" : "1"}</span><div><strong>Reflect on experience</strong><small>{reflected}/{Math.min(5, Math.max(2, candidates.length))} accomplishments</small></div></button>
        <button className={themeEvidence >= 3 ? "complete" : reflected >= 2 ? "active" : ""} onClick={onOpenThemes}><span>{themeEvidence >= 3 ? "✓" : "2"}</span><div><strong>Confirm general themes</strong><small>{themeEvidence} themes with evidence</small></div></button>
        <button className={roleSessions ? "complete" : jobs.length ? "active" : ""} onClick={() => document.querySelector(".fit-discovery-view")?.scrollIntoView({ behavior: "smooth", block: "start" })}><span>{roleSessions ? "✓" : "3"}</span><div><strong>Explore specific roles</strong><small>{roleSessions}/{jobs.length} started</small></div></button>
      </div>
    </section>

    <ResumeInterestDiscovery profile={profile} onChange={onChangeProfile} onOpenProfile={onOpenProfile} onOpenThemes={onOpenThemes} notify={notify} />

    <section className="panel discovery-transition">
      <div className="transition-icon"><FileText /></div><div><span className="eyebrow">From general preference to a real opportunity</span><h2>Now focus on what is unique, uncertain, or potentially decisive</h2><p>The role queue below reuses your general theme baseline. It asks only the responsibility-level questions that could materially change the ranking of that job.</p></div><button className="secondary" onClick={onOpenThemes}><Sparkles /> Review themes <ArrowRight /></button>
    </section>

    <div className="role-discovery-section-head"><div><BriefcaseBusiness /><span><strong>Specific opportunity discovery</strong><small>Open the roles with the strongest fit or the most important unanswered questions.</small></span></div></div>
    <FitDiscoveryView jobs={jobs} assessments={assessments} profile={profile} onOpenThemes={onOpenThemes} onOpenJob={onOpenJob} onOpenDiscovery={onOpenDiscovery} onUpdateJob={onUpdateJob} />
  </div>;
}
