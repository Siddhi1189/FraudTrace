# FraudTrace

## AI-Assisted Fraud Investigation Platform

**Project Documentation · Revision 3 · October 2026**

> A graph-based fraud investigation workspace that connects accounts,
> devices, merchants and transactions, detects suspicious fraud rings,
> explains risk, and uses grounded AI to help analysts investigate
> cases.

------------------------------------------------------------------------

# 1. Project Overview

FraudTrace is a full-stack fraud investigation platform for identifying
organized fraud that is difficult to detect from individual transactions
alone.

The system models financial activity as a connected network of:

-   Accounts
-   Devices
-   Merchants
-   Transactions

It detects suspicious behavioral and network patterns, groups related
detections into fraud rings, calculates explainable risk scores, and
provides an investigation workspace where an analyst can review evidence
and manage cases.

The AI layer is deliberately narrow. It does **not** decide whether an
activity is fraudulent. Instead, it receives verified investigation
evidence and produces an evidence-grounded investigation brief or
answers questions about an existing case.

## Scope

-   FraudTrace is a single-tenant analyst application.
-   Development and demonstration use synthetic transaction data.
-   The fraud detector is evaluated against planted demo patterns and
    does not claim real-world fraud detection accuracy.
-   The graph is constructed in application memory for analysis and
    visualization.
-   Risk scores are investigative signals, not legal or regulatory
    determinations.
-   The project uses a conventional MERN-style architecture and avoids
    unnecessary infrastructure such as queues, separate worker services
    and caching systems.

------------------------------------------------------------------------

# 2. Primary Product Focus

Version 1 focuses on three major pillars:

1.  **Graph Analytics**
2.  **Explainable Risk Engine**
3.  **AI Investigation Copilot**

The supporting investigation workflow connects these pillars:

``` text
Transaction Data
      ↓
Validation & Storage
      ↓
Graph Construction
      ↓
Fraud Pattern Detection
      ↓
Fraud Ring Grouping
      ↓
Explainable Risk Scoring
      ↓
Alerts
      ↓
Analyst Investigation
      ↓
Case Management
      ↓
AI Investigation Copilot
```

------------------------------------------------------------------------

# 3. Core Product Capabilities

## 3.1 Transaction Ingestion

The analyst can:

-   Upload transaction data through CSV.
-   Generate seeded demo data.
-   Validate transaction rows.
-   Reject malformed records.
-   Skip duplicate transactions.
-   Store upload/batch information.
-   Start fraud analysis from the application.

## 3.2 Fraud Ring Detection

FraudTrace detects connected suspicious activity using multiple
patterns:

-   Circular money flow
-   Fan-in / fan-out behavior
-   Shared devices
-   Rapid pass-through behavior
-   Merchant cash-out patterns

The detectors produce alerts. Related alerts can then be grouped into
fraud rings.

## 3.3 Graph Analytics

FraudTrace constructs an in-memory graph from stored transaction and
relationship data.

Supported operations include:

-   Directed traversal
-   Breadth-first traversal
-   Depth-first traversal
-   Connected-component analysis
-   Time-ordered cycle detection
-   Path analysis
-   Network degree analysis
-   Suspicious-neighbor analysis
-   Ring grouping

## 3.4 Explainable Risk Engine

The risk engine calculates transparent risk scores from behavioral and
network signals.

Each score exposes:

-   Risk score
-   Signal category
-   Individual contributing signals
-   Evidence behind the signal
-   Rule/configuration version

The interface includes a **"Why flagged?"** section so that the analyst
can understand why an account or ring received its score.

## 3.5 Investigation Timeline

The analyst can view suspicious activity chronologically.

The timeline includes:

-   Transaction timestamp
-   Sender
-   Receiver
-   Merchant
-   Amount
-   Rapid inbound/outbound activity
-   Related alerts
-   Detector hits
-   Case actions
-   Analyst notes

The graph and timeline are connected so an analyst can move from a
suspicious relationship to the underlying transaction evidence.

## 3.6 Case Management

An analyst can:

