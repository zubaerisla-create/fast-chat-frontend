'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, ArrowLeft, Phone, Video } from 'lucide-react';
import { Conversation, Message } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useCall } from '@/context/CallContext';
import { getMessages, sendMessage } from '@/lib/api';
import MessageBubble from './MessageBubble';
import Avatar from '@/components/ui/Avatar';
import toast from 'react-hot-toast';
import { format, isToday, isYesterday } from 'date-fns';

interface ChatWindowProps {
  conversation: Conversation;
  onBack?: () => void;
}

function DateDivider({ date }: { date: string }) {
  const d = new Date(date);
  const label = isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'MMMM d, yyyy');
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-white/5" />
      <span className="text-[10px] text-white/25 font-sans uppercase tracking-widest">{label}</span>
      <div className="flex-1 h-px bg-white/5" />
    </div>
  );
}

export default function ChatWindow({ conversation, onBack }: ChatWindowProps) {
  const { user } = useAuth();
  const { startCall } = useCall();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const other = conversation.participants.find((p) => p._id !== user?._id);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await getMessages(conversation._id);
      setMessages(res.data.messages || []);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, [conversation._id]);

  useEffect(() => {
    setIsLoading(true);
    setMessages([]);
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || isSending) return;
    const msgText = text.trim();
    setText('');
    setIsSending(true);

    // Optimistic update
    const optimistic: Message = {
      _id: `temp-${Date.now()}`,
      conversationId: conversation._id,
      senderId: { _id: user!._id, username: user!.username, avatar: '' },
      text: msgText,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const res = await sendMessage(conversation._id, msgText);
      setMessages((prev) =>
        prev.map((m) => (m._id === optimistic._id ? res.data.message : m))
      );
    } catch {
      toast.error('Failed to send message');
      setMessages((prev) => prev.filter((m) => m._id !== optimistic._id));
      setText(msgText);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Group messages by date
  const groupedMessages: { date: string; messages: Message[] }[] = [];
  messages.forEach((msg) => {
    const dateKey = format(new Date(msg.createdAt), 'yyyy-MM-dd');
    const lastGroup = groupedMessages[groupedMessages.length - 1];
    if (lastGroup && lastGroup.date === dateKey) {
      lastGroup.messages.push(msg);
    } else {
      groupedMessages.push({ date: dateKey, messages: [msg] });
    }
  });

  return (
    <div className="flex flex-col h-full flex-1">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-[rgba(124,110,255,0.1)] glass">
        {onBack && (
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-all md:hidden"
          >
            <ArrowLeft size={16} />
          </button>
        )}
        <Avatar username={other?.username || '?'} size="md" isOnline={other?.isOnline} />
        <div>
          <h2 className="font-display font-semibold text-white text-base">{other?.username}</h2>
          <p className="text-xs text-white/30 font-sans">
            {other?.isOnline ? (
              <span className="text-green-400">Online</span>
            ) : (
              'Offline'
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => other && startCall(other._id, 'audio')}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white/40 hover:text-[#7C6EFF] hover:bg-[#7C6EFF]/10 transition-all"
            title="Audio Call"
          >
            <Phone size={18} />
          </button>
          <button
            onClick={() => other && startCall(other._id, 'video')}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white/40 hover:text-[#7C6EFF] hover:bg-[#7C6EFF]/10 transition-all"
            title="Video Call"
          >
            <Video size={20} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-[#7C6EFF]/50 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7C6EFF]/20 to-[#A89CFF]/10 flex items-center justify-center">
              <span className="text-3xl">👋</span>
            </div>
            <p className="text-white/25 text-sm font-sans">
              Say hi to <span className="text-white/40">{other?.username}</span>!
            </p>
          </div>
        ) : (
          groupedMessages.map((group, gi) => (
            <div key={gi}>
              <DateDivider date={group.messages[0].createdAt} />
              <div className="space-y-2">
                {group.messages.map((msg, mi) => {
                  const prevMsg = group.messages[mi - 1];
                  const showAvatar =
                    !prevMsg || prevMsg.senderId._id !== msg.senderId._id;
                  return (
                    <MessageBubble key={msg._id} message={msg} showAvatar={showAvatar} />
                  );
                })}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-4 border-t border-[rgba(124,110,255,0.1)]">
        <div className="flex items-end gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 focus-within:border-[#7C6EFF]/40 transition-all">
          <textarea
            ref={inputRef}
            rows={1}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${other?.username || ''}...`}
            className="flex-1 bg-transparent text-sm text-white placeholder-white/20 outline-none resize-none font-sans leading-relaxed max-h-[120px] overflow-y-auto"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || isSending}
            className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-[#7C6EFF] to-[#6A5EE0] text-white transition-all hover:opacity-90 hover:shadow-lg hover:shadow-[#7C6EFF]/30 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {isSending ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send size={14} />
            )}
          </button>
        </div>
        <p className="text-[10px] text-white/15 text-center mt-2 font-sans">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
