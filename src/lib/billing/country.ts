// Visitor country from the edge, read server-side. Vercel sets x-vercel-ip-country;
// Cloudflare (in front of this site) sets cf-ipcountry. Unknown values are dropped so
// Paddle detects the location itself — we never send a made-up code.
const IGNORED = new Set(['XX', 'T1', 'EU', 'AP']);

export function countryFromHeaders(headers: { get(name: string): string | null }): string | null {
  for (const name of ['x-vercel-ip-country', 'cf-ipcountry']) {
    const value = headers.get(name)?.trim().toUpperCase();
    if (value && /^[A-Z]{2}$/.test(value) && !IGNORED.has(value)) return value;
  }
  return null;
}
