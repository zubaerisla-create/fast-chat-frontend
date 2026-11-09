'use client';

import { useState, useEffect } from 'react';
import { X, Users, Check, AlertCircle, Plus } from 'lucide-react';
import { getFriends, createGroupConversation } from '@/lib/api';
import Avatar from '@/components/ui/Avatar';
import toast from 'react-hot-toast';
import { Conversation, User } from '@/types';

interface NewGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: (conv: Conversation) => void;
}

export default function NewGroupModal({ isOpen, onClose, onGroupCreated }: NewGroupModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [friends, setFriends] = useState<User[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setTitle('');
    setDescription('');
    setSelectedIds([]);
    setLoadingFriends(true);
    getFriends()
      .then((res) => {
        setFriends(res.data.friends || []);
      })
      .catch(() => {
        setFriends([]);
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

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0F0F1E] p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#635BFF] to-[#00D4FF] flex items-center justify-center text-white">
              <Users size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Create Group Chat</h3>
              <p className="text-xs text-white/40">Start a group conversation with your friends</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-white/60 mb-1.5">Group Name *</label>
            <input
              type="text"
              placeholder="e.g. Design Team, Study Group"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-[#070714] text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7C6EFF]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/60 mb-1.5">Description (optional)</label>
            <input
              type="text"
              placeholder="What is this group about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
              className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-[#070714] text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7C6EFF]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-white/60">
                Add Participants ({selectedIds.length} selected)
              </label>
            </div>

            {loadingFriends ? (
              <p className="text-xs text-white/40 text-center py-4">Loading friends...</p>
            ) : friends.length === 0 ? (
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center space-y-1">
                <AlertCircle size={20} className="mx-auto text-white/30" />
                <p className="text-xs text-white/60 font-medium">No connected friends yet</p>
                <p className="text-[11px] text-white/30">
                  Search by exact username and connect with friends first to add them to groups.
                </p>
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {friends.map((f) => {
                  const selected = selectedIds.includes(f._id);
                  return (
                    <button
                      type="button"
                      key={f._id}
                      onClick={() => toggleSelect(f._id)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all text-left ${
                        selected
                          ? 'border-[#7C6EFF]/60 bg-[#7C6EFF]/15 text-white'
                          : 'border-white/5 bg-white/[0.02] text-white/70 hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar username={f.username} src={f.avatar} size="sm" />
                        <span className="text-sm font-medium truncate">{f.username}</span>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                          selected
                            ? 'bg-[#7C6EFF] border-[#7C6EFF] text-white'
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
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white/50 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || !title.trim() || selectedIds.length === 0}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#635BFF] to-[#00D4FF] text-white text-xs font-bold shadow-lg hover:opacity-90 disabled:opacity-40 transition-all"
            >
              {creating ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
