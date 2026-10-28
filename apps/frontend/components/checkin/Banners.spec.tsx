import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EventChangeBanner, PendingSyncBanner } from './Banners';

describe('EventChangeBanner', () => {
  it('tidak merender apa pun tanpa pesan', () => {
    const { container } = render(<EventChangeBanner message={null} onDismiss={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('menampilkan pesan perubahan event', () => {
    render(<EventChangeBanner message="Event aktif berubah" onDismiss={() => {}} />);
    expect(screen.getByText('Event aktif berubah')).toBeInTheDocument();
  });

  it('memanggil onDismiss saat tombol tutup ditekan', async () => {
    const onDismiss = vi.fn();
    render(<EventChangeBanner message="Halo" onDismiss={onDismiss} />);

    await userEvent.click(screen.getByLabelText('Tutup notifikasi'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

describe('PendingSyncBanner', () => {
  it('tidak merender apa pun saat tidak ada antrean', () => {
    const { container } = render(<PendingSyncBanner count={null} onDismiss={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('menyebutkan jumlah antrean yang tersisa', () => {
    render(<PendingSyncBanner count={7} onDismiss={() => {}} />);
    expect(screen.getByText(/7 antrean sinkronisasi/)).toBeInTheDocument();
  });

  it('memanggil onDismiss saat ditutup', async () => {
    const onDismiss = vi.fn();
    render(<PendingSyncBanner count={1} onDismiss={onDismiss} />);

    await userEvent.click(screen.getByLabelText('Tutup peringatan'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
