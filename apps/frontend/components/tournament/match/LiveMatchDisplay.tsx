"use client";

import React from 'react';
import type { Match } from '@/types/tournament.types';
import { TeamLogo } from '../team/TeamLogo';
import { MatchTimer } from './MatchTimer';

interface LiveMatchDisplayProps {
  match: Match;
  isDarkMode?: boolean;
  showTimer?: boolean;
}

export function LiveMatchDisplay({
  match,
  isDarkMode = false,
  showTimer = true,
}: LiveMatchDisplayProps) {
  const isLive = match.status === 'ONGOING';
  const hasScores = match.scoreA !== null && match.scoreB !== null;

  return (
    <div
      className={`
        rounded-2xl overflow-hidden
        ${isDarkMode ? 'bg-gray-900' : 'bg-white'}
        shadow-2xl
        ${isLive ? 'ring-4 ring-red-500 animate-pulse' : ''}
      `}
    >
      {/* Live Badge */}
      {isLive && (
        <div className="bg-red-600 text-white px-6 py-2 flex items-center justify-center gap-2">
          <span className="w-3 h-3 bg-white rounded-full animate-pulse" />
          <span className="font-bold uppercase tracking-wider">Live</span>
          {showTimer && match.startedAt && (
            <span className="ml-4">
              <MatchTimer startTime={match.startedAt} />
            </span>
          )}
        </div>
      )}

      {/* Teams and Score */}
      <div className="p-8">
        <div className="flex items-center justify-between gap-4">
          {/* Team A */}
          <div className="flex-1 text-center">
            <TeamLogo
              src={match.teamA?.logoUrl}
              name={match.teamA?.name || 'TBD'}
              size="lg"
              className="mx-auto mb-2"
            />
            <h3 className={`font-bold text-xl ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {match.teamA?.name || 'TBD'}
            </h3>
          </div>

          {/* Score */}
          <div className="text-center px-8">
            <div className={`text-7xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {hasScores ? (
                <>
                  <span className={match.winnerId === match.teamAId ? 'text-green-500' : ''}>
                    {match.scoreA}
                  </span>
                  <span className={`text-4xl mx-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    -
                  </span>
                  <span className={match.winnerId === match.teamBId ? 'text-green-500' : ''}>
                    {match.scoreB}
                  </span>
                </>
              ) : (
                <span className="text-4xl">vs</span>
              )}
            </div>
            {match.setsA !== null && match.setsB !== null && (
              <div className={`mt-2 text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Sets: {match.setsA} - {match.setsB}
              </div>
            )}
          </div>

          {/* Team B */}
          <div className="flex-1 text-center">
            <TeamLogo
              src={match.teamB?.logoUrl}
              name={match.teamB?.name || 'TBD'}
              size="lg"
              className="mx-auto mb-2"
            />
            <h3 className={`font-bold text-xl ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {match.teamB?.name || 'TBD'}
            </h3>
          </div>
        </div>
      </div>

      {/* Match Info */}
      {match.court && (
        <div
          className={`
            px-6 py-3 text-center text-sm
            ${isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'}
          `}
        >
          Court: <span className="font-semibold">{match.court}</span>
        </div>
      )}
    </div>
  );
}
