"use client";

import React from "react";
import type { TeamMember, TeamCheckinStatus } from "@/types/tournament.types";
import Image from "next/image";
import { CheckCircle } from "lucide-react";

interface TeamMemberListProps {
  members: TeamMember[];
  compact?: boolean;
  checkinStatus?: TeamCheckinStatus;
}

export function TeamMemberList({ members, compact = false, checkinStatus }: TeamMemberListProps) {
  if (members.length === 0) {
    return (
      <p className="text-sm font-medium text-brand-textMuted">
        No members
      </p>
    );
  }

  return (
    <div className={cn(compact ? "space-y-1.5" : "divide-y divide-brand-border")}>
      {members.map((member) => {
        const isCheckedIn = checkinStatus?.[member.id]?.checkedIn;
        const matchLabel = checkinStatus?.[member.id]?.matchLabel;

        return (
          <div
            key={member.id}
            className={cn("flex items-center gap-3", compact ? "py-1.5" : "py-3")}
          >
            {/* Photo or Initial */}
            {member.photoUrl ? (
              <Image
                src={member.photoUrl}
                alt={member.name}
                width={compact ? 24 : 36}
                height={compact ? 24 : 36}
                className="rounded-full object-cover"
                unoptimized
              />
            ) : (
              <div
                className={cn(
                  "rounded-full flex items-center justify-center bg-brand-surface border border-brand-border text-brand-text font-bold",
                  compact ? "w-6 h-6 text-xs" : "w-9 h-9 text-sm"
                )}
              >
                {member.name.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-brand-text truncate">
                {member.name}
              </p>
              {member.role && (
                <p className="text-xs font-medium text-brand-textMuted">
                  {member.role}
                </p>
              )}
            </div>

            {/* Check-in indicator */}
            {isCheckedIn && (
              <span
                className="flex items-center gap-1 text-brand-success"
                title={`Checked in: ${matchLabel ?? ""}`}
              >
                <CheckCircle size={compact ? 14 : 16} />
              </span>
            )}

            {/* Jersey Number */}
            {member.jerseyNumber && (
              <span className="px-2 py-0.5 rounded bg-brand-surface border border-brand-border text-brand-text font-bold text-xs">
                #{member.jerseyNumber}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
