# FraudTrace Placeholders Log

Per prompt rule R2, all unspecified items and Phase 1, Phase 2, Phase 3, Phase 4, and Phase 5 placeholder decisions are recorded here with item, value chosen, reason, and status.
Code locations corresponding to these items are marked with `PLACEHOLDER(FT-<n>)`.

---

### FT-1: JWT Expiry
- **Item**: Expiration duration for signed JSON Web Tokens.
- **Value Chosen**: `'24h'` (24 hours).
- **Reason**: Balances session convenience for analysts conducting day-long investigations with security hygiene.
- **Status**: PENDING MY APPROVAL

### FT-2: Frontend Token Storage
- **Item**: Client-side storage and transmission mechanism for authentication tokens.
- **Value Chosen**: `localStorage` (key: `ft_token`), transmitted in `Authorization: Bearer <token>` HTTP header.
- **Reason**: Standard SPA token storage pattern specified in user Phase 1 guidance.
- **Status**: APPROVED (User Phase 1 decision 6)

### FT-3: Email Normalization
- **Item**: Strategy for normalizing email addresses on login and storage.
- **Value Chosen**: `email.trim().toLowerCase()`.
- **Reason**: Standard identity hygiene preventing case-sensitivity login mismatch.
- **Status**: PENDING MY APPROVAL

### FT-4: Password Rules
- **Item**: Password complexity / minimum length requirement.
- **Value Chosen**: Minimum length of 8 characters.
- **Reason**: Sensible baseline for development and seeded analyst/admin accounts without unnecessary password complexity locks.
- **Status**: PENDING MY APPROVAL

### FT-5: Login Error Wording
- **Item**: Response message on invalid authentication attempt.
- **Value Chosen**: `Invalid email or password` (HTTP 401).
- **Reason**: Industry security standard preventing account enumeration attacks.
- **Status**: PENDING MY APPROVAL

### FT-6: ANALYST vs ADMIN Permissions
- **Item**: Authorization differentiation between `ANALYST` and `ADMIN` roles.
- **Value Chosen**: Identical access across all Phase 1 endpoints (`/api/auth/me`, `/api/health`).
- **Reason**: Explicitly directed in user Phase 1 guidance item 6.
- **Status**: APPROVED (User Phase 1 decision 6)

### FT-7: DataBatch Source Allowed Values
- **Item**: Allowed enum values for `DataBatch.source`.
- **Value Chosen**: `['CSV_UPLOAD', 'SIMULATION']`.
- **Reason**: Directly represents the two documented ingestion vectors in Section 3.1 & 18.
- **Status**: PENDING MY APPROVAL

### FT-8: CSV Upload Size and Row Limits
- **Item**: Maximum file upload payload size and maximum transaction rows per batch.
- **Value Chosen**: Maximum 10 MB payload size, maximum 50,000 transaction rows per upload batch.
- **Reason**: Protects server memory and in-memory graph construction against denial-of-service while accommodating realistic analyst CSV uploads.
- **Status**: PENDING MY APPROVAL

### FT-9: Simulation Generator Parameters
- **Item**: Default seed and size definitions for `/api/data/simulate`.
- **Value Chosen**: Default `seed: 42`, size presets `'small'` (~120 transactions with planted patterns and near-misses) and `'medium'` (~500 transactions).
- **Reason**: Provides deterministic, reproducible synthetic datasets for fast local development and realistic detector evaluation.
- **Status**: PENDING MY APPROVAL

### FT-10: Graph Query Parameters and Node Limits
- **Item**: Query parameter specification and default/max node limits for `/api/graph/neighborhood` and `/api/graph/path`.
- **Value Chosen**:
  - Neighborhood: `entityId`, optional `entityType` (`ACCOUNT` | `DEVICE` | `MERCHANT`), `depth` (default: 1, max: 3), `limit` (default: 50, max: 100).
  - Path: `sourceId`, `targetId`, `maxDepth` (default: 4, max: 6), `directed` (boolean).
  - Node limit ceiling of 100 ensures the browser and Cytoscape remain responsive.
- **Reason**: Complies with Section 6 requirement that the graph API must limit returned nodes to keep browser rendering responsive.
- **Status**: PENDING MY APPROVAL

