"use client";

import { useEffect, useCallback } from 'react';
import { useSSE } from '@/lib/sse-context';
import type { Match, Tournament, TournamentEvent } from '../types/tournament.types';

type TournamentEventHandler = (event: TournamentEvent) => void;

/**
 * Hook for subscribing to tournament real-time events
 * Must be used within SSEProvider
 */
export function useTournamentSSE(tournamentId: string) {
  const { addEventListener, removeEventListener, connected } = useSSE();

  // Callbacks refs to avoid re-subscribing on every render
  const handlersRef = {
    current: {
      onMatchScoreUpdate: null as TournamentEventHandler | null,
      onMatchStarted: null as TournamentEventHandler | null,
      onMatchCompleted: null as TournamentEventHandler | null,
      onMatchCancelled: null as TournamentEventHandler | null,
      onBracketUpdated: null as TournamentEventHandler | null,
      onTournamentUpdated: null as TournamentEventHandler | null,
    },
  };

  const subscribe = useCallback(
    (eventType: string, handler: TournamentEventHandler) => {
      const wrappedHandler = (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          handler({ type: eventType as any, data } as TournamentEvent);
        } catch (err) {
          console.error('[TournamentSSE] Failed to parse event data:', err);
        }
      };
      addEventListener(eventType, wrappedHandler);
      return wrappedHandler;
    },
    [addEventListener]
  );

  const unsubscribe = useCallback(
    (eventType: string, handler: (e: MessageEvent) => void) => {
      removeEventListener(eventType, handler);
    },
    [removeEventListener]
  );

  // Subscribe to tournament-specific events
  useEffect(() => {
    const handlers: Array<() => void> = [];

    // Filter bracket updates by tournamentId
    const bracketHandler = subscribe('bracket_updated', (event) => {
      const data = event.data as { tournamentId: string };
      if (data.tournamentId === tournamentId) {
        handlersRef.current.onBracketUpdated?.(event);
      }
    });
    handlers.push(() => unsubscribe('bracket_updated', bracketHandler));

    // Tournament updates
    const tournamentHandler = subscribe('tournament_updated', (event) => {
      const data = event.data as Tournament;
      if (data.id === tournamentId) {
        handlersRef.current.onTournamentUpdated?.(event);
      }
    });
    handlers.push(() => unsubscribe('tournament_updated', tournamentHandler));

    return () => {
      handlers.forEach((unsub) => unsub());
    };
  }, [tournamentId, subscribe, unsubscribe]);

  return {
    connected,
    /**
     * Subscribe to match score updates
     */
    onMatchScoreUpdate: useCallback((handler: TournamentEventHandler) => {
      handlersRef.current.onMatchScoreUpdate = handler;
      const wrappedHandler = subscribe('match_score_update', handler);
      return () => {
        handlersRef.current.onMatchScoreUpdate = null;
        unsubscribe('match_score_update', wrappedHandler);
      };
    }, [subscribe, unsubscribe]),

    /**
     * Subscribe to match started events
     */
    onMatchStarted: useCallback((handler: TournamentEventHandler) => {
      handlersRef.current.onMatchStarted = handler;
      const wrappedHandler = subscribe('match_started', handler);
      return () => {
        handlersRef.current.onMatchStarted = null;
        unsubscribe('match_started', wrappedHandler);
      };
    }, [subscribe, unsubscribe]),

    /**
     * Subscribe to match completed events
     */
    onMatchCompleted: useCallback((handler: TournamentEventHandler) => {
      handlersRef.current.onMatchCompleted = handler;
      const wrappedHandler = subscribe('match_completed', handler);
      return () => {
        handlersRef.current.onMatchCompleted = null;
        unsubscribe('match_completed', wrappedHandler);
      };
    }, [subscribe, unsubscribe]),

    /**
     * Subscribe to match cancelled events
     */
    onMatchCancelled: useCallback((handler: TournamentEventHandler) => {
      handlersRef.current.onMatchCancelled = handler;
      const wrappedHandler = subscribe('match_cancelled', handler);
      return () => {
        handlersRef.current.onMatchCancelled = null;
        unsubscribe('match_cancelled', wrappedHandler);
      };
    }, [subscribe, unsubscribe]),

    /**
     * Subscribe to bracket updates (filtered by tournamentId)
     */
    onBracketUpdated: useCallback((handler: TournamentEventHandler) => {
      handlersRef.current.onBracketUpdated = handler;
      // Already subscribed in useEffect, just update the ref
      return () => {
        handlersRef.current.onBracketUpdated = null;
      };
    }, []),

    /**
     * Subscribe to tournament updates (filtered by tournamentId)
     */
    onTournamentUpdated: useCallback((handler: TournamentEventHandler) => {
      handlersRef.current.onTournamentUpdated = handler;
      // Already subscribed in useEffect, just update the ref
      return () => {
        handlersRef.current.onTournamentUpdated = null;
      };
    }, []),
  };
}

/**
 * Hook for subscribing to all tournament events (no filtering)
 */
export function useAllTournamentSSE() {
  const { addEventListener, removeEventListener, connected } = useSSE();

  const subscribe = useCallback(
    (eventType: string, handler: TournamentEventHandler) => {
      const wrappedHandler = (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          handler({ type: eventType as any, data } as TournamentEvent);
        } catch (err) {
          console.error('[TournamentSSE] Failed to parse event data:', err);
        }
      };
      addEventListener(eventType, wrappedHandler);
      return wrappedHandler;
    },
    [addEventListener]
  );

  const unsubscribe = useCallback(
    (eventType: string, handler: (e: MessageEvent) => void) => {
      removeEventListener(eventType, handler);
    },
    [removeEventListener]
  );

  return {
    connected,
    subscribe,
    unsubscribe,
  };
}
