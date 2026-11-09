'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Hash, Pin, Search, Users } from 'lucide-react';
import { conversations as convApi, messages as msgApi, errorMessage, type ChatMessage, type Conversation, type PublicUser, type TaskPriority } from '@/lib/saas';
import { useAuth } from '@/context/AuthContext';
import { Avatar, Button, EmptyState, Field, Input, Modal, Select, SkeletonRows, cx } from '../ui';
import { senderOf } from './MessageItem';

export const conversationTitle = (c: Conversation, meId: string) => {
  if (c.type === 'direct') return c.participants.find((p) => p._id !== meId)?.username ?? 'Direct message';
  if (c.type === 'channel') return `#${c.title}`;
  return c.title ?? 'Group';
};

export function ForwardDialog({ message, onClose }: { message: ChatMessage | null; onClose: () => void }) {
  const { user } = useAuth();
  const [list, setList] = useState<Conversation[] | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!message) return;
    setPicked([]);
    Promise.all([convApi.list(), convApi.list('channel')]).then(([a, b]) => setList([...a, ...b])).catch(() => setList([]));
  }, [message]);
  const visible = (list ?? []).filter((c) => conversationTitle(c, user!._id).toLowerCase().includes(q.toLowerCase()));
  const send = async () => {
    if (!message) return;
    setBusy(true);
    try {
      await msgApi.forward(message._id, picked);
      toast.success(`Forwarded to ${picked.length} conversation${picked.length > 1 ? 's' : ''}`);
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open={Boolean(message)}
      onClose={onClose}
      title="Forward message"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={send} disabled={!picked.length} loading={busy}>
            Forward{picked.length ? ` (${picked.length})` : ''}
          </Button>
        </>
      }
    >
      <Input placeholder="Search conversations" value={q} onChange={(e) => setQ(e.target.value)} className="mb-3" aria-label="Search conversations" />
      {!list ? (
        <SkeletonRows />
      ) : (
        <ul className="max-h-72 space-y-0.5 overflow-y-auto">
          {visible.map((c) => {
            const title = conversationTitle(c, user!._id);
            const on = picked.includes(c.id);
            return (
              <li key={c.id}>
                <label className={cx('flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5', on ? 'bg-ui-accent-soft' : 'hover:bg-ui-sunken')}>
                  <input type="checkbox" checked={on} onChange={() => setPicked((p) => (on ? p.filter((x) => x !== c.id) : [...p, c.id]))} className="accent-[rgb(var(--ui-accent))]" />
                  {c.type === 'channel' ? (
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ui-sunken text-ui-muted">
                      <Hash size={14} />
                    </span>
                  ) : (
                    <Avatar name={title} size={28} />
                  )}
                  <span className="truncate text-sm text-ui-text">{title}</span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}

export function PinsDialog({ conversationId, open, onClose, onJump }: { conversationId: string; open: boolean; onClose: () => void; onJump: (id: string) => void }) {
  const [pins, setPins] = useState<ChatMessage[] | null>(null);
  useEffect(() => {
    if (open) msgApi.pins(conversationId).then(setPins).catch(() => setPins([]));
  }, [open, conversationId]);
  return (
    <Modal open={open} onClose={onClose} title="Pinned messages">
      {!pins ? (
        <SkeletonRows />
      ) : pins.length === 0 ? (
        <EmptyState icon={Pin} title="Nothing pinned yet" text="Pin important messages so everyone can find them quickly." />
      ) : (
        <ul className="space-y-2">
          {pins.map((m) => (
            <li key={m._id}>
              <button
                type="button"
                onClick={() => {
                  onJump(m._id);
                  onClose();
                }}
                className="w-full rounded-lg border border-ui-border p-3 text-left hover:bg-ui-sunken"
              >
                <span className="flex items-center gap-2 text-xs text-ui-subtle">
                  <b className="text-ui-text">{senderOf(m).username}</b> {format(new Date(m.createdAt), 'MMM d, HH:mm')}
                </span>
                <span className="mt-1 line-clamp-3 text-sm text-ui-text">{m.text || m.fileName || 'Attachment'}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

export function TaskFromMessageDialog({ message, members, onClose }: { message: ChatMessage | null; members: PublicUser[]; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [due, setDue] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (message) {
      setTitle((message.text || message.fileName || 'Task from message').replace(/\s+/g, ' ').slice(0, 200));
      setAssigneeId('');
      setPriority('medium');
      setDue('');
    }
  }, [message]);
  const create = async () => {
    if (!message) return;
    setBusy(true);
    try {
      await msgApi.toTask(message._id, { ...(assigneeId ? { assigneeId } : {}), priority, ...(due ? { dueAt: new Date(due).toISOString() } : {}), ...({ title } as object) });
      toast.success('Task created');
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open={Boolean(message)}
      onClose={onClose}
      title="Create task from message"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={create} loading={busy} disabled={!title.trim()}>
            Create task
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Title" htmlFor="t-title">
          <Input id="t-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Assignee" htmlFor="t-assignee">
            <Select id="t-assignee" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.username}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Priority" htmlFor="t-priority">
            <Select id="t-priority" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
              {['low', 'medium', 'high', 'urgent'].map((p) => (
                <option key={p} value={p}>
                  {p[0].toUpperCase() + p.slice(1)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Due" htmlFor="t-due">
            <Input id="t-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </Field>
        </div>
      </div>
    </Modal>
  );
}

export function ReportDialog({ message, onClose }: { message: ChatMessage | null; onClose: () => void }) {
  const [reason, setReason] = useState('spam');
  const [busy, setBusy] = useState(false);
  const send = async () => {
    if (!message) return;
    setBusy(true);
    try {
      await msgApi.report(message._id, reason);
      toast.success('Thanks. Our team will review this message.');
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open={Boolean(message)}
      onClose={onClose}
      title="Report message"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={send} loading={busy}>
            Report
          </Button>
        </>
      }
    >
      <div className="space-y-2">
        {[
          ['spam', 'Spam'],
          ['abuse', 'Abusive or hateful'],
          ['harassment', 'Harassment'],
          ['illegal', 'Illegal content'],
          ['other', 'Something else'],
        ].map(([v, l]) => (
          <label key={v} className={cx('flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm', reason === v ? 'border-ui-accent bg-ui-accent-soft' : 'border-ui-border hover:bg-ui-sunken')}>
            <input type="radio" name="reason" value={v} checked={reason === v} onChange={() => setReason(v)} className="accent-[rgb(var(--ui-accent))]" />
            {l}
          </label>
        ))}
      </div>
    </Modal>
  );
}

export function SearchDialog({ conversationId, open, onClose, onJump }: { conversationId?: string; open: boolean; onClose: () => void; onJump: (m: ChatMessage) => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<ChatMessage[] | null>(null);
  useEffect(() => {
    if (!open) return;
    if (q.trim().length < 2) return setResults(null);
    const t = setTimeout(() => msgApi.search(q.trim(), conversationId).then(setResults).catch(() => setResults([])), 250);
    return () => clearTimeout(t);
  }, [q, open, conversationId]);
  return (
    <Modal open={open} onClose={onClose} title={conversationId ? 'Search this conversation' : 'Search messages'} size="lg">
      <div className="relative mb-3">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ui-subtle" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search for words…" className="pl-9" aria-label="Search" />
      </div>
      {results === null ? (
        <p className="py-6 text-center text-sm text-ui-subtle">Type at least 2 characters.</p>
      ) : results.length === 0 ? (
        <EmptyState icon={Search} title="No messages found" text="Try different words." />
      ) : (
        <ul className="max-h-[50dvh] space-y-1 overflow-y-auto">
          {results.map((m) => (
            <li key={m._id}>
              <button
                type="button"
                onClick={() => {
                  onJump(m);
                  onClose();
                }}
                className="flex w-full gap-3 rounded-lg p-2.5 text-left hover:bg-ui-sunken"
              >
                <Avatar name={senderOf(m).username || '?'} src={senderOf(m).avatar} size={28} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-xs text-ui-subtle">
                    <b className="text-ui-text">{senderOf(m).username}</b>
                    {format(new Date(m.createdAt), 'MMM d, yyyy HH:mm')}
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-sm text-ui-text">{m.text}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

export function GroupIcon() {
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ui-accent-soft text-ui-accent-text">
      <Users size={17} />
    </span>
  );
}
