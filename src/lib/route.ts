import type { Lang } from './types';

/**
 * The three steps of either flow, as they appear in the address bar.
 *
 * Step 3 is *addressable but not restorable*: the receipt screen can only render
 * on top of a transaction this session actually confirmed, so a URL asking for
 * step 3 opens step 2 instead (see `restorableStep`). The step-3 URL is still
 * written while the receipt is on screen, so the address bar never under-reports
 * where you are.
 */
export type FlowStep = 1 | 2 | 3;

export type Route =
  | { name: 'home' }
  | { name: 'transfer'; step: FlowStep }
  | { name: 'addBalance'; step: FlowStep }
  | { name: 'transactions' }
  | { name: 'txDetail'; id: string }
  | { name: 'account' };

/** The last step a fresh page load can honestly reconstruct. */
export const MAX_RESTORABLE_STEP: FlowStep = 2;

/** Steps above the restorable ceiling collapse down to it. Read path only. */
export function restorableStep(step: FlowStep): FlowStep {
  return step > MAX_RESTORABLE_STEP ? MAX_RESTORABLE_STEP : step;
}

export const DEFAULT_LANG: Lang = 'en';

/* ------------------------------------------------------------------ */
/* Names                                                              */
/* ------------------------------------------------------------------ */

/** Screen name used in `?screen=`. */
export function routeName(route: Route): string {
  return route.name === 'txDetail' ? 'transaction' : route.name;
}

/** Accepted `?screen=` spellings, so typed links are forgiving. */
const SCREEN_ALIASES: Record<string, Route['name']> = {
  home: 'home',
  index: 'home',
  main: 'home',
  transfer: 'transfer',
  send: 'transfer',
  'transfer-money': 'transfer',
  'add-balance': 'addBalance',
  addbalance: 'addBalance',
  add_balance: 'addBalance',
  add: 'addBalance',
  balance: 'addBalance',
  topup: 'addBalance',
  'top-up': 'addBalance',
  transactions: 'transactions',
  transaction: 'txDetail',
  history: 'transactions',
  tx: 'txDetail',
  receipt: 'txDetail',
  account: 'account',
  'my-account': 'account',
  me: 'account',
  settings: 'account',
};

/** Accepted `?step=` spellings, for both numbers and stage names. */
const STEP_ALIASES: Record<string, FlowStep> = {
  '1': 1,
  step1: 1,
  form: 1,
  details: 1,
  '2': 2,
  step2: 2,
  review: 2,
  confirm: 2,
  pay: 2,
  '3': 3,
  step3: 3,
  success: 3,
  done: 3,
  complete: 3,
};

function parseStep(raw: string | null): FlowStep | null {
  if (!raw) return null;
  return STEP_ALIASES[raw.trim().toLowerCase()] ?? null;
}

function parseLang(raw: string | null): Lang | null {
  if (!raw) return null;
  const value = raw.trim().toLowerCase();
  if (value === 'ar' || value.startsWith('ar-')) return 'ar';
  if (value === 'en' || value.startsWith('en-')) return 'en';
  return null;
}

/* ------------------------------------------------------------------ */
/* Reading                                                            */
/* ------------------------------------------------------------------ */

export interface ParsedLocation {
  route: Route;
  /** Language requested in the URL; null means "use the stored preference". */
  lang: Lang | null;
}

/**
 * Reads a query string. Anything unknown, malformed or not restorable resolves
 * to the closest honest screen — the caller then rewrites the address bar to
 * the canonical form, because `serializeLocation` never round-trips junk.
 */
export function parseLocation(search: string): ParsedLocation {
  const params = new URLSearchParams(search);

  // `screen` is the documented key; `route`/`page`/`view` are tolerated.
  const rawScreen =
    params.get('screen') ?? params.get('route') ?? params.get('page') ?? params.get('view');
  const lang = parseLang(params.get('lang') ?? params.get('language'));

  if (rawScreen === null) return { route: { name: 'home' }, lang };

  const name = SCREEN_ALIASES[rawScreen.trim().toLowerCase()];
  if (!name) return { route: { name: 'home' }, lang };

  if (name === 'txDetail') {
    const id = params.get('id') ?? params.get('tx') ?? params.get('transaction');
    // A receipt link without an id has no receipt to show, so fall back to the list.
    if (!id) return { route: { name: 'transactions' }, lang };
    return { route: { name: 'txDetail', id }, lang };
  }

  if (name === 'transfer' || name === 'addBalance') {
    // A missing step is not an error: flows start at step 1.
    const requested = parseStep(params.get('step')) ?? 1;
    return { route: { name, step: restorableStep(requested) }, lang };
  }

  return { route: { name } as Route, lang };
}

/* ------------------------------------------------------------------ */
/* Flow stages <-> steps                                               */
/* ------------------------------------------------------------------ */

/** Every stage a flow can be in. Shared by both flows. */
export type FlowStageName =
  | 'form'
  | 'review'
  | 'confirm'
  | 'processing'
  | 'success'
  | 'failed';

/** The stages that only exist while a session is paying, and so can never be
    reconstructed from a URL — only step 3 is written from these. */
export const TRANSIENT_STAGES: readonly FlowStageName[] = ['processing', 'success', 'failed'];

/** The addressable step each stage corresponds to. Identical for both flows. */
export function stepForStage(stage: FlowStageName): FlowStep {
  if (stage === 'success') return 3;
  if (stage === 'form') return 1;
  // review / confirm / processing / failed
  return 2;
}

/* ------------------------------------------------------------------ */
/* Writing                                                            */
/* ------------------------------------------------------------------ */

/**
 * Serialises a location into a canonical query string.
 *
 * `lang` is always included so a copied link reopens in the same language, and
 * `screen` is omitted for home so the bare URL stays clean.
 */
export function serializeLocation(route: Route, lang: Lang): string {
  const params = new URLSearchParams();

  const screen = routeName(route);
  if (route.name !== 'home') params.set('screen', screen);

  if (route.name === 'transfer' || route.name === 'addBalance') {
    params.set('step', String(route.step));
  }

  if (route.name === 'txDetail') params.set('id', route.id);

  params.set('lang', lang);

  return `?${params.toString()}`;
}
