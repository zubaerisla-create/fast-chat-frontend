'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, ArrowLeft, Phone, Video, Paperclip, X, Image as ImageIcon, File as FileIcon, Film, Info, Mic, Trash2, StopCircle } from 'lucide-react';
import { Conversation, Message } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { useCall } from '@/context/CallContext';
import { getMessages, sendMessage, uploadFile, sendVoiceMessage } from '@/lib/api';
import MessageBubble from './MessageBubble';
import Avatar from '@/components/ui/Avatar';
import toast from 'react-hot-toast';
import { format, isToday, isYesterday } from 'date-fns';
import ConversationInfo from './ConversationInfo';

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
  const { socket, onlineUsers } = useSocket();
  const { startOutgoingCall } = useCall();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const other = conversation.participants.find((p) => p._id !== user?._id);
  const isOnline = other ? onlineUsers.includes(other._id) : false;
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isInitialLoad = useRef(true);
  const prevLastMessageId = useRef<string | null>(null);

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

    // Socket listener for real-time messages
    if (socket) {
      const handleNewMsg = (msg: Message) => {
        if (msg.conversationId === conversation._id && msg.senderId._id !== user?._id) {
          setMessages(prev => {
            if (prev.some(m => m._id === msg._id)) return prev;
            return [...prev, msg];
          });
        }
      };

      socket.on('newMessage', handleNewMsg);
      socket.on('receiveMessage', handleNewMsg); // As per user's latest backend spec

      return () => {
        clearInterval(interval);
        socket.off('newMessage', handleNewMsg);
        socket.off('receiveMessage', handleNewMsg);
      };
    }

    return () => clearInterval(interval);
  }, [fetchMessages, socket, conversation._id, user?._id]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    const isNewMessage = lastMessage._id !== prevLastMessageId.current;

    if (isNewMessage) {
      const isOwnMessage = lastMessage.senderId._id === user?._id;
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;

      if (isInitialLoad.current || isOwnMessage || isNearBottom) {
        bottomRef.current?.scrollIntoView({ behavior: isInitialLoad.current ? 'auto' : 'smooth' });
        if (isInitialLoad.current) isInitialLoad.current = false;
      }
      prevLastMessageId.current = lastMessage._id;
    }
  }, [messages, user?._id]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size (e.g., 20MB limit)
    if (file.size > 20 * 1024 * 1024) {
      toast.error('File too large (max 20MB)');
      return;
    }

    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Voice Recording Logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm';

        const audioBlob = new Blob(chunksRef.current, { type: mimeType });

        // Only send if it's longer than 1 second to avoid empty notes
        if (chunksRef.current.length > 0 && recordingTime >= 1) {
          handleSendVoice(audioBlob);
        } else if (recordingTime < 1) {
          toast.error('Recording too short');
        }
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      toast.error('Could not access microphone');
      console.error(err);
    }
  };

  const stopRecording = (shouldSend = true) => {
    if (mediaRecorderRef.current && isRecording) {
      if (!shouldSend) chunksRef.current = []; // Clear chunks if cancelled
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendVoice = async (blob: Blob) => {
    setIsSending(true);
    const tempId = `temp-voice-${Date.now()}`;

    // Optimistic update
    const optimistic: Message = {
      _id: tempId,
      conversationId: conversation._id,
      senderId: { _id: user!._id, username: user!.username, avatar: user!.avatar || '' },
      text: '',
      isRead: false,
      fileUrl: URL.createObjectURL(blob), // Local preview
      fileType: 'voice',
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);

    try {
      const res = await sendVoiceMessage(conversation._id, blob);
      setMessages(prev => prev.map(m => m._id === tempId ? res.data.message : m));

      if (socket) {
        socket.emit('sendMessage', {
          receiverId: other?._id,
          message: res.data.message
        });
      }
    } catch (err) {
      toast.error('Failed to send voice message');
      setMessages(prev => prev.filter(m => m._id !== tempId));
    } finally {
      setIsSending(false);
    }
  };

  const handleSend = async () => {
    if ((!text.trim() && !selectedFile) || isSending || isUploading) return;

    const msgText = text.trim();
    const currentFile = selectedFile;

    setText('');
    clearSelectedFile();
    setIsSending(true);

    // Optimistic placeholder for the file (only if image)
    const optimisticFileUrl = filePreview;

    // Optimistic update
    const optimistic: Message = {
      _id: `temp-${Date.now()}`,
      conversationId: conversation._id,
      senderId: { _id: user!._id, username: user!.username, avatar: '' },
      text: msgText,
      isRead: false,
      fileUrl: optimisticFileUrl || undefined,
      fileType: currentFile ? (currentFile.type.startsWith('image/') ? 'image' : currentFile.type.startsWith('video/') ? 'video' : 'file') : undefined,
      fileName: currentFile?.name,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      let fileData = {};

      if (currentFile) {
        setIsUploading(true);
        try {
          const uploadRes = await uploadFile(currentFile);
          if (uploadRes.data.success) {
            fileData = {
              fileUrl: uploadRes.data.url,
              fileType: uploadRes.data.fileType,
              fileName: uploadRes.data.fileName,
              fileSize: uploadRes.data.fileSize
            };
          }
        } catch (err) {
          console.error('Upload failed:', err);
          toast.error('File upload failed');
          // Still try to send the text part if it exists, or abort
          if (!msgText) throw err;
        } finally {
          setIsUploading(false);
        }
      }

      const res = await sendMessage(conversation._id, msgText, fileData);
      setMessages((prev) =>
        prev.map((m) => (m._id === optimistic._id ? res.data.message : m))
      );

      // Emit via socket if needed (usually handled by backend, but if requested:)
      if (socket) {
        socket.emit('sendMessage', {
          receiverId: other?._id,
          message: res.data.message
        });
      }
    } catch {
      toast.error('Failed to send message');
      setMessages((prev) => prev.filter((m) => m._id !== optimistic._id));
      setText(msgText);
      if (currentFile) setSelectedFile(currentFile);
    } finally {
      setIsSending(false);
      setIsUploading(false);
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
        <Avatar username={other?.username || '?'} size="md" isOnline={isOnline} />
        <div>
          <h2 className="font-display font-semibold text-white text-base">{other?.username}</h2>
          <p className="text-xs text-white/30 font-sans">
            {isOnline ? (
              <span className="text-green-400">Online</span>
            ) : (
              'Offline'
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => {
              if (!other || !socket) return;
              startOutgoingCall({ receiverId: other._id, callType: 'audio' });
              socket.emit('initiate_call', { receiverId: other._id, callType: 'audio' });
            }}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white/40 hover:text-[#7C6EFF] hover:bg-[#7C6EFF]/10 transition-all"
            title="Audio Call"
          >
            <Phone size={18} />
          </button>
          <button
            onClick={() => {
              if (!other || !socket) return;
              startOutgoingCall({ receiverId: other._id, callType: 'video' });
              socket.emit('initiate_call', { receiverId: other._id, callType: 'video' });
            }}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white/40 hover:text-[#7C6EFF] hover:bg-[#7C6EFF]/10 transition-all"
            title="Video Call"
          >
            <Video size={20} />
          </button>
          <button
            onClick={() => setShowInfo(true)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${showInfo ? 'text-[#7C6EFF] bg-[#7C6EFF]/10' : 'text-white/40 hover:text-[#7C6EFF] hover:bg-[#7C6EFF]/10'}`}
            title="Conversation Info"
          >
            <Info size={20} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-6 py-4 space-y-1"
      >
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
        {/* File Preview */}
        {selectedFile && (
          <div className="mb-3 flex items-center gap-3 p-2 bg-white/5 border border-white/10 rounded-xl">
            {filePreview ? (
              <div className="w-12 h-12 rounded-lg bg-black/40 overflow-hidden relative group">
                <img src={filePreview} alt="Preview" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center">
                {selectedFile.type.startsWith('video/') ? (
                  <Film size={20} className="text-[#7C6EFF]" />
                ) : (
                  <FileIcon size={20} className="text-[#7C6EFF]" />
                )}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/90 font-sans truncate">{selectedFile.name}</p>
              <p className="text-[10px] text-white/30 font-sans">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <button
              onClick={clearSelectedFile}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-all"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div className="flex items-end gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 focus-within:border-[#7C6EFF]/40 transition-all">
          {isRecording ? (
            <div className="flex-1 flex items-center justify-between animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm font-mono text-white/90">{formatTime(recordingTime)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => stopRecording(false)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-all"
                >
                  <Trash2 size={18} />
                </button>
                <button
                  onClick={() => stopRecording(true)}
                  className="w-10 h-10 rounded-xl bg-red-500 text-white flex items-center justify-center hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all active:scale-95"
                >
                  <StopCircle size={20} />
                </button>
              </div>
            </div>
          ) : (
            <>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.zip"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isSending || isUploading}
                className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30"
              >
                <Paperclip size={18} />
              </button>

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
                placeholder={isUploading ? 'Uploading...' : `Message ${other?.username || ''}...`}
                className="flex-1 bg-transparent text-sm text-white placeholder-white/20 outline-none resize-none font-sans leading-relaxed max-h-[120px] overflow-y-auto"
              />

              {!text.trim() && !selectedFile ? (
                <button
                  onClick={startRecording}
                  disabled={isSending || isUploading}
                  className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-white/40 hover:text-[#7C6EFF] hover:bg-[#7C6EFF]/10 transition-all disabled:opacity-30"
                >
                  <Mic size={18} />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={(!text.trim() && !selectedFile) || isSending || isUploading}
                  className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-[#7C6EFF] to-[#6A5EE0] text-white transition-all hover:opacity-90 hover:shadow-lg hover:shadow-[#7C6EFF]/30 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {isSending || isUploading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                </button>
              )}
            </>
          )}
        </div>
        <p className="text-[10px] text-white/15 text-center mt-2 font-sans">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>

      {other && (
        <ConversationInfo
          isOpen={showInfo}
          onClose={() => setShowInfo(false)}
          user={other}
          conversationId={conversation._id}
        />
      )}
    </div>
  );
}
