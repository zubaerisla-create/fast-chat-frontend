'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { Calendar, CheckSquare, Columns3, List, MessageSquare, Plus, Trash2, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { useWorkspaces } from '@/context/WorkspaceContext';
import { PageBody } from '@/components/app/AppShell';
import { Avatar, Badge, Button, Card, EmptyState, Field, IconButton, Input, Modal, PageHeader, Select, Skeleton, Textarea, cx } from '@/components/app/ui';
import { tasks as tasksApi, workspaces as wsApi, errorMessage, type PublicUser, type Task, type TaskPriority, type TaskStatus, type TaskSummary } from '@/lib/saas';

const COLUMNS: { status: TaskStatus; label: string; dot: string }[] = [
  { status: 'todo', label: 'To do', dot: 'bg-ui-subtle' },
  { status: 'in_progress', label: 'In progress', dot: 'bg-sky-500' },
  { status: 'review', label: 'Review', dot: 'bg-ui-warning' },
  { status: 'completed', label: 'Completed', dot: 'bg-ui-success' },
];
const PRIORITY_TONE = { urgent: 'danger', high: 'warning', medium: 'accent', low: 'neutral' } as const;

export default function TasksPage() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { workspaces } = useWorkspaces();
  const [scope, setScope] = useState<string>('mine'); // 'mine' or a workspace id
  const [view, setView] = useState<'board' | 'list'>('board');
  const [data, setData] = useState<{ tasks: Task[]; summary: TaskSummary } | null>(null);
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('workspace')) setScope(p.get('workspace')!);
    if (p.get('task')) setOpenId(p.get('task'));
  }, []);

  const load = useCallback(() => {
    tasksApi
      .list(scope === 'mine' ? { scope: 'mine' } : { scope: 'workspace', workspaceId: scope })
      .then(setData)
      .catch(() => setData({ tasks: [], summary: { todo: 0, in_progress: 0, review: 0, completed: 0, overdue: 0 } }));
  }, [scope]);
  useEffect(() => {
    setData(null);
    load();
  }, [load]);
  useEffect(() => {
    if (!socket) return;
    socket.on('taskUpdated', load);
    socket.on('taskDeleted', load);
    return () => {
      socket.off('taskUpdated', load);
      socket.off('taskDeleted', load);
    };
  }, [socket, load]);

  const move = async (task: Task, status: TaskStatus) => {
    if (task.status === status) return;
    setData((d) => d && { ...d, tasks: d.tasks.map((t) => (t.id === task.id ? { ...t, status } : t)) });
    try {
      await tasksApi.update(task.id, { status });
      load();
    } catch (e) {
      toast.error(errorMessage(e));
      load();
    }
  };

  const byStatus = useMemo(() => Object.fromEntries(COLUMNS.map((c) => [c.status, (data?.tasks ?? []).filter((t) => t.status === c.status)])) as Record<TaskStatus, Task[]>, [data]);

  return (
    <PageBody wide>
      <PageHeader
        icon={CheckSquare}
        title="Tasks"
        description={data ? `${data.summary.todo + data.summary.in_progress + data.summary.review} open${data.summary.overdue ? ` · ${data.summary.overdue} overdue` : ''} · ${data.summary.completed} completed` : 'Loading…'}
        actions={
          <Button icon={Plus} onClick={() => setCreating(true)}>
            New task
          </Button>
        }
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:w-80">
        <Select value={scope} onChange={(e) => setScope(e.target.value)} aria-label="Show tasks for">
          <option value="mine">My tasks (assigned or created by me)</option>
          {workspaces.map((w) => (
            <option key={w.id} value={w.id}>
              All tasks in {w.name}
            </option>
          ))}
        </Select>
        </div>
        <div className="inline-flex rounded-lg border border-ui-border bg-ui-panel p-0.5" role="radiogroup" aria-label="View">
          {(['board', 'list'] as const).map((v) => (
            <button key={v} type="button" role="radio" aria-checked={view === v} onClick={() => setView(v)} className={cx('flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium', view === v ? 'bg-ui-sunken text-ui-text' : 'text-ui-muted hover:text-ui-text')}>
              {v === 'board' ? <Columns3 size={14} /> : <List size={14} />} {v === 'board' ? 'Board' : 'List'}
            </button>
          ))}
        </div>
      </div>

      {!data ? (
        <div className="grid gap-4 md:grid-cols-4">
          {COLUMNS.map((c) => (
            <Skeleton key={c.status} className="h-64 !rounded-xl" />
          ))}
        </div>
      ) : data.tasks.length === 0 ? (
        <Card>
          <EmptyState icon={CheckSquare} title="No tasks yet" text="Create a task, or turn any message into a task from its menu." action={<Button icon={Plus} onClick={() => setCreating(true)}>New task</Button>} />
        </Card>
      ) : view === 'board' ? (
        <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 xl:grid-cols-4">
          {COLUMNS.map((col) => (
            <section
              key={col.status}
              aria-label={col.label}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                const t = data.tasks.find((x) => x.id === dragging);
                if (t) move(t, col.status);
                setDragging(null);
              }}
              className={cx('flex w-[280px] flex-shrink-0 flex-col rounded-xl border border-ui-border bg-ui-sunken/60 sm:w-auto', dragging && 'ring-1 ring-ui-accent/20')}
            >
              <header className="flex items-center gap-2 px-3.5 py-3">
                <span className={cx('h-2 w-2 rounded-full', col.dot)} />
                <h2 className="text-[13px] font-semibold text-ui-text">{col.label}</h2>
                <span className="text-xs tabular-nums text-ui-subtle">{byStatus[col.status].length}</span>
              </header>
              <div className="min-h-[120px] flex-1 space-y-2 px-2.5 pb-3">
                {byStatus[col.status].map((t) => (
                  <article
                    key={t.id}
                    draggable
                    onDragStart={() => setDragging(t.id)}
                    onDragEnd={() => setDragging(null)}
                    onClick={() => setOpenId(t.id)}
                    className={cx('cursor-pointer rounded-lg border border-ui-border bg-ui-panel p-3 shadow-sm transition-all hover:border-ui-accent/40 hover:shadow', dragging === t.id && 'opacity-50')}
                  >
                    <p className={cx('text-sm font-medium text-ui-text', t.status === 'completed' && 'text-ui-muted line-through')}>{t.title}</p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <Badge tone={PRIORITY_TONE[t.priority]} className="capitalize">
                        {t.priority}
                      </Badge>
                      {t.dueAt && (
                        <Badge tone={t.overdue ? 'danger' : 'neutral'}>
                          <Calendar size={10} /> {format(new Date(t.dueAt), 'MMM d')}
                        </Badge>
                      )}
                      {t.commentCount > 0 && (
                        <span className="flex items-center gap-0.5 text-[11px] text-ui-subtle">
                          <MessageSquare size={11} /> {t.commentCount}
                        </span>
                      )}
                      <span className="ml-auto">{t.assignee ? <Avatar name={t.assignee.username} src={t.assignee.avatar} size={22} /> : <span className="text-[11px] text-ui-subtle">Unassigned</span>}</span>
                    </div>
                    {t.workspaceName && scope === 'mine' && <p className="mt-2 truncate text-[11px] text-ui-subtle">{t.workspaceName}</p>}
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <Card padded={false}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-ui-border text-xs text-ui-subtle">
                <tr>
                  <th className="px-5 py-2.5 font-medium">Task</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium">Priority</th>
                  <th className="px-3 py-2.5 font-medium">Due</th>
                  <th className="px-3 py-2.5 font-medium">Assignee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ui-border">
                {data.tasks.map((t) => (
                  <tr key={t.id} onClick={() => setOpenId(t.id)} className="cursor-pointer hover:bg-ui-sunken/60">
                    <td className="px-5 py-3">
                      <span className={cx('font-medium text-ui-text', t.status === 'completed' && 'text-ui-muted line-through')}>{t.title}</span>
                      {t.workspaceName && <span className="block text-xs text-ui-subtle">{t.workspaceName}</span>}
                    </td>
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <Select value={t.status} onChange={(e) => move(t, e.target.value as TaskStatus)} className="h-8 w-36 text-[13px]" aria-label="Status">
                        {COLUMNS.map((c) => (
                          <option key={c.status} value={c.status}>
                            {c.label}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-3 py-3">
                      <Badge tone={PRIORITY_TONE[t.priority]} className="capitalize">
                        {t.priority}
                      </Badge>
                    </td>
                    <td className={cx('px-3 py-3', t.overdue ? 'font-medium text-ui-danger' : 'text-ui-muted')}>{t.dueAt ? format(new Date(t.dueAt), 'MMM d, yyyy') : '—'}</td>
                    <td className="px-3 py-3">
                      {t.assignee ? (
                        <span className="flex items-center gap-2">
                          <Avatar name={t.assignee.username} src={t.assignee.avatar} size={22} /> {t.assignee.username}
                        </span>
                      ) : (
                        <span className="text-ui-subtle">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <CreateTask open={creating} onClose={() => setCreating(false)} defaultWorkspace={scope === 'mine' ? '' : scope} onCreated={load} meId={user!._id} />
      <TaskDrawer id={openId} onClose={() => setOpenId(null)} onChanged={load} />
    </PageBody>
  );
}

function useAssignees(workspaceId: string) {
  const [list, setList] = useState<PublicUser[]>([]);
  useEffect(() => {
    if (!workspaceId) return setList([]);
    wsApi.members(workspaceId).then((r) => setList(r.members)).catch(() => setList([]));
  }, [workspaceId]);
  return list;
}

function CreateTask({ open, onClose, defaultWorkspace, onCreated, meId }: { open: boolean; onClose: () => void; defaultWorkspace: string; onCreated: () => void; meId: string }) {
  const { workspaces } = useWorkspaces();
  const [f, setF] = useState({ title: '', description: '', workspaceId: '', assigneeId: '', priority: 'medium' as TaskPriority, dueAt: '' });
  const [busy, setBusy] = useState(false);
  const assignees = useAssignees(f.workspaceId);
  useEffect(() => {
    if (open) setF({ title: '', description: '', workspaceId: defaultWorkspace, assigneeId: '', priority: 'medium', dueAt: '' });
  }, [open, defaultWorkspace]);
  const submit = async () => {
    setBusy(true);
    try {
      await tasksApi.create({
        title: f.title.trim(),
        description: f.description || null,
        workspaceId: f.workspaceId || null,
        assigneeId: f.assigneeId || null,
        priority: f.priority,
        dueAt: f.dueAt ? new Date(f.dueAt).toISOString() : null,
      });
      toast.success('Task created');
      onCreated();
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New task"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={busy} disabled={!f.title.trim()}>
            Create task
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Title" htmlFor="nt-title">
          <Input id="nt-title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={200} placeholder="What needs to be done?" />
        </Field>
        <Field label="Description" htmlFor="nt-desc">
          <Textarea id="nt-desc" rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} maxLength={5000} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Workspace" htmlFor="nt-ws">
            <Select id="nt-ws" value={f.workspaceId} onChange={(e) => setF({ ...f, workspaceId: e.target.value, assigneeId: '' })}>
              <option value="">Personal (only you and the assignee)</option>
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Assignee" htmlFor="nt-as">
            <Select id="nt-as" value={f.assigneeId} onChange={(e) => setF({ ...f, assigneeId: e.target.value })}>
              <option value="">Unassigned</option>
              <option value={meId}>Me</option>
              {assignees.filter((a) => a._id !== meId).map((a) => (
                <option key={a._id} value={a._id}>
                  {a.username}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Priority" htmlFor="nt-pr">
            <Select id="nt-pr" value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value as TaskPriority })}>
              {(['low', 'medium', 'high', 'urgent'] as const).map((p) => (
                <option key={p} value={p}>
                  {p[0].toUpperCase() + p.slice(1)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Due date" htmlFor="nt-due">
            <Input id="nt-due" type="date" value={f.dueAt} onChange={(e) => setF({ ...f, dueAt: e.target.value })} />
          </Field>
        </div>
      </div>
    </Modal>
  );
}

function TaskDrawer({ id, onClose, onChanged }: { id: string | null; onClose: () => void; onChanged: () => void }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof tasksApi.get>> | null>(null);
  const [comment, setComment] = useState('');
  const assignees = useAssignees(data?.task.workspaceId || '');
  const load = useCallback(() => {
    if (id) tasksApi.get(id).then(setData).catch(() => {
      toast.error('Task not found');
      onClose();
    });
  }, [id, onClose]);
  useEffect(() => {
    setData(null);
    load();
  }, [load]);
  if (!id) return null;
  const t = data?.task;
  const update = async (body: Parameters<typeof tasksApi.update>[1]) => {
    try {
      await tasksApi.update(id, body);
      load();
      onChanged();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };
  return (
    <div className="app-root fixed inset-0 z-[70] flex justify-end bg-black/30" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="animate-slide-in flex h-full w-full max-w-md flex-col border-l border-ui-border bg-ui-panel shadow-2xl" role="dialog" aria-label="Task details">
        <div className="flex h-14 items-center justify-between border-b border-ui-border px-5">
          <span className="text-xs font-medium uppercase tracking-wider text-ui-subtle">Task</span>
          <div className="flex gap-1">
            <IconButton
              icon={Trash2}
              label="Delete task"
              onClick={async () => {
                try {
                  await tasksApi.remove(id);
                  toast.success('Task deleted');
                  onChanged();
                  onClose();
                } catch (e) {
                  toast.error(errorMessage(e));
                }
              }}
            />
            <IconButton icon={X} label="Close" onClick={onClose} />
          </div>
        </div>
        {!t ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-20" />
          </div>
        ) : (
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            <Input defaultValue={t.title} key={t.id + t.updatedAt} onBlur={(e) => e.target.value.trim() && e.target.value !== t.title && update({ title: e.target.value.trim() })} className="h-auto border-transparent px-0 text-lg font-semibold hover:border-ui-border focus:px-2" aria-label="Title" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Status" htmlFor="td-status">
                <Select id="td-status" value={t.status} onChange={(e) => update({ status: e.target.value as TaskStatus })}>
                  {COLUMNS.map((c) => (
                    <option key={c.status} value={c.status}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Priority" htmlFor="td-pr">
                <Select id="td-pr" value={t.priority} onChange={(e) => update({ priority: e.target.value as TaskPriority })}>
                  {(['low', 'medium', 'high', 'urgent'] as const).map((p) => (
                    <option key={p} value={p}>
                      {p[0].toUpperCase() + p.slice(1)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Assignee" htmlFor="td-as">
                <Select id="td-as" value={t.assignee?.id || ''} onChange={(e) => update({ assigneeId: e.target.value || null })}>
                  <option value="">Unassigned</option>
                  {t.assignee && !assignees.some((a) => a._id === t.assignee!.id) && <option value={t.assignee.id}>{t.assignee.username}</option>}
                  {assignees.map((a) => (
                    <option key={a._id} value={a._id}>
                      {a.username}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Due date" htmlFor="td-due">
                <Input id="td-due" type="date" value={t.dueAt ? t.dueAt.slice(0, 10) : ''} onChange={(e) => update({ dueAt: e.target.value ? new Date(e.target.value).toISOString() : null })} />
              </Field>
            </div>
            <Field label="Description" htmlFor="td-desc">
              <Textarea id="td-desc" rows={4} defaultValue={t.description || ''} key={`d${t.id}${t.updatedAt}`} onBlur={(e) => e.target.value !== (t.description || '') && update({ description: e.target.value || null })} placeholder="Add details…" />
            </Field>
            <div className="space-y-1 text-xs text-ui-subtle">
              <p>
                Created by {t.creator?.username ?? 'someone'} {formatDistanceToNow(new Date(t.createdAt), { addSuffix: true })}
                {t.workspaceName ? ` in ${t.workspaceName}` : ' · personal'}
              </p>
              {t.conversationId && (
                <p>
                  From a message in{' '}
                  <Link href={t.workspaceId ? `/w/${t.workspaceId}/c/${t.conversationId}` : `/messages/${t.conversationId}`} className="font-medium text-ui-accent-text hover:underline">
                    {t.conversationTitle ? `#${t.conversationTitle}` : 'a conversation'}
                  </Link>
                </p>
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ui-text">Comments</h3>
              <ul className="mt-3 space-y-3">
                {data!.comments.map((c) => (
                  <li key={c.id} className="flex gap-2.5">
                    <Avatar name={c.author?.username || '?'} src={c.author?.avatar} size={26} />
                    <div className="flex-1 rounded-lg bg-ui-sunken px-3 py-2">
                      <p className="text-xs">
                        <b className="text-ui-text">{c.author?.username}</b> <span className="text-ui-subtle">{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</span>
                      </p>
                      <p className="mt-0.5 whitespace-pre-wrap text-sm text-ui-text">{c.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <form
                className="mt-3 flex gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!comment.trim()) return;
                  try {
                    await tasksApi.comment(id, comment.trim());
                    setComment('');
                    load();
                    onChanged();
                  } catch (err) {
                    toast.error(errorMessage(err));
                  }
                }}
              >
                <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Write a comment" aria-label="Comment" />
                <Button type="submit" disabled={!comment.trim()}>
                  Send
                </Button>
              </form>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
