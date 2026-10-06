import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCases, createCase, CaseItem } from '../api/casesApi';
import { fetchAlerts, AlertItem } from '../api/alertsApi';
import { CaseStatusBadge } from '../components/CaseStatusBadge';
import { CaseDispositionBadge } from '../components/CaseDispositionBadge';
import { Button } from '../components/common/Button';
import { Table, Column } from '../components/common/Table';
import { StateView } from '../components/common/StateView';
import { Icon } from '../components/common/Icons';
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
        <span className="entity-id" style={{ color: 'var(--primary)', fontWeight: 600 }}>
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
      key: 'alertCount',
      title: 'Alerts',
      width: '80px',
      align: 'right',
      render: (c) => (
        <span className="tabular-nums">
          {c.alertCount !== undefined ? c.alertCount : '-'}
        </span>
      ),
    },
    {
      key: 'createdBy',
      title: 'Investigator',
      width: '130px',
      render: (c) => (
        <span style={{ color: 'var(--text-2)' }}>
          {c.createdBy?.name || 'Analyst'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      title: 'Created',
      width: '110px',
      render: (c) => (
        <span className="tabular-nums" style={{ color: 'var(--text-3)' }}>
          {new Date(c.createdAt).toLocaleDateString()}
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
          compact
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
      {/* Header */}
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>Cases Directory</h1>
          <p className={styles.subtitle}>
            Manage investigation cases, track assigned alert evidence, and record investigation dispositions.
          </p>
        </div>

        <Button variant="primary" compact onClick={openCreateModal}>
          <Icon name="plus" size={13} />
          <span>New case</span>
        </Button>
      </div>

      {/* Filter Bar */}
      <div className={styles.filterBar}>
        <div className={styles.searchBox}>
          <Icon name="search" size={14} />
          <input
            type="text"
            placeholder="Search by case number, title, or investigator..."
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
            aria-label="Filter by case status"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="INVESTIGATING">Investigating</option>
            <option value="CLOSED">Closed</option>
          </select>

          <select
            value={dispositionFilter}
            onChange={(e) => setDispositionFilter(e.target.value)}
            className={styles.select}
            aria-label="Filter by disposition"
          >
            <option value="ALL">All Dispositions</option>
            <option value="CONFIRMED_FRAUD">Confirmed Fraud</option>
            <option value="FALSE_POSITIVE">False Positive</option>
            <option value="INCONCLUSIVE">Inconclusive</option>
          </select>

          <Button variant="secondary" compact onClick={loadCases}>
            <Icon name="refresh" size={13} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Cases Table */}
      <div className={styles.card}>
        <Table
          columns={columns}
          data={filteredCases}
          keyExtractor={(c) => c._id}
          onRowClick={(c) => navigate(`/cases/${c._id}`)}
          emptyMessage="No cases found matching current filters."
        />
      </div>

      {/* Create Case Modal */}
      {showCreateModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Create New Investigation Case</h2>
              <Button variant="ghost" compact onClick={() => setShowCreateModal(false)} aria-label="Close modal">
                <Icon name="close" size={14} />
              </Button>
            </div>

            {createError && (
              <div style={{ color: 'var(--sev-high-text)', backgroundColor: 'var(--sev-high-bg)', padding: '8px 12px', borderRadius: '2px', fontSize: '11px' }}>
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className={styles.field}>
                <label htmlFor="caseTitle" className={styles.fieldLabel}>
                  Case Title *
                </label>
                <input
                  id="caseTitle"
                  type="text"
                  required
                  placeholder="e.g. Circular flow cluster investigation - Alpha"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className={styles.fieldInput}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="initialAlert" className={styles.fieldLabel}>
                  Attach Initial Alert (Optional)
                </label>
                <select
                  id="initialAlert"
                  value={selectedAlertId}
                  onChange={(e) => setSelectedAlertId(e.target.value)}
                  className={styles.select}
                  style={{ height: '32px' }}
                >
                  <option value="">-- No initial alert --</option>
                  {availableAlerts.map((a) => (
                    <option key={a._id} value={a._id}>
                      {a.pattern} (Score: {a.score}) - {a.fingerprint.slice(0, 16)}...
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.modalFooter}>
                <Button variant="secondary" compact type="button" onClick={() => setShowCreateModal(false)}>
                  <span>Cancel</span>
                </Button>
                <Button variant="primary" compact type="submit" disabled={creating}>
                  <span>{creating ? 'Creating...' : 'Create case'}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
