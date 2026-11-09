'use client';

import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Ban, Bell, Camera, Moon, Palette, Sun, UserRound, Bookmark } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { PageBody } from '@/components/app/AppShell';
import { useTheme } from '@/components/app/theme';
import { Avatar, Button, Card, EmptyState, Field, Input, PageHeader, SkeletonRows, Toggle, cx } from '@/components/app/ui';
import { messages as msgApi, notificationsApi, users as usersApi, errorMessage, type ChatMessage, type PublicUser } from '@/lib/saas';
import { senderOf } from '@/components/app/chat/MessageItem';

const CATEGORY_LABEL: Record<string, [string, string]> = {
  messages: ['Direct and group messages', 'New messages in your conversations'],
  mentions: ['Mentions', 'When someone @mentions you'],
  groups: ['Groups', 'When you’re added to a group'],
  channels: ['Channels', 'When you’re added to a channel'],
  invitations: ['Invitations', 'Workspace invitations'],
  tasks: ['Tasks', 'Assignments, comments and status changes'],
  calls: ['Calls', 'Missed calls'],
  billing: ['Billing', 'Payments and plan changes'],
  status: ['Status', 'Reactions to your status'],
};

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const { theme, set } = useTheme();
  const [username, setUsername] = useState(user?.username || '');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<{ category: string; push: boolean; inApp: boolean }[] | null>(null);
  const [blocked, setBlocked] = useState<PublicUser[] | null>(null);
  const [saved, setSaved] = useState<ChatMessage[] | null>(null);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    notificationsApi.preferences().then(setPrefs).catch(() => setPrefs([]));
    usersApi.blocked().then(setBlocked).catch(() => setBlocked([]));
    msgApi.bookmarks().then(setSaved).catch(() => setSaved([]));
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      if (username.trim() !== user!.username) fd.append('username', username.trim());
      if (avatar) fd.append('avatar', avatar);
      const res = await usersApi.updateProfile(fd);
      updateUser({ ...user!, ...res.user });
      setAvatar(null);
      toast.success('Profile updated');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const setPref = async (category: string, body: { push?: boolean; inApp?: boolean }) => {
    setPrefs((p) => p && p.map((x) => (x.category === category ? { ...x, ...body } : x)));
    try {
      setPrefs(await notificationsApi.setPreference(category, body));
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const preview = avatar ? URL.createObjectURL(avatar) : user?.avatar;
  const dirty = Boolean(avatar) || username.trim() !== user?.username;

  return (
    <PageBody>
      <PageHeader icon={UserRound} title="Profile & settings" />

      <Card>
        <h2 className="text-sm font-semibold text-ui-text">Profile</h2>
        <div className="mt-5 flex flex-col gap-6 sm:flex-row">
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <Avatar name={username || '?'} src={preview} size={88} />
              <button type="button" onClick={() => file.current?.click()} aria-label="Change photo" className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-ui-panel bg-ui-accent text-white shadow">
                <Camera size={14} />
              </button>
            </div>
            <input ref={file} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && setAvatar(e.target.files[0])} />
            <span className="text-xs text-ui-subtle">JPG or PNG, up to 5 MB</span>
          </div>
          <div className="flex-1 space-y-4">
            <Field label="Username" htmlFor="p-user">
              <Input id="p-user" value={username} onChange={(e) => setUsername(e.target.value)} maxLength={30} />
            </Field>
            <Field label="Email" hint="Your sign-in address. Contact support to change it." htmlFor="p-email">
              <Input id="p-email" value={user?.email || ''} disabled readOnly />
            </Field>
            <div className="flex justify-end">
              <Button onClick={saveProfile} loading={saving} disabled={!dirty || username.trim().length < 3}>
                Save profile
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-2">
          <Palette size={16} className="text-ui-subtle" />
          <h2 className="text-sm font-semibold text-ui-text">Appearance</h2>
        </div>
        <div className="mt-4 grid max-w-md grid-cols-2 gap-3">
          {(['light', 'dark'] as const).map((t) => (
            <button key={t} type="button" onClick={() => set(t)} aria-pressed={theme === t} className={cx('rounded-xl border p-3 text-left transition-colors', theme === t ? 'border-ui-accent ring-2 ring-ui-accent/20' : 'border-ui-border hover:bg-ui-sunken')}>
              <div className={cx('mb-3 h-16 rounded-lg border', t === 'light' ? 'border-[#e4e6ec] bg-[#fafafc]' : 'border-[#262638] bg-[#0c0c14]')}>
                <div className={cx('m-2 h-2 w-10 rounded', t === 'light' ? 'bg-[#e4e6ec]' : 'bg-[#262638]')} />
                <div className="m-2 h-2 w-16 rounded bg-[#6353f1]" />
              </div>
              <span className="flex items-center gap-2 text-sm font-medium capitalize text-ui-text">
                {t === 'light' ? <Sun size={14} /> : <Moon size={14} />} {t}
              </span>
            </button>
          ))}
        </div>
      </Card>

      <Card padded={false}>
        <div id="notifications" className="flex items-center gap-2 border-b border-ui-border px-5 py-3.5">
          <Bell size={16} className="text-ui-subtle" />
          <h2 className="text-sm font-semibold text-ui-text">Notifications</h2>
        </div>
        {!prefs ? (
          <div className="p-5">
            <SkeletonRows rows={4} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[460px] text-sm">
              <thead className="text-xs text-ui-subtle">
                <tr>
                  <th className="px-5 py-2 text-left font-medium">Category</th>
                  <th className="w-24 px-3 py-2 font-medium">In app</th>
                  <th className="w-24 px-3 py-2 font-medium">Push</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ui-border">
                {prefs.map((p) => (
                  <tr key={p.category}>
                    <td className="px-5 py-3">
                      <span className="block font-medium text-ui-text">{CATEGORY_LABEL[p.category]?.[0] ?? p.category}</span>
                      <span className="text-xs text-ui-subtle">{CATEGORY_LABEL[p.category]?.[1]}</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      {p.category === 'messages' ? <span className="text-xs text-ui-subtle">Badge only</span> : <Toggle checked={p.inApp} onChange={(v) => setPref(p.category, { inApp: v })} label={`${p.category} in app`} />}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <Toggle checked={p.push} onChange={(v) => setPref(p.category, { push: v })} label={`${p.category} push`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="border-t border-ui-border px-5 py-3 text-xs text-ui-subtle">Push notifications are delivered to the Android app. Mute a single conversation from its details panel.</p>
      </Card>

      <Card padded={false}>
        <div className="flex items-center gap-2 border-b border-ui-border px-5 py-3.5">
          <Bookmark size={16} className="text-ui-subtle" />
          <h2 className="text-sm font-semibold text-ui-text">Saved messages</h2>
        </div>
        {!saved ? (
          <div className="p-5">
            <SkeletonRows rows={2} />
          </div>
        ) : saved.length === 0 ? (
          <EmptyState icon={Bookmark} title="Nothing saved yet" text="Use “Save for later” on any message." />
        ) : (
          <ul className="divide-y divide-ui-border">
            {saved.map((m) => (
              <li key={m._id} className="flex gap-3 px-5 py-3">
                <Avatar name={senderOf(m).username || '?'} src={senderOf(m).avatar} size={28} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-ui-subtle">
                    <b className="text-ui-text">{senderOf(m).username}</b> · {format(new Date(m.createdAt), 'MMM d, yyyy')}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-sm text-ui-text">{m.text || m.fileName || 'Attachment'}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card padded={false}>
        <div className="flex items-center gap-2 border-b border-ui-border px-5 py-3.5">
          <Ban size={16} className="text-ui-subtle" />
          <h2 className="text-sm font-semibold text-ui-text">Blocked people</h2>
        </div>
        {!blocked ? (
          <div className="p-5">
            <SkeletonRows rows={2} />
          </div>
        ) : blocked.length === 0 ? (
          <p className="px-5 py-5 text-sm text-ui-subtle">You haven’t blocked anyone.</p>
        ) : (
          <ul className="divide-y divide-ui-border">
            {blocked.map((b) => (
              <li key={b._id} className="flex items-center gap-3 px-5 py-3">
                <Avatar name={b.username} src={b.avatar} size={30} />
                <span className="flex-1 text-sm text-ui-text">{b.username}</span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    await usersApi.unblock(b._id);
                    setBlocked((l) => l && l.filter((x) => x._id !== b._id));
                    toast.success(`${b.username} unblocked`);
                  }}
                >
                  Unblock
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </PageBody>
  );
}
