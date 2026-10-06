import React, { useState } from 'react';
import {
  AIBriefItem,
  createAiBrief,
  updateAiBrief,
  askCaseQuestion,
  AnalystDecision,
} from '../../api/aiApi';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Icon } from '../../components/common/Icons';
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

  return (
    <div className={styles.container}>
      {/* Investigation Brief Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 className={styles.sectionTitle}>Investigation Brief</h2>
            {selectedBrief && (
              <Badge variant={selectedBrief.verificationStatus === 'VERIFIED' ? 'low' : 'medium'}>
                {selectedBrief.verificationStatus}
              </Badge>
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

        {briefError && (
          <div style={{ color: 'var(--sev-high-text)', backgroundColor: 'var(--sev-high-bg)', padding: '8px 12px', borderRadius: '2px', fontSize: '11px' }}>
            {briefError}
          </div>
        )}

        {selectedBrief ? (
          <div className={styles.briefCard}>
            <div className={styles.briefHeader}>
              <div className={styles.briefMeta}>
                <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                  Generated {new Date(selectedBrief.createdAt).toLocaleString()}
                </span>
                {selectedBrief.model && (
                  <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                    via {selectedBrief.model}
                  </span>
                )}
              </div>

              {/* Version selector if multiple briefs */}
              {investigationBriefs.length > 1 && (
                <div style={{ display: 'flex', gap: '4px' }}>
                  {investigationBriefs.map((b, i) => (
                    <button
                      key={b._id}
                      onClick={() => {
                        setActiveBriefId(b._id);
                        setIsEditing(false);
                      }}
                      style={{
                        padding: '2px 6px',
                        fontSize: '11px',
                        background: activeBriefId === b._id ? 'var(--primary)' : 'var(--surface)',
                        color: activeBriefId === b._id ? 'var(--surface)' : 'var(--text-2)',
                        border: '1px solid var(--border)',
                        borderRadius: '2px',
                        cursor: 'pointer',
                      }}
                    >
                      v{investigationBriefs.length - i}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Brief Text / Edit Area */}
            {isEditing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className={styles.editTextarea}
                  aria-label="Edit investigation brief"
                />
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                  <Button variant="secondary" compact onClick={() => setIsEditing(false)}>
                    <span>Cancel</span>
                  </Button>
                  <Button variant="primary" compact onClick={handleSaveEdit} disabled={savingEdit}>
                    <span>{savingEdit ? 'Saving...' : 'Save edit'}</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className={styles.briefContent}>
                {getBriefText(selectedBrief)}
              </div>
            )}

            {/* Evidence ID Chips */}
            {briefEvidenceTokens.length > 0 && (
              <div>
                <span style={{ fontSize: '10px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Cited Evidence IDs
                </span>
                <div className={styles.chipList}>
                  {briefEvidenceTokens.map((token, idx) => (
                    <span key={idx} className={styles.evidenceChip}>
                      {token}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Analyst Review & Decision Controls */}
            {!isEditing && (
              <div className={styles.decisionControls}>
                <Button
                  variant={selectedBrief.analystDecision === 'ACCEPTED' ? 'primary' : 'secondary'}
                  compact
                  onClick={() => handleDecision('ACCEPTED')}
                  disabled={savingEdit}
                >
                  <Icon name="check" size={12} />
                  <span>Accept</span>
                </Button>

                <Button
                  variant="secondary"
                  compact
                  onClick={() => {
                    setEditText(selectedBrief.editedText || getBriefText(selectedBrief));
                    setIsEditing(true);
                  }}
                  disabled={savingEdit}
                >
                  <Icon name="edit" size={12} />
                  <span>Edit</span>
                </Button>

                <Button
                  variant={selectedBrief.analystDecision === 'DISCARDED' ? 'primary' : 'secondary'}
                  compact
                  onClick={() => handleDecision('DISCARDED')}
                  disabled={savingEdit}
                >
                  <Icon name="trash" size={12} />
                  <span>Discard</span>
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-3)', fontSize: '12px', backgroundColor: 'var(--surface-2)', borderRadius: '2px', border: '1px solid var(--border)' }}>
            No investigation brief generated yet. Click &ldquo;Generate investigation brief&rdquo; to summarize case evidence.
          </div>
        )}
      </div>

      {/* Case Investigation Q&A Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Case Investigation Q&amp;A</h2>
        </div>

        <form onSubmit={handleAskQuestion} className={styles.qaForm}>
          <input
            type="text"
            placeholder="Ask a question about this case (e.g. What accounts share devices?)..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={askingQuestion}
            className={styles.qaInput}
            aria-label="Ask a question about this case"
          />
          <Button variant="primary" compact type="submit" disabled={askingQuestion || !question.trim()}>
            <Icon name="send" size={12} />
            <span>{askingQuestion ? 'Submitting...' : 'Ask'}</span>
          </Button>
        </form>

        {qaError && (
          <div style={{ color: 'var(--sev-high-text)', backgroundColor: 'var(--sev-high-bg)', padding: '8px 12px', borderRadius: '2px', fontSize: '11px' }}>
            {qaError}
          </div>
        )}

        {/* Q&A List */}
        {qaBriefs.length > 0 ? (
          <div className={styles.qaList}>
            {qaBriefs.map((qa) => {
              const isInsufficient =
                qa.structuredOutput?.confidence === 'INSUFFICIENT_EVIDENCE' ||
                qa.verificationStatus === 'FALLBACK';

              const qaEvidenceTokens = qa.structuredOutput?.evidenceIds || [];

              return (
                <div key={qa._id} className={styles.qaItem}>
                  <div className={styles.qaQuestion}>
                    Q: {qa.question || 'Case Question'}
                  </div>

                  <div className={styles.qaAnswer}>
                    {isInsufficient
                      ? 'Insufficient evidence available for this question.'
                      : qa.editedText || qa.structuredOutput?.answer || ''}
                  </div>

                  <div className={styles.qaAssessment}>
                    <span>
                      Evidence assessment: {isInsufficient ? 'Insufficient' : 'Grounded'}
                    </span>
                    <span>&bull;</span>
                    <span className="tabular-nums">
                      {new Date(qa.createdAt).toLocaleTimeString()}
                    </span>
                  </div>

                  {qaEvidenceTokens.length > 0 && !isInsufficient && (
                    <div className={styles.chipList}>
                      {qaEvidenceTokens.map((tok, idx) => (
                        <span key={idx} className={styles.evidenceChip}>
                          {tok}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-3)', fontSize: '12px' }}>
            No questions asked yet. Ask a specific case question to verify grounded facts.
          </div>
        )}
      </div>
    </div>
  );
};
