"use client";

import React, { useState } from 'react';
import type { TournamentStatus } from '@/types/tournament.types';
import { Calendar, Users, BarChart3, Settings, ChevronRight } from 'lucide-react';

type TabId = 'overview' | 'teams' | 'matches' | 'brackets' | 'settings';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const tabs: Tab[] = [
  { id: 'overview', label: 'Overview', icon: <Calendar className="w-4 h-4" /> },
  { id: 'teams', label: 'Teams', icon: <Users className="w-4 h-4" /> },
  { id: 'matches', label: 'Matches', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'brackets', label: 'Brackets', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" />, adminOnly: true },
];

interface TournamentTabsProps {
  activeTab?: TabId;
  onTabChange?: (tab: TabId) => void;
  tournamentStatus?: TournamentStatus;
  isAdmin?: boolean;
  isDarkMode?: boolean;
}

export function TournamentTabs({
  activeTab = 'overview',
  onTabChange,
  tournamentStatus,
  isAdmin = false,
  isDarkMode = false,
}: TournamentTabsProps) {
  const [currentTab, setCurrentTab] = useState<TabId>(activeTab);

  const handleTabChange = (tabId: TabId) => {
    setCurrentTab(tabId);
    onTabChange?.(tabId);
  };

  const visibleTabs = tabs.filter((tab) => !tab.adminOnly || isAdmin);

  const baseTabClasses = `
    flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all
    cursor-pointer
  `;

  const activeTabClasses = isDarkMode
    ? 'bg-blue-600 text-white'
    : 'bg-blue-500 text-white';

  const inactiveTabClasses = isDarkMode
    ? 'text-gray-400 hover:text-white hover:bg-gray-800'
    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100';

  return (
    <div className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
      <nav className="flex gap-1 -mb-px overflow-x-auto">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`
              ${baseTabClasses}
              whitespace-nowrap
              ${currentTab === tab.id ? activeTabClasses : inactiveTabClasses}
            `}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

interface TabPanelProps {
  id: TabId;
  activeTab: TabId;
  children: React.ReactNode;
  className?: string;
}

export function TabPanel({ id, activeTab, children, className = '' }: TabPanelProps) {
  if (id !== activeTab) return null;

  return (
    <div className={className}>
      {children}
    </div>
  );
}
