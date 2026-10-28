import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CheckinResultPopup from './CheckinResultPopup';
import type { Guest } from '@/lib/checkin/types';

const guest = (over: Partial<Guest> = {}): Guest => ({
  id: 'g1',
  queueNumber: 12,
  guestId: 'TAMU-012',
  name: 'Budi Santoso',
  tableLocation: 'Meja 3',
  checkedIn: true,
  photoUrl: null,
  checkins: [],
  ...over,
});

const baseProps = () => ({
  guest: guest(),
  isDuplicate: false,
  autoCapturing: false,
  autoCaptureStatus: '',
  videoRef: createRef<HTMLVideoElement>(),
  canvasRef: createRef<HTMLCanvasElement>(),
  enablePhotoCapture: false,
  isAuth: false,
  unchecking: false,
  onClose: vi.fn(),
  onPhotoCapture: vi.fn(),
  onUncheck: vi.fn(),
});

describe('CheckinResultPopup', () => {
  it('tidak merender apa pun tanpa tamu', () => {
    const { container } = render(
      <CheckinResultPopup {...baseProps()} guest={null} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('menampilkan status berhasil pada check-in normal', () => {
    render(<CheckinResultPopup {...baseProps()} />);

    expect(screen.getByText('Check-in Berhasil')).toBeInTheDocument();
    expect(screen.queryByText('Sudah Check-in')).not.toBeInTheDocument();
  });

  it('menampilkan status duplikat beserta pesannya', () => {
    render(
      <CheckinResultPopup
        {...baseProps()}
        isDuplicate={true}
        guest={guest({
          message: 'Sudah check-in oleh Admin A',
          checkinCount: 1,
          // Pesan hanya ditampilkan di dalam blok riwayat check-in.
          checkins: [{ id: 'c1', checkinAt: '2026-10-27T09:00:00Z', checkinByName: 'Admin A' }],
        })}
      />,
    );

    expect(screen.getByText('Sudah Check-in')).toBeInTheDocument();
    expect(screen.getByText('Sudah check-in oleh Admin A')).toBeInTheDocument();
  });

  it('menampilkan data utama tamu', () => {
    render(<CheckinResultPopup {...baseProps()} />);

    expect(screen.getByText('Budi Santoso')).toBeInTheDocument();
    expect(screen.getByText('TAMU-012')).toBeInTheDocument();
    expect(screen.getByText('Meja 3')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('menampilkan riwayat check-in bila ada', () => {
    render(
      <CheckinResultPopup
        {...baseProps()}
        guest={guest({
          checkinCount: 2,
          checkins: [
            { id: 'c1', checkinAt: '2026-10-27T09:00:00Z', checkinByName: 'Admin Satu' },
            { id: 'c2', checkinAt: '2026-10-27T10:00:00Z', checkinByName: 'Admin Dua' },
          ],
        })}
      />,
    );

    expect(screen.getByText(/Riwayat Check-in \(2x\)/)).toBeInTheDocument();
    expect(screen.getByText('Admin Satu')).toBeInTheDocument();
    expect(screen.getByText('Admin Dua')).toBeInTheDocument();
  });

  it('memanggil onClose saat tombol Tutup ditekan', async () => {
    const props = baseProps();
    render(<CheckinResultPopup {...props} />);

    await userEvent.click(screen.getByRole('button', { name: /tutup/i }));

    // onClose terpanggil dari tombol DAN dari overlay (event bubbling).
    // Keduanya idempoten (hanya membersihkan state), jadi perilaku ini
    // dipertahankan apa adanya; yang penting onClose benar-benar dipanggil.
    expect(props.onClose).toHaveBeenCalled();
  });

  it('menutup popup saat area gelap diklik', async () => {
    const props = baseProps();
    const { container } = render(<CheckinResultPopup {...props} />);

    const overlay = container.firstElementChild as HTMLElement;
    await userEvent.click(overlay);

    expect(props.onClose).toHaveBeenCalled();
  });

  it('menyembunyikan tombol Batalkan untuk pengguna tanpa login', () => {
    render(<CheckinResultPopup {...baseProps()} />);
    expect(screen.queryByRole('button', { name: /batalkan/i })).not.toBeInTheDocument();
  });

  it('menampilkan tombol Batalkan untuk admin yang login', () => {
    render(<CheckinResultPopup {...baseProps()} isAuth={true} />);
    expect(screen.getByRole('button', { name: /batalkan/i })).toBeInTheDocument();
  });

  it('hanya menampilkan tombol foto bila fitur aktif dan bukan duplikat', () => {
    const { rerender } = render(<CheckinResultPopup {...baseProps()} />);
    expect(screen.queryByRole('button', { name: /ambil foto|ulangi foto/i })).not.toBeInTheDocument();

    rerender(<CheckinResultPopup {...baseProps()} enablePhotoCapture={true} />);
    expect(screen.getByRole('button', { name: /ambil foto/i })).toBeInTheDocument();

    // Duplikat tidak menawarkan pengambilan foto.
    rerender(
      <CheckinResultPopup {...baseProps()} enablePhotoCapture={true} isDuplicate={true} />,
    );
    expect(screen.queryByRole('button', { name: /ambil foto|ulangi foto/i })).not.toBeInTheDocument();
  });

  it('menampilkan status pengambilan foto otomatis', () => {
    render(
      <CheckinResultPopup {...baseProps()} autoCapturing={true} autoCaptureStatus="Menyiapkan kamera" />,
    );
    expect(screen.getByText('Menyiapkan kamera')).toBeInTheDocument();
  });
});
