"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Tournament, CreateTournamentDto } from '@/types/tournament.types';
import { tournamentApi } from '@/lib/tournament-api';
import { TournamentForm } from '@/components/tournament/TournamentForm';
import { ChevronLeft, Trophy } from 'lucide-react';
import Card from '@/components/ui/Card';

export default function EditTournamentPage() {
  const params = useParams();
  const router = useRouter();
  const tournamentId = params.id as string;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch tournament
  useEffect(() => {
    async function fetchTournament() {
      setIsLoading(true);
      try {
        const data = await tournamentApi.getById(tournamentId);
        setTournament(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load tournament');
      } finally {
        setIsLoading(false);
      }
    }

    if (tournamentId) {
      fetchTournament();
    }
  }, [tournamentId]);

  const handleSubmit = async (data: Partial<CreateTournamentDto>) => {
    setIsSubmitting(true);
    setError(null);

    try {
      await tournamentApi.update(tournamentId, data as CreateTournamentDto);
      router.push('/admin/tournaments/' + tournamentId);
    } catch (err: any) {
      setError(err.message || 'Failed to update tournament');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-brand-primary border-t-transparent" />
      </div>
    );
  }

  if (error && !tournament) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-brand-danger/10 text-brand-danger p-4 rounded-lg border border-brand-danger/20">
            {error}
          </div>
          <Link href="/admin/tournaments" className="mt-4 text-brand-primary hover:underline block">
            Back to Tournaments
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href={'/admin/tournaments/' + tournamentId as any}
            className="p-2 hover:bg-white/[0.04] rounded-lg text-brand-textMuted hover:text-brand-primary transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-accent/10 rounded-lg">
              <Trophy className="w-6 h-6 text-brand-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-brand-text">
                Edit Tournament
              </h1>
              <p className="text-sm text-brand-textMuted">
                {tournament?.name || 'Loading...'}
              </p>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-brand-danger/10 text-brand-danger rounded-lg border border-brand-danger/20">
            {error}
          </div>
        )}

        {/* Form */}
        <Card>
          {tournament && (
            <TournamentForm
              initialData={tournament}
              onSubmit={handleSubmit}
              onCancel={() => router.push('/admin/tournaments/' + tournamentId)}
              isLoading={isSubmitting}
            />
          )}
        </Card>
      </div>
    </div>
  );
}
