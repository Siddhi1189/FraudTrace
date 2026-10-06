---
name: Fraud Investigation Workstation
colors:
  surface: '#fbf9f4'
  surface-dim: '#dbdad5'
  surface-bright: '#fbf9f4'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3ee'
  surface-container: '#f0eee9'
  surface-container-high: '#eae8e3'
  surface-container-highest: '#e4e2dd'
  on-surface: '#1b1c19'
  on-surface-variant: '#42474c'
  inverse-surface: '#30312e'
  inverse-on-surface: '#f2f1ec'
  outline: '#73787c'
  outline-variant: '#c2c7cc'
  surface-tint: '#486172'
  primary: '#183241'
  on-primary: '#ffffff'
  primary-container: '#2f4858'
  on-primary-container: '#9cb6c9'
  inverse-primary: '#b0cadd'
  secondary: '#605e57'
  on-secondary: '#ffffff'
  secondary-container: '#e6e2d9'
  on-secondary-container: '#66645d'
  tertiary: '#402544'
  on-tertiary: '#ffffff'
  tertiary-container: '#583b5c'
  on-tertiary-container: '#cda7ce'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#95000a'
  primary-fixed: '#cce6fa'
  primary-fixed-dim: '#b0cadd'
  on-primary-fixed: '#011e2d'
  on-primary-fixed-variant: '#314a5a'
  secondary-fixed: '#e6e2d9'
  secondary-fixed-dim: '#cac6be'
  on-secondary-fixed: '#1c1c16'
  on-secondary-fixed-variant: '#484740'
  tertiary-fixed: '#fed6ff'
  tertiary-fixed-dim: '#e1bae2'
  on-tertiary-fixed: '#2b1130'
  on-tertiary-fixed-variant: '#5a3c5d'
  background: '#fbf9f4'
  on-background: '#1b1c19'
  surface-variant: '#e4e2dd'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.75rem
    fontWeight: '600'
    lineHeight: 2.25rem
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.375rem
    fontWeight: '600'
    lineHeight: 1.875rem
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.125rem
    fontWeight: '600'
    lineHeight: 1.5rem
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 0.9375rem
    fontWeight: '600'
    lineHeight: 1.375rem
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Inter
    fontSize: 0.9375rem
    fontWeight: '400'
    lineHeight: 1.5rem
    letterSpacing: -0.005em
  body-md:
    fontFamily: Inter
    fontSize: 0.8125rem
    fontWeight: '400'
    lineHeight: 1.25rem
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '400'
    lineHeight: 1.125rem
    letterSpacing: 0.005em
  label-md:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '500'
    lineHeight: 1rem
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 0.6875rem
    fontWeight: '600'
    lineHeight: 0.875rem
    letterSpacing: 0.03em
  code-sm:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '400'
    lineHeight: 1rem
    letterSpacing: 0em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 0.75rem
  margin: 1rem
  space-3xs: 0.125rem
  space-2xs: 0.25rem
  space-xs: 0.375rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
  space-2xl: 2rem
---

## Brand & Style

This design system is tailored for an enterprise financial fraud investigation workstation where analytical rigor, absolute legibility, and high-density precision govern every surface. Investigators inspect high-stakes forensic trails, adjudicate financial crime cases, and parse complex entity graphs. The UI must invoke the calm, authoritative gravitas of forensic ledger sheets, archival paper dossiers, and Swiss editorial typography—rejecting the ephemeral tropes of consumer technology.

### Aesthetic Principles
- **Archival Tactility & Warm Paper:** The interface rejects sterile blue-gray enterprise tones and piercing stark-white canvases in favor of an archival, warm paper ground that reduces eye strain across multi-hour shifts.
- **Editorial Restraint:** Strictly no gradients, neon accents, ambient glows, or glassmorphic blurs. Depth is conveyed exclusively via tonal layering and fine structural lines.
- **Forensic Objectivity:** Zero generic AI tropes, decorative illustrations, or decorative emojis. Copilot and automated synthesis interfaces present strictly as verified evidentiary briefs with explicit record citations, calculated confidence intervals, and audit metadata.
- **Monochrome & Meaningful Color:** Interactive and informational elements rely predominantly on deep ink, slate blue, and tactile surface shifts. Color is reserved almost entirely for rigorous semantic severity indexing and network node topology.

## Colors

The palette establishes an authoritative forensic hierarchy using a warm paper ground, archival surfaces, deep slate accents, and desaturated, earthy severity signals.

### Core Structure & Canvas
- **Warm Paper Canvas (`#F7F5F0`):** The primary structural background for the global application layout, workspace gutter areas, and background canvas.
- **Pure Surface (`#FFFFFF`):** High-priority focus areas, active evidence dossiers, data grids, inspection drawers, and modals.
- **Secondary Surface (`#EFEBE2`):** Primary left-hand global navigation rails, pinned split-view inspector backgrounds, and structural utility ribbons.
- **Hairline Rule (`#E3DED3`):** 1px structural boundaries defining the workstation grid without visual bulk.
- **Border Strong (`#C8C2B5`):** Focus rings, active panel dividers, and dragging thresholds.

