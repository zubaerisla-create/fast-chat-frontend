'use client';

import ConversationScreen from '@/components/app/chat/ConversationScreen';

export default function ChannelPage({ params }: { params: { wsId: string; channelId: string } }) {
  return <ConversationScreen id={params.channelId} backHref={`/w/${params.wsId}`} />;
}