### FT-11: Fraud Detector Thresholds, Rule Version, and Severity Scale
- **Item**: Configurable threshold values, pattern rule version format, and alert severity scale.
- **Value Chosen**:
  - `RULE_VERSION`: `'v1.0.0'`
  - Circular Flow: `minLength: 3`, `maxLength: 5`, `maxTimeWindowMs: 86400000` (24h), `maxCycles: 50`
  - Fan-In / Fan-Out: `minDistinctSenders: 3`, `minDistinctReceivers: 3`, `maxTimeWindowMs: 86400000` (24h)
  - Shared Device: `minDistinctAccounts: 3` (avoids 2-person sharing per Doc 5.3)
  - Pass-Through: `minForwardingRatio: 0.80` (80%), `maxDelayMinutes: 60`, `minOccurrences: 2`
  - Merchant Cash-Out: `minRelatedAccounts: 2`, `maxTimeWindowMs: 7200000` (2h), requires shared device or direct relationship
  - Severity Scale: `'LOW'`, `'MEDIUM'`, `'HIGH'`, `'CRITICAL'`
- **Reason**: Directly implements the documented detector behaviors while preventing false-positive flagging on the planted benign controls and near-misses.
- **Status**: PENDING MY APPROVAL

### FT-12: Risk Score Scale and Range
- **Item**: Numerical range and scale for alerts, account risk, and fraud ring risk.
- **Value Chosen**: `0 - 100` integer score scale. Low risk (0-39), Medium risk (40-69), High risk (70-84), Critical risk (85-100).
- **Reason**: Intuitive, standard 0-100 investigative signal scale allowing clean UI visualizations, distribution charts, and filter thresholds.
- **Status**: PENDING MY APPROVAL

### FT-13: Risk Signal Categories and Category Contribution Caps
- **Item**: Deterministic feature-based category caps and points awarded for account and ring scoring.
- **Value Chosen**:
  - Account Risk Signals (Category Caps & Evidence Formulas):
    - Direct fraud pattern involvement: Category cap 50 points; formula: `min(50, 30 + 10 * detections)`.
    - Fraud ring membership: Category cap 25 points; awarded 25 points if member of at least one ring.
    - Device association / shared device: Category cap 15 points; awarded 10 points for shared device links.
    - Transaction velocity: Category cap 15 points; awarded 12 points for >= 5 transfer transactions.
    - Rapid pass-through behavior: Category cap 15 points; awarded 15 points if involved in pass-through flow.
  - Ring Risk Signals:
    - Max pattern severity in ring: up to 50 points.
    - Coordinated flow volume: up to 25 points.
    - Member density and multi-alert correlation: up to 25 points.
- **Reason**: Implements the documented 4 signal categories (Transaction, Network, Fraud Pattern, Temporal) deterministically with explicit category caps bounding evidence-based contribution points without machine learning.
- **Status**: PENDING MY APPROVAL

### FT-14: AnalysisRun Status and Trigger Enum Values
- **Item**: Allowed enum values for `AnalysisRun.status` and `AnalysisRun.trigger`.
- **Value Chosen**:
  - `status`: `['PENDING', 'RUNNING', 'COMPLETED', 'FAILED']`
  - `trigger`: `['MANUAL', 'SCHEDULED', 'DATA_INGEST']`
- **Reason**: Covers analyst manual trigger, potential automated batch ingestion triggers, and standard lifecycle statuses.
- **Status**: PENDING MY APPROVAL

### FT-15: FraudRing Deterministic Fingerprint and Label Format
- **Item**: Deterministic identity fingerprint and human-readable label convention for generated fraud rings.
- **Value Chosen**: 
  - Fingerprint: `RING:<sha256(canonicalMemberKeys).slice(0, 16)>` where member entity keys are canonicalized and sorted.
  - Label: `RING-<paddedIndex>` (e.g., `RING-001`, `RING-002`) stably preserved across analysis reruns.
- **Reason**: Ensures mathematical idempotency across analysis reruns on identical data while preserving consistent analyst case references.
- **Status**: PENDING MY APPROVAL

### FT-16: FraudRing Lifecycle Status
- **Item**: Allowed enum values for `FraudRing.status`.
- **Value Chosen**: `['ACTIVE', 'DISSOLVED']`.
- **Reason**: Enables explicit handling of rings that disappear after subsequent analysis runs when underlying signals resolve or fade, avoiding stale active rings while preserving historical audits.
- **Status**: APPROVED (User Phase 5 acceptance)

