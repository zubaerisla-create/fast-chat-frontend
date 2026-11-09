'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Image as ImageIcon,
  FileText,
  Download,
  Info,
  User as UserIcon,
  Calendar,
  Mail,
  ShieldAlert,
  Users,
  UserPlus,
  Trash2,
  LogOut,
  Crown,
  Shield,
  Edit2,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { User, Message, Conversation } from '@/types';
import {
  getConversationMedia,
  blockUser,
  getFriends,
  addGroupMembers,
  removeGroupMember,
  leaveGroup,
  updateGroupConversation,
} from '@/lib/api';
import Avatar from '@/components/ui/Avatar';
import { format } from 'date-fns';
import ImageLightbox, { LightboxImage } from './ImageLightbox';
import { safeMediaUrl } from '@/lib/safeUrl';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';

interface ConversationInfoProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation;
  onConversationUpdated?: () => void;
  onConversationLeft?: () => void;
}

export default function ConversationInfo({
  isOpen,
  onClose,
  conversation,
  onConversationUpdated,
  onConversationLeft,
}: ConversationInfoProps) {
  const { user: currentUser } = useAuth();
  const isGroup = conversation.type === 'group';
  const otherUser = isGroup
    ? null
    : conversation.participants?.find((p) => p._id !== currentUser?._id);

  const [media, setMedia] = useState<Message[]>([]);
  const [activeTab, setActiveTab] = useState<'info' | 'media' | 'members'>('info');
  const [mediaTab, setMediaTab] = useState<'images' | 'files'>('images');
  const [isLoading, setIsLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Group editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState(conversation.title || '');
  const [newDescription, setNewDescription] = useState(conversation.description || '');

  // Add members state
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [availableFriends, setAvailableFriends] = useState<User[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);

  const myRole = conversation.myRole || 'member';
  const isAdmin = myRole === 'owner' || myRole === 'admin';

  useEffect(() => {
    if (isOpen) {
      setNewTitle(conversation.title || '');
      setNewDescription(conversation.description || '');
      setActiveTab(isGroup ? 'members' : 'info');

      const fetchMedia = async () => {
        setIsLoading(true);
        try {
          const res = await getConversationMedia(conversation._id);
          setMedia(res.data.media || []);
        } catch (err) {
          console.error('Failed to fetch media:', err);
        } finally {
          setIsLoading(false);
        }
      };
      fetchMedia();
    }
  }, [isOpen, conversation._id, isGroup, conversation.title, conversation.description]);

  const loadFriendsForAdd = async () => {
    try {
      setLoadingFriends(true);
      setShowAddMembers(true);
      const res = await getFriends();
      const currentMemberIds = new Set(
        (conversation.members || conversation.participants || []).map((m: any) => m._id || m.id)
      );
      setAvailableFriends((res.data.friends || []).filter((f: User) => !currentMemberIds.has(f._id)));
    } catch {
      setAvailableFriends([]);
    } finally {
      setLoadingFriends(false);
    }
  };

  const handleAddMembersSubmit = async () => {
    if (selectedFriendIds.length === 0) return;
    try {
      await addGroupMembers(conversation._id, selectedFriendIds);
      toast.success('Members added!');
      setShowAddMembers(false);
      setSelectedFriendIds([]);
      onConversationUpdated?.();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add members');
    }
  };

  const handleRemoveMember = async (targetId: string, targetName: string) => {
    if (!window.confirm(`Are you sure you want to remove ${targetName} from the group?`)) return;
    try {
      await removeGroupMember(conversation._id, targetId);
      toast.success(`${targetName} removed`);
      onConversationUpdated?.();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to remove member');
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm('Are you sure you want to leave this group?')) return;
    try {
      await leaveGroup(conversation._id, currentUser!._id);
      toast.success('You left the group');
      onClose();
      onConversationLeft?.();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to leave group');
    }
  };

  const handleSaveGroupInfo = async () => {
    if (!newTitle.trim()) return;
    try {
      await updateGroupConversation(conversation._id, {
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
      });
      toast.success('Group updated');
      setIsEditingTitle(false);
      onConversationUpdated?.();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update group');
    }
  };

  const handleBlockUser = async () => {
    if (!otherUser) return;
    if (
      !window.confirm(
        `Are you sure you want to block ${otherUser.username}? You will not be able to message each other.`
      )
    ) {
      return;
    }
    try {
      await blockUser(otherUser._id);
      toast.success(`Blocked ${otherUser.username}`);
      onClose();
      onConversationUpdated?.();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to block user');
    }
  };

  if (!isOpen) return null;

  const images = media.filter((m) => m.fileType === 'image' && safeMediaUrl(m.fileUrl));
  const files = media.filter((m) => m.fileType !== 'image' && safeMediaUrl(m.fileUrl));
  const lightboxImages: LightboxImage[] = images.map((m) => ({
    id: m._id,
    src: safeMediaUrl(m.fileUrl)!,
    name: m.fileName,
    caption: m.text || undefined,
  }));

  const membersList = conversation.members || conversation.participants || [];

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-end bg-black/50 backdrop-blur-sm transition-all animate-in fade-in duration-300">
      <div
        className="w-full max-w-sm h-full glass border-l border-white/10 flex flex-col animate-in slide-in-from-right duration-500 bg-[#0F0F1E]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2.5 text-white/90">
            <div className="w-8 h-8 rounded-xl bg-[#7C6EFF]/20 flex items-center justify-center text-[#7C6EFF]">
              {isGroup ? <Users size={16} /> : <Info size={16} />}
            </div>
            <h2 className="font-display font-bold text-sm">
              {isGroup ? 'Group Information' : 'Contact Details'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-white/5 bg-white/[0.01] px-4 pt-2">
          {isGroup ? (
            <>
              <button
                onClick={() => setActiveTab('members')}
                className={`flex-1 pb-3 text-xs font-bold border-b-2 transition-all ${
                  activeTab === 'members'
                    ? 'border-[#7C6EFF] text-white'
                    : 'border-transparent text-white/40 hover:text-white'
                }`}
              >
                Members ({membersList.length})
              </button>
              <button
                onClick={() => setActiveTab('info')}
                className={`flex-1 pb-3 text-xs font-bold border-b-2 transition-all ${
                  activeTab === 'info'
                    ? 'border-[#7C6EFF] text-white'
                    : 'border-transparent text-white/40 hover:text-white'
                }`}
              >
                About
              </button>
              <button
                onClick={() => setActiveTab('media')}
                className={`flex-1 pb-3 text-xs font-bold border-b-2 transition-all ${
                  activeTab === 'media'
                    ? 'border-[#7C6EFF] text-white'
                    : 'border-transparent text-white/40 hover:text-white'
                }`}
              >
                Media
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setActiveTab('info')}
                className={`flex-1 pb-3 text-xs font-bold border-b-2 transition-all ${
                  activeTab === 'info'
                    ? 'border-[#7C6EFF] text-white'
                    : 'border-transparent text-white/40 hover:text-white'
                }`}
              >
                Profile
              </button>
              <button
                onClick={() => setActiveTab('media')}
                className={`flex-1 pb-3 text-xs font-bold border-b-2 transition-all ${
                  activeTab === 'media'
                    ? 'border-[#7C6EFF] text-white'
                    : 'border-transparent text-white/40 hover:text-white'
                }`}
              >
                Media
              </button>
            </>
          )}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">
          {/* TAB 1: GROUP MEMBERS */}
          {isGroup && activeTab === 'members' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-white/40 font-bold">
                  Group Participants
                </span>
                {isAdmin && (
                  <button
                    onClick={loadFriendsForAdd}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#7C6EFF]/20 border border-[#7C6EFF]/40 text-[#7C6EFF] text-xs font-bold hover:bg-[#7C6EFF]/30 transition-all"
                  >
                    <UserPlus size={14} />
                    <span>Add Member</span>
                  </button>
                )}
              </div>

              {/* Add members popup */}
              {showAddMembers && (
                <div className="p-4 rounded-2xl bg-white/[0.04] border border-[#7C6EFF]/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Select from friends</span>
                    <button
                      onClick={() => setShowAddMembers(false)}
                      className="text-white/40 hover:text-white text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                  {loadingFriends ? (
                    <p className="text-xs text-white/40 text-center py-2">Loading...</p>
                  ) : availableFriends.length === 0 ? (
                    <p className="text-xs text-white/40 text-center py-2">
                      No additional friends to add.
                    </p>
                  ) : (
                    <div className="max-h-36 overflow-y-auto space-y-1">
                      {availableFriends.map((f) => {
                        const sel = selectedFriendIds.includes(f._id);
                        return (
                          <button
                            key={f._id}
                            type="button"
                            onClick={() =>
                              setSelectedFriendIds((prev) =>
                                prev.includes(f._id)
                                  ? prev.filter((id) => id !== f._id)
                                  : [...prev, f._id]
                              )
                            }
                            className={`w-full flex items-center justify-between p-2 rounded-xl text-left border text-xs transition-all ${
                              sel
                                ? 'border-[#7C6EFF] bg-[#7C6EFF]/20 text-white'
                                : 'border-white/5 bg-white/[0.02] text-white/70'
                            }`}
                          >
                            <span>{f.username}</span>
                            {sel && <Check size={14} className="text-[#7C6EFF]" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {availableFriends.length > 0 && (
                    <button
                      onClick={handleAddMembersSubmit}
                      disabled={selectedFriendIds.length === 0}
                      className="w-full py-2 rounded-xl bg-[#7C6EFF] text-white text-xs font-bold disabled:opacity-40"
                    >
                      Add Selected ({selectedFriendIds.length})
                    </button>
                  )}
                </div>
              )}

              {/* Members list */}
              <div className="space-y-2">
                {membersList.map((m: any) => {
                  const mId = m._id || m.id;
                  const mName = m.username || m.user?.username || 'User';
                  const mAvatar = m.avatar || m.user?.avatar;
                  const mRole = m.role || 'member';
                  const isOwner = mRole === 'owner';
                  const isMemberAdmin = mRole === 'admin';
                  const isSelf = mId === currentUser?._id;

                  const canRemove =
                    isAdmin &&
                    !isSelf &&
                    !isOwner &&
                    !(myRole === 'admin' && isMemberAdmin);

                  return (
                    <div
                      key={mId}
                      className="flex items-center justify-between p-2.5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar username={mName} src={mAvatar} size="sm" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-white truncate">{mName}</span>
                            {isSelf && (
                              <span className="text-[10px] text-white/30">(You)</span>
                            )}
                          </div>
                          <span className="text-[10px] text-white/40 flex items-center gap-1">
                            {isOwner && <Crown size={11} className="text-amber-400" />}
                            {isMemberAdmin && <Shield size={11} className="text-[#00D4FF]" />}
                            <span className="capitalize">{mRole}</span>
                          </span>
                        </div>
                      </div>

                      {canRemove && (
                        <button
                          onClick={() => handleRemoveMember(mId, mName)}
                          className="p-1.5 rounded-lg text-white/30 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                          title="Remove from group"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Leave group button */}
              <div className="pt-4 border-t border-white/5">
                <button
                  onClick={handleLeaveGroup}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold hover:bg-rose-500/20 transition-all"
                >
                  <LogOut size={15} />
                  <span>Leave Group</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: PROFILE OR GROUP INFO */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              {isGroup ? (
                /* Group Info */
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#635BFF] to-[#00D4FF] flex items-center justify-center text-white shadow-xl shadow-[#635BFF]/20 border border-white/10">
                    <Users size={36} />
                  </div>

                  {isEditingTitle ? (
                    <div className="w-full space-y-3 text-left">
                      <div>
                        <label className="text-[11px] font-bold text-white/40">Group Name</label>
                        <input
                          type="text"
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-white/40">Description</label>
                        <input
                          type="text"
                          value={newDescription}
                          onChange={(e) => setNewDescription(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setIsEditingTitle(false)}
                          className="px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveGroupInfo}
                          className="px-4 py-1.5 rounded-lg bg-[#7C6EFF] text-white text-xs font-bold"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-center gap-2">
                        <h3 className="text-lg font-bold text-white">{conversation.title || 'Group'}</h3>
                        {isAdmin && (
                          <button
                            onClick={() => setIsEditingTitle(true)}
                            className="p-1 rounded text-white/40 hover:text-white"
                            title="Edit group details"
                          >
                            <Edit2 size={13} />
                          </button>
                        )}
                      </div>
                      {conversation.description && (
                        <p className="text-xs text-white/40 mt-1">{conversation.description}</p>
                      )}
                    </div>
                  )}

                  <div className="w-full p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-left text-xs space-y-2 mt-2">
                    <div className="flex items-center justify-between text-white/50">
                      <span>Total Members</span>
                      <span className="font-bold text-white">{membersList.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-white/50">
                      <span>Created</span>
                      <span className="font-bold text-white">
                        {conversation.createdAt
                          ? format(new Date(conversation.createdAt), 'MMM d, yyyy')
                          : 'Recent'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* 1-on-1 Profile */
                otherUser && (
                  <div className="flex flex-col items-center text-center space-y-4">
                    <Avatar username={otherUser.username} src={otherUser.avatar} size="xl" />
                    <div>
                      <h3 className="text-lg font-bold text-white">{otherUser.username}</h3>
                      <p className="text-xs text-white/40 mt-0.5">{otherUser.email}</p>
                    </div>

                    <div className="w-full p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-left text-xs space-y-2">
                      <div className="flex items-center justify-between text-white/50">
                        <span>Member Since</span>
                        <span className="font-bold text-white">
                          {otherUser.createdAt
                            ? format(new Date(otherUser.createdAt), 'MMMM yyyy')
                            : 'Recently'}
                        </span>
                      </div>
                    </div>

                    {/* Block User Button */}
                    <div className="w-full pt-4 border-t border-white/5">
                      <button
                        onClick={handleBlockUser}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold hover:bg-rose-500/20 transition-all"
                      >
                        <ShieldAlert size={16} />
                        <span>Block {otherUser.username}</span>
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          {/* TAB 3: MEDIA */}
          {activeTab === 'media' && (
            <div className="space-y-4">
              <div className="flex rounded-xl bg-white/5 p-1 border border-white/5">
                <button
                  onClick={() => setMediaTab('images')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    mediaTab === 'images' ? 'bg-[#7C6EFF] text-white' : 'text-white/40 hover:text-white'
                  }`}
                >
                  Images ({images.length})
                </button>
                <button
                  onClick={() => setMediaTab('files')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    mediaTab === 'files' ? 'bg-[#7C6EFF] text-white' : 'text-white/40 hover:text-white'
                  }`}
                >
                  Files ({files.length})
                </button>
              </div>

              {mediaTab === 'images' ? (
                images.length === 0 ? (
                  <p className="text-xs text-white/30 text-center py-8">No shared images</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {images.map((img, idx) => (
                      <div
                        key={img._id}
                        onClick={() => setLightboxIndex(idx)}
                        className="aspect-square rounded-xl overflow-hidden bg-white/5 border border-white/5 cursor-pointer hover:opacity-90"
                      >
                        <img
                          src={safeMediaUrl(img.fileUrl) || undefined}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )
              ) : files.length === 0 ? (
                <p className="text-xs text-white/30 text-center py-8">No shared files</p>
              ) : (
                <div className="space-y-2">
                  {files.map((f) => (
                    <a
                      key={f._id}
                      href={safeMediaUrl(f.fileUrl) || undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/5 transition-all"
                    >
                      <FileText size={16} className="text-[#00D4FF]" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-white font-medium truncate">
                          {f.fileName || 'Attachment'}
                        </p>
                      </div>
                      <Download size={14} className="text-white/40" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {lightboxIndex !== null && (
          <ImageLightbox
            images={lightboxImages}
            index={lightboxIndex}
            onIndexChange={(i) => setLightboxIndex(i)}
            onClose={() => setLightboxIndex(null)}
          />
        )}
      </div>
    </div>
  );
}
