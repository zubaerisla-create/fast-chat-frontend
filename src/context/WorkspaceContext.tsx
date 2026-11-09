'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { workspaces as wsApi, type Workspace } from '@/lib/saas';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

interface WorkspaceContextValue {
  workspaces: Workspace[];
  loading: boolean;
  /** null = personal space (direct messages and groups) */
  current: Workspace | null;
  setCurrentId: (id: string | null) => void;
  refresh: () => Promise<void>;
  me: { role: string } | null;
}

const Ctx = createContext<WorkspaceContextValue | null>(null);
const STORAGE_KEY = 'fc.currentWorkspace';

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [list, setList] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentId, setCurrent] = useState<string | null>(null);
  const [me, setMe] = useState<{ role: string } | null>(null);

  const refresh = useCallback(async () => {
    try {
      setList(await wsApi.list());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    try {
      setCurrent(localStorage.getItem(STORAGE_KEY));
    } catch {}
    refresh();
    import('@/lib/api').then(({ default: api }) => api.get('/api/users/me').then((r) => setMe({ role: r.data.user.role })).catch(() => {}));
  }, [user, refresh]);

  // Membership changes elsewhere (invited, removed, renamed) refresh the switcher
  useEffect(() => {
    if (!socket) return;
    const onChange = () => refresh();
    socket.on('workspaceUpdated', onChange);
    socket.on('workspaceRemoved', onChange);
    return () => {
      socket.off('workspaceUpdated', onChange);
      socket.off('workspaceRemoved', onChange);
    };
  }, [socket, refresh]);

  const setCurrentId = useCallback((id: string | null) => {
    setCurrent(id);
    try {
      if (id) localStorage.setItem(STORAGE_KEY, id);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  const current = useMemo(() => list.find((w) => w.id === currentId) ?? null, [list, currentId]);
  const value = useMemo(() => ({ workspaces: list, loading, current, setCurrentId, refresh, me }), [list, loading, current, setCurrentId, refresh, me]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWorkspaces() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useWorkspaces must be used inside WorkspaceProvider');
  return v;
}
