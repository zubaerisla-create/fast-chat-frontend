'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Camera, Palette, User as UserIcon, Loader2, ShieldAlert, Check, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { updateProfile, getBlockedUsers, unblockUser } from '@/lib/api';
import Avatar from '@/components/ui/Avatar';
import toast from 'react-hot-toast';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'blocked'>('profile');
  const [username, setUsername] = useState(user?.username || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Blocked users state
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setUsername(user?.username || '');
      setAvatarFile(null);
      setAvatarPreview(null);
    }
  }, [isOpen, user]);

  const fetchBlocked = async () => {
    try {
      setLoadingBlocked(true);
      const res = await getBlockedUsers();
      setBlockedUsers(res.data.users || []);
    } catch {
      setBlockedUsers([]);
    } finally {
      setLoadingBlocked(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'blocked') {
      fetchBlocked();
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);

    try {
      const formData = new FormData();
      if (username !== user?.username) {
        formData.append('username', username);
      }
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }

      if (formData.entries().next().done) {
        toast.error('No changes to update');
        setIsUpdating(false);
        return;
      }

      const res = await updateProfile(formData);
      if (res.data.success) {
        updateUser(res.data.user);
        toast.success('Profile updated successfully!');
        onClose();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUnblock = async (targetId: string, targetName: string) => {
    try {
      setUnblockingId(targetId);
      await unblockUser(targetId);
      toast.success(`Unblocked ${targetName}`);
      setBlockedUsers((prev) => prev.filter((u) => u.id !== targetId));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to unblock user');
    } finally {
      setUnblockingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md glass rounded-[32px] p-7 shadow-2xl border border-white/10 scale-in-center">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#7C6EFF]/20 flex items-center justify-center text-[#7C6EFF]">
              <Palette size={20} />
            </div>
            <h2 className="text-xl font-display font-bold text-white">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white/30 hover:text-white hover:bg-white/5 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex rounded-2xl bg-white/5 p-1 mb-6 border border-white/5">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'profile'
                ? 'bg-[#7C6EFF] text-white shadow-md'
                : 'text-white/40 hover:text-white'
            }`}
          >
            Edit Profile
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('blocked')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'blocked'
                ? 'bg-[#7C6EFF] text-white shadow-md'
                : 'text-white/40 hover:text-white'
            }`}
          >
            Blocked Users
          </button>
        </div>

        {activeTab === 'profile' ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar Upload */}
            <div className="flex flex-col items-center">
              <div className="relative group">
                <div className="w-28 h-28 rounded-[36px] overflow-hidden border-4 border-white/5 shadow-2xl transition-transform group-hover:scale-[1.02]">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Avatar username={user?.username || ''} src={user?.avatar} size="xl" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-1 right-1 p-2 rounded-xl bg-[#7C6EFF] text-white shadow-lg hover:opacity-90 transition-all border-2 border-[#0F0F1E]"
                  title="Upload avatar"
                >
                  <Camera size={15} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
              <p className="text-xs text-white/30 font-sans mt-2.5">Click camera icon to change avatar</p>
            </div>

            {/* Username Input */}
            <div className="space-y-2">
              <label className="text-xs font-sans font-semibold uppercase tracking-wider text-white/40 flex items-center gap-1.5">
                <UserIcon size={14} />
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-white/20 text-sm focus:outline-none focus:border-[#7C6EFF]/50 font-sans transition-all"
                required
              />
            </div>

            {/* Email (Read Only) */}
            <div className="space-y-2">
              <label className="text-xs font-sans font-semibold uppercase tracking-wider text-white/40">
                Email Address
              </label>
              <input
                type="text"
                value={user?.email || ''}
                disabled
                className="w-full px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/5 text-white/40 text-sm font-sans cursor-not-allowed"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isUpdating}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#635BFF] to-[#00D4FF] text-white text-sm font-bold shadow-lg shadow-[#635BFF]/20 hover:opacity-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isUpdating ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Blocked Users Section */
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs text-white/50 pb-1">
              <ShieldAlert size={15} className="text-rose-400" />
              <span>Blocked accounts cannot message you or send connection requests.</span>
            </div>

            {loadingBlocked ? (
              <div className="py-12 flex justify-center">
                <Loader2 size={24} className="animate-spin text-[#7C6EFF]" />
              </div>
            ) : blockedUsers.length === 0 ? (
              <div className="py-12 text-center rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                <ShieldCheck size={32} className="mx-auto text-emerald-400/50" />
                <p className="text-sm font-bold text-white">No blocked users</p>
                <p className="text-xs text-white/30">You haven't blocked any accounts.</p>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {blockedUsers.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar username={b.username} src={b.avatar} size="sm" />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{b.username}</p>
                        <p className="text-[11px] text-white/30">Blocked</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnblock(b.id, b.username)}
                      disabled={unblockingId === b.id}
                      className="px-3.5 py-1.5 rounded-xl border border-white/10 hover:border-rose-500/40 bg-white/5 hover:bg-rose-500/10 text-xs font-bold text-slate-300 hover:text-rose-400 transition-all"
                    >
                      {unblockingId === b.id ? 'Unblocking...' : 'Unblock'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
