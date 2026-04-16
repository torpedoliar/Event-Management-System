# Implementation Plan: Perbaikan Audit Offline Check-in System

**Referensi Audit**: `audit_offline_checkin.md`  
**Target**: Memperbaiki 13 temuan (2 CRITICAL, 3 HIGH, 6 MEDIUM, 2 LOW)  
**Urutan eksekusi**: Dependency-first → CRITICAL → HIGH → MEDIUM → LOW

---

## File Structure

| File | Action | Bug yang Diperbaiki |
|------|--------|---------------------|
| `apps/frontend/lib/offline-sync.service.ts` | Modify | BUG-1, BUG-2 |
| `apps/frontend/lib/indexeddb.ts` | Modify | BUG-4, BUG-5 |
| `apps/frontend/lib/connection-status.ts` | Modify | FLAW-3 |
| `apps/frontend/app/checkin/page.tsx` | Modify | BUG-3, BUG-6, BUG-8, BUG-9, FLAW-1, FLAW-2, FLAW-4 |
| `apps/frontend/components/ConnectionStatusIndicator.tsx` | Modify | BUG-7 |

---

## Task 1: Fix `syncPending()` — Payload & Auth (BUG-1 + BUG-2) 🔴 CRITICAL

**File**: `apps/frontend/lib/offline-sync.service.ts`

- [ ] **Step 1: Tambahkan `body` dan `Authorization` header ke fetch call**

Cari baris 164-168, ubah:

```typescript
// BEFORE (broken):
const response = await fetch('/api/public/guests/sync-batch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
});

// AFTER (fixed):
const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
const headers: Record<string, string> = { 'Content-Type': 'application/json' };
if (token) headers['Authorization'] = `Bearer ${token}`;

const response = await fetch('/api/public/guests/sync-batch', {
  method: 'POST',
  headers,
  body: JSON.stringify(payload)
});
```

- [ ] **Step 2: Verifikasi**

```bash
cd apps/frontend ; npx tsc --noEmit --pretty 2>&1 | Select-String "offline-sync"
```

Diharapkan: Tidak ada error TypeScript.

---

## Task 2: Fix `clearSyncedCheckins()` Atomik (BUG-4) 🟠 HIGH

**File**: `apps/frontend/lib/indexeddb.ts`

- [ ] **Step 1: Gunakan `cursor.delete()` di dalam transaksi yang sama**

Cari method `clearSyncedCheckins` (sekitar baris 128-145), ganti seluruh isinya:

```typescript
async clearSyncedCheckins(): Promise<void> {
  await this.init();
  const tx = this.db!.transaction('pendingCheckins', 'readwrite');
  const store = tx.objectStore('pendingCheckins');
  let cursor = await store.openCursor();

  while (cursor) {
    if (cursor.value.status === 'synced') {
      cursor.delete();
    }
    cursor = await cursor.continue();
  }
  await tx.done;
}
```

---

## Task 3: Optimasi `getPendingCount()` dengan Index (BUG-5) 🟡 MEDIUM

**File**: `apps/frontend/lib/indexeddb.ts`

- [ ] **Step 1: Ganti `getAll` + filter menjadi `countFromIndex`**

Cari method `getPendingCount` (sekitar baris 147-151), ganti:

```typescript
async getPendingCount(): Promise<number> {
  await this.init();
  const pending = await this.db!.countFromIndex('pendingCheckins', 'status', 'pending');
  const failed = await this.db!.countFromIndex('pendingCheckins', 'status', 'failed');
  return pending + failed;
}
```

---

## Task 4: Fix Offline Search — Update Cache + Duplikat Detection + Optimasi (BUG-3, BUG-6, FLAW-2) 🟠 HIGH

**File**: `apps/frontend/app/checkin/page.tsx`

- [ ] **Step 1: Optimasi pencarian offline — exact match dulu, fallback full scan**

Cari catch block offline search di `doSearch` (sekitar baris 362-425). Ganti blok pencarian berikut:

