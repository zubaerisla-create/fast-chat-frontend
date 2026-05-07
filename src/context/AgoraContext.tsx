'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useAgora } from '@/hooks/useAgora';

type AgoraContextType = ReturnType<typeof useAgora>;

const AgoraContext = createContext<AgoraContextType | null>(null);

export function AgoraProvider({ children }: { children: ReactNode }) {
    const agora = useAgora();

    return (
        <AgoraContext.Provider value={agora}>
            {children}
        </AgoraContext.Provider>
    );
}

export function useAgoraContext() {
    const context = useContext(AgoraContext);
    if (!context) {
        throw new Error('useAgoraContext must be used within AgoraProvider');
    }
    return context;
}
