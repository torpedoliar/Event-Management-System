"use client";

import React from 'react';
import type { TournamentTeam } from '@/types/tournament.types';
import { TeamLogo } from './TeamLogo';
import { TeamMemberList } from './TeamMemberList';

interface TeamCardProps {
  team: TournamentTeam;
  onClick?: () => void;
  isDarkMode?: boolean;
  showDetails?: boolean;
}

export function TeamCard({
  team,
  onClick,
  isDarkMode = false,
  showDetails = false,
}: TeamCardProps) {
  return (
    <div
      className={`
        rounded-lg border ${
          isDarkMode
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
        }
        shadow-sm overflow-hidden
        ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
      `}
      onClick={onClick}
    >
      <div className="p-4">
        <div className="flex items-center gap-3">
          <TeamLogo src={team.logoUrl} name={team.name} size="lg" />
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {team.name}
            </h3>
            {team.seed && (
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Seed #{team.seed}
              </p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 flex gap-4">
          <div className="text-center">
            <p className={`text-2xl font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
              {team.wins}
            </p>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Wins</p>
          </div>
          <div className="text-center">
            <p className={`text-2xl font-bold ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
              {team.losses}
            </p>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Losses</p>
          </div>
          <div className="text-center">
            <p className={`text-2xl font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {team.draws}
            </p>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Draws</p>
          </div>
        </div>

        {/* Members */}
        {showDetails && team.members && team.members.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h4 className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Members ({team.members.length})
            </h4>
            <TeamMemberList members={team.members} isDarkMode={isDarkMode} compact />
          </div>
        )}
      </div>

      {/* Eliminated badge */}
      {team.isEliminated && (
        <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-medium px-4 py-1.5">
          Eliminated
        </div>
      )}
    </div>
  );
}
