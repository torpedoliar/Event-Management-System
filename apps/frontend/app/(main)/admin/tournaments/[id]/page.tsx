"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Tournament, TournamentTeam, Match } from '@/types/tournament.types';
import { tournamentApi, matchApi, bracketApi } from '@/lib/tournament-api';
import { TournamentTabs, TabPanel } from '@/components/tournament/TournamentTabs';
import { StatusPill } from '@/components/tournament/StatusPill';
import { TeamCard } from '@/components/tournament/team';
import { MatchCard } from '@/components/tournament/match';
import { BracketView } from '@/components/tournament/bracket';
import { useTournamentSSE } from '@/hooks/useTournamentSSE';
import {
  Trophy, Users, Calendar, MapPin, DollarSign, Clock,
  ChevronLeft, Edit, Play, Plus, BarChart3, Settings
} from 'lucide-react';

type TabId = 'overview' | 'teams' | 'matches' | 'brackets';

export default function TournamentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tournamentId = params.id as string;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // SSE subscription
  const sse = useTournamentSSE(tournamentId);

  useEffect(() => {
    const unsubTournament = sse.onTournamentUpdated((event) => {
      setTournament(event.data as Tournament);
    });

    return () => {
      unsubTournament();
    };
  }, [sse]);

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await tournamentApi.getById(tournamentId);
        setTournament(data);
        setTeams(data.teams || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load tournament');
      } finally {
        setIsLoading(false);
      }
    }

    if (tournamentId) {
      fetchData();
    }
  }, [tournamentId]);

  // Fetch matches when matches tab is active
  useEffect(() => {
    if (activeTab === 'matches' && tournamentId) {
      matchApi.getByTournament(tournamentId).then(setMatches).catch(console.error);
    }
  }, [activeTab, tournamentId]);

  const handleGenerateBracket = async () => {
    if (!confirm('Generate bracket now? This will assign match positions for all registered teams.')) {
      return;
    }

    try {
      await bracketApi.generate(tournamentId);
      // Refresh tournament data
      const data = await tournamentApi.getById(tournamentId);
      setTournament(data);
      setActiveTab('brackets');
    } catch (err: any) {
      alert(err.message || 'Failed to generate bracket');
    }
  };

  const handleStartTournament = async () => {
    if (!confirm('Start tournament? This will set the status to In Progress.')) {
      return;
    }

    try {
      const updated = await tournamentApi.update(tournamentId, { status: 'IN_PROGRESS' as any });
      setTournament(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to start tournament');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-4 rounded-lg">
          {error || 'Tournament not found'}
        </div>
        <Link href="/admin/tournaments" className="mt-4 text-blue-600 hover:underline">
          Back to Tournaments
        </Link>
      </div>
    );
  }

  const liveMatches = matches.filter((m) => m.status === 'ONGOING');
  const upcomingMatches = matches.filter((m) => m.status === 'SCHEDULED');
  const completedMatches = matches.filter((m) => m.status === 'COMPLETED');

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-4">
          <Link
            href="/admin/tournaments"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl">
              <Trophy className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {tournament.name}
                </h1>
                <StatusPill status={tournament.status} />
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                <span className="capitalize">
                  {tournament.sportType?.toLowerCase().replace('_', ' ')}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {teams.length} teams
                </span>
                {tournament.startDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(tournament.startDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {tournament.status === 'DRAFT' && teams.length >= 2 && (
            <button
              onClick={handleGenerateBracket}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <BarChart3 className="w-4 h-4" />
              Generate Bracket
            </button>
          )}
          {tournament.status === 'DRAFT' && (
            <button
              onClick={handleStartTournament}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Play className="w-4 h-4" />
              Start Tournament
            </button>
          )}
          <Link
            href={'/admin/tournaments/' + tournamentId + '/edit'}
            className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <Edit className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <TournamentTabs
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as TabId)}
        tournamentStatus={tournament.status}
        isAdmin={true}
      />

      {/* Tab Content */}
      <div className="mt-6">
        {/* Overview Tab */}
        <TabPanel id="overview" activeTab={activeTab}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Stats Cards */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {teams.length}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Registered Teams</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Play className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {liveMatches.length}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Live Matches</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {upcomingMatches.length}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Upcoming Matches</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href={'/admin/tournaments/' + tournamentId + '/matches'}
              className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
            >
              <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400 mb-2" />
              <p className="font-medium text-gray-900 dark:text-white">Manage Matches</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">View and edit match scores</p>
            </Link>
            <Link
              href={'/tournament/bracket/' + tournamentId}
              target="_blank"
              className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-500 transition-colors"
            >
              <Trophy className="w-6 h-6 text-purple-600 dark:text-purple-400 mb-2" />
              <p className="font-medium text-gray-900 dark:text-white">Public Bracket</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">View bracket display</p>
            </Link>
            <Link
              href={'/admin/tournaments/' + tournamentId + '/teams'}
              className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-500 transition-colors"
            >
              <Users className="w-6 h-6 text-green-600 dark:text-green-400 mb-2" />
              <p className="font-medium text-gray-900 dark:text-white">Team Management</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Add and edit teams</p>
            </Link>
          </div>
        </TabPanel>

        {/* Teams Tab */}
        <TabPanel id="teams" activeTab={activeTab}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Registered Teams ({teams.length})
            </h2>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" />
              Add Team
            </button>
          </div>

          {teams.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No teams registered yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Add teams or import from CSV to get started
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.map((team) => (
                <TeamCard key={team.id} team={team} showDetails />
              ))}
            </div>
          )}
        </TabPanel>

        {/* Matches Tab */}
        <TabPanel id="matches" activeTab={activeTab}>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Matches
          </h2>

          {liveMatches.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">
                Live Now ({liveMatches.length})
              </h3>
              <div className="space-y-2">
                {liveMatches.map((match) => (
                  <MatchCard key={match.id} match={match} isLive />
                ))}
              </div>
            </div>
          )}

          {upcomingMatches.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                Upcoming ({upcomingMatches.length})
              </h3>
              <div className="space-y-2">
                {upcomingMatches.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            </div>
          )}

          {completedMatches.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">
                Completed ({completedMatches.length})
              </h3>
              <div className="space-y-2">
                {completedMatches.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            </div>
          )}
        </TabPanel>

        {/* Brackets Tab */}
        <TabPanel id="brackets" activeTab={activeTab}>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Tournament Bracket
          </h2>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 overflow-x-auto">
            {tournament.brackets && tournament.brackets.length > 0 ? (
              <BracketView
                bracket={tournament.brackets[0] as any}
                isDarkMode={false}
              />
            ) : (
              <div className="text-center py-12">
                <BarChart3 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  Bracket not generated yet
                </p>
                {tournament.status === 'DRAFT' && teams.length >= 2 && (
                  <button
                    onClick={handleGenerateBracket}
                    className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    Generate Bracket
                  </button>
                )}
              </div>
            )}
          </div>
        </TabPanel>
      </div>
    </div>
  );
}
