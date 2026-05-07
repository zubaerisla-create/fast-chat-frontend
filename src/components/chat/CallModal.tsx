'use client';

import { useState } from 'react';
import { Phone, PhoneOff } from 'lucide-react';
import { useCall, CALL_STATUS } from '@/context/CallContext';
import { useSocket } from '@/context/SocketContext';
import Avatar from '@/components/ui/Avatar';

export default function CallModal() {
    const { callStatus, callData, resetCall } = useCall();
    const { socket } = useSocket();
    const [isActioned, setIsActioned] = useState(false);

    if (callStatus !== CALL_STATUS.INCOMING || !callData) return null;

    const handleAccept = () => {
        if (!socket || isActioned) return;
        setIsActioned(true);
        console.log('[UI] Accepting call, emitting accept_call for channel:', callData.channelName);
        socket.emit('accept_call', {
            callerId: callData.callerId?._id || callData.callerId,
            channelName: callData.channelName,
        });
        // State transitions to ONGOING when we receive 'call_joined' from backend
    };

    const handleReject = () => {
        if (!socket || isActioned) return;
        setIsActioned(true);
        console.log('[UI] Rejecting call');
        socket.emit('reject_call', {
            callerId: callData.callerId?._id || callData.callerId,
            channelName: callData.channelName,
        });
        resetCall();
    };

    const callerName = callData.callerName || callData.callerId?.username || String(callData.callerId);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-sm bg-[#1A1A2E] rounded-[32px] p-8 shadow-2xl border border-white/10">
                <div className="flex flex-col items-center text-center">
                    <div className="relative mb-6">
                        <div className="absolute inset-0 rounded-full bg-[#7C6EFF]/30 animate-ping" />
                        <div className="relative z-10 p-1 rounded-full border-2 border-[#7C6EFF]/50">
                            <Avatar username={callerName} size="xl" />
                        </div>
                    </div>

                    <h3 className="text-2xl font-bold text-white mb-1">{callerName}</h3>
                    <p className="text-white/40 text-sm mb-8">
                        Incoming {callData.callType} call...
                    </p>

                    <div className="flex items-center gap-6 w-full">
                        <button
                            onClick={handleReject}
                            disabled={isActioned}
                            className="flex-1 h-14 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-500 flex items-center justify-center transition-all border border-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <PhoneOff size={24} />
                        </button>
                        <button
                            onClick={handleAccept}
                            disabled={isActioned}
                            className="flex-1 h-14 rounded-2xl bg-[#7C6EFF] hover:bg-[#6A5EE0] text-white flex items-center justify-center shadow-lg shadow-[#7C6EFF]/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isActioned ? (
                                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Phone size={24} />
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
