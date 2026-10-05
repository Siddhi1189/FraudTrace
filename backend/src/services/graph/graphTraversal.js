/**
 * Graph traversal and path finding algorithms for FraudTrace in-memory graph.
 */

// BFS Traversal
export function bfsTraversal(graph, startKey, { maxDepth = 3, directed = false } = {}) {
  const rootKey = graph.resolveNodeKey(startKey);
  if (!rootKey || !graph.nodes.has(rootKey)) return [];

  const visited = new Set([rootKey]);
  const queue = [{ key: rootKey, depth: 0 }];
  const result = [];

  while (queue.length > 0) {
    const { key, depth } = queue.shift();
    result.push({ node: graph.nodes.get(key), depth });

    if (depth >= maxDepth) continue;

    const neighbors = directed
      ? (graph.adjacency.get(key) || []).map((e) => e.targetKey)
      : (graph.undirectedAdjacency.get(key) || []).map((item) => item.neighborKey);

    for (const nKey of neighbors) {
      if (!visited.has(nKey)) {
        visited.add(nKey);
        queue.push({ key: nKey, depth: depth + 1 });
      }
    }
  }

  return result;
}

// DFS Traversal
export function dfsTraversal(graph, startKey, { maxDepth = 3, directed = false } = {}) {
  const rootKey = graph.resolveNodeKey(startKey);
  if (!rootKey || !graph.nodes.has(rootKey)) return [];

  const visited = new Set();
  const result = [];

  function dfs(key, depth) {
    visited.add(key);
    result.push({ node: graph.nodes.get(key), depth });

    if (depth >= maxDepth) return;

    const neighbors = directed
      ? (graph.adjacency.get(key) || []).map((e) => e.targetKey)
      : (graph.undirectedAdjacency.get(key) || []).map((item) => item.neighborKey);

    for (const nKey of neighbors) {
      if (!visited.has(nKey)) {
        dfs(nKey, depth + 1);
      }
    }
  }

  dfs(rootKey, 0);
  return result;
}

// Shortest Path and Simple Path Analysis
export function findShortestPath(graph, sourceId, targetId, { directed = false, maxDepth = 6 } = {}) {
  const sourceKey = graph.resolveNodeKey(sourceId);
  const targetKey = graph.resolveNodeKey(targetId);

  if (!sourceKey || !targetKey || !graph.nodes.has(sourceKey) || !graph.nodes.has(targetKey)) {
    return null;
  }

  if (sourceKey === targetKey) {
    return {
      found: true,
      length: 0,
      nodes: [graph.nodes.get(sourceKey)],
      edges: [],
    };
  }

  const queue = [{ key: sourceKey, pathNodes: [sourceKey], pathEdges: [] }];
  const visited = new Set([sourceKey]);

  while (queue.length > 0) {
    const { key, pathNodes, pathEdges } = queue.shift();

    if (pathNodes.length - 1 >= maxDepth) continue;

    const adj = directed
      ? (graph.adjacency.get(key) || []).map((e) => ({ neighborKey: e.targetKey, edge: e }))
      : graph.undirectedAdjacency.get(key) || [];

    for (const { neighborKey, edge } of adj) {
      if (neighborKey === targetKey) {
        const fullNodeKeys = [...pathNodes, neighborKey];
        const fullEdges = [...pathEdges, edge];
        return {
          found: true,
          length: fullEdges.length,
          nodes: fullNodeKeys.map((k) => graph.nodes.get(k)),
          edges: fullEdges,
        };
      }

      if (!visited.has(neighborKey)) {
        visited.add(neighborKey);
        queue.push({
          key: neighborKey,
          pathNodes: [...pathNodes, neighborKey],
          pathEdges: [...pathEdges, edge],
        });
      }
    }
  }

  return {
    found: false,
    length: -1,
    nodes: [],
    edges: [],
  };
}

// Neighborhood Query for API (enforcing node limits per FT-10)
export function getNeighborhood(graph, entityId, { depth = 1, limit = 50 } = {}) {
  const centerKey = graph.resolveNodeKey(entityId);
  if (!centerKey || !graph.nodes.has(centerKey)) {
    return null;
  }

  // PLACEHOLDER(FT-10): Safe depth and limit clamping
  const searchDepth = Math.max(1, Math.min(Number(depth) || 1, 3));
  const nodeLimit = Math.max(1, Math.min(Number(limit) || 50, 100));

  const centerNode = graph.nodes.get(centerKey);
  const visitedNodeKeys = new Set([centerKey]);
  const includedEdgeIds = new Set();
  const queue = [{ key: centerKey, currentDepth: 0 }];

  let truncated = false;

  while (queue.length > 0) {
    const { key, currentDepth } = queue.shift();

    if (currentDepth >= searchDepth) continue;

    const neighbors = graph.undirectedAdjacency.get(key) || [];

    for (const { neighborKey, edge } of neighbors) {
      // Check node limit before visiting new node
      if (!visitedNodeKeys.has(neighborKey)) {
        if (visitedNodeKeys.size >= nodeLimit) {
          truncated = true;
          continue;
        }
        visitedNodeKeys.add(neighborKey);
        queue.push({ key: neighborKey, currentDepth: currentDepth + 1 });
      }

      // Add edge if both endpoints are in our visited set
      if (visitedNodeKeys.has(edge.sourceKey) && visitedNodeKeys.has(edge.targetKey)) {
        includedEdgeIds.add(edge.id);
      }
    }
  }

  const nodes = Array.from(visitedNodeKeys).map((k) => graph.nodes.get(k));
  const edges = Array.from(includedEdgeIds).map((id) => graph.edges.get(id));

  return {
    centerNode,
    nodes,
    edges,
    nodeCount: nodes.length,
    edgeCount: edges.length,
    depth: searchDepth,
    limit: nodeLimit,
    truncated,
  };
}
