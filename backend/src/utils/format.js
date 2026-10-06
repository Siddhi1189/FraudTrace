/**
 * Standardized currency and amount formatting utility for FraudTrace.
 * Standardized on Indian Rupee (₹).
 * PLACEHOLDER(FT-30): Standardized currency formatter
 */

export function formatAmount(amount) {
  const num = Number(amount || 0);
  return `₹${num.toLocaleString('en-IN')}`;
}
