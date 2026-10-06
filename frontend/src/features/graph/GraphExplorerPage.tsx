import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchNeighborhood, GraphNodeData, GraphEdgeData } from '../../api/graphApi';
import { CytoscapeGraph } from '../../components/CytoscapeGraph';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Icon } from '../../components/common/Icons';
import { StateView } from '../../components/common/StateView';
import { PageHeader } from '../../components/PageHeader';
import { FilterBar } from '../../components/FilterBar';
import { formatCurrency, formatDateTime } from '../../lib/format';
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
      <PageHeader
        kicker="04 — GRAPH EXPLORER"
        title="Graph Explorer"
        subtitle="Explore the in-memory financial network. Expand neighborhoods, trace funds between accounts, and uncover shared infrastructure."
        actions={
          <Button variant="secondary" size="sm" onClick={() => handleSearch()}>
            <Icon name="refresh" size={13} />
            <span>Reload view</span>
          </Button>
        }
      />

      <FilterBar>
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
            aria-label="Entity limit"
          >
            <option value={25}>Limit: 25</option>
            <option value={50}>Limit: 50</option>
            <option value={100}>Limit: 100</option>
          </select>

          <Button variant="primary" size="sm" onClick={() => handleSearch()}>
            <span>Query Neighborhood</span>
          </Button>
        </div>
      </FilterBar>

      <div className={styles.workspaceGrid}>
        <div className={styles.canvasCard}>
          <div className={styles.canvasTopBar}>
            <div>
              <span>Active Neighborhood: </span>
              <strong>{nodes.length}</strong> entities, <strong>{edges.length}</strong> relationships
            </div>
            <div className={styles.nodeLimitNote}>
              <span>Cap: 300 visible nodes max</span>
            </div>
          </div>

          <div className={styles.canvasWrapper}>
            {loading && (
              <div style={{ position: 'absolute', inset: 0, zIndex: 10, background: 'var(--bg)', opacity: 0.85, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <StateView type="loading" title="Traversing in-memory graph..." />
              </div>
            )}
            {error && !loading && nodes.length === 0 && (
              <div style={{ position: 'absolute', inset: 0, zIndex: 10, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <StateView type="error" title="No matching nodes" description={error} />
              </div>
            )}

            <CytoscapeGraph
              nodes={nodes}
              edges={edges}
              selectedNodeId={selectedNode?.id}
              selectedEdgeId={selectedEdge?.id}
              onNodeClick={handleNodeClick}
              onEdgeClick={handleEdgeClick}
            />
          </div>
        </div>

        <aside className={styles.inspectorCard} aria-label="Entity Inspector">
          <div className={styles.inspectorHeader}>
            <span className={styles.inspectorTitle}>Entity Inspector</span>
            {selectedNode && (
              <Badge variant={selectedNode.entityType === 'ACCOUNT' ? 'neutral' : 'medium'}>
                {selectedNode.entityType}
              </Badge>
            )}
            {selectedEdge && <Badge variant="high">{selectedEdge.type}</Badge>}
          </div>

          {selectedNode ? (
            <div className={styles.attributeList}>
              <div className={styles.attributeItem}>
                <span className={styles.attributeLabel}>External Identifier</span>
                <span className={styles.attributeValue}>{selectedNode.externalId}</span>
              </div>

              <div className={styles.attributeItem}>
                <span className={styles.attributeLabel}>Internal Mongo ID</span>
                <span className={styles.attributeValue} style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                  {selectedNode.mongoId}
                </span>
              </div>

              <div className={styles.attributeItem}>
                <span className={styles.attributeLabel}>Entity Type</span>
                <span className={styles.attributeValue}>{selectedNode.entityType}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
                <Button
                  variant="secondary"
                  compact
                  onClick={() => handleExpandFromNode(selectedNode)}
                >
                  <Icon name="search" size={12} />
                  <span>Expand from this entity</span>
                </Button>

                {selectedNode.entityType === 'ACCOUNT' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate(`/accounts/${selectedNode.mongoId || selectedNode.externalId}`)}
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
                <span className={styles.attributeValue}>{selectedEdge.source}</span>
              </div>

              <div className={styles.attributeItem}>
                <span className={styles.attributeLabel}>Target</span>
                <span className={styles.attributeValue}>{selectedEdge.target}</span>
              </div>

              {selectedEdge.amount !== undefined && (
                <div className={styles.attributeItem}>
                  <span className={styles.attributeLabel}>Transaction Amount</span>
                  <span className="tabular-nums" style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                    {formatCurrency(selectedEdge.amount)}
                  </span>
                </div>
              )}

              {selectedEdge.timestamp && (
                <div className={styles.attributeItem}>
                  <span className={styles.attributeLabel}>Timestamp</span>
                  <span className="tabular-nums" style={{ fontSize: '11px', color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>
                    {formatDateTime(selectedEdge.timestamp)}
                  </span>
                </div>
              )}

              {selectedEdge.externalTransactionId && (
                <div className={styles.attributeItem}>
                  <span className={styles.attributeLabel}>Transaction ID</span>
                  <span className={styles.attributeValue}>{selectedEdge.externalTransactionId}</span>
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

export default GraphExplorerPage;
