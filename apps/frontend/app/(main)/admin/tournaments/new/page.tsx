"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import type { CreateTournamentDto } from "@/types/tournament.types";
import { tournamentApi } from "@/lib/tournament-api";
import { TournamentForm } from "@/components/tournament/TournamentForm";
import { ChevronLeft, Trophy } from "lucide-react";
import Link from "next/link";

export default function NewTournamentPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: Partial<CreateTournamentDto>) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const newTournament = await tournamentApi.create(data as CreateTournamentDto);
      router.push("/admin/tournaments/" + newTournament.id);
    } catch (err: any) {
      setError(err.message || "Failed to create tournament");
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/admin/tournaments"
          className="p-2 hover:bg-white/[0.04] text-brand-textMuted hover:text-brand-text transition-colors rounded-lg"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-brand-warning/10 rounded-xl">
            <Trophy className="w-6 h-6 text-brand-warning" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-brand-text mb-1">Create Tournament</h1>
            <p className="text-brand-textMuted font-medium">Set up a new tournament event</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-brand-danger/10 text-brand-danger font-medium border border-brand-danger/20 rounded-xl shadow-sm">
          {error}
        </div>
      )}

      <div className="bg-brand-surface rounded-2xl border border-brand-border p-8 shadow-sm">
        <TournamentForm
          onSubmit={handleSubmit}
          onCancel={() => router.push("/admin/tournaments")}
          isLoading={isSubmitting}
        />
      </div>
    </div>
  );
}
