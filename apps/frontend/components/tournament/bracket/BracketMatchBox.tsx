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
  const hasWinner = !!match.winner;
  
  const isTeamAWinner = hasWinner && match.winner?.id === match.teamA?.id;
  const isTeamBWinner = hasWinner && match.winner?.id === match.teamB?.id;

  const baseClasses = compact ? "w-40" : "w-52";

  return (
    <div className="relative group">
      {/* Live Glow Effect */}
      {isLive && (
        <div className="absolute -inset-2 bg-brand-danger/20 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      )}
      
      {/* Highlight Glow Effect */}
      {isHighlighted && !isLive && (
        <div className="absolute -inset-2 bg-brand-primary/20 rounded-2xl blur-xl opacity-50 pointer-events-none" />
      )}

      <div
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        aria-label={`${match.teamA?.name || "TBD"} vs ${match.teamB?.name || "TBD"}${isLive ? " — Live" : ""}${hasWinner ? ` — Winner: ${match.winner?.name}` : ""}`}
        className={cn(
          baseClasses,
          "rounded-xl border bg-brand-surface shadow-sm overflow-hidden transition-all duration-300 relative z-10",
          isHighlighted ? "border-brand-primary/50 shadow-brand-primary/10" : isLive ? "border-brand-danger/50 shadow-brand-danger/10" : "border-brand-border/60",
          onClick && "cursor-pointer hover:border-brand-primary/40 hover:shadow-xl hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/50"
        )}
        onClick={onClick}
        onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
      >
        {isLive && (
          <div className="bg-brand-danger/10 border-b border-brand-danger/20 text-brand-danger text-[10px] uppercase font-bold px-2 py-1 flex items-center justify-center gap-1.5 tracking-wider">
            <span className="w-1.5 h-1.5 bg-brand-danger rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
            Live Match
          </div>
        )}

        <div className="divide-y divide-brand-border/40">
          {/* Team A */}
          <div
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 transition-opacity duration-300",
              hasWinner && !isTeamAWinner && "opacity-40 grayscale-[30%]",
              isTeamAWinner && "bg-brand-success/5"
            )}
          >
            <TeamLogo src={match.teamA?.logoUrl} name={match.teamA?.name || "TBD"} size="sm" />
            <div className="flex-1 min-w-0">
              <span className={cn(
                "text-sm truncate block", 
                isTeamAWinner ? "font-bold text-brand-text" : "font-medium text-brand-textMuted"
              )}>
                {match.teamA?.name || "TBD"}
              </span>
            </div>
            <span className={cn(
              "text-sm tabular-nums", 
              isTeamAWinner ? "font-black text-brand-success" : "font-semibold text-brand-textMuted"
            )}>
              {match.teamA?.score ?? "-"}
            </span>
          </div>

          {/* Team B */}
          <div
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 transition-opacity duration-300",
              hasWinner && !isTeamBWinner && "opacity-40 grayscale-[30%]",
              isTeamBWinner && "bg-brand-success/5"
            )}
          >
            <TeamLogo src={match.teamB?.logoUrl} name={match.teamB?.name || "TBD"} size="sm" />
            <div className="flex-1 min-w-0">
              <span className={cn(
                "text-sm truncate block", 
                isTeamBWinner ? "font-bold text-brand-text" : "font-medium text-brand-textMuted"
              )}>
                {match.teamB?.name || "TBD"}
              </span>
            </div>
            <span className={cn(
              "text-sm tabular-nums", 
              isTeamBWinner ? "font-black text-brand-success" : "font-semibold text-brand-textMuted"
            )}>
              {match.teamB?.score ?? "-"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
