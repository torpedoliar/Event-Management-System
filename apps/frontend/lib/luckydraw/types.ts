/**
 * Tipe yang dipakai halaman lucky draw.
 */

export interface Prize {
  id: string;
  name: string;
  description?: string;
  category?: string;
  quantity: number;
  winners: any[];
  allowMultipleWins?: boolean;
}

export interface Guest {
  id: string;
  guestId?: string;
  name: string;
  company?: string;
  division?: string;
  photoUrl?: string;
  queueNumber: number;
}

/** Tamu yang berhak mengikuti undian pada panel kanan. */
export interface EligibleGuest {
  id: string;
  guestId: string;
  name: string;
  queueNumber: number;
  company?: string;
  division?: string;
  photoUrl?: string;
  /** Nama hadiah yang sudah dimenangkan. */
  wonPrizes: string[];
}

export interface EligibleGuestsResponse {
  data: EligibleGuest[];
  total: number;
  eligible: number;
  won: number;
  totalCheckedIn: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Konfigurasi tingkat drama animasi per kategori hadiah. */
export interface DramaConfig {
  spinDuration: number;
  tickerSpeedStart: number;
  tickerSpeedMin: number;
  slowdownStages: number[];
  enableScreenFlash: boolean;
  enableDarkReveal: boolean;
  enableScreenShake: boolean;
  enableScanlines: boolean;
  buttonLabel: string;
  buttonExtraClass: string;
}
