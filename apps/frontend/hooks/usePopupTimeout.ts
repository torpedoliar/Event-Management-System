'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * Timer untuk menutup popup hasil check-in secara otomatis.
 *
 * Sebelumnya timer ini dikelola langsung di dalam halaman tanpa pembersihan
 * saat komponen dilepas, sehingga callback-nya masih bisa berjalan dan
 * memanggil setState pada komponen yang sudah tidak ada.
 *
 * @param timeoutMs durasi tampil popup
 * @param onTimeout aksi saat waktu habis (mis. menutup popup)
 */
export function usePopupTimeout(timeoutMs: number, onTimeout: () => void) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Simpan callback terbaru agar `start` tidak perlu dibuat ulang setiap render
  // ketika pemanggil mengirim fungsi inline.
  const onTimeoutRef = useRef(onTimeout);
  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  const clear = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      onTimeoutRef.current();
    }, timeoutMs);
  }, [timeoutMs]);

  // Bersihkan saat unmount agar tidak ada timer yang tertinggal.
  useEffect(() => clear, [clear]);

  return { start, clear, timeoutRef };
}
