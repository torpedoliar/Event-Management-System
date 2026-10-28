'use client';

import type { ReactNode } from 'react';

/**
 * Shell halaman admin.
 *
 * Menyatukan lebar, padding, dan jarak antar-blok supaya semua halaman admin
 * terasa seperti satu instrumen, bukan dua belas halaman berbeda.
 */
export default function AdminPage({
  children,
  width = 'wide',
}: {
  children: ReactNode;
  width?: 'wide' | 'narrow';
}) {
  return <div className={`admin-page ${width === 'narrow' ? 'is-narrow' : ''}`}>{children}</div>;
}

/**
 * Kepala halaman admin: ikon, judul, keterangan singkat, dan aksi utama.
 *
 * Deskripsi sebaiknya menjawab "halaman ini untuk apa", bukan mengulang judul.
 */
export function AdminPageHeader({
  icon,
  title,
  description,
  actions,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="admin-header">
      <div className="admin-header-text">
        <h1 className="admin-title">
          {icon && (
            <span className="admin-title-icon" aria-hidden="true">
              {icon}
            </span>
          )}
          {title}
        </h1>
        {description && <p className="admin-sub">{description}</p>}
      </div>
      {actions && <div className="admin-actions">{actions}</div>}
    </header>
  );
}

/**
 * Baris angka ringkas. Nilai memakai angka tabular agar tidak "menari" saat
 * data berubah, dan label duduk di atasnya supaya bisa dipindai cepat.
 */
export function AdminStats({
  items,
}: {
  items: { label: string; value: ReactNode; tone?: 'default' | 'ok' | 'warn' }[];
}) {
  return (
    <dl className="admin-stats">
      {items.map((item) => (
        <div key={item.label} className={`admin-stat ${item.tone ? `is-${item.tone}` : ''}`}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
