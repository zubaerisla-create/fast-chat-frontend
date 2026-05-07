'use client';

import { useState, useEffect } from 'react';
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

    const [timer, setTimer] = useState(0);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (callStatus === 'connected') {
            interval = setInterval(() => setTimer((prev) => prev + 1), 1000);
        } else {
            setTimer(0);
        }
        return () => clearInterval(interval);
    }, [callStatus]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

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

                    {/* Call Header / Timer */}
                    <div className="absolute top-8 left-0 right-0 z-20 flex flex-col items-center pointer-events-none">
                        <div className="bg-black/20 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                            <span className="text-sm font-mono text-white/90 tabular-nums">
                                {isConnected ? formatTime(timer) : (callStatus === 'calling' ? 'Calling...' : 'Connecting...')}
                            </span>
                        </div>
                    </div>

                    {isAudioOnly ? (
                        <AudioCall
                            otherUser={otherUser}
                            isConnected={isConnected}
                            remoteConnected={remoteUsers.length > 0}
                        />
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
