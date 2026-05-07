'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export const CALL_STATUS = {
    IDLE: 'idle',
    OUTGOING: 'calling',
    INCOMING: 'ringing',
    ONGOING: 'connected',
} as const;

export type CallStatusValue = typeof CALL_STATUS[keyof typeof CALL_STATUS];

export interface CallData {
    callerId?: any;
    receiverId?: string;
    channelName?: string;
    callType?: 'audio' | 'video';
    token?: string;
    uid?: number;
    appId?: string;
    otherUserId?: string;
    callerName?: string;
}

interface CallContextType {
    callStatus: CallStatusValue;
    callData: CallData | null;
    startOutgoingCall: (data: CallData) => void;
    startIncomingCall: (data: CallData) => void;
    joinCall: (data: CallData) => void;
    resetCall: () => void;
}

const CallContext = createContext<CallContextType | null>(null);

export function CallProvider({ children }: { children: ReactNode }) {
    const [callStatus, setCallStatus] = useState<CallStatusValue>(CALL_STATUS.IDLE);
    const [callData, setCallData] = useState<CallData | null>(null);

    const startOutgoingCall = useCallback((data: CallData) => {
        setCallStatus(CALL_STATUS.OUTGOING);
        setCallData(data);
    }, []);

    const startIncomingCall = useCallback((data: CallData) => {
        setCallStatus(CALL_STATUS.INCOMING);
        setCallData(data);
    }, []);

    const joinCall = useCallback((data: CallData) => {
        // data = { channelName, token, uid, appId, otherUserId, callType }
        setCallData((prev) => ({ ...prev, ...data }));
        setCallStatus(CALL_STATUS.ONGOING);
    }, []);

    const resetCall = useCallback(() => {
        setCallStatus(CALL_STATUS.IDLE);
        setCallData(null);
    }, []);

    return (
        <CallContext.Provider value={{ callStatus, callData, startOutgoingCall, startIncomingCall, joinCall, resetCall }}>
            {children}
        </CallContext.Provider>
    );
}

export function useCall() {
    const ctx = useContext(CallContext);
    if (!ctx) throw new Error('useCall must be used within CallProvider');
    return ctx;
}