1.  Open an alert or fraud ring.
2.  Review the graph, timeline and evidence.
3.  Create a case.
4.  Attach relevant alerts.
5.  Add investigation notes.
6.  Generate an AI investigation brief.
7.  Accept, edit or discard the AI output.
8.  Close the case with a disposition.

Supported case states:

-   OPEN
-   INVESTIGATING
-   CLOSED

Supported dispositions:

-   CONFIRMED_FRAUD
-   FALSE_POSITIVE
-   INCONCLUSIVE

## 3.7 AI Investigation Copilot

The AI copilot generates an investigation brief from verified evidence.

It can explain:

-   Why an account was flagged.
-   Which patterns were detected.
-   Which transactions support an alert.
-   How entities are connected.
-   What suspicious money movement occurred.
-   Which signals contributed to the risk score.

The AI is an investigation assistant, not an autonomous fraud
decision-maker.

## 3.8 Constrained AI Case Q&A

The analyst can ask questions about a case.

Example questions:

-   "Why was this account flagged?"
-   "Which transactions support this alert?"
-   "What connects these accounts?"
-   "Which fraud patterns were detected?"

The AI is restricted to the case evidence bundle. If the available
evidence is insufficient, the system returns an insufficient-evidence
response rather than inventing information.

------------------------------------------------------------------------

# 4. Supporting Capabilities

## 4.1 Seeded Demo Data Generator

FraudTrace includes a repeatable demo-data generator containing:

-   Known fraudulent patterns
-   Legitimate transactions
-   Near-miss scenarios
-   Shared-device legitimate activity
-   Popular merchant scenarios

The generator allows the project to demonstrate fraud detection without
relying on real financial data.

## 4.2 Detector Evaluation

A simple evaluation script compares detector results against the planted
demo patterns.

It can report:

-   Detected patterns
-   Missed planted patterns
-   False detections
-   Precision
-   Recall

These numbers are specific to the synthetic evaluation dataset and are
not presented as production fraud-detection performance.

## 4.3 Alert Triage

Alerts can be marked as:

-   NEW
-   REVIEWING
-   DISMISSED
-   ESCALATED

Triage status is stored independently from the analysis result.

## 4.4 Case Audit Trail

Important case actions are recorded, including:

-   Case creation
-   Status changes
-   Notes
-   Alert attachments
-   AI decisions
-   Case closure

## 4.5 Rules Page

A read-only rules page shows:

-   Active detector thresholds
-   Risk scoring configuration
-   Rule version

This allows analysts to understand which configuration produced an
analysis result.

------------------------------------------------------------------------

# 5. Fraud Detection Patterns

Each detector uses configurable thresholds.

## 5.1 Circular Flow

Detect short directed cycles where money eventually returns to an
earlier account.

Example:

``` text
Account A → Account B → Account C → Account A
```

The detector considers:

-   Maximum cycle length
-   Time window
-   Maximum reported cycles

Transactions must follow chronological order.

## 5.2 Fan-In / Fan-Out

Detect a hub account that receives money from multiple accounts and
sends money to multiple accounts.

Example:

``` text
A ─┐
B ─┼→ X → Y
C ─┘    └→ Z
```

Parameters include:

-   Minimum distinct senders
-   Minimum distinct receivers
-   Time window

## 5.3 Shared Device

Detect a device associated with multiple accounts.

A configurable minimum number of accounts is used to reduce ordinary
two-person device sharing from becoming an automatic fraud signal.

## 5.4 Pass-Through Behavior

Detect accounts where funds repeatedly arrive and leave quickly.

Signals include:

-   Forwarding ratio
-   Delay between inbound and outbound transactions
-   Minimum number of occurrences

## 5.5 Merchant Cash-Out

Detect related accounts that:

-   Share a device or relationship
-   Send payments to the same merchant
-   Operate within a suspicious time window

------------------------------------------------------------------------

# 6. Graph Model

MongoDB is the system of record.

The graph is created in application memory when analysis or
investigation requires it.

## 6.1 Entities

### Account

Represents a financial account participating in transactions.

### Device

Represents a device identifier associated with one or more accounts.

### Merchant

Represents a merchant receiving payments.

