import React, { useEffect, useState } from 'react';
import { fetchDataBatches, simulateData, uploadCSV, UploadCSVResponse, DataBatch } from '../../api/dataApi';
import { runAnalysis, AnalysisRunSummary } from '../../api/analysisApi';
import { Button } from '../../components/common/Button';
import { Table, Column } from '../../components/common/Table';
import { StateView } from '../../components/common/StateView';
import { Icon } from '../../components/common/Icons';
import { getSocket, AnalysisProgressPayload, AnalysisCompletedPayload } from '../../lib/socket';
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
        <span className="entity-id">{item._id}</span>
      ),
    },
    {
      key: 'source',
      title: 'Source',
      width: '120px',
      render: (item) => (
        <span style={{ fontWeight: 600, color: 'var(--text)' }}>
          {item.source === 'SIMULATION' ? 'Simulation' : 'CSV Upload'}
        </span>
      ),
    },
    {
      key: 'recordCount',
      title: 'Total Records',
      width: '110px',
      align: 'right',
      render: (item) => <span className="tabular-nums">{item.recordCount}</span>,
    },
    {
      key: 'validCount',
      title: 'Valid Records',
      width: '110px',
      align: 'right',
      render: (item) => (
        <span className="tabular-nums" style={{ color: 'var(--sev-low-text)' }}>
          {item.validCount}
        </span>
      ),
    },
    {
      key: 'duplicateCount',
      title: 'Duplicates',
      width: '100px',
      align: 'right',
      render: (item) => <span className="tabular-nums">{item.duplicateCount}</span>,
    },
    {
      key: 'createdAt',
      title: 'Timestamp',
      render: (item) => (
        <span className="tabular-nums" style={{ color: 'var(--text-2)' }}>
          {new Date(item.createdAt).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
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
      {/* Header */}
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>Data Management &amp; Ingestion</h1>
          <p className={styles.subtitle}>
            Review ingested transaction batches, synthetic evaluation generators, and provenance records.
          </p>
        </div>

        <div className={styles.actionsArea}>
          <Button
            variant="primary"
            compact
            onClick={handleSimulate}
            disabled={generating}
          >
            <Icon name="plus" size={13} />
            <span>{generating ? 'Generating...' : 'Generate demo data'}</span>
          </Button>

          <Button variant="secondary" compact onClick={loadBatches}>
            <Icon name="refresh" size={13} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {statusMsg && (
        <div className={styles.bannerSuccess} role="status">
          <Icon name="check" size={14} />
          <span>{statusMsg}</span>
        </div>
      )}

      {genError && (
        <div className={styles.bannerError} role="alert">
          <Icon name="close" size={14} />
          <span>{genError}</span>
        </div>
      )}

      {/* CSV Transaction Upload */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>CSV Ingestion &amp; Transaction Upload</h2>
          <span className={styles.cardSubtitle}>
            Direct batch ingestion via RFC-4180 CSV
          </span>
        </div>

        {/* Documented Columns Reference */}
        <div className={styles.schemaBox}>
          <span className={styles.schemaLabel}>Required CSV Columns</span>
          <div className={styles.schemaCols}>
            {['externalTransactionId', 'fromAccount', 'toAccount', 'merchant', 'device', 'amount', 'timestamp'].map((col) => (
              <span key={col} className={styles.colBadge}>{col}</span>
            ))}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
            Destination rule: exactly one of <code>toAccount</code> or <code>merchant</code> must be populated per row.
          </span>
        </div>

        {/* Upload Controls */}
        <div className={styles.uploadRow}>
          <input
            type="file"
            accept=".csv,text/csv,text/plain"
            onChange={(e) => {
              setSelectedFile(e.target.files?.[0] || null);
              setUploadError(null);
            }}
            className={styles.uploadInput}
            aria-label="Select CSV file for upload"
          />

          <Button
            variant="primary"
            compact
            onClick={handleUploadCSV}
            disabled={!selectedFile || uploading}
          >
            <Icon name="plus" size={13} />
            <span>{uploading ? 'Uploading...' : 'Upload CSV'}</span>
          </Button>

          {selectedFile && (
            <Button
              variant="ghost"
              compact
              onClick={() => {
                setSelectedFile(null);
                setUploadResult(null);
                setUploadError(null);
              }}
            >
              <span>Clear</span>
            </Button>
          )}
        </div>

        {uploadError && (
          <div className={styles.bannerError} role="alert">
            <Icon name="close" size={14} />
            <span>{uploadError}</span>
          </div>
        )}

        {/* Real Response Details */}
        {uploadResult && (
          <div className={styles.resultCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>
                Upload Result &amp; Validation Summary (Batch: {uploadResult._id})
              </span>
              <Button
                variant="ghost"
                compact
                onClick={() => setUploadResult(null)}
                aria-label="Dismiss result"
              >
                <Icon name="close" size={13} />
              </Button>
            </div>

            <div className={styles.resultStats}>
              <div className={styles.metricBox}>
                <span className={styles.metricLabel}>Total Rows</span>
                <span className={styles.metricValue}>{uploadResult.totalRows}</span>
              </div>
              <div className={styles.metricBox}>
                <span className={styles.metricLabel}>Accepted Rows</span>
                <span className={styles.metricValue} style={{ color: 'var(--sev-low-text)' }}>
                  {uploadResult.acceptedRows}
                </span>
              </div>
              <div className={styles.metricBox}>
                <span className={styles.metricLabel}>Rejected Rows</span>
                <span className={styles.metricValue} style={{ color: uploadResult.rejectedRows > 0 ? 'var(--sev-high-text)' : 'inherit' }}>
                  {uploadResult.rejectedRows}
                </span>
              </div>
              <div className={styles.metricBox}>
                <span className={styles.metricLabel}>Duplicate Rows</span>
                <span className={styles.metricValue} style={{ color: uploadResult.duplicateRows > 0 ? 'var(--sev-medium-text)' : 'inherit' }}>
                  {uploadResult.duplicateRows}
                </span>
              </div>
            </div>

            {/* Row Errors from Real Response */}
            {uploadResult.errors && uploadResult.errors.length > 0 ? (
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--sev-high-text)', display: 'block', marginBottom: '6px' }}>
                  Row Validation Errors ({uploadResult.errors.length}):
                </span>
                <div className={styles.errorTableWrapper}>
                  <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                        <th style={{ padding: '6px 8px', width: '60px' }}>Row</th>
                        <th style={{ padding: '6px 8px', width: '140px' }}>Transaction ID</th>
                        <th style={{ padding: '6px 8px' }}>Reason / Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uploadResult.errors.map((err, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)' }}>
                            {err.rowNumber ?? '-'}
                          </td>
                          <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)' }}>
                            {err.externalTransactionId || '-'}
                          </td>
                          <td style={{ padding: '6px 8px', color: 'var(--sev-high-text)' }}>
                            {Array.isArray(err.errors) ? err.errors.join('; ') : (err.reason || 'Validation error')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <span style={{ fontSize: '11px', color: 'var(--sev-low-text)' }}>
                All rows validated successfully with zero schema rejections.
              </span>
            )}
          </div>
        )}
      </div>

      {/* Analysis Engine & Status */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Graph State &amp; Analysis Execution</h2>
          <span className={styles.cardSubtitle}>Trigger detection across active batches</span>
        </div>

        <div className={styles.engineGrid}>
          <div className={styles.engineMetrics}>
            <div className={styles.metricBox}>
              <span className={styles.metricLabel}>Total Batches</span>
              <span className={styles.metricValue}>{batches.length}</span>
            </div>
            <div className={styles.metricBox}>
              <span className={styles.metricLabel}>Total Ingested Records</span>
              <span className={styles.metricValue}>{totalRecords}</span>
            </div>
            <div className={styles.metricBox}>
              <span className={styles.metricLabel}>Valid Graph Edges</span>
              <span className={styles.metricValue}>{totalValid}</span>
            </div>
          </div>

          <div className={styles.runBox}>
            <Button
              variant="primary"
              compact
              onClick={handleRunAnalysis}
              disabled={isRunning}
              fullWidth
            >
              <Icon name="refresh" size={13} />
              <span>{isRunning ? 'Analyzing graph...' : 'Run analysis'}</span>
            </Button>

            {runProgress && (
              <span className={styles.runProgressText}>{runProgress}</span>
            )}

            {runSuccess && (
              <div className={styles.bannerSuccess} style={{ padding: '4px 8px' }}>
                {runSuccess}
              </div>
            )}

            {runError && (
              <div className={styles.bannerError} style={{ padding: '4px 8px' }}>
                {runError}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Batches Table */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Ingested Batches</h2>
          <span className={styles.cardSubtitle}>Audit history of data feeds</span>
        </div>

        <Table
          columns={columns}
          data={batches}
          keyExtractor={(item) => item._id}
          emptyMessage="No data batches found. Click 'Generate demo data' or upload a CSV to seed transactions."
        />
      </div>
    </div>
  );
};
