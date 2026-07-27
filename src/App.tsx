import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, DragEvent, ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  Clock,
  Database,
  Download,
  FileText,
  GitCompare,
  Info,
  LayoutDashboard,
  Menu,
  Plus,
  Save,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  X
} from "lucide-react";
import { demoJobs } from "./data/demoJobs";
import {
  buildComparisons,
  checkDuplicates,
  createJob,
  formatStatus,
  normalizeTitle,
  parseJobText
} from "./lib/jobs";
import { extractSourceFromFile, extractSourceFromText } from "./lib/pdf";
import {
  buildExportPayload,
  downloadJson,
  loadJobs,
  parseImportFile,
  saveJobs
} from "./lib/storage";
import type {
  DuplicateCheck,
  JobComparison,
  JobReq,
  JobStatus,
  ParsedJob
} from "./types";

type View = "overview" | "jobs" | "comparisons";
type ModalStep = "source" | "review" | "decision";

type Draft = {
  parsed: ParsedJob;
  sourceFileName: string;
  sourceHash: string;
  duplicateCheck: DuplicateCheck;
  status: JobStatus;
  decisionReason: string;
  notes: string;
};

type Toast = {
  id: number;
  title: string;
  message: string;
  kind: "success" | "error" | "info";
};

const STATUS_META: Record<
  JobStatus,
  { label: string; description: string; className: string }
> = {
  NEW: {
    label: "New",
    description: "Uploaded and waiting for a decision.",
    className: "status-new"
  },
  PURSUING: {
    label: "Pursuing",
    description: "A role you plan to actively pursue.",
    className: "status-pursuing"
  },
  MAYBE: {
    label: "Maybe",
    description: "Keep it open while you gather more information.",
    className: "status-maybe"
  },
  NOT_PURSUING: {
    label: "Not pursuing",
    description: "Reviewed and intentionally passed.",
    className: "status-not-pursuing"
  },
  APPLIED: {
    label: "Applied",
    description: "Your application has been submitted.",
    className: "status-applied"
  }
};

const STATUS_OPTIONS = Object.keys(STATUS_META) as JobStatus[];

function formatDate(value: string): string {
  if (!value) return "Not specified";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function relativeDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const delta = Date.now() - date.getTime();
  const days = Math.max(0, Math.floor(delta / 86400000));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  return formatDate(value);
}

function statusClass(status: JobStatus): string {
  return STATUS_META[status].className;
}

function scoreClass(score: number): string {
  if (score >= 85) return "score-high";
  if (score >= 65) return "score-medium";
  return "score-low";
}

function comparisonLabel(type: JobComparison["type"]): string {
  if (type === "POSSIBLE_DUPLICATE") return "Possible duplicate";
  if (type === "HIGHLY_SIMILAR") return "Highly similar";
  if (type === "RELATED") return "Related req";
  return "Low similarity";
}

function AppVersion({ compact = false }: { compact?: boolean }) {
  const buildDate = new Date(__BUILD_DATE__);
  const buildLabel = Number.isNaN(buildDate.getTime())
    ? __BUILD_DATE__
    : buildDate.toLocaleString();

  return (
    <div
      className={`app-version ${compact ? "compact" : ""}`}
      title={`ReqRadar v${__APP_VERSION__} — build generated ${buildLabel}`}
      aria-label={`ReqRadar version ${__APP_VERSION__}`}
    >
      <span className="version-dot" />
      <span>ReqRadar v{__APP_VERSION__}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: JobStatus }) {
  return <span className={`status-badge ${statusClass(status)}`}>{formatStatus(status)}</span>;
}

