import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchNeighborhood, GraphNodeData, GraphEdgeData } from '../../api/graphApi';
import { CytoscapeGraph } from '../../components/CytoscapeGraph';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Icon } from '../../components/common/Icons';
import { StateView } from '../../components/common/StateView';
import styles from './GraphExplorerPage.module.css';

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

  const handleSearch = async (targetId?: string) => {
    const queryId = targetId || searchEntityId;
    if (!queryId.trim()) return;

    try {
      setLoading(true);
      setError(null);
      setSelectedNode(null);
      setSelectedEdge(null);

      const res = await fetchNeighborhood({
        entityId: queryId.trim(),
        entityType: entityType !== 'ALL' ? (entityType as any) : undefined,
        depth,
        limit,
      });

      setNodes(res.nodes || []);
      setEdges(res.edges || []);

      if (res.nodes.length === 0) {
        setError(`No graph nodes found matching entity "${queryId}".`);
      } else {
        const central = res.nodes.find(
          (n) => n.externalId.toLowerCase() === queryId.trim().toLowerCase()
        );
        if (central) setSelectedNode(central);
      }
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'error' in err) {
        setError((err as { error: string }).error);
      } else {
        setError('Failed to query graph neighborhood.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleSearch();
  }, []);

  const handleNodeClick = (node: GraphNodeData) => {
    setSelectedNode(node);
    setSelectedEdge(null);
  };

  const handleEdgeClick = (edge: GraphEdgeData) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
  };

  const handleExpandFromNode = (node: GraphNodeData) => {
    setSearchEntityId(node.externalId);
    handleSearch(node.externalId);
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>Graph Explorer</h1>
          <p className={styles.subtitle}>
            Explore the in-memory financial network. Expand neighborhoods, trace funds between accounts, and uncover shared infrastructure.
          </p>
        </div>

        <Button variant="secondary" compact onClick={() => handleSearch()}>
          <Icon name="refresh" size={13} />
          <span>Reload view</span>
        </Button>
      </div>

      {/* Query Bar */}
      <div className={styles.filterBar}>
        <div className={styles.searchBox}>
          <Icon name="search" size={14} />
          <input
            type="text"
            placeholder="Enter Entity ID (e.g. ACC-HUB-ALPHA, DEV-RING-SHARED-1)..."
            value={searchEntityId}
            onChange={(e) => setSearchEntityId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className={styles.searchInput}
            aria-label="Search entity ID"
          />
        </div>

        <div className={styles.controlsGroup}>
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            className={styles.select}
            aria-label="Filter entity type"
          >
            <option value="ALL">All Types</option>
            <option value="ACCOUNT">Account</option>
            <option value="DEVICE">Device</option>
            <option value="MERCHANT">Merchant</option>
          </select>

          <select
            value={depth}
            onChange={(e) => setDepth(Number(e.target.value))}
            className={styles.select}
            aria-label="Neighborhood depth"
          >
            <option value={1}>Depth: 1 Hop</option>
            <option value={2}>Depth: 2 Hops</option>
          </select>

          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className={styles.select}
            aria-label="Node limit"
          >
            <option value={25}>Limit: 25</option>
            <option value={50}>Limit: 50</option>
            <option value={100}>Limit: 100</option>
          </select>

          <Button variant="primary" compact onClick={() => handleSearch()} disabled={loading}>
            <span>{loading ? 'Querying...' : 'Trace'}</span>
          </Button>
        </div>
      </div>

      {error && (
        <div style={{ color: 'var(--sev-high-text)', backgroundColor: 'var(--sev-high-bg)', border: '1px solid var(--sev-high-border)', padding: '8px 12px', borderRadius: '2px', fontSize: '12px' }}>
          {error}
        </div>
      )}

      {/* Main Workspace: Canvas + Right-Hand Inspector */}
      <div className={styles.workspaceGrid}>
        <div className={styles.canvasCard}>
          <div className={styles.canvasTopBar}>
            <span>
              Topology View: {nodes.length} nodes, {edges.length} edges
            </span>
            <span className={styles.nodeLimitNote}>
              Expansion limited to {limit} nodes for responsiveness.
            </span>
          </div>

          <div className={styles.canvasWrapper}>
            {loading ? (
              <StateView type="loading" title="Querying network neighborhood..." />
            ) : nodes.length === 0 ? (
              <StateView
                type="empty"
                title="No nodes in graph view"
                description="Query an entity ID above to render its connected financial network."
              />
            ) : (
              <CytoscapeGraph
                nodes={nodes}
                edges={edges}
                onNodeClick={handleNodeClick}
                onEdgeClick={handleEdgeClick}
                highlightNodeId={selectedNode?.externalId}
                height="100%"
              />
            )}
          </div>
        </div>

        {/* Right-Hand Inspector */}
        <aside className={styles.inspectorCard} aria-label="Entity inspector">
          <div className={styles.inspectorHeader}>
            <span className={styles.inspectorTitle}>Inspector</span>
            {selectedNode && (
              <Badge variant={selectedNode.entityType === 'ACCOUNT' ? 'neutral' : 'medium'}>
                {selectedNode.entityType}
              </Badge>
            )}
            {selectedEdge && (
              <Badge variant="neutral">{selectedEdge.type}</Badge>
            )}
          </div>

          {selectedNode ? (
            <div className={styles.attributeList}>
              <div className={styles.attributeItem}>
                <span className={styles.attributeLabel}>Identifier</span>
                <span className="entity-id">{selectedNode.externalId}</span>
              </div>

              <div className={styles.attributeItem}>
                <span className={styles.attributeLabel}>Entity Type</span>
                <span className={styles.attributeValue}>{selectedNode.entityType}</span>
              </div>

              {selectedNode.metadata && Object.keys(selectedNode.metadata).length > 0 && (
                <div className={styles.attributeItem}>
                  <span className={styles.attributeLabel}>Attributes</span>
                  <div style={{ fontSize: '11px', color: 'var(--text-2)', background: 'var(--surface-2)', padding: '6px 8px', borderRadius: '2px' }}>
                    {Object.entries(selectedNode.metadata).map(([k, v]) => (
                      <div key={k}><strong>{k}:</strong> {String(v)}</div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                <Button
                  variant="secondary"
                  compact
                  onClick={() => handleExpandFromNode(selectedNode)}
                  fullWidth
                >
                  <Icon name="maximize" size={12} />
                  <span>Expand neighborhood</span>
                </Button>

                {selectedNode.entityType === 'ACCOUNT' && (
                  <Button
                    variant="primary"
                    compact
                    onClick={() => navigate(`/accounts/${selectedNode.mongoId || selectedNode.externalId}`)}
                    fullWidth
                  >
                    <Icon name="user" size={12} />
                    <span>View account workspace</span>
                  </Button>
                )}
              </div>
            </div>
          ) : selectedEdge ? (
            <div className={styles.attributeList}>
              <div className={styles.attributeItem}>
                <span className={styles.attributeLabel}>Relationship Type</span>
                <span className={styles.attributeValue}>{selectedEdge.type}</span>
              </div>

              <div className={styles.attributeItem}>
                <span className={styles.attributeLabel}>Source</span>
                <span className="entity-id">{selectedEdge.source}</span>
              </div>

              <div className={styles.attributeItem}>
                <span className={styles.attributeLabel}>Target</span>
                <span className="entity-id">{selectedEdge.target}</span>
              </div>

              {selectedEdge.amount !== undefined && (
                <div className={styles.attributeItem}>
                  <span className={styles.attributeLabel}>Transaction Amount</span>
                  <span className="tabular-nums" style={{ fontSize: '13px', fontWeight: 700 }}>
                    ${Number(selectedEdge.amount).toLocaleString()}
                  </span>
                </div>
              )}

              {selectedEdge.timestamp && (
                <div className={styles.attributeItem}>
                  <span className={styles.attributeLabel}>Timestamp</span>
                  <span className="tabular-nums" style={{ fontSize: '11px', color: 'var(--text-2)' }}>
                    {new Date(selectedEdge.timestamp).toLocaleString()}
                  </span>
                </div>
              )}

              {selectedEdge.externalTransactionId && (
                <div className={styles.attributeItem}>
                  <span className={styles.attributeLabel}>Transaction ID</span>
                  <span className="entity-id">{selectedEdge.externalTransactionId}</span>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.emptyInspector}>
              Select any node or edge on the network canvas to inspect attributes and connections.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
