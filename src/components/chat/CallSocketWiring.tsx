'use client';

import { useSocket } from '@/context/SocketContext';
import { useCallSocket } from '@/hooks/useCallSocket';

/**
 * Mounts the call socket listeners app-wide.
 * Must live inside SocketProvider + AgoraProvider + CallProvider.
 */
export default function CallSocketWiring() {
    const { socket } = useSocket();
    useCallSocket(socket);
    return null;
}
