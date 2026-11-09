import Link from 'next/link';
import { business, site } from '@/config/site';
import Logo from './Logo';

const columns = [
  {
    title: 'Product',
    links: [
      { href: '/#features', label: 'Features' },
      { href: '/#pricing', label: 'Pricing' },
      { href: '/#about', label: 'About' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/privacy', label: 'Privacy Policy' },
      { href: '/terms', label: 'Terms of Service' },
      { href: '/refund-policy', label: 'Refund Policy' },
    ],
  },
  {
    title: 'Support',
    links: [{ href: '/contact', label: 'Contact' }],
  },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-white/[0.06] bg-[#0A0A15]">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/50">{site.description}</p>
        </div>
        {columns.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <p className="text-sm font-medium text-white">{c.title}</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {c.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-white/55 transition-colors hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-white/[0.06]">
        <p className="mx-auto max-w-6xl px-4 py-6 text-xs text-white/40 sm:px-6">
          © {new Date().getFullYear()} {business.legalName ?? site.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
