'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import Cookies from 'js-cookie';
import { AlertTriangle, Check, Loader2 } from 'lucide-react';
import type { Paddle } from '@paddle/paddle-js';
import type { BillingInterval, Catalog, CatalogPlan, Offer } from '@/lib/billing/catalog';
import { findOffer, offerFor, planHighlights, trialLabel } from '@/lib/billing/catalog';
import { getPaddle, openCheckout, previewPrices, type LocalizedPrices } from '@/lib/billing/paddleClient';
import { startCheckout } from '@/lib/api';

interface Props {
  catalog: Catalog | null;
  countryCode: string | null;
  /** Offer key chosen before signing in (from ?checkout=); checkout resumes once */
  resumeOfferKey?: string | null;
}

type Notice = { planId: string; kind: 'error' | 'info'; message: string; manage?: boolean };

const INTERVAL_WORD: Record<BillingInterval, string> = { month: 'monthly', year: 'yearly' };

/** Interval to show first: the one the recommended plan can actually be bought with. */
function initialInterval(catalog: Catalog | null, resume: Offer | null): BillingInterval {
  if (resume && resume.interval !== 'lifetime') return resume.interval;
  const rec = catalog?.plans.find((p) => p.recommended && !p.lifetime);
  if (rec && !rec.offers.month?.available && rec.offers.year?.available) return 'year';
  return 'month';
}

