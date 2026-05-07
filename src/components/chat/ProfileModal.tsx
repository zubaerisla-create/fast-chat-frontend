'use client';

import { useState, useRef } from 'react';
import { X, Camera, Palette, User as UserIcon, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { updateProfile } from '@/lib/api';
import Avatar from '@/components/ui/Avatar';
import toast from 'react-hot-toast';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
    const { user, updateUser } = useAuth();
    const [username, setUsername] = useState(user?.username || '');
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-md glass rounded-[32px] p-8 shadow-2xl border border-white/10 scale-in-center">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#7C6EFF]/20 flex items-center justify-center text-[#7C6EFF]">
                            <Palette size={20} />
                        </div>
                        <h2 className="text-xl font-display font-bold text-white">Edit Profile</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white/30 hover:text-white hover:bg-white/5 transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Avatar Upload */}
                    <div className="flex flex-col items-center">
                        <div className="relative group">
                            <div className="w-32 h-32 rounded-[40px] overflow-hidden border-4 border-white/5 shadow-2xl transition-transform group-hover:scale-[1.02]">
                                {avatarPreview ? (
                                    <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <Avatar username={user?.username || ''} size="xl" />
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute -bottom-2 -right-2 w-12 h-12 rounded-2xl bg-[#7C6EFF] text-white flex items-center justify-center shadow-lg shadow-[#7C6EFF]/40 hover:bg-[#6A5EE0] transition-all active:scale-95"
                            >
                                <Camera size={20} />
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </div>
                        <p className="text-[10px] text-white/20 uppercase tracking-widest mt-4 font-sans font-semibold">
                            Change Profile Picture
                        </p>
                    </div>

                    {/* Username Input */}
                    <div className="space-y-2">
                        <label className="block text-xs text-white/40 font-sans uppercase tracking-wider ml-1">
                            New Username
                        </label>
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-[#7C6EFF] transition-colors">
                                <UserIcon size={18} />
                            </div>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-white/20 text-sm font-sans outline-none transition-all focus:border-[#7C6EFF]/50 focus:bg-white/[0.08]"
                                placeholder="Edit your username"
                            />
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-4 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-4 rounded-2xl bg-white/5 text-white/60 font-sans font-semibold text-sm hover:bg-white/10 hover:text-white transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isUpdating}
                            className="flex-[2] py-4 rounded-2xl bg-gradient-to-r from-[#7C6EFF] to-[#A89CFF] text-white font-sans font-semibold text-sm shadow-xl shadow-[#7C6EFF]/20 hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isUpdating ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    <span>Saving Changes...</span>
                                </>
                            ) : (
                                'Save Profile'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
