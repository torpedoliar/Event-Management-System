"use client";
import RequireAuth from '@/components/RequireAuth';
import { useEffect, useState, DragEvent } from 'react';
import { apiBase, parseErrorMessage } from '@/lib/api';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Label from '@/components/ui/Label';
import Button from '@/components/ui/Button';
import { Calendar, CalendarDays, MapPin, Plus, Copy, Trash2, Check, Users, Gift, Package, Loader2, Edit2, X, ChevronRight, List, LayoutGrid, GripVertical, Clock, CheckCircle, History, Trophy } from 'lucide-react';
import Link from 'next/link';

interface EventStats {
  totalGuests: number;
  checkedIn: number;
  souvenirs: number;
  prizes: number;
  tournaments?: number;
}

interface Event {
  id: string;
  name: string;
  date?: string | null;
  time?: string | null;
  location?: string | null;
  isActive: boolean;
  createdAt: string;
  stats?: EventStats;
}

type ViewMode = 'list' | 'kanban';
type KanbanColumn = 'upcoming' | 'active' | 'past';

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [creating, setCreating] = useState(false);

  // Edit form
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [saving, setSaving] = useState(false);

  // Actions
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Drag and drop
  const [draggedEvent, setDraggedEvent] = useState<Event | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<KanbanColumn | null>(null);

  const tokenHeader = (): Record<string, string> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchEvents = async () => {
    try {
      const res = await fetch(`${apiBase()}/events`, { headers: tokenHeader() });
      if (!res.ok) throw new Error('Failed to fetch events');
      const data = await res.json();
      
      // Fetch stats for each event
      const eventsWithStats = await Promise.all(
        data.map(async (event: Event) => {
          try {
            const statsRes = await fetch(`${apiBase()}/events/${event.id}/stats`, { headers: tokenHeader() });
            if (statsRes.ok) {
              event.stats = await statsRes.json();
            }
          } catch (e) {}
          return event;
        })
      );
      
      setEvents(eventsWithStats);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

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
          time: newTime || undefined,
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
      setNewTime('');
      setNewLocation('');
      setShowCreate(false);
      await fetchEvents();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const updateEvent = async (id: string) => {
    if (!editName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase()}/events/${id}`, {
        method: 'PUT',
        headers: { ...tokenHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          date: editDate || undefined,
          time: editTime || undefined,
          location: editLocation.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(parseErrorMessage(errorText));
      }
      setMessage('Event berhasil diupdate');
      setEditingId(null);
      await fetchEvents();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
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
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const cloneEvent = async (id: string, name: string) => {
    const newName = window.prompt('Nama event baru:', `${name} (Copy)`);
    if (!newName) return;
    
    setActionLoading(id);
    setError(null);
    try {
      const res = await fetch(`${apiBase()}/events/${id}/clone`, {
        method: 'POST',
        headers: { ...tokenHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(parseErrorMessage(errorText));
      }
      setMessage('Event berhasil di-clone');
      await fetchEvents();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const deleteEvent = async (id: string, name: string) => {
    if (!window.confirm(`Hapus event "${name}"? Semua data tamu, souvenir, dan hadiah akan ikut terhapus.`)) return;
    
    setActionLoading(id);
    setError(null);
    try {
      const res = await fetch(`${apiBase()}/events/${id}`, {
        method: 'DELETE',
        headers: tokenHeader(),
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(parseErrorMessage(errorText));
      }
      setMessage('Event berhasil dihapus');
      await fetchEvents();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (date?: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const startEdit = (event: Event) => {
    setEditingId(event.id);
    setEditName(event.name);
    setEditDate(event.date?.slice(0, 10) || '');
    setEditTime(event.time || '');
    setEditLocation(event.location || '');
  };

  // Categorize events for Kanban
  const getEventColumn = (event: Event): KanbanColumn => {
    if (event.isActive) return 'active';
    if (!event.date) return 'upcoming';
    const eventDate = new Date(event.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return eventDate < today ? 'past' : 'upcoming';
  };

  const categorizedEvents = {
    upcoming: events.filter(e => getEventColumn(e) === 'upcoming'),
    active: events.filter(e => getEventColumn(e) === 'active'),
    past: events.filter(e => getEventColumn(e) === 'past'),
  };

  // Drag and drop handlers
  const handleDragStart = (e: DragEvent<HTMLDivElement>, event: Event) => {
    setDraggedEvent(event);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', event.id);
  };

  const handleDragEnd = () => {
    setDraggedEvent(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, column: KanbanColumn) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(column);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>, targetColumn: KanbanColumn) => {
    e.preventDefault();
    setDragOverColumn(null);
    
    if (!draggedEvent) return;
    
    const currentColumn = getEventColumn(draggedEvent);
    if (currentColumn === targetColumn) return;

    // Handle column change
    if (targetColumn === 'active') {
      // Activate event
      await activateEvent(draggedEvent.id);
    } else if (draggedEvent.isActive) {
      // Can't deactivate by drag - need to activate another event
      setError('Untuk menonaktifkan event, aktifkan event lain terlebih dahulu');
      setTimeout(() => setError(null), 3000);
    }
    
    setDraggedEvent(null);
  };

  // Kanban Card Component
  const KanbanCard = ({ event, column }: { event: Event; column: KanbanColumn }) => (
    <div
      draggable={column !== 'past'}
      onDragStart={(e) => handleDragStart(e, event)}
      onDragEnd={handleDragEnd}
      className={`
        group p-4 rounded-xl border transition-all
        ${event.isActive 
          ? 'bg-brand-success/10 border-brand-success/30 border-l-2 border-l-brand-primary' 
          : 'surface-interactive hover:bg-brand-bgSubtle'
        }
        ${draggedEvent?.id === event.id ? 'opacity-50 scale-95' : ''}
        ${column !== 'past' ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}
      `}
    >
      <div className="flex items-start gap-3">
        {column !== 'past' && (
          <div className="text-white/30 group-hover:text-white/50 pt-0.5">
            <GripVertical size={16} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {event.isActive && (
              <span className="px-1.5 py-0.5 text-2xs font-medium bg-brand-success/20 text-brand-success rounded-full">
                ACTIVE
              </span>
            )}
            <h4 className="font-medium text-white truncate">{event.name}</h4>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-white/50">
            <span className="flex items-center gap-1">
              <Calendar size={10} />
              {formatDate(event.date)}
            </span>
            {event.time && (
              <span className="flex items-center gap-1">
                <Clock size={10} />
                {event.time}
              </span>
            )}
            {event.location && (
              <span className="flex items-center gap-1">
                <MapPin size={10} />
                <span className="truncate max-w-[100px]">{event.location}</span>
              </span>
            )}
          </div>
          {event.stats && (
            <div className="flex items-center gap-3 mt-2 text-xs">
              <span className="flex items-center gap-1 text-brand-primary">
                <Users size={10} />
                {event.stats.checkedIn}/{event.stats.totalGuests}
              </span>
              <span className="flex items-center gap-1 text-brand-primary">
                <Package size={10} />
                {event.stats.souvenirs}
              </span>
              <span className="flex items-center gap-1 text-brand-warning">
                <Gift size={10} />
                {event.stats.prizes}
              </span>
              {(event.stats.tournaments ?? 0) > 0 && (
                <span className="flex items-center gap-1 text-brand-success">
                  <Trophy size={10} />
                  {event.stats.tournaments}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Quick Actions */}
      <div className="flex items-center gap-1 mt-3 pt-3 border-t border-white/10">
        {!event.isActive && column !== 'past' && (
          <button
            onClick={() => activateEvent(event.id)}
            disabled={actionLoading === event.id}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded-lg bg-brand-success/20 text-brand-success hover:bg-brand-success/30 transition-colors disabled:opacity-50"
          >
            {actionLoading === event.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            Aktifkan
          </button>
        )}
        <button
          onClick={() => startEdit(event)}
          className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          title="Edit"
        >
          <Edit2 size={12} />
        </button>
        <button
          onClick={() => cloneEvent(event.id, event.name)}
          disabled={actionLoading === event.id}
          className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          title="Clone"
        >
          <Copy size={12} />
        </button>
        {!event.isActive && (
          <button
            onClick={() => deleteEvent(event.id, event.name)}
            disabled={actionLoading === event.id}
            className="p-1.5 rounded-lg text-brand-danger/50 hover:text-brand-danger hover:bg-brand-danger/10 transition-colors"
            title="Hapus"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </div>
  );

  // Kanban Column Component
  const KanbanColumnComponent = ({ 
    column, 
    title, 
    icon: Icon, 
    events: columnEvents 
  }: { 
    column: KanbanColumn; 
    title: string; 
    icon: any; 
    events: Event[];
  }) => {
    const getColumnStyles = () => {
      const baseStyles = "flex flex-col h-full min-h-[400px] rounded-2xl border-2 border-dashed transition-all";
      const isOver = dragOverColumn === column;
      
      switch (column) {
        case 'upcoming':
          return `${baseStyles} ${isOver ? 'border-brand-primary/50 bg-brand-primary/5' : 'border-white/10 bg-brand-primary/10'}`;
        case 'active':
          return `${baseStyles} ${isOver ? 'border-brand-primary/50 bg-brand-primary/5' : 'border-white/10 bg-brand-primary/10'}`;
        case 'past':
          return `${baseStyles} ${isOver ? 'border-gray-500/50 bg-gray-500/5' : 'border-white/10 bg-brand-bgSubtle'}`;
        default:
          return `${baseStyles} border-white/10 bg-white/5`;
      }
    };

    const getIconStyles = () => {
      switch (column) {
        case 'upcoming':
          return { bg: 'bg-brand-primary/20', text: 'text-brand-primary' };
        case 'active':
          return { bg: 'bg-brand-primary/20', text: 'text-brand-primary' };
        case 'past':
          return { bg: 'bg-gray-500/20', text: 'text-gray-400' };
        default:
          return { bg: 'bg-white/10', text: 'text-white/50' };
      }
    };

    const iconStyles = getIconStyles();

    return (
      <div
        onDragOver={(e) => handleDragOver(e, column)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, column)}
        className={getColumnStyles()}
      >
        {/* Column Header */}
        <div className="flex items-center gap-2 p-4 border-b border-white/10">
          <div className={`p-2 rounded-lg ${iconStyles.bg}`}>
            <Icon size={16} className={iconStyles.text} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white">{title}</h3>
            <p className="text-xs text-white/50">{columnEvents.length} event</p>
          </div>
        </div>
        
        {/* Column Content */}
        <div className="flex-1 p-3 space-y-3 overflow-y-auto">
          {columnEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-white/30 text-sm">
              <Icon size={24} className="mb-2 opacity-50" />
              <p>Tidak ada event</p>
              {column === 'upcoming' && (
                <button
                  onClick={() => setShowCreate(true)}
                  className="mt-2 text-brand-primary hover:text-brand-primarySoft text-xs flex items-center gap-1"
                >
                  <Plus size={12} />
                  Tambah event
                </button>
              )}
            </div>
          ) : (
            columnEvents.map((event) => (
              <KanbanCard key={event.id} event={event} column={column} />
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <RequireAuth>
      <div className="min-h-screen p-6 md:p-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-2xl md:text-3xl font-bold text-white text-shadow-lg">Event Management</h1>
            <div className="flex items-center gap-2">
              {/* View Toggle */}
              <div className="flex items-center bg-white/10 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'list' 
                      ? 'bg-white/20 text-white' 
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  <List size={14} />
                  List
                </button>
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'kanban' 
                      ? 'bg-white/20 text-white' 
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  <LayoutGrid size={14} />
                  Kanban
                </button>
              </div>
              <Link href={"/admin/events/calendar" as any}>
                <Button variant="secondary" className="flex items-center gap-2">
                  <CalendarDays size={16} />
                  <span className="hidden sm:inline">Calendar</span>
                </Button>
              </Link>
              <Button onClick={() => setShowCreate(true)} className="flex items-center gap-2">
                <Plus size={18} />
                <span className="hidden sm:inline">Buat Event</span>
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

          {/* Create Form */}
          {showCreate && (
            <Card variant="glass" className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Event Baru</h2>
                <button onClick={() => setShowCreate(false)} className="text-white/50 hover:text-white">
                  <X size={20} />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  <Label className="mb-2">Jam</Label>
                  <Input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
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
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="secondary" onClick={() => setShowCreate(false)}>Batal</Button>
                <Button onClick={createEvent} disabled={creating || !newName.trim()}>
                  {creating ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                  Buat Event
                </Button>
              </div>
            </Card>
          )}

          {/* Event Views */}
          {loading ? (
            <div className="text-center py-12 text-white/60">
              <Loader2 size={32} className="animate-spin mx-auto mb-2" />
              Loading events...
            </div>
          ) : events.length === 0 ? (
            <Card variant="glass" className="p-12 text-center">
              <div className="text-white/50 mb-4">Belum ada event</div>
              <Button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2">
                <Plus size={18} />
                Buat Event Pertama
              </Button>
            </Card>
          ) : viewMode === 'kanban' ? (
            /* Kanban View */
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-white/50">
                <GripVertical size={14} />
                <span>Seret event ke kolom "Sedang Aktif" untuk mengaktifkannya</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <KanbanColumnComponent
                column="upcoming"
                title="Akan Datang"
                icon={Clock}
                events={categorizedEvents.upcoming}
              />
              <KanbanColumnComponent
                column="active"
                title="Sedang Aktif"
                icon={CheckCircle}
                events={categorizedEvents.active}
              />
              <KanbanColumnComponent
                column="past"
                title="Selesai"
                icon={History}
                events={categorizedEvents.past}
              />
              </div>
            </div>
          ) : (
            /* List View */
            <div className="space-y-4">
              {events.map((event) => (
                <Card
                  key={event.id}
                  variant="glass"
                  className={`p-5 transition-all surface-interactive ${event.isActive ? 'ring-2 ring-brand-primary/50 border-l-2 border-l-brand-primary' : ''}`}
                >
                  {editingId === event.id ? (
                    // Edit Mode
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <Label className="mb-2">Nama Event</Label>
                          <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                        </div>
                        <div>
                          <Label className="mb-2">Tanggal</Label>
                          <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
                        </div>
                        <div>
                          <Label className="mb-2">Jam</Label>
                          <Input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} />
                        </div>
                        <div>
                          <Label className="mb-2">Lokasi</Label>
                          <Input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" size="sm" onClick={() => setEditingId(null)}>Batal</Button>
                        <Button size="sm" onClick={() => updateEvent(event.id)} disabled={saving}>
                          {saving ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
                          Simpan
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          {event.isActive && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-brand-success/20 text-brand-success rounded-full border border-brand-success/30">
                              Active
                            </span>
                          )}
                          <h3 className="text-lg font-semibold text-white truncate">{event.name}</h3>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-white/60">
                          <span className="flex items-center gap-1">
                            <Calendar size={14} />
                            {formatDate(event.date)}
                          </span>
                          {event.time && (
                            <span className="flex items-center gap-1">
                              <Clock size={14} />
                              {event.time} WIB
                            </span>
                          )}
                          {event.location && (
                            <span className="flex items-center gap-1">
                              <MapPin size={14} />
                              {event.location}
                            </span>
                          )}
                        </div>
                        {event.stats && (
                          <div className="flex flex-wrap items-center gap-4 mt-3 text-sm">
                            <span className="flex items-center gap-1.5 text-brand-primary">
                              <Users size={14} />
                              {event.stats.checkedIn}/{event.stats.totalGuests} tamu
                            </span>
                            <span className="flex items-center gap-1.5 text-brand-primary">
                              <Package size={14} />
                              {event.stats.souvenirs} souvenir
                            </span>
                            <span className="flex items-center gap-1.5 text-brand-warning">
                              <Gift size={14} />
                              {event.stats.prizes} hadiah
                            </span>
                            {(event.stats.tournaments ?? 0) > 0 && (
                              <span className="flex items-center gap-1.5 text-brand-success">
                                <Trophy size={14} />
                                {event.stats.tournaments} turnamen
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!event.isActive && (
                          <Button
                            size="sm"
                            onClick={() => activateEvent(event.id)}
                            disabled={actionLoading === event.id}
                            className="flex items-center gap-1"
                          >
                            {actionLoading === event.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Check size={14} />
                            )}
                            Aktifkan
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => startEdit(event)}
                          className="flex items-center gap-1"
                        >
                          <Edit2 size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => cloneEvent(event.id, event.name)}
                          disabled={actionLoading === event.id}
                          title="Clone Event"
                          className="flex items-center gap-1"
                        >
                          <Copy size={14} />
                        </Button>
                        {!event.isActive && (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => deleteEvent(event.id, event.name)}
                            disabled={actionLoading === event.id}
                            title="Hapus Event"
                            className="flex items-center gap-1"
                          >
                            <Trash2 size={14} />
                          </Button>
                        )}
                        {event.isActive && (
                          <Link href="/admin/settings/event">
                            <Button size="sm" variant="secondary" className="flex items-center gap-1">
                              Settings
                              <ChevronRight size={14} />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </RequireAuth>
  );
}
