import { useState, useCallback, useEffect, useRef } from 'react';
import type {
    IAgoraRTCClient,
    IAgoraRTCRemoteUser,
    ICameraVideoTrack,
    IMicrophoneAudioTrack,
} from 'agora-rtc-sdk-ng';

export const useAgora = () => {
    const [client, setClient] = useState<IAgoraRTCClient | null>(null);
    const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
    const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);
    const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);

    const clientRef = useRef<IAgoraRTCClient | null>(null);

    useEffect(() => {
        let activeClient: IAgoraRTCClient | null = null;
        const init = async () => {
            const { default: AgoraRTC } = await import('agora-rtc-sdk-ng');
            activeClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
            setClient(activeClient);
            clientRef.current = activeClient;
            console.log('[Agora] Client created');
        };

        init();

        return () => {
            if (activeClient) {
                console.log('[Agora] Cleaning up client');
                activeClient.leave();
            }
        };
    }, []);

    const joinChannel = useCallback(
        async (appId: string, channelName: string, token: string, uid: number) => {
            const activeClient = clientRef.current;
            if (!activeClient) {
                console.error('[Agora] Cannot join, client not initialized');
                return;
            }

            console.log(`[Agora] Attempting to join: Channel=${channelName}, UID=${uid}, Token=${token.substring(0, 10)}...`);

            activeClient.on('user-published', async (user, mediaType) => {
                console.log(`[Agora] User published: ${user.uid}, type=${mediaType}`);
                try {
                    await activeClient.subscribe(user, mediaType);
                    console.log(`[Agora] Subscribed to: ${user.uid}, type=${mediaType}`);

                    if (mediaType === 'video') {
                        setRemoteUsers((prev) => {
                            if (prev.find((u) => u.uid === user.uid)) return prev;
                            return [...prev, user];
                        });
                        // Note: video play is usually handled in the UI component
                    }
                    if (mediaType === 'audio') {
                        user.audioTrack?.play();
                        console.log(`[Agora] Playing audio for: ${user.uid}`);
                    }
                } catch (err) {
                    console.error(`[Agora] Subscribe failed for ${user.uid}:`, err);
                }
            });

            activeClient.on('user-unpublished', (user, mediaType) => {
                console.log(`[Agora] User unpublished: ${user.uid}, type=${mediaType}`);
                if (mediaType === 'video') {
                    setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
                }
            });

            activeClient.on('user-left', (user) => {
                console.log(`[Agora] User left: ${user.uid}`);
                setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
            });

            try {
                await activeClient.join(appId, channelName, token, uid);
                console.log('[Agora] Join success');
            } catch (err) {
                console.error('[Agora] Join failed:', err);
                throw err;
            }
        },
        []
    );

    const publishTracks = useCallback(
        async (type: 'audio' | 'video') => {
            const activeClient = clientRef.current;
            if (!activeClient) return;

            console.log(`[Agora] Creating tracks for: ${type}`);
            const { default: AgoraRTC } = await import('agora-rtc-sdk-ng');

            try {
                if (type === 'video') {
                    const [audio, video] = await AgoraRTC.createMicrophoneAndCameraTracks();
                    setLocalAudioTrack(audio);
                    setLocalVideoTrack(video);
                    await activeClient.publish([audio, video]);
                    console.log('[Agora] Published Audio & Video tracks');
                } else {
                    const audio = await AgoraRTC.createMicrophoneAudioTrack();
                    setLocalAudioTrack(audio);
                    await activeClient.publish([audio]);
                    console.log('[Agora] Published Audio track');
                }
            } catch (err) {
                console.error('[Agora] Publish failed:', err);
                throw err;
            }
        },
        []
    );

    const leaveChannel = useCallback(async () => {
        console.log('[Agora] Leaving channel');
        localAudioTrack?.stop();
        localAudioTrack?.close();
        localVideoTrack?.stop();
        localVideoTrack?.close();
        setLocalAudioTrack(null);
        setLocalVideoTrack(null);
        setRemoteUsers([]);
        if (clientRef.current) {
            await clientRef.current.leave();
        }
    }, [localAudioTrack, localVideoTrack]);

    const toggleMute = useCallback(
        async (isMuted: boolean) => {
            console.log(`[Agora] Mute toggled: ${isMuted}`);
            await localAudioTrack?.setEnabled(!isMuted);
        },
        [localAudioTrack]
    );

    const toggleVideo = useCallback(
        async (isOff: boolean) => {
            console.log(`[Agora] Video toggled: ${isOff}`);
            await localVideoTrack?.setEnabled(!isOff);
        },
        [localVideoTrack]
    );

    return {
        localAudioTrack,
        localVideoTrack,
        remoteUsers,
        joinChannel,
        publishTracks,
        leaveChannel,
        toggleMute,
        toggleVideo,
    };
};
