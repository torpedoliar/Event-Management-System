"use client";
import { useEffect, useState, useRef, useCallback } from 'react';
import { ChevronDown, Calendar, Check, Plus, Settings } from 'lucide-react';
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

  // Listen for event changes via SSE
  useEffect(() => {
    const onEventChange = () => {
      fetchEvents();
    };
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
        setIsOpen(false);
        window.location.reload();
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
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 hover:bg-white/15 transition-colors text-sm"
      >
        <div className="w-2 h-2 rounded-full bg-emerald-400" />
        <span className="text-white font-medium max-w-[150px] truncate">
          {activeEvent?.name || 'No Event'}
        </span>
        <ChevronDown size={14} className={`text-white/60 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-brand-secondary border border-brand-primary/20 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2 border-b border-white/10">
            <div className="text-xs text-white/50 px-2 py-1">Pilih Event</div>
          </div>
          <div className="max-h-64 overflow-y-auto p-2 space-y-1">
            {events.map((event) => (
              <button
                key={event.id}
                onClick={() => switchEvent(event.id)}
                disabled={switching}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
                  event.isActive
                    ? 'bg-brand-primary/20 border border-brand-primary/30'
                    : 'hover:bg-white/10 border border-transparent'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${event.isActive ? 'bg-emerald-400' : 'bg-white/30'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium truncate">{event.name}</div>
                  {event.date && (
                    <div className="flex items-center gap-1 text-xs text-white/50">
                      <Calendar size={10} />
                      <span>{formatDate(event.date)}</span>
                    </div>
                  )}
                </div>
                {event.isActive && <Check size={16} className="text-brand-success flex-shrink-0" />}
              </button>
            ))}
          </div>
          <div className="p-2 border-t border-white/10 space-y-1">
            <Link
              href={"/admin/events" as any}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors text-sm"
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
