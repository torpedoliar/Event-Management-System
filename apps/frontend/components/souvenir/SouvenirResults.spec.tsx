import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SouvenirResults from './SouvenirResults';
import PrizeCollection from './PrizeCollection';
import type { Guest, PrizeWin, Souvenir } from '@/lib/souvenir/types';

const guest = (over: Partial<Guest> = {}): Guest => ({
  id: 'g1',
  queueNumber: 1,
  guestId: 'TAMU-001',
  name: 'Budi',
  tableLocation: 'Meja 1',
  checkedIn: true,
  souvenirTaken: false,
  photoUrl: null,
  ...over,
});

const souvenir = (over: Partial<Souvenir> = {}): Souvenir => ({
  id: 's1',
  name: 'Tote Bag',
  quantity: 10,
  takenCount: 0,
  remaining: 10,
  ...over,
});

const prizeWin = (over: Partial<PrizeWin> = {}): PrizeWin => ({
  id: 'pw1',
  guestId: 'g1',
  prizeId: 'p1',
  wonAt: '2026-10-27T09:00:00Z',
  prize: { id: 'p1', name: 'Sepeda', category: 'UTAMA' },
  collection: null,
  ...over,
});

const baseResults = () => ({
  results: [guest()],
  selectedId: null,
  souvenirs: [souvenir()],
  processing: false,
  processingId: null,
  onSelect: vi.fn(),
  onToggleSouvenir: vi.fn(),
});

describe('SouvenirResults', () => {
  it('menampilkan keadaan kosong tanpa hasil', () => {
    render(<SouvenirResults {...baseResults()} results={[]} />);
    expect(
      screen.getByText('Cari tamu untuk memproses pengambilan souvenir'),
    ).toBeInTheDocument();
  });

  it('menampilkan data tamu dan tombol ambil souvenir', () => {
    render(<SouvenirResults {...baseResults()} />);

    expect(screen.getByText('Budi')).toBeInTheDocument();
    expect(screen.getByText('TAMU-001')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ambil souvenir/i })).toBeEnabled();
  });

  it('menandai tamu yang sudah mengambil souvenir', () => {
    render(<SouvenirResults {...baseResults()} results={[guest({ souvenirTaken: true })]} />);
    expect(screen.getByRole('button', { name: /^sudah diambil$/i })).toBeInTheDocument();
  });

  it('menyembunyikan tombol saat stok habis, tetapi tetap menandai yang sudah diambil', () => {
    render(
      <SouvenirResults
        {...baseResults()}
        souvenirs={[souvenir({ remaining: 0 })]}
        results={[guest({ souvenirTaken: true })]}
      />,
    );

    expect(screen.queryByRole('button', { name: /ambil souvenir/i })).not.toBeInTheDocument();
    expect(screen.getByText('Sudah diambil')).toBeInTheDocument();
  });

  it('memanggil onSelect saat kartu diklik dan onToggleSouvenir saat tombol ditekan', async () => {
    const props = baseResults();
    render(<SouvenirResults {...props} />);

    await userEvent.click(screen.getByText('Budi'));
    expect(props.onSelect).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole('button', { name: /ambil souvenir/i }));
    expect(props.onToggleSouvenir).toHaveBeenCalledTimes(1);
    // Klik tombol tidak boleh ikut memilih kartu (stopPropagation).
    expect(props.onSelect).toHaveBeenCalledTimes(1);
  });

  it('menonaktifkan tombol saat sedang memproses', () => {
    render(
      <SouvenirResults {...baseResults()} processing={true} processingId="g1" />,
    );
    expect(screen.getByRole('button', { name: /memproses/i })).toBeDisabled();
  });
});

describe('PrizeCollection', () => {
  const basePrizes = () => ({
    uncollected: [prizeWin()],
    collected: [],
    showPrizes: true,
    onTogglePrizes: vi.fn(),
    collectingPrize: null as string | null,
    onCollectPrize: vi.fn(),
    onPrintReceipt: vi.fn(),
  });

  it('menampilkan ringkasan jumlah hadiah', () => {
    render(<PrizeCollection {...basePrizes()} />);
    expect(screen.getByText(/1 belum diambil, 0 sudah diambil/)).toBeInTheDocument();
  });

  it('tidak menampilkan daftar saat dilipat', () => {
    render(<PrizeCollection {...basePrizes()} showPrizes={false} />);
    expect(screen.queryByText(/Belum Diambil/)).not.toBeInTheDocument();
  });

  it('menampilkan hadiah yang belum diambil beserta tombol aksi', async () => {
    const props = basePrizes();
    render(<PrizeCollection {...props} />);

    expect(screen.getByText('Sepeda')).toBeInTheDocument();
    expect(screen.getByText(/Hadiah Utama/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /ambil hadiah ini/i }));
    expect(props.onCollectPrize).toHaveBeenCalledWith('pw1');

    await userEvent.click(screen.getByRole('button', { name: /cetak tanda terima/i }));
    expect(props.onPrintReceipt).toHaveBeenCalledWith(props.uncollected[0]);
  });

  it('menampilkan hadiah yang sudah diambil beserta keterangannya', () => {
    render(
      <PrizeCollection
        {...basePrizes()}
        uncollected={[]}
        collected={[
          prizeWin({
            collection: {
              id: 'c1',
              collectedAt: '2026-10-27T10:00:00Z',
              collectedByName: 'Admin A',
            },
          }),
        ]}
      />,
    );

    expect(screen.getByText(/Sudah Diambil:/)).toBeInTheDocument();
    expect(screen.getByText(/oleh Admin A/)).toBeInTheDocument();
  });

  it('memanggil onTogglePrizes saat header diklik', async () => {
    const props = basePrizes();
    render(<PrizeCollection {...props} />);

    await userEvent.click(screen.getByText(/Hadiah Lucky Draw/));
    expect(props.onTogglePrizes).toHaveBeenCalledTimes(1);
  });
});
