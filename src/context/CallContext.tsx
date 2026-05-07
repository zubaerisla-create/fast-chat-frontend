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
    const isProcessing = useRef(false);

    const { leaveChannel: agoraLeave } = agora;

    const activeChannelRef = useRef<string | null>(null);

    const cleanup = useCallback(async () => {
        console.log('[CallContext] Cleaning up local state');
        activeChannelRef.current = null; // Invalidate current session immediately

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
            // We check if we are in a state that expects a connection
            const isExpectingConnection = callStatus === 'calling' || callStatus === 'ringing' || incomingCall !== null;

            if (isExpectingConnection && !isProcessing.current) {
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
                console.warn('[Call] Ignoring acceptCall: State mismatch or already processing', {
                    callStatus,
                    isExpecting: isExpectingConnection,
                    isProcessing: isProcessing.current
                });
            }
        };

        const handleRejected = () => {
            console.log('[Socket] callRejected received');
            if (callStatus === 'calling') {
                toast.error('Call rejected');
                cleanup();
            }
        };

        const handleEnded = () => {
            console.log('[Socket] callEnded received');
            cleanup();
        };

        // Listen for new event names
        socket.on('incomingCall', handleIncoming);
        socket.on('acceptCall', handleAccepted);
        socket.on('callRejected', handleRejected);
        socket.on('callEnded', handleEnded);

        // Fallback for old event names
        socket.on('incoming_call', handleIncoming);
        socket.on('call_accepted', handleAccepted);
        socket.on('call_rejected', handleRejected);
        socket.on('call_ended', handleEnded);

        return () => {
            socket.off('incomingCall', handleIncoming);
            socket.off('acceptCall', handleAccepted);
            socket.off('callRejected', handleRejected);
            socket.off('callEnded', handleEnded);

            socket.off('incoming_call', handleIncoming);
            socket.off('call_accepted', handleAccepted);
            socket.off('call_rejected', handleRejected);
            socket.off('call_ended', handleEnded);
        };
    }, [socket, callStatus, isAudioOnly, agora, cleanup]);

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

            // Purely socket-based initiation as requested
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
        if (!incomingCall || !socket || isProcessing.current) return;
        console.log('[Call] Accepting call (Socket Only Mode):', incomingCall.channelName);
        activeChannelRef.current = incomingCall.channelName;

        try {
            const { channelName, callType } = incomingCall;
            setIsAudioOnly(callType === 'audio');
            setActiveCall(incomingCall);

            // Signal acceptance - Backend will now broadcast tokens to BOTH users
            socket.emit('acceptCall', {
                channelName,
                callerId: incomingCall.callerId._id
            });

            console.log('[Socket] acceptCall emitted. Waiting for tokens broadcast...');
            // The handleAccepted listener will finish the job when tokens arrive
        } catch (err) {
            console.error('[Call] Failed to emit acceptance:', err);
            toast.error('Failed to accept call');
            await cleanup();
        }
    };

    const rejectCall = () => {
        if (!incomingCall || !socket || isProcessing.current) return;
        socket.emit('callRejected', { callerId: incomingCall.callerId._id });
        socket.emit('call_rejected', { callerId: incomingCall.callerId._id });
        cleanup();
    };

    const leaveCall = async () => {
        console.log('[Call] Initiating leaveCall');
        if (activeCall && socket) {
            // Identify the remote user ID to notify them
            const remoteUserId = activeCall.callerId._id === user?._id
                ? activeCall.receiverId
                : activeCall.callerId._id;

            console.log('[Socket] Emitting callEnded to:', remoteUserId);
            socket.emit('callEnded', {
                channelName: activeCall.channelName,
                receiverId: remoteUserId
            });
            socket.emit('call_ended', {
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
