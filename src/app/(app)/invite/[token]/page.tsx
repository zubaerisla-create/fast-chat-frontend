'use client';

import InviteLanding from '@/components/app/InviteLanding';
import { invitations } from '@/lib/saas';

const STATE_TEXT = { accepted: 'This invitation has already been used.', expired: 'This invitation has expired. Ask for a new one.', revoked: 'This invitation was revoked.' } as const;

export default function InvitePage({ params }: { params: { token: string } }) {
  return (
    <InviteLanding
      nextPath={`/invite/${params.token}`}
      load={async () => {
        const inv = await invitations.preview(params.token);
        return {
          title: inv.workspace.name,
          subtitle: inv.state === 'pending' ? `${inv.invitedBy} invited ${inv.email} to join as ${inv.role}.` : STATE_TEXT[inv.state],
          state: inv.state,
        };
      }}
      accept={async () => `/w/${(await invitations.accept(params.token)).id}`}
    />
  );
}
