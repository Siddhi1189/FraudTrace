import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  fetchCaseById,
  updateCase,
  addCaseNote,
  attachAlertToCase,
  CaseDetailResponse,
  CaseStatus,
  CaseDisposition,
  AttachedAlertItem,
} from '../api/casesApi';
import { fetchAlerts, AlertItem } from '../api/alertsApi';
import { CaseStatusBadge } from '../components/CaseStatusBadge';
import { CaseDispositionBadge } from '../components/CaseDispositionBadge';
import { SeverityBadge } from '../components/SeverityBadge';
import { RiskBadge } from '../components/RiskBadge';
import { Button } from '../components/common/Button';
import { Table, Column } from '../components/common/Table';
import { Tabs } from '../components/common/Tabs';
import { StateView } from '../components/common/StateView';
import { Icon } from '../components/common/Icons';
import { AiCopilotTab } from '../features/cases/AiCopilotTab';
import styles from './CaseDetailPage.module.css';

export const CaseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<CaseDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tabs: Evidence, Notes, Audit trail, Investigation brief
  const [activeTab, setActiveTab] = useState('evidence');

  // New Note
  const [newNoteContent, setNewNoteContent] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  // Close Case Modal
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeDisposition, setCloseDisposition] = useState<CaseDisposition>('CONFIRMED_FRAUD');
  const [closeNote, setCloseNote] = useState('');
  const [closing, setClosing] = useState(false);

  // Attach Alert Modal
  const [showAttachModal, setShowAttachModal] = useState(false);
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
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'error' in err) {
        setError((err as { error: string }).error);
      } else {
        setError('Failed to load case workspace.');
      }
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
    } catch (err: unknown) {
      console.error('Failed to update status:', err);
    }
  };

  const handleCloseCaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      setClosing(true);
      await updateCase(id, {
        status: 'CLOSED',
        disposition: closeDisposition,
      });

      if (closeNote.trim()) {
        await addCaseNote(id, `Case closed with disposition ${closeDisposition}. Note: ${closeNote.trim()}`);
      }

      setShowCloseModal(false);
      await loadCase();
    } catch (err: unknown) {
      console.error('Failed to close case:', err);
    } finally {
      setClosing(false);
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
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'error' in err) {
        setNoteError((err as { error: string }).error);
      } else {
        setNoteError('Failed to record note.');
      }
    } finally {
      setSubmittingNote(false);
    }
  };

  const openAttachModal = async () => {
    setShowAttachModal(true);
    setAttachingAlertId(null);
    setAttachError(null);
    try {
      const res = await fetchAlerts();
      // Filter out alerts already attached
      const currentAttachedIds = new Set((data?.alerts || []).map((a) => a._id));
      setAllAlerts((res.alerts || []).filter((a) => !currentAttachedIds.has(a._id)));
    } catch {
      // Non-fatal
    }
  };

  const handleAttachSubmit = async (alertId: string) => {
    if (!id) return;
    try {
      setAttachingAlertId(alertId);
      setAttachError(null);
      await attachAlertToCase(id, alertId);
      setShowAttachModal(false);
      await loadCase();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'error' in err) {
        setAttachError((err as { error: string }).error);
      } else {
        setAttachError('Failed to attach alert.');
      }
    } finally {
      setAttachingAlertId(null);
    }
  };

  const alertColumns: Column<AttachedAlertItem>[] = [
    {
      key: 'pattern',
      title: 'Pattern',
      render: (a) => (
        <span style={{ fontWeight: 600, color: 'var(--text)' }}>
          {a.pattern.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      key: 'severity',
      title: 'Severity',
      width: '90px',
      render: (a) => <SeverityBadge severity={a.severity} />,
    },
    {
      key: 'score',
      title: 'Score',
      width: '70px',
      render: (a) => <RiskBadge score={a.score} />,
    },
    {
      key: 'summary',
      title: 'Evidence Summary',
      render: (a) => (
        <span style={{ fontSize: '11px', color: 'var(--text-2)' }}>
          {a.evidence?.summary || a.fingerprint.slice(0, 24)}
        </span>
      ),
    },
    {
      key: 'attachedAt',
      title: 'Attached Date',
      width: '120px',
      render: (a) => (
        <span className="tabular-nums" style={{ color: 'var(--text-3)' }}>
          {a.attachedAt ? new Date(a.attachedAt).toLocaleDateString() : '-'}
        </span>
      ),
    },
    {
      key: 'actions',
      title: '',
      width: '70px',
      align: 'right',
      render: () => (
        <Button
          variant="ghost"
          compact
          onClick={(e) => {
            e.stopPropagation();
            navigate('/alerts');
          }}
          aria-label="View alert queue"
        >
          <span>View</span>
        </Button>
      ),
    },
  ];

  if (loading && !data) {
    return <StateView type="loading" title="Loading case investigation workspace..." />;
  }

  if (error || !data) {
    return (
      <StateView
        type="error"
        title="Case not found"
        description={error || 'The requested case could not be located.'}
        onRetry={() => navigate('/cases')}
      />
    );
  }

  const currentCase = data.case;
  const isClosed = currentCase.status === 'CLOSED';

  const tabs = [
    { key: 'evidence', label: `Evidence (${data.alerts?.length || 0})` },
    { key: 'notes', label: `Notes (${data.notes?.length || 0})` },
    { key: 'audit', label: `Audit trail (${data.events?.length || 0})` },
    { key: 'brief', label: 'Investigation brief' },
  ];

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <div className={styles.breadcrumbs}>
            <button className={styles.backBtn} onClick={() => navigate('/cases')}>
              <Icon name="arrowLeft" size={12} />
              <span>All Cases</span>
            </button>
            <span>/</span>
            <span>{currentCase.caseNumber}</span>
          </div>

          <div className={styles.titleWithBadges}>
            <span className={styles.caseNumber}>{currentCase.caseNumber}</span>
            <h1 className={styles.title}>{currentCase.title}</h1>
            <CaseStatusBadge status={currentCase.status} />
            <CaseDispositionBadge disposition={currentCase.disposition} />
          </div>
        </div>

        <div className={styles.actionsArea}>
          {!isClosed ? (
            <>
              {currentCase.status === 'OPEN' && (
                <Button
                  variant="secondary"
                  compact
                  onClick={() => handleStatusChange('INVESTIGATING')}
                >
                  <span>Start investigation</span>
                </Button>
              )}
              <Button
                variant="primary"
                compact
                onClick={() => setShowCloseModal(true)}
              >
                <span>Close case</span>
              </Button>
            </>
          ) : (
            <Button
              variant="secondary"
              compact
              onClick={() => handleStatusChange('INVESTIGATING')}
            >
              <span>Reopen case</span>
            </Button>
          )}

          <Button variant="secondary" compact onClick={openAttachModal} disabled={isClosed}>
            <Icon name="plus" size={12} />
            <span>Attach alert</span>
          </Button>
        </div>
      </div>

      {/* Meta Grid */}
      <div className={styles.metaGrid}>
        <div className={styles.metaBox}>
          <span className={styles.metaLabel}>Investigator</span>
          <span className={styles.metaValue}>{currentCase.createdBy?.name || 'Analyst'}</span>
        </div>
        <div className={styles.metaBox}>
          <span className={styles.metaLabel}>Created Date</span>
          <span className="tabular-nums" style={{ color: 'var(--text-2)' }}>
            {new Date(currentCase.createdAt).toLocaleDateString()}
          </span>
        </div>
        <div className={styles.metaBox}>
          <span className={styles.metaLabel}>Attached Alerts</span>
          <span className="tabular-nums" style={{ fontSize: '15px', fontWeight: 700 }}>
            {data.alerts?.length || 0}
          </span>
        </div>
        <div className={styles.metaBox}>
          <span className={styles.metaLabel}>Investigation Status</span>
          <span className={styles.metaValue}>{currentCase.status}</span>
        </div>
      </div>

      {/* Workspace Navigation Tabs */}
      <div className={styles.card}>
        <Tabs tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />

        {/* Tab 1: Evidence */}
        {activeTab === 'evidence' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
                Attached Alert Evidence
              </h2>
              <Button variant="secondary" compact onClick={openAttachModal} disabled={isClosed}>
                <Icon name="plus" size={12} />
                <span>Attach alert</span>
              </Button>
            </div>

            <Table
              columns={alertColumns}
              data={data.alerts || []}
              keyExtractor={(a) => a._id}
              emptyMessage="No alerts attached to this case yet. Click 'Attach alert' to add evidence."
            />
          </div>
        )}

        {/* Tab 2: Notes */}
        {activeTab === 'notes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className={styles.notesList}>
              {data.notes && data.notes.length > 0 ? (
                data.notes.map((n) => (
                  <div key={n._id} className={styles.noteItem}>
                    <div className={styles.noteHeader}>
                      <span className={styles.noteAuthor}>{n.authorId?.name || 'Investigator'}</span>
                      <span className={styles.noteDate}>
                        {new Date(n.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className={styles.noteContent}>{n.content}</div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-3)', fontSize: '12px' }}>
                  No case notes logged. Enter an investigation note below.
                </div>
              )}
            </div>

            {!isClosed && (
              <form onSubmit={handleAddNote} className={styles.addNoteBox}>
                <label htmlFor="newNote" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text)' }}>
                  Add Investigation Note
                </label>
                <textarea
                  id="newNote"
                  placeholder="Record evidence observation, hypothesis, or interview log..."
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  className={styles.textarea}
                  disabled={submittingNote}
                />
                {noteError && (
                  <div style={{ color: 'var(--sev-high-text)', fontSize: '11px' }}>{noteError}</div>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button variant="primary" compact type="submit" disabled={submittingNote || !newNoteContent.trim()}>
                    <Icon name="send" size={12} />
                    <span>{submittingNote ? 'Saving note...' : 'Add note'}</span>
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Tab 3: Audit Trail */}
        {activeTab === 'audit' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h2 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
              Case Audit Trail
            </h2>

            <div className={styles.auditList}>
              {data.events && data.events.length > 0 ? (
                data.events.map((e) => (
                  <div key={e._id} className={styles.auditItem}>
                    <div className={styles.auditDot} />
                    <div className={styles.auditContent}>
                      <div className={styles.auditType}>
                        {e.eventType.replace(/_/g, ' ')}
                      </div>
                      <div className={styles.auditMeta}>
                        <span>{e.createdBy?.name || 'System'}</span> &bull;{' '}
                        <span className="tabular-nums">
                          {new Date(e.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {e.metadata && Object.keys(e.metadata).length > 0 && (
                        <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '2px', fontFamily: 'var(--font-body)' }}>
                          {JSON.stringify(e.metadata)}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-3)', fontSize: '12px' }}>
                  No audit trail events recorded.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Investigation Brief & Copilot */}
        {activeTab === 'brief' && (
          <AiCopilotTab
            caseId={currentCase._id}
            caseNumber={currentCase.caseNumber}
            briefs={data.briefs || []}
            onRefresh={loadCase}
          />
        )}
      </div>

      {/* Close Case Modal */}
      {showCloseModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCloseModal(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Close Case {currentCase.caseNumber}</h2>
              <Button variant="ghost" compact onClick={() => setShowCloseModal(false)} aria-label="Close modal">
                <Icon name="close" size={14} />
              </Button>
            </div>

            <form onSubmit={handleCloseCaseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className={styles.field}>
                <label htmlFor="dispositionSelect" className={styles.fieldLabel}>
                  Investigation Disposition *
                </label>
                <select
                  id="dispositionSelect"
                  value={closeDisposition}
                  onChange={(e) => setCloseDisposition(e.target.value as CaseDisposition)}
                  style={{ height: '32px', padding: '0 8px', fontSize: '12px' }}
                >
                  <option value="CONFIRMED_FRAUD">Confirmed Fraud</option>
                  <option value="FALSE_POSITIVE">False Positive</option>
                  <option value="INCONCLUSIVE">Inconclusive</option>
                </select>
              </div>

              <div className={styles.field}>
                <label htmlFor="closureNote" className={styles.fieldLabel}>
                  Closure Summary Note
                </label>
                <textarea
                  id="closureNote"
                  placeholder="Record summary reason for closing this investigation..."
                  value={closeNote}
                  onChange={(e) => setCloseNote(e.target.value)}
                  className={styles.textarea}
                />
              </div>

              <div className={styles.modalFooter}>
                <Button variant="secondary" compact type="button" onClick={() => setShowCloseModal(false)}>
                  <span>Cancel</span>
                </Button>
                <Button variant="primary" compact type="submit" disabled={closing}>
                  <span>{closing ? 'Closing...' : 'Confirm case closure'}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attach Alert Modal */}
      {showAttachModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAttachModal(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Attach Alert to Case</h2>
              <Button variant="ghost" compact onClick={() => setShowAttachModal(false)} aria-label="Close modal">
                <Icon name="close" size={14} />
              </Button>
            </div>

            {attachError && (
              <div style={{ color: 'var(--sev-high-text)', backgroundColor: 'var(--sev-high-bg)', padding: '8px 12px', borderRadius: '2px', fontSize: '11px' }}>
                {attachError}
              </div>
            )}

            <div style={{ maxHeight: '360px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {allAlerts.length > 0 ? (
                allAlerts.map((a) => (
                  <div
                    key={a._id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      backgroundColor: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: '2px',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontWeight: 600, fontSize: '12px' }}>
                        {a.pattern.replace(/_/g, ' ')}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                        Score: {a.score} &bull; {a.severity}
                      </span>
                    </div>

                    <Button
                      variant="primary"
                      compact
                      onClick={() => handleAttachSubmit(a._id)}
                      disabled={attachingAlertId === a._id}
                    >
                      <span>{attachingAlertId === a._id ? 'Attaching...' : 'Attach'}</span>
                    </Button>
                  </div>
                ))
              ) : (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-3)', fontSize: '12px' }}>
                  No unattached alerts available in queue.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
