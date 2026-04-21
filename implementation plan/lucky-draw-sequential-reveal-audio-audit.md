# Lucky Draw — Perbaikan Multi-Winner Sequential Reveal & Audio Audit

## Deskripsi Masalah

### 1. Bug: Multi-Winner Undian HIBURAN Langsung Muncul Semua Sekaligus
Saat user menge-set custom draw count (misal 5, 10, atau 20) pada undian HIBURAN, semua pemenang langsung muncul **sekaligus** di Multi Winner Modal tanpa efek dramatis. Seharusnya pemenang muncul **satu per satu** dengan cepat secara berurutan agar lebih seru dan dramatis.

**Root Cause** (di [page.tsx](file:///e:/Vibe/Registrasi%20Tamu/apps/frontend/app/luckydraw/page.tsx#L552-L570)):
```typescript
// Line 558-560 — langsung set semua winners sekaligus
if (results.length > 1) {
    setMultiWinners(results);        // ← semua langsung masuk
    setShowMultiWinnerModal(true);   // ← modal langsung terbuka
    setDisplayCandidate(result);
}
```
Tidak ada mekanisme **sequential reveal** — semua results di-set pada state `multiWinners` sekaligus, lalu modal langsung dibuka menampilkan seluruh daftar.

### 2. Audit: Implementasi Audio Lucky Draw

**Status: ✅ Implementasi Sudah Benar (dengan catatan minor)**

Berdasar analisis menyeluruh:

| Aspek | Status | Detail |
|-------|--------|--------|
| Audio Elements (HTML) | ✅ OK | 4 `<audio>` elements dengan `preload="auto"`, URL dari `toApiUrl()` |
| Sound Toggle | ✅ OK | Button floating di top-right, overlay saat pertama load |
| Browser Autoplay Policy | ✅ OK | User harus klik "Enable Audio" overlay dulu → trigger `play().then(pause)` untuk unlock |
| Play/Stop Functions | ✅ OK | `playSound()` reset currentTime, set volume, handle error. `stopSound()` pause + reset |
| Roll Sound | ✅ OK | Dimainkan saat spinning dimulai (line 510), di-stop saat selesai (line 555/241) |
| Tension Sound | ✅ OK | Dimainkan pada Grand Prize slowdown stage 2 (line 242), loop=true |
| Win Sound | ✅ OK | Dimainkan saat pemenang HIBURAN terungkap (line 556) |
| Grand Win Sound | ✅ OK | Dimainkan saat Grand Prize reveal (line 264) |
| Cleanup on Error | ✅ OK | `stopSound(audioRollRef)` dan `stopSound(audioTensionRef)` di catch block (line 597-598) |
| Sound URL Fallback | ✅ OK | Fallback ke `/sounds/roll.mp3` dll. jika `eventCfg` tidak punya custom URL |
| Backend Upload | ✅ OK | Endpoint `POST /events/upload/sound/:type`, storage ke `uploads/branding/sounds/` |
| DB Schema | ✅ OK | Fields `rollSoundUrl`, `tensionSoundUrl`, `winSoundUrl`, `grandWinSoundUrl` di model Event |
| Admin UI | ✅ OK | Sound management panel di settings event page (upload, preview, reset) |

> [!WARNING]
> **Catatan Minor pada Audio:**
> - Folder `apps/frontend/public/sounds/` **kosong** — artinya fallback default (`/sounds/roll.mp3` dll.) akan **404** jika user belum upload custom sounds via admin. Ini bukan bug blocking karena `play().catch()` meng-handle error gracefully, tapi user akan tidak mendengar suara default.

---

## Proposed Changes

### Frontend — Lucky Draw Page

#### [MODIFY] [page.tsx](file:///e:/Vibe/Registrasi%20Tamu/apps/frontend/app/luckydraw/page.tsx)

**Perubahan utama: Sequential Reveal untuk Multi-Winner HIBURAN**

Alur baru saat `drawCount > 1`:

1. API call mendapat array `results` (sudah benar, backend mengembalikan semua sekaligus)
2. Rolling animation tetap berjalan seperti biasa selama `spinDuration`
3. **Setelah spin selesai**, buka Multi Winner Modal dalam keadaan **kosong**
4. **Sequential reveal**: Tampilkan pemenang **satu per satu** menggunakan `async loop` dengan `await sleep()`:
   - Setiap ~400-800ms (tergantung jumlah pemenang), tambahkan 1 pemenang ke state `multiWinners`
   - Setiap kali pemenang baru muncul:
     - Mini confetti burst
     - Display area utama menampilkan pemenang terakhir yang terungkap
     - Animasi slide-in-from-bottom per card (sudah ada di CSS)
   - Win sound dimainkan **sekali** di awal reveal, bukan per pemenang
5. Setelah **semua** terungkap → confetti besar final

**Perubahan teknis di `handleDraw()`** (line ~552-583):

```diff
  // In the HIBURAN branch (after spin duration)
  if (results.length > 1) {
-     setMultiWinners(results);
-     setShowMultiWinnerModal(true);
-     setDisplayCandidate(result);
+     // Sequential reveal: buka modal kosong, lalu reveal satu-per-satu
+     const interval = calculateRevealInterval(results.length);
+     setTotalExpectedWinners(results.length);
+     setMultiWinners([]);               // Start empty
+     setShowMultiWinnerModal(true);
+     setIsRevealing(true);
+     
+     // Reveal satu per satu
+     for (let i = 0; i < results.length; i++) {
+         await sleep(interval);
+         setMultiWinners(prev => [...prev, results[i]]);
+         setDisplayCandidate(results[i]);
+         
+         // Mini confetti setiap pemenang
+         confetti({
+             particleCount: 30,
+             spread: 50,
+             origin: { y: 0.6 },
+             colors: ['#FFD700', '#FFA500', '#FF69B4']
+         });
+     }
+     
+     setIsRevealing(false);
+     
+     // Final celebration setelah semua terungkap
+     confetti({
+         particleCount: drama.confettiCount * 2,
+         spread: 100,
+         origin: { y: 0.5 },
+         colors: ['#FFD700', '#FFA500', '#FF69B4', '#00FF00', '#00BFFF']
+     });
  }
```

**State baru yang diperlukan:**

```typescript
const [isRevealing, setIsRevealing] = useState(false);
const [totalExpectedWinners, setTotalExpectedWinners] = useState(0);
```

**Helper function untuk timing adaptive:**

```typescript
// Hitung interval reveal berdasarkan jumlah pemenang
// Target total reveal duration: 4-15 detik
const calculateRevealInterval = (count: number): number => {
    if (count <= 5) return 800;    // 5 winners × 800ms = 4s
    if (count <= 10) return 500;   // 10 winners × 500ms = 5s
    if (count <= 20) return 350;   // 20 winners × 350ms = 7s
    return 250;                     // 50+ winners × 250ms = ~12.5s
};
```

**Perubahan di Multi Winner Modal** (line ~818-870):

```diff
  // Modal header — tampilkan counter progress
  <p className="text-xl md:text-2xl text-white/60 font-mono tracking-[0.3em] uppercase">
-     {multiWinners.length} PEMENANG {selectedPrize?.name}
+     {isRevealing
+       ? `${multiWinners.length} / ${totalExpectedWinners} PEMENANG ${selectedPrize?.name}`
+       : `${multiWinners.length} PEMENANG ${selectedPrize?.name}`
+     }
  </p>

  // Grid — hapus animation delay karena reveal sudah sequential
  <div 
      key={w.id} 
      className="... animate-in slide-in-from-bottom duration-500"
-     style={{ animationDelay: `${idx * 100}ms` }}
  >

  // Close button — disable saat masih revealing
  <button
-     onClick={() => { setShowMultiWinnerModal(false); setMultiWinners([]); }}
+     onClick={() => { setShowMultiWinnerModal(false); setMultiWinners([]); setTotalExpectedWinners(0); }}
+     disabled={isRevealing}
      className="..."
  >
-     CLOSE & CONTINUE
+     {isRevealing ? `MENGUNGKAP PEMENANG... (${multiWinners.length}/${totalExpectedWinners})` : 'CLOSE & CONTINUE'}
  </button>
```

---

## Ringkasan Perubahan

| File | Perubahan | Kompleksitas |
|------|-----------|-------------|
| `luckydraw/page.tsx` | Sequential reveal logic + 2 state baru + modal update | Medium |

---

## Open Questions

> [!IMPORTANT]
> 1. **Kecepatan reveal**: Apakah interval adaptive sudah sesuai?
> 2. **Default sounds**: Apakah perlu saya tambahkan file audio sederhana ke folder yang kosong?

---

## Verification Plan

### Manual Verification
1. Jalankan Lucky Draw dengan 5 pemenang HIBURAN.
2. Pastikan modal terbuka dan pemenang muncul satu per satu dengan confetti kecil.
3. Verifikasi progress counter dan tombol CLOSE.
