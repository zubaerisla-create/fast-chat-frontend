'use client';

import { Message } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import Avatar from '@/components/ui/Avatar';

interface MessageBubbleProps {
  message: Message;
  showAvatar?: boolean;
}

export default function MessageBubble({ message, showAvatar = true }: MessageBubbleProps) {
  const { user } = useAuth();
  const isOwn = message.senderId._id === user?._id;

  return (
    <div className={`flex items-end gap-2 message-animate ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className="w-7 flex-shrink-0">
        {showAvatar && !isOwn && (
          <Avatar username={message.senderId.username} size="sm" />
        )}
      </div>

      {/* Bubble */}
      <div className={`max-w-[70%] group`}>
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm font-sans leading-relaxed ${
            isOwn
              ? 'bg-gradient-to-br from-[#7C6EFF] to-[#6A5EE0] text-white rounded-br-sm'
              : 'bg-white/8 border border-white/8 text-white/90 rounded-bl-sm'
          }`}
        >
          {message.text}
        </div>
        <p
          className={`text-[10px] text-white/20 font-sans mt-1 ${
            isOwn ? 'text-right' : 'text-left'
          }`}
        >
          {format(new Date(message.createdAt), 'h:mm a')}
        </p>
      </div>
    </div>
  );
}
