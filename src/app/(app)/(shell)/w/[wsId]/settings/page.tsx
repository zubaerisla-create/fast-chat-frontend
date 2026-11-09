'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { Settings, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';
import { useWorkspaces } from '@/context/WorkspaceContext';
import { PageBody } from '@/components/app/AppShell';
import { useWorkspaceDetails } from '@/components/app/useWorkspaceDetails';
import { Button, Card, ErrorState, Field, Input, Modal, PageHeader, Select, Skeleton, SkeletonRows, Textarea } from '@/components/app/ui';
import { workspaces as wsApi, errorMessage, type Role } from '@/lib/saas';

export default function WorkspaceSettings({ params }: { params: { wsId: string } }) {
  const { data, error, reload, can } = useWorkspaceDetails(params.wsId);
  const { refresh } = useWorkspaces();
  const router = useRouter();
  const [form, setForm] = useState({ name: '', description: '' });
  const [perm, setPerm] = useState<{ minInviteRole: Role; minChannelCreateRole: Role }>({ minInviteRole: 'manager', minChannelCreateRole: 'member' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [activity, setActivity] = useState<Awaited<ReturnType<typeof wsApi.activity>> | null>(null);

  useEffect(() => {
    if (!data) return;
    setForm({ name: data.workspace.name, description: data.workspace.description || '' });
    setPerm({ minInviteRole: data.workspace.settings.minInviteRole || 'manager', minChannelCreateRole: data.workspace.settings.minChannelCreateRole || 'member' });
    if (data.permissions['audit.view']) wsApi.activity(params.wsId).then(setActivity).catch(() => setActivity([]));
  }, [data, params.wsId]);

  if (error) return <PageBody><ErrorState text="This workspace couldn’t be loaded." onRetry={reload} /></PageBody>;
  const editable = can('workspace.update');

  const save = async () => {
    setSaving(true);
    try {
      await wsApi.update(params.wsId, { name: form.name, description: form.description || null, settings: perm });
      toast.success('Settings saved');
      reload();
      refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageBody>
      <PageHeader icon={Settings} title="Workspace settings" description={data ? data.workspace.name : 'Loading…'} />

      <Card>
        <h2 className="text-sm font-semibold text-ui-text">General</h2>
        {!data ? (
          <Skeleton className="mt-4 h-24" />
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Workspace name" htmlFor="s-name">
              <Input id="s-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={!editable} maxLength={80} />
            </Field>
            <Field label="URL" htmlFor="s-slug" hint="Generated from the original name.">
              <Input id="s-slug" value={`fastchat/${data.workspace.slug}`} readOnly disabled />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Description" htmlFor="s-desc">
                <Textarea id="s-desc" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} disabled={!editable} maxLength={500} />
              </Field>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-ui-subtle" />
          <h2 className="text-sm font-semibold text-ui-text">Permissions</h2>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Who can invite people" htmlFor="s-inv">
            <Select id="s-inv" value={perm.minInviteRole} onChange={(e) => setPerm({ ...perm, minInviteRole: e.target.value as Role })} disabled={!editable}>
              <option value="member">Members and above</option>
              <option value="manager">Managers and above</option>
              <option value="admin">Admins and owner only</option>
            </Select>
          </Field>
          <Field label="Who can create channels" htmlFor="s-ch">
            <Select id="s-ch" value={perm.minChannelCreateRole} onChange={(e) => setPerm({ ...perm, minChannelCreateRole: e.target.value as Role })} disabled={!editable}>
              <option value="member">Members and above</option>
              <option value="manager">Managers and above</option>
              <option value="admin">Admins and owner only</option>
            </Select>
          </Field>
        </div>
        <p className="mt-3 text-xs text-ui-subtle">Guests can never invite people or create channels.</p>
        {editable && (
          <div className="mt-5 flex justify-end">
            <Button onClick={save} loading={saving}>
              Save changes
            </Button>
          </div>
        )}
      </Card>

      {data && (
        <Card>
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-ui-subtle" />
            <h2 className="text-sm font-semibold text-ui-text">Plan limits</h2>
          </div>
          <p className="mt-2 text-sm text-ui-muted">
            Limits follow the plan of this workspace’s organization owner (<b className="text-ui-text">{data.plan.id === 'free' ? 'no paid plan' : data.plan.name}</b>).
          </p>
          <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
            {[
              ['Members', data.plan.limits.membersPerWorkspace ?? 'Unlimited'],
              ['Channels', data.plan.limits.channelsPerWorkspace ?? 'Unlimited'],
              ['Group calls', data.plan.limits.groupCalls ? 'Included' : 'Not included'],
            ].map(([k, v]) => (
              <div key={k as string} className="rounded-lg bg-ui-sunken px-3 py-3">
                <dt className="text-xs text-ui-subtle">{k}</dt>
                <dd className="mt-1 text-sm font-semibold text-ui-text">{v}</dd>
              </div>
            ))}
          </dl>
          <Link href="/billing" className="mt-4 inline-block text-sm font-medium text-ui-accent-text hover:underline">
            View plans
          </Link>
        </Card>
      )}

      {can('audit.view') && (
        <Card padded={false}>
          <h2 className="border-b border-ui-border px-5 py-3.5 text-sm font-semibold text-ui-text">Audit log</h2>
          {!activity ? (
            <div className="p-5">
              <SkeletonRows rows={4} />
            </div>
          ) : activity.length === 0 ? (
            <p className="px-5 py-6 text-sm text-ui-subtle">No events yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="text-xs text-ui-subtle">
                  <tr>
                    <th className="px-5 py-2 font-medium">When</th>
                    <th className="px-5 py-2 font-medium">Who</th>
                    <th className="px-5 py-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ui-border">
                  {activity.map((e) => (
                    <tr key={e.id}>
                      <td className="whitespace-nowrap px-5 py-2.5 text-ui-subtle">{formatDistanceToNow(new Date(e.createdAt), { addSuffix: true })}</td>
                      <td className="px-5 py-2.5 text-ui-text">{e.actor ?? '—'}</td>
                      <td className="px-5 py-2.5 font-mono text-xs text-ui-muted">{e.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {can('workspace.delete') && (
        <Card className="border-ui-danger/30">
          <h2 className="text-sm font-semibold text-ui-danger">Danger zone</h2>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            <p className="flex-1 text-sm text-ui-muted">Delete this workspace, its channels, messages and tasks. This can’t be undone.</p>
            <Button variant="danger" icon={Trash2} onClick={() => setDeleting(true)}>
              Delete workspace
            </Button>
          </div>
        </Card>
      )}

      <Modal
        open={deleting}
        onClose={() => setDeleting(false)}
        title="Delete workspace"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={confirmName !== data?.workspace.name}
              onClick={async () => {
                try {
                  await wsApi.remove(params.wsId, confirmName);
                  toast.success('Workspace deleted');
                  await refresh();
                  router.push('/home');
                } catch (e) {
                  toast.error(errorMessage(e));
                }
              }}
            >
              Delete forever
            </Button>
          </>
        }
      >
        <Field label={`Type “${data?.workspace.name}” to confirm`} htmlFor="del-confirm">
          <Input id="del-confirm" value={confirmName} onChange={(e) => setConfirmName(e.target.value)} />
        </Field>
      </Modal>
    </PageBody>
  );
}
