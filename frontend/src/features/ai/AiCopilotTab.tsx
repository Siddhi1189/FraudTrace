import React, { useState, useEffect } from 'react';
import {
  AIBriefItem,
  createAiBrief,
  fetchAiBrief,
  updateAiBrief,
  askCaseQuestion,
  AnalystDecision,
} from '../../api/aiApi';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Banner } from '../../components/Banner';
import { Icon } from '../../components/common/Icons';
import { formatDateTime } from '../../lib/format';
import styles from './AiCopilotTab.module.css';

interface AiCopilotTabProps {
  caseId: string;
  caseNumber: string;
  briefs: AIBriefItem[];
  onRefresh: () => Promise<void>;
}

export const AiCopilotTab: React.FC<AiCopilotTabProps> = ({
  caseId,
  briefs,
  onRefresh,
}) => {
  const investigationBriefs = briefs.filter((b) => b.kind === 'INVESTIGATION_BRIEF');
  const qaBriefs = briefs.filter((b) => b.kind === 'CASE_QA');

  const [activeBriefId, setActiveBriefId] = useState<string | null>(
    investigationBriefs.length > 0 ? investigationBriefs[0]._id : null
  );

  const selectedBrief =
    investigationBriefs.find((b) => b._id === activeBriefId) ||
    (investigationBriefs.length > 0 ? investigationBriefs[0] : null);

  // Full brief state (with evidenceSnapshot loaded from GET /api/ai/briefs/:id if needed)
  const [fullBrief, setFullBrief] = useState<AIBriefItem | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (selectedBrief?._id) {
      if (selectedBrief.evidenceSnapshot) {
        setFullBrief(selectedBrief);
      } else {
        fetchAiBrief(selectedBrief._id)
          .then((b) => {
            if (isMounted) setFullBrief(b);
          })
          .catch((err) => console.error('Failed to load brief snapshot:', err));
      }
    } else {
      setFullBrief(null);
    }
    return () => {
      isMounted = false;
    };
  }, [selectedBrief?._id, selectedBrief?.evidenceSnapshot]);

  // Brief Generation State
  const [generatingBrief, setGeneratingBrief] = useState(false);
  const [briefError, setBriefError] = useState<string | null>(null);

  // Review / Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Q&A State
  const [question, setQuestion] = useState('');
  const [askingQuestion, setAskingQuestion] = useState(false);
  const [qaError, setQaError] = useState<string | null>(null);

  const getBriefText = (b: AIBriefItem): string => {
    if (b.editedText) return b.editedText;
    if (b.structuredOutput?.executiveSummary) {
      let text = b.structuredOutput.executiveSummary;
      if (b.structuredOutput.findings && b.structuredOutput.findings.length > 0) {
        text +=
          '\n\nKey Findings:\n' +
          b.structuredOutput.findings
            .map((f) => `• ${f.claim} [${(f.evidenceIds || []).join(', ')}]`)
            .join('\n');
      }
      return text;
    }
    return b.structuredOutput?.answer || '';
  };

  const getBriefEvidenceIds = (b: AIBriefItem): string[] => {
    if (b.structuredOutput?.evidenceIds && b.structuredOutput.evidenceIds.length > 0) {
      return b.structuredOutput.evidenceIds;
    }
    if (b.structuredOutput?.findings) {
      return Array.from(new Set(b.structuredOutput.findings.flatMap((f) => f.evidenceIds || [])));
    }
    return [];
  };

  const handleGenerateBrief = async () => {
    try {
      setGeneratingBrief(true);
      setBriefError(null);
      const newBrief = await createAiBrief(caseId);
      await onRefresh();
      setActiveBriefId(newBrief._id);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'error' in err) {
        setBriefError((err as { error: string }).error);
      } else {
        setBriefError('Failed to generate investigation brief.');
      }
    } finally {
      setGeneratingBrief(false);
    }
  };

  const handleDecision = async (decision: AnalystDecision) => {
    if (!selectedBrief) return;
    try {
      setSavingEdit(true);
      await updateAiBrief(selectedBrief._id, { analystDecision: decision });
      await onRefresh();
    } catch (err: unknown) {
      console.error('Failed to update decision:', err);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedBrief) return;
    try {
      setSavingEdit(true);
      await updateAiBrief(selectedBrief._id, {
        analystDecision: 'EDITED',
        editedText: editText.trim(),
      });
      setIsEditing(false);
      await onRefresh();
    } catch (err: unknown) {
      console.error('Failed to save edit:', err);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    try {
      setAskingQuestion(true);
      setQaError(null);
      await askCaseQuestion(caseId, question.trim());
      setQuestion('');
      await onRefresh();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'error' in err) {
        setQaError((err as { error: string }).error);
      } else {
        setQaError('Failed to ask question.');
      }
    } finally {
      setAskingQuestion(false);
    }
  };

  const briefEvidenceTokens = selectedBrief ? getBriefEvidenceIds(selectedBrief) : [];
  const catalog = fullBrief?.evidenceSnapshot?.evidenceCatalog || [];

  return (
    <div className={styles.container}>
      {/* Investigation Brief Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <h2 className={styles.sectionTitle}>Investigation Brief</h2>
            {selectedBrief && (
              <div className={styles.badgeSlideIn}>
                <Badge
                  variant={
                    selectedBrief.verificationStatus === 'VERIFIED'
                      ? 'low'
                      : selectedBrief.verificationStatus === 'PARTIALLY_VERIFIED'
                        ? 'medium'
                        : 'high'
                  }
                >
                  {selectedBrief.verificationStatus}
                </Badge>
              </div>
            )}
          </div>

          <Button
            variant="primary"
            compact
            onClick={handleGenerateBrief}
            disabled={generatingBrief}
          >
            <Icon name="fileText" size={13} />
            <span>{generatingBrief ? 'Generating brief...' : 'Generate investigation brief'}</span>
          </Button>
        </div>

        {/* Regulatory disclaimer line */}
        <div className={styles.disclaimerBanner}>
          <span>Not a fraud decision. The analyst decides.</span>
          {selectedBrief?.analystDecision && (
            <Badge variant="neutral">
              Decision: {selectedBrief.analystDecision}
            </Badge>
          )}
        </div>

        {/* Fallback notification for unverified outcome */}
        {selectedBrief?.verificationStatus === 'UNVERIFIED' && (
          <Banner variant="warning" title="Deterministic Fallback Activated">
            The generated briefing failed post-generation factual grounding checks and was replaced by the rule-based deterministic evidence template.
          </Banner>
        )}

        {briefError && <Banner variant="error">{briefError}</Banner>}

        {selectedBrief ? (
          <div className={styles.briefCard}>
            <div className={styles.briefHeader}>
              <div className={styles.briefMeta}>
                <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                  Generated {formatDateTime(selectedBrief.createdAt)}
                </span>
                {selectedBrief.model && (
                  <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                    via {selectedBrief.model}
                  </span>
                )}
              </div>
            </div>

            {/* Brief Body or Edit Area */}
            {isEditing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className={styles.editTextarea}
                />
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <Button variant="primary" compact onClick={handleSaveEdit} disabled={savingEdit}>
                    <Icon name="check" size={12} />
                    <span>Save Edits</span>
                  </Button>
                  <Button variant="secondary" compact onClick={() => setIsEditing(false)} disabled={savingEdit}>
                    <span>Cancel</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className={styles.briefContent}>
                {getBriefText(selectedBrief)}
              </div>
            )}

            {/* Cited Evidence IDs */}
            {briefEvidenceTokens.length > 0 && (
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                  Cited Evidence Grounding:
                </span>
                <div className={styles.chipList}>
                  {briefEvidenceTokens.map((tok) => (
                    <span key={tok} className={styles.evidenceChip}>
                      {tok}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Full Evidence Snapshot Catalog */}
            {catalog.length > 0 && (
              <details style={{ marginTop: 'var(--space-2)' }}>
                <summary style={{ fontSize: '11px', color: 'var(--primary)', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>
                  Inspect Evidence Catalog ({catalog.length} items)
                </summary>
                <table className={styles.catalogTable}>
                  <thead>
                    <tr>
                      <th>Token</th>
                      <th>Type</th>
                      <th>Entity ID</th>
                      <th>Summary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catalog.map((item: any) => (
                      <tr key={item.token}>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{item.token}</td>
                        <td>{item.type}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{item.entityId}</td>
                        <td>{item.summary}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            )}

            {/* Analyst Governance Decision Controls */}
            <div className={styles.decisionControls}>
              <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>Analyst Governance:</span>
              <Button
                variant={selectedBrief.analystDecision === 'ACCEPTED' ? 'primary' : 'secondary'}
                compact
                onClick={() => handleDecision('ACCEPTED')}
                disabled={savingEdit}
              >
                Accept Brief
              </Button>
              <Button
                variant="secondary"
                compact
                onClick={() => {
                  setEditText(getBriefText(selectedBrief));
                  setIsEditing(true);
                }}
                disabled={savingEdit}
              >
                Edit Content
              </Button>
              <Button
                variant={selectedBrief.analystDecision === 'DISCARDED' ? 'primary' : 'secondary'}
                compact
                onClick={() => handleDecision('DISCARDED')}
                disabled={savingEdit}
              >
                Discard Brief
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-3)', fontSize: '12px' }}>
            No investigation brief has been generated for this case yet. Click &quot;Generate investigation brief&quot; to synthesize evidence.
          </div>
        )}
      </div>

      {/* Case Forensic Q&A Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Forensic Case Q&amp;A</h2>
        </div>

        <form onSubmit={handleAskQuestion} className={styles.qaForm}>
          <input
            type="text"
            placeholder="Ask question about topology, evidence, or amounts..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={askingQuestion}
            className={styles.qaInput}
            aria-label="Case inquiry question"
          />
          <Button variant="primary" compact type="submit" disabled={askingQuestion || !question.trim()}>
            <span>{askingQuestion ? 'Querying...' : 'Ask Copilot'}</span>
          </Button>
        </form>

        {qaError && <Banner variant="error">{qaError}</Banner>}

        <div className={styles.qaList}>
          {qaBriefs.map((qa) => (
            <div key={qa._id} className={styles.qaItem}>
              <div className={styles.qaQuestion}>Q: {qa.question}</div>
              <div className={styles.qaAnswer}>
                {qa.structuredOutput?.answer || 'No response recorded.'}
              </div>
              <div className={styles.qaAssessment}>
                <span>Assessed: {qa.structuredOutput?.confidence || 'GROUNDED'}</span>
                {qa.verificationStatus && (
                  <Badge variant={qa.verificationStatus === 'VERIFIED' ? 'low' : 'medium'}>
                    {qa.verificationStatus}
                  </Badge>
                )}
                <span>&bull; {formatDateTime(qa.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AiCopilotTab;
