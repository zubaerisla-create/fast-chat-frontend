'use client';

import React, { createContext, useContext, useState, useRef, useCallback, ReactNode } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';

interface AgoraContextType {
    localAudioTrack: any;
    localVideoTrack: any;
    remoteUsers: any[];
    isMuted: boolean;
    isCameraOff: boolean;
    joinChannel: (appId: string, channelName: string, token: string, uid: number, callType: string) => Promise<void>;
    leaveChannel: () => Promise<void>;
    toggleMute: () => Promise<void>;
    toggleCamera: () => Promise<void>;
}

const AgoraContext = createContext<AgoraContextType | null>(null);

// Singleton Agora client
const agoraClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

export function AgoraProvider({ children }: { children: ReactNode }) {
    const [localAudioTrack, setLocalAudioTrack] = useState<any>(null);
    const [localVideoTrack, setLocalVideoTrack] = useState<any>(null);
    const [remoteUsers, setRemoteUsers] = useState<any[]>([]);
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const tracksRef = useRef<any[]>([]);
    const listenersSetup = useRef(false);

    const setupListeners = useCallback(() => {
        if (listenersSetup.current) return;
        listenersSetup.current = true;

        agoraClient.on('user-published', async (user, mediaType) => {
            await agoraClient.subscribe(user, mediaType);
            console.log(`[Agora] Subscribed to ${user.uid}'s ${mediaType}`);
            if (mediaType === 'audio' && user.audioTrack) {
                user.audioTrack.play();
            }
            setRemoteUsers((prev) => {
                const exists = prev.find((u) => u.uid === user.uid);
                return exists ? prev.map((u) => (u.uid === user.uid ? user : u)) : [...prev, user];
            });
        });

        agoraClient.on('user-unpublished', (user) => {
            setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
        });

        agoraClient.on('user-left', (user) => {
            console.log(`[Agora] Remote user ${user.uid} left`);
            setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
        });
    }, []);

    const joinChannel = useCallback(async (appId: string, channelName: string, token: string, uid: number, callType: string) => {
        try {
            setupListeners();
            console.log(`[Agora] Joining channel: ${channelName}, UID: ${uid}, callType: ${callType}`);
            await agoraClient.join(appId, channelName, token, uid);
            console.log('[Agora] Joined successfully');

            const audio = await AgoraRTC.createMicrophoneAudioTrack();
            setLocalAudioTrack(audio);
            tracksRef.current.push(audio);

            if (callType === 'video') {
                const video = await AgoraRTC.createCameraVideoTrack();
                setLocalVideoTrack(video);
                tracksRef.current.push(video);
                await agoraClient.publish([audio, video]);
            } else {
                await agoraClient.publish([audio]);
            }
            console.log(`[Agora] Published tracks for ${callType} call`);
        } catch (err) {
            console.error('[Agora] joinChannel error:', err);
            throw err;
        }
    }, [setupListeners]);

    const leaveChannel = useCallback(async () => {
        if (agoraClient.connectionState === 'DISCONNECTED') {
            console.log('[Agora] Already disconnected, skip leave');
            listenersSetup.current = false;
            return;
        }
        tracksRef.current.forEach((track) => { track.stop(); track.close(); });
        tracksRef.current = [];
        setLocalAudioTrack(null);
        setLocalVideoTrack(null);
        setRemoteUsers([]);
        setIsMuted(false);
        setIsCameraOff(false);
        try {
            await agoraClient.leave();
            listenersSetup.current = false;
            console.log('[Agora] Left channel');
        } catch (err) {
            console.error('[Agora] leaveChannel error:', err);
        }
    }, []);

    const toggleMute = useCallback(async () => {
        if (localAudioTrack) {
            const newEnabled = isMuted; // if currently muted, enable it (true = enabled)
            await localAudioTrack.setEnabled(newEnabled);
            setIsMuted((prev) => !prev);
        }
    }, [localAudioTrack, isMuted]);

    const toggleCamera = useCallback(async () => {
        if (localVideoTrack) {
            const newEnabled = isCameraOff; // if currently camera off, enable it 
            await localVideoTrack.setEnabled(newEnabled);
            setIsCameraOff((prev) => !prev);
        }
    }, [localVideoTrack, isCameraOff]);

    return (
        <AgoraContext.Provider value={{
            localAudioTrack, localVideoTrack, remoteUsers,
            isMuted, isCameraOff,
            joinChannel, leaveChannel, toggleMute, toggleCamera,
        }}>
            {children}
        </AgoraContext.Provider>
    );
}

export function useAgora() {
    const ctx = useContext(AgoraContext);
    if (!ctx) throw new Error('useAgora must be used within AgoraProvider');
    return ctx;
}
