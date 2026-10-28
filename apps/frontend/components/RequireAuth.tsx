'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { getToken } from '../lib/api';

/**
 * Mendekode payload JWT tanpa verifikasi tanda tangan.
 * Verifikasi sesungguhnya dilakukan backend; di sini hanya untuk membaca `exp`
 * agar halaman tidak sempat ter-render dengan token yang sudah kedaluwarsa.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const json = decodeURIComponent(
      binary
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Token dianggap kedaluwarsa hanya jika `exp` terbukti sudah lewat.
 * Bila payload tidak dapat dibaca, biarkan backend yang memutuskan (401 → redirect).
 */
function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  const exp = payload?.exp;
  if (typeof exp !== 'number') return false;
  return exp * 1000 <= Date.now();
}

export default function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const token = getToken();

    if (!token) {
      router.replace('/admin/login');
      return;
    }

    if (isTokenExpired(token)) {
      // Bersihkan token mati agar tidak memicu 401 berulang di setiap request.
      localStorage.removeItem('token');
      router.replace('/admin/login');
      return;
    }

    setAuthChecked(true);
  }, [router]);

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-brand-primary border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
