/**
 * Centralized formatting helpers for FraudTrace
 * Ensures uniform currency (₹ en-IN) and timestamp representations
 */

export function formatCurrency(amount: number | string | undefined | null): string {
  const numeric = typeof amount === 'number' ? amount : Number(amount || 0);
  if (isNaN(numeric)) return '₹0';
  return `₹${numeric.toLocaleString('en-IN')}`;
}

export function formatDateTime(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return '—';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateOnly(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return '—';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
