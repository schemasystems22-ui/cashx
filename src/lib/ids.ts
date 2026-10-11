const pad = (value: number, size = 2) => String(value).padStart(size, '0');

/**
 * Demo transaction id in the reference format `TXN-YYMMDD-HHMMSS`
 * (e.g. TXN-261011-104512). Always generated from the current time.
 */
export function createTransactionId(date = new Date()): string {
  const y = pad(date.getFullYear() % 100);
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `TXN-${y}${m}${d}-${hh}${mm}${ss}`;
}

/** Small unique-ish suffix for demo payment references. */
export function createPaymentReference(): string {
  return `DEMO-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export function createLocalId(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
