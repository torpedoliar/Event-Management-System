"use client";

import React, { useEffect, useState } from "react";
import type { Match } from "@/types/tournament.types";
import { Clock } from "lucide-react";

interface LiveMatchCardProps {
  match: Match;
  tournamentName?: string;
  onMatchClick?: (match: Match) => void;
}

export function LiveMatchCard({ match, tournamentName, onMatchClick }: LiveMatchCardProps) {
  const [elapsed, setElapsed] = useState<string>("");

  useEffect(() => {
    if (!match.startedAt) return;

    const updateElapsed = () => {
      const start = new Date(match.startedAt as string).getTime();
      const now = Date.now();
      const diff = Math.floor((now - start) / 1000);

      const minutes = Math.floor(diff / 60);
      const seconds = diff % 60;
      setElapsed(`${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [match.startedAt]);

  const hasScores = match.scoreA != null || match.scoreB != null;
  const teamAName = match.teamA?.name || "TBD";
  const teamBName = match.teamB?.name || "TBD";

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Live match: ${teamAName} vs ${teamBName}`}
      className="relative bg-brand-surface border border-brand-border rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/50"
      onClick={() => onMatchClick?.(match)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onMatchClick?.(match); } }}
    >
      <div className="absolute top-0 left-0 right-0 bg-brand-danger px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-2 h-2 bg-white rounded-full" />
            <div className="absolute inset-0 w-2 h-2 bg-white rounded-full animate-ping opacity-75" />
          </div>
          <span className="text-white font-bold text-sm uppercase tracking-wider">Live</span>
        </div>
        {match.court && (
          <span className="text-white/90 text-xs font-semibold bg-black/20 px-2 py-0.5 rounded">
            Court {match.court}
          </span>
        )}
      </div>

      <div className="pt-14 pb-6 px-4">
        {tournamentName && (
          <p className="text-brand-textMuted text-xs font-medium text-center mb-4 uppercase tracking-wide">
            {tournamentName}
          </p>
        )}

        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 text-center">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-brand-surface border border-brand-border flex items-center justify-center overflow-hidden">
              {match.teamA?.logoUrl ? (
                <img src={match.teamA.logoUrl} alt={teamAName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-brand-textMuted">
                  {teamAName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <h3 className="font-bold text-brand-text text-lg leading-tight mb-1 truncate">
              {teamAName}
            </h3>
            {match.setsA != null && (
              <p className="text-brand-textMuted text-sm font-medium">Sets: {match.setsA}</p>
            )}
          </div>

          <div className="text-center px-4">
            {hasScores ? (
              <>
                <div className="text-5xl font-black text-brand-text mb-1 tabular-nums tracking-tighter flex items-center justify-center">
                  <span className={match.winnerId === match.teamAId ? "text-brand-success" : ""}>
                    {match.scoreA ?? "-"}
                  </span>
                  <span className="text-2xl text-brand-textMuted/50 mx-2 font-normal">-</span>
                  <span className={match.winnerId === match.teamBId ? "text-brand-success" : ""}>
                    {match.scoreB ?? "-"}
                  </span>
                </div>
                {match.setsA != null && match.setsB != null && (
                  <div className="text-sm font-medium text-brand-textMuted">
                    {match.setsA} - {match.setsB}
                  </div>
                )}
              </>
            ) : (
              <div className="text-3xl font-medium text-brand-textMuted">vs</div>
            )}
          </div>

          <div className="flex-1 text-center">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-brand-surface border border-brand-border flex items-center justify-center overflow-hidden">
              {match.teamB?.logoUrl ? (
                <img src={match.teamB.logoUrl} alt={teamBName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-brand-textMuted">
                  {teamBName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <h3 className="font-bold text-brand-text text-lg leading-tight mb-1 truncate">
              {teamBName}
            </h3>
            {match.setsB != null && (
              <p className="text-brand-textMuted text-sm font-medium">Sets: {match.setsB}</p>
            )}
          </div>
        </div>

        {elapsed && (
          <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-brand-border">
            <Clock className="w-4 h-4 text-brand-textMuted" />
            <span className="text-brand-textMuted font-mono text-sm font-medium">{elapsed}</span>
          </div>
        )}
      </div>

      <div className="absolute inset-0 border-2 border-transparent group-hover:border-brand-primary/30 rounded-2xl transition-colors pointer-events-none" />
    </div>
  );
}
