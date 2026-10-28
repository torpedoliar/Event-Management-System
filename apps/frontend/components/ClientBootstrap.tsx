'use client';

import { useEffect } from 'react';
import { installStationFetchInterceptor } from '@/lib/station-fetch';

/**
 * Menjalankan inisialisasi yang hanya boleh terjadi di browser.
 * Saat ini: interceptor fetch untuk header X-Station-Id.
 */
export default function ClientBootstrap() {
  useEffect(() => {
    installStationFetchInterceptor();
  }, []);

  return null;
}
