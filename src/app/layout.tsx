import type { Metadata, Viewport } from 'next';
import './globals.css';
import { site } from '@/config/site';

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} — Real-time messaging`, template: `%s · ${site.name}` },
  description: site.description,
  applicationName: site.name,
  openGraph: { type: 'website', siteName: site.name, url: site.url },
  twitter: { card: 'summary' },
};

export const viewport: Viewport = {
  themeColor: '#0D0D1A',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-[#0D0D1A] text-white font-sans antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
