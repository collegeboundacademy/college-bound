const API_BASE = window.COLLEGE_EXPLORER_API_BASE || "http://localhost:8080/api/colleges";
const PROFILE_STORAGE_KEY = "collegeExplorer.studentProfile.v1";
const SAVED_COLLEGES_STORAGE_KEY = "collegeExplorer.savedColleges.v1";
const STUDENT_KEY_STORAGE_KEY = "collegeExplorer.studentKey.v1";

const el = {
  query: document.getElementById("query"),
  searchBtn: document.getElementById("searchBtn"),
  quizBtn: document.getElementById("quizBtn"),
  profileSummary: document.getElementById("profileSummary"),
  quizModal: document.getElementById("quizModal"),
  quizCloseBtn: document.getElementById("quizCloseBtn"),
  quizSaveBtn: document.getElementById("quizSaveBtn"),
  quizGpa: document.getElementById("quizGpa"),
  quizSat: document.getElementById("quizSat"),
  quizAct: document.getElementById("quizAct"),
  quizBudget: document.getElementById("quizBudget"),
  quizState: document.getElementById("quizState"),
  quizType: document.getElementById("quizType"),
  quizMaxNetPrice: document.getElementById("quizMaxNetPrice"),
  studentKeyText: document.getElementById("studentKeyText"),
  copyStudentKeyBtn: document.getElementById("copyStudentKeyBtn"),
  restoreStudentKeyInput: document.getElementById("restoreStudentKeyInput"),
  restoreStudentKeyBtn: document.getElementById("restoreStudentKeyBtn"),
  statusText: document.getElementById("statusText"),
  sortBy: document.getElementById("sortBy"),
  resultsList: document.getElementById("resultsList"),
  detailPanel: document.getElementById("detailPanel"),
  comparePanel: document.getElementById("comparePanel"),
  savedPanel: document.getElementById("savedPanel"),
};

let searchResults = [];
const selectedIds = new Set();
let activeCollegeId = null;
let dataLastRefreshed = "";
let studentKey = "";
let cloudSyncTimer = null;
let studentProfile = {
  gpa: null,
  sat: null,
  act: null,
  budget: null,
  preferredState: "",
  preferredType: "",
  maxNetPrice: null,
};
let savedColleges = new Map();

function generateStudentKey() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `student-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

function loadStudentKey() {
  const existing = window.localStorage.getItem(STUDENT_KEY_STORAGE_KEY);
  if (existing && existing.trim()) {
    studentKey = existing.trim();
    return;
  }

  studentKey = generateStudentKey();
  window.localStorage.setItem(STUDENT_KEY_STORAGE_KEY, studentKey);
}

function renderStudentKey() {
  if (el.studentKeyText) {
    el.studentKeyText.textContent = `Student Key: ${studentKey}`;
  }

  if (el.restoreStudentKeyInput && !el.restoreStudentKeyInput.value.trim()) {
    el.restoreStudentKeyInput.value = studentKey;
  }
}

function getSavedCollegeRows() {
  return Array.from(savedColleges.values());
}

async function loadCloudPersistence() {
  if (!studentKey) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/persistence?studentKey=${encodeURIComponent(studentKey)}`);
    if (!response.ok) {
      return;
    }

    const payload = await response.json();
    if (!payload || typeof payload !== "object") {
      return;
    }

    if (payload.profile && typeof payload.profile === "object") {
      studentProfile = {
        gpa: typeof payload.profile.gpa === "number" ? payload.profile.gpa : null,
        sat: Number.isInteger(payload.profile.sat) ? payload.profile.sat : null,
        act: Number.isInteger(payload.profile.act) ? payload.profile.act : null,
        budget: Number.isInteger(payload.profile.budget) ? payload.profile.budget : null,
        preferredState: typeof payload.profile.preferredState === "string" ? payload.profile.preferredState : "",
        preferredType: typeof payload.profile.preferredType === "string" ? payload.profile.preferredType : "",
        maxNetPrice: Number.isInteger(payload.profile.maxNetPrice) ? payload.profile.maxNetPrice : null,
      };
      persistStudentProfile();
    }

    if (Array.isArray(payload.savedColleges)) {
      const next = new Map();
      for (const row of payload.savedColleges) {
        if (!row || typeof row !== "object" || typeof row.id !== "string" || !row.id) {
          continue;
        }
        next.set(row.id, {
          id: row.id,
          name: typeof row.name === "string" ? row.name : row.id,
          state: typeof row.state === "string" ? row.state : "N/A",
          type: typeof row.type === "string" ? row.type : "Unknown",
          averageNetPrice: typeof row.averageNetPrice === "number" ? row.averageNetPrice : null,
          acceptanceRate: typeof row.acceptanceRate === "number" ? row.acceptanceRate : null,
        });
      }

      if (next.size > 0) {
        savedColleges = next;
        persistSavedColleges();
      }
    }
  } catch (error) {
    // Keep local fallback when cloud sync is unavailable.
  }
}

