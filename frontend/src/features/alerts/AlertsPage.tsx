import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Filter,
  Search,
  ArrowRight,
  ExternalLink,
  X,
  Briefcase,
} from 'lucide-react';
import { fetchAlerts, updateAlertTriage, Alert } from '../../api/alertsApi';
import { createCase, fetchCases, attachAlertToCase, CaseItem } from '../../api/casesApi';
import { SeverityBadge } from '../../components/SeverityBadge';
import { RiskBadge } from '../../components/RiskBadge';
import { TriageStatusBadge } from '../../components/TriageStatusBadge';

export const AlertsPage: React.FC = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);

  // Filters
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [filterPattern, setFilterPattern] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const res = await fetchAlerts({
        severity: filterSeverity !== 'ALL' ? filterSeverity : undefined,
        pattern: filterPattern !== 'ALL' ? filterPattern : undefined,
        triageStatus: filterStatus !== 'ALL' ? filterStatus : undefined,
      });
      setAlerts(res.alerts || []);
      if (selectedAlert) {
        const refreshed = res.alerts.find((a) => a._id === selectedAlert._id);
        if (refreshed) setSelectedAlert(refreshed);
      }
    } catch (err) {
      console.error('Failed to load alerts:', err);
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
    } catch (err: any) {
      alert(`Triage update failed: ${err.message || 'Unknown error'}`);
    }
  };

  // Case escalation modal state
  const [showCaseModal, setShowCaseModal] = useState(false);
  const [caseActionType, setCaseActionType] = useState<'create' | 'attach'>('create');
  const [newCaseTitle, setNewCaseTitle] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [openCases, setOpenCases] = useState<CaseItem[]>([]);
  const [submittingCase, setSubmittingCase] = useState(false);
  const [caseModalError, setCaseModalError] = useState<string | null>(null);

  const handleOpenCaseModal = async () => {
    setShowCaseModal(true);
    setNewCaseTitle(selectedAlert ? `Investigation into ${selectedAlert.pattern} alert (${selectedAlert.fingerprint.slice(0, 24)})` : '');
    setSelectedCaseId('');
    setCaseModalError(null);
    try {
      const res = await fetchCases({ status: 'OPEN' });
      const investigating = await fetchCases({ status: 'INVESTIGATING' });
      setOpenCases([...(res.cases || []), ...(investigating.cases || [])]);
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
    } catch (err: any) {
      setCaseModalError(err.error || 'Failed to link alert to case');
      setSubmittingCase(false);
    }
  };

  // Search filter
  const filteredAlerts = alerts.filter((a) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const patternMatch = a.pattern.toLowerCase().includes(term);
    const idMatch = a._id.toLowerCase().includes(term);
    const fpMatch = a.fingerprint.toLowerCase().includes(term);
    return patternMatch || idMatch || fpMatch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.65rem', fontWeight: 700, color: '#fff' }}>Alerts Triage Queue</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
          Prioritized fraud signals from the graph engine. Review evidence, inspect entity networks, and assign triage dispositions.
        </p>
      </div>

      {/* Filter Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          backgroundColor: 'var(--bg-card)',
          padding: '14px 18px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px' }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search alerts by pattern or fingerprint..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: '#fff',
              fontSize: '0.88rem',
              width: '100%',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Filter size={15} color="var(--text-muted)" />

          {/* Severity Filter */}
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 12px',
              fontSize: '0.82rem',
            }}
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Pattern Filter */}
          <select
            value={filterPattern}
            onChange={(e) => setFilterPattern(e.target.value)}
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 12px',
              fontSize: '0.82rem',
            }}
          >
            <option value="ALL">All Patterns</option>
            <option value="CIRCULAR_FLOW">Circular Flow</option>
            <option value="FAN_IN_FAN_OUT">Fan-In / Fan-Out</option>
            <option value="SHARED_DEVICE">Shared Device</option>
            <option value="PASS_THROUGH">Pass-Through</option>
            <option value="MERCHANT_CASHOUT">Merchant Cash-Out</option>
          </select>

          {/* Triage Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 12px',
              fontSize: '0.82rem',
            }}
          >
            <option value="ALL">All Triage Statuses</option>
            <option value="NEW">New</option>
            <option value="REVIEWING">Reviewing</option>
            <option value="ESCALATED">Escalated</option>
            <option value="DISMISSED">Dismissed</option>
          </select>
        </div>
      </div>

      {/* Main Grid: Alert List + Detail Inspector */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedAlert ? '1fr 480px' : '1fr', gap: '20px' }}>
        {/* Table of Alerts */}
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontWeight: 600 }}>Pattern</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontWeight: 600 }}>Severity</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontWeight: 600 }}>Risk Score</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontWeight: 600 }}>Fraud Ring</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 600 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No alerts found matching filter criteria.
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((alert) => {
                  const isSelected = selectedAlert?._id === alert._id;
                  const ringObj = typeof alert.ringId === 'object' && alert.ringId !== null ? alert.ringId : null;

                  return (
                    <tr
                      key={alert._id}
                      onClick={() => setSelectedAlert(alert)}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        backgroundColor: isSelected ? 'rgba(0, 210, 255, 0.06)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s',
                      }}
                    >
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#fff' }}>{alert.pattern.replace(/_/g, ' ')}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {alert.fingerprint.slice(0, 36)}...
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <SeverityBadge severity={alert.severity} size="sm" />
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <RiskBadge score={alert.score} size="sm" />
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        {ringObj ? (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/rings/${ringObj._id}`);
                            }}
                            style={{
                              color: 'var(--accent-cyan)',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span>{ringObj.label}</span>
                            <ExternalLink size={12} />
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>None</span>
                        )}
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <TriageStatusBadge status={alert.triageStatus} />
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAlert(alert);
                          }}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '4px',
                            backgroundColor: isSelected ? 'var(--accent-cyan)' : 'var(--bg-surface-elevated)',
                            color: isSelected ? '#000' : 'var(--text-primary)',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            border: '1px solid var(--border-color)',
                          }}
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Selected Alert Evidence Detail Inspector */}
        {selectedAlert && (
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              position: 'sticky',
              top: '88px',
              maxHeight: 'calc(100vh - 120px)',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
                    {selectedAlert.pattern.replace(/_/g, ' ')}
                  </h2>
                  <SeverityBadge severity={selectedAlert.severity} size="sm" />
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Alert ID: {selectedAlert._id}
                </div>
              </div>

              <button
                onClick={() => setSelectedAlert(null)}
                style={{ background: 'none', color: 'var(--text-muted)', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Score & Disposition Overview */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                padding: '14px',
                backgroundColor: 'var(--bg-surface-elevated)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Investigative Risk</span>
                <div style={{ marginTop: '4px' }}>
                  <RiskBadge score={selectedAlert.score} />
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Current Triage</span>
                <div style={{ marginTop: '4px' }}>
                  <TriageStatusBadge status={selectedAlert.triageStatus} />
                </div>
              </div>
            </div>

            {/* Triage Actions */}
            <div>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Update Triage Disposition:
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                <button
                  onClick={() => handleTriageAction('REVIEWING')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(234, 179, 8, 0.15)',
                    color: '#fde047',
                    border: '1px solid rgba(234, 179, 8, 0.4)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                  }}
                >
                  Mark Reviewing
                </button>
                <button
                  onClick={() => handleTriageAction('ESCALATED')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    color: '#fca5a5',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                  }}
                >
                  Escalate Case
                </button>
                <button
                  onClick={() => handleTriageAction('DISMISSED')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(148, 163, 184, 0.12)',
                    color: '#cbd5e1',
                    border: '1px solid rgba(148, 163, 184, 0.3)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                  }}
                >
                  Dismiss Alert
                </button>
              </div>
            </div>

            {/* Navigation Shortcuts: Linked Fraud Ring */}
            {selectedAlert.ringId && (
              <div
                style={{
                  padding: '12px',
                  backgroundColor: 'rgba(0, 210, 255, 0.08)',
                  border: '1px solid rgba(0, 210, 255, 0.25)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Coordinated Syndicate</span>
                  <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.92rem' }}>
                    {typeof selectedAlert.ringId === 'object' && selectedAlert.ringId !== null ? selectedAlert.ringId.label : 'Associated Ring'}
                  </div>
                </div>

                <button
                  onClick={() => {
                    const rId = typeof selectedAlert.ringId === 'object' && selectedAlert.ringId !== null ? selectedAlert.ringId._id : selectedAlert.ringId;
                    if (rId) navigate(`/rings/${rId}`);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: 'var(--accent-cyan)',
                    color: '#070a0f',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                  }}
                >
                  <span>Investigate Ring</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            )}

            {/* Case Escalation Action */}
            <div
              style={{
                padding: '12px',
                backgroundColor: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Investigation Workflow</span>
                <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.92rem' }}>
                  Case Management
                </div>
              </div>

              <button
                onClick={handleOpenCaseModal}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#6366f1',
                  color: '#fff',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: 'none',
                }}
              >
                <Briefcase size={14} />
                <span>Escalate to Case</span>
              </button>
            </div>

            {/* Evidence & Transaction Provenance */}
            <div>
              <h3 style={{ fontSize: '0.92rem', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>
                Transaction Provenance Evidence
              </h3>

              {selectedAlert.evidence?.transactions && selectedAlert.evidence.transactions.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedAlert.evidence.transactions.map((tx, idx) => (
                    <div
                      key={tx.externalTransactionId || idx}
                      style={{
                        padding: '10px 12px',
                        backgroundColor: 'var(--bg-surface-elevated)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)',
                        fontSize: '0.8rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                          {tx.externalTransactionId}
                        </span>
                        <span style={{ fontWeight: 700, color: '#fff' }}>${tx.amount.toLocaleString()}</span>
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '4px' }}>
                        {tx.fromAccount} → {tx.toAccount || tx.merchant || 'N/A'}
                        {tx.device ? ` · Device: ${tx.device}` : ''}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '2px' }}>
                        Timestamp: {tx.timestamp}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {JSON.stringify(selectedAlert.evidence, null, 2)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Case Escalation Modal */}
        {showCaseModal && selectedAlert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-indigo-400" />
                  Escalate Alert to Investigation Case
                </h3>
                <button
                  onClick={() => setShowCaseModal(false)}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {caseModalError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-xs">
                  {caseModalError}
                </div>
              )}

              {/* Action type tabs */}
              <div className="flex gap-2 p-1 bg-slate-950 rounded-lg border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setCaseActionType('create')}
                  className={`flex-1 py-1.5 font-semibold rounded transition-colors cursor-pointer ${
                    caseActionType === 'create'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Create New Case
                </button>
                <button
                  type="button"
                  onClick={() => setCaseActionType('attach')}
                  className={`flex-1 py-1.5 font-semibold rounded transition-colors cursor-pointer ${
                    caseActionType === 'attach'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Attach to Existing Case ({openCases.length})
                </button>
              </div>

              <form onSubmit={handleCaseSubmit} className="space-y-4">
                {caseActionType === 'create' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      New Case Title <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Investigation into suspicious coordinated cashout"
                      value={newCaseTitle}
                      onChange={(e) => setNewCaseTitle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Select Open Case <span className="text-rose-400">*</span>
                    </label>
                    {openCases.length === 0 ? (
                      <p className="text-xs text-amber-400 bg-amber-500/10 p-2.5 rounded border border-amber-500/20">
                        No active open cases found. Please create a new case instead.
                      </p>
                    ) : (
                      <select
                        value={selectedCaseId}
                        onChange={(e) => setSelectedCaseId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="">-- Choose active case --</option>
                        {openCases.map((oc) => (
                          <option key={oc._id} value={oc._id}>
                            [{oc.caseNumber}] {oc.title} ({oc.status})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 text-xs text-slate-400 space-y-1">
                  <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <span>Alert to be attached:</span>
                    <span className="font-mono text-indigo-400">[{selectedAlert.severity}] {selectedAlert.pattern}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">{selectedAlert.fingerprint}</p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowCaseModal(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingCase || (caseActionType === 'attach' && openCases.length === 0)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {submittingCase && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    {caseActionType === 'create' ? 'Create & Open Case' : 'Attach & Open Case'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
