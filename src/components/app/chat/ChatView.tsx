'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { format, isSameDay, isToday, isYesterday } from 'date-fns';
import { ArrowDown, Hash, Info, Lock, MessagesSquare, Pin, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { messages as msgApi, newClientId, errorMessage, type Attachment, type ChatMessage, type Conversation } from '@/lib/saas';
import ImageLightbox from '@/components/chat/ImageLightbox';
import { safeMediaUrl } from '@/lib/safeUrl';
import { Avatar, Confirm, EmptyState, IconButton, Skeleton, cx } from '../ui';
import MessageItem, { attachmentsOf, senderOf, type MessageActions } from './MessageItem';
import Composer from './Composer';
import { ForwardDialog, PinsDialog, ReportDialog, SearchDialog, TaskFromMessageDialog, conversationTitle } from './dialogs';

interface Props {
  conversation: Conversation;
  onOpenInfo?: () => void;
  infoOpen?: boolean;
  /** Back button for mobile two-pane layouts */
  backButton?: React.ReactNode;
}

const dayLabel = (d: Date) => (isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'EEEE, MMMM d'));

export default function ChatView({ conversation, onOpenInfo, infoOpen, backButton }: Props) {
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const meId = user!._id;
  const [items, setItems] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editing, setEditing] = useState<ChatMessage | null>(null);
  const [typing, setTyping] = useState<Record<string, number>>({});
  const [forwarding, setForwarding] = useState<ChatMessage | null>(null);
  const [tasking, setTasking] = useState<ChatMessage | null>(null);
  const [reporting, setReporting] = useState<ChatMessage | null>(null);
  const [deleting, setDeleting] = useState<ChatMessage | null>(null);
  const [pinsOpen, setPinsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [newBelow, setNewBelow] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const keepOffset = useRef<number | null>(null);
  const convId = conversation.id;

  const isGroup = conversation.type !== 'direct';
  const canModerate = isGroup && ['owner', 'admin'].includes(conversation.myRole);
  const canPin = !isGroup || canModerate;
  const other = conversation.type === 'direct' ? conversation.participants.find((p) => p._id !== meId) : null;
  const title = conversationTitle(conversation, meId);
  const members = useMemo(() => conversation.members.filter((m) => m._id !== meId), [conversation.members, meId]);
  const pinnedCount = items.filter((m) => m.isPinned && !m.deletedAt).length;

  const scrollToBottom = useCallback((smooth = false) => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    setNewBelow(0);
  }, []);

  const markRead = useCallback(() => {
    msgApi.markRead(convId).catch(() => {});
    window.dispatchEvent(new Event('fc:channelsChanged'));
  }, [convId]);

  // Initial page
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setItems([]);
    setReplyTo(null);
    setEditing(null);
    msgApi
      .page(convId)
      .then((res) => {
        if (cancelled) return;
        setItems(res.messages);
        setHasMore(res.hasMore);
        setLoading(false);
        requestAnimationFrame(() => scrollToBottom());
        markRead();
        const undelivered = res.messages.filter((m) => !m.deliveredAt && senderOf(m)._id !== meId).map((m) => m._id);
        if (undelivered.length) socket?.emit('messagesDelivered', { messageIds: undelivered });
      })
      .catch((err) => {
        if (!cancelled) {
          setError(errorMessage(err, 'Messages could not be loaded.'));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convId]);

  // Older pages: keep the viewport anchored while content is prepended
  const loadOlder = useCallback(async () => {
    if (!hasMore || loadingOlder || !items.length) return;
    setLoadingOlder(true);
    const el = scroller.current;
    keepOffset.current = el ? el.scrollHeight - el.scrollTop : null;
    try {
      const res = await msgApi.page(convId, items.find((m) => !m.pending)?._id);
      setItems((cur) => [...res.messages.filter((m) => !cur.some((c) => c._id === m._id)), ...cur]);
      setHasMore(res.hasMore);
    } catch {
      toast.error('Older messages could not be loaded.');
    } finally {
      setLoadingOlder(false);
    }
  }, [hasMore, loadingOlder, items, convId]);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && keepOffset.current !== null) {
      el.scrollTop = el.scrollHeight - keepOffset.current;
      keepOffset.current = null;
    }
  }, [items]);

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    if (el.scrollTop < 150) loadOlder();
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setAtBottom(bottom);
    if (bottom) setNewBelow(0);
  };

  // Realtime
  useEffect(() => {
    if (!socket) return;
    const mine = (p: { conversationId?: string; message?: ChatMessage }) => (p.conversationId ?? p.message?.conversationId) === convId;
    const onReceive = ({ message }: { message: ChatMessage }) => {
      if (message.conversationId !== convId) return;
      setItems((cur) => (cur.some((m) => m._id === message._id || (message.clientId && m.clientId === message.clientId)) ? cur : [...cur, message]));
      if (senderOf(message)._id !== meId) {
        socket.emit('messagesDelivered', { messageIds: [message._id] });
        if (document.visibilityState === 'visible') markRead();
        const el = scroller.current;
        const nearBottom = el ? el.scrollHeight - el.scrollTop - el.clientHeight < 120 : true;
        if (nearBottom) requestAnimationFrame(() => scrollToBottom(true));
        else setNewBelow((n) => n + 1);
      }
    };
    const onUpdated = ({ message }: { message: ChatMessage }) => mine({ message }) && setItems((cur) => cur.map((m) => (m._id === message._id ? { ...m, ...message } : m)));
    const onDeleted = (p: { messageId: string; conversationId: string }) =>
      mine(p) && setItems((cur) => cur.map((m) => (m._id === p.messageId ? { ...m, deletedAt: new Date().toISOString(), text: '', fileUrl: null, attachments: [], reactions: [] } : m)));
    const onReactions = (p: { messageId: string; conversationId: string; reactions: ChatMessage['reactions'] }) => mine(p) && setItems((cur) => cur.map((m) => (m._id === p.messageId ? { ...m, reactions: p.reactions } : m)));
    const onPinned = (p: { messageId: string; conversationId: string; pinned: boolean }) => mine(p) && setItems((cur) => cur.map((m) => (m._id === p.messageId ? { ...m, isPinned: p.pinned } : m)));
    const onSeen = (p: { conversationId: string; seenAt: string }) => mine(p) && setItems((cur) => cur.map((m) => (senderOf(m)._id === meId && new Date(m.createdAt) <= new Date(p.seenAt) ? { ...m, isRead: true } : m)));
    const onDelivered = (p: { messageIds: string[]; deliveredAt: string }) => setItems((cur) => cur.map((m) => (p.messageIds.includes(m._id) ? { ...m, deliveredAt: m.deliveredAt || p.deliveredAt } : m)));
    const onTyping = (p: { senderId: string; conversationId: string }) => p.conversationId === convId && setTyping((t) => ({ ...t, [p.senderId]: Date.now() }));
    const onStop = (p: { senderId: string; conversationId: string }) =>
      p.conversationId === convId &&
      setTyping((t) => {
        const n = { ...t };
        delete n[p.senderId];
        return n;
      });
    socket.on('receiveMessage', onReceive);
    socket.on('messageUpdated', onUpdated);
    socket.on('messageDeleted', onDeleted);
    socket.on('messageReactionUpdated', onReactions);
    socket.on('messagePinned', onPinned);
    socket.on('messagesSeen', onSeen);
    socket.on('messagesDelivered', onDelivered);
    socket.on('userTyping', onTyping);
    socket.on('userStoppedTyping', onStop);
    return () => {
      socket.off('receiveMessage', onReceive);
      socket.off('messageUpdated', onUpdated);
      socket.off('messageDeleted', onDeleted);
      socket.off('messageReactionUpdated', onReactions);
      socket.off('messagePinned', onPinned);
      socket.off('messagesSeen', onSeen);
      socket.off('messagesDelivered', onDelivered);
      socket.off('userTyping', onTyping);
      socket.off('userStoppedTyping', onStop);
    };
  }, [socket, convId, meId, markRead, scrollToBottom]);

  // Typing indicators expire if the stop event is lost
  useEffect(() => {
    const t = setInterval(() => setTyping((cur) => Object.fromEntries(Object.entries(cur).filter(([, at]) => Date.now() - at < 6000))), 2000);
    return () => clearInterval(t);
  }, []);

  // ─── Sending (optimistic, retryable, idempotent via clientId) ─────────────
  const optimistic = (clientId: string, text: string, attachments: Attachment[], reply: ChatMessage | null): ChatMessage => ({
    _id: `tmp-${clientId}`,
    id: `tmp-${clientId}`,
    conversationId: convId,
    senderId: { _id: meId, id: meId, username: user!.username, avatar: user!.avatar },
    kind: 'user',
    text,
    replyToMessageId: reply?._id ?? null,
    replyToText: reply ? reply.text || reply.fileName || '' : null,
    replyToSenderId: reply ? senderOf(reply)._id : null,
    fileUrl: attachments[0]?.url ?? null,
    fileType: attachments[0]?.type ?? null,
    fileName: attachments[0]?.name ?? null,
    fileSize: attachments[0]?.size ?? null,
    audioDuration: null,
    attachments: attachments.slice(1),
    linkPreview: null,
    forwarded: false,
    isRead: false,
    deliveredAt: null,
    editedAt: null,
    deletedAt: null,
    isPinned: false,
    clientId,
    reactions: [],
    createdAt: new Date().toISOString(),
    pending: true,
  });

  const deliver = async (temp: ChatMessage, attachments: Attachment[]) => {
    try {
      const saved = await msgApi.send({ conversationId: convId, text: temp.text, clientId: temp.clientId!, replyToMessageId: temp.replyToMessageId, attachments });
      setItems((cur) => {
        const withoutDup = cur.filter((m) => m._id !== saved._id);
        return withoutDup.map((m) => (m.clientId === temp.clientId ? saved : m));
      });
    } catch (err) {
      setItems((cur) => cur.map((m) => (m.clientId === temp.clientId ? { ...m, pending: false, failed: true } : m)));
      toast.error(errorMessage(err, 'Message not sent.'));
    }
  };

  const send = (text: string, attachments: Attachment[]) => {
    const temp = optimistic(newClientId(), text, attachments, replyTo);
    setItems((cur) => [...cur, temp]);
    setReplyTo(null);
    requestAnimationFrame(() => scrollToBottom(true));
    deliver(temp, attachments);
  };

  const retry = (m: ChatMessage) => {
    setItems((cur) => cur.map((x) => (x.clientId === m.clientId ? { ...x, failed: false, pending: true } : x)));
    deliver(m, attachmentsOf(m));
  };

  const sendVoice = async (blob: Blob, seconds: number) => {
    const clientId = newClientId();
    try {
      const saved = await msgApi.voice(convId, blob, seconds, clientId);
      setItems((cur) => (cur.some((m) => m._id === saved._id) ? cur : [...cur, saved]));
      requestAnimationFrame(() => scrollToBottom(true));
    } catch (err) {
      toast.error(errorMessage(err, 'Voice message not sent.'));
    }
  };

  const jumpTo = useCallback((id: string) => {
    const el = document.getElementById(`msg-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlight(id);
      setTimeout(() => setHighlight(null), 1800);
    } else toast('That message is further back in the history. Scroll up to load it.');
  }, []);

  const images = useMemo(
    () => items.filter((m) => !m.deletedAt).flatMap((m) => attachmentsOf(m).filter((a) => a.type === 'image' && safeMediaUrl(a.url)).map((a) => ({ id: `${m._id}-${a.url}`, src: safeMediaUrl(a.url)!, name: a.name ?? undefined, caption: m.text || undefined }))),
    [items]
  );

  const actions: MessageActions = useMemo(
    () => ({
      onReply: (m) => {
        setEditing(null);
        setReplyTo(m);
      },
      onEdit: (m) => {
        setReplyTo(null);
        setEditing(m);
      },
      onDelete: (m) => setDeleting(m),
      onReact: (m, emoji) => msgApi.react(m._id, emoji).catch((e) => toast.error(errorMessage(e))),
      onForward: setForwarding,
      onPin: (m) =>
        msgApi
          .pin(m._id, !m.isPinned)
          .then(() => toast.success(m.isPinned ? 'Unpinned' : 'Pinned'))
          .catch((e) => toast.error(errorMessage(e))),
      onBookmark: (m) =>
        msgApi
          .bookmark(m._id)
          .then((on) => toast.success(on ? 'Saved for later' : 'Removed from saved'))
          .catch((e) => toast.error(errorMessage(e))),
      onTask: setTasking,
      onReport: setReporting,
      onOpenImage: (url) => setLightbox(Math.max(0, images.findIndex((i) => i.src === safeMediaUrl(url)))),
      onJumpTo: jumpTo,
      onRetry: retry,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [images, jumpTo]
  );

  const typingNames = Object.keys(typing)
    .filter((id) => id !== meId)
    .map((id) => conversation.members.find((m) => m._id === id)?.username)
    .filter(Boolean) as string[];

  const disabledReason =
    conversation.adminsOnlyPost && !['owner', 'admin'].includes(conversation.myRole) ? 'Only admins can post in this conversation.' : null;

  const subtitle =
    conversation.type === 'direct'
      ? other && onlineUsers.includes(other._id)
        ? 'Online'
        : other?.lastSeen
          ? `Last seen ${format(new Date(other.lastSeen), 'MMM d, HH:mm')}`
          : 'Offline'
      : conversation.description || `${conversation.memberCount} members`;

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col bg-ui-bg">
      {/* Header */}
      <div className="flex h-14 flex-shrink-0 items-center gap-3 border-b border-ui-border bg-ui-panel px-3 sm:px-5">
        {backButton}
        {conversation.type === 'channel' ? (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ui-sunken text-ui-muted">{conversation.visibility === 'private' ? <Lock size={15} /> : <Hash size={16} />}</span>
        ) : (
          <Avatar name={title} src={other?.avatar || conversation.avatar} size={34} online={other ? onlineUsers.includes(other._id) : undefined} />
        )}
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[15px] font-semibold text-ui-text">{title}</h2>
          <p className={cx('truncate text-xs', subtitle === 'Online' ? 'text-ui-success' : 'text-ui-subtle')}>{typingNames.length ? `${typingNames.join(', ')} ${typingNames.length > 1 ? 'are' : 'is'} typing…` : subtitle}</p>
        </div>
        <IconButton icon={Search} label="Search in conversation" onClick={() => setSearchOpen(true)} />
        <IconButton icon={Pin} label="Pinned messages" onClick={() => setPinsOpen(true)} />
        {onOpenInfo && <IconButton icon={Info} label="Details" active={infoOpen} onClick={onOpenInfo} />}
      </div>

      {pinnedCount > 0 && (
        <button type="button" onClick={() => setPinsOpen(true)} className="flex items-center gap-2 border-b border-ui-border bg-ui-accent-soft/60 px-5 py-1.5 text-left text-xs text-ui-accent-text">
          <Pin size={12} /> {pinnedCount} pinned message{pinnedCount > 1 ? 's' : ''}. View all
        </button>
      )}

      {/* Timeline */}
      <div ref={scroller} onScroll={onScroll} className="relative min-h-0 flex-1 overflow-y-auto pb-4" role="log" aria-live="polite" aria-label={`Messages in ${title}`}>
        {loading ? (
          <div className="space-y-5 p-6">
            {[60, 40, 75, 30, 55].map((w, i) => (
              <div key={i} className={cx('flex gap-3', i % 2 ? 'flex-row-reverse' : '')}>
                <Skeleton className="h-8 w-8 !rounded-full" />
                <Skeleton className="h-12 rounded-2xl" />
                <div style={{ width: `${w}%` }} />
              </div>
            ))}
          </div>
        ) : error ? (
          <EmptyState icon={MessagesSquare} title="Couldn’t load messages" text={error} />
        ) : items.length === 0 ? (
          <EmptyState icon={MessagesSquare} title="No messages yet" text={conversation.type === 'direct' ? `Say hello to ${title}.` : 'Start the conversation. Everyone here will see it.'} />
        ) : (
          <>
            {hasMore ? (
              <div className="py-3 text-center text-xs text-ui-subtle">{loadingOlder ? 'Loading older messages…' : 'Scroll up for older messages'}</div>
            ) : (
              <div className="px-6 pb-2 pt-8 text-center">
                <p className="text-sm font-medium text-ui-text">This is the beginning of {title}</p>
              </div>
            )}
            {items.map((m, i) => {
              const prev = items[i - 1];
              const d = new Date(m.createdAt);
              const newDay = !prev || !isSameDay(new Date(prev.createdAt), d);
              const showAuthor = newDay || !prev || prev.kind === 'system' || senderOf(prev)._id !== senderOf(m)._id || d.getTime() - new Date(prev.createdAt).getTime() > 5 * 60 * 1000;
              return (
                <div key={m.clientId && m.pending ? m.clientId : m._id}>
                  {newDay && (
                    <div className="sticky top-1 z-[5] my-3 flex justify-center">
                      <span className="rounded-full border border-ui-border bg-ui-panel/95 px-3 py-0.5 text-[11px] font-medium text-ui-muted shadow-sm backdrop-blur">{dayLabel(d)}</span>
                    </div>
                  )}
                  <MessageItem m={m} meId={meId} meName={user!.username} showAuthor={showAuthor} canModerate={canModerate} canPin={canPin} isGroup={isGroup} actions={actions} highlighted={highlight === m._id} />
                </div>
              );
            })}
          </>
        )}
        {!atBottom && (
          <button type="button" onClick={() => scrollToBottom(true)} className="animate-pop-in sticky bottom-3 left-full mr-4 flex h-9 items-center gap-1.5 rounded-full border border-ui-border bg-ui-raised px-3 text-xs font-medium text-ui-text shadow-lg" style={{ marginLeft: 'auto' }}>
            <ArrowDown size={14} /> {newBelow ? `${newBelow} new` : 'Latest'}
          </button>
        )}
      </div>

      <Composer
        disabledReason={disabledReason}
        placeholder={`Message ${title}`}
        replyTo={replyTo}
        editing={editing}
        members={members}
        onCancelReply={() => setReplyTo(null)}
        onCancelEdit={() => setEditing(null)}
        onSend={send}
        onSaveEdit={(m, text) => {
          setEditing(null);
          msgApi
            .edit(m._id, text)
            .then((saved) => setItems((cur) => cur.map((x) => (x._id === saved._id ? saved : x))))
            .catch((e) => toast.error(errorMessage(e)));
        }}
        onVoice={sendVoice}
        onTyping={(on) => socket?.emit(on ? 'typing' : 'stopTyping', { conversationId: convId, receiverId: other?._id })}
      />

      <ForwardDialog message={forwarding} onClose={() => setForwarding(null)} />
      <TaskFromMessageDialog message={tasking} members={conversation.members} onClose={() => setTasking(null)} />
      <ReportDialog message={reporting} onClose={() => setReporting(null)} />
      <PinsDialog conversationId={convId} open={pinsOpen} onClose={() => setPinsOpen(false)} onJump={jumpTo} />
      <SearchDialog conversationId={convId} open={searchOpen} onClose={() => setSearchOpen(false)} onJump={(m) => jumpTo(m._id)} />
      <Confirm
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete message?"
        text="It will be removed for everyone in this conversation. This can’t be undone."
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          const m = deleting!;
          setDeleting(null);
          msgApi.remove(m._id).catch((e) => toast.error(errorMessage(e)));
        }}
      />
      {lightbox !== null && images.length > 0 && <ImageLightbox images={images} index={lightbox} onIndexChange={setLightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}
