"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { Tournament, TournamentTeam, Match } from "@/types/tournament.types";
import { TournamentStatus, ScoringMode } from "@/types/tournament.types";
import { tournamentApi, matchApi, bracketApi, teamApi } from "@/lib/tournament-api";
import { TournamentTabs, TabPanel } from "@/components/tournament/TournamentTabs";
import { StatusPill } from "@/components/tournament/StatusPill";
import { TeamCard, TeamFormModal, TeamMemberFormModal } from "@/components/tournament/team";
import { MatchCard, MatchScoringModal } from "@/components/tournament/match";
import { BracketView } from "@/components/tournament/bracket";
import { useTournamentSSE } from "@/hooks/useTournamentSSE";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import {
  Trophy, Users, Calendar, MapPin, DollarSign, Clock,
  ChevronLeft, Edit, Play, Plus, BarChart3, Settings,
  CheckCircle, XCircle, Trash2
} from "lucide-react";

type TabId = "overview" | "teams" | "matches" | "brackets" | "settings";

export default function TournamentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tournamentId = params.id as string;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Match Scoring Modal state
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [matchModalOpen, setMatchModalOpen] = useState(false);

  // Team Form Modal state
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TournamentTeam | null>(null);

  // Team Member Modal state
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [memberTeam, setMemberTeam] = useState<TournamentTeam | null>(null);

  const sse = useTournamentSSE(tournamentId);

  const refreshTournament = async () => {
    if (!tournamentId) return;
    const t = await tournamentApi.getById(tournamentId);
    setTournament(t);
    setTeams(t.teams || []);
  };

  const refreshMatches = async () => {
    if (!tournamentId) return;
    const data = await matchApi.getByTournament(tournamentId);
    setMatches(data);
    await refreshTournament();
  };

  useEffect(() => {
    const unsubTournament = sse.onTournamentUpdated((event) => {
      setTournament(event.data as Tournament);
    });
    return () => unsubTournament();
  }, [sse]);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await tournamentApi.getById(tournamentId);
        setTournament(data);
        setTeams(data.teams || []);
      } catch (err: any) {
        setError(err.message || "Failed to load tournament");
      } finally {
        setIsLoading(false);
      }
    }
    if (tournamentId) fetchData();
  }, [tournamentId]);

  useEffect(() => {
    if (activeTab === "matches" && tournamentId) {
      matchApi.getByTournament(tournamentId).then(setMatches).catch(console.error);
    }
  }, [activeTab, tournamentId]);

  const handleGenerateBracket = async () => {
    if (!confirm("Generate bracket now? This will assign match positions for all registered teams.")) {
      return;
    }
    try {
      await bracketApi.generate(tournamentId);
      await refreshTournament();
      setActiveTab("brackets");
    } catch (err: any) {
      alert(err.message || "Failed to generate bracket");
    }
  };

  const handleStartTournament = async () => {
    if (!confirm("Start tournament? This will set the status to In Progress.")) {
      return;
    }
    try {
      await tournamentApi.update(tournamentId, { status: TournamentStatus.IN_PROGRESS });
      await refreshTournament();
    } catch (err: any) {
      alert(err.message || "Failed to start tournament");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-brand-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-brand-danger/10 text-brand-danger p-4 rounded-xl border border-brand-danger/20 font-medium mb-4">
          {error || "Tournament not found"}
        </div>
        <Link href="/admin/tournaments" className="text-brand-primary hover:underline font-medium">
          Back to Tournaments
        </Link>
      </div>
    );
  }

  const liveMatches = matches.filter((m) => m.status === "ONGOING");
  const upcomingMatches = matches.filter((m) => m.status === "SCHEDULED");
  const completedMatches = matches.filter((m) => m.status === "COMPLETED");

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-start gap-4">
          <Link
            href="/admin/tournaments"
            className="p-2 hover:bg-white/[0.04] text-brand-textMuted hover:text-brand-text transition-colors rounded-lg"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-4">
            <div className="p-4 bg-brand-warning/10 rounded-2xl">
              <Trophy className="w-8 h-8 text-brand-warning" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-bold text-brand-text">
                  {tournament.name}
                </h1>
                <StatusPill status={tournament.status} />
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-brand-textMuted">
                <span className="capitalize">
                  {tournament.sportType?.toLowerCase().replace("_", " ")}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  {teams.length} teams
                </span>
                {tournament.startDate && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    {new Date(tournament.startDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {tournament.status === "DRAFT" && teams.length >= 2 && (
            <Button
              onClick={handleGenerateBracket}
              className="gap-2 bg-brand-accent hover:bg-brand-accent/90 text-brand-surface"
            >
              <BarChart3 className="w-4 h-4" />
              Generate Bracket
            </Button>
          )}
          {tournament.status === "DRAFT" && (
            <Button
              onClick={handleStartTournament}
              className="gap-2 bg-brand-success hover:bg-brand-success/90 text-white"
            >
              <Play className="w-4 h-4" />
              Start Tournament
            </Button>
          )}
          <Link
            href={"/admin/tournaments/" + tournamentId + "/edit"}
            className="p-2 border border-brand-border rounded-lg hover:bg-white/[0.04] text-brand-textMuted hover:text-brand-primary transition-colors"
          >
            <Edit className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <TournamentTabs
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as TabId)}
        tournamentStatus={tournament.status}
        isAdmin={true}
      />

      <div className="mt-8">
        <TabPanel id="overview" activeTab={activeTab}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-brand-surface rounded-2xl border border-brand-border p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-brand-primary/10 rounded-xl">
                  <Users className="w-7 h-7 text-brand-primary" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-brand-text leading-none mb-1">
                    {teams.length}
                  </p>
                  <p className="text-sm font-medium text-brand-textMuted">Registered Teams</p>
                </div>
              </div>
            </div>

            <div className="bg-brand-surface rounded-2xl border border-brand-border p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-brand-success/10 rounded-xl">
                  <Play className="w-7 h-7 text-brand-success" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-brand-text leading-none mb-1">
                    {liveMatches.length}
                  </p>
                  <p className="text-sm font-medium text-brand-textMuted">Live Matches</p>
                </div>
              </div>
            </div>

            <div className="bg-brand-surface rounded-2xl border border-brand-border p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-brand-accent/10 rounded-xl">
                  <Clock className="w-7 h-7 text-brand-accent" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-brand-text leading-none mb-1">
                    {upcomingMatches.length}
                  </p>
                  <p className="text-sm font-medium text-brand-textMuted">Upcoming Matches</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <button
              onClick={() => setActiveTab("matches")}
              className="text-left group p-6 bg-brand-surface rounded-2xl border border-brand-border hover:border-brand-primary/50 hover:shadow-md transition-all"
            >
              <BarChart3 className="w-8 h-8 text-brand-primary mb-3 group-hover:scale-110 transition-transform" />
              <p className="font-bold text-brand-text text-lg mb-1">Manage Matches</p>
              <p className="text-sm font-medium text-brand-textMuted">View and edit match scores</p>
            </button>
            <Link
              href={"/tournament/bracket/" + tournamentId}
              target="_blank"
              className="group p-6 bg-brand-surface rounded-2xl border border-brand-border hover:border-brand-accent/50 hover:shadow-md transition-all"
            >
              <Trophy className="w-8 h-8 text-brand-accent mb-3 group-hover:scale-110 transition-transform" />
              <p className="font-bold text-brand-text text-lg mb-1">Public Bracket</p>
              <p className="text-sm font-medium text-brand-textMuted">View bracket display</p>
            </Link>
            <button
              onClick={() => setActiveTab("teams")}
              className="text-left group p-6 bg-brand-surface rounded-2xl border border-brand-border hover:border-brand-success/50 hover:shadow-md transition-all"
            >
              <Users className="w-8 h-8 text-brand-success mb-3 group-hover:scale-110 transition-transform" />
              <p className="font-bold text-brand-text text-lg mb-1">Team Management</p>
              <p className="text-sm font-medium text-brand-textMuted">Add and edit teams</p>
            </button>
          </div>
        </TabPanel>

        <TabPanel id="teams" activeTab={activeTab}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-brand-text">
              Registered Teams ({teams.length})
            </h2>
            <Button
              className="gap-2"
              onClick={() => {
                setEditingTeam(null);
                setTeamModalOpen(true);
              }}
            >
              <Plus className="w-4 h-4" />
              Add Team
            </Button>
          </div>

          {teams.length === 0 ? (
            <div className="text-center py-20 bg-brand-surface rounded-2xl border border-brand-border shadow-sm">
              <Users className="w-16 h-16 mx-auto text-brand-textMuted/50 mb-4" />
              <p className="text-brand-textMuted font-medium text-lg">No teams registered yet</p>
              <p className="text-sm text-brand-textMuted mt-1">
                Add teams or import from CSV to get started
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teams.map((team) => (
                <TeamCard
                  key={team.id}
                  team={team}
                  showDetails
                  onEdit={() => {
                    setEditingTeam(team);
                    setTeamModalOpen(true);
                  }}
                  onDelete={async () => {
                    if (!confirm(`Delete team ${team.name}?`)) return;
                    await teamApi.delete(team.id);
                    refreshTournament();
                  }}
                  onManageMembers={() => {
                    setMemberTeam(team);
                    setMemberModalOpen(true);
                  }}
                  onClick={() => {
                    setEditingTeam(team);
                    setTeamModalOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </TabPanel>

        <TabPanel id="matches" activeTab={activeTab}>
          <h2 className="text-xl font-bold text-brand-text mb-6">
            Matches
          </h2>

          {liveMatches.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-bold uppercase tracking-wider text-brand-danger mb-3">
                Live Now ({liveMatches.length})
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {liveMatches.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    isLive
                    onClick={() => {
                      setSelectedMatch(match);
                      setMatchModalOpen(true);
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {upcomingMatches.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-bold uppercase tracking-wider text-brand-textMuted mb-3">
                Upcoming ({upcomingMatches.length})
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {upcomingMatches.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    onClick={() => {
                      setSelectedMatch(match);
                      setMatchModalOpen(true);
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {completedMatches.length > 0 && (
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-brand-success mb-3">
                Completed ({completedMatches.length})
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {completedMatches.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    onClick={() => {
                      setSelectedMatch(match);
                      setMatchModalOpen(true);
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </TabPanel>

        <TabPanel id="brackets" activeTab={activeTab}>
          <h2 className="text-xl font-bold text-brand-text mb-6">
            Tournament Bracket
          </h2>
          <div className="bg-brand-surface rounded-2xl border border-brand-border p-6 shadow-sm overflow-x-auto min-h-[400px]">
            {tournament.brackets && tournament.brackets.length > 0 ? (
              <BracketView bracket={tournament.brackets[0] as any} />
            ) : (
              <div className="text-center py-20">
                <BarChart3 className="w-16 h-16 mx-auto text-brand-textMuted/50 mb-4" />
                <p className="text-brand-textMuted font-medium text-lg">
                  Bracket not generated yet
                </p>
                {tournament.status === "DRAFT" && teams.length >= 2 && (
                  <Button
                    onClick={handleGenerateBracket}
                    className="mt-6 bg-brand-accent hover:bg-brand-accent/90 text-brand-surface"
                  >
                    Generate Bracket
                  </Button>
                )}
              </div>
            )}
          </div>
        </TabPanel>

        <TabPanel id="settings" activeTab={activeTab}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <h3 className="text-heading-3 text-brand-text mb-4">Tournament Status</h3>
              <div className="flex items-center gap-3 mb-4">
                <StatusPill status={tournament.status} />
              </div>
              <div className="flex flex-wrap gap-2">
                {tournament.status === TournamentStatus.DRAFT && (
                  <Button onClick={handleStartTournament}>
                    <Play size={16} /> Start Tournament
                  </Button>
                )}
                {tournament.status === TournamentStatus.IN_PROGRESS && (
                  <Button
                    onClick={async () => {
                      if (!confirm("Mark tournament as completed?")) return;
                      await tournamentApi.update(tournamentId, { status: TournamentStatus.COMPLETED });
                      await refreshTournament();
                    }}
                  >
                    <CheckCircle size={16} /> Complete
                  </Button>
                )}
                {(tournament.status === TournamentStatus.DRAFT || tournament.status === TournamentStatus.IN_PROGRESS) && (
                  <Button
                    variant="danger"
                    onClick={async () => {
                      if (!confirm("Cancel this tournament?")) return;
                      await tournamentApi.update(tournamentId, { status: TournamentStatus.CANCELLED });
                      await refreshTournament();
                    }}
                  >
                    <XCircle size={16} /> Cancel
                  </Button>
                )}
              </div>
            </Card>

            <Card>
              <h3 className="text-heading-3 text-brand-text mb-4">Bracket</h3>
              <p className="text-body-sm text-brand-textMuted mb-4">
                {tournament.brackets && tournament.brackets.length > 0
                  ? "Bracket has been generated."
                  : "No bracket generated yet."}
              </p>
              {tournament.status === TournamentStatus.DRAFT && teams.length >= 2 && (
                <Button onClick={handleGenerateBracket}>
                  <BarChart3 size={16} /> Generate Bracket
                </Button>
              )}
            </Card>

            <Card>
              <h3 className="text-heading-3 text-brand-text mb-4">Actions</h3>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" asChild>
                  <Link href={`/admin/tournaments/${tournamentId}/edit`}>
                    <Edit size={16} /> Edit Tournament
                  </Link>
                </Button>
                <Button variant="secondary" asChild>
                  <Link href={`/tournament/bracket/${tournamentId}`} target="_blank">
                    <Trophy size={16} /> Public Bracket
                  </Link>
                </Button>
              </div>
            </Card>

            <Card className="border-brand-danger/30">
              <h3 className="text-heading-3 text-brand-danger mb-4">Danger Zone</h3>
              <p className="text-body-sm text-brand-textMuted mb-4">
                Deleting a tournament cannot be undone.
              </p>
              <Button
                variant="danger"
                onClick={async () => {
                  if (!confirm("Permanently delete this tournament?")) return;
                  await tournamentApi.delete(tournamentId);
                  router.push("/admin/tournaments");
                }}
              >
                <Trash2 size={16} /> Delete Tournament
              </Button>
            </Card>
          </div>
        </TabPanel>
      </div>

      <MatchScoringModal
        match={selectedMatch}
        scoringMode={tournament.scoringMode || ScoringMode.SIMPLE}
        maxSets={tournament.scoringConfig?.maxSets || 3}
        open={matchModalOpen}
        onClose={() => {
          setMatchModalOpen(false);
          setSelectedMatch(null);
        }}
        onUpdate={refreshMatches}
      />

      <TeamFormModal
        tournamentId={tournamentId}
        team={editingTeam}
        open={teamModalOpen}
        onClose={() => {
          setTeamModalOpen(false);
          setEditingTeam(null);
        }}
        onSuccess={refreshTournament}
      />

      {memberTeam && (
        <TeamMemberFormModal
          teamId={memberTeam.id}
          teamName={memberTeam.name}
          members={memberTeam.members || []}
          open={memberModalOpen}
          onClose={() => {
            setMemberModalOpen(false);
            setMemberTeam(null);
          }}
          onSuccess={refreshTournament}
        />
      )}
    </div>
  );
}