### Transaction

Represents directed money movement or a merchant payment.

## 6.2 Relationships

``` text
Account → Account
    Money transfer

Account → Device
    Device usage

Account → Merchant
    Merchant payment
```

## 6.3 Graph Operations

FraudTrace supports:

-   Directed traversal
-   BFS
-   DFS
-   Time-ordered cycle detection
-   Connected-component grouping
-   Network degree calculation
-   Path analysis
-   Suspicious-neighbor analysis

## 6.4 Ring Grouping

Fraud rings are not created simply by taking connected components of the
entire transaction graph.

Instead:

1.  Start from entities involved in fraud alerts.
2.  Connect related alert entities.
3.  Prevent extremely high-degree hub nodes from merging unrelated
    groups.
4.  Apply the shared-device threshold.
5.  Store the final ring members explicitly.

This prevents a popular merchant or commonly shared device from
incorrectly connecting the entire graph into one huge ring.

------------------------------------------------------------------------

# 7. Explainable Risk Engine

FraudTrace uses a deterministic, feature-based risk engine.

It does not require a separate machine-learning service.

## 7.1 Signal Categories

### Transaction Behavior

-   Transaction velocity
-   Amount concentration
-   Unusual inbound/outbound flow

### Network Behavior

-   Number of connected accounts
-   Network degree
-   Suspicious neighbors
-   Ring membership

### Fraud Patterns

-   Circular flow
-   Fan-in/fan-out
-   Shared device
-   Pass-through
-   Merchant cash-out

### Temporal Behavior

-   Rapid money movement
-   Suspicious activity within configured time windows

## 7.2 Score Calculation

The score is a weighted combination of transparent signals.

Conceptually:

``` text
Risk Score =
    Transaction Signals
  + Network Signals
  + Pattern Signals
  + Temporal Signals
```

Each contribution is stored with:

-   Signal name
-   Signal value
-   Weight
-   Evidence
-   Rule version

The UI displays the strongest contributing signals.

## 7.3 Account and Ring Risk

FraudTrace maintains:

-   Account risk
-   Fraud-ring risk

The two scores are kept conceptually separate so that a suspicious
individual account and a coordinated network can be investigated
independently.

------------------------------------------------------------------------

# 8. Investigation Timeline

Every investigated account or ring has a chronological activity view.

The timeline can show:

``` text
Transaction
    ↓
Related Alert
    ↓
Detected Pattern
    ↓
Risk Contribution
    ↓
Case Action
    ↓
AI Investigation
```

The graph and timeline are synchronized.

Selecting an entity in the graph can reveal related transactions and
investigation evidence.

------------------------------------------------------------------------

# 9. Case Management

## 9.1 Case Workflow

``` text
Alert / Ring
     ↓
Review Evidence
     ↓
Create Case
     ↓
Attach Alerts
     ↓
Add Notes
     ↓
Generate AI Brief
     ↓
Review / Edit AI Output
     ↓
Close Case
```

## 9.2 Case Data

Each case contains:

-   Case number
-   Title
-   Status
-   Disposition
-   Creator
-   Creation time
-   Closure time
-   Attached alerts
-   Analyst notes
-   Audit events
-   AI investigation results

Example case number:

``` text
FT-1042
```

------------------------------------------------------------------------

# 10. AI Investigation Copilot

The AI feature is intentionally constrained.

It explains evidence that FraudTrace has already discovered instead of
making the fraud decision.

## 10.1 AI Flow

### Step 1 --- Build Evidence Bundle

The backend collects:

-   Case information
-   Alerts
-   Transactions
-   Graph relationships
-   Risk signals
-   Timeline information

Every evidence item receives a stable evidence ID.

### Step 2 --- Calculate Derived Facts

The backend calculates numerical facts before sending information to the
model.

For example:

``` text
91% of received funds were forwarded within 24 minutes.
```

The model does not perform the underlying arithmetic.

### Step 3 --- Send Controlled Evidence

The AI receives structured evidence rather than unrestricted application
data.

### Step 4 --- Generate Structured Output

The model returns structured findings containing:

