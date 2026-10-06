import React, { useEffect, useState } from 'react';
import { fetchActiveRules, DetectorRules } from '../../api/analysisApi';
import { Badge } from '../../components/common/Badge';
import { StateView } from '../../components/common/StateView';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import styles from './RulesPage.module.css';

export const RulesPage: React.FC = () => {
  const [rules, setRules] = useState<DetectorRules | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRules() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetchActiveRules();
        setRules(res);
      } catch (err: unknown) {
        console.error('Failed to load rules:', err);
        setError('Unable to load detector rules configuration.');
      } finally {
        setLoading(false);
      }
    }
    loadRules();
  }, []);

  if (loading) {
    return <StateView type="loading" title="Loading detector engine rules..." />;
  }

  if (error || !rules) {
    return (
      <StateView
        type="error"
        title="Rules configuration error"
        description={error || 'Unable to retrieve active detector rules from engine.'}
      />
    );
  }

  return (
    <div className={styles.container}>
      <PageHeader
        kicker="08 — RULES & POLICIES"
        title="Detection & Scoring Rules"
        subtitle="Deterministic thresholds and category caps governing pattern detection and explainable risk scores."
        actions={<Badge variant="neutral">{rules.ruleVersion}</Badge>}
      />

      {/* Account Risk Scoring Configuration */}
      <Card variant="default">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            Account Scoring Category Caps
          </h2>
          <span className={styles.sectionSub}>
            {rules.scoringWeights.account.explanation}
          </span>
        </div>

        <div className={styles.capsGrid}>
          {Object.entries(rules.scoringWeights.account.categoryCaps).map(([key, cap]) => (
            <div key={key} className={styles.capBox}>
              <span className={styles.capLabel}>
                {key.replace(/([A-Z])/g, ' $1')}
              </span>
              <div className={styles.capValue}>{cap} pts</div>
              <span className={styles.capNote}>Max category points</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Fraud Ring Scoring Configuration */}
      <Card variant="default">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            Fraud Ring Scoring Category Caps
          </h2>
          <span className={styles.sectionSub}>
            {rules.scoringWeights.ring.explanation}
          </span>
        </div>

        <div className={styles.capsGrid}>
          {Object.entries(rules.scoringWeights.ring.categoryCaps).map(([key, cap]) => (
            <div key={key} className={styles.capBox}>
              <span className={styles.capLabel}>
                {key.replace(/([A-Z])/g, ' $1')}
              </span>
              <div className={styles.capValue}>{cap} pts</div>
              <span className={styles.capNote}>Max category points</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Detector Thresholds */}
      <Card variant="default">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            Pattern Detector Thresholds
          </h2>
          <span className={styles.sectionSub}>
            Engine thresholds triggering structural fraud alerts
          </span>
        </div>

        <div className={styles.thresholdsGrid}>
          {Object.entries(rules.detectorThresholds).map(([detectorName, config]) => (
            <div key={detectorName} className={styles.thresholdCard}>
              <div className={styles.thresholdHeader}>
                {detectorName.replace(/_/g, ' ')}
              </div>
              <div className={styles.thresholdRows}>
                {Object.entries(config as Record<string, unknown>).map(([k, v]) => (
                  <div key={k} className={styles.thresholdRow}>
                    <span className={styles.thresholdKey}>{k}</span>
                    <span className={styles.thresholdVal}>{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Risk Tier Boundaries */}
      <Card variant="default">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            Risk Score Tier Boundaries
          </h2>
          <span className={styles.sectionSub}>
            Deterministic 0–100 score classification
          </span>
        </div>

        <div className={styles.capsGrid}>
          <div className={styles.capBox}>
            <span className={styles.capLabel}>Critical Risk</span>
            <div className={`${styles.capValue} ${styles.valCritical}`}>85–100</div>
            <span className={styles.capNote}>Immediate investigation mandatory</span>
          </div>
          <div className={styles.capBox}>
            <span className={styles.capLabel}>High Risk</span>
            <div className={`${styles.capValue} ${styles.valHigh}`}>70–84</div>
            <span className={styles.capNote}>High priority review queue</span>
          </div>
          <div className={styles.capBox}>
            <span className={styles.capLabel}>Medium Risk</span>
            <div className={`${styles.capValue} ${styles.valMedium}`}>40–69</div>
            <span className={styles.capNote}>Standard monitoring queue</span>
          </div>
          <div className={styles.capBox}>
            <span className={styles.capLabel}>Low Risk</span>
            <div className={`${styles.capValue} ${styles.valLow}`}>0–39</div>
            <span className={styles.capNote}>Passive ledger observation</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default RulesPage;
