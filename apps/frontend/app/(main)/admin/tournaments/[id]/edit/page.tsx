"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Tournament, CreateTournamentDto } from '@/types/tournament.types';
import { tournamentApi } from '@/lib/tournament-api';
import { TournamentForm } from '@/components/tournament/TournamentForm';
import { ChevronLeft, Trophy } from 'lucide-react';

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
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (error && !tournament) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-4 rounded-lg">
          {error}
        </div>
        <Link href="/admin/tournaments" className="mt-4 text-blue-600 hover:underline">
          Back to Tournaments
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href={'/admin/tournaments/' + tournamentId}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
            <Trophy className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Edit Tournament
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {tournament?.name || 'Loading...'}
            </p>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg">
          {error}
        </div>
      )}

      {/* Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        {tournament && (
          <TournamentForm
            initialData={tournament}
            onSubmit={handleSubmit}
            onCancel={() => router.push('/admin/tournaments/' + tournamentId)}
            isLoading={isSubmitting}
          />
        )}
      </div>
    </div>
  );
}