### FT-17: Frontend UI Icons (lucide-react)
- **Item**: Icon library for entity categorization, graph controls, and navigation.
- **Value Chosen**: `lucide-react` (~25 kB tree-shaken SVG icon primitives).
- **Reason**: Enables clean visual distinction of entity types (`ACCOUNT`, `DEVICE`, `MERCHANT`), risk tiers, graph zoom/fit controls, and investigation navigation without heavy external asset bundles.
- **Status**: APPROVED (User prompt approval via interactive selection prior to Phase 6 implementation)

### FT-18: Case Number Generation Mechanism
- **Item**: Case number format and generation mechanism for investigation cases.
- **Value Chosen**: Deterministic sequential identifier `FT-<number>`, starting at `FT-1001` (e.g. `FT-1001`, `FT-1002`), queried from the highest existing numeric suffix with atomic collision-retry protection.
- **Reason**: Matches documented case number example `FT-1042` without hardcoding; provides readable, deterministic, and safe case tracking.
- **Status**: APPROVED

### FT-19: CaseEvent Audit Trail Event Types
- **Item**: Enumeration of permitted event types for persistent case audit logging (`CaseEvent.eventType`).
- **Value Chosen**: `['CASE_CREATED', 'ALERT_ATTACHED', 'NOTE_ADDED', 'STATUS_CHANGED', 'DISPOSITION_SET', 'CASE_CLOSED', 'AI_BRIEF_GENERATED', 'AI_BRIEF_EDITED', 'AI_BRIEF_DECIDED', 'AI_QUESTION_ASKED']`.
- **Reason**: Captures all critical investigation lifecycle transitions required by Phase 7 and AI Copilot actions required by Phase 8 with structured provenance.
- **Status**: APPROVED

### FT-20: Case Status Transition and Disposition Rules
- **Item**: Rules governing case status transitions and final investigation disposition.
- **Value Chosen**:
  - Statuses: `['OPEN', 'INVESTIGATING', 'CLOSED']`.
  - Transitions: Cases transition freely between `OPEN` and `INVESTIGATING`. When transitioning to `CLOSED`, `closedAt` timestamp is recorded and `CASE_CLOSED` event is emitted. Reopening resets `closedAt` to null.
  - Dispositions: `['CONFIRMED_FRAUD', 'FALSE_POSITIVE', 'INCONCLUSIVE']`. Dispositions are analyst-selected decisions only; automated detectors, risk scores, or AI models are prohibited from setting final disposition.
- **Reason**: Simplest state machine satisfying the documented case workflow while guaranteeing that all transitions are logged and dispositions remain human-controlled.
- **Status**: APPROVED

### FT-21: AIBrief Kind Enum Values
- **Item**: Permitted enumeration values for `AIBrief.kind`.
- **Value Chosen**: `['INVESTIGATION_BRIEF', 'CASE_QA']`.
- **Reason**: Directly represents the two documented AI interaction modes in Sections 10 and 11: comprehensive case investigation brief and targeted case-specific Q&A.
- **Status**: APPROVED

### FT-22: AIBrief Verification Status Enum Values
- **Item**: Permitted enumeration values for `AIBrief.verificationStatus`.
- **Value Chosen**: `['VERIFIED', 'PARTIALLY_VERIFIED', 'UNVERIFIED', 'FALLBACK']`.
- **Reason**: Captures full evidence grounding verification, partial grounding, ungrounded/unsupported rejections, and deterministic fallback mode without pretending unverified outputs are verified.
- **Status**: APPROVED

### FT-23: Structured AI Output Schema and Evidence Citations
- **Item**: JSON structure returned by the AI copilot and evidence citation conventions.
- **Value Chosen**:
  - For `INVESTIGATION_BRIEF`:
    ```json
    {
      "executiveSummary": "string",
      "findings": [{ "id": "F-1", "claim": "string", "evidenceIds": ["E-ALERT-1"], "category": "FACTUAL_EVIDENCE" | "SUSPICIOUS_INDICATOR" | "INTERPRETATION" }],
      "suspiciousIndicators": ["string"],
      "entityRoles": [{ "entityId": "string", "role": "string", "supportingEvidenceIds": ["string"] }],
      "timelineAnalysis": "string",
      "limitations": ["string"],
      "recommendations": ["string"]
    }
    ```
  - For `CASE_QA`:
    ```json
    {
      "answer": "string",
      "evidenceIds": ["string"],
      "confidence": "GROUNDED" | "INSUFFICIENT_EVIDENCE",
      "unsupportedReason": "string | null"
    }
    ```
  - Evidence IDs are canonical catalog references (e.g. `E-ALERT-1`, `E-RING-1`, `E-TX-1`, `E-ACC-1`, `E-FACT-1`).
