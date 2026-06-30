"use client";

import React from "react";
import type { BracketView as BracketViewType, BracketRoundView, BracketMatchView } from "@/types/tournament.types";
import { BracketMatchBox } from "./BracketMatchBox";
import { BracketConnector } from "./BracketConnector";

interface BracketViewProps {
  bracket: BracketViewType;
  onMatchClick?: (matchId: string) => void;
  highlightedMatchId?: string;
}

export function BracketView({ bracket, onMatchClick, highlightedMatchId }: BracketViewProps) {
  const rounds = bracket.rounds || [];
  
  if (rounds.length === 0) return null;

  const maxMatches = Math.max(...rounds.map(r => r.matches.length));
  const containerHeight = Math.max(400, maxMatches * 120 + (maxMatches - 1) * 40);

  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="flex gap-8 min-w-max p-4 items-stretch">
        {rounds.map((round, roundIndex) => {
          const isLastRound = roundIndex === rounds.length - 1;
          const matchesInRound = round.matches.length;

          return (
            <div key={round.id} className="flex flex-col w-48 shrink-0">
              <div className="text-center mb-6 h-6 flex-shrink-0">
                <h3 className="font-semibold text-brand-text">
                  {round.name || `Round ${round.roundNumber}`}
                </h3>
              </div>

              <div
                className="flex flex-col justify-around flex-1 relative"
                style={{ height: containerHeight }}
              >
                {round.matches.map((match, matchIndex) => {
                  const previousMatches = getPreviousMatches(roundIndex, matchIndex, rounds);
                  const hasPreviousMatches = roundIndex > 0 && previousMatches.length > 0;
                  const hasNextMatch = !isLastRound;

                  return (
                    <div key={match.id} className="relative z-10 flex items-center justify-center">
                      {hasPreviousMatches && (
                        <div className="absolute top-1/2 -left-4 w-4 h-0 border-t-2 border-brand-border z-0" />
                      )}
                      
                      {hasNextMatch && (
                        <BracketConnector
                          matchIndex={matchIndex}
                          matchesInRound={matchesInRound}
                          containerHeight={containerHeight}
                        />
                      )}

                      <BracketMatchBox
                        match={match}
                        onClick={() => onMatchClick?.(match.id)}
                        isHighlighted={highlightedMatchId === match.id}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getPreviousMatches(
  currentRoundIndex: number,
  currentMatchIndex: number,
  rounds: BracketRoundView[]
): { matchIndex: number; slot: "A" | "B" }[] {
  if (currentRoundIndex === 0) return [];

  const previousRound = rounds[currentRoundIndex - 1];
  const matchesInPreviousRound = previousRound?.matches.length || 0;

  const feedMatch1Index = currentMatchIndex * 2;
  const feedMatch2Index = currentMatchIndex * 2 + 1;

  const previousMatches: { matchIndex: number; slot: "A" | "B" }[] = [];

  if (feedMatch1Index < matchesInPreviousRound) {
    previousMatches.push({ matchIndex: feedMatch1Index, slot: "A" });
  }
  if (feedMatch2Index < matchesInPreviousRound) {
    previousMatches.push({ matchIndex: feedMatch2Index, slot: "B" });
  }

  return previousMatches;
}
