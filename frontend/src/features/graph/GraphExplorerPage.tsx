import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { fetchNeighborhood, GraphNodeData, GraphEdgeData } from '../../api/graphApi';
import { CytoscapeGraph } from '../../components/CytoscapeGraph';

export const GraphExplorerPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchEntityId, setSearchEntityId] = useState('ACC-HUB-ALPHA');
  const [entityType, setEntityType] = useState<string>('ALL');
  const [depth, setDepth] = useState<number>(1);
  const [limit, setLimit] = useState<number>(50);

  const [nodes, setNodes] = useState<GraphNodeData[]>([]);
  const [edges, setEdges] = useState<GraphEdgeData[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNodeData | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdgeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchEntityId.trim()) return;

    try {
      setLoading(true);
      setError(null);
      setSelectedNode(null);
      setSelectedEdge(null);

      const res = await fetchNeighborhood({
        entityId: searchEntityId.trim(),
        entityType: entityType !== 'ALL' ? (entityType as any) : undefined,
        depth,
        limit,
      });

      setNodes(res.nodes || []);
      setEdges(res.edges || []);

      if (res.nodes.length === 0) {
        setError(`No graph nodes found matching entity "${searchEntityId}".`);
      } else {
        // Automatically select the central queried node if found
        const central = res.nodes.find(
          (n) => n.externalId.toLowerCase() === searchEntityId.trim().toLowerCase()
        );
        if (central) setSelectedNode(central);
      }
    } catch (err: any) {
      setError(err.error || err.message || 'Failed to query graph neighborhood');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleSearch();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h1 style={{ fontSize: '1.65rem', fontWeight: 700, color: '#fff' }}>Graph Explorer</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
          Explore the in-memory financial network. Expand neighborhoods, trace funds between accounts, and uncover shared infrastructure.
        </p>
      </div>

      {/* Control Bar */}
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
            placeholder="Enter Entity ID (e.g. ACC-HUB-ALPHA, DEV-RING-SHARED-1)..."
            value={searchEntityId}
            onChange={(e) => setSearchEntityId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: '#fff',
              fontSize: '0.88rem',
              width: '100%',
              fontFamily: 'var(--font-mono)',
            }}
          />
        </div>

        {/* Entity Type Filter */}
        <select
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 12px',
            fontSize: '0.82rem',
          }}
        >
          <option value="ALL">All Entity Types</option>
          <option value="ACCOUNT">Accounts Only</option>
          <option value="DEVICE">Devices Only</option>
          <option value="MERCHANT">Merchants Only</option>
        </select>

        {/* Depth Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          <span>Depth:</span>
          <select
            value={depth}
            onChange={(e) => setDepth(Number(e.target.value))}
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 10px',
              fontSize: '0.82rem',
            }}
          >
            <option value={1}>1 Hop</option>
            <option value={2}>2 Hops</option>
            <option value={3}>3 Hops</option>
          </select>
        </div>

        {/* Limit Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          <span>Limit:</span>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 10px',
              fontSize: '0.82rem',
            }}
          >
            <option value={25}>25 nodes</option>
            <option value={50}>50 nodes</option>
            <option value={100}>100 nodes (Max)</option>
          </select>
        </div>

        <button
          onClick={handleSearch}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'var(--accent-cyan)',
            color: '#070a0f',
            padding: '7px 16px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.84rem',
            fontWeight: 700,
          }}
        >
          <RefreshCw size={14} className={loading ? 'spin-animate' : ''} />
          <span>Explore</span>
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-sm)',
            color: '#fca5a5',
            fontSize: '0.85rem',
          }}
        >
          {error}
        </div>
      )}

      {/* Main Canvas and Inspector Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedNode || selectedEdge ? '1fr 380px' : '1fr', gap: '20px' }}>
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
          }}
        >
          <CytoscapeGraph
            nodes={nodes}
            edges={edges}
            height="620px"
            highlightNodeId={searchEntityId}
            onNodeClick={(node) => {
              setSelectedNode(node);
              setSelectedEdge(null);
            }}
            onEdgeClick={(edge) => {
              setSelectedEdge(edge);
              setSelectedNode(null);
            }}
          />
        </div>

        {/* Selected Entity / Edge Inspector Panel */}
        {(selectedNode || selectedEdge) && (
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
          >
            {selectedNode && (
              <>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor:
                          selectedNode.entityType === 'ACCOUNT'
                            ? 'rgba(56, 189, 248, 0.15)'
                            : selectedNode.entityType === 'DEVICE'
                            ? 'rgba(192, 132, 252, 0.15)'
                            : 'rgba(52, 211, 153, 0.15)',
                        color:
                          selectedNode.entityType === 'ACCOUNT'
                            ? '#38bdf8'
                            : selectedNode.entityType === 'DEVICE'
                            ? '#c084fc'
                            : '#34d399',
                      }}
                    >
                      {selectedNode.entityType}
                    </span>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)' }}>
                      {selectedNode.externalId}
                    </h3>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Internal Mongo ID: {selectedNode.mongoId}
                  </div>
                </div>

                {selectedNode.entityType === 'ACCOUNT' && (
                  <button
                    onClick={() => navigate(`/accounts/${selectedNode.mongoId || selectedNode.externalId}`)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '10px 16px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--accent-cyan)',
                      color: '#070a0f',
                      fontWeight: 700,
                      fontSize: '0.84rem',
                    }}
                  >
                    <span>Open Account Profile</span>
                    <ExternalLink size={14} />
                  </button>
                )}

                <button
                  onClick={() => {
                    setSearchEntityId(selectedNode.externalId);
                    handleSearch();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-surface-elevated)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                  }}
                >
                  <RefreshCw size={14} />
                  <span>Center Graph on Node</span>
                </button>
              </>
            )}

            {selectedEdge && (
              <>
                <div>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(0, 210, 255, 0.15)',
                      color: 'var(--accent-cyan)',
                    }}
                  >
                    {selectedEdge.type}
                  </span>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginTop: '6px' }}>
                    Relationship Details
                  </h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.84rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>From:</span>
                    <span style={{ color: '#fff', fontFamily: 'var(--font-mono)' }}>{selectedEdge.source}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>To:</span>
                    <span style={{ color: '#fff', fontFamily: 'var(--font-mono)' }}>{selectedEdge.target}</span>
                  </div>
                  {selectedEdge.amount !== null && selectedEdge.amount !== undefined && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Amount:</span>
                      <span style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>
                        ${selectedEdge.amount.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {selectedEdge.externalTransactionId && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Transaction ID:</span>
                      <span style={{ color: '#fff', fontFamily: 'var(--font-mono)' }}>
                        {selectedEdge.externalTransactionId}
                      </span>
                    </div>
                  )}
                  {selectedEdge.timestamp && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Timestamp:</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{selectedEdge.timestamp}</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
