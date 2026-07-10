"use client";

import { useState, useEffect } from "react";
import type { Match, TournamentTeam, UpdateScoreDto } from "@/types/tournament.types";
import { MatchStatus, ScoringMode } from "@/types/tournament.types";
import { Modal } from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { ScoreInput } from "./ScoreInput";
import { StatusPill } from "../StatusPill";
import { Play, XCircle, Flag, Swords, Square, RotateCcw, Trash2, Save } from "lucide-react";
import { toLocalDatetimeString, toUTCDateString } from "@/lib/utils";

interface MatchScoringModalProps {
  match: Match | null;
  scoringMode: ScoringMode;
  maxSets?: number;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
  teams?: TournamentTeam[];
}

export function MatchScoringModal({
  match,
  scoringMode,
  maxSets = 3,
  open,
  onClose,
  onUpdate,
  teams,
}: MatchScoringModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scheduledAt, setScheduledAt] = useState('');
  const [court, setCourt] = useState('');
  const [savingDetails, setSavingDetails] = useState(false);
  const [selectedTeamA, setSelectedTeamA] = useState('');
  const [selectedTeamB, setSelectedTeamB] = useState('');
  const [reassigning, setReassigning] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Initialize state from match when modal opens
  useEffect(() => {
    if (match) {
      setScheduledAt(match.scheduledAt ? toLocalDatetimeString(match.scheduledAt) : '');
      setCourt(match.court || '');
      setSelectedTeamA(match.teamAId || '');
      setSelectedTeamB(match.teamBId || '');
    }
  }, [match]);

  const handleSaveDetails = async () => {
    if (!match) return;
    setSavingDetails(true);
    setError(null);
    try {
      const { matchApi } = await import("@/lib/tournament-api");
      await matchApi.update(match.id, {
        scheduledAt: scheduledAt ? toUTCDateString(scheduledAt) : null,
        court: court || null,
      });
      onUpdate();
    } catch (err: any) {
      setError(err.message || "Failed to save match details");
    } finally {
      setSavingDetails(false);
    }
  };

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

  const handleReassign = async () => {
    if (!match || !teams || teams.length === 0) return;
    setReassigning(true);
    setError(null);
    try {
      const { matchApi } = await import("@/lib/tournament-api");
      await matchApi.update(match.id, {
        teamAId: selectedTeamA || null,
        teamBId: selectedTeamB || null,
      });
      onUpdate();
    } catch (err: any) {
      setError(err.message || "Failed to reassign teams");
    } finally {
      setReassigning(false);
    }
  };

  const handleReset = async () => {
    if (!match) return;
    if (!confirm("Reset this match to SCHEDULED? Scores, winner, and advancement will be undone.")) return;
    setResetting(true);
    setError(null);
    try {
      const { matchApi } = await import("@/lib/tournament-api");
      await matchApi.reset(match.id);
      onUpdate();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to reset match");
    } finally {
      setResetting(false);
    }
  };

  const handleDelete = async () => {
    if (!match) return;
    if (!confirm("Delete this match permanently? This cannot be undone.")) return;
    setDeleting(true);
    setError(null);
    try {
      const { matchApi } = await import("@/lib/tournament-api");
      await matchApi.delete(match.id);
      onUpdate();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to delete match");
    } finally {
      setDeleting(false);
    }
  };

  const canStart = match.status === MatchStatus.SCHEDULED;
  const canScore = match.status === MatchStatus.ONGOING;
  const canCancel = match.status === MatchStatus.SCHEDULED || match.status === MatchStatus.ONGOING;
  const canWalkover = match.status === MatchStatus.SCHEDULED;
  const canReset = match.status === MatchStatus.COMPLETED || match.status === MatchStatus.WALKOVER;
  const canReassign = match.status === MatchStatus.SCHEDULED && teams && teams.length > 0;

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

        {/* Match Details — editable when SCHEDULED */}
        {match.status === MatchStatus.SCHEDULED && (
          <div className="space-y-4 rounded-xl border border-brand-border bg-brand-surface p-4">
            <h4 className="text-sm font-semibold text-brand-text">Match Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-brand-textMuted mb-1">Jadwal Pertandingan</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-lg text-brand-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
              <div>
                <label className="block text-xs text-brand-textMuted mb-1">Court / Lapangan</label>
                <input
                  type="text"
                  value={court}
                  onChange={(e) => setCourt(e.target.value)}
                  placeholder="Contoh: Court A"
                  className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-lg text-brand-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
            </div>
            <Button size="sm" onClick={handleSaveDetails} loading={savingDetails}>
              Save Details
            </Button>
          </div>
        )}

        {/* Team Reassign — editable when SCHEDULED */}
        {canReassign && (
          <div className="space-y-4 rounded-xl border border-brand-border bg-brand-surface p-4">
            <h4 className="text-sm font-semibold text-brand-text">Reassign Teams</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-brand-textMuted mb-1">Team A</label>
                <select
                  value={selectedTeamA}
                  onChange={(e) => setSelectedTeamA(e.target.value)}
                  className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-lg text-brand-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                >
                  <option value="">Kosong</option>
                  {teams!.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-brand-textMuted mb-1">Team B</label>
                <select
                  value={selectedTeamB}
                  onChange={(e) => setSelectedTeamB(e.target.value)}
                  className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-lg text-brand-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                >
                  <option value="">Kosong</option>
                  {teams!
                    .filter((t) => t.id !== selectedTeamA)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <Button size="sm" variant="secondary" onClick={handleReassign} loading={reassigning}>
              <Save size={14} className="mr-1" /> Reassign
            </Button>
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
          {canReset && (
            <Button variant="secondary" onClick={handleReset} loading={resetting}>
              <RotateCcw size={16} /> Reset Match
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

        {/* Danger Zone */}
        <div className="border-t border-brand-border pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-brand-text">Danger Zone</p>
              <p className="text-xs text-brand-textMuted">Irreversible actions</p>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDelete}
              loading={deleting}
            >
              <Trash2 size={14} className="mr-1" /> Delete Match
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
