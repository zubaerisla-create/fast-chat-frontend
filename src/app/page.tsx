'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (user) router.push('/chat');
      else router.push('/auth');
    }
  }, [user, isLoading, router]);

  return (
    <div className="flex items-center justify-center h-[100dvh] bg-[#0D0D1A]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#7C6EFF] to-[#A89CFF] animate-pulse" />
        <p className="text-white/40 text-sm font-sans">Loading fast-chat...</p>
      </div>
    </div>
  );
}
