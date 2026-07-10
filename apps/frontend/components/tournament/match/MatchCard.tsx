"use client";

import React from "react";
import type { Match, MatchStatus } from "@/types/tournament.types";
import { MatchStatusLabels } from "@/types/tournament.types";
import { TeamLogo } from "../team/TeamLogo";
import { Monitor } from "lucide-react";

interface MatchCardProps {
  match: Match;
  onClick?: () => void;
  compact?: boolean;
  isLive?: boolean;
}

export function MatchCard({ match, onClick, compact = false, isLive: isLiveProp = false }: MatchCardProps) {
  const isLive = isLiveProp || match.status === "ONGOING";
  const isCompleted = match.status === "COMPLETED" || match.status === "WALKOVER";
  const hasScores = match.scoreA != null || match.scoreB != null;

  const statusColors: Record<MatchStatus, string> = {
    SCHEDULED: "bg-brand-surface text-brand-textMuted",
    ONGOING: "bg-brand-danger/10 text-brand-danger",
    COMPLETED: "bg-brand-success/10 text-brand-success",
    CANCELLED: "bg-brand-surface text-brand-textMuted",
    WALKOVER: "bg-brand-warning/10 text-brand-warning",
  };

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `Match #${match.matchNumber}: ${match.teamA?.name || "TBD"} vs ${match.teamB?.name || "TBD"}` : undefined}
      className={cn(
        "rounded-xl border transition-all",
        isLive ? "border-brand-danger animate-pulse" : "border-brand-border bg-brand-surface",
        onClick && "cursor-pointer hover:border-brand-primary/50 hover:bg-white/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/50",
        compact ? "p-3" : "p-4"
      )}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-brand-textMuted flex items-center gap-3">
          <span>Match #{match.matchNumber}</span>
          <a
            href={`/tournament/live/${match.id}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-brand-primary hover:text-brand-primaryHover transition-colors hover:underline"
            onClick={(e) => e.stopPropagation()}
            title="Open Live Display (New Tab)"
          >
            <Monitor size={12} />
            <span>Live Display</span>
          </a>
        </span>
        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColors[match.status])}>
          {MatchStatusLabels[match.status]}
        </span>
      </div>

      <div className={cn("flex items-center gap-4", compact && "text-sm")}>
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <TeamLogo src={match.teamA?.logoUrl} name={match.teamA?.name || "TBD"} size={compact ? "sm" : "md"} />
          <span className="font-semibold truncate text-brand-text">
            {match.teamA?.name || "TBD"}
          </span>
          {match.winnerId === match.teamAId && <span className="text-brand-success text-sm">✓</span>}
        </div>

        <div className="font-bold text-xl text-brand-text">
          {hasScores ? (
            <>
              <span className={match.winnerId === match.teamAId ? "text-brand-success" : ""}>
                {match.scoreA ?? "-"}
              </span>
              <span className="mx-1.5 text-brand-textMuted">-</span>
              <span className={match.winnerId === match.teamBId ? "text-brand-success" : ""}>
                {match.scoreB ?? "-"}
              </span>
            </>
          ) : (
            <span className="text-brand-textMuted text-sm font-medium">vs</span>
          )}
        </div>

        <div className="flex-1 flex items-center gap-2 min-w-0 justify-end">
          {match.winnerId === match.teamBId && <span className="text-brand-success text-sm">✓</span>}
          <span className="font-semibold truncate text-brand-text">
            {match.teamB?.name || "TBD"}
          </span>
          <TeamLogo src={match.teamB?.logoUrl} name={match.teamB?.name || "TBD"} size={compact ? "sm" : "md"} />
        </div>
      </div>

      {match.setsA != null && match.setsB != null && (
        <div className="mt-2 text-xs text-center text-brand-textMuted font-medium">
          Sets: {match.setsA} - {match.setsB}
        </div>
      )}

      {!compact && (match.court || match.scheduledAt) && (
        <div className="mt-3 pt-3 border-t border-brand-border text-xs text-brand-textMuted flex items-center justify-center">
          {match.court && <span>Court: {match.court}</span>}
          {match.court && match.scheduledAt && <span className="mx-2">•</span>}
          {match.scheduledAt && (
            <span>{new Date(match.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          )}
        </div>
      )}
    </div>
  );
}

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
