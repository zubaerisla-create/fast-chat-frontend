'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Ban, Bell, BellOff, Copy, Crown, FileText, Link2, LogOut, MoreHorizontal, Pencil, PinIcon, Shield, UserMinus, UserPlus, X, Megaphone } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { conversations as convApi, users as usersApi, errorMessage, type ChatMessage, type Conversation, type PublicUser } from '@/lib/saas';
import { safeMediaUrl } from '@/lib/safeUrl';
import { Avatar, Badge, Button, Confirm, Field, IconButton, Input, Menu, Modal, Textarea, Toggle, cx } from '../ui';
import UserPicker from '../UserPicker';
import { conversationTitle } from './dialogs';

export default function ConversationInfo({ conversation, onClose, onChanged }: { conversation: Conversation; onClose: () => void; onChanged: (c: Conversation | null) => void }) {
  const { user } = useAuth();
  const { onlineUsers } = useSocket();
  const router = useRouter();
  const meId = user!._id;
  const [media, setMedia] = useState<ChatMessage[]>([]);
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState<PublicUser[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: conversation.title || '', description: conversation.description || '' });
  const [invite, setInvite] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | 'leave' | 'block'>(null);
  const isGroup = conversation.type === 'group';
  const isChannel = conversation.type === 'channel';
  const admin = ['owner', 'admin'].includes(conversation.myRole);
  const other = conversation.type === 'direct' ? conversation.participants.find((p) => p._id !== meId) : null;
  const muted = Boolean(conversation.mutedUntil && new Date(conversation.mutedUntil) > new Date());

  useEffect(() => {
    convApi.media(conversation.id).then(setMedia).catch(() => setMedia([]));
    setForm({ title: conversation.title || '', description: conversation.description || '' });
  }, [conversation.id, conversation.title, conversation.description]);

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    try {
      await fn();
      if (ok) toast.success(ok);
      onChanged(await convApi.get(conversation.id).catch(() => null));
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const images = media.filter((m) => m.fileType === 'image' && safeMediaUrl(m.fileUrl)).slice(0, 9);
  const files = media.filter((m) => m.fileType === 'file').slice(0, 5);
  const shareUrl = invite && `${window.location.origin}/join/${invite}`;

  return (
    <aside className="flex h-full w-full flex-col border-l border-ui-border bg-ui-panel lg:w-[320px]">
      <div className="flex h-14 flex-shrink-0 items-center justify-between border-b border-ui-border px-4">
        <h3 className="text-sm font-semibold text-ui-text">Details</h3>
        <IconButton icon={X} label="Close details" onClick={onClose} />
      </div>
      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        <div className="flex flex-col items-center text-center">
          <Avatar name={conversationTitle(conversation, meId)} src={other?.avatar || conversation.avatar} size={64} square={!other} />
          <h4 className="mt-3 text-base font-semibold text-ui-text">{conversationTitle(conversation, meId)}</h4>
          {other ? (
            <p className="text-xs text-ui-subtle">{onlineUsers.includes(other._id) ? 'Online' : 'Offline'} · {other.email}</p>
          ) : (
            <p className="text-xs text-ui-subtle">
              {conversation.memberCount} members{isChannel ? ` · ${conversation.visibility}` : ''}
            </p>
          )}
          {conversation.description && <p className="mt-2 text-sm text-ui-muted">{conversation.description}</p>}
          {isGroup && admin && (
            <Button variant="ghost" size="sm" icon={Pencil} className="mt-2" onClick={() => setEditing(true)}>
              Edit group
            </Button>
          )}
        </div>

        <div className="space-y-1 rounded-xl border border-ui-border p-1.5">
          <Row icon={muted ? BellOff : Bell} label={muted ? 'Notifications muted' : 'Mute notifications'}>
            <Toggle checked={muted} label="Mute" onChange={(v) => run(() => convApi.membership(conversation.id, { muted: v }), v ? 'Muted' : 'Unmuted')} />
          </Row>
          {!isChannel && (
            <Row icon={PinIcon} label="Pin to top of list">
              <Toggle checked={Boolean(conversation.pinnedAt)} label="Pin" onChange={(v) => run(() => convApi.membership(conversation.id, { pinned: v }))} />
            </Row>
          )}
          {isGroup && admin && (
            <Row icon={Megaphone} label="Only admins can post">
              <Toggle checked={conversation.adminsOnlyPost} label="Announcement mode" onChange={(v) => run(() => convApi.update(conversation.id, { adminsOnlyPost: v }))} />
            </Row>
          )}
        </div>

        {isGroup && admin && (
          <div>
            <h5 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ui-subtle">Invite link</h5>
            {shareUrl ? (
              <div className="flex gap-2">
                <Input readOnly value={shareUrl} aria-label="Invite link" className="text-xs" />
                <IconButton
                  icon={Copy}
                  label="Copy link"
                  onClick={() => {
                    navigator.clipboard?.writeText(shareUrl);
                    toast.success('Link copied');
                  }}
                />
              </div>
            ) : (
              <Button variant="secondary" size="sm" icon={Link2} onClick={() => convApi.inviteLink(conversation.id).then(setInvite).catch((e) => toast.error(errorMessage(e)))}>
                Create invite link
              </Button>
            )}
            {shareUrl && (
              <button type="button" className="mt-1.5 text-xs text-ui-subtle hover:text-ui-danger" onClick={() => convApi.inviteLink(conversation.id, true).then(setInvite).then(() => toast.success('Old link no longer works'))}>
                Reset link
              </button>
            )}
          </div>
        )}

        {!other && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h5 className="text-xs font-semibold uppercase tracking-wider text-ui-subtle">Members · {conversation.memberCount}</h5>
              {isGroup && admin && (
                <Button variant="ghost" size="sm" icon={UserPlus} onClick={() => setAdding(true)}>
                  Add
                </Button>
              )}
            </div>
            <ul className="space-y-0.5">
              {conversation.members.map((m) => (
                <li key={m._id} className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 hover:bg-ui-sunken">
                  <Avatar name={m.username} src={m.avatar} size={28} online={onlineUsers.includes(m._id)} />
                  <span className="min-w-0 flex-1 truncate text-sm text-ui-text">
                    {m.username}
                    {m._id === meId && <span className="text-ui-subtle"> (you)</span>}
                  </span>
                  {m.role !== 'member' && <Badge tone={m.role === 'owner' ? 'accent' : 'neutral'}>{m.role}</Badge>}
                  {isGroup && m._id !== meId && admin && m.role !== 'owner' && (
                    <Menu
                      trigger={(o, t) => <IconButton icon={MoreHorizontal} label={`Manage ${m.username}`} onClick={t} active={o} />}
                      items={[
                        conversation.myRole === 'owner' && m.role === 'member' && { label: 'Make admin', icon: Shield, onClick: () => run(() => convApi.setRole(conversation.id, m._id, 'admin')) },
                        conversation.myRole === 'owner' && m.role === 'admin' && { label: 'Remove admin', icon: Shield, onClick: () => run(() => convApi.setRole(conversation.id, m._id, 'member')) },
                        conversation.myRole === 'owner' && { label: 'Make owner', icon: Crown, onClick: () => run(() => convApi.setRole(conversation.id, m._id, 'owner'), `${m.username} now owns the group`) },
                        (conversation.myRole === 'owner' || m.role === 'member') && { label: 'Remove from group', icon: UserMinus, danger: true, onClick: () => run(() => convApi.removeMember(conversation.id, m._id), 'Removed') },
                      ]}
                    />
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <h5 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ui-subtle">Shared media</h5>
          {images.length === 0 && files.length === 0 ? (
            <p className="text-sm text-ui-subtle">Photos and files shared here will appear here.</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-1">
                {images.map((m) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={m._id} src={safeMediaUrl(m.fileUrl)!} alt="" loading="lazy" className="aspect-square w-full rounded-lg object-cover" />
                ))}
              </div>
              <ul className="mt-2 space-y-1">
                {files.map((m) => (
                  <li key={m._id}>
                    <a href={safeMediaUrl(m.fileUrl) || '#'} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg px-1.5 py-1 text-sm text-ui-text hover:bg-ui-sunken">
                      <FileText size={15} className="text-ui-subtle" /> <span className="truncate">{m.fileName}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="space-y-1 border-t border-ui-border pt-4">
          {other && (
            <button type="button" onClick={() => setConfirm('block')} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-ui-danger hover:bg-ui-danger/10">
              <Ban size={16} /> Block {other.username}
            </button>
          )}
          {isGroup && (
            <button type="button" onClick={() => setConfirm('leave')} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-ui-danger hover:bg-ui-danger/10">
              <LogOut size={16} /> Leave group
            </button>
          )}
        </div>
      </div>

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Add members"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button
              disabled={!picked.length}
              onClick={() =>
                run(() => convApi.addMembers(conversation.id, picked.map((p) => p._id)), 'Members added').then(() => {
                  setPicked([]);
                  setAdding(false);
                })
              }
            >
              Add {picked.length || ''}
            </Button>
          </>
        }
      >
        <UserPicker selected={picked} onChange={setPicked} exclude={conversation.members.map((m) => m._id)} />
      </Modal>

      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title="Edit group"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button onClick={() => run(() => convApi.update(conversation.id, { title: form.title, description: form.description || null }), 'Saved').then(() => setEditing(false))} disabled={!form.title.trim()}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Group name" htmlFor="g-title">
            <Input id="g-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={80} />
          </Field>
          <Field label="Description" htmlFor="g-desc">
            <Textarea id="g-desc" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={500} />
          </Field>
        </div>
      </Modal>

      <Confirm
        open={confirm === 'leave'}
        onClose={() => setConfirm(null)}
        title="Leave this group?"
        text="You’ll stop receiving its messages. An admin can add you back."
        confirmLabel="Leave group"
        danger
        onConfirm={async () => {
          setConfirm(null);
          try {
            await convApi.removeMember(conversation.id, meId);
            onChanged(null);
            router.push('/messages');
          } catch (e) {
            toast.error(errorMessage(e));
          }
        }}
      />
      <Confirm
        open={confirm === 'block'}
        onClose={() => setConfirm(null)}
        title={`Block ${other?.username}?`}
        text="They won’t be able to message you or add you to groups. You can unblock them in Settings."
        confirmLabel="Block"
        danger
        onConfirm={() => {
          setConfirm(null);
          usersApi
            .block(other!._id)
            .then(() => toast.success(`${other!.username} is blocked`))
            .catch((e) => toast.error(errorMessage(e)));
        }}
      />
    </aside>
  );
}

function Row({ icon: Icon, label, children }: { icon: typeof Bell; label: string; children: React.ReactNode }) {
  return (
    <div className={cx('flex items-center gap-2.5 rounded-lg px-2 py-2')}>
      <Icon size={16} className="text-ui-subtle" aria-hidden />
      <span className="flex-1 text-sm text-ui-text">{label}</span>
      {children}
    </div>
  );
}
