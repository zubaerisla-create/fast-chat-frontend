'use client';

import { Message } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import Avatar from '@/components/ui/Avatar';
import { Download, FileText, Film, Play, Pause, Mic } from 'lucide-react';
import { useState, useRef } from 'react';

interface MessageBubbleProps {
  message: Message;
  showAvatar?: boolean;
}

function VoicePlayer({ url }: { url: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const onTimeUpdate = () => {
    if (audioRef.current) {
      const p = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setProgress(p || 0);
    }
  };

  const onEnded = () => {
    setIsPlaying(false);
    setProgress(0);
  };

  return (
    <div className="flex items-center gap-3 py-1 px-1 min-w-[200px]">
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={onTimeUpdate}
        onEnded={onEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        className="hidden"
      />
      <button
        onClick={togglePlay}
        className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all active:scale-90"
      >
        {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-1" />}
      </button>
      <div className="flex-1 flex flex-col gap-1.5">
        <div className="flex items-center gap-1 h-3">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className={`flex-1 rounded-full transition-all duration-300 ${progress > (i / 20) * 100 ? 'bg-[#7C6EFF]' : 'bg-white/20'
                }`}
              style={{
                height: `${Math.random() * 60 + 40}%`,
              }}
            />
          ))}
        </div>
        <div className="flex justify-between items-center px-0.5">
          <div className="flex items-center gap-1 text-[9px] text-white/40 uppercase font-bold tracking-tighter">
            <Mic size={8} />
            Voice Note
          </div>
        </div>
      </div>
    </div>
  );
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
              ) : (message.fileType === 'voice' ||
                (message.fileUrl && /\.(webm|mp3|wav|ogg|m4a)$/i.test(message.fileUrl))) ? (
                <VoicePlayer url={message.fileUrl} />
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
