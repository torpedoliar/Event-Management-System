"use client";

import React, { useEffect, useState } from 'react';
import type { Match } from '@/types/tournament.types';
import { Clock } from 'lucide-react';

interface LiveMatchCardProps {
  match: Match;
  tournamentName?: string;
  onMatchClick?: (match: Match) => void;
}

export function LiveMatchCard({
  match,
  tournamentName,
  onMatchClick,
}: LiveMatchCardProps) {
  const [elapsed, setElapsed] = useState<string>('');

  // Calculate elapsed time
  useEffect(() => {
    if (!match.startedAt) return;

    const updateElapsed = () => {
      const start = new Date(match.startedAt as string).getTime();
      const now = Date.now();
      const diff = Math.floor((now - start) / 1000);

      const minutes = Math.floor(diff / 60);
      const seconds = diff % 60;
      setElapsed(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [match.startedAt]);

  const hasScores = match.scoreA !== null && match.scoreB !== null;
  const teamAName = match.teamA?.name || 'TBD';
  const teamBName = match.teamB?.name || 'TBD';

  return (
    <div
      className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl overflow-hidden shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-[1.02] cursor-pointer group"
      onClick={() => onMatchClick?.(match)}
    >
      {/* Live Badge */}
      <div className="absolute top-0 left-0 right-0 bg-red-600 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-2 h-2 bg-white rounded-full" />
            <div className="absolute inset-0 w-2 h-2 bg-white rounded-full animate-ping opacity-75" />
          </div>
          <span className="text-white font-bold text-sm uppercase tracking-wider">Live</span>
        </div>
        {match.court && (
          <span className="text-white/80 text-xs font-medium bg-white/20 px-2 py-0.5 rounded">
            Court {match.court}
          </span>
        )}
      </div>

      {/* Match Content */}
      <div className="pt-14 pb-6 px-4">
        {/* Tournament Name */}
        {tournamentName && (
          <p className="text-slate-500 text-xs text-center mb-4 uppercase tracking-wide">
            {tournamentName}
          </p>
        )}

        {/* Teams and Score */}
        <div className="flex items-center justify-between gap-4">
          {/* Team A */}
          <div className="flex-1 text-center">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden">
              {match.teamA?.logoUrl ? (
                <img
                  src={match.teamA.logoUrl}
                  alt={teamAName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-slate-500">
                  {teamAName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <h3 className="font-bold text-white text-lg leading-tight mb-1">
              {teamAName}
            </h3>
            {match.setsA !== null && (
              <p className="text-slate-500 text-sm">Sets: {match.setsA}</p>
            )}
          </div>

          {/* Score */}
          <div className="text-center px-4">
            {hasScores ? (
              <>
                <div className="text-5xl font-black text-white mb-1">
                  <span className={match.winnerId === match.teamAId ? 'text-green-400' : ''}>
                    {match.scoreA}
                  </span>
                  <span className="text-2xl text-slate-600 mx-1">-</span>
                  <span className={match.winnerId === match.teamBId ? 'text-green-400' : ''}>
                    {match.scoreB}
                  </span>
                </div>
                {match.setsA !== null && match.setsB !== null && (
                  <div className="text-sm text-slate-500">
                    {match.setsA} - {match.setsB}
                  </div>
                )}
              </>
            ) : (
              <div className="text-3xl font-bold text-slate-600">vs</div>
            )}
          </div>

          {/* Team B */}
          <div className="flex-1 text-center">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden">
              {match.teamB?.logoUrl ? (
                <img
                  src={match.teamB.logoUrl}
                  alt={teamBName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-slate-500">
                  {teamBName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <h3 className="font-bold text-white text-lg leading-tight mb-1">
              {teamBName}
            </h3>
            {match.setsB !== null && (
              <p className="text-slate-500 text-sm">Sets: {match.setsB}</p>
            )}
          </div>
        </div>

        {/* Timer */}
        {elapsed && (
          <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-slate-700">
            <Clock className="w-4 h-4 text-slate-500" />
            <span className="text-slate-400 font-mono text-sm">{elapsed}</span>
          </div>
        )}
      </div>

      {/* Hover Effect */}
      <div className="absolute inset-0 border-2 border-transparent group-hover:border-blue-500/50 rounded-2xl transition-colors pointer-events-none" />
    </div>
  );
}