```typescript
// BEFORE:
const cachedGuests = await indexedDBService.getAllCachedGuests();
const cleanSearchQ = cleanQrContent(q.trim());

// Search by guestId or name
const matchedGuests = cachedGuests.filter(g =>
  g.guestId.toLowerCase().includes(cleanSearchQ.toLowerCase()) ||
  g.name.toLowerCase().includes(q.trim().toLowerCase())
);
```

Menjadi:

```typescript
const cleanSearchQ = cleanQrContent(q.trim());
let matchedGuests: LocalGuest[];

// Try exact match on guestId index first (fast path)
const exactMatch = await indexedDBService.getCachedGuestByGuestId(cleanSearchQ);
if (exactMatch) {
  matchedGuests = [exactMatch];
} else {
  // Fallback to full scan for name search
  const cachedGuests = await indexedDBService.getAllCachedGuests();
  matchedGuests = cachedGuests.filter(g =>
    g.guestId.toLowerCase().includes(cleanSearchQ.toLowerCase()) ||
    g.name.toLowerCase().includes(q.trim().toLowerCase())
  );
}
```

- [ ] **Step 2: Tambahkan deteksi duplikat offline sebelum check-in**

Di dalam blok `if (matchedGuests.length === 1)`, sebelum `await offlineSyncService.addToQueue(...)`, tambahkan:

```typescript
// Check for duplicate check-in offline
if (matchedGuest.checkedIn && !cfg?.allowMultipleCheckinPerCounter) {
  const guestFromCache: Guest = {
    id: matchedGuest.id,
    guestId: matchedGuest.guestId,
    name: matchedGuest.name,
    queueNumber: 0,
    tableLocation: '',
    checkedIn: matchedGuest.checkedIn,
    checkedInAt: matchedGuest.lastCheckinAt,
    checkinCount: matchedGuest.checkinCount,
  };
  setResults([guestFromCache]);
  setSelected(guestFromCache);
  setCheckedGuest(guestFromCache);
  setIsDuplicateCheckIn(true);
  setQ('');
  startPopupTimeout();
  return;
}
```

- [ ] **Step 3: Update cache lokal setelah offline check-in**

Setelah `await offlineSyncService.addToQueue(guestFromCache.guestId);`, tambahkan:

```typescript
// Update local cache to reflect check-in
await indexedDBService.updateCachedGuest(matchedGuest.id, {
  checkedIn: true,
  checkinCount: matchedGuest.checkinCount + 1,
  lastCheckinAt: new Date().toISOString(),
});
```

---

## Task 5: Fix `doCheckin` Offline — Update Cache (BUG-9) 🟡 MEDIUM

**File**: `apps/frontend/app/checkin/page.tsx`

- [ ] **Step 1: Update cache lokal di `doCheckin` catch block**

Cari catch block offline di `doCheckin` (sekitar baris 496-521). Setelah `await offlineSyncService.addToQueue(g.guestId);` (baris 511), tambahkan:

```typescript
// Update local cache to reflect offline check-in
try {
  await indexedDBService.updateCachedGuest(g.id, {
    checkedIn: true,
    checkinCount: (g.checkinCount || 0) + 1,
    lastCheckinAt: new Date().toISOString(),
  });
} catch {}
```

---

## Task 6: Fix QR Scan Offline — Gunakan Cache Lokal (BUG-8) 🟡 MEDIUM

**File**: `apps/frontend/app/checkin/page.tsx`

- [ ] **Step 1: Ganti placeholder 'Queued (offline)' dengan data dari cache**

Cari catch block offline di `onScanSuccess` (sekitar baris 1004-1031). Ganti isi blok `try` menjadi:

