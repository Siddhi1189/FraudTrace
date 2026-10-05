import React, { useEffect, useRef } from 'react';
import cytoscape, { Core, EventObject } from 'cytoscape';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw } from 'lucide-react';
import { GraphNodeData, GraphEdgeData } from '../api/graphApi';

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

    // Transform nodes and edges into Cytoscape elements format
    const cyElements: cytoscape.ElementDefinition[] = [];

    // Map all identifier variants to a single canonical node ID
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

    nodes.forEach((n) => {
      const canonicalId = n.externalId || n.id || n.key;
      if (!canonicalId) return;

      let color = '#38bdf8'; // Blue for Account
      let shape: cytoscape.Css.NodeShape = 'ellipse';

      if (n.entityType === 'DEVICE') {
        color = '#c084fc'; // Purple for Device
        shape = 'diamond';
      } else if (n.entityType === 'MERCHANT') {
        color = '#34d399'; // Emerald for Merchant
        shape = 'round-rectangle';
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
          color: isHighlight ? '#ff007f' : color,
          shape,
          size: isHighlight ? 44 : 34,
          raw: n,
        },
      });
    });

    edges.forEach((e, idx) => {
      const sourceKey = (e as any).sourceKey;
      const targetKey = (e as any).targetKey;
      const resolvedSource = idToCanonical.get(e.source) || (sourceKey ? idToCanonical.get(sourceKey) : undefined);
      const resolvedTarget = idToCanonical.get(e.target) || (targetKey ? idToCanonical.get(targetKey) : undefined);

      // Only add edge if both endpoints exist in the node set
      if (!resolvedSource || !resolvedTarget) {
        return;
      }

      let lineColor = 'rgba(148, 163, 184, 0.4)';
      let lineStyle: cytoscape.Css.LineStyle = 'solid';

      if (e.type === 'TRANSFER') {
        lineColor = 'rgba(56, 189, 248, 0.6)';
      } else if (e.type === 'PAYMENT') {
        lineColor = 'rgba(52, 211, 153, 0.6)';
      } else if (e.type === 'USED_DEVICE') {
        lineColor = 'rgba(192, 132, 252, 0.5)';
        lineStyle = 'dashed';
      }

      cyElements.push({
        group: 'edges',
        data: {
          id: e.id || `${resolvedSource}->${resolvedTarget}:${idx}`,
          source: resolvedSource,
          target: resolvedTarget,
          type: e.type,
          amount: e.amount,
          timestamp: e.timestamp,
          externalTransactionId: e.externalTransactionId,
          lineColor,
          lineStyle,
          raw: e,
        },
      });
    });

    // Initialize Cytoscape core
    const cy = cytoscape({
      container: containerRef.current,
      elements: cyElements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': 'data(color)',
            label: 'data(label)',
            'font-family': 'JetBrains Mono, monospace',
            'font-size': '11px',
            color: '#f8fafc',
            'text-valign': 'bottom',
            'text-margin-y': 6,
            'text-outline-color': '#0a0d14',
            'text-outline-width': 2,
            width: 'data(size)',
            height: 'data(size)',
            shape: 'data(shape)' as any,
            'border-width': 2,
            'border-color': 'rgba(255, 255, 255, 0.3)',
            'transition-property': 'background-color, border-color, border-width, width, height',
            'transition-duration': 0.2,
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 4,
            'border-color': '#00d2ff',
            'background-color': '#38bdf8',
          },
        },
        {
          selector: 'edge',
          style: {
            width: 2,
            'line-color': 'data(lineColor)',
            'target-arrow-color': 'data(lineColor)',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 1.2,
            'line-style': 'data(lineStyle)' as any,
            opacity: 0.85,
          },
        },
        {
          selector: 'edge:selected',
          style: {
            width: 4,
            'line-color': '#00d2ff',
            'target-arrow-color': '#00d2ff',
            opacity: 1,
          },
        },
      ],
      layout: {
        name: 'cose',
        animate: true,
        animationDuration: 500,
        nodeDimensionsIncludeLabels: true,
        randomize: false,
        componentSpacing: 100,
        nodeRepulsion: () => 450000,
        idealEdgeLength: () => 80,
      } as any,
      minZoom: 0.2,
      maxZoom: 3,
    });

    // Node click handler
    cy.on('tap', 'node', (evt: EventObject) => {
      const node = evt.target;
      const rawData = node.data('raw');
      if (onNodeClick) onNodeClick(rawData);
    });

    // Edge click handler
    cy.on('tap', 'edge', (evt: EventObject) => {
      const edge = evt.target;
      const rawData = edge.data('raw');
      if (onEdgeClick) onEdgeClick(rawData);
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [nodes, edges, highlightNodeId]);

  const handleZoomIn = () => {
    cyRef.current?.zoom(cyRef.current.zoom() * 1.25);
  };

  const handleZoomOut = () => {
    cyRef.current?.zoom(cyRef.current.zoom() * 0.8);
  };

  const handleFit = () => {
    cyRef.current?.fit(undefined, 30);
  };

  const handleResetLayout = () => {
    cyRef.current
      ?.layout({
        name: 'cose',
        animate: true,
        animationDuration: 400,
      } as any)
      .run();
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height,
        backgroundColor: '#070a0f',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        border: '1px solid var(--border-color)',
      }}
    >
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Floating Graph Controls */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          padding: '6px',
          zIndex: 10,
        }}
      >
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          style={{
            background: 'none',
            color: '#94a3b8',
            padding: '6px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ZoomIn size={16} />
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          style={{
            background: 'none',
            color: '#94a3b8',
            padding: '6px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ZoomOut size={16} />
        </button>
        <button
          onClick={handleFit}
          title="Fit Graph"
          style={{
            background: 'none',
            color: '#94a3b8',
            padding: '6px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Maximize2 size={16} />
        </button>
        <button
          onClick={handleResetLayout}
          title="Recalculate Layout"
          style={{
            background: 'none',
            color: '#94a3b8',
            padding: '6px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {/* Legend */}
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          display: 'flex',
          gap: '12px',
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          padding: '6px 12px',
          fontSize: '0.75rem',
          color: '#cbd5e1',
          zIndex: 10,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#38bdf8' }} /> Account
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: 10, height: 10, transform: 'rotate(45deg)', background: '#c084fc' }} /> Device
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: 10, height: 10, borderRadius: '2px', background: '#34d399' }} /> Merchant
        </span>
      </div>
    </div>
  );
};
