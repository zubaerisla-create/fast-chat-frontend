'use client';

import { Message } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import Avatar from '@/components/ui/Avatar';
import { Download, FileText, Film } from 'lucide-react';

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
          className={`px-4 py-2.5 rounded-2xl text-sm font-sans leading-relaxed ${isOwn
              ? 'bg-gradient-to-br from-[#7C6EFF] to-[#6A5EE0] text-white rounded-br-sm'
              : 'bg-white/8 border border-white/8 text-white/90 rounded-bl-sm'
            }`}
        >
          {message.fileUrl && (
            <div className="mb-2 max-w-full overflow-hidden rounded-lg">
              {message.fileType === 'image' ? (
                <div className="relative group">
                  <img
                    src={message.fileUrl}
                    alt={message.fileName || 'Attachment'}
                    className="max-h-60 w-auto object-contain rounded-lg cursor-pointer hover:opacity-95 transition-opacity"
                    onClick={() => window.open(message.fileUrl, '_blank')}
                  />
                </div>
              ) : message.fileType === 'video' ? (
                <video
                  src={message.fileUrl}
                  controls
                  className="max-h-60 w-full rounded-lg bg-black/20"
                />
              ) : (
                <a
                  href={message.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-black/20 hover:bg-black/30 rounded-xl transition-all border border-white/5 group/file"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#7C6EFF]/20 flex items-center justify-center text-[#7C6EFF] group-hover/file:bg-[#7C6EFF]/30 transition-all">
                    <FileText size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate transition-colors">
                      {message.fileName || 'Download File'}
                    </p>
                    {message.fileSize && (
                      <p className="text-[10px] opacity-40 mt-0.5">
                        {(message.fileSize / 1024 / 1024).toFixed(2)} MB
                      </p>
                    )}
                  </div>
                  <Download size={16} className="opacity-40 group-hover/file:opacity-100 transition-all mr-1" />
                </a>
              )}
            </div>
          )}
          {message.text && <p>{message.text}</p>}
        </div>
        <p
          className={`text-[10px] text-white/20 font-sans mt-1 ${isOwn ? 'text-right' : 'text-left'
            }`}
        >
          {format(new Date(message.createdAt), 'h:mm a')}
        </p>
      </div>
    </div>
  );
}
