import React, { useState } from 'react';
import {
  Bot,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Edit3,
  Save,
  HelpCircle,
  Send,
  Hash,
  Database,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  AIBriefItem,
  createAiBrief,
  updateAiBrief,
  askCaseQuestion,
  AnalystDecision,
} from '../../api/aiApi';

interface AiCopilotTabProps {
  caseId: string;
  caseNumber: string;
  briefs: AIBriefItem[];
  onRefresh: () => Promise<void>;
}

export const AiCopilotTab: React.FC<AiCopilotTabProps> = ({
  caseId,
  caseNumber,
  briefs,
  onRefresh,
}) => {
  // Separate briefs vs Q&A items
  const investigationBriefs = briefs.filter((b) => b.kind === 'INVESTIGATION_BRIEF');
  const qaBriefs = briefs.filter((b) => b.kind === 'CASE_QA');

  const [activeBriefId, setActiveBriefId] = useState<string | null>(
    investigationBriefs.length > 0 ? investigationBriefs[0]._id : null
  );

  const selectedBrief =
    investigationBriefs.find((b) => b._id === activeBriefId) ||
    (investigationBriefs.length > 0 ? investigationBriefs[0] : null);

  // Brief Generation State
  const [generatingBrief, setGeneratingBrief] = useState<boolean>(false);
  const [briefError, setBriefError] = useState<string | null>(null);

  // Review / Edit State
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editText, setEditText] = useState<string>(selectedBrief?.editedText || '');
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  // Q&A State
  const [question, setQuestion] = useState<string>('');
  const [askingQuestion, setAskingQuestion] = useState<boolean>(false);
  const [qaError, setQaError] = useState<string | null>(null);

  // Evidence snapshot accordion
  const [showEvidenceSnapshot, setShowEvidenceSnapshot] = useState<boolean>(false);

  // Handle Generate Brief
  const handleGenerateBrief = async () => {
    try {
      setGeneratingBrief(true);
      setBriefError(null);
      const newBrief = await createAiBrief(caseId);
      await onRefresh();
      setActiveBriefId(newBrief._id);
    } catch (err: any) {
      setBriefError(err.error || 'Failed to generate investigation brief');
    } finally {
      setGeneratingBrief(false);
    }
  };

  // Handle Analyst Decision
  const handleDecision = async (decision: AnalystDecision) => {
    if (!selectedBrief) return;
    try {
      setSavingEdit(true);
      await updateAiBrief(selectedBrief._id, { analystDecision: decision });
      await onRefresh();
    } catch (err: any) {
      alert(err.error || 'Failed to update decision');
    } finally {
      setSavingEdit(false);
    }
  };

  // Handle Save Edited Text
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
    } catch (err: any) {
      alert(err.error || 'Failed to save analyst edit');
    } finally {
      setSavingEdit(false);
    }
  };

  // Handle Ask Question
  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    try {
      setAskingQuestion(true);
      setQaError(null);
      await askCaseQuestion(caseId, question.trim());
      setQuestion('');
      await onRefresh();
    } catch (err: any) {
      setQaError(err.error || 'Failed to query investigation copilot');
    } finally {
      setAskingQuestion(false);
    }
  };

  // Status Badge Helper
  const renderVerificationBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '0.72rem',
              fontWeight: 700,
              backgroundColor: 'rgba(0, 230, 118, 0.15)',
              color: '#00e676',
              border: '1px solid rgba(0, 230, 118, 0.3)',
            }}
          >
            <ShieldCheck size={12} /> Grounded & Verified
          </span>
        );
      case 'FALLBACK':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '0.72rem',
              fontWeight: 700,
              backgroundColor: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.3)',
            }}
          >
            <Database size={12} /> Deterministic Rule Fallback
          </span>
        );
      case 'PARTIALLY_VERIFIED':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '0.72rem',
              fontWeight: 700,
              backgroundColor: 'rgba(255, 171, 0, 0.15)',
              color: '#ffab00',
              border: '1px solid rgba(255, 171, 0, 0.3)',
            }}
          >
            <AlertTriangle size={12} /> Partially Verified
          </span>
        );
      default:
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '0.72rem',
              fontWeight: 700,
              backgroundColor: 'rgba(255, 77, 79, 0.15)',
              color: '#ff4d4f',
              border: '1px solid rgba(255, 77, 79, 0.3)',
            }}
          >
            <XCircle size={12} /> Unverified / Discrepancies
          </span>
        );
    }
  };

  const renderDecisionBadge = (decision: AnalystDecision) => {
    switch (decision) {
      case 'ACCEPTED':
        return (
          <span style={{ color: '#00e676', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={13} /> Accepted by Analyst
          </span>
        );
      case 'EDITED':
        return (
          <span style={{ color: '#38bdf8', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Edit3 size={13} /> Edited by Analyst
          </span>
        );
      case 'DISCARDED':
        return (
          <span style={{ color: '#ff4d4f', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <XCircle size={13} /> Discarded
          </span>
        );
      default:
        return (
          <span style={{ color: '#ffab00', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <HelpCircle size={13} /> Pending Review
          </span>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Copilot Header Card */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.2), rgba(112, 0, 255, 0.2))',
              border: '1px solid rgba(0, 240, 255, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-cyan)',
            }}
          >
            <Bot size={24} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              AI Investigation Copilot
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Evidence-grounded assistant for Case {caseNumber}. AI never makes final fraud decisions.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {investigationBriefs.length > 1 && (
            <select
              value={activeBriefId || ''}
              onChange={(e) => {
                setActiveBriefId(e.target.value);
                const b = investigationBriefs.find((item) => item._id === e.target.value);
                setEditText(b?.editedText || '');
                setIsEditing(false);
              }}
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 12px',
                fontSize: '0.8rem',
              }}
            >
              {investigationBriefs.map((b, idx) => (
                <option key={b._id} value={b._id}>
                  Brief #{investigationBriefs.length - idx} ({new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handleGenerateBrief}
            disabled={generatingBrief}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: 'linear-gradient(135deg, #00f0ff, #7000ff)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: generatingBrief ? 'not-allowed' : 'pointer',
              opacity: generatingBrief ? 0.7 : 1,
            }}
          >
            <Sparkles size={14} />
            {generatingBrief ? 'Generating Brief...' : selectedBrief ? 'Re-generate Brief' : 'Generate Investigation Brief'}
          </button>
        </div>
      </div>

      {briefError && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(255, 77, 79, 0.1)',
            border: '1px solid rgba(255, 77, 79, 0.3)',
            borderRadius: 'var(--radius-sm)',
            color: '#ff7875',
            fontSize: '0.82rem',
          }}
        >
          {briefError}
        </div>
      )}

      {/* Investigation Brief View */}
      {selectedBrief ? (
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {/* Brief Meta Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              paddingBottom: '16px',
              borderBottom: '1px solid var(--border-color)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {renderVerificationBadge(selectedBrief.verificationStatus)}
              <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                Model: <strong style={{ color: 'var(--text-primary)' }}>{selectedBrief.model}</strong> ({selectedBrief.promptVersion})
              </span>
              <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                Generated: {new Date(selectedBrief.createdAt).toLocaleString()}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '4px',
                  fontSize: '0.72rem',
                  fontFamily: 'monospace',
                  color: 'var(--text-secondary)',
                }}
                title={`Deterministic Evidence Hash: ${selectedBrief.evidenceHash}`}
              >
                <Hash size={11} /> {selectedBrief.evidenceHash.slice(0, 12)}...
              </div>

              <button
                onClick={() => setShowEvidenceSnapshot(!showEvidenceSnapshot)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  backgroundColor: 'transparent',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  fontSize: '0.74rem',
                  cursor: 'pointer',
                }}
              >
                <Layers size={12} />
                Snapshot {showEvidenceSnapshot ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            </div>
          </div>

          {/* Verification Errors Box (if any detected by backend) */}
          {selectedBrief.verificationErrors && selectedBrief.verificationErrors.length > 0 && (
            <div
              style={{
                backgroundColor: 'rgba(255, 77, 79, 0.08)',
                border: '1px solid rgba(255, 77, 79, 0.3)',
                borderRadius: 'var(--radius-sm)',
                padding: '14px',
                fontSize: '0.8rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ff4d4f', fontWeight: 700, marginBottom: '6px' }}>
                <AlertTriangle size={14} /> Verification Warnings Detected by Engine
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', color: '#ff7875' }}>
                {selectedBrief.verificationErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Collapsible Evidence Snapshot Inspector */}
          {showEvidenceSnapshot && (
            <div
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                padding: '14px',
                fontSize: '0.75rem',
              }}
            >
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                Canonical Evidence Catalog ({selectedBrief.evidenceSnapshot?.evidenceCatalog?.length || 0} items)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                {selectedBrief.evidenceSnapshot?.evidenceCatalog?.map((item: any) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      gap: '8px',
                      padding: '4px 6px',
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '4px',
                    }}
                  >
                    <code style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>[{item.id}]</code>
                    <span style={{ color: 'var(--text-secondary)' }}>{item.summary}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Executive Summary */}
          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: 700 }}>
              Executive Summary
            </h4>
            <p
              style={{
                margin: 0,
                fontSize: '0.84rem',
                lineHeight: 1.6,
                color: 'var(--text-secondary)',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                borderLeft: '3px solid var(--accent-cyan)',
              }}
            >
              {selectedBrief.structuredOutput?.executiveSummary || 'No summary available.'}
            </p>
          </div>

          {/* Structured Findings */}
          {selectedBrief.structuredOutput?.findings && selectedBrief.structuredOutput.findings.length > 0 && (
            <div>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                Structured Findings & Provenance Citations
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedBrief.structuredOutput.findings.map((f, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '10px 14px',
                      backgroundColor: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                        Finding #{idx + 1} • <span style={{ color: f.category === 'SUSPICIOUS_INDICATOR' ? '#ffab00' : 'var(--accent-cyan)' }}>{f.category}</span>
                      </span>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {f.evidenceIds?.map((eid) => (
                          <span
                            key={eid}
                            style={{
                              padding: '2px 6px',
                              borderRadius: '3px',
                              fontSize: '0.68rem',
                              fontFamily: 'monospace',
                              backgroundColor: 'rgba(0, 240, 255, 0.1)',
                              color: 'var(--accent-cyan)',
                              border: '1px solid rgba(0, 240, 255, 0.25)',
                            }}
                          >
                            {eid}
                          </span>
                        ))}
                      </div>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                      {f.claim}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suspicious Indicators & Entity Roles Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {/* Suspicious Indicators */}
            {selectedBrief.structuredOutput?.suspiciousIndicators && (
              <div
                style={{
                  padding: '14px',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffab00', marginBottom: '8px' }}>
                  Suspicious Indicators
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  {selectedBrief.structuredOutput.suspiciousIndicators.map((ind, i) => (
                    <li key={i} style={{ marginBottom: '4px' }}>{ind}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Entity Roles */}
            {selectedBrief.structuredOutput?.entityRoles && selectedBrief.structuredOutput.entityRoles.length > 0 && (
              <div
                style={{
                  padding: '14px',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '8px' }}>
                  Identified Entity Roles
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.78rem' }}>
                  {selectedBrief.structuredOutput.entityRoles.map((er, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                      <strong>{er.entityId}</strong>
                      <span style={{ color: 'var(--text-muted)' }}>{er.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Limitations and Recommendations */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {selectedBrief.structuredOutput?.limitations && (
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                <strong style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Uncertainties & Limitations:</strong>
                <ul style={{ margin: 0, paddingLeft: '16px' }}>
                  {selectedBrief.structuredOutput.limitations.map((lim, i) => (
                    <li key={i}>{lim}</li>
                  ))}
                </ul>
              </div>
            )}

            {selectedBrief.structuredOutput?.recommendations && (
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                <strong style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Analyst Recommendations:</strong>
                <ul style={{ margin: 0, paddingLeft: '16px' }}>
                  {selectedBrief.structuredOutput.recommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Analyst Review & Editing Action Area */}
          <div
            style={{
              paddingTop: '16px',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Analyst Review Status:</span>
                {renderDecisionBadge(selectedBrief.analystDecision)}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleDecision('ACCEPTED')}
                  disabled={savingEdit}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '4px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    backgroundColor: 'rgba(0, 230, 118, 0.15)',
                    color: '#00e676',
                    border: '1px solid rgba(0, 230, 118, 0.3)',
                    cursor: 'pointer',
                  }}
                >
                  Accept Brief
                </button>

                <button
                  onClick={() => {
                    setIsEditing(!isEditing);
                    if (!isEditing) {
                      setEditText(selectedBrief.editedText || selectedBrief.structuredOutput?.executiveSummary || '');
                    }
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '4px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    backgroundColor: 'rgba(56, 189, 248, 0.15)',
                    color: '#38bdf8',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    cursor: 'pointer',
                  }}
                >
                  <Edit3 size={12} style={{ marginRight: '4px', verticalAlign: '-1px' }} />
                  {isEditing ? 'Cancel Edit' : 'Edit Brief'}
                </button>

                <button
                  onClick={() => handleDecision('DISCARDED')}
                  disabled={savingEdit}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '4px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    backgroundColor: 'rgba(255, 77, 79, 0.15)',
                    color: '#ff4d4f',
                    border: '1px solid rgba(255, 77, 79, 0.3)',
                    cursor: 'pointer',
                  }}
                >
                  Discard
                </button>
              </div>
            </div>

            {/* Analyst Edit Input Box */}
            {isEditing && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Analyst Edited Summary (Preserves original AI provenance separately):
                </label>
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    padding: '10px',
                    fontSize: '0.82rem',
                    fontFamily: 'inherit',
                  }}
                  placeholder="Enter analyst-adjusted findings and conclusions..."
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    onClick={handleSaveEdit}
                    disabled={savingEdit}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      backgroundColor: 'var(--accent-cyan)',
                      color: '#070a0f',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <Save size={12} /> Save Analyst Version
                  </button>
                </div>
              </div>
            )}

            {/* Display persistent analyst-edited text if present */}
            {selectedBrief.editedText && !isEditing && (
              <div
                style={{
                  backgroundColor: 'rgba(56, 189, 248, 0.06)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 14px',
                  fontSize: '0.8rem',
                }}
              >
                <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#38bdf8', marginBottom: '4px' }}>
                  Analyst Approved & Edited Narrative:
                </div>
                <div style={{ color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  {selectedBrief.editedText}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px dashed var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '36px 20px',
            textAlign: 'center',
            color: 'var(--text-muted)',
          }}
        >
          <Bot size={36} style={{ margin: '0 auto 12px auto', opacity: 0.6 }} />
          <h4 style={{ margin: '0 0 6px 0', color: 'var(--text-secondary)' }}>No Investigation Brief Yet</h4>
          <p style={{ margin: '0 auto 16px auto', maxWidth: '420px', fontSize: '0.82rem' }}>
            Click &quot;Generate Investigation Brief&quot; above to synthesize a structured, grounded report from attached alerts,
            transactions, rings, and entities.
          </p>
        </div>
      )}

      {/* Grounded Case Q&A Section */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <HelpCircle size={18} color="var(--accent-cyan)" />
          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Ask Investigation Copilot
          </h4>
        </div>

        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Ask case-specific questions. The AI only responds using verified evidence from this case and will explicitly
          indicate when available evidence is insufficient.
        </p>

        {/* Question Form */}
        <form onSubmit={handleAskQuestion} style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g., What is the total flow volume in this case? Or why was ACC-101 flagged?"
            style={{
              flex: 1,
              backgroundColor: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              padding: '10px 14px',
              fontSize: '0.82rem',
            }}
          />
          <button
            type="submit"
            disabled={askingQuestion || !question.trim()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 18px',
              backgroundColor: 'var(--accent-cyan)',
              color: '#070a0f',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: askingQuestion || !question.trim() ? 'not-allowed' : 'pointer',
              opacity: askingQuestion || !question.trim() ? 0.6 : 1,
            }}
          >
            <Send size={14} />
            {askingQuestion ? 'Analyzing...' : 'Ask'}
          </button>
        </form>

        {qaError && (
          <div style={{ color: '#ff7875', fontSize: '0.8rem' }}>{qaError}</div>
        )}

        {/* Q&A History Cards */}
        {qaBriefs.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              Investigation Q&A History ({qaBriefs.length})
            </div>

            {qaBriefs.map((qa) => {
              const answerText = qa.structuredOutput?.answer || 'No answer generated.';
              const isInsufficient = qa.structuredOutput?.confidence === 'INSUFFICIENT_EVIDENCE';
              const citations = qa.structuredOutput?.evidenceIds || [];

              return (
                <div
                  key={qa._id}
                  style={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.84rem' }}>
                      Q: {qa.question}
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {new Date(qa.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: '0.82rem',
                      lineHeight: 1.5,
                      color: isInsufficient ? '#ffab00' : 'var(--text-secondary)',
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      padding: '8px 12px',
                      borderRadius: '4px',
                    }}
                  >
                    {answerText}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {citations.length > 0 ? (
                        citations.map((cid: string) => (
                          <span
                            key={cid}
                            style={{
                              padding: '2px 6px',
                              borderRadius: '3px',
                              fontSize: '0.68rem',
                              fontFamily: 'monospace',
                              backgroundColor: 'rgba(0, 240, 255, 0.1)',
                              color: 'var(--accent-cyan)',
                              border: '1px solid rgba(0, 240, 255, 0.25)',
                            }}
                          >
                            {cid}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          No citations (unsupported or insufficient evidence)
                        </span>
                      )}
                    </div>

                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        color: isInsufficient ? '#ffab00' : '#00e676',
                      }}
                    >
                      {isInsufficient ? 'INSUFFICIENT_EVIDENCE' : 'GROUNDED'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
