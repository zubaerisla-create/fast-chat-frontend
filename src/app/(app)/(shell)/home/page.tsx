'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import toast from 'react-hot-toast';
import { ArrowRight, Bell, CheckSquare, Hash, MailPlus, MessagesSquare, Plus, Sparkles, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useWorkspaces } from '@/context/WorkspaceContext';
import { PageBody } from '@/components/app/AppShell';
import CreateWorkspaceModal from '@/components/app/CreateWorkspaceModal';
import { Avatar, Badge, Button, Card, EmptyState, Progress, Skeleton, SkeletonRows } from '@/components/app/ui';
import { conversations as convApi, invitations as invApi, notificationsApi, tasks as tasksApi, billing, errorMessage, type AppNotification, type Conversation, type Task, type TaskSummary, type UsageResponse } from '@/lib/saas';
import { conversationTitle } from '@/components/app/chat/dialogs';
import { formatBytes } from '@/components/app/ui';

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

const PRIORITY_TONE = { urgent: 'danger', high: 'warning', medium: 'accent', low: 'neutral' } as const;

export default function HomePage() {
  const { user } = useAuth();
  const { workspaces, loading: wsLoading, refresh, setCurrentId } = useWorkspaces();
  const [convs, setConvs] = useState<Conversation[] | null>(null);
  const [tasks, setTasks] = useState<{ tasks: Task[]; summary: TaskSummary } | null>(null);
  const [notes, setNotes] = useState<AppNotification[] | null>(null);
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [invites, setInvites] = useState<Awaited<ReturnType<typeof invApi.mine>>>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    convApi.list().then(setConvs).catch(() => setConvs([]));
    tasksApi.list({ scope: 'mine' }).then(setTasks).catch(() => setTasks({ tasks: [], summary: { todo: 0, in_progress: 0, review: 0, completed: 0, overdue: 0 } }));
    notificationsApi.list().then((r) => setNotes(r.notifications.slice(0, 5))).catch(() => setNotes([]));
    billing.usage().then(setUsage).catch(() => {});
    invApi.mine().then(setInvites).catch(() => {});
  }, []);

  const unread = (convs ?? []).filter((c) => c.unreadCount > 0);
  const openTasks = (tasks?.tasks ?? []).filter((t) => t.status !== 'completed').slice(0, 5);

  return (
    <PageBody wide>
      <div className="flex flex-col gap-1">
        <p className="text-sm text-ui-subtle">{format(new Date(), 'EEEE, MMMM d')}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-ui-text sm:text-[28px]">
          {greeting()}, {user?.username}
        </h1>
      </div>

      {invites.length > 0 && (
        <Card className="border-ui-accent/30 bg-ui-accent-soft/50">
          <div className="space-y-3">
            {invites.map((inv) => (
              <div key={inv.id} className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <MailPlus size={18} className="text-ui-accent" aria-hidden />
                <p className="flex-1 text-sm text-ui-text">
                  <b>{inv.invitedBy}</b> invited you to join <b>{inv.workspace.name}</b> as {inv.role}.
                </p>
                <Button
                  size="sm"
                  onClick={async () => {
                    try {
                      const ws = await invApi.acceptById(inv.id);
                      await refresh();
                      setCurrentId(ws.id);
                      setInvites((l) => l.filter((x) => x.id !== inv.id));
                      toast.success(`Welcome to ${ws.name}`);
                    } catch (e) {
                      toast.error(errorMessage(e));
                    }
                  }}
                >
                  Accept invitation
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Unread conversations" value={convs ? unread.length : null} icon={MessagesSquare} href="/messages" />
        <Stat label="Open tasks" value={tasks ? tasks.summary.todo + tasks.summary.in_progress + tasks.summary.review : null} icon={CheckSquare} href="/tasks" note={tasks?.summary.overdue ? `${tasks.summary.overdue} overdue` : undefined} />
        <Stat label="Workspaces" value={wsLoading ? null : workspaces.length} icon={Users} href="/organizations" />
        <Stat label="Current plan" value={usage ? (usage.plan.id === 'free' ? 'No plan' : usage.plan.name) : null} icon={Sparkles} href="/billing" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          {/* Workspaces */}
          <Card padded={false}>
            <div className="flex items-center justify-between border-b border-ui-border px-5 py-3.5">
              <h2 className="text-sm font-semibold text-ui-text">Your workspaces</h2>
              <Button size="sm" variant="secondary" icon={Plus} onClick={() => setCreating(true)}>
                New workspace
              </Button>
            </div>
            {wsLoading ? (
              <div className="p-5">
                <SkeletonRows rows={2} />
              </div>
            ) : workspaces.length === 0 ? (
              <EmptyState icon={Users} title="Bring your team together" text="Create a workspace with channels for projects, departments and announcements." action={<Button icon={Plus} onClick={() => setCreating(true)}>Create a workspace</Button>} />
            ) : (
              <ul className="divide-y divide-ui-border">
                {workspaces.map((w) => (
                  <li key={w.id}>
                    <Link href={`/w/${w.id}`} onClick={() => setCurrentId(w.id)} className="flex items-center gap-3.5 px-5 py-3 transition-colors hover:bg-ui-sunken/60">
                      <Avatar name={w.name} square size={38} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ui-text">{w.name}</span>
                        <span className="block text-xs text-ui-subtle">
                          {w.memberCount} member{w.memberCount === 1 ? '' : 's'} · <span className="capitalize">{w.myRole}</span>
                        </span>
                      </span>
                      {w.unreadCount ? <Badge tone="accent">{w.unreadCount} unread</Badge> : null}
                      <ArrowRight size={16} className="text-ui-subtle" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Recent conversations */}
          <Card padded={false}>
            <div className="flex items-center justify-between border-b border-ui-border px-5 py-3.5">
              <h2 className="text-sm font-semibold text-ui-text">Recent conversations</h2>
              <Link href="/messages" className="text-xs font-medium text-ui-accent-text hover:underline">
                View all
              </Link>
            </div>
            {!convs ? (
              <div className="p-5">
                <SkeletonRows rows={3} />
              </div>
            ) : convs.length === 0 ? (
              <EmptyState icon={MessagesSquare} title="No conversations yet" text="Start a direct message or create a group." action={<Link href="/messages?new=1"><Button icon={Plus}>New message</Button></Link>} />
            ) : (
              <ul className="divide-y divide-ui-border">
                {convs.slice(0, 6).map((c) => {
                  const title = conversationTitle(c, user!._id);
                  const other = c.type === 'direct' ? c.participants.find((p) => p._id !== user!._id) : null;
                  return (
                    <li key={c.id}>
                      <Link href={`/messages/${c.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-ui-sunken/60">
                        <Avatar name={title} src={other?.avatar || c.avatar} size={34} square={!other} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className={`truncate text-sm ${c.unreadCount ? 'font-semibold text-ui-text' : 'text-ui-text'}`}>{title}</span>
                            {c.type === 'group' && <Badge>Group</Badge>}
                          </span>
                          <span className="block truncate text-xs text-ui-subtle">{c.lastMessage ? c.lastMessage.deletedAt ? 'Message deleted' : c.lastMessage.text || 'Attachment' : 'No messages yet'}</span>
                        </span>
                        <span className="flex flex-col items-end gap-1">
                          <span className="text-[11px] text-ui-subtle">{formatDistanceToNow(new Date(c.lastMessageTime), { addSuffix: false })}</span>
                          {c.unreadCount > 0 && <span className="h-2 w-2 rounded-full bg-ui-accent" aria-label={`${c.unreadCount} unread`} />}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          {/* Tasks */}
          <Card padded={false}>
            <div className="flex items-center justify-between border-b border-ui-border px-5 py-3.5">
              <h2 className="text-sm font-semibold text-ui-text">My tasks</h2>
              <Link href="/tasks" className="text-xs font-medium text-ui-accent-text hover:underline">
                Open board
              </Link>
            </div>
            {!tasks ? (
              <div className="p-5">
                <SkeletonRows rows={3} />
              </div>
            ) : openTasks.length === 0 ? (
              <EmptyState icon={CheckSquare} title="You’re all caught up" text="Tasks assigned to you will show up here." />
            ) : (
              <ul className="divide-y divide-ui-border">
                {openTasks.map((t) => (
                  <li key={t.id}>
                    <Link href={`/tasks?task=${t.id}`} className="flex items-start gap-3 px-5 py-3 hover:bg-ui-sunken/60">
                      <span className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-2 border-ui-border" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-ui-text">{t.title}</span>
                        <span className="mt-1 flex flex-wrap items-center gap-1.5">
                          <Badge tone={PRIORITY_TONE[t.priority]}>{t.priority}</Badge>
                          {t.dueAt && <Badge tone={t.overdue ? 'danger' : 'neutral'}>{t.overdue ? 'Overdue' : `Due ${format(new Date(t.dueAt), 'MMM d')}`}</Badge>}
                          {t.workspaceName && <span className="text-[11px] text-ui-subtle">{t.workspaceName}</span>}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Notifications */}
          <Card padded={false}>
            <div className="flex items-center justify-between border-b border-ui-border px-5 py-3.5">
              <h2 className="text-sm font-semibold text-ui-text">Activity</h2>
              <Link href="/notifications" className="text-xs font-medium text-ui-accent-text hover:underline">
                All notifications
              </Link>
            </div>
            {!notes ? (
              <div className="p-5">
                <SkeletonRows rows={3} />
              </div>
            ) : notes.length === 0 ? (
              <EmptyState icon={Bell} title="Nothing new" text="Mentions, invitations and task updates appear here." />
            ) : (
              <ul className="divide-y divide-ui-border">
                {notes.map((n) => (
                  <li key={n.id} className="flex gap-3 px-5 py-3">
                    <Avatar name={n.actor?.username || 'FastChat'} src={n.actor?.avatar} size={28} />
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm ${n.readAt ? 'text-ui-muted' : 'font-medium text-ui-text'}`}>{n.title}</span>
                      <span className="text-[11px] text-ui-subtle">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Usage */}
          {usage && (
            <Card>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-ui-text">Storage</h2>
                <Link href="/billing" className="text-xs font-medium text-ui-accent-text hover:underline">
                  Usage & plan
                </Link>
              </div>
              <p className="mt-3 text-sm text-ui-muted">
                <b className="text-ui-text">{formatBytes(usage.usage.storage.used)}</b> of {formatBytes(usage.usage.storage.limit)}
              </p>
              <div className="mt-2">
                <Progress value={usage.usage.storage.used} max={usage.usage.storage.limit} />
              </div>
            </Card>
          )}
        </div>
      </div>
      <CreateWorkspaceModal open={creating} onClose={() => setCreating(false)} />
    </PageBody>
  );
}

function Stat({ label, value, icon: Icon, href, note }: { label: string; value: number | string | null; icon: typeof Hash; href: string; note?: string }) {
  return (
    <Link href={href} className="group rounded-xl border border-ui-border bg-ui-panel p-4 transition-colors hover:border-ui-accent/40">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-ui-muted">{label}</span>
        <Icon size={15} className="text-ui-subtle transition-colors group-hover:text-ui-accent" aria-hidden />
      </div>
      {value === null ? <Skeleton className="mt-3 h-7 w-16" /> : <p className="mt-2 text-2xl font-semibold tracking-tight text-ui-text">{value}</p>}
      {note && <p className="mt-0.5 text-xs font-medium text-ui-danger">{note}</p>}
    </Link>
  );
}
