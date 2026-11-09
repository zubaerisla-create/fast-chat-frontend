'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Bell,
  Building2,
  CheckSquare,
  ChevronDown,
  CreditCard,
  Hash,
  Home,
  Lock,
  LogOut,
  Menu as MenuIcon,
  MessagesSquare,
  Moon,
  Plus,
  Settings,
  Shield,
  Sun,
  UserPlus,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { useWorkspaces } from '@/context/WorkspaceContext';
import { notificationsApi, workspaces as wsApi, type Channel } from '@/lib/saas';
import { Avatar, Count, Menu, cx } from './ui';
import { useTheme } from './theme';
import CreateWorkspaceModal from './CreateWorkspaceModal';

function NavItem({ href, icon: Icon, label, count, active, onNavigate }: { href: string; icon: typeof Home; label: string; count?: number; active: boolean; onNavigate?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cx(
        'group flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] transition-colors',
        active ? 'bg-ui-sunken font-medium text-ui-text' : 'text-ui-muted hover:bg-ui-sunken/70 hover:text-ui-text'
      )}
    >
      <Icon size={16} className={active ? 'text-ui-accent' : 'text-ui-subtle group-hover:text-ui-muted'} aria-hidden />
      <span className="flex-1 truncate">{label}</span>
      {count ? <Count n={count} /> : null}
    </Link>
  );
}

/** Channel list for the current workspace, kept fresh by realtime events. */
function useChannels(workspaceId: string | null) {
  const { socket } = useSocket();
  const [channels, setChannels] = useState<Channel[]>([]);
  const load = useCallback(() => {
    if (!workspaceId) return setChannels([]);
    wsApi.channels(workspaceId).then(setChannels).catch(() => setChannels([]));
  }, [workspaceId]);
  useEffect(load, [load]);
  useEffect(() => {
    if (!socket || !workspaceId) return;
    let t: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(t);
      t = setTimeout(load, 400);
    };
    const events = ['receiveMessage', 'messagesSeen', 'conversationAdded', 'conversationRemoved', 'conversationUpdated', 'fc:channelsChanged'];
    events.forEach((e) => socket.on(e, refresh));
    window.addEventListener('fc:channelsChanged', refresh);
    return () => {
      clearTimeout(t);
      events.forEach((e) => socket.off(e, refresh));
      window.removeEventListener('fc:channelsChanged', refresh);
    };
  }, [socket, workspaceId, load]);
  return channels;
}

