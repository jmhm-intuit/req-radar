import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, DragEvent, ReactNode } from "react";
import {
  AlertTriangle,
  BriefcaseBusiness,
  CheckCircle2,
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
  Settings,
  Sparkles,
  Target,
  TrendingUp,
  Upload,
  UserRound,
  X
} from "lucide-react";
import { CareerProfileView } from "./components/CareerProfileView";
import { CompetencyHeatmapView } from "./components/CompetencyHeatmapView";
import { EvidencePortfolioView } from "./components/EvidencePortfolioView";
import { PortfolioDemandView } from "./components/PortfolioDemandView";
import { RoleComparisonView } from "./components/RoleComparisonView";
import { GeneralThemeDiscoveryView } from "./components/GeneralThemeDiscoveryView";
import { FitDiscoveryStudio } from "./components/FitDiscoveryStudio";
import { FitDiscoveryView } from "./components/FitDiscoveryView";
import { GroupsView } from "./components/GroupsView";
import { JobDrawer } from "./components/JobDrawer";
import { STATUS_OPTIONS } from "./components/JobTable";
import { PortfolioNavigator } from "./components/PortfolioNavigator";
import { assessJob, buildRoleGroups } from "./lib/intelligence";
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
import { jobAnalysisSignature, profileAnalysisSignature } from "./lib/signatures";
import type {
  AppSettings,
  BatchResult,
  JobAssessment,
  JobReq,
  JobStatus,
  ParsedBackup,
  SyncPreview,
  UserProfile
} from "./types";

type View = "portfolio" | "heatmap" | "demand" | "compare" | "roles" | "groups" | "themes" | "discovery" | "profile";
type Toast = { id: number; title: string; message: string; kind: "success" | "error" | "info" };
type AnalysisError = { jobId: string; title: string; message: string };
type AnalysisProgress = { done: number; total: number };

function AppVersion() {
  return <span className="app-version" title={`Build ${__BUILD_DATE__}`}>ReqRadar v{__APP_VERSION__}</span>;
}

