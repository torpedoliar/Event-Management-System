"use client";

import React, { useEffect, useState } from 'react';
import { tournamentApi } from '@/lib/tournament-api';
import type { Tournament } from '@/types/tournament.types';
import { StatusPill } from '@/components/tournament/StatusPill';
import { Trophy, Calendar, Users, ExternalLink, Search } from 'lucide-react';
import Link from 'next/link';

export default function TournamentBracketsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [filteredTournaments, setFilteredTournaments] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [eventCfg, setEventCfg] = useState<any>(null);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/config/event`)
      .then(r => r.json())
      .then(data => setEventCfg(data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const data = await tournamentApi.getAll();
        // Only show tournaments with brackets (IN_PROGRESS or COMPLETED)
        const bracketTournaments = data.filter(
          t => t.status === 'IN_PROGRESS' || t.status === 'COMPLETED'
        );
        setTournaments(bracketTournaments);
        setFilteredTournaments(bracketTournaments);
      } catch (err) {
        console.error('Failed to fetch tournaments:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  // Filter tournaments
  useEffect(() => {
    let filtered = tournaments;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.sportType?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    setFilteredTournaments(filtered);
  }, [searchQuery, statusFilter, tournaments]);

  if (isLoading || !eventCfg) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-primary border-t-transparent mx-auto mb-4" />
          <p className="text-brand-text">Loading...</p>
        </div>
      </div>
    );
  }

  if (!eventCfg.enableTournament) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="text-center p-8 bg-brand-surface rounded-2xl border border-brand-border">
          <Trophy className="w-16 h-16 text-brand-textDim mx-auto mb-4" />
          <h2 className="text-2xl text-brand-text font-bold mb-2">Tournaments Not Enabled</h2>
          <p className="text-brand-textMuted">Tournament feature is currently disabled for this event.</p>
          <Link href="/" className="inline-block mt-6 px-6 py-2.5 bg-brand-primary hover:bg-brand-primaryHover text-brand-bg rounded-xl transition-colors">
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg">
      {/* Header */}
      <div className="bg-brand-bg/80 backdrop-blur-sm border-b border-brand-border">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-8 h-8 text-brand-warning" />
            <h1 className="text-3xl font-bold text-brand-text">Tournament Brackets</h1>
          </div>
          <p className="text-brand-textMuted">
            View live brackets and match results for ongoing and completed tournaments
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-textMuted" />
            <input
              id="search-tournaments"
              type="text"
              aria-label="Search tournaments"
              placeholder="Search tournaments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-brand-bgSubtle border border-brand-border rounded-xl text-brand-text placeholder:text-brand-textDim focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary/60 transition-all duration-fast"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 bg-brand-bgSubtle border border-brand-border rounded-xl text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary/60 transition-all duration-fast cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>

        {/* Tournament Grid */}
        {filteredTournaments.length === 0 ? (
          <div className="text-center py-16">
            <Trophy className="w-16 h-16 text-brand-textDim mx-auto mb-4" />
            <h2 className="text-xl text-brand-textMuted mb-2">No tournaments found</h2>
            <p className="text-brand-textDim">
              {tournaments.length === 0
                ? 'No tournaments with brackets available yet.'
                : 'Try adjusting your search or filter.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredTournaments.map((tournament) => (
              <Link
                key={tournament.id}
                href={'/tournament/bracket/' + tournament.id}
                className="group bg-brand-surface border border-brand-border rounded-xl p-6 hover:border-brand-primary/50 hover:bg-brand-surfaceMuted/50 transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-brand-warning/10 rounded-lg">
                    <Trophy className="w-6 h-6 text-brand-warning" />
                  </div>
                  <StatusPill status={tournament.status} />
                </div>

                <h3 className="text-lg font-semibold text-brand-text mb-2 group-hover:text-brand-primary transition-colors">
                  {tournament.name}
                </h3>

                <p className="text-brand-textMuted text-sm capitalize mb-4">
                  {tournament.sportType?.toLowerCase().replace('_', ' ')} •{' '}
                  {tournament.formatType?.toLowerCase().replace('_', ' ')}
                </p>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4 text-brand-textDim">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {tournament.teams?.length || 0}
                    </span>
                    {tournament.startDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(tournament.startDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <ExternalLink className="w-4 h-4 text-brand-textDim group-hover:text-brand-primary transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
