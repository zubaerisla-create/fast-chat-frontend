'use client';

import { useEffect, useRef } from 'react';
import { IAgoraRTCRemoteUser, ICameraVideoTrack } from 'agora-rtc-sdk-ng';

interface VideoCallProps {
    localTrack: ICameraVideoTrack | null;
    remoteUsers: IAgoraRTCRemoteUser[];
}

export default function VideoCall({ localTrack, remoteUsers }: VideoCallProps) {
    const localRef = useRef<HTMLDivElement>(null);
    const remoteRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (localTrack && localRef.current) {
            console.log('[VideoCall] Playing local track');
            localTrack.play(localRef.current);
        }
        return () => {
            console.log('[VideoCall] Stopping local track');
            localTrack?.stop();
        };
    }, [localTrack, localRef]);

    useEffect(() => {
        const remoteUser = remoteUsers[0];
        console.log('[VideoCall] Remote users update:', remoteUsers.length);
        if (remoteUser?.videoTrack && remoteRef.current) {
            console.log('[VideoCall] Playing remote video track for user:', remoteUser.uid);
            remoteUser.videoTrack.play(remoteRef.current);
        }
        return () => {
            if (remoteUser?.videoTrack) {
                console.log('[VideoCall] Stopping remote video track');
                remoteUser.videoTrack.stop();
            }
        };
    }, [remoteUsers, remoteRef]);

    return (
        <div className="relative w-full h-full bg-[#0D0D1A] overflow-hidden rounded-3xl">
            {/* Remote Video (Main) */}
            <div ref={remoteRef} className="w-full h-full bg-slate-900 flex items-center justify-center">
                {(!remoteUsers[0] || !remoteUsers[0].videoTrack) && (
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-20 h-20 rounded-full bg-white/5 animate-pulse flex items-center justify-center">
                            <span className="text-white/20 text-3xl">👤</span>
                        </div>
                        <p className="text-white/40 text-sm font-sans">
                            {remoteUsers.length > 0 ? 'Connecting stream...' : 'Waiting for participant...'}
                        </p>
                    </div>
                )}
            </div>

            {/* Local Video (PIP) */}
            <div
                ref={localRef}
                className="absolute bottom-6 right-6 w-32 md:w-48 aspect-video bg-slate-800 rounded-2xl border-2 border-white/10 shadow-2xl overflow-hidden z-10"
            />
        </div>
    );
}
