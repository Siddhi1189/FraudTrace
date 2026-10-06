import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCases, createCase, CaseItem } from '../../api/casesApi';
import { fetchAlerts, AlertItem } from '../../api/alertsApi';
import { CaseStatusBadge } from '../../components/CaseStatusBadge';
import { CaseDispositionBadge } from '../../components/CaseDispositionBadge';
import { Button } from '../../components/common/Button';
import { Table, Column } from '../../components/common/Table';
import { StateView } from '../../components/common/StateView';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { FilterBar } from '../../components/FilterBar';
import { Modal } from '../../components/Modal';
import { Field } from '../../components/Field';
import { Banner } from '../../components/Banner';
import { Icon } from '../../components/common/Icons';
import { formatDateTime } from '../../lib/format';
import styles from './CasesListPage.module.css';

export const CasesListPage: React.FC = () => {
  const navigate = useNavigate();

  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dispositionFilter, setDispositionFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Create Case Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [selectedAlertId, setSelectedAlertId] = useState('');
  const [availableAlerts, setAvailableAlerts] = useState<AlertItem[]>([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadCases = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: { status?: string; disposition?: string } = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (dispositionFilter !== 'ALL') params.disposition = dispositionFilter;

      const data = await fetchCases(params);
      setCases(data.cases || []);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'error' in err) {
        setError((err as { error: string }).error);
      } else {
        setError('Failed to load cases directory.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, [statusFilter, dispositionFilter]);

  const openCreateModal = async () => {
    setShowCreateModal(true);
    setNewTitle('');
    setSelectedAlertId('');
    setCreateError(null);
    try {
      const alertsData = await fetchAlerts();
      setAvailableAlerts(alertsData.alerts || []);
    } catch {
      // Non-fatal
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setCreateError('Please enter a case title');
      return;
    }

    try {
      setCreating(true);
      setCreateError(null);
      const payload: { title: string; initialAlertId?: string } = {
        title: newTitle.trim(),
      };
      if (selectedAlertId) {
        payload.initialAlertId = selectedAlertId;
      }
      const result = await createCase(payload);
      setShowCreateModal(false);
      navigate(`/cases/${result.case._id}`);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'error' in err) {
        setCreateError((err as { error: string }).error);
      } else {
        setCreateError('Failed to create case.');
      }
      setCreating(false);
    }
  };

  const filteredCases = useMemo(() => {
    if (!searchQuery.trim()) return cases;
    const q = searchQuery.toLowerCase();
    return cases.filter(
      (c) =>
        c.caseNumber.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        (c.createdBy?.name || '').toLowerCase().includes(q)
    );
  }, [cases, searchQuery]);

  const columns: Column<CaseItem>[] = [
    {
      key: 'caseNumber',
      title: 'Case ID',
      width: '110px',
      render: (c) => (
        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary)', fontWeight: 600, fontSize: '12px' }}>
          {c.caseNumber}
        </span>
      ),
    },
    {
      key: 'title',
      title: 'Title',
      render: (c) => (
        <span style={{ fontWeight: 500, color: 'var(--text)' }}>
          {c.title}
        </span>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      width: '120px',
      render: (c) => <CaseStatusBadge status={c.status} />,
    },
    {
      key: 'disposition',
      title: 'Disposition',
      width: '140px',
      render: (c) => <CaseDispositionBadge disposition={c.disposition} />,
    },
    {
      key: 'alerts',
      title: 'Alerts',
      width: '80px',
      align: 'right',
      render: (c) => (
        <span className="tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>
          {c.alertCount ?? 0}
        </span>
      ),
    },
    {
      key: 'createdBy',
      title: 'Investigator',
      width: '140px',
      render: (c) => (
        <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>
          {c.createdBy?.name || 'Analyst'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      title: 'Created',
      width: '110px',
      render: (c) => (
        <span className="tabular-nums" style={{ color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
          {formatDateTime(c.createdAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      title: '',
      width: '70px',
      align: 'right',
      render: (c) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/cases/${c._id}`);
          }}
          aria-label="Open case workspace"
        >
          <span>Open</span>
        </Button>
      ),
    },
  ];

  if (loading && cases.length === 0) {
    return <StateView type="loading" title="Loading cases directory..." />;
  }

  if (error && cases.length === 0) {
    return <StateView type="error" title="Cases error" description={error} onRetry={loadCases} />;
  }

  return (
    <div className={styles.container}>
      <PageHeader
        kicker="05 — CASES"
        title="Cases Directory"
        subtitle="Active fraud dossiers, investigator audit logs, entity notes, and AI-synthesized forensic briefs."
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Button variant="secondary" size="sm" onClick={loadCases}>
              <Icon name="refresh" size={13} />
              <span>Refresh</span>
            </Button>
            <Button variant="primary" size="sm" onClick={openCreateModal}>
              <Icon name="plus" size={13} />
              <span>Create Case</span>
            </Button>
          </div>
        }
      />

      <FilterBar>
        <div className={styles.searchBox}>
          <Icon name="search" size={14} />
          <input
            type="text"
            placeholder="Search cases by ID, title, or analyst..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
            aria-label="Search cases"
          />
        </div>

        <div className={styles.selectGroup}>
          <Icon name="filter" size={14} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={styles.select}
            aria-label="Filter cases by status"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="INVESTIGATING">Investigating</option>
            <option value="RESOLVED">Resolved</option>
            <option value="DISMISSED">Dismissed</option>
          </select>

          <select
            value={dispositionFilter}
            onChange={(e) => setDispositionFilter(e.target.value)}
            className={styles.select}
            aria-label="Filter cases by disposition"
          >
            <option value="ALL">All Dispositions</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED_FRAUD">Confirmed Fraud</option>
            <option value="FALSE_POSITIVE">False Positive</option>
            <option value="SUSPICIOUS">Suspicious</option>
            <option value="NO_ACTION">No Action</option>
          </select>
        </div>
      </FilterBar>

      <Card variant="default">
        <Table
          columns={columns}
          data={filteredCases}
          keyExtractor={(item) => item._id}
          onRowClick={(item) => navigate(`/cases/${item._id}`)}
          emptyText="No investigation cases match the active criteria."
        />
      </Card>

      {/* Shared Modal for Case Creation */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Investigation Case"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" disabled={creating} onClick={handleCreateSubmit}>
              {creating ? 'Creating...' : 'Create Case'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {createError && <Banner variant="error">{createError}</Banner>}

          <Field label="Case Title" htmlFor="caseTitle" required>
            <input
              id="caseTitle"
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Investigation: Mule Cluster Alpha..."
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

          <Field label="Link Initial Alert (Optional)" htmlFor="initialAlert">
            <select
              id="initialAlert"
              value={selectedAlertId}
              onChange={(e) => setSelectedAlertId(e.target.value)}
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
              <option value="">-- No initial alert --</option>
              {availableAlerts.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.pattern.replace(/_/g, ' ')} ({a.severity} - Score {a.score})
                </option>
              ))}
            </select>
          </Field>
        </form>
      </Modal>
    </div>
  );
};

export default CasesListPage;
