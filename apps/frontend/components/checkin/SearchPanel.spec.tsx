import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchPanel from './SearchPanel';

const baseProps = () => ({
  value: '',
  onChange: vi.fn(),
  onSubmit: vi.fn(),
  inputRef: createRef<HTMLInputElement>(),
  scanLogs: [],
  error: null as string | null,
  searching: false,
  checking: false,
  creatingGuest: false,
  onSearch: vi.fn(),
  onScanClick: vi.fn(),
  onSettingsClick: vi.fn(),
});

describe('SearchPanel', () => {
  it('menampilkan kolom pencarian dan tombol utama', () => {
    render(<SearchPanel {...baseProps()} />);

    expect(
      screen.getByPlaceholderText('Pindai QR, atau ketik ID / nama tamu'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cari & check-in/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /scan qr/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pengaturan' })).toBeInTheDocument();
  });

  it('memanggil onSubmit saat Enter ditekan dengan isi', async () => {
    const props = baseProps();
    props.value = 'TAMU-001';
    render(<SearchPanel {...props} />);

    const input = screen.getByPlaceholderText(/Pindai QR/);
    await userEvent.type(input, '{Enter}');

    expect(props.onSubmit).toHaveBeenCalledTimes(1);
  });

  it('tidak memanggil onSubmit untuk input kosong atau hanya spasi', async () => {
    const props = baseProps();
    props.value = '   ';
    render(<SearchPanel {...props} />);

    await userEvent.type(screen.getByPlaceholderText(/Pindai QR/), '{Enter}');
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it('menampilkan pesan error bila ada', () => {
    const props = baseProps();
    props.error = 'Tamu tidak ditemukan';
    render(<SearchPanel {...props} />);

    expect(screen.getByText('Tamu tidak ditemukan')).toBeInTheDocument();
  });

  it('menonaktifkan tombol saat proses berjalan', () => {
    const props = baseProps();
    props.searching = true;
    render(<SearchPanel {...props} />);

    expect(screen.getByRole('button', { name: /mencari/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /scan qr/i })).toBeDisabled();
  });

  it('mengubah label tombol sesuai status proses', () => {
    const props = baseProps();
    props.creatingGuest = true;
    const { rerender } = render(<SearchPanel {...props} />);
    expect(screen.getByRole('button', { name: /membuat tamu/i })).toBeInTheDocument();

    const props2 = baseProps();
    props2.checking = true;
    rerender(<SearchPanel {...props2} />);
    expect(screen.getByRole('button', { name: /check-in\.\.\./i })).toBeInTheDocument();
  });

  it('meneruskan klik ke handler yang sesuai', async () => {
    const props = baseProps();
    render(<SearchPanel {...props} />);

    await userEvent.click(screen.getByRole('button', { name: /scan qr/i }));
    expect(props.onScanClick).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole('button', { name: 'Pengaturan' }));
    expect(props.onSettingsClick).toHaveBeenCalledTimes(1);
  });
});
