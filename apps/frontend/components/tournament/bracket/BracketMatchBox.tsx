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

  const baseClasses = compact ? "w-40" : "w-48";

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={`${match.teamA?.name || "TBD"} vs ${match.teamB?.name || "TBD"}${isLive ? " — Live" : ""}${hasWinner ? ` — Winner: ${match.winner?.name}` : ""}`}
      className={cn(
        baseClasses,
        "rounded-xl border-2 bg-brand-surface shadow-sm overflow-hidden transition-all duration-200 relative z-10",
        isHighlighted ? "border-brand-primary" : isLive ? "border-brand-danger animate-pulse" : "border-brand-border",
        onClick && "cursor-pointer hover:border-brand-primary/50 hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/50"
      )}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
    >
      {isLive && (
        <div className="bg-brand-danger text-brand-bg text-2xs uppercase font-bold px-2 py-0.5 flex items-center justify-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
          Live
        </div>
      )}

      <div className="divide-y divide-brand-border">
        <div
          className={cn(
            "flex items-center gap-2 px-2.5 py-2",
            hasWinner && match.winner?.id === match.teamA?.id && "bg-brand-success/10"
          )}
        >
          <TeamLogo src={match.teamA?.logoUrl} name={match.teamA?.name || "TBD"} size="sm" />
          <div className="flex-1 min-w-0">
            <span className={cn("text-sm font-semibold truncate block", hasWinner && match.winner?.id === match.teamA?.id ? "text-brand-text" : "text-brand-textMuted")}>
              {match.teamA?.name || "TBD"}
            </span>
          </div>
          <span className={cn("text-base font-bold", hasWinner && match.winner?.id === match.teamA?.id ? "text-brand-success" : "text-brand-text")}>
            {match.teamA?.score ?? "-"}
          </span>
        </div>

        <div
          className={cn(
            "flex items-center gap-2 px-2.5 py-2",
            hasWinner && match.winner?.id === match.teamB?.id && "bg-brand-success/10"
          )}
        >
          <TeamLogo src={match.teamB?.logoUrl} name={match.teamB?.name || "TBD"} size="sm" />
          <div className="flex-1 min-w-0">
            <span className={cn("text-sm font-semibold truncate block", hasWinner && match.winner?.id === match.teamB?.id ? "text-brand-text" : "text-brand-textMuted")}>
              {match.teamB?.name || "TBD"}
            </span>
          </div>
          <span className={cn("text-base font-bold", hasWinner && match.winner?.id === match.teamB?.id ? "text-brand-success" : "text-brand-text")}>
            {match.teamB?.score ?? "-"}
          </span>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
