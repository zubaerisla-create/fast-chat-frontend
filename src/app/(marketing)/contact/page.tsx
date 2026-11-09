import type { Metadata } from 'next';
import Link from 'next/link';
import { CreditCard, LifeBuoy, ShieldCheck } from 'lucide-react';
import Missing, { SupportEmail } from '@/components/marketing/Missing';
import { business } from '@/config/site';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'How to contact FastChat for account help, billing and refund questions, and privacy requests.',
  alternates: { canonical: '/contact' },
};

const topics = [
  { icon: LifeBuoy, title: 'Account and app help', text: 'Problems signing in, sending messages or sharing files.' },
  { icon: CreditCard, title: 'Billing and refunds', text: 'Subscriptions, receipts, cancellations and refund requests. Include the email used at checkout.', link: { href: '/refund-policy', label: 'Refund Policy' } },
  { icon: ShieldCheck, title: 'Privacy and account deletion', text: 'Data access, corrections and deleting your account. Write from the email address linked to your account.', link: { href: '/privacy', label: 'Privacy Policy' } },
];

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-20">
      <h1 className="font-display text-4xl font-bold text-white sm:text-5xl">Contact us</h1>
      <p className="mt-4 max-w-2xl text-lg text-white/60">We’re happy to help with your account, billing or privacy questions.</p>

      <section aria-labelledby="email-us" className="mt-10 rounded-2xl border border-[#7C6EFF]/40 bg-[#7C6EFF]/[0.07] p-7">
        <h2 id="email-us" className="font-display text-xl font-bold text-white">
          Email support
        </h2>
        <p className="mt-3 text-lg">
          <SupportEmail email={business.supportEmail} />
        </p>
        <p className="mt-3 text-sm text-white/60">We aim to reply within 2 business days. Pro and Advanced Lifetime customers get priority.</p>
      </section>

      <ul className="mt-8 grid gap-5 sm:grid-cols-3">
        {topics.map(({ icon: Icon, title, text, link }) => (
          <li key={title} className="rounded-2xl border border-white/10 bg-[#13132A] p-6">
            <Icon size={22} className="text-[#A89CFF]" aria-hidden />
            <h2 className="mt-4 font-semibold text-white">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/60">{text}</p>
            {link && (
              <Link href={link.href} className="mt-3 inline-block text-sm font-medium text-[#A89CFF] hover:text-white">
                {link.label} →
              </Link>
            )}
          </li>
        ))}
      </ul>

      <section aria-labelledby="operator" className="mt-10 rounded-2xl border border-white/10 p-6 text-sm text-white/65">
        <h2 id="operator" className="font-semibold text-white">
          Who runs FastChat
        </h2>
        <p className="mt-2">
          FastChat is operated by {business.legalName ?? <Missing label="legal business name" />}
          {business.country ? `, ${business.country}` : null}.
        </p>
      </section>
    </div>
  );
}
