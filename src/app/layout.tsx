import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { SocketProvider } from '@/context/SocketContext';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'Vibe — Chat',
  description: 'Real-time messaging. Clean, fast, yours.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-[#0D0D1A] text-white font-sans antialiased" suppressHydrationWarning>
        <AuthProvider>
          <SocketProvider>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: '#1A1A2E',
                  color: '#fff',
                  border: '1px solid rgba(124,110,255,0.3)',
                  borderRadius: '12px',
                  fontFamily: 'var(--font-body)',
                },
              }}
            />
          </SocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
