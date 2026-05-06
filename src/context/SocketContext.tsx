'use client';

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { Message } from '@/types';

interface SocketContextType {
  socket: Socket | null;
  onlineUsers: string[];
  sendSocketMessage: (msg: Message) => void;
  joinConversation: (conversationId: string) => void;
  onNewMessage: (callback: (msg: Message) => void) => () => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!user || !token) return;

    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected');
      if (user?._id) {
        socket.emit('userOnline', user._id);
        console.log('Emitted userOnline for:', user._id);
      }
    });
    socket.on('onlineUsers', (users: string[]) => setOnlineUsers(users));
    socket.on('disconnect', () => console.log('Socket disconnected'));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, token]);

  const joinConversation = (conversationId: string) => {
    socketRef.current?.emit('joinConversation', conversationId);
  };

  const sendSocketMessage = (msg: Message) => {
    socketRef.current?.emit('sendMessage', msg);
  };

  const onNewMessage = (callback: (msg: Message) => void) => {
    const socket = socketRef.current;
    if (!socket) return () => { };
    socket.on('newMessage', callback);
    return () => socket.off('newMessage', callback);
  };

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, onlineUsers, sendSocketMessage, joinConversation, onNewMessage }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
}
