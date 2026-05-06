'use client';

import Avatar from '@/components/ui/Avatar';
import { User } from '@/types';

interface AudioCallProps {
    otherUser: User | undefined;
    isConnected: boolean;
}

export default function AudioCall({ otherUser, isConnected }: AudioCallProps) {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-8 bg-gradient-to-b from-[#1A1A2E] to-[#0D0D1A]">
            <div className="relative">
                <div className={`absolute inset-0 rounded-full bg-[#7C6EFF]/20 blur-3xl animate-pulse ${isConnected ? 'scale-150' : 'scale-110'}`} />
                <div className="relative z-10 p-2 rounded-full border-2 border-white/10 glass">
                    <Avatar username={otherUser?.username || '?'} size="xl" />
                </div>
            </div>

            <div className="text-center space-y-2 z-10">
                <h2 className="text-3xl font-display font-bold text-white">{otherUser?.username}</h2>
                <p className="text-[#7C6EFF] font-medium tracking-wide scale-110 animate-pulse">
                    {isConnected ? 'On call' : 'Calling...'}
                </p>
            </div>

            <div className="flex gap-1.5 h-8 items-center">
                {[0, 1, 2, 3, 4].map((i) => (
                    <div
                        key={i}
                        className={`w-1 bg-[#7C6EFF]/50 rounded-full transition-all duration-300 ${isConnected ? 'animate-audio-wave' : 'h-1'
                            }`}
                        style={{
                            animationDelay: `${i * 0.1}s`,
                            height: isConnected ? '100%' : '4px'
                        }}
                    />
                ))}
            </div>
        </div>
    );
}
