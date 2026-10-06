import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useVisibilityPause } from '../../hooks/useVisibilityPause';
import { getToken } from '../../lib/tokens';
import { Button } from '../../components/common/Button';
import styles from './PlaygroundCanvas.module.css';

interface NodeItem {
  id: string;
  type: 'account' | 'device' | 'merchant';
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  ringId?: number; // 1: cycle, 2: hub, 3: shared-device
  flagged: boolean;
  traced: boolean;
  label: string;
}

interface EdgeItem {
  source: string;
  target: string;
  ringId?: number;
  active: boolean;
  traced: boolean;
}

export const PlaygroundCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isReduced = useReducedMotion();
  const isPausedByVisibility = useVisibilityPause(containerRef);

  const [isPaused, setIsPaused] = useState(false);
  const [flaggedCount, setFlaggedCount] = useState(0);
  const [tracedRings, setTracedRings] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<{ message: string; isShake: boolean } | null>(null);

  const nodesRef = useRef<NodeItem[]>([]);
  const edgesRef = useRef<EdgeItem[]>([]);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({ x: -1000, y: -1000, active: false });
  const animFrameRef = useRef<number | null>(null);

  // Initialize nodes and edges
  const initGraph = useCallback(() => {
    const width = containerRef.current?.clientWidth || 800;
    const height = 480;

    const nodes: NodeItem[] = [];
    const edges: EdgeItem[] = [];

    // Helper to spawn node
    const addNode = (
      id: string,
      type: 'account' | 'device' | 'merchant',
      label: string,
      ringId?: number,
      baseX?: number,
      baseY?: number
    ): NodeItem => {
      const x = baseX !== undefined ? baseX : Math.random() * (width - 120) + 60;
      const y = baseY !== undefined ? baseY : Math.random() * (height - 120) + 60;
      const angle = Math.random() * Math.PI * 2;
      const speed = isReduced ? 0 : 0.25 + Math.random() * 0.2;
      const node: NodeItem = {
        id,
        type,
        label,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: type === 'account' ? 9 : type === 'device' ? 10 : 11,
        ringId,
        flagged: false,
        traced: false,
      };
      nodes.push(node);
      return node;
    };

    // Planted Ring 1: Circular Flow (3-cycle)
    const c1 = addNode('CF_1', 'account', 'MULE_01', 1, width * 0.2, height * 0.3);
    const c2 = addNode('CF_2', 'account', 'MULE_02', 1, width * 0.28, height * 0.2);
    const c3 = addNode('CF_3', 'account', 'MULE_03', 1, width * 0.25, height * 0.45);
    edges.push(
      { source: c1.id, target: c2.id, ringId: 1, active: false, traced: false },
      { source: c2.id, target: c3.id, ringId: 1, active: false, traced: false },
      { source: c3.id, target: c1.id, ringId: 1, active: false, traced: false }
    );

    // Planted Ring 2: Fan-In / Fan-Out Hub
    const hub = addNode('HUB_1', 'account', 'DISP_01', 2, width * 0.5, height * 0.5);
    const in1 = addNode('IN_1', 'account', 'SRC_A', 2, width * 0.42, height * 0.35);
    const in2 = addNode('IN_2', 'account', 'SRC_B', 2, width * 0.44, height * 0.65);
    const out1 = addNode('OUT_1', 'account', 'SNK_A', 2, width * 0.58, height * 0.35);
    const out2 = addNode('OUT_2', 'account', 'SNK_B', 2, width * 0.56, height * 0.65);
    edges.push(
      { source: in1.id, target: hub.id, ringId: 2, active: false, traced: false },
      { source: in2.id, target: hub.id, ringId: 2, active: false, traced: false },
      { source: hub.id, target: out1.id, ringId: 2, active: false, traced: false },
      { source: hub.id, target: out2.id, ringId: 2, active: false, traced: false }
    );

    // Planted Ring 3: Shared Device (1 device shared by 3 accounts)
    const dev = addNode('DEV_1', 'device', 'HW_TERM', 3, width * 0.78, height * 0.35);
    const a1 = addNode('SH_1', 'account', 'ACC_X', 3, width * 0.72, height * 0.22);
    const a2 = addNode('SH_2', 'account', 'ACC_Y', 3, width * 0.85, height * 0.24);
    const a3 = addNode('SH_3', 'account', 'ACC_Z', 3, width * 0.82, height * 0.48);
    edges.push(
      { source: a1.id, target: dev.id, ringId: 3, active: false, traced: false },
      { source: a2.id, target: dev.id, ringId: 3, active: false, traced: false },
      { source: a3.id, target: dev.id, ringId: 3, active: false, traced: false }
    );

    // Legitimate Near-Misses (benign linear transfers or 2 accounts sharing a device)
    const nmDev = addNode('NM_DEV', 'device', 'HW_BENIGN', undefined, width * 0.15, height * 0.75);
    const nmA1 = addNode('NM_A1', 'account', 'BEN_A', undefined, width * 0.1, height * 0.7);
    const nmA2 = addNode('NM_A2', 'account', 'BEN_B', undefined, width * 0.2, height * 0.8);
    edges.push(
      { source: nmA1.id, target: nmDev.id, active: false, traced: false },
      { source: nmA2.id, target: nmDev.id, active: false, traced: false }
    );

    const nmL1 = addNode('NM_L1', 'account', 'NORM_1', undefined, width * 0.85, height * 0.75);
    const nmL2 = addNode('NM_L2', 'merchant', 'MERCH_OK', undefined, width * 0.75, height * 0.8);
    edges.push({ source: nmL1.id, target: nmL2.id, active: false, traced: false });

    // Remaining background noise nodes to reach ~36 total nodes
    const noiseCount = 36 - nodes.length;
    for (let i = 0; i < noiseCount; i++) {
      const type: 'account' | 'device' | 'merchant' = i % 4 === 0 ? 'merchant' : i % 3 === 0 ? 'device' : 'account';
      const n = addNode(`BG_${i}`, type, `ID_${i + 10}`);
      // Connect sparsely
      if (i > 0 && Math.random() < 0.4) {
        const target = nodes[Math.floor(Math.random() * (nodes.length - 1))];
        if (target.id !== n.id && !target.ringId) {
          edges.push({ source: n.id, target: target.id, active: false, traced: false });
        }
      }
    }

    nodesRef.current = nodes;
    edgesRef.current = edges;
    setFlaggedCount(0);
    setTracedRings([]);
    setFeedback(null);
  }, [isReduced]);

  // Handle Resize and Init
  useEffect(() => {
    initGraph();

    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = 480 * dpr;
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [initGraph]);

  // Main Render and Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;

    const render = () => {
      if (!isRunning) return;

      const container = containerRef.current;
      if (!container) return;
      const width = container.clientWidth;
      const height = 480;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Colors from document tokens
      // Colors from document tokens via getToken helper (no hex literals in code)
      const textCol = getToken('--text');
      const text3Col = getToken('--text-3');
      const borderCol = getToken('--border');
      const nodeAccCol = getToken('--node-account');
      const nodeDevCol = getToken('--node-device');
      const nodeMerCol = getToken('--node-merchant');
      const edgeSuspCol = getToken('--edge-suspicious');
      const bgDotCol = getToken('--graph-grid-dot');

      // Subtle background grid dots
      ctx.fillStyle = bgDotCol;
      const gridGap = 32;
      for (let x = gridGap; x < width; x += gridGap) {
        for (let y = gridGap; y < height; y += gridGap) {
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      const nodes = nodesRef.current;
      const edges = edgesRef.current;
      const mouse = mouseRef.current;

      // Update positions if not paused and not reduced motion
      const shouldMove = !isPaused && !isPausedByVisibility && !isReduced;

      if (shouldMove) {
        for (const n of nodes) {
          n.x += n.vx;
          n.y += n.vy;

          // Wall collision
          if (n.x < n.radius + 10) {
            n.x = n.radius + 10;
            n.vx *= -1;
          } else if (n.x > width - n.radius - 10) {
            n.x = width - n.radius - 10;
            n.vx *= -1;
          }
          if (n.y < n.radius + 10) {
            n.y = n.radius + 10;
            n.vy *= -1;
          } else if (n.y > height - n.radius - 10) {
            n.y = height - n.radius - 10;
            n.vy *= -1;
          }

          // Gentle mouse repulsion (within 90px)
          if (mouse.active) {
            const dx = n.x - mouse.x;
            const dy = n.y - mouse.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 90 && dist > 1) {
              const force = (90 - dist) / 90;
              n.x += (dx / dist) * force * 1.5;
              n.y += (dy / dist) * force * 1.5;
            }
          }
        }
      }

      // Draw Edges
      for (const e of edges) {
        const src = nodes.find((n) => n.id === e.source);
        const tgt = nodes.find((n) => n.id === e.target);
        if (!src || !tgt) continue;

        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);

        if (e.traced) {
          ctx.strokeStyle = edgeSuspCol;
          ctx.lineWidth = 2.5;
          ctx.setLineDash([]);
        } else if (e.active) {
          ctx.strokeStyle = edgeSuspCol;
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
        } else {
          ctx.strokeStyle = borderCol;
          ctx.lineWidth = 1;
          ctx.setLineDash([]);
        }
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Draw Nodes
      for (const n of nodes) {
        ctx.save();
        ctx.translate(n.x, n.y);

        // Fill color based on type
        let col = nodeAccCol;
        if (n.type === 'device') col = nodeDevCol;
        if (n.type === 'merchant') col = nodeMerCol;

        if (n.traced) {
          col = edgeSuspCol;
        }

        ctx.fillStyle = col;
        ctx.strokeStyle = n.flagged || n.traced ? edgeSuspCol : textCol;
        ctx.lineWidth = n.flagged || n.traced ? 2 : 1;

        if (n.type === 'account') {
          // Circle
          ctx.beginPath();
          ctx.arc(0, 0, n.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else if (n.type === 'device') {
          // Hexagon
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = (i * Math.PI) / 3;
            const hx = Math.cos(a) * n.radius;
            const hy = Math.sin(a) * n.radius;
            if (i === 0) ctx.moveTo(hx, hy);
            else ctx.lineTo(hx, hy);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else {
          // Merchant: Square
          ctx.beginPath();
          const r = n.radius * 0.9;
          ctx.rect(-r, -r, r * 2, r * 2);
          ctx.fill();
          ctx.stroke();
        }

        // Active/Traced halo
        if (n.flagged || n.traced) {
          ctx.beginPath();
          ctx.arc(0, 0, n.radius + 4, 0, Math.PI * 2);
          ctx.strokeStyle = edgeSuspCol;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Mini Label
        ctx.fillStyle = text3Col;
        ctx.font = '9px var(--font-mono, monospace)';
        ctx.textAlign = 'center';
        ctx.fillText(n.label, 0, n.radius + 12);

        ctx.restore();
      }

      ctx.restore();

      if (!isPaused && !isPausedByVisibility) {
        animFrameRef.current = requestAnimationFrame(render);
      }
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPaused, isPausedByVisibility, isReduced]);

  // Click Handler on Canvas
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const clickedNode = nodesRef.current.find((n) => {
      const dist = Math.hypot(n.x - clickX, n.y - clickY);
      return dist <= n.radius + 6;
    });

    if (!clickedNode) return;

    // Flag node
    if (!clickedNode.flagged) {
      clickedNode.flagged = true;
      setFlaggedCount((prev) => prev + 1);
    }

    // Propagate wave along edges in 80ms steps
    triggerWave(clickedNode);
  };

  const triggerWave = (startNode: NodeItem) => {
    const ringId = startNode.ringId;
    const relatedEdges = edgesRef.current.filter(
      (e) => e.source === startNode.id || e.target === startNode.id
    );

    // Turn edges active
    relatedEdges.forEach((e) => {
      e.active = true;
    });

    if (ringId && !tracedRings.includes(ringId)) {
      // It's part of a planted ring!
      setTimeout(() => {
        // Complete the ring
        const ringNodes = nodesRef.current.filter((n) => n.ringId === ringId);
        const ringEdges = edgesRef.current.filter((e) => e.ringId === ringId);
        ringNodes.forEach((n) => {
          n.flagged = true;
          n.traced = true;
        });
        ringEdges.forEach((e) => {
          e.active = false;
          e.traced = true;
        });

        setTracedRings((prev) => [...prev, ringId]);
        const names: Record<number, string> = {
          1: 'Circular Flow pattern traced',
          2: 'Fan-In / Fan-Out pattern traced',
          3: 'Shared Device syndicate traced',
        };
        setFeedback({ message: names[ringId] || 'Fraud ring traced', isShake: false });
      }, 160);
    } else if (!ringId) {
      // Legitimate near-miss or noise
      setTimeout(() => {
        relatedEdges.forEach((e) => {
          e.active = false;
        });
        setFeedback({
          message: 'Looks legitimate — 2-person device sharing is benign (no ring)',
          isShake: true,
        });
      }, 120);
    }
  };

  // Trace Next Ring Button (keyboard/touch auto-solve)
  const handleTraceNext = () => {
    const untraced = [1, 2, 3].find((id) => !tracedRings.includes(id));
    if (!untraced) return;

    const targetNode = nodesRef.current.find((n) => n.ringId === untraced);
    if (targetNode) {
      targetNode.flagged = true;
      setFlaggedCount((prev) => prev + 1);
      triggerWave(targetNode);
    }
  };

  // Reset
  const handleReset = () => {
    initGraph();
  };

  const isCompleted = tracedRings.length >= 3;

  return (
    <div className={styles.container}>
      {/* Playground frame enclosing both the canvas and the status controls */}
      <div className={styles.playgroundFrame}>
        <div
          ref={containerRef}
          className={styles.canvasWrapper}
          tabIndex={0}
          role="region"
          aria-label="Interactive fraud ring tracing playground"
          aria-describedby="playground-instructions"
          onMouseMove={(e) => {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (rect) {
              mouseRef.current = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
                active: true,
              };
            }
          }}
          onMouseLeave={() => {
            mouseRef.current.active = false;
          }}
        >
          <span id="playground-instructions" className={styles.srOnly}>
            Interactive canvas showing synthetic entity nodes. Click or use the trace button to inspect connections
            and uncover planted fraud ring structures.
          </span>

          {feedback && (
            <div
              key={feedback.message}
              className={`${styles.feedbackBanner} ${feedback.isShake ? styles.shake : ''}`}
              aria-live="polite"
            >
              {feedback.message}
            </div>
          )}

          <canvas ref={canvasRef} className={styles.canvas} onClick={handleCanvasClick} />
        </div>

        {/* Status bar sits INSIDE the frame directly under the canvas */}
        <div className={styles.controlsBar}>
          <div className={styles.stats}>
            <span className={styles.tag}>Playground · synthetic data</span>
            <span>
              {flaggedCount} flagged · {tracedRings.length} of 3 rings traced
            </span>
          </div>

          <div className={styles.buttons}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsPaused((p) => !p)}
              aria-label={isPaused ? 'Resume drift' : 'Pause drift'}
            >
              {isPaused ? 'Resume' : 'Pause'}
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleReset}
              aria-label="Reset playground"
            >
              Reset
            </Button>

            {!isCompleted ? (
              <Button
                variant="primary"
                size="sm"
                onClick={handleTraceNext}
                aria-label="Trace next synthetic ring"
              >
                Trace next ring →
              </Button>
            ) : (
              <span className={styles.tag} style={{ color: 'var(--sev-low)' }}>
                ✓ All rings traced
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaygroundCanvas;
