"use client";
import RequireAuth from '@/components/RequireAuth';
import { useEffect, useState } from 'react';
import { apiBase, parseErrorMessage } from '@/lib/api';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Label from '@/components/ui/Label';
import Button from '@/components/ui/Button';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  X, 
  Calendar as CalendarIcon, 
  MapPin, 
  Check, 
  Loader2,
  Users,
  List,
  Trophy
} from 'lucide-react';
import Link from 'next/link';

interface Event {
  id: string;
  name: string;
  date?: string | null;
  location?: string | null;
  isActive: boolean;
  enableTournament?: boolean;
  createdAt: string;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: Event[];
}

export default function EventCalendarPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [creating, setCreating] = useState(false);

  // Action loading
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const tokenHeader = (): Record<string, string> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchEvents = async () => {
    try {
      const res = await fetch(`${apiBase()}/events`, { headers: tokenHeader() });
      if (!res.ok) throw new Error('Failed to fetch events');
      const data = await res.json();
      setEvents(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Calendar helpers
  const getMonthName = (date: Date) => {
    return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  };

  const getDaysInMonth = (date: Date): CalendarDay[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Add days from previous month to fill the first week
    const firstDayOfWeek = firstDay.getDay(); // 0 = Sunday
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({
        date: d,
        isCurrentMonth: false,
        isToday: d.getTime() === today.getTime(),
        events: getEventsForDate(d),
      });
    }

    // Add days of current month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const d = new Date(year, month, day);
      days.push({
        date: d,
        isCurrentMonth: true,
        isToday: d.getTime() === today.getTime(),
        events: getEventsForDate(d),
      });
    }

    // Add days from next month to complete the last week
    const remainingDays = 42 - days.length; // 6 weeks * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      const d = new Date(year, month + 1, i);
      days.push({
        date: d,
        isCurrentMonth: false,
        isToday: d.getTime() === today.getTime(),
        events: getEventsForDate(d),
      });
    }

    return days;
  };

  const getEventsForDate = (date: Date): Event[] => {
    return events.filter((event) => {
      if (!event.date) return false;
      const eventDate = new Date(event.date);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const activateEvent = async (id: string) => {
    setActionLoading(id);
    setError(null);
    try {
      const res = await fetch(`${apiBase()}/events/${id}/activate`, {
        method: 'POST',
        headers: tokenHeader(),
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(parseErrorMessage(errorText));
      }
      setMessage('Event diaktifkan');
      await fetchEvents();
      setTimeout(() => setMessage(null), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const createEvent = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase()}/events`, {
        method: 'POST',
        headers: { ...tokenHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          date: newDate || undefined,
          location: newLocation.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(parseErrorMessage(errorText));
      }
      setMessage('Event berhasil dibuat');
      setNewName('');
      setNewDate('');
      setNewLocation('');
      setShowCreate(false);
      setSelectedDate(null);
      await fetchEvents();
      setTimeout(() => setMessage(null), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const openCreateForDate = (date: Date) => {
    const dateStr = date.toISOString().slice(0, 10);
    setNewDate(dateStr);
    setShowCreate(true);
  };

  const formatDate = (date?: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('id-ID', { 
      weekday: 'long',
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const isEventPast = (date?: string | null) => {
    if (!date) return false;
    const eventDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return eventDate < today;
  };

  const isEventToday = (date?: string | null) => {
    if (!date) return false;
    const eventDate = new Date(date);
    const today = new Date();
    return (
      eventDate.getDate() === today.getDate() &&
      eventDate.getMonth() === today.getMonth() &&
      eventDate.getFullYear() === today.getFullYear()
    );
  };

  const calendarDays = getDaysInMonth(currentDate);
  const weekDays = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  // Events without date or selected date events
  const eventsWithoutDate = events.filter((e) => !e.date);
  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  return (
    <RequireAuth>
      <div className="min-h-screen p-6 md:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Event Calendar</h1>
              <p className="text-white/60 text-sm mt-1">Lihat dan kelola jadwal event</p>
            </div>
            <div className="flex items-center gap-2">
              <Link href={"/admin/events" as any}>
                <Button variant="secondary" className="flex items-center gap-2">
                  <List size={16} />
                  List View
                </Button>
              </Link>
              <Button onClick={() => setShowCreate(true)} className="flex items-center gap-2">
                <Plus size={18} />
                Tambah Event
              </Button>
            </div>
          </div>

          {error && (
            <div className="text-sm text-brand-danger bg-brand-danger/10 p-3 rounded-lg border border-brand-danger/20">
              {error}
            </div>
          )}
          {message && (
            <div className="text-sm text-brand-success bg-brand-success/10 p-3 rounded-lg border border-brand-success/20">
              {message}
            </div>
          )}

          {/* Create Modal */}
          {showCreate && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <Card variant="glass" className="w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">Event Baru</h2>
                  <button onClick={() => setShowCreate(false)} className="text-white/50 hover:text-white">
                    <X size={20} />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="mb-2">Nama Event *</Label>
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Contoh: Annual Gathering 2025"
                    />
                  </div>
                  <div>
                    <Label className="mb-2">Tanggal</Label>
                    <Input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="mb-2">Lokasi</Label>
                    <Input
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      placeholder="Contoh: Hotel Grand Hyatt"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <Button variant="secondary" onClick={() => setShowCreate(false)}>Batal</Button>
                  <Button onClick={createEvent} disabled={creating || !newName.trim()}>
                    {creating ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                    Buat Event
                  </Button>
                </div>
              </Card>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar */}
            <Card variant="glass" className="lg:col-span-2 p-4 md:p-6">
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={prevMonth}
                  className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold text-white capitalize">
                    {getMonthName(currentDate)}
                  </h2>
                  <button
                    onClick={goToToday}
                    className="px-2 py-1 text-xs rounded bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
                  >
                    Hari Ini
                  </button>
                </div>
                <button
                  onClick={nextMonth}
                  className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              {/* Week Days Header */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map((day) => (
                  <div key={day} className="text-center text-xs font-medium text-white/50 py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 size={32} className="animate-spin text-white/50" />
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, idx) => {
                    const hasEvents = day.events.length > 0;
                    const hasActiveEvent = day.events.some((e) => e.isActive);
                    const isSelected = selectedDate?.getTime() === day.date.getTime();

                    return (
                      <div
                        key={idx}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedDate(day.date)}
                        onKeyDown={(e) => e.key === 'Enter' && setSelectedDate(day.date)}
                        className={`
                          relative min-h-[80px] md:min-h-[100px] p-1 md:p-2 rounded-lg border transition-all text-left cursor-pointer group
                          ${day.isCurrentMonth ? 'bg-white/5' : 'bg-transparent'}
                          ${day.isToday ? 'border-brand-primary ring-2 ring-brand-primary/40' : 'border-white/10'}
                          ${isSelected ? 'border-brand-primary/50 ring-2 ring-brand-primary/30 bg-brand-primary/10' : ''}
                          ${hasEvents ? 'hover:bg-brand-bgSubtle' : 'hover:bg-brand-bgSubtle/50'}
                        `}
                      >
                        <div className={`
                          text-sm font-medium mb-1
                          ${day.isCurrentMonth ? 'text-white' : 'text-white/30'}
                          ${day.isToday ? 'text-brand-primary' : ''}
                        `}>
                          {day.date.getDate()}
                        </div>
                        
                        {/* Event indicators */}
                        <div className="space-y-0.5">
                          {day.events.slice(0, 3).map((event) => (
                            <div
                              key={event.id}
                              className={`
                                flex items-center justify-between gap-1 text-[10px] md:text-xs px-1 py-0.5 rounded
                                ${event.isActive 
                                  ? 'bg-brand-success/30 text-brand-success border border-brand-success/30' 
                                  : isEventPast(event.date)
                                    ? 'bg-gray-500/20 text-gray-400'
                                    : 'bg-brand-primary/20 text-brand-primarySoft'
                                }
                              `}
                            >
                              <span className="truncate">{event.name}</span>
                              {event.enableTournament && <Trophy size={10} className="flex-shrink-0 opacity-70" />}
                            </div>
                          ))}
                          {day.events.length > 3 && (
                            <div className="text-[10px] text-white/50">
                              +{day.events.length - 3} lainnya
                            </div>
                          )}
                        </div>

                        {/* Add button on hover for dates without events */}
                        {!hasEvents && day.isCurrentMonth && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openCreateForDate(day.date);
                            }}
                            className="absolute bottom-1 right-1 p-1 rounded opacity-0 group-hover:opacity-50 hover:!opacity-100 bg-white/10 hover:bg-white/20 text-white/50 hover:text-white transition-all"
                          >
                            <Plus size={12} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-white/10 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-brand-success/30 border border-brand-success/30" />
                  <span className="text-white/60">Event Aktif</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-brand-primary/20" />
                  <span className="text-white/60">Event Mendatang</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-gray-500/20" />
                  <span className="text-white/60">Event Selesai</span>
                </div>
              </div>
            </Card>

            {/* Sidebar - Selected Date & Events */}
            <div className="space-y-4">
              {/* Selected Date Events */}
              <Card variant="glass" className="p-4">
                <h3 className="text-sm font-medium text-white/70 mb-3 flex items-center gap-2">
                  <CalendarIcon size={14} />
                  {selectedDate 
                    ? selectedDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })
                    : 'Pilih tanggal'
                  }
                </h3>
                
                {selectedDate ? (
                  selectedDateEvents.length > 0 ? (
                    <div className="space-y-2">
                      {selectedDateEvents.map((event) => (
                        <div
                          key={event.id}
                          className={`
                            p-3 rounded-lg border transition-all
                            ${event.isActive 
                              ? 'bg-brand-success/10 border-brand-success/30' 
                              : 'surface-interactive hover:bg-brand-bgSubtle'
                            }
                          `}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-white truncate">{event.name}</div>
                              {event.location && (
                                <div className="flex items-center gap-1 text-xs text-white/50 mt-1">
                                  <MapPin size={10} />
                                  {event.location}
                                </div>
                              )}
                            </div>
                            {event.isActive ? (
                              <span className="flex-shrink-0 px-2 py-0.5 text-xs bg-brand-success/20 text-brand-success rounded-full">
                                Aktif
                              </span>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => activateEvent(event.id)}
                                disabled={actionLoading === event.id}
                                className="flex-shrink-0"
                              >
                                {actionLoading === event.id ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Check size={14} />
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <div className="text-white/40 text-sm mb-3">Tidak ada event</div>
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => openCreateForDate(selectedDate)}
                        className="inline-flex items-center gap-1"
                      >
                        <Plus size={14} />
                        Tambah Event
                      </Button>
                    </div>
                  )
                ) : (
                  <div className="text-white/40 text-sm text-center py-6">
                    Klik tanggal di kalender untuk melihat detail
                  </div>
                )}
              </Card>

              {/* Upcoming Events */}
              <Card variant="glass" className="p-4">
                <h3 className="text-sm font-medium text-white/70 mb-3">Event Mendatang</h3>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {events
                    .filter((e) => e.date && !isEventPast(e.date))
                    .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime())
                    .slice(0, 5)
                    .map((event) => (
                      <button
                        key={event.id}
                        onClick={() => {
                          const eventDate = new Date(event.date!);
                          setCurrentDate(new Date(eventDate.getFullYear(), eventDate.getMonth(), 1));
                          setSelectedDate(eventDate);
                        }}
                        className="w-full p-2 rounded-lg bg-white/5 hover:bg-white/10 text-left transition-colors"
                      >
                        <div className="text-sm text-white truncate">{event.name}</div>
                        <div className="text-xs text-white/50">
                          {new Date(event.date!).toLocaleDateString('id-ID', { 
                            day: 'numeric', 
                            month: 'short' 
                          })}
                          {isEventToday(event.date) && (
                            <span className="ml-2 text-brand-primary">Hari Ini</span>
                          )}
                        </div>
                      </button>
                    ))
                  }
                  {events.filter((e) => e.date && !isEventPast(e.date)).length === 0 && (
                    <div className="text-white/40 text-sm text-center py-4">
                      Tidak ada event mendatang
                    </div>
                  )}
                </div>
              </Card>

              {/* Events without date */}
              {eventsWithoutDate.length > 0 && (
                <Card variant="glass" className="p-4">
                  <h3 className="text-sm font-medium text-white/70 mb-3">Tanpa Tanggal</h3>
                  <div className="space-y-2">
                    {eventsWithoutDate.map((event) => (
                      <div
                        key={event.id}
                        className={`
                          p-2 rounded-lg border text-sm
                          ${event.isActive 
                            ? 'bg-brand-success/10 border-brand-success/30 text-brand-success' 
                            : 'bg-white/5 border-white/10 text-white/70'
                          }
                        `}
                      >
                        {event.name}
                        {event.isActive && (
                          <span className="ml-2 text-xs text-brand-success">(Aktif)</span>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
