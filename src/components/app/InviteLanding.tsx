'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ThemeProvider } from './theme';
import { Avatar, Button } from './ui';
import { errorMessage } from '@/lib/saas';

export interface InviteInfo {
  title: string;
  subtitle: string;
  state: 'pending' | 'accepted' | 'expired' | 'revoked' | 'member' | 'invalid';
}

/** Centered card used by workspace invitations and group invite links. */
export default function InviteLanding({ load, accept, nextPath }: { load: () => Promise<InviteInfo>; accept: () => Promise<string>; nextPath: string }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    load().then(setInfo).catch(() => setInfo({ title: 'Invitation not found', subtitle: 'This link is invalid or was reset.', state: 'invalid' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const go = async () => {
    setBusy(true);
    setError(null);
    try {
      router.push(await accept());
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };
  const loginHref = `/auth?next=${encodeURIComponent(nextPath)}`;
  return (
    <ThemeProvider>
      <div className="app-root flex min-h-[100dvh] items-center justify-center bg-ui-bg px-4 text-ui-text">
        <div className="w-full max-w-sm rounded-2xl border border-ui-border bg-ui-panel p-8 text-center shadow-sm">
          <Image src="/brand/fastchat-icon.png" alt="FastChat" width={40} height={40} className="mx-auto rounded-xl" />
          {!info || isLoading ? (
            <Loader2 className="mx-auto mt-8 animate-spin text-ui-subtle" />
          ) : (
            <>
              <div className="mt-6 flex justify-center">
                <Avatar name={info.title} square size={56} />
              </div>
              <h1 className="mt-4 text-lg font-semibold">{info.title}</h1>
              <p className="mt-1 text-sm text-ui-muted">{info.subtitle}</p>
              {error && (
                <p role="alert" className="mt-4 rounded-lg bg-ui-danger/10 p-3 text-sm text-ui-danger">
                  {error}
                </p>
              )}
              <div className="mt-6">
                {info.state === 'pending' || info.state === 'member' ? (
                  user ? (
                    <Button className="w-full" onClick={go} loading={busy}>
                      {info.state === 'member' ? 'Open' : 'Accept and join'}
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <Link href={loginHref}>
                        <Button className="w-full">Sign in to accept</Button>
                      </Link>
                      <Link href={`/auth?mode=register&next=${encodeURIComponent(nextPath)}`} className="block text-sm text-ui-accent-text hover:underline">
                        New to FastChat? Create an account
                      </Link>
                    </div>
                  )
                ) : (
                  <Link href={user ? '/home' : '/'}>
                    <Button variant="secondary" className="w-full">
                      Go to FastChat
                    </Button>
                  </Link>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </ThemeProvider>
  );
}
