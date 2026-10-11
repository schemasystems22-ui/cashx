const NS = 'cashx.demo.v1';

export function readStore<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(`${NS}.${key}`);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeStore(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(`${NS}.${key}`, JSON.stringify(value));
  } catch {
    /* storage unavailable (private mode) — the demo keeps working in memory */
  }
}

export function clearStore(): void {
  try {
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith(`${NS}.`))
      .forEach((key) => window.localStorage.removeItem(key));
  } catch {
    /* ignore */
  }
}

export const STORE_KEYS = {
  lang: 'lang',
  balance: 'balance',
  transactions: 'transactions',
} as const;
