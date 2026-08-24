import { useMemo } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  ChevronRight,
  CircleAlert,
  FileSearch,
  Layers3,
  Sparkles,
  Target,
  UserRound
} from "lucide-react";
import { buildResumeReflectionCandidates } from "../lib/resumeDiscovery";
import type { JobAssessment, JobReq, RoleGroupSummary, UserProfile } from "../types";

interface MobileOpportunityLandscapeProps {
  jobs: JobReq[];
  assessments: Map<string, JobAssessment>;
  groups: RoleGroupSummary[];
  profile: UserProfile;
  onOpenGroup: (groupId: string) => void;
  onOpenThemes: () => void;
  onOpenDiscovery: () => void;
  onOpenProfile: () => void;
  onOpenRoles: () => void;
  onOpenGroups: () => void;
  onOpenJob: (jobId: string) => void;
}

function fitLabel(value: number): string {
  if (value >= 82) return "Very strong";
  if (value >= 70) return "Strong";
  if (value >= 58) return "Promising";
  if (value >= 45) return "Mixed";
  return "Low";
}

function guidance(group: RoleGroupSummary): string {
  if (group.averageCapability >= 72 && group.averageInterest >= 72) return "Prioritize this family";
  if (group.averageCapability >= 72 && group.averageInterest < 58) return "Strong experience; inspect energy carefully";
  if (group.averageCapability < 62 && group.averageInterest >= 72) return "High-interest stretch";
  if (group.averageDirection >= 75) return "Promising career direction; validate gaps";
  return "Explore only if the responsibilities stand out";
}

function topCounts(values: string[], limit: number): Array<{ label: string; count: number }> {
  const map = new Map<string, number>();
  values.forEach((value) => map.set(value, (map.get(value) || 0) + 1));
  return [...map.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)).slice(0, limit);
}

