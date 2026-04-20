# Rapid Scanner Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Memungkinkan halaman Check-in dan Souvenir menerima 10-20 rentetan input scanner barcode dalam 5 detik tanpa lag, dengan tetap mempertahankan kapabilitas *offline mode*.

**Architecture:** Atribut `disabled` dilepas dari input agar tidak mengganggu fokus. Ketika tombol Enter ditangkap, *string* input dimasukkan ke `useRef` array (memori) lalu dibersihkan secara sinkron. Sebuah fungsi pendengar antrean (Queue Processor) berjalan membaca memori tersebut satu per satu, mengeksekusi logika pencarian & offline, lalu mengekspor hasilnya murni ke layar melalui antarmuka Log Berjalan (Local Scan Log).

**Tech Stack:** React, Next.js, IndexedDB (offline-sync)

---

### Task 1: Checkin Page - Persiapan State dan Ref untuk Queue & Log

**Files:**
- Modify: `e:\Vibe\Registrasi Tamu\apps\frontend\app\checkin\page.tsx`

- [ ] **Step 1: Tambahkan Tipe, State, dan Ref untuk Queue dan Log Mode Rapid**
Sisipkan definisi tipe dan hooks tambahan di dalam blok atas komponen `CheckinPage`.

```tsx
// Di dekat deklarasi state lainnya (sebelum useEffect)
type ScanLogItem = {
  id: string; // unique timestamp + random
  guestIdOrName: string;
  status: 'SUCCESS' | 'DUPLICATE' | 'NOT_FOUND' | 'ERROR';
  message: string;
  timestamp: Date;
};

const rapidQueueRef = useRef<string[]>([]);
const isProcessingQueueRef = useRef<boolean>(false);
const [rapidLogs, setRapidLogs] = useState<ScanLogItem[]>([]);
```

- [ ] **Step 2: Buat UI Local Scan Log**
Tambahkan elemen UI tepat di bawah komponen `Checkin Form/Modal` (bagian Search) utuk menampilkan log riwayat scan lokal.

```tsx
{/* Letakkan di bawah div "Search (single input)" */}
{rapidLogs.length > 0 && (
  <div className="relative z-10 mt-4 px-4 pb-6 flex flex-col items-center">
    <div className="w-full max-w-3xl glass-card-dark p-4 md:p-6 text-sm text-white/80 overflow-y-auto max-h-48 border border-white/10 rounded-xl">
      <h3 className="text-white font-semibold mb-3">Rapid Scan Logs</h3>
      <ul className="space-y-2">
        {rapidLogs.map((log) => (
          <li key={log.id} className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-lg">
            <div className="flex gap-3">
              <span className="opacity-60">{log.timestamp.toLocaleTimeString()}</span>
              <strong className="text-white">{log.guestIdOrName}</strong>
            </div>
            <span className={`font-medium ${
              log.status === 'SUCCESS' ? 'text-brand-success' :
              log.status === 'DUPLICATE' ? 'text-orange-400' :
              'text-brand-danger'
            }`}>
              {log.message}
            </span>
          </li>
        ))}
      </ul>
    </div>
  </div>
)}
```

---

### Task 2: Checkin Page - Refactoring Logika Input Bebas-Blokir

**Files:**
- Modify: `e:\Vibe\Registrasi Tamu\apps\frontend\app\checkin\page.tsx`

- [ ] **Step 1: Ekstrak logika `doSearch` menjadi `executeSearchCheckin(searchQuery: string)`**
Ganti body fungsi `doSearch` yang bergantung dari state `q` agar menggunakan parameter lokal sepenuhnya dan menyimpan hasil ke `rapidLogs`.

