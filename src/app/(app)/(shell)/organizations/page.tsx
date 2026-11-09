'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Building2, Pencil, Plus } from 'lucide-react';
import { useWorkspaces } from '@/context/WorkspaceContext';
import { PageBody } from '@/components/app/AppShell';
import CreateWorkspaceModal from '@/components/app/CreateWorkspaceModal';
import { Avatar, Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, SkeletonRows } from '@/components/app/ui';
import { organizations as orgApi, errorMessage } from '@/lib/saas';

type Org = Awaited<ReturnType<typeof orgApi.list>>[number];

export default function OrganizationsPage() {
  const { workspaces, refresh } = useWorkspaces();
  const [orgs, setOrgs] = useState<Org[] | null>(null);
  const [creatingIn, setCreatingIn] = useState<string | undefined | null>(null);
  const [renaming, setRenaming] = useState<Org | null>(null);
  const [name, setName] = useState('');
  const load = useCallback(() => orgApi.list().then(setOrgs).catch(() => setOrgs([])), []);
  useEffect(() => {
    load();
  }, [load, workspaces.length]);

  return (
    <PageBody>
      <PageHeader
        icon={Building2}
        title="Organizations"
        description="An organization holds one or more workspaces and is billed to its owner."
        actions={
          <Button icon={Plus} onClick={() => setCreatingIn(undefined)}>
            New organization
          </Button>
        }
      />
      {!orgs ? (
        <Card>
          <SkeletonRows rows={3} />
        </Card>
      ) : orgs.length === 0 ? (
        <Card>
          <EmptyState icon={Building2} title="No organizations yet" text="Creating your first workspace also creates its organization." action={<Button icon={Plus} onClick={() => setCreatingIn(undefined)}>Create a workspace</Button>} />
        </Card>
      ) : (
        orgs.map((o) => {
          const wsInOrg = workspaces.filter((w) => w.organizationId === o.id);
          return (
            <Card key={o.id} padded={false}>
              <div className="flex flex-col gap-3 border-b border-ui-border px-5 py-4 sm:flex-row sm:items-center">
                <Avatar name={o.name} square size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-base font-semibold text-ui-text">{o.name}</h2>
                    {o.isOwner ? <Badge tone="accent">Owner</Badge> : <Badge>Member</Badge>}
                  </div>
                  <p className="text-xs text-ui-subtle">
                    {o.workspaceCount} workspace{o.workspaceCount === 1 ? '' : 's'} · since {format(new Date(o.createdAt), 'MMMM yyyy')}
                  </p>
                </div>
                {o.isOwner && (
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={Pencil}
                      onClick={() => {
                        setRenaming(o);
                        setName(o.name);
                      }}
                    >
                      Rename
                    </Button>
                    <Button size="sm" icon={Plus} onClick={() => setCreatingIn(o.id)}>
                      Add workspace
                    </Button>
                  </div>
                )}
              </div>
              <ul className="divide-y divide-ui-border">
                {wsInOrg.length === 0 ? (
                  <li className="px-5 py-4 text-sm text-ui-subtle">You aren’t a member of any workspace in this organization.</li>
                ) : (
                  wsInOrg.map((w) => (
                    <li key={w.id}>
                      <Link href={`/w/${w.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-ui-sunken/60">
                        <Avatar name={w.name} square size={32} />
                        <span className="flex-1 text-sm font-medium text-ui-text">{w.name}</span>
                        <span className="text-xs text-ui-subtle">{w.memberCount} members</span>
                        <Badge className="capitalize">{w.myRole}</Badge>
                      </Link>
                    </li>
                  ))
                )}
              </ul>
            </Card>
          );
        })
      )}
      <CreateWorkspaceModal open={creatingIn !== null} onClose={() => setCreatingIn(null)} organizationId={creatingIn ?? undefined} />
      <Modal
        open={Boolean(renaming)}
        onClose={() => setRenaming(null)}
        title="Rename organization"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRenaming(null)}>
              Cancel
            </Button>
            <Button
              disabled={!name.trim()}
              onClick={async () => {
                try {
                  await orgApi.update(renaming!.id, { name: name.trim() });
                  toast.success('Renamed');
                  setRenaming(null);
                  load();
                  refresh();
                } catch (e) {
                  toast.error(errorMessage(e));
                }
              }}
            >
              Save
            </Button>
          </>
        }
      >
        <Field label="Name" htmlFor="org-name">
          <Input id="org-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
        </Field>
      </Modal>
    </PageBody>
  );
}
