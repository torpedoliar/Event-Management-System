"use client";
import { useEffect, useState, useCallback } from "react";
import { apiBase, parseErrorMessage } from "@/lib/api";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Label from "@/components/ui/Label";
import Button from "@/components/ui/Button";
import { UserPlus, Loader2, CheckCircle, XCircle, Users, Clock, CalendarDays, MapPin, ArrowLeft } from "lucide-react";

interface RegistrationField {
  key: string; label: string; required: boolean; type: string; placeholder?: string;
}
interface PublicConfig {
  isActive: boolean; isOpen: boolean; reason: string | null;
  maxQuota: number; currentCount: number; remainingQuota: number | null;
  fields: RegistrationField[]; title: string; description?: string | null;
  successMessage: string; closedMessage: string; fullMessage: string;
}
interface PublicEvent {
  id: string; name: string; date: string | null; time: string | null; location: string | null;
}
type PageState = "loading" | "select" | "form" | "closed" | "full" | "success" | "error" | "no-events";

export default function PublicRegistrationPage() {
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<PublicEvent | null>(null);
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [state, setState] = useState<PageState>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{ message: string; guestId: string | null; queueNumber: number | null } | null>(null);

  // Step 1: Fetch available events
  const fetchEvents = useCallback(async () => {
    try {
      setState("loading");
      const res = await fetch(`${apiBase()}/public/events`);
      if (!res.ok) throw new Error(parseErrorMessage(await res.text()));
      const data: PublicEvent[] = await res.json();
      setEvents(data);

      if (data.length === 0) {
        setState("no-events");
      } else if (data.length === 1) {
        // Auto-select if only one event
        setSelectedEvent(data[0]);
        await fetchConfig(data[0].id);
      } else {
        setState("select");
      }
    } catch (e: any) {
      setErrorMsg(e.message);
      setState("error");
    }
  }, []);

  // Step 2: Fetch config for selected event
  const fetchConfig = async (eventId: string) => {
    try {
      setState("loading");
      const res = await fetch(`${apiBase()}/public/registration/config?eventId=${encodeURIComponent(eventId)}`);
      if (!res.ok) throw new Error(parseErrorMessage(await res.text()));
      const data: PublicConfig = await res.json();
      setConfig(data);
      setFormData({});
      if (!data.isOpen && data.reason === "full") setState("full");
      else if (!data.isOpen) setState("closed");
      else setState("form");
    } catch (e: any) {
      setErrorMsg(e.message);
      setState("error");
    }
  };

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const handleSelectEvent = (event: PublicEvent) => {
    setSelectedEvent(event);
    fetchConfig(event.id);
  };

  const handleBackToSelection = () => {
    setSelectedEvent(null);
    setConfig(null);
    setFormData({});
    setErrorMsg(null);
    setState("select");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !selectedEvent) return;
    setSubmitting(true); setErrorMsg(null);
    try {
      const res = await fetch(`${apiBase()}/public/registration/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: formData, website: honeypot, eventId: selectedEvent.id }),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(parseErrorMessage(text));
      const result = JSON.parse(text);
      setSuccessData({ message: result.message || "Registrasi berhasil!", guestId: result.guestId, queueNumber: result.queueNumber });
      setState("success");
    } catch (e: any) { setErrorMsg(e.message); }
    finally { setSubmitting(false); }
  };

  const formatDate = (date: string | null, time: string | null) => {
    if (!date) return null;
    const d = new Date(date);
    const formatted = d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    return time ? `${formatted} · ${time}` : formatted;
  };

  // Loading
  if (state === "loading") {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-6">
        <Loader2 className="animate-spin text-brand-primary" size={32} />
      </div>
    );
  }

  // No events available
  if (state === "no-events") {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-6">
        <Card variant="elevated" className="max-w-md w-full text-center space-y-4">
          <CalendarDays className="mx-auto text-brand-textMuted" size={48} />
          <h2 className="text-xl font-bold text-brand-text">Tidak Ada Event</h2>
          <p className="text-brand-textMuted text-sm">Saat ini belum ada event yang membuka pendaftaran publik.</p>
        </Card>
      </div>
    );
  }

  // Error
  if (state === "error") {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-6">
        <Card variant="elevated" className="max-w-md w-full text-center space-y-4">
          <XCircle className="mx-auto text-brand-danger" size={48} />
          <h2 className="text-xl font-bold text-brand-text">Gagal Memuat</h2>
          <p className="text-brand-textMuted text-sm">{errorMsg}</p>
          <Button variant="secondary" onClick={fetchEvents}>Coba Lagi</Button>
        </Card>
      </div>
    );
  }

  // Event selection
  if (state === "select") {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-4 md:p-6">
        <div className="w-full max-w-lg space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-primary/10 border border-brand-primary/20">
              <UserPlus className="text-brand-primary" size={28} />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-brand-text">Pilih Event</h1>
            <p className="text-brand-textMuted text-sm">Pilih event yang ingin Anda daftarkan</p>
          </div>
          <div className="space-y-3">
            {events.map((event) => (
              <Card
                key={event.id}
                variant="elevated"
                className="cursor-pointer hover:border-brand-primary/40 hover:shadow-gold-sm transition-all duration-200"
                onClick={() => handleSelectEvent(event)}
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center shrink-0">
                    <CalendarDays size={20} className="text-brand-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-brand-text">{event.name}</h3>
                    <div className="mt-1 space-y-1">
                      {event.date && (
                        <p className="text-sm text-brand-textMuted flex items-center gap-1.5">
                          <CalendarDays size={14} className="shrink-0" />
                          {formatDate(event.date, event.time)}
                        </p>
                      )}
                      {event.location && (
                        <p className="text-sm text-brand-textMuted flex items-center gap-1.5">
                          <MapPin size={14} className="shrink-0" />
                          {event.location}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Closed
  if (state === "closed" && config) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-6">
        <Card variant="elevated" className="max-w-md w-full text-center space-y-4">
          <Clock className="mx-auto text-brand-textMuted" size={48} />
          <h2 className="text-xl font-bold text-brand-text">{config.title}</h2>
          <p className="text-brand-textMuted">{config.closedMessage}</p>
          {events.length > 1 && (
            <Button variant="ghost" onClick={handleBackToSelection}>
              <ArrowLeft size={16} /> Pilih Event Lain
            </Button>
          )}
        </Card>
      </div>
    );
  }

  // Full
  if (state === "full" && config) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-6">
        <Card variant="elevated" className="max-w-md w-full text-center space-y-4">
          <Users className="mx-auto text-brand-warning" size={48} />
          <h2 className="text-xl font-bold text-brand-text">{config.title}</h2>
          <p className="text-brand-textMuted">{config.fullMessage}</p>
          {events.length > 1 && (
            <Button variant="ghost" onClick={handleBackToSelection}>
              <ArrowLeft size={16} /> Pilih Event Lain
            </Button>
          )}
        </Card>
      </div>
    );
  }

  // Success
  if (state === "success" && successData) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-6">
        <Card variant="elevated" className="max-w-md w-full text-center space-y-6">
          <CheckCircle className="mx-auto text-brand-success" size={56} />
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-brand-text">Registrasi Berhasil!</h2>
            <p className="text-brand-textMuted">{successData.message}</p>
          </div>
          {successData.guestId && (
            <div className="p-4 rounded-xl bg-brand-primary/10 border border-brand-primary/20 space-y-2">
              <div className="text-xs text-brand-textMuted uppercase tracking-wider">ID Peserta</div>
              <div className="text-2xl font-bold font-mono text-brand-primary">{successData.guestId}</div>
              {successData.queueNumber !== null && (
                <div className="text-sm text-brand-textMuted">No. Antrian: {successData.queueNumber}</div>
              )}
            </div>
          )}
          <p className="text-xs text-brand-textMuted">Simpan ID Peserta Anda untuk check-in di lokasi acara.</p>
        </Card>
      </div>
    );
  }

  // Form (default)
  const quotaPct = config && config.maxQuota > 0
    ? Math.min(100, (config.currentCount / config.maxQuota) * 100) : 0;

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4 md:p-6">
      <div className="w-full max-w-lg space-y-6">
        {/* Back button when multiple events */}
        {events.length > 1 && (
          <button
            onClick={handleBackToSelection}
            className="flex items-center gap-2 text-sm text-brand-textMuted hover:text-brand-text transition-colors"
          >
            <ArrowLeft size={16} />
            Pilih event lain
          </button>
        )}

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-primary/10 border border-brand-primary/20">
            <UserPlus className="text-brand-primary" size={28} />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-brand-text">{config?.title}</h1>
          {selectedEvent && (
            <p className="text-sm text-brand-primary font-medium">{selectedEvent.name}</p>
          )}
          {config?.description && <p className="text-brand-textMuted text-sm">{config.description}</p>}
        </div>

        {/* Quota progress */}
        {config && config.maxQuota > 0 && (
          <Card variant="glass" className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-brand-textMuted flex items-center gap-2"><Users size={16} /> Kuota</span>
              <span className="text-brand-text font-medium">{config.currentCount} / {config.maxQuota}</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-brand-primary transition-all duration-500" style={{ width: `${quotaPct}%` }} />
            </div>
            {config.remainingQuota !== null && config.remainingQuota > 0 && (
              <p className="text-xs text-brand-textMuted">Tersisa {config.remainingQuota} slot</p>
            )}
          </Card>
        )}

        {/* Form */}
        <Card variant="elevated" className="space-y-5">
          {errorMsg && (
            <div className="text-sm text-brand-danger bg-brand-danger/10 p-3 rounded-lg border border-brand-danger/20">{errorMsg}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            {config?.fields.map((field) => (
              <div key={field.key}>
                <Label htmlFor={`field-${field.key}`} className="mb-2">
                  {field.label}{field.required && <span className="text-brand-danger ml-1">*</span>}
                </Label>
                {field.type === "textarea" ? (
                  <Textarea id={`field-${field.key}`} value={formData[field.key] || ""}
                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                    placeholder={field.placeholder || ""} required={field.required} rows={3} />
                ) : (
                  <Input id={`field-${field.key}`} type="text" value={formData[field.key] || ""}
                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                    placeholder={field.placeholder || ""} required={field.required} />
                )}
              </div>
            ))}
            {/* Honeypot (hidden from humans) */}
            <input type="text" name="website" value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              style={{ position: "absolute", left: "-9999px", opacity: 0 }} tabIndex={-1} autoComplete="off" />
            <Button type="submit" size="lg" loading={submitting} className="w-full">
              {submitting ? "Mendaftarkan..." : "Daftar Sekarang"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
