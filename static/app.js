"use strict";

const STATUS = {
  NEW: {
    label: "New",
    className: "status-new",
    description: "Uploaded, not reviewed yet.",
  },
  PURSUING: {
    label: "Pursuing",
    className: "status-pursuing",
    description: "A role you plan to pursue.",
  },
  MAYBE: {
    label: "Maybe",
    className: "status-maybe",
    description: "Keep it open while you learn more.",
  },
  NOT_PURSUING: {
    label: "Not pursuing",
    className: "status-not-pursuing",
    description: "Reviewed and intentionally passed.",
  },
  APPLIED: {
    label: "Applied",
    className: "status-applied",
    description: "Application has been submitted.",
  },
};

const ICONS = {
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>',
  upload: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4m-5 5l5-5 5 5M5 14v5h14v-5"></path></svg>',
  file: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l4 4v14H7zM14 3v5h5"></path></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"></path></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l4 4L19 6"></path></svg>',
  alert: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4l9 16H3L12 4zM12 9v5m0 3h.01"></path></svg>',
  duplicate: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2"></rect><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2"></path></svg>',
  briefcase: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5V3h6v2m-9 0h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2zm-2 6h16"></path></svg>',
  target: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"></circle><circle cx="12" cy="12" r="3"></circle><path d="M18 6l3-3m-4 4l4-4"></path></svg>',
  clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>',
  send: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 3L9 15M21 3l-7 18-5-6-6-5 18-7z"></path></svg>',
  shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l8 4v5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V7l8-4zM9 12l2 2 4-5"></path></svg>',
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-5-5l5 5-5 5"></path></svg>',
  chevron: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"></path></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-4-4"></path></svg>',
  trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m3 0l-1 14H7L6 7m4 4v6m4-6v6"></path></svg>',
  external: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 13v6a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h6"></path></svg>',
  note: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v16H5zM8 8h8m-8 4h8m-8 4h5"></path></svg>',
  info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 11v5m0-8h.01"></path></svg>',
  eye: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z"></path><circle cx="12" cy="12" r="2.5"></circle></svg>',
  question: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M9.7 9a2.5 2.5 0 114.4 1.6c-.9.8-2.1 1.2-2.1 2.7m0 3.2h.01"></path></svg>',
  stop: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M8 8l8 8"></path></svg>',
};

const state = {
  jobs: [],
  stats: {
    total: 0,
    pursuing: 0,
    needs_decision: 0,
    applied: 0,
    duplicate_alerts: 0,
  },
  view: "overview",
  search: "",
  statusFilter: "ALL",
  comparisons: [],
  modal: freshModalState(),
  drawerJobId: null,
};

const elements = {};