-   Finding text
-   Evidence IDs supporting the finding

### Step 5 --- Verify

The backend verifies that:

-   Referenced evidence IDs exist.
-   Every finding contains evidence.
-   Extracted IDs and values match the evidence.
-   Unsupported conclusions are rejected.
-   Strong unsupported verdict language is rejected.

### Step 6 --- Display

Only verified output or a deterministic fallback is shown to the
analyst.

The analyst can:

-   Accept
-   Edit
-   Discard

the AI-generated brief.

------------------------------------------------------------------------

# 11. AI Case Q&A

The case Q&A system uses the same evidence bundle.

Example:

``` text
Analyst:
Why was ACC-104 flagged?

FraudTrace:
ACC-104 was flagged because it participated
in a circular transaction pattern and showed
rapid outbound movement.

Evidence:
E-14, E-22, E-31
```

If the evidence does not support an answer:

``` text
Insufficient evidence available for this question.
```

The system does not fabricate an answer.

------------------------------------------------------------------------

# 12. Frontend

## 12.1 Application Routes

  Route             Purpose
  ----------------- ---------------------------------------
  `/login`          Authentication
  `/dashboard`      Overview of alerts, risk and activity
  `/alerts`         Alert queue and triage
  `/rings/:id`      Fraud ring investigation
  `/accounts/:id`   Account investigation
  `/graph`          Standalone graph explorer
  `/cases`          Case management
  `/cases/:id`      Investigation workspace
  `/data`           CSV upload and demo data
  `/rules`          Detector configuration

## 12.2 Dashboard

The dashboard provides:

-   Total alerts
-   High-risk accounts
-   Fraud rings
-   Open cases
-   Recent activity
-   Risk distribution
-   Detection patterns
-   Data status

## 12.3 Alert Screen

Analysts can filter alerts by:

-   Severity
-   Pattern
-   Risk score
-   Triage status
-   Ring

## 12.4 Fraud Ring Screen

Displays:

-   Ring summary
-   Members
-   Risk score
-   Contributing signals
-   Detected patterns
-   Timeline
-   Graph
-   Related alerts

## 12.5 Account Screen

Displays:

-   Account risk
-   Why flagged
-   Transactions
-   Connected entities
-   Alerts
-   Graph relationships
-   Timeline

------------------------------------------------------------------------

# 13. Graph Visualization

Cytoscape.js is used for the fraud network.

## 13.1 Visual Elements

### Account

Represents a financial account.

### Device

Represents a shared device.

### Merchant

Represents a payment destination.

### Edge

Represents a relationship or transaction.

## 13.2 Graph Interactions

The analyst can:

-   Click nodes.
-   Inspect entity details.
-   Expand connected neighbors.
-   Filter by entity type.
-   Filter by amount.
-   Filter by date.
-   Highlight suspicious paths.
-   Highlight fraud-ring members.
-   Open transactions from graph relationships.

The API limits graph responses to a reasonable node count to keep
browser rendering responsive.

------------------------------------------------------------------------

# 14. Backend Architecture

FraudTrace uses a simple MERN-oriented backend.

## Components

  Component   Responsibility
  ----------- ----------------------------------------------
  React       Analyst interface
  Express     REST API
  Node.js     Application runtime and fraud-analysis logic
  MongoDB     Persistent data
  Mongoose    MongoDB data modeling
  Socket.IO   Real-time updates
  JWT         Authentication
  bcryptjs    Password hashing
  LLM API     AI investigation assistance

There is **no separate worker service**.

There is **no job queue**.

There is **no Redis dependency**.

Fraud analysis runs through backend services when the analyst starts an
analysis.

------------------------------------------------------------------------

# 15. Main Data Flow

``` text
CSV / Demo Data
      ↓
Express API
      ↓
Validation
      ↓
MongoDB
      ↓
Analysis Service
      ↓
Graph Construction
      ↓
Fraud Detectors
      ↓
Ring Grouping
      ↓
Risk Scoring
      ↓
MongoDB
      ↓
Socket.IO / API Response
      ↓
Analyst Investigation
      ↓
Case
      ↓
Evidence Bundle
      ↓
AI Copilot
      ↓
Verification
      ↓
Investigation Brief
```

