import { useState, useCallback, useEffect, useRef } from 'react';
import type {
    IAgoraRTCClient,
    IAgoraRTCRemoteUser,
    ICameraVideoTrack,
    IMicrophoneAudioTrack,
} from 'agora-rtc-sdk-ng';

type ConnectionState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'DISCONNECTING';

export const useAgora = () => {
    const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
    const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);
    const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);

    const clientRef = useRef<IAgoraRTCClient | null>(null);
    const connectionState = useRef<ConnectionState>('DISCONNECTED');

    useEffect(() => {
        const init = async () => {
            if (clientRef.current) return;
            const { default: AgoraRTC } = await import('agora-rtc-sdk-ng');
            const c = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
            clientRef.current = c;
            console.log('[Agora] Client singleton created');
        };

        init();

        return () => {
            if (clientRef.current) {
                console.log('[Agora] Component unmounting, cleaning up...');
                clientRef.current.leave();
                clientRef.current = null;
                connectionState.current = 'DISCONNECTED';
            }
        };
    }, []);

    const joinChannel = useCallback(
        async (appId: string, channelName: string, token: string, uid: number) => {
            if (!clientRef.current || connectionState.current !== 'DISCONNECTED') {
                console.warn(`[Agora] Join skipped. State: ${connectionState.current}`);
                return;
            }

            connectionState.current = 'CONNECTING';
            const activeClient = clientRef.current;

            console.log(`[Agora] Joining channel: ${channelName}`);

            activeClient.on('user-published', async (user, mediaType) => {
                console.log(`[Agora] User published: ${user.uid}, type=${mediaType}`);
                try {
                    await activeClient.subscribe(user, mediaType);
                    console.log(`[Agora] Subscribed to ${user.uid} (${mediaType})`);

                    if (mediaType === 'video') {
                        setRemoteUsers((prev) => {
                            if (prev.find((u) => u.uid === user.uid)) return prev;
                            return [...prev, user];
                        });
                    }
                    if (mediaType === 'audio') {
                        user.audioTrack?.play();
                    }
                } catch (err) {
                    console.error('[Agora] Subscribe failed:', err);
                }
            });

            activeClient.on('user-unpublished', (user, mediaType) => {
                console.log(`[Agora] User unpublished: ${user.uid} (${mediaType})`);
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
                connectionState.current = 'CONNECTED';
                console.log('[Agora] Join success');
            } catch (err) {
                connectionState.current = 'DISCONNECTED';
                console.error('[Agora] Join failed:', err);
                throw err;
            }
        },
        []
    );

    const publishTracks = useCallback(
        async (type: 'audio' | 'video') => {
            const activeClient = clientRef.current;
            if (!activeClient || connectionState.current !== 'CONNECTED') {
                console.warn('[Agora] Cannot publish: not connected');
                return;
            }

            console.log(`[Agora] Publishing tracks: ${type}`);
            const { default: AgoraRTC } = await import('agora-rtc-sdk-ng');

            try {
                if (type === 'video') {
                    const [audio, video] = await AgoraRTC.createMicrophoneAndCameraTracks();
                    setLocalAudioTrack(audio);
                    setLocalVideoTrack(video);
                    await activeClient.publish([audio, video]);
                } else {
                    const audio = await AgoraRTC.createMicrophoneAudioTrack();
                    setLocalAudioTrack(audio);
                    await activeClient.publish([audio]);
                }
                console.log('[Agora] Tracks published successfully');
            } catch (err) {
                console.error('[Agora] Publish failed:', err);
                throw err;
            }
        },
        []
    );

    const leaveChannel = useCallback(async () => {
        if (!clientRef.current || connectionState.current === 'DISCONNECTED') return;

        console.log('[Agora] Leaving channel...');
        connectionState.current = 'DISCONNECTING';

        localAudioTrack?.stop();
        localAudioTrack?.close();
        localVideoTrack?.stop();
        localVideoTrack?.close();

        setLocalAudioTrack(null);
        setLocalVideoTrack(null);
        setRemoteUsers([]);

        try {
            await clientRef.current.leave();
            console.log('[Agora] Left channel successfully');
        } catch (err) {
            console.error('[Agora] Error during leave:', err);
        } finally {
            connectionState.current = 'DISCONNECTED';
            // Cleanup listeners
            clientRef.current?.removeAllListeners();
        }
    }, [localAudioTrack, localVideoTrack]);

    const toggleMute = useCallback(
        async (isMuted: boolean) => {
            await localAudioTrack?.setEnabled(!isMuted);
        },
        [localAudioTrack]
    );

    const toggleVideo = useCallback(
        async (isOff: boolean) => {
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
        isConnected: connectionState.current === 'CONNECTED',
    };
};
