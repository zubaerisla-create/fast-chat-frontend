import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { AgoraProvider } from './context/AgoraContext';
import { CallProvider } from './context/CallContext';
import CallModal from './components/chat/CallModal';
import CallScreen from './components/chat/CallScreen';

/**
 * App_Sample.tsx
 * 
 * Demonstrates how to wrap your application with the necessary providers
 * to enable the real-time calling system.
 */
function AppSample({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <SocketProvider>
                <AgoraProvider>
                    <CallProvider>
                        {/* Your main application components */}
                        {children}

                        {/* Calling UI Components */}
                        <CallModal />
                        <CallScreen />
                    </CallProvider>
                </AgoraProvider>
            </SocketProvider>
        </AuthProvider>
    );
}

export default AppSample;
