import React, { useEffect, useState } from 'react';
import { fetchDataBatches, simulateData, uploadCSV, UploadCSVResponse, DataBatch } from '../../api/dataApi';
import { runAnalysis, AnalysisRunSummary } from '../../api/analysisApi';
import { Button } from '../../components/common/Button';
import buttonStyles from '../../components/common/Button.module.css';
import { Table, Column } from '../../components/common/Table';
import { StateView } from '../../components/common/StateView';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { Banner } from '../../components/Banner';
import { Icon } from '../../components/common/Icons';
import { CountUpText } from '../../components/motion/CountUpText';
import { getSocket, AnalysisProgressPayload, AnalysisCompletedPayload } from '../../lib/socket';
import { formatDateTime } from '../../lib/format';
import styles from './DataManagementPage.module.css';

export const DataManagementPage: React.FC = () => {
  const [batches, setBatches] = useState<DataBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // CSV upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadCSVResponse['batch'] | null>(null);

  // Simulation state
  const [generating, setGenerating] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  // Analysis run states
  const [isRunning, setIsRunning] = useState(false);
  const [runProgress, setRunProgress] = useState<string | null>(null);
  const [runSuccess, setRunSuccess] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  const loadBatches = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchDataBatches();
      setBatches(res.batches || []);
    } catch (err: unknown) {
      console.error('Failed to load data batches:', err);
      setError('Unable to load data batches from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBatches();
    const socket = getSocket();
    if (!socket) return;

    const handleStarted = () => {
      setIsRunning(true);
      setRunProgress('Running analysis...');
    };

    const handleProgress = (data: AnalysisProgressPayload) => {
      setIsRunning(true);
      if (data.stage === 'GRAPH_CONSTRUCTION') {
        setRunProgress(`Graph construction (${data.progress}% - ${data.nodeCount ?? 0} entities)`);
      } else if (data.stage === 'FRAUD_DETECTION') {
        setRunProgress(`Pattern detection (${data.progress}% - ${data.detectionCount ?? 0} patterns)`);
      } else if (data.stage === 'RING_GROUPING') {
        setRunProgress(`Ring clustering (${data.progress}% - ${data.ringCount ?? 0} rings)`);
      } else if (data.stage) {
        setRunProgress(`Stage: ${data.stage} (${data.progress}%)`);
      } else {
        setRunProgress('Running analysis...');
      }
    };

    const handleCompleted = (data: AnalysisCompletedPayload) => {
      setIsRunning(false);
      setRunProgress(null);
      const ringsCount = data?.summary?.totalRings ?? 'active';
      const alertsCount = data?.summary?.totalAlerts ?? '';
      setRunSuccess(`Analysis completed: ${ringsCount} rings, ${alertsCount} alerts.`);
      loadBatches();
      setTimeout(() => setRunSuccess(null), 7000);
    };

    socket.on('analysis-started', handleStarted);
    socket.on('analysis-progress', handleProgress);
    socket.on('analysis-completed', handleCompleted);

    return () => {
      socket.off('analysis-started', handleStarted);
      socket.off('analysis-progress', handleProgress);
      socket.off('analysis-completed', handleCompleted);
    };
  }, []);

  const handleSimulate = async () => {
    try {
      setGenerating(true);
      setStatusMsg(null);
      setGenError(null);
      const res = await simulateData('small', 42);
      const count = res.dataBatch?.recordCount || res.recordCount || 0;
      setStatusMsg(`Synthetic demo data generated. Ingested ${count} transactions.`);
      await loadBatches();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'error' in err) {
        setGenError((err as { error: string }).error);
      } else {
        setGenError('Failed to generate simulation batch.');
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleUploadCSV = async () => {
    if (!selectedFile) return;
    try {
      setUploading(true);
      setUploadError(null);
      setUploadResult(null);
      const text = await selectedFile.text();
      const res = await uploadCSV(text);
      setUploadResult(res.batch);
      setStatusMsg(
        `CSV batch ingested: ${res.batch.acceptedRows} accepted, ${res.batch.rejectedRows} rejected, ${res.batch.duplicateRows} duplicate.`
      );
      await loadBatches();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'error' in err) {
        setUploadError((err as { error: string }).error);
      } else {
        setUploadError('Failed to upload CSV file.');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleRunAnalysis = async () => {
    try {
      setIsRunning(true);
      setRunError(null);
      setRunSuccess(null);
      setRunProgress('Running analysis...');

      const response = await runAnalysis('DATA_INGEST');
      setIsRunning(false);
      setRunProgress(null);

      const summary: AnalysisRunSummary | undefined = response?.summary;
      const ringsCount = summary?.totalRings ?? 'active';
      const alertsCount = summary?.totalAlerts ?? '';
      setRunSuccess(`Analysis completed: ${ringsCount} rings, ${alertsCount} alerts.`);

      await loadBatches();

      setTimeout(() => {
        setRunSuccess(null);
      }, 7000);
    } catch (err: unknown) {
      setIsRunning(false);
      setRunProgress(null);
      if (err && typeof err === 'object' && 'error' in err) {
        setRunError((err as { error: string }).error);
      } else {
        setRunError('Analysis run failed.');
      }
    }
  };

  const totalRecords = batches.reduce((acc, b) => acc + (b.recordCount || 0), 0);
  const totalValid = batches.reduce((acc, b) => acc + (b.validCount || 0), 0);

  const columns: Column<DataBatch>[] = [
    {
      key: '_id',
      title: 'Batch ID',
      width: '180px',
      render: (item) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-2)' }}>
          {item._id}
        </span>
      ),
    },
    {
      key: 'source',
      title: 'Source',
      width: '120px',
      render: (item) => (
        <span style={{ fontWeight: 500, color: 'var(--text)' }}>
          {item.source === 'SIMULATION' ? 'Simulation' : 'CSV Upload'}
        </span>
      ),
    },
    {
      key: 'recordCount',
      title: 'Total Records',
      width: '110px',
      align: 'right',
      render: (item) => (
        <span className="tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>
          {item.acceptedRows ?? item.recordCount ?? item.totalRows ?? 0}
        </span>
      ),
    },
    {
      key: 'validCount',
      title: 'Valid Records',
      width: '110px',
      align: 'right',
      render: (item) => (
        <span className="tabular-nums" style={{ color: 'var(--sev-low)', fontFamily: 'var(--font-mono)' }}>
          {item.acceptedRows ?? item.validCount ?? 0}
        </span>
      ),
    },
    {
      key: 'duplicateCount',
      title: 'Duplicates',
      width: '100px',
      align: 'right',
      render: (item) => (
        <span className="tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>
          {item.duplicateRows ?? item.duplicateCount ?? 0}
        </span>
      ),
    },
    {
      key: 'createdAt',
      title: 'Timestamp',
      render: (item) => (
        <span className="tabular-nums" style={{ color: 'var(--text-2)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
          {formatDateTime(item.createdAt)}
        </span>
      ),
    },
  ];

  if (loading && batches.length === 0) {
    return <StateView type="loading" title="Loading data batches..." />;
  }

  if (error && batches.length === 0) {
    return <StateView type="error" title="Data error" description={error} onRetry={loadBatches} />;
  }

  return (
    <div className={styles.container}>
      <PageHeader
        kicker="07 — DATA MANAGEMENT"
        title="Data Management & Ingestion"
        subtitle="Review ingested transaction batches, synthetic evaluation generators, and provenance records."
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSimulate}
              disabled={generating}
            >
              <Icon name="plus" size={13} />
              <span>{generating ? 'Generating...' : 'Generate demo data'}</span>
            </Button>

            <Button variant="secondary" size="sm" onClick={loadBatches}>
              <Icon name="refresh" size={13} />
              <span>Refresh</span>
            </Button>
          </div>
        }
      />

      {statusMsg && <Banner variant="success">{statusMsg}</Banner>}
      {genError && <Banner variant="error">{genError}</Banner>}

      {/* CSV Ingestion */}
      <Card variant="default">
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
            CSV Ingestion &amp; Transaction Upload
          </h2>
          <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
            Direct batch ingestion via RFC-4180 CSV
          </span>
        </div>

        {/* Required CSV Schema Reference */}
        <div className={styles.schemaBox}>
          <span className={styles.schemaLabel}>Required CSV Columns</span>
          <div className={styles.schemaCols}>
            {['externalTransactionId', 'fromAccount', 'toAccount', 'merchant', 'device', 'amount', 'timestamp'].map((col) => (
              <span key={col} className={styles.colBadge}>{col}</span>
            ))}
          </div>
        </div>

        <div className={styles.uploadRow}>
          <label
            className={`${buttonStyles.btn} ${buttonStyles.secondary} ${buttonStyles.sm}`}
            style={{ cursor: 'pointer' }}
          >
            <Icon name="fileText" size={13} />
            <span>{selectedFile ? selectedFile.name : 'Choose CSV file'}</span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              style={{ display: 'none' }}
              aria-label="Choose CSV file"
            />
          </label>
          <Button
            variant="primary"
            size="sm"
            onClick={handleUploadCSV}
            disabled={!selectedFile || uploading}
          >
            <Icon name="play" size={13} />
            <span>{uploading ? 'Ingesting CSV...' : 'Upload & Ingest'}</span>
          </Button>
        </div>

        {uploading && (
          <div className={styles.uploadProgressBar}>
            <div className={styles.uploadProgressFill} />
          </div>
        )}

        {uploadError && <Banner variant="error">{uploadError}</Banner>}

        {/* Summary Count-Up on Upload Result */}
        {uploadResult && (
          <div className={styles.resultCard}>
            <h3 style={{ fontSize: '12px', fontWeight: 600, margin: 0 }}>Batch Ingestion Report</h3>
            <div className={styles.resultStats}>
              <div className={styles.metricBox}>
                <span className={styles.metricLabel}>Total Rows</span>
                <span className={styles.metricValue}>
                  <CountUpText value={uploadResult.totalRows} />
                </span>
              </div>
              <div className={styles.metricBox}>
                <span className={styles.metricLabel}>Accepted</span>
                <span className={styles.metricValue} style={{ color: 'var(--sev-low)' }}>
                  <CountUpText value={uploadResult.acceptedRows} />
                </span>
              </div>
              <div className={styles.metricBox}>
                <span className={styles.metricLabel}>Rejected</span>
                <span className={styles.metricValue} style={{ color: 'var(--sev-critical)' }}>
                  <CountUpText value={uploadResult.rejectedRows} />
                </span>
              </div>
              <div className={styles.metricBox}>
                <span className={styles.metricLabel}>Duplicates</span>
                <span className={styles.metricValue}>
                  <CountUpText value={uploadResult.duplicateRows} />
                </span>
              </div>
            </div>

            {uploadResult.errors && uploadResult.errors.length > 0 && (
              <div className={styles.errorTableWrapper}>
                <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-2)', textAlign: 'left' }}>
                      <th style={{ padding: '6px' }}>Row</th>
                      <th style={{ padding: '6px' }}>Transaction ID</th>
                      <th style={{ padding: '6px' }}>Error Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uploadResult.errors.map((err, idx) => (
                      <tr key={idx} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: '6px', fontFamily: 'var(--font-mono)' }}>{err.rowNumber ?? idx + 1}</td>
                        <td style={{ padding: '6px', fontFamily: 'var(--font-mono)' }}>{err.externalTransactionId || '—'}</td>
                        <td style={{ padding: '6px', color: 'var(--sev-critical)' }}>{err.reason || err.errors?.join(', ') || 'Validation error'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Engine Ingestion Metrics & Trigger */}
      <div className={styles.engineGrid}>
        <Card variant="default">
          <div style={{ marginBottom: 'var(--space-3)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
              Ingested Repository Metrics
            </h2>
            <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
              Total transaction ledger entries loaded into graph storage
            </span>
          </div>
          <div className={styles.engineMetrics}>
            <div className={styles.metricBox}>
              <span className={styles.metricLabel}>Total Batches</span>
              <span className={styles.metricValue}>{batches.length}</span>
            </div>
            <div className={styles.metricBox}>
              <span className={styles.metricLabel}>Total Records</span>
              <span className={styles.metricValue}>{totalRecords.toLocaleString()}</span>
            </div>
            <div className={styles.metricBox}>
              <span className={styles.metricLabel}>Valid Records</span>
              <span className={styles.metricValue} style={{ color: 'var(--sev-low)' }}>
                {totalValid.toLocaleString()}
              </span>
            </div>
          </div>
        </Card>

        <Card variant="default">
          <div className={styles.runBox}>
            <Button
              variant="primary"
              disabled={isRunning}
              onClick={handleRunAnalysis}
              fullWidth
            >
              <Icon name="play" size={13} />
              <span>{isRunning ? 'Analyzing...' : 'Run detection engine'}</span>
            </Button>
            {runProgress && <span className={styles.runProgressText}>{runProgress}</span>}
            {runSuccess && <span style={{ fontSize: '11px', color: 'var(--sev-low)' }}>{runSuccess}</span>}
            {runError && <span style={{ fontSize: '11px', color: 'var(--sev-critical)' }}>{runError}</span>}
          </div>
        </Card>
      </div>

      {/* Batches Table */}
      <Card variant="default">
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
            Batch Provenance History ({batches.length})
          </h2>
          <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
            Audit log of ingestion events and validation counts
          </span>
        </div>

        <Table
          columns={columns}
          data={batches}
          keyExtractor={(item) => item._id}
          emptyText="No transaction batches have been ingested."
        />
      </Card>
    </div>
  );
};

export default DataManagementPage;