This design intentionally keeps the architecture understandable and easy
to run locally.

------------------------------------------------------------------------

# 16. Real-Time Updates

Socket.IO is used where real-time feedback improves the user experience.

Possible events include:

-   `analysis-started`
-   `analysis-progress`
-   `analysis-completed`
-   `alert-created`
-   `alert-updated`
-   `case-updated`
-   `ai-completed`

The frontend can update without repeatedly refreshing the entire page.

------------------------------------------------------------------------

# 17. Technology Stack

  Layer                 Technology                Purpose
  --------------------- ------------------------- ------------------------------
  Frontend              React                     User interface
  Language              JavaScript / TypeScript   Application development
  Build tool            Vite                      Frontend development/build
  Routing               React Router              Client-side routing
  Server state          TanStack Query            API data fetching/caching
  Styling               CSS Modules               Component styling
  Graph                 Cytoscape.js              Fraud network visualization
  Charts                Recharts                  Risk and dashboard analytics
  Backend               Node.js                   Server runtime
  API                   Express.js                REST API
  Database              MongoDB                   Persistent storage
  ODM                   Mongoose                  MongoDB models
  Authentication        JWT                       Protected routes
  Password security     bcryptjs                  Password hashing
  Realtime              Socket.IO                 Live application updates
  AI                    LLM API                   Investigation copilot
  Version control       Git/GitHub                Source control
  Frontend deployment   Vercel                    Production frontend
  Backend deployment    Render                    Production API
  Database hosting      MongoDB Atlas             Cloud database

------------------------------------------------------------------------

# 18. Database Model

MongoDB collections:

## User

``` text
_id
name
email
passwordHash
role
createdAt
updatedAt
```

Roles:

-   ANALYST
-   ADMIN

## DataBatch

``` text
_id
source
seed
totalRows
acceptedRows
rejectedRows
duplicateRows
errors
createdAt
```

## Account

``` text
_id
externalId
metadata
createdAt
updatedAt
```

## Device

``` text
_id
externalId
metadata
createdAt
updatedAt
```

## Merchant

``` text
_id
externalId
metadata
createdAt
updatedAt
```

## Transaction

``` text
_id
externalTransactionId
fromAccount
toAccount
merchant
device
amount
timestamp
batchId
createdAt
```

A transaction must have exactly one destination:

``` text
toAccount OR merchant
```

## AnalysisRun

``` text
_id
status
ruleVersion
parameters
summary
error
trigger
createdAt
completedAt
```

## Alert

``` text
_id
analysisRunId
fingerprint
pattern
severity
score
triageStatus
evidence
ringId
createdAt
updatedAt
```

## FraudRing

``` text
_id
analysisRunId
label
score
contributors
totalFlow
transactionCount
patterns
createdAt
```

## FraudRingMember

``` text
_id
ringId
entityType
entityId
```

## AccountRisk

``` text
_id
accountId
analysisRunId
score
contributors
ruleVersion
```

## Case

``` text
_id
caseNumber
title
status
disposition
createdBy
closedAt
createdAt
updatedAt
```

## CaseAlert

``` text
_id
caseId
alertId
```

## CaseNote

``` text
_id
caseId
authorId
content
createdAt
```

## CaseEvent

``` text
_id
caseId
eventType
metadata
createdAt
createdBy
```

## AIBrief

``` text
_id
caseId
kind
question
evidenceSnapshot
evidenceHash
structuredOutput
verificationStatus
verificationErrors
model
promptVersion
analystDecision
editedText
createdAt
```

------------------------------------------------------------------------

# 19. API Surface

## Authentication

``` text
POST /api/auth/login
GET  /api/auth/me
```

## Data

``` text
POST /api/data/upload
POST /api/data/simulate
GET  /api/data/batches
GET  /api/data/batches/:id
```

## Analysis

``` text
POST /api/analysis/run
GET  /api/analysis/runs/:id
GET  /api/analysis/rules
```

## Alerts

