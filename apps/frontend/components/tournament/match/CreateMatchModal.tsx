"use client";

import { useState } from "react";
import type { TournamentTeam, BracketRound } from "@/types/tournament.types";
import { Modal } from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Plus } from "lucide-react";

interface CreateMatchModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (data: {
    teamAId?: string;
    teamBId?: string;
    roundId?: string;
    court?: string;
    scheduledAt?: string;
  }) => Promise<void>;
  teams: TournamentTeam[];
  rounds?: BracketRound[];
}

export function CreateMatchModal({
  open,
  onClose,
  onCreate,
  teams,
  rounds,
}: CreateMatchModalProps) {
  const [teamAId, setTeamAId] = useState("");
  const [teamBId, setTeamBId] = useState("");
  const [roundId, setRoundId] = useState("");
  const [court, setCourt] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await onCreate({
        teamAId: teamAId || undefined,
        teamBId: teamBId || undefined,
        roundId: roundId || undefined,
        court: court || undefined,
        scheduledAt: scheduledAt || undefined,
      });
      // Reset form
      setTeamAId("");
      setTeamBId("");
      setRoundId("");
      setCourt("");
      setScheduledAt("");
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create match");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Buat Match Baru">
      <div className="space-y-4">
        {error && (
          <div className="text-sm text-brand-danger bg-brand-danger/10 p-3 rounded-lg border border-brand-danger/20">
            {error}
          </div>
        )}

        {/* Team A */}
        <div>
          <label className="block text-xs text-brand-textMuted mb-1">Team A</label>
          <select
            value={teamAId}
            onChange={(e) => setTeamAId(e.target.value)}
            className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-lg text-brand-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
          >
            <option value="">Pilih Team A (opsional)</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Team B */}
        <div>
          <label className="block text-xs text-brand-textMuted mb-1">Team B</label>
          <select
            value={teamBId}
            onChange={(e) => setTeamBId(e.target.value)}
            className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-lg text-brand-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
          >
            <option value="">Pilih Team B (opsional)</option>
            {teams
              .filter((t) => t.id !== teamAId)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
          </select>
        </div>

        {/* Round */}
        {rounds && rounds.length > 0 && (
          <div>
            <label className="block text-xs text-brand-textMuted mb-1">Round</label>
            <select
              value={roundId}
              onChange={(e) => setRoundId(e.target.value)}
              className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-lg text-brand-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
            >
              <option value="">Pilih Round (opsional)</option>
              {rounds.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Court */}
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

        {/* Scheduled At */}
        <div>
          <label className="block text-xs text-brand-textMuted mb-1">Jadwal</label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-lg text-brand-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={handleSubmit} loading={submitting}>
            <Plus size={16} className="mr-1" />
            Buat Match
          </Button>
        </div>
      </div>
    </Modal>
  );
}