async function syncCloudPersistence() {
  if (!studentKey) {
    return;
  }

  const body = {
    studentKey,
    profile: studentProfile,
    savedColleges: getSavedCollegeRows(),
  };

  try {
    await fetch(`${API_BASE}/persistence`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    // Ignore sync failures; local storage remains the source of truth.
  }
}

function scheduleCloudSync() {
  if (cloudSyncTimer) {
    window.clearTimeout(cloudSyncTimer);
  }

  cloudSyncTimer = window.setTimeout(() => {
    syncCloudPersistence();
  }, 400);
}

function readStorageJSON(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    return JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
}

function persistStudentProfile() {
  try {
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(studentProfile));
  } catch (error) {
    // Ignore storage errors to keep the app usable in restricted browsers.
  }

  scheduleCloudSync();
}

function loadStudentProfile() {
  const stored = readStorageJSON(PROFILE_STORAGE_KEY, null);
  if (!stored || typeof stored !== "object") {
    return;
  }

  studentProfile = {
    gpa: typeof stored.gpa === "number" ? stored.gpa : null,
    sat: Number.isInteger(stored.sat) ? stored.sat : null,
    act: Number.isInteger(stored.act) ? stored.act : null,
    budget: Number.isInteger(stored.budget) ? stored.budget : null,
    preferredState: typeof stored.preferredState === "string" ? stored.preferredState : "",
    preferredType: typeof stored.preferredType === "string" ? stored.preferredType : "",
    maxNetPrice: Number.isInteger(stored.maxNetPrice) ? stored.maxNetPrice : null,
  };
}

function persistSavedColleges() {
  try {
    const rows = Array.from(savedColleges.values());
    window.localStorage.setItem(SAVED_COLLEGES_STORAGE_KEY, JSON.stringify(rows));
  } catch (error) {
    // Ignore storage errors to keep the app usable in restricted browsers.
  }

  scheduleCloudSync();
}

function loadSavedColleges() {
  const rows = readStorageJSON(SAVED_COLLEGES_STORAGE_KEY, []);
  if (!Array.isArray(rows)) {
    return;
  }

  const next = new Map();
  for (const row of rows) {
    if (!row || typeof row !== "object" || typeof row.id !== "string" || !row.id) {
      continue;
    }

    next.set(row.id, {
      id: row.id,
      name: typeof row.name === "string" ? row.name : row.id,
      state: typeof row.state === "string" ? row.state : "N/A",
      type: typeof row.type === "string" ? row.type : "Unknown",
      averageNetPrice: typeof row.averageNetPrice === "number" ? row.averageNetPrice : null,
      acceptanceRate: typeof row.acceptanceRate === "number" ? row.acceptanceRate : null,
    });
  }

  savedColleges = next;
}

function updateSavedCollegeSnapshot(college) {
  if (!college || !college.id || !savedColleges.has(college.id)) {
    return;
  }

  savedColleges.set(college.id, {
    id: college.id,
    name: college.name,
    state: college.state,
    type: college.type,
    averageNetPrice: typeof college.averageNetPrice === "number" ? college.averageNetPrice : null,
    acceptanceRate: typeof college.acceptanceRate === "number" ? college.acceptanceRate : null,
  });
  persistSavedColleges();
}

function isSavedCollege(id) {
  return savedColleges.has(id);
}

function toggleSavedCollege(id) {
  const college = searchResults.find((item) => item.id === id);

  if (savedColleges.has(id)) {
    savedColleges.delete(id);
    persistSavedColleges();
    renderSavedColleges();
    renderResults();
    return;
  }

  if (!college) {
    return;
  }

  savedColleges.set(id, {
    id: college.id,
    name: college.name,
    state: college.state,
    type: college.type,
    averageNetPrice: typeof college.averageNetPrice === "number" ? college.averageNetPrice : null,
    acceptanceRate: typeof college.acceptanceRate === "number" ? college.acceptanceRate : null,
  });
  persistSavedColleges();
  renderSavedColleges();
  renderResults();
}

