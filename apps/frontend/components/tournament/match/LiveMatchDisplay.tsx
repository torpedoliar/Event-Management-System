"use client";

import React from "react";
import type { Match } from "@/types/tournament.types";
import { TeamLogo } from "../team/TeamLogo";
import { MatchTimer } from "./MatchTimer";

interface LiveMatchDisplayProps {
  match: Match;
  showTimer?: boolean;
}

export function LiveMatchDisplay({ match, showTimer = true }: LiveMatchDisplayProps) {
  const isLive = match.status === "ONGOING";
  const hasScores = match.scoreA != null || match.scoreB != null;

  return (
    <div
      className={cn(
        "relative w-full max-w-7xl mx-auto rounded-[2rem] overflow-hidden border bg-[#0B0F19]/90 backdrop-blur-xl shadow-2xl transition-all duration-500",
        isLive ? "border-brand-danger/40 ring-1 ring-brand-danger/20 shadow-brand-danger/10" : "border-white/10"
      )}
    >
      {/* Decorative Glow Background */}
      {isLive && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[2rem]">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-brand-danger/10 blur-[100px] rounded-full" />
        </div>
      )}

      {/* Header Bar */}
      {isLive && (
        <div className="w-full bg-gradient-to-r from-transparent via-brand-danger/90 to-transparent border-b border-brand-danger/20 px-8 py-3 flex items-center justify-center gap-4 relative z-10">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
          </span>
          <span className="font-bold uppercase tracking-[0.2em] text-white text-sm">Live Broadcast</span>
          {showTimer && match.startedAt && (
            <>
              <span className="w-px h-4 bg-white/30 mx-2" />
              <span className="font-mono text-lg font-medium text-white tracking-wider tabular-nums">
                <MatchTimer startTime={match.startedAt} />
              </span>
            </>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="p-12 md:p-16 relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-12">
          
          {/* Team A */}
          <div className="flex-1 flex flex-col items-center text-center">
            <div className="w-40 h-40 md:w-48 md:h-48 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-inner p-4">
              <TeamLogo
                src={match.teamA?.logoUrl}
                name={match.teamA?.name || "TBD"}
                size="xl"
                className="w-full h-full object-contain"
              />
            </div>
            <h3 className="font-bold text-3xl md:text-4xl text-white tracking-tight">
              {match.teamA?.name || "TBD"}
            </h3>
          </div>

          {/* Center Score */}
          <div className="flex flex-col items-center justify-center px-4">
            <div className="text-[6rem] md:text-[9rem] font-mono font-black text-white tabular-nums tracking-tighter flex items-center gap-4 md:gap-8 leading-none drop-shadow-2xl">
              {hasScores ? (
                <>
                  <span className={match.winnerId === match.teamAId ? "text-brand-success" : ""}>
                    {match.scoreA ?? "0"}
                  </span>
                  <span className="text-4xl md:text-6xl text-white/20 font-light font-sans mb-4 md:mb-8">-</span>
                  <span className={match.winnerId === match.teamBId ? "text-brand-success" : ""}>
                    {match.scoreB ?? "0"}
                  </span>
                </>
              ) : (
                <span className="text-4xl md:text-6xl text-white/30 font-semibold tracking-widest uppercase">vs</span>
              )}
            </div>
            
            {match.setsA != null && match.setsB != null && (
              <div className="mt-6 flex items-center gap-4 bg-white/5 px-6 py-2 rounded-full border border-white/10">
                <span className="text-white/60 text-sm font-semibold uppercase tracking-wider">Sets</span>
                <span className="text-2xl font-mono font-bold text-brand-primary tabular-nums">
                  {match.setsA} - {match.setsB}
                </span>
              </div>
            )}
          </div>

          {/* Team B */}
          <div className="flex-1 flex flex-col items-center text-center">
            <div className="w-40 h-40 md:w-48 md:h-48 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-inner p-4">
              <TeamLogo
                src={match.teamB?.logoUrl}
                name={match.teamB?.name || "TBD"}
                size="xl"
                className="w-full h-full object-contain"
              />
            </div>
            <h3 className="font-bold text-3xl md:text-4xl text-white tracking-tight">
              {match.teamB?.name || "TBD"}
            </h3>
          </div>

        </div>
      </div>

      {/* Footer Info */}
      {match.court && (
        <div className="px-8 py-5 text-center bg-[#06090F]/80 border-t border-white/5 backdrop-blur-md relative z-10 flex items-center justify-center gap-2 text-white/60">
          <span className="uppercase tracking-[0.15em] text-xs font-semibold">Court</span>
          <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
          <span className="font-bold text-white text-lg tracking-wide">{match.court}</span>
        </div>
      )}
    </div>
  );
}

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
