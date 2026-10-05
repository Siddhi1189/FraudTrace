import React, { useEffect, useState } from 'react';
import { Play, CheckCircle2 } from 'lucide-react';
import { fetchDataBatches, simulateData, DataBatch } from '../../api/dataApi';

export const DataManagementPage: React.FC = () => {
  const [batches, setBatches] = useState<DataBatch[]>([]);
  const [, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const loadBatches = async () => {
    try {
      setLoading(true);
      const res = await fetchDataBatches();
      setBatches(res.batches || []);
    } catch (err) {
      console.error('Failed to load batches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBatches();
  }, []);

  const handleSimulate = async () => {
    try {
      setGenerating(true);
      setStatusMsg(null);
      const res = await simulateData('small', 42);
      setStatusMsg(`Synthetic demo data generated! Ingested ${res.dataBatch?.recordCount || 0} transactions.`);
      await loadBatches();
    } catch (err: any) {
      alert(`Simulation failed: ${err.message || 'Unknown error'}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 700, color: '#fff' }}>Data Management & Ingestion</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Review ingested transaction batches, synthetic evaluation generators, and provenance records.
          </p>
        </div>

        <button
          onClick={handleSimulate}
          disabled={generating}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--accent-cyan)',
            color: '#070a0f',
            padding: '8px 16px',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 700,
            fontSize: '0.84rem',
            opacity: generating ? 0.7 : 1,
          }}
        >
          <Play size={16} fill="currentColor" />
          <span>{generating ? 'Seeding Data...' : 'Generate Demo Data'}</span>
        </button>
      </div>

      {statusMsg && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-sm)',
            color: '#34d399',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle2 size={16} />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Batches Table */}
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#fff' }}>Ingested Batches</h2>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
          <thead>
            <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>Batch ID</th>
              <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>Source</th>
              <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>Record Count</th>
              <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>Valid Records</th>
              <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>Duplicates Skipped</th>
              <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {batches.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No data batches found. Click "Generate Demo Data" to seed transactions.
                </td>
              </tr>
            ) : (
              batches.map((batch) => (
                <tr key={batch._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                    {batch._id}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#fff', fontWeight: 600 }}>
                    {batch.source}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#fff' }}>
                    {batch.recordCount}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#34d399' }}>
                    {batch.validCount}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                    {batch.duplicateCount}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                    {batch.createdAt}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
