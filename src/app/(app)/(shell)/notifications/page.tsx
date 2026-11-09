'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { AtSign, Bell, CheckCheck, CheckSquare, CreditCard, Hash, MailPlus, Phone, Users } from 'lucide-react';
import { useSocket } from '@/context/SocketContext';
import { PageBody } from '@/components/app/AppShell';
import { Avatar, Button, Card, EmptyState, PageHeader, SkeletonRows, Tabs, cx } from '@/components/app/ui';
import { notificationsApi, type AppNotification } from '@/lib/saas';

const ICON: Record<string, typeof Bell> = { mention: AtSign, group_added: Users, channel_added: Hash, workspace_invite: MailPlus, task_assigned: CheckSquare, task_comment: CheckSquare, task_status: CheckSquare, missed_call: Phone, billing: CreditCard };

/** Where a notification leads. */
function linkFor(n: AppNotification) {
  const d = n.data || {};
  if (n.type === 'workspace_invite') return '/home';
  if (d.taskId) return `/tasks?task=${d.taskId}`;
  if (d.conversationId && d.workspaceId) return `/w/${d.workspaceId}/c/${d.conversationId}`;
  if (d.conversationId) return `/messages/${d.conversationId}`;
  return null;
}

const bucket = (d: Date) => (isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : 'Earlier');

export default function NotificationsPage() {
  const { socket } = useSocket();
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const [data, setData] = useState<{ notifications: AppNotification[]; unread: number } | null>(null);
  const load = useCallback(() => notificationsApi.list(tab === 'unread').then(setData).catch(() => setData({ notifications: [], unread: 0 })), [tab]);
  useEffect(() => {
    setData(null);
    load();
  }, [load]);
  useEffect(() => {
    socket?.on('notification', load);
    return () => {
      socket?.off('notification', load);
    };
  }, [socket, load]);

  const markAll = async () => {
    await notificationsApi.markRead();
    window.dispatchEvent(new Event('fc:notificationsRead'));
    load();
  };
  const open = async (n: AppNotification) => {
    if (!n.readAt) {
      await notificationsApi.markRead([n.id]);
      window.dispatchEvent(new Event('fc:notificationsRead'));
    }
  };

  const groups = (data?.notifications ?? []).reduce<Record<string, AppNotification[]>>((acc, n) => {
    (acc[bucket(new Date(n.createdAt))] ||= []).push(n);
    return acc;
  }, {});

  return (
    <PageBody>
      <PageHeader
        icon={Bell}
        title="Notifications"
        description="Mentions, invitations, task updates and more."
        actions={
          data && data.unread > 0 ? (
            <Button variant="secondary" icon={CheckCheck} onClick={markAll}>
              Mark all as read
            </Button>
          ) : undefined
        }
      />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'all', label: 'All' }, { value: 'unread', label: 'Unread', count: data?.unread }]} />
      {!data ? (
        <Card>
          <SkeletonRows rows={5} />
        </Card>
      ) : data.notifications.length === 0 ? (
        <Card>
          <EmptyState icon={Bell} title={tab === 'unread' ? 'You’re all caught up' : 'No notifications yet'} text="When someone mentions you, assigns you a task or invites you to a workspace, it shows up here." />
        </Card>
      ) : (
        Object.entries(groups).map(([label, items]) => (
          <section key={label}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ui-subtle">{label}</h2>
            <Card padded={false}>
              <ul className="divide-y divide-ui-border">
                {items.map((n) => {
                  const Icon = ICON[n.type] ?? Bell;
                  const href = linkFor(n);
                  const body = (
                    <div className={cx('flex gap-3.5 px-5 py-3.5 transition-colors', !n.readAt && 'bg-ui-accent-soft/40', href && 'hover:bg-ui-sunken/70')}>
                      <div className="relative">
                        <Avatar name={n.actor?.username || 'FastChat'} src={n.actor?.avatar} size={36} />
                        <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-ui-panel bg-ui-accent text-white">
                          <Icon size={10} />
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={cx('text-sm', n.readAt ? 'text-ui-muted' : 'font-medium text-ui-text')}>{n.title}</p>
                        {n.body && <p className="mt-0.5 line-clamp-2 text-sm text-ui-muted">{n.body}</p>}
                        <p className="mt-1 text-xs text-ui-subtle">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</p>
                      </div>
                      {!n.readAt && <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-ui-accent" aria-label="Unread" />}
                    </div>
                  );
                  return (
                    <li key={n.id}>
                      {href ? (
                        <Link href={href} onClick={() => open(n)}>
                          {body}
                        </Link>
                      ) : (
                        <button type="button" className="w-full text-left" onClick={() => open(n).then(load)}>
                          {body}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>
          </section>
        ))
      )}
      <p className="text-center text-xs text-ui-subtle">
        Choose what notifies you in{' '}
        <Link href="/settings#notifications" className="font-medium text-ui-accent-text hover:underline">
          Settings
        </Link>
        .
      </p>
    </PageBody>
  );
}
