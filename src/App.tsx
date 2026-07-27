import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, DragEvent, ReactNode } from "react";
import {
  AlertTriangle,
  ArrowDownUp,
  Briefcase,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Database,
  Download,
  ExternalLink,
  FileStack,
  FileText,
  GitCompare,
  LayoutDashboard,
  Link2,
  Menu,
  Network,
  Pin,
  PinOff,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Target,
  Trash2,
  Upload,
  UserRound,
  X
} from "lucide-react";
import { assessJob, networkingStageLabel, recommendationLabel } from "./lib/assessment";
import { buildComparisons, checkDuplicates, createJob, extractSkillsFromText, formatStatus, parseJobText } from "./lib/jobs";
import { extractSourceFromFile, extractSourceFromText } from "./lib/pdf";
import {
  buildExportPayload,
  buildSyncPreview,
  downloadJson,
  loadJobs,
  loadProfile,
  loadSettings,
  mergeBackup,
  parseBackupFile,
  saveJobs,
  saveProfile,
  saveSettings
} from "./lib/storage";
import type {
  AppSettings,
  BatchResult,
  InterestLevel,
  JobAssessment,
  JobReq,
  JobStatus,
  ManualPriority,
  NetworkingStage,
  ParsedBackup,
  RecommendationOverride,
  SkillMatchStatus,
  SyncPreview,
  UserProfile
} from "./types";

type View = "overview" | "jobs" | "profile" | "comparisons";
type SortMode = "RANK" | "NEWEST" | "SKILLS" | "INTEREST" | "AGE" | "TITLE";
type Toast = { id: number; title: string; message: string; kind: "success" | "error" | "info" };

const STATUS_OPTIONS: JobStatus[] = ["NEW", "PURSUING", "MAYBE", "APPLIED", "NOT_PURSUING"];
const NETWORKING_OPTIONS: NetworkingStage[] = [
  "NOT_STARTED", "CONTACT_IDENTIFIED", "MESSAGE_PLANNED", "CONTACTED", "RESPONSE_RECEIVED",
  "CONVERSATION_SCHEDULED", "CONVERSATION_COMPLETED", "REFERRAL_REQUESTED", "REFERRAL_RECEIVED", "NOT_NEEDED"
];
const INTEREST_OPTIONS: InterestLevel[] = ["AUTO", "HIGH", "MEDIUM", "LOW", "NONE"];
const PRIORITY_OPTIONS: ManualPriority[] = ["HIGH", "NORMAL", "LOW", "ARCHIVE"];
const RECOMMENDATION_OPTIONS: RecommendationOverride[] = ["AUTO", "PURSUE", "CONSIDER", "LOW_PRIORITY", "DO_NOT_PURSUE"];
const SKILL_OPTIONS: SkillMatchStatus[] = ["MATCH", "PARTIAL", "NO_MATCH", "CRITICAL_GAP", "NOT_RELEVANT"];
const PAGE_SIZE = 20;

function AppVersion() {
  return <span className="app-version" title={`Build ${__BUILD_DATE__}`}>ReqRadar v{__APP_VERSION__}</span>;
}

function formatDate(value: string): string {
  if (!value) return "Not specified";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function statusClass(status: JobStatus): string {
  return `status-${status.toLowerCase().replace("_", "-")}`;
}

function recommendationClass(value: JobAssessment["recommendation"]): string {
  return `rec-${value.toLowerCase().replace(/_/g, "-")}`;
}

function skillClass(value: SkillMatchStatus): string {
  return `skill-${value.toLowerCase().replace(/_/g, "-")}`;
}

function normalizeHttpUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const parsed = new URL(candidate);
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Use an http:// or https:// URL.");
  return parsed.toString();
}

function listFromText(value: string): string[] {
  return [...new Set(value.split(/[,\n;]/).map((item) => item.trim()).filter(Boolean))];
}

