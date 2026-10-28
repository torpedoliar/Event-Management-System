import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegistrationShell, RegistrationTicket } from './RegistrationShell';

describe('RegistrationShell', () => {
  const base = {
    eventName: 'Gathering Nasional 2026',
    title: 'Pendaftaran Peserta',
    description: 'Lengkapi data Anda.',
  };

  it('menampilkan identitas acara dan isi formulir', () => {
    render(
      <RegistrationShell {...base}>
        <p>isi formulir</p>
      </RegistrationShell>,
    );

    expect(screen.getByText('Gathering Nasional 2026')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pendaftaran Peserta' })).toBeInTheDocument();
    expect(screen.getByText('Lengkapi data Anda.')).toBeInTheDocument();
    expect(screen.getByText('isi formulir')).toBeInTheDocument();
  });

  it('menampilkan kuota dengan angka tabular', () => {
    render(
      <RegistrationShell
        {...base}
        quota={{ current: 480, max: 600, percent: 80 }}
      >
        <p>form</p>
      </RegistrationShell>,
    );

    expect(screen.getByText('Kuota terisi')).toBeInTheDocument();
    expect(screen.getByText('480 / 600')).toBeInTheDocument();
  });

  it('tidak menampilkan kuota bila tidak dibatasi', () => {
    render(
      <RegistrationShell {...base} quota={{ current: 0, max: 0, percent: 0 }}>
        <p>form</p>
      </RegistrationShell>,
    );

    expect(screen.queryByText('Kuota terisi')).not.toBeInTheDocument();
  });

  it('membatasi lebar bilah kuota pada 0–100%', () => {
    const { container } = render(
      <RegistrationShell {...base} quota={{ current: 700, max: 600, percent: 250 }}>
        <p>form</p>
      </RegistrationShell>,
    );

    const fill = container.querySelector('.reg-quota-fill') as HTMLElement;
    expect(fill.style.width).toBe('100%');
  });

  it('menampilkan pesan galat sebagai alert', () => {
    render(
      <RegistrationShell {...base} error="Email sudah terdaftar">
        <p>form</p>
      </RegistrationShell>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Email sudah terdaftar');
  });

  it('menampilkan tombol kembali hanya bila diberikan', async () => {
    const onBack = vi.fn();
    const { rerender } = render(
      <RegistrationShell {...base}>
        <p>form</p>
      </RegistrationShell>,
    );
    expect(screen.queryByRole('button', { name: /pilih event lain/i })).not.toBeInTheDocument();

    rerender(
      <RegistrationShell {...base} onBack={onBack}>
        <p>form</p>
      </RegistrationShell>,
    );
    await userEvent.click(screen.getByRole('button', { name: /pilih event lain/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe('RegistrationTicket', () => {
  it('menampilkan ID peserta dan nomor antrean', () => {
    render(
      <RegistrationTicket
        eventName="Gathering Nasional 2026"
        message="Kami sudah mencatat kehadiran Anda."
        guestId="G-0142"
        queueNumber={142}
      />,
    );

    expect(screen.getByRole('heading', { name: /registrasi berhasil/i })).toBeInTheDocument();
    expect(screen.getByText('Gathering Nasional 2026')).toBeInTheDocument();
    expect(screen.getByText('G-0142')).toBeInTheDocument();
    expect(screen.getByText('No. antrean 142')).toBeInTheDocument();
  });

  it('menyembunyikan nomor antrean bila tidak ada', () => {
    render(<RegistrationTicket guestId="G-0142" queueNumber={null} />);
    expect(screen.queryByText(/No\. antrean/)).not.toBeInTheDocument();
  });

  it('menyembunyikan blok ID bila registrasi tanpa ID', () => {
    render(<RegistrationTicket message="Terdaftar." />);
    expect(screen.queryByText('ID peserta')).not.toBeInTheDocument();
  });

  it('selalu mengingatkan untuk menyimpan ID', () => {
    render(<RegistrationTicket guestId="G-0142" queueNumber={1} />);
    expect(screen.getByText(/Simpan tangkapan layar/i)).toBeInTheDocument();
  });
});