async function openSavedCollege(id) {
  const existing = searchResults.find((item) => item.id === id);
  if (existing) {
    activeCollegeId = id;
    renderResults();
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/${encodeURIComponent(id)}`);
    if (!response.ok) {
      throw new Error(`Fetch failed (${response.status})`);
    }

    const payload = await response.json();
    if (!payload || !payload.college) {
      throw new Error("College payload missing");
    }

    const college = payload.college;
    searchResults = [college, ...searchResults.filter((item) => item.id !== college.id)];
    activeCollegeId = college.id;
    updateSavedCollegeSnapshot(college);
    renderResults();
  } catch (error) {
    el.statusText.textContent = "Could not load saved college details right now.";
  }
}

function renderSavedColleges() {
  if (!el.savedPanel) {
    return;
  }

  const rows = Array.from(savedColleges.values());
  if (rows.length === 0) {
    el.savedPanel.innerHTML = "<p class='status'>No saved colleges yet. Click Save on any result card.</p>";
    return;
  }

  el.savedPanel.innerHTML = rows
    .map((college) => `
      <article class="school-row" data-saved-id="${college.id}">
        <div>
          <h3>${college.name}</h3>
          <p class="meta">${college.type} • ${college.state}</p>
          <div class="metrics">
            <span class="badge">Acceptance: ${formatPercent(college.acceptanceRate)}</span>
            <span class="badge">Net Price: ${formatCurrency(college.averageNetPrice)}</span>
          </div>
        </div>
        <div style="display:flex; gap:0.5rem; align-items:flex-start;">
          <button class="compare-btn saved-open-btn" data-id="${college.id}">Open</button>
          <button class="compare-btn saved-remove-btn" data-id="${college.id}">Remove</button>
        </div>
      </article>`)
    .join("");

  for (const button of el.savedPanel.querySelectorAll(".saved-open-btn")) {
    button.addEventListener("click", () => {
      const id = button.getAttribute("data-id");
      if (!id) {
        return;
      }
      openSavedCollege(id);
    });
  }

  for (const button of el.savedPanel.querySelectorAll(".saved-remove-btn")) {
    button.addEventListener("click", () => {
      const id = button.getAttribute("data-id");
      if (!id) {
        return;
      }
      toggleSavedCollege(id);
    });
  }
}

function formatPercent(value) {
  if (typeof value !== "number") {
    return "N/A";
  }
  return `${Math.round(value * 100)}%`;
}

function formatCurrency(value) {
  if (typeof value !== "number") {
    return "N/A";
  }
  return `$${value.toLocaleString()}`;
}

function toPercent(value) {
  if (typeof value !== "number") {
    return null;
  }
  return Math.max(0, Math.min(100, value * 100));
}

function normalizeUrl(value) {
  if (!value || typeof value !== "string") {
    return null;
  }
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  return `https://${value}`;
}

function buildDonutSegments(items) {
  const valid = items.filter((item) => typeof item.value === "number" && item.value > 0);
  if (valid.length === 0) {
    return null;
  }

  const total = valid.reduce((sum, item) => sum + item.value, 0);
  if (total <= 0) {
    return null;
  }

  let offset = 0;
  const segments = valid.map((item) => {
    const pct = (item.value / total) * 100;
    const start = offset;
    const end = offset + pct;
    offset = end;
    return {
      label: item.label,
      color: item.color,
      percent: Number(((item.value / total) * 100).toFixed(1)),
      start,
      end,
    };
  });

  const legend = valid.map((item) => ({
    label: item.label,
    color: item.color,
    percent: Number(((item.value / total) * 100).toFixed(1)),
  }));

  return {
    segments,
    legend,
  };
}

function polarToCartesian(cx, cy, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

function donutArcPath(cx, cy, radius, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return [`M`, start.x, start.y, `A`, radius, radius, 0, largeArcFlag, 0, end.x, end.y].join(" ");
}

function buildDonutSvg(segments) {
  const size = 112;
  const center = size / 2;
  const radius = 42;

  return `
    <svg viewBox="0 0 ${size} ${size}" aria-hidden="true">
      ${segments
        .map((segment) => {
          const startAngle = (segment.start / 100) * 360;
          const endAngle = (segment.end / 100) * 360;
          const d = donutArcPath(center, center, radius, startAngle, endAngle);
          return `<path class="donut-segment" d="${d}" stroke="${segment.color}" stroke-width="26" fill="none" stroke-linecap="butt" data-label="${segment.label}" data-percent="${segment.percent.toFixed(1)}"></path>`;
        })
        .join("")}
    </svg>`;
}

function renderDonutChart(title, subtitle, donut) {
  if (!donut) {
    return `
      <div class="donut-card">
        <h5>${title}</h5>
        <p class="donut-subtitle">${subtitle}</p>
        <p class="donut-empty">Data unavailable</p>
      </div>
    `;
  }

  const legend = donut.legend
    .map(
      (item) => `
      <li data-label="${item.label}" data-percent="${item.percent.toFixed(1)}">
        <span class="swatch" style="background:${item.color}"></span>
        <span>${item.label}</span>
        <strong>${item.percent.toFixed(1)}%</strong>
      </li>`
    )
    .join("");

  return `
    <div class="donut-card">
      <h5>${title}</h5>
      <p class="donut-subtitle">${subtitle}</p>
      <div class="donut-ring">
        ${buildDonutSvg(donut.segments)}
        <div class="donut-center">
          <div>
            <div class="donut-center-value">100%</div>
            <div class="donut-center-label">Total</div>
          </div>
        </div>
      </div>
      <ul class="donut-legend">${legend}</ul>
    </div>
  `;
}

function bindDonutInteractions(container) {
  for (const card of container.querySelectorAll(".donut-card")) {
    const centerValue = card.querySelector(".donut-center-value");
    const centerLabel = card.querySelector(".donut-center-label");
    if (!centerValue || !centerLabel) {
      continue;
    }

    const resetCenter = () => {
      centerValue.textContent = "100%";
      centerLabel.textContent = "Total";
    };

    for (const segment of card.querySelectorAll(".donut-segment")) {
      segment.addEventListener("mouseenter", () => {
        const label = segment.getAttribute("data-label") || "Segment";
        const percent = segment.getAttribute("data-percent") || "0.0";
        centerValue.textContent = `${percent}%`;
        centerLabel.textContent = label;
      });
      segment.addEventListener("mouseleave", resetCenter);
    }

    for (const legendItem of card.querySelectorAll(".donut-legend li")) {
      legendItem.addEventListener("mouseenter", () => {
        const label = legendItem.getAttribute("data-label") || "Segment";
        const percent = legendItem.getAttribute("data-percent") || "0.0";
        centerValue.textContent = `${percent}%`;
        centerLabel.textContent = label;
      });
      legendItem.addEventListener("mouseleave", resetCenter);
    }
  }
}

function readStudentProfile() {
  return { ...studentProfile };
}

function renderProfileSummary() {
  if (!el.profileSummary) {
    return;
  }

  const parts = [];
  if (studentProfile.gpa != null) parts.push(`GPA ${studentProfile.gpa.toFixed(2)}`);
  if (studentProfile.sat != null) parts.push(`SAT ${studentProfile.sat}`);
  if (studentProfile.act != null) parts.push(`ACT ${studentProfile.act}`);
  if (studentProfile.budget != null) parts.push(`Budget ${formatCurrency(studentProfile.budget)}`);
  if (studentProfile.preferredState) parts.push(`State ${studentProfile.preferredState}`);
  if (studentProfile.preferredType) parts.push(studentProfile.preferredType);

  el.profileSummary.textContent = parts.length > 0
    ? `Profile saved: ${parts.join(" • ")}`
    : "No profile yet. Quiz results improve matching.";
}

function toNumber(value) {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function toInt(value) {
  if (!value) {
    return null;
  }
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function buildSearchParams() {
  const params = new URLSearchParams();
  if (el.query.value.trim()) params.set("q", el.query.value.trim());
  if (studentProfile.preferredState) params.set("state", studentProfile.preferredState);
  if (studentProfile.preferredType) params.set("type", studentProfile.preferredType);
  if (studentProfile.maxNetPrice != null) params.set("maxNetPrice", String(studentProfile.maxNetPrice));
  params.set("limit", "30");
  return params;
}

function openQuizModal() {
  if (!el.quizModal) {
    return;
  }

  el.quizGpa.value = studentProfile.gpa ?? "";
  el.quizSat.value = studentProfile.sat ?? "";
  el.quizAct.value = studentProfile.act ?? "";
  el.quizBudget.value = studentProfile.budget ?? "";
  el.quizState.value = studentProfile.preferredState ?? "";
  el.quizType.value = studentProfile.preferredType ?? "";
  el.quizMaxNetPrice.value = studentProfile.maxNetPrice ?? "";

  el.quizModal.hidden = false;
}

function closeQuizModal() {
  if (!el.quizModal) {
    return;
  }
  el.quizModal.hidden = true;
}

function saveQuizProfile() {
  studentProfile = {
    gpa: toNumber(el.quizGpa.value),
    sat: toInt(el.quizSat.value),
    act: toInt(el.quizAct.value),
    budget: toInt(el.quizBudget.value),
    preferredState: (el.quizState.value || "").trim().toUpperCase(),
    preferredType: (el.quizType.value || "").trim(),
    maxNetPrice: toInt(el.quizMaxNetPrice.value),
  };

  persistStudentProfile();
  renderProfileSummary();
  closeQuizModal();
  searchColleges();
}

async function searchColleges() {
  el.statusText.textContent = "Searching...";
  try {
    const params = buildSearchParams();
    const response = await fetch(`${API_BASE}/search?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Search failed (${response.status})`);
    }

    const payload = await response.json();
    searchResults = Array.isArray(payload.results) ? payload.results : [];
    for (const college of searchResults) {
      updateSavedCollegeSnapshot(college);
    }
    dataLastRefreshed = payload.dataLastRefreshed || "";
    renderResults();
    renderSavedColleges();
    const source = payload.source ? ` Source: ${payload.source}.` : "";
    const refreshed = dataLastRefreshed ? ` Last refreshed: ${formatRefreshTime(dataLastRefreshed)}.` : "";
    const cacheNote = payload.cache && payload.cache.hit ? " Cached result." : "";
    el.statusText.textContent = `Found ${searchResults.length} colleges.${source}${refreshed}${cacheNote}`;

    if (selectedIds.size > 0) {
      refreshCompare();
    }
  } catch (error) {
    el.statusText.textContent = "Could not load college data. Is backend running on port 8080?";
  }
}

function renderResults() {
  const sortedResults = sortResults(searchResults);

  if (sortedResults.length === 0) {
    el.resultsList.innerHTML = "<p class='status'>No colleges match these filters yet.</p>";
    el.detailPanel.textContent = "Select a college card to view details and fit insights.";
    return;
  }

  el.resultsList.innerHTML = sortedResults
    .map((college) => {
      const disabled = !selectedIds.has(college.id) && selectedIds.size >= 4;
      const selected = selectedIds.has(college.id);
      const isActive = activeCollegeId === college.id;
      return `
      <article class="school-row ${isActive ? "active" : ""}" data-card-id="${college.id}">
        <div>
          <h3>${college.name}</h3>
          <p class="meta">${college.type} • ${college.state} • Enrollment ${college.undergradEnrollment.toLocaleString()}</p>
          <div class="metrics">
            <span class="badge">Acceptance: ${formatPercent(college.acceptanceRate)}</span>
            <span class="badge">Net Price: ${formatCurrency(college.averageNetPrice)}</span>
            <span class="badge">Graduation (4yr): ${formatPercent(college.graduationRate4Year)}</span>
            <span class="badge">Salary (6yr): ${college.earningsMedian6Yrs ? "$" + (college.earningsMedian6Yrs / 1000).toFixed(0) + "k" : "N/A"}</span>
            <span class="badge">Faculty Ratio: ${college.studentFacultyRatio ? college.studentFacultyRatio.toFixed(1) + ":1" : "N/A"}</span>
            ${dataLastRefreshed ? `<span class="badge">Data refreshed: ${formatRefreshTime(dataLastRefreshed)}</span>` : ""}
          </div>
        </div>
        <div style="display:flex; gap:0.5rem; align-items:flex-start;">
          <button class="compare-btn" data-id="${college.id}" ${disabled ? "disabled" : ""}>
            ${selected ? "Remove" : "Compare"}
          </button>
          <button class="compare-btn save-btn" data-save-id="${college.id}">
            ${isSavedCollege(college.id) ? "Saved" : "Save"}
          </button>
        </div>
      </article>`;
    })
    .join("");

  for (const card of el.resultsList.querySelectorAll(".school-row")) {
    card.addEventListener("click", (event) => {
      if (event.target instanceof Element && event.target.closest(".compare-btn, .save-btn")) {
        return;
      }
      activeCollegeId = card.getAttribute("data-card-id");
      renderResults();
      renderDetailPanel(activeCollegeId);
    });
  }

  for (const button of el.resultsList.querySelectorAll(".compare-btn")) {
    if (button.classList.contains("save-btn")) {
      continue;
    }
    button.addEventListener("click", () => {
      const id = button.getAttribute("data-id");
      toggleSelection(id);
    });
  }

  for (const button of el.resultsList.querySelectorAll(".save-btn")) {
    button.addEventListener("click", () => {
      const id = button.getAttribute("data-save-id");
      if (!id) {
        return;
      }
      toggleSavedCollege(id);
    });
  }

  if (!activeCollegeId && sortedResults.length > 0) {
    activeCollegeId = sortedResults[0].id;
  }

  renderDetailPanel(activeCollegeId);
}

function formatRefreshTime(value) {
  if (!value) {
    return "Unknown";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

function sortResults(results) {
  const mode = el.sortBy.value;
  const copy = [...results];

  if (mode === "netPriceAsc") {
    return copy.sort((a, b) => (a.averageNetPrice ?? 0) - (b.averageNetPrice ?? 0));
  }

  if (mode === "retentionDesc") {
    return copy.sort((a, b) => (b.retentionRate ?? 0) - (a.retentionRate ?? 0));
  }

  if (mode === "acceptanceDesc") {
    return copy.sort((a, b) => (b.acceptanceRate ?? 0) - (a.acceptanceRate ?? 0));
  }

  return copy.sort((a, b) => a.name.localeCompare(b.name));
}

function renderDetailPanel(collegeId) {
  if (!collegeId) {
    el.detailPanel.textContent = "Select a college card to view details and fit insights.";
    return;
  }

  const college = searchResults.find((item) => item.id === collegeId);
  if (!college) {
    el.detailPanel.textContent = "Select a college card to view details and fit insights.";
    return;
  }

  const profile = readStudentProfile();
  const academic = classifyAcademicFit(college, profile);
  const financial = classifyFinancialFit(college, profile.budget);
  const websiteUrl = normalizeUrl(college.website);

  // Build donut charts for demographics
  const raceDonut = buildDonutSegments([
    { label: "White", value: college.raceWhiteShare, color: "#38bdf8" },
    { label: "Black", value: college.raceBlackShare, color: "#22c55e" },
    { label: "Hispanic", value: college.raceHispanicShare, color: "#f59e0b" },
    { label: "Asian", value: college.raceAsianShare, color: "#f97316" },
    { label: "Two+", value: college.raceTwoOrMoreShare, color: "#a78bfa" },
    { label: "Unknown", value: college.raceUnknownShare, color: "#64748b" },
  ]);

  const sexDonut = buildDonutSegments([
    { label: "Women", value: college.womenShare, color: "#fb7185" },
    { label: "Men", value: college.menShare, color: "#60a5fa" },
  ]);

  const generationDonut = buildDonutSegments([
    { label: "Continuing Gen", value: Math.max(0, 1 - (college.firstGenerationShare || 0)), color: "#3b82f6" },
    { label: "First Gen", value: college.firstGenerationShare || 0, color: "#10b981" },
  ]);

  const enrollmentDonut = buildDonutSegments([
    { label: "Full-Time", value: Math.max(0, 1 - (college.partTimeShare || 0)), color: "#8b5cf6" },
    { label: "Part-Time", value: college.partTimeShare || 0, color: "#f59e0b" },
  ]);

  const fitDescription = getFitDescription(academic, financial, college, profile);

  el.detailPanel.innerHTML = `
    <div style="overflow-y: auto; max-height: 600px; padding-right: 8px;">
      <h3 style="margin-top: 0; margin-bottom: 0.25rem;">${college.name}</h3>
      <p style="color: #94a3b8; margin: 0 0 1.5rem 0; font-size: 0.9rem;">${college.type} • ${college.state} | Urban</p>
      
      <!-- Two-Column Layout: Metrics + Fit Assessment -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem;">
        
        <!-- Left Column: At a Glance Metrics -->
        <div>
          <div style="background: #1e293b; padding: 1.2rem; border-radius: 8px; margin-bottom: 0;">
            <h4 style="margin: 0 0 1rem 0; font-size: 0.85rem; text-transform: uppercase; color: #cbd5e1; letter-spacing: 0.05em;">At a Glance</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; row-gap: 1.2rem;">
              <div>
                <p style="margin: 0; font-size: 0.8rem; color: #94a3b8; text-transform: uppercase; font-weight: 500;">Acceptance Rate</p>
                <p style="margin: 0.3rem 0 0 0; font-size: 1.3rem; font-weight: 700; color: #f9fafb;">${formatPercent(college.acceptanceRate)}</p>
              </div>
              <div>
                <p style="margin: 0; font-size: 0.8rem; color: #94a3b8; text-transform: uppercase; font-weight: 500;">Avg Net Price</p>
                <p style="margin: 0.3rem 0 0 0; font-size: 1.3rem; font-weight: 700; color: #f9fafb;">${formatCurrency(college.averageNetPrice)}</p>
              </div>
              <div>
                <p style="margin: 0; font-size: 0.8rem; color: #94a3b8; text-transform: uppercase; font-weight: 500;">Retention</p>
                <p style="margin: 0.3rem 0 0 0; font-size: 1.3rem; font-weight: 700; color: #f9fafb;">${formatPercent(college.retentionRate)}</p>
              </div>
              <div>
                <p style="margin: 0; font-size: 0.8rem; color: #94a3b8; text-transform: uppercase; font-weight: 500;">Next Deadline</p>
                <p style="margin: 0.3rem 0 0 0; font-size: 1.3rem; font-weight: 700; color: #f9fafb;">No data</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column: Is this college right for you? -->
        <div>
          <div style="background: #1e293b; padding: 1.2rem; border-radius: 8px; border-left: 4px solid #3b82f6;">
            <h4 style="margin: 0 0 1rem 0; font-size: 0.85rem; text-transform: uppercase; color: #cbd5e1; letter-spacing: 0.05em;">✨ Is this college right for you?</h4>
            <p style="margin: 0 0 1rem 0; font-size: 0.85rem; color: #cbd5e1; line-height: 1.4;">${fitDescription}</p>
            
            <div style="margin-top: 1rem;">
              <div style="display: flex; align-items: center; margin-bottom: 0.75rem;">
                <span style="color: #10b981; margin-right: 0.5rem; font-weight: 700; font-size: 1.2rem;">✓</span>
                <div>
                  <p style="margin: 0; font-weight: 600; color: #f9fafb; font-size: 0.9rem;">Academic Fit</p>
                  <p style="margin: 0.2rem 0 0 0; font-size: 0.8rem; color: #94a3b8;">${academic}</p>
                </div>
              </div>
              <div style="display: flex; align-items: center; margin-bottom: 0.75rem;">
                <span style="color: #10b981; margin-right: 0.5rem; font-weight: 700; font-size: 1.2rem;">✓</span>
                <div>
                  <p style="margin: 0; font-weight: 600; color: #f9fafb; font-size: 0.9rem;">Financial Fit</p>
                  <p style="margin: 0.2rem 0 0 0; font-size: 0.8rem; color: #94a3b8;">${financial}</p>
                </div>
              </div>
              <div style="display: flex; align-items: center;">
                <span style="color: #d1d5db; margin-right: 0.5rem; font-weight: 700; font-size: 1.2rem;">○</span>
                <div>
                  <p style="margin: 0; font-weight: 600; color: #f9fafb; font-size: 0.9rem;">GPA Match</p>
                  <p style="margin: 0.2rem 0 0 0; font-size: 0.8rem; color: #94a3b8;">Complete quiz for insights</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Academic Profile Section -->
      <div style="background: #1e293b; padding: 1.2rem; border-radius: 8px; margin-bottom: 1.5rem;">
        <h4 style="margin: 0 0 1rem 0; font-size: 0.95rem; text-transform: uppercase; color: #cbd5e1;">Academic Profile</h4>
        <div style="display: grid; gap: 0.8rem; font-size: 0.95rem;">
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #334155; padding-bottom: 0.5rem;">
            <span style="color: #94a3b8;">SAT Midpoint</span>
            <span style="color: #f9fafb; font-weight: 600;">${college.satMidpoint ?? "N/A"}</span>
          </div>
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #334155; padding-bottom: 0.5rem;">
            <span style="color: #94a3b8;">ACT Midpoint</span>
            <span style="color: #f9fafb; font-weight: 600;">${college.actMidpoint ?? "N/A"}</span>
          </div>
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #334155; padding-bottom: 0.5rem;">
            <span style="color: #94a3b8;">Student-Faculty Ratio</span>
            <span style="color: #f9fafb; font-weight: 600;">${college.studentFacultyRatio ? college.studentFacultyRatio.toFixed(1) + ":1" : "N/A"}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #94a3b8;">Enrollment</span>
            <span style="color: #f9fafb; font-weight: 600;">${college.undergradEnrollment.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <!-- Demographics with Multiple Donut Charts -->
      <div style="background: #1e293b; padding: 1.2rem; border-radius: 8px; margin-bottom: 1.5rem;">
        <h4 style="margin: 0 0 1rem 0; font-size: 0.95rem; text-transform: uppercase; color: #cbd5e1;">Student Demographics</h4>
        <div class="demographics-grid">
          ${renderDonutChart("Race/Ethnicity", "Share of enrolled students", raceDonut)}
          ${renderDonutChart("Sex Distribution", "Male and female students", sexDonut)}
          ${renderDonutChart("Generation", "First-gen vs continuing-gen", generationDonut)}
          ${renderDonutChart("Enrollment", "Full-time vs part-time students", enrollmentDonut)}
        </div>
      </div>

      <!-- Career & Financial -->
      <div style="background: #1e293b; padding: 1.2rem; border-radius: 8px; margin-bottom: 1.5rem;">
        <h4 style="margin: 0 0 1rem 0; font-size: 0.95rem; text-transform: uppercase; color: #cbd5e1;">Career & Financial Outcomes</h4>
        <div style="display: grid; gap: 0.8rem; font-size: 0.95rem;">
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #334155; padding-bottom: 0.5rem;">
            <span style="color: #94a3b8;">Median Earnings (6yrs)</span>
            <span style="color: #f9fafb; font-weight: 600;">${college.earningsMedian6Yrs ? "$" + college.earningsMedian6Yrs.toLocaleString() : "N/A"}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #94a3b8;">4-Year Graduation Rate</span>
            <span style="color: #f9fafb; font-weight: 600;">${formatPercent(college.graduationRate4Year)}</span>
          </div>
        </div>
      </div>

      ${websiteUrl ? `<a href="${websiteUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; margin-top: 1rem; padding: 0.75rem 1.5rem; background: #f97316; color: #0f172a; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 0.95rem; transition: background 0.2s;">Visit Website →</a>` : ""}
    </div>
  `;

  bindDonutInteractions(el.detailPanel);
}

function getFitDescription(academic, financial, college, profile) {
  const parts = [];
  
  if (academic === "Strong" && financial !== "Over Budget") {
    parts.push("This college matches your academic profile and fits your budget well.");
  } else if (academic === "Target" && financial !== "Over Budget") {
    parts.push("This college is a good match for your academic level and financial situation.");
  } else if (academic === "Reach") {
    parts.push("This is a challenging school academically, but could still be a good fit.");
  }

  if (profile.gpa === null || profile.sat === null) {
    parts.push("Complete the quiz above for more personalized insights about your academic fit.");
  }

  if (financial === "Over Budget") {
    parts.push("The average net price is above your stated budget, but many students receive aid.");
  }

  return parts.join(" ") || "Complete your profile for personalized fit assessment.";
}

function toggleSelection(id) {
  if (selectedIds.has(id)) {
    selectedIds.delete(id);
  } else if (selectedIds.size < 4) {
    selectedIds.add(id);
  }

  renderResults();
  refreshCompare();
}

function fitClass(value) {
  if (["Strong", "Within Budget", "Excellent"].includes(value)) return "fit-good";
  if (["Target", "Stretch", "Strong"].includes(value)) return "fit-warn";
  if (["Reach", "Over Budget", "Developing"].includes(value)) return "fit-risk";
  return "";
}

function classifyAcademicFit(college, profile) {
  const checks = [];
  if (profile.sat != null && college.satMidpoint != null) checks.push(profile.sat >= college.satMidpoint);
  if (profile.act != null && college.actMidpoint != null) checks.push(profile.act >= college.actMidpoint);

  if (checks.length === 0) return "Unknown";
  const met = checks.filter(Boolean).length / checks.length;
  if (met >= 0.8) return "Strong";
  if (met >= 0.5) return "Target";
  return "Reach";
}

function classifyFinancialFit(college, budget) {
  if (budget == null) return "Unknown";
  if (college.averageNetPrice <= budget) return "Within Budget";
  if (college.averageNetPrice <= budget + 5000) return "Stretch";
  return "Over Budget";
}

async function refreshCompare() {
  if (selectedIds.size === 0) {
    el.comparePanel.textContent = "Pick schools to build a side-by-side view.";
    return;
  }

  const params = new URLSearchParams();
  params.set("ids", Array.from(selectedIds).join(","));

  const profile = readStudentProfile();
  if (profile.gpa != null) params.set("gpa", String(profile.gpa));
  if (profile.sat != null) params.set("sat", String(profile.sat));
  if (profile.act != null) params.set("act", String(profile.act));
  if (profile.budget != null) params.set("budget", String(profile.budget));

  try {
    const response = await fetch(`${API_BASE}/compare?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Compare failed (${response.status})`);
    }

    const payload = await response.json();
    const rows = Array.isArray(payload.results) ? payload.results : [];

    if (rows.length === 0) {
      el.comparePanel.textContent = "No comparison data available for selected schools.";
      return;
    }

    const tableRows = rows
      .map((item) => {
        const c = item.college;
        return `
        <tr>
          <td><strong>${c.name}</strong><br/>${c.type} • ${c.state}</td>
          <td>${formatPercent(c.acceptanceRate)}</td>
          <td>${formatCurrency(c.averageNetPrice)}</td>
          <td>${formatPercent(c.retentionRate)}</td>
          <td>${formatPercent(c.graduationRate4Year)}</td>
          <td>${c.studentFacultyRatio ? c.studentFacultyRatio.toFixed(1) : "N/A"}</td>
          <td>${c.earningsMedian6Yrs ? "$" + (c.earningsMedian6Yrs / 1000).toFixed(0) + "k" : "N/A"}</td>
          <td class="${fitClass(item.fit.academic)}">${item.fit.academic}</td>
          <td class="${fitClass(item.fit.financial)}">${item.fit.financial}</td>
        </tr>`;
      })
      .join("");

    el.comparePanel.innerHTML = `
      <div style="overflow-x: auto;">
        <table class="compare-table">
          <thead>
            <tr>
              <th style="min-width: 180px;">College</th>
              <th>Acceptance</th>
              <th>Avg Net Price</th>
              <th>Retention</th>
              <th>Graduation (4yr)</th>
              <th>Faculty Ratio</th>
              <th>Salary (6yr)</th>
              <th>Academic Fit</th>
              <th>Financial Fit</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>`;
  } catch (error) {
    el.comparePanel.textContent = "Could not load comparison data.";
  }
}

el.searchBtn.addEventListener("click", searchColleges);
el.sortBy.addEventListener("change", renderResults);

if (el.quizBtn) {
  el.quizBtn.addEventListener("click", openQuizModal);
}

if (el.quizCloseBtn) {
  el.quizCloseBtn.addEventListener("click", closeQuizModal);
}

if (el.quizModal) {
  el.quizModal.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest('[data-close-quiz="true"]')) {
      closeQuizModal();
    }
  });
}

if (el.quizSaveBtn) {
  el.quizSaveBtn.addEventListener("click", saveQuizProfile);
}

if (el.copyStudentKeyBtn) {
  el.copyStudentKeyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(studentKey);
      el.statusText.textContent = "Student Key copied. Keep it safe to restore on another device.";
    } catch (error) {
      el.statusText.textContent = "Could not copy key. You can copy it manually from the Student Key line.";
    }
  });
}

if (el.restoreStudentKeyBtn) {
  el.restoreStudentKeyBtn.addEventListener("click", async () => {
    const value = (el.restoreStudentKeyInput?.value || "").trim();
    if (!value) {
      el.statusText.textContent = "Paste a Student Key to restore.";
      return;
    }

    studentKey = value;
    window.localStorage.setItem(STUDENT_KEY_STORAGE_KEY, studentKey);
    renderStudentKey();
    await loadCloudPersistence();
    renderProfileSummary();
    renderSavedColleges();
    searchColleges();
    el.statusText.textContent = "Restored data for this Student Key.";
  });
}

loadStudentKey();
loadStudentProfile();
loadSavedColleges();
renderStudentKey();
loadCloudPersistence().then(() => {
  renderProfileSummary();
  renderSavedColleges();
  searchColleges();
});
renderProfileSummary();
renderSavedColleges();

if (!searchResults.length) {
  searchColleges();
}
