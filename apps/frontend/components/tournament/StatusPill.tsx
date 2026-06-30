"use client";

import React from 'react';
import { TournamentStatus, MatchStatus } from '@/types/tournament.types';
import { Trophy, Clock, CheckCircle, XCircle, Play, Pause } from 'lucide-react';

type StatusType = string;

interface StatusConfig {
  label: string;
  icon: React.ReactNode;
  bg: string;
  text: string;
}

interface StatusPillProps {
  status: StatusType;
  isDarkMode?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

// Use unique string keys to avoid collisions since some enum values overlap
const statusConfig: Record<string, StatusConfig> = {
  // Tournament statuses (prefixed)
  'tournament:DRAFT': {
    label: 'Draft',
    icon: <Clock className="w-3 h-3" />,
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-700 dark:text-gray-300',
  },
  'tournament:IN_PROGRESS': {
    label: 'In Progress',
    icon: <Play className="w-3 h-3" />,
    bg: 'bg-green-100 dark:bg-green-900',
    text: 'text-green-700 dark:text-green-300',
  },
  'tournament:COMPLETED': {
    label: 'Completed',
    icon: <CheckCircle className="w-3 h-3" />,
    bg: 'bg-emerald-100 dark:bg-emerald-900',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  'tournament:CANCELLED': {
    label: 'Cancelled',
    icon: <XCircle className="w-3 h-3" />,
    bg: 'bg-red-100 dark:bg-red-900',
    text: 'text-red-700 dark:text-red-300',
  },
  // Match statuses (prefixed)
  'match:SCHEDULED': {
    label: 'Scheduled',
    icon: <Clock className="w-3 h-3" />,
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-700 dark:text-gray-300',
  },
  'match:ONGOING': {
    label: 'Live',
    icon: <Play className="w-3 h-3" />,
    bg: 'bg-green-100 dark:bg-green-900',
    text: 'text-green-700 dark:text-green-300',
  },
  'match:COMPLETED': {
    label: 'Completed',
    icon: <CheckCircle className="w-3 h-3" />,
    bg: 'bg-emerald-100 dark:bg-emerald-900',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  'match:CANCELLED': {
    label: 'Cancelled',
    icon: <XCircle className="w-3 h-3" />,
    bg: 'bg-red-100 dark:bg-red-900',
    text: 'text-red-700 dark:text-red-300',
  },
  'match:WALKOVER': {
    label: 'Walkover',
    icon: <Pause className="w-3 h-3" />,
    bg: 'bg-yellow-100 dark:bg-yellow-900',
    text: 'text-yellow-700 dark:text-yellow-300',
  },
  // Legacy/alternate string labels (common in APIs)
  'LIVE': {
    label: 'Live',
    icon: <Play className="w-3 h-3" />,
    bg: 'bg-green-100 dark:bg-green-900',
    text: 'text-green-700 dark:text-green-300',
  },
  'REGISTRATION': {
    label: 'Registration Open',
    icon: <Trophy className="w-3 h-3" />,
    bg: 'bg-blue-100 dark:bg-blue-900',
    text: 'text-blue-700 dark:text-blue-300',
  },
  'PAUSED': {
    label: 'Paused',
    icon: <Pause className="w-3 h-3" />,
    bg: 'bg-yellow-100 dark:bg-yellow-900',
    text: 'text-yellow-700 dark:text-yellow-300',
  },
};

// Helper function to get config key from status
function getConfigKey(status: StatusType): string {
  // Try exact match first
  if (statusConfig[status]) {
    return status;
  }

  // Try prefixed versions
  if (Object.values(TournamentStatus).includes(status as TournamentStatus)) {
    return `tournament:${status}`;
  }
  if (Object.values(MatchStatus).includes(status as MatchStatus)) {
    return `match:${status}`;
  }

  return status;
}

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs gap-1',
  md: 'px-2.5 py-1 text-xs gap-1.5',
  lg: 'px-3 py-1.5 text-sm gap-2',
};

export function StatusPill({ status, isDarkMode = false, size = 'md' }: StatusPillProps) {
  const configKey = getConfigKey(status);
  const config = statusConfig[configKey] || {
    label: status,
    icon: null,
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-700 dark:text-gray-300',
  };

  return (
    <span
      className={`
        inline-flex items-center font-medium rounded-full
        ${config.bg} ${config.text}
        ${sizeClasses[size]}
      `}
    >
      {config.icon}
      {config.label}
    </span>
  );
}
