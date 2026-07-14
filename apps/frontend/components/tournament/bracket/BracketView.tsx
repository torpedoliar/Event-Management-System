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
        className={`absolute left-0 top-0 bottom-0 w-8 md:w-16 bg-gradient-to-r from-brand-bg to-transparent pointer-events-none z-20 transition-opacity duration-300 ${canScrollLeft ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Right fade */}
      <div
        className={`absolute right-0 top-0 bottom-0 w-8 md:w-16 bg-gradient-to-l from-brand-bg to-transparent pointer-events-none z-20 transition-opacity duration-300 ${canScrollRight ? 'opacity-100' : 'opacity-0'}`}
      />

      <div ref={scrollRef} className="w-full overflow-x-auto pb-4 scrollbar-hide">
        <div className="flex gap-6 md:gap-10 min-w-max p-3 md:p-4 items-stretch">
          {rounds.map((round, roundIndex) => {
            const isLastRound = roundIndex === rounds.length - 1;
            const isFirstRound = roundIndex === 0;
            const matchesInRound = round.matches.length;

            return (
              <div key={round.id} className="flex flex-col w-44 md:w-56 shrink-0">
                {/* Round Header Badge */}
                <div className="text-center mb-8 h-8 flex-shrink-0 flex items-center justify-center">
                  <div className={cn(
                    "px-4 py-1 rounded-full text-xs font-bold uppercase tracking-[0.15em] border",
                    isFirstRound
                      ? "bg-brand-surface border-brand-border/60 text-brand-textMuted"
                      : isLastRound
                        ? "bg-gradient-to-r from-brand-primary/20 via-brand-primary/10 to-brand-primary/20 border-brand-primary/30 text-brand-primary"
                        : "bg-brand-surface border-brand-border/40 text-brand-textMuted"
                  )}>
                    {round.name || `Round ${round.roundNumber}`}
                  </div>
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
                      <div key={match.id} className="relative z-10 flex items-center justify-center group">
                        {/* Inbound connector line */}
                        {hasRealPreviousMatches && (
                          <div className="absolute top-1/2 -left-5 w-5 h-0 z-0">
                            <svg width="20" height="2" viewBox="0 0 20 2" className="overflow-visible">
                              <defs>
                                <linearGradient id={`inbound-${match.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                                  <stop offset="0%" stopColor="rgba(255,255,255,0.06)" />
                                  <stop offset="100%" stopColor="rgba(255,255,255,0.12)" />
                                </linearGradient>
                              </defs>
                              <line x1="0" y1="1" x2="20" y2="1" stroke={`url(#inbound-${match.id})`} strokeWidth="2" strokeLinecap="round" />
                            </svg>
                          </div>
                        )}

                        {/* Outbound connector */}
                        {hasNextMatch && !isByeMatch && (
                          <BracketConnector
                            matchIndex={matchIndex}
                            matchesInRound={matchesInRound}
                            containerHeight={containerHeight}
                            roundIndex={roundIndex}
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

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
