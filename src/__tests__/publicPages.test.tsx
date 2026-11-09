import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import Cookies from 'js-cookie';
import PricingTable from '@/components/marketing/PricingTable';
import SiteFooter from '@/components/marketing/SiteFooter';
import SiteHeader from '@/components/marketing/SiteHeader';
import PricingPage, { metadata as pricingMeta } from '@/app/(marketing)/pricing/page';
import HomePage, { metadata as homeMeta } from '@/app/(marketing)/page';
import TermsPage, { metadata as termsMeta } from '@/app/(marketing)/terms/page';
import PrivacyPage, { metadata as privacyMeta } from '@/app/(marketing)/privacy/page';
import RefundPage, { metadata as refundMeta } from '@/app/(marketing)/refund-policy/page';
import ContactPage, { metadata as contactMeta } from '@/app/(marketing)/contact/page';
import sitemap from '@/app/sitemap';
import { publicRoutes, site } from '@/config/site';
import { Catalog, CatalogPlan, Offer, fetchCatalog, planHighlights, trialLabel } from '@/lib/billing/catalog';
import { countryFromHeaders } from '@/lib/billing/country';
import { safeNextPath } from '@/lib/safeUrl';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('next/image', () => ({ default: (props: { alt: string; src: string }) => <img alt={props.alt} src={props.src} /> }));
vi.mock('next/headers', () => ({ headers: () => new Headers({ 'cf-ipcountry': 'GB' }) }));

const paddle = {
  PricePreview: vi.fn(),
  Checkout: { open: vi.fn() },
};
const initializePaddle = vi.fn(async () => paddle);
vi.mock('@paddle/paddle-js', () => ({ initializePaddle: (...a: unknown[]) => initializePaddle(...(a as [])) }));

const startCheckout = vi.fn();
vi.mock('@/lib/api', () => ({ startCheckout: (...a: unknown[]) => startCheckout(...a) }));

// Mirrors the final live Paddle catalog: Starter $5/mo (7-day trial) + $40/yr (7-day trial),
// Pro $8/mo (7-day trial) + $40/yr (no trial), Advanced Lifetime $1,000 one-time.
// `partial` = the earlier state where Starter yearly and Pro monthly weren't configured.
const offer = (plan: CatalogPlan['id'], interval: Offer['interval'], amount: string | null, formatted: string | null, trial: Offer['trial'] = null): Offer => ({
  key: `${plan}_${interval}`,
  plan,
  interval,
  priceId: amount ? `pri_${plan}_${interval}` : null,
  available: Boolean(amount),
  price: amount ? { amountMinor: amount, currency: 'USD', formatted: formatted! } : null,
  trial,
});
const TRIAL_7D = { interval: 'day', frequency: 7, requiresPaymentMethod: true } as const;
const plansFixture = ({ partial = false } = {}): CatalogPlan[] => [
  {
    id: 'starter', name: 'Starter', rank: 1, recommended: false, lifetime: false, maxFileSizeMb: 50, features: [],
    offers: {
      month: offer('starter', 'month', '500', '$5', TRIAL_7D),
      year: partial ? offer('starter', 'year', null, null) : offer('starter', 'year', '4000', '$40', TRIAL_7D),
    },
  },
  {
    id: 'pro', name: 'Pro', rank: 2, recommended: true, lifetime: false, maxFileSizeMb: 100, features: ['priority_support'],
    offers: { month: partial ? offer('pro', 'month', null, null) : offer('pro', 'month', '800', '$8', TRIAL_7D), year: offer('pro', 'year', '4000', '$40') },
  },
  {
    id: 'advanced', name: 'Advanced Lifetime', rank: 3, recommended: false, lifetime: true, maxFileSizeMb: 200, features: ['priority_support'],
    offers: { lifetime: offer('advanced', 'lifetime', '100000', '$1,000') },
  },
];
const catalogFixture = ({ checkoutEnabled = true, enabled = true, warnings = [] as string[], partial = false } = {}): Catalog => ({
  paddle: enabled ? { enabled: true, environment: 'sandbox', clientToken: 'test_token', checkoutEnabled } : { enabled: false },
  plans: plansFixture({ partial }),
  baseline: { maxFileSizeMb: 25 },
  warnings,
});

