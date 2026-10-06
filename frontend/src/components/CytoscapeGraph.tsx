import React, { useEffect, useRef } from 'react';
import cytoscape, { Core, EventObject } from 'cytoscape';
import { GraphNodeData, GraphEdgeData } from '../api/graphApi';
import { graphTokens } from '../lib/tokens';
import { Icon } from './common/Icons';
import styles from './CytoscapeGraph.module.css';

interface CytoscapeGraphProps {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  onNodeClick?: (node: GraphNodeData) => void;
  onEdgeClick?: (edge: GraphEdgeData) => void;
  height?: string | number;
  highlightNodeId?: string;
}

export const CytoscapeGraph: React.FC<CytoscapeGraphProps> = ({
  nodes,
  edges,
  onNodeClick,
  onEdgeClick,
  height = '500px',
  highlightNodeId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Resolve color tokens from :root CSS variables via graphTokens helper
    const nodeAccountColor = graphTokens.nodeAccount;
    const nodeDeviceColor = graphTokens.nodeDevice;
    const nodeMerchantColor = graphTokens.nodeMerchant;
    const edgeDefaultColor = graphTokens.edgeDefault;
    const edgeSuspiciousColor = graphTokens.edgeSuspicious;
    const textPrimaryColor = graphTokens.textPrimary;
    const borderStrongColor = graphTokens.borderStrong;

    // Canonical ID mapping to prevent disconnected edge drops
    const idToCanonical = new Map<string, string>();

    nodes.forEach((n) => {
      const canonicalId = n.externalId || n.id || n.key;
      if (!canonicalId) return;

      idToCanonical.set(canonicalId, canonicalId);
      if (n.key) idToCanonical.set(n.key, canonicalId);
      if (n.externalId) idToCanonical.set(n.externalId, canonicalId);
      if (n.id) idToCanonical.set(n.id, canonicalId);
      if (n.mongoId) idToCanonical.set(n.mongoId, canonicalId);
      if (n.entityType && n.externalId) {
        idToCanonical.set(`${n.entityType}:${n.externalId}`, canonicalId);
      }
    });

    const cyElements: cytoscape.ElementDefinition[] = [];

    nodes.forEach((n) => {
      const canonicalId = n.externalId || n.id || n.key;
      if (!canonicalId) return;

      let color = nodeAccountColor;
      let shape: cytoscape.Css.NodeShape = 'ellipse';

      if (n.entityType === 'DEVICE') {
        color = nodeDeviceColor;
        shape = 'hexagon';
      } else if (n.entityType === 'MERCHANT') {
        color = nodeMerchantColor;
        shape = 'rectangle';
      }

      const isHighlight =
        highlightNodeId &&
        (n.externalId === highlightNodeId ||
          n.id === highlightNodeId ||
          canonicalId === highlightNodeId);

      cyElements.push({
        group: 'nodes',
        data: {
          id: canonicalId,
          label: n.externalId || n.id || canonicalId,
          entityType: n.entityType,
          color,
          shape,
          size: isHighlight ? 36 : 28,
          borderWidth: isHighlight ? 2 : 0,
          borderColor: borderStrongColor,
          raw: n,
        },
      });
    });

    edges.forEach((e) => {
      const sourceKey = (e as Record<string, unknown>).sourceKey as string | undefined;
      const targetKey = (e as Record<string, unknown>).targetKey as string | undefined;
      const resolvedSource = idToCanonical.get(e.source) || (sourceKey ? idToCanonical.get(sourceKey) : undefined);
      const resolvedTarget = idToCanonical.get(e.target) || (targetKey ? idToCanonical.get(targetKey) : undefined);

      if (!resolvedSource || !resolvedTarget) {
        return;
      }

      const isSuspicious =
        Boolean(e.isSuspicious) ||
        Boolean((e as Record<string, unknown>).alertId);

      cyElements.push({
        group: 'edges',
        data: {
          id: e.id || `${resolvedSource}->${resolvedTarget}`,
          source: resolvedSource,
          target: resolvedTarget,
          type: e.type,
          lineColor: isSuspicious ? edgeSuspiciousColor : edgeDefaultColor,
          lineWidth: isSuspicious ? 2 : 1.5,
          raw: e,
        },
      });
    });

    // Initialize cytoscape instance
    if (cyRef.current) {
      cyRef.current.destroy();
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements: cyElements,
      boxSelectionEnabled: false,
      autounselectify: false,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': 'data(color)',
            shape: 'data(shape)' as any,
            width: 'data(size)',
            height: 'data(size)',
            label: 'data(label)',
            'font-family': 'Inter, sans-serif',
            'font-size': '10px',
            'font-weight': 500,
            color: textPrimaryColor,
            'text-valign': 'bottom',
            'text-margin-y': 5,
            'border-width': 'data(borderWidth)',
            'border-color': 'data(borderColor)',
            'text-background-color': graphTokens.surface || 'white',
            'text-background-opacity': 0.8,
            'text-background-padding': '2px',
            'text-background-shape': 'roundrectangle',
          },
        },
        {
          selector: 'edge',
          style: {
            width: 'data(lineWidth)',
            'line-color': 'data(lineColor)',
            'target-arrow-color': 'data(lineColor)',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 0.8,
            opacity: 0.85,
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 2,
            'border-color': textPrimaryColor,
          },
        },
      ],
      layout: {
        name: 'cose',
        animate: false,
        nodeDimensionsIncludeLabels: true,
        randomize: false,
        nodeRepulsion: () => 6000,
        idealEdgeLength: () => 80,
      },
    });

    cy.on('tap', 'node', (evt: EventObject) => {
      const nodeData = evt.target.data('raw');
      if (nodeData && onNodeClick) {
        onNodeClick(nodeData);
      }
    });

    cy.on('tap', 'edge', (evt: EventObject) => {
      const edgeData = evt.target.data('raw');
      if (edgeData && onEdgeClick) {
        onEdgeClick(edgeData);
      }
    });

    cyRef.current = cy;

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [nodes, edges, highlightNodeId]);

  const handleZoomIn = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 1.25);
    }
  };

  const handleZoomOut = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 0.8);
    }
  };

  const handleFit = () => {
    if (cyRef.current) {
      cyRef.current.fit(undefined, 30);
    }
  };

  const handleReset = () => {
    if (cyRef.current) {
      cyRef.current.layout({ name: 'cose', animate: false }).run();
      cyRef.current.fit(undefined, 30);
    }
  };

  return (
    <div className={styles.wrapper} style={{ height }}>
      <div ref={containerRef} className={styles.cyContainer} />

      {/* Canvas Viewport Controls */}
      <div className={styles.controls} aria-label="Graph canvas navigation controls">
        <button className={styles.controlBtn} onClick={handleZoomIn} aria-label="Zoom in" title="Zoom in">
          <Icon name="zoomIn" size={14} />
        </button>
        <button className={styles.controlBtn} onClick={handleZoomOut} aria-label="Zoom out" title="Zoom out">
          <Icon name="zoomOut" size={14} />
        </button>
        <button className={styles.controlBtn} onClick={handleFit} aria-label="Fit to viewport" title="Fit to viewport">
          <Icon name="maximize" size={14} />
        </button>
        <button className={styles.controlBtn} onClick={handleReset} aria-label="Reset layout" title="Reset layout">
          <Icon name="refresh" size={14} />
        </button>
      </div>

      {/* Topology Legend */}
      <div className={styles.legendBox}>
        <div className={styles.legendItem}>
          <span className={styles.legendShapeCircle} />
          <span>Account</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendShapeHexagon} />
          <span>Device</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendShapeSquare} />
          <span>Merchant</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendLineSuspicious} />
          <span>Suspicious Edge</span>
        </div>
      </div>
    </div>
  );
};
