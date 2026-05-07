import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type {
    IAgoraRTCClient,
    IAgoraRTCRemoteUser,
    ICameraVideoTrack,
    IMicrophoneAudioTrack,
    IMicrophoneAudioTrack as ILocalAudioTrack,
    ICameraVideoTrack as ILocalVideoTrack,
} from 'agora-rtc-sdk-ng';

type ConnectionState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'DISCONNECTING';

export const useAgora = () => {
    const [localAudioTrack, _setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
    const [localVideoTrack, _setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);
    const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);

    const clientRef = useRef<IAgoraRTCClient | null>(null);
    const connectionState = useRef<ConnectionState>('DISCONNECTED');

    // Use refs for tracks to ensure leaveChannel always has the latest instances without re-binding
    const audioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
    const videoTrackRef = useRef<ICameraVideoTrack | null>(null);

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
            console.log('[Agora] Client initialized');
        };

        init();

        return () => {
            if (clientRef.current) {
                console.log('[Agora] Unmounting - cleaning up');
                clientRef.current.leave();
                clientRef.current = null;
                connectionState.current = 'DISCONNECTED';
            }
        };
    }, []);

    const joinChannel = useCallback(
        async (appId: string, channelName: string, token: string, uid: number) => {
            if (!clientRef.current) return;
            if (connectionState.current !== 'DISCONNECTED') {
                console.warn('[Agora] Join ignored, already in state:', connectionState.current);
                return;
            }

            connectionState.current = 'CONNECTING';
            const activeClient = clientRef.current;

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
                        console.log(`[Agora] Attempting to play audio for: ${user.uid}`);
                        user.audioTrack?.play();
                    }
                } catch (err) {
                    console.error('[Agora] Subscription error:', err);
                }
            });

            activeClient.on('user-unpublished', (user, mediaType) => {
                console.log(`[Agora] Remote user unpublished: ${user.uid} (${mediaType})`);
                // Only remove from remoteUsers if both tracks are gone or it's a specific type
                // For simplicity in 1-to-1, we can just check if the user still has tracks
                if (!user.hasAudio && !user.hasVideo) {
                    setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
                }
            });

            activeClient.on('user-left', (user) => {
                setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
            });

            try {
                await activeClient.join(appId, channelName, token, uid);
                connectionState.current = 'CONNECTED';
                console.log('[Agora] Joined channel successfully');
            } catch (err) {
                connectionState.current = 'DISCONNECTED';
                console.error('[Agora] Join error:', err);
                throw err;
            }
        },
        []
    );

    const publishTracks = useCallback(
        async (type: 'audio' | 'video') => {
            if (!clientRef.current || connectionState.current !== 'CONNECTED') {
                console.warn('[Agora] Publish ignored, connection not ready');
                return;
            }

            console.log(`[Agora] Publishing ${type} tracks`);
            const { default: AgoraRTC } = await import('agora-rtc-sdk-ng');

            try {
                if (type === 'video') {
                    const [audio, video] = await AgoraRTC.createMicrophoneAndCameraTracks();
                    setLocalAudioTrack(audio);
                    setLocalVideoTrack(video);
                    await clientRef.current.publish([audio, video]);
                } else {
                    const audio = await AgoraRTC.createMicrophoneAudioTrack();
                    await audio.setEnabled(true); // Added for safety
                    setLocalAudioTrack(audio);
                    await clientRef.current.publish([audio]);
                }
                console.log('[Agora] Tracks published');
            } catch (err) {
                console.error('[Agora] Publish error:', err);
                throw err;
            }
        },
        []
    );

    const leaveChannel = useCallback(async () => {
        // We don't check state here to allow forced cleanup
        console.log('[Agora] leaveChannel called');
        console.trace('[Agora] Trace for leaveChannel:');
        connectionState.current = 'DISCONNECTING';

        // Stop and close tracks immediately using refs
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

        if (clientRef.current) {
            try {
                await clientRef.current.leave();
                clientRef.current.removeAllListeners();
            } catch (err) {
                console.error('[Agora] Leave error:', err);
            }
        }
        connectionState.current = 'DISCONNECTED';
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
