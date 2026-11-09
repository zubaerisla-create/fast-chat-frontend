'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { getMyBilling } from '@/lib/api';

const POLL_MS = 3000;
const MAX_ATTEMPTS = 20; // about a minute

// Paid access is granted by our backend once Paddle's webhook arrives, not by this page.
// We poll until the backend confirms it, so we never claim a plan that isn't active yet.
export default function WelcomeStatus() {
  const [state, setState] = useState<'checking' | 'active' | 'pending' | 'signed_out'>('checking');
  const [planName, setPlanName] = useState('');
  const [lifetime, setLifetime] = useState(false);

  useEffect(() => {
    if (!Cookies.get('token')) {
      setState('signed_out');
      return;
    }
    // The plan just bought (from the checkout success URL); any paid plan counts if absent
    const expected = new URLSearchParams(window.location.search).get('plan');
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;
    const check = async () => {
      attempts += 1;
      try {
        const { data } = await getMyBilling();
        const plan = data.entitlement.plan;
        if (plan !== 'free' && (!expected || plan === expected)) {
          setPlanName(data.entitlement.planName);
          setLifetime(Boolean(data.entitlement.lifetime));
          setState('active');
          return;
        }
      } catch {
        // keep trying until the limit
      }
      if (attempts >= MAX_ATTEMPTS) setState('pending');
      else timer = setTimeout(check, POLL_MS);
    };
    check();
    return () => clearTimeout(timer);
  }, []);

  if (state === 'active') {
    return (
      <div className="mt-8" role="status">
        <CheckCircle2 size={40} className="mx-auto text-emerald-400" aria-hidden />
        <p className="mt-4 text-lg text-white/80">{lifetime ? 'Advanced Lifetime is active. It never expires and there is nothing to renew.' : `Your ${planName} plan is active.`}</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/chat" className="rounded-xl bg-[#7C6EFF] px-5 py-3 font-medium text-white hover:bg-[#6A5EE0]">
            Open FastChat
          </Link>
          <Link href="/account/billing" className="rounded-xl border border-white/15 px-5 py-3 font-medium text-white/85 hover:text-white">
            View billing
          </Link>
        </div>
      </div>
    );
  }
  if (state === 'checking') {
    return (
      <div className="mt-8 flex flex-col items-center gap-3 text-white/70" role="status">
        <Loader2 size={28} className="animate-spin" aria-hidden />
        <p>Confirming your purchase…</p>
      </div>
    );
  }
  return (
    <div className="mt-8 text-white/70" role="status">
      <p>
        {state === 'signed_out'
          ? 'Sign in to see your plan.'
          : 'Your payment was received, but your plan is taking longer than usual to activate. It usually appears within a few minutes — check your billing page shortly.'}
      </p>
      <Link href={state === 'signed_out' ? '/auth' : '/account/billing'} className="mt-6 inline-block rounded-xl bg-[#7C6EFF] px-5 py-3 font-medium text-white">
        {state === 'signed_out' ? 'Sign in' : 'Go to billing'}
      </Link>
    </div>
  );
}
