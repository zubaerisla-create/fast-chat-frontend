'use client';

// FastChat app design system primitives. Colours come from theme tokens (ui-*), so every
// component works in light and dark mode. Keep these small and composable.
import { forwardRef, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { safeMediaUrl } from '@/lib/safeUrl';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

// ─── Buttons ─────────────────────────────────────────────────────────────────
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-ui-accent text-white hover:bg-ui-accent/90 shadow-sm',
  secondary: 'bg-ui-panel text-ui-text border border-ui-border hover:bg-ui-sunken',
  ghost: 'text-ui-muted hover:bg-ui-sunken hover:text-ui-text',
  danger: 'bg-ui-danger text-white hover:bg-ui-danger/90',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md';
  loading?: boolean;
  icon?: LucideIcon;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant = 'primary', size = 'md', loading, icon: Icon, className, children, disabled, ...rest }, ref) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent/60 focus-visible:ring-offset-1 focus-visible:ring-offset-ui-bg disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'h-8 px-3 text-[13px]' : 'h-9 px-3.5 text-sm',
        VARIANTS[variant],
        className
      )}
      {...rest}
    >
      {loading ? <Loader2 size={15} className="animate-spin" aria-hidden /> : Icon ? <Icon size={15} aria-hidden /> : null}
      {children}
    </button>
  );
});

export function IconButton({ icon: Icon, label, active, className, size = 16, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon; label: string; active?: boolean; size?: number }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        'inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent/60',
        active ? 'bg-ui-accent-soft text-ui-accent-text' : 'text-ui-muted hover:bg-ui-sunken hover:text-ui-text',
        className
      )}
      {...rest}
    >
      <Icon size={size} aria-hidden />
    </button>
  );
}

// ─── Inputs ──────────────────────────────────────────────────────────────────
const fieldClass =
  'w-full rounded-lg border border-ui-border bg-ui-panel px-3 text-sm text-ui-text placeholder:text-ui-subtle transition-colors focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent/20 disabled:opacity-60';

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cx(fieldClass, 'h-9', className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cx(fieldClass, 'py-2', className)} {...rest} />;
});

export function Select({ className, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx(fieldClass, 'h-9 pr-8', className)} {...rest}>
      {children}
    </select>
  );
}

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: React.ReactNode; children: React.ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[13px] font-medium text-ui-text">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-ui-subtle">{hint}</p>}
    </div>
  );
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx('relative h-5 w-9 flex-shrink-0 rounded-full transition-colors disabled:opacity-50', checked ? 'bg-ui-accent' : 'bg-ui-border')}
    >
      <span className={cx('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-[18px]' : 'translate-x-0.5')} />
    </button>
  );
}

// ─── Display ─────────────────────────────────────────────────────────────────
const AVATAR_COLORS = ['#6353F1', '#0E9F6E', '#D97706', '#DB2777', '#2563EB', '#7C3AED', '#0891B2', '#DC2626'];
const colorFor = (seed: string) => AVATAR_COLORS[Array.from(seed).reduce((n, c) => n + c.charCodeAt(0), 0) % AVATAR_COLORS.length];

export function Avatar({ name, src, size = 32, online, square }: { name: string; src?: string | null; size?: number; online?: boolean; square?: boolean }) {
  const safe = safeMediaUrl(src);
  const [broken, setBroken] = useState(false);
  const initials = name
    .replace(/^#/, '')
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '?';
  return (
    <span className="relative inline-flex flex-shrink-0" style={{ width: size, height: size }}>
      {safe && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={safe} alt="" onError={() => setBroken(true)} className={cx('h-full w-full object-cover', square ? 'rounded-[28%]' : 'rounded-full')} />
      ) : (
        <span
          aria-hidden
          className={cx('flex h-full w-full items-center justify-center font-semibold text-white', square ? 'rounded-[28%]' : 'rounded-full')}
          style={{ background: colorFor(name), fontSize: Math.max(10, size * 0.38) }}
        >
          {initials}
        </span>
      )}
      {online !== undefined && (
        <span
          aria-label={online ? 'Online' : 'Offline'}
          className={cx('absolute bottom-0 right-0 rounded-full border-2 border-ui-panel', online ? 'bg-ui-success' : 'bg-ui-subtle')}
          style={{ width: Math.max(8, size * 0.3), height: Math.max(8, size * 0.3) }}
        />
      )}
    </span>
  );
}

const BADGE_TONES = {
  neutral: 'bg-ui-sunken text-ui-muted',
  accent: 'bg-ui-accent-soft text-ui-accent-text',
  success: 'bg-ui-success/10 text-ui-success',
  warning: 'bg-ui-warning/10 text-ui-warning',
  danger: 'bg-ui-danger/10 text-ui-danger',
};
export function Badge({ tone = 'neutral', children, className }: { tone?: keyof typeof BADGE_TONES; children: React.ReactNode; className?: string }) {
  return <span className={cx('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium', BADGE_TONES[tone], className)}>{children}</span>;
}

