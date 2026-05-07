'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
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
    activeCall: (CallData & { receiverInfo?: User }) | null;
    isAudioOnly: boolean;
    localVideoTrack: any;
    remoteUsers: any[];
    startCall: (remoteUser: User, type: 'audio' | 'video') => Promise<void>;
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
    const isProcessing = useRef(false);

    const cleanup = useCallback(async () => {
        console.log('[CallContext] Cleaning up local state');
        // Reset state immediately for responsive UI
        setCallStatus('idle');
        setIncomingCall(null);
        setActiveCall(null);
        setIsMuted(false);
        setIsVideoOff(false);

        // Then do the heavy lifting of leaving the channel
        isProcessing.current = true;
        try {
            await agora.leaveChannel();
        } catch (err) {
            console.error('[CallContext] Error during agora cleanup:', err);
        } finally {
            isProcessing.current = false;
        }
    }, [agora]);

    // Handle Socket events
    useEffect(() => {
        if (!socket) return;

        const handleIncoming = (data: CallData) => {
            console.log('[CallContext] Incoming call:', data.channelName, data.callType);
            setIncomingCall(data);
            setCallStatus('ringing');
        };

        const handleAccepted = async (data: { channelName: string }) => {
            console.log('[CallContext] Call accepted by remote:', data.channelName);
            if (callStatus === 'calling' && !isProcessing.current) {
                isProcessing.current = true;
                try {
                    console.log('[CallContext] Fetching token for caller...');
                    const res = await getAgoraToken(data.channelName, 0);
                    const appId = res.data.appId || process.env.NEXT_PUBLIC_AGORA_APP_ID || '';
                    console.log('[CallContext] Caller joining channel with appId:', appId);
                    await agora.joinChannel(appId, data.channelName, res.data.token, 0);
                    await agora.publishTracks(isAudioOnly ? 'audio' : 'video');
                    console.log('[CallContext] Caller connected and published');
                    setCallStatus('connected');
                } catch (err) {
                    console.error('[CallContext] Caller failed to join accepted call:', err);
                    toast.error('Failed to connect call');
                    await cleanup();
                } finally {
                    isProcessing.current = false;
                }
            }
        };

        const handleRejected = () => {
            console.log('[CallContext] Call rejected by remote');
            if (callStatus === 'calling') {
                toast.error('Call rejected');
                cleanup();
            }
        };

        const handleEnded = () => {
            console.log('[CallContext] Call ended by remote');
            cleanup();
        };

        socket.on('incoming_call', handleIncoming);
        socket.on('call_accepted', handleAccepted);
        socket.on('call_rejected', handleRejected);
        socket.on('call_ended', handleEnded);

        return () => {
            socket.off('incoming_call', handleIncoming);
            socket.off('call_accepted', handleAccepted);
            socket.off('call_rejected', handleRejected);
            socket.off('call_ended', handleEnded);
        };
    }, [socket, callStatus, isAudioOnly, agora, cleanup]);

    const startCall = async (remoteUser: User, type: 'audio' | 'video') => {
        if (!user || isProcessing.current) return;
        const channelName = `call_${user._id}_${Date.now()}`;
        console.log('[CallContext] Initiating call with:', remoteUser.username, type);
        setIsAudioOnly(type === 'audio');

        try {
            setCallStatus('calling');
            setActiveCall({
                callerId: user,
                receiverId: remoteUser._id,
                channelName,
                callType: type,
                receiverInfo: remoteUser // Added for UI
            } as any);

            await initiateCall({
                callerId: user._id,
                receiverId: remoteUser._id,
                channelName,
                callType: type,
            });
        } catch (err) {
            console.error('[CallContext] Failed to initiate call:', err);
            toast.error('Failed to initiate call');
            setCallStatus('idle');
            setActiveCall(null);
        }
    };

    const acceptCall = async () => {
        if (!incomingCall || !socket || isProcessing.current) return;
        console.log('[CallContext] Accepting call:', incomingCall.channelName);

        isProcessing.current = true;
        try {
            const { channelName, callType } = incomingCall;
            setIsAudioOnly(callType === 'audio');
            setActiveCall(incomingCall);

            console.log('[CallContext] Fetching token for receiver...');
            const res = await getAgoraToken(channelName, 0);
            const appId = res.data.appId || process.env.NEXT_PUBLIC_AGORA_APP_ID || '';
            console.log('[CallContext] Receiver joining channel with appId:', appId);
            await agora.joinChannel(appId, channelName, res.data.token, 0);
            await agora.publishTracks(callType);

            socket.emit('call_accepted', { channelName, callerId: incomingCall.callerId._id });
            console.log('[CallContext] Receiver connected and published');
            setCallStatus('connected');
            setIncomingCall(null);
        } catch (err) {
            console.error('[CallContext] Failed to accept call:', err);
            toast.error('Failed to connect call');
            await cleanup();
        } finally {
            isProcessing.current = false;
        }
    };

    const rejectCall = () => {
        if (!incomingCall || !socket || isProcessing.current) return;
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
