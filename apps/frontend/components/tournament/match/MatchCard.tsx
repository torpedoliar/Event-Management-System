"use client";

import React from 'react';
import type { Match, MatchStatus } from '@/types/tournament.types';
import { MatchStatusLabels } from '@/types/tournament.types';
import { TeamLogo } from '../team/TeamLogo';

interface MatchCardProps {
  match: Match;
  onClick?: () => void;
  isDarkMode?: boolean;
  compact?: boolean;
  isLive?: boolean;
}

export function MatchCard({ match, onClick, isDarkMode = false, compact = false, isLive: isLiveProp = false }: MatchCardProps) {
  const isLive = isLiveProp || match.status === 'ONGOING';
  const isCompleted = match.status === 'COMPLETED' || match.status === 'WALKOVER';
  const hasScores = match.scoreA !== null && match.scoreB !== null;

  const statusColors: Record<MatchStatus, string> = {
    SCHEDULED: isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600',
    ONGOING: 'bg-red-500 text-white',
    COMPLETED: isDarkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700',
    CANCELLED: isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500',
    WALKOVER: isDarkMode ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-700',
  };

  return (
    <div
      className={`
        rounded-lg border
        ${isLive ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-200'}
        ${isDarkMode ? 'bg-gray-800' : 'bg-white'}
        ${isLive ? 'animate-pulse' : ''}
        ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
        ${compact ? 'p-3' : 'p-4'}
      `}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Match #{match.matchNumber}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[match.status]}`}>
          {MatchStatusLabels[match.status]}
        </span>
      </div>

      {/* Teams */}
      <div className={`flex items-center gap-4 ${compact ? 'text-sm' : ''}`}>
        {/* Team A */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <TeamLogo
            src={match.teamA?.logoUrl}
            name={match.teamA?.name || 'TBD'}
            size={compact ? 'sm' : 'md'}
          />
          <span className={`font-medium truncate ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
            {match.teamA?.name || 'TBD'}
          </span>
          {match.winnerId === match.teamAId && (
            <span className="text-green-500 text-sm">✓</span>
          )}
        </div>

        {/* Score */}
        <div className={`font-bold text-xl ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          {hasScores ? (
            <>
              <span className={match.winnerId === match.teamAId ? 'text-green-500' : ''}>
                {match.scoreA}
              </span>
              <span className={`mx-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>-</span>
              <span className={match.winnerId === match.teamBId ? 'text-green-500' : ''}>
                {match.scoreB}
              </span>
            </>
          ) : (
            <span className="text-gray-400">vs</span>
          )}
        </div>

        {/* Team B */}
        <div className="flex-1 flex items-center gap-2 min-w-0 justify-end">
          {match.winnerId === match.teamBId && (
            <span className="text-green-500 text-sm">✓</span>
          )}
          <span className={`font-medium truncate ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
            {match.teamB?.name || 'TBD'}
          </span>
          <TeamLogo
            src={match.teamB?.logoUrl}
            name={match.teamB?.name || 'TBD'}
            size={compact ? 'sm' : 'md'}
          />
        </div>
      </div>

      {/* Sets (if applicable) */}
      {match.setsA !== null && match.setsB !== null && (
        <div className={`mt-2 text-xs text-center ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          Sets: {match.setsA} - {match.setsB}
        </div>
      )}

      {/* Court / Time */}
      {!compact && (match.court || match.scheduledAt) && (
        <div className={`mt-3 pt-3 border-t ${isDarkMode ? 'border-gray-700 text-gray-500' : 'border-gray-100 text-gray-400'} text-xs`}>
          {match.court && <span>Court: {match.court}</span>}
          {match.court && match.scheduledAt && <span className="mx-2">•</span>}
          {match.scheduledAt && (
            <span>{new Date(match.scheduledAt).toLocaleTimeString()}</span>
          )}
        </div>
      )}
    </div>
  );
}
