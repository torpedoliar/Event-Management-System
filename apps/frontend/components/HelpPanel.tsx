'use client';

import { useState, useEffect, useRef, ReactNode } from 'react';
import { X, HelpCircle, UserCheck, Dices, Users, Settings, ChevronDown, ChevronRight } from 'lucide-react';
import IconButton from './ui/IconButton';

interface HelpSection {
  id: string;
  title: string;
  icon: ReactNode;
  items: { q: string; a: string }[];
}

const HELP_SECTIONS: HelpSection[] = [
  {
    id: 'checkin',
    title: 'Check-in Tamu',
    icon: <UserCheck size={16} />,
    items: [
      {
        q: 'Bagaimana cara check-in tamu?',
        a: 'Ketik nama atau ID tamu di kolom pencarian, lalu tekan Enter. Atau arahkan kamera ke QR code tamu. Data tamu akan muncul, lalu klik tombol "Check-In".',
      },
      {
        q: 'Apa itu Rapid Queue?',
        a: 'Mode scan cepat — setiap kali Anda scan QR atau tekan Enter, tamu langsung masuk antrian dan diproses otomatis. Cocok untuk check-in massal saat tamu berdatangan.',
      },
      {
        q: 'Tamu tidak ditemukan?',
        a: 'Pastikan ID atau nama tamu benar. Jika tamu belum terdaftar, aktifkan "Auto-Create" di Pengaturan agar tamu baru otomatis dibuat saat check-in.',
      },
      {
        q: 'Apa fungsi foto capture?',
        a: 'Jika diaktifkan di Pengaturan, kamera akan otomatis mengambil foto tamu saat check-in. Foto ini tersimpan di data tamu untuk laporan.',
      },
      {
        q: 'Bagaimana cara membatalkan check-in?',
        a: 'Klik tamu yang sudah check-in di history, lalu klik tombol "Batal Check-In". Anda akan diminta password admin dan alasan pembatalan.',
      },
    ],
  },
  {
    id: 'station',
    title: 'Station & Offline',
    icon: <Settings size={16} />,
    items: [
      {
        q: 'Apa itu Station ID?',
        a: 'Station ID adalah pengenal unik untuk perangkat check-in ini. Setiap perangkat (HP, tablet, laptop) punya ID berbeda agar data check-in tidak bentrok antar perangkat.',
      },
      {
        q: 'Apa fungsi Nama Station?',
        a: 'Nama station muncul di laporan dan history check-in. Gunakan nama yang mudah dikenali seperti "Pintu Utama" atau "Lobby Utara".',
      },
      {
        q: 'Mode Offline itu apa?',
        a: 'Jika internet mati, check-in tetap jalan menggunakan data yang sudah di-download. Saat internet kembali, data otomatis tersync ke server. Aktifkan ini jika venue punya koneksi tidak stabil.',
      },
      {
        q: 'Interval Sinkronisasi?',
        a: 'Seberapa sering (dalam detik) data offline dikirim ke server saat internet tersedia. Default 30 detik. Lebih kecil = lebih sering sync, tapi lebih boros baterai.',
      },
    ],
  },
  {
    id: 'luckydraw',
    title: 'Lucky Draw',
    icon: <Dices size={16} />,
    items: [
      {
        q: 'Bagaimana cara mengundi?',
        a: 'Pilih hadiah dari dropdown, tentukan jumlah pemenang, lalu tekan tombol undian. Ticker akan berputar dan melambat hingga berhenti di pemenang.',
      },
      {
        q: 'Apa itu mode Slot Machine?',
        a: 'Mode tampilan dengan animasi reel seperti mesin slot. Lebih dramatis untuk acara besar. Pilih di dropdown mode tampilan.',
      },
      {
        q: 'Panel Eligible untuk apa?',
        a: 'Menampilkan daftar tamu yang sudah check-in dan berhak ikut undian. Anda bisa cari tamu tertentu dan melihat siapa yang sudah menang hadiah.',
      },
      {
        q: 'Hadiah HIBURAN vs UTAMA?',
        a: 'HIBURAN: undian biasa dengan animasi ringan. UTAMA: grand prize dengan efek dramatis — screen shake, flash, slow reveal. Kedua kategori punya pengaturan drama berbeda.',
      },
      {
        q: 'Bagaimana jika allowMultipleWins aktif?',
        a: 'Tamu bisa menang lebih dari satu hadiah. Jika dimatikan, tamu yang sudah menang tidak akan muncul di undian berikutnya.',
      },
    ],
  },
  {
    id: 'guests',
    title: 'Kelola Tamu',
    icon: <Users size={16} />,
    items: [
      {
        q: 'Bagaimana cara menambah tamu?',
        a: 'Buka menu Admin → Tamu → tombol "Tambah Tamu". Isi data yang diperlukan. Tamu juga bisa dibuat otomatis saat check-in jika fitur Auto-Create aktif.',
      },
      {
        q: 'Apa itu Guest ID?',
        a: 'ID unik untuk setiap tamu, biasanya tercetak di QR code undangan. Bisa berupa angka, kode, atau kombinasi. ID ini digunakan untuk pencarian dan check-in.',
      },
      {
        q: 'Bagaimana cara import tamu massal?',
        a: 'Di halaman Tamu, gunakan tombol "Import" untuk upload file Excel. Format kolom: Guest ID, Nama, Perusahaan, Meja, dan kategori.',
      },
    ],
  },
];

