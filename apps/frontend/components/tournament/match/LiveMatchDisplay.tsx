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
        "rounded-2xl overflow-hidden bg-brand-surface border border-brand-border shadow-xl",
        isLive && "ring-2 ring-brand-danger shadow-brand-danger/20"
      )}
    >
      {isLive && (
        <div className="bg-brand-danger text-white px-6 py-2 flex items-center justify-center gap-2">
          <span className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
          <span className="font-bold uppercase tracking-wider text-sm">Live</span>
          {showTimer && match.startedAt && (
            <span className="ml-4 font-mono">
              <MatchTimer startTime={match.startedAt} />
            </span>
          )}
        </div>
      )}

      <div className="p-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 text-center">
            <TeamLogo
              src={match.teamA?.logoUrl}
              name={match.teamA?.name || "TBD"}
              size="lg"
              className="mx-auto mb-3"
            />
            <h3 className="font-bold text-xl text-brand-text">
              {match.teamA?.name || "TBD"}
            </h3>
          </div>

          <div className="text-center px-8">
            <div className="text-7xl font-black text-brand-text tabular-nums tracking-tighter flex items-center gap-4">
              {hasScores ? (
                <>
                  <span className={match.winnerId === match.teamAId ? "text-brand-success" : ""}>
                    {match.scoreA ?? "-"}
                  </span>
                  <span className="text-4xl text-brand-textMuted/50 font-normal">-</span>
                  <span className={match.winnerId === match.teamBId ? "text-brand-success" : ""}>
                    {match.scoreB ?? "-"}
                  </span>
                </>
              ) : (
                <span className="text-4xl text-brand-textMuted font-medium">vs</span>
              )}
            </div>
            {match.setsA != null && match.setsB != null && (
              <div className="mt-3 text-lg font-medium text-brand-textMuted">
                Sets: {match.setsA} - {match.setsB}
              </div>
            )}
          </div>

          <div className="flex-1 text-center">
            <TeamLogo
              src={match.teamB?.logoUrl}
              name={match.teamB?.name || "TBD"}
              size="lg"
              className="mx-auto mb-3"
            />
            <h3 className="font-bold text-xl text-brand-text">
              {match.teamB?.name || "TBD"}
            </h3>
          </div>
        </div>
      </div>

      {match.court && (
        <div className="px-6 py-3 text-center text-sm bg-brand-surface/50 border-t border-brand-border text-brand-textMuted">
          Court: <span className="font-semibold text-brand-text">{match.court}</span>
        </div>
      )}
    </div>
  );
}

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
