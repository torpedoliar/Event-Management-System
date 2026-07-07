"use client";

import { useState } from "react";
import type { TeamMember, EligibleGuest } from "@/types/tournament.types";
import { Modal } from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import { teamApi } from "@/lib/tournament-api";
import { UserPlus, Trash2 } from "lucide-react";
import { GuestPicker } from "./GuestPicker";

interface TeamMemberFormModalProps {
  tournamentId: string;
  teamId: string;
  teamName: string;
  members: TeamMember[];
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function TeamMemberFormModal({
  tournamentId,
  teamId,
  teamName,
  members,
  open,
  onClose,
  onSuccess,
}: TeamMemberFormModalProps) {
  const [name, setName] = useState("");
  const [jerseyNumber, setJerseyNumber] = useState("");
  const [role, setRole] = useState("");
  const [selectedGuest, setSelectedGuest] = useState<EligibleGuest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Member name is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await teamApi.addMember(teamId, {
        name: name.trim(),
        jerseyNumber: jerseyNumber.trim() || undefined,
        role: role.trim() || undefined,
        guestId: selectedGuest?.id,
      });
      setName("");
      setJerseyNumber("");
      setRole("");
      setSelectedGuest(null);
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to add member");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!confirm("Remove this member?")) return;
    try {
      await teamApi.removeMember(memberId);
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to remove member");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${teamName} — Members`}
      description={`${members.length} registered member(s)`}
      className="max-w-md"
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-brand-danger/10 text-brand-danger border border-brand-danger/20 text-sm">
            {error}
          </div>
        )}

        <div className="max-h-48 overflow-y-auto space-y-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 rounded-lg bg-brand-bg border border-brand-border"
            >
              <div>
                <p className="text-sm font-medium text-brand-text">{member.name}</p>
                {(member.role || member.jerseyNumber) && (
                  <p className="text-xs text-brand-textMuted">
                    {[member.role, member.jerseyNumber && `#${member.jerseyNumber}`].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
              <button
                className="p-1.5 rounded-md text-brand-danger hover:bg-brand-danger/10"
                onClick={() => handleRemove(member.id)}
                aria-label="Remove member"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="border-t border-brand-border pt-4 space-y-3">
          <p className="text-sm font-medium text-brand-text">Add Member</p>
          <div>
            <Label htmlFor="member-guest">Ambil dari Data Tamu (opsional)</Label>
            <GuestPicker
              tournamentId={tournamentId}
              value={selectedGuest}
              onChange={(g) => {
                setSelectedGuest(g);
                if (g) setName(g.name);
              }}
            />
          </div>
          <div>
            <Label htmlFor="member-name">Name *</Label>
            <Input
              id="member-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Player name"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="member-jersey">Jersey #</Label>
              <Input
                id="member-jersey"
                value={jerseyNumber}
                onChange={(e) => setJerseyNumber(e.target.value)}
                placeholder="10"
              />
            </div>
            <div>
              <Label htmlFor="member-role">Role</Label>
              <Input
                id="member-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Captain"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Done
            </Button>
            <Button type="submit" size="sm" loading={isSubmitting}>
              <UserPlus size={16} /> Add
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
