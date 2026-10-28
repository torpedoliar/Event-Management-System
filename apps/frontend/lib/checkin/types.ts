/**
 * Tipe yang dipakai halaman kiosk check-in.
 *
 * Dipisahkan dari komponen agar dapat dipakai ulang oleh komponen anak dan
 * diuji tanpa harus me-render seluruh halaman.
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
  autoCreateGuestOnCheckin?: boolean;
  enablePhotoCapture?: boolean;
  allowMultipleCheckinPerCounter?: boolean;
  allowOfflineMode?: boolean;
  offlineSyncInterval?: number;
  offlineQueueLimit?: number;
};

export type GuestCheckin = {
  id: string;
  checkinAt: string;
  checkinByName?: string;
  counterName?: string;
};

export type Guest = {
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
  checkedIn: boolean;
  checkedInAt?: string | null;
  checkedInByName?: string | null;
  checkinCount?: number;
  checkins?: GuestCheckin[];
  alreadyCheckedByThisAdmin?: boolean;
  maxReached?: boolean;
  message?: string;
};

export type ScanLogItem = {
  id: string;
  guestIdOrName: string;
  status: 'SUCCESS' | 'DUPLICATE' | 'NOT_FOUND' | 'ERROR';
  message: string;
  timestamp: Date;
};
