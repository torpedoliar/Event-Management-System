/**
 * Tipe yang dipakai halaman kiosk souvenir.
 *
 * Dipisahkan dari komponen agar dapat dipakai ulang oleh komponen anak.
 */

export type EventConfig = {
  id: string;
  name: string;
  date?: string | null;
  location?: string | null;
  logoUrl?: string | null;
  backgroundType: 'NONE' | 'IMAGE' | 'VIDEO';
  backgroundImageUrl?: string | null;
  backgroundVideoUrl?: string | null;
  overlayOpacity: number;
  checkinPopupTimeoutMs?: number;
  autoCreateGuestOnSouvenir?: boolean;
  requireCheckinForSouvenir?: boolean;
};

export type SouvenirTakeInfo = {
  souvenirName: string;
  takenAt: string;
  takenByName?: string;
};

export type Guest = {
  id: string;
  queueNumber: number;
  guestId: string;
  name: string;
  photoUrl?: string | null;
  tableLocation: string;
  company?: string | null;
  division?: string | null;
  notes?: string | null;
  checkedIn: boolean;
  checkedInAt?: string | null;
  souvenirTaken: boolean;
};

export type PrizeWin = {
  id: string;
  guestId: string;
  prizeId: string;
  wonAt: string;
  prize: {
    id: string;
    name: string;
    description?: string;
    category: string;
  };
  collection?: {
    id: string;
    collectedAt: string;
    collectedByName?: string;
  } | null;
};

export type Souvenir = {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  takenCount: number;
  remaining: number;
};
