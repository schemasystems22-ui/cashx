import { useEffect, useRef, useState } from 'react';
import {
  HelpSheet,
  NavSheet,
  NotificationsSheet,
  ToastHost,
} from './components/Chrome';
import { ExportReceiptSheet } from './components/ReceiptExport';
import { Splash, hasSeenSplash, markSplashSeen } from './components/Splash';
import { AccountScreen } from './screens/AccountScreen';
import { AddBalanceScreen } from './screens/AddBalanceScreen';
import { HomeScreen } from './screens/HomeScreen';
import { TransactionDetailScreen, TransactionsScreen } from './screens/TransactionsScreen';
import { TransferScreen } from './screens/TransferScreen';
import { useApp } from './state/store';

/**
 * The persistent home for status messages.
 *
 * Both regions stay mounted for the life of the app: a live region that is
 * inserted *together with* its content is routinely ignored by screen readers,
 * so only the child inside is replaced (the `key` does that). `polite` waits for
 * a pause in speech; `assertive` interrupts, and is reserved for failures the
 * user has to act on.
 */
function LiveRegions() {
  const { announcement } = useApp();
  const polite = announcement?.politeness === 'polite' ? announcement : null;
  const assertive = announcement?.politeness === 'assertive' ? announcement : null;

  return (
    <div className="cx-visually-hidden">
      <div role="status" aria-live="polite" aria-atomic="true">
        {polite ? <span key={polite.id}>{polite.message}</span> : null}
      </div>
      <div role="status" aria-live="assertive" aria-atomic="true">
        {assertive ? <span key={assertive.id}>{assertive.message}</span> : null}
      </div>
    </div>
  );
}

export default function App() {
  const { route, setHelpOpen, goBack, t } = useApp();
  const [navOpen, setNavOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [splash, setSplash] = useState(() => !hasSeenSplash());
  const containerRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  const openHelp = () => setHelpOpen(true);

  useEffect(() => {
    if (splash) markSplashSeen();
  }, []);

  /*
   * While the splash is up the app is rendered behind it but must not be
   * reachable: `inert` takes the whole screen out of the tab order and hides it
   * from assistive technology until the intro finishes. Set as a property
   * because `inert` is a boolean attribute React 18 does not render as expected.
   */
  useEffect(() => {
    const node = containerRef.current;
    if (node) node.inert = splash;
  }, [splash]);

  // Keyed so every navigation replays the enter animation: pushing into a
  // detail screen rises, switching tabs only cross-fades.
  const screenKey = route.name === 'txDetail' ? `txDetail:${route.id}` : route.name;
  const isPush = route.name === 'txDetail';

  /** Names the screen for assistive technology when focus lands on it. */
  const screenLabel =
    route.name === 'home'
      ? t('nav.home')
      : route.name === 'addBalance'
        ? t('ab.title')
        : route.name === 'transfer'
          ? t('nav.transfer')
          : route.name === 'account'
            ? t('nav.account')
            : route.name === 'txDetail'
              ? t('tx.details')
              : t('tx.title');

  /*
   * Navigation replaces the whole screen, including the bottom navigation the
   * user may have just clicked — so focus would otherwise be dropped onto
   * <body> and a keyboard user restarts from the top of the document. Moving it
   * to the new screen announces where they landed.
   *
   * The very first render is skipped: on load focus belongs at the top.
   * Within a flow, step changes are handled by <StepTransition> instead; this
   * effect only fires when the screen itself changes.
   */
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    containerRef.current?.focus({ preventScroll: true });
  }, [screenKey]);

  return (
    <div className="cx-viewport">
      <div className="cx-frame">
        <div
          key={screenKey}
          ref={containerRef}
          tabIndex={-1}
          role="group"
          aria-label={screenLabel}
          className={['cx-screen', isPush ? 'cx-screen--push' : 'cx-screen--tab'].join(' ')}
        >
          {route.name === 'home' ? (
            <HomeScreen
              onOpenNav={() => setNavOpen(true)}
              onOpenNotifications={() => setNotificationsOpen(true)}
            />
          ) : null}

          {route.name === 'addBalance' ? (
            <AddBalanceScreen
              onOpenNav={() => setNavOpen(true)}
              onOpenNotifications={() => setNotificationsOpen(true)}
            />
          ) : null}

          {route.name === 'transfer' ? (
            <TransferScreen onOpenHelp={openHelp} onClose={goBack} />
          ) : null}

          {route.name === 'transactions' ? (
            <TransactionsScreen
              onOpenNav={() => setNavOpen(true)}
              onOpenNotifications={() => setNotificationsOpen(true)}
            />
          ) : null}

          {route.name === 'txDetail' ? <TransactionDetailScreen id={route.id} /> : null}

          {route.name === 'account' ? (
            <AccountScreen
              onOpenNav={() => setNavOpen(true)}
              onOpenNotifications={() => setNotificationsOpen(true)}
              onOpenHelp={openHelp}
            />
          ) : null}
        </div>

        {navOpen ? <NavSheet onClose={() => setNavOpen(false)} /> : null}
        {notificationsOpen ? (
          <NotificationsSheet onClose={() => setNotificationsOpen(false)} />
        ) : null}
        <HelpSheet />
        <ExportReceiptSheet />
        <ToastHost />
        <LiveRegions />

        {splash ? <Splash onDone={() => setSplash(false)} /> : null}
      </div>
    </div>
  );
}
