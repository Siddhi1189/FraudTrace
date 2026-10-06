import crypto from 'crypto';

/**
 * Deterministically serialize any JavaScript object by sorting object keys recursively.
 * Primitive values, arrays, and sub-objects are preserved canonically.
 */
export function canonicalizeJson(obj) {
  if (obj === null || obj === undefined) {
    return 'null';
  }

  // Handle Date objects
  if (obj instanceof Date) {
    return JSON.stringify(obj.toISOString());
  }

  // Handle MongoDB ObjectId or objects with toJSON / toISOString
  if (typeof obj.toISOString === 'function') {
    return JSON.stringify(obj.toISOString());
  }

  if (typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  // Handle ObjectId instance or custom toJSON where result is not same object
  if (typeof obj.toHexString === 'function') {
    return JSON.stringify(obj.toHexString());
  }

  if (Array.isArray(obj)) {
    return '[' + obj.map((item) => canonicalizeJson(item)).join(',') + ']';
  }

  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys.map((key) => {
    return JSON.stringify(key) + ':' + canonicalizeJson(obj[key]);
  });

  return '{' + pairs.join(',') + '}';
}

/**
 * Generates a deterministic SHA-256 hash of the canonical evidence snapshot.
 * Guarantees the same canonical evidence snapshot produces the exact same hash.
 * Does not include volatile timestamps or random values.
 *
 * @param {Object} snapshot - Evidence snapshot
 * @returns {string} SHA-256 hexadecimal hash
 */
export function generateEvidenceHash(snapshot) {
  const canonicalString = canonicalizeJson(snapshot);
  return crypto.createHash('sha256').update(canonicalString).digest('hex');
}