- **Reason**: Distinguishes factual evidence, suspicious indicators, entity roles, timeline, uncertainties, and recommendations while enforcing rigorous citation tracking per Section 7 and 10.
- **Status**: APPROVED

### FT-24: Deterministic Fallback Response Format
- **Item**: Structured fallback brief and Q&A behavior when `GEMINI_API_KEY` is unavailable or API fails.
- **Value Chosen**:
  - Rule-based brief synthesized directly from the canonical evidence snapshot (alerts, flow volume, rings, entities, derived metrics).
  - Explicit metadata: `model: 'deterministic-fallback'`, `promptVersion: 'v1.0.0'`, `verificationStatus: 'FALLBACK'`.
  - For ungrounded or absent question topics, explicitly returns `"Insufficient evidence available for this question."` with `confidence: 'INSUFFICIENT_EVIDENCE'`.
- **Reason**: Fulfills Section 9 requirement that the system must never fabricate Gemini model names or AI claims when the key is absent.
- **Status**: APPROVED

### FT-25: AIBrief Editable Fields and Analyst Decision Enum
- **Item**: Permitted editable fields on `PATCH /api/ai/briefs/:id` and allowed values for `AIBrief.analystDecision`.
- **Value Chosen**:
  - Allowed editable fields: `analystDecision` and `editedText`.
  - Prohibited fields: `caseId`, `evidenceHash`, `evidenceSnapshot`, `model`, `promptVersion`, `verificationStatus`, `verificationErrors` (strictly immutable to guarantee evidence provenance).
  - Allowed `analystDecision` values: `['PENDING', 'ACCEPTED', 'EDITED', 'DISCARDED']`.
- **Reason**: Preserves historical evidence integrity while enabling the analyst review/editing workflow per Sections 10.1 (Step 6) and 14.
- **Status**: APPROVED

### FT-26: CORS Allowed Origins
- **Item**: Allowed origins for Express HTTP and Socket.IO CORS configuration.
- **Value Chosen**: Origins parsed from `process.env.CORS_ORIGINS` (comma-separated list), defaulting to `['http://localhost:5173']` in development mode (`process.env.NODE_ENV !== 'production'`), and empty array / no default in production.
- **Reason**: Replaces wildcard `*` CORS in HTTP and Socket.IO with explicit origin whitelisting per BE-AUTH-4.
- **Status**: APPROVED

### FT-27: Rule Version v1.0.1 & Device Association Threshold Update
- **Item**: Bump `RULE_VERSION` to `v1.0.1` and award `DEVICE_ASSOCIATION` (+10 pts) only when a device is used by at least `DEFAULT_DETECTOR_CONFIG.sharedDevice.minDistinctAccounts` accounts (currently 3).
- **Value Chosen**:
  - `RULE_VERSION`: `'v1.0.1'` across all risk engine contributors and ring risk contributors.
  - In `calculateAccountRisk`, device links only qualify for `DEVICE_ASSOCIATION` if the device node is linked to $\ge 3$ distinct accounts in the graph. Two-person device sharing is treated as benign.
- **Reason**: Aligns risk engine account scoring with Section 5.3 benign two-person sharing policy and updates explainability versioning.
- **Status**: PENDING MY APPROVAL

### FT-28: Merchant Cash-Out Strict Subset Deduplication & Require Shared Device Flag
- **Item**: Merchant cash-out detector subset filtering and support for `config.requireSharedDevice`.
- **Value Chosen**:
  - Drop any `MERCHANT_CASHOUT` detection whose account set is a strict subset of another detection for the same merchant in an overlapping time window.
  - Support `config.requireSharedDevice` flag from `DEFAULT_DETECTOR_CONFIG.merchantCashOut` (default: `true`).
- **Reason**: Eliminates redundant nested alerts when a larger coordinated group paying the merchant in a sliding window already subsumes a smaller subgroup, stabilizing alert counts to 6 on seed 42 while maintaining 5 fraud rings.
- **Status**: APPROVED

