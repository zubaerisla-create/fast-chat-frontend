// Public site facts. Business details stay null until the owner provides them;
// pages render a visible placeholder for null values, and
// scripts/check-business-info.mjs fails the CI deploy while any are missing.
export const site = {
  name: 'FastChat',
  url: 'https://fastchatwebsite.hosensoft.com',
  description:
    'Fast, reliable one-to-one messaging on the web and Android, with photo, video, file and voice message sharing.',
  // Date the legal pages were last changed (shown on each page)
  legalLastUpdated: '2026-10-31',
};

export const business = {
  /** Legal name of the person or company selling FastChat subscriptions */
  legalName: null as string | null,
  /** Country whose law governs the Terms (e.g. "Bangladesh") */
  country: null as string | null,
  /** Monitored support address shown on Contact and the legal pages */
  supportEmail: null as string | null,
  /** Country where the production servers are hosted (Privacy Policy) */
  serverLocation: null as string | null,
};

export const publicRoutes = [
  { path: '/', label: 'Home' },
  { path: '/pricing', label: 'Pricing' },
  { path: '/terms', label: 'Terms of Service' },
  { path: '/privacy', label: 'Privacy Policy' },
  { path: '/refund-policy', label: 'Refund Policy' },
  { path: '/contact', label: 'Contact' },
] as const;
