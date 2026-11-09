'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { AlertTriangle, Check, CreditCard, ExternalLink, Infinity as InfinityIcon, Sparkles } from 'lucide-react';
import { PageBody } from '@/components/app/AppShell';
import { Badge, Button, Card, ErrorState, PageHeader, Progress, Skeleton, cx, formatBytes } from '@/components/app/ui';
import { billing, errorMessage, type UsageResponse } from '@/lib/saas';
import api from '@/lib/api';
import type { CatalogPlan } from '@/lib/billing/catalog';
import { offerFor, trialLabel } from '@/lib/billing/catalog';

interface MyBilling {
  entitlement: { plan: string; planName: string; lifetime: { purchasedAt: string } | null; hasDuplicateSubscriptions: boolean; subscription: { status: string; interval: string; currentPeriodEnd: string | null; trialEnd: string | null; scheduledChange: { action: string; at: string } | null } | null };
  subscriptions: { id: string; plan: string; interval: string; status: string; currentPeriodEnd: string | null }[];
  lifetimePurchases: { id: string; purchasedAt: string; status: string }[];
}

const STATUS: Record<string, { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' | 'accent' }> = {
  active: { label: 'Active', tone: 'success' },
  trialing: { label: 'Free trial', tone: 'accent' },
  past_due: { label: 'Payment overdue', tone: 'danger' },
  paused: { label: 'Paused', tone: 'warning' },
  canceled: { label: 'Canceled', tone: 'neutral' },
};

