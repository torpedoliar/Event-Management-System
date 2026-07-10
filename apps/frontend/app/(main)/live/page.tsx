"use client";

import React, { useEffect, useState } from 'react';
import { matchApi, tournamentApi } from '@/lib/tournament-api';
import type { Match, Tournament } from '@/types/tournament.types';
import { LiveMatchCard } from '@/components/tournament/match/LiveMatchCard';
import { ChevronLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface LiveTournamentInfo {
  tournament: Tournament;
  liveMatches: Match[];
}

export default function LivePage() {
  const [tournaments, setTournaments] = useState<LiveTournamentInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Fetch all live matches efficiently (N+1 optimization)
  const fetchData = async () => {
    try {
      setError(null);

      // Get all tournaments to build tournament lookup
      const allTournaments = await tournamentApi.getAll();
      const tournamentMap = new Map(allTournaments.map(t => [t.id, t]));

      // Get all live matches across all tournaments
      const allLiveMatches: Match[] = [];

      for (const tournament of allTournaments) {
        if (tournament.status !== 'IN_PROGRESS') continue;

        try {
          const liveMatches = await matchApi.getLive(tournament.id);
          allLiveMatches.push(...liveMatches);
        } catch (err) {
          // Individual tournament fetch failure is non-fatal
          console.warn(`Failed to fetch live matches for tournament ${tournament.id}:`, err);
        }
      }

      // Group matches by tournament
      const liveTournamentInfo: LiveTournamentInfo[] = [];
      const matchesByTournament = new Map<string, Match[]>();

      for (const match of allLiveMatches) {
        // Try to get tournamentId from match or fall back to first tournament
        const tournamentId = (match as unknown as { tournamentId?: string }).tournamentId || allTournaments[0]?.id;
        if (!tournamentId) continue;

        if (!matchesByTournament.has(tournamentId)) {
          matchesByTournament.set(tournamentId, []);
        }
        matchesByTournament.get(tournamentId)!.push(match);
      }

      for (const [tournamentId, liveMatches] of matchesByTournament) {
        const tournament = tournamentMap.get(tournamentId);
        if (tournament && liveMatches.length > 0) {
          liveTournamentInfo.push({ tournament, liveMatches });
        }
      }

      setTournaments(liveTournamentInfo);
      setLastUpdated(new Date());
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch live data';
      setError(errorMessage);
      console.error('Failed to fetch live data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch and polling
  useEffect(() => {
    fetchData();

    // Poll every 5 seconds for updates
    const interval = setInterval(fetchData, 5000);

    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-brand-danger border-t-transparent rounded-full animate-spin" />
            <p className="text-brand-text text-xl font-medium">Loading live matches...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && tournaments.length === 0) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-brand-danger text-6xl mb-6">⚠️</div>
          <h1 className="text-4xl font-bold text-brand-text mb-4">Connection Error</h1>
          <p className="text-brand-textMuted text-lg mb-8">{error}</p>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-primary text-brand-bg rounded-lg hover:bg-brand-primaryHover transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (tournaments.length === 0) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-8xl mb-6">🏆</div>
          <h1 className="text-4xl font-bold text-brand-text mb-4">No Live Matches</h1>
          <p className="text-brand-textMuted text-lg mb-8">
            There are no matches in progress right now. Check back later or visit a tournament bracket.
          </p>
          <Link
            href="/tournament/bracket"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-primary text-brand-bg rounded-lg hover:bg-brand-primaryHover transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            View Tournament Brackets
          </Link>
          <p className="text-brand-textDim text-sm mt-6">
            Last checked: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-brand-bg/80 backdrop-blur-sm border-b border-brand-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-3 h-3 bg-brand-danger rounded-full animate-pulse" />
                <div className="absolute inset-0 w-3 h-3 bg-brand-danger rounded-full animate-ping" />
              </div>
              <h1 className="text-2xl font-bold text-brand-text tracking-tight">
                LIVE MATCHES
              </h1>
              <span className="px-3 py-1 bg-brand-danger/20 text-brand-danger text-sm font-medium rounded-full">
                {tournaments.reduce((sum, t) => sum + t.liveMatches.length, 0)} Active
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-brand-textMuted text-sm">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </div>
              <button
                onClick={fetchData}
                className="p-2 text-brand-textMuted hover:text-brand-text transition-colors"
                aria-label="Refresh live matches"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Banner (non-blocking) */}
      {error && tournaments.length > 0 && (
        <div className="bg-brand-warning/20 border-b border-brand-warning/30 px-4 py-2">
          <p className="text-brand-warning text-sm text-center">
            Some matches may not be visible due to connection issues.{' '}
            <button onClick={fetchData} className="underline hover:no-underline">
              Retry
            </button>
          </p>
        </div>
      )}

      {/* Live Matches */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {tournaments.map(({ tournament, liveMatches }) => (
          <div key={tournament.id} className="mb-12">
            {/* Tournament Header */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-brand-text mb-1">
                {tournament.name}
              </h2>
              <p className="text-brand-textMuted text-sm capitalize">
                {tournament.sportType?.toLowerCase().replace('_', ' ')} • {tournament.formatType?.toLowerCase().replace('_', ' ')}
              </p>
            </div>

            {/* Match Cards */}
            <div className={`grid gap-6 ${
              liveMatches.length === 1
                ? 'max-w-3xl'
                : liveMatches.length === 2
                  ? 'md:grid-cols-2 max-w-5xl'
                  : 'md:grid-cols-2 lg:grid-cols-3'
            }`}>
              {liveMatches.map(match => (
                <LiveMatchCard
                  key={match.id}
                  match={match}
                  tournamentName={tournament.name}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Auto-refresh indicator */}
      <div className="fixed bottom-4 right-4 flex items-center gap-2 px-3 py-2 bg-brand-bgElevated/80 backdrop-blur-sm rounded-lg border border-brand-border">
        <div className="w-2 h-2 bg-brand-success rounded-full animate-pulse" />
        <span className="text-brand-textMuted text-sm">Auto-refreshing every 5s</span>
      </div>
    </div>
  );
}
