'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import { useAgoraContext } from './AgoraContext';
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
    const agora = useAgoraContext();

    const [callStatus, setCallStatus] = useState<CallStatus>('idle');
    const [incomingCall, setIncomingCall] = useState<CallData | null>(null);
    const [activeCall, setActiveCall] = useState<CallData | null>(null);
    const [isAudioOnly, setIsAudioOnly] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);

    // Using refs for stable access in event listeners
    const isProcessing = useRef(false);
    const activeChannelRef = useRef<string | null>(null);

    const { leaveChannel: agoraLeave } = agora;

    const cleanup = useCallback(async () => {
        console.log('[CallContext] Cleaning up local state');
        activeChannelRef.current = null;
        setCallStatus('idle');
        setIncomingCall(null);
        setActiveCall(null);
        setIsMuted(false);
        setIsVideoOff(false);

        isProcessing.current = true;
        try {
            await agoraLeave();
        } catch (err) {
            console.error('[CallContext] Error during agora cleanup:', err);
        } finally {
            isProcessing.current = false;
        }
    }, [agoraLeave]);

    // Handle Socket events
    useEffect(() => {
        if (!socket) return;

        const handleIncoming = (data: CallData) => {
            console.log('[Socket] incomingCall received:', data.channelName);
            setIncomingCall(data);
            setCallStatus('ringing');
        };

        const handleAccepted = async (data: { channelName: string; token?: string; appId?: string; uid?: number }) => {
            console.log('[Socket] acceptCall signal received (broadcasting tokens):', data);

            // Both parties handle this broadcast to finalize connection
            // We expect connection if the status is calling, ringing, or we have an incomingCall
            if (!isProcessing.current) {
                isProcessing.current = true;
                try {
                    const appId = data.appId || process.env.NEXT_PUBLIC_AGORA_APP_ID || '';
                    const token = data.token;
                    const uid = data.uid || 0;

                    if (!token) {
                        console.error('[Call] No token in handleAccepted broadcast');
                        throw new Error('No token provided');
                    }

                    console.log('[Agora] Joining channel with broadcasted token');
                    await agora.joinChannel(appId, data.channelName, token, uid);
                    await agora.publishTracks(isAudioOnly ? 'audio' : 'video');

                    console.log('[Call] Session connected successfully');
                    setCallStatus('connected');
                    setIncomingCall(null);
                } catch (err) {
                    console.error('[Call] Final session handshake failed:', err);
                    toast.error('Failed to connect call');
                    await cleanup();
                } finally {
                    isProcessing.current = false;
                }
            } else {
                console.log('[Call] Handled acceptCall broadcast - already processing or joined');
            }
        };

        const handleRejected = () => {
            console.log('[Socket] callRejected received');
            toast.error('Call rejected');
            cleanup();
        };

        const handleEnded = () => {
            console.log('[Socket] callEnded received');
            cleanup();
        };

        socket.on('incomingCall', handleIncoming);
        socket.on('acceptCall', handleAccepted);
        socket.on('callRejected', handleRejected);
        socket.on('callEnded', handleEnded);

        // Aliases and fallbacks
        socket.on('initiate_call', handleIncoming);
        socket.on('call_accepted', handleAccepted);
        socket.on('call_rejected', handleRejected);
        socket.on('call_ended', handleEnded);

        return () => {
            socket.off('incomingCall', handleIncoming);
            socket.off('acceptCall', handleAccepted);
            socket.off('callRejected', handleRejected);
            socket.off('callEnded', handleEnded);
            socket.off('initiate_call', handleIncoming);
            socket.off('call_accepted', handleAccepted);
            socket.off('call_rejected', handleRejected);
            socket.off('call_ended', handleEnded);
        };
    }, [socket, isAudioOnly, agora, cleanup, incomingCall]); // Added incomingCall to deps to ensure handler has access? Actually handled via isProcessing

    const startCall = async (remoteUser: User, type: 'audio' | 'video') => {
        if (!user || isProcessing.current || !socket) return;
        const channelName = `call_${user._id}_${Date.now()}`;
        console.log('[Call] Initiating socket call with:', remoteUser.username, type);

        setIsAudioOnly(type === 'audio');
        activeChannelRef.current = channelName;

        try {
            setCallStatus('calling');
            setActiveCall({
                callerId: user,
                receiverId: remoteUser._id,
                channelName,
                callType: type,
                receiverInfo: remoteUser
            } as any);

            socket.emit('initiate_call', {
                callerId: user,
                receiverId: remoteUser._id,
                channelName,
                callType: type,
            });
            console.log('[Socket] initiate_call emitted');
        } catch (err) {
            console.error('[Call] Failed to initiate call:', err);
            toast.error('Failed to initiate call');
            setCallStatus('idle');
            setActiveCall(null);
        }
    };

    const acceptCall = async () => {
        if (!incomingCall || !socket || isProcessing.current) {
            console.warn('[Call] acceptCall skipped - state mismatch or already processing');
            return;
        }

        console.log('[Call] Accepting call (Socket Only Mode):', incomingCall.channelName);
        activeChannelRef.current = incomingCall.channelName;

        // Mark as processing to prevent multiple clicks
        isProcessing.current = true;

        try {
            const { channelName, callType } = incomingCall;
            setIsAudioOnly(callType === 'audio');
            setActiveCall(incomingCall);

            socket.emit('acceptCall', {
                channelName,
                callerId: incomingCall.callerId._id
            });

            console.log('[Socket] acceptCall emitted. Waiting for tokens broadcast...');

            // Note: We don't set isProcessing false here because we want handleAccepted to handle the join.
            // But wait! handleAccepted checks !isProcessing.current.
            // So we MUST set it to false before handleAccepted arrives, or handleAccepted must know it's US.

            isProcessing.current = false; // Allow handleAccepted to proceed
            setIncomingCall(null); // Clear modal immediately
        } catch (err) {
            console.error('[Call] Failed to emit acceptance:', err);
            toast.error('Failed to accept call');
            isProcessing.current = false;
            await cleanup();
        }
    };

    const rejectCall = () => {
        if (!incomingCall || !socket || isProcessing.current) return;
        socket.emit('callRejected', { callerId: incomingCall.callerId._id });
        cleanup();
    };

    const leaveCall = async () => {
        console.log('[Call] Initiating leaveCall');
        if (activeCall && socket) {
            const remoteUserId = activeCall.callerId._id === user?._id
                ? activeCall.receiverId
                : activeCall.callerId._id;

            console.log('[Socket] Emitting callEnded to:', remoteUserId);
            socket.emit('callEnded', {
                channelName: activeCall.channelName,
                receiverId: remoteUserId
            });

            try {
                await endCall(activeCall.channelName, user?._id || '');
            } catch (err) {
                console.error('[Call] Error calling endCall API:', err);
            }
        }
        await cleanup();
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
