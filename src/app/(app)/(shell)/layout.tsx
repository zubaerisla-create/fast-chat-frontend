'use client';

import RequireAuth from '@/components/providers/RequireAuth';
import { WorkspaceProvider } from '@/context/WorkspaceContext';
import { ThemeProvider } from '@/components/app/theme';
import AppShell from '@/components/app/AppShell';

// The signed-in product: workspace rail, sidebar and pages share one shell
export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <ThemeProvider>
        <WorkspaceProvider>
          <AppShell>{children}</AppShell>
        </WorkspaceProvider>
      </ThemeProvider>
    </RequireAuth>
  );
}
