// Visible marker for business details the owner hasn't provided yet.
// CI refuses to deploy while any remain (scripts/check-business-info.mjs).
export default function Missing({ label }: { label: string }) {
  return (
    <span className="inline-block rounded px-1.5 py-0.5 text-[0.85em] font-medium bg-amber-400/15 text-amber-300 border border-amber-400/30">
      [{label} — not yet provided]
    </span>
  );
}

export function SupportEmail({ email }: { email: string | null }) {
  if (!email) return <Missing label="support email" />;
  return (
    <a href={`mailto:${email}`} className="text-[#A89CFF] underline underline-offset-2 hover:text-white">
      {email}
    </a>
  );
}