### Typography & Ink
- **Text Primary (`#1F2328`):** Archival high-contrast ink for headlines, numerical financial figures, and core tabular values.
- **Text Secondary (`#5C6168`):** Calibrated neutral for contextual descriptors, table headers, metadata keys, and secondary statuses.
- **Text Tertiary (`#8A8F98`):** Disabled states, fine timestamps, and inactive iconography.

### Semantic Forensic Severities
These tones are non-fluorescent and derived from mineral pigments:
- **Low / Nominal (`#7A8B6F`):** Muted Sage. Legitimate behavior, cleared transactions, verified entities.
- **Medium / Review (`#C48A1A`):** Deep Ochre. Anomalous velocity, unverified routing paths, soft policy alerts.
- **High / Alert (`#B3402A`):** Terracotta Brick. Blacklisted attributes, synthetic identity matches, rapid balance siphoning.
- **Critical / Intercept (`#7A1F2B`):** Deep Burgundy. Confirmed syndicate fraud, AML threshold breaches, urgent intervention required.

### Graph Entity Signatures
- **Account / Entity (`#2F4858`):** Deep Slate Blue.
- **Device / Terminal (`#C48A1A`):** Deep Ochre.
- **Merchant / Counterparty (`#6B4C6E`):** Archival Plum.
- **IP / Network Node (`#4A6B82`):** Steel Slate.

## Typography

Typography prioritizes information density, data scanability, and legible hierarchical contrast. We pair **Plus Jakarta Sans** for clear, authoritative headers with **Inter** for dense transactional copy and data grids.

### Font Pairing Logic
- **Plus Jakarta Sans (Headings):** Selected for structural geometry and clarity at display scales. Provides crisp case reference markers and panel headers without excessive stylistic flourishes.
- **Inter (Body, Tables, Controls, Code):** The workhorse typeface for high-density transactional records, logs, and interactive UI controls.

### Tabular Figures & OpenType Features
- Tabular figures (`font-variant-numeric: tabular-nums; feature-settings: "tnum" 1;`) are **mandatory** on all table columns, currency numbers, risk scores, IP addresses, transaction timestamps, and entity hashes.
- Slashed zero (`"zero" 1`) must be enabled on all identity strings, device fingerprints, and routing numbers to eliminate ambiguity between `0` and `O`.

## Layout & Spacing

The workstation layout is architected around a multi-pane operational console supporting simultaneous timeline review, graph analysis, and transaction triage.

### Spatial Rhythm
- **Base Grid:** 4px micro-grid governing padding, heights, and inline gaps.
- **Operational Density:** Standard compact density. Component internal paddings default to 4px–8px vertical and 8px–12px horizontal to minimize scrolling and maximize vertical screen utilization.
- **Section Margins:** 16px (`1rem`) global outer margins ensure the UI feels grounded without wasting monitor real estate.

### Panel & Screen Division
- **Tri-Pane Split Framework:** 
  1. *Navigation / Queue Panel:* Left-aligned, collapsible between 56px (icon mode) and 240px (expanded queue mode).
  2. *Investigation Canvas (Primary):* Flexible center viewport (`min-width: 640px`) hosting multi-tabbed graph networks, transaction tables, and account timelines.
  3. *Evidence & Dossier Inspector (Contextual):* Right-aligned persistent drawer (`380px` to `480px` resizable width) holding audit logs, case briefs, note drafting, and action controls.
- **Splitter Bars:** Clean 1px hairline dividers with a persistent 4px interactive hover track for panel resizing.

## Elevation & Depth

Visual hierarchy is maintained without blur filters, glowing halos, or floating drop-shadows. The workstation derives its spatial hierarchy strictly through physical print metaphors: planar surface stacking, contrast steps, and 1px architectural hairline framing.

### Surface Tiers
- **Layer 0 (Canvas):** Warm paper (`#F7F5F0`). Serves as the structural background base.
- **Layer 1 (Recessed / Structural Controls):** Secondary surface (`#EFEBE2`). Houses sidebars, table column header bars, unselected tab strips, and timeline tracks.
- **Layer 2 (Primary Document Surface):** White surface (`#FFFFFF`). Houses primary cards, active table bodies, graph canvases, and active forms.
- **Layer 3 (Overlays & Contextual Sheets):** White surface (`#FFFFFF`) with a crisp 1px `#C8C2B5` border. Used for context menus, dropdowns, and modal dialogs.

