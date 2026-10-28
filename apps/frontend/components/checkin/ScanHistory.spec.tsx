import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import ScanHistory from './ScanHistory';
import type { ScanLogItem } from '@/lib/checkin/types';

/**
 * Tes komponen hasil ekstraksi.
 *
 * Tujuannya bukan menguji styling, melainkan memastikan pemisahan dari
 * halaman check-in tidak menghilangkan perilaku: daftar kosong tidak
 * menampilkan apa pun, dan status scan tetap dibedakan warnanya.
 */

const log = (over: Partial<ScanLogItem> = {}): ScanLogItem => ({
  id: '1',
  guestIdOrName: 'TAMU-001',
  status: 'SUCCESS',
  message: 'Berhasil',
  timestamp: new Date('2026-10-27T10:00:00Z'),
  ...over,
});

describe('ScanHistory', () => {
  it('tidak merender apa pun saat riwayat kosong', () => {
    const { container } = render(<ScanHistory logs={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('menampilkan judul dan entri scan', () => {
    render(<ScanHistory logs={[log()]} />);

    expect(screen.getByText('Riwayat Scan')).toBeInTheDocument();
    expect(screen.getByText('TAMU-001')).toBeInTheDocument();
    expect(screen.getByText('Berhasil')).toBeInTheDocument();
  });

  it('membedakan warna status berhasil, duplikat, dan error', () => {
    render(
      <ScanHistory
        logs={[
          log({ id: 'a', message: 'OK', status: 'SUCCESS' }),
          log({ id: 'b', message: 'Sudah', status: 'DUPLICATE' }),
          log({ id: 'c', message: 'Gagal', status: 'ERROR' }),
        ]}
      />,
    );

    expect(screen.getByText('OK')).toHaveClass('text-brand-success');
    expect(screen.getByText('Sudah')).toHaveClass('text-brand-warning');
    expect(screen.getByText('Gagal')).toHaveClass('text-brand-danger');
  });

  it('menampilkan semua entri yang diberikan', () => {
    const logs = Array.from({ length: 5 }, (_, i) =>
      log({ id: String(i), guestIdOrName: `TAMU-00${i}` }),
    );
    render(<ScanHistory logs={logs} />);

    for (let i = 0; i < 5; i++) {
      expect(screen.getByText(`TAMU-00${i}`)).toBeInTheDocument();
    }
  });
});
