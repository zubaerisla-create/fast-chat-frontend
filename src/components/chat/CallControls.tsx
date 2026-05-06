'use client';

import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';

interface CallControlsProps {
    isMuted: boolean;
    isVideoOff: boolean;
    isAudioOnly: boolean;
    onToggleMute: () => void;
    onToggleVideo: () => void;
    onLeave: () => void;
}

export default function CallControls({
    isMuted,
    isVideoOff,
    isAudioOnly,
    onToggleMute,
    onToggleVideo,
    onLeave,
}: CallControlsProps) {
    return (
        <div className="flex items-center gap-6 px-8 py-6 rounded-3xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl">
            <button
                onClick={onToggleMute}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${isMuted ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
            >
                {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </button>

            {!isAudioOnly && (
                <button
                    onClick={onToggleVideo}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${isVideoOff ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                >
                    {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
                </button>
            )}

            <button
                onClick={onLeave}
                className="w-14 h-14 rounded-full flex items-center justify-center bg-red-600 text-white shadow-lg shadow-red-600/40 hover:bg-red-700 hover:scale-105 active:scale-95 transition-all duration-300"
            >
                <PhoneOff size={24} />
            </button>
        </div>
    );
}