### FT-29: Fraud Ring Alert Hub Limiting & Bridging Thresholds
- **Item**: High-degree alert hub exclusion and device bridging threshold in fraud ring grouping.
- **Value Chosen**:
  - Entities appearing in more than `maxAlertHubDegree` (default: 3) alerts are excluded from bridging alerts across clusters.
  - Device nodes only bridge alerts if linked to at least `sharedDeviceThreshold` (default: 3) distinct accounts.
- **Reason**: Enforces Section 6.4 rules to prevent super-connected entities from artificially collapsing independent fraud rings.
- **Status**: APPROVED

### FT-30: Standardized Currency Formatter (₹ / formatAmount)
- **Item**: Standardized currency symbol and formatting utility across all backend services.
- **Value Chosen**: Indian Rupee (`₹`) with Indian numbering locale (`en-IN`) implemented in shared utility `src/utils/format.js` (`formatAmount`).
- **Reason**: Standardizes currency display across detector summary strings, evidence catalog entries, deterministic fallbacks, and ring grouping evidence per Option B approval.
- **Status**: APPROVED

### FT-31: Strict Case Closure Disposition Validation & Event Emittance
- **Item**: Enforcement of valid case disposition on case closure, and audit event emittance.
- **Value Chosen**:
  - Closing a case strictly requires a valid disposition (`CONFIRMED_FRAUD`, `FALSE_POSITIVE`, `INCONCLUSIVE`), returning HTTP 400 if missing or invalid.
  - Updating disposition on an already-closed case preserves status and emits `DISPOSITION_SET`.
  - Closing a case emits `CASE_CLOSED`.
  - Every case mutation (create, update, note, alert attach) emits `case-updated` over Socket.IO.
- **Reason**: Fulfills Section 3.6 case workflow and Section 16 realtime event contracts.
- **Status**: APPROVED

### FT-32: Read-Only Graph Connectivity Metrics in Account Profile API
- **Item**: Exposure of account network degree and suspicious neighbors in Account API.
- **Value Chosen**:
  - `GET /api/accounts/:id` exposes read-only fields `networkDegree` (total adjacent graph edges) and `suspiciousNeighbors` (count of neighbors in fraud rings or alerts).
  - Does not alter risk scoring formulas or add unapproved routes.
- **Reason**: Fulfills Section 7 and 19 requirements to expose graph context in the account profile.
- **Status**: APPROVED

### FT-33: Dotenv Override in Development
- **Item**: Dotenv environment variable precedence in development vs production.
- **Value Chosen**: In `src/index.js`, `dotenv.config({ override: true })` is used when `NODE_ENV !== 'production'`. In production, default `dotenv.config()` is used, preserving platform-provided `PORT` (Render).
- **Reason**: Prevents stray shell or user environment variables (e.g., `PORT=3000`) from overriding `.env` settings (`PORT=5000`) during local development.
- **Status**: PENDING MY APPROVAL

### FT-34: Nodemon Development Server Watcher Configuration
- **Item**: Nodemon file watching boundaries and reload delay.
- **Value Chosen**: `backend/nodemon.json` watches only `src` and `.env`, ignores `scripts/*`, `node_modules/*`, and `*.json` data files, with a 500 ms reload delay.
- **Reason**: Prevents infinite restart loops or port collision races when running evaluation scripts, test suites, or writing JSON data files.
- **Status**: PENDING MY APPROVAL

### FT-35: Frontend Shared UI and Motion Extras
- **Item**: Shared UI component extensions and motion components (`src/components/motion/`, `Pictograph.tsx`, format helpers).
- **Value Chosen**:
  - `src/components/motion/`: `Reveal.tsx`, `SplitWords.tsx`, `ScrollRevealText.tsx`, `CountUpText.tsx`, `ProgressStrip.tsx` (`Marquee.tsx` initially included, subsequently removed per user instruction).
  - Shared UI additions: `Container.tsx`, `Pictograph.tsx`, `SectionLabel.tsx`, `Skeleton.tsx`.
  - Standardized formatting utility: `src/lib/format.ts` (`formatCurrency` using `₹` with `en-IN`, `formatDateTime`).
- **Reason**: Implements prompt requirements for Section 23 structure compliance, pure CSS/rAF motion primitives with zero dependencies, and unified Indian Rupee presentation.
- **Status**: APPROVED

