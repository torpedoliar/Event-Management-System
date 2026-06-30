"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import type { Tournament, BracketView as BracketViewType } from '@/types/tournament.types';
import { tournamentApi, bracketApi } from '@/lib/tournament-api';
import { BracketView } from '@/components/tournament/bracket';
import { StatusPill } from '@/components/tournament/StatusPill';
import { useTournamentSSE } from '@/hooks/useTournamentSSE';
import { Trophy, Users, Calendar, ChevronLeft, Maximize2, Sun, Moon } from 'lucide-react';
import Link from 'next/link';

export default function PublicBracketViewerPage() {
  const params = useParams();
  const tournamentId = params.id as string;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [bracket, setBracket] = useState<BracketViewType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [highlightedMatchId, setHighlightedMatchId] = useState<string | null>(null);

  // SSE subscription for real-time updates
  const sse = useTournamentSSE(tournamentId);

  // Set up SSE handlers
  useEffect(() => {
    const unsubBracket = sse.onBracketUpdated((event) => {
      // Validate data structure before casting
      if (event.data && typeof event.data === 'object' && 'rounds' in event.data) {
        setBracket(event.data as unknown as BracketViewType);
      }
    });

    const unsubTournament = sse.onTournamentUpdated((event) => {
      // Validate tournament data structure
      if (event.data && typeof event.data === 'object' && 'id' in event.data && 'name' in event.data) {
        setTournament(event.data as Tournament);
      }
    });

    return () => {
      unsubBracket();
      unsubTournament();
    };
  }, [sse]);

  // Fetch tournament and bracket data
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);

      try {
        const [tournamentData, bracketData] = await Promise.all([
          tournamentApi.getById(tournamentId),
          bracketApi.getView(tournamentId),
        ]);

        setTournament(tournamentData);
        setBracket(bracketData);
      } catch (err: any) {
        setError(err.message || 'Failed to load tournament bracket');
      } finally {
        setIsLoading(false);
      }
    }

    if (tournamentId) {
      fetchData();
    }
  }, [tournamentId]);

  const handleMatchClick = (matchId: string) => {
    setHighlightedMatchId(matchId);
  };

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  }, []);

  if (isLoading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          isDarkMode ? 'bg-gray-900' : 'bg-gray-100'
        }`}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4" />
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
            Loading bracket...
          </p>
        </div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          isDarkMode ? 'bg-gray-900' : 'bg-gray-100'
        }`}
      >
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 mb-4">
            <Trophy className="w-16 h-16 mx-auto opacity-50" />
          </div>
          <h1 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Tournament Not Found
          </h1>
          <p className={`mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {error || 'The tournament bracket you are looking for does not exist.'}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen ${
        isDarkMode ? 'bg-gray-900' : 'bg-gray-100'
      }`}
    >
      {/* Header */}
      <header
        className={`sticky top-0 z-10 border-b ${
          isDarkMode
            ? 'bg-gray-900/95 border-gray-800'
            : 'bg-white/95 border-gray-200'
        } backdrop-blur-sm`}
      >
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className={`p-2 rounded-lg ${
                  isDarkMode
                    ? 'hover:bg-gray-800 text-gray-400 hover:text-white'
                    : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                }`}
              >
                <ChevronLeft className="w-5 h-5" />
              </Link>

              <div>
                <div className="flex items-center gap-3">
                  <Trophy
                    className={`w-6 h-6 ${
                      isDarkMode ? 'text-yellow-400' : 'text-yellow-500'
                    }`}
                  />
                  <h1
                    className={`text-xl font-bold ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}
                  >
                    {tournament.name}
                  </h1>
                  <StatusPill status={tournament.status} size="sm" />
                </div>
                <div
                  className={`flex items-center gap-4 mt-1 text-sm ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}
                >
                  {tournament.sportType && (
                    <span className="capitalize">
                      {tournament.sportType.toLowerCase().replace('_', ' ')}
                    </span>
                  )}
                  {tournament.teams && (
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {tournament.teams.length} Teams
                    </span>
                  )}
                  {tournament.startDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(tournament.startDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-lg ${
                  isDarkMode
                    ? 'hover:bg-gray-800 text-gray-400 hover:text-white'
                    : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                }`}
                title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDarkMode ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={toggleFullscreen}
                className={`p-2 rounded-lg ${
                  isDarkMode
                    ? 'hover:bg-gray-800 text-gray-400 hover:text-white'
                    : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                }`}
                title="Toggle Fullscreen"
              >
                <Maximize2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Bracket Content */}
      <main className="p-4">
        {bracket ? (
          <BracketView
            bracket={bracket}
            onMatchClick={handleMatchClick}
            highlightedMatchId={highlightedMatchId || undefined}
            isDarkMode={isDarkMode}
          />
        ) : (
          <div
            className={`text-center py-12 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}
          >
            <Trophy className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg">Bracket not yet generated</p>
            <p className="text-sm mt-1">
              The tournament bracket will appear here once teams are registered.
            </p>
          </div>
        )}
      </main>

      {/* Live Indicator */}
      {tournament.status === 'IN_PROGRESS' && (
        <div
          className={`fixed bottom-4 right-4 px-4 py-2 rounded-full font-medium text-sm flex items-center gap-2 ${
            isDarkMode
              ? 'bg-green-600 text-white'
              : 'bg-green-500 text-white'
          }`}
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
          </span>
          LIVE
        </div>
      )}
    </div>
  );
}
