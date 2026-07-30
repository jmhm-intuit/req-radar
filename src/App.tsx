import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, DragEvent, ReactNode } from "react";
import {
  AlertTriangle,
  ArrowDownUp,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  CloudDownload,
  Compass,
  Database,
  Download,
  ExternalLink,
  FileStack,
  GitCompareArrows,
  LayoutDashboard,
  Layers3,
  Link2,
  Menu,
  Network,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  Sparkles,
  Target,
  TrendingUp,
  Upload,
  UserRound,
  X
} from "lucide-react";
import { ROLE_GROUPS } from "./data/ontology";
import { CareerProfileView } from "./components/CareerProfileView";
import { FitDiscoveryStudio } from "./components/FitDiscoveryStudio";
import { FitDiscoveryView } from "./components/FitDiscoveryView";
import { GroupsView } from "./components/GroupsView";
import { JobDrawer } from "./components/JobDrawer";
import { JobTable, STATUS_OPTIONS } from "./components/JobTable";
import { PortfolioMap } from "./components/PortfolioMap";
import {
  assessJob,
  buildComparisonsFromAssessments,
  buildRoleGroups,
  portfolioThemes,
  recommendationLabel
} from "./lib/intelligence";
import { checkDuplicates, createJob, formatStatus, parseJobText } from "./lib/jobs";
import { extractSourceFromFile, extractSourceFromText } from "./lib/pdf";
import { profileReadiness } from "./lib/profile";
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
import { topCounts } from "./lib/text";
import type {
  AppSettings,
  BatchResult,
  JobAssessment,
  JobReq,
  JobStatus,
  ParsedBackup,
  Recommendation,
  SyncPreview,
  UserProfile
} from "./types";

type View = "portfolio" | "roles" | "groups" | "discovery" | "profile" | "comparisons";
type SortMode = "RANK" | "CAPABILITY" | "INTEREST" | "DIRECTION" | "NEWEST" | "AGE" | "TITLE";
type Toast = { id: number; title: string; message: string; kind: "success" | "error" | "info" };
type AnalysisError = { jobId: string; title: string; message: string };
type AnalysisProgress = { done: number; total: number };

const PAGE_SIZE = 25;
const RECOMMENDATIONS: Array<"ALL" | Recommendation> = ["ALL", "PURSUE_NOW", "EXPLORE_NETWORKING", "STRETCH", "LOW_PRIORITY", "DO_NOT_PURSUE"];

function AppVersion() {
  return <span className="app-version" title={`Build ${__BUILD_DATE__}`}>ReqRadar v{__APP_VERSION__}</span>;
}

function Empty({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return <div className="empty"><div className="empty-icon">{icon}</div><h3>{title}</h3><p>{text}</p>{action}</div>;
}

function Stat({ icon, label, value, detail, tone = "" }: { icon: ReactNode; label: string; value: number; detail: string; tone?: string }) {
  return <article className={`stat ${tone}`}><div>{icon}<span>{label}</span></div><strong>{value}</strong><p>{detail}</p></article>;
}

function AnalysisLoading({ progress }: { progress: AnalysisProgress }) {
  const percent = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  return <section className="panel analysis-loading" role="status" aria-live="polite">
    <div className="analysis-orbit"><Target /><i /></div>
    <div><span className="eyebrow">Preparing your portfolio</span><h2>Analyzing role fit without blocking the page</h2><p>ReqRadar is processing your saved requisitions in small batches. Your data remains in this browser.</p><div className="analysis-progress-track"><span style={{ width: `${percent}%` }} /></div><small>{progress.done} of {progress.total} roles analyzed · {percent}%</small></div>
  </section>;
}

function normalizeHttpUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const parsed = new URL(candidate);
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Use an http:// or https:// URL.");
  return parsed.toString();
}

