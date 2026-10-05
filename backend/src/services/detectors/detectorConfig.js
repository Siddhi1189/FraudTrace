/**
 * Configuration and default thresholds for FraudTrace fraud detectors.
 * PLACEHOLDER(FT-11): active detector thresholds and rule version format.
 */

export const RULE_VERSION = 'v1.0.0';

export const DEFAULT_DETECTOR_CONFIG = {
  ruleVersion: RULE_VERSION,
  circularFlow: {
    minLength: 3,
    maxLength: 5,
    maxTimeWindowMs: 24 * 60 * 60 * 1000, // 24 hours
    maxCycles: 50,
  },
  fanInFanOut: {
    minDistinctSenders: 3,
    minDistinctReceivers: 3,
    maxTimeWindowMs: 24 * 60 * 60 * 1000, // 24 hours
  },
  sharedDevice: {
    minDistinctAccounts: 3, // Ordinary 2-person sharing is benign per Doc 5.3
  },
  passThrough: {
    minForwardingRatio: 0.80, // 80% forwarding of incoming funds
    maxDelayMinutes: 60, // Forwarded within 60 minutes
    minOccurrences: 2, // Must observe repeated behavior
  },
  merchantCashOut: {
    minRelatedAccounts: 2,
    maxTimeWindowMs: 2 * 60 * 60 * 1000, // 2 hours
    requireSharedDevice: true,
  },
};