``` text
GET   /api/alerts
GET   /api/alerts/:id
PATCH /api/alerts/:id
```

## Accounts

``` text
GET /api/accounts/:id
GET /api/accounts/:id/transactions
```

## Graph

``` text
GET /api/graph/neighborhood
GET /api/graph/path
```

## Rings

``` text
GET /api/rings
GET /api/rings/:id
```

## Cases

``` text
GET    /api/cases
POST   /api/cases
GET    /api/cases/:id
PATCH  /api/cases/:id
POST   /api/cases/:id/notes
POST   /api/cases/:id/alerts
GET    /api/cases/:id/events
```

## AI

``` text
POST  /api/ai/briefs
GET   /api/ai/briefs/:id
PATCH /api/ai/briefs/:id
POST  /api/ai/cases/:id/ask
```

## Health

``` text
GET /api/health
```

------------------------------------------------------------------------

# 20. Authentication and Security

FraudTrace includes:

-   JWT-authenticated protected routes.
-   Analyst and admin roles.
-   bcryptjs password hashing.
-   Seeded users.
-   No public registration.
-   Environment variables for secrets.
-   Parameterized MongoDB queries through Mongoose.
-   File upload limits.
-   CSV validation.
-   Authentication middleware.
-   Authorization checks.
-   AI evidence restrictions.

The AI cannot directly modify:

-   Transactions
-   Alerts
-   Risk scores
-   Cases

The AI output must pass evidence verification before being displayed.

------------------------------------------------------------------------

# 21. AI Safety

The AI layer follows these principles:

## Evidence First

The model receives evidence gathered by the application.

## No Autonomous Fraud Verdict

The model does not decide:

``` text
"This person committed fraud."
```

Instead it produces evidence-based investigation findings.

## Verification

Generated claims are checked against the evidence bundle.

## Insufficient Evidence

If evidence does not support a response, the system returns an
insufficient-evidence result.

## Analyst Control

The analyst can:

-   Accept
-   Edit
-   Discard

AI-generated content.

------------------------------------------------------------------------

# 22. Testing and Verification Approach

FraudTrace intentionally keeps verification lightweight.

Instead of introducing a large automated testing stack, development
verification focuses on:

## Backend Verification

-   Manual API testing
-   Postman
-   API endpoint checks
-   MongoDB data inspection
-   Fraud detector test datasets

## Frontend Verification

-   Browser-based manual testing
-   Functional UI checks
-   Graph interaction checks
-   Case workflow checks

## Fraud Logic Verification

The most important logic is verified using deterministic demo datasets.

Examples:

-   Known circular flow should be detected.
-   Known fan-in/fan-out should be detected.
-   Known shared-device pattern should be detected.
-   Known pass-through pattern should be detected.
-   Legitimate near-miss should not automatically become a fraud ring.

## AI Verification

The AI verifier checks:

-   Evidence IDs
-   Referenced values
-   Missing evidence
-   Unsupported claims
-   Invalid conclusions

------------------------------------------------------------------------

# 23. Repository Structure

``` text
fraudtrace/
│
├── README.md
│
├── docs/
│   ├── architecture.md
│   ├── fraud-detection.md
│   └── api.md
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   │   ├── graph/
│   │   │   ├── detectors/
│   │   │   ├── rings/
│   │   │   ├── risk/
│   │   │   ├── evidence/
│   │   │   └── ai/
│   │   ├── simulation/
│   │   ├── utils/
│   │   ├── socket/
│   │   └── index.js
│   │
│   ├── scripts/
│   │   ├── seed.js
│   │   └── evaluate-detectors.js
│   │
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── api/
    │   ├── app/
    │   ├── components/
    │   ├── features/
    │   │   ├── dashboard/
    │   │   ├── data/
    │   │   ├── alerts/
    │   │   ├── rings/
    │   │   ├── accounts/
    │   │   ├── graph/
    │   │   ├── cases/
    │   │   ├── ai/
    │   │   └── rules/
    │   ├── hooks/
    │   ├── lib/
    │   └── main.tsx
    │
    └── package.json
```

------------------------------------------------------------------------

# 24. Product Workflow

