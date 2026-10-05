import { DEFAULT_DETECTOR_CONFIG, RULE_VERSION } from './detectorConfig.js';
import { runCircularFlowDetector } from './circularFlowDetector.js';
import { runFanInFanOutDetector } from './fanInFanOutDetector.js';
import { runSharedDeviceDetector } from './sharedDeviceDetector.js';
import { runPassThroughDetector } from './passThroughDetector.js';
import { runMerchantCashOutDetector } from './merchantCashOutDetector.js';

export {
  DEFAULT_DETECTOR_CONFIG,
  RULE_VERSION,
  runCircularFlowDetector,
  runFanInFanOutDetector,
  runSharedDeviceDetector,
  runPassThroughDetector,
  runMerchantCashOutDetector,
};

export function runAllDetectors(graph, customConfig = {}) {
  const config = { ...DEFAULT_DETECTOR_CONFIG, ...customConfig };

  const circular = runCircularFlowDetector(graph, config.circularFlow);
  const fanInFanOut = runFanInFanOutDetector(graph, config.fanInFanOut);
  const sharedDevice = runSharedDeviceDetector(graph, config.sharedDevice);
  const passThrough = runPassThroughDetector(graph, config.passThrough);
  const merchantCashOut = runMerchantCashOutDetector(graph, config.merchantCashOut);

  const allDetections = [
    ...circular,
    ...fanInFanOut,
    ...sharedDevice,
    ...passThrough,
    ...merchantCashOut,
  ];

  // Global deduplication by fingerprint
  const uniqueMap = new Map();
  for (const det of allDetections) {
    if (!uniqueMap.has(det.fingerprint)) {
      uniqueMap.set(det.fingerprint, det);
    }
  }

  return {
    ruleVersion: RULE_VERSION,
    detections: Array.from(uniqueMap.values()),
    breakdown: {
      circularFlow: circular.length,
      fanInFanOut: fanInFanOut.length,
      sharedDevice: sharedDevice.length,
      passThrough: passThrough.length,
      merchantCashOut: merchantCashOut.length,
      total: uniqueMap.size,
    },
  };
}
