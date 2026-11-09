'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, MessagesSquare } from 'lucide-react';
import { useSocket } from '@/context/SocketContext';
import { conversations as convApi, type Conversation } from '@/lib/saas';
import { EmptyState, Skeleton } from '../ui';
import ChatView from './ChatView';
import ConversationInfo from './ConversationInfo';

/** Loads a conversation and shows the chat with an optional details panel. */
export default function ConversationScreen({ id, backHref }: { id: string; backHref?: string }) {
  const { socket } = useSocket();
  const [conv, setConv] = useState<Conversation | null | undefined>(undefined);
  const [info, setInfo] = useState(false);
  const load = useCallback(() => convApi.get(id).then(setConv).catch(() => setConv(null)), [id]);
  useEffect(() => {
    setConv(undefined);
    load();
  }, [load]);
  useEffect(() => {
    if (!socket) return;
    const onUpdate = (p: { conversationId: string }) => p.conversationId === id && load();
    const onRemoved = (p: { conversationId: string }) => p.conversationId === id && setConv(null);
    socket.on('conversationUpdated', onUpdate);
    socket.on('conversationRemoved', onRemoved);
    return () => {
      socket.off('conversationUpdated', onUpdate);
      socket.off('conversationRemoved', onRemoved);
    };
  }, [socket, id, load]);

  if (conv === undefined) {
    return (
      <div className="flex h-full w-full flex-col">
        <div className="flex h-14 items-center gap-3 border-b border-ui-border bg-ui-panel px-5">
          <Skeleton className="h-8 w-8 !rounded-full" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex-1" />
      </div>
    );
  }
  if (conv === null) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <EmptyState icon={MessagesSquare} title="Conversation not available" text="It may have been deleted, or you’re no longer a member." />
      </div>
    );
  }
  return (
    <div className="flex h-full w-full">
      <ChatView
        conversation={conv}
        infoOpen={info}
        onOpenInfo={() => setInfo((v) => !v)}
        backButton={
          backHref ? (
            <Link href={backHref} aria-label="Back" className="-ml-1 rounded-lg p-1.5 text-ui-muted hover:bg-ui-sunken md:hidden">
              <ArrowLeft size={18} />
            </Link>
          ) : null
        }
      />
      {info && (
        <div className="fixed inset-0 z-40 lg:static lg:z-auto">
          <ConversationInfo conversation={conv} onClose={() => setInfo(false)} onChanged={(c) => setConv(c)} />
        </div>
      )}
    </div>
  );
}
