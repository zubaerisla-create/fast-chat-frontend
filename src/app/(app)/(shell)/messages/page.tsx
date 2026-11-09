'use client';

import { MessagesSquare } from 'lucide-react';
import { EmptyState } from '@/components/app/ui';

export default function MessagesIndex() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-ui-bg">
      <EmptyState icon={MessagesSquare} title="Pick a conversation" text="Choose a conversation on the left, or start a new message or group." />
    </div>
  );
}
