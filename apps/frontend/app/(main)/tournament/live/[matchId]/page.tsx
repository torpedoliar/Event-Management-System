"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { matchApi } from "@/lib/tournament-api";
import { LiveMatchDisplay } from "@/components/tournament/match/LiveMatchDisplay";
import type { Match } from "@/types/tournament.types";
import { Trophy, AlertCircle, RefreshCw } from "lucide-react";
import { useSSE } from "@/lib/sse-context";

export default function LiveMatchPage() {
  const params = useParams();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { lastEvent } = useSSE();

  const fetchMatch = async () => {
    if (!params.matchId) return;
    try {
      const data = await matchApi.getById(params.matchId as string);
      if (!data) {
        setNotFound(true);
      } else {
        setMatch(data);
        setError(null);
        setNotFound(false);
      }
    } catch (err: any) {
      if (err?.message?.includes('404') || err?.status === 404) {
        setNotFound(true);
      } else {
        setError(err?.message || "Failed to load match");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatch();

    // Poll every 10 seconds for live updates
    intervalRef.current = setInterval(fetchMatch, 10000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [params.matchId]);

  useEffect(() => {
    if (!lastEvent || !params.matchId) return;

    if (
      (lastEvent.type === "match_score_update" || lastEvent.type === "match_completed") &&
      lastEvent.data?.id === params.matchId
    ) {
      setMatch((prev) => {
        if (!prev) return lastEvent.data as Match;
        // Merge the new data, keeping nested relations like teamA/teamB if they are missing in SSE payload
        return { ...prev, ...lastEvent.data } as Match;
      });
    }
  }, [lastEvent, params.matchId]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-brand-bg flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-brand-primary border-t-transparent" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-[100dvh] bg-brand-bg flex flex-col items-center justify-center text-white gap-4">
        <Trophy className="w-16 h-16 text-white/30" />
        <p className="text-xl text-white/60">Match not found</p>
        <p className="text-sm text-white/40">The match may have been deleted or the link is invalid.</p>
      </div>
    );
  }

  if (error && !match) {
    return (
      <div className="min-h-[100dvh] bg-brand-bg flex flex-col items-center justify-center text-white gap-4">
        <AlertCircle className="w-16 h-16 text-brand-danger/60" />
        <p className="text-xl text-white/60">Error loading match</p>
        <p className="text-sm text-white/40">{error}</p>
        <button
          onClick={fetchMatch}
          className="mt-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white/70 hover:text-white transition-colors flex items-center gap-2"
        >
          <RefreshCw size={16} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-brand-bg">
      <LiveMatchDisplay match={match!} />
    </div>
  );
}
