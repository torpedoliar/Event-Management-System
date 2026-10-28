/**
 * Menyisipkan header `X-Station-Id` pada setiap permintaan ke API.
 *
 * KENAPA
 * ------
 * Backend membatasi laju permintaan per **station**, bukan per IP. Tanpa header
 * ini, seluruh station di satu venue (yang biasanya berbagi satu IP publik/NAT)
 * akan masuk ke satu keranjang kuota yang sama, sehingga station yang memindai
 * cepat dapat memperlambat station lain.
 *
 * KENAPA INTERCEPTOR GLOBAL
 * -------------------------
 * Halaman kiosk memanggil `fetch` secara langsung di puluhan tempat (bukan lewat
 * `apiFetch`). Menambahkan header satu per satu ke setiap panggilan mudah
 * terlewat saat ada kode baru, sehingga pendekatan ini dipilih agar semua
 * permintaan API otomatis ikut — termasuk kode yang ditulis nanti.
 */

const STATION_ID_KEY = 'stationId';

let installed = false;

/** Menyimpan station aktif agar dapat dibaca sinkron oleh interceptor. */
export function setStationId(stationId: string | null | undefined): void {
  if (typeof window === 'undefined') return;
  try {
    if (stationId) {
      window.localStorage.setItem(STATION_ID_KEY, stationId);
    } else {
      window.localStorage.removeItem(STATION_ID_KEY);
    }
  } catch {
    // localStorage bisa diblokir (mode privat); station tetap berjalan tanpa header.
  }
}

export function getStationId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(STATION_ID_KEY);
  } catch {
    return null;
  }
}

function isApiRequest(input: RequestInfo | URL): boolean {
  let url: string;
  if (typeof input === 'string') url = input;
  else if (input instanceof URL) url = input.toString();
  else url = input.url;

  // Hanya same-origin API yang dilindungi; aset statis tidak perlu header.
  return url.startsWith('/api') || url.includes('/api/');
}

/**
 * Memasang interceptor sekali saja. Aman dipanggil berkali-kali.
 */
export function installStationFetchInterceptor(): void {
  if (installed || typeof window === 'undefined' || typeof window.fetch !== 'function') {
    return;
  }
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const stationId = getStationId();

      if (stationId && isApiRequest(input)) {
        const headers = new Headers(
          init?.headers ?? (input instanceof Request ? input.headers : undefined),
        );

        // Jangan menimpa header yang sudah diset pemanggil secara eksplisit.
        if (!headers.has('X-Station-Id')) {
          headers.set('X-Station-Id', stationId);
        }

        return originalFetch(input, { ...(init ?? {}), headers });
      }
    } catch {
      // Kegagalan menyisipkan header tidak boleh menggagalkan permintaan.
    }

    return originalFetch(input, init);
  };
}
