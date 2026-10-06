import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/AuthContext';
import { Button } from '../../components/common/Button';
import { useReveal } from '../../lib/useReveal';
import styles from './LandingPage.module.css';

interface RevealBlockProps {
  children: React.ReactNode;
  id?: string;
  className?: string;
}

const RevealBlock: React.FC<RevealBlockProps> = ({ children, id, className }) => {
  const { ref, isRevealed } = useReveal<HTMLElement>();
  return (
    <section
      ref={ref}
      id={id}
      className={`${styles.revealSection} ${isRevealed ? styles.revealed : ''} ${className || ''}`}
    >
      {children}
    </section>
  );
};

export const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleAuthAction = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      element.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    }
  };

  return (
    <div className={styles.container}>
      {/* Top Bar */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <span className={styles.brand}>FraudTrace</span>

          <nav className={styles.navLinks} aria-label="Page navigation">
            <a
              href="#topology"
              onClick={(e) => scrollToSection(e, 'topology')}
              className={styles.navLink}
            >
              Topology
            </a>
            <a
              href="#detectors"
              onClick={(e) => scrollToSection(e, 'detectors')}
              className={styles.navLink}
            >
              Detectors
            </a>
            <a
              href="#workflow"
              onClick={(e) => scrollToSection(e, 'workflow')}
              className={styles.navLink}
            >
              Workflow
            </a>
            <a
              href="#copilot"
              onClick={(e) => scrollToSection(e, 'copilot')}
              className={styles.navLink}
            >
              Copilot
            </a>
          </nav>

          <Button variant="primary" compact onClick={handleAuthAction}>
            {user ? 'Open dashboard' : 'Sign in'}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.main}>
        {/* Hero Section */}
        <section className={styles.heroSection}>
          <div className={styles.heroTag}>Investigation Platform</div>
          <h1 className={styles.headline}>
            <span className={styles.headlineLine1}>Multi-entity fraud detection</span>
            <span className={styles.headlineLine2}>with deterministic graph precision.</span>
          </h1>
          <p className={styles.heroDescription}>
            FraudTrace links accounts, hardware devices, merchants, and transactions into an in-memory graph.
            Deterministic detectors identify coordinated fraud rings, calculate explainable risk scores,
            and generate evidence-verified investigation briefs.
          </p>
          <div className={styles.heroAction}>
            <Button variant="primary" onClick={handleAuthAction}>
              {user ? 'Open dashboard' : 'Sign in'}
            </Button>
          </div>
        </section>

        {/* Core Topology */}
        <RevealBlock id="topology" className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>Multi-Entity Graph</span>
            <h2 className={styles.sectionTitle}>Relational topology across payments and entities</h2>
            <p className={styles.sectionSubtitle}>
              Traditional rule engines inspect payments in isolation. FraudTrace constructs a multi-layered
              graph that exposes shared device hardware, common merchant settlement sinks, and cyclic payment flows.
            </p>
          </div>

          <div className={styles.cardsGrid}>
            <div className={styles.card}>
              <span className={styles.cardNumber}>01</span>
              <div className={styles.cardTitle}>Account Entities</div>
              <p className={styles.cardBody}>
                Tracks accounts, balances, creation dates, and historic risk profiles to uncover mule networks
                and dormant accounts activated for laundering.
              </p>
            </div>
            <div className={styles.card}>
              <span className={styles.cardNumber}>02</span>
              <div className={styles.cardTitle}>Device Fingerprints</div>
              <p className={styles.cardBody}>
                Binds hardware attributes and device identifiers across multiple accounts, detecting syndicates
                operating multiple identities from common terminals.
              </p>
            </div>
            <div className={styles.card}>
              <span className={styles.cardNumber}>03</span>
              <div className={styles.cardTitle}>Merchant Settlement</div>
              <p className={styles.cardBody}>
                Monitors terminal velocity, merchant categories, and settlement points to identify coordinated
                cash-out patterns and synthetic chargebacks.
              </p>
            </div>
          </div>

          <div className={styles.schematicCard} aria-label="Topology diagram illustration">
            <div className={styles.schematicHeader}>
              <span>Graph Topology</span>
              <span>Multi-Hop Entity Linkage</span>
            </div>

            <svg
              className={styles.schematicSvg}
              viewBox="0 0 600 160"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="Schematic showing Account, Device, and Merchant connections"
            >
              <line x1="100" y1="80" x2="250" y2="40" stroke="var(--edge-default)" strokeWidth="1.5" />
              <line x1="100" y1="80" x2="250" y2="120" stroke="var(--edge-suspicious)" strokeWidth="1.5" strokeDasharray="4 2" />
              <line x1="250" y1="40" x2="400" y2="80" stroke="var(--edge-default)" strokeWidth="1.5" />
              <line x1="250" y1="120" x2="400" y2="80" stroke="var(--edge-suspicious)" strokeWidth="1.5" strokeDasharray="4 2" />
              <line x1="400" y1="80" x2="520" y2="80" stroke="var(--edge-default)" strokeWidth="1.5" />

              {/* Node 1: Account */}
              <circle cx="100" cy="80" r="18" fill="var(--node-account)" />
              <text x="100" y="115" textAnchor="middle" fontSize="11" fill="var(--text)" fontFamily="var(--font-ui)">
                Account A
              </text>

              {/* Node 2: Device */}
              <polygon points="250,22 266,31 266,49 250,58 234,49 234,31" fill="var(--node-device)" />
              <text x="250" y="16" textAnchor="middle" fontSize="11" fill="var(--text)" fontFamily="var(--font-ui)">
                Device Fingerprint
              </text>

              {/* Node 3: Merchant */}
              <rect x="234" y="104" width="32" height="32" fill="var(--node-merchant)" />
              <text x="250" y="152" textAnchor="middle" fontSize="11" fill="var(--text)" fontFamily="var(--font-ui)">
                Merchant Terminal
              </text>

              {/* Node 4: Account B */}
              <circle cx="400" cy="80" r="18" fill="var(--node-account)" />
              <text x="400" y="115" textAnchor="middle" fontSize="11" fill="var(--text)" fontFamily="var(--font-ui)">
                Account B
              </text>

              {/* Node 5: Account C */}
              <circle cx="520" cy="80" r="18" fill="var(--node-account)" />
              <text x="520" y="115" textAnchor="middle" fontSize="11" fill="var(--text)" fontFamily="var(--font-ui)">
                Account C
              </text>
            </svg>

            <div className={styles.schematicLegend}>
              <div className={styles.legendItem}>
                <span className={styles.legendDot} style={{ borderRadius: '50%', backgroundColor: 'var(--node-account)' }} />
                <span>Account</span>
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendDot} style={{ transform: 'rotate(45deg)', backgroundColor: 'var(--node-device)' }} />
                <span>Device</span>
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendDot} style={{ backgroundColor: 'var(--node-merchant)' }} />
                <span>Merchant</span>
              </div>
            </div>
          </div>
        </RevealBlock>

        {/* Five Detectors */}
        <RevealBlock id="detectors" className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>Pattern Detection</span>
            <h2 className={styles.sectionTitle}>Five deterministic pattern detectors</h2>
            <p className={styles.sectionSubtitle}>
              Engineered detectors execute in sequence over the constructed graph, identifying specific
              topological indicators of structured financial evasion.
            </p>
          </div>

          <div className={styles.detectorsGrid}>
            <div className={styles.detectorCard}>
              <span className={styles.detectorTag}>Detector 01</span>
              <div className={styles.detectorName}>Circular Routing</div>
              <p className={styles.detectorDesc}>
                Detects directed cycles of 3 to 5 transaction hops where capital returns to the initiating
                account within defined time windows.
              </p>
            </div>

            <div className={styles.detectorCard}>
              <span className={styles.detectorTag}>Detector 02</span>
              <div className={styles.detectorName}>Shared Device / IP</div>
              <p className={styles.detectorDesc}>
                Identifies distinct account entities accessing systems from identical device hashes or IP ranges,
                revealing multi-accounting operations.
              </p>
            </div>

            <div className={styles.detectorCard}>
              <span className={styles.detectorTag}>Detector 03</span>
              <div className={styles.detectorName}>Rapid Layering &amp; Pass-Through</div>
              <p className={styles.detectorDesc}>
                Flags intermediary accounts that receive funds and immediately transfer 85%+ outward within
                short windows, leaving minimal residual balances.
              </p>
            </div>

            <div className={styles.detectorCard}>
              <span className={styles.detectorTag}>Detector 04</span>
              <div className={styles.detectorName}>Fan-In / Fan-Out Dispersion</div>
              <p className={styles.detectorDesc}>
                Surfaces structural aggregation (many sources paying one sink) and structural distribution
                (one source dispersing to numerous recipients).
              </p>
            </div>

            <div className={styles.detectorCard}>
              <span className={styles.detectorTag}>Detector 05</span>
              <div className={styles.detectorName}>Dormant Awakening</div>
              <p className={styles.detectorDesc}>
                Flags accounts inactive for extended periods that suddenly execute high-velocity, high-volume
                transfers inconsistent with prior baselines.
              </p>
            </div>
          </div>
        </RevealBlock>

        {/* Workflow */}
        <RevealBlock id="workflow" className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>End-to-End Execution</span>
            <h2 className={styles.sectionTitle}>From raw ledger to case disposition</h2>
            <p className={styles.sectionSubtitle}>
              A disciplined, reproducible operational lifecycle designed for compliance officers and financial analysts.
            </p>
          </div>

          <div className={styles.workflowList}>
            <div className={styles.workflowItem}>
              <span className={styles.workflowStepNum}>Step 01</span>
              <div className={styles.workflowTitle}>Graph Ingestion</div>
              <p className={styles.workflowText}>
                Parse structured batch files or generate synthetic financial simulations with verified deterministic seeds.
              </p>
            </div>

            <div className={styles.workflowItem}>
              <span className={styles.workflowStepNum}>Step 02</span>
              <div className={styles.workflowTitle}>Ring Clustering</div>
              <p className={styles.workflowText}>
                Group overlapping detector alerts into connected fraud rings with persistent deterministic fingerprints.
              </p>
            </div>

            <div className={styles.workflowItem}>
              <span className={styles.workflowStepNum}>Step 03</span>
              <div className={styles.workflowTitle}>Explainable Scoring</div>
              <p className={styles.workflowText}>
                Compute 0–100 risk scores with transparent evidence contributions and capped category multipliers.
              </p>
            </div>

            <div className={styles.workflowItem}>
              <span className={styles.workflowStepNum}>Step 04</span>
              <div className={styles.workflowTitle}>Case Management</div>
              <p className={styles.workflowText}>
                Organize alerts into investigatory cases, record analyst notes, set dispositions, and preserve audit trails.
              </p>
            </div>
          </div>
        </RevealBlock>

        {/* AI Copilot & Principles */}
        <RevealBlock id="copilot" className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>Verified AI Copilot</span>
            <h2 className={styles.sectionTitle}>Strictly grounded, evidence-verified assistance</h2>
            <p className={styles.sectionSubtitle}>
              The AI copilot assists analysts by drafting structured case briefs. Output is verified against
              grounded case evidence tokens to prevent hallucination.
            </p>
          </div>

          <div className={styles.principlesList}>
            <div className={styles.principleRow}>
              <span className={styles.principleNum}>01</span>
              <p className={styles.principleText}>
                <strong>Evidence-Grounded Summaries:</strong> Every generated statement references explicit evidence IDs
                from alerts, accounts, and transactions present in the case record.
              </p>
            </div>
            <div className={styles.principleRow}>
              <span className={styles.principleNum}>02</span>
              <p className={styles.principleText}>
                <strong>Automated Backend Verification:</strong> The server verifies all cited tokens against the database.
                Briefs receive clear status markers: VERIFIED, PARTIALLY_VERIFIED, or UNVERIFIED.
              </p>
            </div>
            <div className={styles.principleRow}>
              <span className={styles.principleNum}>03</span>
              <p className={styles.principleText}>
                <strong>Analyst in Control:</strong> The analyst reviews, edits, and makes final decisions.
                The copilot assists documentation but never makes unilateral decisions.
              </p>
            </div>
            <div className={styles.principleRow}>
              <span className={styles.principleNum}>04</span>
              <p className={styles.principleText}>
                <strong>Evidence-Bounded Q&amp;A:</strong> If question facts are not present in case evidence,
                the copilot responds: &ldquo;Insufficient evidence available for this question.&rdquo;
              </p>
            </div>
          </div>
        </RevealBlock>

        {/* Closing CTA */}
        <RevealBlock className={styles.ctaSection}>
          <div className={styles.ctaContent}>
            <h3 className={styles.ctaTitle}>Ready to investigate.</h3>
            <p className={styles.ctaText}>
              Sign in with your analyst credentials to inspect fraud rings, explore entity networks, and manage cases.
            </p>
          </div>
          <Button variant="primary" onClick={handleAuthAction}>
            {user ? 'Open dashboard' : 'Sign in'}
          </Button>
        </RevealBlock>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span>FraudTrace Financial Investigation Platform</span>
          <span>Risk scores are investigative signals, not legal or regulatory determinations.</span>
        </div>
      </footer>
    </div>
  );
};