function Empty({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return <div className="empty"><div className="empty-icon">{icon}</div><h3>{title}</h3><p>{text}</p>{action}</div>;
}

function Stat({ icon, label, value, detail, tone = "" }: { icon: ReactNode; label: string; value: number; detail: string; tone?: string }) {
  return <article className={`stat ${tone}`}><div>{icon}<span>{label}</span></div><strong>{value}</strong><p>{detail}</p></article>;
}

function assessmentMapsEqual(left: Map<string, JobAssessment>, right: Map<string, JobAssessment>): boolean {
  if (left.size !== right.size) return false;
  for (const [id, assessment] of right) {
    if (left.get(id) !== assessment) return false;
  }
  return true;
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

export default function App() {
  const [jobs, setJobs] = useState<JobReq[]>(() => loadJobs());
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [profile, setProfile] = useState<UserProfile>(() => loadProfile());
  const [view, setView] = useState<View>(() => loadSettings().preferredView === "ROLES" ? "roles" : "portfolio");
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
  const analysisCacheRef = useRef(new Map<string, { jobSignature: string; profileSignature: string; assessment: JobAssessment }>());

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const result = saveJobs(jobs);
      if (!result.ok) setStorageWarning(result.message);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [jobs]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const result = saveSettings(settings);
      if (!result.ok) setStorageWarning(result.message);
    }, 120);
    return () => window.clearTimeout(timer);
  }, [settings]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const result = saveProfile(profile);
      if (!result.ok) setStorageWarning(result.message);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [profile]);

  useEffect(() => {
    const runId = ++analysisRunRef.current;
    const profileSignature = profileAnalysisSignature(profile);
    const errors: AnalysisError[] = [];

    if (!jobs.length) {
      analysisCacheRef.current.clear();
      setAssessments(new Map());
      setAnalysisProgress({ done: 0, total: 0 });
      setAnalysisErrors([]);
      setAnalysisBusy(false);
      return undefined;
    }

    const nextAssessments = new Map<string, JobAssessment>();
    const stale: Array<{ job: JobReq; signature: string }> = [];
    jobs.forEach((job) => {
      const signature = jobAnalysisSignature(job);
      const cached = analysisCacheRef.current.get(job.id);
      if (cached && cached.jobSignature === signature && cached.profileSignature === profileSignature) {
        nextAssessments.set(job.id, cached.assessment);
      } else {
        stale.push({ job, signature });
      }
    });

    const activeIds = new Set(jobs.map((job) => job.id));
    [...analysisCacheRef.current.keys()].forEach((id) => {
      if (!activeIds.has(id)) analysisCacheRef.current.delete(id);
    });

    setAnalysisErrors([]);
    setAnalysisProgress({ done: jobs.length - stale.length, total: jobs.length });
    if (nextAssessments.size) setAssessments((current) => assessmentMapsEqual(current, nextAssessments) ? current : new Map(nextAssessments));

    if (!stale.length) {
      setAssessments((current) => assessmentMapsEqual(current, nextAssessments) ? current : nextAssessments);
      setAnalysisBusy(false);
      return undefined;
    }

    setAnalysisBusy(true);
    let index = 0;
    let timer = 0;

    const processChunk = () => {
      if (analysisRunRef.current !== runId) return;
      const chunkStartedAt = performance.now();
      let processedInChunk = 0;

      while (index < stale.length && (processedInChunk === 0 || performance.now() - chunkStartedAt < 12)) {
        const item = stale[index];
        try {
          const assessment = assessJob(item.job, profile);
          nextAssessments.set(item.job.id, assessment);
          analysisCacheRef.current.set(item.job.id, {
            jobSignature: item.signature,
            profileSignature,
            assessment
          });
        } catch (error) {
          errors.push({
            jobId: item.job.id,
            title: item.job.title,
            message: error instanceof Error ? error.message : "Unknown analysis error"
          });
        }
        index += 1;
        processedInChunk += 1;
      }

      if (analysisRunRef.current !== runId) return;
      const done = jobs.length - stale.length + index;
      setAnalysisProgress({ done, total: jobs.length });
      setAssessments((current) => assessmentMapsEqual(current, nextAssessments) ? current : new Map(nextAssessments));

      if (index < stale.length) {
        timer = window.setTimeout(processChunk, 0);
        return;
      }

      setAnalysisErrors(errors);
      setAnalysisBusy(false);
    };

    timer = window.setTimeout(processChunk, nextAssessments.size ? 0 : 16);
    return () => window.clearTimeout(timer);
  }, [jobs, profile]);

  const notify = (title: string, message: string, kind: Toast["kind"] = "info") => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((current) => [...current, { id, title, message, kind }]);
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 5000);
  };

  const groups = useMemo(() => buildRoleGroups(jobs, assessments), [jobs, assessments]);
  const readiness = useMemo(() => profileReadiness(profile), [profile]);

  const selectedJob = jobs.find((job) => job.id === selectedJobId) || null;
  const selectedAssessment = selectedJob ? assessments.get(selectedJob.id) || null : null;
  const discoveryJob = jobs.find((job) => job.id === discoveryJobId) || null;
  const discoveryAssessment = discoveryJob ? assessments.get(discoveryJob.id) || null : null;

  const updateJob = (id: string, changes: Partial<JobReq>) => {
    const updatedAt = new Date().toISOString();
    setJobs((current) => current.map((job) => job.id === id ? { ...job, ...changes, updatedAt } : job));
  };

  const updateProfile = (next: UserProfile) => setProfile(next);



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

  const initialAnalysisPending = jobs.length > 0 && analysisBusy && assessments.size === 0;

  return <div className="app-shell">
    <button className={`mobile-backdrop ${sidebarOpen ? "show" : ""}`} onClick={() => setSidebarOpen(false)} aria-label="Close navigation" />
    <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
      <div className="brand"><div><Target /></div><span><strong>ReqRadar</strong><small>Evidence-Based Fit Navigator</small></span></div>
      <nav>
        <button className={view === "portfolio" ? "active" : ""} onClick={() => switchView("portfolio")}><LayoutDashboard /> Fit portfolio <b>{jobs.length}</b></button>
        <button className={view === "heatmap" ? "active" : ""} onClick={() => switchView("heatmap")}><Target /> Competency heatmap</button>
        <button className={view === "demand" ? "active" : ""} onClick={() => switchView("demand")}><TrendingUp /> Portfolio demand</button>
        <button className={view === "compare" ? "active" : ""} onClick={() => switchView("compare")}><GitCompareArrows /> Compare roles</button>
        <button className={view === "roles" ? "active" : ""} onClick={() => switchView("roles")}><BriefcaseBusiness /> Focus navigator</button>
        <button className={view === "groups" ? "active" : ""} onClick={() => switchView("groups")}><Layers3 /> Role families <b>{groups.length}</b></button>
        <button className={view === "themes" ? "active" : ""} onClick={() => switchView("themes")}><Sparkles /> General themes <b>{profile.discoveryPreferences.length}</b></button>
        <button className={view === "discovery" ? "active" : ""} onClick={() => switchView("discovery")}><Compass /> Role discovery <b>{jobs.filter((job) => Object.keys(job.fitDiscovery?.responses || {}).length > 0).length}</b></button>
        <button className={view === "profile" ? "active" : ""} onClick={() => switchView("profile")}><UserRound /> Career evidence <b>{readiness.score}%</b></button>
      </nav>
      <div className="sidebar-section"><span>Shortcuts</span><button onClick={openPortal}><ExternalLink /> Recruiting page</button><button onClick={() => setSyncOpen(true)}><Database /> Sync devices</button><button onClick={() => { setPortalDraft(settings.recruitingPortalUrl); setSettingsOpen(true); }}><Settings /> Settings</button></div>
      <div className="sidebar-coach"><Sparkles /><strong>Evidence before scores</strong><p>Scope, experience evidence, attraction, direction, and viability remain separate.</p></div>
      <div className="sidebar-footer"><AppVersion /><span>Data stays in this browser</span></div>
    </aside>

    <main>
      <header className="topbar"><div className="topbar-title"><button className="icon-btn menu-btn" onClick={() => setSidebarOpen(true)}><Menu /></button><div><span>{view === "portfolio" ? "Evidence-Based Fit Navigator" : view === "heatmap" ? "Capability comparison" : view === "demand" ? "Portfolio demand" : view === "compare" ? "Multi-role decision support" : view === "roles" ? "Focus Navigator" : view === "groups" ? "Role patterns" : view === "themes" ? "Layer 1 · General Theme Discovery" : view === "discovery" ? "Layer 2 · Role-Specific Discovery" : "Career evidence"}</span><h1>{view === "portfolio" ? "Which opportunities deserve my attention?" : view === "heatmap" ? "See strengths and gaps across every role" : view === "demand" ? "Understand what the portfolio repeatedly asks for" : view === "compare" ? "Compare the work, evidence, and trade-offs" : view === "roles" ? "Navigate the opportunity portfolio" : view === "groups" ? "Understand the role families" : view === "themes" ? "Learn what kinds of work energize you" : view === "discovery" ? "Discover what each role may feel like" : "Build a profile that explains your fit"}</h1></div></div><div className="top-actions"><button className="secondary" onClick={() => setSyncOpen(true)}><RefreshCw /> Sync</button><button className="primary" onClick={() => setUploadOpen(true)}><Plus /> Upload reqs</button></div></header>

      <div className="content">
        {storageWarning && <section className="runtime-alert storage-alert"><AlertTriangle /><div><strong>Changes may not be saving</strong><p>{storageWarning}</p></div><button className="secondary" onClick={exportBackup}><Download /> Download backup</button><button className="icon-btn" onClick={() => setStorageWarning("")} aria-label="Dismiss storage warning"><X /></button></section>}
        {analysisErrors.length > 0 && <section className="runtime-alert analysis-alert"><CircleHelp /><div><strong>{analysisErrors.length} role{analysisErrors.length === 1 ? "" : "s"} could not be analyzed</strong><p>{analysisErrors[0].title}: {analysisErrors[0].message}. The rest of your portfolio remains available.</p></div></section>}
        {analysisBusy && assessments.size > 0 && <section className="analysis-refresh" role="status"><RefreshCw className="spin" /><span>Refreshing fit intelligence… {analysisProgress.done}/{analysisProgress.total}</span></section>}

        {initialAnalysisPending ? <AnalysisLoading progress={analysisProgress} /> : <>
        {view === "portfolio" && <>
          {readiness.score < 70 && <section className="coach-banner"><div><UserRound /><span><strong>Your evidence model is still developing</strong><p>Upload a resume, confirm experience evidence, and complete discovery to improve scope and fit confidence.</p></span></div><button onClick={() => switchView(jobs.length ? "profile" : "profile")}>Improve evidence <ChevronRight /></button></section>}
          {!jobs.length ? <section className="panel"><Empty icon={<FileStack />} title="Build your opportunity portfolio" text="Upload multiple job requisition PDFs. ReqRadar will build Job Success Profiles, separate scope from interest, and map requirements to your experience evidence." action={<button className="primary" onClick={() => setUploadOpen(true)}><Upload /> Upload job requisitions</button>} /></section> : <EvidencePortfolioView jobs={jobs} assessments={assessments} onOpen={setSelectedJobId} onUpdate={updateJob} onOpenHeatmap={() => switchView("heatmap")} onOpenDemand={() => switchView("demand")} onOpenCompare={() => switchView("compare")} />}
        </>}

        {view === "heatmap" && <CompetencyHeatmapView jobs={jobs} assessments={assessments} onOpen={setSelectedJobId} />}

        {view === "demand" && <PortfolioDemandView jobs={jobs} assessments={assessments} onOpen={setSelectedJobId} />}

        {view === "compare" && <RoleComparisonView jobs={jobs} assessments={assessments} onOpen={setSelectedJobId} />}

        {view === "roles" && <PortfolioNavigator jobs={jobs} assessments={assessments} settings={settings} onSettingsChange={setSettings} onOpen={setSelectedJobId} onUpdate={updateJob} />}

        {view === "groups" && <GroupsView groups={groups} jobs={jobs} assessments={assessments} onOpen={setSelectedJobId} onUpdate={updateJob} />}

        {view === "themes" && <GeneralThemeDiscoveryView jobs={jobs} assessments={assessments} profile={profile} onChangeProfile={updateProfile} onOpenRole={setSelectedJobId} onOpenRoleDiscovery={setDiscoveryJobId} notify={notify} />}

        {view === "discovery" && <FitDiscoveryView jobs={jobs} assessments={assessments} profile={profile} onOpenThemes={() => switchView("themes")} onOpenJob={setSelectedJobId} onOpenDiscovery={setDiscoveryJobId} onUpdateJob={updateJob} />}

        {view === "profile" && <CareerProfileView profile={profile} onChange={updateProfile} notify={notify} />}
        </>}
      </div>
    </main>

    {uploadOpen && <div className="modal-layer" onMouseDown={(event) => event.currentTarget === event.target && closeUpload()}><section className="modal wide upload-modal"><header><div><span className="eyebrow">Fast portfolio intake</span><h2>Upload multiple job requisitions</h2><p>Process PDFs or TXT files in one batch. Each role is fingerprinted, checked for duplicates, and added independently.</p></div><button className="icon-btn" onClick={closeUpload}><X /></button></header><div className="modal-body"><div className={`dropzone ${dragActive ? "active" : ""}`} onDragOver={(event: DragEvent) => { event.preventDefault(); setDragActive(true); }} onDragLeave={() => setDragActive(false)} onDrop={(event: DragEvent) => { event.preventDefault(); setDragActive(false); addFiles(Array.from(event.dataTransfer.files)); }} onClick={() => fileRef.current?.click()}><FileStack /><strong>Drop multiple job requisition PDFs here</strong><span>or select files · PDF/TXT · up to 18 MB each</span><input ref={fileRef} type="file" multiple accept="application/pdf,text/plain,.pdf,.txt" hidden onChange={(event) => addFiles(Array.from(event.target.files || []))} /></div>{selectedFiles.length > 0 && <div className="selected-files"><div><strong>{selectedFiles.length} file{selectedFiles.length === 1 ? "" : "s"} selected</strong><button onClick={() => setSelectedFiles([])}>Clear all</button></div>{selectedFiles.map((file) => <span key={`${file.name}-${file.lastModified}`}><FileStack /> {file.name}<button onClick={() => setSelectedFiles((current) => current.filter((item) => item !== file))}><X /></button></span>)}</div>}<div className="or-divider"><span>or paste one posting</span></div><textarea className="paste-area" rows={7} value={pastedText} onChange={(event) => setPastedText(event.target.value)} placeholder="Paste a job description here..." /><label className="field inline-field"><span>Initial decision status</span><select value={uploadStatus} onChange={(event) => setUploadStatus(event.target.value as JobStatus)}>{STATUS_OPTIONS.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}</select></label>{batchResults.length > 0 && <div className="batch-results"><div className="batch-summary"><span><b>{batchResults.filter((item) => item.status === "ADDED").length}</b> added</span><span><b>{batchResults.filter((item) => item.status === "DUPLICATE").length}</b> duplicates</span><span><b>{batchResults.filter((item) => item.status === "ERROR").length}</b> errors</span></div>{batchResults.map((result, index) => <article key={`${result.fileName}-${index}`} className={result.status.toLowerCase()}>{result.status === "ADDED" ? <CheckCircle2 /> : <AlertTriangle />}<div><strong>{result.title}</strong><span>{result.fileName} · {result.detail}</span></div></article>)}</div>}</div><footer><button className="secondary" onClick={closeUpload}>{batchResults.length ? "Done" : "Cancel"}</button><button className="primary" disabled={busy || (!selectedFiles.length && pastedText.trim().length < 40)} onClick={processUploads}>{busy ? <RefreshCw className="spin" /> : <Sparkles />} {busy ? "Analyzing portfolio..." : `Analyze ${selectedFiles.length + (pastedText.trim().length >= 40 ? 1 : 0)} req${selectedFiles.length + (pastedText.trim().length >= 40 ? 1 : 0) === 1 ? "" : "s"}`}</button></footer></section></div>}

    {syncOpen && <div className="modal-layer" onMouseDown={(event) => event.currentTarget === event.target && setSyncOpen(false)}><section className="modal sync-modal"><header><div><span className="eyebrow">Manual device sync</span><h2>Move your complete portfolio</h2><p>Backups include jobs, evidence-backed skills, interest answers, networking learning, rankings, and settings.</p></div><button className="icon-btn" onClick={() => setSyncOpen(false)}><X /></button></header><div className="modal-body sync-grid"><button className="sync-card" onClick={exportBackup}><CloudDownload /><strong>Download backup</strong><span>{jobs.length} requisitions + career profile</span></button><button className="sync-card" onClick={() => syncRef.current?.click()}><Upload /><strong>Upload backup</strong><span>Merge or replace this browser</span></button><input ref={syncRef} type="file" accept="application/json,.json" hidden onChange={importBackup} />{syncError && <div className="alert error"><AlertTriangle /> {syncError}</div>}{syncPreview && <div className="sync-preview"><h3>Import preview</h3><div><span>{syncPreview.newCount}<small>new</small></span><span>{syncPreview.updatedCount}<small>updated</small></span><span>{syncPreview.unchangedCount}<small>unchanged</small></span><span>{syncPreview.conflictCount}<small>older locally</small></span></div><label><input type="radio" checked={syncMode === "merge"} onChange={() => setSyncMode("merge")} /> Merge with this device</label><label><input type="radio" checked={syncMode === "replace"} onChange={() => setSyncMode("replace")} /> Replace this device</label></div>}</div><footer><button className="secondary" onClick={() => setSyncOpen(false)}>Close</button>{pendingBackup && <button className="primary" onClick={applySync}><Save /> Apply import</button>}</footer></section></div>}

    {settingsOpen && <div className="modal-layer" onMouseDown={(event) => event.currentTarget === event.target && setSettingsOpen(false)}><section className="modal small"><header><div><span className="eyebrow">Shortcut</span><h2>Recruiting page</h2><p>Save easy access to your main recruiting or internal careers page.</p></div><button className="icon-btn" onClick={() => setSettingsOpen(false)}><X /></button></header><div className="modal-body"><label className="field"><span>Recruiting page URL</span><input value={portalDraft} onChange={(event) => setPortalDraft(event.target.value)} placeholder="https://..." /></label><div className="privacy-note"><Database /> ReqRadar remains a local-first app. Job descriptions and resume data are not sent to GitHub.</div></div><footer><button className="secondary" onClick={() => setSettingsOpen(false)}>Cancel</button><button className="primary" onClick={savePortal}><Link2 /> Save link</button></footer></section></div>}

    {selectedJob && selectedAssessment && <JobDrawer job={selectedJob} assessment={selectedAssessment} onUpdate={(changes) => updateJob(selectedJob.id, changes)} onDelete={deleteSelected} onClose={() => setSelectedJobId(null)} onOpenDiscovery={() => { setDiscoveryJobId(selectedJob.id); setSelectedJobId(null); }} notify={notify} />}

    {discoveryJob && discoveryAssessment && <FitDiscoveryStudio job={discoveryJob} assessment={discoveryAssessment} profile={profile} onUpdateJob={(changes) => updateJob(discoveryJob.id, changes)} onClose={() => setDiscoveryJobId(null)} notify={notify} />}

    <div className="toasts">{toasts.map((item) => <div className={`toast ${item.kind}`} key={item.id}>{item.kind === "error" ? <AlertTriangle /> : item.kind === "success" ? <CheckCircle2 /> : <Sparkles />}<div><strong>{item.title}</strong><span>{item.message}</span></div><button onClick={() => setToasts((current) => current.filter((toast) => toast.id !== item.id))}><X /></button></div>)}</div>
  </div>;
}