export default function PricingTable({ catalog, countryCode, resumeOfferKey }: Props) {
  const resumeOffer = catalog ? findOffer(catalog.plans, resumeOfferKey) : null;
  const [interval, setBillingInterval] = useState<BillingInterval>(() => initialInterval(catalog, resumeOffer));
  const [paddle, setPaddle] = useState<Paddle>();
  const [paddleState, setPaddleState] = useState<'loading' | 'ready' | 'failed' | 'off'>(catalog?.paddle.enabled ? 'loading' : 'off');
  const [localized, setLocalized] = useState<LocalizedPrices>({});
  const [currency, setCurrency] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const resumed = useRef(false);
  // Read after mount so server and client render the same markup first
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => setSignedIn(Boolean(Cookies.get('token'))), []);

  const checkoutEnabled = Boolean(catalog?.paddle.enabled && catalog.paddle.checkoutEnabled);

  // Load Paddle.js and Paddle's localized prices (display only; checkout is server-validated)
  useEffect(() => {
    if (!catalog?.paddle.enabled) return;
    let cancelled = false;
    (async () => {
      try {
        const instance = await getPaddle(catalog.paddle);
        if (!instance) throw new Error('Paddle did not load');
        if (cancelled) return;
        setPaddle(instance);
        setPaddleState('ready');
        const ids = catalog.plans.flatMap((p) => Object.values(p.offers)).filter((o) => o?.available && o.priceId).map((o) => o!.priceId!);
        const preview = await previewPrices(instance, ids, countryCode);
        if (cancelled) return;
        setLocalized(preview.prices);
        setCurrency(preview.currency);
      } catch {
        if (!cancelled) setPaddleState('failed');
      }
    })();
    return () => {
      cancelled = true;
    };
    // Catalog and country are fixed for the lifetime of the page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buy = async (offer: Offer) => {
    if (!offer.available || !offer.priceId) return;
    if (!Cookies.get('token')) {
      // Keep the choice through sign-up/sign-in, then come back and continue
      const next = `/pricing?checkout=${encodeURIComponent(offer.key)}`;
      window.location.href = `/auth?mode=register&next=${encodeURIComponent(next)}`;
      return;
    }
    if (!paddle || !checkoutEnabled) return;
    setNotice(null);
    setPending(offer.key);
    try {
      const { data } = await startCheckout(offer.priceId);
      openCheckout(paddle, data.transactionId, offer.plan);
      if (data.hasActiveSubscription) {
        setNotice({
          planId: offer.plan,
          kind: 'info',
          message: 'Your current subscription keeps renewing until you cancel it. Once Lifetime is active, cancel it from your billing page.',
          manage: true,
        });
      }
    } catch (err: unknown) {
      const res = (err as { response?: { status?: number; data?: { message?: string } } }).response;
      setNotice({
        planId: offer.plan,
        kind: 'error',
        message: res?.data?.message || 'Checkout could not be started. Please try again.',
        manage: res?.status === 409,
      });
    } finally {
      setPending(null);
    }
  };

  // Continue a checkout chosen before signing in, once Paddle is ready
  useEffect(() => {
    if (resumed.current || !resumeOffer || paddleState !== 'ready' || !Cookies.get('token')) return;
    resumed.current = true;
    window.history.replaceState(null, '', window.location.pathname + window.location.hash);
    if (resumeOffer.available && checkoutEnabled) buy(resumeOffer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paddleState]);

  if (!catalog) {
    return (
      <p role="status" className="mx-auto max-w-xl rounded-2xl border border-white/10 px-6 py-8 text-center text-white/60">
        Pricing couldn’t be loaded right now. Please refresh the page in a moment.
      </p>
    );
  }

  const hasSubscriptionPlans = catalog.plans.some((p) => !p.lifetime);
  const shownCurrency = currency && Object.keys(localized).length ? currency : 'USD';

  return (
    <div>
      {catalog.warnings.length > 0 && (
        <div role="note" className="mx-auto mb-8 max-w-3xl rounded-xl border border-dashed border-amber-400/40 bg-amber-400/[0.06] px-4 py-3 text-sm text-amber-200">
          <p className="flex items-center gap-2 font-medium">
            <AlertTriangle size={16} aria-hidden /> Billing configuration (shown in development only)
          </p>
          <ul className="mt-2 list-disc space-y-0.5 pl-6 text-amber-200/80">
            {catalog.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {hasSubscriptionPlans && (
        <div className="flex justify-center">
          <div role="radiogroup" aria-label="Billing period for Starter and Pro" className="inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1">
            {(['month', 'year'] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={interval === value}
                onClick={() => setBillingInterval(value)}
                className={`rounded-full px-5 py-2 text-sm font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C6EFF] ${
                  interval === value ? 'bg-white text-[#0D0D1A]' : 'text-white/60 hover:text-white'
                }`}
              >
                {value === 'month' ? 'Monthly' : 'Yearly'}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        {catalog.plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            plans={catalog.plans}
            interval={interval}
            onSwitchInterval={setBillingInterval}
            localized={localized}
            checkoutEnabled={checkoutEnabled}
            paddleState={paddleState}
            pending={pending}
            signedIn={signedIn}
            notice={notice?.planId === plan.id ? notice : null}
            onBuy={buy}
          />
        ))}
      </div>

      <p className="mx-auto mt-8 max-w-2xl text-center text-xs leading-relaxed text-white/45">
        {shownCurrency === 'USD'
          ? 'Prices are in US dollars. Sales tax or VAT may apply depending on your location.'
          : `Prices are shown in ${shownCurrency} for your location by our payment provider, including any applicable tax.`}{' '}
        The exact amount is shown at checkout before you pay. Payments are processed by Paddle, our reseller and merchant of record.
      </p>
    </div>
  );
}

interface CardProps {
  plan: CatalogPlan;
  plans: CatalogPlan[];
  interval: BillingInterval;
  onSwitchInterval: (i: BillingInterval) => void;
  localized: LocalizedPrices;
  checkoutEnabled: boolean;
  paddleState: 'loading' | 'ready' | 'failed' | 'off';
  pending: string | null;
  signedIn: boolean;
  notice: Notice | null;
  onBuy: (offer: Offer) => void;
}

function PlanCard({ plan, plans, interval, onSwitchInterval, localized, checkoutEnabled, paddleState, pending, signedIn, notice, onBuy }: CardProps) {
  const offer = offerFor(plan, interval);
  const other = !plan.lifetime ? plan.offers[interval === 'month' ? 'year' : 'month'] : null;
  const available = Boolean(offer?.available && offer.price);
  const price = available ? (offer!.priceId && localized[offer!.priceId]) || offer!.price!.formatted : null;
  const trial = available ? trialLabel(offer!.trial) : null;

  const ctaLabel = plan.lifetime ? 'Buy Lifetime Access' : trial ? `Start ${trial}` : `Subscribe ${INTERVAL_WORD[interval]}`;
  // Signed-out visitors can always choose a plan (they sign up first); signed-in users need open checkout
  const canClick = available && (!signedIn || (checkoutEnabled && paddleState === 'ready'));

  return (
    <section
      aria-labelledby={`plan-${plan.id}`}
      className={`relative flex flex-col rounded-2xl border p-7 transition-colors duration-300 ${
        plan.recommended ? 'border-[#7C6EFF]/60 bg-[#14142B]' : 'border-white/10 bg-[#111124] hover:border-white/20'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 id={`plan-${plan.id}`} className="font-display text-lg font-semibold text-white">
          {plan.name}
        </h3>
        {plan.recommended && <span className="rounded-full border border-[#7C6EFF]/50 px-2.5 py-0.5 text-xs font-medium text-[#BDB4FF]">Recommended</span>}
      </div>

      <div className="mt-6 min-h-[5.5rem]">
        {available ? (
          <>
            <p className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-display text-4xl font-semibold tracking-tight text-white" data-testid={`price-${plan.id}`}>
                {price}
              </span>
              <span className="text-sm text-white/50">{plan.lifetime ? 'one-time' : `/ ${interval}`}</span>
            </p>
            <p className="mt-2 text-sm text-white/55">
              {plan.lifetime
                ? 'One-time payment — Lifetime access'
                : trial
                  ? `${trial.replace(/^./, (c) => c.toUpperCase())}, then billed ${INTERVAL_WORD[interval]}`
                  : `Billed ${INTERVAL_WORD[interval]}. Renews until you cancel.`}
            </p>
          </>
        ) : other?.available ? (
          <div>
            <p className="text-sm text-white/55">{plan.name} is billed {INTERVAL_WORD[interval === 'month' ? 'year' : 'month']} only.</p>
            <button
              type="button"
              onClick={() => onSwitchInterval(other.interval as BillingInterval)}
              className="mt-2 text-sm font-medium text-[#BDB4FF] underline-offset-4 hover:text-white hover:underline"
            >
              Show {INTERVAL_WORD[other.interval as BillingInterval]} price
            </button>
          </div>
        ) : (
          <p className="text-sm text-white/55">Not available to buy yet.</p>
        )}
      </div>

      <ul className="mt-6 flex-1 space-y-3 border-t border-white/[0.06] pt-6 text-sm">
        {planHighlights(plan, plans).map((h) => (
          <li key={h} className="flex gap-2.5 text-white/75">
            <Check size={16} className="mt-0.5 flex-shrink-0 text-[#A89CFF]" aria-hidden />
            {h}
          </li>
        ))}
      </ul>

      <div className="mt-8">
        <button
          type="button"
          onClick={() => offer && onBuy(offer)}
          disabled={!canClick || pending !== null}
          className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C6EFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D0D1A] disabled:cursor-not-allowed disabled:opacity-50 ${
            plan.recommended ? 'bg-[#7C6EFF] text-white hover:bg-[#6A5EE0]' : 'bg-white/[0.08] text-white hover:bg-white/[0.14]'
          }`}
        >
          {pending === offer?.key && <Loader2 size={16} className="animate-spin" aria-hidden />}
          {ctaLabel}
        </button>
        {available && signedIn && !checkoutEnabled && <p className="mt-2 text-center text-xs text-white/45">Checkout opens soon.</p>}
        {available && signedIn && checkoutEnabled && paddleState === 'failed' && (
          <p className="mt-2 text-center text-xs text-white/45">Checkout couldn’t load. Please refresh the page.</p>
        )}
        {notice && (
          <p role={notice.kind === 'error' ? 'alert' : 'status'} className={`mt-3 text-sm ${notice.kind === 'error' ? 'text-red-300' : 'text-white/65'}`}>
            {notice.message}{' '}
            {notice.manage && (
              <Link href="/account/billing" className="underline underline-offset-2">
                Manage billing
              </Link>
            )}
          </p>
        )}
      </div>
    </section>
  );
}
