'use client';

import { useCall } from '@/context/CallContext';
import VideoCall from './VideoCall';
import AudioCall from './AudioCall';
import CallControls from './CallControls';
import { useAuth } from '@/context/AuthContext';

export default function CallScreen() {
    const { user } = useAuth();
    const {
        callStatus,
        activeCall,
        isAudioOnly,
        localVideoTrack,
        remoteUsers,
        leaveCall,
        toggleMute,
        toggleVideo,
        isMuted,
        isVideoOff,
    } = useCall();

    if (callStatus === 'idle' || callStatus === 'ringing' || !activeCall) return null;

    // Correctly identify the other user
    const otherUser = activeCall.callerId._id === user?._id
        ? (activeCall as any).receiverInfo
        : activeCall.callerId;

    const isConnected = callStatus === 'connected';

    return (
        <div className="fixed inset-0 z-[110] bg-[#0D0D1A] flex flex-col items-center justify-center animate-in slide-in-from-bottom duration-500">
            <div className="w-full max-w-5xl h-full md:h-[85vh] flex flex-col relative px-4 md:px-0">
                <div className="flex-1 relative overflow-hidden rounded-[2.5rem] shadow-2xl border border-white/5">
                    {isAudioOnly ? (
                        <AudioCall otherUser={otherUser} isConnected={isConnected} />
                    ) : (
                        <VideoCall localTrack={localVideoTrack} remoteUsers={remoteUsers} />
                    )}

                    {/* Controls Overlay */}
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20">
                        <CallControls
                            isMuted={isMuted}
                            isVideoOff={isVideoOff}
                            isAudioOnly={isAudioOnly}
                            onToggleMute={toggleMute}
                            onToggleVideo={toggleVideo}
                            onLeave={leaveCall}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
