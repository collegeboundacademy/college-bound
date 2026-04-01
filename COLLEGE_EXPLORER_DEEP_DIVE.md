# College Explorer Deep Dive (college-bound)

This document explains how the College Explorer feature works end-to-end across frontend and backend, including query behavior, fit classification, compare mode, and demographic donut rendering.

## 1) User Experience Flow

1. User opens College Explorer page.
2. Initial search auto-runs (`searchColleges()` at startup).
3. User can:
   - enter text query
   - open Personalized Quiz
   - set profile data (GPA/SAT/ACT/budget/state/type/max net price)
4. Search results render as cards.
5. User selects a card for detailed panel insights.
6. User can select up to 4 colleges for side-by-side comparison.

## 2) Frontend Runtime Configuration

API base URL is injected from Jekyll config:

- `window.COLLEGE_EXPLORER_API_BASE` set in page template.
- `_config.yml` currently points to:
  - `https://college-bound-backend.onrender.com/api/colleges`

If missing, frontend fallback is:

- `http://localhost:8080/api/colleges`

## 3) Search Request Contract

Frontend endpoint:

- `GET /search`

Query params sent by UI:

- `q` (school text query)
- `state` (from quiz preferred state)
- `type` (Public/Private from quiz)
- `maxNetPrice` (from quiz)
- `limit=30`

Response fields used by UI:

- `results` array
- `source`
- `dataLastRefreshed`
- `cache.hit`

## 4) Comparison Request Contract

Frontend endpoint:

- `GET /compare`

Query params:

- `ids` (comma-separated selected college IDs, max 4)
- optional `gpa`, `sat`, `act`, `budget`

Response shape:

- `results[]` with:
  - `college` object
  - `fit` object containing `academic`, `financial`, `outcomes`

## 5) Student Profile Model (Frontend)

The quiz writes to in-memory `studentProfile`:

- `gpa`
- `sat`
- `act`
- `budget`
- `preferredState`
- `preferredType`
- `maxNetPrice`

Behavior:

- Profile summary text updates immediately.
- Saving quiz auto-triggers a fresh search.
- Profile is used in detail fit and compare fit calculations.

## 6) Fit Classification Logic

### Academic Fit

Used both client-side (detail panel) and server-side (compare payload):

- Compare SAT/ACT against college SAT/ACT midpoint when available.
- Ratio = checks passed / checks performed.
- Classification:
  - `Strong` if ratio >= 0.8
  - `Target` if ratio >= 0.5
  - `Reach` otherwise
  - `Unknown` if no SAT/ACT checks possible

### Financial Fit

- `Within Budget` if net price <= budget
- `Stretch` if net price <= budget + 5000
- `Over Budget` otherwise
- `Unknown` when budget missing

### Outcome Fit (backend compare)

- Based on retention rate:
  - `Excellent` >= 0.95
  - `Strong` >= 0.90
  - `Developing` otherwise
  - `Unknown` if missing

## 7) Demographic Donut Charts

Two donut visualizations are generated in the detail panel:

1. Race Distribution donut
2. Sex Distribution donut

Implementation details:

- Data values are percentages as fractions from backend (for example `0.22`).
- `buildDonutSegments()` filters invalid/zero values.
- Segment math normalizes by total available values.
- Visual uses CSS `conic-gradient(...)` for ring fill.
- Legend includes color + label + computed percent.
- If all values are missing/invalid, card displays `Data unavailable`.

Race fields consumed:

- `raceWhiteShare`
- `raceBlackShare`
- `raceHispanicShare`
- `raceAsianShare`
- `raceTwoOrMoreShare`
- `raceUnknownShare`

Sex fields consumed:

- `womenShare`
- `menShare`

## 8) Result Sorting Modes

UI supports these sort options:

- Name A-Z
- Net price ascending
- Retention descending
- Acceptance descending

Sorting is client-side on current result set.

## 9) Data Provenance and Freshness

Backend search response includes provenance metadata:

- `source` identifies data source context.
- `dataLastRefreshed` surfaced in status and badges.
- cache note appears when backend cache hit occurs.

This gives users visibility into where results came from and when they were fetched.

## 10) Backend Data Mapping Behind Explorer

The Explorer backend maps College Scorecard fields into the `College` object, including:

- admissions/acceptance
- net price
- retention
- SAT/ACT midpoints
- enrollment
- earnings (6 years)
- first-generation share
- part-time share
- demographic race/sex shares

When live API is unavailable, backend can fall back to sample data entries for continuity.

## 11) Display Sections in Detail Panel

The college detail panel is composed of:

1. At a Glance
2. Academic Profile
3. Career and Financial
4. Student Demographics (donuts)
5. Your Fit (academic + financial)
6. Website CTA button (if URL available)

## 12) Limits and Constraints

- Compare selection is capped at 4 colleges.
- Missing metrics are rendered as `N/A` or `Unknown` rather than failing UI.
- Website links are normalized to include protocol when missing.

## 13) Files That Implement Explorer

Frontend:

- `college-explorer/index.md`
- `college-explorer/script.js`
- `college-explorer/style.css`
- `_config.yml`

Backend support:

- `src/main/java/com/collegebound/demo/college/CollegeExplorerController.java`
- `src/main/java/com/collegebound/demo/college/CollegeScorecardClient.java`
- `src/main/java/com/collegebound/demo/college/College.java`

## 14) Validation Checklist

After deployment/config changes, validate:

1. Search returns results from live backend endpoint.
2. Status line shows source and refresh metadata.
3. Detail panel opens and shows donut charts where data exists.
4. Compare table loads up to 4 schools.
5. Fit labels respond to quiz profile changes.
6. No CORS errors in browser console.
