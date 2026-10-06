import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchAlerts, updateAlertTriage, Alert } from '../../api/alertsApi';
import { createCase, fetchCases, attachAlertToCase, CaseItem } from '../../api/casesApi';
import { SeverityBadge } from '../../components/SeverityBadge';
import { RiskBadge } from '../../components/RiskBadge';
import { TriageStatusBadge } from '../../components/TriageStatusBadge';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { FilterBar } from '../../components/FilterBar';
import { Modal } from '../../components/Modal';
import { Field } from '../../components/Field';
import { Banner } from '../../components/Banner';
import { Button } from '../../components/common/Button';
import { Table, Column } from '../../components/common/Table';
import { Drawer } from '../../components/common/Drawer';
import { StateView } from '../../components/common/StateView';
import { Icon } from '../../components/common/Icons';
import { formatCurrency, formatDateTime } from '../../lib/format';
import { getSocket, AlertCreatedPayload } from '../../lib/socket';
import styles from './AlertsPage.module.css';

export const AlertsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [highlightedAlertId, setHighlightedAlertId] = useState<string | null>(null);

  // Filters initialized from URL search params
  const [filterSeverity, setFilterSeverity] = useState(searchParams.get('severity') || 'ALL');
  const [filterPattern, setFilterPattern] = useState(searchParams.get('pattern') || 'ALL');
  const [filterStatus, setFilterStatus] = useState(searchParams.get('status') || 'ALL');
  const [minScore, setMinScore] = useState(searchParams.get('minScore') || '');
  const [maxScore, setMaxScore] = useState(searchParams.get('maxScore') || '');
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
        minScore: minScore ? Number(minScore) : undefined,
        maxScore: maxScore ? Number(maxScore) : undefined,
      });
      setAlerts(res.alerts || []);

      // If URL has ?selected=<id>, auto-open drawer
      const selectedId = searchParams.get('selected');
      if (selectedId) {
        const found = (res.alerts || []).find((a) => a._id === selectedId);
        if (found) setSelectedAlert(found);
      } else if (selectedAlert) {
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
  }, [filterSeverity, filterPattern, filterStatus, minScore, maxScore]);

  // Sync state changes back to searchParams
  useEffect(() => {
    const params: Record<string, string> = {};
    if (filterSeverity !== 'ALL') params.severity = filterSeverity;
    if (filterPattern !== 'ALL') params.pattern = filterPattern;
    if (filterStatus !== 'ALL') params.status = filterStatus;
    if (minScore) params.minScore = minScore;
    if (maxScore) params.maxScore = maxScore;
    if (selectedAlert) params.selected = selectedAlert._id;
    setSearchParams(params, { replace: true });
  }, [filterSeverity, filterPattern, filterStatus, minScore, maxScore, selectedAlert, setSearchParams]);

  // Socket listener for new alerts
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleAlertCreated = (payload: AlertCreatedPayload) => {
      if (payload.alert) {
        setAlerts((prev) => [payload.alert, ...prev]);
        setHighlightedAlertId(payload.alert._id);
        setTimeout(() => setHighlightedAlertId(null), 1400);
      }
    };

    socket.on('alert-created', handleAlertCreated);
    return () => {
      socket.off('alert-created', handleAlertCreated);
    };
  }, []);

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
        <span className="tabular-nums" style={{ color: 'var(--text-2)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
          {formatDateTime(item.createdAt)}
        </span>
      ),
    },
    {
      key: 'pattern',
      title: 'Pattern',
      render: (item) => (
        <span style={{ fontWeight: 500, color: 'var(--text)' }}>
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
        if (!item.ringId) return <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>Unassigned</span>;
        const ringObj = typeof item.ringId === 'object' ? item.ringId : null;
        const ringIdStr = ringObj ? ringObj._id : item.ringId;
        const label = ringObj?.label || 'View Ring';
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/rings/${ringIdStr}`);
            }}
          >
            <span>{label}</span>
            <Icon name="arrowRight" size={11} />
          </Button>
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
          size="sm"
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

  const ringInfo =
    selectedAlert?.ringId && typeof selectedAlert.ringId === 'object'
      ? selectedAlert.ringId
      : null;

  return (
    <div className={styles.container}>
      {/* Header */}
      <PageHeader
        kicker="02 — ALERTS"
        title="Alerts Triage Queue"
        subtitle="Prioritized fraud signals from the graph engine. Review evidence, inspect entity networks, and assign triage dispositions."
        actions={
          <Button variant="secondary" size="sm" onClick={loadAlerts}>
            <Icon name="refresh" size={13} />
            <span>Refresh</span>
          </Button>
        }
      />

      {/* Filter Bar with Section 12.3 min/max score inputs */}
      <FilterBar>
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
            aria-label="Filter by pattern"
          >
            <option value="ALL">All Patterns</option>
            <option value="CIRCULAR_FLOW">Circular Flow</option>
            <option value="FAN_IN_FAN_OUT">Fan-In / Fan-Out</option>
            <option value="SHARED_DEVICE">Shared Device</option>
            <option value="PASS_THROUGH">Pass-Through</option>
            <option value="MERCHANT_CASHOUT">Merchant Cash-Out</option>
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
            <option value="DISMISSED">Dismissed</option>
            <option value="ESCALATED">Escalated</option>
          </select>

          {/* Section 12.3 Risk Score Range Filter */}
          <div className={styles.scoreInputWrap}>
            <span style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>Score:</span>
            <input
              type="number"
              min="0"
              max="100"
              placeholder="Min"
              value={minScore}
              onChange={(e) => setMinScore(e.target.value)}
              className={styles.scoreInput}
              aria-label="Minimum risk score"
            />
            <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>–</span>
            <input
              type="number"
              min="0"
              max="100"
              placeholder="Max"
              value={maxScore}
              onChange={(e) => setMaxScore(e.target.value)}
              className={styles.scoreInput}
              aria-label="Maximum risk score"
            />
          </div>
        </div>
      </FilterBar>

      {/* Main Table */}
      <Card variant="default">
        <Table
          columns={columns}
          data={filteredAlerts}
          keyExtractor={(item) => item._id}
          onRowClick={(item) => setSelectedAlert(item)}
          rowClassName={(item) => (item._id === highlightedAlertId ? styles.highlightRow : undefined)}
          emptyText="No alerts match the active filters."
        />
      </Card>

      {/* Alert Investigation Drawer */}
      <Drawer
        isOpen={Boolean(selectedAlert)}
        onClose={() => setSelectedAlert(null)}
        title={selectedAlert ? `${selectedAlert.pattern.replace(/_/g, ' ')} Signal` : 'Alert Details'}
        width="460px"
      >
        {selectedAlert && (
          <div className={styles.drawerContent}>
            {/* Metadata Summary */}
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Severity</span>
                <SeverityBadge severity={selectedAlert.severity} />
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Risk Score</span>
                <RiskBadge score={selectedAlert.score} />
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Triage Status</span>
                <TriageStatusBadge status={selectedAlert.triageStatus} />
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Detected</span>
                <span className={styles.metaValue}>{formatDateTime(selectedAlert.createdAt)}</span>
              </div>
            </div>

            {/* Triage Disposition Controls */}
            <div className={styles.section}>
              <span className={styles.sectionTitle}>Triage Decision</span>
              <div className={styles.triageActions}>
                <div className={styles.triageBtnRow}>
                  <Button
                    variant={selectedAlert.triageStatus === 'REVIEWING' ? 'primary' : 'secondary'}
                    compact
                    onClick={() => handleTriageAction('REVIEWING')}
                    disabled={selectedAlert.triageStatus === 'REVIEWING'}
                  >
                    Mark Reviewing
                  </Button>
                  <Button
                    variant={selectedAlert.triageStatus === 'DISMISSED' ? 'primary' : 'secondary'}
                    compact
                    onClick={() => handleTriageAction('DISMISSED')}
                    disabled={selectedAlert.triageStatus === 'DISMISSED'}
                  >
                    Dismiss Signal
                  </Button>
                </div>
                <Button
                  variant="primary"
                  compact
                  onClick={handleOpenCaseModal}
                  disabled={selectedAlert.triageStatus === 'ESCALATED'}
                >
                  <Icon name="cases" size={13} />
                  <span>{selectedAlert.triageStatus === 'ESCALATED' ? 'Escalated to Case' : 'Escalate to Case...'}</span>
                </Button>
              </div>
            </div>

            {/* Fraud Ring Association */}
            {ringInfo && (
              <div className={styles.section}>
                <span className={styles.sectionTitle}>Associated Fraud Ring</span>
                <div
                  style={{
                    backgroundColor: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: 'var(--space-3)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-2)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: '13px' }}>{ringInfo.label}</span>
                    <RiskBadge score={ringInfo.score} />
                  </div>
                  {ringInfo.totalFlow !== undefined && (
                    <div style={{ fontSize: '11px', color: 'var(--text-2)' }}>
                      Total Volume: <strong>{formatCurrency(ringInfo.totalFlow)}</strong>
                    </div>
                  )}
                  <Button
                    variant="secondary"
                    compact
                    onClick={() => navigate(`/rings/${ringInfo._id}`)}
                  >
                    <span>Open Ring Dossier →</span>
                  </Button>
                </div>
              </div>
            )}

            {/* Evidence & Entities */}
            <div className={styles.section}>
              <span className={styles.sectionTitle}>Involved Accounts</span>
              <div className={styles.tagList}>
                {(selectedAlert.evidence?.accounts || selectedAlert.evidence?.cycleAccounts || []).map((acc) => (
                  <Button
                    key={acc}
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`/accounts/${acc}`)}
                  >
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{acc}</span>
                    <Icon name="arrowRight" size={10} />
                  </Button>
                ))}
                {!(selectedAlert.evidence?.accounts || selectedAlert.evidence?.cycleAccounts)?.length && (
                  <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>No direct account identifiers</span>
                )}
              </div>
            </div>

            {/* Devices */}
            {Boolean(selectedAlert.evidence?.devices?.length) && (
              <div className={styles.section}>
                <span className={styles.sectionTitle}>Shared Hardware Devices</span>
                <div className={styles.tagList}>
                  {selectedAlert.evidence.devices?.map((dev) => (
                    <span key={dev} className={styles.tagLink} style={{ cursor: 'default' }}>
                      {dev}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Transactions in Pattern */}
            {Boolean(selectedAlert.evidence?.transactions?.length) && (
              <div className={styles.section}>
                <span className={styles.sectionTitle}>Correlated Transactions</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {selectedAlert.evidence.transactions?.slice(0, 5).map((tx, idx) => (
                    <div
                      key={tx.externalTransactionId || idx}
                      style={{
                        padding: 'var(--space-2) var(--space-3)',
                        backgroundColor: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '11px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-2)' }}>
                          {tx.fromAccount || '—'} → {tx.toAccount || '—'}
                        </span>
                      </div>
                      <div style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                        {formatCurrency(tx.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Evidence Summary Text */}
            {selectedAlert.evidence?.summary && (
              <div className={styles.section}>
                <span className={styles.sectionTitle}>Forensic Summary</span>
                <div className={styles.evidenceSummary}>
                  {selectedAlert.evidence.summary}
                </div>
              </div>
            )}

            {/* Fingerprint */}
            <div className={styles.section}>
              <span className={styles.sectionTitle}>Deterministic Fingerprint</span>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  color: 'var(--text-3)',
                  wordBreak: 'break-all',
                  backgroundColor: 'var(--surface-2)',
                  padding: 'var(--space-2)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                {selectedAlert.fingerprint}
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* Shared Focus-Trapped Case Escalation Modal */}
      <Modal
        isOpen={showCaseModal}
        onClose={() => setShowCaseModal(false)}
        title="Escalate Alert to Investigation Case"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCaseModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={submittingCase}
              onClick={handleCaseSubmit}
            >
              {submittingCase
                ? 'Processing...'
                : caseActionType === 'create'
                  ? 'Create & Open Case'
                  : 'Link to Case'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleCaseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {caseModalError && <Banner variant="error">{caseModalError}</Banner>}

          <div className={styles.radioGroup}>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="caseAction"
                value="create"
                checked={caseActionType === 'create'}
                onChange={() => setCaseActionType('create')}
              />
              <span>Create New Case</span>
            </label>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="caseAction"
                value="attach"
                checked={caseActionType === 'attach'}
                onChange={() => setCaseActionType('attach')}
              />
              <span>Attach to Existing Case</span>
            </label>
          </div>

          {caseActionType === 'create' ? (
            <Field label="Case Title" htmlFor="caseTitle" required>
              <input
                id="caseTitle"
                type="text"
                value={newCaseTitle}
                onChange={(e) => setNewCaseTitle(e.target.value)}
                placeholder="Enter descriptive case name..."
                style={{
                  width: '100%',
                  height: '36px',
                  padding: '0 var(--space-3)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--surface-2)',
                  color: 'var(--text)',
                  fontSize: '12px',
                }}
              />
            </Field>
          ) : (
            <Field label="Select Active Case" htmlFor="existingCase" required>
              <select
                id="existingCase"
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                style={{
                  width: '100%',
                  height: '36px',
                  padding: '0 var(--space-3)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--surface-2)',
                  color: 'var(--text)',
                  fontSize: '12px',
                }}
              >
                <option value="">-- Choose active case --</option>
                {openCases.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.title} ({c.status})
                  </option>
                ))}
              </select>
            </Field>
          )}
        </form>
      </Modal>
    </div>
  );
};

export default AlertsPage;
