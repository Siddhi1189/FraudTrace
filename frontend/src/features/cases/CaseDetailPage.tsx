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
} from '../../api/casesApi';
import { fetchAlerts, AlertItem } from '../../api/alertsApi';
import { CaseStatusBadge } from '../../components/CaseStatusBadge';
import { CaseDispositionBadge } from '../../components/CaseDispositionBadge';
import { SeverityBadge } from '../../components/SeverityBadge';
import { RiskBadge } from '../../components/RiskBadge';
import { Button } from '../../components/common/Button';
import { Table, Column } from '../../components/common/Table';
import { Tabs } from '../../components/common/Tabs';
import { StateView } from '../../components/common/StateView';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { Modal } from '../../components/Modal';
import { Field } from '../../components/Field';
import { Banner } from '../../components/Banner';
import { Icon } from '../../components/common/Icons';
import { AiCopilotTab } from '../ai/AiCopilotTab';
import { getSocket } from '../../lib/socket';
import { formatDateTime } from '../../lib/format';
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
  const [closeError, setCloseError] = useState<string | null>(null);

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

    // Subscribe to case-updated and ai-completed realtime socket events
    const s = getSocket();
    if (!s) return;
    const handleCaseUpdated = (payload: { caseId?: string }) => {
      if (!payload?.caseId || payload.caseId === id) {
        loadCase();
      }
    };
    s.on('case-updated', handleCaseUpdated);
    s.on('ai-completed', handleCaseUpdated);

    return () => {
      s.off('case-updated', handleCaseUpdated);
      s.off('ai-completed', handleCaseUpdated);
    };
  }, [id]);

  const handleStatusChange = async (newStatus: CaseStatus) => {
    if (!id) return;
    if (newStatus === 'CLOSED') {
      setCloseError(null);
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

    if (!closeDisposition) {
      setCloseError('Investigation disposition is required to close this case.');
      return;
    }

    try {
      setClosing(true);
      setCloseError(null);
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
      if (err && typeof err === 'object' && 'error' in err) {
        setCloseError((err as { error: string }).error);
      } else {
        setCloseError('Failed to close case.');
      }
    } finally {
      setClosing(false);
    }
  };

  const openAttachModal = async () => {
    setShowAttachModal(true);
    setAttachError(null);
    try {
      const res = await fetchAlerts();
      const existingAlertIds = new Set((data?.alerts || []).map((a) => a._id));
      const unattached = (res.alerts || []).filter((a) => !existingAlertIds.has(a._id));
      setAllAlerts(unattached);
    } catch {
      setAttachError('Failed to load queue alerts.');
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
        setNoteError('Failed to save case note.');
      }
    } finally {
      setSubmittingNote(false);
    }
  };

  const alertColumns: Column<AttachedAlertItem>[] = [
    {
      key: 'pattern',
      title: 'Pattern',
      render: (a) => (
        <span style={{ fontWeight: 500, color: 'var(--text)' }}>
          {a.pattern?.replace(/_/g, ' ') || 'Unknown'}
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
      key: 'addedAt',
      title: 'Attached Date',
      width: '130px',
      render: (a) => (
        <span className="tabular-nums" style={{ color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
          {formatDateTime(a.attachedAt || a.createdAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      title: '',
      width: '70px',
      align: 'right',
      render: (a) => (
        <Button
          variant="ghost"
          compact
          onClick={() => navigate(`/alerts?selected=${a._id}`)}
          aria-label="Inspect alert"
        >
          <span>Inspect</span>
        </Button>
      ),
    },
  ];

  if (loading) {
    return <StateView type="loading" title="Loading investigation case..." />;
  }

  if (error || !data) {
    return (
      <StateView
        type="error"
        title="Case not found"
        description={error || 'The requested case dossier could not be located.'}
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
      {/* Breadcrumbs + Header */}
      <div>
        <PageHeader
          kicker="05 — CASE INVESTIGATION"
          breadcrumbs={[
            { label: 'All Cases', onClick: () => navigate('/cases') },
            { label: currentCase.caseNumber },
          ]}
          title={currentCase.title}
          subtitle={`Investigation dossier initiated by ${currentCase.createdBy?.name || 'Analyst'}`}
          actions={
            <div className={styles.actionsArea}>
              <span className={styles.caseNumber}>{currentCase.caseNumber}</span>
              <CaseStatusBadge status={currentCase.status} />
              <CaseDispositionBadge disposition={currentCase.disposition} />

              {!isClosed ? (
                <>
                  {currentCase.status === 'OPEN' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleStatusChange('INVESTIGATING')}
                    >
                      <span>Start investigation</span>
                    </Button>
                  )}
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setCloseError(null);
                      setShowCloseModal(true);
                    }}
                  >
                    <span>Close case</span>
                  </Button>
                </>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleStatusChange('INVESTIGATING')}
                >
                  <span>Reopen case</span>
                </Button>
              )}

              <Button variant="secondary" size="sm" onClick={openAttachModal} disabled={isClosed}>
                <Icon name="plus" size={12} />
                <span>Attach alert</span>
              </Button>
            </div>
          }
        />
      </div>

      {/* Meta Statistics Grid */}
      <div className={styles.metaGrid}>
        <div className={styles.metaBox}>
          <span className={styles.metaLabel}>Investigator</span>
          <span className={styles.metaValue}>{currentCase.createdBy?.name || 'Analyst'}</span>
        </div>
        <div className={styles.metaBox}>
          <span className={styles.metaLabel}>Created Date</span>
          <span className={styles.metaValue}>{formatDateTime(currentCase.createdAt)}</span>
        </div>
        <div className={styles.metaBox}>
          <span className={styles.metaLabel}>Attached Alerts</span>
          <span className={styles.metaValue}>{data.alerts?.length || 0}</span>
        </div>
        <div className={styles.metaBox}>
          <span className={styles.metaLabel}>Investigation Status</span>
          <span className={styles.metaValue}>{currentCase.status}</span>
        </div>
      </div>

      {/* Workspace Tabs & Body */}
      <Card variant="default">
        <Tabs tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />

        {/* Tab 1: Evidence */}
        {activeTab === 'evidence' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
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
              emptyText="No alerts attached to this case yet. Click 'Attach alert' to add evidence."
            />
          </div>
        )}

        {/* Tab 2: Notes */}
        {activeTab === 'notes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
            <div className={styles.notesList}>
              {data.notes && data.notes.length > 0 ? (
                data.notes.map((n) => (
                  <div key={n._id} className={`${styles.noteItem} ${styles.itemSlideIn}`}>
                    <div className={styles.noteHeader}>
                      <span className={styles.noteAuthor}>{n.authorId?.name || 'Investigator'}</span>
                      <span className={styles.noteDate}>{formatDateTime(n.createdAt)}</span>
                    </div>
                    <div className={styles.noteContent}>{n.content}</div>
                  </div>
                ))
              ) : (
                <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-3)', fontSize: '12px' }}>
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
                {noteError && <Banner variant="error">{noteError}</Banner>}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
            <h2 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
              Case Audit Trail
            </h2>

            <div className={styles.auditList}>
              {data.events && data.events.length > 0 ? (
                data.events.map((e) => (
                  <div key={e._id} className={`${styles.auditItem} ${styles.itemSlideIn}`}>
                    <div className={styles.auditDot} />
                    <div className={styles.auditContent}>
                      <div className={styles.auditType}>
                        {e.eventType.replace(/_/g, ' ')}
                      </div>
                      <div className={styles.auditMeta}>
                        <span>{e.createdBy?.name || 'System'}</span> &bull;{' '}
                        <span>{formatDateTime(e.createdAt)}</span>
                      </div>
                      {e.metadata && Object.keys(e.metadata).length > 0 && (
                        <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                          {JSON.stringify(e.metadata)}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-3)', fontSize: '12px' }}>
                  No audit trail events recorded.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Investigation Brief & Copilot */}
        {activeTab === 'brief' && (
          <div style={{ marginTop: 'var(--space-4)' }}>
            <AiCopilotTab
              caseId={currentCase._id}
              caseNumber={currentCase.caseNumber}
              briefs={data.briefs || []}
              onRefresh={loadCase}
            />
          </div>
        )}
      </Card>

      {/* Shared Focus-Trapped Close Case Modal */}
      <Modal
        isOpen={showCloseModal}
        onClose={() => setShowCloseModal(false)}
        title={`Close Case ${currentCase.caseNumber}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCloseModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" disabled={closing || !closeDisposition} onClick={handleCloseCaseSubmit}>
              {closing ? 'Closing...' : 'Confirm Case Closure'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleCloseCaseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {closeError && <Banner variant="error">{closeError}</Banner>}

          <Field label="Investigation Disposition" htmlFor="dispositionSelect" required>
            <select
              id="dispositionSelect"
              required
              value={closeDisposition}
              onChange={(e) => setCloseDisposition(e.target.value as CaseDisposition)}
              style={{
                width: '100%',
                height: '36px',
                padding: '0 var(--space-3)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface-2)',
                color: 'var(--text)',
                fontSize: '12px',
              }}
            >
              <option value="CONFIRMED_FRAUD">Confirmed Fraud</option>
              <option value="FALSE_POSITIVE">False Positive</option>
              <option value="INCONCLUSIVE">Inconclusive</option>
            </select>
          </Field>

          <Field label="Closure Summary Note" htmlFor="closureNote">
            <textarea
              id="closureNote"
              placeholder="Record summary reason for closing this investigation..."
              value={closeNote}
              onChange={(e) => setCloseNote(e.target.value)}
              className={styles.textarea}
            />
          </Field>
        </form>
      </Modal>

      {/* Shared Focus-Trapped Attach Alert Modal */}
      <Modal
        isOpen={showAttachModal}
        onClose={() => setShowAttachModal(false)}
        title="Attach Alert to Case"
        footer={
          <Button variant="secondary" onClick={() => setShowAttachModal(false)}>
            Close
          </Button>
        }
      >
        {attachError && <Banner variant="error">{attachError}</Banner>}

        <div style={{ maxHeight: '360px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {allAlerts.length > 0 ? (
            allAlerts.map((a) => (
              <div
                key={a._id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 'var(--space-2) var(--space-3)',
                  backgroundColor: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontWeight: 600, fontSize: '12px' }}>
                    {a.pattern.replace(/_/g, ' ')}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
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
            <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-3)', fontSize: '12px' }}>
              No unattached alerts available in queue.
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default CaseDetailPage;