function Sidebar({ onNavigate, unread }: { onNavigate?: () => void; unread: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { current, me } = useWorkspaces();
  const { theme, toggle } = useTheme();
  const channels = useChannels(current?.id ?? null);
  const joined = channels.filter((c) => c.joined);
  const is = (p: string) => pathname === p || pathname.startsWith(`${p}/`);

  return (
    <div className="flex h-full w-full flex-col bg-ui-panel">
      {/* Context header */}
      <div className="flex h-14 flex-shrink-0 items-center border-b border-ui-border px-3">
        {current ? (
          <Menu
            align="left"
            trigger={(open, t) => (
              <button type="button" onClick={t} aria-expanded={open} className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left hover:bg-ui-sunken">
                <Avatar name={current.name} square size={26} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ui-text">{current.name}</span>
                  <span className="block truncate text-[11px] capitalize text-ui-subtle">{current.myRole}</span>
                </span>
                <ChevronDown size={15} className="text-ui-subtle" aria-hidden />
              </button>
            )}
            items={[
              { label: 'Workspace overview', icon: Home, onClick: () => router.push(`/w/${current.id}`) },
              { label: 'Invite people', icon: UserPlus, onClick: () => router.push(`/w/${current.id}/members?invite=1`) },
              { label: 'Members', icon: Users, onClick: () => router.push(`/w/${current.id}/members`) },
              { label: 'Workspace settings', icon: Settings, onClick: () => router.push(`/w/${current.id}/settings`) },
              'divider',
              { label: 'Organizations', icon: Building2, onClick: () => router.push('/organizations') },
            ]}
          />
        ) : (
          <div className="flex items-center gap-2.5 px-1.5">
            <Avatar name={user?.username || 'Me'} src={user?.avatar} size={26} />
            <div>
              <p className="text-sm font-semibold text-ui-text">Personal</p>
              <p className="text-[11px] text-ui-subtle">Direct messages and groups</p>
            </div>
          </div>
        )}
      </div>

      <nav aria-label="App" className="flex-1 space-y-5 overflow-y-auto px-2.5 py-3">
        <div className="space-y-0.5">
          <NavItem href="/home" icon={Home} label="Home" active={is('/home')} onNavigate={onNavigate} />
          <NavItem href="/messages" icon={MessagesSquare} label="Messages" active={is('/messages')} onNavigate={onNavigate} />
          <NavItem href="/tasks" icon={CheckSquare} label="Tasks" active={is('/tasks')} onNavigate={onNavigate} />
          <NavItem href="/finance" icon={Wallet} label="Finance" active={is('/finance')} onNavigate={onNavigate} />
          <NavItem href="/notifications" icon={Bell} label="Notifications" count={unread} active={is('/notifications')} onNavigate={onNavigate} />
        </div>

        {current && (
          <div>
            <div className="flex items-center justify-between px-2.5 pb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ui-subtle">Channels</span>
              <Link href={`/w/${current.id}/channels?new=1`} onClick={onNavigate} aria-label="Create channel" className="rounded p-0.5 text-ui-subtle hover:bg-ui-sunken hover:text-ui-text">
                <Plus size={14} aria-hidden />
              </Link>
            </div>
            <div className="space-y-0.5">
              {joined.map((c) => {
                const href = `/w/${current.id}/c/${c.id}`;
                const active = pathname === href;
                return (
                  <Link
                    key={c.id}
                    href={href}
                    onClick={onNavigate}
                    className={cx(
                      'flex h-8 items-center gap-2 rounded-lg px-2.5 text-[13.5px] transition-colors',
                      active ? 'bg-ui-accent-soft font-medium text-ui-accent-text' : c.unreadCount ? 'font-semibold text-ui-text hover:bg-ui-sunken' : 'text-ui-muted hover:bg-ui-sunken hover:text-ui-text'
                    )}
                  >
                    {c.visibility === 'private' ? <Lock size={14} aria-hidden className="opacity-70" /> : <Hash size={14} aria-hidden className="opacity-70" />}
                    <span className="flex-1 truncate">{c.name}</span>
                    {!c.muted && <Count n={c.unreadCount} />}
                  </Link>
                );
              })}
              <NavItem href={`/w/${current.id}/channels`} icon={Plus} label="Browse channels" active={is(`/w/${current.id}/channels`)} onNavigate={onNavigate} />
            </div>
          </div>
        )}

        {current && (
          <div className="space-y-0.5">
            <span className="block px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-ui-subtle">Workspace</span>
            <NavItem href={`/w/${current.id}/members`} icon={Users} label="Members" active={is(`/w/${current.id}/members`)} onNavigate={onNavigate} />
            <NavItem href={`/w/${current.id}/settings`} icon={Settings} label="Settings" active={is(`/w/${current.id}/settings`)} onNavigate={onNavigate} />
          </div>
        )}

        <div className="space-y-0.5">
          <span className="block px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-ui-subtle">Account</span>
          <NavItem href="/organizations" icon={Building2} label="Organizations" active={is('/organizations')} onNavigate={onNavigate} />
          <NavItem href="/billing" icon={CreditCard} label="Plan & billing" active={is('/billing')} onNavigate={onNavigate} />
          {me?.role === 'admin' && <NavItem href="/admin" icon={Shield} label="Admin" active={is('/admin')} onNavigate={onNavigate} />}
        </div>
      </nav>

      {/* User */}
      <div className="flex-shrink-0 border-t border-ui-border p-2.5">
        <Menu
          align="left"
          trigger={(open, t) => (
            <button type="button" onClick={t} aria-expanded={open} className="flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left hover:bg-ui-sunken">
              <Avatar name={user?.username || '?'} src={user?.avatar} size={30} online />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-ui-text">{user?.username}</span>
                <span className="block truncate text-[11px] text-ui-subtle">{user?.email}</span>
              </span>
            </button>
          )}
          items={[
            { label: 'Profile & settings', icon: Settings, onClick: () => router.push('/settings') },
            { label: theme === 'dark' ? 'Light mode' : 'Dark mode', icon: theme === 'dark' ? Sun : Moon, onClick: toggle },
            'divider',
            {
              label: 'Sign out',
              icon: LogOut,
              danger: true,
              onClick: () => {
                logout();
                router.push('/auth');
              },
            },
          ]}
        />
      </div>
    </div>
  );
}

/** Narrow rail: personal space, each workspace, create workspace. */
function Rail({ onPick }: { onPick?: () => void }) {
  const { workspaces, current, setCurrentId } = useWorkspaces();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  return (
    <div className="flex h-full w-[60px] flex-shrink-0 flex-col items-center gap-2 border-r border-ui-border bg-ui-sunken py-3">
      <Link href="/home" aria-label="FastChat home" className="mb-1">
        <Image src="/brand/fastchat-icon.png" alt="" width={32} height={32} className="rounded-[9px]" />
      </Link>
      <div className="h-px w-7 bg-ui-border" />
      <RailButton
        label="Personal — direct messages and groups"
        active={!current}
        onClick={() => {
          setCurrentId(null);
          router.push('/messages');
          onPick?.();
        }}
      >
        <MessagesSquare size={18} aria-hidden />
      </RailButton>
      {workspaces.map((w) => (
        <RailButton
          key={w.id}
          label={w.name}
          active={current?.id === w.id}
          dot={Boolean(w.unreadCount)}
          onClick={() => {
            setCurrentId(w.id);
            router.push(`/w/${w.id}`);
            onPick?.();
          }}
        >
          <Avatar name={w.name} square size={36} />
        </RailButton>
      ))}
      <RailButton label="Create a workspace" onClick={() => setCreating(true)}>
        <Plus size={18} aria-hidden />
      </RailButton>
      <CreateWorkspaceModal open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

function RailButton({ label, active, dot, onClick, children }: { label: string; active?: boolean; dot?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <div className="relative">
      {active && <span className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-ui-text" aria-hidden />}
      <button
        type="button"
        title={label}
        aria-label={label}
        aria-pressed={active}
        onClick={onClick}
        className={cx(
          'flex h-10 w-10 items-center justify-center rounded-xl transition-all',
          active ? 'bg-ui-panel text-ui-accent shadow-sm ring-1 ring-ui-border' : 'text-ui-muted hover:bg-ui-panel hover:text-ui-text'
        )}
      >
        {children}
      </button>
      {dot && !active && <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full border-2 border-ui-sunken bg-ui-accent" aria-label="Unread messages" />}
    </div>
  );
}

/** Live unread notification count + toast for each new notification. */
function useNotificationBadge() {
  const { socket } = useSocket();
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    notificationsApi.list(true).then((r) => setUnread(r.unread)).catch(() => {});
    const onRead = () => notificationsApi.list(true).then((r) => setUnread(r.unread)).catch(() => {});
    window.addEventListener('fc:notificationsRead', onRead);
    return () => window.removeEventListener('fc:notificationsRead', onRead);
  }, []);
  useEffect(() => {
    if (!socket) return;
    const onNew = ({ notification }: { notification: { title: string; body: string | null } }) => {
      setUnread((n) => n + 1);
      toast(notification.body ? `${notification.title}\n${notification.body}` : notification.title, { icon: '🔔' });
    };
    socket.on('notification', onNew);
    return () => {
      socket.off('notification', onNew);
    };
  }, [socket]);
  return unread;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [drawer, setDrawer] = useState(false);
  const pathname = usePathname();
  const unread = useNotificationBadge();
  const { setCurrentId, current } = useWorkspaces();

  // /w/<id>/… selects that workspace
  useEffect(() => {
    const m = pathname.match(/^\/w\/([0-9a-f-]{36})/);
    if (m && current?.id !== m[1]) setCurrentId(m[1]);
  }, [pathname, current?.id, setCurrentId]);
  useEffect(() => setDrawer(false), [pathname]);
  const inChat = /^\/(messages\/[^/]+|w\/[^/]+\/c\/[^/]+)/.test(pathname);

  return (
    <div className="app-root flex h-[100dvh] overflow-hidden bg-ui-bg text-ui-text">
      {/* Desktop */}
      <div className="hidden md:flex">
        <Rail />
        <div className="w-[248px] flex-shrink-0 border-r border-ui-border">
          <Sidebar unread={unread} />
        </div>
      </div>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="animate-slide-in flex h-full shadow-2xl">
            <Rail onPick={() => setDrawer(false)} />
            <div className="w-[272px] max-w-[calc(100vw-60px-48px)] border-r border-ui-border">
              <Sidebar unread={unread} onNavigate={() => setDrawer(false)} />
            </div>
          </div>
          <button type="button" aria-label="Close menu" className="flex-1 bg-black/40" onClick={() => setDrawer(false)} />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Inside a conversation the chat header (with its back button) replaces this bar on mobile */}
        <div className={cx('h-12 flex-shrink-0 items-center gap-2 border-b border-ui-border bg-ui-panel px-2 md:hidden', inChat ? 'hidden' : 'flex')}>
          <button type="button" aria-label="Open menu" onClick={() => setDrawer(true)} className="rounded-lg p-2 text-ui-muted hover:bg-ui-sunken">
            {drawer ? <X size={20} /> : <MenuIcon size={20} />}
          </button>
          <span className="flex-1 truncate text-sm font-semibold">{current?.name ?? 'FastChat'}</span>
          <Link href="/notifications" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} className="relative rounded-lg p-2 text-ui-muted hover:bg-ui-sunken">
            <Bell size={19} />
            {unread > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-ui-accent" />}
          </Link>
        </div>
        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}

/** Scrollable page body with consistent padding. */
export function PageBody({ children, className, wide }: { children: React.ReactNode; className?: string; wide?: boolean }) {
  return (
    <div className="h-full overflow-y-auto">
      <div className={cx('mx-auto w-full space-y-6 px-4 py-6 sm:px-8 sm:py-8', wide ? 'max-w-6xl' : 'max-w-5xl', className)}>{children}</div>
    </div>
  );
}
