// Plan catalog as served by the backend (GET /api/billing/catalog). Amounts, billing
// cycles and trials come from the configured Paddle prices; nothing here is invented.
export type PlanId = 'starter' | 'pro' | 'advanced';
export type BillingInterval = 'month' | 'year';
export type OfferInterval = BillingInterval | 'lifetime';

export interface OfferPrice {
  /** Paddle amount in the currency's minor unit, as a string ("500" = $5.00) */
  amountMinor: string;
  currency: string;
  /** Formatted by the backend from Paddle's amount, e.g. "$5" */
  formatted: string;
}

export interface Trial {
  interval: 'day' | 'week' | 'month' | 'year';
  frequency: number;
  requiresPaymentMethod: boolean;
}

export interface Offer {
  key: string;
  plan: PlanId;
  interval: OfferInterval;
  priceId: string | null;
  /** Configured, active in Paddle, with the expected billing cycle */
  available: boolean;
  price: OfferPrice | null;
  trial: Trial | null;
}

export interface CatalogPlan {
  id: PlanId;
  name: string;
  rank: number;
  recommended: boolean;
  lifetime: boolean;
  maxFileSizeMb: number;
  features: string[];
  offers: Partial<Record<OfferInterval, Offer>>;
}

export interface Catalog {
  paddle: { enabled: false } | { enabled: true; environment: 'sandbox' | 'production'; clientToken: string; checkoutEnabled: boolean };
  plans: CatalogPlan[];
  baseline: { maxFileSizeMb: number };
  /** Configuration problems (variable names only); the backend sends these only outside production */
  warnings: string[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/** Server-side fetch of the catalog. Returns null if the API can't be reached; no prices are made up. */
export async function fetchCatalog(): Promise<Catalog | null> {
  try {
    const res = await fetch(`${API_URL}/api/billing/catalog`, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    return { paddle: body.paddle, plans: body.plans, baseline: body.baseline, warnings: body.warnings ?? [] };
  } catch {
    return null;
  }
}

/** Offers that the website lets visitors choose: subscriptions by interval, Lifetime by itself. */
export const offerFor = (plan: CatalogPlan, interval: BillingInterval): Offer | null =>
  (plan.lifetime ? plan.offers.lifetime : plan.offers[interval]) ?? null;

export const findOffer = (plans: CatalogPlan[], key: string | null | undefined): Offer | null => {
  if (!key) return null;
  for (const plan of plans) for (const offer of Object.values(plan.offers)) if (offer?.key === key) return offer;
  return null;
};

/** "7-day free trial", exactly as configured on the Paddle price; null when there is none. */
export const trialLabel = (trial: Trial | null): string | null => (trial ? `${trial.frequency}-${trial.interval} free trial` : null);

/** Plan bullets generated from real limits and features, so the copy can't drift from what is enforced. */
export function planHighlights(plan: CatalogPlan, plans: CatalogPlan[]): string[] {
  const lower = plans.find((p) => p.rank === plan.rank - 1);
  const bullets = lower
    ? [`Everything in ${lower.name}`]
    : ['Real-time one-to-one messaging', 'Photos, videos, files and voice messages', 'Web and Android with one account'];
  bullets.push(`Files up to ${plan.maxFileSizeMb} MB each`);
  if (plan.features.includes('priority_support') && !lower?.features.includes('priority_support')) bullets.push('Priority email support');
  if (plan.lifetime) bullets.push('Pay once, no renewals');
  return bullets;
}
