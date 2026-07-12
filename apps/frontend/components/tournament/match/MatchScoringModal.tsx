"use client";

import { useState, useEffect } from "react";
import type { Match, TournamentTeam, UpdateScoreDto } from "@/types/tournament.types";
import { MatchStatus, ScoringMode } from "@/types/tournament.types";
import { Modal } from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { ScoreInput } from "./ScoreInput";
import { StatusPill } from "../StatusPill";
import { Play, XCircle, Flag, Swords, Square, RotateCcw, Trash2, Save, AlertCircle } from "lucide-react";
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
                <label className="block text-xs font-mono uppercase text-brand-textMuted mb-1.5">Schedule</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full px-3 py-2 bg-brand-bg border border-white/5 rounded-lg text-brand-text text-sm focus:outline-none focus:border-brand-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-brand-textMuted mb-1.5">Court</label>
                <input
                  type="text"
                  value={court}
                  onChange={(e) => setCourt(e.target.value)}
                  placeholder="e.g. Court A"
                  className="w-full px-3 py-2 bg-brand-bg border border-white/5 rounded-lg text-brand-text text-sm focus:outline-none focus:border-brand-primary"
                />
              </div>
            </div>
            <div className="pt-2">
              <Button size="sm" onClick={handleSaveDetails} loading={savingDetails} className="w-full sm:w-auto">
                <Save size={14} className="mr-2" /> Save Details
              </Button>
            </div>
          </div>
        )}

        {/* Team Reassign — editable when SCHEDULED */}
        {canReassign && (
          <div className="space-y-4 rounded-xl border border-brand-border bg-brand-surface p-4">
            <h4 className="text-sm font-semibold text-brand-text">Reassign Teams</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono uppercase text-brand-textMuted mb-1.5">Team A</label>
                <select
                  value={selectedTeamA}
                  onChange={(e) => setSelectedTeamA(e.target.value)}
                  className="w-full px-3 py-2 bg-brand-bg border border-white/5 rounded-lg text-brand-text text-sm focus:outline-none focus:border-brand-primary"
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
                <label className="block text-xs font-mono uppercase text-brand-textMuted mb-1.5">Team B</label>
                <select
                  value={selectedTeamB}
                  onChange={(e) => setSelectedTeamB(e.target.value)}
                  className="w-full px-3 py-2 bg-brand-bg border border-white/5 rounded-lg text-brand-text text-sm focus:outline-none focus:border-brand-primary"
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
            <div className="pt-2">
              <Button size="sm" variant="secondary" onClick={handleReassign} loading={reassigning} className="w-full sm:w-auto bg-white/5">
                <Save size={14} className="mr-2" /> Reassign
              </Button>
            </div>
          </div>
        )}

        {/* Action bar (Top level controls before Score Input) */}
        <div className="flex flex-wrap gap-3">
          {canStart && (
            <Button onClick={handleStart} loading={isSubmitting} className="flex-1 py-4 text-base font-bold">
              <Play size={18} className="mr-2" /> Start Match
            </Button>
          )}
          {canScore && (
            <Button variant="success" onClick={handleFinish} loading={isSubmitting} className="flex-1 py-4 text-base font-bold bg-brand-success hover:bg-brand-success/90">
              <Square size={18} className="mr-2" /> Finish Match
            </Button>
          )}
          {canCancel && (
            <Button variant="danger" onClick={handleCancel} loading={isSubmitting} className="flex-1 py-4 text-base font-bold bg-brand-danger/20 text-brand-danger hover:bg-brand-danger/30 border border-brand-danger/30">
              <XCircle size={18} className="mr-2" /> Cancel
            </Button>
          )}
        </div>

        {canWalkover && (
          <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
            <span className="text-xs font-mono uppercase text-brand-textMuted block mb-3">Award Walkover To:</span>
            <div className="flex gap-3">
              {teamOptions.map((team) => (
                <Button
                  key={team.value}
                  variant="secondary"
                  onClick={() => handleWalkover(team.value)}
                  loading={isSubmitting}
                  className="flex-1 bg-white/5 hover:bg-brand-success/20 hover:text-brand-success hover:border-brand-success/50 transition-colors"
                >
                  <Flag size={16} className="mr-2" /> {team.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Score input for ongoing matches */}
        {canScore && (
          <div className="pt-2">
            <ScoreInput
              match={match}
              scoringMode={scoringMode}
              maxSets={maxSets}
              onSubmit={handleScoreSubmit}
              onCancel={onClose}
            />
          </div>
        )}

        {canReset && (
          <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] flex items-center justify-between">
            <span className="text-sm text-brand-textMuted">Match is finalized.</span>
            <Button variant="secondary" onClick={handleReset} loading={resetting} className="bg-white/5 hover:bg-white/10">
              <RotateCcw size={16} className="mr-2" /> Reset Match
            </Button>
          </div>
        )}

        {!canScore && !canStart && !canReset && (
          <div className="text-center py-8 text-brand-textMuted text-sm font-medium">
            This match is {match.status.toLowerCase().replace("_", " ")}.
          </div>
        )}

        {/* Danger Zone */}
        <div className="mt-8 pt-6 border-t border-brand-danger/20">
          <div className="bg-brand-danger/10 border border-brand-danger/20 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-brand-danger font-bold uppercase tracking-wider text-sm flex items-center gap-2">
                <AlertCircle size={16} /> Danger Zone
              </p>
              <p className="text-xs text-brand-danger/70 mt-1 font-medium">Permanently delete this match. Irreversible.</p>
            </div>
            <Button
              variant="danger"
              onClick={handleDelete}
              loading={deleting}
              className="w-full sm:w-auto font-bold shadow-[0_0_15px_rgba(239,68,68,0.3)]"
            >
              <Trash2 size={16} className="mr-2" /> Delete Match
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
