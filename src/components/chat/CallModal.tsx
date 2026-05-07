'use client';

import { Phone, PhoneOff } from 'lucide-react';
import { useCall } from '@/context/CallContext';
import Avatar from '@/components/ui/Avatar';

export default function CallModal() {
    const { incomingCall, acceptCall, rejectCall } = useCall();

    if (!incomingCall) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-sm glass rounded-[32px] p-8 shadow-2xl border border-white/10 scale-in-center">
                <div className="flex flex-col items-center text-center">
                    <div className="relative mb-6">
                        <div className="absolute inset-0 rounded-full bg-[#7C6EFF]/30 animate-ping" />
                        <div className="relative z-10 p-1 rounded-full border-2 border-[#7C6EFF]/50">
                            <Avatar username={incomingCall.callerId.username} size="xl" />
                        </div>
                    </div>

                    <h3 className="text-2xl font-display font-bold text-white mb-1">
                        {incomingCall.callerId.username}
                    </h3>
                    <p className="text-white/40 text-sm font-sans mb-8">
                        Incoming {incomingCall.callType} call...
                    </p>

                    <div className="flex items-center gap-6 w-full">
                        <button
                            onClick={rejectCall}
                            className="flex-1 h-14 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-500 flex items-center justify-center transition-all group border border-red-500/10"
                        >
                            <PhoneOff size={24} className="group-hover:rotate-12 group-active:scale-90 transition-all" />
                        </button>
                        <button
                            onClick={acceptCall}
                            className="flex-1 h-14 rounded-2xl bg-[#7C6EFF] hover:bg-[#6A5EE0] text-white flex items-center justify-center shadow-lg shadow-[#7C6EFF]/40 transition-all group active:scale-[0.98]"
                        >
                            <Phone size={24} className="group-hover:-rotate-12 group-active:scale-90 transition-all" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
