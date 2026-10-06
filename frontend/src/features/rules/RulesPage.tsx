import React, { useEffect, useState } from 'react';
import { fetchActiveRules, DetectorRules } from '../../api/analysisApi';
import { Badge } from '../../components/common/Badge';
import { StateView } from '../../components/common/StateView';
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
      {/* Header */}
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <div className={styles.titleWithBadge}>
            <h1 className={styles.title}>Detection &amp; Scoring Rules</h1>
            <Badge variant="neutral">{rules.ruleVersion}</Badge>
          </div>
          <p className={styles.subtitle}>
            Deterministic thresholds and category caps governing pattern detection and explainable risk scores.
          </p>
        </div>
      </div>

      {/* Account Risk Scoring Configuration */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Account Scoring Category Caps</h2>
          <span className={styles.cardSubtitle}>
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
      </div>

      {/* Fraud Ring Scoring Configuration */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Fraud Ring Scoring Category Caps</h2>
          <span className={styles.cardSubtitle}>
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
      </div>

      {/* Detector Thresholds */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Pattern Detector Thresholds</h2>
          <span className={styles.cardSubtitle}>
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
      </div>

      {/* Risk Tier Boundaries */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Risk Score Tier Boundaries</h2>
          <span className={styles.cardSubtitle}>
            Deterministic 0–100 score classification
          </span>
        </div>

        <div className={styles.capsGrid}>
          <div className={styles.capBox}>
            <span className={styles.capLabel}>Low</span>
            <div className={styles.capValue}>
              {rules.riskThresholds.low[0]} &ndash; {rules.riskThresholds.low[1]}
            </div>
            <span className={styles.capNote}>Routine monitoring</span>
          </div>
          <div className={styles.capBox}>
            <span className={styles.capLabel}>Medium</span>
            <div className={styles.capValue}>
              {rules.riskThresholds.medium[0]} &ndash; {rules.riskThresholds.medium[1]}
            </div>
            <span className={styles.capNote}>Standard review</span>
          </div>
          <div className={styles.capBox}>
            <span className={styles.capLabel}>High</span>
            <div className={styles.capValue}>
              {rules.riskThresholds.high[0]} &ndash; {rules.riskThresholds.high[1]}
            </div>
            <span className={styles.capNote}>Priority investigation</span>
          </div>
          <div className={styles.capBox}>
            <span className={styles.capLabel}>Critical</span>
            <div className={styles.capValue}>
              {rules.riskThresholds.critical[0]} &ndash; {rules.riskThresholds.critical[1]}
            </div>
            <span className={styles.capNote}>Immediate escalation</span>
          </div>
        </div>
      </div>
    </div>
  );
};
