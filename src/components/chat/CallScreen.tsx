'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useCall, CALL_STATUS } from '@/context/CallContext';
import { useAgora } from '@/context/AgoraContext';
import { useSocket } from '@/context/SocketContext';
import CallControls from './CallControls';
import AudioCall from './AudioCall';

export default function CallScreen() {
    const { callStatus, callData, resetCall } = useCall();
    const { localVideoTrack, remoteUsers, isMuted, isCameraOff, toggleMute, toggleCamera, leaveChannel } = useAgora();
    const { socket } = useSocket();
    const localVideoRef = useRef<HTMLDivElement>(null);

    // Play local video track
    useEffect(() => {
        if (localVideoTrack && localVideoRef.current) {
            localVideoTrack.play(localVideoRef.current);
        }
        return () => {
            if (localVideoTrack) localVideoTrack.stop();
        };
    }, [localVideoTrack]);

    const handleEndCall = useCallback(async () => {
        const otherUserId = callData?.otherUserId;
        const channelName = callData?.channelName;
        console.log(`[UI] Ending call. Channel: ${channelName}, Other: ${otherUserId}`);
        if (socket) {
            socket.emit('end_call', { otherUserId, channelName });
        }
        await leaveChannel();
        resetCall();
    }, [socket, callData, leaveChannel, resetCall]);

    // Show if OUTGOING or ONGOING
    if (callStatus !== CALL_STATUS.ONGOING && callStatus !== CALL_STATUS.OUTGOING) return null;

    const isVideo = callData?.callType === 'video';
    const isOngoing = callStatus === CALL_STATUS.ONGOING;
    const otherUser = callData?.callerId || { username: 'Unknown' };

    return (
        <div className="fixed inset-0 z-[110] bg-[#0D0D1A] flex flex-col animate-in slide-in-from-bottom duration-500">
            <div className="flex-1 relative overflow-hidden">
                {/* Remote video / waiting state */}
                {isVideo ? (
                    isOngoing && remoteUsers.length > 0 ? (
                        <RemoteVideo user={remoteUsers[0]} />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center flex-col bg-[#0D0D1A]">
                            <div className="w-28 h-28 rounded-full bg-[#7C6EFF]/20 flex items-center justify-center text-5xl animate-pulse mb-4">👤</div>
                            <p className="text-white/60 text-lg">{callStatus === CALL_STATUS.OUTGOING ? 'Ringing...' : 'Connecting...'}</p>
                        </div>
                    )
                ) : (
                    <AudioCall
                        otherUser={otherUser}
                        isConnected={isOngoing}
                        remoteConnected={remoteUsers.length > 0}
                    />
                )}

                {/* Status Header */}
                <div className="absolute top-8 left-0 right-0 flex justify-center pointer-events-none z-20">
                    <div className="bg-black/20 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isOngoing ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                        <span className="text-sm font-mono text-white/90">
                            {isOngoing ? 'On call' : (callStatus === CALL_STATUS.OUTGOING ? 'Calling...' : 'Connecting...')}
                        </span>
                    </div>
                </div>

                {/* Local Video PiP */}
                {isVideo && (
                    <div
                        ref={localVideoRef}
                        className="absolute bottom-24 right-4 w-28 h-20 rounded-xl overflow-hidden bg-[#1A1A2E] border border-white/10 shadow-lg z-20 scale-x-[-1]"
                    />
                )}
            </div>

            {/* Controls */}
            <div className="h-24 flex items-center justify-center gap-6 bg-black/30 backdrop-blur-sm">
                <CallControls
                    isMuted={isMuted}
                    isVideoOff={isCameraOff}
                    isAudioOnly={!isVideo}
                    onToggleMute={toggleMute}
                    onToggleVideo={toggleCamera}
                    onLeave={handleEndCall}
                />
            </div>
        </div>
    );
}

function RemoteVideo({ user }: { user: any }) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (user.videoTrack && ref.current) user.videoTrack.play(ref.current);
        return () => { if (user.videoTrack) user.videoTrack.stop(); };
    }, [user]);
    return <div ref={ref} className="w-full h-full" />;
}