// What Paddle returns per previewed price: already-formatted local amounts
const LOCAL: Record<string, string> = {
  pri_starter_month: '£4.00',
  pri_starter_year: '£32.00',
  pri_pro_month: '£6.50',
  pri_pro_year: '£32.00',
  pri_advanced_lifetime: '£790.00',
};
const previewFor = (req: { items: { priceId: string }[] }) => ({
  data: {
    currencyCode: 'GBP',
    details: { lineItems: req.items.map((i) => ({ price: { id: i.priceId }, formattedTotals: { subtotal: 'without-tax', total: LOCAL[i.priceId] } })) },
  },
});

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ...catalogFixture(), success: true }) }));
  paddle.PricePreview.mockImplementation(async (req) => previewFor(req));
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  Cookies.remove('token');
  window.history.replaceState(null, '', '/');
});

const renderPage = async (Page: () => JSX.Element | Promise<JSX.Element>) => render(await Page());
const staticPages = [
  { path: '/', Page: HomePage, meta: homeMeta },
  { path: '/terms', Page: TermsPage, meta: termsMeta },
  { path: '/privacy', Page: PrivacyPage, meta: privacyMeta },
  { path: '/refund-policy', Page: RefundPage, meta: refundMeta },
  { path: '/contact', Page: ContactPage, meta: contactMeta },
];

describe('public page metadata', () => {
  it('gives every page a unique title, a description and its own canonical URL', () => {
    const all = [...staticPages, { path: '/pricing', meta: pricingMeta }];
    expect(new Set(all.map(({ meta }) => JSON.stringify(meta.title))).size).toBe(all.length);
    for (const { path, meta } of all) {
      expect(meta.description, path).toBeTruthy();
      expect(meta.alternates?.canonical, path).toBe(path);
    }
  });

  it('lists every public route in the sitemap with absolute production URLs', () => {
    const urls = sitemap().map((e) => e.url);
    expect(urls).toEqual(publicRoutes.map((r) => `${site.url}${r.path === '/' ? '' : r.path}`));
  });
});

