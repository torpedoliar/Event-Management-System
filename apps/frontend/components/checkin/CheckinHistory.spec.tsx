import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import CheckinHistory from './CheckinHistory';
import type { Guest } from '@/lib/checkin/types';

const guest = (over: Partial<Guest> = {}): Guest => ({
  id: 'g1',
  queueNumber: 12,
  guestId: 'TAMU-012',
  name: 'Budi Santoso',
  tableLocation: 'Meja 3',
  checkedIn: true,
  photoUrl: null,
  ...over,
});

describe('CheckinHistory', () => {
  it('menampilkan keadaan kosong beserta jumlah tamu nol', () => {
    render(<CheckinHistory history={[]} />);

    expect(screen.getByText('Riwayat Check-in Terbaru')).toBeInTheDocument();
    expect(screen.getByText('Belum ada riwayat check-in')).toBeInTheDocument();
    expect(screen.getByText('0 tamu')).toBeInTheDocument();
  });

  it('menampilkan nama, ID, lokasi meja, dan nomor antrean', () => {
    render(<CheckinHistory history={[guest()]} />);

    expect(screen.getByText('Budi Santoso')).toBeInTheDocument();
    expect(screen.getByText('TAMU-012')).toBeInTheDocument();
    expect(screen.getByText('Meja 3')).toBeInTheDocument();
    expect(screen.getByText('#12')).toBeInTheDocument();
    expect(screen.getByText('1 tamu')).toBeInTheDocument();
  });

  it('menampilkan foto bila tersedia dan placeholder bila tidak', () => {
    render(
      <CheckinHistory
        history={[
          guest({ id: 'a', name: 'Dengan Foto', photoUrl: '/uploads/photos/a.jpg' }),
          guest({ id: 'b', name: 'Tanpa Foto', photoUrl: null }),
        ]}
      />,
    );

    const img = screen.getByAltText('Dengan Foto');
    expect(img).toBeInTheDocument();
    // Placeholder ikon tidak punya alt text; pastikan tidak ada img untuk tamu kedua.
    expect(screen.queryByAltText('Tanpa Foto')).not.toBeInTheDocument();
  });

  it('menampilkan seluruh tamu dalam daftar', () => {
    const list = Array.from({ length: 4 }, (_, i) =>
      guest({ id: `g${i}`, name: `Tamu ${i}`, queueNumber: i + 1 }),
    );
    render(<CheckinHistory history={list} />);

    for (let i = 0; i < 4; i++) {
      expect(screen.getByText(`Tamu ${i}`)).toBeInTheDocument();
    }
    expect(screen.getByText('4 tamu')).toBeInTheDocument();
  });
});
