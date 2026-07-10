"use client";

import {
  TournamentStatus,
  MatchStatus,
  TournamentStatusLabels,
  MatchStatusLabels,
} from "@/types/tournament.types";
import Badge from "@/components/ui/Badge";

interface StatusPillProps {
  status: TournamentStatus | MatchStatus | string;
  size?: "sm" | "md" | "lg";
  isDarkMode?: boolean;
}

const statusMap: Record<string, { variant: "neutral" | "success" | "warning" | "danger" | "primary"; label: string }> = {
  // Tournament statuses
  'tournament:DRAFT': { variant: "neutral", label: TournamentStatusLabels[TournamentStatus.DRAFT] },
  'tournament:IN_PROGRESS': { variant: "primary", label: TournamentStatusLabels[TournamentStatus.IN_PROGRESS] },
  'tournament:COMPLETED': { variant: "success", label: TournamentStatusLabels[TournamentStatus.COMPLETED] },
  'tournament:CANCELLED': { variant: "danger", label: TournamentStatusLabels[TournamentStatus.CANCELLED] },
  // Match statuses
  'match:SCHEDULED': { variant: "neutral", label: MatchStatusLabels[MatchStatus.SCHEDULED] },
  'match:ONGOING': { variant: "primary", label: MatchStatusLabels[MatchStatus.ONGOING] },
  'match:COMPLETED': { variant: "success", label: MatchStatusLabels[MatchStatus.COMPLETED] },
  'match:CANCELLED': { variant: "danger", label: MatchStatusLabels[MatchStatus.CANCELLED] },
  'match:WALKOVER': { variant: "warning", label: MatchStatusLabels[MatchStatus.WALKOVER] },
  // Legacy
  'LIVE': { variant: "primary", label: 'Live' },
  'REGISTRATION': { variant: "primary", label: 'Registration Open' },
  'PAUSED': { variant: "warning", label: 'Paused' },
};

function getConfigKey(status: string): string {
  if (statusMap[status]) return status;
  if (Object.values(TournamentStatus).includes(status as TournamentStatus)) return `tournament:${status}`;
  if (Object.values(MatchStatus).includes(status as MatchStatus)) return `match:${status}`;
  return status;
}

export function StatusPill({ status, size = "md" }: StatusPillProps) {
  const configKey = getConfigKey(status);
  const config = statusMap[configKey] || { variant: "neutral", label: status };
  const sizeClass = size === "sm" ? "text-2xs px-2 py-0.5" : size === "lg" ? "text-sm px-3 py-1" : "text-xs px-2.5 py-0.5";

  return (
    <Badge variant={config.variant} className={sizeClass}>
      {config.label}
    </Badge>
  );
}

export default StatusPill;
