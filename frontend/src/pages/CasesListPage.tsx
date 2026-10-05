import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Search,
  Plus,
  ArrowRight,
  Clock,
  User,
  ShieldAlert,
  CheckCircle,
  AlertCircle,
  X,
  Filter,
} from 'lucide-react';
import {
  fetchCases,
  createCase,
  CaseItem,
} from '../api/casesApi';
import { fetchAlerts, AlertItem } from '../api/alertsApi';
import { CaseStatusBadge } from '../components/CaseStatusBadge';
import { CaseDispositionBadge } from '../components/CaseDispositionBadge';

export const CasesListPage: React.FC = () => {
  const navigate = useNavigate();
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dispositionFilter, setDispositionFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Create Case Modal
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [selectedAlertId, setSelectedAlertId] = useState<string>('');
  const [availableAlerts, setAvailableAlerts] = useState<AlertItem[]>([]);
  const [creating, setCreating] = useState<boolean>(false);
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
    } catch (err: any) {
      setError(err.error || 'Failed to load cases');
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
    } catch (err: any) {
      setCreateError(err.error || 'Failed to create case');
      setCreating(false);
    }
  };

  const filteredCases = cases.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.caseNumber.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      c.createdBy?.name?.toLowerCase().includes(q)
    );
  });

  const kpis = {
    total: cases.length,
    open: cases.filter((c) => c.status === 'OPEN').length,
    investigating: cases.filter((c) => c.status === 'INVESTIGATING').length,
    closed: cases.filter((c) => c.status === 'CLOSED').length,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Briefcase size={26} color="var(--accent-cyan)" />
            <h1 style={{ fontSize: '1.65rem', fontWeight: 700, color: '#fff' }}>Case Management</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Track, investigate, and resolve fraud cases with complete audit accountability.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 18px',
            background: 'var(--accent-gradient)',
            color: '#070a0f',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.86rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: 'var(--shadow-glow)',
          }}
        >
          <Plus size={16} />
          Create New Case
        </button>
      </div>

      {/* KPI Stats Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Cases
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#fff', marginTop: '4px' }}>
            {kpis.total}
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid rgba(0, 210, 255, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 600, color: '#00d2ff', textTransform: 'uppercase' }}>
            <AlertCircle size={14} /> Open
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#00d2ff', marginTop: '4px' }}>
            {kpis.open}
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid rgba(255, 171, 0, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 600, color: '#ffab00', textTransform: 'uppercase' }}>
            <Clock size={14} /> Investigating
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#ffab00', marginTop: '4px' }}>
            {kpis.investigating}
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid rgba(0, 230, 118, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 600, color: '#00e676', textTransform: 'uppercase' }}>
            <CheckCircle size={14} /> Closed
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#00e676', marginTop: '4px' }}>
            {kpis.closed}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          backgroundColor: 'var(--bg-surface)',
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
        }}
      >
        {/* Status Filters */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['ALL', 'OPEN', 'INVESTIGATING', 'CLOSED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                backgroundColor: statusFilter === st ? 'var(--accent-blue)' : 'rgba(255, 255, 255, 0.04)',
                color: statusFilter === st ? '#fff' : 'var(--text-secondary)',
                border: statusFilter === st ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                transition: 'all 0.15s ease',
              }}
            >
              {st === 'ALL' ? 'All Statuses' : st}
            </button>
          ))}
        </div>

        {/* Search & Disposition Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px' }} />
            <input
              type="text"
              placeholder="Search case # or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                padding: '6px 12px 6px 30px',
                fontSize: '0.82rem',
                width: '220px',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={14} color="var(--text-muted)" />
            <select
              value={dispositionFilter}
              onChange={(e) => setDispositionFilter(e.target.value)}
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 12px',
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              <option value="ALL">All Dispositions</option>
              <option value="CONFIRMED_FRAUD">Confirmed Fraud</option>
              <option value="FALSE_POSITIVE">False Positive</option>
              <option value="INCONCLUSIVE">Inconclusive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cases Table */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading investigation cases...
          </div>
        ) : error ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--danger)' }}>
            <p>{error}</p>
            <button
              onClick={loadCases}
              style={{
                marginTop: '12px',
                padding: '6px 12px',
                backgroundColor: 'var(--bg-surface-elevated)',
                color: '#fff',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
              }}
            >
              Retry
            </button>
          </div>
        ) : filteredCases.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Briefcase size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
            <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              No cases match your filters
            </p>
            <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>
              Create a new case or adjust status and disposition filters.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
              <thead>
                <tr
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    borderBottom: '1px solid var(--border-color)',
                    color: 'var(--text-muted)',
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  <th style={{ padding: '12px 18px' }}>Case #</th>
                  <th style={{ padding: '12px 18px' }}>Title</th>
                  <th style={{ padding: '12px 18px' }}>Status</th>
                  <th style={{ padding: '12px 18px' }}>Disposition</th>
                  <th style={{ padding: '12px 18px' }}>Alerts</th>
                  <th style={{ padding: '12px 18px' }}>Created By</th>
                  <th style={{ padding: '12px 18px' }}>Created Time</th>
                  <th style={{ padding: '12px 18px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredCases.map((c) => (
                  <tr
                    key={c._id}
                    onClick={() => navigate(`/cases/${c._id}`)}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '14px 18px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                      {c.caseNumber}
                    </td>
                    <td style={{ padding: '14px 18px', fontWeight: 600, color: '#fff', maxWidth: '320px' }}>
                      {c.title}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <CaseStatusBadge status={c.status} />
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <CaseDispositionBadge disposition={c.disposition} />
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'rgba(255, 171, 0, 0.12)',
                          color: '#ffab00',
                          border: '1px solid rgba(255, 171, 0, 0.3)',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                        }}
                      >
                        <ShieldAlert size={12} />
                        {c.alertCount || 0}
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <User size={13} color="var(--text-muted)" />
                        <span>{c.createdBy?.name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 18px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      {new Date(c.createdAt).toLocaleDateString()} {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: 'var(--accent-cyan)',
                          fontWeight: 600,
                          fontSize: '0.8rem',
                        }}
                      >
                        Investigate <ArrowRight size={13} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Case Modal */}
      {showCreateModal && (
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
              maxWidth: '520px',
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
                <Briefcase size={20} color="var(--accent-cyan)" />
                Create Investigation Case
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ backgroundColor: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {createError && (
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
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Case Title <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Investigation into Circular Flow Pattern in Ring 002"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    padding: '9px 12px',
                    fontSize: '0.86rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Initial Alert to Attach (Optional)
                </label>
                <select
                  value={selectedAlertId}
                  onChange={(e) => setSelectedAlertId(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    padding: '9px 12px',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">-- No initial alert (Empty case) --</option>
                  {availableAlerts.map((a) => (
                    <option key={a._id} value={a._id}>
                      [{a.severity}] {a.pattern} - Score: {a.score} ({a.fingerprint.slice(0, 32)}...)
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Alerts can also be attached at any time from the Alert Queue or Case Workspace.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
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
                  disabled={creating}
                  style={{
                    padding: '8px 18px',
                    background: 'var(--accent-gradient)',
                    color: '#070a0f',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    opacity: creating ? 0.6 : 1,
                  }}
                >
                  {creating ? 'Creating...' : 'Create Case'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