describe('internal links', () => {
  const known = new Set([...publicRoutes.map((r) => r.path), '/auth', '/chat', '/account/billing']);
  const checkLinks = (container: HTMLElement, path: string) => {
    for (const a of Array.from(container.querySelectorAll('a[href]'))) {
      const href = a.getAttribute('href')!;
      if (href.startsWith('mailto:') || href.startsWith('#')) continue;
      expect(known.has(href.split(/[#?]/)[0]), `${path} links to ${href}`).toBe(true);
    }
  };

  it('only link to routes that exist', async () => {
    for (const { path, Page } of staticPages) {
      const { container, unmount } = await renderPage(Page as () => JSX.Element);
      checkLinks(container, path);
      unmount();
    }
    const { container } = render(await PricingPage({ searchParams: {} }));
    checkLinks(container, '/pricing');
  });

  it('home page anchors exist for the header links', async () => {
    const { container } = await renderPage(HomePage);
    for (const id of ['features', 'pricing', 'about']) expect(container.querySelector(`#${id}`), id).not.toBeNull();
  });

  it('header has Features, Pricing, About, Login and Get Started', () => {
    render(<SiteHeader />);
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getByRole('link', { name: 'Features' }).getAttribute('href')).toBe('/#features');
    expect(within(nav).getByRole('link', { name: 'Pricing' }).getAttribute('href')).toBe('/#pricing');
    expect(within(nav).getByRole('link', { name: 'About' }).getAttribute('href')).toBe('/#about');
    expect(screen.getByRole('link', { name: 'Login' }).getAttribute('href')).toBe('/auth');
    expect(screen.getByRole('link', { name: 'Get Started' }).getAttribute('href')).toBe('/auth?mode=register');
  });

  it('footer links to features, pricing, the legal pages and contact', () => {
    const { container } = render(<SiteFooter />);
    const hrefs = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    for (const h of ['/#features', '/#pricing', '/privacy', '/terms', '/refund-policy', '/contact']) expect(hrefs).toContain(h);
    expect(container.textContent).toMatch(/©/);
  });
});

describe('pricing data', () => {
  it('returns null (never invented prices) when the API is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect(await fetchCatalog()).toBeNull();
  });

  it('builds feature bullets from enforced limits', () => {
    const plans = plansFixture();
    expect(planHighlights(plans[1], plans)).toEqual(['Everything in Starter', 'Files up to 100 MB each', 'Priority email support']);
    expect(planHighlights(plans[2], plans)).toEqual(['Everything in Pro', 'Files up to 200 MB each', 'Pay once, no renewals']);
  });

  it('labels trials exactly as configured', () => {
    expect(trialLabel({ interval: 'day', frequency: 7, requiresPaymentMethod: true })).toBe('7-day free trial');
    expect(trialLabel(null)).toBeNull();
  });

  it('reads the country from edge headers and never invents one', () => {
    expect(countryFromHeaders(new Headers({ 'x-vercel-ip-country': 'au' }))).toBe('AU');
    expect(countryFromHeaders(new Headers({ 'cf-ipcountry': 'IE' }))).toBe('IE');
    for (const v of ['XX', 'T1', 'OTHERS', '']) expect(countryFromHeaders(new Headers({ 'cf-ipcountry': v }))).toBeNull();
    expect(countryFromHeaders(new Headers())).toBeNull();
  });

  it('only follows same-site paths after sign-in', () => {
    expect(safeNextPath('/pricing?checkout=pro_year')).toBe('/pricing?checkout=pro_year');
    for (const bad of ['//evil.test/x', 'https://evil.test', '/\\evil.test', 'javascript:alert(1)', '', null]) expect(safeNextPath(bad), String(bad)).toBeNull();
  });
});

const card = (name: string) => screen.getByRole('region', { name });

describe('pricing table', () => {
  it('shows exactly Starter, Pro and Advanced Lifetime', () => {
    render(<PricingTable catalog={catalogFixture({ enabled: false })} countryCode={null} />);
    expect(screen.getAllByRole('region').map((r) => r.getAttribute('aria-labelledby'))).toEqual(['plan-starter', 'plan-pro', 'plan-advanced']);
    expect(screen.queryByText(/^Free$/)).toBeNull();
  });

  it('shows exactly the five final prices and switches Starter and Pro between monthly and yearly', () => {
    render(<PricingTable catalog={catalogFixture({ enabled: false })} countryCode={null} />);
    expect(screen.getByRole('radio', { name: 'Monthly' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByTestId('price-starter').textContent).toBe('$5');
    expect(within(card('Starter')).getByText('/ month')).toBeTruthy();
    expect(screen.getByTestId('price-pro').textContent).toBe('$8');
    expect(within(card('Pro')).getByText('/ month')).toBeTruthy();
    expect(screen.getByTestId('price-advanced').textContent).toBe('$1,000');
    expect(within(card('Advanced Lifetime')).getByText('one-time')).toBeTruthy();

    fireEvent.click(screen.getByRole('radio', { name: 'Yearly' }));
    expect(screen.getByTestId('price-starter').textContent).toBe('$40');
    expect(within(card('Starter')).getByText('/ year')).toBeTruthy();
    expect(screen.getByTestId('price-pro').textContent).toBe('$40');
    expect(within(card('Pro')).getByText('/ year')).toBeTruthy();
    // Lifetime doesn't change with the toggle
    expect(screen.getByTestId('price-advanced').textContent).toBe('$1,000');
    expect(within(card('Advanced Lifetime')).getByText('One-time payment — Lifetime access')).toBeTruthy();

    fireEvent.click(screen.getByRole('radio', { name: 'Monthly' }));
    expect(screen.getByTestId('price-pro').textContent).toBe('$8');
    expect(initializePaddle).not.toHaveBeenCalled();
  });

  it('shows a trial only on the prices where Paddle has one', () => {
    render(<PricingTable catalog={catalogFixture({ enabled: false })} countryCode={null} />);
    expect(within(card('Starter')).getByText('7-day free trial, then billed monthly')).toBeTruthy();
    expect(within(card('Pro')).getByText('7-day free trial, then billed monthly')).toBeTruthy();
    expect(within(card('Pro')).getByRole('button', { name: 'Start 7-day free trial' })).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: 'Yearly' }));
    expect(within(card('Starter')).getByText('7-day free trial, then billed yearly')).toBeTruthy();
    expect(within(card('Pro')).queryByText(/trial/i)).toBeNull();
    expect(within(card('Pro')).getByText('Billed yearly. Renews until you cancel.')).toBeTruthy();
    expect(within(card('Pro')).getByRole('button', { name: 'Subscribe yearly' })).toBeTruthy();
    expect(within(card('Advanced Lifetime')).queryByText(/trial/i)).toBeNull();
    expect(within(card('Advanced Lifetime')).getByRole('button', { name: 'Buy Lifetime Access' })).toBeTruthy();
  });

  it('with a price missing, shows the other interval instead of a made-up price', () => {
    render(<PricingTable catalog={catalogFixture({ enabled: false, partial: true })} countryCode={null} />);
    // Pro is recommended and then only sold yearly, so the yearly view comes first
    expect(screen.getByRole('radio', { name: 'Yearly' }).getAttribute('aria-checked')).toBe('true');
    expect(within(card('Starter')).getByText(/billed monthly only/)).toBeTruthy();
    expect(screen.queryByTestId('price-starter')).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: 'Monthly' }));
    expect(within(card('Pro')).getByText(/billed yearly only/)).toBeTruthy();
    expect(screen.queryByTestId('price-pro')).toBeNull();
  });

  it('never shows fake discounts or crossed-out prices', () => {
    const { container } = render(<PricingTable catalog={catalogFixture({ enabled: false })} countryCode={null} />);
    expect(container.querySelector('s, del')).toBeNull();
    expect(container.textContent).not.toMatch(/save|% off|months free/i);
  });

  it('shows Paddle-localized totals when Paddle picks another currency', async () => {
    render(<PricingTable catalog={catalogFixture()} countryCode="GB" />);
    await waitFor(() => expect(screen.getByTestId('price-pro').textContent).toBe('£6.50'));
    expect(screen.getByTestId('price-advanced').textContent).toBe('£790.00');
    fireEvent.click(screen.getByRole('radio', { name: 'Yearly' }));
    expect(screen.getByTestId('price-pro').textContent).toBe('£32.00');
    expect(paddle.PricePreview).toHaveBeenCalledWith({ items: [{ priceId: 'pri_advanced_lifetime', quantity: 1 }], address: { countryCode: 'GB' } });
    expect(paddle.PricePreview.mock.calls.flatMap((c) => c[0].items.map((i: { priceId: string }) => i.priceId)).sort()).toEqual([
      'pri_advanced_lifetime',
      'pri_pro_month',
      'pri_pro_year',
      'pri_starter_month',
      'pri_starter_year',
    ]);
    expect(screen.getByText(/Prices are shown in GBP/)).toBeTruthy();
  });

  it('shows the exact configured USD price when Paddle previews in USD (tax-inclusive prices)', async () => {
    paddle.PricePreview.mockImplementation(async (req) => ({
      data: { currencyCode: 'USD', details: { lineItems: req.items.map((i: { priceId: string }) => ({ price: { id: i.priceId }, formattedTotals: { subtotal: '$34.78', total: '$40.00' } })) } },
    }));
    render(<PricingTable catalog={catalogFixture()} countryCode="US" />);
    await waitFor(() => expect(paddle.PricePreview).toHaveBeenCalledTimes(5));
    await act(async () => {});
    fireEvent.click(screen.getByRole('radio', { name: 'Yearly' }));
    expect(screen.getByTestId('price-pro').textContent).toBe('$40');
    expect(screen.getByTestId('price-advanced').textContent).toBe('$1,000');
    expect(screen.getByText(/Prices are in US dollars/)).toBeTruthy();
  });

  it('keeps USD prices when the Paddle preview fails', async () => {
    paddle.PricePreview.mockRejectedValue(new Error('network'));
    render(<PricingTable catalog={catalogFixture()} countryCode="IE" />);
    await waitFor(() => expect(paddle.PricePreview).toHaveBeenCalled());
    expect(screen.getByTestId('price-pro').textContent).toBe('$8');
    expect(screen.getByText(/Prices are in US dollars/)).toBeTruthy();
  });

  it('shows "Pricing couldn’t be loaded" instead of made-up prices when the API is down', () => {
    render(<PricingTable catalog={null} countryCode={null} />);
    expect(screen.getByRole('status').textContent).toMatch(/couldn’t be loaded/);
    expect(screen.queryByTestId('price-pro')).toBeNull();
  });

  it('marks Pro as recommended', () => {
    render(<PricingTable catalog={catalogFixture()} countryCode="GB" />);
    expect(within(card('Pro')).getByText('Recommended')).toBeTruthy();
  });

  it('shows development configuration warnings when the backend sends them', () => {
    render(<PricingTable catalog={catalogFixture({ warnings: ['PADDLE_PRO_MONTHLY_PRICE_ID is not set'] })} countryCode={null} />);
    expect(screen.getByRole('note').textContent).toMatch(/PADDLE_PRO_MONTHLY_PRICE_ID is not set/);
  });

  it('sends signed-out visitors to sign-up and keeps the chosen plan', async () => {
    const assign = vi.fn();
    const original = window.location;
    Object.defineProperty(window, 'location', { configurable: true, value: { ...original, set href(v: string) { assign(v); } } });
    try {
      render(<PricingTable catalog={catalogFixture()} countryCode="GB" />);
      fireEvent.click(within(card('Advanced Lifetime')).getByRole('button', { name: 'Buy Lifetime Access' }));
      expect(assign).toHaveBeenCalledWith(`/auth?mode=register&next=${encodeURIComponent('/pricing?checkout=advanced_lifetime')}`);
      expect(startCheckout).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(window, 'location', { configurable: true, value: original });
    }
  });

  it('keeps checkout closed for signed-in users while the backend has it disabled', async () => {
    Cookies.set('token', 'jwt');
    render(<PricingTable catalog={catalogFixture({ checkoutEnabled: false })} countryCode="GB" />);
    await waitFor(() => expect(screen.getByTestId('price-pro').textContent).toBe('£6.50'));
    for (const b of screen.getAllByRole('button').filter((b) => /trial|subscribe|lifetime/i.test(b.textContent!))) expect((b as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getAllByText('Checkout opens soon.')).toHaveLength(3);
    expect(startCheckout).not.toHaveBeenCalled();
  });

  it('never lets an unconfigured option start checkout', async () => {
    Cookies.set('token', 'jwt');
    render(<PricingTable catalog={catalogFixture({ partial: true })} countryCode="GB" />);
    await waitFor(() => expect(paddle.PricePreview).toHaveBeenCalled());
    // Yearly view: Starter has no yearly price
    const btn = within(card('Starter')).getByRole('button', { name: /subscribe yearly/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    fireEvent.click(btn);
    expect(startCheckout).not.toHaveBeenCalled();
  });

  it.each([
    ['Starter', 'Monthly', /trial/i, 'pri_starter_month', 'starter'],
    ['Starter', 'Yearly', /trial/i, 'pri_starter_year', 'starter'],
    ['Pro', 'Monthly', /trial/i, 'pri_pro_month', 'pro'],
    ['Pro', 'Yearly', /^Subscribe yearly$/, 'pri_pro_year', 'pro'],
    ['Advanced Lifetime', 'Yearly', /^Buy Lifetime Access$/, 'pri_advanced_lifetime', 'advanced'],
  ])('%s (%s) opens the overlay checkout for its own price ID', async (planName, toggle, button, priceId, plan) => {
    Cookies.set('token', 'jwt');
    startCheckout.mockResolvedValue({ data: { transactionId: 'txn_123' } });
    render(<PricingTable catalog={catalogFixture()} countryCode="GB" />);
    fireEvent.click(screen.getByRole('radio', { name: toggle }));
    const cta = () => within(card(planName)).getByRole('button', { name: button }) as HTMLButtonElement;
    await waitFor(() => expect(cta().disabled).toBe(false));
    await act(async () => {
      fireEvent.click(cta());
    });
    expect(startCheckout).toHaveBeenCalledTimes(1);
    expect(startCheckout).toHaveBeenCalledWith(priceId);
    expect(paddle.Checkout.open).toHaveBeenCalledWith({
      transactionId: 'txn_123',
      settings: { displayMode: 'overlay', variant: 'one-page', successUrl: `${window.location.origin}/welcome?plan=${plan}` },
    });
  });

  it.each(['starter_month', 'starter_year', 'pro_month', 'pro_year', 'advanced_lifetime'])(
    'a signed-out visitor choosing %s is sent to sign-up and resumes that exact checkout after signing in',
    async (key) => {
      Cookies.set('token', 'jwt');
      window.history.replaceState(null, '', `/pricing?checkout=${key}`);
      startCheckout.mockResolvedValue({ data: { transactionId: 'txn_resume' } });
      render(<PricingTable catalog={catalogFixture()} countryCode="GB" resumeOfferKey={key} />);
      await waitFor(() => expect(paddle.Checkout.open).toHaveBeenCalledTimes(1));
      expect(startCheckout).toHaveBeenCalledWith(`pri_${key}`);
      if (key !== 'advanced_lifetime') expect(screen.getByRole('radio', { name: key.endsWith('year') ? 'Yearly' : 'Monthly' }).getAttribute('aria-checked')).toBe('true');
    }
  );

  it('tells a subscriber buying Lifetime to cancel the old subscription', async () => {
    Cookies.set('token', 'jwt');
    startCheckout.mockResolvedValue({ data: { transactionId: 'txn_9', hasActiveSubscription: true } });
    render(<PricingTable catalog={catalogFixture()} countryCode="GB" />);
    await waitFor(() => expect((within(card('Advanced Lifetime')).getByRole('button') as HTMLButtonElement).disabled).toBe(false));
    await act(async () => {
      fireEvent.click(within(card('Advanced Lifetime')).getByRole('button', { name: 'Buy Lifetime Access' }));
    });
    expect(startCheckout).toHaveBeenCalledWith('pri_advanced_lifetime');
    expect(within(card('Advanced Lifetime')).getByRole('status').textContent).toMatch(/cancel it from your billing page/);
  });

  it('resumes the plan chosen before signing in, once', async () => {
    Cookies.set('token', 'jwt');
    window.history.replaceState(null, '', '/pricing?checkout=advanced_lifetime');
    startCheckout.mockResolvedValue({ data: { transactionId: 'txn_resume' } });
    render(<PricingTable catalog={catalogFixture()} countryCode="GB" resumeOfferKey="advanced_lifetime" />);
    await waitFor(() => expect(paddle.Checkout.open).toHaveBeenCalledTimes(1));
    expect(startCheckout).toHaveBeenCalledWith('pri_advanced_lifetime');
    expect(window.location.search).toBe('');
  });

  it('shows the server message and a billing link when the user is already subscribed', async () => {
    Cookies.set('token', 'jwt');
    startCheckout.mockRejectedValue({ response: { status: 409, data: { message: 'You already have an active subscription.' } } });
    render(<PricingTable catalog={catalogFixture()} countryCode="GB" />);
    await waitFor(() => expect((within(card('Starter')).getByRole('button', { name: /trial/i }) as HTMLButtonElement).disabled).toBe(false));
    await act(async () => {
      fireEvent.click(within(card('Starter')).getByRole('button', { name: /trial/i }));
    });
    expect(screen.getByRole('alert').textContent).toMatch(/already have an active subscription/);
    expect(screen.getByRole('link', { name: 'Manage billing' }).getAttribute('href')).toBe('/account/billing');
    expect(paddle.Checkout.open).not.toHaveBeenCalled();
  });
});

describe('content safeguards', () => {
  it('never claims end-to-end encryption, unlimited storage or customer numbers', async () => {
    for (const { path, Page } of staticPages) {
      const { container, unmount } = await renderPage(Page as () => JSX.Element);
      const text = container.textContent!.toLowerCase();
      if (text.includes('end-to-end')) expect(text, path).toMatch(/not (currently offer )?end-to-end encrypt|not end-to-end encrypted/);
      expect(text, path).not.toMatch(/unlimited storage|trusted by|\d[\d,]*\+? (users|customers|teams)/);
      unmount();
    }
  });

  it('shows visible placeholders while business details are missing', () => {
    render(<ContactPage />);
    expect(screen.getAllByText(/not yet provided/).length).toBeGreaterThan(0);
  });
});
