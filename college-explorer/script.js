const API_BASE = window.COLLEGE_EXPLORER_API_BASE || "http://localhost:8080/api/colleges";

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
  statusText: document.getElementById("statusText"),
  sortBy: document.getElementById("sortBy"),
  resultsList: document.getElementById("resultsList"),
  detailPanel: document.getElementById("detailPanel"),
  comparePanel: document.getElementById("comparePanel"),
};

let searchResults = [];
const selectedIds = new Set();
let activeCollegeId = null;
let dataLastRefreshed = "";
let studentProfile = {
  gpa: null,
  sat: null,
  act: null,
  budget: null,
  preferredState: "",
  preferredType: "",
  maxNetPrice: null,
};

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
    return `${item.color} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
  });

  const legend = valid.map((item) => ({
    label: item.label,
    color: item.color,
    percent: ((item.value / total) * 100).toFixed(1),
  }));

  return {
    gradient: `conic-gradient(${segments.join(", ")})`,
    legend,
  };
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
      <li>
        <span class="swatch" style="background:${item.color}"></span>
        <span>${item.label}</span>
        <strong>${item.percent}%</strong>
      </li>`
    )
    .join("");

  return `
    <div class="donut-card">
      <h5>${title}</h5>
      <p class="donut-subtitle">${subtitle}</p>
      <div class="donut-ring" style="--ring:${donut.gradient}"></div>
      <ul class="donut-legend">${legend}</ul>
    </div>
  `;
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
    dataLastRefreshed = payload.dataLastRefreshed || "";
    renderResults();
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
        <button class="compare-btn" data-id="${college.id}" ${disabled ? "disabled" : ""}>
          ${selected ? "Remove" : "Compare"}
        </button>
      </article>`;
    })
    .join("");

  for (const card of el.resultsList.querySelectorAll(".school-row")) {
    card.addEventListener("click", (event) => {
      if (event.target instanceof Element && event.target.closest(".compare-btn")) {
        return;
      }
      activeCollegeId = card.getAttribute("data-card-id");
      renderResults();
      renderDetailPanel(activeCollegeId);
    });
  }

  for (const button of el.resultsList.querySelectorAll(".compare-btn")) {
    button.addEventListener("click", () => {
      const id = button.getAttribute("data-id");
      toggleSelection(id);
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

  el.detailPanel.innerHTML = `
    <div style="overflow-y: auto; max-height: 800px; padding-right: 8px;">
      <h3 style="margin-top: 0;">${college.name}</h3>
      <p style="color: #94a3b8; margin-bottom: 1.5rem;">${college.type} • ${college.state}</p>
      
      <!-- At a Glance Section -->
      <div style="background: #1e293b; padding: 1.2rem; border-radius: 8px; margin-bottom: 1.5rem;">
        <h4 style="margin: 0 0 1rem 0; font-size: 0.95rem; text-transform: uppercase; color: #cbd5e1;">At a Glance</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div>
            <p style="margin: 0; font-size: 0.85rem; color: #94a3b8;">Acceptance Rate</p>
            <p style="margin: 0.25rem 0 0 0; font-size: 1.5rem; font-weight: 600; color: #f9fafb;">${formatPercent(college.acceptanceRate)}</p>
          </div>
          <div>
            <p style="margin: 0; font-size: 0.85rem; color: #94a3b8;">Avg Net Price</p>
            <p style="margin: 0.25rem 0 0 0; font-size: 1.5rem; font-weight: 600; color: #f9fafb;">${formatCurrency(college.averageNetPrice)}</p>
          </div>
          <div>
            <p style="margin: 0; font-size: 0.85rem; color: #94a3b8;">Retention</p>
            <p style="margin: 0.25rem 0 0 0; font-size: 1.5rem; font-weight: 600; color: #f9fafb;">${formatPercent(college.retentionRate)}</p>
          </div>
          <div>
            <p style="margin: 0; font-size: 0.85rem; color: #94a3b8;">Graduation (4yr)</p>
            <p style="margin: 0.25rem 0 0 0; font-size: 1.5rem; font-weight: 600; color: #f9fafb;">${formatPercent(college.graduationRate4Year)}</p>
          </div>
        </div>
      </div>

      <!-- Academic Profile -->
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

      <!-- Career & Financial -->
      <div style="background: #1e293b; padding: 1.2rem; border-radius: 8px; margin-bottom: 1.5rem;">
        <h4 style="margin: 0 0 1rem 0; font-size: 0.95rem; text-transform: uppercase; color: #cbd5e1;">Career & Financial</h4>
        <div style="display: grid; gap: 0.8rem; font-size: 0.95rem;">
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #334155; padding-bottom: 0.5rem;">
            <span style="color: #94a3b8;">Median Earnings (6yrs)</span>
            <span style="color: #f9fafb; font-weight: 600;">${college.earningsMedian6Yrs ? "$" + college.earningsMedian6Yrs.toLocaleString() : "N/A"}</span>
          </div>
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #334155; padding-bottom: 0.5rem;">
            <span style="color: #94a3b8;">First-Gen Students</span>
            <span style="color: #f9fafb; font-weight: 600;">${college.firstGenerationShare ? formatPercent(college.firstGenerationShare) : "N/A"}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #94a3b8;">Part-Time Students</span>
            <span style="color: #f9fafb; font-weight: 600;">${college.partTimeShare ? formatPercent(college.partTimeShare) : "N/A"}</span>
          </div>
        </div>
      </div>

      <div style="background: #1e293b; padding: 1.2rem; border-radius: 8px; margin-bottom: 1.5rem;">
        <h4 style="margin: 0 0 1rem 0; font-size: 0.95rem; text-transform: uppercase; color: #cbd5e1;">Student Demographics</h4>
        <div class="demographics-grid">
          ${renderDonutChart("Race Distribution", "Share of enrolled students", raceDonut)}
          ${renderDonutChart("Sex Distribution", "Men and women share", sexDonut)}
        </div>
      </div>
      
      <!-- Fit Indicators -->
      <div style="background: #1e293b; padding: 1.2rem; border-radius: 8px; margin-bottom: 1.5rem;">
        <h4 style="margin: 0 0 1rem 0; font-size: 0.95rem; text-transform: uppercase; color: #cbd5e1;">Your Fit</h4>
        <div style="display: grid; gap: 0.8rem;">
          <p style="margin: 0; font-size: 0.95rem;"><span style="color: #94a3b8;">Academic:</span> <span class="${fitClass(academic)}" style="font-weight: 600;">${academic}</span></p>
          <p style="margin: 0; font-size: 0.95rem;"><span style="color: #94a3b8;">Financial:</span> <span class="${fitClass(financial)}" style="font-weight: 600;">${financial}</span></p>
        </div>
      </div>

      ${websiteUrl ? `<a href="${websiteUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; margin-top: 0.5rem; padding: 0.75rem 1.5rem; background: #f97316; color: #0f172a; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 0.95rem; transition: background 0.2s;">Visit Website</a>` : ""}
    </div>
  `;
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

renderProfileSummary();

searchColleges();
