'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Activity, ArrowRight, CheckSquare, Hash, Lock, Plus, Settings, UserPlus } from 'lucide-react';
import { PageBody } from '@/components/app/AppShell';
import { useWorkspaceDetails } from '@/components/app/useWorkspaceDetails';
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, Progress, Skeleton, SkeletonRows } from '@/components/app/ui';
import { tasks as tasksApi, workspaces as wsApi, type Channel, type TaskSummary, type WorkspaceMember } from '@/lib/saas';

const ACTION_LABEL: Record<string, string> = {
  'workspace.create': 'created the workspace',
  'workspace.update': 'updated workspace settings',
  'workspace.transfer': 'transferred ownership',
  'member.invite': 'invited people',
  'member.invite_revoke': 'revoked an invitation',
  'member.join': 'joined',
  'member.leave': 'left',
  'member.remove': 'removed a member',
  'member.role': 'changed a role',
  'channel.create': 'created a channel',
  'channel.update': 'updated a channel',
  'channel.delete': 'deleted a channel',
};

export default function WorkspaceHome({ params }: { params: { wsId: string } }) {
  const { data, error, reload, can } = useWorkspaceDetails(params.wsId);
  const [channels, setChannels] = useState<Channel[] | null>(null);
  const [members, setMembers] = useState<{ members: WorkspaceMember[]; total: number } | null>(null);
  const [summary, setSummary] = useState<TaskSummary | null>(null);
  const [activity, setActivity] = useState<Awaited<ReturnType<typeof wsApi.activity>> | null>(null);

  useEffect(() => {
    wsApi.channels(params.wsId).then(setChannels).catch(() => setChannels([]));
    wsApi.members(params.wsId).then(setMembers).catch(() => setMembers({ members: [], total: 0 }));
    tasksApi.list({ scope: 'workspace', workspaceId: params.wsId }).then((r) => setSummary(r.summary)).catch(() => {});
  }, [params.wsId]);
  useEffect(() => {
    if (data && can('audit.view')) wsApi.activity(params.wsId).then((e) => setActivity(e.slice(0, 8))).catch(() => setActivity([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, params.wsId]);

  if (error) return <PageBody><ErrorState text="This workspace couldn’t be loaded. You may no longer be a member." onRetry={reload} /></PageBody>;
  const ws = data?.workspace;
  const limits = data?.plan.limits;
  const channelCount = channels?.length ?? 0;
  const open = summary ? summary.todo + summary.in_progress + summary.review : null;

  return (
    <PageBody wide>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {ws ? <Avatar name={ws.name} square size={56} /> : <Skeleton className="h-14 w-14 !rounded-2xl" />}
        <div className="min-w-0 flex-1">
          {ws ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-ui-text">{ws.name}</h1>
                <Badge tone="accent" className="capitalize">{ws.myRole}</Badge>
              </div>
              <p className="mt-0.5 text-sm text-ui-muted">{ws.description || `${ws.organization?.name} · fastchat/${ws.slug}`}</p>
            </>
          ) : (
            <>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="mt-2 h-4 w-64" />
            </>
          )}
        </div>
        <div className="flex gap-2">
          {can('members.invite') && (
            <Link href={`/w/${params.wsId}/members?invite=1`}>
              <Button icon={UserPlus}>Invite people</Button>
            </Link>
          )}
          {can('workspace.update') && (
            <Link href={`/w/${params.wsId}/settings`}>
              <Button variant="secondary" icon={Settings}>
                Settings
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Members" value={members?.total} limit={limits?.membersPerWorkspace} href={`/w/${params.wsId}/members`} />
        <Metric label="Channels" value={channels ? channelCount : undefined} limit={limits?.channelsPerWorkspace} href={`/w/${params.wsId}/channels`} />
        <Metric label="Open tasks" value={open ?? undefined} note={summary?.overdue ? `${summary.overdue} overdue` : undefined} href={`/tasks?workspace=${params.wsId}`} />
        <Metric label="Workspace plan" value={data ? (data.plan.id === 'free' ? 'Free limits' : data.plan.name) : undefined} href="/billing" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <Card padded={false}>
          <div className="flex items-center justify-between border-b border-ui-border px-5 py-3.5">
            <h2 className="text-sm font-semibold text-ui-text">Channels</h2>
            <Link href={`/w/${params.wsId}/channels${can('channels.create') ? '?new=1' : ''}`}>
              <Button size="sm" variant="secondary" icon={can('channels.create') ? Plus : ArrowRight}>
                {can('channels.create') ? 'New channel' : 'Browse'}
              </Button>
            </Link>
          </div>
          {!channels ? (
            <div className="p-5">
              <SkeletonRows rows={3} />
            </div>
          ) : channels.length === 0 ? (
            <EmptyState icon={Hash} title="No channels you can see yet" text="Ask an admin to add you to a channel." />
          ) : (
            <ul className="divide-y divide-ui-border">
              {channels.map((c) => (
                <li key={c.id}>
                  <Link href={c.joined ? `/w/${params.wsId}/c/${c.id}` : `/w/${params.wsId}/channels`} className="flex items-center gap-3 px-5 py-3 hover:bg-ui-sunken/60">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ui-sunken text-ui-muted">{c.visibility === 'private' ? <Lock size={15} /> : <Hash size={16} />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className={`truncate text-sm ${c.unreadCount ? 'font-semibold' : 'font-medium'} text-ui-text`}>{c.name}</span>
                        {c.adminsOnlyPost && <Badge>Announcements</Badge>}
                        {!c.joined && <Badge tone="accent">Not joined</Badge>}
                      </span>
                      <span className="block truncate text-xs text-ui-subtle">{c.description || `${c.memberCount} members`}</span>
                    </span>
                    {c.unreadCount > 0 && <Badge tone="accent">{c.unreadCount} new</Badge>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-5">
          <Card padded={false}>
            <div className="flex items-center justify-between border-b border-ui-border px-5 py-3.5">
              <h2 className="text-sm font-semibold text-ui-text">People</h2>
              <Link href={`/w/${params.wsId}/members`} className="text-xs font-medium text-ui-accent-text hover:underline">
                Manage
              </Link>
            </div>
            {!members ? (
              <div className="p-5">
                <SkeletonRows rows={3} />
              </div>
            ) : (
              <ul className="space-y-0.5 p-2">
                {members.members.slice(0, 6).map((m) => (
                  <li key={m.id} className="flex items-center gap-3 rounded-lg px-3 py-2">
                    <Avatar name={m.username} src={m.avatar} size={30} online={m.isOnline} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-ui-text">{m.username}</span>
                      {m.title && <span className="block truncate text-xs text-ui-subtle">{m.title}</span>}
                    </span>
                    <span className="text-xs capitalize text-ui-subtle">{m.role}</span>
                  </li>
                ))}
                {members.total > 6 && (
                  <li className="px-3 py-1.5 text-xs text-ui-subtle">
                    +{members.total - 6} more
                  </li>
                )}
              </ul>
            )}
          </Card>

          {can('audit.view') && (
            <Card padded={false}>
              <div className="flex items-center gap-2 border-b border-ui-border px-5 py-3.5">
                <Activity size={15} className="text-ui-subtle" />
                <h2 className="text-sm font-semibold text-ui-text">Recent activity</h2>
              </div>
              {!activity ? (
                <div className="p-5">
                  <SkeletonRows rows={3} />
                </div>
              ) : activity.length === 0 ? (
                <p className="px-5 py-6 text-sm text-ui-subtle">No activity yet.</p>
              ) : (
                <ol className="space-y-3 px-5 py-4">
                  {activity.map((e) => (
                    <li key={e.id} className="flex gap-3 text-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-ui-accent" />
                      <span className="flex-1 text-ui-muted">
                        <b className="font-medium text-ui-text">{e.actor ?? 'Someone'}</b> {ACTION_LABEL[e.action] ?? e.action}
                        {typeof e.metadata?.name === 'string' && <> “{e.metadata.name as string}”</>}
                        <span className="block text-xs text-ui-subtle">{formatDistanceToNow(new Date(e.createdAt), { addSuffix: true })}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          )}

          {!can('audit.view') && data && (
            <Card>
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ui-accent-soft text-ui-accent-text">
                  <CheckSquare size={17} />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-ui-text">Team tasks</p>
                  <p className="text-xs text-ui-subtle">See what everyone is working on.</p>
                </div>
                <Link href={`/tasks?workspace=${params.wsId}`}>
                  <Button size="sm" variant="secondary">
                    Open
                  </Button>
                </Link>
              </div>
            </Card>
          )}
        </div>
      </div>
    </PageBody>
  );
}

function Metric({ label, value, limit, note, href }: { label: string; value: number | string | undefined; limit?: number | null; note?: string; href: string }) {
  return (
    <Link href={href} className="rounded-xl border border-ui-border bg-ui-panel p-4 transition-colors hover:border-ui-accent/40">
      <p className="text-xs font-medium text-ui-muted">{label}</p>
      {value === undefined ? (
        <Skeleton className="mt-3 h-7 w-14" />
      ) : (
        <p className="mt-2 text-2xl font-semibold tracking-tight text-ui-text">
          {value}
          {typeof value === 'number' && limit !== undefined && <span className="text-sm font-normal text-ui-subtle"> / {limit === null ? '∞' : limit}</span>}
        </p>
      )}
      {typeof value === 'number' && limit ? (
        <div className="mt-2">
          <Progress value={value} max={limit} />
        </div>
      ) : null}
      {note && <p className="mt-1 text-xs font-medium text-ui-danger">{note}</p>}
    </Link>
  );
}
