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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4" />
          <p className="text-white">Loading tournaments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-700">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-8 h-8 text-yellow-500" />
            <h1 className="text-3xl font-bold text-white">Tournament Brackets</h1>
          </div>
          <p className="text-slate-400">
            View live brackets and match results for ongoing and completed tournaments
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search tournaments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>

        {/* Tournament Grid */}
        {filteredTournaments.length === 0 ? (
          <div className="text-center py-16">
            <Trophy className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h2 className="text-xl text-slate-400 mb-2">No tournaments found</h2>
            <p className="text-slate-500">
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
                className="group bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-blue-500/50 hover:bg-slate-800/80 transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-yellow-500/10 rounded-lg">
                    <Trophy className="w-6 h-6 text-yellow-500" />
                  </div>
                  <StatusPill status={tournament.status} />
                </div>

                <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">
                  {tournament.name}
                </h3>

                <p className="text-slate-400 text-sm capitalize mb-4">
                  {tournament.sportType?.toLowerCase().replace('_', ' ')} •{' '}
                  {tournament.formatType?.toLowerCase().replace('_', ' ')}
                </p>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4 text-slate-500">
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
                  <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
