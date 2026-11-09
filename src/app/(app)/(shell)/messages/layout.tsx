'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { formatDistanceToNowStrict } from 'date-fns';
import { BellOff, MessageSquarePlus, Pin, Search, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { conversations as convApi, errorMessage, type Conversation, type PublicUser } from '@/lib/saas';
import { Avatar, Button, Count, EmptyState, Field, Input, Menu, Modal, SkeletonRows, Tabs, cx } from '@/components/app/ui';
import UserPicker from '@/components/app/UserPicker';
import { conversationTitle } from '@/components/app/chat/dialogs';

type Filter = 'all' | 'direct' | 'group' | 'unread';

function NewConversation({ mode, onClose }: { mode: 'direct' | 'group' | null; onClose: () => void }) {
  const [picked, setPicked] = useState<PublicUser[]>([]);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  useEffect(() => {
    setPicked([]);
    setTitle('');
  }, [mode]);
  const create = async () => {
    setBusy(true);
    try {
      const c = mode === 'direct' ? await convApi.direct(picked[0]._id) : await convApi.createGroup({ title: title.trim(), memberIds: picked.map((p) => p._id) });
      window.dispatchEvent(new Event('fc:conversationsChanged'));
      onClose();
      router.push(`/messages/${c.id}`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open={Boolean(mode)}
      onClose={onClose}
      title={mode === 'group' ? 'New group' : 'New message'}
      description={mode === 'group' ? 'Groups are private conversations with up to 500 people.' : 'Find someone by username or email.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={create} loading={busy} disabled={mode === 'group' ? !title.trim() || !picked.length : picked.length !== 1}>
            {mode === 'group' ? 'Create group' : 'Start conversation'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {mode === 'group' && (
          <Field label="Group name" htmlFor="grp-name">
            <Input id="grp-name" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="e.g. Weekend plans" />
          </Field>
        )}
        <UserPicker selected={picked} onChange={(u) => setPicked(mode === 'direct' ? u.slice(-1) : u)} />
      </div>
    </Modal>
  );
}

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const pathname = usePathname();
  const [list, setList] = useState<Conversation[] | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState<'direct' | 'group' | null>(null);
  const activeId = pathname.split('/')[2];

  const load = useCallback(() => convApi.list().then(setList).catch(() => setList([])), []);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('new') === '1') setCreating('direct');
  }, [pathname]);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(t);
      t = setTimeout(load, 300);
    };
    const events = ['receiveMessage', 'messagesSeen', 'conversationAdded', 'conversationRemoved', 'conversationUpdated', 'messageDeleted'];
    events.forEach((e) => socket?.on(e, refresh));
    window.addEventListener('fc:conversationsChanged', refresh);
    window.addEventListener('fc:channelsChanged', refresh);
    return () => {
      clearTimeout(t);
      events.forEach((e) => socket?.off(e, refresh));
      window.removeEventListener('fc:conversationsChanged', refresh);
      window.removeEventListener('fc:channelsChanged', refresh);
    };
  }, [socket, load]);

  const visible = (list ?? []).filter((c) => {
    if (filter === 'direct' && c.type !== 'direct') return false;
    if (filter === 'group' && c.type !== 'group') return false;
    if (filter === 'unread' && !c.unreadCount) return false;
    return !q || conversationTitle(c, user!._id).toLowerCase().includes(q.toLowerCase());
  });

  return (
    <div className="flex h-full">
      <section className={cx('flex h-full w-full flex-col border-r border-ui-border bg-ui-panel md:w-[320px] md:flex-shrink-0', activeId && 'hidden md:flex')} aria-label="Conversations">
        <div className="space-y-3 border-b border-ui-border px-4 pb-3 pt-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold tracking-tight text-ui-text">Messages</h1>
            <Menu
              trigger={(o, t) => (
                <Button size="sm" icon={MessageSquarePlus} onClick={t} aria-expanded={o}>
                  New
                </Button>
              )}
              items={[
                { label: 'New message', icon: MessageSquarePlus, onClick: () => setCreating('direct') },
                { label: 'New group', icon: Users, onClick: () => setCreating('group') },
              ]}
            />
          </div>
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ui-subtle" aria-hidden />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search conversations" className="pl-9" aria-label="Search conversations" />
          </div>
          <Tabs<Filter>
            value={filter}
            onChange={setFilter}
            tabs={[
              { value: 'all', label: 'All' },
              { value: 'unread', label: 'Unread', count: (list ?? []).filter((c) => c.unreadCount).length },
              { value: 'direct', label: 'Direct' },
              { value: 'group', label: 'Groups' },
            ]}
          />
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {!list ? (
            <div className="p-2">
              <SkeletonRows rows={6} />
            </div>
          ) : visible.length === 0 ? (
            <EmptyState icon={MessageSquarePlus} title={list.length ? 'No matches' : 'No conversations yet'} text={list.length ? 'Try another filter.' : 'Start a direct message or create a group.'} />
          ) : (
            <ul className="space-y-0.5">
              {visible.map((c) => {
                const title = conversationTitle(c, user!._id);
                const other = c.type === 'direct' ? c.participants.find((p) => p._id !== user!._id) : null;
                const muted = c.mutedUntil && new Date(c.mutedUntil) > new Date();
                const last = c.lastMessage;
                const preview = !last ? 'No messages yet' : last.deletedAt ? 'Message deleted' : last.kind === 'system' ? last.text : `${typeof last.senderId === 'object' && last.senderId._id === user!._id ? 'You: ' : ''}${last.text || (last.fileType === 'audio' ? 'Voice message' : last.fileType === 'image' ? 'Photo' : 'Attachment')}`;
                return (
                  <li key={c.id}>
                    <Link
                      href={`/messages/${c.id}`}
                      className={cx('flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-colors', activeId === c.id ? 'bg-ui-accent-soft' : 'hover:bg-ui-sunken')}
                    >
                      <Avatar name={title} src={other?.avatar || c.avatar} size={40} square={!other} online={other ? onlineUsers.includes(other._id) : undefined} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className={cx('truncate text-[14px]', c.unreadCount ? 'font-semibold text-ui-text' : 'font-medium text-ui-text')}>{title}</span>
                          {c.pinnedAt && <Pin size={12} className="flex-shrink-0 text-ui-subtle" aria-label="Pinned" />}
                          {muted && <BellOff size={12} className="flex-shrink-0 text-ui-subtle" aria-label="Muted" />}
                          <span className="ml-auto flex-shrink-0 text-[11px] text-ui-subtle">{formatDistanceToNowStrict(new Date(c.lastMessageTime))}</span>
                        </span>
                        <span className="mt-0.5 flex items-center gap-2">
                          <span className={cx('flex-1 truncate text-[13px]', c.unreadCount ? 'text-ui-text' : 'text-ui-subtle')}>{preview}</span>
                          <Count n={c.unreadCount} muted={Boolean(muted)} />
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
      <div className={cx('min-w-0 flex-1', !activeId && 'hidden md:flex')}>{children}</div>
      <NewConversation mode={creating} onClose={() => setCreating(null)} />
    </div>
  );
}
