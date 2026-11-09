'use client';

// Browser-side Paddle.js. Only the public client-side token is used here; the API key
// and webhook secret exist only on the backend.
import { initializePaddle, type Paddle } from '@paddle/paddle-js';
import type { Catalog } from './catalog';

let instance: Promise<Paddle | undefined> | null = null;

export function getPaddle(paddle: Catalog['paddle']): Promise<Paddle | undefined> {
  if (!paddle.enabled) return Promise.resolve(undefined);
  instance ??= initializePaddle({ environment: paddle.environment, token: paddle.clientToken });
  return instance;
}

/** priceId → Paddle's localized total for the visitor's location, e.g. "€4.75" */
export type LocalizedPrices = Record<string, string>;

/**
 * Localized prices exactly as Paddle formats them (Paddle picks the currency from the
 * visitor's location; we never convert amounts ourselves). Each price is previewed on
 * its own so a recurring and a one-time price never share one preview; a failed
 * preview just leaves that price out, and the USD amount from the backend is shown.
 *
 * Only a different currency is returned. For USD the caller shows the exact configured
 * price: Paddle's preview splits tax out of tax-inclusive prices ($40 → $34.78 subtotal),
 * which would misstate the price.
 */
export async function previewPrices(paddle: Paddle, priceIds: string[], countryCode: string | null): Promise<{ prices: LocalizedPrices; currency: string | null }> {
  const results = await Promise.allSettled(
    priceIds.map((priceId) =>
      paddle.PricePreview({
        items: [{ priceId, quantity: 1 }],
        ...(countryCode ? { address: { countryCode } } : {}),
      })
    )
  );
  const prices: LocalizedPrices = {};
  let currency: string | null = null;
  for (const r of results) {
    if (r.status !== 'fulfilled' || r.value.data.currencyCode === 'USD') continue;
    for (const item of r.value.data.details.lineItems) prices[item.price.id] = item.formattedTotals.total;
    currency ??= r.value.data.currencyCode;
  }
  return { prices, currency };
}

/** `plan` is the plan being bought; the welcome page waits until the backend reports it. */
export function openCheckout(paddle: Paddle, transactionId: string, plan: string) {
  paddle.Checkout.open({
    transactionId,
    settings: {
      displayMode: 'overlay',
      variant: 'one-page',
      successUrl: `${window.location.origin}/welcome?plan=${encodeURIComponent(plan)}`,
    },
  });
}
