import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SouvenirSelector from './SouvenirSelector';
import type { Souvenir } from '@/lib/souvenir/types';

const souvenir = (over: Partial<Souvenir> = {}): Souvenir => ({
  id: 's1',
  name: 'Tote Bag',
  quantity: 10,
  takenCount: 2,
  remaining: 8,
  ...over,
});

const baseProps = () => ({
  souvenirs: [souvenir(), souvenir({ id: 's2', name: 'Kaos', quantity: 5, takenCount: 5, remaining: 0 })],
  selectedId: '',
  onSelect: vi.fn(),
  disabled: false,
});

describe('SouvenirSelector', () => {
  it('tidak merender apa pun bila belum ada souvenir', () => {
    const { container } = render(<SouvenirSelector {...baseProps()} souvenirs={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('hanya menawarkan souvenir yang masih tersisa', () => {
    render(<SouvenirSelector {...baseProps()} />);

    expect(screen.getByRole('option', { name: /Tote Bag \(Sisa: 8\/10\)/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Kaos/ })).not.toBeInTheDocument();
  });

  it('menampilkan peringatan saat seluruh stok habis', () => {
    render(
      <SouvenirSelector
        {...baseProps()}
        souvenirs={[souvenir({ remaining: 0 })]}
      />,
    );

    expect(
      screen.getByText(/Semua stok souvenir sudah habis/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('menampilkan keterangan saat souvenir sudah dipilih', () => {
    render(<SouvenirSelector {...baseProps()} selectedId="s1" />);
    expect(
      screen.getByText('Pencarian akan otomatis memberikan souvenir ini'),
    ).toBeInTheDocument();
  });

  it('tidak menampilkan keterangan saat belum dipilih', () => {
    render(<SouvenirSelector {...baseProps()} />);
    expect(
      screen.queryByText('Pencarian akan otomatis memberikan souvenir ini'),
    ).not.toBeInTheDocument();
  });

  it('memanggil onSelect saat pilihan berubah', async () => {
    const props = baseProps();
    render(<SouvenirSelector {...props} />);

    await userEvent.selectOptions(screen.getByRole('combobox'), 's1');
    expect(props.onSelect).toHaveBeenCalledWith('s1');
  });

  it('menonaktifkan dropdown saat proses berjalan', () => {
    render(<SouvenirSelector {...baseProps()} disabled={true} />);
    expect(screen.getByRole('combobox')).toBeDisabled();
  });
});