export function Count({ n, muted }: { n: number; muted?: boolean }) {
  if (!n) return null;
  return (
    <span className={cx('inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums', muted ? 'bg-ui-sunken text-ui-muted' : 'bg-ui-accent text-white')}>
      {n > 99 ? '99+' : n}
    </span>
  );
}

export function Card({ children, className, padded = true }: { children: React.ReactNode; className?: string; padded?: boolean }) {
  return <section className={cx('rounded-xl border border-ui-border bg-ui-panel', padded && 'p-5', className)}>{children}</section>;
}

export function PageHeader({ title, description, actions, icon: Icon }: { title: string; description?: React.ReactNode; actions?: React.ReactNode; icon?: LucideIcon }) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-start gap-3">
        {Icon && (
          <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-ui-border bg-ui-panel text-ui-muted">
            <Icon size={17} aria-hidden />
          </span>
        )}
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-ui-text">{title}</h1>
          {description && <p className="mt-0.5 text-sm text-ui-muted">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx('skeleton', className)} />;
}

export function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 !rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-ui-border bg-ui-panel text-ui-subtle shadow-sm">
        <Icon size={20} aria-hidden />
      </span>
      <h3 className="mt-4 text-[15px] font-semibold text-ui-text">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-sm text-ui-muted">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ text, onRetry }: { text: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-ui-danger/30 bg-ui-danger/5 px-6 py-8 text-center">
      <p className="text-sm text-ui-danger">{text}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function Progress({ value, max, tone }: { value: number; max: number | null; tone?: 'accent' | 'warning' | 'danger' }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const t = tone ?? (pct >= 100 ? 'danger' : pct >= 80 ? 'warning' : 'accent');
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-ui-sunken" role="progressbar" aria-valuenow={value} aria-valuemax={max ?? undefined}>
      <div className={cx('h-full rounded-full transition-all duration-500', t === 'danger' ? 'bg-ui-danger' : t === 'warning' ? 'bg-ui-warning' : 'bg-ui-accent')} style={{ width: `${max ? pct : 0}%` }} />
    </div>
  );
}

export function Tabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (v: T) => void; tabs: { value: T; label: string; count?: number }[] }) {
  return (
    <div role="tablist" className="flex gap-1 border-b border-ui-border">
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          type="button"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cx(
            '-mb-px flex items-center gap-1.5 border-b-2 px-3 pb-2.5 pt-1 text-sm font-medium transition-colors',
            value === t.value ? 'border-ui-accent text-ui-text' : 'border-transparent text-ui-muted hover:text-ui-text'
          )}
        >
          {t.label}
          {t.count !== undefined && <span className="rounded bg-ui-sunken px-1.5 text-[11px] tabular-nums text-ui-muted">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

// ─── Overlays ────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, description, children, footer, size = 'md' }: { open: boolean; onClose: () => void; title: string; description?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; size?: 'sm' | 'md' | 'lg' }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.activeElement as HTMLElement | null;
    setTimeout(() => panel.current?.querySelector<HTMLElement>('input,textarea,select,button')?.focus(), 30);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [open, onClose]);
  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div className="app-root fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          'animate-pop-in flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-ui-border bg-ui-panel text-ui-text shadow-2xl sm:rounded-2xl',
          size === 'sm' ? 'sm:max-w-sm' : size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg'
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-ui-border px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-ui-muted">{description}</p>}
          </div>
          <IconButton icon={X} label="Close" onClick={onClose} />
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-ui-border bg-ui-sunken/50 px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

export function Confirm({ open, onClose, onConfirm, title, text, confirmLabel = 'Confirm', danger, loading }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; text: React.ReactNode; confirmLabel?: string; danger?: boolean; loading?: boolean }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-ui-muted">{text}</p>
    </Modal>
  );
}

/** Small dropdown menu anchored to its trigger. */
export function Menu({ trigger, items, align = 'right' }: { trigger: (open: boolean, toggle: () => void) => React.ReactNode; items: ({ label: string; icon?: LucideIcon; onClick: () => void; danger?: boolean; disabled?: boolean } | 'divider' | null | false | undefined)[]; align?: 'left' | 'right' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      {trigger(open, () => setOpen((o) => !o))}
      {open && (
        <div role="menu" className={cx('animate-pop-in absolute z-50 mt-1 min-w-[190px] rounded-xl border border-ui-border bg-ui-raised p-1 shadow-xl', align === 'right' ? 'right-0' : 'left-0')}>
          {items.filter(Boolean).map((item, i) =>
            item === 'divider' ? (
              <div key={`d${i}`} className="my-1 h-px bg-ui-border" />
            ) : item ? (
              <button
                key={item.label}
                role="menuitem"
                type="button"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
                className={cx('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors disabled:opacity-40', item.danger ? 'text-ui-danger hover:bg-ui-danger/10' : 'text-ui-text hover:bg-ui-sunken')}
              >
                {item.icon && <item.icon size={15} className={item.danger ? '' : 'text-ui-muted'} aria-hidden />}
                {item.label}
              </button>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}

export const formatBytes = (b: number | null | undefined) => {
  if (b === null || b === undefined) return '—';
  if (b < 1024) return `${b} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let v = b / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v >= 10 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
};
