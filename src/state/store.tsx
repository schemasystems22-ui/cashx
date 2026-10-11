import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { DIR, createTranslator, type TKey, type Translate } from '../lib/i18n';
import { INITIAL_DEMO_BALANCE } from '../lib/config';
import { clearStore, readStore, writeStore, STORE_KEYS } from '../lib/storage';
import { createTransactionId } from '../lib/ids';
import { runViewTransition } from '../lib/viewTransition';
import {
  DEFAULT_LANG,
  TRANSIENT_STAGES,
  parseLocation,
  serializeLocation,
  stepForStage,
  type FlowStageName,
  type FlowStep,
  type Route,
} from '../lib/route';
import type { Lang, Transaction } from '../lib/types';

export type { Route, FlowStep, FlowStageName };

/* How the next address-bar write should behave:
   'push'    — a new screen, so the browser Back button returns to the last one
   'replace' — a sub-state of the same screen (a flow step, a language change),
               which must not litter the history stack */
type HistoryMode = 'push' | 'replace';

/** How urgent a screen-reader announcement is. */
export type Politeness = 'polite' | 'assertive';

export interface Announcement {
  /** Monotonic, so repeating the same sentence still reaches the live region. */
  id: number;
  message: string;
  politeness: Politeness;
}

/** Reads the initial location once, before the first render commits. */
function readInitialLocation(): ReturnType<typeof parseLocation> {
  if (typeof window === 'undefined') {
    return { route: { name: 'home' }, lang: null };
  }
  return parseLocation(window.location.search);
}

interface AppContextValue {
  lang: Lang;
  dir: 'rtl' | 'ltr';
  t: Translate;
  setLang: (lang: Lang) => void;

  balance: number;
  creditBalance: (amountMinor: number) => void;
  debitBalance: (amountMinor: number) => void;
  resetDemo: () => void;

  transactions: Transaction[];
  addTransaction: (tx: Transaction) => void;
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
  findTransaction: (id: string) => Transaction | undefined;
  /** Latest completed transfer, for the "transfer again" shortcuts. */
  lastWallet: Transaction['sourceWallet'];
  setLastWallet: (wallet: Transaction['sourceWallet']) => void;

  route: Route;
  navigate: (route: Route) => void;
  /** Mirrors a flow's current step into the address bar (never pushes). */
  setFlowStep: (step: FlowStep, options?: { transition?: boolean }) => void;
  goBack: () => void;

  toast: string | null;
  showToast: (message: string) => void;

  /** Latest message pushed to the live regions, plus the way to push one. */
  announcement: Announcement | null;
  /**
   * Speak a status change to assistive technology. Anything that happens
   * *without* the user moving focus (copying, a language switch, a failed
   * transaction) has to go through here — a visual change alone is silent.
   */
  announce: (message: string, politeness?: Politeness) => void;

  helpOpen: boolean;
  setHelpOpen: (open: boolean) => void;

  /** Transaction whose receipt export sheet is open, if any. */
  exportTxId: string | null;
  openReceiptExport: (id: string) => void;
  closeReceiptExport: () => void;

  simulateFailure: boolean;
  setSimulateFailure: (value: boolean) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function seedTransactions(): Transaction[] {
  const now = Date.now();
  const make = (
    hoursAgo: number,
    partial: Omit<Transaction, 'id' | 'createdAt' | 'completedAt' | 'status' | 'isDemo' | 'currency'>,
  ): Transaction => {
    const created = new Date(now - hoursAgo * 3_600_000).toISOString();
    return {
      ...partial,
      id: createTransactionId(new Date(now - hoursAgo * 3_600_000)),
      status: 'completed',
      currency: 'EGP',
      createdAt: created,
      completedAt: created,
      isDemo: true,
    };
  };

  return [
    make(5, {
      flowType: 'transfer',
      sourceWallet: 'orange',
      destinationType: 'wallet',
      destinationWallet: 'etisalat',
      recipient: '01122233344',
      recipientAmount: 75_000,
      fee: 375,
      totalAmount: 75_375,
    }),
    make(28, {
      flowType: 'add_balance',
      sourceWallet: 'vodafone',
      destinationType: 'cashx_balance',
      recipient: '01012345678',
      recipientAmount: 100_000,
      fee: 500,
      totalAmount: 100_500,
    }),
    make(56, {
      flowType: 'transfer',
      sourceWallet: 'we',
      destinationType: 'instapay',
      recipient: '01098765432',
      recipientName: 'Ahmed M.',
      recipientAmount: 250_000,
      fee: 1_250,
      totalAmount: 251_250,
    }),
  ];
}

export function AppProvider({ children }: { children: ReactNode }) {
  // The URL is read once, before anything renders, so a deep link paints the
  // right screen immediately instead of flashing Home first.
  const initial = useMemo(readInitialLocation, []);

  const [lang, setLangState] = useState<Lang>(
    () => initial.lang ?? readStore<Lang>(STORE_KEYS.lang, DEFAULT_LANG),
  );
  const [balance, setBalance] = useState<number>(() =>
    readStore<number>(STORE_KEYS.balance, INITIAL_DEMO_BALANCE),
  );
  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    readStore<Transaction[]>(STORE_KEYS.transactions, seedTransactions()),
  );
  const [route, setRoute] = useState<Route>(initial.route);
  const [toast, setToast] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [exportTxId, setExportTxId] = useState<string | null>(null);
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [lastWallet, setLastWallet] = useState<Transaction['sourceWallet']>('vodafone');
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const toastTimer = useRef<number | null>(null);
  const historyMode = useRef<HistoryMode>('replace');
  const announcementId = useRef(0);

