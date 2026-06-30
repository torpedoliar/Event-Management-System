"use client";

import React, { useState } from 'react';
import type { Match, UpdateScoreDto, ScoringMode } from '@/types/tournament.types';
import { ScoringMode as ScoringModeEnum } from '@/types/tournament.types';
import { TeamLogo } from '../team/TeamLogo';

interface ScoreInputProps {
  match: Match;
  scoringMode?: ScoringMode;
  onSubmit: (score: UpdateScoreDto) => Promise<void>;
  onCancel?: () => void;
  isDarkMode?: boolean;
  maxSets?: number;
}

export function ScoreInput({
  match,
  scoringMode = ScoringModeEnum.SIMPLE,
  onSubmit,
  onCancel,
  isDarkMode = false,
  maxSets = 3,
}: ScoreInputProps) {
  const [scoreA, setScoreA] = useState(match.scoreA ?? 0);
  const [scoreB, setScoreB] = useState(match.scoreB ?? 0);
  const [setsA, setSetsA] = useState(0);
  const [setsB, setSetsB] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await onSubmit({
        scoreA,
        scoreB,
        ...(scoringMode === ScoringModeEnum.SETS ? { setsA, setsB } : {}),
      });
    } catch (err: any) {
      setError(err.message || 'Failed to submit score');
    } finally {
      setIsSubmitting(false);
    }
  };

  const increment = (team: 'A' | 'B') => {
    if (team === 'A') setScoreA((s) => s + 1);
    else setScoreB((s) => s + 1);
  };

  const decrement = (team: 'A' | 'B') => {
    if (team === 'A') setScoreA((s) => Math.max(0, s - 1));
    else setScoreB((s) => Math.max(0, s - 1));
  };

  return (
    <div
      className={`
        rounded-lg border p-4
        ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
      `}
    >
      <h3 className={`font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        Score Input - Match #{match.matchNumber}
      </h3>

      <form onSubmit={handleSubmit}>
        {/* Simple/Points Mode */}
        {scoringMode !== ScoringModeEnum.SETS && (
          <div className="flex items-center justify-center gap-8 mb-6">
            {/* Team A */}
            <div className="text-center">
              <TeamLogo
                src={match.teamA?.logoUrl}
                name={match.teamA?.name || 'Team A'}
                size="md"
                className="mx-auto mb-2"
              />
              <p className={`font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {match.teamA?.name || 'Team A'}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => decrement('A')}
                  className={`
                    w-8 h-8 rounded-full font-bold
                    ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-700'}
                    hover:opacity-80
                  `}
                >
                  -
                </button>
                <input
                  type="number"
                  value={scoreA}
                  onChange={(e) => setScoreA(Math.max(0, parseInt(e.target.value) || 0))}
                  className={`
                    w-16 h-12 text-center text-2xl font-bold rounded
                    ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'}
                    border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}
                  `}
                  min={0}
                />
                <button
                  type="button"
                  onClick={() => increment('A')}
                  className={`
                    w-8 h-8 rounded-full font-bold
                    ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-700'}
                    hover:opacity-80
                  `}
                >
                  +
                </button>
              </div>
            </div>

            {/* VS */}
            <span className={`text-2xl font-bold ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              vs
            </span>

            {/* Team B */}
            <div className="text-center">
              <TeamLogo
                src={match.teamB?.logoUrl}
                name={match.teamB?.name || 'Team B'}
                size="md"
                className="mx-auto mb-2"
              />
              <p className={`font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {match.teamB?.name || 'Team B'}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => decrement('B')}
                  className={`
                    w-8 h-8 rounded-full font-bold
                    ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-700'}
                    hover:opacity-80
                  `}
                >
                  -
                </button>
                <input
                  type="number"
                  value={scoreB}
                  onChange={(e) => setScoreB(Math.max(0, parseInt(e.target.value) || 0))}
                  className={`
                    w-16 h-12 text-center text-2xl font-bold rounded
                    ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'}
                    border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}
                  `}
                  min={0}
                />
                <button
                  type="button"
                  onClick={() => increment('B')}
                  className={`
                    w-8 h-8 rounded-full font-bold
                    ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-700'}
                    hover:opacity-80
                  `}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sets Mode */}
        {scoringMode === ScoringModeEnum.SETS && (
          <div className="mb-6">
            <div className="flex items-center justify-center gap-8 mb-4">
              {/* Team A Sets */}
              <div className="text-center">
                <p className={`font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {match.teamA?.name}
                </p>
                <div className="flex gap-1">
                  {Array.from({ length: maxSets }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSetsA(Math.max(0, Math.min(i + 1, setsA === i + 1 ? i : i + 1)))}
                      className={`
                        w-10 h-10 rounded font-bold
                        ${setsA > i
                          ? 'bg-green-500 text-white'
                          : isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-700'}
                      `}
                    >
                      {i < setsA ? '✓' : i + 1}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sets Label */}
              <span className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Sets
              </span>

              {/* Team B Sets */}
              <div className="text-center">
                <p className={`font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {match.teamB?.name}
                </p>
                <div className="flex gap-1">
                  {Array.from({ length: maxSets }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSetsB(Math.max(0, Math.min(i + 1, setsB === i + 1 ? i : i + 1)))}
                      className={`
                        w-10 h-10 rounded font-bold
                        ${setsB > i
                          ? 'bg-green-500 text-white'
                          : isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-700'}
                      `}
                    >
                      {i < setsB ? '✓' : i + 1}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Final Score */}
            <div className="text-center">
              <label className={`text-sm block mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Final Score
              </label>
              <div className="flex items-center justify-center gap-4">
                <input
                  type="number"
                  value={scoreA}
                  onChange={(e) => setScoreA(Math.max(0, parseInt(e.target.value) || 0))}
                  className={`
                    w-20 h-10 text-center text-xl font-bold rounded
                    ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'}
                    border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}
                  `}
                  placeholder="0"
                />
                <span className={`font-bold ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>-</span>
                <input
                  type="number"
                  value={scoreB}
                  onChange={(e) => setScoreB(Math.max(0, parseInt(e.target.value) || 0))}
                  className={`
                    w-20 h-10 text-center text-xl font-bold rounded
                    ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'}
                    border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}
                  `}
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-red-500 text-sm text-center mb-4">{error}</div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className={`
                flex-1 py-2 rounded font-medium
                ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-700'}
                hover:opacity-80
              `}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`
              flex-1 py-2 rounded font-medium
              bg-green-600 text-white
              hover:bg-green-700
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {isSubmitting ? 'Saving...' : 'Save Score'}
          </button>
        </div>
      </form>
    </div>
  );
}
