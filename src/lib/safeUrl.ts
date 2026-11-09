// Media URLs come from message records, which the sender controls. Only http(s)
// and same-origin paths are rendered, so "javascript:" or "data:" URLs never
// reach an <img>, <a href> or download link.
export function safeMediaUrl(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : null;
  } catch {
    return null;
  }
}

// Where to go after signing in. Only same-site paths are accepted ("/pricing?checkout=pro_year"),
// never another origin ("//evil.test", "https://…") or a scheme.
export function safeNextPath(next?: string | null): string | null {
  if (!next) return null;
  const trimmed = next.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) return null;
  try {
    const url = new URL(trimmed, 'https://fastchat.invalid');
    return url.origin === 'https://fastchat.invalid' ? `${url.pathname}${url.search}${url.hash}` : null;
  } catch {
    return null;
  }
}
