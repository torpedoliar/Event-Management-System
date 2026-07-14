"use client";

import React from "react";
import type { BracketMatchView } from "@/types/tournament.types";
import { TeamLogo } from "../team/TeamLogo";

interface BracketMatchBoxProps {
  match: BracketMatchView;
  onClick?: () => void;
  isHighlighted?: boolean;
  compact?: boolean;
}

export function BracketMatchBox({
  match,
  onClick,
  isHighlighted = false,
  compact = false,
}: BracketMatchBoxProps) {
  const isLive = match.status === "ONGOING";
  const isCompleted = match.status === "COMPLETED" || match.status === "WALKOVER";
  const hasWinner = !!match.winner;

  const isTeamAWinner = hasWinner && match.winner?.id === match.teamA?.id;
  const isTeamBWinner = hasWinner && match.winner?.id === match.teamB?.id;

  const baseClasses = compact ? "w-36 md:w-44" : "w-40 md:w-56";

  return (
    <div className="relative group">
      {/* Live Glow Effect */}
      {isLive && (
        <div className="absolute -inset-1 bg-brand-danger/25 rounded-2xl blur-lg opacity-75 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none animate-border-glow" />
      )}

      {/* Highlight Glow Effect */}
      {isHighlighted && !isLive && (
        <div className="absolute -inset-1 bg-brand-primary/25 rounded-2xl blur-lg opacity-50 pointer-events-none" />
      )}

      <div
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        aria-label={`${match.teamA?.name || "TBD"} vs ${match.teamB?.name || "TBD"}${isLive ? " — Live" : ""}${hasWinner ? ` — Winner: ${match.winner?.name}` : ""}`}
        className={cn(
          baseClasses,
          "rounded-xl border overflow-hidden transition-all duration-300 relative z-10",
          "bg-gradient-to-b from-brand-surface to-brand-surface/80",
          "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_4px_20px_rgba(0,0,0,0.3)]",
          isHighlighted
            ? "border-brand-primary/50 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_0_20px_rgba(212,168,83,0.15)]"
            : isLive
              ? "border-brand-danger/50 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_0_20px_rgba(239,68,68,0.15)]"
              : "border-brand-border/60",
          onClick && "cursor-pointer hover:border-brand-primary/40 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_8px_40px_rgba(0,0,0,0.4),0_0_30px_rgba(212,168,83,0.1)] hover:scale-[1.02] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/50"
        )}
        onClick={onClick}
        onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
      >
        {/* Match Number Badge */}
        <div className="absolute top-0 left-0 z-20">
          <div className="bg-brand-bg/80 border-b border-r border-white/5 rounded-br-lg px-2 py-0.5">
            <span className="text-[9px] text-brand-textDim font-mono font-semibold">#{match.matchNumber}</span>
          </div>
        </div>

        {/* Live Header */}
        {isLive && (
          <div className="bg-gradient-to-r from-brand-danger/15 via-brand-danger/10 to-brand-danger/15 border-b border-brand-danger/20 text-brand-danger text-[10px] uppercase font-bold px-2 py-1 flex items-center justify-center gap-1.5 tracking-wider">
            <span className="w-1.5 h-1.5 bg-brand-danger rounded-full animate-live-breathe shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
            Live
          </div>
        )}

        {/* Team Rows */}
        <div className="divide-y divide-brand-border/30">
          {/* Team A */}
          <div
            className={cn(
              "flex items-center gap-2.5 px-3 py-2.5 transition-all duration-300",
              hasWinner && !isTeamAWinner && "opacity-35",
              isTeamAWinner && "bg-gradient-to-r from-brand-success/10 to-transparent"
            )}
          >
            <div className={cn(
              "flex-shrink-0",
              isTeamAWinner && "ring-1 ring-brand-success/40 rounded-full"
            )}>
              <TeamLogo src={match.teamA?.logoUrl} name={match.teamA?.name || "TBD"} size="sm" />
            </div>
            <div className="flex-1 min-w-0">
              <span className={cn(
                "text-sm truncate block",
                isTeamAWinner ? "font-bold text-brand-text" : "font-medium text-brand-textMuted"
              )}>
                {match.teamA?.name || "TBD"}
              </span>
            </div>
            <span className={cn(
              "text-sm tabular-nums min-w-[1.5rem] text-right",
              isTeamAWinner ? "font-black text-brand-success" : "font-semibold text-brand-textMuted"
            )}>
              {match.teamA?.score ?? "-"}
            </span>
          </div>

          {/* Team B */}
          <div
            className={cn(
              "flex items-center gap-2.5 px-3 py-2.5 transition-all duration-300",
              hasWinner && !isTeamBWinner && "opacity-35",
              isTeamBWinner && "bg-gradient-to-r from-brand-success/10 to-transparent"
            )}
          >
            <div className={cn(
              "flex-shrink-0",
              isTeamBWinner && "ring-1 ring-brand-success/40 rounded-full"
            )}>
              <TeamLogo src={match.teamB?.logoUrl} name={match.teamB?.name || "TBD"} size="sm" />
            </div>
            <div className="flex-1 min-w-0">
              <span className={cn(
                "text-sm truncate block",
                isTeamBWinner ? "font-bold text-brand-text" : "font-medium text-brand-textMuted"
              )}>
                {match.teamB?.name || "TBD"}
              </span>
            </div>
            <span className={cn(
              "text-sm tabular-nums min-w-[1.5rem] text-right",
              isTeamBWinner ? "font-black text-brand-success" : "font-semibold text-brand-textMuted"
            )}>
              {match.teamB?.score ?? "-"}
            </span>
          </div>
        </div>

        {/* Winner Accent Bar */}
        {isCompleted && hasWinner && (
          <div className="h-0.5 bg-gradient-to-r from-transparent via-brand-success/60 to-transparent" />
        )}
      </div>
    </div>
  );
}

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
