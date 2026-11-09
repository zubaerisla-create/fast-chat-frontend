import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { Bell, CheckCheck, FileText, Image as ImageIcon, MailCheck, Mic, MonitorSmartphone, Zap } from 'lucide-react';
import { site } from '@/config/site';
import PricingTable from '@/components/marketing/PricingTable';
import { fetchCatalog } from '@/lib/billing/catalog';
import { countryFromHeaders } from '@/lib/billing/country';

export const metadata: Metadata = {
  title: { absolute: `${site.name} — Your conversations. One simple space.` },
  description: site.description,
  alternates: { canonical: '/' },
};

// Only features that exist in the product today (verified in the web app, Android app and API)
const features = [
  { icon: Zap, title: 'Real-time messaging', text: 'Messages arrive instantly over a live connection, with typing indicators.' },
  { icon: CheckCheck, title: 'Online and read status', text: 'See who’s online and when your messages have been seen.' },
  { icon: ImageIcon, title: 'Photos and videos', text: 'Share images and videos and view them full screen without leaving the chat.' },
  { icon: FileText, title: 'Files and documents', text: 'Send documents and other files. Paid plans raise the size limit per file.' },
  { icon: Mic, title: 'Voice messages', text: 'Record and send a voice note when typing isn’t convenient.' },
  { icon: MonitorSmartphone, title: 'Web and Android', text: 'One account on the website and the Android app, with conversations in sync.' },
  { icon: Bell, title: 'Notifications', text: 'Push notifications on Android, so new messages don’t go unnoticed.' },
  { icon: MailCheck, title: 'Verified sign-up', text: 'Accounts are confirmed with an email code, and passwords can be reset by email.' },
];

const steps = [
  { title: 'Create your account', text: 'Sign up with your email address and confirm it with a one-time code.' },
  { title: 'Start your conversations', text: 'Find people by username and start chatting on the web or on Android.' },
  { title: 'Upgrade when you need more', text: 'Choose Starter, Pro or Advanced Lifetime for larger files and priority support.' },
];

