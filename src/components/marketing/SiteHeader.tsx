'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { Menu, X } from 'lucide-react';
import Logo from './Logo';

const NAV = [
  { href: '/#features', label: 'Features' },
  { href: '/#pricing', label: 'Pricing' },
  { href: '/#about', label: 'About' },
];

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  // Reads the login cookie only to choose the labels; no session is created here
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => setSignedIn(Boolean(Cookies.get('token'))), []);

  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0D0D1A]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />

        <nav aria-label="Main" className="hidden items-center gap-1 text-sm md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-lg px-3 py-2 text-white/65 transition-colors hover:text-white">
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 text-sm md:flex">
          {signedIn ? (
            <Link href="/chat" className="rounded-lg bg-white px-4 py-2 font-medium text-[#0D0D1A] transition-colors hover:bg-white/90">
              Open FastChat
            </Link>
          ) : (
            <>
              <Link href="/auth" className="rounded-lg px-3 py-2 text-white/75 transition-colors hover:text-white">
                Login
              </Link>
              <Link href="/auth?mode=register" className="rounded-lg bg-white px-4 py-2 font-medium text-[#0D0D1A] transition-colors hover:bg-white/90">
                Get Started
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="-mr-2 rounded-lg p-2 text-white/80 hover:text-white md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X size={22} aria-hidden /> : <Menu size={22} aria-hidden />}
        </button>
      </div>

      {open && (
        <div id="mobile-menu" className="animate-fade-in border-t border-white/[0.06] bg-[#0D0D1A] md:hidden">
          <nav aria-label="Mobile" className="mx-auto flex max-w-6xl flex-col px-4 py-3 sm:px-6">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} onClick={close} className="rounded-lg px-2 py-3 text-white/80 hover:text-white">
                {n.label}
              </Link>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-white/[0.06] pt-4">
              {signedIn ? (
                <Link href="/chat" onClick={close} className="col-span-2 rounded-lg bg-white px-4 py-2.5 text-center font-medium text-[#0D0D1A]">
                  Open FastChat
                </Link>
              ) : (
                <>
                  <Link href="/auth" onClick={close} className="rounded-lg border border-white/15 px-4 py-2.5 text-center text-white">
                    Login
                  </Link>
                  <Link href="/auth?mode=register" onClick={close} className="rounded-lg bg-white px-4 py-2.5 text-center font-medium text-[#0D0D1A]">
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
