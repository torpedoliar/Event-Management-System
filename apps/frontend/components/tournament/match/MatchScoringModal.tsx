"use client";

import { useState } from "react";
import type { Match, UpdateScoreDto, TournamentTeam } from "@/types/tournament.types";
import { MatchStatus, ScoringMode } from "@/types/tournament.types";
import { Modal } from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { ScoreInput } from "./ScoreInput";
import { StatusPill } from "../StatusPill";
import { Play, XCircle, Flag, Swords, Square } from "lucide-react";

interface MatchScoringModalProps {
  match: Match | null;
  scoringMode: ScoringMode;
  maxSets?: number;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function MatchScoringModal({
  match,
  scoringMode,
  maxSets = 3,
  open,
  onClose,
  onUpdate,
}: MatchScoringModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!match) return null;

  const teamOptions: { value: string; label: string }[] = [
    { value: match.teamAId || "", label: match.teamA?.name || "Team A" },
    { value: match.teamBId || "", label: match.teamB?.name || "Team B" },
  ].filter((t) => t.value);

  const handleStart = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await import("@/lib/tournament-api").then((m) => m.matchApi.start(match.id));
      onUpdate();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to start match");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScoreSubmit = async (score: UpdateScoreDto) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await import("@/lib/tournament-api").then((m) => m.matchApi.updateScore(match.id, score));
      onUpdate();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to update score");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinish = async () => {
    if (!confirm("Finish this match with current score? The winner will be determined automatically.")) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await import("@/lib/tournament-api").then((m) => m.matchApi.finish(match.id));
      onUpdate();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to finish match");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Cancel this match?")) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await import("@/lib/tournament-api").then((m) => m.matchApi.cancel(match.id));
      onUpdate();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to cancel match");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWalkover = async (winnerId: string) => {
    if (!confirm(`Award walkover to ${teamOptions.find((t) => t.value === winnerId)?.label}?`)) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await import("@/lib/tournament-api").then((m) => m.matchApi.awardWalkover(match.id, winnerId));
      onUpdate();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to award walkover");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canStart = match.status === MatchStatus.SCHEDULED;
  const canScore = match.status === MatchStatus.ONGOING;
  const canCancel = match.status === MatchStatus.SCHEDULED || match.status === MatchStatus.ONGOING;
  const canWalkover = match.status === MatchStatus.SCHEDULED;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Match #${match.matchNumber}`}
      description={
        <div className="flex items-center gap-2">
          <StatusPill status={match.status} size="sm" />
          {match.court && <span className="text-brand-textMuted text-sm">· Court {match.court}</span>}
        </div>
      }
      className="max-w-xl"
    >
      <div className="space-y-6">
        {error && (
          <div className="p-3 rounded-xl bg-brand-danger/10 text-brand-danger border border-brand-danger/20 text-sm">
            {error}
          </div>
        )}

        {/* Action bar */}
        <div className="flex flex-wrap gap-2">
          {canStart && (
            <Button onClick={handleStart} loading={isSubmitting}>
              <Play size={16} /> Start Match
            </Button>
          )}
          {canScore && (
            <Button variant="success" onClick={handleFinish} loading={isSubmitting}>
              <Square size={16} /> Finish Match
            </Button>
          )}
          {canCancel && (
            <Button variant="danger" onClick={handleCancel} loading={isSubmitting}>
              <XCircle size={16} /> Cancel
            </Button>
          )}
          {canWalkover && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-brand-textMuted">Walkover:</span>
              {teamOptions.map((team) => (
                <Button
                  key={team.value}
                  variant="secondary"
                  size="sm"
                  onClick={() => handleWalkover(team.value)}
                  loading={isSubmitting}
                >
                  <Flag size={14} /> {team.label}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Score input for ongoing matches */}
        {canScore && (
          <ScoreInput
            match={match}
            scoringMode={scoringMode}
            maxSets={maxSets}
            onSubmit={handleScoreSubmit}
            onCancel={onClose}
          />
        )}

        {!canScore && !canStart && (
          <div className="text-center py-8 text-brand-textMuted text-sm">
            This match is {match.status.toLowerCase().replace("_", " ")}.
          </div>
        )}
      </div>
    </Modal>
  );
}
