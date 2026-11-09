'use client';

import { AuthProvider } from '@/context/AuthContext';
import { SocketProvider } from '@/context/SocketContext';
import { CallProvider } from '@/context/CallContext';
import { AgoraProvider } from '@/context/AgoraContext';
import { CurrencyProvider } from '@/context/CurrencyContext';
import { Toaster } from 'react-hot-toast';
import CallModal from '@/components/chat/CallModal';
import CallScreen from '@/components/chat/CallScreen';
import CallSocketWiring from '@/components/chat/CallSocketWiring';

// Everything the signed-in app needs. Public pages don't load this, so they
// never open a socket or touch the auth cookies.
export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuthProvider>
        <SocketProvider>
          <AgoraProvider>
            <CallProvider>
              <CurrencyProvider>
                {/* Wire up all socket call events globally */}
                <CallSocketWiring />
                {children}
                <CallModal />
                <CallScreen />
              </CurrencyProvider>
            </CallProvider>
          </AgoraProvider>
        </SocketProvider>
      </AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1A1A2E',
            color: '#fff',
            border: '1px solid rgba(124,110,255,0.3)',
            borderRadius: '12px',
          },
        }}
      />
    </>
  );
}
