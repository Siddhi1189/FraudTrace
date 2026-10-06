import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/AuthContext';
import { useActiveSection } from '../../hooks/useActiveSection';
import { useCursorFollow } from '../../hooks/useCursorFollow';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useInView } from '../../hooks/useInView';
import { SplitWords } from '../../components/motion/SplitWords';
import { ScrollRevealText } from '../../components/motion/ScrollRevealText';
import { SectionLabel } from '../../components/SectionLabel';
import { Container } from '../../components/Container';
import { Button, LinkButton } from '../../components/common/Button';
import { Wordmark } from '../../components/Wordmark';
import { Badge } from '../../components/common/Badge';
import { Card } from '../../components/Card';
import styles from './LandingPage.module.css';

// Lazy load the PlaygroundCanvas to optimize initial landing bundle size
const PlaygroundCanvas = lazy(() => import('./PlaygroundCanvas'));

interface DetectorItem {
  id: string;
  index: string;
  name: string;
  description: string;
  pattern: string;
  type: string;
}

const DETECTORS: DetectorItem[] = [
  {
    id: 'circular-flow',
    index: 'D. 01',
    name: 'Circular Flow',
    description: 'Closed cycle payment flow among 3–5 accounts returning within 24 hours.',
    pattern: 'Cycle 3–5 · ≤24h',
    type: 'cycle',
  },
  {
    id: 'fan-in-fan-out',
    index: 'D. 02',
    name: 'Fan-In / Fan-Out',
    description: 'Rapid aggregation from ≥3 accounts followed by rapid dispersion to ≥3 accounts.',
    pattern: 'Hub · ≥3 in / ≥3 out',
    type: 'hub',
  },
  {
    id: 'shared-device',
    index: 'D. 03',
    name: 'Shared Device',
    description: 'Device identifier bound to ≥3 distinct accounts (2 accounts treated as benign).',
    pattern: 'Device · ≥3 accounts',
    type: 'device',
  },
  {
    id: 'pass-through',
    index: 'D. 04',
    name: 'Pass-Through',
    description: 'High-velocity forwarding (≥80% amount forwarded within 60m, ≥2 occurrences).',
    pattern: 'Transit · ≥80% in 60m',
    type: 'passthrough',
  },
  {
    id: 'merchant-cashout',
    index: 'D. 05',
    name: 'Merchant Cash-Out',
    description: 'Coordinated terminal drain where ≥2 related accounts transact in 2 hours.',
    pattern: 'Terminal · ≥2 accts in 2h',
    type: 'cashout',
  },
];

const WORKFLOW_STEPS = [
  {
    id: 'step-1',
    index: 'H. 01',
    title: 'Ingest and validate',
    body: 'Analyst uploads a transaction CSV or generates synthetic demo data. Express validates the dataset with strict schema checks, duplicate filtering, and batch error reporting.',
  },
  {
    id: 'step-2',
    index: 'H. 02',
    title: 'Detect and group rings',
    body: 'Analyst triggers analysis. An in-memory graph is constructed and five deterministic topological detectors uncover patterns, merging overlapping detections into multi-entity fraud rings.',
  },
  {
    id: 'step-3',
    index: 'H. 03',
    title: 'Score and explain',
    body: 'A multi-factor risk engine calculates calibrated 0–100 scores with granular evidence signals, explicit category caps, and transparent network metrics.',
  },
  {
    id: 'step-4',
    index: 'H. 04',
    title: 'Case and disposition',
    body: 'Analysts escalate alerts into structured cases, attach evidence dossiers, request AI briefs verified deterministically against database records, and close with disposition.',
  },
];

const AI_DEFENSE_ITEMS = [
  {
    index: '01',
    title: 'Evidence bundle',
    body: 'The backend collects case, alerts, transactions, graph relationships, risk signals and timeline, and gives every item a stable evidence ID.',
  },
  {
    index: '02',
    title: 'Derived facts',
    body: 'The backend calculates the numbers (for example forwarding percentage and timing) before the model sees anything; the model does no arithmetic.',
  },
  {
    index: '03',
    title: 'Verification',
    body: 'Referenced evidence IDs and values are checked against the evidence; unsupported claims and strong verdict language are rejected.',
  },
  {
    index: '04',
    title: 'Analyst control',
    body: 'The analyst accepts, edits or discards the brief, and the action is recorded in the case audit trail.',
  },
];

