'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, LogOut, MessageSquare, Settings2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { getConversations, searchUsers, createConversation } from '@/lib/api';
import { Conversation, User } from '@/types';
import Avatar from '@/components/ui/Avatar';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import ProfileModal from './ProfileModal';

interface SidebarProps {
  activeConversationId?: string;
  onSelectConversation: (conv: Conversation) => void;
  onConversationsUpdate?: (convs: Conversation[]) => void;
}

export default function Sidebar({ activeConversationId, onSelectConversation, onConversationsUpdate }: SidebarProps) {
  const { user, logout } = useAuth();
  const { onlineUsers } = useSocket();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await getConversations();
      const convs = res.data.conversations || [];
      setConversations(convs);
      onConversationsUpdate?.(convs);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, [onConversationsUpdate]);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 5000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const delay = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await searchUsers(searchQuery);
        setSearchResults(res.data.users?.filter((u: User) => u._id !== user?._id) || []);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => clearTimeout(delay);
  }, [searchQuery, user]);

  const handleStartConversation = async (userId: string) => {
    try {
      const res = await createConversation(userId);
      const conv = res.data.conversation;
      setSearchQuery('');
      setShowSearch(false);
      await fetchConversations();
      onSelectConversation(conv);
    } catch {
      toast.error('Failed to start conversation');
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/auth');
  };

  const getOtherParticipant = (conv: Conversation) =>
    conv.participants.find((p) => p._id !== user?._id);

  return (
    <div className="flex flex-col h-full w-full md:w-[320px] lg:w-80 border-r border-[rgba(124,110,255,0.12)] bg-[#0F0F1E]">
      {/* Header */}
      <div className="px-5 py-5 border-b border-[rgba(124,110,255,0.1)]">
        <div className="flex items-center justify-between mb-5">
          <h1 className="font-display text-xl font-bold gradient-text">Vibe</h1>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-all"
            >
              <Plus size={16} />
            </button>
            <button
              onClick={() => setShowProfileModal(true)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-[#7C6EFF] hover:bg-[#7C6EFF]/10 transition-all"
              title="Profile Settings"
            >
              <Settings2 size={16} />
            </button>
            <button
              onClick={handleLogout}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-all"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>

        {/* User info */}
        <div className="flex items-center gap-3">
          <Avatar username={user?.username || ''} src={user?.avatar} size="sm" isOnline={true} />
          <div className="min-w-0">
            <p className="text-sm font-sans font-medium text-white truncate">{user?.username}</p>
            <p className="text-xs text-white/30 font-sans truncate">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Search new user */}
      {showSearch && (
        <div className="px-4 py-3 border-b border-[rgba(124,110,255,0.1)]">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              placeholder="Find people..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-[#7C6EFF]/50 font-sans transition-all"
            />
          </div>
          {isSearching && (
            <p className="text-xs text-white/30 text-center mt-2 font-sans">Searching...</p>
          )}
          {searchResults.length > 0 && (
            <div className="mt-2 space-y-1">
              {searchResults.map((u) => (
                <button
                  key={u._id}
                  onClick={() => handleStartConversation(u._id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[#7C6EFF]/10 transition-all text-left"
                >
                  <Avatar username={u.username} src={u.avatar} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-sans text-white truncate">{u.username}</p>
                    <p className="text-xs text-white/30 font-sans truncate">{u.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          {searchQuery && !isSearching && searchResults.length === 0 && (
            <p className="text-xs text-white/30 text-center mt-2 font-sans">No users found</p>
          )}
        </div>
      )}

      {/* Conversations label */}
      <div className="px-5 pt-4 pb-2">
        <span className="text-xs font-sans uppercase tracking-widest text-white/25">Messages</span>
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto px-2">
        {isLoading ? (
          <div className="space-y-3 px-2 py-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-white/5" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-white/5 rounded w-3/4" />
                  <div className="h-2 bg-white/5 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center px-4">
            <MessageSquare size={28} className="text-white/15 mb-3" />
            <p className="text-sm text-white/25 font-sans">No conversations yet</p>
            <p className="text-xs text-white/15 font-sans mt-1">Click + to find people</p>
          </div>
        ) : (
          <div className="space-y-0.5 pb-4">
            {conversations.map((conv) => {
              const other = getOtherParticipant(conv);
              const isOnline = other ? onlineUsers.includes(other._id) : false;
              const isActive = conv._id === activeConversationId;
              return (
                <button
                  key={conv._id}
                  onClick={() => onSelectConversation(conv)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left sidebar-item transition-all ${isActive ? 'active' : ''
                    }`}
                >
                  <Avatar username={other?.username || '?'} src={other?.avatar} size="md" isOnline={isOnline} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-sans font-medium text-white truncate">
                        {other?.username || 'Unknown'}
                      </span>
                      {conv.lastMessage && (
                        <span className="text-[10px] text-white/25 font-sans flex-shrink-0 ml-1">
                          {formatDistanceToNow(new Date(conv.lastMessage.createdAt), { addSuffix: false })}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/35 font-sans truncate mt-0.5">
                      {conv.lastMessage?.text || 'Start a conversation...'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />
    </div>
  );
}