### Border Rules
- All cards, panels, table headers, and split panes are bound by a crisp 1px border (`#E3DED3`).
- Selected or active elements utilize an ink or slate border (`#2F4858`) rather than an outer glow.
- When an overlay or modal appears, the canvas is dimmed by an archival wash (`rgba(31, 35, 40, 0.35)`), accompanied by a hard 2px offset border rather than soft blur shadows.

## Shapes

The design system embraces a structured, architectural geometry with restrained edge radiuses. 

### Geometric Metrics
- **Base Form Factor (`roundedness: 1`):** Buttons, inputs, and operational chips use a strict `2px` to `4px` corner radius (`0.125rem`–`0.25rem`). This preserves an archival, precise feel.
- **Containers & Panels:** Data tables, split inspectors, and graph views utilize `0px` radius along perimeter attachment edges, or `4px` (`rounded-sm`) when floating as modular cards.
- **Pills / Radiused Tags:** Strictly avoided. All badges, status markers, and entity chips are rectangular with subtle 2px rounded corners to reinforce structured data cards over consumer tags.

## Components

### Buttons & Interactive Controls
- **Primary Action:** Solid Slate Blue (`#2F4858`) fill, white text, 4px border radius. Hover: `#223541`. Active: `#1B2A34`.
- **Secondary Action:** White (`#FFFFFF`) surface with 1px hairline border (`#E3DED3`), ink text (`#1F2328`). Hover: `#F2EFE9` background.
- **Destructive / Intercept Action:** Brick (`#B3402A`) or Burgundy (`#7A1F2B`) background with white text, used strictly for transaction blocks, account freezes, and SAR filings.
- **Dimensions:** Compact 28px height for table/toolbar micro-actions; 32px height for standard panel actions.

### Operational Data Tables
- **Headers:** Secondary surface (`#EFEBE2`) fill, uppercase 11px Inter (`label-sm`), `#5C6168` text, 28px row height, subtle sort carets in functional slate.
- **Rows:** White (`#FFFFFF`) background, alternating `#FAF8F5` optional zebra striping on 50+ row displays. 32px standard row height. Bottom hairline border (`#E3DED3`).
- **Cells:** Strict vertical alignment, right-aligned monetary values with tabular numbers, monospace entity IDs, and inline severity markers.
- **Hover State:** Row background changes to `#F2EFE9` with zero vertical displacement.

### Severity & Status Indicators
- **Architecture:** Compact rectangular tags (not rounded pills). Height: 20px. Font: 11px Inter medium.
- **Palette Pairing (Subdued Tint + Deep Text):**
  - *Nominal:* Background `#EAEFE7`, Text `#46573C`, Border `#D2DDD0`.
  - *Medium:* Background `#F8F1E2`, Text `#7E570D`, Border `#EAD7B2`.
  - *High:* Background `#F6E9E6`, Text `#802B1B`, Border `#E7C6C0`.
  - *Critical:* Background `#EFE4E6`, Text `#54151D`, Border `#DBBFC3`.

### Network Graph Canvas (Cytoscape Panels)
- **Canvas Base:** Subtle textured grid using `#E3DED3` hairline dot grid (16px pitch) over warm `#FAF9F6`.
- **Node Geometry:** Sharp geometric nodes with a 1.5px solid boundary. 
  - *Account:* Circle (`#2F4858` fill, 24px diameter).
  - *Device:* Hexagon (`#C48A1A` fill, 24px diameter).
  - *Merchant:* Square (`#6B4C6E` fill, 22px width).
- **Edges:** Solid 1px `#C8C2B5` vectors with directional arrowheads; flagged transaction edges scale to 2px `#B3402A` with inline tabular currency badges.

### Evidence-Backed AI Briefs
- **Format:** Framed in a distinct dossier card with a left 3px solid Slate Blue accent line and `#FDFCFB` surface.
- **Voice & Content:** Strictly anti-marketing and technical. Headed with "Automated Synthesis Summary" accompanied by generation timestamp and engine model version.
- **Verification Citations:** Inline interactive citation keys `[Ev-01]`, `[Tx-892]`. Clicking scrolls the corresponding record into focus in the linked table or graph node with a brief flash highlight (`#EFEBE2`).

### Chronological Audit Trails
- **Structure:** Vertical 1px spine (`#E3DED3`) on the left margin. 
- **Milestone Nodes:** 8px square nodes on the spine. Completed items use solid `#2F4858`; automated system hooks use hollow `#5C6168`.
- **Entries:** Display precise timestamps in tabular numbers (`YYYY-MM-DD HH:mm:ss UTC`), actor signature, and diff metadata.

### Form Inputs & Filters
- **Text & Select Fields:** 32px height, `#FFFFFF` ground, 1px border (`#E3DED3`), 2px radius. 
- **Focus State:** 1px outline in Slate Blue (`#2F4858`) with zero outer diffuse glow.
- **Iconography:** Functional, thin-stroke (1.5px) monochrome icons exclusively. No decorative illustrations or non-standard glyphs.