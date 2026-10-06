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
