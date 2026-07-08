"use client";

import { useEffect, useCallback, useRef } from 'react';
import { useSSE } from '@/lib/sse-context';
import type { Match, Tournament, TournamentEvent } from '../types/tournament.types';

type TournamentEventHandler = (event: TournamentEvent) => void;

interface TournamentSSEHandlers {
  onMatchScoreUpdate: TournamentEventHandler | null;
  onMatchStarted: TournamentEventHandler | null;
  onMatchCompleted: TournamentEventHandler | null;
  onMatchCancelled: TournamentEventHandler | null;
  onMatchUpdated: TournamentEventHandler | null;
  onBracketUpdated: TournamentEventHandler | null;
  onTournamentUpdated: TournamentEventHandler | null;
}

/**
 * Hook for subscribing to tournament real-time events
 * Must be used within SSEProvider
 */
export function useTournamentSSE(tournamentId: string) {
  const { addEventListener, removeEventListener, connected } = useSSE();

  // Stable handlers ref - persists across renders without causing re-subscriptions
  const handlersRef = useRef<TournamentSSEHandlers>({
    onMatchScoreUpdate: null,
    onMatchStarted: null,
    onMatchCompleted: null,
    onMatchCancelled: null,
    onMatchUpdated: null,
    onBracketUpdated: null,
    onTournamentUpdated: null,
  });

  // Track active subscriptions for cleanup
  const subscriptionsRef = useRef<Array<() => void>>([]);

  const subscribe = useCallback(
    (eventType: string, handler: TournamentEventHandler) => {
      const wrappedHandler = (e: MessageEvent) => {
        try {
          // Handle both string and object data
          const rawData = e.data;
          const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
          handler({ type: eventType as TournamentEvent['type'], data });
        } catch (err) {
          console.error('[TournamentSSE] Failed to parse event data:', err);
        }
      };
      addEventListener(eventType, wrappedHandler);
      return () => removeEventListener(eventType, wrappedHandler);
    },
    [addEventListener, removeEventListener]
  );

  // Main subscription effect - handles tournament-specific filtering
  useEffect(() => {
    const unsubs: Array<() => void> = [];

    // Filter bracket updates by tournamentId
    const bracketHandler = (event: TournamentEvent) => {
      const data = event.data as { tournamentId: string };
      if (data.tournamentId === tournamentId) {
        handlersRef.current.onBracketUpdated?.(event);
      }
    };
    const bracketUnsub = subscribe('bracket_updated', bracketHandler);
    unsubs.push(bracketUnsub);

    // Tournament updates - filter by tournamentId
    const tournamentHandler = (event: TournamentEvent) => {
      const data = event.data as Tournament;
      if (data.id === tournamentId) {
        handlersRef.current.onTournamentUpdated?.(event);
      }
    };
    const tournamentUnsub = subscribe('tournament_updated', tournamentHandler);
    unsubs.push(tournamentUnsub);

    subscriptionsRef.current = unsubs;

    return () => {
      unsubs.forEach(unsub => unsub());
      subscriptionsRef.current = [];
    };
  }, [tournamentId, subscribe]);

  /**
   * Subscribe to match score updates
   */
  const onMatchScoreUpdate = useCallback((handler: TournamentEventHandler) => {
    handlersRef.current.onMatchScoreUpdate = handler;
    const unsub = subscribe('match_score_update', handler);
    return () => {
      handlersRef.current.onMatchScoreUpdate = null;
      unsub();
    };
  }, [subscribe]);

  /**
   * Subscribe to match started events
   */
  const onMatchStarted = useCallback((handler: TournamentEventHandler) => {
    handlersRef.current.onMatchStarted = handler;
    const unsub = subscribe('match_started', handler);
    return () => {
      handlersRef.current.onMatchStarted = null;
      unsub();
    };
  }, [subscribe]);

  /**
   * Subscribe to match completed events
   */
  const onMatchCompleted = useCallback((handler: TournamentEventHandler) => {
    handlersRef.current.onMatchCompleted = handler;
    const unsub = subscribe('match_completed', handler);
    return () => {
      handlersRef.current.onMatchCompleted = null;
      unsub();
    };
  }, [subscribe]);

  /**
   * Subscribe to match cancelled events
   */
  const onMatchCancelled = useCallback((handler: TournamentEventHandler) => {
    handlersRef.current.onMatchCancelled = handler;
    const unsub = subscribe('match_cancelled', handler);
    return () => {
      handlersRef.current.onMatchCancelled = null;
      unsub();
    };
  }, [subscribe]);

  /**
   * Subscribe to match updated events (create, delete, reset, etc.)
   */
  const onMatchUpdated = useCallback((handler: TournamentEventHandler) => {
    handlersRef.current.onMatchUpdated = handler;
    const unsub = subscribe('match_updated', handler);
    return () => {
      handlersRef.current.onMatchUpdated = null;
      unsub();
    };
  }, [subscribe]);

  /**
   * Subscribe to bracket updates (filtered by tournamentId)
   * Note: Already subscribed in main effect, this just registers the callback
   */
  const onBracketUpdated = useCallback((handler: TournamentEventHandler) => {
    handlersRef.current.onBracketUpdated = handler;
    return () => {
      handlersRef.current.onBracketUpdated = null;
    };
  }, []);

  /**
   * Subscribe to tournament updates (filtered by tournamentId)
   * Note: Already subscribed in main effect, this just registers the callback
   */
  const onTournamentUpdated = useCallback((handler: TournamentEventHandler) => {
    handlersRef.current.onTournamentUpdated = handler;
    return () => {
      handlersRef.current.onTournamentUpdated = null;
    };
  }, []);

  return {
    connected,
    onMatchScoreUpdate,
    onMatchStarted,
    onMatchCompleted,
    onMatchCancelled,
    onMatchUpdated,
    onBracketUpdated,
    onTournamentUpdated,
  };
}

/**
 * Hook for subscribing to all tournament events (no filtering)
 * Use this when you need to observe events across all tournaments
 */
export function useAllTournamentSSE() {
  const { addEventListener, removeEventListener, connected } = useSSE();

  const subscribe = useCallback(
    (eventType: string, handler: TournamentEventHandler) => {
      const wrappedHandler = (e: MessageEvent) => {
        try {
          const rawData = e.data;
          const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
          handler({ type: eventType as TournamentEvent['type'], data });
        } catch (err) {
          console.error('[AllTournamentSSE] Failed to parse event data:', err);
        }
      };
      addEventListener(eventType, wrappedHandler);
      return () => removeEventListener(eventType, wrappedHandler);
    },
    [addEventListener, removeEventListener]
  );

  return {
    connected,
    subscribe,
  };
}