```typescript
try {
  const queueLimit = cfg?.offlineQueueLimit || 500;
  const pendingCount = await offlineSyncService.getPendingCount();

  if (pendingCount >= queueLimit) {
    setError(`Antrian offline penuh (${pendingCount}/${queueLimit}). Hubungkan ke internet untuk sinkronisasi.`);
    return;
  }

  if (pendingCount >= queueLimit * 0.8) {
    setError(`⚠️ Antrian hampir penuh (${pendingCount}/${queueLimit}). Segera hubungkan ke internet.`);
  }

  const cleanCode = cleanQrContent(decodedText);

  // Try to find guest in local cache for better UX
  const cachedGuest = await indexedDBService.getCachedGuestByGuestId(cleanCode);

  await offlineSyncService.addToQueue(cleanCode);

  if (cachedGuest) {
    // Update local cache
    await indexedDBService.updateCachedGuest(cachedGuest.id, {
      checkedIn: true,
      checkinCount: cachedGuest.checkinCount + 1,
      lastCheckinAt: new Date().toISOString(),
    });

    const guestObj: Guest = {
      id: cachedGuest.id,
      guestId: cachedGuest.guestId,
      name: cachedGuest.name,
      queueNumber: 0,
      tableLocation: '',
      checkedIn: true,
      checkedInAt: new Date().toISOString(),
      checkinCount: cachedGuest.checkinCount + 1,
    };
    setError(null);
    setCheckedGuest(guestObj);
    setSelected(guestObj);
  } else {
    // Fallback: no cache data available
    setError(null);
    setCheckedGuest({ guestId: cleanCode, name: 'Queued (offline)', id: 'offline', queueNumber: 0, tableLocation: '', checkedIn: false } as Guest);
    setSelected({ guestId: cleanCode, name: 'Queued (offline)', id: 'offline', queueNumber: 0, tableLocation: '', checkedIn: false } as Guest);
  }

  setIsDuplicateCheckIn(false);
  refreshHistory();
  startPopupTimeout();
  return;
} catch (queueErr) {
  console.error('Queue error:', queueErr);
}
```

---

## Task 7: Fix `cachedGuestCount` Stale (BUG-7) 🟡 MEDIUM

**File**: `apps/frontend/components/ConnectionStatusIndicator.tsx` + `apps/frontend/app/checkin/page.tsx`

- [ ] **Step 1: Tambahkan prop `cachedGuestCount` ke `ConnectionStatusIndicator`**

Di `ConnectionStatusIndicator.tsx`, ubah interface dan hapus internal state/effect:

```typescript
interface ConnectionStatusIndicatorProps {
  className?: string;
  onShowQueue?: () => void;
  cachedGuestCount?: number; // NEW: Passed from parent
}

export default function ConnectionStatusIndicator({ className = '', onShowQueue, cachedGuestCount = 0 }: ConnectionStatusIndicatorProps) {
  const [status, setStatus] = useState<ConnectionStatus>('online');
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  // REMOVED: cachedGuestCount state and useEffect
```

Hapus `useEffect` dan `useState` untuk `cachedGuestCount` internal (baris 24, 47-57). Hapus import `indexedDBService`.

- [ ] **Step 2: Pass `cachedGuestCount` dari parent `page.tsx`**

Di `page.tsx`, tambah state:

```typescript
const [cachedGuestCount, setCachedGuestCount] = useState(0);
```

Update `handleDownloadGuests` — setelah `setDownloadProgress(...)` sukses, tambah:

```typescript
setCachedGuestCount(result.success);
```

Load saat mount, tambahkan useEffect:

```typescript
useEffect(() => {
  indexedDBService.getAllCachedGuests().then(guests => setCachedGuestCount(guests.length)).catch(() => {});
}, []);
```

Pass prop ke komponen:

```tsx
<ConnectionStatusIndicator onShowQueue={() => setShowQueuePanel(true)} cachedGuestCount={cachedGuestCount} />
```

---

## Task 8: Fix `refreshHistory()` Fallback Offline (FLAW-1) 🟡 MEDIUM

**File**: `apps/frontend/app/checkin/page.tsx`

- [ ] **Step 1: Tambahkan fallback jika fetch gagal**

Ganti method `refreshHistory`:

```typescript
const refreshHistory = async () => {
  try {
    const r = await fetch(`${apiBase()}/public/guests/history?limit=10`);
    if (r.ok) setHistory(await r.json());
  } catch {
    // Offline: don't clear history, keep last known state
  }
};
```

> **Catatan**: Saat ini sudah `catch {}` yang benar — history tidak dihapus saat offline. Mempertahankan state terakhir sudah cukup baik. Tidak perlu perubahan.

---

## Task 9: Fix Memory Leak Event Listener (FLAW-3) 🟢 LOW

**File**: `apps/frontend/lib/connection-status.ts`

