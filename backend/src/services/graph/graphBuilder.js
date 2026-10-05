import { Account } from '../../models/account.model.js';
import { Device } from '../../models/device.model.js';
import { Merchant } from '../../models/merchant.model.js';
import { Transaction } from '../../models/transaction.model.js';

export class InMemoryGraph {
  constructor() {
    this.nodes = new Map(); // key -> { id, key, mongoId, externalId, entityType, metadata }
    this.edges = new Map(); // edgeId -> { id, source, target, type, amount, timestamp, externalTransactionId }
    this.adjacency = new Map(); // key -> Edge[] (outgoing)
    this.reverseAdjacency = new Map(); // key -> Edge[] (incoming)
    this.undirectedAdjacency = new Map(); // key -> { neighborKey, edge }[]
    this.externalIdIndex = new Map(); // externalId -> key
    this.mongoIdIndex = new Map(); // mongoIdString -> key
    this.createdAt = new Date();
  }

  addNode({ mongoId, externalId, entityType, metadata = {} }) {
    const key = `${entityType}:${externalId}`;
    const node = {
      id: externalId,
      key,
      mongoId: mongoId.toString(),
      externalId,
      entityType,
      metadata,
    };

    this.nodes.set(key, node);
    this.externalIdIndex.set(externalId, key);
    this.mongoIdIndex.set(mongoId.toString(), key);

    if (!this.adjacency.has(key)) this.adjacency.set(key, []);
    if (!this.reverseAdjacency.has(key)) this.reverseAdjacency.set(key, []);
    if (!this.undirectedAdjacency.has(key)) this.undirectedAdjacency.set(key, []);

    return node;
  }

  addEdge({ sourceKey, targetKey, type, amount = null, timestamp, externalTransactionId = null }) {
    if (!this.nodes.has(sourceKey) || !this.nodes.has(targetKey)) {
      return null;
    }

    const edgeId = `${type}:${sourceKey}->${targetKey}:${externalTransactionId || Date.now()}`;
    const edge = {
      id: edgeId,
      source: this.nodes.get(sourceKey).id,
      target: this.nodes.get(targetKey).id,
      sourceKey,
      targetKey,
      type,
      amount,
      timestamp: timestamp instanceof Date ? timestamp : new Date(timestamp),
      externalTransactionId,
    };

    this.edges.set(edgeId, edge);

    this.adjacency.get(sourceKey).push(edge);
    this.reverseAdjacency.get(targetKey).push(edge);

    this.undirectedAdjacency.get(sourceKey).push({ neighborKey: targetKey, edge });
    this.undirectedAdjacency.get(targetKey).push({ neighborKey: sourceKey, edge });

    return edge;
  }

  resolveNodeKey(identifier) {
    if (!identifier) return null;
    const str = identifier.toString().trim();

    if (this.nodes.has(str)) return str;
    if (this.externalIdIndex.has(str)) return this.externalIdIndex.get(str);
    if (this.mongoIdIndex.has(str)) return this.mongoIdIndex.get(str);

    // Try with prefix if user passed just the external ID without type
    for (const prefix of ['ACCOUNT:', 'DEVICE:', 'MERCHANT:']) {
      if (this.nodes.has(prefix + str)) {
        return prefix + str;
      }
    }

    return null;
  }

  getNode(identifier) {
    const key = this.resolveNodeKey(identifier);
    return key ? this.nodes.get(key) : null;
  }
}

let cachedGraph = null;
let lastBuildTime = null;

export async function buildInMemoryGraph({ force = false } = {}) {
  // If cached and fresh (built within last 5 seconds), return cache
  if (!force && cachedGraph && lastBuildTime && Date.now() - lastBuildTime < 5000) {
    return cachedGraph;
  }

  const graph = new InMemoryGraph();

  // Load all entities in parallel
  const [accounts, devices, merchants, transactions] = await Promise.all([
    Account.find().lean(),
    Device.find().lean(),
    Merchant.find().lean(),
    Transaction.find().populate('fromAccount toAccount merchant device').lean(),
  ]);

  // Index accounts
  for (const acc of accounts) {
    graph.addNode({
      mongoId: acc._id,
      externalId: acc.externalId,
      entityType: 'ACCOUNT',
      metadata: acc.metadata,
    });
  }

  // Index devices
  for (const dev of devices) {
    graph.addNode({
      mongoId: dev._id,
      externalId: dev.externalId,
      entityType: 'DEVICE',
      metadata: dev.metadata,
    });
  }

  // Index merchants
  for (const merch of merchants) {
    graph.addNode({
      mongoId: merch._id,
      externalId: merch.externalId,
      entityType: 'MERCHANT',
      metadata: merch.metadata,
    });
  }

  // Add edges from transactions
  for (const tx of transactions) {
    if (!tx.fromAccount) continue;
    const sourceKey = `ACCOUNT:${tx.fromAccount.externalId}`;

    // Account -> Account (Money transfer)
    if (tx.toAccount) {
      const targetKey = `ACCOUNT:${tx.toAccount.externalId}`;
      graph.addEdge({
        sourceKey,
        targetKey,
        type: 'TRANSFER',
        amount: tx.amount,
        timestamp: tx.timestamp,
        externalTransactionId: tx.externalTransactionId,
      });
    }

    // Account -> Merchant (Merchant payment)
    if (tx.merchant) {
      const targetKey = `MERCHANT:${tx.merchant.externalId}`;
      graph.addEdge({
        sourceKey,
        targetKey,
        type: 'PAYMENT',
        amount: tx.amount,
        timestamp: tx.timestamp,
        externalTransactionId: tx.externalTransactionId,
      });
    }

    // Account -> Device (Device usage)
    if (tx.device) {
      const targetKey = `DEVICE:${tx.device.externalId}`;
      graph.addEdge({
        sourceKey,
        targetKey,
        type: 'USED_DEVICE',
        amount: null,
        timestamp: tx.timestamp,
        externalTransactionId: tx.externalTransactionId,
      });
    }
  }

  cachedGraph = graph;
  lastBuildTime = Date.now();
  return graph;
}

export function invalidateGraphCache() {
  cachedGraph = null;
  lastBuildTime = null;
}