function Empty({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return <div className="empty"><div className="empty-icon">{icon}</div><h3>{title}</h3><p>{text}</p>{action}</div>;
}

function Score({ value, label }: { value: number; label: string }) {
  const tone = value >= 75 ? "good" : value >= 50 ? "mid" : "bad";
  return <span className={`score ${tone}`}><strong>{value}%</strong><small>{label}</small></span>;
}

function Stat({ icon, label, value, detail }: { icon: ReactNode; label: string; value: number; detail: string }) {
  return <article className="stat"><div>{icon}<span>{label}</span></div><strong>{value}</strong><p>{detail}</p></article>;
}

function JobTable({
  jobs,
  assessments,
  onOpen,
  onUpdate,
  compact = false
}: {
  jobs: JobReq[];
  assessments: Map<string, JobAssessment>;
  onOpen: (id: string) => void;
  onUpdate: (id: string, changes: Partial<JobReq>) => void;
  compact?: boolean;
}) {
  if (!jobs.length) return <Empty icon={<Briefcase />} title="No requisitions found" text="Adjust your filters or upload more job requisitions." />;
  return (
    <div className="table-wrap">
      <table className="jobs-table">
        <thead><tr>
          <th>Rank</th><th>Job requisition</th><th>Status</th><th>Recommendation</th><th>Skills</th>
          {!compact && <th>Interest</th>}<th>Age</th><th>Networking</th>{!compact && <th>Manual</th>}<th />
        </tr></thead>
        <tbody>{jobs.map((job) => {
          const assessment = assessments.get(job.id)!;
          return <tr key={job.id} className={job.pinned ? "pinned-row" : ""}>
            <td>
              <div className="rank-cell">
                <button className="icon-btn" onClick={() => onUpdate(job.id, { pinned: !job.pinned })} title={job.pinned ? "Unpin" : "Pin to top"}>{job.pinned ? <Pin size={16} /> : <PinOff size={16} />}</button>
                <strong>{assessment.finalScore}</strong>
              </div>
            </td>
            <td>
              <button className="job-link" onClick={() => onOpen(job.id)}><strong>{job.title}</strong><span>{job.jobId || "No Job ID"} · {job.team || job.category || "Team not specified"}</span></button>
            </td>
            <td><select className={`compact-select ${statusClass(job.status)}`} value={job.status} onChange={(event) => onUpdate(job.id, { status: event.target.value as JobStatus })}>{STATUS_OPTIONS.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}</select></td>
            <td><span className={`recommendation ${recommendationClass(assessment.recommendation)}`}>{recommendationLabel(assessment.recommendation)}</span><small className="table-sub">{assessment.nextAction}</small></td>
            <td><Score value={assessment.skillsScore} label={assessment.criticalGaps.length ? `${assessment.criticalGaps.length} critical` : "fit"} /></td>
            {!compact && <td><Score value={assessment.interestScore} label={assessment.interestLevel.toLowerCase()} /></td>}
            <td><span className={assessment.ageDays !== null && assessment.ageDays > 90 && !job.ageOverride ? "age-old" : "age-label"}>{assessment.ageLabel}</span></td>
            <td><select className="compact-select network-select" value={job.networkingStage} onChange={(event) => onUpdate(job.id, { networkingStage: event.target.value as NetworkingStage })}>{NETWORKING_OPTIONS.map((stage) => <option key={stage} value={stage}>{networkingStageLabel(stage)}</option>)}</select></td>
            {!compact && <td><div className="manual-cell"><input type="number" min={-20} max={20} value={job.manualAdjustment} onChange={(event) => onUpdate(job.id, { manualAdjustment: Math.max(-20, Math.min(20, Number(event.target.value) || 0)) })} title="Manual rank adjustment" /><span>{job.manualPriority.toLowerCase()}</span></div></td>}
            <td><div className="row-actions">{job.jobUrl && <button className="icon-btn" onClick={() => window.open(job.jobUrl, "_blank", "noopener,noreferrer")} title="Open job req"><ExternalLink size={16} /></button>}<button className="icon-btn" onClick={() => onOpen(job.id)}><ChevronRight size={18} /></button></div></td>
          </tr>;
        })}</tbody>
      </table>
    </div>
  );
}

export default function App() {
  const [jobs, setJobs] = useState<JobReq[]>(() => loadJobs());
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [profile, setProfile] = useState<UserProfile>(() => loadProfile());
  const [profileSkillsText, setProfileSkillsText] = useState(() => loadProfile().skills.join(", "));
  const [profileInterestsText, setProfileInterestsText] = useState(() => loadProfile().interests.join(", "));
  const [profileAvoidText, setProfileAvoidText] = useState(() => loadProfile().avoid.join(", "));
  const [view, setView] = useState<View>("overview");
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("RANK");
  const [page, setPage] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [pastedText, setPastedText] = useState("");
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pendingBackup, setPendingBackup] = useState<ParsedBackup | null>(null);
  const [syncPreview, setSyncPreview] = useState<SyncPreview | null>(null);
  const [syncMode, setSyncMode] = useState<"merge" | "replace">("merge");
  const [syncError, setSyncError] = useState("");
  const [portalDraft, setPortalDraft] = useState(settings.recruitingPortalUrl);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const syncRef = useRef<HTMLInputElement>(null);
  const resumeRef = useRef<HTMLInputElement>(null);

  useEffect(() => saveJobs(jobs), [jobs]);
  useEffect(() => saveSettings(settings), [settings]);
  useEffect(() => saveProfile(profile), [profile]);

  const assessmentMap = useMemo(() => new Map(jobs.map((job) => [job.id, assessJob(job, profile)])), [jobs, profile]);
  const comparisons = useMemo(() => buildComparisons(jobs), [jobs]);
  const selectedJob = jobs.find((job) => job.id === selectedJobId) || null;
  const selectedAssessment = selectedJob ? assessmentMap.get(selectedJob.id) || null : null;

  const filteredJobs = useMemo(() => {
    const term = search.trim().toLowerCase();
    const hidden = new Set(settings.hiddenStatuses);
    const items = jobs.filter((job) => !hidden.has(job.status)).filter((job) => {
      if (!term) return true;
      return [job.title, job.jobId, job.team, job.category, job.hiringManager, job.recruiter, job.skills.join(" "), job.locations.join(" ")].join(" ").toLowerCase().includes(term);
    });
    return items.sort((a, b) => {
      const aa = assessmentMap.get(a.id)!;
      const bb = assessmentMap.get(b.id)!;
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (sortMode === "RANK") return bb.finalScore - aa.finalScore;
      if (sortMode === "SKILLS") return bb.skillsScore - aa.skillsScore;
      if (sortMode === "INTEREST") return bb.interestScore - aa.interestScore;
      if (sortMode === "AGE") return (aa.ageDays ?? 9999) - (bb.ageDays ?? 9999);
      if (sortMode === "TITLE") return a.title.localeCompare(b.title);
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [jobs, search, settings.hiddenStatuses, sortMode, assessmentMap]);

  useEffect(() => setPage(1), [search, sortMode, settings.hiddenStatuses]);
  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / PAGE_SIZE));
  const pagedJobs = filteredJobs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = useMemo(() => ({
    total: jobs.length,
    pursue: jobs.filter((job) => assessmentMap.get(job.id)?.recommendation === "PURSUE").length,
    old: jobs.filter((job) => (assessmentMap.get(job.id)?.ageDays || 0) > 90 && !job.ageOverride).length,
    networking: jobs.filter((job) => assessmentMap.get(job.id)?.recommendation === "PURSUE" && job.networkingStage === "NOT_STARTED").length,
    critical: jobs.filter((job) => (assessmentMap.get(job.id)?.criticalGaps.length || 0) > 0).length
  }), [jobs, assessmentMap]);

  function toast(title: string, message: string, kind: Toast["kind"] = "success") {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, title, message, kind }]);
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 4200);
  }

  function updateJob(id: string, changes: Partial<JobReq>) {
    setJobs((current) => current.map((job) => job.id === id ? { ...job, ...changes, updatedAt: new Date().toISOString() } : job));
  }

  function toggleHiddenStatus(status: JobStatus) {
    setSettings((current) => {
      const hidden = new Set(current.hiddenStatuses);
      hidden.has(status) ? hidden.delete(status) : hidden.add(status);
      return { ...current, hiddenStatuses: [...hidden], updatedAt: new Date().toISOString() };
    });
  }

  function openUpload() {
    setSelectedFiles([]);
    setPastedText("");
    setBatchResults([]);
    setUploadOpen(true);
  }

  function chooseFiles(files: FileList | File[]) {
    const next = Array.from(files).filter((file) => /\.(pdf|txt)$/i.test(file.name));
    setSelectedFiles((current) => [...current, ...next].filter((file, index, array) => array.findIndex((item) => item.name === file.name && item.size === file.size) === index));
    setPastedText("");
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    chooseFiles(event.dataTransfer.files);
  }

  async function processBatch() {
    setBusy(true);
    setBatchResults([]);
    const working = [...jobs];
    const results: BatchResult[] = [];
    const files = [...selectedFiles];
    try {
      if (!files.length && pastedText.trim()) {
        const source = await extractSourceFromText(pastedText);
        const parsed = parseJobText(source.text);
        const duplicate = checkDuplicates(parsed, source.hash, working);
        if (duplicate.exactMatch) results.push({ fileName: source.fileName, status: "DUPLICATE", title: parsed.title, detail: `Already uploaded as ${duplicate.exactMatch.title}` });
        else {
          const job = createJob(parsed, "NEW", "", "", "", source.fileName, source.hash);
          working.unshift(job);
          results.push({ fileName: source.fileName, status: "ADDED", title: job.title, detail: "Added with New status" });
        }
      }
      for (const file of files) {
        try {
          const source = await extractSourceFromFile(file);
          const parsed = parseJobText(source.text);
          const duplicate = checkDuplicates(parsed, source.hash, working);
          if (duplicate.exactMatch) results.push({ fileName: file.name, status: "DUPLICATE", title: parsed.title, detail: `Already uploaded as ${duplicate.exactMatch.title}` });
          else {
            const job = createJob(parsed, "NEW", "", "", "", source.fileName, source.hash);
            working.unshift(job);
            results.push({ fileName: file.name, status: "ADDED", title: job.title, detail: duplicate.comparisons[0]?.score ? `${duplicate.comparisons[0].score}% similar to an existing req` : "Added with New status" });
          }
        } catch (error) {
          results.push({ fileName: file.name, status: "ERROR", title: "Could not process", detail: error instanceof Error ? error.message : "Unknown processing error" });
        }
      }
      setJobs(working);
      setBatchResults(results);
      const added = results.filter((item) => item.status === "ADDED").length;
      toast("Batch upload complete", `${added} requisition${added === 1 ? "" : "s"} added.`);
    } finally {
      setBusy(false);
    }
  }

  async function uploadResume(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const source = await extractSourceFromFile(file);
      const detected = extractSkillsFromText(source.text);
      const skills = [...new Set([...profile.skills, ...detected])];
      setProfileSkillsText(skills.join(", "));
      setProfile({ ...profile, resumeFileName: file.name, resumeText: source.text, skills, updatedAt: new Date().toISOString() });
      toast("Resume analyzed", `${detected.length} skills detected. Review and add any missing skills.`);
    } catch (error) {
      toast("Resume could not be read", error instanceof Error ? error.message : "Unknown error", "error");
    } finally {
      event.target.value = "";
    }
  }

  function exportBackup() {
    const exportedAt = new Date().toISOString();
    downloadJson(`req-radar-backup-${exportedAt.slice(0, 10)}.json`, buildExportPayload(jobs, settings, profile, exportedAt));
    setSettings((current) => ({ ...current, lastExportAt: exportedAt, updatedAt: exportedAt }));
    toast("Backup downloaded", `${jobs.length} requisitions and your profile were included.`);
  }

  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const backup = parseBackupFile(await file.text());
      setPendingBackup(backup);
      setSyncPreview(buildSyncPreview(jobs, backup));
      setSyncError("");
      setSyncOpen(true);
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "Could not read backup");
      setSyncOpen(true);
    } finally {
      event.target.value = "";
    }
  }

  function applySync() {
    if (!pendingBackup) return;
    if (syncMode === "replace") {
      setJobs(pendingBackup.jobs); setSettings(pendingBackup.settings); setProfile(pendingBackup.profile);
      setProfileSkillsText(pendingBackup.profile.skills.join(", "));
      setProfileInterestsText(pendingBackup.profile.interests.join(", "));
      setProfileAvoidText(pendingBackup.profile.avoid.join(", "));
    } else {
      const merged = mergeBackup(jobs, settings, profile, pendingBackup);
      setJobs(merged.jobs); setSettings(merged.settings); setProfile(merged.profile);
      setProfileSkillsText(merged.profile.skills.join(", "));
      setProfileInterestsText(merged.profile.interests.join(", "));
      setProfileAvoidText(merged.profile.avoid.join(", "));
    }
    setPendingBackup(null); setSyncPreview(null); setSyncOpen(false);
    toast("Sync complete", "Your requisitions and profile are up to date.");
  }

  function savePortal() {
    try {
      const value = normalizeHttpUrl(portalDraft);
      setSettings((current) => ({ ...current, recruitingPortalUrl: value, updatedAt: new Date().toISOString() }));
      setSettingsOpen(false);
      toast("Link saved", value ? "Recruiting page shortcut updated." : "Recruiting page shortcut removed.");
    } catch (error) {
      toast("Invalid URL", error instanceof Error ? error.message : "Check the URL", "error");
    }
  }

  function deleteSelected() {
    if (!selectedJob || !window.confirm(`Delete ${selectedJob.title}?`)) return;
    setJobs((current) => current.filter((job) => job.id !== selectedJob.id));
    setSelectedJobId(null);
    toast("Requisition deleted", selectedJob.title);
  }

  const pageTitle = view === "overview" ? "Opportunity ranking" : view === "jobs" ? "All job requisitions" : view === "profile" ? "My skills & interests" : "Req comparisons";
  const pageSubtitle = view === "profile" ? "Use your resume and preferences to personalize every assessment." : "Prioritize the strongest opportunities, act on networking, and filter a large portfolio quickly.";

  return <div className="app-shell">
    <button className={`mobile-backdrop ${sidebarOpen ? "show" : ""}`} onClick={() => setSidebarOpen(false)} />
    <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
      <div className="brand"><div className="brand-mark"><Target /></div><div><strong>ReqRadar</strong><span>Job search command center</span></div></div>
      <nav>
        <button className={view === "overview" ? "active" : ""} onClick={() => { setView("overview"); setSidebarOpen(false); }}><LayoutDashboard /> Overview</button>
        <button className={view === "jobs" ? "active" : ""} onClick={() => { setView("jobs"); setSidebarOpen(false); }}><Briefcase /> All requisitions</button>
        <button className={view === "profile" ? "active" : ""} onClick={() => { setView("profile"); setSidebarOpen(false); }}><UserRound /> My profile</button>
        <button className={view === "comparisons" ? "active" : ""} onClick={() => { setView("comparisons"); setSidebarOpen(false); }}><GitCompare /> Comparisons</button>
      </nav>
      <div className="sidebar-actions">
        {settings.recruitingPortalUrl && <button onClick={() => window.open(settings.recruitingPortalUrl, "_blank", "noopener,noreferrer")}><ExternalLink /> Recruiting page</button>}
        <button onClick={() => setSyncOpen(true)}><RefreshCw /> Sync devices</button>
        <button onClick={() => { setPortalDraft(settings.recruitingPortalUrl); setSettingsOpen(true); }}><Settings /> Link settings</button>
      </div>
      <AppVersion />
    </aside>

    <main>
      <header className="topbar">
        <button className="menu-btn" onClick={() => setSidebarOpen(true)}><Menu /></button>
        <div><h1>{pageTitle}</h1><p>{pageSubtitle}</p></div>
        <div className="top-actions"><button className="secondary" onClick={() => setSyncOpen(true)}><RefreshCw /> Sync</button><button className="primary" onClick={openUpload}><FileStack /> Upload job reqs</button></div>
      </header>

      {view === "profile" ? (
        <section className="content profile-layout">
          <article className="panel profile-hero"><div><span className="eyebrow">Personalized assessment</span><h2>Teach ReqRadar what you bring and what you want.</h2><p>Your confirmed skills drive Skills Fit. Interests and lower-interest work drive Interest Fit. Everything stays in this browser and in your manual backups.</p></div><button className="primary" onClick={() => resumeRef.current?.click()}><Upload /> Upload resume PDF</button><input ref={resumeRef} type="file" accept=".pdf,.txt" hidden onChange={uploadResume} /></article>
          <article className="panel"><div className="panel-head"><div><h2>Skills profile</h2><p>{profile.resumeFileName ? `Resume: ${profile.resumeFileName}` : "Upload a resume or enter skills manually."}</p></div><span className="count-badge">{profile.skills.length} skills</span></div><label className="field"><span>Skills (comma or line separated)</span><textarea rows={10} value={profileSkillsText} onChange={(event) => { setProfileSkillsText(event.target.value); setProfile((current) => ({ ...current, skills: listFromText(event.target.value), updatedAt: new Date().toISOString() })); }} placeholder="Strategy, AI adoption, transformation, people leadership..." /></label><div className="skill-cloud">{profile.skills.map((skill) => <span key={skill}>{skill}</span>)}</div></article>
          <article className="panel split-panel"><label className="field"><span>Work that increases your interest</span><textarea rows={7} value={profileInterestsText} onChange={(event) => { setProfileInterestsText(event.target.value); setProfile((current) => ({ ...current, interests: listFromText(event.target.value), updatedAt: new Date().toISOString() })); }} /></label><label className="field"><span>Work you prefer to avoid</span><textarea rows={7} value={profileAvoidText} onChange={(event) => { setProfileAvoidText(event.target.value); setProfile((current) => ({ ...current, avoid: listFromText(event.target.value), updatedAt: new Date().toISOString() })); }} /></label></article>
        </section>
      ) : view === "comparisons" ? (
        <section className="content"><article className="panel"><div className="panel-head"><div><h2>Most similar requisitions</h2><p>Potential duplicates and opportunities that may share a search strategy.</p></div><span className="count-badge">{comparisons.length}</span></div>{comparisons.length ? <div className="comparison-list">{comparisons.slice(0, 40).map((item) => { const a = jobs.find((job) => job.id === item.sourceJobId); const b = jobs.find((job) => job.id === item.targetJobId); if (!a || !b) return null; return <button key={`${item.sourceJobId}-${item.targetJobId}`} onClick={() => setSelectedJobId(a.id)}><span className="comparison-score">{item.score}%</span><div><strong>{a.title}</strong><span>vs. {b.title}</span><small>{item.sharedSkills.length} shared skills · {item.reasons.join(" · ")}</small></div><ChevronRight /></button>; })}</div> : <Empty icon={<GitCompare />} title="No strong comparisons yet" text="Upload more job requisitions to identify related roles." />}</article></section>
      ) : (
        <section className="content">
          {view === "overview" && <div className="stats-grid"><Stat icon={<Briefcase />} label="Total reqs" value={stats.total} detail="Your complete local portfolio" /><Stat icon={<Target />} label="Recommended" value={stats.pursue} detail="Currently rated Pursue" /><Stat icon={<Clock3 />} label="Over 90 days" value={stats.old} detail="Defaulted to do not pursue" /><Stat icon={<Network />} label="Networking gaps" value={stats.networking} detail="High-fit roles not started" /><Stat icon={<AlertTriangle />} label="Critical gaps" value={stats.critical} detail="Mandatory requirements missing" /></div>}
          <article className="panel jobs-panel">
            <div className="panel-head responsive"><div><h2>{view === "overview" ? "Ranked opportunities" : "Job requisition portfolio"}</h2><p>Designed for 30+ requisitions with sorting, filters, pagination, and inline actions.</p></div><span className="count-badge">{filteredJobs.length} visible / {jobs.length}</span></div>
            <div className="toolbar">
              <label className="search"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, team, skills, recruiter..." /></label>
              <label className="sort"><ArrowDownUp /><select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}><option value="RANK">Final rank</option><option value="NEWEST">Newest added</option><option value="SKILLS">Skills Fit</option><option value="INTEREST">Interest Fit</option><option value="AGE">Freshest posting</option><option value="TITLE">Job title</option></select></label>
              <button className="secondary" onClick={openUpload}><Plus /> Add reqs</button>
            </div>
            <div className="status-filters"><span><SlidersHorizontal /> Show / hide statuses</span>{STATUS_OPTIONS.map((status) => { const hidden = settings.hiddenStatuses.includes(status); return <button key={status} className={`${statusClass(status)} ${hidden ? "off" : ""}`} onClick={() => toggleHiddenStatus(status)}>{hidden ? "Show" : "Hide"} {formatStatus(status)}</button>; })}</div>
            <JobTable jobs={pagedJobs} assessments={assessmentMap} onOpen={setSelectedJobId} onUpdate={updateJob} compact={view === "overview"} />
            {totalPages > 1 && <div className="pagination"><button disabled={page === 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft /> Previous</button><span>Page {page} of {totalPages}</span><button disabled={page === totalPages} onClick={() => setPage((value) => value + 1)}>Next <ChevronRight /></button></div>}
          </article>
        </section>
      )}
    </main>

    {uploadOpen && <div className="modal-layer" onMouseDown={(event) => event.currentTarget === event.target && !busy && setUploadOpen(false)}><section className="modal wide">
      <header><div><span className="eyebrow">Faster intake</span><h2>Upload multiple job requisitions</h2><p>Select many PDF or TXT files. Each file is parsed independently and exact duplicates are skipped.</p></div><button className="icon-btn" onClick={() => setUploadOpen(false)}><X /></button></header>
      <div className="modal-body">
        <div className={`drop-zone ${dragActive ? "active" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragActive(true); }} onDragLeave={() => setDragActive(false)} onDrop={handleDrop} onClick={() => fileRef.current?.click()}><Upload /><strong>Drop multiple PDF files here</strong><span>or tap to choose files</span><input ref={fileRef} type="file" accept=".pdf,.txt" multiple hidden onChange={(event) => event.target.files && chooseFiles(event.target.files)} /></div>
        {selectedFiles.length > 0 && <div className="selected-files"><div><strong>{selectedFiles.length} files selected</strong><button onClick={() => setSelectedFiles([])}>Clear</button></div>{selectedFiles.slice(0, 12).map((file) => <span key={`${file.name}-${file.size}`}><FileText /> {file.name}<button onClick={() => setSelectedFiles((current) => current.filter((item) => item !== file))}><X /></button></span>)}{selectedFiles.length > 12 && <small>+ {selectedFiles.length - 12} more files</small>}</div>}
        {!selectedFiles.length && <label className="field"><span>Or paste one job description</span><textarea rows={7} value={pastedText} onChange={(event) => setPastedText(event.target.value)} placeholder="Paste a complete posting here..." /></label>}
        {batchResults.length > 0 && <div className="batch-results"><div className="batch-summary"><strong>{batchResults.filter((item) => item.status === "ADDED").length} added</strong><span>{batchResults.filter((item) => item.status === "DUPLICATE").length} duplicates</span><span>{batchResults.filter((item) => item.status === "ERROR").length} errors</span></div>{batchResults.map((item, index) => <div key={`${item.fileName}-${index}`} className={`batch-row batch-${item.status.toLowerCase()}`}>{item.status === "ADDED" ? <CheckCircle2 /> : <AlertTriangle />}<div><strong>{item.title}</strong><span>{item.fileName} · {item.detail}</span></div></div>)}</div>}
      </div>
      <footer><button className="secondary" onClick={() => setUploadOpen(false)}>{batchResults.length ? "Done" : "Cancel"}</button><button className="primary" disabled={busy || (!selectedFiles.length && pastedText.trim().length < 40)} onClick={processBatch}>{busy ? <span className="spinner" /> : <Sparkles />}{busy ? `Processing ${selectedFiles.length || 1}...` : `Analyze & add ${selectedFiles.length || 1}`}</button></footer>
    </section></div>}

    {syncOpen && <div className="modal-layer" onMouseDown={(event) => event.currentTarget === event.target && setSyncOpen(false)}><section className="modal"><header><div><span className="eyebrow">Manual device sync</span><h2>Move your full workspace</h2><p>Backups include requisitions, profile, ranking overrides, networking, links, and filters.</p></div><button className="icon-btn" onClick={() => setSyncOpen(false)}><X /></button></header><div className="modal-body sync-grid"><button className="sync-card" onClick={exportBackup}><Download /><strong>Download backup</strong><span>{jobs.length} requisitions + profile</span></button><button className="sync-card" onClick={() => syncRef.current?.click()}><Upload /><strong>Upload backup</strong><span>Merge or replace this browser</span></button><input ref={syncRef} type="file" accept="application/json,.json" hidden onChange={importBackup} />{syncError && <div className="alert error"><AlertTriangle /> {syncError}</div>}{syncPreview && <div className="sync-preview"><h3>Import preview</h3><div><span>{syncPreview.newCount}<small>new</small></span><span>{syncPreview.updatedCount}<small>updated</small></span><span>{syncPreview.unchangedCount}<small>unchanged</small></span><span>{syncPreview.conflictCount}<small>conflicts</small></span></div><label><input type="radio" checked={syncMode === "merge"} onChange={() => setSyncMode("merge")} /> Merge with this device</label><label><input type="radio" checked={syncMode === "replace"} onChange={() => setSyncMode("replace")} /> Replace this device</label></div>}</div><footer><button className="secondary" onClick={() => setSyncOpen(false)}>Close</button>{pendingBackup && <button className="primary" onClick={applySync}><Save /> Apply import</button>}</footer></section></div>}

    {settingsOpen && <div className="modal-layer" onMouseDown={(event) => event.currentTarget === event.target && setSettingsOpen(false)}><section className="modal small"><header><div><span className="eyebrow">Shortcut</span><h2>Recruiting page</h2><p>Save an easy-access link to your main recruiting or internal careers page.</p></div><button className="icon-btn" onClick={() => setSettingsOpen(false)}><X /></button></header><div className="modal-body"><label className="field"><span>Recruiting page URL</span><input value={portalDraft} onChange={(event) => setPortalDraft(event.target.value)} placeholder="https://..." /></label></div><footer><button className="secondary" onClick={() => setSettingsOpen(false)}>Cancel</button><button className="primary" onClick={savePortal}><Save /> Save link</button></footer></section></div>}

    {selectedJob && selectedAssessment && <><button className="drawer-backdrop" onClick={() => setSelectedJobId(null)} /><aside className="drawer">
      <header><div><span className="eyebrow">{selectedJob.jobId || "No Job ID"}</span><h2>{selectedJob.title}</h2><div className="drawer-head-badges"><span className={`recommendation ${recommendationClass(selectedAssessment.recommendation)}`}>{recommendationLabel(selectedAssessment.recommendation)}</span><span className="rank-score">Rank {selectedAssessment.finalScore}</span></div></div><button className="icon-btn" onClick={() => setSelectedJobId(null)}><X /></button></header>
      <div className="drawer-body">
        <section className="assessment-hero"><div><Score value={selectedAssessment.skillsScore} label="Skills Fit" /><Score value={selectedAssessment.interestScore} label="Interest Fit" /><Score value={selectedAssessment.freshnessScore} label="Freshness" /></div><p><strong>Next:</strong> {selectedAssessment.nextAction}</p>{selectedAssessment.reasons.slice(0, 4).map((reason) => <span key={reason}>• {reason}</span>)}</section>
        <section className="drawer-section two-col"><label className="field"><span>Status</span><select value={selectedJob.status} onChange={(event) => updateJob(selectedJob.id, { status: event.target.value as JobStatus })}>{STATUS_OPTIONS.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}</select></label><label className="field"><span>Interest Fit override</span><select value={selectedJob.interestOverride} onChange={(event) => updateJob(selectedJob.id, { interestOverride: event.target.value as InterestLevel })}>{INTEREST_OPTIONS.map((value) => <option key={value} value={value}>{value === "AUTO" ? "Automatic" : value.charAt(0) + value.slice(1).toLowerCase()}</option>)}</select></label><label className="field"><span>Recommendation override</span><select value={selectedJob.recommendationOverride} onChange={(event) => updateJob(selectedJob.id, { recommendationOverride: event.target.value as RecommendationOverride })}>{RECOMMENDATION_OPTIONS.map((value) => <option key={value} value={value}>{value === "AUTO" ? "Automatic" : recommendationLabel(value)}</option>)}</select></label><label className="field"><span>Manual priority</span><select value={selectedJob.manualPriority} onChange={(event) => updateJob(selectedJob.id, { manualPriority: event.target.value as ManualPriority })}>{PRIORITY_OPTIONS.map((value) => <option key={value} value={value}>{value.charAt(0) + value.slice(1).toLowerCase()}</option>)}</select></label><label className="field"><span>Rank adjustment (-20 to +20)</span><input type="number" min={-20} max={20} value={selectedJob.manualAdjustment} onChange={(event) => updateJob(selectedJob.id, { manualAdjustment: Math.max(-20, Math.min(20, Number(event.target.value) || 0)) })} /></label><label className="check-field"><input type="checkbox" checked={selectedJob.pinned} onChange={(event) => updateJob(selectedJob.id, { pinned: event.target.checked })} /> Pin to top</label></section>
        <section className="drawer-section"><div className="section-head"><div><h3>Skills assessment</h3><p>Green = matched, amber = partial, red = missing. Critical gaps can force Do not pursue.</p></div><span className="count-badge">{selectedAssessment.skills.length}</span></div>{selectedAssessment.skills.length ? <div className="skills-assessment">{selectedAssessment.skills.map((skill) => <div key={skill.skill} className={`skill-row ${skillClass(skill.status)}`}><div><strong>{skill.skill}</strong><span>{skill.reason}</span></div><select value={selectedJob.skillOverrides[skill.skill] || skill.status} onChange={(event) => updateJob(selectedJob.id, { skillOverrides: { ...selectedJob.skillOverrides, [skill.skill]: event.target.value as SkillMatchStatus } })}>{SKILL_OPTIONS.map((value) => <option key={value} value={value}>{value.replace(/_/g, " ").toLowerCase()}</option>)}</select></div>)}</div> : <p className="muted">No skills were detected in this posting.</p>}</section>
        <section className="drawer-section age-card"><div><h3>Job age</h3><p>{selectedAssessment.ageLabel}. Jobs older than 90 days default to Do not pursue.</p></div><label className="check-field"><input type="checkbox" checked={selectedJob.ageOverride} onChange={(event) => updateJob(selectedJob.id, { ageOverride: event.target.checked })} /> Ignore age rule for this req</label></section>
        <section className="drawer-section"><div className="section-head"><div><h3>Networking</h3><p>Track the relationship-building step separately from application status.</p></div><Network /></div><div className="two-col"><label className="field"><span>Stage</span><select value={selectedJob.networkingStage} onChange={(event) => updateJob(selectedJob.id, { networkingStage: event.target.value as NetworkingStage })}>{NETWORKING_OPTIONS.map((stage) => <option key={stage} value={stage}>{networkingStageLabel(stage)}</option>)}</select></label><label className="field"><span>Contact</span><input value={selectedJob.networkingContact} onChange={(event) => updateJob(selectedJob.id, { networkingContact: event.target.value })} placeholder="Name or relationship" /></label></div><label className="field"><span>Networking notes</span><textarea rows={4} value={selectedJob.networkingNotes} onChange={(event) => updateJob(selectedJob.id, { networkingNotes: event.target.value })} placeholder="Message, follow-up, referral, next action..." /></label></section>
        <section className="drawer-section two-col"><label className="field"><span>Job requisition URL</span><input value={selectedJob.jobUrl} onChange={(event) => updateJob(selectedJob.id, { jobUrl: event.target.value })} placeholder="https://..." /></label><label className="field"><span>Date posted</span><input value={selectedJob.datePosted} onChange={(event) => updateJob(selectedJob.id, { datePosted: event.target.value })} /></label></section>
        {selectedJob.jobUrl && <button className="secondary full" onClick={() => { try { window.open(normalizeHttpUrl(selectedJob.jobUrl), "_blank", "noopener,noreferrer"); } catch { toast("Invalid URL", "Update the job requisition URL.", "error"); } }}><ExternalLink /> Open job requisition</button>}
        <section className="drawer-section"><h3>Req details</h3><dl className="detail-grid"><div><dt>Category</dt><dd>{selectedJob.category || "Not specified"}</dd></div><div><dt>Team</dt><dd>{selectedJob.team || "Not specified"}</dd></div><div><dt>Hiring manager</dt><dd>{selectedJob.hiringManager || "Not specified"}</dd></div><div><dt>Recruiter</dt><dd>{selectedJob.recruiter || "Not specified"}</dd></div><div><dt>Location</dt><dd>{selectedJob.locations.join("; ") || "Not specified"}</dd></div><div><dt>Added</dt><dd>{formatDate(selectedJob.createdAt)}</dd></div></dl></section>
        <section className="drawer-section"><label className="field"><span>Personal notes</span><textarea rows={6} value={selectedJob.notes} onChange={(event) => updateJob(selectedJob.id, { notes: event.target.value })} /></label></section>
        <div className="local-note"><Database /> Stored locally in this browser. Use Sync to move it to another device.</div>
      </div>
      <footer><button className="danger" onClick={deleteSelected}><Trash2 /> Delete</button><button className="primary" onClick={() => setSelectedJobId(null)}><CheckCircle2 /> Done</button></footer>
    </aside></>}

    <div className="toasts">{toasts.map((item) => <div className={`toast ${item.kind}`} key={item.id}>{item.kind === "error" ? <AlertTriangle /> : <CheckCircle2 />}<div><strong>{item.title}</strong><span>{item.message}</span></div><button onClick={() => setToasts((current) => current.filter((toastItem) => toastItem.id !== item.id))}><X /></button></div>)}</div>
  </div>;
}
