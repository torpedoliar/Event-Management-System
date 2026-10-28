import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PrizeSelector from './PrizeSelector';
import type { Prize } from '@/lib/luckydraw/types';

const prize = (over: Partial<Prize> = {}): Prize => ({
  id: 'p1',
  name: 'Sepeda',
  quantity: 3,
  winners: [],
  ...over,
});

const prizes: Prize[] = [
  prize({ id: 'p1', name: 'Sepeda', quantity: 3, winners: [{ id: 'w1' }, { id: 'w2' }] as any }),
  prize({ id: 'p2', name: 'TV', quantity: 1, winners: [] }),
];

describe('PrizeSelector', () => {
  it('menampilkan seluruh hadiah beserta sisa stok', () => {
    render(
      <PrizeSelector prizes={prizes} selectedPrizeId="p1" onSelectPrize={() => {}} />,
    );

    expect(screen.getByText('Lucky Draw')).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Sepeda · 2/3 pemenang' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'TV · 0/1 pemenang' })).toBeInTheDocument();
  });

  it('menampilkan logo event sebagai gambar dekoratif', () => {
    const { container } = render(
      <PrizeSelector
        logoUrl="/uploads/branding/logos/x.png"
        eventName="Gathering Nasional 2026"
        prizes={prizes}
        selectedPrizeId="p1"
        onSelectPrize={() => {}}
      />,
    );

    const logo = container.querySelector('.draw-event-mark img');
    expect(logo).toBeInTheDocument();
    // Logo dekoratif: nama event sudah dibacakan sebagai teks di sebelahnya,
    // jadi `alt` sengaja kosong agar tidak diumumkan dua kali.
    expect(logo).toHaveAttribute('alt', '');
    expect(screen.getByText('Gathering Nasional 2026')).toBeInTheDocument();
  });

  it('tidak menampilkan logo bila tidak ada', () => {
    const { container } = render(
      <PrizeSelector prizes={prizes} selectedPrizeId="p1" onSelectPrize={() => {}} />,
    );
    expect(container.querySelector('.draw-event-mark img')).not.toBeInTheDocument();
    expect(container.querySelector('.draw-event-monogram')).toBeInTheDocument();
  });

  it('memilih hadiah sesuai nilai terpilih', () => {
    render(<PrizeSelector prizes={prizes} selectedPrizeId="p2" onSelectPrize={() => {}} />);
    expect(screen.getByRole('combobox')).toHaveValue('p2');
  });

  it('memanggil onSelectPrize saat pilihan berubah', async () => {
    const onSelectPrize = vi.fn();
    render(
      <PrizeSelector prizes={prizes} selectedPrizeId="p1" onSelectPrize={onSelectPrize} />,
    );

    await userEvent.selectOptions(screen.getByRole('combobox'), 'p2');
    expect(onSelectPrize).toHaveBeenCalledWith('p2');
  });
});
