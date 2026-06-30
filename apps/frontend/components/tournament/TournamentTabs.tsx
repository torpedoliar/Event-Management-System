"use client";

import React, { useState, useEffect } from "react";
import type { TournamentStatus } from "@/types/tournament.types";
import { Calendar, Users, BarChart3, Settings, Trophy } from "lucide-react";

type TabId = "overview" | "teams" | "matches" | "brackets" | "settings";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const tabs: Tab[] = [
  { id: "overview", label: "Overview", icon: <Calendar size={16} /> },
  { id: "teams", label: "Teams", icon: <Users size={16} /> },
  { id: "matches", label: "Matches", icon: <BarChart3 size={16} /> },
  { id: "brackets", label: "Brackets", icon: <Trophy size={16} /> },
  { id: "settings", label: "Settings", icon: <Settings size={16} />, adminOnly: true },
];

interface TournamentTabsProps {
  activeTab?: TabId;
  onTabChange?: (tab: TabId) => void;
  tournamentStatus?: TournamentStatus;
  isAdmin?: boolean;
}

export function TournamentTabs({
  activeTab = "overview",
  onTabChange,
  isAdmin = false,
}: TournamentTabsProps) {
  const [currentTab, setCurrentTab] = useState<TabId>(activeTab);

  useEffect(() => {
    setCurrentTab(activeTab);
  }, [activeTab]);

  const handleTabChange = (tabId: TabId) => {
    setCurrentTab(tabId);
    onTabChange?.(tabId);
  };

  const visibleTabs = tabs.filter((tab) => !tab.adminOnly || isAdmin);

  return (
    <div className="border-b border-brand-border">
      <nav className="flex gap-1 -mb-px overflow-x-auto scrollbar-hide">
        {visibleTabs.map((tab) => {
          const active = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition-all whitespace-nowrap",
                active
                  ? "bg-brand-primary/10 text-brand-primary border-b-2 border-brand-primary"
                  : "text-brand-textMuted hover:text-brand-text hover:bg-white/[0.04]"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
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

export function TabPanel({ id, activeTab, children, className = "" }: TabPanelProps) {
  if (id !== activeTab) return null;
  return <div className={className}>{children}</div>;
}

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
