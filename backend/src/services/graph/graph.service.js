import { buildInMemoryGraph } from './graphBuilder.js';
import { getNeighborhood, findShortestPath } from './graphTraversal.js';
import { detectTimeOrderedCycles } from './cycleDetector.js';
import {
  calculateNetworkDegree,
  findConnectedComponents,
  analyzeSuspiciousNeighbors,
} from './graphAnalytics.js';

export async function fetchNeighborhood({ entityId, depth = 1, limit = 50 }) {
  if (!entityId) {
    const error = new Error('entityId is required');
    error.statusCode = 400;
    throw error;
  }

  const graph = await buildInMemoryGraph();
  const neighborhood = getNeighborhood(graph, entityId, { depth, limit });

  if (!neighborhood) {
    const error = new Error(`Entity "${entityId}" not found in graph`);
    error.statusCode = 404;
    throw error;
  }

  return neighborhood;
}

export async function fetchPath({ sourceId, targetId, maxDepth = 4, directed = false }) {
  if (!sourceId || !targetId) {
    const error = new Error('Both sourceId and targetId are required');
    error.statusCode = 400;
    throw error;
  }

  const graph = await buildInMemoryGraph();
  const pathResult = findShortestPath(graph, sourceId, targetId, { maxDepth, directed });

  if (!pathResult) {
    const error = new Error(`One or both endpoints ("${sourceId}", "${targetId}") not found in graph`);
    error.statusCode = 404;
    throw error;
  }

  return pathResult;
}

export async function fetchCycles(options = {}) {
  const graph = await buildInMemoryGraph();
  return detectTimeOrderedCycles(graph, options);
}

export async function fetchDegree(identifier = null) {
  const graph = await buildInMemoryGraph();
  const degree = calculateNetworkDegree(graph, identifier);
  if (identifier && !degree) {
    const error = new Error(`Entity "${identifier}" not found in graph`);
    error.statusCode = 404;
    throw error;
  }
  return degree;
}

export async function fetchComponents(options = {}) {
  const graph = await buildInMemoryGraph();
  return findConnectedComponents(graph, options);
}

export async function fetchSuspiciousNeighbors(accountId) {
  if (!accountId) {
    const error = new Error('accountId is required');
    error.statusCode = 400;
    throw error;
  }

  const graph = await buildInMemoryGraph();
  const analysis = analyzeSuspiciousNeighbors(graph, accountId);
  if (!analysis) {
    const error = new Error(`Account "${accountId}" not found in graph`);
    error.statusCode = 404;
    throw error;
  }
  return analysis;
}

export async function getGraphSummary() {
  const graph = await buildInMemoryGraph();
  const accounts = Array.from(graph.nodes.values()).filter((n) => n.entityType === 'ACCOUNT').length;
  const devices = Array.from(graph.nodes.values()).filter((n) => n.entityType === 'DEVICE').length;
  const merchants = Array.from(graph.nodes.values()).filter((n) => n.entityType === 'MERCHANT').length;

  return {
    nodeCount: graph.nodes.size,
    edgeCount: graph.edges.size,
    accounts,
    devices,
    merchants,
  };
}