### FT-36: WCAG AA Contrast Calibration for --text-3 and --text-2
- **Item**: Calibrated text tokens to ensure minimum 4.5:1 contrast ratio against `--bg` (`#FAF8F5`), `--surface` (`#FFFFFF`), and `--surface-2` (`#F3EFEA`).
- **Value Chosen**:
  - Raised `--text-3` from `#8A8F98` (contrast ~2.99:1) to `#5E646E` (contrast $\ge 5.0:1$ on all paper surfaces).
  - Raised `--text-2` to `#4A4F56` (contrast $\ge 7.0:1$ on all paper surfaces).
- **Reason**: Guarantees WCAG 2.1 AA accessibility compliance for small text, labels, and timestamps across the entire application and public marketing pages.
- **Status**: APPROVED

### FT-37: Recharts Library Retention and Dashboard Custom Pictograph
- **Item**: Dashboard distribution charts implementation and Recharts dependency status.
- **Value Chosen**: Replaced Recharts bar charts on the Dashboard with custom lightweight accessible `Pictograph.tsx` unit charts (displaying unit marks per alert with `1 mark = N alerts` scale, keyboard focus tooltip, and drilldown URL query parameters to `/alerts`). Retained `recharts` package in `package.json` as ASK-FIRST since Section 17 lists it in the stack documentation and removal requires documentation addendum.
- **Reason**: Complies with Step 4 instructions ("Replace both Recharts bar charts with a custom Pictograph component... if nothing imports it afterwards, do not uninstall it; report as ASK-FIRST").
- **Status**: PENDING MY APPROVAL (ASK-FIRST)

### FT-38: Code Splitting and Bundle Architecture
- **Item**: Route-level and heavy-component code splitting.
- **Value Chosen**: `React.lazy` and `Suspense` for all top-level route pages, Cytoscape graph canvas, and the Canvas 2D playground canvas.
- **Reason**: Reduces main JavaScript entry bundle size from 1,205.62 kB down to 271.39 kB (~77% reduction), ensuring landing page loads zero app dependencies and app screens load zero landing/playground code.
- **Status**: APPROVED

### FT-39: Explicit Button Contrast Tokens & Unified Component Hierarchy
- **Item**: Button foreground contrast tokens (`--on-primary`, `--on-secondary`, `--on-ghost`, `--on-danger`) and single unified `Button` / `LinkButton` component.
- **Value Chosen**: Added tokens in `src/index.css`: `--on-primary: #F7F5F0` (contrast 8.87:1 on `--primary: #2F4858`), `--on-primary-hover: #FFFFFF`, `--on-secondary: #1F2328`, `--on-ghost: #1F2328`, `--on-danger: #FFFFFF`. Replaced all disparate buttons and hand-styled anchor links with `Button` / `LinkButton` in `src/components/common/Button.tsx`, explicitly setting `color: var(--on-*) !important` across default, `:hover`, `:focus-visible`, `:active`, `:visited`, and `:disabled`. Deleted all unused per-page button CSS classes.
- **Reason**: Solves unreadable dark text on dark slate primary buttons across the landing page, login page, and application screens. Fulfills UI Fixes Round 2, Item 1.
- **Status**: PENDING MY APPROVAL

### FT-40: Global Public Container & Standardized Section Spacing Scale
- **Item**: Public page container component (`Container.tsx`) and section wrapper vertical spacing rules.
- **Value Chosen**: Introduced `Container.tsx` with `max-width: 1200px`, `margin-inline: auto`, and `padding-inline: clamp(20px, 5vw, 80px)`. Wrapped header, all landing sections, login page, CTA band, and footer within `Container`. Hairline separators stay 100% width. Standardized landing section wrappers to `padding-block: clamp(72px, 10vw, 144px)`, with minimum 96 px separation between section content and adjacent section hairlines.
- **Reason**: Eliminates screen-edge crowding on wide viewports, prevents section collision between Principles and Workflow, and ensures identical horizontal margins across copy, CTA boxes, and interactive canvases. Fulfills UI Fixes Round 2, Items 2 & 4.
- **Status**: PENDING MY APPROVAL

