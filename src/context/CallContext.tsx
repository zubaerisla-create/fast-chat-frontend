'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import { useAgora } from '@/hooks/useAgora';
import { getAgoraToken, initiateCall, endCall } from '@/lib/api';
import { User, CallData } from '@/types';
import toast from 'react-hot-toast';

type CallStatus = 'idle' | 'ringing' | 'calling' | 'connected' | 'ended';

interface CallContextType {
    callStatus: CallStatus;
    incomingCall: CallData | null;
    activeCall: CallData | null;
    isAudioOnly: boolean;
    localVideoTrack: any;
    remoteUsers: any[];
    startCall: (receiverId: string, type: 'audio' | 'video') => Promise<void>;
    acceptCall: () => Promise<void>;
    rejectCall: () => void;
    leaveCall: () => Promise<void>;
    toggleMute: () => void;
    toggleVideo: () => void;
    isMuted: boolean;
    isVideoOff: boolean;
}

const CallContext = createContext<CallContextType | null>(null);

export function CallProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const { socket } = useSocket();
    const agora = useAgora();

    const [callStatus, setCallStatus] = useState<CallStatus>('idle');
    const [incomingCall, setIncomingCall] = useState<CallData | null>(null);
    const [activeCall, setActiveCall] = useState<CallData | null>(null);
    const [isAudioOnly, setIsAudioOnly] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);

    const cleanup = useCallback(async () => {
        await agora.leaveChannel();
        setCallStatus('idle');
        setIncomingCall(null);
        setActiveCall(null);
        setIsMuted(false);
        setIsVideoOff(false);
    }, [agora]);

    // Handle Socket events
    useEffect(() => {
        if (!socket) return;

        socket.on('incoming_call', (data: CallData) => {
            setIncomingCall(data);
            setCallStatus('ringing');
            // Play ringtone logic could go here
        });

        socket.on('call_accepted', async (data: { channelName: string }) => {
            if (callStatus === 'calling') {
                try {
                    const res = await getAgoraToken(data.channelName, 0);
                    await agora.joinChannel(res.data.appId, data.channelName, res.data.token, 0);
                    await agora.publishTracks(isAudioOnly ? 'audio' : 'video');
                    setCallStatus('connected');
                } catch (err) {
                    toast.error('Failed to join call');
                    cleanup();
                }
            }
        });

        socket.on('call_rejected', () => {
            if (callStatus === 'calling') {
                toast.error('Call rejected');
                cleanup();
            }
        });

        socket.on('call_ended', () => {
            cleanup();
        });

        return () => {
            socket.off('incoming_call');
            socket.off('call_accepted');
            socket.off('call_rejected');
            socket.off('call_ended');
        };
    }, [socket, callStatus, isAudioOnly, agora, cleanup]);

    const startCall = async (receiverId: string, type: 'audio' | 'video') => {
        if (!user) return;
        const channelName = `call_${user._id}_${Date.now()}`;
        setIsAudioOnly(type === 'audio');

        try {
            setCallStatus('calling');
            setActiveCall({
                callerId: user,
                receiverId,
                channelName,
                callType: type,
            });

            await initiateCall({
                callerId: user._id,
                receiverId,
                channelName,
                callType: type,
            });
        } catch (err) {
            toast.error('Failed to initiate call');
            setCallStatus('idle');
            setActiveCall(null);
        }
    };

    const acceptCall = async () => {
        if (!incomingCall || !socket) return;

        try {
            const { channelName, callType } = incomingCall;
            setIsAudioOnly(callType === 'audio');
            setActiveCall(incomingCall);

            const res = await getAgoraToken(channelName, 0);
            await agora.joinChannel(res.data.appId, channelName, res.data.token, 0);
            await agora.publishTracks(callType);

            socket.emit('call_accepted', { channelName, callerId: incomingCall.callerId._id });
            setCallStatus('connected');
            setIncomingCall(null);
        } catch (err) {
            toast.error('Failed to accept call');
            cleanup();
        }
    };

    const rejectCall = () => {
        if (!incomingCall || !socket) return;
        socket.emit('call_rejected', { callerId: incomingCall.callerId._id });
        cleanup();
    };

    const leaveCall = async () => {
        if (activeCall && socket) {
            const receiverId = activeCall.receiverId === user?._id ? activeCall.callerId._id : activeCall.receiverId;
            socket.emit('call_ended', { channelName: activeCall.channelName, receiverId });
            await endCall(activeCall.channelName, user?._id || '');
        }
        cleanup();
    };

    const toggleMute = () => {
        const newState = !isMuted;
        setIsMuted(newState);
        agora.toggleMute(newState);
    };

    const toggleVideo = () => {
        const newState = !isVideoOff;
        setIsVideoOff(newState);
        agora.toggleVideo(newState);
    };

    return (
        <CallContext.Provider
            value={{
                callStatus,
                incomingCall,
                activeCall,
                isAudioOnly,
                localVideoTrack: agora.localVideoTrack,
                remoteUsers: agora.remoteUsers,
                startCall,
                acceptCall,
                rejectCall,
                leaveCall,
                toggleMute,
                toggleVideo,
                isMuted,
                isVideoOff,
            }}
        >
            {children}
        </CallContext.Provider>
    );
}

export function useCall() {
    const context = useContext(CallContext);
    if (!context) throw new Error('useCall must be used within CallProvider');
    return context;
}
