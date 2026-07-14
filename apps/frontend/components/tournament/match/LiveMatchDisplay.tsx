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
  const isCompleted = match.status === "COMPLETED" || match.status === "WALKOVER";
  const isScheduled = match.status === "SCHEDULED";
  const hasScores = match.scoreA != null || match.scoreB != null;

  return (
    <div
      className={cn(
        "relative w-full max-w-7xl mx-auto rounded-[2rem] overflow-hidden border backdrop-blur-xl shadow-2xl transition-all duration-500",
        isLive
          ? "border-brand-danger/40 ring-1 ring-brand-danger/20 shadow-brand-danger/10"
          : isCompleted
            ? "border-brand-success/20"
            : "border-white/10"
      )}
    >
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[2rem]">
        {/* Radial gradient glow */}
        <div
          className={cn(
            "absolute top-0 left-1/2 -translate-x-1/2 w-full h-full opacity-30",
            isLive
              ? "bg-[radial-gradient(ellipse_at_top,rgba(239,68,68,0.15),transparent_60%)]"
              : isCompleted
                ? "bg-[radial-gradient(ellipse_at_top,rgba(74,222,128,0.1),transparent_60%)]"
                : "bg-[radial-gradient(ellipse_at_top,rgba(212,168,83,0.08),transparent_60%)]"
          )}
        />
        {/* Noise texture overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')] opacity-40" />
        {/* Particle dots */}
        <div className="absolute top-8 left-[15%] w-1 h-1 rounded-full bg-white/10 animate-pulse" />
        <div className="absolute top-20 right-[20%] w-1.5 h-1.5 rounded-full bg-white/8 animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-16 left-[25%] w-1 h-1 rounded-full bg-white/10 animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-24 right-[30%] w-1.5 h-1.5 rounded-full bg-white/8 animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>

      {/* Cinematic Header Bar */}
      <div className="w-full relative z-10">
        {isLive ? (
          <div className="bg-gradient-to-r from-brand-danger/80 via-brand-danger to-brand-danger/80 border-b border-white/10 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
              </span>
              <span className="font-black uppercase tracking-[0.25em] text-white text-xs">LIVE</span>
            </div>

            <div className="flex items-center gap-4">
              {match.round?.name && (
                <span className="text-white/80 text-xs font-semibold uppercase tracking-wider">
                  {match.round.name}
                </span>
              )}
              {match.round?.name && <span className="w-px h-3 bg-white/20" />}
              <span className="text-white/60 text-xs uppercase tracking-wider font-medium">
                {match.tournamentId ? "Match" : ""} #{match.matchNumber}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {showTimer && match.startedAt && (
                <span className="font-mono text-base font-bold text-white tracking-wider tabular-nums">
                  <MatchTimer startTime={match.startedAt} />
                </span>
              )}
              {match.court && (
                <>
                  <span className="w-px h-3 bg-white/20" />
                  <span className="text-white/80 text-xs font-bold uppercase tracking-wider">
                    Court {match.court}
                  </span>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-brand-surface/80 border-b border-white/5 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-brand-textMuted text-xs uppercase tracking-[0.2em] font-semibold">
                {isCompleted ? "Final Score" : isScheduled ? "Upcoming Match" : "Match"}
              </span>
            </div>
            <div className="flex items-center gap-4">
              {match.round?.name && (
                <span className="text-brand-textMuted text-xs font-semibold uppercase tracking-wider">
                  {match.round.name}
                </span>
              )}
              {match.court && (
                <>
                  <span className="w-px h-3 bg-white/10" />
                  <span className="text-brand-textDim text-xs font-medium uppercase tracking-wider">
                    Court {match.court}
                  </span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Content — Split Screen Layout */}
      <div className="relative z-10">
        {isScheduled ? (
          /* Scheduled State — VS Countdown */
          <div className="py-16 md:py-24 flex flex-col items-center justify-center gap-8">
            <div className="flex items-center gap-8 md:gap-16">
              <div className="flex flex-col items-center gap-4">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-white/5 border border-white/10 flex items-center justify-center p-3 shadow-inner">
                  <TeamLogo src={match.teamA?.logoUrl} name={match.teamA?.name || "TBD"} size="xl" className="w-full h-full object-contain" />
                </div>
                <span className="font-bold text-xl md:text-2xl text-white">{match.teamA?.name || "TBD"}</span>
              </div>

              <div className="flex flex-col items-center">
                <span className="text-7xl md:text-9xl font-black text-white/10 font-mono tracking-tighter">VS</span>
                {match.scheduledAt && (
                  <span className="mt-2 text-brand-textMuted text-sm font-mono">
                    {new Date(match.scheduledAt).toLocaleString('id-ID', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                )}
              </div>

              <div className="flex flex-col items-center gap-4">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-white/5 border border-white/10 flex items-center justify-center p-3 shadow-inner">
                  <TeamLogo src={match.teamB?.logoUrl} name={match.teamB?.name || "TBD"} size="xl" className="w-full h-full object-contain" />
                </div>
                <span className="font-bold text-xl md:text-2xl text-white">{match.teamB?.name || "TBD"}</span>
              </div>
            </div>
          </div>
        ) : (
          /* Live / Completed State — Split Screen */
          <div className="flex flex-col md:flex-row items-stretch">
            {/* Team A Side */}
            <div className="flex-1 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/20 via-transparent to-transparent" />
              <div className={cn(
                "relative z-10 flex flex-col items-center text-center py-12 md:py-16 px-6",
                isCompleted && match.winnerId === match.teamAId && "bg-brand-success/5"
              )}>
                {/* Winner Crown */}
                {isCompleted && match.winnerId === match.teamAId && (
                  <div className="mb-3 animate-crown-bounce">
                    <svg className="w-8 h-8 text-brand-warning drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm0 2h14v2H5v-2z" />
                    </svg>
                  </div>
                )}

                {/* Team Logo with Glow Ring */}
                <div className={cn(
                  "relative mb-6",
                  match.winnerId === match.teamAId && "ring-2 ring-brand-success/30 rounded-full"
                )}>
                  <div className="w-28 h-28 md:w-36 md:h-36 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shadow-inner p-3">
                    <TeamLogo src={match.teamA?.logoUrl} name={match.teamA?.name || "TBD"} size="xl" className="w-full h-full object-contain" />
                  </div>
                  {match.winnerId === match.teamAId && (
                    <div className="absolute inset-0 rounded-full bg-brand-success/10 blur-xl -z-10" />
                  )}
                </div>

                {/* Team Name */}
                <h3 className="font-bold text-2xl md:text-3xl text-white tracking-tight mb-1">
                  {match.teamA?.name || "TBD"}
                </h3>
                <span className="text-[10px] uppercase tracking-[0.2em] text-brand-textDim font-semibold">Home</span>

                {/* Score */}
                <div className={cn(
                  "mt-6 font-mono font-black tabular-nums leading-none text-white transition-all duration-300",
                  "text-[6rem] md:text-[9rem] tracking-tighter drop-shadow-2xl",
                  match.winnerId === match.teamAId && "text-brand-success",
                  isLive && "animate-score-pulse"
                )}>
                  {hasScores ? padScore(match.scoreA ?? 0) : "-"}
                </div>
              </div>
            </div>

            {/* Center Divider */}
            <div className="flex flex-col items-center justify-center px-4 py-4 md:py-0 relative">
              <div className="absolute top-0 bottom-0 left-0 right-0 bg-gradient-to-b from-white/[0.02] via-white/[0.05] to-white/[0.02]" />
              <div className="relative z-10 flex flex-col items-center gap-4">
                {/* VS Badge */}
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  <span className="text-white/20 font-bold text-lg md:text-xl font-mono">VS</span>
                </div>

                {/* Sets Display */}
                {match.setsA != null && match.setsB != null && (
                  <div className="flex flex-col items-center gap-1 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                    <span className="text-white/40 text-[10px] uppercase tracking-wider font-semibold">Sets</span>
                    <span className="text-lg font-mono font-bold text-brand-primary tabular-nums">
                      {match.setsA} — {match.setsB}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Team B Side */}
            <div className="flex-1 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-bl from-blue-900/20 via-transparent to-transparent" />
              <div className={cn(
                "relative z-10 flex flex-col items-center text-center py-12 md:py-16 px-6",
                isCompleted && match.winnerId === match.teamBId && "bg-brand-success/5"
              )}>
                {/* Winner Crown */}
                {isCompleted && match.winnerId === match.teamBId && (
                  <div className="mb-3 animate-crown-bounce">
                    <svg className="w-8 h-8 text-brand-warning drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm0 2h14v2H5v-2z" />
                    </svg>
                  </div>
                )}

                {/* Team Logo with Glow Ring */}
                <div className={cn(
                  "relative mb-6",
                  match.winnerId === match.teamBId && "ring-2 ring-brand-success/30 rounded-full"
                )}>
                  <div className="w-28 h-28 md:w-36 md:h-36 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shadow-inner p-3">
                    <TeamLogo src={match.teamB?.logoUrl} name={match.teamB?.name || "TBD"} size="xl" className="w-full h-full object-contain" />
                  </div>
                  {match.winnerId === match.teamBId && (
                    <div className="absolute inset-0 rounded-full bg-brand-success/10 blur-xl -z-10" />
                  )}
                </div>

                {/* Team Name */}
                <h3 className="font-bold text-2xl md:text-3xl text-white tracking-tight mb-1">
                  {match.teamB?.name || "TBD"}
                </h3>
                <span className="text-[10px] uppercase tracking-[0.2em] text-brand-textDim font-semibold">Away</span>

                {/* Score */}
                <div className={cn(
                  "mt-6 font-mono font-black tabular-nums leading-none text-white transition-all duration-300",
                  "text-[6rem] md:text-[9rem] tracking-tighter drop-shadow-2xl",
                  match.winnerId === match.teamBId && "text-brand-success",
                  isLive && "animate-score-pulse"
                )}>
                  {hasScores ? padScore(match.scoreB ?? 0) : "-"}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Completed Overlay */}
      {isCompleted && match.winner && (
        <div className="relative z-10 bg-gradient-to-r from-brand-success/10 via-brand-success/5 to-brand-success/10 border-t border-brand-success/20 px-8 py-4 flex items-center justify-center gap-3">
          <svg className="w-5 h-5 text-brand-warning" fill="currentColor" viewBox="0 0 24 24">
            <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm0 2h14v2H5v-2z" />
          </svg>
          <span className="text-brand-success font-bold uppercase tracking-[0.15em] text-sm">
            {match.winner.name} Wins
          </span>
        </div>
      )}
    </div>
  );
}

function padScore(score: number): string {
  return String(score).padStart(2, "0");
}

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
