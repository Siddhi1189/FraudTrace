import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAlerts, updateAlertTriage, Alert } from '../../api/alertsApi';
import { createCase, fetchCases, attachAlertToCase, CaseItem } from '../../api/casesApi';
import { SeverityBadge } from '../../components/SeverityBadge';
import { RiskBadge } from '../../components/RiskBadge';
import { TriageStatusBadge } from '../../components/TriageStatusBadge';
import { Button } from '../../components/common/Button';
import { Table, Column } from '../../components/common/Table';
import { Drawer } from '../../components/common/Drawer';
import { StateView } from '../../components/common/StateView';
import { Icon } from '../../components/common/Icons';
import styles from './AlertsPage.module.css';

export const AlertsPage: React.FC = () => {
  const navigate = useNavigate();

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);

  // Filters
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [filterPattern, setFilterPattern] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Case escalation modal
  const [showCaseModal, setShowCaseModal] = useState(false);
  const [caseActionType, setCaseActionType] = useState<'create' | 'attach'>('create');
  const [newCaseTitle, setNewCaseTitle] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [openCases, setOpenCases] = useState<CaseItem[]>([]);
  const [submittingCase, setSubmittingCase] = useState(false);
  const [caseModalError, setCaseModalError] = useState<string | null>(null);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchAlerts({
        severity: filterSeverity !== 'ALL' ? filterSeverity : undefined,
        pattern: filterPattern !== 'ALL' ? filterPattern : undefined,
        triageStatus: filterStatus !== 'ALL' ? filterStatus : undefined,
      });
      setAlerts(res.alerts || []);
      if (selectedAlert) {
        const refreshed = (res.alerts || []).find((a) => a._id === selectedAlert._id);
        if (refreshed) setSelectedAlert(refreshed);
      }
    } catch (err: unknown) {
      console.error('Failed to load alerts:', err);
      setError('Unable to load alerts from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [filterSeverity, filterPattern, filterStatus]);

  const handleTriageAction = async (newStatus: string) => {
    if (!selectedAlert) return;
    try {
      const res = await updateAlertTriage(selectedAlert._id, newStatus);
      setSelectedAlert(res.alert);
      setAlerts((prev) => prev.map((a) => (a._id === res.alert._id ? res.alert : a)));
    } catch (err: unknown) {
      console.error('Triage update failed:', err);
    }
  };

  const handleOpenCaseModal = async () => {
    setShowCaseModal(true);
    setNewCaseTitle(
      selectedAlert
        ? `Investigation: ${selectedAlert.pattern.replace(/_/g, ' ')} (${selectedAlert.fingerprint.slice(0, 16)})`
        : ''
    );
    setSelectedCaseId('');
    setCaseModalError(null);
    try {
      const [openRes, investigatingRes] = await Promise.all([
        fetchCases({ status: 'OPEN' }),
        fetchCases({ status: 'INVESTIGATING' }),
      ]);
      setOpenCases([...(openRes.cases || []), ...(investigatingRes.cases || [])]);
    } catch {
      // Non-fatal
    }
  };

  const handleCaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlert) return;

    try {
      setSubmittingCase(true);
      setCaseModalError(null);
      if (caseActionType === 'create') {
        if (!newCaseTitle.trim()) {
          setCaseModalError('Please enter a case title');
          setSubmittingCase(false);
          return;
        }
        const res = await createCase({
          title: newCaseTitle.trim(),
          initialAlertId: selectedAlert._id,
        });
        setShowCaseModal(false);
        navigate(`/cases/${res.case._id}`);
      } else {
        if (!selectedCaseId) {
          setCaseModalError('Please select an active case');
          setSubmittingCase(false);
          return;
        }
        await attachAlertToCase(selectedCaseId, selectedAlert._id);
        setShowCaseModal(false);
        navigate(`/cases/${selectedCaseId}`);
      }
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'error' in err) {
        setCaseModalError((err as { error: string }).error);
      } else {
        setCaseModalError('Failed to link alert to case');
      }
      setSubmittingCase(false);
    }
  };

  // Search filtering
  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      const patternMatch = a.pattern.toLowerCase().includes(term);
      const idMatch = a._id.toLowerCase().includes(term);
      const fpMatch = a.fingerprint.toLowerCase().includes(term);
      return patternMatch || idMatch || fpMatch;
    });
  }, [alerts, searchTerm]);

  const columns: Column<Alert>[] = [
    {
      key: 'createdAt',
      title: 'Detected',
      width: '130px',
      render: (item) => (
        <span className="tabular-nums" style={{ color: 'var(--text-2)' }}>
          {new Date(item.createdAt).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      ),
    },
    {
      key: 'pattern',
      title: 'Pattern',
      render: (item) => (
        <span style={{ fontWeight: 600, color: 'var(--text)' }}>
          {item.pattern.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      key: 'severity',
      title: 'Severity',
      width: '90px',
      render: (item) => <SeverityBadge severity={item.severity} />,
    },
    {
      key: 'score',
      title: 'Score',
      width: '70px',
      render: (item) => <RiskBadge score={item.score} />,
    },
    {
      key: 'triageStatus',
      title: 'Triage Status',
      width: '110px',
      render: (item) => <TriageStatusBadge status={item.triageStatus} />,
    },
    {
      key: 'ringId',
      title: 'Fraud Ring',
      width: '110px',
      render: (item) => {
        if (!item.ringId) return <span style={{ color: 'var(--text-3)' }}>Unassigned</span>;
        const ringObj = typeof item.ringId === 'object' ? item.ringId : null;
        const ringIdStr = ringObj ? ringObj._id : item.ringId;
        const label = ringObj?.label || 'View Ring';
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/rings/${ringIdStr}`);
            }}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              color: 'var(--primary)',
              cursor: 'pointer',
              fontWeight: 500,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>{label}</span>
            <Icon name="arrowRight" size={11} />
          </button>
        );
      },
    },
    {
      key: 'actions',
      title: '',
      width: '70px',
      align: 'right',
      render: (item) => (
        <Button
          variant="ghost"
          compact
          onClick={(e) => {
            e.stopPropagation();
            setSelectedAlert(item);
          }}
          aria-label="Inspect alert"
        >
          <span>Inspect</span>
        </Button>
      ),
    },
  ];

  if (loading && alerts.length === 0) {
    return <StateView type="loading" title="Loading alerts queue..." />;
  }

  if (error && alerts.length === 0) {
    return <StateView type="error" title="Alerts error" description={error} onRetry={loadAlerts} />;
  }

  const ringInfo = selectedAlert?.ringId && typeof selectedAlert.ringId === 'object'
    ? selectedAlert.ringId
    : null;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>Alerts Triage Queue</h1>
          <p className={styles.subtitle}>
            Prioritized fraud signals from the graph engine. Review evidence, inspect entity networks, and assign triage dispositions.
          </p>
        </div>

        <Button variant="secondary" compact onClick={loadAlerts}>
          <Icon name="refresh" size={13} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Filter Bar */}
      <div className={styles.filterBar}>
        <div className={styles.searchBox}>
          <Icon name="search" size={14} />
          <input
            type="text"
            placeholder="Search alerts by pattern or fingerprint..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
            aria-label="Search alerts"
          />
        </div>

        <div className={styles.selectGroup}>
          <Icon name="filter" size={14} />

          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className={styles.select}
            aria-label="Filter by severity"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <select
            value={filterPattern}
            onChange={(e) => setFilterPattern(e.target.value)}
            className={styles.select}
            aria-label="Filter by detection pattern"
          >
            <option value="ALL">All Patterns</option>
            <option value="CIRCULAR_FLOW">Circular Flow</option>
            <option value="FAN_IN_FAN_OUT">Fan-in / Fan-out</option>
            <option value="SHARED_DEVICE">Shared Device</option>
            <option value="PASS_THROUGH">Pass-Through</option>
            <option value="MERCHANT_CASHOUT">Merchant Cash-out</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={styles.select}
            aria-label="Filter by triage status"
          >
            <option value="ALL">All Statuses</option>
            <option value="NEW">New</option>
            <option value="REVIEWING">Reviewing</option>
            <option value="ESCALATED">Escalated</option>
            <option value="DISMISSED">Dismissed</option>
          </select>
        </div>
      </div>

      {/* Alerts Table */}
      <div className={styles.card}>
        <Table
          columns={columns}
          data={filteredAlerts}
          keyExtractor={(item) => item._id}
          onRowClick={(item) => setSelectedAlert(item)}
          emptyMessage="No alerts found matching filter criteria."
        />
      </div>

      {/* Alert Inspection Drawer */}
      <Drawer
        isOpen={Boolean(selectedAlert)}
        onClose={() => setSelectedAlert(null)}
        title={
          selectedAlert ? (
            <span>Alert: {selectedAlert.pattern.replace(/_/g, ' ')}</span>
          ) : (
            'Alert Detail'
          )
        }
      >
        {selectedAlert && (
          <div className={styles.drawerContent}>
            {/* Meta attributes */}
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Severity</span>
                <div><SeverityBadge severity={selectedAlert.severity} /></div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Risk Score</span>
                <div><RiskBadge score={selectedAlert.score} /></div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Triage Status</span>
                <div><TriageStatusBadge status={selectedAlert.triageStatus} /></div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Detected</span>
                <span className={styles.metaValue}>
                  {new Date(selectedAlert.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Triage Actions */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Triage Action</h3>
              <div className={styles.triageActions}>
                <div className={styles.triageBtnRow}>
                  <Button
                    variant={selectedAlert.triageStatus === 'REVIEWING' ? 'primary' : 'secondary'}
                    compact
                    onClick={() => handleTriageAction('REVIEWING')}
                  >
                    <span>Reviewing</span>
                  </Button>
                  <Button
                    variant={selectedAlert.triageStatus === 'DISMISSED' ? 'primary' : 'secondary'}
                    compact
                    onClick={() => handleTriageAction('DISMISSED')}
                  >
                    <span>Dismiss</span>
                  </Button>
                  <Button
                    variant={selectedAlert.triageStatus === 'ESCALATED' ? 'primary' : 'secondary'}
                    compact
                    onClick={() => handleTriageAction('ESCALATED')}
                  >
                    <span>Escalate</span>
                  </Button>
                </div>

                <Button
                  variant="primary"
                  compact
                  onClick={handleOpenCaseModal}
                  fullWidth
                >
                  <Icon name="cases" size={13} />
                  <span>Escalate to investigation case</span>
                </Button>
              </div>
            </div>

            {/* Fraud Ring association */}
            {selectedAlert.ringId && (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Fraud Ring</h3>
                <div className={styles.evidenceSummary}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600 }}>{ringInfo?.label || 'Linked Ring'}</span>
                    <Button
                      variant="ghost"
                      compact
                      onClick={() => navigate(`/rings/${ringInfo ? ringInfo._id : selectedAlert.ringId}`)}
                    >
                      <span>View ring workspace</span>
                      <Icon name="arrowRight" size={11} />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Evidence Summary */}
            {selectedAlert.evidence?.summary && (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Evidence Summary</h3>
                <div className={styles.evidenceSummary}>
                  {selectedAlert.evidence.summary}
                </div>
              </div>
            )}

            {/* Involved Accounts */}
            {(selectedAlert.evidence?.accounts || selectedAlert.evidence?.cycleAccounts) && (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Involved Accounts</h3>
                <div className={styles.tagList}>
                  {(selectedAlert.evidence.accounts || selectedAlert.evidence.cycleAccounts || []).map(
                    (accId) => (
                      <button
                        key={accId}
                        className={styles.tagLink}
                        onClick={() => navigate(`/accounts/${accId}`)}
                      >
                        <Icon name="user" size={11} />
                        <span>{accId}</span>
                      </button>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Transactions Table */}
            {selectedAlert.evidence?.transactions && selectedAlert.evidence.transactions.length > 0 && (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Transaction Evidence</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-3)' }}>
                        <th style={{ padding: '6px 8px' }}>Amount</th>
                        <th style={{ padding: '6px 8px' }}>From</th>
                        <th style={{ padding: '6px 8px' }}>To</th>
                        <th style={{ padding: '6px 8px' }}>Device</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedAlert.evidence.transactions.map((tx, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td className="tabular-nums" style={{ padding: '6px 8px', fontWeight: 600 }}>
                            ${Number(tx.amount || 0).toLocaleString()}
                          </td>
                          <td className="entity-id" style={{ padding: '6px 8px' }}>
                            {tx.fromAccount ? (
                              <button
                                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0 }}
                                onClick={() => navigate(`/accounts/${tx.fromAccount}`)}
                              >
                                {tx.fromAccount}
                              </button>
                            ) : '-'}
                          </td>
                          <td className="entity-id" style={{ padding: '6px 8px' }}>
                            {tx.toAccount ? (
                              <button
                                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0 }}
                                onClick={() => navigate(`/accounts/${tx.toAccount}`)}
                              >
                                {tx.toAccount}
                              </button>
                            ) : '-'}
                          </td>
                          <td style={{ padding: '6px 8px', color: 'var(--text-3)' }}>
                            {tx.device || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Case Escalation Modal */}
      {showCaseModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCaseModal(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Escalate Alert to Case</h2>
              <Button variant="ghost" compact onClick={() => setShowCaseModal(false)} aria-label="Close modal">
                <Icon name="close" size={14} />
              </Button>
            </div>

            {caseModalError && (
              <div style={{ color: 'var(--sev-high-text)', backgroundColor: 'var(--sev-high-bg)', padding: '8px 12px', borderRadius: '2px', fontSize: '11px' }}>
                {caseModalError}
              </div>
            )}

            <form onSubmit={handleCaseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className={styles.radioGroup}>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="caseAction"
                    value="create"
                    checked={caseActionType === 'create'}
                    onChange={() => setCaseActionType('create')}
                  />
                  <span>Create new case</span>
                </label>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="caseAction"
                    value="attach"
                    checked={caseActionType === 'attach'}
                    onChange={() => setCaseActionType('attach')}
                  />
                  <span>Attach to existing case</span>
                </label>
              </div>

              {caseActionType === 'create' ? (
                <div className={styles.inputGroup}>
                  <label htmlFor="newCaseTitle" className={styles.inputLabel}>
                    Case Title
                  </label>
                  <input
                    id="newCaseTitle"
                    type="text"
                    required
                    value={newCaseTitle}
                    onChange={(e) => setNewCaseTitle(e.target.value)}
                    style={{ height: '32px', padding: '0 8px', fontSize: '12px' }}
                  />
                </div>
              ) : (
                <div className={styles.inputGroup}>
                  <label htmlFor="selectCaseId" className={styles.inputLabel}>
                    Select Open Case
                  </label>
                  <select
                    id="selectCaseId"
                    required
                    value={selectedCaseId}
                    onChange={(e) => setSelectedCaseId(e.target.value)}
                    className={styles.select}
                    style={{ height: '32px' }}
                  >
                    <option value="">-- Choose active case --</option>
                    {openCases.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.caseNumber} - {c.title} ({c.status})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className={styles.modalFooter}>
                <Button variant="secondary" compact type="button" onClick={() => setShowCaseModal(false)}>
                  <span>Cancel</span>
                </Button>
                <Button variant="primary" compact type="submit" disabled={submittingCase}>
                  <span>{submittingCase ? 'Saving...' : 'Confirm escalation'}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
