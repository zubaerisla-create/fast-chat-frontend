'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import RequireAuth from '@/components/providers/RequireAuth';
import { getAdminBillingSummary } from '@/lib/api';

interface Customer {
  userId: string;
  username: string;
  email: string;
  plan: string | null;
  billing: 'month' | 'year' | 'lifetime' | null;
  status: string | null;
  currentPeriodEnd: string | null;
  trialEnd: string | null;
  scheduledChange: { action: string; at: string } | null;
  lifetimePurchasedAt: string | null;
  subscriptionAlongsideLifetime: boolean;
}
interface Summary {
  billing: { paddle: { environment: string; checkoutEnabled: boolean; missingPriceEnv: string[] } | null };
  users: { total: number; starter: number; pro: number; advancedLifetime: number };
  subscriptionsByStatus: { status: string; count: number }[];
  monthlyRecurringRevenue: { currency_code: string; mrr_minor: string; subscriptions: number }[];
  lifetimeRevenue: { currency_code: string; total_minor: string; purchases: number }[];
  customers: Customer[];
  recentTransactions: { id: string; status: string; currency_code: string; total_minor: string; billed_at: string | null; username: string | null; lifetime: boolean }[];
  recentWebhookEvents: { provider: string; event_id: string; event_type: string; status: string; received_at: string; error: string | null }[];
}

// Amounts arrive in minor units per currency; Intl formats them without converting currencies
const money = (minor: string | number, currency: string) => {
  const fmt = new Intl.NumberFormat('en', { style: 'currency', currency });
  return fmt.format(Number(minor) / 10 ** (fmt.resolvedOptions().maximumFractionDigits ?? 2));
};
const when = (d: string | null) => (d ? format(new Date(d), 'MMM d, HH:mm') : '—');
const day = (d: string | null) => (d ? format(new Date(d), 'MMM d, yyyy') : '—');
const BILLING_LABEL = { month: 'Monthly', year: 'Yearly', lifetime: 'Lifetime (one-time)' } as const;

/** Renewal / expiry column: Lifetime never expires; subscriptions show trial end, scheduled end or renewal. */
function renewal(c: Customer): string {
  if (c.billing === 'lifetime') return `Never expires (bought ${day(c.lifetimePurchasedAt)})`;
  if (c.status === 'trialing' && c.trialEnd) return `Trial ends ${day(c.trialEnd)}`;
  if (c.scheduledChange?.action === 'cancel') return `Ends ${day(c.scheduledChange.at)}`;
  if (c.status === 'canceled') return 'Ended';
  return c.currentPeriodEnd ? `Renews ${day(c.currentPeriodEnd)}` : '—';
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#13132A] p-4">
      <p className="text-xs uppercase tracking-wider text-white/45">{label}</p>
      <p className="mt-1.5 font-display text-2xl font-bold text-white tabular-nums">{value}</p>
    </div>
  );
}

