"use client";

import { useState, useEffect } from "react";
import type { CreateTeamDto, TournamentTeam } from "@/types/tournament.types";
import { Modal } from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import { teamApi } from "@/lib/tournament-api";
import { Users, Trash2 } from "lucide-react";

interface TeamFormModalProps {
  tournamentId: string;
  team?: TournamentTeam | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function TeamFormModal({ tournamentId, team, open, onClose, onSuccess }: TeamFormModalProps) {
  const [name, setName] = useState("");
  const [seed, setSeed] = useState<string>("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(team?.name || "");
      setSeed(team?.seed?.toString() || "");
      setLogoUrl(team?.logoUrl || "");
      setLogoFile(null);
      setError(null);
    }
  }, [open, team]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Team name is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    let payload: CreateTeamDto | FormData;

    if (logoFile) {
      const fd = new FormData();
      fd.append("name", name.trim());
      if (seed) fd.append("seed", seed);
      fd.append("logo", logoFile);
      payload = fd as any;
    } else {
      payload = {
        name: name.trim(),
        seed: seed ? parseInt(seed, 10) : undefined,
        logoUrl: logoUrl.trim() || undefined,
      };
    }

    try {
      if (team) {
        await teamApi.update(team.id, payload);
      } else {
        await teamApi.create(tournamentId, payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save team");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!team || !confirm("Delete this team?")) return;
    setIsSubmitting(true);
    try {
      await teamApi.delete(team.id);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to delete team");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={team ? "Edit Team" : "Add Team"}
      description={team ? `Update ${team.name}` : "Register a new team for this tournament"}
      className="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-brand-danger/10 text-brand-danger border border-brand-danger/20 text-sm">
            {error}
          </div>
        )}

        <div>
          <Label htmlFor="team-name">Team Name *</Label>
          <Input
            id="team-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Red Dragons"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="team-seed">Seed</Label>
            <Input
              id="team-seed"
              type="number"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              placeholder="1"
              min={1}
            />
          </div>
          <div>
            <Label htmlFor="team-logo">Logo (URL or File)</Label>
            <div className="space-y-2">
              <Input
                id="team-logo"
                value={logoUrl}
                onChange={(e) => {
                  setLogoUrl(e.target.value);
                  setLogoFile(null);
                }}
                placeholder="https://..."
                disabled={!!logoFile}
              />
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setLogoFile(file);
                    setLogoUrl("");
                  }
                }}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          {team && (
            <Button type="button" variant="danger" onClick={handleDelete} loading={isSubmitting}>
              <Trash2 size={16} /> Delete
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            <Users size={16} /> {team ? "Save" : "Add Team"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
