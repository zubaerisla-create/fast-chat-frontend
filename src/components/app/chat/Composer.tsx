'use client';

import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { FileText, Loader2, Mic, Paperclip, Pencil, CornerUpLeft, SendHorizonal, Square, Trash2, X } from 'lucide-react';
import { messages as msgApi, errorMessage, type Attachment, type ChatMessage, type PublicUser } from '@/lib/saas';
import { Avatar, IconButton, cx, formatBytes } from '../ui';
import { VoicePlayer, senderOf } from './MessageItem';

interface Upload {
  key: string;
  file: File;
  progress: number;
  done?: Attachment;
  error?: string;
  preview?: string;
}

interface Props {
  disabledReason?: string | null;
  placeholder: string;
  replyTo: ChatMessage | null;
  editing: ChatMessage | null;
  members: PublicUser[];
  onCancelReply: () => void;
  onCancelEdit: () => void;
  onSend: (text: string, attachments: Attachment[]) => void;
  onSaveEdit: (m: ChatMessage, text: string) => void;
  onVoice: (blob: Blob, seconds: number) => void;
  onTyping: (typing: boolean) => void;
}

const MAX_FILES = 10;

export default function Composer({ disabledReason, placeholder, replyTo, editing, members, onCancelReply, onCancelEdit, onSend, onSaveEdit, onVoice, onTyping }: Props) {
  const [text, setText] = useState('');
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [mention, setMention] = useState<{ q: string; start: number } | null>(null);
  const [rec, setRec] = useState<{ state: 'idle' | 'recording' | 'preview'; seconds: number; blob?: Blob; url?: string }>({ state: 'idle', seconds: 0 });
  const ta = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>();
  const isTyping = useRef(false);

  useEffect(() => {
    if (editing) {
      setText(editing.text);
      setTimeout(() => ta.current?.focus(), 0);
    }
  }, [editing]);
  useEffect(() => {
    if (replyTo) ta.current?.focus();
  }, [replyTo]);
  // Grow with content up to ~8 lines
  useEffect(() => {
    const el = ta.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [text]);
  useEffect(() => () => uploads.forEach((u) => u.preview && URL.revokeObjectURL(u.preview)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const signalTyping = () => {
    if (!isTyping.current) {
      isTyping.current = true;
      onTyping(true);
    }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      isTyping.current = false;
      onTyping(false);
    }, 2500);
  };

  const addFiles = (files: FileList | File[]) => {
    const list = Array.from(files).slice(0, MAX_FILES - uploads.length);
    if (!list.length) return;
    const next: Upload[] = list.map((file) => ({ key: `${file.name}-${file.size}-${Math.random()}`, file, progress: 0, preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined }));
    setUploads((u) => [...u, ...next]);
    for (const up of next) {
      msgApi
        .upload(up.file, (p) => setUploads((all) => all.map((x) => (x.key === up.key ? { ...x, progress: p } : x))))
        .then((done) => setUploads((all) => all.map((x) => (x.key === up.key ? { ...x, done, progress: 100 } : x))))
        .catch((err) => setUploads((all) => all.map((x) => (x.key === up.key ? { ...x, error: errorMessage(err, 'Upload failed') } : x))));
    }
  };

  const ready = uploads.filter((u) => u.done).map((u) => u.done!);
  const uploading = uploads.some((u) => !u.done && !u.error);
  const canSend = !uploading && (text.trim().length > 0 || ready.length > 0);

  const submit = () => {
    if (editing) {
      if (text.trim() && text.trim() !== editing.text) onSaveEdit(editing, text.trim());
      else onCancelEdit();
      setText('');
      return;
    }
    if (!canSend) return;
    onSend(text.trim(), ready);
    setText('');
    uploads.forEach((u) => u.preview && URL.revokeObjectURL(u.preview));
    setUploads([]);
    clearTimeout(typingTimer.current);
    if (isTyping.current) {
      isTyping.current = false;
      onTyping(false);
    }
  };

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setText(v);
    signalTyping();
    const caret = e.target.selectionStart;
    const m = v.slice(0, caret).match(/(^|\s)@([A-Za-z0-9_.]{0,30})$/);
    setMention(m ? { q: m[2].toLowerCase(), start: caret - m[2].length - 1 } : null);
  };

  const suggestions = mention ? members.filter((u) => u.username.toLowerCase().startsWith(mention.q)).slice(0, 6) : [];
  const pickMention = (u: PublicUser) => {
    if (!mention) return;
    const before = text.slice(0, mention.start);
    const after = text.slice(mention.start + 1 + mention.q.length);
    setText(`${before}@${u.username} ${after}`);
    setMention(null);
    ta.current?.focus();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
      const r = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks: BlobPart[] = [];
      const started = Date.now();
      const tick = setInterval(() => setRec((s) => (s.state === 'recording' ? { ...s, seconds: Math.floor((Date.now() - started) / 1000) } : s)), 250);
      r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      r.onstop = () => {
        clearInterval(tick);
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: r.mimeType || 'audio/webm' });
        setRec({ state: 'preview', seconds: Math.max(1, Math.round((Date.now() - started) / 1000)), blob, url: URL.createObjectURL(blob) });
      };
      recorder.current = r;
      r.start();
      setRec({ state: 'recording', seconds: 0 });
    } catch {
      toast.error('Microphone access is needed to record a voice message.');
    }
  };
  const discardRecording = () => {
    if (rec.url) URL.revokeObjectURL(rec.url);
    setRec({ state: 'idle', seconds: 0 });
  };

  if (disabledReason) {
    return <div className="border-t border-ui-border bg-ui-panel px-6 py-4 text-center text-sm text-ui-muted">{disabledReason}</div>;
  }

  return (
    <div
      className="border-t border-ui-border bg-ui-panel px-3 pb-3 pt-2 sm:px-5"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
      }}
    >
      {(replyTo || editing) && (
        <div className="mb-2 flex items-center gap-2 rounded-lg border-l-2 border-ui-accent bg-ui-sunken px-3 py-1.5 text-[13px]">
          {editing ? <Pencil size={14} className="text-ui-accent" /> : <CornerUpLeft size={14} className="text-ui-accent" />}
          <span className="min-w-0 flex-1 truncate text-ui-muted">
            {editing ? 'Editing message' : <>Replying to <b className="text-ui-text">{senderOf(replyTo!).username || 'message'}</b>: {replyTo!.text || replyTo!.fileName || 'attachment'}</>}
          </span>
          <IconButton
            icon={X}
            label="Cancel"
            onClick={() => {
              if (editing) {
                onCancelEdit();
                setText('');
              } else onCancelReply();
            }}
          />
        </div>
      )}

      {uploads.length > 0 && (
        <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
          {uploads.map((u) => (
            <div key={u.key} className="relative flex h-16 w-40 flex-shrink-0 items-center gap-2 overflow-hidden rounded-lg border border-ui-border bg-ui-sunken p-1.5">
              {u.preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={u.preview} alt="" className="h-full w-12 rounded object-cover" />
              ) : (
                <span className="flex h-full w-12 items-center justify-center rounded bg-ui-panel text-ui-muted">
                  <FileText size={18} />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-ui-text">{u.file.name}</span>
                <span className={cx('block text-[11px]', u.error ? 'text-ui-danger' : 'text-ui-subtle')}>{u.error || (u.done ? formatBytes(u.file.size) : `${u.progress}%`)}</span>
              </span>
              <button type="button" aria-label={`Remove ${u.file.name}`} onClick={() => setUploads((all) => all.filter((x) => x.key !== u.key))} className="absolute right-1 top-1 rounded-full bg-ui-panel p-0.5 text-ui-muted shadow hover:text-ui-text">
                <X size={12} />
              </button>
              {!u.done && !u.error && <span className="absolute bottom-0 left-0 h-0.5 bg-ui-accent transition-all" style={{ width: `${u.progress}%` }} />}
            </div>
          ))}
        </div>
      )}

      {rec.state !== 'idle' ? (
        <div className="flex items-center gap-3 rounded-xl border border-ui-border bg-ui-sunken px-3 py-2">
          {rec.state === 'recording' ? (
            <>
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-ui-danger" aria-hidden />
              <span className="flex-1 text-sm tabular-nums text-ui-text">
                Recording… {Math.floor(rec.seconds / 60)}:{String(rec.seconds % 60).padStart(2, '0')}
              </span>
              <IconButton icon={Square} label="Stop recording" onClick={() => recorder.current?.stop()} />
            </>
          ) : (
            <>
              <IconButton icon={Trash2} label="Discard recording" onClick={discardRecording} />
              <div className="flex-1">{rec.url && <VoicePlayer src={rec.url} duration={rec.seconds} />}</div>
              <button
                type="button"
                aria-label="Send voice message"
                onClick={() => {
                  if (rec.blob) onVoice(rec.blob, rec.seconds);
                  discardRecording();
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-ui-accent text-white hover:bg-ui-accent/90"
              >
                <SendHorizonal size={16} />
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="relative flex items-end gap-1.5 rounded-xl border border-ui-border bg-ui-bg px-1.5 py-1.5 transition-colors focus-within:border-ui-accent/60 focus-within:ring-2 focus-within:ring-ui-accent/15">
          {suggestions.length > 0 && (
            <ul className="animate-pop-in absolute bottom-full left-2 z-20 mb-2 w-64 rounded-xl border border-ui-border bg-ui-raised p-1 shadow-xl" role="listbox" aria-label="Mention someone">
              {suggestions.map((u) => (
                <li key={u._id}>
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pickMention(u)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-ui-sunken">
                    <Avatar name={u.username} src={u.avatar} size={22} />
                    {u.username}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <input ref={fileInput} type="file" multiple hidden onChange={(e) => e.target.files && addFiles(e.target.files)} />
          {!editing && <IconButton icon={Paperclip} label="Attach files" onClick={() => fileInput.current?.click()} />}
          <textarea
            ref={ta}
            value={text}
            onChange={onChange}
            onPaste={(e) => {
              if (e.clipboardData.files.length) {
                e.preventDefault();
                addFiles(e.clipboardData.files);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                if (suggestions.length) pickMention(suggestions[0]);
                else submit();
              }
              if (e.key === 'Escape') {
                if (editing) {
                  onCancelEdit();
                  setText('');
                } else if (replyTo) onCancelReply();
              }
            }}
            rows={1}
            maxLength={2000}
            placeholder={placeholder}
            aria-label="Message"
            className="max-h-[200px] min-h-[34px] flex-1 resize-none bg-transparent px-1.5 py-1.5 text-[14px] text-ui-text placeholder:text-ui-subtle focus:outline-none"
          />
          {!editing && !text.trim() && !ready.length && !uploading ? (
            <IconButton icon={Mic} label="Record voice message" onClick={startRecording} />
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={!editing && !canSend}
              aria-label={editing ? 'Save edit' : 'Send message'}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-ui-accent text-white transition-colors hover:bg-ui-accent/90 disabled:opacity-40"
            >
              {uploading ? <Loader2 size={15} className="animate-spin" /> : <SendHorizonal size={15} />}
            </button>
          )}
        </div>
      )}
      <p className="mt-1.5 hidden px-1 text-[11px] text-ui-subtle sm:block">
        <b>Enter</b> to send · <b>Shift + Enter</b> for a new line · drop files to attach · <b>@</b> to mention
      </p>
    </div>
  );
}
