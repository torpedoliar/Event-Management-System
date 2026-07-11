"use client";
import { useEffect, useState, useCallback } from "react";
import { apiBase, parseErrorMessage } from "@/lib/api";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Label from "@/components/ui/Label";
import Button from "@/components/ui/Button";
import { UserPlus, Loader2, CheckCircle, XCircle, Users, Clock } from "lucide-react";

interface RegistrationField {
  key: string; label: string; required: boolean; type: string; placeholder?: string;
}
interface PublicConfig {
  isActive: boolean; isOpen: boolean; reason: string | null;
  maxQuota: number; currentCount: number; remainingQuota: number | null;
  fields: RegistrationField[]; title: string; description?: string | null;
  successMessage: string; closedMessage: string; fullMessage: string;
}
type PageState = "loading" | "form" | "closed" | "full" | "success" | "error";

export default function PublicRegistrationPage() {
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [state, setState] = useState<PageState>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{ message: string; guestId: string | null; queueNumber: number | null } | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase()}/public/registration/config`);
      if (!res.ok) throw new Error(parseErrorMessage(await res.text()));
      const data: PublicConfig = await res.json();
      setConfig(data);
      if (!data.isOpen && data.reason === "full") setState("full");
      else if (!data.isOpen) setState("closed");
      else setState("form");
    } catch (e: any) {
      setErrorMsg(e.message); setState("error");
    }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true); setErrorMsg(null);
    try {
      const res = await fetch(`${apiBase()}/public/registration/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: formData, website: honeypot }),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(parseErrorMessage(text));
      const result = JSON.parse(text);
      setSuccessData({ message: result.message || "Registrasi berhasil!", guestId: result.guestId, queueNumber: result.queueNumber });
      setState("success");
    } catch (e: any) { setErrorMsg(e.message); }
    finally { setSubmitting(false); }
  };

  // Loading
  if (state === "loading") {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-6">
        <Loader2 className="animate-spin text-brand-primary" size={32} />
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
          <Button variant="secondary" onClick={fetchConfig}>Coba Lagi</Button>
        </Card>
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
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-primary/10 border border-brand-primary/20">
            <UserPlus className="text-brand-primary" size={28} />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-brand-text">{config?.title}</h1>
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
