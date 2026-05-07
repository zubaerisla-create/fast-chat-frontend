'use client';

import React, { createContext, useContext, useState, useRef, useCallback, ReactNode } from 'react';

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

// Lazy singleton factory — only created in browser context to avoid SSR crash
let _client: any = null;
function getClient() {
    if (typeof window === 'undefined') return null;
    if (!_client) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const AgoraRTC = require('agora-rtc-sdk-ng');
        _client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    }
    return _client;
}

// Lazy AgoraRTC accessor (browser-only)
function getAgoraRTC() {
    if (typeof window === 'undefined') return null;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('agora-rtc-sdk-ng');
}

export function AgoraProvider({ children }: { children: ReactNode }) {
    const [localAudioTrack, setLocalAudioTrack] = useState<any>(null);
    const [localVideoTrack, setLocalVideoTrack] = useState<any>(null);
    const [remoteUsers, setRemoteUsers] = useState<any[]>([]);
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const tracksRef = useRef<any[]>([]);
    const listenersSetup = useRef(false);

    const setupListeners = useCallback(() => {
        const client = getClient();
        if (!client || listenersSetup.current) return;
        listenersSetup.current = true;

        client.on('user-published', async (user: any, mediaType: any) => {
            await client.subscribe(user, mediaType);
            console.log(`[Agora] Subscribed to ${user.uid}'s ${mediaType}`);
            if (mediaType === 'audio' && user.audioTrack) {
                user.audioTrack.play();
            }
            setRemoteUsers((prev) => {
                const exists = prev.find((u) => u.uid === user.uid);
                return exists ? prev.map((u) => (u.uid === user.uid ? user : u)) : [...prev, user];
            });
        });

        client.on('user-unpublished', (user: any) => {
            setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
        });

        client.on('user-left', (user: any) => {
            console.log(`[Agora] Remote user ${user.uid} left`);
            setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
        });
    }, []);

    const joinChannel = useCallback(async (appId: string, channelName: string, token: string, uid: number, callType: string) => {
        const client = getClient();
        const AgoraRTC = getAgoraRTC();
        if (!client || !AgoraRTC) throw new Error('Agora not available (SSR?)');

        try {
            setupListeners();
            console.log(`[Agora] Joining channel: ${channelName}, UID: ${uid}, callType: ${callType}`);
            await client.join(appId, channelName, token, uid);
            console.log('[Agora] Joined successfully');

            const audio = await AgoraRTC.createMicrophoneAudioTrack();
            setLocalAudioTrack(audio);
            tracksRef.current.push(audio);

            if (callType === 'video') {
                const video = await AgoraRTC.createCameraVideoTrack();
                setLocalVideoTrack(video);
                tracksRef.current.push(video);
                await client.publish([audio, video]);
            } else {
                await client.publish([audio]);
            }
            console.log(`[Agora] Published tracks for ${callType} call`);
        } catch (err) {
            console.error('[Agora] joinChannel error:', err);
            throw err;
        }
    }, [setupListeners]);

    const leaveChannel = useCallback(async () => {
        const client = getClient();
        if (!client || client.connectionState === 'DISCONNECTED') {
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
            await client.leave();
            listenersSetup.current = false;
            console.log('[Agora] Left channel');
        } catch (err) {
            console.error('[Agora] leaveChannel error:', err);
        }
    }, []);

    const toggleMute = useCallback(async () => {
        if (localAudioTrack) {
            await localAudioTrack.setEnabled(isMuted); // isMuted=true → enable (unmute)
            setIsMuted((prev) => !prev);
        }
    }, [localAudioTrack, isMuted]);

    const toggleCamera = useCallback(async () => {
        if (localVideoTrack) {
            await localVideoTrack.setEnabled(isCameraOff); // isCameraOff=true → enable camera
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
