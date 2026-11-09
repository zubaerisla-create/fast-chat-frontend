import type { Metadata } from 'next';
import AppProviders from '@/components/providers/AppProviders';

// The chat app itself is private; keep it out of search results
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppProviders>{children}</AppProviders>;
}
