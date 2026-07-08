"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import type { Tournament } from "@/types/tournament.types";
import { tournamentApi } from "@/lib/tournament-api";
import { StatusPill } from "@/components/tournament/StatusPill";
import { TournamentForm } from "@/components/tournament/TournamentForm";
import { Trophy, Plus, Calendar, Users, Search, Filter, Eye, Edit, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function AdminTournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [eventCfg, setEventCfg] = useState<any>(null);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/config/event`)
      .then(r => r.json())
      .then(data => setEventCfg(data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    async function fetchTournaments() {
      setIsLoading(true);
      try {
        const data = await tournamentApi.getAll();
        setTournaments(data);
      } catch (err: any) {
        setError(err.message || "Failed to load tournaments");
      } finally {
        setIsLoading(false);
      }
    }

    fetchTournaments();
  }, []);

  const handleCreateTournament = async (data: any) => {
    setIsCreating(true);
    try {
      const newTournament = await tournamentApi.create(data);
      setTournaments((prev) => [...prev, newTournament]);
      setShowCreateModal(false);
    } catch (err: any) {
      throw new Error(err.message || "Failed to create tournament");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTournament = async (id: string) => {
    if (!confirm("Are you sure you want to delete this tournament?")) return;

    try {
      await tournamentApi.delete(id);
      setTournaments((prev) => prev.filter((t) => t.id !== id));
    } catch (err: any) {
      alert(err.message || "Failed to delete tournament");
    }
  };

  const filteredTournaments = tournaments.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-brand-text mb-2">Tournaments</h1>
          <p className="text-brand-textMuted font-medium">Manage your tournament events</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          New Tournament
        </Button>
      </div>

      <div className="flex items-center gap-4 mb-8">
        <div className="relative flex-1 max-w-md">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-textMuted z-10">
            <Search className="w-5 h-5" />
          </div>
          <Input
            type="text"
            placeholder="Search tournaments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11"
          />
        </div>
        <Button variant="secondary" className="gap-2">
          <Filter className="w-4 h-4" />
          Filters
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-brand-primary border-t-transparent" />
        </div>
      )}

      {error && (
        <div className="bg-brand-danger/10 text-brand-danger p-4 rounded-xl border border-brand-danger/20 font-medium mb-8">
          {error}
        </div>
      )}

      {!isLoading && !error && (
        <>
          {filteredTournaments.length === 0 ? (
            <div className="text-center py-20 bg-brand-surface border border-brand-border rounded-xl shadow-sm">
              <Trophy className="w-16 h-16 mx-auto text-brand-textMuted/50 mb-4" />
              <p className="text-brand-textMuted font-medium text-lg">
                {searchQuery ? "No tournaments found matching your search" : "No tournaments yet"}
              </p>
              {!searchQuery && (
                <Button variant="outline" onClick={() => setShowCreateModal(true)} className="mt-6">
                  Create your first tournament
                </Button>
              )}
            </div>
          ) : (
            <div className="bg-brand-surface rounded-xl border border-brand-border shadow-sm overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-black/20 text-brand-textMuted text-xs uppercase tracking-wider font-semibold border-b border-brand-border">
                  <tr>
                    <th className="px-6 py-4">Tournament</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Teams</th>
                    <th className="px-6 py-4">Start Date</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {filteredTournaments.map((tournament) => (
                    <tr key={tournament.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-brand-warning/10 rounded-xl">
                            <Trophy className="w-5 h-5 text-brand-warning" />
                          </div>
                          <div>
                            <p className="font-bold text-brand-text text-base mb-0.5">
                              {tournament.name}
                            </p>
                            <p className="text-sm font-medium text-brand-textMuted capitalize">
                              {tournament.sportType?.toLowerCase().replace("_", " ")}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusPill status={tournament.status} size="sm" />
                      </td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-2 text-brand-text font-medium">
                          <Users className="w-4 h-4 text-brand-textMuted" />
                          {tournament.teams?.length || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {tournament.startDate ? (
                          <span className="flex items-center gap-2 text-brand-text font-medium">
                            <Calendar className="w-4 h-4 text-brand-textMuted" />
                            {new Date(tournament.startDate).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-brand-textMuted font-medium">Not scheduled</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={"/admin/tournaments/" + tournament.id}
                            className="p-2 text-brand-textMuted hover:text-brand-primary transition-colors rounded-lg hover:bg-white/[0.04]"
                            title="Manage"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <Link
                            href={"/admin/tournaments/" + tournament.id + "/edit"}
                            className="p-2 text-brand-textMuted hover:text-brand-primary transition-colors rounded-lg hover:bg-white/[0.04]"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDeleteTournament(tournament.id)}
                            className="p-2 text-brand-textMuted hover:text-brand-danger transition-colors rounded-lg hover:bg-brand-danger/10"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-brand-surface rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-brand-border">
            <div className="flex items-center justify-between p-6 border-b border-brand-border sticky top-0 bg-brand-surface/90 backdrop-blur z-10">
              <h2 className="text-2xl font-bold text-brand-text">Create Tournament</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-brand-textMuted hover:text-brand-text p-2 hover:bg-white/[0.04] rounded-lg transition-colors"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <TournamentForm
                initialData={{
                  startDate: eventCfg?.date ? new Date(eventCfg.date).toISOString() : undefined,
                  eventId: eventCfg?.id || undefined,
                }}
                onSubmit={handleCreateTournament}
                onCancel={() => setShowCreateModal(false)}
                isLoading={isCreating}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
