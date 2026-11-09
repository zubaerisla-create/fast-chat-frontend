'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Hash, Lock, Megaphone, MoreHorizontal, Pencil, Plus, Search, Trash2, UserPlus } from 'lucide-react';
import { PageBody } from '@/components/app/AppShell';
import { useWorkspaceDetails } from '@/components/app/useWorkspaceDetails';
import UserPicker from '@/components/app/UserPicker';
import { Badge, Button, Card, Confirm, EmptyState, Field, IconButton, Input, Menu, Modal, PageHeader, Select, SkeletonRows, Tabs, Textarea, Toggle, cx } from '@/components/app/ui';
import { workspaces as wsApi, errorMessage, type Channel, type PublicUser } from '@/lib/saas';

export default function ChannelsPage({ params }: { params: { wsId: string } }) {
  const router = useRouter();
  const { data, can } = useWorkspaceDetails(params.wsId);
  const [channels, setChannels] = useState<Channel[] | null>(null);
  const [tab, setTab] = useState<'all' | 'joined' | 'browse'>('all');
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Channel | null>(null);
  const [adding, setAdding] = useState<Channel | null>(null);
  const [deleting, setDeleting] = useState<Channel | null>(null);
  const [wsMembers, setWsMembers] = useState<PublicUser[]>([]);

  const load = useCallback(() => wsApi.channels(params.wsId).then(setChannels).catch(() => setChannels([])), [params.wsId]);
  useEffect(() => {
    load();
    wsApi.members(params.wsId).then((r) => setWsMembers(r.members)).catch(() => {});
    if (new URLSearchParams(window.location.search).get('new') === '1') setCreating(true);
  }, [load, params.wsId]);

  const changed = () => {
    load();
    window.dispatchEvent(new Event('fc:channelsChanged'));
  };
  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast.success(ok);
      changed();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const visible = (channels ?? []).filter((c) => (tab === 'joined' ? c.joined : tab === 'browse' ? !c.joined : true) && c.name.includes(q.toLowerCase().replace(/^#/, '')));
  const manageable = (c: Channel) => can('channels.manage') || ['owner', 'admin'].includes(c.myRole ?? '');

  return (
    <PageBody>
      <PageHeader
        icon={Hash}
        title="Channels"
        description={data ? `${channels?.length ?? '…'} channels in ${data.workspace.name}${data.plan.limits.channelsPerWorkspace ? ` · plan allows ${data.plan.limits.channelsPerWorkspace}` : ''}` : 'Loading…'}
        actions={
          can('channels.create') && (
            <Button icon={Plus} onClick={() => setCreating(true)}>
              New channel
            </Button>
          )
        }
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'all', label: 'All' },
            { value: 'joined', label: 'Joined', count: channels?.filter((c) => c.joined).length },
            { value: 'browse', label: 'Not joined', count: channels?.filter((c) => !c.joined).length },
          ]}
        />
        <div className="relative w-full sm:w-64">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ui-subtle" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a channel" className="pl-9" aria-label="Find a channel" />
        </div>
      </div>

      <Card padded={false}>
        {!channels ? (
          <div className="p-5">
            <SkeletonRows rows={4} />
          </div>
        ) : visible.length === 0 ? (
          <EmptyState icon={Hash} title={channels.length ? 'No channels match' : 'No channels yet'} text={can('channels.create') ? 'Create channels for projects, departments or topics.' : undefined} />
        ) : (
          <ul className="divide-y divide-ui-border">
            {visible.map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                <span className={cx('flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl', c.joined ? 'bg-ui-accent-soft text-ui-accent-text' : 'bg-ui-sunken text-ui-muted')}>
                  {c.adminsOnlyPost ? <Megaphone size={17} /> : c.visibility === 'private' ? <Lock size={16} /> : <Hash size={17} />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {c.joined ? (
                      <Link href={`/w/${params.wsId}/c/${c.id}`} className="truncate text-sm font-semibold text-ui-text hover:underline">
                        #{c.name}
                      </Link>
                    ) : (
                      <span className="truncate text-sm font-semibold text-ui-text">#{c.name}</span>
                    )}
                    {c.visibility === 'private' && <Badge>Private</Badge>}
                    {c.kind && !['topic', 'general'].includes(c.kind) && <Badge className="capitalize">{c.kind}</Badge>}
                  </div>
                  <p className="truncate text-xs text-ui-subtle">
                    {c.memberCount} member{c.memberCount === 1 ? '' : 's'}
                    {c.description ? ` · ${c.description}` : ''}
                  </p>
                </div>
                {c.joined ? (
                  <Link href={`/w/${params.wsId}/c/${c.id}`}>
                    <Button size="sm" variant="secondary">
                      Open
                    </Button>
                  </Link>
                ) : (
                  <Button
                    size="sm"
                    onClick={async () => {
                      try {
                        await wsApi.joinChannel(params.wsId, c.id);
                        changed();
                        router.push(`/w/${params.wsId}/c/${c.id}`);
                      } catch (e) {
                        toast.error(errorMessage(e));
                      }
                    }}
                  >
                    Join
                  </Button>
                )}
                <Menu
                  trigger={(o, t) => <IconButton icon={MoreHorizontal} label={`Options for #${c.name}`} onClick={t} active={o} />}
                  items={[
                    manageable(c) && { label: 'Edit channel', icon: Pencil, onClick: () => setEditing(c) },
                    c.joined && (manageable(c) || c.visibility === 'public') && { label: 'Add people', icon: UserPlus, onClick: () => setAdding(c) },
                    c.joined && c.kind !== 'general' && { label: 'Leave channel', onClick: () => act(() => wsApi.leaveChannel(params.wsId, c.id), `Left #${c.name}`) },
                    can('workspace.update') && c.kind !== 'general' && 'divider',
                    can('workspace.update') && c.kind !== 'general' && { label: 'Delete channel', icon: Trash2, danger: true, onClick: () => setDeleting(c) },
                  ]}
                />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ChannelForm
        open={creating || Boolean(editing)}
        channel={editing}
        members={wsMembers}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSubmit={async (v) => {
          if (editing) {
            await wsApi.updateChannel(params.wsId, editing.id, { name: v.name, description: v.description || null, visibility: v.visibility, adminsOnlyPost: v.adminsOnlyPost });
            toast.success('Channel updated');
            changed();
          } else {
            const ch = await wsApi.createChannel(params.wsId, { name: v.name, description: v.description || undefined, visibility: v.visibility, kind: v.kind, memberIds: v.members.map((m) => m._id) });
            changed();
            router.push(`/w/${params.wsId}/c/${ch.id}`);
          }
        }}
      />

      <Modal
        open={Boolean(adding)}
        onClose={() => setAdding(null)}
        title={`Add people to #${adding?.name}`}
        footer={<Button onClick={() => setAdding(null)}>Done</Button>}
      >
        <AddToChannel wsId={params.wsId} channel={adding} members={wsMembers} />
      </Modal>

      <Confirm
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title={`Delete #${deleting?.name}?`}
        text="All messages in this channel will be permanently deleted for everyone."
        confirmLabel="Delete channel"
        danger
        onConfirm={() => {
          const c = deleting!;
          setDeleting(null);
          act(() => wsApi.deleteChannel(params.wsId, c.id), `#${c.name} deleted`);
        }}
      />
    </PageBody>
  );
}

function AddToChannel({ wsId, channel, members }: { wsId: string; channel: Channel | null; members: PublicUser[] }) {
  const [picked, setPicked] = useState<PublicUser[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => setPicked([]), [channel]);
  if (!channel) return null;
  return (
    <div className="space-y-3">
      <UserPicker selected={picked} onChange={setPicked} source={members} />
      <Button
        className="w-full"
        disabled={!picked.length}
        loading={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await wsApi.addChannelMembers(wsId, channel.id, picked.map((p) => p._id));
            toast.success('Added');
            setPicked([]);
            window.dispatchEvent(new Event('fc:channelsChanged'));
          } catch (e) {
            toast.error(errorMessage(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        Add {picked.length || ''} to #{channel.name}
      </Button>
    </div>
  );
}

interface FormValues {
  name: string;
  description: string;
  visibility: 'public' | 'private';
  kind: string;
  adminsOnlyPost: boolean;
  members: PublicUser[];
}

function ChannelForm({ open, channel, members, onClose, onSubmit }: { open: boolean; channel: Channel | null; members: PublicUser[]; onClose: () => void; onSubmit: (v: FormValues) => Promise<void> }) {
  const [v, setV] = useState<FormValues>({ name: '', description: '', visibility: 'public', kind: 'topic', adminsOnlyPost: false, members: [] });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    setErr(null);
    setV(channel ? { name: channel.name, description: channel.description || '', visibility: channel.visibility, kind: channel.kind || 'topic', adminsOnlyPost: channel.adminsOnlyPost, members: [] } : { name: '', description: '', visibility: 'public', kind: 'topic', adminsOnlyPost: false, members: [] });
  }, [open, channel]);
  const slug = v.name.toLowerCase().trim().replace(/^#/, '').replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '');
  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      await onSubmit(v);
      onClose();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const general = channel?.kind === 'general';
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={channel ? `Edit #${channel.name}` : 'Create a channel'}
      description={channel ? undefined : 'Channels are where your team talks about a topic, project or department.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={busy} disabled={!slug}>
            {channel ? 'Save changes' : 'Create channel'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Name" hint={slug && slug !== v.name ? `Will be created as #${slug}` : 'Lowercase, no spaces.'} htmlFor="ch-name">
          <div className="relative">
            <Hash size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ui-subtle" />
            <Input id="ch-name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} disabled={general} placeholder="e.g. marketing" className="pl-8" maxLength={50} />
          </div>
        </Field>
        <Field label="Description" hint="Optional" htmlFor="ch-desc">
          <Textarea id="ch-desc" rows={2} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} maxLength={500} placeholder="What’s this channel about?" />
        </Field>
        {!channel && (
          <Field label="Type" htmlFor="ch-kind">
            <Select id="ch-kind" value={v.kind} onChange={(e) => setV({ ...v, kind: e.target.value })}>
              <option value="topic">Topic</option>
              <option value="project">Project</option>
              <option value="department">Department</option>
              <option value="announcement">Announcement (only admins post)</option>
            </Select>
          </Field>
        )}
        {!general && (
          <div className="grid gap-2 sm:grid-cols-2">
            {(['public', 'private'] as const).map((vis) => (
              <button key={vis} type="button" onClick={() => setV({ ...v, visibility: vis })} className={cx('rounded-xl border p-3 text-left transition-colors', v.visibility === vis ? 'border-ui-accent bg-ui-accent-soft' : 'border-ui-border hover:bg-ui-sunken')}>
                <span className="flex items-center gap-2 text-sm font-medium text-ui-text">
                  {vis === 'public' ? <Hash size={15} /> : <Lock size={15} />}
                  {vis === 'public' ? 'Public' : 'Private'}
                </span>
                <span className="mt-1 block text-xs text-ui-muted">{vis === 'public' ? 'Any member can find and join.' : 'Only invited people can see it.'}</span>
              </button>
            ))}
          </div>
        )}
        {channel && (
          <div className="flex items-center justify-between rounded-lg border border-ui-border px-3 py-2.5">
            <span className="text-sm text-ui-text">Only admins can post</span>
            <Toggle checked={v.adminsOnlyPost} onChange={(x) => setV({ ...v, adminsOnlyPost: x })} label="Only admins can post" />
          </div>
        )}
        {!channel && members.length > 1 && (
          <Field label="Add people" hint="Optional. You can add more later.">
            <UserPicker selected={v.members} onChange={(m) => setV({ ...v, members: m })} source={members} />
          </Field>
        )}
        {err && (
          <p role="alert" className="rounded-lg border border-ui-danger/30 bg-ui-danger/10 p-3 text-sm text-ui-danger">
            {err}
          </p>
        )}
      </div>
    </Modal>
  );
}
