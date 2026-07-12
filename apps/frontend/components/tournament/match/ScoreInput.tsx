"use client";

import React, { useState } from "react";
import type { Match, UpdateScoreDto, ScoringMode } from "@/types/tournament.types";
import { ScoringMode as ScoringModeEnum } from "@/types/tournament.types";
import { TeamLogo } from "../team/TeamLogo";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { Minus, Plus, Save, X } from "lucide-react";

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
  const [setsA, setSetsA] = useState(match.setsA ?? 0);
  const [setsB, setSetsB] = useState(match.setsB ?? 0);
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
    <div className="bg-[#111827] rounded-xl border border-white/10 shadow-2xl p-6">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
        <h3 className="font-mono text-xs uppercase tracking-widest text-white/50">Score Panel // Match #{match.matchNumber}</h3>
        {scoringMode === ScoringModeEnum.SETS && (
          <span className="font-mono text-xs uppercase tracking-widest text-brand-primary">Best of {maxSets}</span>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="flex items-stretch justify-center gap-4 md:gap-8 mb-8">
          
          {/* Team A Panel */}
          <div className="flex-1 bg-black/40 rounded-xl border border-white/5 p-4 flex flex-col items-center">
            <TeamLogo
              src={match.teamA?.logoUrl}
              name={match.teamA?.name || "Team A"}
              size="md"
              className="mb-4"
            />
            <p className="font-bold text-white text-center mb-6 h-12 flex items-center justify-center leading-tight">
              {match.teamA?.name || "Team A"}
            </p>
            
            {/* Score Controls */}
            <div className="bg-[#1F2937] p-2 rounded-xl flex items-center gap-3 border border-white/10 w-full justify-between">
              <button
                type="button"
                onClick={() => decrement("A")}
                className="w-12 h-12 flex items-center justify-center rounded-lg bg-white/5 text-white/70 hover:bg-white/10 hover:text-white active:scale-95 transition-all"
              >
                <Minus size={24} />
              </button>
              <div className="flex-1">
                <Input
                  type="number"
                  value={scoreA}
                  onChange={(e) => setScoreA(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full h-14 text-center text-3xl font-mono font-black tabular-nums bg-transparent border-none text-white focus:ring-0 !px-0"
                  min={0}
                />
              </div>
              <button
                type="button"
                onClick={() => increment("A")}
                className="w-12 h-12 flex items-center justify-center rounded-lg bg-brand-primary/20 text-brand-primary hover:bg-brand-primary/30 active:scale-95 transition-all"
              >
                <Plus size={24} />
              </button>
            </div>
            
            {/* Sets Control (if applicable) */}
            {scoringMode === ScoringModeEnum.SETS && (
              <div className="mt-6 w-full">
                <div className="text-[10px] uppercase font-mono text-white/40 mb-2 text-center tracking-widest">Sets Won</div>
                <div className="flex justify-center gap-2">
                  {Array.from({ length: maxSets }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSetsA(Math.max(0, Math.min(i + 1, setsA === i + 1 ? i : i + 1)))}
                      className={cn(
                        "w-full h-10 rounded-md font-mono font-bold text-sm transition-all border",
                        setsA > i
                          ? "bg-brand-primary text-white border-brand-primary shadow-[0_0_10px_rgba(var(--brand-primary),0.5)]"
                          : "bg-white/5 text-white/40 border-white/10 hover:bg-white/10"
                      )}
                    >
                      {i < setsA ? "W" : i + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* VS Divider */}
          <div className="flex flex-col items-center justify-center">
            <span className="font-mono text-white/20 text-xl font-bold uppercase">vs</span>
          </div>

          {/* Team B Panel */}
          <div className="flex-1 bg-black/40 rounded-xl border border-white/5 p-4 flex flex-col items-center">
            <TeamLogo
              src={match.teamB?.logoUrl}
              name={match.teamB?.name || "Team B"}
              size="md"
              className="mb-4"
            />
            <p className="font-bold text-white text-center mb-6 h-12 flex items-center justify-center leading-tight">
              {match.teamB?.name || "Team B"}
            </p>
            
            {/* Score Controls */}
            <div className="bg-[#1F2937] p-2 rounded-xl flex items-center gap-3 border border-white/10 w-full justify-between">
              <button
                type="button"
                onClick={() => decrement("B")}
                className="w-12 h-12 flex items-center justify-center rounded-lg bg-white/5 text-white/70 hover:bg-white/10 hover:text-white active:scale-95 transition-all"
              >
                <Minus size={24} />
              </button>
              <div className="flex-1">
                <Input
                  type="number"
                  value={scoreB}
                  onChange={(e) => setScoreB(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full h-14 text-center text-3xl font-mono font-black tabular-nums bg-transparent border-none text-white focus:ring-0 !px-0"
                  min={0}
                />
              </div>
              <button
                type="button"
                onClick={() => increment("B")}
                className="w-12 h-12 flex items-center justify-center rounded-lg bg-brand-primary/20 text-brand-primary hover:bg-brand-primary/30 active:scale-95 transition-all"
              >
                <Plus size={24} />
              </button>
            </div>
            
            {/* Sets Control (if applicable) */}
            {scoringMode === ScoringModeEnum.SETS && (
              <div className="mt-6 w-full">
                <div className="text-[10px] uppercase font-mono text-white/40 mb-2 text-center tracking-widest">Sets Won</div>
                <div className="flex justify-center gap-2">
                  {Array.from({ length: maxSets }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSetsB(Math.max(0, Math.min(i + 1, setsB === i + 1 ? i : i + 1)))}
                      className={cn(
                        "w-full h-10 rounded-md font-mono font-bold text-sm transition-all border",
                        setsB > i
                          ? "bg-brand-primary text-white border-brand-primary shadow-[0_0_10px_rgba(var(--brand-primary),0.5)]"
                          : "bg-white/5 text-white/40 border-white/10 hover:bg-white/10"
                      )}
                    >
                      {i < setsB ? "W" : i + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="p-4 mb-6 rounded-lg bg-brand-danger/10 text-brand-danger border border-brand-danger/30 text-sm font-medium flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-danger" />
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 pt-4 border-t border-white/5">
          {onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel} className="flex-1 py-6 bg-white/5 hover:bg-white/10 border-white/10 text-white" disabled={isSubmitting}>
              <X className="w-5 h-5 mr-2" />
              Cancel
            </Button>
          )}
          <Button type="submit" className="flex-[2] py-6 text-lg font-bold shadow-lg shadow-brand-primary/20" loading={isSubmitting}>
            <Save className="w-5 h-5 mr-2" />
            Update Score
          </Button>
        </div>
      </form>
    </div>
  );
}

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
