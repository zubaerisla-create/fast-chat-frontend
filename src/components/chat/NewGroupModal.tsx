import { useState, useEffect } from 'react';
import { X, Users, Check, AlertCircle, Plus, Search, Loader2 } from 'lucide-react';
import { getFriends, getConversations, searchUserByExactUsername, createGroupConversation } from '@/lib/api';
import Avatar from '@/components/ui/Avatar';
import toast from 'react-hot-toast';
import { Conversation, User } from '@/types';

interface NewGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: (conv: Conversation) => void;
}

const getUserId = (u: any): string => (u?._id || u?.id || '').toString();

export default function NewGroupModal({ isOpen, onClose, onGroupCreated }: NewGroupModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [friends, setFriends] = useState<User[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchingUser, setSearchingUser] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setTitle('');
    setDescription('');
    setSelectedIds([]);
    setSearchQuery('');
    setSearchError(null);
    setLoadingFriends(true);

    const contactsMap = new Map<string, User>();

    Promise.allSettled([getFriends(), getConversations()])
      .then(([friendsRes, convRes]) => {
        // 1. Add from friends API
        if (friendsRes.status === 'fulfilled' && friendsRes.value.data?.friends) {
          for (const f of friendsRes.value.data.friends) {
            const id = getUserId(f);
            if (id && !contactsMap.has(id)) {
              contactsMap.set(id, f);
            }
          }
        }
        // 2. Add from existing direct conversations
        if (convRes.status === 'fulfilled' && convRes.value.data?.conversations) {
          for (const c of convRes.value.data.conversations) {
            if (c.isGroup || c.type === 'group') continue;
            const other = c.otherUser || c.participants?.[0];
            const id = getUserId(other);
            if (id && !contactsMap.has(id)) {
              contactsMap.set(id, other);
            }
          }
        }
        setFriends(Array.from(contactsMap.values()));
      })
      .finally(() => {
        setLoadingFriends(false);
      });
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSearchExactUser = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearchError(null);
    setSearchingUser(true);
    try {
      const res = await searchUserByExactUsername(q);
      if (res.data?.user) {
        const found = res.data.user;
        const fid = getUserId(found);
        setFriends((prev) => {
          if (prev.some((u) => getUserId(u) === fid)) return prev;
          return [found, ...prev];
        });
        setSelectedIds((prev) => (prev.includes(fid) ? prev : [...prev, fid]));
        setSearchQuery('');
        toast.success(`User "${found.username}" added!`);
      } else {
        setSearchError(`User "${q}" not found.`);
      }
    } catch (err: any) {
      setSearchError(err.response?.data?.message || `User "${q}" not found.`);
    } finally {
      setSearchingUser(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Please enter a group name');
      return;
    }
    if (selectedIds.length === 0) {
      toast.error('Please select at least one participant');
      return;
    }

    try {
      setCreating(true);
      const res = await createGroupConversation({
        title: title.trim(),
        description: description.trim() || undefined,
        memberIds: selectedIds,
      });
      if (res.data?.success) {
        toast.success(`Group "${title}" created!`);
        onGroupCreated(res.data.conversation);
        onClose();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  const filtered = friends.filter((f) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return f.username?.toLowerCase().includes(q) || f.email?.toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#12141C] p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-600 flex items-center justify-center text-white shadow-md shadow-rose-950/40">
              <Users size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Create Group Chat</h3>
              <p className="text-xs text-slate-400">Start a group conversation with your contacts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Group Name *</label>
            <input
              type="text"
              placeholder="e.g. Design Team, Project Hub"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-[#0B0C11] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Description (optional)</label>
            <input
              type="text"
              placeholder="What is this group about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
              className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-[#0B0C11] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-400"
            />
          </div>

          {/* Selected participants tags */}
          {selectedIds.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Selected ({selectedIds.length})
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                {selectedIds.map((id) => {
                  const u = friends.find((f) => getUserId(f) === id);
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs font-medium"
                    >
                      <span>{u?.username || 'User'}</span>
                      <button
                        type="button"
                        onClick={() => toggleSelect(id)}
                        className="hover:text-white"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Search Contacts or Exact Username */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Add Participants
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter or type exact username..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (searchError) setSearchError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearchExactUser();
                    }
                  }}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-white/10 bg-[#0B0C11] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-400"
                />
              </div>
              {searchQuery.trim().length > 0 && (
                <button
                  type="button"
                  onClick={handleSearchExactUser}
                  disabled={searchingUser}
                  className="px-3 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-all disabled:opacity-50"
                >
                  {searchingUser ? <Loader2 size={14} className="animate-spin" /> : 'Find'}
                </button>
              )}
            </div>
            {searchError && (
              <p className="text-xs text-rose-400 mt-1.5">{searchError}</p>
            )}
          </div>

          {/* Contact selection list */}
          <div>
            {loadingFriends ? (
              <p className="text-xs text-slate-500 text-center py-4">Loading contacts...</p>
            ) : filtered.length === 0 ? (
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center space-y-1">
                <AlertCircle size={20} className="mx-auto text-slate-500" />
                <p className="text-xs text-slate-400 font-medium">No contacts match</p>
                <p className="text-[11px] text-slate-500">
                  Type an exact username in the search box above and press Find to add them!
                </p>
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {filtered.map((f) => {
                  const fid = getUserId(f);
                  const selected = selectedIds.includes(fid);
                  return (
                    <button
                      type="button"
                      key={fid}
                      onClick={() => toggleSelect(fid)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all text-left ${
                        selected
                          ? 'border-rose-500/50 bg-rose-500/10 text-white'
                          : 'border-white/5 bg-white/[0.02] text-slate-300 hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar username={f.username} src={f.avatar} size="sm" />
                        <span className="text-sm font-medium truncate text-white">{f.username}</span>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                          selected
                            ? 'bg-rose-500 border-rose-500 text-white'
                            : 'border-white/20'
                        }`}
                      >
                        {selected && <Check size={12} strokeWidth={3} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || !title.trim() || selectedIds.length === 0}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white text-xs font-bold shadow-md shadow-rose-950/40 hover:opacity-95 disabled:opacity-40 transition-all"
            >
              {creating ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
