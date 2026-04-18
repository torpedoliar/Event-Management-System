import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiBase, parseErrorMessage } from "../api";

type Stats = { total: number; checkedIn: number; notCheckedIn: number };
type Event = { 
  id: string;
  name: string; 
  date: string; 
  location: string; 
  logoUrl: string | null;
  backgroundType?: 'NONE' | 'IMAGE' | 'VIDEO';
  backgroundImageUrl?: string | null;
  backgroundVideoUrl?: string | null;
  overlayOpacity?: number;
};

type Guest = {
  id: string;
  queueNumber: number;
  guestId: string;
  name: string;
  photoUrl?: string | null;
  tableLocation: string;
  company?: string | null;
  department?: string | null;
  division?: string | null;
  notes?: string | null;
  category?: string;
  checkedIn: boolean;
  checkedInAt?: string | null;
};

type GuestListResponse = {
  total: number;
  data: Guest[];
};

export const queryKeys = {
  stats: ["guests", "stats"] as const,
  activeEvent: ["events", "active"] as const,
  eventConfig: ["config", "event"] as const,
  guests: (params?: Record<string, string>) => ["guests", "list", params] as const,
  guest: (id: string) => ["guests", id] as const,
  history: (limit?: number) => ["guests", "history", limit] as const,
  companyStats: ["guests", "companyStats"] as const,
};

export function useGuestStats() {
  return useQuery({
    queryKey: queryKeys.stats,
    queryFn: () => apiFetch<Stats>("/guests/stats"),
  });
}

export function useActiveEvent() {
  return useQuery({
    queryKey: queryKeys.activeEvent,
    queryFn: () => apiFetch<Event>("/events/active"),
  });
}

export function useEventConfig() {
  return useQuery({
    queryKey: queryKeys.eventConfig,
    queryFn: async () => {
      const res = await fetch(`${apiBase()}/config/event`);
      if (!res.ok) throw new Error("Failed to fetch config");
      return res.json();
    },
  });
}

export function useGuests(params?: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  return useQuery({
    queryKey: queryKeys.guests(params),
    queryFn: () => apiFetch<GuestListResponse>(`/guests?${searchParams.toString()}`),
  });
}

export function useGuest(id: string) {
  return useQuery({
    queryKey: queryKeys.guest(id),
    queryFn: () => apiFetch<Guest>(`/guests/${id}`),
    enabled: !!id,
  });
}

export function useGuestHistory(limit = 10) {
  return useQuery({
    queryKey: queryKeys.history(limit),
    queryFn: async () => {
      const res = await fetch(`${apiBase()}/public/guests/history?limit=${limit}`);
      if (!res.ok) throw new Error("Failed to fetch history");
      return res.json() as Promise<Guest[]>;
    },
  });
}

export function useCompanyStats() {
  return useQuery({
    queryKey: queryKeys.companyStats,
    queryFn: () => apiFetch<Array<{ company: string; total: number; checkedIn: number; notCheckedIn: number }>>("/guests/company-stats"),
  });
}

export function useCheckIn() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ guestId, useInternalId }: { guestId: string; useInternalId?: boolean }) => {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const endpoint = useInternalId
        ? `${apiBase()}/public/guests/checkin-by-id`
        : `${apiBase()}/public/guests/checkin`;
      const body = useInternalId ? { id: guestId } : { guestId };

      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (res.status === 409) {
        const existing = await res.json();
        throw { type: "duplicate", guest: existing };
      }

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(parseErrorMessage(errorText));
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guests"] });
    },
  });
}

export function useUncheckIn() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ guestId, password, reason }: { guestId: string; password: string; reason: string }) => {
      return apiFetch(`/guests/${guestId}/uncheckin`, { 
        method: "POST",
        body: JSON.stringify({ password, reason }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guests"] });
    },
  });
}

export function useInvalidateQueries() {
  const queryClient = useQueryClient();
  
  return {
    invalidateStats: () => queryClient.invalidateQueries({ queryKey: queryKeys.stats }),
    invalidateGuests: () => queryClient.invalidateQueries({ queryKey: ["guests"] }),
    invalidateAll: () => queryClient.invalidateQueries(),
  };
}
