---
layout: page
title: College Explorer
permalink: /college-explorer/
---

<link rel="stylesheet" href="{{ '/college-explorer/style.css' | relative_url }}" />

<section class="explorer-page">
  <main class="explorer-shell">
    <header class="hero">
      <p class="eyebrow">College Planning Hub</p>
      <h1>Find colleges that fit your grades, goals, and budget.</h1>
      <p class="subtitle">Search schools, compare outcomes, and see academic and financial fit in one place.</p>
    </header>

    <section class="controls card">
      <div class="top-actions-grid">
        <div class="top-action-card">
          <label>
            School search
            <input id="query" type="text" placeholder="Try: Georgia Tech, UCLA, Howard" autocomplete="off" autocapitalize="off" spellcheck="false" />
          </label>
          <button id="searchBtn" class="btn-primary" type="button">Search Colleges</button>
        </div>

        <div class="top-action-card quiz-card">
          <h3>Personalized Quiz</h3>
          <p class="quiz-subtitle">Answer a few questions and we will use your profile to classify schools as Reach, Target, or Strong.</p>
          <button id="quizBtn" class="btn-secondary" type="button">Take Personalized Quiz</button>
          <p id="profileSummary" class="status">No profile yet. Quiz results improve matching.</p>
          <p id="studentKeyText" class="status">Student Key: Generating...</p>
          <div class="actions" style="margin-top:0.5rem; display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap;">
            <button id="copyStudentKeyBtn" class="compare-btn" type="button">Copy Key</button>
            <input id="restoreStudentKeyInput" type="text" placeholder="Paste key to restore" style="min-width:200px;" />
            <button id="restoreStudentKeyBtn" class="compare-btn" type="button">Restore</button>
          </div>
        </div>
      </div>

      <div class="actions">
        <p id="statusText" class="status" aria-live="polite"></p>
      </div>
    </section>

    <section class="results card">
      <div class="section-head">
        <h2>Results</h2>
        <p>Select up to 4 schools to compare</p>
      </div>
      <div class="section-tools">
        <label>
          Sort by
          <select id="sortBy">
            <option value="name">Name (A-Z)</option>
            <option value="netPriceAsc">Net price (low to high)</option>
            <option value="retentionDesc">Retention (high to low)</option>
            <option value="acceptanceDesc">Acceptance (high to low)</option>
          </select>
        </label>
      </div>

      <div class="results-grid">
        <div id="resultsList" class="results-list"></div>
        <aside id="detailPanel" class="detail-panel">
          Select a college card to view details and fit insights.
        </aside>
      </div>
    </section>

    <section class="compare card">
      <div class="section-head">
        <h2>Comparison</h2>
      </div>
      <div id="comparePanel" class="compare-panel">Pick schools to build a side-by-side view.</div>
    </section>

    <section class="compare card">
      <div class="section-head">
        <h2>Saved Colleges</h2>
        <p>Saved on this device for future visits.</p>
      </div>
      <div id="savedPanel" class="compare-panel">No saved colleges yet. Click Save on any result card.</div>
    </section>
  </main>
</section>

<div id="quizModal" class="quiz-modal" hidden>
  <div class="quiz-backdrop" data-close-quiz="true"></div>
  <div class="quiz-dialog" role="dialog" aria-modal="true" aria-labelledby="quizTitle">
    <div class="quiz-head">
      <h3 id="quizTitle">Personalized College Match Quiz</h3>
      <button id="quizCloseBtn" class="quiz-close" type="button" aria-label="Close quiz">×</button>
    </div>

    <div class="quiz-grid">
      <label>
        GPA
        <input id="quizGpa" type="number" min="0" max="4" step="0.01" placeholder="3.70" />
      </label>
      <label>
        SAT
        <input id="quizSat" type="number" min="400" max="1600" step="10" placeholder="1280" />
      </label>
      <label>
        ACT
        <input id="quizAct" type="number" min="1" max="36" step="1" placeholder="28" />
      </label>
      <label>
        Yearly Budget ($)
        <input id="quizBudget" type="number" min="0" step="100" placeholder="18000" />
      </label>
      <label>
        Preferred State (optional)
        <input id="quizState" type="text" maxlength="2" placeholder="CA" />
      </label>
      <label>
        School Type (optional)
        <select id="quizType">
          <option value="">Any</option>
          <option value="Public">Public</option>
          <option value="Private">Private</option>
        </select>
      </label>
      <label>
        Max Net Price (optional)
        <input id="quizMaxNetPrice" type="number" min="0" step="100" placeholder="25000" />
      </label>
    </div>

    <div class="quiz-actions">
      <button id="quizSaveBtn" class="btn-primary" type="button">Save Quiz Profile</button>
    </div>
  </div>
</div>

<script>
  window.COLLEGE_EXPLORER_API_BASE = "{{ site.college_explorer_api_base | default: 'http://localhost:8080/api/colleges' }}";
</script>
<script src="{{ '/college-explorer/script.js' | relative_url }}"></script>