``` text
1. Analyst logs in.

2. Analyst uploads a transaction CSV
   or generates demo data.

3. Express validates the dataset.

4. Transactions are stored in MongoDB.

5. Analyst starts analysis.

6. Node.js constructs an in-memory graph.

7. Fraud detectors analyze the graph.

8. Suspicious patterns generate alerts.

9. Related alerts are grouped into fraud rings.

10. Risk scores are calculated.

11. Results are stored in MongoDB.

12. Socket.IO updates the dashboard.

13. Analyst opens an alert or ring.

14. Analyst explores graph and timeline.

15. Analyst creates a case.

16. Relevant alerts are attached.

17. Analyst adds notes.

18. AI copilot generates an evidence-grounded brief.

19. Backend verifies the AI findings.

20. Analyst accepts, edits or discards the brief.

21. Analyst closes the case with a disposition.
```

------------------------------------------------------------------------

# 25. Implementation Phases

## Phase 1 --- Foundation

Deliver:

-   React + Vite frontend
-   Node + Express backend
-   MongoDB + Mongoose
-   Authentication
-   JWT
-   bcryptjs
-   Basic project structure
-   Health endpoint

**Done when:** Login works locally and the backend connects to MongoDB.

## Phase 2 --- Data Management

Deliver:

-   Transaction schema
-   CSV upload
-   CSV parsing
-   Validation
-   Duplicate handling
-   Demo-data generator
-   Batch records

**Done when:** Demo data and CSV data appear correctly in MongoDB.

## Phase 3 --- Graph Engine

Deliver:

-   Graph construction
-   Account relationships
-   Device relationships
-   Merchant relationships
-   BFS
-   DFS
-   Path analysis
-   Cycle detection

**Done when:** Known graph relationships can be explored correctly.

## Phase 4 --- Fraud Detection

Implement:

-   Circular flow
-   Fan-in/fan-out
-   Shared device
-   Pass-through
-   Merchant cash-out

**Done when:** Planted fraud patterns are detected and legitimate
near-misses are not automatically classified as fraud.

## Phase 5 --- Ring Grouping and Risk

Deliver:

-   Alert generation
-   Fraud-ring grouping
-   Account risk
-   Ring risk
-   Risk contributors
-   Why-flagged explanations
-   Rule configuration

**Done when:** Alerts and fraud rings appear with explainable scores.

## Phase 6 --- Investigation UI

Deliver:

-   Dashboard
-   Alert queue
-   Ring page
-   Account page
-   Graph explorer
-   Timeline
-   Filters

**Done when:** An analyst can move from an alert to the underlying
network and evidence.

## Phase 7 --- Case Management

Deliver:

-   Case CRUD
-   Alert attachment
-   Notes
-   Status
-   Disposition
-   Audit trail

**Done when:** A complete investigation can be managed from creation to
closure.

## Phase 8 --- AI Copilot

Deliver:

-   Evidence builder
-   AI provider integration
-   Structured AI output
-   Evidence verifier
-   Fallback response
-   AI brief UI
-   Case Q&A

**Done when:** AI output is grounded in case evidence and unsupported
claims are rejected.

## Phase 9 --- Polish and Deployment

Deliver:

-   Responsive UI
-   Error handling
-   Loading states
-   Empty states
-   Production environment configuration
-   Vercel deployment
-   Render deployment
-   MongoDB Atlas
-   README
-   Architecture diagram
-   Demo dataset
-   Demo script
-   Resume bullets

**Done when:** The complete application can be demonstrated end-to-end.

------------------------------------------------------------------------

# 26. Version 1 Scope

## Included

### Graph Analytics

-   Graph construction
-   Fraud-pattern detection
-   Temporal cycles
-   Fan-in/fan-out
-   Shared-device relationships
-   Pass-through behavior
-   Merchant cash-out
-   Ring grouping
-   Path analysis
-   Cytoscape visualization

### Explainable Risk Engine

-   Behavioral signals
-   Network signals
-   Pattern signals
-   Temporal signals
-   Weighted scoring
-   Risk contributors
-   Why-flagged explanation

