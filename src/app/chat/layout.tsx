'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth');
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[100dvh] bg-[#0D0D1A]">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7C6EFF] to-[#A89CFF] animate-pulse" />
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
