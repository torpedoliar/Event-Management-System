"use client";

import React from 'react';
import type { BracketMatchView, MatchStatus } from '@/types/tournament.types';
import { MatchStatusLabels } from '@/types/tournament.types';
import { TeamLogo } from '../team/TeamLogo';

interface BracketMatchBoxProps {
  match: BracketMatchView;
  onClick?: () => void;
  isHighlighted?: boolean;
  isDarkMode?: boolean;
  compact?: boolean;
}

export function BracketMatchBox({
  match,
  onClick,
  isHighlighted = false,
  isDarkMode = false,
  compact = false,
}: BracketMatchBoxProps) {
  const isLive = match.status === 'ONGOING';
  const isCompleted = match.status === 'COMPLETED' || match.status === 'WALKOVER';
  const hasWinner = !!match.winner;

  const baseClasses = compact ? 'w-40' : 'w-48';
  const borderColor = isHighlighted
    ? 'border-yellow-400'
    : isLive
    ? 'border-red-500'
    : isDarkMode
    ? 'border-gray-600'
    : 'border-gray-300';

  return (
    <div
      className={`
        ${baseClasses}
        rounded-lg border-2 ${borderColor}
        ${isLive ? 'animate-pulse' : ''}
        ${isDarkMode ? 'bg-gray-800' : 'bg-white'}
        shadow-md overflow-hidden
        transition-all duration-200
        ${onClick ? 'cursor-pointer hover:shadow-lg hover:scale-105' : ''}
      `}
      onClick={onClick}
    >
      {/* Status Badge */}
      {isLive && (
        <div className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 flex items-center gap-1">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          LIVE
        </div>
      )}

      {/* Teams */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {/* Team A */}
        <div
          className={`
            flex items-center gap-2 px-2 py-1.5
            ${hasWinner && match.winner?.id === match.teamA?.id ? 'bg-green-50 dark:bg-green-900/30' : ''}
            ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}
          `}
        >
          <TeamLogo
            src={match.teamA?.logoUrl}
            name={match.teamA?.name || 'TBD'}
            size={compact ? 'sm' : 'md'}
          />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium truncate block">
              {match.teamA?.name || 'TBD'}
            </span>
          </div>
          <span className="text-lg font-bold">
            {match.teamA?.score ?? '-'}
          </span>
          {hasWinner && match.winner?.id === match.teamA?.id && (
            <span className="text-green-500 text-sm">✓</span>
          )}
        </div>

        {/* Team B */}
        <div
          className={`
            flex items-center gap-2 px-2 py-1.5
            ${hasWinner && match.winner?.id === match.teamB?.id ? 'bg-green-50 dark:bg-green-900/30' : ''}
            ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}
          `}
        >
          <TeamLogo
            src={match.teamB?.logoUrl}
            name={match.teamB?.name || 'TBD'}
            size={compact ? 'sm' : 'md'}
          />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium truncate block">
              {match.teamB?.name || 'TBD'}
            </span>
          </div>
          <span className="text-lg font-bold">
            {match.teamB?.score ?? '-'}
          </span>
          {hasWinner && match.winner?.id === match.teamB?.id && (
            <span className="text-green-500 text-sm">✓</span>
          )}
        </div>
      </div>
    </div>
  );
}
