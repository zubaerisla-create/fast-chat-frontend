'use client';

import { useEffect, useState } from 'react';
import { Check, Search, X } from 'lucide-react';
import { users as usersApi, type PublicUser } from '@/lib/saas';
import { Avatar, Input, cx } from './ui';

/**
 * Search-as-you-type people picker. `source` can restrict choices (e.g. workspace members);
 * otherwise it searches all FastChat users by username or email.
 */
export default function UserPicker({ selected, onChange, source, exclude = [] }: { selected: PublicUser[]; onChange: (u: PublicUser[]) => void; source?: PublicUser[]; exclude?: string[] }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<PublicUser[]>([]);

  useEffect(() => {
    const term = q.trim().toLowerCase();
    if (source) {
      setResults(source.filter((u) => !term || u.username.toLowerCase().includes(term) || u.email?.toLowerCase().includes(term)).slice(0, 30));
      return;
    }
    if (term.length < 2) return setResults([]);
    const t = setTimeout(() => usersApi.search(term).then(setResults).catch(() => setResults([])), 220);
    return () => clearTimeout(t);
  }, [q, source]);

  const isSel = (id: string) => selected.some((s) => s._id === id);
  const toggle = (u: PublicUser) => onChange(isSel(u._id) ? selected.filter((s) => s._id !== u._id) : [...selected, u]);
  const visible = results.filter((u) => !exclude.includes(u._id));

  return (
    <div className="space-y-3">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((u) => (
            <span key={u._id} className="inline-flex items-center gap-1.5 rounded-full border border-ui-border bg-ui-sunken py-0.5 pl-0.5 pr-2 text-[13px]">
              <Avatar name={u.username} src={u.avatar} size={20} />
              {u.username}
              <button type="button" aria-label={`Remove ${u.username}`} onClick={() => toggle(u)} className="text-ui-subtle hover:text-ui-text">
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ui-subtle" aria-hidden />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={source ? 'Filter people' : 'Search by username or email'} className="pl-9" aria-label="Search people" />
      </div>
      <ul className="max-h-60 space-y-0.5 overflow-y-auto">
        {visible.map((u) => (
          <li key={u._id}>
            <button type="button" onClick={() => toggle(u)} className={cx('flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors', isSel(u._id) ? 'bg-ui-accent-soft' : 'hover:bg-ui-sunken')}>
              <Avatar name={u.username} src={u.avatar} size={30} online={u.isOnline} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ui-text">{u.username}</span>
                {u.email && <span className="block truncate text-xs text-ui-subtle">{u.email}</span>}
              </span>
              {isSel(u._id) && <Check size={16} className="text-ui-accent" aria-hidden />}
            </button>
          </li>
        ))}
        {!source && q.trim().length >= 2 && visible.length === 0 && <li className="px-2 py-4 text-center text-sm text-ui-subtle">No people found.</li>}
        {!source && q.trim().length < 2 && <li className="px-2 py-4 text-center text-sm text-ui-subtle">Type at least 2 characters.</li>}
      </ul>
    </div>
  );
}
