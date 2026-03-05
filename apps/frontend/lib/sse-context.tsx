"use client";

import React, { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from 'react';
import { apiBase } from './api';

type SSEContextType = {
    addEventListener: (type: string, listener: (event: MessageEvent) => void) => void;
    removeEventListener: (type: string, listener: (event: MessageEvent) => void) => void;
    connected: boolean;
};

const SSEContext = createContext<SSEContextType | null>(null);

// All supported event types
const EVENT_TYPES = [
    'checkin', 'uncheckin', 'config', 'preview',
    'prize_draw', 'prize_reset', 'prize_collected', 'prize_uncollected',
    'guest-update', 'guest_created_souvenir',
    'souvenir_given', 'souvenir_removed', 'souvenir_reset',
    'event_change'
] as const;

export function SSEProvider({ children }: { children: ReactNode }) {
    const [connected, setConnected] = useState(false);
    const listenersRef = useRef<Record<string, ((event: MessageEvent) => void)[]>>({});
    const esRef = useRef<EventSource | null>(null);
    const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttempts = useRef(0);

    const connect = useCallback(() => {
        if (typeof window === 'undefined') return;

        // Close existing connection
        if (esRef.current) {
            esRef.current.close();
        }

        const es = new EventSource(`${apiBase()}/public/stream`);
        esRef.current = es;

        es.onopen = () => {
            console.log('[SSE] Connected');
            setConnected(true);
            reconnectAttempts.current = 0; // Reset on successful connection
        };

        es.onerror = () => {
            console.log('[SSE] Disconnected/Error');
            setConnected(false);
            es.close();

            // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
            reconnectAttempts.current++;

            retryTimeoutRef.current = setTimeout(connect, delay);
        };

        // Register all event listeners
        EVENT_TYPES.forEach(type => {
            es.addEventListener(type, (e) => {
                const list = listenersRef.current[type];
                if (list && list.length > 0) {
                    list.forEach(l => l(e));
                }
            });
        });
    }, []);

    useEffect(() => {
        connect();

        // Handle visibility change to save battery/resources
        const onVisibilityChange = () => {
            if (document.hidden) {
                console.log('[SSE] Tab hidden, closing connection');
                esRef.current?.close();
                setConnected(false);
                if (retryTimeoutRef.current) {
                    clearTimeout(retryTimeoutRef.current);
                }
            } else {
                console.log('[SSE] Tab visible, reconnecting');
                reconnectAttempts.current = 0;
                connect();
            }
        };

        // Handle online/offline status
        const onOnline = () => {
            console.log('[SSE] Back online, reconnecting');
            reconnectAttempts.current = 0;
            connect();
        };

        const onOffline = () => {
            console.log('[SSE] Offline');
            setConnected(false);
        };

        document.addEventListener('visibilitychange', onVisibilityChange);
        window.addEventListener('online', onOnline);
        window.addEventListener('offline', onOffline);

        return () => {
            esRef.current?.close();
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
            }
            document.removeEventListener('visibilitychange', onVisibilityChange);
            window.removeEventListener('online', onOnline);
            window.removeEventListener('offline', onOffline);
        };
    }, [connect]);

    const addEventListener = useCallback((type: string, listener: (event: MessageEvent) => void) => {
        if (!listenersRef.current[type]) {
            listenersRef.current[type] = [];
        }
        listenersRef.current[type].push(listener);
    }, []);

    const removeEventListener = useCallback((type: string, listener: (event: MessageEvent) => void) => {
        if (listenersRef.current[type]) {
            listenersRef.current[type] = listenersRef.current[type].filter(l => l !== listener);
        }
    }, []);

    return (
        <SSEContext.Provider value={{ addEventListener, removeEventListener, connected }}>
            {children}
        </SSEContext.Provider>
    );
}

export function useSSE() {
    const context = useContext(SSEContext);
    if (!context) {
        throw new Error('useSSE must be used within an SSEProvider');
    }
    return context;
}
