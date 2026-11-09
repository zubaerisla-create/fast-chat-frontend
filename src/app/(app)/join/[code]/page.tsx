'use client';

import InviteLanding from '@/components/app/InviteLanding';
import { conversations } from '@/lib/saas';

export default function JoinGroupPage({ params }: { params: { code: string } }) {
  return (
    <InviteLanding
      nextPath={`/join/${params.code}`}
      load={async () => {
        const g = await conversations.previewInvite(params.code);
        return { title: g.title, subtitle: `${g.memberCount} members${g.description ? ` · ${g.description}` : ''}`, state: g.isMember ? 'member' : 'pending' };
      }}
      accept={async () => `/messages/${(await conversations.joinInvite(params.code)).id}`}
    />
  );
}