```tsx
// Di dalam komponen CheckinPage

const appendLog = (query: string, status: ScanLogItem['status'], message: string) => {
  setRapidLogs(prev => {
    const newLog: ScanLogItem = { id: Math.random().toString(), guestIdOrName: query, status, message, timestamp: new Date() };
    const logs = [newLog, ...prev];
    if (logs.length > 20) logs.length = 20; // simpan 20 riwayat
    return logs;
  });
};

const processRapidQueue = async () => {
  if (isProcessingQueueRef.current) return;
  isProcessingQueueRef.current = true;

  try {
    while (rapidQueueRef.current.length > 0) {
      const activeQuery = rapidQueueRef.current.shift();
      if (!activeQuery) continue;
      
      // -- LOGIKA PENCARIAN (Copast modifikasi dari doSearch terdahulu) --
      const params = new URLSearchParams();
      const cleanQ = cleanQrContent(activeQuery);
      params.set('guestId', cleanQ);
      params.set('name', activeQuery);
      if (/[\d\-]/.test(activeQuery) || /^[A-Z0-9_\-]+$/.test(activeQuery)) {
        params.set('exact', 'true');
      }

      const isCurrentlyOffline = connectionStatusService.getStatus() !== 'online';

      try {
        if (isCurrentlyOffline && stationConfig) throw new Error('OfflineMode');

        const controller = new AbortController();
        const res = await fetch(`${apiBase()}/public/guests/search?${params.toString()}`, { signal: controller.signal });
        if (!res.ok) throw new Error(parseErrorMessage(await res.text()));
        
        const data = await res.json();
        
        if (data.length === 1) {
          // ONLINE CHECK-IN DIPANGGIL DI SINI SECARA ASYNC/AWAIT
          await doCheckinWrapperForQueue(data[0], false, activeQuery);
        } else if (data.length === 0) {
          if (autoCreateGuest) {
            await createAndCheckinWrapperForQueue(activeQuery, activeQuery);
          } else {
            appendLog(activeQuery, 'NOT_FOUND', 'Tamu tidak ditemukan server.');
          }
        } else {
          // Multimatch di Rapid Scan tidak didukung untuk auto-checkin
          appendLog(activeQuery, 'ERROR', `Ditemukan ${data.length}. Butuh manual klik.`);
        }
      } catch (e: any) {
        // ... (LOGIKA OFFLINE MATCHING KITA PASTE KE SINI) ...
        const cleanSearchQ = cleanQrContent(activeQuery);
        let matchedGuests: LocalGuest[] = [];
        const exactMatch = await indexedDBService.getCachedGuestByGuestId(cleanSearchQ);
        if (exactMatch) {
          matchedGuests = [exactMatch];
        } else {
           // greedy loop matching (offline)
           const cachedGuests = await indexedDBService.getAllCachedGuests();
           // (skip pencarian non-exact nama panjang agar tidak memberatkan rapid, rapid fokus ID scanner)
        }

        if (matchedGuests.length === 1) {
           const matchedGuest = matchedGuests[0];
           if (matchedGuest.checkedIn && !cfg?.allowMultipleCheckinPerCounter) {
             appendLog(activeQuery, 'DUPLICATE', 'Tamu sudah Check-In Offline sebelumnya.');
             continue;
           }

           const queueLimit = cfg?.offlineQueueLimit || 500;
           await offlineSyncService.addToQueue(matchedGuest.guestId);
           await indexedDBService.updateCachedGuest(matchedGuest.id, {
              checkedIn: true, checkinCount: matchedGuest.checkinCount + 1, lastCheckinAt: new Date().toISOString()
           });
           appendLog(activeQuery, 'SUCCESS', 'Check-In Offline Berhasil');
        } else {
           appendLog(activeQuery, 'NOT_FOUND', 'Offline ID tidak dikenali.');
        }
      }
      
      // Jeda 50ms per loop antrean agar UI update
      await new Promise(res => setTimeout(res, 50));
    }
  } finally {
    isProcessingQueueRef.current = false;
  }
};
```

- [ ] **Step 3: Sesuaikan Form Input HTML Murni (Cabut disabled)**

```tsx
// Ubah method onKeyDown di <input>
  onKeyDown={(e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!q.trim()) return;
      rapidQueueRef.current.push(q.trim());
      setQ(''); // Bersihkan form seketika
      processRapidQueue(); // Trigger loop pemrosesan antrean
    }
  }}
  // HAPUS prop disabled={searching || checking} sepenuhnya
```

---

### Task 3: Souvenir Page - Sinkronisasi Antrean Tembak Cepat

**Files:**
- Modify: `e:\Vibe\Registrasi Tamu\apps\frontend\app\souvenir\page.tsx`

- [ ] **Step 1: Siapkan rapidQueue, isProcessingQueueRef, rapidLogs**
Persiapkan properti log dan antrean yang persetan sama dengan Task 1.

```tsx
type ScanLogItem = {
  id: string;
  guestIdOrName: string;
  status: 'SUCCESS' | 'DUPLICATE' | 'NOT_FOUND' | 'ERROR';
  message: string;
  timestamp: Date;
};
const rapidQueueRef = useRef<string[]>([]);
const isProcessingQueueRef = useRef<boolean>(false);
const [rapidLogs, setRapidLogs] = useState<ScanLogItem[]>([]);
```

- [ ] **Step 2: Re-tunning fungsi Scanner Logika Tebak**
Jadikan onKeyDown input teks langsung mem-push antrean ke memory seperti di Task 2 dan pastikan tidak ada efek *disabled*.

- [ ] **Step 3: Deploy `processRapidQueue` logika Souvenir**
Gunakan pendekatan perulangan Background `while(rapidQueueRef.current.length > 0)` untuk menuntut hak ambil offline secara berurutan. (Panggil `offlineSyncService.addSouvenirToQueue()` secara programatis dari loop).

---
### Eksekusi Lengkap

Semua implementasi akan dirangkai sepenuhnya tanpa _placeholder_. 

**Plan complete and saved to `e:\Vibe\Registrasi Tamu\implementation plan\rapid-scan-mode-plan.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration
**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
