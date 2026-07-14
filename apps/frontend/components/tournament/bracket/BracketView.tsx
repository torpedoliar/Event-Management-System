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
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  const updateScroll = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 5);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 5);
  }, []);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScroll();
    el.addEventListener('scroll', updateScroll, { passive: true });
    const ro = new ResizeObserver(updateScroll);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', updateScroll); ro.disconnect(); };
  }, [rounds, updateScroll]);

  if (rounds.length === 0) return null;

  const maxMatches = Math.max(...rounds.map(r => r.matches.length));
  const containerHeight = Math.max(400, maxMatches * 120 + (maxMatches - 1) * 40);

  return (
    <div className="relative">
      {/* Left fade */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-brand-bg to-transparent pointer-events-none z-20 transition-opacity duration-300 ${canScrollLeft ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Right fade */}
      <div
        className={`absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-brand-bg to-transparent pointer-events-none z-20 transition-opacity duration-300 ${canScrollRight ? 'opacity-100' : 'opacity-0'}`}
      />

      <div ref={scrollRef} className="w-full overflow-x-auto pb-4 scrollbar-hide">
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
                    
                    const hasRealPreviousMatches = hasPreviousMatches && previousMatches.some(prev => {
                      const prevMatch = rounds[roundIndex - 1].matches[prev.matchIndex];
                      const isPrevBye = prevMatch.status === 'WALKOVER' && (!prevMatch.teamA || !prevMatch.teamB) && (roundIndex - 1) === 0;
                      return !isPrevBye;
                    });
                    
                    const hasNextMatch = !isLastRound;
                    
                    const isByeMatch = match.status === 'WALKOVER' && (!match.teamA || !match.teamB) && roundIndex === 0;

                    return (
                      <div key={match.id} className="relative z-10 flex items-center justify-center">
                        {hasRealPreviousMatches && (
                          <div className="absolute top-1/2 -left-4 w-4 h-0 border-t-2 border-brand-border z-0" />
                        )}

                        {hasNextMatch && !isByeMatch && (
                          <BracketConnector
                            matchIndex={matchIndex}
                            matchesInRound={matchesInRound}
                            containerHeight={containerHeight}
                          />
                        )}

                        <div className={isByeMatch ? "opacity-0 pointer-events-none" : ""}>
                          <BracketMatchBox
                            match={match}
                            onClick={() => onMatchClick?.(match.id)}
                            isHighlighted={highlightedMatchId === match.id}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
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
