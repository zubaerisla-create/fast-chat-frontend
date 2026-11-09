import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import PricingTable from '@/components/marketing/PricingTable';
import { fetchCatalog, trialLabel, type Catalog } from '@/lib/billing/catalog';
import { countryFromHeaders } from '@/lib/billing/country';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'FastChat plans: Starter and Pro subscriptions, or Advanced Lifetime with a single one-time payment.',
  alternates: { canonical: '/pricing' },
};

/** Trial answer built from what Paddle actually has configured, so it can't overstate. */
function trialAnswer(catalog: Catalog | null): string {
  const trials = (catalog?.plans ?? []).flatMap((p) =>
    Object.values(p.offers)
      .filter((o) => o?.available && o.trial)
      .map((o) => `${p.name} ${o!.interval === 'month' ? 'monthly' : 'yearly'} (${trialLabel(o!.trial)})`)
  );
  if (!trials.length) return 'Our plans don’t currently include a free trial. You’re charged when you subscribe or buy.';
  return `A free trial is currently included with: ${trials.join(', ')}. You enter a payment method at checkout and are charged when the trial ends unless you cancel before then. Other options are charged right away.`;
}

export default async function PricingPage({ searchParams }: { searchParams: { checkout?: string } }) {
  const catalog = await fetchCatalog();
  const countryCode = countryFromHeaders(headers());

  const faqs = [
    { q: 'Is there a free trial?', a: trialAnswer(catalog) },
    {
      q: 'How do subscriptions renew?',
      a: 'Starter and Pro are subscriptions billed in advance, monthly or yearly, and renew automatically until you cancel. You can cancel at any time from your billing page; you keep your plan until the end of the period you’ve paid for.',
    },
    {
      q: 'What does Advanced Lifetime include?',
      a: 'Advanced Lifetime is a single one-time payment. There’s no subscription and no renewal, and your Advanced access doesn’t expire.',
    },
    {
      q: 'I already subscribe. Can I switch to Lifetime?',
      a: 'Yes. Buy Advanced Lifetime, then cancel your subscription from your billing page so it doesn’t renew.',
    },
    {
      q: 'Do you offer refunds?',
      a: 'Refunds are covered in our Refund Policy.',
      link: { href: '/refund-policy', label: 'Read the Refund Policy' },
    },
    {
      q: 'Why might the price show in my currency?',
      a: 'Our payment provider, Paddle, may show prices in your local currency based on your location. Sales tax or VAT may apply; the final amount is always shown before you pay.',
    },
    {
      q: 'Can I buy a plan in the Android app?',
      a: 'Not yet. Plans are bought on this website. When you sign in to the Android app with the same account, your plan is applied automatically.',
    },
  ];

  const plans = catalog?.plans ?? [];
  const comparison: [string, ...string[]][] = [
    ['Real-time messaging, typing and read status', ...plans.map(() => '✓')],
    ['Photos, videos, files and voice messages', ...plans.map(() => '✓')],
    ['Web and Android with one account', ...plans.map(() => '✓')],
    ['Maximum size per file', ...plans.map((p) => `${p.maxFileSizeMb} MB`)],
    ['Support', ...plans.map((p) => (p.features.includes('priority_support') ? 'Priority email' : 'Email'))],
    [
      'Billing',
      ...plans.map((p) => {
        if (p.lifetime) return 'One-time payment';
        const ways = (['month', 'year'] as const).filter((i) => p.offers[i]?.available).map((i) => (i === 'month' ? 'Monthly' : 'Yearly'));
        return ways.length ? ways.join(' or ') : 'Not available yet';
      }),
    ],
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <header className="mx-auto max-w-2xl text-center">
        <h1 className="rise font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl">Simple plans, clear prices</h1>
        <p className="rise rise-1 mt-4 text-lg text-white/60">Subscribe monthly or yearly, or pay once for lifetime access.</p>
      </header>

      <div className="mt-12">
        <PricingTable catalog={catalog} countryCode={countryCode} resumeOfferKey={searchParams.checkout ?? null} />
      </div>

      {plans.length > 0 && (
        <section aria-labelledby="compare" className="mt-24">
          <h2 id="compare" className="font-display text-2xl font-semibold tracking-tight text-white">
            Compare plans
          </h2>
          <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="bg-white/[0.03] text-white">
                <tr>
                  <th scope="col" className="px-5 py-4 font-medium">
                    Feature
                  </th>
                  {plans.map((p) => (
                    <th key={p.id} scope="col" className="px-5 py-4 font-medium">
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparison.map(([label, ...values]) => (
                  <tr key={label} className="border-t border-white/[0.06]">
                    <th scope="row" className="px-5 py-3.5 font-normal text-white/65">
                      {label}
                    </th>
                    {values.map((v, i) => (
                      <td key={i} className={`px-5 py-3.5 ${v === '✓' ? 'text-[#A89CFF]' : 'text-white/80'}`}>
                        {v === '✓' ? <span aria-label="Included">✓</span> : v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section aria-labelledby="faq" className="mt-24 max-w-3xl">
        <h2 id="faq" className="font-display text-2xl font-semibold tracking-tight text-white">
          Billing questions
        </h2>
        <dl className="mt-6 divide-y divide-white/[0.06]">
          {faqs.map((f) => (
            <div key={f.q} className="py-5">
              <dt className="font-medium text-white">{f.q}</dt>
              <dd className="mt-2 leading-relaxed text-white/60">
                {f.a}{' '}
                {f.link && (
                  <Link href={f.link.href} className="text-[#BDB4FF] underline underline-offset-2 hover:text-white">
                    {f.link.label}
                  </Link>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