- [ ] **Step 1: Simpan referensi handler dan cleanup di `destroy()`**

Ubah class `ConnectionStatusService`:

```typescript
class ConnectionStatusService {
  // ... existing fields ...
  private onlineHandler = () => this.setOnline();
  private offlineHandler = () => this.setOffline();

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.onlineHandler);
      window.addEventListener('offline', this.offlineHandler);
    }
  }

  // ... existing methods ...

  destroy() {
    this.stopPeriodicCheck();
    this.listeners = [];
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.onlineHandler);
      window.removeEventListener('offline', this.offlineHandler);
    }
  }
}
```

---

## Task 10: Pagination untuk Download Tamu > 10k (FLAW-4) 🟢 LOW

**File**: `apps/frontend/app/checkin/page.tsx`

- [ ] **Step 1: Ubah `handleDownloadGuests` untuk pagination loop**

```typescript
const handleDownloadGuests = async () => {
  setDownloadingGuests(true);
  setDownloadProgress('Mengambil data tamu...');
  setError(null);
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let allGuests: any[] = [];
    let page = 0;
    const pageSize = 5000;
    let hasMore = true;

    while (hasMore) {
      const res = await fetch(`${apiBase()}/guests?limit=${pageSize}&offset=${page * pageSize}`, { headers });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(parseErrorMessage(errorText));
      }
      const batch = await res.json();
      allGuests = allGuests.concat(batch);
      setDownloadProgress(`Mengambil data tamu... (${allGuests.length} sejauh ini)`);
      hasMore = batch.length === pageSize;
      page++;
    }

    setDownloadProgress(`Menyimpan ${allGuests.length} tamu ke cache...`);

    const localGuests: LocalGuest[] = allGuests.map((g: any) => ({
      id: g.id,
      guestId: g.guestId,
      name: g.name,
      checkedIn: g.checkedIn,
      checkinCount: g.checkinCount || 0,
      lastCheckinAt: g.checkedInAt || undefined,
      photoUrl: g.photoUrl || undefined,
      updatedAt: new Date().toISOString(),
    }));

    const result = await indexedDBService.cacheGuestsBulk(localGuests);
    setDownloadProgress(`Berhasil: ${result.success} tamu tersimpan, ${result.failed} gagal.`);
    setCachedGuestCount(result.success);

    setTimeout(() => setDownloadProgress(null), 5000);
  } catch (e: any) {
    setError(e.message || 'Gagal mengunduh data tamu');
    setDownloadProgress(null);
  } finally {
    setDownloadingGuests(false);
  }
};
```

---

## Task 11: Final Verification

- [ ] **Step 1: TypeScript Check**

```bash
cd apps/frontend ; npx tsc --noEmit
```

Diharapkan: 0 errors.

- [ ] **Step 2: Build Test**

```bash
cd apps/frontend ; npm run build
```

Diharapkan: Build sukses.

- [ ] **Step 3: Commit**

```bash
git add . ; git commit -m "fix: critical offline sync bugs + performance optimizations (13 issues)"
```

---

## Verification Checklist

Setelah implementasi, verifikasi skenario:

1. **BUG-1 & BUG-2**: Matikan internet → check-in tamu → nyalakan internet → cek di backend apakah check-in ter-sync
2. **BUG-3 & FLAW-2**: Offline → check-in tamu A → search tamu A lagi → harus tampil sebagai "sudah check-in" (duplikat)
3. **BUG-4**: Sync berhasil → cek IndexedDB → store `pendingCheckins` bersih dari status 'synced'
4. **BUG-5**: Performa — check `getPendingCount()` tidak lambat dengan 100+ pending
5. **BUG-6**: Offline → search by guestId → harus instan (tidak delay loading 10k records)
6. **BUG-7**: Download tamu → cek `ConnectionStatusIndicator` langsung menampilkan jumlah baru
7. **BUG-8**: Offline → scan QR → nama tamu harus muncul (bukan 'Queued (offline)')
8. **BUG-9**: Offline → check-in via button → cek IndexedDB `localGuests` ter-update
9. **FLAW-3**: Mount/unmount komponen → tidak ada event listener leak
