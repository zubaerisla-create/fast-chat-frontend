'use client';

import ConversationScreen from '@/components/app/chat/ConversationScreen';

export default function ConversationPage({ params }: { params: { id: string } }) {
  return <ConversationScreen id={params.id} backHref="/messages" />;
}
