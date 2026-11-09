'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { Building2, Flag, ScrollText, Search, Shield, CreditCard } from 'lucide-react';
import { PageBody } from '@/components/app/AppShell';
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, Input, PageHeader, Select, Skeleton, SkeletonRows, Tabs, formatBytes } from '@/components/app/ui';
import { admin } from '@/lib/saas';

type Tab = 'overview' | 'users' | 'orgs' | 'billing' | 'reports' | 'audit';

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [forbidden, setForbidden] = useState(false);
  return (
    <PageBody wide>
      <PageHeader icon={Shield} title="Admin" description="Platform-wide data. Only visible to FastChat administrators." />
      {forbidden ? (
        <ErrorState text="You don’t have administrator access." />
      ) : (
        <>
          <div className="overflow-x-auto">
            <Tabs
              value={tab}
              onChange={setTab}
              tabs={[
                { value: 'overview', label: 'Overview' },
                { value: 'users', label: 'Users' },
                { value: 'orgs', label: 'Organizations' },
                { value: 'billing', label: 'Subscriptions' },
                { value: 'reports', label: 'Reports' },
                { value: 'audit', label: 'Audit log' },
              ]}
            />
          </div>
          {tab === 'overview' && <Overview onForbidden={() => setForbidden(true)} />}
          {tab === 'users' && <UsersTab />}
          {tab === 'orgs' && <OrgsTab />}
          {tab === 'billing' && <BillingTab />}
          {tab === 'reports' && <ReportsTab />}
          {tab === 'audit' && <AuditTab />}
        </>
      )}
    </PageBody>
  );
}