function dateValue(value: string): number {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function recommendationClass(value: Recommendation): string {
  return `rec-${value.toLowerCase().replace(/_/g, "-")}`;
}

export default function App() {
  const [jobs, setJobs] = useState<JobReq[]>(() => loadJobs());
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [profile, setProfile] = useState<UserProfile>(() => loadProfile());
  const [view, setView] = useState<View>(() => loadSettings().preferredView === "ROLES" ? "roles" : "portfolio");
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("RANK");
  const [page, setPage] = useState(1);
  const [recommendationFilter, setRecommendationFilter] = useState<"ALL" | Recommendation>("ALL");
  const [groupFilter, setGroupFilter] = useState("ALL");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [discoveryJobId, setDiscoveryJobId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [pastedText, setPastedText] = useState("");
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
  const [uploadStatus, setUploadStatus] = useState<JobStatus>("NEW");
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
  const [assessments, setAssessments] = useState<Map<string, JobAssessment>>(() => new Map());
  const [analysisBusy, setAnalysisBusy] = useState(() => jobs.length > 0);
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress>({ done: 0, total: jobs.length });
  const [analysisErrors, setAnalysisErrors] = useState<AnalysisError[]>([]);
  const [storageWarning, setStorageWarning] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);
  const syncRef = useRef<HTMLInputElement | null>(null);
  const analysisRunRef = useRef(0);
  const analysisCacheRef = useRef(new Map<string, { jobUpdatedAt: string; profileSignature: string; assessment: JobAssessment }>());

  useEffect(() => {
    const result = saveJobs(jobs);
    if (!result.ok) setStorageWarning(result.message);
  }, [jobs]);
  useEffect(() => {
    const result = saveSettings(settings);
    if (!result.ok) setStorageWarning(result.message);
  }, [settings]);
  useEffect(() => {
    const result = saveProfile(profile);
    if (!result.ok) setStorageWarning(result.message);
  }, [profile]);
  useEffect(() => setPage(1), [search, sortMode, recommendationFilter, groupFilter, settings.hiddenStatuses]);

  useEffect(() => {
    const runId = ++analysisRunRef.current;
    const profileSignature = [
      profile.updatedAt,
      profile.resumeText.length,
      profile.skills.length,
      profile.discoveryPreferences.length,
      profile.peakExperiences.length,
      profile.careerDirections.length
    ].join("|");

    setAnalysisProgress({ done: 0, total: jobs.length });
    setAnalysisErrors([]);

    if (!jobs.length) {
      setAssessments(new Map());
      setAnalysisBusy(false);
      return undefined;
    }

    setAnalysisBusy(true);
    const nextAssessments = new Map<string, JobAssessment>();
    const errors: AnalysisError[] = [];
    let index = 0;
    let timer = 0;

    const processChunk = () => {
      if (analysisRunRef.current !== runId) return;
      const chunkStartedAt = performance.now();
      let processedInChunk = 0;

      while (index < jobs.length && (processedInChunk === 0 || performance.now() - chunkStartedAt < 14)) {
        const job = jobs[index];
        const cached = analysisCacheRef.current.get(job.id);
        try {
          const assessment = cached && cached.jobUpdatedAt === job.updatedAt && cached.profileSignature === profileSignature
            ? cached.assessment
            : assessJob(job, profile);
          nextAssessments.set(job.id, assessment);
          analysisCacheRef.current.set(job.id, { jobUpdatedAt: job.updatedAt, profileSignature, assessment });
        } catch (error) {
          errors.push({
            jobId: job.id,
            title: job.title,
            message: error instanceof Error ? error.message : "Unknown analysis error"
          });
        }
        index += 1;
        processedInChunk += 1;
      }

      if (analysisRunRef.current !== runId) return;
      setAnalysisProgress({ done: index, total: jobs.length });

      if (index < jobs.length) {
        timer = window.setTimeout(processChunk, 0);
        return;
      }

      const activeIds = new Set(jobs.map((job) => job.id));
      [...analysisCacheRef.current.keys()].forEach((id) => {
        if (!activeIds.has(id)) analysisCacheRef.current.delete(id);
      });
      setAssessments(nextAssessments);
      setAnalysisErrors(errors);
      setAnalysisBusy(false);
    };

    timer = window.setTimeout(processChunk, 20);
    return () => window.clearTimeout(timer);
  }, [jobs, profile]);

  const notify = (title: string, message: string, kind: Toast["kind"] = "info") => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((current) => [...current, { id, title, message, kind }]);
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 5000);
  };

  const groups = useMemo(() => buildRoleGroups(jobs, assessments), [jobs, assessments]);
  const comparisons = useMemo(
    () => view === "comparisons" && !analysisBusy ? buildComparisonsFromAssessments(jobs, assessments) : [],
    [view, jobs, assessments, analysisBusy]
  );
  const themes = useMemo(() => portfolioThemes(assessments.values()), [assessments]);
  const readiness = useMemo(() => profileReadiness(profile), [profile]);

  const selectedJob = jobs.find((job) => job.id === selectedJobId) || null;
  const selectedAssessment = selectedJob ? assessments.get(selectedJob.id) || null : null;
  const discoveryJob = jobs.find((job) => job.id === discoveryJobId) || null;
  const discoveryAssessment = discoveryJob ? assessments.get(discoveryJob.id) || null : null;

  const activeJobs = useMemo(() => jobs.filter((job) => !settings.hiddenStatuses.includes(job.status)), [jobs, settings.hiddenStatuses]);
  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return activeJobs.filter((job) => {
      const assessment = assessments.get(job.id);
      if (!assessment) return false;
      const matchesSearch = !query || `${job.title} ${job.jobId} ${job.team} ${job.category} ${job.skills.join(" ")} ${assessment.fingerprint.primaryGroupLabel} ${assessment.fingerprint.themes.join(" ")}`.toLowerCase().includes(query);
      const matchesRecommendation = recommendationFilter === "ALL" || assessment.recommendation === recommendationFilter;
      const matchesGroup = groupFilter === "ALL" || assessment.fingerprint.primaryGroupId === groupFilter;
      return matchesSearch && matchesRecommendation && matchesGroup;
    });
  }, [activeJobs, assessments, search, recommendationFilter, groupFilter]);

  const sortedJobs = useMemo(() => [...filteredJobs].sort((left, right) => {
    if (left.pinned !== right.pinned) return left.pinned ? -1 : 1;
    const leftAssessment = assessments.get(left.id)!;
    const rightAssessment = assessments.get(right.id)!;
    if (sortMode === "CAPABILITY") return rightAssessment.capabilityScore - leftAssessment.capabilityScore;
    if (sortMode === "INTEREST") return rightAssessment.interestScore - leftAssessment.interestScore;
    if (sortMode === "DIRECTION") return rightAssessment.directionScore - leftAssessment.directionScore;
    if (sortMode === "NEWEST") return dateValue(right.createdAt) - dateValue(left.createdAt);
    if (sortMode === "AGE") return (leftAssessment.ageDays ?? 9999) - (rightAssessment.ageDays ?? 9999);
    if (sortMode === "TITLE") return left.title.localeCompare(right.title);
    return rightAssessment.finalScore - leftAssessment.finalScore;
  }), [filteredJobs, assessments, sortMode]);

  const pageCount = Math.max(1, Math.ceil(sortedJobs.length / PAGE_SIZE));
  const paginatedJobs = sortedJobs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const topJobs = [...activeJobs].sort((left, right) => (assessments.get(right.id)?.finalScore || 0) - (assessments.get(left.id)?.finalScore || 0)).slice(0, 10);

  const recurringStrengths = useMemo(() => topCounts([...assessments.values()].flatMap((assessment) => assessment.capabilitySkills.filter((item) => item.status === "PROVEN").map((item) => item.requirement.name)), 6), [assessments]);
  const recurringGaps = useMemo(() => topCounts([...assessments.values()].flatMap((assessment) => assessment.capabilitySkills.filter((item) => item.status === "DEVELOPMENT_GAP" || item.status === "CRITICAL_BLOCKER").map((item) => item.requirement.name)), 6), [assessments]);

  const updateJob = (id: string, changes: Partial<JobReq>) => {
    const updatedAt = new Date().toISOString();
    setJobs((current) => current.map((job) => job.id === id ? { ...job, ...changes, updatedAt } : job));
  };

  const updateProfile = (next: UserProfile) => setProfile(next);

  const toggleStatusVisibility = (status: JobStatus) => {
    setSettings((current) => ({
      ...current,
      hiddenStatuses: current.hiddenStatuses.includes(status)
        ? current.hiddenStatuses.filter((item) => item !== status)
        : [...current.hiddenStatuses, status],
      updatedAt: new Date().toISOString()
    }));
  };

  const switchView = (next: View) => {
    setView(next);
    setSidebarOpen(false);
    if (next === "portfolio" || next === "roles") {
      setSettings((current) => ({ ...current, preferredView: next === "roles" ? "ROLES" : "PORTFOLIO", updatedAt: new Date().toISOString() }));
    }
  };

  const addFiles = (files: File[]) => {
    const accepted = files.filter((file) => /\.(pdf|txt)$/i.test(file.name) || file.type === "application/pdf" || file.type === "text/plain");
    setSelectedFiles((current) => {
      const keys = new Set(current.map((file) => `${file.name}-${file.size}-${file.lastModified}`));
      return [...current, ...accepted.filter((file) => !keys.has(`${file.name}-${file.size}-${file.lastModified}`))];
    });
    if (accepted.length !== files.length) notify("Some files were skipped", "ReqRadar supports PDF and TXT files.", "info");
  };

  const processUploads = async () => {
    if (!selectedFiles.length && pastedText.trim().length < 40) {
      notify("Nothing to analyze", "Select one or more PDFs/TXT files or paste a job description.", "error");
      return;
    }
    setBusy(true);
    setBatchResults([]);
    const results: BatchResult[] = [];
    let workingJobs = [...jobs];
    const sources: Array<{ label: string; get: () => Promise<{ text: string; hash: string; fileName: string }> }> = [
      ...selectedFiles.map((file) => ({ label: file.name, get: () => extractSourceFromFile(file) })),
      ...(pastedText.trim().length >= 40 ? [{ label: "Pasted job description", get: () => extractSourceFromText(pastedText) }] : [])
    ];

    for (const sourceItem of sources) {
      try {
        const source = await sourceItem.get();
        const parsed = parseJobText(source.text);
        const duplicate = checkDuplicates(parsed, source.hash, workingJobs);
        if (duplicate.exactMatch) {
          results.push({ fileName: sourceItem.label, status: "DUPLICATE", title: parsed.title, detail: `Already saved as ${duplicate.exactMatch.title}.` });
          continue;
        }
        const job = createJob(parsed, uploadStatus, "", "", "", source.fileName, source.hash);
        workingJobs = [job, ...workingJobs];
        results.push({ fileName: sourceItem.label, status: "ADDED", title: parsed.title, detail: duplicate.comparisons[0] ? `Added · ${duplicate.comparisons[0].score}% similar to an existing role.` : "Added and fingerprinted." });
      } catch (error) {
        results.push({ fileName: sourceItem.label, status: "ERROR", title: "Could not process", detail: error instanceof Error ? error.message : "Unknown error" });
      }
    }
    setJobs(workingJobs);
    setBatchResults(results);
    setBusy(false);
    const added = results.filter((item) => item.status === "ADDED").length;
    if (added) notify("Portfolio updated", `${added} requisition${added === 1 ? " was" : "s were"} analyzed and added.`, "success");
  };

  const closeUpload = () => {
    setUploadOpen(false);
    setSelectedFiles([]);
    setPastedText("");
    setBatchResults([]);
    setDragActive(false);
  };

  const exportBackup = () => {
    const exportedAt = new Date().toISOString();
    downloadJson(buildExportPayload(jobs, settings, profile, exportedAt));
    setSettings((current) => ({ ...current, lastExportAt: exportedAt, updatedAt: exportedAt }));
    notify("Backup downloaded", `${jobs.length} requisitions and your complete career profile were exported.`, "success");
  };

  const importBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const backup = parseBackupFile(await file.text());
      setPendingBackup(backup);
      setSyncPreview(buildSyncPreview(jobs, backup));
      setSyncError("");
    } catch (error) {
      setPendingBackup(null);
      setSyncPreview(null);
      setSyncError(error instanceof Error ? error.message : "Could not read this backup.");
    } finally {
      event.target.value = "";
    }
  };

  const applySync = () => {
    if (!pendingBackup) return;
    const merged = mergeBackup(jobs, settings, profile, pendingBackup, syncMode);
    setJobs(merged.jobs);
    setSettings(merged.settings);
    setProfile(merged.profile);
    setPendingBackup(null);
    setSyncPreview(null);
    setSyncOpen(false);
    notify("Sync complete", `${merged.jobs.length} requisitions are now available on this device.`, "success");
  };

  const savePortal = () => {
    try {
      const url = portalDraft.trim() ? normalizeHttpUrl(portalDraft) : "";
      setSettings((current) => ({ ...current, recruitingPortalUrl: url, updatedAt: new Date().toISOString() }));
      setPortalDraft(url);
      setSettingsOpen(false);
      notify("Recruiting shortcut saved", url || "The shortcut was cleared.", "success");
    } catch (error) {
      notify("Invalid URL", error instanceof Error ? error.message : "Check the URL.", "error");
    }
  };

  const deleteSelected = () => {
    if (!selectedJob || !window.confirm(`Delete “${selectedJob.title}”?`)) return;
    setJobs((current) => current.filter((job) => job.id !== selectedJob.id));
    setSelectedJobId(null);
    notify("Requisition deleted", selectedJob.title, "success");
  };

  const openPortal = () => {
    if (!settings.recruitingPortalUrl) {
      setPortalDraft("");
      setSettingsOpen(true);
      return;
    }
    window.open(settings.recruitingPortalUrl, "_blank", "noopener,noreferrer");
  };

  const pursueNowCount = [...assessments.values()].filter((assessment) => assessment.recommendation === "PURSUE_NOW").length;
  const exploreCount = [...assessments.values()].filter((assessment) => assessment.recommendation === "EXPLORE_NETWORKING").length;
  const stretchCount = [...assessments.values()].filter((assessment) => assessment.recommendation === "STRETCH").length;
  const staleCount = [...assessments.values()].filter((assessment) => assessment.ageDays !== null && assessment.ageDays > 90 && assessment.viabilityScore === 0).length;
  const initialAnalysisPending = jobs.length > 0 && analysisBusy && assessments.size === 0;

  return <div className="app-shell">
    <button className={`mobile-backdrop ${sidebarOpen ? "show" : ""}`} onClick={() => setSidebarOpen(false)} aria-label="Close navigation" />
    <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
      <div className="brand"><div><Target /></div><span><strong>ReqRadar</strong><small>Fit Discovery & Career Portfolio</small></span></div>
      <nav>
        <button className={view === "portfolio" ? "active" : ""} onClick={() => switchView("portfolio")}><LayoutDashboard /> Portfolio</button>
        <button className={view === "roles" ? "active" : ""} onClick={() => switchView("roles")}><BriefcaseBusiness /> All roles <b>{jobs.length}</b></button>
        <button className={view === "groups" ? "active" : ""} onClick={() => switchView("groups")}><Layers3 /> Role families <b>{groups.length}</b></button>
        <button className={view === "discovery" ? "active" : ""} onClick={() => switchView("discovery")}><Compass /> Fit Discovery <b>{jobs.filter((job) => Object.keys(job.fitDiscovery?.responses || {}).length > 0).length}</b></button>
        <button className={view === "profile" ? "active" : ""} onClick={() => switchView("profile")}><UserRound /> Career profile <b>{readiness.score}%</b></button>
        <button className={view === "comparisons" ? "active" : ""} onClick={() => switchView("comparisons")}><GitCompareArrows /> Similar roles <b>{view === "comparisons" ? comparisons.length : "…"}</b></button>
      </nav>
      <div className="sidebar-section"><span>Shortcuts</span><button onClick={openPortal}><ExternalLink /> Recruiting page</button><button onClick={() => setSyncOpen(true)}><Database /> Sync devices</button><button onClick={() => { setPortalDraft(settings.recruitingPortalUrl); setSettingsOpen(true); }}><Settings /> Settings</button></div>
      <div className="sidebar-coach"><Sparkles /><strong>Career coaching model</strong><p>Capability, interest, direction, and viability are assessed separately.</p></div>
      <div className="sidebar-footer"><AppVersion /><span>Data stays in this browser</span></div>
    </aside>

    <main>
      <header className="topbar"><div className="topbar-title"><button className="icon-btn menu-btn" onClick={() => setSidebarOpen(true)}><Menu /></button><div><span>{view === "portfolio" ? "Decision portfolio" : view === "roles" ? "Opportunity inventory" : view === "groups" ? "Role patterns" : view === "discovery" ? "Scenario-based self-discovery" : view === "profile" ? "Career evidence" : "Similarity intelligence"}</span><h1>{view === "portfolio" ? "Where should I focus?" : view === "roles" ? "All job requisitions" : view === "groups" ? "Understand the role families" : view === "discovery" ? "Discover what each role may feel like" : view === "profile" ? "Build a profile that explains your fit" : "Compare related opportunities"}</h1></div></div><div className="top-actions"><button className="secondary" onClick={() => setSyncOpen(true)}><RefreshCw /> Sync</button><button className="primary" onClick={() => setUploadOpen(true)}><Plus /> Upload reqs</button></div></header>

      <div className="content">
        {storageWarning && <section className="runtime-alert storage-alert"><AlertTriangle /><div><strong>Changes may not be saving</strong><p>{storageWarning}</p></div><button className="secondary" onClick={exportBackup}><Download /> Download backup</button><button className="icon-btn" onClick={() => setStorageWarning("")} aria-label="Dismiss storage warning"><X /></button></section>}
        {analysisErrors.length > 0 && <section className="runtime-alert analysis-alert"><CircleHelp /><div><strong>{analysisErrors.length} role{analysisErrors.length === 1 ? "" : "s"} could not be analyzed</strong><p>{analysisErrors[0].title}: {analysisErrors[0].message}. The rest of your portfolio remains available.</p></div></section>}
        {analysisBusy && assessments.size > 0 && <section className="analysis-refresh" role="status"><RefreshCw className="spin" /><span>Refreshing fit intelligence… {analysisProgress.done}/{analysisProgress.total}</span></section>}

        {initialAnalysisPending ? <AnalysisLoading progress={analysisProgress} /> : <>
        {view === "portfolio" && <>
          {readiness.score < 70 && <section className="coach-banner"><div><UserRound /><span><strong>Your fit model is still developing</strong><p>Upload a resume, confirm evidence, and complete realistic Fit Discovery scenarios to make recommendations more reliable.</p></span></div><button onClick={() => switchView(jobs.length ? "discovery" : "profile")}>{jobs.length ? "Start discovery" : "Improve profile"} <ChevronRight /></button></section>}
          <section className="stats-grid v2"><Stat icon={<BriefcaseBusiness />} label="Portfolio" value={jobs.length} detail={`${groups.length} role families`} /><Stat icon={<Target />} label="Pursue now" value={pursueNowCount} detail="Strong capability + interest" tone="success" /><Stat icon={<Network />} label="Explore" value={exploreCount} detail="Resolve uncertainty through people" /><Stat icon={<TrendingUp />} label="Stretch" value={stretchCount} detail="High interest, manageable gaps" /><Stat icon={<AlertTriangle />} label="Stale" value={staleCount} detail="Older than 90 days" tone="warning" /></section>

          {!jobs.length ? <section className="panel"><Empty icon={<FileStack />} title="Build your opportunity portfolio" text="Upload multiple job requisition PDFs. ReqRadar will fingerprint, group, and compare them with your career evidence." action={<button className="primary" onClick={() => setUploadOpen(true)}><Upload /> Upload job requisitions</button>} /></section> : <>
            <section className="portfolio-grid">
              <article className="panel map-panel"><div className="panel-head responsive"><div><span className="eyebrow">Portfolio map</span><h2>Capability Fit × Interest Fit</h2><p>Strong fit and strong interest belong in the upper-right. Bubble size reflects career direction fit.</p></div><button className="text-button" onClick={() => switchView("roles")}>Open full list <ChevronRight /></button></div><PortfolioMap jobs={activeJobs} assessments={assessments} onOpen={setSelectedJobId} /></article>
              <article className="panel theme-panel"><div className="panel-head"><div><span className="eyebrow">Market themes</span><h2>What your roles have in common</h2><p>Use these patterns to understand the portfolio—not just individual postings.</p></div><Sparkles /></div><div className="theme-ranking">{themes.map((theme, index) => <div key={theme.label}><span>{index + 1}</span><strong>{theme.label}</strong><div><i style={{ width: `${Math.min(100, (theme.count / Math.max(1, themes[0]?.count || 1)) * 100)}%` }} /></div><b>{theme.count}</b></div>)}</div></article>
            </section>

            <section className="panel group-snapshot"><div className="panel-head responsive"><div><span className="eyebrow">Role families</span><h2>Organize 30+ opportunities into a manageable portfolio</h2><p>Each family summarizes common responsibilities, fit, interest, and repeated gaps.</p></div><button className="secondary" onClick={() => switchView("groups")}><Layers3 /> View all families</button></div><div className="snapshot-grid">{groups.slice(0, 4).map((group) => <button key={group.id} onClick={() => switchView("groups")}><div><span>{group.jobIds.length} roles</span><h3>{group.label}</h3><p>{group.description}</p></div><div className="snapshot-scores"><span><b>{group.averageCapability}</b> capability</span><span><b>{group.averageInterest}</b> interest</span></div></button>)}</div></section>

            <section className="insight-grid">
              <article className="panel"><div className="section-head"><div><h3>Your strongest recurring matches</h3><p>Capabilities repeatedly supported by your profile.</p></div><CheckCircle2 /></div>{recurringStrengths.length ? <ul className="insight-list strengths">{recurringStrengths.map((item) => <li key={item.label}><span>{item.label}</span><b>{item.count} roles</b></li>)}</ul> : <p className="muted">Confirm resume skills to reveal recurring market strengths.</p>}</article>
              <article className="panel"><div className="section-head"><div><h3>Common gaps across the portfolio</h3><p>Distinguish learnable gaps from genuine blockers.</p></div><CircleHelp /></div>{recurringGaps.length ? <ul className="insight-list gaps">{recurringGaps.map((item) => <li key={item.label}><span>{item.label}</span><b>{item.count} roles</b></li>)}</ul> : <p className="positive-copy">No repeated capability gaps are visible yet.</p>}</article>
            </section>

            <section className="panel top-opportunities"><div className="panel-head responsive"><div><span className="eyebrow">Decision queue</span><h2>Highest-priority opportunities</h2><p>The score never replaces your judgment. Open a role to inspect evidence and unknowns.</p></div><button className="secondary" onClick={() => switchView("roles")}>Manage all roles <ChevronRight /></button></div><JobTable jobs={topJobs} assessments={assessments} onOpen={setSelectedJobId} onUpdate={updateJob} compact /></section>
          </>}
        </>}

        {view === "roles" && <section className="panel roles-panel"><div className="panel-head responsive"><div><span className="eyebrow">30+ role workspace</span><h2>Opportunity inventory</h2><p>Filter by decision status, recommendation, role family, and evidence-based fit.</p></div><span className="result-count">{filteredJobs.length} shown · {jobs.length} total</span></div>
          <div className="toolbar v2"><label className="search"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, family, theme, team, skill..." /></label><label className="select-filter">Recommendation<select value={recommendationFilter} onChange={(event) => setRecommendationFilter(event.target.value as "ALL" | Recommendation)}>{RECOMMENDATIONS.map((value) => <option key={value} value={value}>{value === "ALL" ? "All recommendations" : recommendationLabel(value)}</option>)}</select></label><label className="select-filter">Role family<select value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)}><option value="ALL">All role families</option>{ROLE_GROUPS.map((group) => <option key={group.id} value={group.id}>{group.label}</option>)}</select></label><label className="sort"><ArrowDownUp /> Sort<select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}><option value="RANK">Recommendation rank</option><option value="CAPABILITY">Capability Fit</option><option value="INTEREST">Interest Fit</option><option value="DIRECTION">Career Direction</option><option value="NEWEST">Recently added</option><option value="AGE">Freshest posting</option><option value="TITLE">Title</option></select></label></div>
          <div className="status-filters"><span>Visible statuses</span>{STATUS_OPTIONS.map((status) => <button key={status} className={!settings.hiddenStatuses.includes(status) ? "active" : ""} onClick={() => toggleStatusVisibility(status)}>{formatStatus(status)}</button>)}<button className="reset-filter" onClick={() => setSettings((current) => ({ ...current, hiddenStatuses: [], updatedAt: new Date().toISOString() }))}>Show all</button></div>
          <JobTable jobs={paginatedJobs} assessments={assessments} onOpen={setSelectedJobId} onUpdate={updateJob} startRank={(page - 1) * PAGE_SIZE} />
          {pageCount > 1 && <div className="pagination"><button disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}><ChevronLeft /> Previous</button><span>Page {page} of {pageCount}</span><button disabled={page === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Next <ChevronRight /></button></div>}
        </section>}

        {view === "groups" && <GroupsView groups={groups} jobs={jobs} assessments={assessments} onOpen={setSelectedJobId} onUpdate={updateJob} />}

        {view === "discovery" && <FitDiscoveryView jobs={jobs} assessments={assessments} profile={profile} onOpenJob={setSelectedJobId} onOpenDiscovery={setDiscoveryJobId} onUpdateJob={updateJob} />}

        {view === "profile" && <CareerProfileView profile={profile} onChange={updateProfile} notify={notify} />}

        {view === "comparisons" && <section className="panel comparisons-panel"><div className="panel-head responsive"><div><span className="eyebrow">Role adjacency</span><h2>Similar and potentially duplicative opportunities</h2><p>Similarity combines title, requirements, work themes, and role family—not only shared words.</p></div><span className="result-count">{comparisons.length} related pairs</span></div>{comparisons.length ? <div className="comparison-list">{comparisons.slice(0, 60).map((comparison) => {
          const source = jobs.find((job) => job.id === comparison.sourceJobId);
          const target = jobs.find((job) => job.id === comparison.targetJobId);
          if (!source || !target) return null;
          return <article key={`${source.id}-${target.id}`}><div className="similarity-score"><strong>{comparison.score}%</strong><span>{comparison.type.replace(/_/g, " ").toLowerCase()}</span></div><div className="comparison-jobs"><button onClick={() => setSelectedJobId(source.id)}>{source.title}</button><GitCompareArrows /><button onClick={() => setSelectedJobId(target.id)}>{target.title}</button></div><div className="comparison-reasons">{comparison.reasons.map((reason) => <span key={reason}>{reason}</span>)}</div></article>;
        })}</div> : <Empty icon={<GitCompareArrows />} title="No related pairs yet" text="Upload more job requisitions to compare role families, themes, and requirements." />}</section>}
        </>}
      </div>
    </main>

    {uploadOpen && <div className="modal-layer" onMouseDown={(event) => event.currentTarget === event.target && closeUpload()}><section className="modal wide upload-modal"><header><div><span className="eyebrow">Fast portfolio intake</span><h2>Upload multiple job requisitions</h2><p>Process PDFs or TXT files in one batch. Each role is fingerprinted, checked for duplicates, and added independently.</p></div><button className="icon-btn" onClick={closeUpload}><X /></button></header><div className="modal-body"><div className={`dropzone ${dragActive ? "active" : ""}`} onDragOver={(event: DragEvent) => { event.preventDefault(); setDragActive(true); }} onDragLeave={() => setDragActive(false)} onDrop={(event: DragEvent) => { event.preventDefault(); setDragActive(false); addFiles(Array.from(event.dataTransfer.files)); }} onClick={() => fileRef.current?.click()}><FileStack /><strong>Drop multiple job requisition PDFs here</strong><span>or select files · PDF/TXT · up to 18 MB each</span><input ref={fileRef} type="file" multiple accept="application/pdf,text/plain,.pdf,.txt" hidden onChange={(event) => addFiles(Array.from(event.target.files || []))} /></div>{selectedFiles.length > 0 && <div className="selected-files"><div><strong>{selectedFiles.length} file{selectedFiles.length === 1 ? "" : "s"} selected</strong><button onClick={() => setSelectedFiles([])}>Clear all</button></div>{selectedFiles.map((file) => <span key={`${file.name}-${file.lastModified}`}><FileStack /> {file.name}<button onClick={() => setSelectedFiles((current) => current.filter((item) => item !== file))}><X /></button></span>)}</div>}<div className="or-divider"><span>or paste one posting</span></div><textarea className="paste-area" rows={7} value={pastedText} onChange={(event) => setPastedText(event.target.value)} placeholder="Paste a job description here..." /><label className="field inline-field"><span>Initial decision status</span><select value={uploadStatus} onChange={(event) => setUploadStatus(event.target.value as JobStatus)}>{STATUS_OPTIONS.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}</select></label>{batchResults.length > 0 && <div className="batch-results"><div className="batch-summary"><span><b>{batchResults.filter((item) => item.status === "ADDED").length}</b> added</span><span><b>{batchResults.filter((item) => item.status === "DUPLICATE").length}</b> duplicates</span><span><b>{batchResults.filter((item) => item.status === "ERROR").length}</b> errors</span></div>{batchResults.map((result, index) => <article key={`${result.fileName}-${index}`} className={result.status.toLowerCase()}>{result.status === "ADDED" ? <CheckCircle2 /> : <AlertTriangle />}<div><strong>{result.title}</strong><span>{result.fileName} · {result.detail}</span></div></article>)}</div>}</div><footer><button className="secondary" onClick={closeUpload}>{batchResults.length ? "Done" : "Cancel"}</button><button className="primary" disabled={busy || (!selectedFiles.length && pastedText.trim().length < 40)} onClick={processUploads}>{busy ? <RefreshCw className="spin" /> : <Sparkles />} {busy ? "Analyzing portfolio..." : `Analyze ${selectedFiles.length + (pastedText.trim().length >= 40 ? 1 : 0)} req${selectedFiles.length + (pastedText.trim().length >= 40 ? 1 : 0) === 1 ? "" : "s"}`}</button></footer></section></div>}

    {syncOpen && <div className="modal-layer" onMouseDown={(event) => event.currentTarget === event.target && setSyncOpen(false)}><section className="modal sync-modal"><header><div><span className="eyebrow">Manual device sync</span><h2>Move your complete portfolio</h2><p>Backups include jobs, evidence-backed skills, interest answers, networking learning, rankings, and settings.</p></div><button className="icon-btn" onClick={() => setSyncOpen(false)}><X /></button></header><div className="modal-body sync-grid"><button className="sync-card" onClick={exportBackup}><CloudDownload /><strong>Download backup</strong><span>{jobs.length} requisitions + career profile</span></button><button className="sync-card" onClick={() => syncRef.current?.click()}><Upload /><strong>Upload backup</strong><span>Merge or replace this browser</span></button><input ref={syncRef} type="file" accept="application/json,.json" hidden onChange={importBackup} />{syncError && <div className="alert error"><AlertTriangle /> {syncError}</div>}{syncPreview && <div className="sync-preview"><h3>Import preview</h3><div><span>{syncPreview.newCount}<small>new</small></span><span>{syncPreview.updatedCount}<small>updated</small></span><span>{syncPreview.unchangedCount}<small>unchanged</small></span><span>{syncPreview.conflictCount}<small>older locally</small></span></div><label><input type="radio" checked={syncMode === "merge"} onChange={() => setSyncMode("merge")} /> Merge with this device</label><label><input type="radio" checked={syncMode === "replace"} onChange={() => setSyncMode("replace")} /> Replace this device</label></div>}</div><footer><button className="secondary" onClick={() => setSyncOpen(false)}>Close</button>{pendingBackup && <button className="primary" onClick={applySync}><Save /> Apply import</button>}</footer></section></div>}

    {settingsOpen && <div className="modal-layer" onMouseDown={(event) => event.currentTarget === event.target && setSettingsOpen(false)}><section className="modal small"><header><div><span className="eyebrow">Shortcut</span><h2>Recruiting page</h2><p>Save easy access to your main recruiting or internal careers page.</p></div><button className="icon-btn" onClick={() => setSettingsOpen(false)}><X /></button></header><div className="modal-body"><label className="field"><span>Recruiting page URL</span><input value={portalDraft} onChange={(event) => setPortalDraft(event.target.value)} placeholder="https://..." /></label><div className="privacy-note"><Database /> ReqRadar remains a local-first app. Job descriptions and resume data are not sent to GitHub.</div></div><footer><button className="secondary" onClick={() => setSettingsOpen(false)}>Cancel</button><button className="primary" onClick={savePortal}><Link2 /> Save link</button></footer></section></div>}

    {selectedJob && selectedAssessment && <JobDrawer job={selectedJob} assessment={selectedAssessment} onUpdate={(changes) => updateJob(selectedJob.id, changes)} onDelete={deleteSelected} onClose={() => setSelectedJobId(null)} onOpenDiscovery={() => { setDiscoveryJobId(selectedJob.id); setSelectedJobId(null); }} notify={notify} />}

    {discoveryJob && discoveryAssessment && <FitDiscoveryStudio job={discoveryJob} assessment={discoveryAssessment} profile={profile} onUpdateJob={(changes) => updateJob(discoveryJob.id, changes)} onUpdateProfile={updateProfile} onClose={() => setDiscoveryJobId(null)} notify={notify} />}

    <div className="toasts">{toasts.map((item) => <div className={`toast ${item.kind}`} key={item.id}>{item.kind === "error" ? <AlertTriangle /> : item.kind === "success" ? <CheckCircle2 /> : <Sparkles />}<div><strong>{item.title}</strong><span>{item.message}</span></div><button onClick={() => setToasts((current) => current.filter((toast) => toast.id !== item.id))}><X /></button></div>)}</div>
  </div>;
}
