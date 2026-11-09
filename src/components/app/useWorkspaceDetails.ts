'use client';

import { useCallback, useEffect, useState } from 'react';
import { workspaces as wsApi } from '@/lib/saas';

export type WorkspaceDetails = Awaited<ReturnType<typeof wsApi.get>>;

/** Workspace + the caller's permissions (computed by the server's RBAC) + owner plan limits. */
export function useWorkspaceDetails(id: string) {
  const [data, setData] = useState<WorkspaceDetails | null>(null);
  const [error, setError] = useState(false);
  const reload = useCallback(
    () =>
      wsApi
        .get(id)
        .then((d) => {
          setData(d);
          setError(false);
        })
        .catch(() => setError(true)),
    [id]
  );
  useEffect(() => {
    setData(null);
    reload();
  }, [reload]);
  const can = (p: string) => Boolean(data?.permissions[p]);
  return { data, error, reload, can };
}
