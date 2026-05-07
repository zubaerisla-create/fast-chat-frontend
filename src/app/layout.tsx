'use client';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { SocketProvider } from '@/context/SocketContext';
import { CallProvider } from '@/context/CallContext';
import { AgoraProvider } from '@/context/AgoraContext';
import { Toaster } from 'react-hot-toast';
import CallModal from '@/components/chat/CallModal';
import CallScreen from '@/components/chat/CallScreen';
import CallSocketWiring from '@/components/chat/CallSocketWiring';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-[#0D0D1A] text-white font-sans antialiased" suppressHydrationWarning>
        <AuthProvider>
          <SocketProvider>
            <AgoraProvider>
              <CallProvider>
                {/* Wire up all socket call events globally */}
                <CallSocketWiring />
                {children}
                <CallModal />
                <CallScreen />
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
      </body>
    </html>
  );
}
