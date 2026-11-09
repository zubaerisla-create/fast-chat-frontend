'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  LogOut,
  MessageSquare,
  Settings2,
  Users,
  UserPlus,
  UserCheck,
  Clock,
  Check,
  X,
  AlertCircle,
  Inbox,
  Send,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import {
  getConversations,
  searchUserByExactUsername,
  sendFriendRequest,
  getFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  createConversation,
} from '@/lib/api';
import { Conversation, User, FriendRequest } from '@/types';
import Avatar from '@/components/ui/Avatar';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import ProfileModal from './ProfileModal';
import NewGroupModal from './NewGroupModal';

interface SidebarProps {
  activeConversationId?: string;
  onSelectConversation: (conv: Conversation) => void;
  onConversationsUpdate?: (convs: Conversation[]) => void;
}

export default function Sidebar({
  activeConversationId,
  onSelectConversation,
  onConversationsUpdate,
}: SidebarProps) {
  const { user, logout } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const router = useRouter();

  // Tab: 'chats' | 'requests'
  const [activeTab, setActiveTab] = useState<'chats' | 'requests'>('chats');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Exact Username Search
  const [showSearch, setShowSearch] = useState(false);
  const [searchUsername, setSearchUsername] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{
    user: User | null;
    relationship: 'none' | 'pending_outgoing' | 'pending_incoming' | 'accepted' | 'blocked' | 'self';
    requestId?: string | null;
  } | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Requests state
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // Modals
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);

  // Fetch conversations
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

  // Fetch friend requests
  const fetchRequests = useCallback(async () => {
    try {
      setLoadingRequests(true);
      const res = await getFriendRequests();
      setIncomingRequests(res.data.incoming || []);
      setOutgoingRequests(res.data.outgoing || []);
    } catch {
      // silent
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
    fetchRequests();
    const interval = setInterval(() => {
      fetchConversations();
      fetchRequests();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchConversations, fetchRequests]);

  // Real-time socket event handling for friend requests & conversations
  useEffect(() => {
    if (!socket) return;

    const onReqReceived = (data: any) => {
      toast.success(
        `New message request from ${data.request?.sender?.username || 'a user'}!`
      );
      fetchRequests();
    };

    const onReqAccepted = (data: any) => {
      toast.success('Message request accepted!');
      fetchRequests();
      fetchConversations();
      if (data.conversation) {
        onSelectConversation(data.conversation);
      }
    };

    const onReqRejected = () => {
      fetchRequests();
    };

    const onReqCanceled = () => {
      fetchRequests();
    };

    const onConvAdded = () => {
      fetchConversations();
    };

    socket.on('friendRequestReceived', onReqReceived);
    socket.on('friendRequestAccepted', onReqAccepted);
    socket.on('friendRequestRejected', onReqRejected);
    socket.on('friendRequestCanceled', onReqCanceled);
    socket.on('conversationAdded', onConvAdded);
    socket.on('conversationUpdated', fetchConversations);

    return () => {
      socket.off('friendRequestReceived', onReqReceived);
      socket.off('friendRequestAccepted', onReqAccepted);
      socket.off('friendRequestRejected', onReqRejected);
      socket.off('friendRequestCanceled', onReqCanceled);
      socket.off('conversationAdded', onConvAdded);
      socket.off('conversationUpdated', fetchConversations);
    };
  }, [socket, fetchRequests, fetchConversations, onSelectConversation]);

  // Handle Exact Username Search Submit
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchUsername.trim();
    if (!trimmed) return;

    if (trimmed.toLowerCase() === user?.username.toLowerCase()) {
      setSearchError('Cannot search for yourself');
      setSearchResult(null);
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setSearchResult(null);

    try {
      const res = await searchUserByExactUsername(trimmed);
      if (res.data?.success && res.data.user) {
        setSearchResult({
          user: res.data.user,
          relationship: res.data.relationship || 'none',
          requestId: res.data.requestId || null,
        });
      } else {
        setSearchError('User not found');
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        setSearchError('User not found');
      } else {
        setSearchError(err.response?.data?.message || 'Error searching user');
      }
    } finally {
      setIsSearching(false);
    }
  };

  // Send friend / message request
  const handleSendRequest = async (targetId: string) => {
    try {
      setActionLoading(true);
      const res = await sendFriendRequest({ receiverId: targetId });
      toast.success('Connection request sent!');
      setSearchResult((prev) =>
        prev
          ? {
              ...prev,
              relationship: 'pending_outgoing',
              requestId: res.data.request?.id || null,
            }
          : null
      );
      fetchRequests();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send request');
    } finally {
      setActionLoading(false);
    }
  };

  // Accept request
  const handleAcceptRequest = async (requestId: string) => {
    try {
      setActionLoading(true);
      const res = await acceptFriendRequest(requestId);
      toast.success('Request accepted!');
      fetchRequests();
      await fetchConversations();
      if (res.data.conversation) {
        onSelectConversation(res.data.conversation);
      }
      setSearchResult((prev) => (prev ? { ...prev, relationship: 'accepted' } : null));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to accept request');
    } finally {
      setActionLoading(false);
    }
  };

  // Reject request
  const handleRejectRequest = async (requestId: string) => {
    try {
      setActionLoading(true);
      await rejectFriendRequest(requestId);
      toast.success('Request declined');
      fetchRequests();
      setSearchResult((prev) => (prev ? { ...prev, relationship: 'none' } : null));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reject request');
    } finally {
      setActionLoading(false);
    }
  };

  // Cancel request
  const handleCancelRequest = async (requestId: string) => {
    try {
      setActionLoading(true);
      await cancelFriendRequest(requestId);
      toast.success('Request cancelled');
      fetchRequests();
      setSearchResult((prev) => (prev ? { ...prev, relationship: 'none' } : null));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to cancel request');
    } finally {
      setActionLoading(false);
    }
  };

  // Open conversation for accepted friends
  const handleOpenConversation = async (userId: string) => {
    try {
      setActionLoading(true);
      const res = await createConversation(userId);
      setShowSearch(false);
      setSearchUsername('');
      setSearchResult(null);
      await fetchConversations();
      onSelectConversation(res.data.conversation);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to open conversation');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/auth');
  };

  const getOtherParticipant = (conv: Conversation) =>
    conv.participants?.find((p) => p._id !== user?._id);

  return (
    <div className="flex flex-col h-full w-full md:w-[320px] lg:w-80 border-r border-[rgba(124,110,255,0.12)] bg-[#0F0F1E]">
      {/* ── Top Header ── */}
      <div className="px-5 py-4 border-b border-[rgba(124,110,255,0.1)]">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-display text-xl font-bold gradient-text">fast-chat</h1>
          <div className="flex items-center gap-1">
            {/* Exact Search Toggle */}
            <button
              onClick={() => {
                setShowSearch(!showSearch);
                setSearchError(null);
                setSearchResult(null);
              }}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                showSearch
                  ? 'text-[#7C6EFF] bg-[#7C6EFF]/15'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
              title="Search by Username"
            >
              <Search size={16} />
            </button>

            {/* New Group Chat */}
            <button
              onClick={() => setShowNewGroupModal(true)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-[#00D4FF] hover:bg-[#00D4FF]/10 transition-all"
              title="New Group Chat"
            >
              <Users size={16} />
            </button>

            {/* Settings & Blocked Accounts */}
            <button
              onClick={() => setShowProfileModal(true)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-[#7C6EFF] hover:bg-[#7C6EFF]/10 transition-all"
              title="Settings & Blocked Accounts"
            >
              <Settings2 size={16} />
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-all"
              title="Sign Out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>

        {/* User Card */}
        <div className="flex items-center gap-3">
          <Avatar username={user?.username || ''} src={user?.avatar} size="sm" isOnline={true} />
          <div className="min-w-0">
            <p className="text-sm font-sans font-medium text-white truncate">@{user?.username}</p>
            <p className="text-xs text-white/30 font-sans truncate">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* ── Exact Username Search Bar (Strictly on submit) ── */}
      {showSearch && (
        <div className="p-4 border-b border-[rgba(124,110,255,0.1)] bg-[#070714] space-y-3">
          <form onSubmit={handleSearchSubmit} className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
              Username Search (Exact Match)
            </span>
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Enter exact username..."
                value={searchUsername}
                onChange={(e) => setSearchUsername(e.target.value)}
                autoFocus
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-white placeholder-white/20 outline-none focus:border-[#7C6EFF] transition-all font-sans"
              />
              <button
                type="submit"
                disabled={isSearching || !searchUsername.trim()}
                className="absolute right-1.5 p-1.5 rounded-lg bg-[#7C6EFF] text-white hover:opacity-90 disabled:opacity-30 transition-all"
                title="Search"
              >
                {isSearching ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
              </button>
            </div>
            <p className="text-[10px] text-white/30">
              Privacy rule: You must type the complete, exact username. Press Enter to search.
            </p>
          </form>

          {/* Search Result Profile Card */}
          {searchResult && searchResult.user && (
            <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-[#7C6EFF]/30 space-y-3 animate-in fade-in">
              <div className="flex items-center gap-3">
                <Avatar
                  username={searchResult.user.username}
                  src={searchResult.user.avatar}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-white truncate">
                    {searchResult.user.username}
                  </h4>
                  <p className="text-[11px] text-white/40 truncate">
                    {searchResult.user.email}
                  </p>
                </div>
              </div>

              {/* Action depending on relationship */}
              <div className="pt-1">
                {searchResult.relationship === 'none' && (
                  <button
                    onClick={() => handleSendRequest(searchResult.user!._id)}
                    disabled={actionLoading}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gradient-to-r from-[#635BFF] to-[#00D4FF] text-white text-xs font-bold shadow-md hover:opacity-90 transition-all disabled:opacity-50"
                  >
                    <UserPlus size={14} />
                    <span>Send Message Request</span>
                  </button>
                )}

                {searchResult.relationship === 'pending_outgoing' && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-amber-400 font-medium flex items-center gap-1">
                      <Clock size={13} />
                      Request Pending
                    </span>
                    {searchResult.requestId && (
                      <button
                        onClick={() => handleCancelRequest(searchResult.requestId!)}
                        disabled={actionLoading}
                        className="px-2.5 py-1 rounded-lg border border-white/10 hover:border-rose-500/30 text-rose-400 text-xs font-bold hover:bg-rose-500/10 transition-all"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                )}

                {searchResult.relationship === 'pending_incoming' && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] text-white/50 block">Sent you a request</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          searchResult.requestId && handleAcceptRequest(searchResult.requestId)
                        }
                        disabled={actionLoading}
                        className="flex-1 py-1.5 rounded-xl bg-gradient-to-r from-[#635BFF] to-[#00D4FF] text-white text-xs font-bold shadow-md hover:opacity-90"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() =>
                          searchResult.requestId && handleRejectRequest(searchResult.requestId)
                        }
                        disabled={actionLoading}
                        className="flex-1 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/60 text-xs font-bold hover:text-white"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                )}

                {searchResult.relationship === 'accepted' && (
                  <button
                    onClick={() => handleOpenConversation(searchResult.user!._id)}
                    disabled={actionLoading}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold hover:bg-emerald-500/30 transition-all"
                  >
                    <UserCheck size={14} />
                    <span>Open Conversation</span>
                  </button>
                )}

                {searchResult.relationship === 'blocked' && (
                  <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs text-center font-bold">
                    User Blocked
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Search Not Found State */}
          {searchError && (
            <div className="p-4 text-center rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
              <AlertCircle size={20} className="mx-auto text-rose-400/60" />
              <p className="text-xs font-bold text-white">{searchError}</p>
              <p className="text-[10px] text-white/30">
                Please check for exact spelling and try again.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Tabs: Chats vs Requests ── */}
      <div className="px-3 pt-3 pb-1 flex gap-1 border-b border-white/5">
        <button
          onClick={() => setActiveTab('chats')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'chats'
              ? 'bg-[#7C6EFF] text-white shadow-md'
              : 'text-white/40 hover:text-white hover:bg-white/5'
          }`}
        >
          <MessageSquare size={13} />
          <span>Chats</span>
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 relative ${
            activeTab === 'requests'
              ? 'bg-[#7C6EFF] text-white shadow-md'
              : 'text-white/40 hover:text-white hover:bg-white/5'
          }`}
        >
          <Inbox size={13} />
          <span>Requests</span>
          {incomingRequests.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black">
              {incomingRequests.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Content Area ── */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {activeTab === 'chats' ? (
          /* CONVERSATIONS LIST */
          isLoading ? (
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
            <div className="flex flex-col items-center justify-center h-48 text-center px-4 space-y-2">
              <MessageSquare size={28} className="text-white/15" />
              <p className="text-sm font-semibold text-white/40">No conversations yet</p>
              <p className="text-xs text-white/20">
                Click the search icon above to find a user by exact username and send a request.
              </p>
            </div>
          ) : (
            <div className="space-y-0.5 pb-4">
              {conversations.map((conv) => {
                const isGroup = conv.type === 'group';
                const other = getOtherParticipant(conv);
                const isOnline = !isGroup && other ? onlineUsers.includes(other._id) : false;
                const isActive = conv._id === activeConversationId;
                const title = isGroup ? conv.title || 'Group' : other?.username || 'Unknown';

                return (
                  <button
                    key={conv._id}
                    onClick={() => onSelectConversation(conv)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left sidebar-item transition-all ${
                      isActive ? 'active' : ''
                    }`}
                  >
                    {isGroup ? (
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#635BFF] to-[#00D4FF] flex items-center justify-center text-white flex-shrink-0 shadow-md">
                        <Users size={18} />
                      </div>
                    ) : (
                      <Avatar
                        username={other?.username || '?'}
                        src={other?.avatar}
                        size="md"
                        isOnline={isOnline}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-sans font-medium text-white truncate">
                          {title}
                        </span>
                        {conv.lastMessage && (
                          <span className="text-[10px] text-white/25 font-sans flex-shrink-0 ml-1">
                            {formatDistanceToNow(new Date(conv.lastMessage.createdAt), {
                              addSuffix: false,
                            })}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/35 font-sans truncate mt-0.5">
                        {conv.lastMessage?.text || (isGroup ? 'Group created' : 'Start a conversation...')}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )
        ) : (
          /* REQUESTS LIST */
          <div className="space-y-4 p-1">
            {/* Incoming Requests */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 px-2 block">
                Incoming Requests ({incomingRequests.length})
              </span>
              {loadingRequests ? (
                <div className="py-6 flex justify-center">
                  <Loader2 size={18} className="animate-spin text-[#7C6EFF]" />
                </div>
              ) : incomingRequests.length === 0 ? (
                <p className="text-xs text-white/30 px-2 py-1">No pending requests</p>
              ) : (
                <div className="space-y-1.5">
                  {incomingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2.5"
                    >
                      <div className="flex items-center gap-2.5">
                        <Avatar
                          username={req.sender?.username || 'User'}
                          src={req.sender?.avatar}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-white truncate">
                            {req.sender?.username}
                          </p>
                          <p className="text-[10px] text-white/30">
                            {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAcceptRequest(req.id)}
                          disabled={actionLoading}
                          className="flex-1 py-1.5 rounded-xl bg-gradient-to-r from-[#635BFF] to-[#00D4FF] text-white text-xs font-bold shadow-md hover:opacity-90 disabled:opacity-40"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleRejectRequest(req.id)}
                          disabled={actionLoading}
                          className="flex-1 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/60 text-xs font-bold hover:text-white disabled:opacity-40"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Outgoing Requests */}
            <div className="space-y-2 pt-2 border-t border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 px-2 block">
                Sent Requests ({outgoingRequests.length})
              </span>
              {outgoingRequests.length === 0 ? (
                <p className="text-xs text-white/30 px-2 py-1">No sent requests pending</p>
              ) : (
                <div className="space-y-1.5">
                  {outgoingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between p-2.5 rounded-2xl bg-white/[0.02] border border-white/5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar
                          username={req.receiver?.username || 'User'}
                          src={req.receiver?.avatar}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">
                            {req.receiver?.username}
                          </p>
                          <p className="text-[10px] text-amber-400">Pending</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleCancelRequest(req.id)}
                        disabled={actionLoading}
                        className="px-2.5 py-1 rounded-lg border border-white/10 text-rose-400 text-xs font-bold hover:bg-rose-500/10"
                      >
                        Cancel
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />
      <NewGroupModal
        isOpen={showNewGroupModal}
        onClose={() => setShowNewGroupModal(false)}
        onGroupCreated={(group) => {
          fetchConversations();
          onSelectConversation(group);
        }}
      />
    </div>
  );
}
