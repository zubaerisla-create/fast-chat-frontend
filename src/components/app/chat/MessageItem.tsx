'use client';

import { memo, useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import {
  Bookmark,
  Check,
  CheckCheck,
  CheckSquare,
  Clock,
  Copy,
  CornerUpLeft,
  Download,
  FileText,
  Flag,
  Forward,
  MoreHorizontal,
  Pause,
  Pencil,
  Pin,
  Play,
  SmilePlus,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import type { ChatMessage, Attachment } from '@/lib/saas';
import { safeMediaUrl } from '@/lib/safeUrl';
import { Avatar, Menu, cx, formatBytes } from '../ui';

export const QUICK_REACTIONS = ['👍', '❤️', '😂', '🎉', '😮', '🙏'];

export const senderOf = (m: ChatMessage) => (typeof m.senderId === 'string' ? { _id: m.senderId, username: '', avatar: '' } : m.senderId);
export const attachmentsOf = (m: ChatMessage): Attachment[] => [...(m.fileUrl ? [{ url: m.fileUrl, type: m.fileType || 'file', name: m.fileName, size: m.fileSize } as Attachment] : []), ...(m.attachments || [])];

/** Text with links and @mentions highlighted (no HTML injection: React escapes text). */
function RichText({ text, me }: { text: string; me: string }) {
  const parts = text.split(/(https?:\/\/[^\s<]+|@[A-Za-z0-9_.]{3,30})/g);
  return (
    <>
      {parts.map((p, i) => {
        if (/^https?:\/\//.test(p)) {
          const href = safeMediaUrl(p);
          return href ? (
            <a key={i} href={href} target="_blank" rel="noopener noreferrer nofollow" className="break-all underline decoration-current/40 underline-offset-2 hover:decoration-current">
              {p}
            </a>
          ) : (
            p
          );
        }
        if (p.startsWith('@')) {
          const self = p.slice(1).toLowerCase() === me.toLowerCase() || ['@everyone', '@channel'].includes(p.toLowerCase());
          return (
            <span key={i} className={cx('rounded px-0.5 font-medium', self ? 'bg-ui-warning/20 text-ui-text' : 'text-ui-accent-text')}>
              {p}
            </span>
          );
        }
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

export function VoicePlayer({ src, duration, own }: { src: string; duration?: number | null; own?: boolean }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [total, setTotal] = useState(duration || 0);
  // Deterministic pseudo-waveform from the URL so it's stable between renders
  const bars = useRef(Array.from({ length: 36 }, (_, i) => 0.25 + 0.75 * Math.abs(Math.sin((src.length + i * 7.3) * 0.9))));
  useEffect(() => {
    const a = ref.current;
    if (!a) return;
    const onTime = () => setProgress(a.duration ? a.currentTime / a.duration : 0);
    const onMeta = () => Number.isFinite(a.duration) && setTotal(a.duration);
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
    };
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('loadedmetadata', onMeta);
    a.addEventListener('ended', onEnd);
    return () => {
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('loadedmetadata', onMeta);
      a.removeEventListener('ended', onEnd);
    };
  }, []);
  const toggle = () => {
    const a = ref.current;
    if (!a) return;
    if (playing) a.pause();
    else a.play().catch(() => {});
    setPlaying(!playing);
  };
  const cycleSpeed = () => {
    const next = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
    setSpeed(next);
    if (ref.current) ref.current.playbackRate = next;
  };
  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  return (
    <div className="flex w-64 max-w-full items-center gap-2.5 py-1">
      <audio ref={ref} src={src} preload="metadata" />
      <button type="button" onClick={toggle} aria-label={playing ? 'Pause voice message' : 'Play voice message'} className={cx('flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full', own ? 'bg-white/20 text-white' : 'bg-ui-accent text-white')}>
        {playing ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
      </button>
      <div
        className="flex h-7 flex-1 cursor-pointer items-center gap-[2px]"
        onClick={(e) => {
          const a = ref.current;
          if (!a?.duration) return;
          const r = e.currentTarget.getBoundingClientRect();
          a.currentTime = ((e.clientX - r.left) / r.width) * a.duration;
        }}
        aria-hidden
      >
        {bars.current.map((h, i) => (
          <span key={i} className={cx('w-[3px] rounded-full', i / bars.current.length <= progress ? (own ? 'bg-white' : 'bg-ui-accent') : own ? 'bg-white/40' : 'bg-ui-border')} style={{ height: `${h * 100}%` }} />
        ))}
      </div>
      <span className={cx('w-9 text-right text-[11px] tabular-nums', own ? 'text-white/80' : 'text-ui-subtle')}>{mmss(playing || progress ? progress * total : total)}</span>
      <button type="button" onClick={cycleSpeed} aria-label={`Playback speed ${speed}x`} className={cx('rounded px-1 text-[11px] font-semibold', own ? 'bg-white/20 text-white' : 'bg-ui-sunken text-ui-muted')}>
        {speed}x
      </button>
    </div>
  );
}

function Attachments({ items, own, onOpenImage }: { items: Attachment[]; own: boolean; onOpenImage: (url: string) => void }) {
  const images = items.filter((a) => a.type === 'image');
  const others = items.filter((a) => a.type !== 'image');
  return (
    <div className="space-y-1.5">
      {images.length > 0 && (
        <div className={cx('grid gap-1', images.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
          {images.map((img) => {
            const src = safeMediaUrl(img.url);
            return src ? (
              <button key={img.url} type="button" onClick={() => onOpenImage(img.url)} className="overflow-hidden rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent" aria-label={`Open image ${img.name || ''}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={img.name || ''} loading="lazy" className={cx('w-full object-cover transition-transform duration-300 hover:scale-[1.02]', images.length === 1 ? 'max-h-80 min-h-[120px]' : 'h-36')} />
              </button>
            ) : null;
          })}
        </div>
      )}
      {others.map((a) => {
        const src = safeMediaUrl(a.url);
        if (!src) return null;
        if (a.type === 'video') return <video key={a.url} src={src} controls preload="metadata" className="max-h-80 w-full rounded-xl bg-black" />;
        if (a.type === 'audio') return <VoicePlayer key={a.url} src={src} own={own} />;
        return (
          <a key={a.url} href={src} download={a.name || undefined} target="_blank" rel="noopener noreferrer" className={cx('flex items-center gap-3 rounded-xl border px-3 py-2.5', own ? 'border-white/20 bg-white/10' : 'border-ui-border bg-ui-panel')}>
            <span className={cx('flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg', own ? 'bg-white/20' : 'bg-ui-accent-soft text-ui-accent-text')}>
              <FileText size={17} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{a.name || 'File'}</span>
              <span className={cx('text-xs', own ? 'text-white/70' : 'text-ui-subtle')}>{formatBytes(a.size)}</span>
            </span>
            <Download size={16} className="opacity-70" aria-hidden />
          </a>
        );
      })}
    </div>
  );
}

export interface MessageActions {
  onReply: (m: ChatMessage) => void;
  onEdit: (m: ChatMessage) => void;
  onDelete: (m: ChatMessage) => void;
  onReact: (m: ChatMessage, emoji: string) => void;
  onForward: (m: ChatMessage) => void;
  onPin: (m: ChatMessage) => void;
  onBookmark: (m: ChatMessage) => void;
  onTask: (m: ChatMessage) => void;
  onReport: (m: ChatMessage) => void;
  onOpenImage: (url: string) => void;
  onJumpTo: (id: string) => void;
  onRetry: (m: ChatMessage) => void;
}

interface Props {
  m: ChatMessage;
  meId: string;
  meName: string;
  showAuthor: boolean;
  canModerate: boolean;
  canPin: boolean;
  isGroup: boolean;
  actions: MessageActions;
  highlighted?: boolean;
}

function StatusIcon({ m }: { m: ChatMessage }) {
  if (m.failed) return <AlertCircle size={13} className="text-ui-danger" aria-label="Not sent" />;
  if (m.pending) return <Clock size={12} aria-label="Sending" />;
  if (m.isRead) return <CheckCheck size={14} className="text-sky-300" aria-label="Read" />;
  if (m.deliveredAt) return <CheckCheck size={14} aria-label="Delivered" />;
  return <Check size={14} aria-label="Sent" />;
}

function MessageItem({ m, meId, meName, showAuthor, canModerate, canPin, isGroup, actions, highlighted }: Props) {
  const sender = senderOf(m);
  const own = sender._id === meId;
  const [reactOpen, setReactOpen] = useState(false);

  if (m.kind === 'system') {
    return (
      <div id={`msg-${m._id}`} className="my-2 flex justify-center">
        <span className="rounded-full bg-ui-sunken px-3 py-1 text-xs text-ui-muted">{m.text}</span>
      </div>
    );
  }

  const deleted = Boolean(m.deletedAt);
  const files = attachmentsOf(m);
  const onlyMedia = !m.text && files.length > 0 && files.every((f) => f.type === 'image' || f.type === 'video');
  const time = format(new Date(m.createdAt), 'HH:mm');
  const reactionGroups = Object.entries(
    (m.reactions || []).reduce<Record<string, { n: number; mine: boolean; names: string[] }>>((acc, r) => {
      const g = (acc[r.emoji] ||= { n: 0, mine: false, names: [] });
      g.n += 1;
      g.names.push(r.userId.username);
      if (r.userId._id === meId) g.mine = true;
      return acc;
    }, {})
  );

  return (
    <div id={`msg-${m._id}`} className={cx('group relative flex gap-2.5 px-4 transition-colors sm:px-6', showAuthor ? 'mt-3' : 'mt-0.5', own ? 'flex-row-reverse' : '', highlighted && 'bg-ui-warning/10')}>
      <div className="w-8 flex-shrink-0">{!own && showAuthor && isGroup && <Avatar name={sender.username || '?'} src={sender.avatar} size={32} />}</div>

      <div className={cx('flex min-w-0 max-w-[min(78%,560px)] flex-col', own ? 'items-end' : 'items-start')}>
        {!own && showAuthor && isGroup && <span className="mb-0.5 px-1 text-xs font-semibold text-ui-text">{sender.username}</span>}

        <div
          className={cx(
            'relative rounded-2xl text-[14px] leading-relaxed',
            deleted ? 'border border-dashed border-ui-border bg-transparent px-3.5 py-2 italic text-ui-subtle' : own ? 'bg-ui-bubble text-white' : 'border border-ui-border bg-ui-panel text-ui-text',
            !deleted && (onlyMedia ? 'p-1' : 'px-3.5 py-2'),
            !deleted && (own ? 'rounded-br-md' : 'rounded-bl-md'),
            m.failed && 'opacity-70'
          )}
        >
          {deleted ? (
            'This message was deleted'
          ) : (
            <>
              {m.forwarded && (
                <p className={cx('mb-1 flex items-center gap-1 text-[11px] italic', own ? 'text-white/70' : 'text-ui-subtle')}>
                  <Forward size={11} /> Forwarded
                </p>
              )}
              {m.replyToMessageId && m.replyToText && (
                <button
                  type="button"
                  onClick={() => actions.onJumpTo(m.replyToMessageId!)}
                  className={cx('mb-1.5 block w-full rounded-lg border-l-2 px-2.5 py-1 text-left text-[12.5px]', own ? 'border-white/60 bg-white/10 text-white/85' : 'border-ui-accent bg-ui-sunken text-ui-muted')}
                >
                  <span className="line-clamp-2">{m.replyToText}</span>
                </button>
              )}
              {files.length > 0 && <Attachments items={files} own={own} onOpenImage={actions.onOpenImage} />}
              {m.text && (
                <p className={cx('whitespace-pre-wrap break-words', files.length > 0 && 'mt-1.5')}>
                  <RichText text={m.text} me={meName} />
                </p>
              )}
              {m.linkPreview && safeMediaUrl(m.linkPreview.url) && (
                <a href={safeMediaUrl(m.linkPreview.url)!} target="_blank" rel="noopener noreferrer nofollow" className={cx('mt-2 flex overflow-hidden rounded-xl border', own ? 'border-white/20 bg-white/10' : 'border-ui-border bg-ui-sunken')}>
                  <span className={cx('w-1 flex-shrink-0', own ? 'bg-white/50' : 'bg-ui-accent')} />
                  <span className="min-w-0 flex-1 px-3 py-2">
                    <span className={cx('block text-[11px] uppercase tracking-wide', own ? 'text-white/70' : 'text-ui-subtle')}>{m.linkPreview.siteName}</span>
                    <span className="block truncate text-[13px] font-semibold">{m.linkPreview.title}</span>
                    {m.linkPreview.description && <span className={cx('line-clamp-2 text-xs', own ? 'text-white/80' : 'text-ui-muted')}>{m.linkPreview.description}</span>}
                  </span>
                  {m.linkPreview.image && safeMediaUrl(m.linkPreview.image) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={safeMediaUrl(m.linkPreview.image)!} alt="" className="h-auto w-20 flex-shrink-0 object-cover" loading="lazy" />
                  )}
                </a>
              )}
              <span className={cx('float-right ml-3 mt-1 inline-flex items-center gap-1 text-[10.5px] leading-none', own ? 'text-white/75' : 'text-ui-subtle', onlyMedia && 'absolute bottom-2.5 right-3 rounded-full bg-black/45 px-1.5 py-1 text-white')}>
                {m.isPinned && <Pin size={10} aria-label="Pinned" />}
                {m.editedAt && <span>edited</span>}
                {time}
                {own && <StatusIcon m={m} />}
              </span>
            </>
          )}
        </div>

        {m.failed && (
          <button type="button" onClick={() => actions.onRetry(m)} className="mt-1 text-xs font-medium text-ui-danger hover:underline">
            Not sent. Tap to retry
          </button>
        )}

        {reactionGroups.length > 0 && !deleted && (
          <div className={cx('-mt-1.5 flex flex-wrap gap-1 px-2', own && 'justify-end')}>
            {reactionGroups.map(([emoji, g]) => (
              <button
                key={emoji}
                type="button"
                title={g.names.join(', ')}
                onClick={() => actions.onReact(m, emoji)}
                className={cx('flex h-6 items-center gap-1 rounded-full border px-1.5 text-xs shadow-sm transition-colors', g.mine ? 'border-ui-accent/50 bg-ui-accent-soft text-ui-accent-text' : 'border-ui-border bg-ui-panel text-ui-muted hover:bg-ui-sunken')}
              >
                <span>{emoji}</span>
                <span className="tabular-nums">{g.n}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hover actions */}
      {!deleted && !m.pending && !m.failed && (
        <div className={cx('absolute -top-3 z-10 hidden items-center rounded-lg border border-ui-border bg-ui-raised p-0.5 shadow-md group-hover:flex group-focus-within:flex', own ? 'left-14 sm:left-16' : 'right-4 sm:right-6')}>
          <div className="relative">
            <button type="button" aria-label="Add reaction" onClick={() => setReactOpen((o) => !o)} className="rounded-md p-1.5 text-ui-muted hover:bg-ui-sunken hover:text-ui-text">
              <SmilePlus size={15} />
            </button>
            {reactOpen && (
              <div className="animate-pop-in absolute bottom-full left-1/2 z-20 mb-1 flex -translate-x-1/2 gap-0.5 rounded-full border border-ui-border bg-ui-raised p-1 shadow-xl" onMouseLeave={() => setReactOpen(false)}>
                {QUICK_REACTIONS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    aria-label={`React ${e}`}
                    onClick={() => {
                      actions.onReact(m, e);
                      setReactOpen(false);
                    }}
                    className="rounded-full p-1 text-lg leading-none transition-transform hover:scale-125"
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button type="button" aria-label="Reply" onClick={() => actions.onReply(m)} className="rounded-md p-1.5 text-ui-muted hover:bg-ui-sunken hover:text-ui-text">
            <CornerUpLeft size={15} />
          </button>
          <Menu
            align={own ? 'left' : 'right'}
            trigger={(open, t) => (
              <button type="button" aria-label="More actions" aria-expanded={open} onClick={t} className="rounded-md p-1.5 text-ui-muted hover:bg-ui-sunken hover:text-ui-text">
                <MoreHorizontal size={15} />
              </button>
            )}
            items={[
              own && !!m.text && Date.now() - new Date(m.createdAt).getTime() < 48 * 3600 * 1000 && { label: 'Edit', icon: Pencil, onClick: () => actions.onEdit(m) },
              !!m.text && { label: 'Copy text', icon: Copy, onClick: () => navigator.clipboard?.writeText(m.text) },
              { label: 'Forward', icon: Forward, onClick: () => actions.onForward(m) },
              canPin && { label: m.isPinned ? 'Unpin' : 'Pin to conversation', icon: Pin, onClick: () => actions.onPin(m) },
              { label: 'Save for later', icon: Bookmark, onClick: () => actions.onBookmark(m) },
              { label: 'Create task', icon: CheckSquare, onClick: () => actions.onTask(m) },
              'divider',
              !own && { label: 'Report', icon: Flag, onClick: () => actions.onReport(m) },
              (own || canModerate) && { label: 'Delete for everyone', icon: Trash2, danger: true, onClick: () => actions.onDelete(m) },
            ]}
          />
        </div>
      )}
    </div>
  );
}

export default memo(MessageItem);