export const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isReduced = useReducedMotion();

  // Scroll spy for sticky nav
  const activeSection = useActiveSection(['product', 'detectors', 'principles', 'workflow', 'copilot']);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Floating detector preview follow
  const previewRef = useRef<HTMLDivElement>(null);
  const [hoveredDetector, setHoveredDetector] = useState<DetectorItem | null>(null);
  const [expandedDetector, setExpandedDetector] = useState<string | null>(null);

  // Cursor follow hook
  useCursorFollow(previewRef, { lerp: 0.16 });

  // Section in-view observers for animations
  const [featRef, featInView] = useInView<HTMLElement>({ threshold: 0.15, once: true });
  const [detRef] = useInView<HTMLElement>({ threshold: 0.15, once: true });
  const [prinRef] = useInView<HTMLElement>({ threshold: 0.15, once: true });
  const [workRef] = useInView<HTMLElement>({ threshold: 0.15, once: true });
  const [copRef] = useInView<HTMLElement>({ threshold: 0.15, once: true });

  // Header scroll detection
  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 8);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleAuthAction = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: isReduced ? 'auto' : 'smooth' });
    }
  };

  // Section 01 SVG Trace Animation State (Planted Circular Flow Pattern)
  const [traceStep, setTraceStep] = useState(0); // 0: initial, 1: nodes, 2: edges, 3: completed
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Autoplay trace sequence on enter
  useEffect(() => {
    if (featInView) {
      const t1 = setTimeout(() => setTraceStep(1), 200);
      const t2 = setTimeout(() => setTraceStep(2), 700);
      const t3 = setTimeout(() => setTraceStep(3), 1300);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [featInView]);

  const replayTrace = () => {
    setTraceStep(0);
    setSelectedNode(null);
    setTimeout(() => setTraceStep(1), 100);
    setTimeout(() => setTraceStep(2), 600);
    setTimeout(() => setTraceStep(3), 1200);
  };

  // Esc key closes evidence card
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedNode(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Workflow scroll spy active step (nearest viewport center)
  const [activeWorkflowIndex, setActiveWorkflowIndex] = useState(0);
  const workflowStepRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const handleScroll = () => {
      const centerY = window.innerHeight / 2;
      let closestIdx = 0;
      let minDistance = Infinity;

      workflowStepRefs.current.forEach((ref, idx) => {
        if (!ref) return;
        const rect = ref.getBoundingClientRect();
        const elemCenter = rect.top + rect.height / 2;
        const distance = Math.abs(centerY - elemCenter);
        if (distance < minDistance) {
          minDistance = distance;
          closestIdx = idx;
        }
      });
      setActiveWorkflowIndex(closestIdx);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className={styles.container}>
      {/* 1. Header with unified Wordmark and solid background */}
      <header className={`${styles.header} ${isScrolled ? styles.headerScrolled : ''}`}>
        <Container className={styles.headerInner}>
          <Wordmark href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: isReduced ? 'auto' : 'smooth' }); }} />

          <nav className={styles.navLinks} aria-label="Main Navigation">
            <a
              href="#product"
              onClick={(e) => { e.preventDefault(); scrollTo('product'); }}
              className={`${styles.navLink} ${activeSection === 'product' ? styles.navLinkActive : ''}`}
            >
              Product
            </a>
            <a
              href="#detectors"
              onClick={(e) => { e.preventDefault(); scrollTo('detectors'); }}
              className={`${styles.navLink} ${activeSection === 'detectors' ? styles.navLinkActive : ''}`}
            >
              Detectors
            </a>
            <a
              href="#principles"
              onClick={(e) => { e.preventDefault(); scrollTo('principles'); }}
              className={`${styles.navLink} ${activeSection === 'principles' ? styles.navLinkActive : ''}`}
            >
              Principles
            </a>
            <a
              href="#workflow"
              onClick={(e) => { e.preventDefault(); scrollTo('workflow'); }}
              className={`${styles.navLink} ${activeSection === 'workflow' ? styles.navLinkActive : ''}`}
            >
              Workflow
            </a>
            <a
              href="#copilot"
              onClick={(e) => { e.preventDefault(); scrollTo('copilot'); }}
              className={`${styles.navLink} ${activeSection === 'copilot' ? styles.navLinkActive : ''}`}
            >
              Copilot
            </a>
          </nav>

          <div className={styles.headerActions}>
            <span className={styles.demoPill}>Synthetic demo data</span>
            <Button variant="primary" size="sm" onClick={handleAuthAction}>
              <span>{user ? 'Open dashboard' : 'Sign in'}</span>
              <span aria-hidden="true">→</span>
            </Button>
            <button
              type="button"
              className={styles.menuBtn}
              onClick={() => setMobileMenuOpen((o) => !o)}
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              ☰
            </button>
          </div>
        </Container>

        {/* Collapsible Mobile Menu */}
        <div className={`${styles.mobileMenu} ${mobileMenuOpen ? styles.mobileMenuOpen : ''}`}>
          <a href="#product" onClick={(e) => { e.preventDefault(); scrollTo('product'); }} className={styles.navLink}>
            Product
          </a>
          <a href="#detectors" onClick={(e) => { e.preventDefault(); scrollTo('detectors'); }} className={styles.navLink}>
            Detectors
          </a>
          <a href="#principles" onClick={(e) => { e.preventDefault(); scrollTo('principles'); }} className={styles.navLink}>
            Principles
          </a>
          <a href="#workflow" onClick={(e) => { e.preventDefault(); scrollTo('workflow'); }} className={styles.navLink}>
            Workflow
          </a>
          <a href="#copilot" onClick={(e) => { e.preventDefault(); scrollTo('copilot'); }} className={styles.navLink}>
            Copilot
          </a>
          <Button variant="primary" size="md" onClick={handleAuthAction}>
            <span>{user ? 'Open dashboard' : 'Sign in'}</span>
            <span aria-hidden="true">→</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.main}>
        {/* 2. Hero Section with Strict Vertical Rhythm */}
        <section className={styles.heroSection}>
          <div className={styles.heroBackground} aria-hidden="true">
            <svg width="100%" height="100%" viewBox="0 0 1000 600" preserveAspectRatio="none">
              <circle cx="150" cy="180" r="16" fill="var(--node-account)" opacity="0.3" />
              <polygon points="450,110 470,122 470,144 450,156 430,144 430,122" fill="var(--node-device)" opacity="0.3" />
              <rect x="750" y="240" width="28" height="28" fill="var(--node-merchant)" opacity="0.3" />
              <circle cx="820" cy="120" r="12" fill="var(--node-account)" opacity="0.25" />
              <circle cx="320" cy="420" r="14" fill="var(--node-account)" opacity="0.25" />
              <polygon points="680,430 700,442 700,464 680,476 660,464 660,442" fill="var(--node-device)" opacity="0.25" />
              <path d="M150,180 L450,133 M450,133 L750,254 M320,420 L680,453" stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />
            </svg>
          </div>

          <Container className={styles.heroContent}>
            <div className={styles.heroTag}>00 // FINANCIAL NETWORK ANALYSIS</div>
            <h1 className={styles.headline}>
              <SplitWords
                text="Multi-entity fraud detection with graph precision."
                accentWords={['graph', 'precision.']}
                accentClassName={styles.headlineAccent}
                durationMs={900}
              />
            </h1>
            <p className={styles.heroDescription}>
              FraudTrace links accounts, device identifiers, merchants, and transactions into an in-memory graph.
              Deterministic detectors identify coordinated fraud rings, calculate explainable risk scores,
              and synthesize evidence-verified investigation briefs.
            </p>
            <div className={styles.heroActions}>
              <Button variant="primary" size="lg" onClick={handleAuthAction}>
                <span>{user ? 'Open dashboard' : 'Sign in'}</span>
                <span aria-hidden="true">→</span>
              </Button>
              <LinkButton
                variant="ghost"
                size="lg"
                href="#product"
                onClick={(e) => { e.preventDefault(); scrollTo('product'); }}
              >
                <span>Read architecture</span>
                <span aria-hidden="true">↓</span>
              </LinkButton>
            </div>
          </Container>
        </section>

        {/* 3. Section 01: Featured (Product) */}
        <section ref={featRef} id="product" className={styles.section}>
          <Container>
            <SectionLabel number="01" label="FEATURED" />

            <div className={styles.featuredGrid}>
              <div className={styles.featuredContent}>
                <span className={styles.tagChip}>RING_002 // CIRCULAR_FLOW</span>
                <h2 className={styles.sectionTitle}>Planted Circular Payment Flow</h2>
                <p className={styles.sectionSubtitle}>
                  Three synthetic accounts execute a closed fund-routing cycle within 90 minutes.
                  Funds disburse sequentially through account hops before returning near origin, triggering the Circular Flow detector.
                </p>

                <div className={styles.schematicLegend}>
                  <div className={styles.legendItem}>
                    <span className={`${styles.legendDot} ${styles.dotAccount}`} />
                    <span>Account</span>
                  </div>
                  <div className={styles.legendItem}>
                    <span className={`${styles.legendDot} ${styles.dotDevice}`} />
                    <span>Device Identifier</span>
                  </div>
                  <div className={styles.legendItem}>
                    <span className={`${styles.legendDot} ${styles.dotFlow}`} />
                    <span>Transfer Flow</span>
                  </div>
                </div>

                <div className={styles.featuredMetrics}>
                  <div className={styles.metricItem}>
                    <span className={styles.metricLabel}>ENTITIES</span>
                    <span className={styles.metricVal}>3 Accounts</span>
                  </div>
                  <div className={styles.metricItem}>
                    <span className={styles.metricLabel}>VOLUME</span>
                    <span className={styles.metricVal}>₹36,700</span>
                  </div>
                  <div className={styles.metricItem}>
                    <span className={styles.metricLabel}>CYCLE DURATION</span>
                    <span className={styles.metricVal}>90 min</span>
                  </div>
                </div>
              </div>

              {/* Planted 3-Hop Circular Flow Architecture Illustration */}
              <div className={styles.schematicBox}>
                <div className={styles.schematicCanvasWrapper}>
                  <svg className={styles.schematicSvg} viewBox="0 0 520 380">
                    <circle cx="260" cy="190" r="140" fill="none" stroke="var(--border)" strokeWidth="1" strokeDasharray="3 3" />

                    {/* Transfer Cycle: 1A -> 1B -> 1C -> 1A */}
                    <g className={traceStep >= 2 ? styles.edgeAnimated : styles.edgeHidden}>
                      <path d="M 260 70 A 140 140 0 0 1 381 260" fill="none" stroke="var(--edge-suspicious)" strokeWidth="2.5" />
                      <path d="M 381 260 A 140 140 0 0 1 139 260" fill="none" stroke="var(--edge-suspicious)" strokeWidth="2.5" />
                      <path d="M 139 260 A 140 140 0 0 1 260 70" fill="none" stroke="var(--edge-suspicious)" strokeWidth="2.5" />
                      <text x="350" y="150" fill="var(--text-3)" fontSize="10" fontFamily="var(--font-mono)">₹12,500</text>
                      <text x="260" y="305" fill="var(--text-3)" fontSize="10" fontFamily="var(--font-mono)" textAnchor="middle">₹12,200</text>
                      <text x="140" y="150" fill="var(--text-3)" fontSize="10" fontFamily="var(--font-mono)">₹12,000</text>
                    </g>

                    {/* Nodes: ACC-CIRC-1A */}
                    <g
                      className={traceStep >= 1 ? styles.nodeVisible : styles.nodeHidden}
                      onClick={() => setSelectedNode('ACC-CIRC-1A')}
                      onMouseEnter={() => setHoveredNode('ACC-CIRC-1A')}
                      onMouseLeave={() => setHoveredNode(null)}
                      style={{ cursor: 'pointer' }}
                    >
                      <circle cx="260" cy="50" r="22" fill="var(--surface)" stroke={hoveredNode === 'ACC-CIRC-1A' ? 'var(--accent)' : 'var(--node-account)'} strokeWidth="2.5" />
                      <text x="260" y="54" textAnchor="middle" fill="var(--text)" fontSize="10" fontFamily="var(--font-mono)" fontWeight="600">1A</text>
                      <text x="260" y="20" textAnchor="middle" fill="var(--text-2)" fontSize="10" fontFamily="var(--font-mono)">ACC-CIRC-1A</text>
                    </g>

                    {/* Nodes: ACC-CIRC-1B */}
                    <g
                      className={traceStep >= 1 ? styles.nodeVisible : styles.nodeHidden}
                      onClick={() => setSelectedNode('ACC-CIRC-1B')}
                      onMouseEnter={() => setHoveredNode('ACC-CIRC-1B')}
                      onMouseLeave={() => setHoveredNode(null)}
                      style={{ cursor: 'pointer' }}
                    >
                      <circle cx="381" cy="260" r="22" fill="var(--surface)" stroke={hoveredNode === 'ACC-CIRC-1B' ? 'var(--accent)' : 'var(--node-account)'} strokeWidth="2.5" />
                      <text x="381" y="264" textAnchor="middle" fill="var(--text)" fontSize="10" fontFamily="var(--font-mono)" fontWeight="600">1B</text>
                      <text x="430" y="278" textAnchor="start" fill="var(--text-2)" fontSize="10" fontFamily="var(--font-mono)">ACC-CIRC-1B</text>
                    </g>

                    {/* Nodes: ACC-CIRC-1C */}
                    <g
                      className={traceStep >= 1 ? styles.nodeVisible : styles.nodeHidden}
                      onClick={() => setSelectedNode('ACC-CIRC-1C')}
                      onMouseEnter={() => setHoveredNode('ACC-CIRC-1C')}
                      onMouseLeave={() => setHoveredNode(null)}
                      style={{ cursor: 'pointer' }}
                    >
                      <circle cx="139" cy="260" r="22" fill="var(--surface)" stroke={hoveredNode === 'ACC-CIRC-1C' ? 'var(--accent)' : 'var(--node-account)'} strokeWidth="2.5" />
                      <text x="139" y="264" textAnchor="middle" fill="var(--text)" fontSize="10" fontFamily="var(--font-mono)" fontWeight="600">1C</text>
                      <text x="90" y="278" textAnchor="end" fill="var(--text-2)" fontSize="10" fontFamily="var(--font-mono)">ACC-CIRC-1C</text>
                    </g>

                    {/* Devices */}
                    <g className={traceStep >= 1 ? styles.nodeVisible : styles.nodeHidden}>
                      <polygon points="260,110 270,117 270,131 260,138 250,131 250,117" fill="var(--node-device)" />
                      <line x1="260" y1="72" x2="260" y2="110" stroke="var(--border-strong)" strokeDasharray="2 2" />
                      <text x="260" y="152" textAnchor="middle" fill="var(--text-3)" fontSize="9" fontFamily="var(--font-mono)">DEV-C1-A</text>
                    </g>

                    {/* Central Indicator */}
                    <g className={traceStep >= 3 ? styles.nodeVisible : styles.nodeHidden}>
                      <rect x="200" y="175" width="120" height="30" rx="4" fill="var(--surface)" stroke="var(--border)" />
                      <text x="260" y="194" textAnchor="middle" fill="var(--accent)" fontSize="11" fontFamily="var(--font-mono)" fontWeight="600">
                        DETECTED: CIRCULAR
                      </text>
                    </g>
                  </svg>

                  <div className={styles.schematicOverlayActions}>
                    <Button variant="ghost" size="sm" onClick={replayTrace}>
                      <span>↻ Replay</span>
                    </Button>
                  </div>
                </div>

                {/* Evidence Drawer Details for Clicked Node */}
                {selectedNode && (
                  <div className={styles.evidenceCard}>
                    <div className={styles.evidenceCardHeader}>
                      <span className={styles.evidenceCardTitle}>
                        Node Evidence: {selectedNode}
                      </span>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedNode(null)} aria-label="Close evidence">
                        ✕
                      </Button>
                    </div>
                    <ul className={styles.evidenceList}>
                      <li>• <strong>FRAUD_PATTERN_INVOLVEMENT:</strong> +40 points (3-Hop Directed Flow Cycle)</li>
                      <li>• <strong>FRAUD_RING_MEMBERSHIP:</strong> +25 points (Member of cluster RING-002)</li>
                      <li>• <strong>TEMPORAL_VELOCITY:</strong> Rapid succession forwarding completed in 90 minutes</li>
                    </ul>
                  </div>
                )}
                <div className={styles.traceCaption}>Synthetic demo data · Section 5 & 7 Ground Truth</div>
              </div>
            </div>
          </Container>
        </section>

        {/* 4. Section 02: Detectors with row-list layout and min-height 104px */}
        <section ref={detRef} id="detectors" className={styles.section}>
          <Container>
            <SectionLabel number="02" label="DETECTORS" />

            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Deterministic Topological Detectors</h2>
              <p className={styles.sectionSubtitle}>
                Five deterministic algorithms inspect multi-entity relationships to uncover structured fraud topologies.
              </p>
            </div>

            <div className={styles.detectorsList}>
              {DETECTORS.map((d) => (
                <React.Fragment key={d.id}>
                  <div
                    className={styles.detectorRow}
                    onMouseEnter={() => setHoveredDetector(d)}
                    onMouseLeave={() => setHoveredDetector(null)}
                    onClick={() => setExpandedDetector(expandedDetector === d.id ? null : d.id)}
                    tabIndex={0}
                    role="button"
                    aria-expanded={expandedDetector === d.id}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        setExpandedDetector(expandedDetector === d.id ? null : d.id);
                      }
                    }}
                  >
                    <div className={styles.detectorLeft}>
                      <span className={styles.detectorIndex}>{d.index}</span>
                      <span className={styles.detectorName}>{d.name}</span>
                      <span className={styles.detectorDesc}>{d.description}</span>
                    </div>
                    <div className={styles.detectorRight}>
                      <span className={styles.detectorTag}>{d.pattern}</span>
                      <span className={styles.detectorArrow} aria-hidden="true">→</span>
                    </div>
                  </div>

                  {/* Inline accordion diagram for coarse/touch pointers or expanded state */}
                  {expandedDetector === d.id && (
                    <div className={styles.accordionBody}>
                      <svg width="200" height="100" viewBox="0 0 200 100">
                        {d.type === 'cycle' && (
                          <g>
                            <circle cx="50" cy="70" r="10" fill="var(--node-account)" />
                            <circle cx="100" cy="30" r="10" fill="var(--node-account)" />
                            <circle cx="150" cy="70" r="10" fill="var(--node-account)" />
                            <path d="M50,70 L100,30 L150,70 Z" fill="none" stroke="var(--edge-suspicious)" strokeWidth="2" strokeDasharray="4 4" />
                          </g>
                        )}
                        {d.type === 'hub' && (
                          <g>
                            <circle cx="100" cy="50" r="12" fill="var(--node-account)" />
                            <circle cx="40" cy="30" r="8" fill="var(--node-account)" />
                            <circle cx="40" cy="70" r="8" fill="var(--node-account)" />
                            <circle cx="160" cy="30" r="8" fill="var(--node-account)" />
                            <circle cx="160" cy="70" r="8" fill="var(--node-account)" />
                            <path d="M40,30 L100,50 M40,70 L100,50 M100,50 L160,30 M100,50 L160,70" stroke="var(--edge-suspicious)" strokeWidth="1.5" />
                          </g>
                        )}
                        {d.type === 'device' && (
                          <g>
                            <polygon points="100,35 112,42 112,56 100,63 88,56 88,42" fill="var(--node-device)" />
                            <circle cx="50" cy="50" r="9" fill="var(--node-account)" />
                            <circle cx="100" cy="85" r="9" fill="var(--node-account)" />
                            <circle cx="150" cy="50" r="9" fill="var(--node-account)" />
                            <path d="M50,50 L88,49 M100,85 L100,63 M150,50 L112,49" stroke="var(--border-strong)" strokeWidth="1.5" strokeDasharray="3 3" />
                          </g>
                        )}
                        {d.type === 'passthrough' && (
                          <g>
                            <circle cx="40" cy="50" r="9" fill="var(--node-account)" />
                            <circle cx="100" cy="50" r="11" fill="var(--node-account)" stroke="var(--edge-suspicious)" strokeWidth="2" />
                            <circle cx="160" cy="50" r="9" fill="var(--node-account)" />
                            <path d="M40,50 L100,50 L160,50" stroke="var(--edge-suspicious)" strokeWidth="2" />
                          </g>
                        )}
                        {d.type === 'cashout' && (
                          <g>
                            <circle cx="60" cy="30" r="9" fill="var(--node-account)" />
                            <circle cx="60" cy="70" r="9" fill="var(--node-account)" />
                            <rect x="140" y="40" width="22" height="22" fill="var(--node-merchant)" />
                            <path d="M60,30 L140,51 M60,70 L140,51" stroke="var(--edge-suspicious)" strokeWidth="2" />
                          </g>
                        )}
                      </svg>
                      <span style={{ fontSize: '12px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                        Topological Pattern: {d.pattern}
                      </span>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Floating cursor follow preview (desktop only) */}
            {hoveredDetector && (
              <div ref={previewRef} className={styles.floatingPreview} aria-hidden="true">
                <svg width="140" height="90" viewBox="0 0 140 90">
                  {hoveredDetector.type === 'cycle' && (
                    <path d="M35,65 L70,25 L105,65 Z" fill="none" stroke="var(--edge-suspicious)" strokeWidth="2" />
                  )}
                  {hoveredDetector.type === 'hub' && (
                    <g>
                      <circle cx="70" cy="45" r="9" fill="var(--node-account)" />
                      <path d="M25,30 L70,45 M25,60 L70,45 M70,45 L115,30 M70,45 L115,60" stroke="var(--edge-suspicious)" strokeWidth="1.5" />
                    </g>
                  )}
                  {hoveredDetector.type === 'device' && (
                    <g>
                      <polygon points="70,35 80,41 80,53 70,59 60,53 60,41" fill="var(--node-device)" />
                      <circle cx="35" cy="47" r="7" fill="var(--node-account)" />
                      <circle cx="105" cy="47" r="7" fill="var(--node-account)" />
                      <circle cx="70" cy="75" r="7" fill="var(--node-account)" />
                      <path d="M35,47 L60,47 M105,47 L80,47 M70,75 L70,59" stroke="var(--border-strong)" strokeWidth="1.5" />
                    </g>
                  )}
                  {hoveredDetector.type === 'passthrough' && (
                    <g>
                      <circle cx="30" cy="45" r="7" fill="var(--node-account)" />
                      <circle cx="70" cy="45" r="9" fill="var(--node-account)" stroke="var(--edge-suspicious)" strokeWidth="1.5" />
                      <circle cx="110" cy="45" r="7" fill="var(--node-account)" />
                      <path d="M30,45 L110,45" stroke="var(--edge-suspicious)" strokeWidth="2" />
                    </g>
                  )}
                  {hoveredDetector.type === 'cashout' && (
                    <g>
                      <circle cx="45" cy="30" r="7" fill="var(--node-account)" />
                      <circle cx="45" cy="60" r="7" fill="var(--node-account)" />
                      <rect x="95" y="37" width="16" height="16" fill="var(--node-merchant)" />
                      <path d="M45,30 L95,45 M45,60 L95,45" stroke="var(--edge-suspicious)" strokeWidth="1.5" />
                    </g>
                  )}
                </svg>
                <span style={{ fontSize: '10px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                  {hoveredDetector.name}
                </span>
              </div>
            )}
          </Container>
        </section>

        {/* 5. Section 03: Principles */}
        <section ref={prinRef} id="principles" className={styles.section}>
          <Container>
            <SectionLabel number="03" label="PRINCIPLES" />

            <div className={styles.principlesStatement}>
              <ScrollRevealText
                text="Investigations demand deterministic graph topology over black-box guesswork. Every risk score links directly to verifiable temporal and hardware evidence."
              />
            </div>

            <div className={styles.principlesGrid}>
              <Card variant="interactive" className={styles.principleCard} tabIndex={0}>
                <div className={styles.cardTopAccent} aria-hidden="true" />
                <div className={styles.principleIllustration} aria-hidden="true">
                  <svg className={styles.illustrationA} viewBox="0 0 200 56">
                    <line x1="32" y1="28" x2="88" y2="16" className={styles.graphEdge} />
                    <line x1="32" y1="28" x2="88" y2="40" className={styles.graphEdge} />
                    <line x1="88" y1="16" x2="144" y2="22" className={styles.graphEdge} />
                    <line x1="88" y1="40" x2="176" y2="34" className={`${styles.graphEdge} ${styles.graphEdgeSuspicious}`} />
                    <circle cx="32" cy="28" r="8" fill="var(--node-account)" />
                    <circle cx="88" cy="16" r="8" fill="var(--node-account)" />
                    <circle cx="88" cy="40" r="8" fill="var(--node-account)" />
                    <polygon points="144,14 151,18 151,26 144,30 137,26 137,18" fill="var(--node-device)" />
                    <rect x="169" y="27" width="14" height="14" rx="2" fill="var(--node-merchant)" />
                  </svg>
                </div>
                <div className={styles.principleContent}>
                  <div className={styles.letterChip}>A</div>
                  <h3 className={styles.principleTitle}>Graph First</h3>
                  <p className={styles.principleBody}>
                    Isolated transaction filtering misses syndicates. Multi-entity projection captures device collisions,
                    circular payment flows, and shared settlement sinks.
                  </p>
                </div>
              </Card>

              <Card variant="interactive" className={styles.principleCard} tabIndex={0}>
                <div className={styles.cardTopAccent} aria-hidden="true" />
                <div className={styles.principleIllustration} aria-hidden="true">
                  <svg className={styles.illustrationB} viewBox="0 0 200 56">
                    <rect x="12" y="8" width="176" height="5" rx="2.5" fill="var(--surface-2)" />
                    <rect x="12" y="20" width="176" height="5" rx="2.5" fill="var(--surface-2)" />
                    <rect x="12" y="32" width="176" height="5" rx="2.5" fill="var(--surface-2)" />
                    <rect x="12" y="44" width="176" height="5" rx="2.5" fill="var(--surface-2)" />
                    <rect x="12" y="8" width="148" height="5" rx="2.5" fill="var(--primary)" className={`${styles.scoreBar} ${styles.scoreBar1}`} />
                    <rect x="12" y="20" width="108" height="5" rx="2.5" fill="var(--accent)" className={`${styles.scoreBar} ${styles.scoreBar2}`} />
                    <rect x="12" y="32" width="76" height="5" rx="2.5" fill="var(--node-device)" className={`${styles.scoreBar} ${styles.scoreBar3}`} />
                    <rect x="12" y="44" width="124" height="5" rx="2.5" fill="var(--text-3)" className={`${styles.scoreBar} ${styles.scoreBar4}`} />
                  </svg>
                </div>
                <div className={styles.principleContent}>
                  <div className={styles.letterChip}>B</div>
                  <h3 className={styles.principleTitle}>Explainable Scoring</h3>
                  <p className={styles.principleBody}>
                    Deterministic formulas without black-box inference models. Every score derives from explicit
                    contributor weights, defined category caps, and transparent network metrics.
                  </p>
                </div>
              </Card>

              <Card variant="interactive" className={styles.principleCard} tabIndex={0}>
                <div className={styles.cardTopAccent} aria-hidden="true" />
                <div className={styles.principleIllustration} aria-hidden="true">
                  <svg className={styles.illustrationC} viewBox="0 0 200 56">
                    <g className={styles.analystChip1}>
                      <rect x="20" y="14" width="46" height="28" rx="6" className={styles.chipBg} />
                      <path d="M36 28 L41 33 L50 22" className={styles.chipMark} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </g>
                    <g className={styles.analystChip2}>
                      <rect x="77" y="14" width="46" height="28" rx="6" className={styles.chipBg} />
                      <path d="M93 32 L103 22 L107 26 L97 36 L92 37 Z" className={styles.chipMark} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </g>
                    <g className={styles.analystChip3}>
                      <rect x="134" y="14" width="46" height="28" rx="6" className={styles.chipBg} />
                      <path d="M151 22 L163 34 M163 22 L151 34" className={styles.chipMark} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </g>
                  </svg>
                </div>
                <div className={styles.principleContent}>
                  <div className={styles.letterChip}>C</div>
                  <h3 className={styles.principleTitle}>Analyst in Control</h3>
                  <p className={styles.principleBody}>
                    AI proposes hypotheses, but human investigators decide. Every AI-generated brief undergoes strict post-generation
                    verification against database ground truth.
                  </p>
                </div>
              </Card>
            </div>
          </Container>
        </section>

        {/* 6. Section 04: Workflow / Pipeline with sticky left column and H. 01-04 list */}
        <section ref={workRef} id="workflow" className={styles.section}>
          <Container>
            <SectionLabel number="04" label="WORKFLOW" />

            <div className={styles.workflowGrid}>
              <div className={styles.workflowSticky}>
                <h2 className={styles.sectionTitle}>Investigation Pipeline</h2>
                <p className={styles.sectionSubtitle}>
                  From raw batch dataset ingestion to structured case disposition across four deterministic phases.
                </p>
              </div>

              <div className={styles.workflowList}>
                {WORKFLOW_STEPS.map((step, idx) => (
                  <div
                    key={step.id}
                    ref={(el) => (workflowStepRefs.current[idx] = el)}
                    className={`${styles.workflowStep} ${activeWorkflowIndex === idx ? styles.workflowStepActive : ''}`}
                    onClick={() => {
                      workflowStepRefs.current[idx]?.scrollIntoView({ behavior: isReduced ? 'auto' : 'smooth', block: 'center' });
                    }}
                    tabIndex={0}
                    role="button"
                  >
                    <span className={styles.stepIndex}>{step.index}</span>
                    <h3 className={styles.stepTitle}>{step.title}</h3>
                    <p className={styles.stepBody}>{step.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </Container>
        </section>

        {/* 7. Section 05: Copilot (AI Defence & Verification Protocol) */}
        <section ref={copRef} id="copilot" className={styles.section}>
          <Container>
            <SectionLabel number="05" label="COPILOT" />

            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Deterministic AI Defense & Verification</h2>
              <p className={styles.sectionSubtitle}>
                Strict evidence grounding and post-generation verification prevent hallucinations in forensics.
              </p>
            </div>

            <div className={styles.copilotGrid}>
              {/* Left Column: 4 Rows in detector style */}
              <div className={styles.copilotDefenseList}>
                {AI_DEFENSE_ITEMS.map((item) => (
                  <div key={item.index} className={styles.copilotDefenseRow}>
                    <span className={styles.copilotDefenseIndex}>{item.index}</span>
                    <div className={styles.copilotDefenseContent}>
                      <h3 className={styles.copilotDefenseHeading}>{item.title}</h3>
                      <p className={styles.copilotDefenseBody}>{item.body}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Right Column: Verification outcome Card with Badge styles */}
              <Card className={styles.verificationCard}>
                <div className={styles.verificationCardHeader}>
                  <h3 className={styles.verificationCardTitle}>Post-Generation Verify Protocol</h3>
                  <p className={styles.verificationCardSubtitle}>Deterministic verification against active evidence snapshots</p>
                </div>
                <div className={styles.outcomesList}>
                  <div className={styles.outcomeItem}>
                    <div>
                      <Badge variant="low">VERIFIED</Badge>
                    </div>
                    <p className={styles.outcomeDesc}>
                      All cited IDs and values match, shown as is.
                    </p>
                  </div>
                  <div className={styles.outcomeItem}>
                    <div>
                      <Badge variant="medium">PARTIALLY_VERIFIED</Badge>
                    </div>
                    <p className={styles.outcomeDesc}>
                      Unsupported findings are removed, the rest is shown.
                    </p>
                  </div>
                  <div className={styles.outcomeItem}>
                    <div>
                      <Badge variant="critical">UNVERIFIED</Badge>
                    </div>
                    <p className={styles.outcomeDesc}>
                      Replaced by a deterministic fallback summary, and the rejection reasons are recorded.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </Container>
        </section>

        {/* 8. Interactive Playground "Trace the Ring" */}
        <section className={styles.section} id="playground">
          <Container>
            <SectionLabel number="06" label="PLAYGROUND" />
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Interactive Ring Discovery</h2>
              <p className={styles.sectionSubtitle}>
                Explore synthetic network clusters. Click entities or trace connections to uncover circular flows, disbursement hubs, and shared device syndicates.
              </p>
            </div>

            <Suspense fallback={<div style={{ padding: 'var(--space-12)', textAlign: 'center', color: 'var(--text-3)' }}>Loading canvas playground...</div>}>
              <PlaygroundCanvas />
            </Suspense>
          </Container>
        </section>

        {/* 9. Closing CTA Band */}
        <section className={styles.ctaSection}>
          <Container>
            <div className={styles.ctaBand}>
              <h2 className={styles.ctaBandTitle}>Begin financial forensic graph investigation.</h2>
              <Button variant="primary" size="lg" onClick={handleAuthAction}>
                <span>{user ? 'Open dashboard' : 'Sign in to workspace'}</span>
                <span aria-hidden="true">→</span>
              </Button>
            </div>
          </Container>
        </section>
      </main>

      {/* 10. Footer with unified Wordmark and link hygiene */}
      <footer className={styles.footer}>
        <Container>
          <div className={styles.footerInner}>
            <div className={styles.footerCols}>
              <div className={styles.footerBrand}>
                <Wordmark />
                <p className={styles.footerTagline}>
                  Deterministic financial graph analysis and multi-entity fraud ring investigation.
                </p>
              </div>

              <div>
                <div className={styles.footerColTitle}>Navigation</div>
                <ul className={styles.footerLinks}>
                  <li><a href="#product" onClick={(e) => { e.preventDefault(); scrollTo('product'); }} className={styles.footerLink}>Product</a></li>
                  <li><a href="#detectors" onClick={(e) => { e.preventDefault(); scrollTo('detectors'); }} className={styles.footerLink}>Detectors</a></li>
                  <li><a href="#principles" onClick={(e) => { e.preventDefault(); scrollTo('principles'); }} className={styles.footerLink}>Principles</a></li>
                  <li><a href="#workflow" onClick={(e) => { e.preventDefault(); scrollTo('workflow'); }} className={styles.footerLink}>Workflow</a></li>
                  <li><a href="#copilot" onClick={(e) => { e.preventDefault(); scrollTo('copilot'); }} className={styles.footerLink}>Copilot</a></li>
                </ul>
              </div>

              <div>
                <div className={styles.footerColTitle}>Investigate</div>
                <ul className={styles.footerLinks}>
                  <li><a href="/dashboard" onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }} className={styles.footerLink}>Dashboard</a></li>
                  <li><a href="/alerts" onClick={(e) => { e.preventDefault(); navigate('/alerts'); }} className={styles.footerLink}>Alerts</a></li>
                  <li><a href="/rings" onClick={(e) => { e.preventDefault(); navigate('/rings'); }} className={styles.footerLink}>Fraud Rings</a></li>
                  <li><a href="/graph" onClick={(e) => { e.preventDefault(); navigate('/graph'); }} className={styles.footerLink}>Graph Explorer</a></li>
                </ul>
              </div>

              <div>
                <div className={styles.footerColTitle}>Workspace</div>
                <ul className={styles.footerLinks}>
                  <li><a href="/cases" onClick={(e) => { e.preventDefault(); navigate('/cases'); }} className={styles.footerLink}>Cases</a></li>
                  <li><a href="/data" onClick={(e) => { e.preventDefault(); navigate('/data'); }} className={styles.footerLink}>Data Management</a></li>
                  <li><a href="/rules" onClick={(e) => { e.preventDefault(); navigate('/rules'); }} className={styles.footerLink}>Rules</a></li>
                  <li><a href="/login" onClick={(e) => { e.preventDefault(); navigate('/login'); }} className={styles.footerLink}>Sign In to Workspace</a></li>
                </ul>
              </div>
            </div>

            <div className={styles.footerRule} />

            <div className={styles.footerStatusLine}>
              <span>Synthetic demo data · Not real financial data · © 2026 FraudTrace</span>
              <p className={styles.footerDisclaimer}>
                Risk scores are investigative signals, not legal or regulatory determinations.
              </p>
            </div>
          </div>
        </Container>
      </footer>
    </div>
  );
};

export default LandingPage;
