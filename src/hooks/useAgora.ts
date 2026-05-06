import { useState, useCallback, useEffect } from 'react';
import AgoraRTC, {
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

    useEffect(() => {
        const init = async () => {
            const { default: AgoraRTC } = await import('agora-rtc-sdk-ng');
            const c = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
            setClient(c);
        };

        init();

        return () => {
            client?.leave();
        };
    }, []);

    const joinChannel = useCallback(
        async (appId: string, channelName: string, token: string, uid: number) => {
            if (!client) return;

            client.on('user-published', async (user, mediaType) => {
                await client.subscribe(user, mediaType);
                if (mediaType === 'video') {
                    setRemoteUsers((prev) => {
                        if (prev.find((u) => u.uid === user.uid)) return prev;
                        return [...prev, user];
                    });
                }
                if (mediaType === 'audio') {
                    user.audioTrack?.play();
                }
            });

            client.on('user-unpublished', (user) => {
                setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
            });

            client.on('user-left', (user) => {
                setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
            });

            await client.join(appId, channelName, token, uid);
        },
        [client]
    );

    const publishTracks = useCallback(
        async (type: 'audio' | 'video') => {
            if (!client) return;
            const { default: AgoraRTC } = await import('agora-rtc-sdk-ng');

            const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
            setLocalAudioTrack(audioTrack);

            if (type === 'video') {
                try {
                    const videoTrack = await AgoraRTC.createCameraVideoTrack();
                    setLocalVideoTrack(videoTrack);
                    await client.publish([audioTrack, videoTrack]);
                } catch (err) {
                    console.error('Camera access denied', err);
                    await client.publish([audioTrack]);
                }
            } else {
                await client.publish([audioTrack]);
            }
        },
        [client]
    );

    const leaveChannel = useCallback(async () => {
        localAudioTrack?.close();
        localVideoTrack?.close();
        setLocalAudioTrack(null);
        setLocalVideoTrack(null);
        setRemoteUsers([]);
        if (client) {
            await client.leave();
        }
    }, [client, localAudioTrack, localVideoTrack]);

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
    };
};