function freshModalState() {
  return {
    open: false,
    step: 1,
    file: null,
    pasteText: "",
    loading: false,
    result: null,
    draft: null,
    decisionStatus: "NEW",
    decisionReason: "",
    notes: "",
    error: "",
  };
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function truncate(value, maxLength = 90) {
  const text = String(value || "");
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}...`;
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatCreatedAt(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  if (sameDay) return "Today";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}

function locationText(locations) {
  if (!Array.isArray(locations) || !locations.length) return "Not specified";
  return locations.join("; ");
}

function statusMeta(status) {
  return STATUS[status] || STATUS.NEW;
}

function statusOptions(selected) {
  return Object.entries(STATUS)
    .map(([value, meta]) => `<option value="${value}"${value === selected ? " selected" : ""}>${escapeHtml(meta.label)}</option>`)
    .join("");
}

function scoreClass(score) {
  if (score >= 75) return "high";
  if (score >= 50) return "medium";
  return "low";
}

function comparisonLabel(type) {
  if (type === "POSSIBLE_DUPLICATE") return { label: "Possible duplicate", className: "possible" };
  if (type === "HIGHLY_SIMILAR") return { label: "Highly similar", className: "similar" };
  return { label: "Related", className: "related" };
}

async function api(url, options = {}) {
  const response = await fetch(url, options);
  if (response.status === 204) return null;
  let data = null;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }
  if (!response.ok) {
    const message = typeof data === "object" && data
      ? (typeof data.detail === "string" ? data.detail : data.detail?.message || data.message)
      : String(data || "Request failed.");
    const error = new Error(message || "Request failed.");
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

function cacheElements() {
  elements.pageTitle = document.getElementById("page-title");
  elements.pageSubtitle = document.getElementById("page-subtitle");
  elements.statsGrid = document.getElementById("stats-grid");
  elements.overviewTable = document.getElementById("overview-table-wrap");
  elements.jobsTable = document.getElementById("jobs-table-wrap");
  elements.insightPanel = document.getElementById("insight-panel");
  elements.comparisonsContent = document.getElementById("comparisons-content");
  elements.globalSearch = document.getElementById("global-search-input");
  elements.statusFilter = document.getElementById("status-filter");
  elements.navJobCount = document.getElementById("nav-job-count");
  elements.modal = document.getElementById("job-modal");
  elements.modalTitle = document.getElementById("modal-title");
  elements.modalBody = document.getElementById("modal-body");
  elements.modalFooter = document.getElementById("modal-footer");
  elements.modalStepper = document.getElementById("modal-stepper");
  elements.drawer = document.getElementById("detail-drawer");
  elements.drawerBackdrop = document.getElementById("drawer-backdrop");
  elements.toastRegion = document.getElementById("toast-region");
  elements.sidebar = document.getElementById("sidebar");
  elements.loadDemoButton = document.getElementById("load-demo-button");
  elements.clearDemoButton = document.getElementById("clear-demo-button");
}

function bindStaticEvents() {
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.view));
  });
  document.querySelectorAll("[data-go-view]").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.goView));
  });
  document.getElementById("add-job-button").addEventListener("click", openAddModal);
  document.getElementById("jobs-add-button").addEventListener("click", openAddModal);
  document.getElementById("close-modal-button").addEventListener("click", closeAddModal);
  elements.modal.addEventListener("click", (event) => {
    if (event.target === elements.modal) closeAddModal();
  });
  elements.drawerBackdrop.addEventListener("click", closeDrawer);
  elements.globalSearch.addEventListener("input", (event) => {
    state.search = event.target.value.trim().toLowerCase();
    renderCurrentView();
  });
  elements.statusFilter.addEventListener("change", (event) => {
    state.statusFilter = event.target.value;
    renderJobsView();
  });
  elements.loadDemoButton.addEventListener("click", loadDemoData);
  elements.clearDemoButton.addEventListener("click", clearDemoData);
  document.getElementById("mobile-menu").addEventListener("click", () => elements.sidebar.classList.add("is-open"));
  document.getElementById("mobile-close").addEventListener("click", () => elements.sidebar.classList.remove("is-open"));

  document.addEventListener("keydown", (event) => {
    const tagName = document.activeElement?.tagName?.toLowerCase();
    const isTyping = tagName === "input" || tagName === "textarea" || tagName === "select";
    if (event.key === "/" && !isTyping) {
      event.preventDefault();
      elements.globalSearch.focus();
    }
    if (event.key === "Escape") {
      if (!elements.modal.classList.contains("is-hidden")) closeAddModal();
      else if (state.drawerJobId) closeDrawer();
      else elements.sidebar.classList.remove("is-open");
    }
  });
}

async function init() {
  cacheElements();
  bindStaticEvents();
  renderLoadingShell();
  await loadJobs();
}

function renderLoadingShell() {
  elements.statsGrid.innerHTML = Array.from({ length: 4 }, () => `
    <div class="stat-card">
      <div class="skeleton" style="height:14px;width:48%"></div>
      <div class="skeleton" style="height:33px;width:28%;margin-top:22px"></div>
      <div class="skeleton" style="height:10px;width:65%;margin-top:9px"></div>
    </div>
  `).join("");
  elements.overviewTable.innerHTML = `
    <div style="padding:18px">
      <div class="skeleton" style="height:56px;margin-bottom:8px"></div>
      <div class="skeleton" style="height:56px;margin-bottom:8px"></div>
      <div class="skeleton" style="height:56px"></div>
    </div>
  `;
}

async function loadJobs() {
  try {
    const data = await api("/api/jobs");
    state.jobs = data.jobs || [];
    state.stats = data.stats || state.stats;
    elements.navJobCount.textContent = String(state.stats.total || 0);
    const hasDemo = state.jobs.some((job) => job.is_demo);
    elements.clearDemoButton.classList.toggle("is-hidden", !hasDemo);
    elements.loadDemoButton.classList.toggle("is-hidden", hasDemo);
    renderCurrentView();
  } catch (error) {
    showToast("Could not load the workspace", error.message, "error");
    renderFatalError(error.message);
  }
}

function renderFatalError(message) {
  const html = `
    <div class="panel error-panel">
      <div>
        <div class="empty-illustration">${ICONS.alert}</div>
        <h3>ReqRadar could not connect to its local server</h3>
        <p>${escapeHtml(message)} Make sure the Python server is still running, then refresh this page.</p>
        <button class="primary-button" onclick="window.location.reload()">Try again</button>
      </div>
    </div>
  `;
  document.querySelectorAll(".view").forEach((view) => { view.innerHTML = html; });
}

function switchView(view) {
  state.view = view;
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle("is-active", item.dataset.view === view);
  });
  document.querySelectorAll("[data-view-panel]").forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.viewPanel === view);
  });
  const copy = {
    overview: ["Recruiting overview", "Track decisions, catch duplicates, and compare open requisitions."],
    jobs: ["Job requisitions", "Review every role and keep your pursuit decision current."],
    comparisons: ["Req comparisons", "See where roles overlap and identify possible duplicates."],
  };
  elements.pageTitle.textContent = copy[view][0];
  elements.pageSubtitle.textContent = copy[view][1];
  elements.sidebar.classList.remove("is-open");
  renderCurrentView();
}

function renderCurrentView() {
  if (state.view === "overview") renderOverviewView();
  if (state.view === "jobs") renderJobsView();
  if (state.view === "comparisons") renderComparisonsView();
}

function searchedJobs() {
  if (!state.search) return [...state.jobs];
  return state.jobs.filter((job) => {
    const haystack = [
      job.title,
      job.job_id,
      job.category,
      job.team,
      job.hiring_manager,
      job.recruiter,
      ...(job.locations || []),
      ...(job.skills || []),
      statusMeta(job.decision_status).label,
    ].join(" ").toLowerCase();
    return haystack.includes(state.search);
  });
}

function renderStats() {
  const cards = [
    {
      label: "Total reqs",
      value: state.stats.total,
      foot: "In your local tracker",
      icon: ICONS.briefcase,
      color: "#236cff",
      soft: "#eaf1ff",
      glow: "#eaf1ff",
    },
    {
      label: "Pursuing",
      value: state.stats.pursuing,
      foot: "Roles marked as a priority",
      icon: ICONS.target,
      color: "#176cae",
      soft: "#eaf5ff",
      glow: "#eaf5ff",
    },
    {
      label: "Needs a decision",
      value: state.stats.needs_decision,
      foot: "New or still marked maybe",
      icon: ICONS.clock,
      color: "#a3650a",
      soft: "#fff4df",
      glow: "#fff4df",
    },
    {
      label: "Duplicate alerts",
      value: state.stats.duplicate_alerts,
      foot: "Reqs that need a closer look",
      icon: ICONS.duplicate,
      color: "#b43b3b",
      soft: "#fdecec",
      glow: "#fdecec",
    },
  ];
  elements.statsGrid.innerHTML = cards.map((card) => `
    <article class="stat-card" style="--stat-color:${card.color};--stat-soft:${card.soft};--stat-glow:${card.glow}">
      <div class="stat-top">
        <span class="stat-label">${escapeHtml(card.label)}</span>
        <span class="stat-icon">${card.icon}</span>
      </div>
      <div class="stat-value">${card.value || 0}</div>
      <div class="stat-foot">${escapeHtml(card.foot)}</div>
    </article>
  `).join("");
}

function renderOverviewView() {
  renderStats();
  const jobs = searchedJobs().slice(0, 7);
  elements.overviewTable.innerHTML = renderJobTable(jobs, { compact: true });
  bindTableEvents(elements.overviewTable);
  renderInsights();
}

function renderJobsView() {
  let jobs = searchedJobs();
  if (state.statusFilter !== "ALL") {
    jobs = jobs.filter((job) => job.decision_status === state.statusFilter);
  }
  elements.jobsTable.innerHTML = renderJobTable(jobs, { compact: false });
  bindTableEvents(elements.jobsTable);
}

function renderJobTable(jobs, options = {}) {
  if (!state.jobs.length) {
    return renderEmptyWorkspace();
  }
  if (!jobs.length) {
    return `
      <div class="empty-state">
        <div>
          <div class="empty-illustration">${ICONS.search}</div>
          <h3>No reqs match this filter</h3>
          <p>Change the search or status filter to see more requisitions.</p>
          <button class="secondary-button" data-clear-filters>Clear filters</button>
        </div>
      </div>
    `;
  }

  const compact = Boolean(options.compact);
  const rows = jobs.map((job) => {
    const meta = statusMeta(job.decision_status);
    const topMatch = job.top_match;
    const duplicateCell = job.possible_duplicate_count > 0
      ? `<span class="duplicate-chip">${ICONS.alert}${job.possible_duplicate_count} alert${job.possible_duplicate_count > 1 ? "s" : ""}</span>`
      : job.similar_count > 0
        ? `<span class="duplicate-chip clean-chip">${job.similar_count} similar</span>`
        : `<span class="duplicate-chip clean-chip">No alert</span>`;
    const matchCell = topMatch
      ? `<span class="score-pill ${scoreClass(topMatch.overall)}">${topMatch.overall}%</span>`
      : `<span class="muted-cell">-</span>`;
    return `
      <tr data-job-row="${escapeHtml(job.id)}">
        <td>
          <select class="status-select ${meta.className}" data-status-job="${escapeHtml(job.id)}" aria-label="Decision status for ${escapeHtml(job.title)}">
            ${statusOptions(job.decision_status)}
          </select>
        </td>
        <td><span class="job-id">${escapeHtml(job.job_id || "No ID")}</span></td>
        <td>
          <button class="row-link" data-open-job="${escapeHtml(job.id)}">${escapeHtml(job.title)}</button>
          <div class="job-meta">${escapeHtml(job.team || job.category || "Team not specified")}${job.is_demo ? '<span class="demo-badge">DEMO</span>' : ""}</div>
        </td>
        ${compact ? "" : `<td class="location-cell" title="${escapeHtml(locationText(job.locations))}">${escapeHtml(locationText(job.locations))}</td>`}
        <td>${matchCell}</td>
        <td>${duplicateCell}</td>
        ${compact ? "" : `<td class="muted-cell">${escapeHtml(formatCreatedAt(job.created_at))}</td>`}
        <td>
          <button class="row-action" data-open-job="${escapeHtml(job.id)}" aria-label="Open requisition">${ICONS.chevron}</button>
        </td>
      </tr>
    `;
  }).join("");

  return `
    <div class="table-shell">
      <table class="req-table${compact ? " is-compact" : ""}">
        <thead>
          <tr>
            <th>Decision</th>
            <th>Job ID</th>
            <th>Position</th>
            ${compact ? "" : "<th>Location</th>"}
            <th>Top match</th>
            <th>Duplicate check</th>
            ${compact ? "" : "<th>Added</th>"}
            <th></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderEmptyWorkspace() {
  return `
    <div class="empty-state">
      <div>
        <div class="empty-illustration">${ICONS.briefcase}</div>
        <h3>Add your first job requisition</h3>
        <p>Upload a PDF or paste a posting. ReqRadar will extract the details, check for duplicates, and let you set a pursuit status.</p>
        <div class="empty-actions">
          <button class="primary-button" data-empty-add>${ICONS.plus}Add job req</button>
          <button class="secondary-button" data-empty-demo>Load demo portfolio</button>
        </div>
      </div>
    </div>
  `;
}

function bindTableEvents(container) {
  container.querySelectorAll("[data-open-job]").forEach((button) => {
    button.addEventListener("click", () => openDrawer(button.dataset.openJob));
  });
  container.querySelectorAll("[data-status-job]").forEach((select) => {
    select.addEventListener("change", async (event) => {
      event.stopPropagation();
      await updateStatus(select.dataset.statusJob, select.value, select);
    });
  });
  container.querySelectorAll("[data-empty-add]").forEach((button) => button.addEventListener("click", openAddModal));
  container.querySelectorAll("[data-empty-demo]").forEach((button) => button.addEventListener("click", loadDemoData));
  container.querySelectorAll("[data-clear-filters]").forEach((button) => {
    button.addEventListener("click", () => {
      state.search = "";
      state.statusFilter = "ALL";
      elements.globalSearch.value = "";
      elements.statusFilter.value = "ALL";
      renderCurrentView();
    });
  });
}

function renderInsights() {
  if (!state.jobs.length) {
    elements.insightPanel.innerHTML = `
      <div class="insight-hero">
        <span class="eyebrow">How it works</span>
        <h3>Upload, check, decide.</h3>
        <p>A focused workflow for managing internal opportunities.</p>
      </div>
      <div class="insight-list">
        <div class="insight-row"><span class="insight-dot"></span><div><strong>1. Upload a PDF</strong><p>Key fields are extracted for review.</p></div></div>
        <div class="insight-row"><span class="insight-dot"></span><div><strong>2. Catch duplicates</strong><p>Job ID and file hash are checked first.</p></div></div>
        <div class="insight-row"><span class="insight-dot"></span><div><strong>3. Set your intent</strong><p>Mark roles to pursue, pass, or revisit.</p></div></div>
      </div>
    `;
    return;
  }

  const skillCounts = new Map();
  state.jobs.forEach((job) => {
    (job.skills || []).forEach((skill) => skillCounts.set(skill, (skillCounts.get(skill) || 0) + 1));
  });
  const topSkills = [...skillCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const topSkillCopy = topSkills.length
    ? topSkills.map(([skill, count]) => `${skill} (${count})`).join(", ")
    : "Add more reqs to build a skills view.";
  const latest = state.jobs[0];
  const maybeCount = state.jobs.filter((job) => job.decision_status === "MAYBE").length;

  elements.insightPanel.innerHTML = `
    <div class="insight-hero">
      <span class="eyebrow">Portfolio signal</span>
      <h3>${state.stats.duplicate_alerts ? `${state.stats.duplicate_alerts} req${state.stats.duplicate_alerts > 1 ? "s" : ""} need a duplicate review` : "Your portfolio is clear"}</h3>
      <p>${state.stats.duplicate_alerts ? "Open comparisons before deciding whether to track both." : "No high-confidence duplicate pairs are currently flagged."}</p>
    </div>
    <div class="insight-list">
      <div class="insight-row"><span class="insight-dot"></span><div><strong>Most common skills</strong><p>${escapeHtml(topSkillCopy)}</p></div></div>
      <div class="insight-row"><span class="insight-dot"></span><div><strong>${maybeCount} role${maybeCount === 1 ? "" : "s"} still marked maybe</strong><p>Use the status filter to revisit undecided reqs.</p></div></div>
      <div class="insight-row"><span class="insight-dot"></span><div><strong>Latest upload</strong><p>${escapeHtml(latest.title)}.</p></div></div>
    </div>
  `;
}

async function renderComparisonsView() {
  if (!state.jobs.length) {
    elements.comparisonsContent.innerHTML = `
      <section class="panel">${renderEmptyWorkspace()}</section>
    `;
    bindTableEvents(elements.comparisonsContent);
    return;
  }

  elements.comparisonsContent.innerHTML = `
    <div class="comparisons-header">
      <div><h2>Req overlap</h2><p>Pairs are ranked using title, skills, category, team, location, hiring manager, and seniority.</p></div>
    </div>
    <section class="panel error-panel"><div><div class="spinner"></div><h3>Comparing your reqs</h3><p>Calculating overlap across the portfolio.</p></div></section>
  `;

  try {
    const data = await api("/api/comparisons");
    state.comparisons = data.comparisons || [];
    const query = state.search;
    const filtered = state.comparisons.filter((item) => {
      if (!query) return true;
      return [
        item.source.title,
        item.source.job_id,
        item.job.title,
        item.job.job_id,
        ...(item.overlap_skills || []),
        ...(item.reasons || []),
      ].join(" ").toLowerCase().includes(query);
    });
    if (!filtered.length) {
      elements.comparisonsContent.innerHTML = `
        <div class="comparisons-header">
          <div><h2>Req overlap</h2><p>Pairs are ranked using title, skills, category, team, location, hiring manager, and seniority.</p></div>
        </div>
        <section class="panel">
          <div class="empty-state"><div><div class="empty-illustration">${ICONS.duplicate}</div><h3>No meaningful overlap yet</h3><p>Add at least two related requisitions, or clear your search, to see comparison cards.</p><button class="primary-button" data-empty-add>${ICONS.plus}Add job req</button></div></div>
        </section>
      `;
      bindTableEvents(elements.comparisonsContent);
      return;
    }
    elements.comparisonsContent.innerHTML = `
      <div class="comparisons-header">
        <div><h2>Req overlap</h2><p>${filtered.length} meaningful pair${filtered.length === 1 ? "" : "s"} found across ${state.jobs.length} requisitions.</p></div>
      </div>
      <div class="comparison-grid">
        ${filtered.map(renderComparisonCard).join("")}
      </div>
    `;
    elements.comparisonsContent.querySelectorAll("[data-open-job]").forEach((button) => {
      button.addEventListener("click", () => openDrawer(button.dataset.openJob));
    });
  } catch (error) {
    elements.comparisonsContent.innerHTML = `
      <section class="panel error-panel"><div><div class="empty-illustration">${ICONS.alert}</div><h3>Comparisons are unavailable</h3><p>${escapeHtml(error.message)}</p><button class="secondary-button" data-retry-comparisons>Try again</button></div></section>
    `;
    elements.comparisonsContent.querySelector("[data-retry-comparisons]")?.addEventListener("click", renderComparisonsView);
  }
}

function renderComparisonCard(item) {
  const finding = comparisonLabel(item.duplicate_type);
  const reasons = item.reasons?.length ? item.reasons : ["Related role profile"];
  const skillCopy = item.overlap_skills?.length
    ? item.overlap_skills.slice(0, 4).map((skill) => `<span class="reason-chip">${escapeHtml(skill)}</span>`).join("")
    : `<span class="reason-chip">No exact skill overlap</span>`;
  return `
    <article class="comparison-card">
      <div class="comparison-card-top">
        <span class="finding-pill ${finding.className}">${escapeHtml(finding.label)}</span>
        <span class="score-pill ${scoreClass(item.overall)}">${item.overall}%</span>
      </div>
      <div class="comparison-pair">
        <button class="compare-job" data-open-job="${escapeHtml(item.source.id)}">
          <strong>${escapeHtml(item.source.title)}</strong>
          <span>${escapeHtml(item.source.job_id || "No Job ID")}</span>
        </button>
        <div class="compare-arrow">${ICONS.arrow}</div>
        <button class="compare-job" data-open-job="${escapeHtml(item.job.id)}">
          <strong>${escapeHtml(item.job.title)}</strong>
          <span>${escapeHtml(item.job.job_id || "No Job ID")}</span>
        </button>
      </div>
      <div class="compare-reasons">${skillCopy}</div>
      <div class="comparison-footer">
        <span>${escapeHtml(reasons.join("; "))}</span>
        <span>${item.skill_similarity}% skills</span>
      </div>
    </article>
  `;
}

async function updateStatus(jobId, status, selectElement = null) {
  const oldJob = state.jobs.find((job) => job.id === jobId);
  const oldStatus = oldJob?.decision_status || "NEW";
  try {
    await api(`/api/jobs/${encodeURIComponent(jobId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision_status: status }),
    });
    if (oldJob) oldJob.decision_status = status;
    showToast("Decision updated", `${statusMeta(status).label}: ${oldJob?.title || "requisition"}`);
    await loadJobs();
  } catch (error) {
    if (selectElement) selectElement.value = oldStatus;
    showToast("Could not update status", error.message, "error");
  }
}

function openAddModal() {
  state.modal = freshModalState();
  state.modal.open = true;
  elements.modal.classList.remove("is-hidden");
  document.body.style.overflow = "hidden";
  renderModal();
}

function closeAddModal() {
  state.modal.open = false;
  elements.modal.classList.add("is-hidden");
  if (!state.drawerJobId) document.body.style.overflow = "";
}

function renderModal() {
  const modal = state.modal;
  elements.modalTitle.textContent = modal.step === 1 ? "Add a job req" : modal.step === 2 ? "Review the req" : "Set your decision";
  elements.modalStepper.querySelectorAll(".step").forEach((stepElement) => {
    const step = Number(stepElement.dataset.step);
    stepElement.classList.toggle("is-active", step === modal.step);
    stepElement.classList.toggle("is-complete", step < modal.step);
    const number = stepElement.querySelector(":scope > span");
    number.innerHTML = step < modal.step ? ICONS.check : String(step);
  });
  if (modal.loading) {
    elements.modalBody.innerHTML = `
      <div class="loading-state">
        <div><div class="spinner"></div><h3>Reading the requisition</h3><p>Extracting job details and checking the existing portfolio.</p></div>
      </div>
    `;
    elements.modalFooter.innerHTML = `<button class="ghost-button" disabled>Analyzing source...</button>`;
    return;
  }
  if (modal.error && modal.step === 1) {
    renderUploadStep();
    const intro = elements.modalBody.querySelector(".upload-intro");
    intro?.insertAdjacentHTML("afterend", `
      <div class="alert alert-danger" style="max-width:680px;margin-left:auto;margin-right:auto">
        <span class="alert-icon">${ICONS.alert}</span><div><strong>Could not analyze this source</strong><p>${escapeHtml(modal.error)}</p></div>
      </div>
    `);
    return;
  }
  if (modal.step === 1) renderUploadStep();
  if (modal.step === 2) renderReviewStep();
  if (modal.step === 3) renderDecisionStep();
}

function renderUploadStep() {
  const modal = state.modal;
  const fileBlock = modal.file
    ? `
      <div class="file-ready">
        <span class="file-ready-icon">${ICONS.file}</span>
        <span class="file-ready-info"><strong>${escapeHtml(modal.file.name)}</strong><span>${escapeHtml(formatFileSize(modal.file.size))} - ready to analyze</span></span>
        <button class="file-remove" id="remove-upload-file" aria-label="Remove file">${ICONS.close}</button>
      </div>
    `
    : `
      <div>
        <span class="upload-icon">${ICONS.upload}</span>
        <strong>Drop a job posting here</strong>
        <p>PDF or TXT, up to 15 MB. You can also <button class="upload-link" id="browse-file-button">browse files</button>.</p>
      </div>
    `;

  elements.modalBody.innerHTML = `
    <div class="upload-intro">
      <h3>Start with the source you already have</h3>
      <p>ReqRadar extracts the key fields, then checks Job ID, file identity, and role similarity before saving.</p>
    </div>
    <label class="upload-zone" id="upload-zone">
      <input id="job-file-input" type="file" accept=".pdf,.txt,text/plain,application/pdf">
      ${fileBlock}
    </label>
    <div class="upload-divider"><span>or paste the posting</span></div>
    <div class="paste-wrap">
      <label for="paste-job-text"><span>Job description text</span><span>${modal.pasteText.length} characters</span></label>
      <textarea class="textarea-input" id="paste-job-text" placeholder="Paste the full posting, including Job ID and header details when available.">${escapeHtml(modal.pasteText)}</textarea>
    </div>
    <div class="sample-row">
      <p>Need a quick test? Use the bundled Principal, Business Operations sample PDF.</p>
      <button class="secondary-button compact" id="use-sample-button">Use sample</button>
    </div>
  `;
  elements.modalFooter.innerHTML = `
    <button class="ghost-button" id="cancel-upload-button">Cancel</button>
    <div class="footer-right">
      <button class="primary-button" id="analyze-upload-button"${!modal.file && modal.pasteText.trim().length < 40 ? " disabled" : ""}>Analyze req${ICONS.arrow}</button>
    </div>
  `;

  const fileInput = document.getElementById("job-file-input");
  const zone = document.getElementById("upload-zone");
  const browse = document.getElementById("browse-file-button");
  browse?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    fileInput.click();
  });
  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (file) setUploadFile(file);
  });
  zone.addEventListener("dragover", (event) => {
    event.preventDefault();
    zone.classList.add("is-dragging");
  });
  zone.addEventListener("dragleave", () => zone.classList.remove("is-dragging"));
  zone.addEventListener("drop", (event) => {
    event.preventDefault();
    zone.classList.remove("is-dragging");
    const file = event.dataTransfer?.files?.[0];
    if (file) setUploadFile(file);
  });
  document.getElementById("remove-upload-file")?.addEventListener("click", (event) => {
    event.preventDefault();
    state.modal.file = null;
    renderModal();
  });
  document.getElementById("paste-job-text").addEventListener("input", (event) => {
    state.modal.pasteText = event.target.value;
    const labelCounter = event.target.closest(".paste-wrap")?.querySelector("label span:last-child");
    if (labelCounter) labelCounter.textContent = `${state.modal.pasteText.length} characters`;
    const analyzeButton = document.getElementById("analyze-upload-button");
    if (analyzeButton) analyzeButton.disabled = !state.modal.file && state.modal.pasteText.trim().length < 40;
  });
  document.getElementById("use-sample-button").addEventListener("click", useSampleFile);
  document.getElementById("cancel-upload-button").addEventListener("click", closeAddModal);
  document.getElementById("analyze-upload-button").addEventListener("click", analyzeCurrentSource);
}

function setUploadFile(file) {
  const extension = file.name.toLowerCase().split(".").pop();
  if (!(["pdf", "txt"].includes(extension))) {
    state.modal.error = "Supported formats are PDF and TXT. You can paste other formats as text.";
    renderModal();
    return;
  }
  if (file.size > 15 * 1024 * 1024) {
    state.modal.error = "The selected file is larger than 15 MB.";
    renderModal();
    return;
  }
  state.modal.file = file;
  state.modal.error = "";
  renderModal();
}

async function useSampleFile() {
  try {
    const response = await fetch("/sample-job.pdf");
    if (!response.ok) throw new Error("The sample file could not be loaded.");
    const blob = await response.blob();
    state.modal.file = new File([blob], "Principal Business Operations Customer Success.pdf", { type: "application/pdf" });
    state.modal.error = "";
    renderModal();
  } catch (error) {
    state.modal.error = error.message;
    renderModal();
  }
}

async function analyzeCurrentSource() {
  const modal = state.modal;
  if (!modal.file && modal.pasteText.trim().length < 40) return;
  modal.loading = true;
  modal.error = "";
  renderModal();
  try {
    let data;
    if (modal.file) {
      data = await api("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": modal.file.type || "application/octet-stream",
          "X-Filename": encodeURIComponent(modal.file.name),
        },
        body: modal.file,
      });
    } else {
      data = await api("/api/analyze-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: modal.pasteText, filename: "pasted-job.txt" }),
      });
    }
    modal.result = data;
    modal.draft = deepClone(data.draft);
    modal.loading = false;
    modal.step = 2;
    renderModal();
  } catch (error) {
    modal.loading = false;
    modal.error = error.message;
    modal.step = 1;
    renderModal();
  }
}

function renderReviewStep() {
  const modal = state.modal;
  const draft = modal.draft;
  const duplicate = modal.result?.duplicate_check || { exact: [], potential: [], similar: [] };
  const exact = duplicate.exact || [];
  const potential = duplicate.potential || [];
  let alertHtml;
  if (exact.length) {
    const existing = exact[0];
    alertHtml = `
      <div class="alert alert-danger">
        <span class="alert-icon">${ICONS.duplicate}</span>
        <div><strong>This req is already in your tracker</strong><p>Job ID or source file matches ${escapeHtml(existing.title)} (${escapeHtml(existing.job_id || "no Job ID")}). <button class="upload-link" data-open-existing="${escapeHtml(existing.id)}">Open the existing req</button>.</p></div>
      </div>
    `;
  } else if (potential.length) {
    alertHtml = `
      <div class="alert alert-warning">
        <span class="alert-icon">${ICONS.alert}</span>
        <div><strong>Possible duplicate found</strong><p>The strongest related req is ${potential[0].overall}% similar. Review the comparison below before saving.</p></div>
      </div>
    `;
  } else {
    alertHtml = `
      <div class="alert alert-success">
        <span class="alert-icon">${ICONS.check}</span>
        <div><strong>No exact duplicate found</strong><p>Job ID and source file are new. Similar roles are shown below when available.</p></div>
      </div>
    `;
  }

  const similarItems = (duplicate.similar || []).slice(0, 4);
  elements.modalBody.innerHTML = `
    ${alertHtml}
    <div class="review-grid">
      ${reviewField("Job ID", "job_id", draft.job_id, "Unique ID from the posting")}
      ${reviewField("Seniority", "seniority", draft.seniority, "Detected from the title")}
      ${reviewField("Job title", "title", draft.title, "", true)}
      ${reviewField("Category", "category", draft.category)}
      ${reviewField("Team", "team", draft.team)}
      ${reviewField("Locations", "locations", (draft.locations || []).join("; "), "Separate multiple locations with semicolons")}
      ${reviewField("Hiring manager", "hiring_manager", draft.hiring_manager)}
      ${reviewField("Recruiter", "recruiter", draft.recruiter)}
      ${reviewField("Date posted", "date_posted", draft.date_posted)}
      ${reviewField("Experience", "experience", draft.experience)}
      <div class="form-field full">
        <label for="draft-summary">Role summary</label>
        <textarea class="textarea-input" id="draft-summary" data-draft-field="summary">${escapeHtml(draft.summary || "")}</textarea>
      </div>
    </div>
    <div class="section-title-row"><h3>Detected skills</h3><span>Press Enter to add a skill</span></div>
    <div class="skills-editor" id="skills-editor">
      ${(draft.skills || []).map((skill, index) => `<span class="skill-chip editable">${escapeHtml(skill)}<button data-remove-skill="${index}" aria-label="Remove ${escapeHtml(skill)}">${ICONS.close}</button></span>`).join("")}
      <input class="skill-add-input" id="skill-add-input" placeholder="Add another skill">
    </div>
    <div class="review-grid" style="margin-top:14px">
      <div class="form-field full">
        <label for="draft-responsibilities">Responsibilities <span class="hint">One per line</span></label>
        <textarea class="textarea-input" id="draft-responsibilities" data-draft-array="responsibilities">${escapeHtml((draft.responsibilities || []).join("\n"))}</textarea>
      </div>
      <div class="form-field full">
        <label for="draft-qualifications">Qualifications <span class="hint">One per line</span></label>
        <textarea class="textarea-input" id="draft-qualifications" data-draft-array="qualifications">${escapeHtml((draft.qualifications || []).join("\n"))}</textarea>
      </div>
    </div>
    <div class="section-title-row"><h3>Closest reqs already tracked</h3><span>${similarItems.length ? "Ranked by overall similarity" : "No related reqs yet"}</span></div>
    <div class="similar-list">
      ${similarItems.length ? similarItems.map(renderSimilarRow).join("") : `<div class="similar-row"><span class="similar-score">-</span><span class="similar-copy"><strong>No comparison available</strong><span>Add more requisitions to build a reusable portfolio view.</span></span></div>`}
    </div>
  `;
  elements.modalFooter.innerHTML = `
    <button class="ghost-button" id="review-back-button">Back</button>
    <div class="footer-right">
      <button class="primary-button" id="review-next-button"${exact.length ? " disabled" : ""}>Set decision${ICONS.arrow}</button>
    </div>
  `;

  bindReviewInputs();
  document.querySelectorAll("[data-open-existing]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.openExisting;
      closeAddModal();
      openDrawer(id);
    });
  });
  document.getElementById("review-back-button").addEventListener("click", () => {
    modal.step = 1;
    renderModal();
  });
  document.getElementById("review-next-button").addEventListener("click", () => {
    modal.step = 3;
    renderModal();
  });
}

function reviewField(label, field, value, hint = "", full = false) {
  return `
    <div class="form-field${full ? " full" : ""}">
      <label for="draft-${field}">${escapeHtml(label)}${hint ? `<span class="hint">${escapeHtml(hint)}</span>` : ""}</label>
      <input class="text-input" id="draft-${field}" data-draft-field="${field}" value="${escapeHtml(value || "")}">
    </div>
  `;
}

function renderSimilarRow(item) {
  const reasons = item.reasons?.length ? item.reasons.join("; ") : "Related profile";
  return `
    <div class="similar-row">
      <span class="similar-score">${item.overall}%</span>
      <span class="similar-copy"><strong>${escapeHtml(item.job.title)}</strong><span>${escapeHtml(reasons)}</span></span>
      <span class="finding-pill ${comparisonLabel(item.duplicate_type).className}">${escapeHtml(comparisonLabel(item.duplicate_type).label)}</span>
    </div>
  `;
}

function bindReviewInputs() {
  const draft = state.modal.draft;
  elements.modalBody.querySelectorAll("[data-draft-field]").forEach((input) => {
    input.addEventListener("input", () => {
      const field = input.dataset.draftField;
      if (field === "locations") {
        draft.locations = input.value.split(/[;|]/).map((item) => item.trim()).filter(Boolean);
      } else {
        draft[field] = input.value;
      }
      if (field === "title") draft.normalized_title = input.value;
    });
  });
  elements.modalBody.querySelectorAll("[data-draft-array]").forEach((input) => {
    input.addEventListener("input", () => {
      draft[input.dataset.draftArray] = input.value.split("\n").map((item) => item.trim()).filter(Boolean);
    });
  });
  elements.modalBody.querySelectorAll("[data-remove-skill]").forEach((button) => {
    button.addEventListener("click", () => {
      draft.skills.splice(Number(button.dataset.removeSkill), 1);
      renderReviewStep();
    });
  });
  document.getElementById("skill-add-input").addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const skill = event.target.value.trim();
    if (!skill) return;
    if (!draft.skills.some((existing) => existing.toLowerCase() === skill.toLowerCase())) {
      draft.skills.push(skill);
    }
    renderReviewStep();
  });
}

function renderDecisionStep() {
  const modal = state.modal;
  const draft = modal.draft;
  const cards = [
    ["NEW", ICONS.clock],
    ["PURSUING", ICONS.target],
    ["MAYBE", ICONS.question],
    ["NOT_PURSUING", ICONS.stop],
    ["APPLIED", ICONS.send],
  ];
  elements.modalBody.innerHTML = `
    <div class="decision-intro">
      <h3>How do you want to track this req?</h3>
      <p>Your decision is separate from the official requisition status and can be changed at any time.</p>
    </div>
    <div class="decision-cards">
      ${cards.map(([status, icon]) => {
        const meta = statusMeta(status);
        return `<button class="decision-card${modal.decisionStatus === status ? " is-selected" : ""}" data-decision-status="${status}"><span class="decision-card-icon">${icon}</span><strong>${escapeHtml(meta.label)}</strong><span>${escapeHtml(meta.description)}</span></button>`;
      }).join("")}
    </div>
    <div class="decision-form">
      <div class="form-field">
        <label for="decision-reason">Reason <span class="hint">Optional</span></label>
        <select class="text-input" id="decision-reason">
          ${reasonOptions(modal.decisionReason)}
        </select>
      </div>
      <div class="form-field">
        <label for="decision-notes">Personal notes <span class="hint">Optional</span></label>
        <textarea class="textarea-input" id="decision-notes" placeholder="Why this role stands out, questions to answer, or next action.">${escapeHtml(modal.notes)}</textarea>
      </div>
    </div>
    <div class="alert alert-success" style="margin-top:18px;margin-bottom:0">
      <span class="alert-icon">${ICONS.shield}</span>
      <div><strong>Ready to save ${escapeHtml(draft.title)}</strong><p>The requisition and its extracted source text will be stored in your local ReqRadar workspace.</p></div>
    </div>
  `;
  elements.modalFooter.innerHTML = `
    <button class="ghost-button" id="decision-back-button">Back</button>
    <div class="save-summary">${ICONS.check}<span>Duplicate check complete</span></div>
    <div class="footer-right"><button class="primary-button" id="save-job-button">Save req${ICONS.check}</button></div>
  `;

  elements.modalBody.querySelectorAll("[data-decision-status]").forEach((button) => {
    button.addEventListener("click", () => {
      modal.decisionStatus = button.dataset.decisionStatus;
      renderDecisionStep();
    });
  });
  document.getElementById("decision-reason").addEventListener("change", (event) => { modal.decisionReason = event.target.value; });
  document.getElementById("decision-notes").addEventListener("input", (event) => { modal.notes = event.target.value; });
  document.getElementById("decision-back-button").addEventListener("click", () => {
    modal.step = 2;
    renderModal();
  });
  document.getElementById("save-job-button").addEventListener("click", saveCurrentJob);
}

function reasonOptions(selected) {
  const reasons = [
    ["", "Select a reason"],
    ["Strong skills match", "Strong skills match"],
    ["Strong career interest", "Strong career interest"],
    ["Relevant team or organization", "Relevant team or organization"],
    ["Need more information", "Need more information"],
    ["Skills mismatch", "Skills mismatch"],
    ["Level mismatch", "Level mismatch"],
    ["Location or work mode", "Location or work mode"],
    ["Prefer another role", "Prefer another role"],
    ["Role closed or unavailable", "Role closed or unavailable"],
    ["Other", "Other"],
  ];
  return reasons.map(([value, label]) => `<option value="${escapeHtml(value)}"${value === selected ? " selected" : ""}>${escapeHtml(label)}</option>`).join("");
}

async function saveCurrentJob() {
  const modal = state.modal;
  const button = document.getElementById("save-job-button");
  button.disabled = true;
  button.textContent = "Saving...";
  const payload = {
    ...modal.draft,
    decision_status: modal.decisionStatus,
    decision_reason: modal.decisionReason,
    notes: modal.notes,
  };
  try {
    const data = await api("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    closeAddModal();
    showToast("Requisition saved", `${data.job.title} is marked ${statusMeta(data.job.decision_status).label.toLowerCase()}.`);
    await loadJobs();
    openDrawer(data.job.id);
  } catch (error) {
    if (error.status === 409 && error.data?.detail?.existing) {
      closeAddModal();
      showToast("Duplicate blocked", "The existing requisition was opened instead.", "error");
      openDrawer(error.data.detail.existing.id);
      return;
    }
    button.disabled = false;
    button.innerHTML = `Save req${ICONS.check}`;
    showToast("Could not save the req", error.message, "error");
  }
}

async function openDrawer(jobId) {
  state.drawerJobId = jobId;
  elements.drawerBackdrop.classList.remove("is-hidden");
  elements.drawer.classList.add("is-open");
  elements.drawer.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  elements.drawer.innerHTML = `
    <div class="drawer-header"><div class="skeleton" style="height:12px;width:30%"></div><div class="skeleton" style="height:27px;width:84%;margin-top:12px"></div><div class="skeleton" style="height:11px;width:55%;margin-top:8px"></div></div>
    <div class="drawer-body"><div class="skeleton" style="height:118px"></div><div class="skeleton" style="height:130px;margin-top:18px"></div><div class="skeleton" style="height:100px;margin-top:18px"></div></div>
  `;
  try {
    const data = await api(`/api/jobs/${encodeURIComponent(jobId)}`);
    if (state.drawerJobId !== jobId) return;
    renderDrawer(data.job, data.comparisons || []);
  } catch (error) {
    elements.drawer.innerHTML = `
      <div class="error-panel"><div><div class="empty-illustration">${ICONS.alert}</div><h3>Could not open this req</h3><p>${escapeHtml(error.message)}</p><button class="secondary-button" data-close-drawer>Close</button></div></div>
    `;
    elements.drawer.querySelector("[data-close-drawer]")?.addEventListener("click", closeDrawer);
  }
}

function closeDrawer() {
  state.drawerJobId = null;
  elements.drawer.classList.remove("is-open");
  elements.drawer.setAttribute("aria-hidden", "true");
  elements.drawerBackdrop.classList.add("is-hidden");
  if (elements.modal.classList.contains("is-hidden")) document.body.style.overflow = "";
}

function renderDrawer(job, comparisons) {
  const meta = statusMeta(job.decision_status);
  const responsibilities = job.responsibilities || [];
  const qualifications = job.qualifications || [];
  elements.drawer.innerHTML = `
    <header class="drawer-header">
      <div class="drawer-header-top">
        <div>
          <span class="eyebrow">${escapeHtml(job.job_id || "No Job ID")}${job.is_demo ? " - demo data" : ""}</span>
          <h2>${escapeHtml(job.title)}</h2>
          <p>${escapeHtml(job.team || job.category || "Team not specified")} - ${escapeHtml(locationText(job.locations))}</p>
        </div>
        <button class="icon-button" data-close-drawer aria-label="Close">${ICONS.close}</button>
      </div>
      <div class="drawer-status-row">
        <select class="status-select ${meta.className}" id="drawer-status-select">${statusOptions(job.decision_status)}</select>
        ${job.possible_duplicate_count > 0 ? `<span class="duplicate-chip">${ICONS.alert}Duplicate review</span>` : ""}
      </div>
    </header>
    <div class="drawer-body">
      <div class="detail-facts">
        ${factCard("Category", job.category || "Not specified")}
        ${factCard("Seniority", job.seniority || "Not specified")}
        ${factCard("Hiring manager", job.hiring_manager || "Not specified")}
        ${factCard("Recruiter", job.recruiter || "Not specified")}
        ${factCard("Date posted", job.date_posted || "Not specified")}
        ${factCard("Experience", job.experience || "Not specified")}
      </div>
      <section class="detail-section">
        <h3>Role summary</h3>
        <p>${escapeHtml(job.summary || "No summary was extracted. Open the source file or review the saved text.")}</p>
      </section>
      <section class="detail-section">
        <h3>Skills</h3>
        <div class="skills-wrap">${job.skills?.length ? job.skills.map((skill) => `<span class="skill-chip">${escapeHtml(skill)}</span>`).join("") : `<span class="muted-cell">No skills extracted</span>`}</div>
      </section>
      ${responsibilities.length ? `<section class="detail-section"><h3>Responsibilities</h3><ul>${responsibilities.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>` : ""}
      ${qualifications.length ? `<section class="detail-section"><h3>Qualifications</h3><ul>${qualifications.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>` : ""}
      <section class="detail-section">
        <h3>Closest requisitions</h3>
        <div class="drawer-comparisons">
          ${comparisons.filter((item) => item.overall >= 35).slice(0, 5).map((item) => `
            <button class="drawer-compare-row" data-open-related="${escapeHtml(item.job.id)}">
              <span class="score-pill ${scoreClass(item.overall)}">${item.overall}%</span>
              <span class="drawer-compare-copy"><strong>${escapeHtml(item.job.title)}</strong><span>${escapeHtml(item.reasons?.join("; ") || "Related role")}</span></span>
              ${ICONS.chevron}
            </button>
          `).join("") || `<div class="similar-row"><span class="similar-score">-</span><span class="similar-copy"><strong>No related reqs yet</strong><span>Add more jobs to see portfolio overlap.</span></span></div>`}
        </div>
      </section>
      <section class="detail-section">
        <h3>Personal notes</h3>
        <textarea class="notes-editor" id="drawer-notes" placeholder="Add context, next steps, or questions.">${escapeHtml(job.notes || "")}</textarea>
      </section>
      <div class="drawer-actions">
        <div class="drawer-actions-left">
          ${job.has_source ? `<a class="secondary-button compact" href="/api/jobs/${encodeURIComponent(job.id)}/source" target="_blank" rel="noopener">${ICONS.external}Open source</a>` : ""}
          <button class="secondary-button compact" id="save-notes-button">${ICONS.note}Save notes</button>
        </div>
        <div class="drawer-actions-right">
          <button class="danger-button compact" id="delete-job-button">${ICONS.trash}Delete</button>
        </div>
      </div>
    </div>
  `;

  elements.drawer.querySelector("[data-close-drawer]").addEventListener("click", closeDrawer);
  elements.drawer.querySelectorAll("[data-open-related]").forEach((button) => {
    button.addEventListener("click", () => openDrawer(button.dataset.openRelated));
  });
  document.getElementById("drawer-status-select").addEventListener("change", async (event) => {
    await updateStatus(job.id, event.target.value, event.target);
    if (state.drawerJobId === job.id) openDrawer(job.id);
  });
  document.getElementById("save-notes-button").addEventListener("click", async () => {
    const notes = document.getElementById("drawer-notes").value;
    try {
      await api(`/api/jobs/${encodeURIComponent(job.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      showToast("Notes saved", job.title);
      await loadJobs();
    } catch (error) {
      showToast("Could not save notes", error.message, "error");
    }
  });
  document.getElementById("delete-job-button").addEventListener("click", async () => {
    const confirmed = window.confirm(`Delete "${job.title}" from ReqRadar? This cannot be undone.`);
    if (!confirmed) return;
    try {
      await api(`/api/jobs/${encodeURIComponent(job.id)}`, { method: "DELETE" });
      closeDrawer();
      showToast("Requisition deleted", job.title);
      await loadJobs();
    } catch (error) {
      showToast("Could not delete the req", error.message, "error");
    }
  });
}

function factCard(label, value) {
  return `<div class="fact-card"><span>${escapeHtml(label)}</span><strong title="${escapeHtml(value)}">${escapeHtml(value)}</strong></div>`;
}

async function loadDemoData() {
  elements.loadDemoButton.disabled = true;
  try {
    const data = await api("/api/demo", { method: "POST" });
    showToast("Demo portfolio loaded", `${data.created} sample requisitions added.`);
    await loadJobs();
  } catch (error) {
    showToast("Could not load demo data", error.message, "error");
  } finally {
    elements.loadDemoButton.disabled = false;
  }
}

async function clearDemoData() {
  const confirmed = window.confirm("Remove all demo requisitions? Your real reqs will stay in place.");
  if (!confirmed) return;
  try {
    const data = await api("/api/demo", { method: "DELETE" });
    showToast("Demo data removed", `${data.deleted} sample requisitions deleted.`);
    await loadJobs();
  } catch (error) {
    showToast("Could not remove demo data", error.message, "error");
  }
}

function showToast(title, message, type = "success") {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `
    <span class="toast-icon">${type === "error" ? ICONS.alert : ICONS.check}</span>
    <span><strong>${escapeHtml(title)}</strong><span>${escapeHtml(message || "")}</span></span>
  `;
  elements.toastRegion.appendChild(toast);
  window.setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(5px)";
    window.setTimeout(() => toast.remove(), 180);
  }, 3600);
}

document.addEventListener("DOMContentLoaded", init);
