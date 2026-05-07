'use client';

import { useEffect } from 'react';
import { useCall } from '@/context/CallContext';
import { useAgora } from '@/context/AgoraContext';

/**
 * Attaches all socket.io call-related event listeners.
 * Call this ONCE in your main App or layout component.
 */
export function useCallSocket(socket: any) {
    const { startIncomingCall, joinCall, resetCall } = useCall();
    const { joinChannel, leaveChannel } = useAgora();

    useEffect(() => {
        if (!socket) return;

        // Receiver: Incoming call notification
        socket.on('incomingCall', (data: any) => {
            console.log('[Socket] incomingCall received:', data.channelName);
            startIncomingCall(data); // { callerId, channelName, callType, callerName }
        });

        // Caller: Backend confirmed call was placed
        socket.on('call_initiated', (data: any) => {
            console.log('[Socket] call_initiated:', data.channelName);
        });

        // BOTH users: Received tokens — join Agora channel now
        socket.on('call_joined', async (data: any) => {
            console.log('[Socket] call_joined received:', data);
            // data = { channelName, token, uid, appId, callType, otherUserId }
            joinCall(data); // Update CallContext state to ONGOING
            try {
                await joinChannel(data.appId, data.channelName, data.token, data.uid, data.callType);
            } catch (err) {
                console.error('[Agora] Failed to join channel after call_joined:', err);
                resetCall();
            }
        });

        // Call was rejected
        socket.on('call_rejected', () => {
            console.log('[Socket] call_rejected');
            resetCall();
        });

        // Call ended by other party
        socket.on('call_ended', async () => {
            console.log('[Socket] call_ended received');
            await leaveChannel();
            resetCall();
        });

        // Error from backend
        socket.on('call_error', (data: any) => {
            console.error('[Socket] call_error:', data.message);
            resetCall();
        });

        return () => {
            socket.off('incomingCall');
            socket.off('call_initiated');
            socket.off('call_joined');
            socket.off('call_rejected');
            socket.off('call_ended');
            socket.off('call_error');
        };
    }, [socket, startIncomingCall, joinCall, resetCall, joinChannel, leaveChannel]);
}
