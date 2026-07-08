"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import type { Tournament, BracketView as BracketViewType } from "@/types/tournament.types";
import { tournamentApi, bracketApi } from "@/lib/tournament-api";
import { BracketView } from "@/components/tournament/bracket";
import { StatusPill } from "@/components/tournament/StatusPill";
import { useTournamentSSE } from "@/hooks/useTournamentSSE";
import { Trophy, Users, Calendar, ChevronLeft, Maximize2, Sun, Moon } from "lucide-react";
import Link from "next/link";
import Button from "@/components/ui/Button";

export default function PublicBracketViewerPage() {
  const params = useParams();
  const tournamentId = params.id as string;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [bracket, setBracket] = useState<BracketViewType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [highlightedMatchId, setHighlightedMatchId] = useState<string | null>(null);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    setIsAuth(typeof window !== "undefined" && !!localStorage.getItem("token"));
  }, []);

  const sse = useTournamentSSE(tournamentId);

  useEffect(() => {
    if (!isAuth) return;
    const unsubBracket = sse.onBracketUpdated((event) => {
      const data = event.data as { tournamentId: string };
      if (data.tournamentId === tournamentId) {
        // bracket_updated only sends tournamentId, so we re-fetch
        bracketApi.getView(tournamentId).then(setBracket).catch(console.error);
      }
    });

    const unsubTournament = sse.onTournamentUpdated((event) => {
      if (event.data && typeof event.data === "object" && "id" in event.data && "name" in event.data) {
        setTournament(event.data as Tournament);
      }
    });

    return () => {
      unsubBracket();
      unsubTournament();
    };
  }, [sse, isAuth, tournamentId]);

  useEffect(() => {
    if (isAuth) return;
    const id = setInterval(() => {
      bracketApi.getView(tournamentId).then(setBracket).catch(console.error);
    }, 10000);
    return () => clearInterval(id);
  }, [tournamentId, isAuth]);

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
        setError(err.message || "Failed to load tournament bracket");
      } finally {
        setIsLoading(false);
      }
    }

    if (tournamentId) fetchData();
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
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? "bg-brand-bg" : "bg-white"}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-primary border-t-transparent mx-auto mb-4" />
          <p className={isDarkMode ? "text-brand-textMuted" : "text-gray-600"}>Loading bracket...</p>
        </div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? "bg-brand-bg" : "bg-white"}`}>
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-brand-danger mb-4">
            <Trophy className="w-16 h-16 mx-auto opacity-50" />
          </div>
          <h1 className={`text-xl font-bold mb-2 ${isDarkMode ? "text-brand-text" : "text-gray-900"}`}>
            Tournament Not Found
          </h1>
          <p className={`mb-4 ${isDarkMode ? "text-brand-textMuted" : "text-gray-600"}`}>
            {error || "The tournament bracket you are looking for does not exist."}
          </p>
          <Link href="/">
            <Button className="gap-2">
              <ChevronLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? "bg-brand-bg" : "bg-gray-50"}`}>
      <header
        className={`sticky top-0 z-10 border-b ${
          isDarkMode ? "bg-brand-bg/95 border-brand-border" : "bg-white/95 border-gray-200"
        } backdrop-blur-sm`}
      >
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className={`p-2 rounded-lg transition-colors ${
                  isDarkMode
                    ? "hover:bg-white/[0.04] text-brand-textMuted hover:text-brand-text"
                    : "hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                }`}
              >
                <ChevronLeft className="w-5 h-5" />
              </Link>

              <div>
                <div className="flex items-center gap-3">
                  <Trophy className={`w-6 h-6 ${isDarkMode ? "text-brand-warning" : "text-yellow-600"}`} />
                  <h1 className={`text-xl font-bold ${isDarkMode ? "text-brand-text" : "text-gray-900"}`}>
                    {tournament.name}
                  </h1>
                  <StatusPill status={tournament.status} size="sm" />
                </div>
                <div className={`flex items-center gap-4 mt-1 text-sm font-medium ${
                  isDarkMode ? "text-brand-textMuted" : "text-gray-500"
                }`}>
                  {tournament.sportType && (
                    <span className="capitalize">{tournament.sportType.toLowerCase().replace("_", " ")}</span>
                  )}
                  {tournament.teams && (
                    <span className="flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      {tournament.teams.length} Teams
                    </span>
                  )}
                  {tournament.startDate && (
                    <span className="flex items-center gap-1.5">
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
                className={`p-2 rounded-lg transition-colors ${
                  isDarkMode
                    ? "hover:bg-white/[0.04] text-brand-textMuted hover:text-brand-text"
                    : "hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                }`}
                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button
                onClick={toggleFullscreen}
                className={`p-2 rounded-lg transition-colors ${
                  isDarkMode
                    ? "hover:bg-white/[0.04] text-brand-textMuted hover:text-brand-text"
                    : "hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                }`}
                title="Toggle Fullscreen"
              >
                <Maximize2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="p-4">
        {bracket ? (
          <BracketView
            bracket={bracket}
            onMatchClick={handleMatchClick}
            highlightedMatchId={highlightedMatchId || undefined}
          />
        ) : (
          <div className={`text-center py-20 ${isDarkMode ? "text-brand-textMuted" : "text-gray-500"}`}>
            <Trophy className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">Bracket not yet generated</p>
            <p className="text-sm mt-1">The tournament bracket will appear here once teams are registered.</p>
          </div>
        )}
      </main>

      {tournament.status === "IN_PROGRESS" && (
        <div
          className={`fixed bottom-4 right-4 px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 shadow-lg ${
            isDarkMode ? "bg-brand-success text-brand-bg shadow-brand-success/20" : "bg-green-500 text-white"
          }`}
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-current"></span>
          </span>
          LIVE
        </div>
      )}
    </div>
  );
}
