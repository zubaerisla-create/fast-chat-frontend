import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type {
    IAgoraRTCClient,
    IAgoraRTCRemoteUser,
    ICameraVideoTrack,
    IMicrophoneAudioTrack,
} from 'agora-rtc-sdk-ng';

type ConnectionState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'DISCONNECTING';

export const useAgora = () => {
    const [localAudioTrack, _setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
    const [localVideoTrack, _setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);
    const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);

    const clientRef = useRef<IAgoraRTCClient | null>(null);
    const connectionState = useRef<ConnectionState>('DISCONNECTED');

    const audioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
    const videoTrackRef = useRef<ICameraVideoTrack | null>(null);

    // Atomic flags for session control
    const sessionToken = useRef(0); // Used to cancel stale join attempts

    const setLocalAudioTrack = (track: IMicrophoneAudioTrack | null) => {
        audioTrackRef.current = track;
        _setLocalAudioTrack(track);
    };

    const setLocalVideoTrack = (track: ICameraVideoTrack | null) => {
        videoTrackRef.current = track;
        _setLocalVideoTrack(track);
    };

    useEffect(() => {
        const init = async () => {
            if (clientRef.current) return;
            const { default: AgoraRTC } = await import('agora-rtc-sdk-ng');
            const c = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
            clientRef.current = c;
            console.log('[Agora] Client singleton initialized');
        };

        init();

        return () => {
            if (clientRef.current) {
                console.log('[Agora] Unmounting hook, force-leaving channel');
                clientRef.current.leave();
                clientRef.current = null;
                connectionState.current = 'DISCONNECTED';
            }
        };
    }, []);

    const joinChannel = useCallback(
        async (appId: string, channelName: string, token: string, uid: number) => {
            if (!clientRef.current) return;

            // 1. Guard against overlapping joins
            if (connectionState.current !== 'DISCONNECTED') {
                console.warn(`[Agora] Join skipped. Current state line: ${connectionState.current}`);
                return;
            }

            console.log('[Agora] Starting join process...');
            connectionState.current = 'CONNECTING';
            const activeClient = clientRef.current;
            const currentToken = ++sessionToken.current;

            // 2. Setup handlers once
            activeClient.removeAllListeners();
            activeClient.on('user-published', async (user, mediaType) => {
                console.log(`[Agora] Remote user published: ${user.uid} (${mediaType})`);
                try {
                    await activeClient.subscribe(user, mediaType);
                    console.log(`[Agora] Subscribed to ${user.uid} (${mediaType})`);

                    setRemoteUsers((prev) => {
                        if (prev.find((u) => u.uid === user.uid)) return prev;
                        return [...prev, user];
                    });

                    if (mediaType === 'audio') {
                        console.log(`[Agora] Playing audio for: ${user.uid}`);
                        user.audioTrack?.play();
                    }
                } catch (err) {
                    console.error('[Agora] Subscribe failed:', err);
                }
            });

            activeClient.on('user-unpublished', (user, mediaType) => {
                if (mediaType === 'video') {
                    setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
                }
            });

            activeClient.on('user-left', (user) => {
                console.log(`[Agora] User left: ${user.uid}`);
                setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
            });

            try {
                // 3. Perform Join
                await activeClient.join(appId, channelName, token, uid);

                // 4. Check if we were cancelled during the await
                if (currentToken !== sessionToken.current) {
                    console.warn('[Agora] Join completed but was superseded/cancelled. Leaving now.');
                    activeClient.leave();
                    return;
                }

                connectionState.current = 'CONNECTED';
                console.log('[Agora] Joined successfully, state:', activeClient.connectionState);
            } catch (err) {
                connectionState.current = 'DISCONNECTED';
                console.error('[Agora] Join failure:', err);
                throw err;
            }
        },
        []
    );

    const publishTracks = useCallback(
        async (type: 'audio' | 'video') => {
            const activeClient = clientRef.current;
            if (!activeClient || connectionState.current !== 'CONNECTED') {
                console.warn('[Agora] Publish blocked: Client not connected');
                return;
            }

            const currentToken = sessionToken.current;
            const { default: AgoraRTC } = await import('agora-rtc-sdk-ng');

            try {
                if (type === 'video') {
                    const [audio, video] = await AgoraRTC.createMicrophoneAndCameraTracks();
                    if (currentToken !== sessionToken.current) {
                        audio.close(); video.close(); return;
                    }
                    setLocalAudioTrack(audio);
                    setLocalVideoTrack(video);
                    await activeClient.publish([audio, video]);
                } else {
                    const audio = await AgoraRTC.createMicrophoneAudioTrack();
                    if (currentToken !== sessionToken.current) {
                        audio.close(); return;
                    }
                    await audio.setEnabled(true);
                    setLocalAudioTrack(audio);
                    await activeClient.publish([audio]);
                }
                console.log('[Agora] Local tracks published');
            } catch (err) {
                console.error('[Agora] Publish error:', err);
                throw err;
            }
        },
        []
    );

    const leaveChannel = useCallback(async () => {
        sessionToken.current++; // Cancel any in-flight join/publish

        if (!clientRef.current || connectionState.current === 'DISCONNECTED') {
            console.log('[Agora] Already disconnected, skip leave');
            return;
        }

        console.log('[Agora] Initiating leaveChannel sequence');
        connectionState.current = 'DISCONNECTING';

        // Atomic track cleanup
        if (audioTrackRef.current) {
            audioTrackRef.current.stop();
            audioTrackRef.current.close();
            setLocalAudioTrack(null);
        }
        if (videoTrackRef.current) {
            videoTrackRef.current.stop();
            videoTrackRef.current.close();
            setLocalVideoTrack(null);
        }

        setRemoteUsers([]);

        try {
            await clientRef.current.leave();
            clientRef.current.removeAllListeners();
            console.log('[Agora] Left channel successfully');
        } catch (err) {
            console.error('[Agora] Error during client.leave():', err);
        } finally {
            connectionState.current = 'DISCONNECTED';
        }
    }, []);

    const toggleMute = useCallback(async (isMuted: boolean) => {
        await audioTrackRef.current?.setEnabled(!isMuted);
    }, []);

    const toggleVideo = useCallback(async (isOff: boolean) => {
        await videoTrackRef.current?.setEnabled(!isOff);
    }, []);

    const api = useMemo(() => ({
        localAudioTrack,
        localVideoTrack,
        remoteUsers,
        joinChannel,
        publishTracks,
        leaveChannel,
        toggleMute,
        toggleVideo,
        isConnected: connectionState.current === 'CONNECTED',
    }), [localAudioTrack, localVideoTrack, remoteUsers, joinChannel, publishTracks, leaveChannel, toggleMute, toggleVideo]);

    return api;
};