function AdminBilling() {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getAdminBillingSummary()
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.status === 403 ? 'You do not have access to this page.' : 'The summary could not be loaded.'));
  }, []);

  if (error) return <p className="p-8 text-white/70">{error}</p>;
  if (!data)
    return (
      <div className="flex h-[100dvh] items-center justify-center" role="status" aria-label="Loading">
        <Loader2 className="animate-spin text-white/40" aria-hidden />
      </div>
    );

  const count = (status: string) => data.subscriptionsByStatus.filter((s) => s.status === status).reduce((n, s) => n + s.count, 0);

  return (
    <div className="h-[100dvh] overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-10 px-4 py-10 sm:px-6">
        <header>
          <h1 className="font-display text-3xl font-bold text-white">Billing overview</h1>
          <p className="mt-2 text-sm text-white/55">
            Paddle: {data.billing.paddle ? `${data.billing.paddle.environment}, checkout ${data.billing.paddle.checkoutEnabled ? 'on' : 'off'}` : 'not configured'}
          </p>
          {!!data.billing.paddle?.missingPriceEnv.length && (
            <p className="mt-1 text-sm text-amber-300">Not configured (cannot be bought): {data.billing.paddle.missingPriceEnv.join(', ')}</p>
          )}
        </header>

        <section aria-label="Users">
          <h2 className="mb-3 font-semibold text-white">Users</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Total accounts" value={data.users.total} />
            <Stat label="Starter" value={data.users.starter} />
            <Stat label="Pro" value={data.users.pro} />
            <Stat label="Advanced Lifetime" value={data.users.advancedLifetime} />
          </div>
        </section>

        <section aria-label="Subscriptions">
          <h2 className="mb-3 font-semibold text-white">Subscriptions</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Active" value={count('active')} />
            <Stat label="Trialing" value={count('trialing')} />
            <Stat label="Past due" value={count('past_due')} />
            <Stat label="Canceled" value={count('canceled') + count('expired')} />
          </div>
        </section>

        <section aria-label="Revenue" className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-[#13132A] p-4">
            <p className="text-xs uppercase tracking-wider text-white/45">Monthly recurring revenue (web, before tax)</p>
            {data.monthlyRecurringRevenue.length === 0 ? (
              <p className="mt-2 text-white/60">No paying subscriptions yet</p>
            ) : (
              data.monthlyRecurringRevenue.map((r) => (
                <p key={r.currency_code} className="mt-1.5 font-display text-2xl font-bold text-white tabular-nums">
                  {money(r.mrr_minor, r.currency_code)} <span className="text-sm font-normal text-white/50">from {r.subscriptions}</span>
                </p>
              ))
            )}
          </div>
          <div className="rounded-xl border border-white/10 bg-[#13132A] p-4">
            <p className="text-xs uppercase tracking-wider text-white/45">Advanced Lifetime sales (all time, incl. tax)</p>
            {data.lifetimeRevenue.length === 0 ? (
              <p className="mt-2 text-white/60">No Lifetime purchases yet</p>
            ) : (
              data.lifetimeRevenue.map((r) => (
                <p key={r.currency_code} className="mt-1.5 font-display text-2xl font-bold text-white tabular-nums">
                  {money(r.total_minor, r.currency_code)} <span className="text-sm font-normal text-white/50">from {r.purchases}</span>
                </p>
              ))
            )}
          </div>
        </section>

        <section aria-label="Customers">
          <h2 className="mb-3 font-semibold text-white">Customers</h2>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-white/[0.04] text-white/70">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Billing</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Renewal / expiry</th>
                </tr>
              </thead>
              <tbody>
                {data.customers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-white/50">
                      No customers yet
                    </td>
                  </tr>
                )}
                {data.customers.map((c) => (
                  <tr key={c.userId} className="border-t border-white/5 text-white/80">
                    <td className="px-4 py-3">
                      <span className="text-white">{c.username}</span>
                      <span className="block text-xs text-white/45">{c.email}</span>
                    </td>
                    <td className="px-4 py-3 capitalize">{c.plan ?? 'unknown price'}</td>
                    <td className="px-4 py-3">{c.billing ? BILLING_LABEL[c.billing] : '—'}</td>
                    <td className="px-4 py-3">
                      {c.status ?? '—'}
                      {c.subscriptionAlongsideLifetime && <span className="block text-xs text-amber-300">Subscription still renewing</span>}
                    </td>
                    <td className="px-4 py-3">{renewal(c)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-label="Recent transactions">
          <h2 className="mb-3 font-semibold text-white">Recent transactions</h2>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-white/[0.04] text-white/70">
                <tr>
                  <th className="px-4 py-3 font-medium">Billed</th>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Paddle ID</th>
                </tr>
              </thead>
              <tbody>
                {data.recentTransactions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-white/50">
                      No transactions yet
                    </td>
                  </tr>
                )}
                {data.recentTransactions.map((t) => (
                  <tr key={t.id} className="border-t border-white/5 text-white/80">
                    <td className="px-4 py-3">{when(t.billed_at)}</td>
                    <td className="px-4 py-3">{t.username ?? '—'}</td>
                    <td className="px-4 py-3">
                      {t.status}
                      {t.lifetime && <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs">Lifetime</span>}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{t.total_minor ? money(t.total_minor, t.currency_code) : '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-white/50">{t.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-label="Recent webhook events">
          <h2 className="mb-3 font-semibold text-white">Recent webhook events</h2>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-white/[0.04] text-white/70">
                <tr>
                  <th className="px-4 py-3 font-medium">Received</th>
                  <th className="px-4 py-3 font-medium">Provider</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {data.recentWebhookEvents.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-white/50">
                      No events yet
                    </td>
                  </tr>
                )}
                {data.recentWebhookEvents.map((e) => (
                  <tr key={`${e.provider}-${e.event_id}`} className="border-t border-white/5 text-white/80">
                    <td className="px-4 py-3">{when(e.received_at)}</td>
                    <td className="px-4 py-3">{e.provider}</td>
                    <td className="px-4 py-3 font-mono text-xs">{e.event_type}</td>
                    <td className={`px-4 py-3 ${e.status === 'failed' ? 'text-red-300' : ''}`} title={e.error ?? undefined}>
                      {e.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function AdminBillingPage() {
  return (
    <RequireAuth>
      <AdminBilling />
    </RequireAuth>
  );
}
