"use client";

import React from 'react';
import type { TeamMember } from '@/types/tournament.types';
import Image from 'next/image';

interface TeamMemberListProps {
  members: TeamMember[];
  isDarkMode?: boolean;
  compact?: boolean;
}

export function TeamMemberList({ members, isDarkMode = false, compact = false }: TeamMemberListProps) {
  if (members.length === 0) {
    return (
      <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
        No members
      </p>
    );
  }

  return (
    <div className={`${compact ? 'space-y-1' : 'divide-y divide-gray-200 dark:divide-gray-700'}`}>
      {members.map((member) => (
        <div
          key={member.id}
          className={`flex items-center gap-3 ${compact ? 'py-1' : 'py-2'}`}
        >
          {/* Photo or Initial */}
          {member.photoUrl ? (
            <Image
              src={member.photoUrl}
              alt={member.name}
              width={compact ? 24 : 32}
              height={compact ? 24 : 32}
              className="rounded-full object-cover"
              unoptimized
            />
          ) : (
            <div
              className={`
                rounded-full flex items-center justify-center
                ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}
                ${compact ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm'}
                font-medium
              `}
            >
              {member.name.charAt(0).toUpperCase()}
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className={`font-medium truncate ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
              {member.name}
            </p>
            {member.role && (
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {member.role}
              </p>
            )}
          </div>

          {/* Jersey Number */}
          {member.jerseyNumber && (
            <span
              className={`
                px-2 py-0.5 rounded font-bold
                ${isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'}
              `}
            >
              #{member.jerseyNumber}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