function EmptyState({
  icon,
  title,
  description,
  action
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
  icon,
  tone
}: {
  label: string;
  value: number;
  detail: string;
  icon: ReactNode;
  tone: string;
}) {
  return (
    <article className={`stat-card ${tone}`}>
      <div className="stat-head">
        <span>{label}</span>
        <span className="stat-icon">{icon}</span>
      </div>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function JobTable({
  jobs,
  onOpen,
  onStatusChange,
  compact = false
}: {
  jobs: JobReq[];
  onOpen: (id: string) => void;
  onStatusChange: (id: string, status: JobStatus) => void;
  compact?: boolean;
}) {
  if (!jobs.length) {
    return (
      <EmptyState
        icon={<Briefcase size={24} />}
        title="No requisitions found"
        description="Upload a job posting or adjust your filters."
      />
    );
  }

  return (
    <div className="table-scroll">
      <table className="job-table">
        <thead>
          <tr>
            <th>Position</th>
            <th>Team</th>
            {!compact && <th>Location</th>}
            <th>Decision</th>
            <th>Added</th>
            <th aria-label="Open" />
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id}>
              <td>
                <button className="job-title-button" onClick={() => onOpen(job.id)}>
                  <span>{job.title}</span>
                  <small>
                    {job.jobId || "No Job ID"}
                    {job.isDemo ? <span className="demo-tag">Demo</span> : null}
                  </small>
                </button>
              </td>
              <td>
                <span className="table-primary">{job.team || job.category || "Not specified"}</span>
                <small>{job.hiringManager || "Hiring manager not specified"}</small>
              </td>
              {!compact && (
                <td>
                  <span className="table-primary">
                    {job.locations.length ? job.locations.join("; ") : "Not specified"}
                  </span>
                  <small>{job.seniority}</small>
                </td>
              )}
              <td>
                <select
                  className={`status-select ${statusClass(job.status)}`}
                  value={job.status}
                  onChange={(event) =>
                    onStatusChange(job.id, event.target.value as JobStatus)
                  }
                  aria-label={`Decision status for ${job.title}`}
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {STATUS_META[status].label}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <span className="table-primary">{relativeDate(job.createdAt)}</span>
                <small>{job.datePosted ? `Posted ${job.datePosted}` : "Posting date unavailable"}</small>
              </td>
              <td>
                <button className="icon-button" onClick={() => onOpen(job.id)} aria-label="Open requisition">
                  <ChevronRight size={18} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function App() {
  const [jobs, setJobs] = useState<JobReq[]>(() => loadJobs());
  const [view, setView] = useState<View>("overview");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | JobStatus>("ALL");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<ModalStep>("source");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    saveJobs(jobs);
  }, [jobs]);

  const comparisons = useMemo(() => buildComparisons(jobs), [jobs]);
  const jobById = useMemo(() => new Map(jobs.map((job) => [job.id, job])), [jobs]);
  const selectedJob = selectedJobId ? jobById.get(selectedJobId) || null : null;

  const filteredJobs = useMemo(() => {
    const term = search.trim().toLowerCase();
    return jobs
      .filter((job) => statusFilter === "ALL" || job.status === statusFilter)
      .filter((job) => {
        if (!term) return true;
        return [
          job.title,
          job.jobId,
          job.category,
          job.team,
          job.hiringManager,
          job.recruiter,
          job.locations.join(" "),
          job.skills.join(" ")
        ]
          .join(" ")
          .toLowerCase()
          .includes(term);
      })
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }, [jobs, search, statusFilter]);

  const stats = useMemo(
    () => ({
      total: jobs.length,
      pursuing: jobs.filter((job) => job.status === "PURSUING").length,
      needsDecision: jobs.filter((job) => job.status === "NEW" || job.status === "MAYBE").length,
      applied: jobs.filter((job) => job.status === "APPLIED").length,
      duplicateAlerts: comparisons.filter((comparison) => comparison.type === "POSSIBLE_DUPLICATE").length
    }),
    [jobs, comparisons]
  );

  const topSkills = useMemo(() => {
    const counts = new Map<string, number>();
    jobs.forEach((job) =>
      job.skills.forEach((skill) => counts.set(skill, (counts.get(skill) || 0) + 1))
    );
    return [...counts.entries()].sort((left, right) => right[1] - left[1]).slice(0, 5);
  }, [jobs]);

  const pageCopy: Record<View, { title: string; subtitle: string }> = {
    overview: {
      title: "Recruiting overview",
      subtitle: "Track decisions, catch duplicates, and compare open requisitions."
    },
    jobs: {
      title: "Job requisitions",
      subtitle: "Search, filter, and update the roles in your personal pipeline."
    },
    comparisons: {
      title: "Req comparisons",
      subtitle: "See possible duplicates and related opportunities across your portfolio."
    }
  };

  function showToast(title: string, message: string, kind: Toast["kind"] = "success") {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((current) => [...current, { id, title, message, kind }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4400);
  }

  function changeView(next: View) {
    setView(next);
    setSidebarOpen(false);
  }

  function resetModal() {
    setModalOpen(false);
    setModalStep("source");
    setSelectedFile(null);
    setPastedText("");
    setDraft(null);
    setBusy(false);
    setModalError("");
    setDragActive(false);
  }

  function openUpload() {
    setModalOpen(true);
    setModalStep("source");
    setModalError("");
  }

  function chooseFile(file: File | null) {
    if (!file) return;
    setSelectedFile(file);
    setPastedText("");
    setModalError("");
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    chooseFile(event.dataTransfer.files?.[0] || null);
  }

  async function analyzeSource() {
    setModalError("");
    setBusy(true);
    try {
      const source = selectedFile
        ? await extractSourceFromFile(selectedFile)
        : await extractSourceFromText(pastedText);
      const parsed = parseJobText(source.text);
      const duplicateCheck = checkDuplicates(parsed, source.hash, jobs);
      setDraft({
        parsed,
        sourceFileName: source.fileName,
        sourceHash: source.hash,
        duplicateCheck,
        status: "NEW",
        decisionReason: "",
        notes: ""
      });
      setModalStep("review");
    } catch (error) {
      setModalError(error instanceof Error ? error.message : "The job posting could not be analyzed.");
    } finally {
      setBusy(false);
    }
  }

  function updateParsed<K extends keyof ParsedJob>(key: K, value: ParsedJob[K]) {
    setDraft((current) =>
      current
        ? {
            ...current,
            parsed: {
              ...current.parsed,
              [key]: value,
              ...(key === "title" ? { normalizedTitle: normalizeTitle(String(value)) } : {})
            }
          }
        : current
    );
  }

  function moveToDecision() {
    if (!draft) return;
    const duplicateCheck = checkDuplicates(draft.parsed, draft.sourceHash, jobs);
    setDraft({ ...draft, duplicateCheck });
    if (duplicateCheck.exactMatch) {
      setModalError("This requisition is already in ReqRadar. Open the existing record instead.");
      return;
    }
    if (!draft.parsed.title.trim()) {
      setModalError("Add a job title before continuing.");
      return;
    }
    setModalError("");
    setModalStep("decision");
  }

  function saveDraft() {
    if (!draft) return;
    const duplicateCheck = checkDuplicates(draft.parsed, draft.sourceHash, jobs);
    if (duplicateCheck.exactMatch) {
      setModalStep("review");
      setDraft({ ...draft, duplicateCheck });
      setModalError("This requisition is already in ReqRadar and was not saved again.");
      return;
    }

    const job = createJob(
      draft.parsed,
      draft.status,
      draft.decisionReason,
      draft.notes,
      draft.sourceFileName,
      draft.sourceHash
    );
    setJobs((current) => [job, ...current]);
    resetModal();
    setSelectedJobId(job.id);
    showToast("Job req saved", `${job.title} was added to your workspace.`);
  }

  function updateJob(id: string, changes: Partial<JobReq>) {
    setJobs((current) =>
      current.map((job) =>
        job.id === id ? { ...job, ...changes, updatedAt: new Date().toISOString() } : job
      )
    );
  }

  function changeJobStatus(id: string, status: JobStatus) {
    const job = jobs.find((candidate) => candidate.id === id);
    if (!job || job.status === status) return;

    updateJob(id, { status });
    showToast(
      "Status updated",
      `${job.title} is now ${STATUS_META[status].label}.`,
      "success"
    );
  }

  function deleteJob(job: JobReq) {
    if (!window.confirm(`Delete "${job.title}" from ReqRadar?`)) return;
    setJobs((current) => current.filter((candidate) => candidate.id !== job.id));
    setSelectedJobId(null);
    showToast("Job req deleted", "The requisition was removed from this browser.", "info");
  }

  function loadDemoPortfolio() {
    const existingIds = new Set(jobs.map((job) => job.id));
    const additions = demoJobs.filter((job) => !existingIds.has(job.id));
    if (!additions.length) {
      showToast("Demo already loaded", "The fictional demo portfolio is already available.", "info");
      return;
    }
    setJobs((current) => [...additions, ...current]);
    showToast("Demo portfolio loaded", `${additions.length} fictional requisitions were added.`);
  }

  function removeDemoPortfolio() {
    const demoCount = jobs.filter((job) => job.isDemo).length;
    if (!demoCount) return;
    setJobs((current) => current.filter((job) => !job.isDemo));
    if (selectedJob?.isDemo) setSelectedJobId(null);
    showToast("Demo data removed", `${demoCount} fictional requisitions were removed.`, "info");
  }

  function exportJobs() {
    downloadJson(
      `req-radar-backup-${new Date().toISOString().slice(0, 10)}.json`,
      buildExportPayload(jobs)
    );
    showToast("Backup downloaded", "Keep the JSON file somewhere safe.");
  }

  async function importJobs(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const imported = parseImportFile(await file.text());
      setJobs((current) => {
        const currentById = new Map(current.map((job) => [job.id, job]));
        imported.forEach((job) => currentById.set(job.id, job));
        return [...currentById.values()].sort((left, right) =>
          right.createdAt.localeCompare(left.createdAt)
        );
      });
      showToast("Backup imported", `${imported.length} requisitions were read from the file.`);
    } catch (error) {
      showToast(
        "Import failed",
        error instanceof Error ? error.message : "The backup file could not be imported.",
        "error"
      );
    }
  }

  function clearWorkspace() {
    if (!jobs.length) return;
    if (!window.confirm("Delete every requisition stored in this browser? Export a backup first if needed.")) {
      return;
    }
    setJobs([]);
    setSelectedJobId(null);
    showToast("Workspace cleared", "All local ReqRadar data was removed.", "info");
  }

  function openExistingFromDuplicate() {
    const existingId = draft?.duplicateCheck.exactMatch?.id;
    if (!existingId) return;
    resetModal();
    setSelectedJobId(existingId);
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "is-open" : ""}`}>
        <div className="brand-row">
          <button className="icon-button mobile-only" onClick={() => setSidebarOpen(false)} aria-label="Close navigation">
            <X size={19} />
          </button>
          <div className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div>
            <div className="brand-name">ReqRadar</div>
            <div className="brand-subtitle">Recruiting workspace</div>
          </div>
        </div>

        <nav className="main-nav" aria-label="Main navigation">
          <button className={view === "overview" ? "nav-item active" : "nav-item"} onClick={() => changeView("overview")}>
            <LayoutDashboard size={18} />
            <span>Overview</span>
          </button>
          <button className={view === "jobs" ? "nav-item active" : "nav-item"} onClick={() => changeView("jobs")}>
            <Briefcase size={18} />
            <span>Job reqs</span>
            <span className="nav-count">{jobs.length}</span>
          </button>
          <button className={view === "comparisons" ? "nav-item active" : "nav-item"} onClick={() => changeView("comparisons")}>
            <GitCompare size={18} />
            <span>Comparisons</span>
            {comparisons.length ? <span className="nav-count">{comparisons.length}</span> : null}
          </button>
        </nav>

        <div className="sidebar-spacer" />

        <div className="privacy-card">
          <ShieldCheck size={20} />
          <div>
            <strong>Browser-only workspace</strong>
            <p>Files are parsed locally. Req data stays in this browser unless you export it.</p>
          </div>
        </div>

        <div className="sidebar-tools">
          <button onClick={loadDemoPortfolio}>
            <Sparkles size={15} /> Load demo portfolio
          </button>
          {jobs.some((job) => job.isDemo) ? (
            <button onClick={removeDemoPortfolio}>
              <Trash2 size={15} /> Remove demo data
            </button>
          ) : null}
          <button onClick={exportJobs} disabled={!jobs.length}>
            <Download size={15} /> Export backup
          </button>
          <button onClick={() => importInputRef.current?.click()}>
            <Upload size={15} /> Import backup
          </button>
        </div>

        <AppVersion />
      </aside>

      {sidebarOpen ? <button className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-label="Close navigation" /> : null}

      <div className="page-area">
        <header className="topbar">
          <div className="topbar-title">
            <button className="icon-button mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Open navigation">
              <Menu size={20} />
            </button>
            <div>
              <h1>{pageCopy[view].title}</h1>
              <p>{pageCopy[view].subtitle}</p>
            </div>
          </div>
          <div className="topbar-actions">
            <AppVersion compact />
            <label className="search-box">
              <Search size={17} />
              <input
                type="search"
                placeholder="Search reqs"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <button className="primary-button" onClick={openUpload}>
              <Plus size={17} /> Add job req
            </button>
          </div>
        </header>

        <main className="content">
          {view === "overview" ? (
            <>
              <section className="stats-grid">
                <StatCard label="Total reqs" value={stats.total} detail="Stored in this browser" icon={<Briefcase size={18} />} tone="tone-blue" />
                <StatCard label="Pursuing" value={stats.pursuing} detail="Active opportunities" icon={<ArrowRight size={18} />} tone="tone-green" />
                <StatCard label="Needs decision" value={stats.needsDecision} detail="New or maybe" icon={<Clock size={18} />} tone="tone-amber" />
                <StatCard label="Applied" value={stats.applied} detail="Applications submitted" icon={<Send size={18} />} tone="tone-purple" />
              </section>

              <section className="dashboard-grid">
                <article className="panel main-panel">
                  <div className="panel-header">
                    <div>
                      <h2>Recent requisitions</h2>
                      <p>Update your decision directly from the list.</p>
                    </div>
                    <button className="secondary-button" onClick={() => changeView("jobs")}>View all</button>
                  </div>
                  {jobs.length ? (
                    <JobTable
                      jobs={filteredJobs.slice(0, 6)}
                      onOpen={setSelectedJobId}
                      onStatusChange={changeJobStatus}
                      compact
                    />
                  ) : (
                    <EmptyState
                      icon={<Upload size={25} />}
                      title="Upload your first job requisition"
                      description="ReqRadar will extract its key fields, check for duplicates, and compare it with your portfolio."
                      action={<button className="primary-button" onClick={openUpload}><Plus size={17} /> Add job req</button>}
                    />
                  )}
                </article>

                <aside className="panel insight-panel">
                  <div className="panel-header compact-header">
                    <div>
                      <span className="eyebrow">Portfolio intelligence</span>
                      <h2>What needs attention</h2>
                    </div>
                  </div>

                  <div className={`insight-callout ${stats.duplicateAlerts ? "warning" : "success"}`}>
                    {stats.duplicateAlerts ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
                    <div>
                      <strong>
                        {stats.duplicateAlerts
                          ? `${stats.duplicateAlerts} possible duplicate${stats.duplicateAlerts === 1 ? "" : "s"}`
                          : "No duplicate alerts"}
                      </strong>
                      <p>
                        {stats.duplicateAlerts
                          ? "Review the highest-similarity pairs before pursuing both."
                          : "Req IDs, file hashes, titles, skills, and context are being checked."}
                      </p>
                    </div>
                  </div>

                  <div className="insight-section">
                    <h3>Most common skills</h3>
                    {topSkills.length ? (
                      <div className="skill-frequency-list">
                        {topSkills.map(([skill, count]) => (
                          <div key={skill}>
                            <span>{skill}</span>
                            <strong>{count}</strong>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="muted-copy">Skill demand will appear after you add requisitions.</p>
                    )}
                  </div>

                  <button className="comparison-link" onClick={() => changeView("comparisons")}>
                    Review comparisons <ArrowRight size={16} />
                  </button>
                </aside>
              </section>
            </>
          ) : null}

          {view === "jobs" ? (
            <section className="panel">
              <div className="panel-header jobs-header">
                <div>
                  <h2>All job requisitions</h2>
                  <p>{filteredJobs.length} of {jobs.length} visible</p>
                </div>
                <div className="filter-actions">
                  <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "ALL" | JobStatus)}>
                    <option value="ALL">All statuses</option>
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>{STATUS_META[status].label}</option>
                    ))}
                  </select>
                  <button className="secondary-button" onClick={openUpload}><Plus size={16} /> Add req</button>
                </div>
              </div>
              <JobTable
                jobs={filteredJobs}
                onOpen={setSelectedJobId}
                onStatusChange={changeJobStatus}
              />
              {jobs.length ? (
                <div className="panel-footer-actions">
                  <button className="danger-button" onClick={clearWorkspace}><Trash2 size={15} /> Clear local workspace</button>
                </div>
              ) : null}
            </section>
          ) : null}

          {view === "comparisons" ? (
            <section className="comparison-page">
              {comparisons.length ? (
                comparisons.map((comparison) => {
                  const source = jobById.get(comparison.sourceJobId);
                  const target = jobById.get(comparison.targetJobId);
                  if (!source || !target) return null;
                  return (
                    <article className="comparison-card" key={`${source.id}-${target.id}`}>
                      <div className="comparison-score-column">
                        <div className={`score-ring ${scoreClass(comparison.score)}`}>
                          <strong>{comparison.score}%</strong>
                          <span>similar</span>
                        </div>
                        <span className={`comparison-type ${comparison.type.toLowerCase()}`}>
                          {comparisonLabel(comparison.type)}
                        </span>
                      </div>
                      <div className="comparison-body">
                        <div className="comparison-titles">
                          <button onClick={() => setSelectedJobId(source.id)}>
                            <small>{source.jobId || "No Job ID"}</small>
                            <strong>{source.title}</strong>
                            <span>{source.team || source.category || "Team not specified"}</span>
                          </button>
                          <GitCompare size={22} />
                          <button onClick={() => setSelectedJobId(target.id)}>
                            <small>{target.jobId || "No Job ID"}</small>
                            <strong>{target.title}</strong>
                            <span>{target.team || target.category || "Team not specified"}</span>
                          </button>
                        </div>
                        <div className="score-breakdown">
                          <span>Title <strong>{comparison.titleScore}%</strong></span>
                          <span>Skills <strong>{comparison.skillScore}%</strong></span>
                          <span>Context <strong>{comparison.contextScore}%</strong></span>
                        </div>
                        {comparison.sharedSkills.length ? (
                          <div className="shared-skills">
                            <span>Shared skills</span>
                            <div className="tag-list">
                              {comparison.sharedSkills.slice(0, 8).map((skill) => <span className="tag" key={skill}>{skill}</span>)}
                            </div>
                          </div>
                        ) : null}
                        <div className="comparison-reasons">
                          {comparison.reasons.map((reason) => <span key={reason}><CheckCircle2 size={14} /> {reason}</span>)}
                        </div>
                      </div>
                    </article>
                  );
                })
              ) : (
                <section className="panel">
                  <EmptyState
                    icon={<GitCompare size={26} />}
                    title="No meaningful comparisons yet"
                    description="Add at least two related requisitions. ReqRadar only shows pairs with a similarity score of 50% or higher."
                    action={<button className="primary-button" onClick={openUpload}><Plus size={17} /> Add job req</button>}
                  />
                </section>
              )}
            </section>
          ) : null}
        </main>
      </div>

      <input ref={importInputRef} type="file" accept="application/json,.json" hidden onChange={importJobs} />

      {modalOpen ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.currentTarget === event.target && !busy) resetModal();
        }}>
          <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="upload-title">
            <header className="modal-header">
              <div>
                <span className="eyebrow">New requisition</span>
                <h2 id="upload-title">
                  {modalStep === "source" ? "Add a job req" : modalStep === "review" ? "Review the analysis" : "Choose your decision"}
                </h2>
              </div>
              <button className="icon-button" onClick={resetModal} disabled={busy} aria-label="Close"><X size={20} /></button>
            </header>

            <div className="stepper" aria-label="Upload progress">
              {[
                ["source", "1", "Upload"],
                ["review", "2", "Review"],
                ["decision", "3", "Decision"]
              ].map(([step, number, label], index) => (
                <div className="stepper-fragment" key={step}>
                  {index ? <span className={`step-line ${modalStep === "decision" || (modalStep === "review" && index === 1) ? "complete" : ""}`} /> : null}
                  <div className={`step ${modalStep === step ? "active" : (step === "source" || (step === "review" && modalStep === "decision")) ? "complete" : ""}`}>
                    <span>{number}</span>
                    <strong>{label}</strong>
                  </div>
                </div>
              ))}
            </div>

            <div className="modal-body">
              {modalError ? <div className="error-banner"><AlertTriangle size={18} /><span>{modalError}</span></div> : null}

              {modalStep === "source" ? (
                <div className="source-step">
                  <div
                    className={`drop-zone ${dragActive ? "drag-active" : ""} ${selectedFile ? "has-file" : ""}`}
                    onDragOver={(event) => { event.preventDefault(); setDragActive(true); }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={handleDrop}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf,text/plain,.pdf,.txt"
                      hidden
                      onChange={(event) => chooseFile(event.target.files?.[0] || null)}
                    />
                    {selectedFile ? (
                      <>
                        <div className="drop-icon success"><FileText size={24} /></div>
                        <h3>{selectedFile.name}</h3>
                        <p>{Math.max(1, Math.round(selectedFile.size / 1024))} KB selected</p>
                        <button className="text-button" onClick={() => fileInputRef.current?.click()}>Choose another file</button>
                      </>
                    ) : (
                      <>
                        <div className="drop-icon"><Upload size={25} /></div>
                        <h3>Drop a PDF or TXT file here</h3>
                        <p>Or choose a file from this device. Maximum size: 18 MB.</p>
                        <button className="secondary-button" onClick={() => fileInputRef.current?.click()}>Choose file</button>
                      </>
                    )}
                  </div>

                  <div className="or-divider"><span>or paste the posting</span></div>

                  <label className="field-label">
                    <span>Job description text</span>
                    <textarea
                      rows={8}
                      placeholder="Paste the complete job posting here..."
                      value={pastedText}
                      onChange={(event) => { setPastedText(event.target.value); if (event.target.value) setSelectedFile(null); }}
                    />
                  </label>

                  <div className="local-note"><ShieldCheck size={17} /><span>The document is parsed in your browser and is not sent to a server.</span></div>
                </div>
              ) : null}

              {modalStep === "review" && draft ? (
                <div className="review-step">
                  {draft.duplicateCheck.exactMatch ? (
                    <div className="duplicate-alert exact">
                      <div className="duplicate-icon"><AlertTriangle size={22} /></div>
                      <div>
                        <span className="eyebrow">Exact duplicate found</span>
                        <h3>This requisition is already in ReqRadar</h3>
                        <p>
                          Matched by {draft.duplicateCheck.exactReason === "JOB_ID" ? "Job ID" : "the uploaded file"}:
                          <strong> {draft.duplicateCheck.exactMatch.title}</strong>
                        </p>
                        <button className="secondary-button" onClick={openExistingFromDuplicate}>Open existing req <ArrowRight size={16} /></button>
                      </div>
                    </div>
                  ) : (
                    <div className="duplicate-alert clear">
                      <div className="duplicate-icon"><CheckCircle2 size={22} /></div>
                      <div>
                        <span className="eyebrow">Duplicate check complete</span>
                        <h3>No exact duplicate found</h3>
                        <p>Job ID and source-file fingerprint are unique in this browser.</p>
                      </div>
                    </div>
                  )}

                  <div className="review-summary">
                    <div><strong>{draft.parsed.skills.length}</strong><span>Skills detected</span></div>
                    <div><strong>{draft.parsed.responsibilities.length}</strong><span>Responsibilities</span></div>
                    <div><strong>{draft.parsed.qualifications.length}</strong><span>Qualifications</span></div>
                  </div>

                  <div className="form-grid">
                    <label className="field-label span-2"><span>Job title</span><input value={draft.parsed.title} onChange={(event) => updateParsed("title", event.target.value)} /></label>
                    <label className="field-label"><span>Job ID</span><input value={draft.parsed.jobId} onChange={(event) => updateParsed("jobId", event.target.value)} placeholder="Example: 12345" /></label>
                    <label className="field-label"><span>Seniority</span><input value={draft.parsed.seniority} onChange={(event) => updateParsed("seniority", event.target.value)} /></label>
                    <label className="field-label"><span>Category</span><input value={draft.parsed.category} onChange={(event) => updateParsed("category", event.target.value)} /></label>
                    <label className="field-label"><span>Team</span><input value={draft.parsed.team} onChange={(event) => updateParsed("team", event.target.value)} /></label>
                    <label className="field-label"><span>Hiring manager</span><input value={draft.parsed.hiringManager} onChange={(event) => updateParsed("hiringManager", event.target.value)} /></label>
                    <label className="field-label"><span>Recruiter</span><input value={draft.parsed.recruiter} onChange={(event) => updateParsed("recruiter", event.target.value)} /></label>
                    <label className="field-label"><span>Date posted</span><input value={draft.parsed.datePosted} onChange={(event) => updateParsed("datePosted", event.target.value)} /></label>
                    <label className="field-label"><span>Minimum years</span><input type="number" min="0" max="50" value={draft.parsed.minYears ?? ""} onChange={(event) => updateParsed("minYears", event.target.value ? Number(event.target.value) : null)} /></label>
                    <label className="field-label span-2"><span>Locations, separated by semicolons</span><input value={draft.parsed.locations.join("; ")} onChange={(event) => updateParsed("locations", event.target.value.split(";").map((value) => value.trim()).filter(Boolean))} /></label>
                    <label className="field-label span-2"><span>Skills, separated by commas</span><textarea rows={3} value={draft.parsed.skills.join(", ")} onChange={(event) => updateParsed("skills", event.target.value.split(",").map((value) => value.trim()).filter(Boolean))} /></label>
                  </div>

                  {draft.duplicateCheck.comparisons.length ? (
                    <div className="similar-section">
                      <div className="section-heading"><div><span className="eyebrow">Portfolio comparison</span><h3>Related reqs already in your tracker</h3></div></div>
                      <div className="mini-comparison-list">
                        {draft.duplicateCheck.comparisons.slice(0, 3).map((comparison) => {
                          const target = jobById.get(comparison.targetJobId);
                          if (!target) return null;
                          return (
                            <button key={target.id} onClick={() => { resetModal(); setSelectedJobId(target.id); }}>
                              <span className={`mini-score ${scoreClass(comparison.score)}`}>{comparison.score}%</span>
                              <span><strong>{target.title}</strong><small>{comparisonLabel(comparison.type)} - {comparison.sharedSkills.length} shared skills</small></span>
                              <ChevronRight size={17} />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {modalStep === "decision" && draft ? (
                <div className="decision-step">
                  <div className="decision-intro">
                    <span className="eyebrow">{draft.parsed.jobId || "New req"}</span>
                    <h3>{draft.parsed.title}</h3>
                    <p>Choose the status that best reflects what you plan to do next.</p>
                  </div>
                  <div className="status-card-grid">
                    {STATUS_OPTIONS.map((status) => (
                      <button
                        key={status}
                        className={`status-choice ${draft.status === status ? "selected" : ""} ${statusClass(status)}`}
                        onClick={() => setDraft({ ...draft, status })}
                      >
                        <span className="status-choice-dot" />
                        <strong>{STATUS_META[status].label}</strong>
                        <small>{STATUS_META[status].description}</small>
                      </button>
                    ))}
                  </div>
                  <label className="field-label"><span>Decision reason (optional)</span><input value={draft.decisionReason} onChange={(event) => setDraft({ ...draft, decisionReason: event.target.value })} placeholder="Example: Strong skills match" /></label>
                  <label className="field-label"><span>Personal notes (optional)</span><textarea rows={5} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="Contacts, questions, next actions, or application notes..." /></label>
                </div>
              ) : null}
            </div>

            <footer className="modal-footer">
              {modalStep === "source" ? (
                <>
                  <button className="secondary-button" onClick={resetModal} disabled={busy}>Cancel</button>
                  <button className="primary-button" onClick={analyzeSource} disabled={busy || (!selectedFile && pastedText.trim().length < 40)}>
                    {busy ? <span className="spinner" /> : <Sparkles size={17} />}
                    {busy ? "Analyzing..." : "Analyze job req"}
                  </button>
                </>
              ) : null}
              {modalStep === "review" ? (
                <>
                  <button className="secondary-button" onClick={() => { setModalStep("source"); setModalError(""); }}>Back</button>
                  <button className="primary-button" onClick={moveToDecision} disabled={Boolean(draft?.duplicateCheck.exactMatch)}>Continue <ArrowRight size={17} /></button>
                </>
              ) : null}
              {modalStep === "decision" ? (
                <>
                  <button className="secondary-button" onClick={() => { setModalStep("review"); setModalError(""); }}>Back</button>
                  <button className="primary-button" onClick={saveDraft}><Save size={17} /> Save job req</button>
                </>
              ) : null}
            </footer>
          </section>
        </div>
      ) : null}

      {selectedJob ? (
        <>
          <button className="drawer-backdrop" onClick={() => setSelectedJobId(null)} aria-label="Close requisition details" />
          <aside className="detail-drawer" aria-label="Requisition details">
            <header className="drawer-header">
              <div>
                <span className="eyebrow">{selectedJob.jobId || "No Job ID"}{selectedJob.isDemo ? " - demo" : ""}</span>
                <h2>{selectedJob.title}</h2>
              </div>
              <button className="icon-button" onClick={() => setSelectedJobId(null)} aria-label="Close"><X size={20} /></button>
            </header>

            <div className="drawer-body">
              <section className="drawer-decision-card">
                <label className="field-label"><span>Your decision</span>
                  <select className={`status-select large ${statusClass(selectedJob.status)}`} value={selectedJob.status} onChange={(event) => changeJobStatus(selectedJob.id, event.target.value as JobStatus)}>
                    {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{STATUS_META[status].label}</option>)}
                  </select>
                </label>
                <label className="field-label"><span>Decision reason</span><input value={selectedJob.decisionReason} onChange={(event) => updateJob(selectedJob.id, { decisionReason: event.target.value })} placeholder="Why are you pursuing or passing?" /></label>
              </section>

              <section className="detail-section">
                <h3>Req details</h3>
                <dl className="detail-grid">
                  <div><dt>Category</dt><dd>{selectedJob.category || "Not specified"}</dd></div>
                  <div><dt>Team</dt><dd>{selectedJob.team || "Not specified"}</dd></div>
                  <div><dt>Hiring manager</dt><dd>{selectedJob.hiringManager || "Not specified"}</dd></div>
                  <div><dt>Recruiter</dt><dd>{selectedJob.recruiter || "Not specified"}</dd></div>
                  <div><dt>Location</dt><dd>{selectedJob.locations.length ? selectedJob.locations.join("; ") : "Not specified"}</dd></div>
                  <div><dt>Seniority</dt><dd>{selectedJob.seniority || "Not specified"}</dd></div>
                  <div><dt>Date posted</dt><dd>{selectedJob.datePosted || "Not specified"}</dd></div>
                  <div><dt>Experience</dt><dd>{selectedJob.minYears === null ? "Not specified" : `${selectedJob.minYears}+ years`}</dd></div>
                  <div><dt>Source</dt><dd>{selectedJob.sourceFileName || "Pasted text"}</dd></div>
                  <div><dt>Added</dt><dd>{formatDate(selectedJob.createdAt)}</dd></div>
                </dl>
              </section>

              <section className="detail-section">
                <h3>Skills</h3>
                {selectedJob.skills.length ? <div className="tag-list">{selectedJob.skills.map((skill) => <span className="tag" key={skill}>{skill}</span>)}</div> : <p className="muted-copy">No skills were detected.</p>}
              </section>

              {selectedJob.responsibilities.length ? (
                <section className="detail-section"><h3>Responsibilities</h3><ul className="detail-list">{selectedJob.responsibilities.map((item) => <li key={item}>{item}</li>)}</ul></section>
              ) : null}

              {selectedJob.qualifications.length ? (
                <section className="detail-section"><h3>Qualifications</h3><ul className="detail-list">{selectedJob.qualifications.map((item) => <li key={item}>{item}</li>)}</ul></section>
              ) : null}

              <section className="detail-section">
                <label className="field-label"><span>Personal notes</span><textarea rows={7} value={selectedJob.notes} onChange={(event) => updateJob(selectedJob.id, { notes: event.target.value })} placeholder="Contacts, next steps, interview preparation, or application notes..." /></label>
              </section>

              <section className="browser-data-note"><Database size={17} /><span>This record is stored in localStorage for this browser profile.</span></section>
            </div>

            <footer className="drawer-footer">
              <button className="danger-button" onClick={() => deleteJob(selectedJob)}><Trash2 size={16} /> Delete req</button>
              <button className="primary-button" onClick={() => { setSelectedJobId(null); showToast("Changes saved", "ReqRadar saves local changes automatically."); }}><CheckCircle2 size={16} /> Done</button>
            </footer>
          </aside>
        </>
      ) : null}

      <div className="toast-region" aria-live="polite">
        {toasts.map((toast) => (
          <div className={`toast ${toast.kind}`} key={toast.id}>
            {toast.kind === "error" ? <AlertTriangle size={18} /> : toast.kind === "info" ? <Info size={18} /> : <CheckCircle2 size={18} />}
            <div><strong>{toast.title}</strong><span>{toast.message}</span></div>
            <button onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))} aria-label="Dismiss"><X size={16} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