### FT-41: Dashboard KPI Source Harmonization & High-Risk Accounts Tile Substitution
- **Item**: Dashboard KPI data alignment with active API contracts and substitution of unsupported High-Risk Accounts tile.
- **Value Chosen**:
  - Total Alerts: sourced from API pagination count/summary (`alertsRes.count ?? alertsRes.alerts.length`).
  - Critical Severity: derived using identical threshold condition as the risk-tier distribution pictograph (`alerts.filter(a => a.score >= (rules.riskThresholds.critical[0] ?? 85)).length`).
  - High-Risk Accounts Tile Substitution: Replaced with "Open Alerts" (`alerts.filter(a => a.triageStatus === 'NEW').length`, subtitle: "Awaiting analyst triage"), because no backend endpoint exists to count unique accounts with risk score $\ge 70$ without modifying backend contracts.
  - Fraud Rings: sourced directly from `GET /api/rings` (`rings.length`, subtitle: "Coordinated clusters identified").
  - Ingested Transactions: computed from batch model records (`batches.reduce((sum, b) => sum + (b.acceptedRows ?? b.recordCount ?? 0), 0)`).
  - Risk Tier Labels & Rule Version: loaded dynamically from `GET /api/analysis/rules` (`rules.riskThresholds`, `rules.ruleVersion`).
- **Reason**: Eliminates number discrepancies across dashboard tiles, charts, and queues without making unauthorized backend schema or route modifications. Fulfills UI Fixes Round 2, Item 7.
- **Status**: PENDING MY APPROVAL

### FT-42: Ground-Truth Alignment of Synthetic Landing Evidence
- **Item**: Replacement of invented landing entity IDs, arbitrary risk score, and unsupported claims with authentic simulation generator ground truth.
- **Value Chosen**:
  - Replaced invented IDs (`ACC_01`, `DEV_POS_09`, `MERCH_QUICK`, score "88") with authentic planted 3-hop circular flow pattern from `backend/src/simulation/generator.js` (`ACC-CIRC-1A`, `ACC-CIRC-1B`, `ACC-CIRC-1C`, `DEV-C1-A`, `DEV-C1-B`, `DEV-C1-C`, ₹12,500 → ₹12,200 → ₹12,000, 90-minute cycle, RING-002).
  - Replaced evidence card signals with verified engine contributors: `FRAUD_PATTERN_INVOLVEMENT (+40)`, `FRAUD_RING_MEMBERSHIP (+25)`, `TEMPORAL_VELOCITY` (90m cycle).
  - Aligned Section 24 product workflow description with real 4-phase lifecycle (Batch CSV upload, in-memory graph detection, explainable scoring, verified case brief & disposition).
  - Removed unsupported terminology ("continuous ingestion", "device hardware", "rejection telemetry", "zero opaque probability distributions") and pruned dead footer links.
- **Reason**: Eliminates fake marketing claims and synchronizes the landing page with backend seed/generator/evaluation ground truth per UI Fixes Round 2, Item 8.
- **Status**: PENDING MY APPROVAL

### FT-43: Calibrated Section Spacing Scale & Single-Hairline Visual Rhythm
- **Item**: Landing section padding, hero vertical rhythm, and single-hairline section boundaries.
- **Value Chosen**:
  - Hero vertical rhythm: label to headline 20px, headline to paragraph 28px, paragraph to button row 40px, button row to bottom of hero 72px; paragraph `max-width: 56ch`, `line-height: 1.6`. Primary button and ghost "Read architecture" link both use size `lg` (48px height).
  - Section vertical rhythm: `padding-block: clamp(56px, 7vw, 96px)`. Removed extra full-width `.sectionRule` divs in favor of a single `border-top: 1px solid var(--border)` on each `<section>`.
  - Inside-section rhythm: label to heading 16px, heading to body 24px, body to content block 48px, grid gap 32-48px.
  - CTA band, playground frame, and footer separated by 48-64px. Footer top padding 56px with single hairline above status line.
  - Sticky header: `overflow-x: clip` on landing container (resolves sticky navbar failure from `overflow-x: hidden`), `height: 64px`, solid `--bg` background, `scroll-margin-top: 80px` on all section IDs.
- **Reason**: Eliminates excessive empty space and duplicate section dividers while providing rock-solid sticky navigation and baseline-aligned hero actions per UI Fixes Round 3, Items 1, 2, and 6.
- **Status**: PENDING MY APPROVAL

### FT-44: Unified Wordmark Component & Heading Token Hierarchy
- **Item**: Shared `Wordmark.tsx` component and standardized typography tokens across public and internal surfaces.
- **Value Chosen**:
  - Created `src/components/Wordmark.tsx` governed by token `--wordmark-size: 26px` (24px below 640px), EB Garamond 600, letter-spacing -0.01em, line-height 1. Replaces all hand-styled wordmarks across landing header, mobile menu, login header, sidebar, and footer.
  - Sidebar: header block height equals top bar height (56px for both), with vertically centered wordmark. Collapsed sidebar (56px wide) displays "FT" in identical font and weight at 22px.
