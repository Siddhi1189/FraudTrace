import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchRings, FraudRing } from '../../api/ringsApi';
import { RiskBadge } from '../../components/RiskBadge';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Table, Column } from '../../components/common/Table';
import { StateView } from '../../components/common/StateView';
import { Icon } from '../../components/common/Icons';
import styles from './RingsListPage.module.css';

export const RingsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [rings, setRings] = useState<FraudRing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('ACTIVE');

  const loadRings = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchRings(statusFilter !== 'ALL' ? statusFilter : undefined);
      setRings(res.rings || []);
    } catch (err: unknown) {
      console.error('Failed to load rings:', err);
      setError('Unable to load fraud rings from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRings();
  }, [statusFilter]);

  const columns: Column<FraudRing>[] = [
    {
      key: 'label',
      title: 'Ring Label',
      width: '140px',
      render: (item) => (
        <span style={{ fontWeight: 600, color: 'var(--text)' }}>
          {item.label}
        </span>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      width: '100px',
      render: (item) => (
        <Badge variant={item.status === 'ACTIVE' ? 'high' : 'neutral'}>
          {item.status}
        </Badge>
      ),
    },
    {
      key: 'score',
      title: 'Score',
      width: '70px',
      render: (item) => <RiskBadge score={item.score} />,
    },
    {
      key: 'patterns',
      title: 'Detected Patterns',
      render: (item) => (
        <div className={styles.patternList}>
          {item.patterns.map((p) => (
            <span key={p} className={styles.patternChip}>
              {p.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'memberCount',
      title: 'Members',
      width: '90px',
      align: 'right',
      render: (item) => (
        <span className="tabular-nums">
          {item.memberCount || 0}
        </span>
      ),
    },
    {
      key: 'totalFlow',
      title: 'Coordinated Flow',
      width: '130px',
      align: 'right',
      render: (item) => (
        <span className="tabular-nums" style={{ fontWeight: 500 }}>
          ${Number(item.totalFlow || 0).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'transactionCount',
      title: 'Transactions',
      width: '100px',
      align: 'right',
      render: (item) => (
        <span className="tabular-nums">
          {item.transactionCount || 0}
        </span>
      ),
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
            navigate(`/rings/${item._id}`);
          }}
          aria-label="View fraud ring workspace"
        >
          <span>View</span>
        </Button>
      ),
    },
  ];

  if (loading && rings.length === 0) {
    return <StateView type="loading" title="Loading fraud rings directory..." />;
  }

  if (error && rings.length === 0) {
    return <StateView type="error" title="Fraud rings error" description={error} onRetry={loadRings} />;
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>Fraud Rings</h1>
          <p className={styles.subtitle}>
            Coordinated multi-entity fraud networks grouped from related detector findings without evidence double-counting.
          </p>
        </div>

        <div className={styles.filterBar}>
          <Icon name="filter" size={14} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={styles.select}
            aria-label="Filter rings by status"
          >
            <option value="ACTIVE">Active Rings</option>
            <option value="DISSOLVED">Dissolved / Historical</option>
            <option value="ALL">All Rings</option>
          </select>

          <Button variant="secondary" compact onClick={loadRings}>
            <Icon name="refresh" size={13} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Rings Table */}
      <div className={styles.card}>
        <Table
          columns={columns}
          data={rings}
          keyExtractor={(item) => item._id}
          onRowClick={(item) => navigate(`/rings/${item._id}`)}
          emptyMessage="No fraud rings found for current status filter."
        />
      </div>
    </div>
  );
};
