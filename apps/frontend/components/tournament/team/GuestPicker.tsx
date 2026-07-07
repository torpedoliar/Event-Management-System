"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, User, Loader2 } from "lucide-react";
import { eligibleGuestApi } from "@/lib/tournament-api";
import type { EligibleGuest } from "@/types/tournament.types";

interface GuestPickerProps {
  tournamentId: string;
  value?: EligibleGuest | null;
  onChange: (guest: EligibleGuest | null) => void;
  disabled?: boolean;
}

export function GuestPicker({ tournamentId, value, onChange, disabled }: GuestPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<EligibleGuest[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<any>(null);

  const search = useCallback((q: string) => {
    setLoading(true);
    eligibleGuestApi.getEligible(tournamentId, q)
      .then(setResults).catch(() => setResults([])).finally(() => setLoading(false));
  }, [tournamentId]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { if (open) search(query); }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, open, search]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const selectGuest = (g: EligibleGuest) => {
    onChange(g);
    setOpen(false);
    setQuery("");
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter" && open && results.length > 0) {
      e.preventDefault();
      selectGuest(results[highlightIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  if (value) {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg bg-brand-bg border border-brand-border">
        <div className="flex items-center gap-2">
          <User size={16} className="text-brand-primary" />
          <div>
            <p className="text-sm font-medium text-brand-text">{value.name}</p>
            <p className="text-xs text-brand-textMuted">{value.guestId}{value.company ? ` · ${value.company}` : ""}</p>
          </div>
        </div>
        {!disabled && (
          <button type="button" onClick={() => onChange(null)} className="p-1 rounded-md text-brand-textMuted hover:text-brand-danger hover:bg-brand-danger/10" aria-label="Clear">
            <X size={16} />
          </button>
        )}
      </div>
    );
  }
  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-textMuted pointer-events-none" />
        <input type="text" value={query} disabled={disabled}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setHighlightIdx(0); }}
          onFocus={() => { setOpen(true); search(""); }} onKeyDown={handleKey}
          placeholder="Cari tamu dari data event..."
          className="w-full pl-10 pr-4 py-2.5 bg-brand-bg border border-brand-border rounded-lg text-brand-text placeholder-brand-textMuted focus:outline-none focus:ring-2 focus:ring-brand-primary" />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-brand-textMuted" />}
      </div>
      {open && !loading && results.length === 0 && (
        <div className="absolute z-50 w-full mt-1 p-3 bg-brand-surface border border-brand-border rounded-lg shadow-lg text-sm text-brand-textMuted">
          {query ? "Tidak ada tamu ditemukan" : "Ketik untuk mencari tamu"}
        </div>
      )}
      {open && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-brand-surface border border-brand-border rounded-lg shadow-lg">
          {results.map((g, i) => (
            <li key={g.id}>
              <button type="button" onMouseEnter={() => setHighlightIdx(i)} onClick={() => selectGuest(g)}
                className={`w-full text-left px-3 py-2.5 transition-colors ${i === highlightIdx ? "bg-brand-primary/10" : "hover:bg-white/[0.04]"}`}>
                <p className="text-sm font-medium text-brand-text">{g.name}</p>
                <p className="text-xs text-brand-textMuted">{g.guestId}{g.company ? ` · ${g.company}` : ""}{g.checkedIn ? " · Checked-in" : ""}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
export default GuestPicker;