- **Reason**: Resolves brand sizing disparities between marketing and workspace layouts per UI Fixes Round 3, Item 8.
- **Status**: PENDING MY APPROVAL

### FT-45: Centered Single-Card Analyst Workspace Login Architecture
- **Item**: Login page architecture and credential presentation.
- **Value Chosen**:
  - Replaced 2-column split with a single, horizontally and vertically centered `Card` (max-width 460px, padding 40px, min-height `calc(100dvh - 64px - 56px)`).
  - Top-to-bottom card flow: mono kicker "SIGN IN", EB Garamond heading "Sign in to FraudTrace", short description "Analyst workspace on synthetic demo data.", email `Field`, password `Field` with show/hide toggle, inline error `Banner` above button, primary full-width `Button` with loading state.
  - Initial form states strictly set to empty strings (`''`); zero hardcoded demo credentials, zero signup links.
- **Reason**: Delivers focused, accessible analyst sign-in aligned with public branding per UI Fixes Round 3, Item 7.
- **Status**: PENDING MY APPROVAL

### FT-46: Global Button System Standardization & File Chooser Harmonization
- **Item**: Elimination of rogue button-like styling and custom file input presentation.
- **Value Chosen**:
  - On Data Management page, replaced native `<input type="file">` selector with a secondary button-styled `<label>` wrapping a hidden file input, and unified "Upload & Ingest" with primary `Button`.
  - Replaced ad-hoc account tag buttons in Alert Investigation drawer and Ring Detail member table with shared `Button` / `LinkButton` components (`variant="secondary"` and `variant="ghost"`).
  - Ensured every interactive button across the application inherits standard `--on-*` foreground tokens.
- **Reason**: Enforces unified button aesthetics (slate with light text for primary, surface-2 for secondary, transparent for ghost) across all workspace views per UI Fixes Round 3, Item 9.
- **Status**: PENDING MY APPROVAL

### FT-47: Principles Interactive Cards, Footer Column Expansion & Login Form Spacing Calibration
- **Item**: Principles A/B/C interactive cards upgrade, three-column footer link reorganization, and login form spacing calibration.
- **Value Chosen**:
  - Principles Cards: Upgraded the 3 columns into interactive `Card` components (`variant="interactive"`, 32px padding, equal height, 24px gap between letter chip, title, and body, resting `--shadow-card`, hover/focus `translateY(-2px)`, `--shadow-card-hover`, `--border-strong`, 200ms `--ease-out`, 2px top `--accent` line drawn left-to-right on hover, sibling dimming to `0.55`, letter chip hover fill to `--accent` with `--on-primary` text). Added 56px token-only inline SVGs (Card A graph nodes with hover edge draw-in and `--edge-suspicious` highlight; Card B 4 horizontal score bars with 60ms stagger grow; Card C 3 chips with check/pencil/cross where chip 1 fills with `--primary` and `--on-primary` mark on hover). Mobile stacked 1 column with 16px gap. All animations disabled under `prefers-reduced-motion` and `(hover: none)`.
  - Footer Columns: Regrouped link area into three equal link columns alongside brand: Navigation (5 links: Product, Detectors, Principles, Workflow, Copilot), Investigate (4 links: Dashboard, Alerts, Fraud Rings, Graph Explorer), and Workspace (4 links: Cases, Data Management, Rules, Sign In to Workspace). Configured grid `1.6fr 1fr 1fr 1fr` inside container with responsive breakpoints at $\le 900\text{px}$ (brand spans full width, 3 link columns in a row), $\le 560\text{px}$ (2 link columns), and $\le 400\text{px}$ (1 column).
  - Login Form Spacing: Scoped strictly to `LoginPage.module.css` (zero modifications to shared `Field` component). Form configured as flex column with 20px gap. Label-to-input gap set to 8px. Password field to primary button total spacing set to 28px (via 8px `margin-top` on `.buttonWrapper` combined with 20px flex gap). Error `Banner` spaced at 16px above and 16px below when rendered (via -4px top/bottom margins).
- **Reason**: Fulfills Follow-up Three Targeted Changes (Change 1, Change 2, Change 3) without introducing new dependencies, backend changes, or modifying shared Field components.
- **Status**: PENDING MY APPROVAL




