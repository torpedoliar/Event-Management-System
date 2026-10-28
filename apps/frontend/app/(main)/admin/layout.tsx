'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import RequireAuth from '@/components/RequireAuth';

/**
 * Route admin yang boleh diakses tanpa login.
 * Semua route lain di bawah /admin WAJIB melewati RequireAuth.
 */
const PUBLIC_ADMIN_ROUTES = ['/admin/login'];

/**
 * Layout penjaga seluruh area admin.
 *
 * Sebelumnya proteksi dipasang per-halaman (14 halaman memakai RequireAuth,
 * 6 halaman terlewat: system, settings/email, dan seluruh tournaments/*).
 * Pola per-halaman bersifat fail-open: halaman baru otomatis tidak terlindungi
 * sampai seseorang ingat menambahkannya. Layout ini membaliknya menjadi
 * fail-closed — halaman baru langsung aman secara default.
 *
 * Catatan: perlindungan ini bersifat client-side untuk kenyamanan UX.
 * Otorisasi sesungguhnya tetap dilakukan backend lewat JwtAuthGuard pada
 * setiap endpoint.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '';

  const isPublic = PUBLIC_ADMIN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if (isPublic) {
    return <>{children}</>;
  }

  return <RequireAuth>{children}</RequireAuth>;
}
