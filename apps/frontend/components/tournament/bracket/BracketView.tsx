"use client";

import React from 'react';
import type {
  BracketView as BracketViewType,
  BracketRoundView,
  BracketMatchView,
} from '@/types/tournament.types';
import { BracketMatchBox } from './BracketMatchBox';
import { BracketConnector } from './BracketConnector';

interface BracketViewProps {
  bracket: BracketViewType;
  onMatchClick?: (matchId: string) => void;
  highlightedMatchId?: string;
  isDarkMode?: boolean;
}

export function BracketView({
  bracket,
  onMatchClick,
  highlightedMatchId,
  isDarkMode = false,
}: BracketViewProps) {
  const rounds = bracket.rounds || [];

  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="flex gap-8 min-w-max p-4">
        {rounds.map((round, roundIndex) => {
          const isLastRound = roundIndex === rounds.length - 1;
          const matchesInRound = round.matches.length;

          return (
            <div key={round.id} className="flex flex-col">
              {/* Round Header */}
              <div className="text-center mb-4">
                <h3
                  className={`font-semibold ${
                    isDarkMode ? 'text-gray-200' : 'text-gray-800'
                  }`}
                >
                  {round.name || `Round ${round.roundNumber}`}
                </h3>
              </div>

              {/* Matches Container */}
              <div
                className="flex flex-col justify-around"
                style={{
                  height: `${matchesInRound * 120 + (matchesInRound - 1) * 40}px`,
                }}
              >
                {round.matches.map((match, matchIndex) => {
                  const previousMatches = getPreviousMatches(roundIndex, matchIndex, rounds);
                  const showConnector = !isLastRound && previousMatches.length > 0;

                  return (
                    <div key={match.id} className="relative">
                      {showConnector && (
                        <BracketConnector
                          matchIndex={matchIndex}
                          matchesInRound={matchesInRound}
                          nextMatchesInRound={rounds[roundIndex + 1]?.matches.length || 0}
                          isDarkMode={isDarkMode}
                        />
                      )}
                      <BracketMatchBox
                        match={match}
                        onClick={() => onMatchClick?.(match.id)}
                        isHighlighted={highlightedMatchId === match.id}
                        isDarkMode={isDarkMode}
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

/**
 * Helper function to find previous matches that feed into current match
 */
function getPreviousMatches(
  currentRoundIndex: number,
  currentMatchIndex: number,
  rounds: BracketRoundView[]
): { matchIndex: number; slot: 'A' | 'B' }[] {
  if (currentRoundIndex === 0) return [];

  const previousRound = rounds[currentRoundIndex - 1];
  const matchesInPreviousRound = previousRound?.matches.length || 0;

  // Each match in current round is fed by 2 matches from previous round
  const feedMatch1Index = currentMatchIndex * 2;
  const feedMatch2Index = currentMatchIndex * 2 + 1;

  const previousMatches: { matchIndex: number; slot: 'A' | 'B' }[] = [];

  if (feedMatch1Index < matchesInPreviousRound) {
    previousMatches.push({ matchIndex: feedMatch1Index, slot: 'A' });
  }
  if (feedMatch2Index < matchesInPreviousRound) {
    previousMatches.push({ matchIndex: feedMatch2Index, slot: 'B' });
  }

  return previousMatches;
}
