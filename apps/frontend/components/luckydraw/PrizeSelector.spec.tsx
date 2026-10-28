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
    expect(screen.getByRole('option', { name: 'Sepeda (2/3)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'TV (0/1)' })).toBeInTheDocument();
  });

  it('menampilkan logo event bila ada', () => {
    render(
      <PrizeSelector
        logoUrl="/uploads/branding/logos/x.png"
        prizes={prizes}
        selectedPrizeId="p1"
        onSelectPrize={() => {}}
      />,
    );

    expect(screen.getByAltText('logo')).toBeInTheDocument();
  });

  it('tidak menampilkan logo bila tidak ada', () => {
    render(<PrizeSelector prizes={prizes} selectedPrizeId="p1" onSelectPrize={() => {}} />);
    expect(screen.queryByAltText('logo')).not.toBeInTheDocument();
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
