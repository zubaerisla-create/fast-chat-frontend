'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { Check, Copy, LogOut, Mail, MoreHorizontal, Search, UserMinus, UserPlus, Users, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useWorkspaces } from '@/context/WorkspaceContext';
import { PageBody } from '@/components/app/AppShell';
import { useWorkspaceDetails } from '@/components/app/useWorkspaceDetails';
import { Avatar, Badge, Button, Card, Confirm, EmptyState, ErrorState, Field, IconButton, Input, Menu, Modal, PageHeader, Select, SkeletonRows, Tabs, Textarea } from '@/components/app/ui';
import { workspaces as wsApi, errorMessage, type Invitation, type Role, type WorkspaceMember } from '@/lib/saas';

const ROLE_INFO: Record<Role, string> = {
  owner: 'Full control, billing and deletion',
  admin: 'Manage members, channels and settings',
  manager: 'Invite people and manage channels and tasks',
  member: 'Join public channels, create channels and tasks',
  guest: 'Only sees channels they’re added to',
};
const ROLE_TONE: Record<Role, 'accent' | 'success' | 'warning' | 'neutral'> = { owner: 'accent', admin: 'success', manager: 'warning', member: 'neutral', guest: 'neutral' };

export default function MembersPage({ params }: { params: { wsId: string } }) {
  const { user } = useAuth();
  const router = useRouter();
  const { refresh } = useWorkspaces();
  const { data, error, reload, can } = useWorkspaceDetails(params.wsId);
  const [tab, setTab] = useState<'members' | 'invitations'>('members');
  const [q, setQ] = useState('');
  const [members, setMembers] = useState<{ members: WorkspaceMember[]; total: number } | null>(null);
  const [invites, setInvites] = useState<Invitation[] | null>(null);
  const [inviting, setInviting] = useState(false);
  const [removing, setRemoving] = useState<WorkspaceMember | null>(null);
  const [leaving, setLeaving] = useState(false);

  const loadMembers = useCallback(() => wsApi.members(params.wsId, q).then(setMembers).catch(() => setMembers({ members: [], total: 0 })), [params.wsId, q]);
  const loadInvites = useCallback(() => wsApi.invitations(params.wsId).then(setInvites).catch(() => setInvites([])), [params.wsId]);
  useEffect(() => {
    const t = setTimeout(loadMembers, 200);
    return () => clearTimeout(t);
  }, [loadMembers]);
  useEffect(() => {
    if (can('members.invite')) loadInvites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('invite') === '1') setInviting(true);
  }, []);

  const changeRole = async (m: WorkspaceMember, role: Role) => {
    try {
      await wsApi.updateMember(params.wsId, m.id, { role });
      toast.success(`${m.username} is now ${role === 'admin' ? 'an' : 'a'} ${role}`);
      loadMembers();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  if (error) return <PageBody><ErrorState text="You don’t have access to this workspace." onRetry={reload} /></PageBody>;
  const myRole = data?.workspace.myRole;
  const rank = { guest: 0, member: 1, manager: 2, admin: 3, owner: 4 } as const;
  const canManage = (m: WorkspaceMember) => myRole && m.id !== user!._id && can('members.role') && rank[myRole] > rank[m.role];

  return (
    <PageBody>
      <PageHeader
        icon={Users}
        title="Members"
        description={data ? `${members?.total ?? '…'} people in ${data.workspace.name}${data.plan.limits.membersPerWorkspace ? ` · plan allows ${data.plan.limits.membersPerWorkspace} incl. pending invites` : ''}` : 'Loading…'}
        actions={
          <>
            {myRole && myRole !== 'owner' && (
              <Button variant="secondary" icon={LogOut} onClick={() => setLeaving(true)}>
                Leave
              </Button>
            )}
            {can('members.invite') && (
              <Button icon={UserPlus} onClick={() => setInviting(true)}>
                Invite people
              </Button>
            )}
          </>
        }
      />

      {can('members.invite') && (
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'members', label: 'Members', count: members?.total },
            { value: 'invitations', label: 'Pending invitations', count: invites?.length },
          ]}
        />
      )}

      {tab === 'members' ? (
        <Card padded={false}>
          <div className="border-b border-ui-border p-3">
            <div className="relative max-w-sm">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ui-subtle" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search members" className="pl-9" aria-label="Search members" />
            </div>
          </div>
          {!members ? (
            <div className="p-5">
              <SkeletonRows rows={5} />
            </div>
          ) : members.members.length === 0 ? (
            <EmptyState icon={Search} title="No members match" />
          ) : (
            <ul className="divide-y divide-ui-border">
              {members.members.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap sm:px-5">
                  <Avatar name={m.username} src={m.avatar} size={36} online={m.isOnline} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ui-text">
                      {m.username}
                      {m.id === user!._id && <span className="font-normal text-ui-subtle"> (you)</span>}
                      {m.title && <span className="font-normal text-ui-subtle"> · {m.title}</span>}
                    </p>
                    <p className="truncate text-xs text-ui-subtle">
                      {m.email ?? ''}
                      {m.lastActiveAt ? ` · active ${formatDistanceToNow(new Date(m.lastActiveAt), { addSuffix: true })}` : ''}
                    </p>
                  </div>
                  {canManage(m) ? (
                    <Select value={m.role} onChange={(e) => changeRole(m, e.target.value as Role)} className="h-8 w-[130px] text-[13px] capitalize" aria-label={`Role for ${m.username}`}>
                      <option value={m.role} disabled>
                        {m.role}
                      </option>
                      {data!.assignableRoles.filter((r) => r !== m.role).map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Badge tone={ROLE_TONE[m.role]} className="capitalize">
                      {m.role}
                    </Badge>
                  )}
                  {(canManage(m) && can('members.remove')) || (myRole === 'owner' && m.id !== user!._id) ? (
                    <Menu
                      trigger={(o, t) => <IconButton icon={MoreHorizontal} label={`Manage ${m.username}`} onClick={t} active={o} />}
                      items={[
                        myRole === 'owner' && m.role !== 'guest' && {
                          label: 'Make workspace owner',
                          icon: Check,
                          onClick: async () => {
                            try {
                              await wsApi.transfer(params.wsId, m.id);
                              toast.success(`${m.username} now owns this workspace`);
                              reload();
                              loadMembers();
                              refresh();
                            } catch (e) {
                              toast.error(errorMessage(e));
                            }
                          },
                        },
                        canManage(m) && can('members.remove') && { label: 'Remove from workspace', icon: UserMinus, danger: true, onClick: () => setRemoving(m) },
                      ]}
                    />
                  ) : (
                    <span className="w-8" />
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : (
        <Card padded={false}>
          {!invites ? (
            <div className="p-5">
              <SkeletonRows rows={3} />
            </div>
          ) : invites.length === 0 ? (
            <EmptyState icon={Mail} title="No pending invitations" text="Invitations expire after 7 days." action={<Button icon={UserPlus} onClick={() => setInviting(true)}>Invite people</Button>} />
          ) : (
            <ul className="divide-y divide-ui-border">
              {invites.map((i) => (
                <li key={i.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ui-sunken text-ui-subtle">
                    <Mail size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ui-text">{i.email}</p>
                    <p className="text-xs text-ui-subtle">
                      Invited by {i.invitedBy} · expires {formatDistanceToNow(new Date(i.expiresAt), { addSuffix: true })}
                    </p>
                  </div>
                  <Badge className="capitalize">{i.role}</Badge>
                  <IconButton
                    icon={X}
                    label={`Revoke invitation for ${i.email}`}
                    onClick={async () => {
                      await wsApi.revokeInvitation(params.wsId, i.id).catch((e) => toast.error(errorMessage(e)));
                      toast.success('Invitation revoked');
                      loadInvites();
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <Card>
        <h2 className="text-sm font-semibold text-ui-text">Roles</h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          {(Object.keys(ROLE_INFO) as Role[]).map((r) => (
            <div key={r} className="flex gap-3">
              <Badge tone={ROLE_TONE[r]} className="h-5 capitalize">
                {r}
              </Badge>
              <dd className="text-sm text-ui-muted">{ROLE_INFO[r]}</dd>
            </div>
          ))}
        </dl>
      </Card>

      {data && (
        <InviteModal
          open={inviting}
          onClose={() => setInviting(false)}
          wsId={params.wsId}
          roles={data.assignableRoles}
          onDone={() => {
            loadInvites();
            setTab('invitations');
          }}
        />
      )}
      <Confirm
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        title={`Remove ${removing?.username}?`}
        text="They’ll lose access to every channel and task in this workspace."
        confirmLabel="Remove"
        danger
        onConfirm={async () => {
          const m = removing!;
          setRemoving(null);
          try {
            await wsApi.removeMember(params.wsId, m.id);
            toast.success(`${m.username} was removed`);
            loadMembers();
          } catch (e) {
            toast.error(errorMessage(e));
          }
        }}
      />
      <Confirm
        open={leaving}
        onClose={() => setLeaving(false)}
        title="Leave this workspace?"
        text="You’ll lose access to its channels and tasks until someone invites you again."
        confirmLabel="Leave workspace"
        danger
        onConfirm={async () => {
          setLeaving(false);
          try {
            await wsApi.removeMember(params.wsId, user!._id);
            await refresh();
            router.push('/home');
          } catch (e) {
            toast.error(errorMessage(e));
          }
        }}
      />
    </PageBody>
  );
}

function InviteModal({ open, onClose, wsId, roles, onDone }: { open: boolean; onClose: () => void; wsId: string; roles: Role[]; onDone: () => void }) {
  const [emails, setEmails] = useState('');
  const [role, setRole] = useState<Role>('member');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<Invitation[] | null>(null);
  const [limit, setLimit] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setSent(null);
      setEmails('');
      setLimit(null);
    }
  }, [open]);
  const list = emails.split(/[\s,;]+/).map((e) => e.trim()).filter(Boolean);
  const submit = async () => {
    setBusy(true);
    setLimit(null);
    try {
      setSent(await wsApi.invite(wsId, list, role));
      onDone();
    } catch (e) {
      if ((e as { response?: { status?: number } }).response?.status === 402) setLimit(errorMessage(e));
      else toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={sent ? 'Invitations sent' : 'Invite people'}
      description={sent ? 'Each person gets an email. You can also share their personal link directly.' : 'They’ll get an email with a link that works for 7 days.'}
      footer={
        sent ? (
          <Button onClick={onClose}>Done</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={submit} loading={busy} disabled={!list.length}>
              Send {list.length > 1 ? `${list.length} invitations` : 'invitation'}
            </Button>
          </>
        )
      }
    >
      {sent ? (
        <ul className="space-y-2">
          {sent.map((i) => (
            <li key={i.id} className="rounded-lg border border-ui-border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-ui-text">{i.email}</span>
                <Badge tone={i.emailed ? 'success' : 'warning'}>{i.emailed ? 'Emailed' : 'Email failed, share the link'}</Badge>
              </div>
              <div className="mt-2 flex gap-2">
                <Input readOnly value={i.link} className="h-8 text-xs" aria-label={`Invite link for ${i.email}`} />
                <IconButton
                  icon={Copy}
                  label="Copy link"
                  onClick={() => {
                    navigator.clipboard?.writeText(i.link!);
                    toast.success('Link copied');
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="space-y-4">
          <Field label="Email addresses" hint="Separate multiple addresses with commas or new lines." htmlFor="inv-emails">
            <Textarea id="inv-emails" rows={3} value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="ana@company.com, ben@company.com" />
          </Field>
          <Field label="Role" htmlFor="inv-role" hint={ROLE_INFO[role]}>
            <Select id="inv-role" value={role} onChange={(e) => setRole(e.target.value as Role)} className="capitalize">
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </Field>
          {limit && (
            <p role="alert" className="rounded-lg border border-ui-warning/40 bg-ui-warning/10 p-3 text-sm text-ui-text">
              {limit}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
