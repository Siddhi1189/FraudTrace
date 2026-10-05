import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldAlert,
  Clock,
  User,
  CheckCircle,
  FileText,
  Plus,
  Send,
  History,
  ExternalLink,
  X,
  AlertTriangle,
  FolderOpen,
  Bot,
} from 'lucide-react';
import { AiCopilotTab } from '../features/cases/AiCopilotTab';
import {
  fetchCaseById,
  updateCase,
  addCaseNote,
  attachAlertToCase,
  CaseDetailResponse,
  CaseStatus,
  CaseDisposition,
} from '../api/casesApi';
import { fetchAlerts, AlertItem } from '../api/alertsApi';
import { CaseStatusBadge } from '../components/CaseStatusBadge';
import { CaseDispositionBadge } from '../components/CaseDispositionBadge';
import { SeverityBadge } from '../components/SeverityBadge';
import { RiskBadge } from '../components/RiskBadge';

export const CaseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<CaseDetailResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<'alerts' | 'notes' | 'copilot' | 'audit'>('alerts');

  // New Note
  const [newNoteContent, setNewNoteContent] = useState<string>('');
  const [submittingNote, setSubmittingNote] = useState<boolean>(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  // Close Case Modal
  const [showCloseModal, setShowCloseModal] = useState<boolean>(false);
  const [closeDisposition, setCloseDisposition] = useState<CaseDisposition>('CONFIRMED_FRAUD');
  const [closeNote, setCloseNote] = useState<string>('');
  const [closing, setClosing] = useState<boolean>(false);

  // Attach Alert Modal
  const [showAttachModal, setShowAttachModal] = useState<boolean>(false);
  const [allAlerts, setAllAlerts] = useState<AlertItem[]>([]);
  const [attachingAlertId, setAttachingAlertId] = useState<string | null>(null);
  const [attachError, setAttachError] = useState<string | null>(null);

  const loadCase = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetchCaseById(id);
      setData(res);
    } catch (err: any) {
      setError(err.error || 'Failed to load case');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCase();
  }, [id]);

  const handleStatusChange = async (newStatus: CaseStatus) => {
    if (!id) return;
    if (newStatus === 'CLOSED') {
      setShowCloseModal(true);
      return;
    }

    try {
      await updateCase(id, { status: newStatus });
      await loadCase();
    } catch (err: any) {
      alert(err.error || 'Failed to update status');
    }
  };

  const handleCloseCaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      setClosing(true);
      if (closeNote.trim()) {
        await addCaseNote(id, `Case Closure Note: ${closeNote.trim()}`);
      }
      await updateCase(id, {
        status: 'CLOSED',
        disposition: closeDisposition,
      });
      setShowCloseModal(false);
      await loadCase();
    } catch (err: any) {
      alert(err.error || 'Failed to close case');
    } finally {
      setClosing(false);
    }
  };

  const handleReopenCase = async () => {
    if (!id) return;
    if (window.confirm('Reopen this investigation case? Status will be changed to INVESTIGATING.')) {
      try {
        await updateCase(id, { status: 'INVESTIGATING' });
        await loadCase();
      } catch (err: any) {
        alert(err.error || 'Failed to reopen case');
      }
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newNoteContent.trim()) return;

    try {
      setSubmittingNote(true);
      setNoteError(null);
      await addCaseNote(id, newNoteContent.trim());
      setNewNoteContent('');
      await loadCase();
      setActiveTab('notes');
    } catch (err: any) {
      setNoteError(err.error || 'Failed to add note');
    } finally {
      setSubmittingNote(false);
    }
  };

  const openAttachModal = async () => {
    setShowAttachModal(true);
    setAttachError(null);
    try {
      const res = await fetchAlerts();
      setAllAlerts(res.alerts || []);
    } catch (err: any) {
      setAttachError(err.error || 'Failed to load available alerts');
    }
  };

  const handleAttachAlert = async (alertId: string) => {
    if (!id) return;
    try {
      setAttachingAlertId(alertId);
      setAttachError(null);
      await attachAlertToCase(id, alertId);
      await loadCase();
      setShowAttachModal(false);
    } catch (err: any) {
      setAttachError(err.error || 'Failed to attach alert');
    } finally {
      setAttachingAlertId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '80px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading investigation case workspace...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        style={{
          padding: '30px',
          backgroundColor: 'rgba(255, 77, 79, 0.1)',
          border: '1px solid rgba(255, 77, 79, 0.3)',
          borderRadius: 'var(--radius-md)',
          maxWidth: '480px',
          margin: '40px auto',
          textAlign: 'center',
          color: '#ff7875',
        }}
      >
        <AlertTriangle size={32} style={{ margin: '0 auto 10px auto' }} />
        <p style={{ fontWeight: 600 }}>{error || 'Case not found'}</p>
        <button
          onClick={() => navigate('/cases')}
          style={{
            marginTop: '16px',
            padding: '8px 16px',
            backgroundColor: 'var(--bg-surface-elevated)',
            color: '#fff',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.82rem',
            cursor: 'pointer',
          }}
        >
          Back to Cases
        </button>
      </div>
    );
  }

  const { case: c, alerts, notes, events, briefs = [] } = data;
  const attachedAlertIds = new Set(alerts.map((a) => a._id));
  const unattachedAlerts = allAlerts.filter((a) => !attachedAlertIds.has(a._id));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Back button */}
      <div>
        <Link
          to="/cases"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.82rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={14} /> Back to Cases
        </Link>
      </div>

      {/* Main Case Header Card */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: 'var(--accent-cyan)',
                  backgroundColor: 'rgba(0, 210, 255, 0.12)',
                  border: '1px solid rgba(0, 210, 255, 0.25)',
                  padding: '3px 10px',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                {c.caseNumber}
              </span>
              <CaseStatusBadge status={c.status} />
              <CaseDispositionBadge disposition={c.disposition} />
            </div>

            <h1 style={{ fontSize: '1.65rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
              {c.title}
            </h1>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {c.status === 'OPEN' && (
              <button
                onClick={() => handleStatusChange('INVESTIGATING')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  backgroundColor: 'rgba(255, 171, 0, 0.2)',
                  color: '#ffab00',
                  border: '1px solid rgba(255, 171, 0, 0.4)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <Clock size={14} />
                Start Investigation
              </button>
            )}

            {c.status === 'INVESTIGATING' && (
              <>
                <button
                  onClick={() => handleStatusChange('OPEN')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <FolderOpen size={14} />
                  Mark Open
                </button>
                <button
                  onClick={() => setShowCloseModal(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    backgroundColor: 'rgba(0, 230, 118, 0.15)',
                    color: '#00e676',
                    border: '1px solid rgba(0, 230, 118, 0.4)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <CheckCircle size={14} />
                  Close Case
                </button>
              </>
            )}

            {c.status === 'CLOSED' && (
              <button
                onClick={handleReopenCase}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <History size={14} />
                Reopen Case
              </button>
            )}

            <button
              onClick={openAttachModal}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                background: 'var(--accent-gradient)',
                color: '#070a0f',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Plus size={14} />
              Attach Alert
            </button>
          </div>
        </div>

        {/* Metadata Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '14px',
            paddingTop: '16px',
            borderTop: '1px solid var(--border-color)',
            fontSize: '0.8rem',
          }}
        >
          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.74rem', marginBottom: '3px' }}>Created By</span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={13} color="var(--text-muted)" />
              {c.createdBy?.name || 'Unknown'} ({c.createdBy?.role || 'ANALYST'})
            </span>
          </div>

          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.74rem', marginBottom: '3px' }}>Created Date</span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              {new Date(c.createdAt).toLocaleDateString()} {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.74rem', marginBottom: '3px' }}>Closure Date</span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              {c.closedAt
                ? `${new Date(c.closedAt).toLocaleDateString()} ${new Date(c.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : 'Active / Not Closed'}
            </span>
          </div>

          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.74rem', marginBottom: '3px' }}>Attached Alerts</span>
            <span style={{ fontWeight: 600, color: '#ffab00' }}>
              {alerts.length} alert{alerts.length === 1 ? '' : 's'} linked
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '20px' }}>
        {[
          { key: 'alerts', label: `Attached Alerts (${alerts.length})`, icon: ShieldAlert },
          { key: 'notes', label: `Investigation Notes (${notes.length})`, icon: FileText },
          { key: 'copilot', label: `AI Copilot (${briefs.length})`, icon: Bot },
          { key: 'audit', label: `Audit Trail (${events.length})`, icon: History },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                paddingBottom: '12px',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                borderBottom: isActive ? '2px solid var(--accent-cyan)' : '2px solid transparent',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={15} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Attached Alerts */}
      {activeTab === 'alerts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Linked Fraud Evidence & Detector Findings
            </h2>
            <button
              onClick={openAttachModal}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Plus size={13} />
              Attach Another Alert
            </button>
          </div>

          {alerts.length === 0 ? (
            <div
              style={{
                padding: '50px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                textAlign: 'center',
                color: 'var(--text-muted)',
              }}
            >
              <ShieldAlert size={36} color="var(--text-muted)" style={{ margin: '0 auto 10px auto', opacity: 0.5 }} />
              <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>No alerts attached to this case</p>
              <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                Attach relevant alerts to aggregate evidence and transaction provenance.
              </p>
              <button
                onClick={openAttachModal}
                style={{
                  marginTop: '14px',
                  padding: '8px 16px',
                  background: 'var(--accent-gradient)',
                  color: '#070a0f',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Attach Alert Now
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {alerts.map((al) => (
                <div
                  key={al._id}
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <SeverityBadge severity={al.severity} />
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.84rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                        {al.pattern}
                      </span>
                      <RiskBadge score={al.score} size="sm" />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {al.ringId && (
                        <button
                          onClick={() => {
                            const rId = typeof al.ringId === 'object' && al.ringId !== null ? al.ringId._id : al.ringId;
                            navigate(`/rings/${rId}`);
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 10px',
                            backgroundColor: 'rgba(0, 210, 255, 0.1)',
                            color: 'var(--accent-cyan)',
                            border: '1px solid rgba(0, 210, 255, 0.25)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.76rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          View Fraud Ring <ExternalLink size={12} />
                        </button>
                      )}
                      <button
                        onClick={() => navigate('/alerts')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '4px 10px',
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.76rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Inspect in Queue <ExternalLink size={12} />
                      </button>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    {al.evidence?.summary || 'No summary available for this alert.'}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    <span>Fingerprint: <code style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{al.fingerprint}</code></span>
                    {al.evidence?.transactions && (
                      <span>Transactions: <strong style={{ color: '#fff' }}>{al.evidence.transactions.length}</strong></span>
                    )}
                    {al.attachedAt && (
                      <span>Attached: {new Date(al.attachedAt).toLocaleTimeString()}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Investigation Notes */}
      {activeTab === 'notes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Analyst Investigation Notes
            </h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{notes.length} note{notes.length === 1 ? '' : 's'} recorded</span>
          </div>

          {/* New Note Composer */}
          <form
            onSubmit={handleAddNote}
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <label style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Add Investigation Note
            </label>
            <textarea
              rows={3}
              placeholder="Record findings, interview notes, corroborating documents, or merchant verifications..."
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                padding: '10px 14px',
                fontSize: '0.84rem',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
            {noteError && (
              <p style={{ fontSize: '0.8rem', color: 'var(--danger)' }}>{noteError}</p>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={submittingNote || !newNoteContent.trim()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 18px',
                  background: 'var(--accent-gradient)',
                  color: '#070a0f',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  opacity: submittingNote || !newNoteContent.trim() ? 0.5 : 1,
                }}
              >
                <Send size={13} />
                {submittingNote ? 'Posting...' : 'Post Note'}
              </button>
            </div>
          </form>

          {/* Notes Thread */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {notes.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No notes posted yet. Use the composer above to add the first investigation note.
              </div>
            ) : (
              notes.map((n) => (
                <div
                  key={n._id}
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: 600, color: '#fff' }}>{n.authorId?.name || 'Analyst'}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>({n.authorId?.role || 'ANALYST'})</span>
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                      {new Date(n.createdAt).toLocaleDateString()} {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                    {n.content}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab: AI Investigation Copilot */}
      {activeTab === 'copilot' && (
        <AiCopilotTab
          caseId={c._id}
          caseNumber={c.caseNumber}
          briefs={briefs}
          onRefresh={loadCase}
        />
      )}

      {/* Tab 3: Audit Trail */}
      {activeTab === 'audit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Immutable Case Audit Log
            </h2>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Lifecycle events recorded in MongoDB</span>
          </div>

          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
            }}
          >
            {events.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No audit events recorded for this case.
              </div>
            ) : (
              events.map((ev) => (
                <div
                  key={ev._id}
                  style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '14px',
                  }}
                >
                  <div
                    style={{
                      padding: '8px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'rgba(0, 210, 255, 0.1)',
                      color: 'var(--accent-cyan)',
                      marginTop: '2px',
                    }}
                  >
                    <History size={15} />
                  </div>

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.82rem', color: '#fff' }}>
                        {ev.eventType}
                      </span>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        {new Date(ev.createdAt).toLocaleDateString()} {new Date(ev.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>Action by:</span>
                      <strong style={{ color: '#fff' }}>{ev.createdBy?.name || 'System'}</strong>
                      {ev.createdBy?.role && (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            color: 'var(--text-muted)',
                          }}
                        >
                          {ev.createdBy.role}
                        </span>
                      )}
                    </div>

                    {ev.metadata && Object.keys(ev.metadata).length > 0 && (
                      <div
                        style={{
                          marginTop: '6px',
                          padding: '8px 12px',
                          backgroundColor: 'var(--bg-surface-elevated)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-color)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.76rem',
                          color: 'var(--accent-cyan)',
                        }}
                      >
                        {JSON.stringify(ev.metadata)}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Close Case Modal */}
      {showCloseModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            backgroundColor: 'rgba(5, 7, 12, 0.85)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              maxWidth: '480px',
              width: '100%',
              padding: '24px',
              boxShadow: 'var(--shadow-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={20} color="#00e676" />
                Close Investigation Case
              </h3>
              <button
                onClick={() => setShowCloseModal(false)}
                style={{ backgroundColor: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCloseCaseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Final Investigation Disposition <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <select
                  value={closeDisposition}
                  onChange={(e) => setCloseDisposition(e.target.value as CaseDisposition)}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    padding: '9px 12px',
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                  }}
                >
                  <option value="CONFIRMED_FRAUD">CONFIRMED_FRAUD (Fraud pattern validated)</option>
                  <option value="FALSE_POSITIVE">FALSE_POSITIVE (Legitimate activity)</option>
                  <option value="INCONCLUSIVE">INCONCLUSIVE (Insufficient evidence)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Closure Summary / Note (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Summarize the evidence and rationale for this final disposition..."
                  value={closeNote}
                  onChange={(e) => setCloseNote(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    padding: '9px 12px',
                    fontSize: '0.84rem',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                <button
                  type="button"
                  onClick={() => setShowCloseModal(false)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    color: 'var(--text-secondary)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={closing}
                  style={{
                    padding: '8px 18px',
                    backgroundColor: 'rgba(0, 230, 118, 0.2)',
                    color: '#00e676',
                    border: '1px solid rgba(0, 230, 118, 0.4)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    opacity: closing ? 0.6 : 1,
                  }}
                >
                  {closing ? 'Closing...' : 'Confirm Closure'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attach Alert Modal */}
      {showAttachModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            backgroundColor: 'rgba(5, 7, 12, 0.85)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              maxWidth: '620px',
              width: '100%',
              maxHeight: '85vh',
              padding: '24px',
              boxShadow: 'var(--shadow-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={20} color="var(--accent-cyan)" />
                Attach Alert to Case {c.caseNumber}
              </h3>
              <button
                onClick={() => setShowAttachModal(false)}
                style={{ backgroundColor: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {attachError && (
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: 'rgba(255, 77, 79, 0.12)',
                  border: '1px solid rgba(255, 77, 79, 0.35)',
                  borderRadius: 'var(--radius-sm)',
                  color: '#ff7875',
                  fontSize: '0.8rem',
                }}
              >
                {attachError}
              </div>
            )}

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
              {unattachedAlerts.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                  All current system alerts are already attached to this case.
                </div>
              ) : (
                unattachedAlerts.map((al) => (
                  <div
                    key={al._id}
                    style={{
                      padding: '12px',
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <SeverityBadge severity={al.severity} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 600, color: '#fff' }}>
                          {al.pattern}
                        </span>
                        <RiskBadge score={al.score} size="sm" />
                      </div>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '420px' }}>
                        {al.evidence?.summary || al.fingerprint}
                      </p>
                    </div>

                    <button
                      onClick={() => handleAttachAlert(al._id)}
                      disabled={attachingAlertId === al._id}
                      style={{
                        padding: '6px 12px',
                        background: 'var(--accent-gradient)',
                        color: '#070a0f',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        opacity: attachingAlertId === al._id ? 0.6 : 1,
                      }}
                    >
                      {attachingAlertId === al._id ? 'Attaching...' : 'Attach'}
                    </button>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
              <button
                type="button"
                onClick={() => setShowAttachModal(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  color: 'var(--text-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
