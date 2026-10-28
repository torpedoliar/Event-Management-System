import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CheckinResults from './CheckinResults';
import type { Guest } from '@/lib/checkin/types';

const guest = (over: Partial<Guest> = {}): Guest => ({
  id: 'g1',
  queueNumber: 1,
  guestId: 'TAMU-001',
  name: 'Budi Santoso',
  tableLocation: 'Meja 1',
  checkedIn: false,
  photoUrl: null,
  ...over,
});

const baseProps = {
  selectedId: null,
  checking: false,
  checkingId: null,
  allowMultiplePerCounter: false,
  onCheckin: () => {},
};

describe('CheckinResults', () => {
  it('menampilkan keadaan siap saat belum ada hasil', () => {
    render(<CheckinResults {...baseProps} results={[]} />);

    expect(screen.getByText('Siap untuk check-in')).toBeInTheDocument();
    expect(screen.queryByText(/tamu ditemukan/)).not.toBeInTheDocument();
  });

  it('menampilkan jumlah tamu dan status check-in', () => {
    render(<CheckinResults {...baseProps} results={[guest()]} />);

    expect(screen.getByText('1 tamu ditemukan')).toBeInTheDocument();
    expect(screen.getByText('Budi Santoso')).toBeInTheDocument();
    expect(screen.getByText('TAMU-001')).toBeInTheDocument();
    expect(screen.getByText('Belum check-in')).toBeInTheDocument();
  });

  it('menampilkan status sudah check-in beserta jumlahnya', () => {
    render(
      <CheckinResults
        {...baseProps}
        results={[guest({ checkedIn: true, checkinCount: 3 })]}
      />,
    );

    expect(screen.getByText(/Sudah check-in/)).toBeInTheDocument();
    expect(screen.getByText(/3×/)).toBeInTheDocument();
  });

  it('menampilkan peringatan pilih tamu saat hasil lebih dari satu', () => {
    render(
      <CheckinResults
        {...baseProps}
        results={[guest({ id: 'a' }), guest({ id: 'b', name: 'Siti', guestId: 'TAMU-002' })]}
      />,
    );

    expect(screen.getByText('2 tamu ditemukan')).toBeInTheDocument();
    expect(screen.getByText('Pilih tamu yang benar di bawah')).toBeInTheDocument();
  });

  it('memanggil onCheckin dengan tamu yang dipilih', async () => {
    const onCheckin = vi.fn();
    const target = guest();
    render(<CheckinResults {...baseProps} onCheckin={onCheckin} results={[target]} />);

    await userEvent.click(screen.getByRole('button', { name: /check-in/i }));
    expect(onCheckin).toHaveBeenCalledWith(target);
  });

  it('menonaktifkan tombol saat proses check-in berjalan', () => {
    render(
      <CheckinResults
        {...baseProps}
        checking={true}
        checkingId="g1"
        results={[guest({ id: 'g1' })]}
      />,
    );

    expect(screen.getByRole('button', { name: /check-in/i })).toBeDisabled();
  });

  it('mengubah label menjadi "Check-in Ulang" pada mode per-counter', () => {
    render(
      <CheckinResults
        {...baseProps}
        allowMultiplePerCounter={true}
        results={[guest({ checkedIn: true, checkinCount: 1 })]}
      />,
    );

    expect(screen.getByRole('button', { name: /check-in ulang/i })).toBeInTheDocument();
  });
});