function Overview({ onForbidden }: { onForbidden: () => void }) {
  const [days, setDays] = useState(30);
  const [d, setD] = useState<any>(null);
  useEffect(() => {
    setD(null);
    admin
      .overview(days)
      .then(setD)
      .catch((e) => (e.response?.status === 403 ? onForbidden() : setD({ error: true })));
  }, [days, onForbidden]);
  if (d?.error) return <ErrorState text="Overview couldn’t be loaded." />;
  const max = Math.max(1, ...(d?.signupsByDay ?? []).map((x: any) => x.signups));
  const stats = d
    ? [
        ['Registered users', d.users.total, `${d.users.new_in_range} new in ${days} days`],
        ['Active (7 days)', d.users.active_7d, `${d.users.online_now} online now`],
        ['Organizations', d.organizations.organizations, `${d.organizations.workspaces} workspace${d.organizations.workspaces === 1 ? '' : 's'}`],
        ['Channels & groups', d.organizations.channels + d.organizations.groups, `${d.organizations.channels} channels · ${d.organizations.groups} groups`],
        ['Messages (24 h)', d.messages.last_24h, `${d.messages.in_range} in ${days} days`],
        ['Stored files', formatBytes(d.messages.storage_bytes), 'Across all conversations'],
        ['Paid subscriptions', d.subscriptions.active, `${d.subscriptions.trialing} trialing · ${d.subscriptions.canceled} canceled`],
        ['Lifetime customers', d.subscriptions.lifetime, `${d.reports.open} open reports`],
      ]
    : [];
  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <div className="w-44">
        <Select value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Date range">
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={365}>Last 12 months</option>
        </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {!d
          ? Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-24 !rounded-xl" />)
          : stats.map(([label, value, note]) => (
              <div key={label} className="rounded-xl border border-ui-border bg-ui-panel p-4">
                <p className="text-xs font-medium text-ui-muted">{label}</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-ui-text">{value}</p>
                <p className="mt-0.5 text-xs text-ui-subtle">{note}</p>
              </div>
            ))}
      </div>
      <Card>
        <h2 className="text-sm font-semibold text-ui-text">New registrations</h2>
        {!d ? (
          <Skeleton className="mt-4 h-40" />
        ) : (
          <div className="mt-5 flex h-40 items-end gap-[3px]" role="img" aria-label={`Registrations per day over the last ${days} days`}>
            {d.signupsByDay.map((x: any) => (
              <div key={x.day} className="group relative flex h-full flex-1 items-end">
                <div className="w-full rounded-t-sm bg-ui-accent/80 transition-colors group-hover:bg-ui-accent" style={{ height: `${Math.max(2, (x.signups / max) * 100)}%`, opacity: x.signups ? 1 : 0.25 }} />
                <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-ui-text px-1.5 py-0.5 text-[10px] text-ui-bg group-hover:block">
                  {format(new Date(x.day), 'MMM d')}: {x.signups}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function UsersTab() {
  const [q, setQ] = useState('');
  const [offset, setOffset] = useState(0);
  const [d, setD] = useState<any>(null);
  const load = useCallback(() => admin.users(q, offset).then(setD).catch(() => setD({ users: [], total: 0 })), [q, offset]);
  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);
  return (
    <Card padded={false}>
      <div className="flex items-center gap-3 border-b border-ui-border p-3">
        <div className="relative max-w-sm flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ui-subtle" />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOffset(0);
            }}
            placeholder="Search by username or email"
            className="pl-9"
            aria-label="Search users"
          />
        </div>
        <span className="text-xs text-ui-subtle">{d ? `${d.total} users` : ''}</span>
      </div>
      {!d ? (
        <div className="p-5">
          <SkeletonRows rows={6} />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs text-ui-subtle">
              <tr>
                {['User', 'Plan', 'Workspaces', 'Last seen', 'Joined', 'Role'].map((h) => (
                  <th key={h} className="px-5 py-2.5 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ui-border">
              {d.users.map((u: any) => (
                <tr key={u.id}>
                  <td className="px-5 py-2.5">
                    <span className="flex items-center gap-2.5">
                      <Avatar name={u.username} size={28} online={u.isOnline} />
                      <span>
                        <span className="block font-medium text-ui-text">{u.username}</span>
                        <span className="block text-xs text-ui-subtle">{u.email}</span>
                      </span>
                    </span>
                  </td>
                  <td className="px-5 py-2.5">{u.plan ? <Badge tone="accent">{u.plan}</Badge> : <span className="text-ui-subtle">—</span>}</td>
                  <td className="px-5 py-2.5 tabular-nums text-ui-muted">{u.workspaces}</td>
                  <td className="px-5 py-2.5 text-ui-muted">{u.isOnline ? 'Online' : u.lastSeen ? formatDistanceToNow(new Date(u.lastSeen), { addSuffix: true }) : '—'}</td>
                  <td className="px-5 py-2.5 text-ui-muted">{format(new Date(u.createdAt), 'MMM d, yyyy')}</td>
                  <td className="px-5 py-2.5">{u.role === 'admin' ? <Badge tone="warning">Admin</Badge> : <span className="text-ui-subtle">User</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {d && d.total > 20 && (
        <div className="flex items-center justify-between border-t border-ui-border px-5 py-3 text-sm">
          <span className="text-ui-subtle">
            {offset + 1}–{Math.min(offset + 20, d.total)} of {d.total}
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 20))}>
              Previous
            </Button>
            <Button variant="secondary" size="sm" disabled={offset + 20 >= d.total} onClick={() => setOffset(offset + 20)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function OrgsTab() {
  const [q, setQ] = useState('');
  const [list, setList] = useState<any[] | null>(null);
  useEffect(() => {
    const t = setTimeout(() => admin.organizations(q).then(setList).catch(() => setList([])), 200);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <Card padded={false}>
      <div className="border-b border-ui-border p-3">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search organizations" className="max-w-sm" aria-label="Search organizations" />
      </div>
      {!list ? (
        <div className="p-5">
          <SkeletonRows />
        </div>
      ) : list.length === 0 ? (
        <EmptyState icon={Building2} title="No organizations" />
      ) : (
        <ul className="divide-y divide-ui-border">
          {list.map((o) => (
            <li key={o.id} className="flex items-center gap-3 px-5 py-3">
              <Avatar name={o.name} square size={34} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ui-text">{o.name}</p>
                <p className="truncate text-xs text-ui-subtle">
                  Owner {o.owner ?? '—'} · {o.ownerEmail}
                </p>
              </div>
              <span className="text-xs text-ui-muted">
                {o.workspaces} workspaces · {o.members} people
              </span>
              <span className="hidden text-xs text-ui-subtle sm:inline">{format(new Date(o.createdAt), 'MMM d, yyyy')}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function BillingTab() {
  const [d, setD] = useState<any>(null);
  useEffect(() => {
    admin.billingSummary().then(setD).catch(() => setD({ error: true }));
  }, []);
  if (!d) return <Card><SkeletonRows rows={5} /></Card>;
  if (d.error) return <ErrorState text="Billing summary couldn’t be loaded." />;
  const money = (minor: string | number, currency: string) => {
    const f = new Intl.NumberFormat('en', { style: 'currency', currency });
    return f.format(Number(minor) / 10 ** (f.resolvedOptions().maximumFractionDigits ?? 2));
  };
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['Starter', d.users.starter],
          ['Pro', d.users.pro],
          ['Advanced Lifetime', d.users.advancedLifetime],
          ['Paddle', d.billing.paddle ? `${d.billing.paddle.environment === 'production' ? 'Live' : 'Sandbox'} · checkout ${d.billing.paddle.checkoutEnabled ? 'on' : 'off'}` : 'Not configured'],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-ui-border bg-ui-panel p-4">
            <p className="text-xs font-medium text-ui-muted">{k}</p>
            <p className="mt-2 text-xl font-semibold text-ui-text">{v}</p>
          </div>
        ))}
      </div>
      <Card padded={false}>
        <h2 className="flex items-center gap-2 border-b border-ui-border px-5 py-3.5 text-sm font-semibold text-ui-text">
          <CreditCard size={15} className="text-ui-subtle" /> Customers
        </h2>
        {d.customers.length === 0 ? (
          <EmptyState icon={CreditCard} title="No paying customers yet" text="Customers appear here after verified Paddle webhooks." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs text-ui-subtle">
                <tr>
                  {['Customer', 'Plan', 'Billing', 'Status', 'Renewal / expiry'].map((h) => (
                    <th key={h} className="px-5 py-2.5 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ui-border">
                {d.customers.map((c: any) => (
                  <tr key={c.userId}>
                    <td className="px-5 py-2.5">
                      <span className="block font-medium text-ui-text">{c.username}</span>
                      <span className="text-xs text-ui-subtle">{c.email}</span>
                    </td>
                    <td className="px-5 py-2.5 capitalize">{c.plan ?? '—'}</td>
                    <td className="px-5 py-2.5">{c.billing === 'lifetime' ? 'Lifetime' : c.billing === 'year' ? 'Yearly' : c.billing === 'month' ? 'Monthly' : '—'}</td>
                    <td className="px-5 py-2.5">{c.status}</td>
                    <td className="px-5 py-2.5 text-ui-muted">{c.billing === 'lifetime' ? 'Never expires' : c.currentPeriodEnd ? format(new Date(c.currentPeriodEnd), 'MMM d, yyyy') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Card>
        <h2 className="text-sm font-semibold text-ui-text">Revenue</h2>
        <p className="mt-2 text-sm text-ui-muted">
          MRR: {d.monthlyRecurringRevenue.length ? d.monthlyRecurringRevenue.map((r: any) => money(r.mrr_minor, r.currency_code)).join(' · ') : 'none yet'} · Lifetime sales:{' '}
          {d.lifetimeRevenue.length ? d.lifetimeRevenue.map((r: any) => money(r.total_minor, r.currency_code)).join(' · ') : 'none yet'}
        </p>
      </Card>
    </div>
  );
}

function ReportsTab() {
  const [list, setList] = useState<any[] | null>(null);
  const load = () => admin.reports().then(setList).catch(() => setList([]));
  useEffect(() => {
    load();
  }, []);
  return (
    <Card padded={false}>
      {!list ? (
        <div className="p-5">
          <SkeletonRows />
        </div>
      ) : list.length === 0 ? (
        <EmptyState icon={Flag} title="No reports" text="Messages reported by users appear here." />
      ) : (
        <ul className="divide-y divide-ui-border">
          {list.map((r) => (
            <li key={r.id} className="flex flex-col gap-2 px-5 py-3.5 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ui-text">
                  <Badge tone={r.status === 'open' ? 'danger' : 'neutral'}>{r.status}</Badge> <b className="capitalize">{r.reason}</b> · {r.reporter} reported {r.sender}
                </p>
                <p className="mt-1 line-clamp-2 text-sm text-ui-muted">“{r.text || '(deleted or attachment)'}”</p>
                <p className="mt-0.5 text-xs text-ui-subtle">{formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}</p>
              </div>
              {r.status === 'open' && (
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => admin.updateReport(r.id, 'dismissed').then(load).then(() => toast.success('Dismissed'))}>
                    Dismiss
                  </Button>
                  <Button size="sm" onClick={() => admin.updateReport(r.id, 'reviewed').then(load).then(() => toast.success('Marked reviewed'))}>
                    Mark reviewed
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function AuditTab() {
  const [list, setList] = useState<any[] | null>(null);
  useEffect(() => {
    admin.audit().then(setList).catch(() => setList([]));
  }, []);
  return (
    <Card padded={false}>
      {!list ? (
        <div className="p-5">
          <SkeletonRows />
        </div>
      ) : list.length === 0 ? (
        <EmptyState icon={ScrollText} title="No events yet" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs text-ui-subtle">
              <tr>
                {['When', 'Who', 'Action', 'Workspace'].map((h) => (
                  <th key={h} className="px-5 py-2.5 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ui-border">
              {list.map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap px-5 py-2.5 text-ui-subtle">{format(new Date(e.createdAt), 'MMM d, HH:mm')}</td>
                  <td className="px-5 py-2.5 text-ui-text">{e.actor ?? '—'}</td>
                  <td className="px-5 py-2.5 font-mono text-xs text-ui-muted">{e.action}</td>
                  <td className="px-5 py-2.5 text-ui-muted">{e.workspace ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
