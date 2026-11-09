'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { AlertTriangle, ArrowLeft, CreditCard, Loader2 } from 'lucide-react';
import RequireAuth from '@/components/providers/RequireAuth';
import { getMyBilling, openBillingPortal } from '@/lib/api';

interface Sub {
  id: string;
  provider: 'paddle';
  plan: string | null;
  interval: 'month' | 'year' | null;
  status: string;
  currentPeriodEnd: string | null;
  trialEnd: string | null;
  scheduledChange: { action: string; at: string } | null;
}
interface Billing {
  entitlement: {
    plan: string;
    planName: string;
    limits: { maxFileBytes: number };
    lifetime: { id: string; purchasedAt: string } | null;
    hasDuplicateSubscriptions: boolean;
  };
  subscriptions: Sub[];
  lifetimePurchases: { id: string; plan: string; status: 'active' | 'revoked'; purchasedAt: string }[];
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  trialing: 'Free trial',
  past_due: 'Payment overdue',
  paused: 'Paused',
  canceled: 'Canceled',
  expired: 'Expired',
  pending: 'Pending',
};
const date = (d: string | null) => (d ? format(new Date(d), 'MMMM d, yyyy') : '—');

function BillingContent() {
  const [data, setData] = useState<Billing | null>(null);
  const [error, setError] = useState('');
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    getMyBilling()
      .then((res) => setData(res.data))
      .catch(() => setError('Your billing details could not be loaded. Please try again.'));
  }, []);

  const manage = async () => {
    setOpening(true);
    setError('');
    try {
      const { data } = await openBillingPortal();
      window.location.href = data.url;
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(msg || 'Billing management could not be opened.');
      setOpening(false);
    }
  };

  // The Paddle portal shows invoices for one-time purchases too
  const hasPaddle = Boolean(data && (data.subscriptions.length > 0 || data.lifetimePurchases.length > 0));

  return (
    <div className="h-[100dvh] overflow-y-auto">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <Link href="/chat" className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white">
          <ArrowLeft size={16} aria-hidden /> Back to chats
        </Link>
        <h1 className="mt-6 font-display text-3xl font-bold text-white">Billing</h1>

        {!data && !error && (
          <div className="mt-10 flex justify-center" role="status" aria-label="Loading">
            <Loader2 className="animate-spin text-white/40" aria-hidden />
          </div>
        )}
        {error && (
          <p role="alert" className="mt-6 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        )}

        {data && (
          <>
            <section className="mt-8 rounded-2xl border border-white/10 bg-[#13132A] p-6">
              <p className="text-sm text-white/50">Current plan</p>
              <p className="mt-1 font-display text-2xl font-bold text-white">{data.entitlement.plan === 'free' ? 'No paid plan' : data.entitlement.planName}</p>
              <p className="mt-2 text-sm text-white/60">Files up to {Math.round(data.entitlement.limits.maxFileBytes / 1048576)} MB each</p>
              {data.entitlement.lifetime && (
                <p className="mt-2 text-sm text-emerald-300">
                  Lifetime access since {date(data.entitlement.lifetime.purchasedAt)}. One-time payment: no renewals and no expiry.
                </p>
              )}
              {data.entitlement.plan === 'free' && (
                <Link href="/pricing" className="mt-5 inline-block rounded-xl bg-[#7C6EFF] px-5 py-2.5 font-medium text-white hover:bg-[#6A5EE0]">
                  See plans
                </Link>
              )}
            </section>

            {data.entitlement.hasDuplicateSubscriptions && (
              <p className="mt-4 flex gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
                <AlertTriangle size={18} className="flex-shrink-0" aria-hidden />
                {data.entitlement.lifetime
                  ? 'You have Advanced Lifetime and a subscription that still renews. You no longer need the subscription. Cancel it with “Manage billing” below to avoid being charged again.'
                  : 'You have more than one active subscription. You only need one. Cancel the other to avoid paying twice.'}
              </p>
            )}

            {data.subscriptions.length > 0 && (
              <section className="mt-8">
                <h2 className="font-semibold text-white">Subscriptions</h2>
                <ul className="mt-3 space-y-3">
                  {data.subscriptions.map((s) => (
                    <li key={s.id} className="rounded-xl border border-white/10 p-4 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium capitalize text-white">
                          {s.plan ?? 'Unknown plan'} · {s.interval === 'year' ? 'yearly' : 'monthly'}
                        </span>
                        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white/80">{STATUS_LABEL[s.status] ?? s.status}</span>
                      </div>
                      <p className="mt-2 text-white/55">
                        Billed on the web
                        {s.status === 'trialing' && s.trialEnd ? ` · trial ends ${date(s.trialEnd)}` : ''}
                        {s.scheduledChange?.action === 'cancel'
                          ? ` · ends ${date(s.scheduledChange.at)}`
                          : s.currentPeriodEnd && !['canceled', 'expired'].includes(s.status)
                            ? ` · renews ${date(s.currentPeriodEnd)}`
                            : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              {hasPaddle && (
                <button
                  type="button"
                  onClick={manage}
                  disabled={opening}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-5 py-2.5 font-medium text-white hover:bg-white/15 disabled:opacity-60"
                >
                  {opening ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <CreditCard size={16} aria-hidden />}
                  Manage billing: payment method, invoices and cancellation
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function BillingPage() {
  return (
    <RequireAuth>
      <BillingContent />
    </RequireAuth>
  );
}
