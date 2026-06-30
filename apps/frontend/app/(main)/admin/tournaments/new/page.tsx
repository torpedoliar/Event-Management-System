"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CreateTournamentDto } from '@/types/tournament.types';
import { tournamentApi } from '@/lib/tournament-api';
import { TournamentForm } from '@/components/tournament/TournamentForm';
import { ChevronLeft, Trophy } from 'lucide-react';
import Link from 'next/link';

export default function NewTournamentPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: Partial<CreateTournamentDto>) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const newTournament = await tournamentApi.create(data as CreateTournamentDto);
      router.push('/admin/tournaments/' + newTournament.id);
    } catch (err: any) {
      setError(err.message || 'Failed to create tournament');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/admin/tournaments"
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
              Create Tournament
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Set up a new tournament event
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
        <TournamentForm
          onSubmit={handleSubmit}
          onCancel={() => router.push('/admin/tournaments')}
          isLoading={isSubmitting}
        />
      </div>
    </div>
  );
}
