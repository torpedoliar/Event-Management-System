"use client";

import React, { useState } from "react";
import type { Match, UpdateScoreDto, ScoringMode } from "@/types/tournament.types";
import { ScoringMode as ScoringModeEnum } from "@/types/tournament.types";
import { TeamLogo } from "../team/TeamLogo";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { Minus, Plus } from "lucide-react";

interface ScoreInputProps {
  match: Match;
  scoringMode?: ScoringMode;
  onSubmit: (score: UpdateScoreDto) => Promise<void>;
  onCancel?: () => void;
  maxSets?: number;
}

export function ScoreInput({
  match,
  scoringMode = ScoringModeEnum.SIMPLE,
  onSubmit,
  onCancel,
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
      setError(err.message || "Failed to submit score");
    } finally {
      setIsSubmitting(false);
    }
  };

  const increment = (team: "A" | "B") => {
    if (team === "A") setScoreA((s) => s + 1);
    else setScoreB((s) => s + 1);
  };

  const decrement = (team: "A" | "B") => {
    if (team === "A") setScoreA((s) => Math.max(0, s - 1));
    else setScoreB((s) => Math.max(0, s - 1));
  };

  return (
    <div className="rounded-xl border border-brand-border bg-brand-surface p-6 shadow-sm">
      <h3 className="font-semibold text-brand-text mb-6">Score Input - Match #{match.matchNumber}</h3>

      <form onSubmit={handleSubmit}>
        {scoringMode !== ScoringModeEnum.SETS && (
          <div className="flex items-center justify-center gap-8 mb-8">
            <div className="text-center">
              <TeamLogo
                src={match.teamA?.logoUrl}
                name={match.teamA?.name || "Team A"}
                size="md"
                className="mx-auto mb-3"
              />
              <p className="font-semibold text-brand-text mb-3">{match.teamA?.name || "Team A"}</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => decrement("A")}
                  aria-label={`Kurangi skor ${match.teamA?.name || "Team A"}`}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-brand-surface border border-brand-border text-brand-text hover:bg-white/[0.04] transition-colors"
                >
                  <Minus size={16} />
                </button>
                <Input
                  type="number"
                  value={scoreA}
                  onChange={(e) => setScoreA(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-20 h-12 text-center text-2xl font-bold rounded-lg !px-0"
                  min={0}
                  aria-label={`Skor ${match.teamA?.name || "Team A"}`}
                />
                <button
                  type="button"
                  onClick={() => increment("A")}
                  aria-label={`Tambah skor ${match.teamA?.name || "Team A"}`}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-brand-surface border border-brand-border text-brand-text hover:bg-white/[0.04] transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            <span className="text-2xl font-bold text-brand-textMuted mx-4 mt-8">vs</span>

            <div className="text-center">
              <TeamLogo
                src={match.teamB?.logoUrl}
                name={match.teamB?.name || "Team B"}
                size="md"
                className="mx-auto mb-3"
              />
              <p className="font-semibold text-brand-text mb-3">{match.teamB?.name || "Team B"}</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => decrement("B")}
                  aria-label={`Kurangi skor ${match.teamB?.name || "Team B"}`}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-brand-surface border border-brand-border text-brand-text hover:bg-white/[0.04] transition-colors"
                >
                  <Minus size={16} />
                </button>
                <Input
                  type="number"
                  value={scoreB}
                  onChange={(e) => setScoreB(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-20 h-12 text-center text-2xl font-bold rounded-lg !px-0"
                  min={0}
                  aria-label={`Skor ${match.teamB?.name || "Team B"}`}
                />
                <button
                  type="button"
                  onClick={() => increment("B")}
                  aria-label={`Tambah skor ${match.teamB?.name || "Team B"}`}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-brand-surface border border-brand-border text-brand-text hover:bg-white/[0.04] transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {scoringMode === ScoringModeEnum.SETS && (
          <div className="mb-8">
            <div className="flex items-center justify-center gap-8 mb-6">
              <div className="text-center">
                <p className="font-semibold text-brand-text mb-3">{match.teamA?.name}</p>
                <div className="flex gap-2">
                  {Array.from({ length: maxSets }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSetsA(Math.max(0, Math.min(i + 1, setsA === i + 1 ? i : i + 1)))}
                      className={cn(
                        "w-12 h-12 rounded-lg font-bold transition-colors border",
                        setsA > i
                          ? "bg-brand-success text-brand-bg border-brand-success"
                          : "bg-brand-surface text-brand-textMuted border-brand-border hover:bg-white/[0.04]"
                      )}
                    >
                      {i < setsA ? "✓" : i + 1}
                    </button>
                  ))}
                </div>
              </div>

              <span className="text-sm font-medium text-brand-textMuted mt-8">Sets</span>

              <div className="text-center">
                <p className="font-semibold text-brand-text mb-3">{match.teamB?.name}</p>
                <div className="flex gap-2">
                  {Array.from({ length: maxSets }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSetsB(Math.max(0, Math.min(i + 1, setsB === i + 1 ? i : i + 1)))}
                      className={cn(
                        "w-12 h-12 rounded-lg font-bold transition-colors border",
                        setsB > i
                          ? "bg-brand-success text-brand-bg border-brand-success"
                          : "bg-brand-surface text-brand-textMuted border-brand-border hover:bg-white/[0.04]"
                      )}
                    >
                      {i < setsB ? "✓" : i + 1}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="text-center">
              <label className="text-sm font-medium block mb-3 text-brand-textMuted">Final Score</label>
              <div className="flex items-center justify-center gap-4">
                <Input
                  type="number"
                  value={scoreA}
                  onChange={(e) => setScoreA(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-24 h-12 text-center text-xl font-bold !px-0"
                  placeholder="0"
                />
                <span className="font-bold text-brand-textMuted">-</span>
                <Input
                  type="number"
                  value={scoreB}
                  onChange={(e) => setScoreB(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-24 h-12 text-center text-xl font-bold !px-0"
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 mb-6 rounded-xl bg-brand-danger/10 text-brand-danger border border-brand-danger/20 text-sm text-center">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          {onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel} className="flex-1" disabled={isSubmitting}>
              Cancel
            </Button>
          )}
          <Button type="submit" className="flex-1" loading={isSubmitting}>
            Save Score
          </Button>
        </div>
      </form>
    </div>
  );
}

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