  const t = useMemo(() => createTranslator(lang), [lang]);
  const dir = DIR[lang];

  useEffect(() => {
    const root = document.documentElement;
    root.lang = lang;
    root.dir = dir;
    writeStore(STORE_KEYS.lang, lang);
  }, [lang, dir]);

  /* ---------------- Address bar <-> state ----------------
     One effect owns every history write, so the URL can never drift from what
     is on screen. `historyMode` decides whether this counts as a new entry. */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const next = serializeLocation(route, lang);
    const current = window.location.pathname + window.location.search;
    const target = window.location.pathname + next;
    if (current === target) {
      historyMode.current = 'replace';
      return;
    }
    const state = { cashx: { route, lang } };
    if (historyMode.current === 'push') {
      window.history.pushState(state, '', target);
    } else {
      window.history.replaceState(state, '', target);
    }
    historyMode.current = 'replace';
  }, [route, lang]);

  /* Browser Back / Forward, plus links pasted into the same tab. */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPopState = () => {
      const parsed = parseLocation(window.location.search);
      historyMode.current = 'replace';
      setRoute(parsed.route);
      if (parsed.lang) setLangState(parsed.lang);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    writeStore(STORE_KEYS.balance, balance);
  }, [balance]);

  useEffect(() => {
    writeStore(STORE_KEYS.transactions, transactions);
  }, [transactions]);

  const announce = useCallback((message: string, politeness: Politeness = 'polite') => {
    announcementId.current += 1;
    setAnnouncement({ id: announcementId.current, message, politeness });
  }, []);

  const setLang = useCallback(
    (next: Lang) => {
      setLangState(next);
      // The message names the language it is written in, so a screen-reader user
      // hears the confirmation in the language they just chose.
      announce(createTranslator(next)('lang.changed'));
    },
    [announce],
  );

  const openReceiptExport = useCallback((id: string) => setExportTxId(id), []);
  const closeReceiptExport = useCallback(() => setExportTxId(null), []);

  const showToast = useCallback(
    (message: string) => {
      setToast(message);
      // The toast itself is mounted on demand, so it cannot be relied on as a
      // live region: the message goes out through the announcer as well.
      announce(message);
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
      toastTimer.current = window.setTimeout(() => setToast(null), 2200);
    },
    [announce],
  );

  const creditBalance = useCallback((amountMinor: number) => {
    setBalance((current) => current + amountMinor);
  }, []);

  const debitBalance = useCallback((amountMinor: number) => {
    setBalance((current) => current - amountMinor);
  }, []);

  const addTransaction = useCallback((tx: Transaction) => {
    setTransactions((current) => [tx, ...current]);
  }, []);

  const updateTransaction = useCallback((id: string, patch: Partial<Transaction>) => {
    setTransactions((current) =>
      current.map((tx) => (tx.id === id ? { ...tx, ...patch } : tx)),
    );
  }, []);

  const findTransaction = useCallback(
    (id: string) => transactions.find((tx) => tx.id === id),
    [transactions],
  );

  /** Screen changes cross-fade (see lib/viewTransition). */
  const navigate = useCallback((next: Route) => {
    runViewTransition(next.name === 'txDetail' ? 'push' : 'tab', () => {
      historyMode.current = 'push';
      setRoute(next);
      // A receipt export belongs to the screen that opened it: leaving that screen
      // must not leave the sheet showing a receipt you have navigated away from.
      setExportTxId(null);
      window.scrollTo({ top: 0 });
    });
  }, []);

  /**
   * Mirrors a flow's step into the route. `transition` is set only for steps the
   * user actually triggered — the effect that keeps the address bar in sync also
   * calls this, and a cross-fade on a no-op update would be a flash.
   */
  const setFlowStep = useCallback((step: FlowStep, options?: { transition?: boolean }) => {
    const apply = () =>
      setRoute((current) => {
        if (current.name !== 'transfer' && current.name !== 'addBalance') return current;
        if (current.step === step) return current;
        return { ...current, step };
      });
    if (options?.transition) runViewTransition('step', apply);
    else apply();
  }, []);

  const goBack = useCallback(() => {
    runViewTransition('tab', () => {
      historyMode.current = 'replace';
      setExportTxId(null);
      setRoute((current) => {
        if (current.name === 'txDetail') return { name: 'transactions' };
        return { name: 'home' };
      });
    });
  }, []);

  const resetDemo = useCallback(() => {
    clearStore();
    setBalance(INITIAL_DEMO_BALANCE);
    setTransactions(seedTransactions());
    setSimulateFailure(false);
    setExportTxId(null);
    historyMode.current = 'replace';
    setRoute({ name: 'home' });
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      lang,
      dir,
      t,
      setLang,
      balance,
      creditBalance,
      debitBalance,
      resetDemo,
      transactions,
      addTransaction,
      updateTransaction,
      findTransaction,
      lastWallet,
      setLastWallet,
      route,
      navigate,
      setFlowStep,
      goBack,
      toast,
      showToast,
      announcement,
      announce,
      helpOpen,
      setHelpOpen,
      exportTxId,
      openReceiptExport,
      closeReceiptExport,
      simulateFailure,
      setSimulateFailure,
    }),
    [
      lang,
      dir,
      t,
      setLang,
      announcement,
      announce,
      balance,
      creditBalance,
      debitBalance,
      resetDemo,
      transactions,
      addTransaction,
      updateTransaction,
      findTransaction,
      lastWallet,
      route,
      navigate,
      setFlowStep,
      goBack,
      toast,
      showToast,
      helpOpen,
      exportTxId,
      openReceiptExport,
      closeReceiptExport,
      simulateFailure,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside <AppProvider>');
  return context;
}

