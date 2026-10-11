import { useCallback, useEffect, useRef, useState } from 'react';
import { copyText } from '../lib/share';
import { useApp } from '../state/store';
import { CheckIcon, CopyIcon } from './icons';

export function CopyButton({ value, label }: { value: string; label?: string }) {
  const { t, showToast } = useApp();
  const [done, setDone] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const handleCopy = useCallback(async () => {
    const ok = await copyText(value);
    if (ok) {
      setDone(true);
      showToast(t('common.copied'));
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setDone(false), 1800);
    }
  }, [showToast, t, value]);

  return (
    <button
      type="button"
      className={['cx-copybtn', done ? 'cx-copybtn--done' : ''].filter(Boolean).join(' ')}
      onClick={handleCopy}
      aria-label={`${label ?? t('common.copy')}: ${value}`}
      title={done ? t('common.copied') : t('common.copy')}
    >
      {done ? <CheckIcon size={14} /> : <CopyIcon size={15} />}
    </button>
  );
}
