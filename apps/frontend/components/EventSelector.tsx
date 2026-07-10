"use client";
import { useEffect, useState, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Calendar, Check, Settings, Loader2 } from 'lucide-react';
import { apiBase } from '../lib/api';
import { useSSE } from '../lib/sse-context';
import Link from 'next/link';

interface Event {
  id: string;
  name: string;
  date?: string | null;
  isActive: boolean;
}

export default function EventSelector() {
  const [events, setEvents] = useState<Event[]>([]);
  const [activeEvent, setActiveEvent] = useState<Event | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { addEventListener, removeEventListener } = useSSE();
  const queryClient = useQueryClient();

  const tokenHeader = (): Record<string, string> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase()}/events`, { headers: tokenHeader() });
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
        setActiveEvent(data.find((e: Event) => e.isActive) || null);
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    const onEventChange = () => { fetchEvents(); };
    addEventListener('event_change', onEventChange);
    addEventListener('config', onEventChange);
    return () => {
      removeEventListener('event_change', onEventChange);
      removeEventListener('config', onEventChange);
    };
  }, [addEventListener, removeEventListener, fetchEvents]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const switchEvent = async (eventId: string) => {
    if (switching || eventId === activeEvent?.id) return;
    setSwitching(true);
    try {
      const res = await fetch(`${apiBase()}/events/${eventId}/activate`, {
        method: 'POST',
        headers: { ...tokenHeader(), 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        await fetchEvents();
        queryClient.invalidateQueries();
        setIsOpen(false);
      }
    } catch (err) {
      console.error('Failed to switch event:', err);
    } finally {
      setSwitching(false);
    }
  };

  const formatDate = (date?: string | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (events.length === 0) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label="Pilih Event"
        aria-haspopup="listbox"
        className="flex items-center gap-2 pl-3 pr-2.5 py-1.5 rounded-xl bg-brand-surface border border-brand-border hover:border-brand-borderHover hover:bg-brand-surfaceMuted transition-all duration-fast text-sm"
      >
        <div className="w-2 h-2 rounded-full bg-brand-success" />
        <span className="text-brand-text font-medium max-w-[140px] truncate">
          {activeEvent?.name || 'No Event'}
        </span>
        <ChevronDown size={14} className={`text-brand-textMuted transition-transform duration-fast ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-brand-bgElevated/98 backdrop-blur-xl border border-brand-border rounded-2xl shadow-panel overflow-hidden z-50 animate-scaleIn origin-top-left">
          <div className="p-3 border-b border-brand-border">
            {switching ? (
              <div className="flex items-center gap-2 text-xs text-brand-primary px-2 py-1">
                <Loader2 size={12} className="animate-spin" />
                <span>Switching event...</span>
              </div>
            ) : (
              <div className="text-xs text-brand-textDim uppercase tracking-wider px-2 py-1">Pilih Event</div>
            )}
          </div>
          <div className="max-h-64 overflow-y-auto p-2 space-y-1" role="listbox">
            {events.map((event) => (
              <button
                key={event.id}
                onClick={() => switchEvent(event.id)}
                disabled={switching}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${
                  event.isActive
                    ? 'bg-brand-primary/10 border border-brand-primary/20'
                    : 'hover:bg-brand-surfaceMuted border border-transparent'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${event.isActive ? 'bg-brand-success' : 'bg-brand-textDim'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-brand-text font-medium truncate">{event.name}</div>
                  {event.date && (
                    <div className="flex items-center gap-1 text-xs text-brand-textDim">
                      <Calendar size={10} />
                      <span>{formatDate(event.date)}</span>
                    </div>
                  )}
                </div>
                {event.isActive && <Check size={16} className="text-brand-success flex-shrink-0" />}
              </button>
            ))}
          </div>
          <div className="p-2 border-t border-brand-border">
            <Link
              href={"/admin/events" as any}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-brand-textMuted hover:text-brand-text hover:bg-brand-surfaceMuted transition-colors text-sm"
            >
              <Settings size={14} />
              <span>Kelola Events</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