/** Static, decorative rendering of the FastChat chat screen (no data, no interaction). */
function ProductPreview() {
  const contacts = [
    { name: 'Maya', last: 'See you at 6!', online: true, active: true },
    { name: 'Daniel', last: 'Voice message', online: false },
    { name: 'Aiko', last: 'Photo', online: true },
  ];
  return (
    <div aria-hidden className="overflow-hidden rounded-2xl border border-white/10 bg-[#0F0F20] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]">
      <div className="flex items-center gap-1.5 border-b border-white/[0.06] px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
      </div>
      <div className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)] text-[13px]">
        <div className="hidden border-r border-white/[0.06] p-3 sm:block">
          {contacts.map((c) => (
            <div key={c.name} className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 ${c.active ? 'bg-white/[0.06]' : ''}`}>
              <div className="relative">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#7C6EFF]/25 text-xs font-semibold text-[#CFC8FF]">{c.name[0]}</div>
                {c.online && <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0F0F20] bg-emerald-400" />}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-white/90">{c.name}</p>
                <p className="truncate text-xs text-white/40">{c.last}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="col-span-2 flex flex-col sm:col-span-1">
          <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#7C6EFF]/25 text-xs font-semibold text-[#CFC8FF]">M</div>
            <div>
              <p className="font-medium text-white/90">Maya</p>
              <p className="text-[11px] text-emerald-400">online</p>
            </div>
          </div>
          <div className="space-y-2.5 px-4 py-5">
            <Bubble>Did the photos come through?</Bubble>
            <Bubble own>Yes, all of them. They look great.</Bubble>
            <div className="flex justify-end">
              <div className="h-24 w-36 rounded-2xl rounded-br-md bg-gradient-to-br from-[#2A2A4A] to-[#1B1B33]" />
            </div>
            <Bubble>Perfect. See you at 6!</Bubble>
            <p className="pl-1 text-[11px] text-white/35">typing…</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Bubble({ own, children }: { own?: boolean; children: React.ReactNode }) {
  return (
    <div className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
      <p className={`max-w-[80%] rounded-2xl px-3.5 py-2 ${own ? 'rounded-br-md bg-[#7C6EFF] text-white' : 'rounded-bl-md bg-white/[0.07] text-white/85'}`}>
        {children}
        {own && <CheckCheck size={13} className="ml-1.5 inline text-white/70" />}
      </p>
    </div>
  );
}

function SectionHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <div className="max-w-2xl">
      <p className="text-sm font-medium text-[#A89CFF]">{eyebrow}</p>
      <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h2>
      {text && <p className="mt-4 text-base leading-relaxed text-white/60 sm:text-lg">{text}</p>}
    </div>
  );
}

export default async function HomePage() {
  const catalog = await fetchCatalog();
  const countryCode = countryFromHeaders(headers());

  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:pb-28">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="rise font-display text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-6xl">
            Your Conversations.
            <br />
            One Simple Space.
          </h1>
          <p className="rise rise-1 mx-auto mt-6 max-w-xl text-lg leading-relaxed text-white/60">
            Fast, reliable messaging for the people you connect with. Stay connected, share instantly, and keep every conversation organized.
          </p>
          <div className="rise rise-2 mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/auth?mode=register" className="rounded-xl bg-white px-6 py-3 font-medium text-[#0D0D1A] transition-colors hover:bg-white/90">
              Get Started
            </Link>
            <Link href="/#pricing" className="rounded-xl border border-white/15 px-6 py-3 font-medium text-white/85 transition-colors hover:border-white/30 hover:text-white">
              Explore Pricing
            </Link>
          </div>
        </div>
        <div className="rise rise-3 mx-auto mt-16 max-w-4xl">
          <ProductPreview />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-16 border-t border-white/[0.06]">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <SectionHeading eyebrow="Features" title="Everything a conversation needs" text="FastChat keeps one-to-one messaging quick and uncluttered, with the essentials built in." />
          <ul className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.06] sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, text }) => (
              <li key={title} className="bg-[#0D0D1A] p-6 transition-colors duration-300 hover:bg-[#111124]">
                <Icon size={20} className="text-[#A89CFF]" aria-hidden />
                <h3 className="mt-4 font-medium text-white">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/55">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-white/[0.06]">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <SectionHeading eyebrow="How it works" title="Up and running in minutes" />
          <ol className="mt-14 grid gap-8 md:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.title} className="border-t border-white/10 pt-6">
                <span className="font-display text-sm font-semibold text-[#A89CFF]">0{i + 1}</span>
                <h3 className="mt-3 text-lg font-medium text-white">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/55">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-16 border-t border-white/[0.06]">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium text-[#A89CFF]">Pricing</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">Simple plans, clear prices</h2>
            <p className="mt-4 text-white/60">Subscribe monthly or yearly, or pay once for lifetime access. Cancel a subscription at any time.</p>
          </div>
          <div className="mt-12">
            <PricingTable catalog={catalog} countryCode={countryCode} />
          </div>
          <p className="mt-6 text-center text-sm">
            <Link href="/pricing" className="text-white/60 underline-offset-4 hover:text-white hover:underline">
              Compare plans and billing questions
            </Link>
          </p>
        </div>
      </section>

      {/* About */}
      <section id="about" className="scroll-mt-16 border-t border-white/[0.06]">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-2">
          <SectionHeading eyebrow="About" title="Built for everyday conversations" />
          <div className="space-y-4 text-base leading-relaxed text-white/60">
            <p>
              FastChat is a messaging app focused on one thing: direct, one-to-one conversations that feel instant. It runs in the browser and on Android with the same account.
            </p>
            <p>
              We keep the product deliberately simple: no feeds and no clutter, just your conversations, the media you share, and the people you talk to.
            </p>
            <p>
              Questions?{' '}
              <Link href="/contact" className="text-white underline underline-offset-4 hover:text-[#BDB4FF]">
                Contact us
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      {/* Closing call to action */}
      <section className="border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-16 sm:px-6 md:flex-row md:items-center">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">Start your first conversation today.</h2>
          <Link href="/auth?mode=register" className="rounded-xl bg-white px-6 py-3 font-medium text-[#0D0D1A] transition-colors hover:bg-white/90">
            Get Started
          </Link>
        </div>
      </section>
    </>
  );
}
