import { useMemo, useState } from 'react';
import { useApp } from '../state/store';
import { buildReceiptModel, buildReceiptTextFromModel } from '../lib/receipt';
import {
  downloadBlob,
  exportReceiptImage,
  exportReceiptPdf,
  receiptExportName,
  shareFile,
  whatsAppReceipt,
} from '../lib/receiptExport';
import { QR_QUIET_ZONE, createQrMatrix } from '../lib/qr';
import { Sheet } from './Chrome';
import {
  ArrowForwardIcon,
  DownloadIcon,
  FileIcon,
  ImageIcon,
  LockIcon,
  QrIcon,
  ShareIcon,
  WhatsAppIcon,
} from './icons';

/* ------------------------------------------------------------------ */
/* QR symbol                                                          */
/* ------------------------------------------------------------------ */

/**
 * The transaction QR, drawn as a single SVG path.
 *
 * Built from the same matrix the exported image uses, so a receipt scanned off
 * the screen and one scanned off the PNG agree by construction.
 */
export function ReceiptQr({
  value,
  size = 116,
  title,
}: {
  value: string;
  size?: number;
  title?: string;
}) {
  const matrix = useMemo(() => createQrMatrix(value), [value]);

  // One path for all dark modules: a single DOM node instead of hundreds.
  const path = useMemo(() => {
    const parts: string[] = [];
    for (let row = 0; row < matrix.size; row += 1) {
      for (let col = 0; col < matrix.size; col += 1) {
        if (matrix.isDark(col, row)) parts.push(`M${col} ${row}h1v1h-1z`);
      }
    }
    return parts.join('');
  }, [matrix]);

  const view = matrix.size + QR_QUIET_ZONE * 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`${-QR_QUIET_ZONE} ${-QR_QUIET_ZONE} ${view} ${view}`}
      role="img"
      aria-label={title ?? value}
      shapeRendering="crispEdges"
    >
      {title ? <title>{title}</title> : null}
      {/* The quiet zone must be real light pixels for a scanner to lock on. */}
      <rect x={-QR_QUIET_ZONE} y={-QR_QUIET_ZONE} width={view} height={view} fill="#FFFFFF" />
      <path d={path} fill="var(--cx-deep)" />
    </svg>
  );
}

/** QR card shown on the success screens. */
export function ReceiptQrPanel({ value }: { value: string }) {
  const { t } = useApp();

  return (
    <section className="cx-qr">
      <span className="cx-qr__code">
        <ReceiptQr value={value} size={104} title={t('export.qrTitle')} />
      </span>
      <span className="cx-qr__meta">
        <span className="cx-qr__title">
          <QrIcon size={15} />
          {t('export.qrTitle')}
        </span>
        <span className="cx-qr__caption">{t('export.qrCaption')}</span>
        <span className="cx-qr__id" dir="ltr">
          {value}
        </span>
      </span>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Export sheet                                                       */
/* ------------------------------------------------------------------ */

type Busy = 'image' | 'pdf' | 'share' | 'whatsapp' | null;

/**
 * Export options for the receipt that is currently on screen.
 *
 * Mounted once from `App.tsx` and driven by `exportTxId` in the store, matching
 * how the help and navigation sheets work.
 */
export function ExportReceiptSheet() {
  const { exportTxId, closeReceiptExport, findTransaction, lang, t, showToast } = useApp();
  const [busy, setBusy] = useState<Busy>(null);

  const tx = exportTxId ? findTransaction(exportTxId) : undefined;
  if (!tx) return null;

  const model = buildReceiptModel(tx, lang, t);

  const run = async (kind: Exclude<Busy, null> | 'download', format: 'image' | 'pdf') => {
    setBusy(kind === 'download' ? format : kind);
    try {
      const blob = format === 'pdf' ? await exportReceiptPdf(model) : await exportReceiptImage(model);
      const filename = receiptExportName(model.id, format);

      if (kind === 'share') {
        const outcome = await shareFile(blob, filename, `${model.heading} · ${model.id}`);
        if (outcome === 'shared') showToast(t('export.shared'));
        else if (outcome === 'unsupported') {
          // Desktop browsers cannot hand files to the OS share sheet.
          downloadBlob(blob, filename);
          showToast(format === 'pdf' ? t('export.savedPdf') : t('export.savedImage'));
        }
        return;
      }

      downloadBlob(blob, filename);
      showToast(format === 'pdf' ? t('export.savedPdf') : t('export.savedImage'));
    } catch {
      showToast(t('export.failed'));
    } finally {
      setBusy(null);
    }
  };

  const sendWhatsApp = async () => {
    setBusy('whatsapp');
    try {
      const outcome = await whatsAppReceipt(model, buildReceiptTextFromModel(model, t));
      if (outcome === 'opened') showToast(t('whatsapp.opened'));
      else if (outcome === 'failed') showToast(t('export.failed'));
    } catch {
      showToast(t('export.failed'));
    } finally {
      setBusy(null);
    }
  };

  const disabled = busy !== null;

  return (
    <Sheet title={t('export.title')} onClose={closeReceiptExport}>
      <p className="cx-sheet__note">{t('export.subtitle')}</p>

      <div className="cx-export__qr">
        <ReceiptQr value={model.qrPayload} size={124} title={t('export.qrTitle')} />
        <span className="cx-export__id" dir="ltr">
          {model.id}
        </span>
      </div>

      <div className="cx-options">
        <ExportOption
          variant="whatsapp"
          icon={<WhatsAppIcon size={19} />}
          label={t('whatsapp.action')}
          hint={t('whatsapp.hint')}
          busy={busy === 'whatsapp'}
          disabled={disabled}
          trail={<ArrowForwardIcon size={16} />}
          onClick={() => void sendWhatsApp()}
        />
        <ExportOption
          icon={<ImageIcon size={19} />}
          label={t('export.saveImage')}
          hint={t('export.saveImageHint')}
          busy={busy === 'image'}
          disabled={disabled}
          onClick={() => void run('download', 'image')}
        />
        <ExportOption
          icon={<FileIcon size={19} />}
          label={t('export.savePdf')}
          hint={t('export.savePdfHint')}
          busy={busy === 'pdf'}
          disabled={disabled}
          onClick={() => void run('download', 'pdf')}
        />
        <ExportOption
          icon={<ShareIcon size={19} />}
          label={t('export.shareFile')}
          hint={t('export.shareFileHint')}
          busy={busy === 'share'}
          disabled={disabled}
          onClick={() => void run('share', 'image')}
        />
      </div>

      {busy ? (
        <p className="cx-export__busy" role="status">
          <span className="cx-spinner cx-spinner--dark" />
          {t('export.busy')}
        </p>
      ) : null}

      <p className="cx-export__note">
        <LockIcon size={14} />
        {t('tx.demoNote')}
      </p>
    </Sheet>
  );
}

function ExportOption({
  icon,
  label,
  hint,
  busy,
  disabled,
  trail,
  variant,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  busy: boolean;
  disabled: boolean;
  /** Trailing glyph; the download arrow unless the action leaves the app. */
  trail?: React.ReactNode;
  variant?: 'whatsapp';
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={variant ? `cx-option cx-option--${variant}` : 'cx-option'}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="cx-option__icon">
        {busy ? <span className="cx-spinner cx-spinner--dark" /> : icon}
      </span>
      <span className="cx-option__text">
        <span className="cx-option__label">{label}</span>
        <span className="cx-option__hint">{hint}</span>
      </span>
      <span className="cx-option__trail">
        {trail ?? <DownloadIcon size={16} />}
      </span>
    </button>
  );
}
