'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useWorkspaces } from '@/context/WorkspaceContext';
import { errorMessage, workspaces as wsApi } from '@/lib/saas';
import { Button, Field, Input, Modal, Textarea } from './ui';

export default function CreateWorkspaceModal({ open, onClose, organizationId }: { open: boolean; onClose: () => void; organizationId?: string }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [limit, setLimit] = useState<string | null>(null);
  const { refresh, setCurrentId } = useWorkspaces();
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setLimit(null);
    try {
      const ws = await wsApi.create({ name: name.trim(), description: description.trim() || undefined, organizationId });
      await refresh();
      setCurrentId(ws.id);
      toast.success(`${ws.name} is ready`);
      onClose();
      setName('');
      setDescription('');
      router.push(`/w/${ws.id}`);
    } catch (err) {
      const res = (err as { response?: { status?: number } }).response;
      if (res?.status === 402) setLimit(errorMessage(err));
      else toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create a workspace"
      description="A shared home for your team’s channels, members and tasks."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="create-ws" loading={busy} disabled={name.trim().length < 2}>
            Create workspace
          </Button>
        </>
      }
    >
      <form id="create-ws" onSubmit={submit} className="space-y-4">
        <Field label="Workspace name" htmlFor="ws-name">
          <Input id="ws-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Hosen Soft" maxLength={80} required />
        </Field>
        <Field label="Description" hint="Optional" htmlFor="ws-desc">
          <Textarea id="ws-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={500} placeholder="What does this team work on?" />
        </Field>
        <p className="text-xs text-ui-subtle">We’ll create #general and #announcements for you.</p>
        {limit && (
          <div role="alert" className="rounded-lg border border-ui-warning/40 bg-ui-warning/10 p-3 text-sm text-ui-text">
            {limit}{' '}
            <Link href="/billing" className="font-medium text-ui-accent-text underline-offset-2 hover:underline">
              See plans
            </Link>
          </div>
        )}
      </form>
    </Modal>
  );
}