### AI Investigation Copilot

-   Evidence bundle
-   Structured LLM output
-   Evidence verification
-   Fallback response
-   Investigation brief
-   Case Q&A

### Investigation Platform

-   Authentication
-   Alerts
-   Alert triage
-   Fraud rings
-   Account investigation
-   Timeline
-   Cases
-   Notes
-   Audit trail
-   Rules page

------------------------------------------------------------------------

# 27. Explicitly Out of Scope

To keep Version 1 manageable, FraudTrace does **not** include:

-   BullMQ
-   Redis
-   PostgreSQL
-   Prisma
-   Kafka
-   Kubernetes
-   Docker-based infrastructure
-   Separate worker services
-   Separate AI microservice
-   Graph database
-   NetworkX
-   FastAPI
-   XGBoost
-   SHAP
-   Multi-tenancy
-   Public user registration
-   Real financial data
-   Autonomous AI fraud decisions
-   Complex ML pipelines

These can be considered future extensions only if the core product is
complete.

------------------------------------------------------------------------

# 28. Future Extensions

Potential Version 2 additions:

-   XGBoost risk model
-   SHAP-based ML explanations
-   More sophisticated graph algorithms
-   Advanced anomaly detection
-   Larger datasets
-   Role-based permissions
-   Advanced reporting
-   Investigation collaboration
-   Additional AI agents
-   More sophisticated fraud-pattern configuration

These are intentionally not part of Version 1.

------------------------------------------------------------------------

# 29. One-Line Project Definition

> **FraudTrace is a MERN-based graph fraud investigation platform that
> detects connected fraud rings, explains risk through transparent
> network signals, and uses a verified AI copilot to turn investigation
> evidence into actionable case briefs.**

------------------------------------------------------------------------

# 30. Resume-Level Technical Positioning

FraudTrace demonstrates:

-   Full-stack MERN development
-   REST API design
-   MongoDB data modeling
-   Authentication and authorization
-   Graph algorithms
-   Fraud detection logic
-   Explainable risk scoring
-   Real-time communication with Socket.IO
-   Interactive graph visualization
-   AI integration
-   Evidence-grounded AI
-   Case-management workflows
-   Security-conscious backend design

The project complexity is concentrated in the **actual product and
algorithms**, rather than unnecessary infrastructure.

------------------------------------------------------------------------

# 31. Final Architecture Summary

``` text
                    FRAUDTRACE
                         │
          ┌──────────────┴──────────────┐
          │                             │
      React Frontend              Node + Express
          │                             │
   ┌──────┼────────┐          ┌─────────┼─────────┐
   │      │        │          │         │         │
Dashboard Graph   Cases    Fraud      Risk       AI
   │      │        │       Engine    Engine    Copilot
   │      │        │          │         │         │
   └──────┴────────┴──────────┴─────────┴─────────┘
                         │
                    Mongoose
                         │
                      MongoDB
                         │
                  MongoDB Atlas
```

**Real-time layer:**

``` text
React ←──── Socket.IO ────→ Express
```

**AI layer:**

``` text
Case Evidence
      ↓
Evidence Builder
      ↓
LLM API
      ↓
Structured Findings
      ↓
Evidence Verifier
      ↓
AI Investigation Brief
```

**Core fraud pipeline:**

``` text
Transactions
      ↓
Graph
      ↓
Detection
      ↓
Alerts
      ↓
Fraud Rings
      ↓
Risk Scores
      ↓
Investigation
      ↓
Case
      ↓
AI Copilot
```

------------------------------------------------------------------------

# 32. Final Design Principle

FraudTrace should feel like a **real fraud-investigation product**, not
an infrastructure showcase.

The project should prioritize:

1.  **Strong fraud detection logic**
2.  **Useful graph investigation**
3.  **Explainable risk**
4.  **Good case-management workflow**
5.  **Meaningful AI integration**
6.  **Clean MERN architecture**
7.  **Simple local setup**
8.  **Clear interview explainability**

The architecture is intentionally simple enough for one developer to
build and maintain while still demonstrating substantial
software-engineering, algorithmic and AI capabilities.