function Section({ section, defaultOpen = false }: { section: HelpSection; defaultOpen?: boolean }) {
  const [expanded, setExpanded] = useState(defaultOpen);

  return (
    <div className="border-b border-brand-border last:border-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-3 w-full px-4 py-3 text-left text-sm font-medium text-brand-text hover:bg-white/[0.03] transition-colors"
        aria-expanded={expanded}
      >
        <span className="text-brand-primary">{section.icon}</span>
        <span className="flex-1">{section.title}</span>
        {expanded ? <ChevronDown size={14} className="text-brand-textDim" /> : <ChevronRight size={14} className="text-brand-textDim" />}
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {section.items.map((item, i) => (
            <div key={i} className="space-y-1">
              <p className="text-sm font-medium text-brand-text">{item.q}</p>
              <p className="text-xs text-brand-textMuted leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface HelpPanelProps {
  /** Which section to default-open based on current page context */
  contextSection?: string;
}

export default function HelpPanel({ contextSection }: HelpPanelProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    // Delay to avoid closing from the trigger click
    const t = setTimeout(() => document.addEventListener('mousedown', onClick), 50);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  return (
    <>
      <IconButton
        onClick={() => setOpen(true)}
        aria-label="Bantuan"
        className="text-brand-textDim hover:text-brand-primary"
      >
        <HelpCircle size={18} />
      </IconButton>

      {open && (
        <div className="fixed inset-0 z-[55] flex justify-end">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          {/* Panel */}
          <div
            ref={panelRef}
            className="relative w-full max-w-sm bg-brand-bgElevated border-l border-brand-border shadow-panel overflow-y-auto animate-slideInRight"
          >
            <div className="sticky top-0 bg-brand-bgElevated/95 backdrop-blur-xl border-b border-brand-border px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle size={18} className="text-brand-primary" />
                <span className="text-sm font-semibold text-brand-text">Bantuan</span>
              </div>
              <IconButton onClick={() => setOpen(false)} aria-label="Tutup bantuan">
                <X size={18} />
              </IconButton>
            </div>
            <div className="py-1">
              {HELP_SECTIONS.map((section) => (
                <Section
                  key={section.id}
                  section={section}
                  defaultOpen={section.id === contextSection}
                />
              ))}
            </div>
            <div className="border-t border-brand-border px-4 py-3">
              <p className="text-xs text-brand-textDim text-center">
                Butuh bantuan lebih? Hubungi admin acara.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
