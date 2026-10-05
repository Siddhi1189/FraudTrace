/**
 * Graph analytics for FraudTrace:
 * - Network degree metrics (in-degree, out-degree, total degree)
 * - Connected components grouping
 * - Suspicious neighbor analysis
 */

// Calculate network degree for a node or all nodes
export function calculateNetworkDegree(graph, identifier = null) {
  if (identifier) {
    const key = graph.resolveNodeKey(identifier);
    if (!key || !graph.nodes.has(key)) return null;

    const outEdges = graph.adjacency.get(key) || [];
    const inEdges = graph.reverseAdjacency.get(key) || [];
    const undirectedEdges = graph.undirectedAdjacency.get(key) || [];

    const distinctOutNeighbors = new Set(outEdges.map((e) => e.targetKey)).size;
    const distinctInNeighbors = new Set(inEdges.map((e) => e.sourceKey)).size;
    const distinctTotalNeighbors = new Set(undirectedEdges.map((u) => u.neighborKey)).size;

    return {
      nodeId: graph.nodes.get(key).externalId,
      entityType: graph.nodes.get(key).entityType,
      outDegree: outEdges.length,
      inDegree: inEdges.length,
      totalDegree: undirectedEdges.length,
      distinctOutNeighbors,
      distinctInNeighbors,
      distinctTotalNeighbors,
    };
  }

  const result = {};
  for (const [key, node] of graph.nodes.entries()) {
    const outEdges = graph.adjacency.get(key) || [];
    const inEdges = graph.reverseAdjacency.get(key) || [];
    const undirectedEdges = graph.undirectedAdjacency.get(key) || [];

    result[node.externalId] = {
      nodeId: node.externalId,
      entityType: node.entityType,
      outDegree: outEdges.length,
      inDegree: inEdges.length,
      totalDegree: undirectedEdges.length,
      distinctTotalNeighbors: new Set(undirectedEdges.map((u) => u.neighborKey)).size,
    };
  }

  return result;
}

// Connected components grouping using BFS/DFS
export function findConnectedComponents(graph, { entityTypes = null } = {}) {
  const visited = new Set();
  const components = [];

  const candidateKeys = Array.from(graph.nodes.keys()).filter((key) => {
    if (!entityTypes) return true;
    const node = graph.nodes.get(key);
    return entityTypes.includes(node.entityType);
  });

  for (const startKey of candidateKeys) {
    if (visited.has(startKey)) continue;

    const componentNodes = [];
    const componentEdgeIds = new Set();
    const queue = [startKey];
    visited.add(startKey);

    while (queue.length > 0) {
      const currentKey = queue.shift();
      const currentNode = graph.nodes.get(currentKey);
      componentNodes.push(currentNode);

      const neighbors = graph.undirectedAdjacency.get(currentKey) || [];

      for (const { neighborKey, edge } of neighbors) {
        if (entityTypes) {
          const neighborNode = graph.nodes.get(neighborKey);
          if (!entityTypes.includes(neighborNode.entityType)) {
            continue;
          }
        }

        componentEdgeIds.add(edge.id);

        if (!visited.has(neighborKey)) {
          visited.add(neighborKey);
          queue.push(neighborKey);
        }
      }
    }

    if (componentNodes.length > 0) {
      components.push({
        size: componentNodes.length,
        nodes: componentNodes,
        edgeCount: componentEdgeIds.size,
      });
    }
  }

  return components.sort((a, b) => b.size - a.size);
}

// Suspicious-neighbor analysis for an account
export function analyzeSuspiciousNeighbors(graph, accountId) {
  const key = graph.resolveNodeKey(accountId);
  if (!key || !graph.nodes.has(key)) return null;

  const node = graph.nodes.get(key);
  const undirected = graph.undirectedAdjacency.get(key) || [];

  const connectedAccounts = new Set();
  const connectedDevices = new Set();
  const connectedMerchants = new Set();

  for (const { neighborKey, edge } of undirected) {
    const neighbor = graph.nodes.get(neighborKey);
    if (neighbor.entityType === 'ACCOUNT') {
      connectedAccounts.add(neighbor.externalId);
    } else if (neighbor.entityType === 'DEVICE') {
      connectedDevices.add(neighbor.externalId);
    } else if (neighbor.entityType === 'MERCHANT') {
      connectedMerchants.add(neighbor.externalId);
    }
  }

  return {
    accountId: node.externalId,
    connectedAccountsCount: connectedAccounts.size,
    connectedAccounts: Array.from(connectedAccounts),
    connectedDevicesCount: connectedDevices.size,
    connectedDevices: Array.from(connectedDevices),
    connectedMerchantsCount: connectedMerchants.size,
    connectedMerchants: Array.from(connectedMerchants),
    totalDegree: undirected.length,
  };
}