/** Translator hook for components that only need copy. */
export function useT(): { t: Translate; lang: Lang; dir: 'rtl' | 'ltr' } {
  const { t, lang, dir } = useApp();
  return { t, lang, dir };
}

/*
 * Two-way binding between a flow's stage and the addressable step.
 *
 * Steps 1 and 2 are *owned by the route*, not by the screen. That is what makes
 * re-entering a flow (bottom nav, "Add Balance" shortcut) reset it to step 1
 * instead of leaving the URL saying `step=1` while the confirm screen is still
 * on display. Only the transient stages live locally, and they are the ones the
 * screen reports upwards as step 3.
 */
export function useFlowStage(step2: 'review' | 'confirm'): {
  stage: FlowStageName;
  setStage: (next: FlowStageName) => void;
} {
  const { route, setFlowStep } = useApp();
  const [transient, setTransient] = useState<FlowStageName | null>(null);

  const routeStep: FlowStep =
    route.name === 'transfer' || route.name === 'addBalance' ? route.step : 1;
  const stage: FlowStageName = transient ?? (routeStep === 2 ? step2 : 'form');

  const setStage = useCallback(
    (next: FlowStageName) => {
      if (TRANSIENT_STAGES.includes(next)) {
        // Processing → success is the moment worth the cross-fade: without it the
        // waiting spinner would pop out and the receipt would pop in.
        runViewTransition('step', () => setTransient(next));
        return;
      }
      // Back to an addressable step: the route takes over again.
      setTransient(null);
      setFlowStep(stepForStage(next), { transition: true });
    },
    [setFlowStep],
  );

  // Report the current stage upwards so the address bar tracks the flow without
  // the screen having to remount (which would drop the entered form data).
  useEffect(() => {
    setFlowStep(stepForStage(stage));
  }, [stage, setFlowStep]);

  return { stage, setStage };
}

export type { TKey };
