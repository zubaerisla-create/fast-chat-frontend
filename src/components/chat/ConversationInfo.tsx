'use client';

import { useState, useEffect } from 'react';
import { X, Image as ImageIcon, FileText, Download, Info, User as UserIcon, Calendar, Mail } from 'lucide-react';
import { User, Message } from '@/types';
import { getConversationMedia } from '@/lib/api';
import Avatar from '@/components/ui/Avatar';
import { format } from 'date-fns';

interface ConversationInfoProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
    conversationId: string;
}

export default function ConversationInfo({ isOpen, onClose, user, conversationId }: ConversationInfoProps) {
    const [media, setMedia] = useState<Message[]>([]);
    const [activeTab, setActiveTab] = useState<'images' | 'files'>('images');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            const fetchMedia = async () => {
                setIsLoading(true);
                try {
                    const res = await getConversationMedia(conversationId);
                    setMedia(res.data.media || []);
                } catch (err) {
                    console.error('Failed to fetch media:', err);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchMedia();
        }
    }, [isOpen, conversationId]);

    if (!isOpen) return null;

    const images = media.filter(m => m.fileType === 'image');
    const files = media.filter(m => m.fileType !== 'image');

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-end bg-black/40 backdrop-blur-sm transition-all animate-in fade-in duration-300">
            <div
                className="w-full max-w-sm h-full glass border-l border-white/10 flex flex-col animate-in slide-in-from-right duration-500"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-3 text-white/90">
                        <div className="w-8 h-8 rounded-lg bg-[#7C6EFF]/20 flex items-center justify-center text-[#7C6EFF]">
                            <Info size={16} />
                        </div>
                        <h2 className="font-display font-bold">Contact Info</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-white hover:bg-white/5 transition-all"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {/* User Profile Section */}
                    <div className="p-8 flex flex-col items-center text-center border-b border-white/10">
                        <Avatar username={user.username} src={user.avatar} size="2xl" />
                        <h3 className="mt-4 text-xl font-display font-bold text-white">{user.username}</h3>
                        <p className="text-white/40 text-sm font-sans flex items-center gap-1.5 mt-1 justify-center">
                            <Mail size={12} />
                            {user.email}
                        </p>

                        <div className="grid grid-cols-1 w-full gap-3 mt-8">
                            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col items-start gap-1">
                                <span className="text-[10px] text-white/20 uppercase tracking-widest font-bold">Member Since</span>
                                <span className="text-sm text-white/70 font-sans italic">
                                    {user.createdAt ? format(new Date(user.createdAt), 'MMMM yyyy') : 'Recently joined'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Shared Media Section */}
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-xs font-sans uppercase tracking-widest text-white/25 font-bold">Shared Content</h4>
                            <div className="flex bg-white/5 rounded-lg p-0.5">
                                <button
                                    onClick={() => setActiveTab('images')}
                                    className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-tighter transition-all ${activeTab === 'images' ? 'bg-[#7C6EFF] text-white shadow-lg' : 'text-white/30 hover:text-white/50'}`}
                                >
                                    Images
                                </button>
                                <button
                                    onClick={() => setActiveTab('files')}
                                    className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-tighter transition-all ${activeTab === 'files' ? 'bg-[#7C6EFF] text-white shadow-lg' : 'text-white/30 hover:text-white/50'}`}
                                >
                                    Files
                                </button>
                            </div>
                        </div>

                        {isLoading ? (
                            <div className="grid grid-cols-3 gap-2">
                                {[1, 2, 3, 4, 5, 6].map(i => (
                                    <div key={i} className="aspect-square rounded-lg bg-white/5 animate-pulse" />
                                ))}
                            </div>
                        ) : activeTab === 'images' ? (
                            images.length > 0 ? (
                                <div className="grid grid-cols-3 gap-2">
                                    {images.map((img) => (
                                        <div
                                            key={img._id}
                                            className="aspect-square rounded-lg overflow-hidden border border-white/5 cursor-pointer hover:opacity-80 transition-opacity relative group"
                                            onClick={() => window.open(img.fileUrl, '_blank')}
                                        >
                                            <img src={img.fileUrl} alt="" className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-12 flex flex-col items-center justify-center text-white/20">
                                    <ImageIcon size={32} strokeWidth={1.5} />
                                    <p className="text-xs mt-2 italic font-sans">No shared images</p>
                                </div>
                            )
                        ) : (
                            files.length > 0 ? (
                                <div className="space-y-2">
                                    {files.map((f) => (
                                        <a
                                            key={f._id}
                                            href={f.fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 p-3 bg-white/[0.03] hover:bg-white/[0.06] rounded-xl transition-all border border-white/5 group"
                                        >
                                            <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-white/40 group-hover:text-[#7C6EFF] transition-colors">
                                                <FileText size={18} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-white/80 truncate font-sans">{f.fileName}</p>
                                                <p className="text-[10px] text-white/25 mt-0.5 uppercase tracking-tighter">
                                                    {(f.fileSize ? f.fileSize / 1024 / 1024 : 0).toFixed(2)} MB
                                                </p>
                                            </div>
                                            <Download size={14} className="text-white/20 group-hover:text-white transition-colors" />
                                        </a>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-12 flex flex-col items-center justify-center text-white/20">
                                    <FileText size={32} strokeWidth={1.5} />
                                    <p className="text-xs mt-2 italic font-sans">No shared files</p>
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>
            {/* Backdrop click closer */}
            <div className="absolute inset-0 z-[-1]" onClick={onClose} />
        </div>
    );
}