export function MobileOpportunityLandscape({ jobs, assessments, groups, profile, onOpenGroup, onOpenThemes, onOpenDiscovery, onOpenProfile, onOpenRoles, onOpenGroups, onOpenJob }: MobileOpportunityLandscapeProps) {
  const activeJobs = useMemo(() => jobs.filter((job) => !["NOT_PURSUING", "CLOSED"].includes(job.status) && assessments.has(job.id)), [jobs, assessments]);
  const sortedGroups = useMemo(() => {
    const activeIds = new Set(activeJobs.map((job) => job.id));
    return groups
      .map((group) => {
        const jobIds = group.jobIds.filter((id) => activeIds.has(id));
        if (!jobIds.length) return null;
        const groupAssessments = jobIds.map((id) => assessments.get(id)).filter((item): item is JobAssessment => Boolean(item));
        const average = (selector: (assessment: JobAssessment) => number) => Math.round(groupAssessments.reduce((sum, item) => sum + selector(item), 0) / Math.max(1, groupAssessments.length));
        const averageCapability = average((item) => item.fitSignature.readinessScore);
        const averageInterest = average((item) => item.fitSignature.attractionScore);
        const averageDirection = average((item) => item.fitSignature.directionScore);
        const topJobId = [...jobIds].sort((left, right) => (assessments.get(right)?.finalScore || 0) - (assessments.get(left)?.finalScore || 0))[0] || "";
        return {
          ...group,
          jobIds,
          topJobId,
          averageCapability,
          averageInterest,
          averageDirection,
          alignment: Math.round(averageCapability * .42 + averageInterest * .36 + averageDirection * .22)
        };
      })
      .filter((group): group is RoleGroupSummary & { alignment: number } => Boolean(group))
      .sort((left, right) => right.alignment - left.alignment || right.jobIds.length - left.jobIds.length);
  }, [groups, activeJobs, assessments]);
  const candidates = useMemo(() => buildResumeReflectionCandidates(profile), [profile]);
  const reflected = profile.resumeReflections?.length || 0;

  const strengths = useMemo(() => topCounts([...assessments.values()].flatMap((assessment) => assessment.capabilitySkills.filter((item) => item.status === "PROVEN").map((item) => item.requirement.name)), 4), [assessments]);
  const gaps = useMemo(() => topCounts([...assessments.values()].flatMap((assessment) => assessment.capabilitySkills.filter((item) => ["PARTIAL", "DEVELOPMENT_GAP", "NOT_DEMONSTRATED", "UNKNOWN"].includes(item.status)).map((item) => item.requirement.name)), 4), [assessments]);
  const lanes = useMemo(() => ({
    technical: activeJobs.filter((job) => assessments.get(job.id)?.focusBucket === "TOO_TECHNICAL").length,
    old: activeJobs.filter((job) => assessments.get(job.id)?.focusBucket === "TOO_OLD").length,
    lowInterest: activeJobs.filter((job) => assessments.get(job.id)?.focusBucket === "NOT_INTERESTED" || assessments.get(job.id)?.focusBucket === "CAPABLE_NOT_COMPELLING").length,
    discovery: activeJobs.filter((job) => assessments.get(job.id)?.focusBucket === "NEEDS_DISCOVERY").length
  }), [activeJobs, assessments]);

  const bestGroup = sortedGroups[0];
  const discoveryRole = activeJobs
    .filter((job) => (assessments.get(job.id)?.discovery.answeredCount || 0) === 0)
    .sort((a, b) => (assessments.get(b.id)?.finalScore || 0) - (assessments.get(a.id)?.finalScore || 0))[0];

  return <div className="mobile-landscape">
    <section className="mobile-landscape-hero">
      <span className="eyebrow">Your opportunity landscape</span>
      <h2>{activeJobs.length} active opportunities · {sortedGroups.length} role groups</h2>
      <p>Start with the patterns across the portfolio. Then move into the groups and individual responsibilities that deserve attention.</p>
      {bestGroup && <button className="best-group-callout" onClick={() => onOpenGroup(bestGroup.id)}><div><span>Best overall group match</span><strong>{bestGroup.label}</strong><small>{bestGroup.jobIds.length} roles · {guidance(bestGroup)}</small></div><ChevronRight /></button>}
    </section>

    <section className="mobile-landscape-section">
      <div className="mobile-section-head"><div><Layers3 /><span><strong>Which career paths are in the portfolio?</strong><small>Grouped by work and responsibilities—not title alone.</small></span></div><button onClick={onOpenRoles}>All roles</button></div>
      <div className="mobile-group-stack">{sortedGroups.slice(0, 4).map((group, index) => {
        const topJob = jobs.find((job) => job.id === group.topJobId);
        return <article className="mobile-group-card" key={group.id}>
          <button className="mobile-group-main" onClick={() => onOpenGroup(group.id)}>
            <span className="group-rank">{index + 1}</span>
            <div><h3>{group.label}</h3><p>{group.description}</p><small>{group.commonThemes.slice(0, 3).map((item) => item.label).join(" · ")}</small></div>
            <ChevronRight />
          </button>
          <div className="mobile-group-fit"><span><b>{fitLabel(group.averageCapability)}</b>Experience</span><span><b>{fitLabel(group.averageInterest)}</b>Interest</span><span><b>{fitLabel(group.averageDirection)}</b>Direction</span></div>
          <div className="mobile-group-guidance"><Target /><span><strong>{guidance(group)}</strong>{group.commonGaps[0] ? ` · Watch ${group.commonGaps[0].label.toLowerCase()}` : " · No repeated blocker detected"}</span></div>
          {topJob && <button className="mobile-group-top-job" onClick={() => onOpenJob(topJob.id)}>Top role: {topJob.title}<ArrowRight /></button>}
        </article>;
      })}</div>
      {sortedGroups.length > 4 && <button className="mobile-show-all" onClick={onOpenGroups}>See all {sortedGroups.length} role groups <ArrowRight /></button>}
    </section>

    <section className="mobile-landscape-section mobile-evidence-summary">
      <div className="mobile-section-head"><div><UserRound /><span><strong>What does your experience support?</strong><small>Traceable to resume and manually added evidence.</small></span></div><button onClick={onOpenProfile}>Profile</button></div>
      <article className="mobile-evidence-card strength"><span>Strongest recurring evidence</span><h3>{strengths[0]?.label || "Upload and review a resume"}</h3><p>{strengths.length ? strengths.map((item) => item.label).join(" · ") : "ReqRadar needs accomplishment-level evidence before it can compare your profile with the portfolio."}</p></article>
      <article className="mobile-evidence-card gap"><span>Common areas to validate</span><h3>{gaps[0]?.label || "No repeated gap yet"}</h3><p>{gaps.length ? gaps.map((item) => item.label).join(" · ") : "No repeated developmental area has been detected."}</p></article>
    </section>

    <section className="mobile-landscape-section">
      <div className="mobile-section-head"><div><Sparkles /><span><strong>What should you do next?</strong><small>Small actions that improve many opportunity assessments.</small></span></div></div>
      <div className="mobile-action-queue">
        {!profile.resumeText ? <button onClick={onOpenProfile}><span><FileSearch /></span><div><strong>Upload your resume</strong><small>Build the capability evidence foundation.</small></div><ChevronRight /></button> : reflected < Math.min(3, Math.max(2, candidates.length)) ? <button onClick={onOpenDiscovery}><span><Sparkles /></span><div><strong>Reflect on a resume accomplishment</strong><small>{Math.max(0, Math.min(3, candidates.length) - reflected)} more reflection{Math.min(3, candidates.length) - reflected === 1 ? "" : "s"} will sharpen Interest Fit across the portfolio.</small></div><ChevronRight /></button> : <button onClick={onOpenThemes}><span><Sparkles /></span><div><strong>Review your emerging work themes</strong><small>Confirm which patterns are energizers, conditional, or drains.</small></div><ChevronRight /></button>}
        {bestGroup && <button onClick={() => onOpenGroup(bestGroup.id)}><span><Layers3 /></span><div><strong>Explore {bestGroup.label}</strong><small>{bestGroup.jobIds.length} roles share a promising mix of experience and interest.</small></div><ChevronRight /></button>}
        {discoveryRole && <button onClick={() => onOpenJob(discoveryRole.id)}><span><BriefcaseBusiness /></span><div><strong>Review one specific opportunity</strong><small>{discoveryRole.title} has not completed responsibility-level discovery.</small></div><ChevronRight /></button>}
      </div>
    </section>

    <section className="mobile-landscape-section mobile-lanes">
      <div className="mobile-section-head"><div><CircleAlert /><span><strong>Keep lower-priority lanes manageable</strong><small>Available when needed, without dominating the main view.</small></span></div><button onClick={onOpenRoles}>Filter</button></div>
      <div><button onClick={onOpenRoles}><strong>{lanes.discovery}</strong><span>Needs discovery</span></button><button onClick={onOpenRoles}><strong>{lanes.old}</strong><span>Too old</span></button><button onClick={onOpenRoles}><strong>{lanes.technical}</strong><span>Too technical</span></button><button onClick={onOpenRoles}><strong>{lanes.lowInterest}</strong><span>Low interest</span></button></div>
    </section>
  </div>;
}