export default function BillingPage() {
  const [me, setMe] = useState<MyBilling | null>(null);
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [plans, setPlans] = useState<CatalogPlan[] | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [error, setError] = useState(false);
  const [interval, setBillInterval] = useState<'month' | 'year'>('month');
  const [opening, setOpening] = useState(false);

  const load = () => {
    setError(false);
    billing.me().then(setMe).catch(() => setError(true));
    billing.usage().then(setUsage).catch(() => {});
    api
      .get('/api/billing/catalog')
      .then((r) => {
        setPlans(r.data.plans);
        setCheckoutOpen(Boolean(r.data.paddle?.enabled && r.data.paddle?.checkoutEnabled));
      })
      .catch(() => setPlans([]));
  };
  useEffect(load, []);

  const ent = me?.entitlement;
  const sub = ent?.subscription;
  const hasPaddle = Boolean(me && (me.subscriptions.length || me.lifetimePurchases.length));

  return (
    <PageBody>
      <PageHeader icon={CreditCard} title="Plan & billing" description="Your plan, usage and payments." />
      {error && <ErrorState text="Billing details couldn’t be loaded." onRetry={load} />}

      <Card>
        {!ent ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-8 w-48" />
          </div>
        ) : (
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ui-accent-soft text-ui-accent-text">{ent.lifetime ? <InfinityIcon size={24} /> : <Sparkles size={22} />}</span>
            <div className="flex-1">
              <p className="text-xs font-medium uppercase tracking-wider text-ui-subtle">Current plan</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-semibold tracking-tight text-ui-text">{ent.plan === 'free' ? 'No paid plan' : ent.planName}</h2>
                {ent.lifetime ? <Badge tone="success">Lifetime</Badge> : sub && <Badge tone={STATUS[sub.status]?.tone ?? 'neutral'}>{STATUS[sub.status]?.label ?? sub.status}</Badge>}
              </div>
              <p className="mt-1 text-sm text-ui-muted">
                {ent.lifetime
                  ? `One-time payment on ${format(new Date(ent.lifetime.purchasedAt), 'MMMM d, yyyy')}. No renewals, never expires.`
                  : sub
                    ? sub.status === 'trialing' && sub.trialEnd
                      ? `Trial ends ${format(new Date(sub.trialEnd), 'MMMM d, yyyy')}, then billed ${sub.interval === 'year' ? 'yearly' : 'monthly'}.`
                      : sub.scheduledChange?.action === 'cancel'
                        ? `Canceled. Access continues until ${format(new Date(sub.scheduledChange.at), 'MMMM d, yyyy')}.`
                        : sub.currentPeriodEnd
                          ? `Billed ${sub.interval === 'year' ? 'yearly' : 'monthly'}. Renews ${format(new Date(sub.currentPeriodEnd), 'MMMM d, yyyy')}.`
                          : ''
                    : 'You’re using FastChat with the standard limits below.'}
              </p>
            </div>
            {hasPaddle && (
              <Button
                variant="secondary"
                icon={ExternalLink}
                loading={opening}
                onClick={async () => {
                  setOpening(true);
                  try {
                    window.location.href = await billing.portal();
                  } catch (e) {
                    toast.error(errorMessage(e));
                    setOpening(false);
                  }
                }}
              >
                Manage billing
              </Button>
            )}
          </div>
        )}
        {ent?.hasDuplicateSubscriptions && (
          <p className="mt-4 flex gap-2 rounded-lg border border-ui-warning/40 bg-ui-warning/10 p-3 text-sm text-ui-text">
            <AlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-ui-warning" />
            {ent.lifetime ? 'You have Lifetime access and a subscription that still renews. Cancel the subscription in “Manage billing” so you’re not charged again.' : 'You have more than one active subscription. Cancel one in “Manage billing”.'}
          </p>
        )}
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-ui-text">Usage</h2>
        {!usage ? (
          <Skeleton className="mt-4 h-24" />
        ) : (
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <Meter label="File storage" used={usage.usage.storage.used} limit={usage.usage.storage.limit} fmt={formatBytes} />
            <Meter label="Workspaces you own" used={usage.usage.workspaces.used} limit={usage.usage.workspaces.limit} />
            <div className="space-y-1">
              <p className="text-sm text-ui-muted">Largest file you can send</p>
              <p className="text-sm font-semibold text-ui-text">{formatBytes(usage.usage.maxFileBytes)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-ui-muted">AI assistant</p>
              <p className="text-sm text-ui-text">
                <b>{usage.usage.aiRequests.limit ?? 'Unlimited'}</b> requests / month on your plan. <Badge tone="warning">Coming soon</Badge>
              </p>
            </div>
            {usage.workspaces.map((w) => (
              <div key={w.id} className="space-y-3 rounded-xl border border-ui-border p-4 sm:col-span-2">
                <p className="text-sm font-semibold text-ui-text">{w.name}</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Meter label="Members (incl. pending invites)" used={w.members.used} limit={w.members.limit} />
                  <Meter label="Channels" used={w.channels.used} limit={w.channels.limit} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <section>
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold text-ui-text">Plans</h2>
          <div className="inline-flex rounded-lg border border-ui-border bg-ui-panel p-0.5" role="radiogroup" aria-label="Billing period">
            {(['month', 'year'] as const).map((i) => (
              <button key={i} type="button" role="radio" aria-checked={interval === i} onClick={() => setBillInterval(i)} className={cx('rounded-md px-3 py-1 text-[13px] font-medium', interval === i ? 'bg-ui-sunken text-ui-text' : 'text-ui-muted')}>
                {i === 'month' ? 'Monthly' : 'Yearly'}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {!plans
            ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-48 !rounded-xl" />)
            : plans.map((p) => {
                const offer = offerFor(p, interval);
                const current = ent?.plan === p.id;
                const trial = offer?.available ? trialLabel(offer.trial) : null;
                return (
                  <Card key={p.id} className={cx('flex flex-col', p.recommended && 'border-ui-accent/50')}>
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-ui-text">{p.name}</h3>
                      {current ? <Badge tone="success">Current</Badge> : p.recommended && <Badge tone="accent">Recommended</Badge>}
                    </div>
                    <p className="mt-3 text-2xl font-semibold tracking-tight text-ui-text">
                      {offer?.available && offer.price ? offer.price.formatted : '—'}
                      <span className="text-sm font-normal text-ui-subtle"> {p.lifetime ? 'one-time' : `/ ${interval}`}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-ui-subtle">{p.lifetime ? 'Lifetime access' : trial ?? (offer?.available ? 'No trial' : 'Not available yet')}</p>
                    <ul className="mt-4 flex-1 space-y-1.5 text-[13px] text-ui-muted">
                      {[`${p.maxFileSizeMb} MB per file`, p.features.includes('priority_support') ? 'Priority support' : 'Email support', p.features.includes('group_calls') ? 'Group calls' : null].filter(Boolean).map((f) => (
                        <li key={f} className="flex items-center gap-2">
                          <Check size={14} className="text-ui-accent" /> {f}
                        </li>
                      ))}
                    </ul>
                    {!current && offer?.available && (
                      <Link href={`/pricing?checkout=${offer.key}`} className="mt-4">
                        <Button variant={p.recommended ? 'primary' : 'secondary'} className="w-full">
                          {p.lifetime ? 'Buy Lifetime Access' : `Choose ${p.name}`}
                        </Button>
                      </Link>
                    )}
                  </Card>
                );
              })}
        </div>
        {!checkoutOpen && <p className="mt-3 text-xs text-ui-subtle">Checkout isn’t open yet. Paid plans can be bought once our payment account is approved.</p>}
      </section>
    </PageBody>
  );
}

function Meter({ label, used, limit, fmt = (n: number) => String(n) }: { label: string; used: number; limit: number | null; fmt?: (n: number) => string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-ui-muted">{label}</span>
        <span className="tabular-nums text-ui-text">
          <b>{fmt(used)}</b> <span className="text-ui-subtle">/ {limit === null ? 'Unlimited' : fmt(limit)}</span>
        </span>
      </div>
      <Progress value={used} max={limit} />
    </div>
  );
}
