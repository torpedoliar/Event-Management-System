import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SouvenirConfirmation, SouvenirAlreadyTaken } from './SouvenirPopups';
import type { Guest } from '@/lib/souvenir/types';

const guest = (over: Partial<Guest> = {}): Guest => ({
  id: 'g1',
  queueNumber: 7,
  guestId: 'TAMU-007',
  name: 'Dewi Lestari',
  tableLocation: 'Meja 2',
  checkedIn: true,
  souvenirTaken: true,
  photoUrl: null,
  ...over,
});

describe('SouvenirConfirmation', () => {
  it('tidak merender apa pun tanpa tamu', () => {
    const { container } = render(<SouvenirConfirmation guest={null} onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('menampilkan identitas tamu dan status pengambilan', () => {
    render(<SouvenirConfirmation guest={guest()} onClose={() => {}} />);

    expect(screen.getByText('Souvenir diambil')).toBeInTheDocument();
    expect(screen.getByText('Dewi Lestari')).toBeInTheDocument();
    expect(screen.getByText('TAMU-007')).toBeInTheDocument();
    expect(screen.getByText('Meja 2')).toBeInTheDocument();
    expect(screen.getByText('Meja 2')).toBeInTheDocument();
  });

  it('menampilkan placeholder saat foto tidak ada', () => {
    render(<SouvenirConfirmation guest={guest()} onClose={() => {}} />);
    expect(screen.queryByAltText('Dewi Lestari')).not.toBeInTheDocument();
  });

  it('menampilkan foto bila tersedia', () => {
    render(
      <SouvenirConfirmation
        guest={guest({ photoUrl: '/uploads/photos/x.jpg' })}
        onClose={() => {}}
      />,
    );
    expect(screen.getByAltText('Dewi Lestari')).toBeInTheDocument();
  });

  it('memanggil onClose saat Tutup ditekan', async () => {
    const onClose = vi.fn();
    render(<SouvenirConfirmation guest={guest()} onClose={onClose} />);

    await userEvent.click(screen.getByRole('button', { name: /tutup/i }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('SouvenirAlreadyTaken', () => {
  const info = {
    guest: guest(),
    takes: [
      { souvenirName: 'Tote Bag', takenAt: '2026-10-27T09:00:00Z', takenByName: 'Admin A' },
      { souvenirName: 'Kaos', takenAt: '2026-10-27T09:30:00Z' },
    ],
  };

  it('tidak merender apa pun tanpa info', () => {
    const { container } = render(<SouvenirAlreadyTaken info={null} onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('menampilkan peringatan dan identitas tamu', () => {
    render(<SouvenirAlreadyTaken info={info} onClose={() => {}} />);

    expect(screen.getByText('Souvenir sudah diambil')).toBeInTheDocument();
    expect(screen.getByText('Dewi Lestari')).toBeInTheDocument();
    expect(screen.getByText('TAMU-007')).toBeInTheDocument();
  });

  it('menampilkan seluruh riwayat pengambilan', () => {
    render(<SouvenirAlreadyTaken info={info} onClose={() => {}} />);

    expect(screen.getByText('Tote Bag')).toBeInTheDocument();
    expect(screen.getByText('Kaos')).toBeInTheDocument();
    expect(screen.getByText(/Admin A/)).toBeInTheDocument();
  });

  it('memanggil onClose saat Mengerti ditekan', async () => {
    const onClose = vi.fn();
    render(<SouvenirAlreadyTaken info={info} onClose={onClose} />);

    await userEvent.click(screen.getByRole('button', { name: /mengerti/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
