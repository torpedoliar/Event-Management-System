"use client";

import React from "react";
import type { TournamentTeam } from "@/types/tournament.types";
import { TeamLogo } from "./TeamLogo";
import { TeamMemberList } from "./TeamMemberList";

interface TeamCardProps {
  team: TournamentTeam;
  onClick?: () => void;
  showDetails?: boolean;
}

export function TeamCard({ team, onClick, showDetails = false }: TeamCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-brand-surface shadow-sm overflow-hidden",
        onClick ? "cursor-pointer hover:border-brand-primary/50 hover:shadow-md transition-all hover:-translate-y-0.5" : "border-brand-border"
      )}
      onClick={onClick}
    >
      <div className="p-5">
        <div className="flex items-center gap-4">
          <TeamLogo src={team.logoUrl} name={team.name} size="lg" />
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg text-brand-text truncate">
              {team.name}
            </h3>
            {team.seed && (
              <p className="text-sm font-medium text-brand-textMuted">
                Seed #{team.seed}
              </p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 flex gap-2">
          <div className="flex-1 text-center bg-brand-success/10 rounded-lg p-2">
            <p className="text-xl font-bold text-brand-success leading-none mb-1">
              {team.wins}
            </p>
            <p className="text-[10px] uppercase font-bold text-brand-success/70 tracking-wider">Wins</p>
          </div>
          <div className="flex-1 text-center bg-brand-danger/10 rounded-lg p-2">
            <p className="text-xl font-bold text-brand-danger leading-none mb-1">
              {team.losses}
            </p>
            <p className="text-[10px] uppercase font-bold text-brand-danger/70 tracking-wider">Losses</p>
          </div>
          <div className="flex-1 text-center bg-brand-surface border border-brand-border rounded-lg p-2">
            <p className="text-xl font-bold text-brand-textMuted leading-none mb-1">
              {team.draws}
            </p>
            <p className="text-[10px] uppercase font-bold text-brand-textMuted tracking-wider">Draws</p>
          </div>
        </div>

        {/* Members */}
        {showDetails && team.members && team.members.length > 0 && (
          <div className="mt-6 pt-5 border-t border-brand-border">
            <h4 className="text-sm font-semibold mb-3 text-brand-text">
              Members ({team.members.length})
            </h4>
            <TeamMemberList members={team.members} compact />
          </div>
        )}
      </div>

      {/* Eliminated badge */}
      {team.isEliminated && (
        <div className="bg-brand-danger/10 text-brand-danger text-xs font-bold uppercase tracking-wider px-5 py-2 text-center border-t border-brand-danger/20">
          Eliminated
        </div>
      )}
    </div>
  );
}

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
